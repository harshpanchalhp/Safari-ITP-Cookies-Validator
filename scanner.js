import dns from 'node:dns/promises';
import net from 'node:net';
import https from 'node:https';
import http from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const runFile=promisify(execFile);

export function publicAddress(ip) {
  if(net.isIP(ip)===4){
    const [a,b,c]=ip.split('.').map(Number);
    return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===2))||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113));
  }
  return net.isIP(ip)===6 && /^[23]/.test(ip) && !/^2001:(?:db8|0|10|20):/i.test(ip);
}
export function normalizeUrl(input){
  const url=new URL(input.includes('://')?input:`https://${input}`);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port&&!['80','443'].includes(url.port)) throw new Error('Use a public HTTP(S) URL on port 80 or 443 without credentials.');
  url.hash='';return url;
}
export function analyzeCookie(header,source){
  const parts=header.split(';').map(p=>p.trim());
  const first=parts.shift();const split=first.indexOf('=');
  const name=split<0?first:first.slice(0,split);
  const attrs={};for(const p of parts){const i=p.indexOf('=');attrs[(i<0?p:p.slice(0,i)).toLowerCase()]=i<0?true:p.slice(i+1);}
  const findings=[];const add=(level,message)=>findings.push({level,message});
  if(!attrs.secure) add('warning','Missing Secure: cookie can be sent over HTTP.');
  if(!attrs.httponly) add('info','JavaScript can access this cookie; HttpOnly protects cookies that do not need script access.');
  const same=String(attrs.samesite||'unspecified').toLowerCase();
  if(same==='none'&&!attrs.secure) add('error','SameSite=None requires Secure in modern browsers.');
  if(!['none','strict','lax','unspecified'].includes(same)) add('warning','Unrecognized SameSite value.');
  if(same==='unspecified') add('info','SameSite is unspecified; modern browsers generally default to Lax.');
  if(name.startsWith('__Secure-')&&!attrs.secure) add('error','__Secure- cookies require Secure.');
  if(name.startsWith('__Host-')&&(!attrs.secure||attrs.domain||attrs.path!=='/')) add('error','__Host- cookies require Secure, Path=/, and no Domain.');
  if(attrs.secure&&new URL(source).protocol!=='https:') add('error','Secure cookie delivered over HTTP may be rejected.');
  let lifetime=null;
  if(attrs['max-age']!==undefined&&/^-?\d+$/.test(attrs['max-age'])) lifetime=Number(attrs['max-age']);
  else if(attrs.expires&&Number.isFinite(Date.parse(attrs.expires))) lifetime=Math.round((Date.parse(attrs.expires)-Date.now())/1000);
  if(lifetime!==null&&lifetime<=0) add('info','This header expires or deletes the cookie.');
  add('itp','Safari generally blocks third-party cookies, regardless of SameSite=None or Secure. Storage Access API exceptions require browser-specific conditions.');
  add('itp','Observed Set-Cookie is server-set. The general seven-day cap on script-created cookies cannot be inferred from this header. ITP can apply additional limits to cloaked tracking responses.');
  return {name,source,attributes:attrs,lifetimeSeconds:lifetime,findings};
}
async function fetchHeaders(url){
  const host=url.hostname.replace(/^\[|\]$/g,'');
  if(process.env.HTTPS_PROXY || process.env.HTTP_PROXY){
    // The managed egress proxy resolves destinations. Only explicitly trusted
    // hosts may use this path; do not skip DNS checks for arbitrary user input.
    const allowed=(process.env.SCAN_ALLOWED_HOSTS||'github.com').split(',').map(s=>s.trim().toLowerCase());
    if(!allowed.includes(host.toLowerCase()) || net.isIP(host) || host==='localhost') throw new Error('This proxy environment only scans explicitly allowed hosts. Set SCAN_ALLOWED_HOSTS and permit those domains in environment network settings.');
    const {stdout}=await runFile('curl',['--silent','--show-error','--max-time','10','--max-filesize','5242880','--proto','=http,https','--noproxy','','--dump-header','-','--output','/dev/null','--user-agent','Safari-ITP-Cookies-Validator/1.0',url.href],{maxBuffer:65536,timeout:12000}).catch(()=>{throw new Error('Website request failed: check network permissions, TLS, response size, or timeout.');});
    const blocks=stdout.trim().split(/\r?\n\r?\n/);const lines=blocks.at(-1).split(/\r?\n/);const status=Number(lines.shift().split(' ')[1]);
    if(!status)throw new Error('Invalid response from website.');
    const headers=lines.map(l=>{const i=l.indexOf(':');return [l.slice(0,i).toLowerCase(),l.slice(i+1).trim()];});
    return {status,location:headers.find(([k])=>k==='location')?.[1],cookies:headers.filter(([k])=>k==='set-cookie').map(([,v])=>v)};
  }
  const addresses=await dns.lookup(host,{all:true});
  if(!addresses.length||addresses.some(a=>!publicAddress(a.address))) throw new Error('Only public internet destinations are allowed.');
  const chosen=addresses[0];
  return new Promise((resolve,reject)=>{
    const request=(url.protocol==='https:'?https:http).request(url,{method:'GET',headers:{'User-Agent':'Safari-ITP-Cookies-Validator/1.0','Accept':'text/html'},lookup:(_h,_o,cb)=>cb(null,chosen.address,chosen.family),agent:false,maxHeaderSize:32768},res=>{
      const result={status:res.statusCode,location:res.headers.location,cookies:res.headers['set-cookie']||[]};res.destroy();resolve(result);
    });
    request.setTimeout(8000,()=>request.destroy(new Error('Website request timed out.')));
    request.on('error',reject);request.end();
  });
}
export async function scan(input){
  let url=normalizeUrl(input);const hops=[];const cookies=[];
  for(let i=0;i<6;i++){
    const result=await fetchHeaders(url);hops.push({url:url.href,status:result.status,cookieCount:result.cookies.length});
    cookies.push(...result.cookies.map(h=>analyzeCookie(h,url.href)));
    if([301,302,303,307,308].includes(result.status)&&result.location){if(i===5)throw new Error('Too many redirects.');url=normalizeUrl(new URL(result.location,url).href);continue;}
    return {url:url.href,scannedAt:new Date().toISOString(),hops,cookies};
  }
}
