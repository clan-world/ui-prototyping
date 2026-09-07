"""Exercise Clan World through rendered controls with browser time acceleration."""
import argparse
import json
import re
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'qa'
BASE_TIME = datetime(2026, 9, 7, tzinfo=timezone.utc)
SAVE_KEY = 'clan-world:v1'


def profile(page):
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', SAVE_KEY)


def copies(saved):
    return sum(saved['collection'].values())


def number(locator):
    return int(re.search(r'\d+', locator.inner_text()).group())


def prepare(browser, base_url, mobile=False):
    context = browser.new_context(
        viewport={'width': 390, 'height': 844} if mobile else {'width': 1440, 'height': 960},
        is_mobile=mobile,
        has_touch=mobile,
        device_scale_factor=1,
    )
    page = context.new_page()
    page.set_default_timeout(10000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.install(time=BASE_TIME)
    response = page.goto(base_url, wait_until='networkidle')
    assert response.status == 200, f'Game returned HTTP {response.status}'
    expect(page.get_by_role('button', name='Enter the Wildwood')).to_be_visible()
    page.wait_for_function('(key) => localStorage.getItem(key) !== null', arg=SAVE_KEY)
    page.clock.pause_at(BASE_TIME + timedelta(minutes=1))
    return context, page, errors


def rip(page):
    before = profile(page)
    page.get_by_role('button', name=re.compile(r'^Rip pack')).click()
    page.clock.run_for(1200)
    expect(page.get_by_role('heading', name='Meet your clan.')).to_be_visible()
    expect(page.locator('.reveal-card')).to_have_count(3)
    after = profile(page)
    assert after['packs'] == before['packs'] - 1
    assert copies(after) == copies(before) + 3
    page.get_by_role('button', name='Reveal all', exact=True).click()
    expect(page.locator('.reveal-card.flipped')).to_have_count(3)
    assert page.locator('.revealed-front .rarity-rare, .revealed-front .rarity-epic, .revealed-front .rarity-legendary').count() >= 1
    names = page.locator('.revealed-front .card-caption strong').all_inner_texts()
    page.screenshot(path=str(OUT / 'packs-revealed-desktop.png'))
    page.get_by_role('button', name='Collect cards', exact=True).click()
    assert profile(page) == after, 'Collecting revealed cards must not grant them a second time.'
    return names


def packs_deck_persistence(browser, base_url):
    context, page, errors = prepare(browser, base_url)
    try:
        initial = profile(page)
        assert initial['packs'] == 3
        page.get_by_role('button', name=re.compile(r'^Packs')).click()
        names = rip(page)
        page.get_by_role('button', name='Collection', exact=True).click()
        for name in names:
            expect(page.get_by_role('button', name=f'Inspect {name}, owned', exact=True)).to_be_visible()
        candidate = page.locator('.collection-card-button').filter(has=page.locator('.collection-card-state', has_text=re.compile(r'^OWNED')))
        while candidate.count() == 0 and profile(page)['packs'] > 0:
            page.get_by_role('button', name=re.compile(r'^Packs')).click()
            rip(page)
            page.get_by_role('button', name='Collection', exact=True).click()
        assert candidate.count() > 0, 'Starter packs produced no replacement candidate for this test.'
        candidate.first.click()
        page.get_by_role('button', name='Add to deck', exact=True).click()
        dialog = page.get_by_role('dialog', name='Replace deck card')
        expect(dialog.get_by_role('button', name=re.compile(r'^Replace '))).to_have_count(6)
        before_deck = profile(page)['deck']
        dialog.get_by_role('button', name=re.compile(r'^Replace ')).last.click()
        after = profile(page)
        assert len(after['deck']) == 6 and len(set(after['deck'])) == 6
        assert after['deck'] != before_deck
        expect(page.get_by_role('button', name=re.compile(r'^Deck slot '))).to_have_count(6)
        page.screenshot(path=str(OUT / 'deck-replacement-desktop.png'))
        page.reload(wait_until='networkidle')
        page.wait_for_function('(key) => localStorage.getItem(key) !== null', arg=SAVE_KEY)
        assert profile(page) == after
        page.get_by_role('button', name='Collection', exact=True).click()
        expect(page.get_by_role('button', name=re.compile(r'^Deck slot '))).to_have_count(6)
        assert not errors, errors
        return {'packs_remaining': after['packs'], 'collection_copies': copies(after), 'deck_size': len(after['deck']), 'reload_persists': True}
    finally:
        context.close()


def expedition_rewards(browser, base_url):
    context, page, errors = prepare(browser, base_url)
    try:
        starting_profile = profile(page)
        page.get_by_role('button', name='Enter the Wildwood').click()
        expect(page.get_by_role('button', name='Pause expedition')).to_be_visible()
        timber = page.locator('.resource-wood strong')
        before_wood = number(timber)
        page.get_by_role('button', name='Travel to Whispering Grove').click()
        page.clock.run_for(10000)
        gathered_wood = number(timber)
        assert gathered_wood > before_wood, (before_wood, gathered_wood)
        energy_before = number(page.locator('.energy-label'))
        page.get_by_role('button', name=re.compile(r'^Select Mosswood Scout,')).click()
        page.get_by_role('button', name=re.compile(r'^Deploy card')).click()
        expect(page.locator('.hand-label')).to_contain_text('1 / 4 CREW')
        energy_after = number(page.locator('.energy-label'))
        assert energy_after < energy_before, (energy_before, energy_after)
        expect(page.locator('.hand-card').first.locator('.card-cooldown')).to_be_visible()
        page.clock.run_for(5000)
        assert number(timber) > gathered_wood
        page.screenshot(path=str(OUT / 'gather-and-deploy-desktop.png'))
        page.get_by_role('button', name='Pause expedition').click()
        expect(page.get_by_role('dialog', name='Expedition paused')).to_be_visible()
        frozen = {
            'clock': page.locator('.match-clock strong').inner_text(),
            'resources': page.locator('.resource-hud').inner_text(),
            'score': page.locator('.contest-score').inner_text(),
        }
        page.clock.run_for(10000)
        assert page.locator('.match-clock strong').inner_text() == frozen['clock']
        assert page.locator('.resource-hud').inner_text() == frozen['resources']
        assert page.locator('.contest-score').inner_text() == frozen['score']
        page.get_by_role('button', name='Return to camp', exact=True).click()
        expect(page.get_by_role('button', name='Resume expedition', exact=True)).to_be_visible()
        page.get_by_role('button', name='Resume expedition', exact=True).click()
        assert page.locator('.match-clock strong').inner_text() == frozen['clock']
        page.get_by_role('button', name='Travel to Hearthcamp').click()
        result = page.get_by_role('dialog', name='Expedition results')
        for _ in range(20):
            if result.is_visible():
                break
            page.clock.run_for(10000)
        expect(result).to_be_visible()
        earned = [number(loc) for loc in result.locator('.reward-row strong').all()]
        saved = profile(page)
        assert saved['runs'] == starting_profile['runs'] + 1
        assert len(saved['claimedRunIds']) == len(starting_profile['claimedRunIds']) + 1
        assert saved['coins'] == starting_profile['coins'] + earned[0]
        assert saved['xp'] == starting_profile['xp'] + earned[1]
        assert saved['packs'] == starting_profile['packs'] + earned[2]
        page.screenshot(path=str(OUT / 'expedition-results-desktop.png'))
        page.clock.run_for(5000)
        assert profile(page) == saved, 'An open result dialog must not duplicate rewards.'
        result.get_by_role('button', name='Play again', exact=True).click()
        expect(result).not_to_be_visible()
        expect(page.locator('.match-clock strong')).to_have_text('03:00')
        page.clock.run_for(3000)
        assert profile(page) == saved, 'Replay must not duplicate the previous run reward.'
        page.get_by_role('button', name='Pause expedition').click()
        page.get_by_role('button', name='Return to camp', exact=True).click()
        page.reload(wait_until='networkidle')
        page.wait_for_function('(key) => localStorage.getItem(key) !== null', arg=SAVE_KEY)
        assert profile(page) == saved
        assert not errors, errors
        return {'timber_before': before_wood, 'timber_after_travel': gathered_wood, 'deployment_energy': [energy_before, energy_after], 'pause_freezes': True, 'completed_runs': saved['runs'], 'reward': {'gold': earned[0], 'xp': earned[1], 'packs': earned[2]}, 'reward_claims': len(saved['claimedRunIds']), 'replay_starts': True}
    finally:
        context.close()


def mobile_recovery(browser, base_url):
    context, page, errors = prepare(browser, base_url, mobile=True)
    try:
        page.get_by_role('button', name='Enter the Wildwood').tap()
        health = page.locator('.commander-bars > span').first.locator('strong')
        full_health = number(health)
        page.get_by_role('button', name='Travel to Worldheart').tap()
        page.clock.run_for(17000)
        hurt_health = number(health)
        assert hurt_health < full_health, (full_health, hurt_health)
        home = page.get_by_role('button', name='Travel to Hearthcamp')
        expect(home).to_be_visible()
        box = home.bounding_box()
        assert box and 0 <= box['x'] and box['x'] + box['width'] <= 391
        assert box['y'] + box['height'] <= 845
        home.tap()
        expect(page.get_by_role('button', name=re.compile(r'^Recover'))).to_be_visible()
        page.clock.run_for(15000)
        healed_health = number(health)
        assert healed_health > hurt_health, (hurt_health, healed_health)
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        page.screenshot(path=str(OUT / 'mobile-camp-recovery.png'))
        page.get_by_role('button', name='Pause expedition').tap()
        page.get_by_role('button', name='Return to camp', exact=True).tap()
        expect(page.get_by_role('button', name='Resume expedition', exact=True)).to_be_visible()
        page.screenshot(path=str(OUT / 'mobile-home-resume.png'))
        assert not errors, errors
        return {'viewport': '390x844', 'health': [full_health, hurt_health, healed_health], 'camp_control_visible': True, 'horizontal_overflow': False, 'home_can_resume': True}
    finally:
        context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://localhost:3010')
    parser.add_argument('--chrome', default='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    parser.add_argument('--case', choices=['packs', 'expedition', 'mobile', 'all'], default='all')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    tests = {'packs': packs_deck_persistence, 'expedition': expedition_rewards, 'mobile': mobile_recovery}
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=args.chrome)
        for name, test in tests.items():
            if args.case not in ['all', name]:
                continue
            try:
                details = test(browser, args.base_url)
                results[name] = {'status': 'passed', **details}
                print(json.dumps({name: results[name]}), flush=True)
            except Exception as error:
                results[name] = {'status': 'failed', 'error': str(error), 'traceback': traceback.format_exc()}
                print(json.dumps({name: results[name]}), flush=True)
        browser.close()
    (OUT / f'user-journeys-{args.case}.json').write_text(json.dumps(results, indent=2) + '\n')
    raise SystemExit(0 if all(r['status'] == 'passed' for r in results.values()) else 1)


if __name__ == '__main__':
    main()
