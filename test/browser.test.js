import test from 'node:test';
import assert from 'node:assert/strict';
import {browserScan,classify,safeUrl} from '../browser-scanner.js';

test('classifies providers with site boundaries and removes query identifiers',()=>{
 assert.equal(classify('https://www.googletagmanager.com/gtm.js','https://shop.example.co.uk').provider,'Google Tag Manager');
 assert.equal(classify('https://cdn.example.co.uk/a','https://shop.example.co.uk').thirdParty,false);
 assert.equal(classify('https://evilgoogletagmanager.com/a','https://example.com').provider,null);
 assert.equal(safeUrl('https://example.com/pixel?token=SECRET#secret'),'https://example.com/pixel');
});

test('browser executes scripts and captures pixels, storage, cookies, consent delta and blocked requests',async()=>{
 const report=await browserScan('https://github.com',{waitMs:300,consentSelector:'#accept',transport:async req=>{
  const u=new URL(req.url());
  if(u.hostname==='127.0.0.1')throw new Error('Private destination blocked');
  if(u.pathname==='/')return {status:200,headers:{'content-type':'text/html','set-cookie':'server_cookie=SERVER_SECRET; Path=/; Secure; HttpOnly; SameSite=Lax'},cookies:['server_cookie=SERVER_SECRET; Path=/; Secure; HttpOnly; SameSite=Lax'],body:Buffer.from(`<!doctype html><button id="accept">Accept</button><script src="/tracking.js"></script>`)};
  if(u.pathname==='/tracking.js')return {status:200,headers:{'content-type':'text/javascript'},cookies:[],body:Buffer.from(`document.cookie='script_cookie=COOKIE_SECRET; Path=/; Secure';localStorage.setItem('analytics-id','STORAGE_SECRET');new Image().src='https://www.google-analytics.com/collect?id=QUERY_SECRET';fetch('http://127.0.0.1/private').catch(()=>{});document.querySelector('#accept').onclick=()=>{document.cookie='consented=CONSENT_SECRET; Path=/; Secure';sessionStorage.setItem('consent','STORAGE_SECRET');new Image().src='https://www.facebook.com/tr?id=QUERY_SECRET';};`)};
  return {status:200,headers:{'content-type':'image/gif'},cookies:[],body:Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64')};
 }});
 assert.equal(report.consent.clicked,true);
 assert.equal(report.snapshots.length,2);
 assert.ok(report.snapshots[0].cookies.some(c=>c.name==='server_cookie'));
 assert.ok(report.snapshots[0].frames[0].scriptCookieWrites.some(c=>c.name==='script_cookie'));
 assert.ok(report.snapshots[0].frames[0].localStorageKeys.includes('analytics-id'));
 assert.ok(!report.snapshots[0].cookies.some(c=>c.name==='consented'));
 assert.ok(report.snapshots[1].cookies.some(c=>c.name==='consented'));
 assert.ok(report.trackers.some(t=>t.provider==='Google Analytics'&&t.outcome==='loaded'));
 assert.ok(report.trackers.some(t=>t.provider==='Meta'&&t.phase==='after-consent'));
 assert.ok(report.requests.some(r=>r.host==='127.0.0.1'&&r.outcome==='blocked'));
 for(const secret of ['SERVER_SECRET','COOKIE_SECRET','STORAGE_SECRET','CONSENT_SECRET','QUERY_SECRET'])assert.ok(!JSON.stringify(report).includes(secret),secret);
});

test('redirect navigation is rechecked and captured',async()=>{
 const r=await browserScan('https://github.com',{waitMs:600,transport:async req=>{
  if(new URL(req.url()).pathname==='/')return {status:301,headers:{location:'https://github.com/landing'},cookies:[],body:Buffer.alloc(0)};
  return {status:200,headers:{'content-type':'text/html'},cookies:[],body:Buffer.from('<script>document.cookie="landing=yes; Secure; Path=/"</script>')};
 }});
 assert.equal(r.url,'https://github.com/landing');
 assert.ok(r.requests.some(x=>x.status===301));assert.ok(r.requests.some(x=>x.url.endsWith('/landing')));
 assert.ok(r.snapshots[0].cookies.some(c=>c.name==='landing'));
});
