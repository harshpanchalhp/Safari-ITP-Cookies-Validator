import { chromium } from 'playwright';
import { getDomain } from 'tldts';
import { normalizeUrl, publicAddress, analyzeCookie } from './scanner.js';
import dns from 'node:dns/promises';
import net from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const run = promisify(execFile);
const providers = [
 ['google-analytics.com','Google Analytics','analytics'], ['googletagmanager.com','Google Tag Manager','tag manager'],
 ['doubleclick.net','Google advertising','advertising'], ['googleadservices.com','Google Ads','advertising'],
 ['facebook.net','Meta Pixel','advertising'], ['facebook.com','Meta','advertising'],
 ['hs-analytics.net','HubSpot Analytics','analytics'], ['hs-scripts.com','HubSpot','tag loader'],
 ['hsadspixel.net','HubSpot advertising pixel','advertising'], ['hs-banner.com','HubSpot consent','consent'], ['hubspot.com','HubSpot','marketing'],
 ['hotjar.com','Hotjar','session analytics'], ['clarity.ms','Microsoft Clarity','session analytics'],
 ['bing.com','Microsoft advertising','advertising'], ['tiktok.com','TikTok','advertising'],
 ['linkedin.com','LinkedIn','advertising'], ['ads-twitter.com','X advertising','advertising']
];
export function safeUrl(raw) { try {const u=new URL(raw);return ['http:','https:'].includes(u.protocol)?`${u.origin}${u.pathname}`:'(non-HTTP frame)';}catch{return '(unsupported URL)';} }
export function classify(raw, firstParty) {
 const u=new URL(raw); const host=u.hostname;
 const provider=providers.find(([domain])=>host===domain||host.endsWith(`.${domain}`));
 const site=h=>getDomain(h,{allowPrivateDomains:true})||h;
 return {host,thirdParty:site(host)!==site(new URL(firstParty).hostname),provider:provider?.[1]||null,category:provider?.[2]||'unclassified',pixelCandidate:/\/(?:tr|collect|g\/collect|pixel|beacon)(?:\/|$)/i.test(u.pathname)};
}
async function destination(raw) {
 const u=normalizeUrl(raw), host=u.hostname.replace(/^\[|\]$/g,'');
 if(process.env.HTTPS_PROXY||process.env.HTTP_PROXY){
  const allowed=(process.env.SCAN_ALLOWED_HOSTS||'github.com').split(',').map(s=>s.trim().toLowerCase());
  if(!allowed.includes(host.toLowerCase())||net.isIP(host)||host==='localhost')throw new Error('Host not in SCAN_ALLOWED_HOSTS');
  return {url:u,args:['--noproxy','']};
 }
 const addresses=await dns.lookup(host,{all:true});
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new Error('Private or reserved destination blocked');
 const ip=addresses[0].address;
 return {url:u,args:['--proxy','','--resolve',`${host}:${u.port||(u.protocol==='https:'?'443':'80')}:${net.isIP(ip)===6?`[${ip}]`:ip}`]};
}
async function resource(request) {
 const target=await destination(request.url());
 if(!['GET','POST','HEAD','OPTIONS'].includes(request.method()))throw new Error('Request method blocked');
 const dir=await mkdtemp(path.join(os.tmpdir(),'cookie-browser-'));
 try {
  const args=['--silent','--show-error','--compressed','--max-time','10','--max-filesize','5242880','--proto','=http,https',...target.args,'--request',request.method(),'--dump-header',path.join(dir,'headers'),'--output',path.join(dir,'body')];
  // Store request headers in a private temporary file, never in command arguments or reports.
  const headers=await request.allHeaders();
  await writeFile(path.join(dir,'request-headers'),Object.entries(headers).filter(([k])=>!['host','connection','content-length','accept-encoding'].includes(k)).map(([k,v])=>`${k}: ${v}`).join('\n'),{mode:0o600});
  args.push('--header',`@${path.join(dir,'request-headers')}`);
  const payload=request.postDataBuffer();if(payload){if(payload.length>65536)throw new Error('Request payload too large');await writeFile(path.join(dir,'request-body'),payload,{mode:0o600});args.push('--data-binary',`@${path.join(dir,'request-body')}`);}
  args.push(target.url.href);
  await run('curl',args,{timeout:12000,maxBuffer:4096}).catch(()=>{throw new Error('Network/TLS/size/timeout failure');});
  const raw=await readFile(path.join(dir,'headers'),'utf8');const lines=raw.trim().split(/\r?\n\r?\n/).at(-1).split(/\r?\n/);const status=Number(lines.shift().split(' ')[1]);
  const resultHeaders={},cookies=[];
  for(const line of lines){const i=line.indexOf(':');if(i<1)continue;const key=line.slice(0,i).toLowerCase(),value=line.slice(i+1).trim();if(key==='set-cookie')cookies.push(value);else if(!['content-encoding','content-length','transfer-encoding','connection'].includes(key))resultHeaders[key]=value;}
  if(cookies.length)resultHeaders['set-cookie']=cookies.join('\n');
  return {status,headers:resultHeaders,body:await readFile(path.join(dir,'body')),cookies};
 }finally{await rm(dir,{recursive:true,force:true});}
}
async function executable() {
 if(process.env.BROWSER_EXECUTABLE_PATH)return process.env.BROWSER_EXECUTABLE_PATH;
 try{await access('/usr/bin/chromium');return '/usr/bin/chromium';}catch{return undefined;}
}
export async function browserScan(input,{consentSelector='',waitMs=4000,transport=resource}={}) {
 await destination(normalizeUrl(input).href);
 if(typeof consentSelector!=='string'||consentSelector.length>300)throw new Error('Consent selector must be at most 300 characters.');
 const browser=await chromium.launch({headless:true,executablePath:await executable(),args:['--disable-dev-shm-usage']});
 const started=Date.now();const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});
 const requests=[],responseCookies=[],warnings=[];let phase='before-consent';let closing=false;let inFlight=0;
 try {
  await context.routeWebSocket(/.*/,ws=>ws.close());
  await context.addInitScript(()=>{
   const writes=[];Object.defineProperty(window,'__cookieLensWrites',{value:writes});
   const descriptor=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
   if(descriptor?.set)Object.defineProperty(Document.prototype,'cookie',{...descriptor,set(value){
    const parts=String(value).split(';'),first=parts.shift(),i=first.indexOf('=');
    if(writes.length<200)writes.push({name:first.slice(0,i<0?first.length:i).trim(),attributes:parts.map(s=>s.trim())});
    descriptor.set.call(this,value);
   }});
  });
  await context.route('**/*',async route=>{
   const req=route.request();const entry={url:safeUrl(req.url()),type:req.resourceType(),method:req.method(),phase,outcome:'pending'};
   if(requests.length>=250||Date.now()-started>40000||closing){await route.abort();return;}
   requests.push(entry);
   while(inFlight>=8&&!closing&&Date.now()-started<40000)await new Promise(resolve=>setTimeout(resolve,25));
   if(closing||Date.now()-started>=40000){entry.outcome='blocked';entry.reason='Scan time limit';await route.abort().catch(()=>{});return;}
   inFlight++;
   try{const response=await transport(req);entry.status=response.status;entry.outcome=response.status>=400?'http-error':'loaded';
    responseCookies.push(...response.cookies.map(h=>({...analyzeCookie(h,entry.url),phase:entry.phase,origin:'response-header'})));
    if([301,302,303,307,308].includes(response.status)&&response.headers.location){
     // Chromium does not re-run route interception for HTTP redirect targets.
     // Validate and turn document redirects into a fresh routed navigation.
     const next=await destination(new URL(response.headers.location,req.url()).href);
     if(req.resourceType()!=='document')throw new Error('Subresource redirect blocked for destination safety');
     const target=JSON.stringify(next.url.href).replaceAll('<','\\u003c');
     await route.fulfill({status:200,headers:{'content-type':'text/html',...(response.headers['set-cookie']?{'set-cookie':response.headers['set-cookie']}:{})},body:`<!doctype html><script>location.replace(${target})</script>`});
    }else await route.fulfill({status:response.status,headers:response.headers,body:response.body});
   }catch(error){entry.outcome='blocked';entry.reason=error.message;await route.abort().catch(()=>{});}finally{inFlight--;}
  });
  const page=await context.newPage();page.on('dialog',d=>d.dismiss());page.on('download',d=>d.cancel());
  page.on('popup',popup=>popup.close());
  try{await page.goto(normalizeUrl(input).href,{waitUntil:'domcontentloaded',timeout:20000});}catch(error){warnings.push('Navigation did not complete; captured observations are partial.');}
  const pause=()=>page.waitForTimeout(Math.min(8000,Math.max(0,Number(waitMs)||0)));
  await pause();
  async function snapshot(label){
   const cookies=(await context.cookies()).map(({value,...cookie})=>cookie);
   const frames=[];
   for(const frame of page.frames().slice(0,20)){
    try{const result=await frame.evaluate(()=>{
     const keys=store=>{try{return Object.keys(store).slice(0,200);}catch{return [];}};
     return {localStorageKeys:keys(localStorage),sessionStorageKeys:keys(sessionStorage),scriptCookieWrites:window.__cookieLensWrites||[],scripts:Array.from(document.scripts).slice(0,200).map(s=>({src:s.src||null,inline:!s.src,type:s.type||'classic'}))};
    });frames.push({url:safeUrl(frame.url()),...result,scripts:result.scripts.map(s=>({...s,src:s.src?safeUrl(s.src):null}))});}catch{frames.push({url:safeUrl(frame.url()),unavailable:true});}
   }
   return {phase:label,cookies,frames};
  }
  const snapshots=[await snapshot('before-consent')];let consent={requested:Boolean(consentSelector),clicked:false};
  if(consentSelector){phase='after-consent';try{await page.locator(consentSelector).first().click({timeout:3000});consent.clicked=true;await pause();snapshots.push(await snapshot('after-consent'));}catch{warnings.push('Consent selector could not be clicked; no post-consent comparison is available.');}}
  const finalUrl=safeUrl(page.url());
  if(requests.some(r=>r.outcome==='pending'))warnings.push('Some requests were still pending when the observation window ended.');
  for(const entry of requests){try{Object.assign(entry,classify(entry.url,finalUrl.startsWith('http')?finalUrl:normalizeUrl(input).href));}catch{}}
  if(requests.some(r=>r.outcome==='blocked'||r.outcome==='http-error'))warnings.push('Some resources were blocked or failed. Missing downstream trackers must not be treated as absent.');
  if(requests.length>=250)warnings.push('Request capture limit reached.');
  return {mode:'browser',engine:'Chromium',url:finalUrl,scannedAt:new Date().toISOString(),consent,snapshots,requests,cookies:responseCookies,trackers:requests.filter(r=>r.provider||r.pixelCandidate),warnings,limitations:['Chromium observations do not reproduce Safari ITP.','Provider and pixel matching are heuristic; tag managers are not proof of a fired tracking pixel.','The initial snapshot has no automated consent interaction; consent defaults may already permit tracking.','Document redirects are validated and replayed as fresh navigations; subresource redirects are blocked for destination safety.', 'Only the supplied page and optional selected consent interaction are scanned. Service workers, WebSockets and popups are blocked.','Cookie/storage values and URL query strings are excluded; names and URL paths can still contain identifiers.']};
 }finally{closing=true;await context.close();await browser.close();}
}
