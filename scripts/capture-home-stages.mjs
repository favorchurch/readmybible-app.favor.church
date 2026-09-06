import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appUrl = process.env.MOBILE_QA_URL ?? 'http://localhost:3200';
const cdpUrl = execFileSync('agent-browser', ['--session', 'rmb-ui', 'get', 'cdp-url'], { encoding: 'utf8' }).trim();
const socket = new WebSocket(cdpUrl);
await new Promise((resolveOpen) => socket.addEventListener('open', resolveOpen, { once: true }));
let commandId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const callbacks = pending.get(message.id);
  if (!callbacks) return;
  pending.delete(message.id);
  if (message.error) callbacks[1](message.error);
  else callbacks[0](message.result);
});
function command(method, params = {}, sessionId) {
  return new Promise((resolveResult, reject) => {
    const id = ++commandId;
    pending.set(id, [resolveResult, reject]);
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
const targets = await command('Target.getTargets');
const target = targets.targetInfos.find((item) => item.type === 'page' && item.url.startsWith(appUrl));
if (!target) throw new Error(`Open ${appUrl} with agent-browser first`);
const { sessionId } = await command('Target.attachToTarget', { targetId: target.targetId, flatten: true });
const cdp = (method, params) => command(method, params, sessionId);
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
const pause = (ms) => new Promise((resolvePause) => setTimeout(resolvePause, ms));
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
  await pause(250);
}
async function setGroupPercent(percent) {
  const changed = await evaluate(`(() => {
    const input = document.querySelectorAll('.test-mode-body input')[2];
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(String(percent))});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!changed) throw new Error('Test mode group slider not found');
  await pause(350);
}
async function screenshot(fileName) {
  const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(resolve('scratch/mobile-review/home-stages', fileName), Buffer.from(data, 'base64'));
}

await cdp('Page.navigate', { url: `${appUrl}/?test=1` });
await pause(2200);
await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'portraitPrimary', angle: 0 } });
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
mkdirSync(resolve('scratch/mobile-review/home-stages'), { recursive: true });
await click('[data-section="test-mode-panel"] button');
await click('[data-tab="connect"]');

const stages = [
  ['tent', 0],
  ['trailer', 10],
  ['cabin', 25],
  ['apartment', 45],
  ['house', 65],
  ['mansion', 85],
];
for (const [name, percent] of stages) {
  await click('[aria-label="Close Home"]');
  await setGroupPercent(percent);
  await click('.open-home-button');
  await pause(300);
  await screenshot(`${name}-390.png`);
  console.log(`captured ${name}`);
}
socket.close();
