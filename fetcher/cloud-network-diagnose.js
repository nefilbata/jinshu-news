import dns from 'node:dns/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
const exec = promisify(execFile);
await mkdir('cloud-results', { recursive: true });
const targets = [
  ['rss.cnki.net', 'https://rss.cnki.net/knavi/rss/WENW?pcode=CJFD,CCJD', '121.194.4.133'],
  ['www.ctwx.tsinghua.edu.cn', 'https://www.ctwx.tsinghua.edu.cn/kxyj/zxky.htm', '101.6.15.66'],
  ['hz.ahu.edu.cn', 'https://hz.ahu.edu.cn/6036/list.htm', '101.76.160.55'],
];
const results = [];
for (const [host, url, observedAddress] of targets) {
  const item = {host, url, probes: []};
  try { item.systemDns = await dns.lookup(host, {all: true}); } catch (e) { item.systemDnsError = e.message; }
  try { item.doh = await (await fetch(`https://dns.alidns.com/resolve?name=${host}&type=A`, {signal: AbortSignal.timeout(10000)})).json(); } catch(e) { item.dohError = e.message; }
  const addresses = [...new Set([...(item.doh?.Answer || []).filter(x=>x.type===1).map(x=>x.data), observedAddress])];
  for (const address of [null, ...addresses]) {
    const args = ['--silent','--show-error','--location','--max-time','15','--user-agent','Mozilla/5.0','--write-out','\nSTATUS:%{http_code} IP:%{remote_ip} VERIFY:%{ssl_verify_result}'];
    if (address) args.push('--resolve', `${host}:443:${address}`);
    args.push(url);
    try { const r=await exec('curl',args,{maxBuffer:4000000});item.probes.push({address,ok:true,bytes:r.stdout.length,start:r.stdout.slice(0,180),tail:r.stdout.slice(-150),stderr:r.stderr.slice(0,500)}); }
    catch(e) { item.probes.push({address,ok:false,code:e.code,error:e.stderr?.slice(0,900)||e.message,tail:e.stdout?.slice(-150)}); }
  }
  results.push(item);
  console.log('[network-diagnostic]', JSON.stringify(item));
}
await writeFile('cloud-results/network-diagnostic.json',JSON.stringify(results,null,2));
