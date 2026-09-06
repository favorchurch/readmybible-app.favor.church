// Run after starting the app and `agent-browser --session rmb-ui open http://localhost:3100/?test=1`.
// Chrome's native touch pipeline is exercised through CDP, not synthetic DOM PointerEvents.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const url = execFileSync('agent-browser', ['--session', 'rmb-ui', 'get', 'cdp-url'], { encoding: 'utf8' }).trim();
const appUrl = process.env.MOBILE_QA_URL ?? 'http://localhost:3100';
const socket = new WebSocket(url);
await new Promise(r => socket.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
socket.addEventListener('message', e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { const [ok, fail] = pending.get(m.id); pending.delete(m.id); if (m.error) fail(m.error); else ok(m.result); } });
function command(method, params = {}, sessionId) { return new Promise((ok, fail) => { const key = ++id; pending.set(key, [ok, fail]); socket.send(JSON.stringify({ id: key, method, params, ...(sessionId ? { sessionId } : {}) })); }); }
const targets = await command('Target.getTargets');
const target = targets.targetInfos.find(t => t.type === 'page' && t.url.startsWith(appUrl));
assert(target, 'Open the local app with agent-browser first');
const { sessionId } = await command('Target.attachToTarget', { targetId: target.targetId, flatten: true });
const cdp = (method, params) => command(method, params, sessionId);
async function evaluate(expression) { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ': ' + r.exceptionDetails.exception?.description); return r.result.value; }
const pause = ms => new Promise(r => setTimeout(r, ms));
async function click(text, scope = 'document') { await evaluate(`(() => { const buttons = [...${scope}.querySelectorAll('button')]; const el = buttons.find(el => el.textContent.trim() === ${JSON.stringify(text)} || el.dataset.tab === ${JSON.stringify(text.toLowerCase())}); if (!el) throw new Error('Button not found: ${text}'); el.click(); })()`); await pause(180); }
async function clickSelector(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await pause(220); }
async function metrics(w, h) { await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: w > h ? 'landscapePrimary' : 'portraitPrimary', angle: w > h ? 90 : 0 } }); await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); await pause(200); }
async function gesture(selector, delta, duration = 350, startOffset = 0) {
  const box = await evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); const scroll=${JSON.stringify(selector)}.includes('sheet-scroll'); return {x:scroll?r.x+r.width*.05:r.x+r.width/2,y:scroll?r.y+18:Math.max(r.y+12, Math.min(r.y+r.height/2, innerHeight-220))+${startOffset}}; })()`);
  await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y, id: 1 }] });
  for (let i=1;i<=12;i++) { await pause(duration/12); await cdp('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x, y: box.y+delta*i/12, id: 1 }] }); }
  const transform = await evaluate(`document.querySelector('.modal-sheet:last-of-type')?.style.transform || document.querySelector('.modal-sheet')?.style.transform`);
  await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pause(260);
  return transform;
}
const out = resolve('scratch/mobile-review'); mkdirSync(out, { recursive: true });
const results = [];
function passed(message) { results.push(message); console.log('PASS', message); }
async function screenshot(name) {
  await evaluate(`(() => { const s=document.createElement('style'); s.id='qa-clean'; s.textContent='.test-mode-panel,nextjs-portal{visibility:hidden!important}'; document.head.append(s); })()`);
  await pause(120);
  const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(resolve(out, name+'.png'), Buffer.from(data, 'base64'));
  await evaluate(`document.getElementById('qa-clean').remove()`);
}
try {
  await cdp('Page.navigate', { url: `${appUrl}/?test=1` }); await pause(2200);
  await evaluate(`window.__touchEvidence=[];document.addEventListener('pointermove',e=>window.__touchEvidence.push({trusted:e.isTrusted,type:e.pointerType}),{passive:true})`);
  await click('Show'); await click('Pre-launch'); await click('Hide');
  for (const width of [360,390,430]) {
    await metrics(width,844);
    assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));
    assert(await evaluate(`document.querySelector('.readiness-card').getBoundingClientRect().bottom<innerHeight-75`));
    await screenshot('today-'+width); passed(`Today setup above fold, no page overflow at ${width}px`);
  }
  await metrics(390,844);
  await clickSelector('.quick-verse-button'); await pause(800);
  await screenshot('quick-verse-390');
  let transform = await gesture('.sheet-drag-handle', 4, 300);
  assert.equal(await evaluate(`document.querySelectorAll('.modal-wrap').length`),1); passed('Tiny handle movement does not dismiss');
  transform = await gesture('.sheet-drag-handle', 65, 600);
  assert.match(transform,/translateY/); assert.equal(await evaluate(`document.querySelectorAll('.modal-wrap').length`),1); passed('Short slow drag tracks finger and returns');
  transform = await gesture('.sheet-drag-handle', 190, 360);
  assert.match(transform,/translateY/); assert.equal(await evaluate(`document.querySelectorAll('.modal-wrap').length`),0); passed('Native Chrome touch handle drag dismisses Quick Verse');
  assert(await evaluate(`document.activeElement.classList.contains('quick-verse-button')`)); passed('Focus returns to Quick Verse trigger');
  await clickSelector('.quick-verse-button'); await pause(500);
  await gesture('.sheet-drag-handle',150,50);
  assert.equal(await evaluate(`document.querySelectorAll('.modal-wrap').length`),0); passed('Fast intentional flick dismisses the sheet');
  await click('Progress', "document.querySelector('.bottom-nav')");
  await screenshot('progress-390');
  await clickSelector('.calendar-grid button:not(:disabled)'); await pause(200);
  await clickSelector('.day-preview-verse-btn'); await pause(900);
  assert.equal(await evaluate(`document.querySelectorAll('.modal-wrap').length`),2);
  const scrollSelector = '.scripture-sheet .sheet-scroll';
  await evaluate(`document.querySelector(${JSON.stringify(scrollSelector)}).insertAdjacentHTML('beforeend','<div data-qa-long-sheet style="height:1200px"></div>')`);
  await evaluate(`window.__qaMoves=[]; const q=${JSON.stringify(scrollSelector)}; document.querySelector(q).addEventListener('pointerdown',e=>window.__qaMoves.push({down:true,y:e.clientY,type:e.pointerType,button:e.button,target:e.target.className,top:document.querySelector(q).scrollTop}),true); document.querySelector(q).addEventListener('pointermove',e=>window.__qaMoves.push({y:e.clientY,type:e.pointerType,button:e.button,target:e.target.className}),true)`);
  await gesture(scrollSelector,-210,400);
  assert(await evaluate(`document.querySelector(${JSON.stringify(scrollSelector)}).scrollTop>0`)); passed('Long Scripture sheet scrolls up with native touch');
  const before = await evaluate(`document.querySelector(${JSON.stringify(scrollSelector)}).scrollTop`);
  await gesture(scrollSelector,90,400);
  assert.equal(await evaluate(`document.querySelectorAll('.modal-wrap').length`),2);
  assert(await evaluate(`document.querySelector(${JSON.stringify(scrollSelector)}).scrollTop`) < before, JSON.stringify(await evaluate(`({before:${before},after:document.querySelector(${JSON.stringify(scrollSelector)}).scrollTop,moves:window.__qaMoves.slice(-20)})`))); passed('Downward touch while scrolled scrolls content without dismissing');
  await evaluate(`document.querySelector(${JSON.stringify(scrollSelector)}).scrollTop=0`); await pause(150);
  await gesture('.scripture-sheet .sheet-scroll',180,350);
  assert(await evaluate(`document.querySelectorAll('.modal-wrap').length`) <= 1); passed('At top, downward content gesture dismisses the top sheet');
  if (await evaluate(`document.querySelectorAll('.modal-wrap').length`)) {
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27}); await pause(150);
    assert.equal(await evaluate(`document.querySelectorAll('.modal-wrap').length`),0); passed('Escape closes remaining Day Preview');
  }
  await click('Connect', "document.querySelector('.bottom-nav')"); await screenshot('connect-390');
  await clickSelector('.open-home-button'); await screenshot('home-day-390');
  const count = await evaluate(`document.querySelectorAll('.home-person').length`); assert(count>0);
  await clickSelector('.home-floating-actions button:first-child'); await screenshot('home-options-390');
  await clickSelector('#home-people'); assert.equal(await evaluate(`document.querySelectorAll('.home-person').length`),0);
  await clickSelector('#home-people'); assert.equal(await evaluate(`document.querySelectorAll('.home-person').length`),count);
  await clickSelector('#home-names'); assert.equal(await evaluate(`document.querySelectorAll('.home-person-label').length`),count); passed('People and name controls reflect all roster members');
  await click('Sunset'); await clickSelector('.home-options .primary-button'); await screenshot('home-sunset-390');
  await clickSelector('.home-floating-actions button:nth-child(2)'); await screenshot('home-night-390');
  assert(await evaluate(`!!document.querySelector('.time-night')`)); passed('Day, Sunset, and Night change the scene');
  await metrics(844,390); await screenshot('home-landscape');
  assert(await evaluate(`document.querySelector('.home-floating-actions').getBoundingClientRect().bottom<=innerHeight`)); passed('Landscape Home controls fit viewport');
  await clickSelector('.home-floating-actions button:nth-child(3)');
  assert(await evaluate(`document.querySelector('.home3d-immersive .home3d-turntable').style.transform.includes('rotateY(-28deg)')`));
  await clickSelector('[aria-label="Close Home"]');
  await metrics(390,844); await click('Rewards', "document.querySelector('.bottom-nav')"); await screenshot('rewards-locked-390');
  await click('Show');
  await evaluate(`(() => { const input=document.querySelectorAll('.test-mode-body input')[1]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'100'); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await click('Hide'); await screenshot('rewards-earned-390');
  for (const width of [360,430,768,1280]) {
    await metrics(width,width>700?900:844);
    for(const tab of ['Connect','Rewards','Progress']) { await click(tab,"document.querySelector('.bottom-nav')"); assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth`)); await screenshot(tab.toLowerCase()+'-'+width); }
    passed(`Connect, Rewards, Progress fit ${width}px`);
  }
  assert(await evaluate(`window.__touchEvidence.some(e=>e.trusted&&e.type==='touch')`)); passed('Gesture evidence contains trusted pointerType=touch events');
  writeFileSync(resolve(out,'verification.json'),JSON.stringify({browser:'Chrome via CDP native touch; Android device metrics, no physical Android device',results},null,2));
} finally { socket.close(); }
