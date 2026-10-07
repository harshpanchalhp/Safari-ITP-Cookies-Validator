import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {scan} from './scanner.js';
import {browserScan} from './browser-scanner.js';
const files={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
let active=0;
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'");
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/scan'&&req.method==='POST'){
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    if(active>=2){res.writeHead(429);res.end(JSON.stringify({error:'Scanner is busy. Try again shortly.'}));return;}
    active++;try{let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)throw new Error('Request is too large.');}
      const options=JSON.parse(body);const input=options.url;if(typeof input!=='string'||!input.trim())throw new Error('Enter a website URL.');
      if(options.mode && !['header','browser'].includes(options.mode))throw new Error('Unknown scan mode.');
      const result=options.mode==='browser'?await browserScan(input.trim(),{consentSelector:options.consentSelector||''}):await scan(input.trim());res.end(JSON.stringify(result));
    }catch(error){res.writeHead(400);res.end(JSON.stringify({error:error.message}));}finally{active--;}return;
  }
  if(req.method==='GET'&&files[url.pathname]){const [file,type]=files[url.pathname];res.setHeader('Content-Type',type);res.end(await readFile(new URL(`./public/${file}`,import.meta.url)));return;}
  res.writeHead(404);res.end('Not found');
});
server.requestTimeout=15000;
server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log('Cookie validator listening on port '+(process.env.PORT||3000)));
