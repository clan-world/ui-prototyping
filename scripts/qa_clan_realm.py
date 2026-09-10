"""Verify realm camera controls through the rendered production UI."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

OUT = Path(__file__).resolve().parents[1] / 'artifacts' / 'qa' / 'realm-final'


def camera(page):
    view = page.locator('.world-viewport')
    return {key: float(view.get_attribute('data-camera-' + key)) for key in ('x', 'y', 'zoom')}


def settle(page):
    page.wait_for_timeout(220)


def review(browser, url):
    """Inspect painted text and control geometry at representative screen sizes."""
    results = {}
    for width, height in [(1512, 982), (1024, 768), (844, 390), (390, 844)]:
        label = f'{width}x{height}'
        context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=width < 900, has_touch=width < 900)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url, wait_until='networkidle')
        expect(page.locator('.map-loading')).to_have_count(0)
        page.get_by_role('button', name='Pause village', exact=True).click()
        settle(page)
        page.screenshot(path=str(OUT / f'review-{label}.png'))
        result = page.evaluate('''() => {
          const intersects = (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
          const viewport = {left:0, top:0, right:innerWidth, bottom:innerHeight};
          const painted = (node, rect) => {
            if (!intersects(rect, viewport)) return false;
            for (let el=node.parentElement; el; el=el.parentElement) {
              const style=getComputedStyle(el);
              if (style.display==='none' || style.visibility==='hidden' || +style.opacity===0) return false;
              if (/(hidden|clip|scroll|auto)/.test(style.overflowX + style.overflowY) && !intersects(rect, el.getBoundingClientRect())) return false;
            }
            return true;
          };
          const walker=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          const fragments=[], textGroups=new Map();
          while (walker.nextNode()) {
            const node=walker.currentNode;
            if (!node.textContent.trim() || node.parentElement.closest('script,style,svg')) continue;
            const range=document.createRange(); range.selectNodeContents(node);
            if ([...range.getClientRects()].some(rect=>painted(node,rect))) {
              const fragment=node.textContent.trim();
              fragments.push(fragment);
              const group=node.parentElement.closest('p,li,h1,h2,h3,h4,h5,h6,button,label,summary,small')||node.parentElement;
              textGroups.set(group,[...(textGroups.get(group)||[]),fragment]);
            }
          }
          const text=fragments.join(' ');
          const controls=[...document.querySelectorAll('button,[role=tab],input')].flatMap(el=>{
            const rect=el.getBoundingClientRect();
            if (!rect.width || !rect.height || !painted(el,rect)) return [];
            const center={left:rect.x+rect.width/2,top:rect.y+rect.height/2,right:rect.x+rect.width/2+1,bottom:rect.y+rect.height/2+1};
            const hit=document.elementFromPoint(center.left,center.top);
            return [{name:el.getAttribute('aria-label')||el.textContent.trim(),x:rect.x,y:rect.y,w:rect.width,h:rect.height,
              clipped:rect.left<0||rect.top<0||rect.right>innerWidth||rect.bottom>innerHeight,
              obscured:painted(el,center) && !!hit && !el.contains(hit) && !hit.contains(el), blocking:hit?.className}];
          });
          const sentences=[...textGroups.values()].flatMap(group=>group.join(' ').split(/(?<=[.!?])\\s+/)).filter(sentence=>/[.!?]$/.test(sentence)&&sentence.split(/\\s+/).length>=5);
          return {text,word_count:text.match(/\\S+/g)?.length||0,sentences,
            clipped_controls:controls.filter(control=>control.clipped),obscured_controls:controls.filter(control=>control.obscured),
            horizontal_overflow:document.documentElement.scrollWidth>innerWidth,vertical_overflow:document.documentElement.scrollHeight>innerHeight};
        }''')
        result['errors'] = errors
        results[label] = result
        context.close()
    (OUT / 'responsive-results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(results), flush=True)
    return results


def run(browser, url, mobile):
    context = browser.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1512, 'height': 982}, is_mobile=mobile, has_touch=mobile)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url, wait_until='networkidle')
    expect(page.locator('.map-loading')).to_have_count(0)
    page.get_by_role('button', name='Pause village', exact=True).click()
    settle(page)
    initial = camera(page)
    page.screenshot(path=str(OUT / ('village-mobile.png' if mobile else 'village-desktop.png')))
    if mobile:
        page.locator('.mobile-game-tabs').get_by_role('button', name='Map', exact=True).tap()
    page.get_by_role('button', name='Zoom in', exact=True).click()
    settle(page)
    assert camera(page)['zoom'] > initial['zoom']
    page.get_by_role('button', name='View the whole realm', exact=True).click()
    settle(page)
    overview = camera(page)
    assert overview['zoom'] < .45
    assert not page.locator('.clan-sidebar').is_visible()
    page.screenshot(path=str(OUT / ('overview-mobile.png' if mobile else 'overview-desktop.png')))
    world = page.evaluate("JSON.parse(localStorage.getItem('clan-world:elder-village:v2'))")
    if world is None:
        page.wait_for_timeout(5000)
        world = page.evaluate("JSON.parse(localStorage.getItem('clan-world:elder-village:v2'))")
    assert world['width'] == 112 and world['height'] == 96
    destination = next(c for c in world['clans'] if c['id'] == 'stoneroot')['base']
    box = page.locator('.mini-map').bounding_box()
    point = {'x': box['width'] * destination['x'] / world['width'], 'y': box['height'] * destination['y'] / world['height']}
    if mobile:
        page.touchscreen.tap(box['x'] + point['x'], box['y'] + point['y'])
    else:
        page.mouse.click(box['x'] + point['x'], box['y'] + point['y'])
    settle(page)
    focused = camera(page)
    assert abs(focused['x'] - destination['x']) <= world['width'] / box['width'] and abs(focused['y'] - destination['y']) <= world['height'] / box['height'], (focused, destination)
    page.get_by_role('button', name='Center village', exact=True).click()
    settle(page)
    assert abs(camera(page)['x'] - initial['x']) < .05
    if mobile:
        page.locator('.mobile-game-tabs').get_by_role('button', name='Map', exact=True).tap()
        cdp = context.new_cdp_session(page)
        before = camera(page)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 150, 'y': 430, 'id': 0}, {'x': 240, 'y': 430, 'id': 1}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 100, 'y': 430, 'id': 0}, {'x': 290, 'y': 430, 'id': 1}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        settle(page)
        assert camera(page)['zoom'] > before['zoom']
        before = camera(page)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 160, 'y': 430, 'id': 0}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 230, 'y': 460, 'id': 0}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        settle(page)
        assert camera(page)['x'] != before['x']
    else:
        before = camera(page)
        page.keyboard.down('ArrowRight')
        page.wait_for_timeout(300)
        page.keyboard.up('ArrowRight')
        settle(page)
        assert camera(page)['x'] > before['x']
        page.mouse.click(760, 510)
        before = camera(page)
        page.mouse.move(760, 510)
        page.keyboard.down(' ')
        page.mouse.down()
        page.mouse.move(900, 570, steps=8)
        page.mouse.up()
        page.keyboard.up(' ')
        settle(page)
        assert camera(page)['x'] != before['x']
    page.get_by_role('button', name='Find the realm monument', exact=True).click()
    settle(page)
    m = world['monument']
    assert abs(camera(page)['x'] - m['x'] - m['w']/2) < .05
    assert camera(page)['zoom'] == 1.15
    page.screenshot(path=str(OUT / ('monument-mobile.png' if mobile else 'monument-desktop.png')))
    assert not errors, errors
    result = {'status': 'passed', 'initial': initial, 'overview': overview, 'minimap_target': destination, 'gesture': 'pinch and touch pan' if mobile else 'keyboard and Space-drag', 'errors': errors}
    context.close()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://localhost:3010')
    parser.add_argument('--review-only', action='store_true')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        try:
            if args.review_only:
                review(browser, args.base_url)
                return
            results = {label: run(browser, args.base_url, mobile) for label, mobile in [('desktop', False), ('mobile', True)]}
        finally:
            browser.close()
    (OUT / 'navigation-results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(results))


if __name__ == '__main__':
    main()
