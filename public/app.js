const form=document.querySelector('#scan-form'),status=document.querySelector('#status'),button=document.querySelector('#submit');let report;
function el(tag,text,className){const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;}
form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;status.className='';status.textContent='Scanning website… Browser scans may take up to a minute.';document.querySelector('#results').hidden=true;
try{const response=await fetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:document.querySelector('#url').value,mode:document.querySelector('#mode').value,consentSelector:document.querySelector('#consent-selector').value})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Scan failed.');report=data;
 const browserContainer=document.querySelector('#browser-report');browserContainer.replaceChildren();
 if(data.mode==='browser'){renderBrowser(data,browserContainer);}
 document.querySelector('#summary').textContent=data.mode==='browser'?`${data.requests.length} requests · ${data.trackers.length} tracker/pixel candidates · ${data.cookies.length} cookie headers. Final URL: ${data.url}`:`${data.cookies.length} Set-Cookie headers observed across ${data.hops.length} response(s). Final URL: ${data.url}`;
 const hops=document.querySelector('#hops');hops.replaceChildren(...(data.hops||[]).map(h=>el('p',`${h.status} · ${h.url} · ${h.cookieCount} cookie header(s)`)));
 const container=document.querySelector('#cookies');container.replaceChildren();
 if(!data.cookies.length)container.append(el('p','No Set-Cookie headers were observed. The website may set cookies through JavaScript, after consent, or on other pages. This does not establish ITP compliance.'));
 for(const cookie of data.cookies){const card=el('article','','cookie');card.append(el('h3',cookie.name),el('p',cookie.source,'source'));const attrs=el('div','','attrs');for(const [key,value]of Object.entries(cookie.attributes))attrs.append(el('span',value===true?key:`${key}=${value}`,'badge'));if(!Object.keys(cookie.attributes).length)attrs.append(el('span','No attributes','badge'));card.append(attrs);for(const f of cookie.findings)card.append(el('p',f.message,`finding ${f.level}`));container.append(card);}
 document.querySelector('#results').hidden=false;status.textContent='Analysis complete. ITP notes describe conditional behavior, not a compliance certification.';
}catch(error){status.className='error';status.textContent=error.message;}finally{button.disabled=false;}});
document.querySelector('#download').addEventListener('click',()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=el('a','');a.href=url;a.download='cookie-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});

function renderBrowser(data,container){
 container.append(el('h2','Browser observations · '+data.engine));
 for(const warning of data.warnings)container.append(el('p',warning,'finding warning'));
 container.append(el('p',data.consent.clicked?'Consent button clicked; before and after snapshots captured.':data.consent.requested?'Consent button could not be clicked.':'No consent button clicked.'));
 for(const snapshot of data.snapshots){const card=el('article','','cookie');card.append(el('h3',snapshot.phase),el('p',`${snapshot.cookies.length} cookies stored in the browser (values omitted).`));
  for(const c of snapshot.cookies)card.append(el('p',`${c.name} · ${c.domain} · ${c.httpOnly?'HttpOnly':'script-accessible'} · SameSite=${c.sameSite}`));
  for(const frame of snapshot.frames){card.append(el('p',frame.url,'source'));if(frame.unavailable){card.append(el('p','Frame storage unavailable'));continue;}
   card.append(el('p',`localStorage keys: ${frame.localStorageKeys.join(', ')||'none'}; sessionStorage keys: ${frame.sessionStorageKeys.join(', ')||'none'}`));
   card.append(el('p',`JavaScript cookie writes: ${frame.scriptCookieWrites.map(c=>c.name).join(', ')||'none'}`));
   card.append(el('p',`${frame.scripts.length} script elements (${frame.scripts.filter(s=>s.inline).length} inline).`));
  }container.append(card);
 }
 container.append(el('h3','Tracker and pixel candidates'));
 if(!data.trackers.length)container.append(el('p','No known provider or pixel endpoint matched. This does not prove an absence of tracking.'));
 for(const t of data.trackers)container.append(el('p',`${t.provider||'Pixel endpoint heuristic'} · ${t.category} · ${t.phase} · ${t.outcome} · ${t.url}`,'finding'));
 const details=el('details','');details.append(el('summary','All network requests and script URLs'));
 for(const r of data.requests)details.append(el('p',`${r.phase} · ${r.type} · ${r.thirdParty?'cross-site':'same-site'} · ${r.outcome}${r.status?' '+r.status:''}${r.reason?' ('+r.reason+')':''} · ${r.url}`,'source'));
 for(const s of data.snapshots)for(const f of s.frames)for(const script of f.scripts||[])if(script.src)details.append(el('p',`Script element · ${script.src}`,'source'));
 container.append(details);for(const limitation of data.limitations)container.append(el('p',limitation,'finding info'));
 container.append(el('p','Safari implications: third-party cookies are generally blocked; script-writable storage can be purged after seven days without interaction (days of Safari use). A pixel may transmit data without cookies. ITP is not a blanket block on all tracking requests. Actual classification and shorter conditional limits require Safari evidence.','finding itp'));
}
