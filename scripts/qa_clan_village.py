"""Check ClanController through rendered controls, with read-only save assertions.

Run against an existing server. Browser time advances through Playwright's clock;
the script never writes localStorage or injects simulation state.
"""

import argparse
import json
import math
import re
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "qa" / "village"
SAVE_KEY = "clan-world:elder-village:v2"
ARCHIVE_KEY = "clan-world:charters:v2"
BASE_TIME = datetime(2026, 9, 7, tzinfo=timezone.utc)


class Journey:
    def __init__(self, browser, base_url, mobile, name):
        self.mobile = mobile
        self.name = f"{name}-{'mobile' if mobile else 'desktop'}"
        self.context = browser.new_context(
            viewport={"width": 390, "height": 844} if mobile else {"width": 1440, "height": 960},
            is_mobile=mobile, has_touch=mobile, device_scale_factor=1,
        )
        self.context.tracing.start(screenshots=True, snapshots=True, sources=True)
        self.page = self.context.new_page()
        self.page.set_default_timeout(10000)
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append({"type": "pageerror", "message": str(error)}))
        self.page.on("console", lambda message: self.errors.append({"type": "console", "message": message.text, "location": message.location}) if message.type == "error" else None)
        self.page.on("requestfailed", lambda request: self.errors.append({"type": "requestfailed", "message": f"{request.url}: {request.failure}"}))
        self.page.clock.install(time=BASE_TIME)
        response = self.page.goto(base_url, wait_until="networkidle")
        assert response and response.status == 200
        expect(self.page.locator(".map-loading")).to_have_count(0)
        expect(self.page.get_by_role("button", name="Pause village", exact=True)).to_be_visible()
        self.page.clock.pause_at(BASE_TIME + timedelta(seconds=30))
        self.press(self.page.get_by_role("button", name="Pause village", exact=True))
        self.page.clock.run_for(50)
        self.save()
        self.screenshot("initial")
        self.results = {}

    def press(self, locator):
        if self.mobile:
            locator.tap()
        else:
            locator.click()

    def read(self, key=SAVE_KEY):
        return self.page.evaluate("key => JSON.parse(localStorage.getItem(key))", key)

    def save(self):
        direct = self.page.get_by_role("button", name="Save", exact=True)
        if direct.is_visible():
            self.press(direct)
        else:
            self.press(self.page.get_by_role("button", name="Open field manual"))
            dialog = self.page.get_by_role("dialog")
            self.press(dialog.get_by_role("button", name="Save village", exact=True))
            self.press(dialog.get_by_role("button", name="Close", exact=True))
        assert self.read() is not None
        return self.read()

    def screenshot(self, step):
        self.page.clock.run_for(400)
        self.page.screenshot(path=str(OUT / f"{self.name}-{step}.png"), full_page=True)

    def note(self, step, result):
        self.results[step] = result
        print(json.dumps({"journey": self.name, "step": step, "result": result}), flush=True)

    def open_clan(self):
        if self.mobile and not self.page.locator(".clan-sidebar.drawer-open").count():
            self.press(self.page.locator(".mobile-game-tabs").get_by_role("button", name="Clan", exact=True))
        self.press(self.page.get_by_role("tab", name="Clansmen", exact=True))

    def close_clan(self):
        if self.mobile and self.page.locator(".clan-sidebar.drawer-open").count():
            self.press(self.page.get_by_role("button", name="Close clan panel"))

    def select_group(self):
        self.open_clan()
        self.press(self.page.get_by_role("button", name="Select all", exact=True))
        count = len([u for u in self.read()["units"] if u["role"] != "elder"])
        expect(self.page.locator(".unit-row[aria-pressed='true']")).to_have_count(count)
        self.close_clan()
        expect(self.page.locator(".selected-title h2")).to_have_text(f"{count} clansmen selected")
        return count

    def order(self, name):
        self.press(self.page.locator(".order-button-grid").get_by_role("button", name=re.compile(rf"^{name}")))

    def pause(self):
        button = self.page.get_by_role("button", name="Pause village", exact=True)
        if button.is_visible():
            self.press(button)

    def resume(self):
        button = self.page.get_by_role("button", name="Resume village", exact=True)
        if button.is_visible():
            self.press(button)

    def speed_four(self):
        for speed in (1, 2):
            button = self.page.get_by_role("button", name=f"Simulation speed {speed}x")
            if button.count():
                self.press(button)
        expect(self.page.get_by_role("button", name="Simulation speed 4x")).to_be_visible()

    def map_point(self, x, y, camera=(24, 22), zoom=None):
        box = self.page.locator(".village-map canvas").bounding_box()
        zoom = zoom or (1.25 if self.mobile else 1.35)
        return (
            box["x"] + box["width"] / 2 + ((x-y)-(camera[0]-camera[1])) * 24 * zoom,
            box["y"] + box["height"] / 2 + ((x+y)-(camera[0]+camera[1])) * 12 * zoom,
        )

    def touch_or_click(self, x, y, right=False):
        if self.mobile:
            self.page.touchscreen.tap(x, y)
        else:
            self.page.mouse.click(x, y, button="right" if right else "left")
        self.page.clock.run_for(40)

    def center(self, x, y):
        if self.mobile:
            self.press(self.page.locator(".mobile-game-tabs").get_by_role("button", name="Map", exact=True))
        minimap = self.page.locator(".mini-map")
        expect(minimap).to_be_visible()
        box = minimap.bounding_box()
        world = self.read()
        self.touch_or_click(box["x"] + x/world["width"]*box["width"], box["y"] + y/world["height"]*box["height"])
        if self.mobile:
            self.press(self.page.locator(".mobile-game-tabs").get_by_role("button", name="Map", exact=True))
        self.page.clock.run_for(40)

    def finish(self, failed=False):
        self.context.tracing.stop(path=str(OUT / f"{self.name}-trace.zip"))
        self.context.close()
        return {"status": "failed" if failed else "passed", "checks": self.results, "browser_errors": self.errors}


def clear_site(world):
    candidates = []
    for y in range(10, 32):
        for x in range(12, 31):
            cells = [(xx, yy) for yy in range(y, y+2) for xx in range(x, x+3)]
            if any(world["tiles"][yy][xx]["terrain"] in ("water", "bridge") for xx, yy in cells):
                continue
            if any(b["x"] < x+3 and b["x"]+b["w"] > x and b["y"] < y+2 and b["y"]+b["h"] > y for b in world["buildings"]):
                continue
            if any(x <= p["x"] < x+3 and y <= p["y"] < y+2 for p in world["objects"] + world["units"]):
                continue
            candidates.append((math.hypot(x-23, y-22), x, y))
    assert candidates, "No clear cottage site in the inspected saved village."
    _, x, y = min(candidates)
    return x, y


def village(j):
    count = j.select_group()
    j.order("Stop")
    starting = j.save()
    j.order("Move")
    x, y = j.map_point(20.5, 21.5)
    j.touch_or_click(x, y, right=True)
    ordered = j.save()
    assigned = [u for u in ordered["units"] if (u.get("order") or {}).get("type") == "move"]
    assert len(assigned) >= count-1, f"Only {len(assigned)}/{count} selected clansmen received Move."
    j.speed_four()
    j.resume()
    j.page.clock.run_for(5000)
    j.pause()
    moved = j.save()
    origins = {u["id"]: u for u in starting["units"]}
    moved_count = sum(math.hypot(u["x"]-origins[u["id"]]["x"], u["y"]-origins[u["id"]]["y"]) > .5 for u in moved["units"] if u["role"] != "elder")
    assert moved_count >= count-2, f"Only {moved_count}/{count} clansmen changed position."
    j.note("group_movement", {"selected": count, "received_move": len(assigned), "moved": moved_count})
    frozen = j.save()
    j.page.clock.run_for(3000)
    assert j.save() == frozen, "Pause changed saved simulation state."
    j.note("pause", {"elapsed": frozen["elapsed"], "unchanged_after_browser_ms": 3000})
    j.order("Stop")
    before_gather = j.save()
    if j.mobile:
        worker = next(u for u in before_gather["units"] if u["role"] != "elder")
        trees = [o for o in before_gather["objects"] if o["kind"] in ("tree", "oak", "pine") and o["stock"] > 0]
        tree = min(trees, key=lambda o: math.hypot(o["x"]-worker["x"], o["y"]-worker["y"]))
        j.center(tree["x"], tree["y"])
        j.order("Work")
        x, y = j.map_point(tree["x"], tree["y"], (tree["x"], tree["y"]))
        j.touch_or_click(x, y-12)
    else:
        j.press(j.page.get_by_role("button", name="Assign selected to gather timber"))
    gather_order = j.save()
    gatherers = [u for u in gather_order["units"] if (u.get("order") or {}).get("type") == "gather"]
    assert len(gatherers) >= count-1
    j.resume()
    delivered = None
    for _ in range(12):
        j.page.clock.run_for(3000)
        j.pause()
        delivered = j.save()
        if delivered["resources"]["timber"] >= before_gather["resources"]["timber"] + 12:
            break
        j.resume()
    j.pause()
    assert delivered["resources"]["timber"] > before_gather["resources"]["timber"], "Gatherers did not deliver timber."
    assert delivered["stats"]["gathered"] > before_gather["stats"]["gathered"]
    j.note("gather_and_deliver", {"timber_before": before_gather["resources"]["timber"], "timber_after": delivered["resources"]["timber"], "gathered": delivered["stats"]["gathered"]})
    j.screenshot("working")
    j.order("Stop")
    before_recruit = j.save()
    j.open_clan()
    j.press(j.page.get_by_role("button", name=re.compile(r"^Recruit clansman")))
    j.close_clan()
    recruited = j.save()
    assert recruited["population"] == before_recruit["population"] + 1
    assert recruited["resources"]["food"] == before_recruit["resources"]["food"] - 30
    assert recruited["resources"]["gold"] == before_recruit["resources"]["gold"] - 20
    j.note("recruitment", {"population": recruited["population"], "food_cost": 30, "gold_cost": 20})
    j.select_group()
    before_build = j.save()
    site_x, site_y = clear_site(before_build)
    center_x, center_y = site_x+1.5, site_y+1
    j.center(center_x, center_y)
    j.order("Build")
    j.press(j.page.get_by_role("button", name="Build Clansman's cottage", exact=True))
    j.close_clan()
    x, y = j.map_point(center_x+.1, center_y+.1, (center_x, center_y))
    j.touch_or_click(x, y)
    foundation = j.save()
    new_buildings = [b for b in foundation["buildings"] if b["id"] not in {old["id"] for old in before_build["buildings"]}]
    assert len(new_buildings) == 1, f"Foundation missing at {(site_x, site_y)}: {foundation['logs'][-3:]}"
    building = new_buildings[0]
    assert building["kind"] == "house" and building["progress"] == 0
    assert foundation["resources"]["timber"] == before_build["resources"]["timber"] - 45
    assert foundation["resources"]["stone"] == before_build["resources"]["stone"] - 15
    j.screenshot("foundation")
    j.resume()
    completed = None
    for _ in range(12):
        j.page.clock.run_for(2500)
        j.pause()
        completed = j.save()
        building = next(b for b in completed["buildings"] if b["id"] == building["id"])
        if building["progress"] == 1:
            break
        j.resume()
    j.pause()
    assert building["progress"] == 1, f"Construction stalled at {building['progress']}"
    assert completed["maxPopulation"] == before_build["maxPopulation"] + 4
    j.note("construction", {"site": [site_x, site_y], "timber_cost": 45, "stone_cost": 15, "completed": True, "housing": completed["maxPopulation"]})
    j.screenshot("completed")
    assert j.page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Horizontal viewport overflow."


def charters(j):
    initial = j.read(ARCHIVE_KEY)
    assert initial["packs"] == 3 and sum(initial["owned"].values()) == 1
    if j.mobile:
        j.press(j.page.locator(".mobile-game-tabs").get_by_role("button", name="Charters", exact=True))
        j.press(j.page.get_by_role("button", name=re.compile(r"^Open sealed charters")))
    else:
        j.press(j.page.get_by_role("button", name=re.compile(r"Sealed charters")))
    dialog = j.page.get_by_role("dialog", name="A message for the Elder")
    gold_before = int(j.page.locator('[data-resource="gold"]').inner_text())
    for _ in range(2):
        j.press(dialog.get_by_role("button", name=re.compile(r"^Acquire charter")))
    assert int(j.page.locator('[data-resource="gold"]').inner_text()) == gold_before - 80
    assert j.read(ARCHIVE_KEY)["packs"] == initial["packs"] + 2
    no_funds = j.read(ARCHIVE_KEY)
    j.press(dialog.get_by_role("button", name=re.compile(r"^Acquire charter")))
    assert j.read(ARCHIVE_KEY) == no_funds
    assert int(j.page.locator('[data-resource="gold"]').inner_text()) == gold_before - 80
    j.note("pack_purchase", {"gold_cost_each": 40, "purchases": 2, "insufficient_funds_rejected": True})
    before = j.read(ARCHIVE_KEY)
    j.press(dialog.get_by_role("button", name=re.compile(r"^Break seal")))
    j.page.clock.run_for(1000)
    expect(dialog.get_by_role("heading", name="New charters for the clan")).to_be_visible()
    after_open = j.read(ARCHIVE_KEY)
    assert after_open["packs"] == before["packs"] - 1
    assert after_open["opened"] == before["opened"] + 1
    assert sum(after_open["owned"].values()) == sum(before["owned"].values()) + 3
    expect(dialog.locator(".charter-back")).to_have_count(3)
    j.press(dialog.get_by_role("button", name="Reveal next", exact=True))
    expect(dialog.locator(".charter-reveal-slot.face-up")).to_have_count(1)
    j.press(dialog.get_by_role("button", name="Reveal all", exact=True))
    expect(dialog.locator(".charter-reveal-slot.face-up")).to_have_count(3)
    assert dialog.locator(".charter-rare,.charter-legendary").count() >= 1
    j.press(dialog.locator(".charter-card").last)
    ratified = j.read(ARCHIVE_KEY)
    assert ratified["active"] != before["active"], "Ratifying the guaranteed rare charter did not change the active charter."
    expect(dialog.locator(".charter-card.ratified")).to_have_count(1)
    j.screenshot("revealed")
    j.press(dialog.get_by_role("button", name="Keep the charters", exact=True))
    assert j.read(ARCHIVE_KEY) == ratified, "Collecting revealed charters duplicated rewards."
    if j.mobile:
        j.press(j.page.locator(".mobile-game-tabs").get_by_role("button", name="Charters", exact=True))
    else:
        j.press(j.page.get_by_role("button", name=re.compile(r"^Clan charters")))
    book = j.page.get_by_role("dialog", name="The clan’s charter book")
    expect(book.locator(".charter-card:not(:disabled)")).to_have_count(len(ratified["owned"]))
    expect(book.locator(".charter-card.ratified")).to_have_count(1)
    j.screenshot("collection")
    j.press(book.get_by_role("button", name="Close", exact=True))
    saved = j.save()
    assert saved["resources"]["gold"] == gold_before - 80
    assert saved["equippedDoctrine"] is not None
    j.page.reload(wait_until="networkidle")
    expect(j.page.locator(".map-loading")).to_have_count(0)
    assert j.read(ARCHIVE_KEY) == ratified
    j.pause()
    persisted = j.save()
    assert persisted["equippedDoctrine"] == saved["equippedDoctrine"]
    assert persisted["resources"]["gold"] == saved["resources"]["gold"]
    j.note("reveal_collection_ratify_persistence", {"cards_added": 3, "rare_guarantee": True, "no_duplicate_collection": True, "active": ratified["active"], "doctrine": persisted["equippedDoctrine"], "reload_persists": True})
    j.screenshot("reloaded")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:3010")
    parser.add_argument("--chrome", default="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    parser.add_argument("--viewport", choices=("all", "desktop", "mobile"), default="all")
    parser.add_argument("--journey", choices=("all", "village", "charters"), default="all")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=args.chrome)
        try:
            for mobile in (False, True):
                if args.viewport != "all" and mobile != (args.viewport == "mobile"):
                    continue
                for name, run in (("village", village), ("charters", charters)):
                    if args.journey not in ("all", name):
                        continue
                    j = None
                    key = f"{name}-{'mobile' if mobile else 'desktop'}"
                    try:
                        j = Journey(browser, args.base_url, mobile, name)
                        run(j)
                        assert not j.errors, j.errors
                        results[key] = j.finish()
                    except Exception as error:
                        if j:
                            j.screenshot("failure")
                            results[key] = j.finish(failed=True)
                        else:
                            results[key] = {"status": "failed"}
                        results[key]["error"] = str(error)
                        results[key]["traceback"] = traceback.format_exc()
                        print(json.dumps({"journey": key, "status": "failed", "error": str(error)}), flush=True)
        finally:
            browser.close()
    report = OUT / f"results-{args.viewport}-{args.journey}.json"
    report.write_text(json.dumps(results, indent=2) + "\n")
    print(json.dumps({"report": str(report), "status": {key: value["status"] for key, value in results.items()}}), flush=True)
    return 1 if any(result["status"] != "passed" for result in results.values()) else 0


if __name__ == "__main__":
    raise SystemExit(main())
