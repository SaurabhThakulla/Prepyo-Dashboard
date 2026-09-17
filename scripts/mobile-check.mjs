// Local viewport smoke check. Requires Vite on 4173 and Edge CDP on 9222.
// API responses are synthetic: this checks layout, not backend integration.
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
let browserErrors = 0;
const watchdog = setTimeout(() => { console.error('Viewport check timed out'); process.exit(1); }, 180000);
await fetch('http://127.0.0.1:4173').then(r => { if (!r.ok) throw new Error('Vite is unavailable'); });
const target = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') { browserErrors++; console.error('Browser exception:', JSON.stringify(message.params.exceptionDetails)); }
  if (message.id) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p.reject(message.error) : p.resolve(message.result); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true});
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
const nativeFetch = window.fetch;
window.fetch = async (url, options) => {
 if (!String(url).includes('/api/v1/')) return nativeFetch(url, options);
 const path = new URL(url, location.origin).pathname.replace('/api/v1', '');
 const user = { id:'mobile-fixture', name:'Mobile Learner', email:'mobile@example.test', role:'learner', targetExam:'PTE', targetScore:79, xp:240, streakDays:5, onboardingCompletedAt:'2026-09-01', subscription:{planId:'pro',planName:'Preparation',isActive:true,dailySubTestsUsed:2,dailySubTestsLimit:10,totalMockTestsAllowed:5,mockTestsUsed:1,bonusDays:0} };
 let data = {};
 if(path === '/profile') data = {user};
 else if(path === '/notifications') data = {notifications:[]};
 else if(path === '/progress') data = {skills:['speaking','writing','reading','listening'].map(skill=>({skill,estimate:65,available:100,completed:20,attempts:20,accuracy:70}))};
 else if(path === '/mistakes') data = {mistakes:[],pagination:{total:0,page:1,limit:20,totalPages:0}};
 else if(path.includes('reading/types')) data = {types:[],mockPassageCount:0};
 else if(path.includes('questions')) data = {questions:[],pagination:{total:0}};
 else if(path.includes('leaderboard')) data = {leaderboard:[],regions:[]};
 else if(path.includes('mock')) data = {mocks:[],reports:[]};
 else if(path.includes('subscription')) data = {plans:[],queuedPlans:[]};
 else if(path.includes('evaluation')) data = {evaluations:[],pagination:{total:0}};
 return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
};` });
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/dashboard','/subscription','/practice?skill=reading','/mocks','/evaluations','/profile','/privacy','/terms'];
let failures = 0;
for (const route of routes) {
 await send('Page.navigate', { url: 'http://127.0.0.1:4173'+route });
 await new Promise(r=>setTimeout(r,4000));
 for (const width of [320,375,393,768,1024,1440]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height:812,deviceScaleFactor:1,mobile:true});
  await new Promise(r=>setTimeout(r,350));
  const result = await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,text:(document.querySelector('main')?.innerText || document.body.innerText).slice(0,100),overflow:[...document.querySelectorAll('main *,header *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0 && r.right>innerWidth+1 && !el.closest('.overflow-x-auto')}).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,35)}))})`);
  if(result.scroll>width+1 || !result.text || result.text.includes("can't reach")) failures++;
  console.log(JSON.stringify({route,viewport:width,...result}));
  if(width===375 && route==='/dashboard') {
   const shot = await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   await writeFile(join(tmpdir(), 'prepyo-mobile-dashboard.png'),Buffer.from(shot.data,'base64'));
  }
 }
}
// Exercise the two shared overlays at a narrow, short landscape viewport.
await send('Emulation.setDeviceMetricsOverride',{width:375,height:400,deviceScaleFactor:1,mobile:true});
await send('Page.navigate', { url: 'http://127.0.0.1:4173/subscription' });
await new Promise(r=>setTimeout(r,2500));
await evaluate(`document.querySelector('header button')?.click()`);
await new Promise(r=>setTimeout(r,400));
const sidebar = await evaluate(`(() => { const panel = document.querySelector('aside.w-16')?.parentElement; const r = panel?.getBoundingClientRect(); return r ? {left:r.left,right:r.right,bottom:r.bottom} : null; })()`);
if (!sidebar || sidebar.left < -1 || sidebar.right > 376 || sidebar.bottom > 401) failures++;
console.log('Mobile sidebar bounds:',sidebar);
await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
await new Promise(r=>setTimeout(r,400));
await evaluate(`document.querySelector('[aria-label="Subscription plans"] button:not(:disabled)')?.click()`);
await new Promise(r=>setTimeout(r,800));
const dialog = await evaluate(`(() => { const el = document.querySelector('[role="dialog"]'); const r = el?.getBoundingClientRect(); return r ? {left:r.left,right:r.right,top:r.top,bottom:r.bottom} : null; })()`);
if (!dialog || dialog.left < 0 || dialog.right > 375 || dialog.top < 0 || dialog.bottom > 400) failures++;
console.log('Mobile checkout bounds:',dialog);
await send('Page.close');
ws.close();
clearTimeout(watchdog);
console.log('Failed viewport cases:',failures, 'Browser exceptions:',browserErrors);
process.exitCode = failures || browserErrors ? 1 : 0;
