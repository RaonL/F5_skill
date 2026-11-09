import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const states = ['검토 중', '고객 회신 대기', 'F5 확인 대기', '검토 완료'];
const seeds = [
  ['NGINX', 'HTTP Load Balancing', 'HTTP Load Balancing Methods', '버전 미지정', 'https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/#choosing-a-load-balancing-method', 'Least Connections – A request is sent to the server with the least number of active connections.', 'least_conn least connections 최소 연결 로드밸런싱 부하분산'],
  ['BIG-IP DNS','Configuring DNS Express','About configuring DNS Express','14.1.0 문서','https://techdocs.f5.com/en-us/bigip-14-1-0/big-ip-dns-services-implementations/configuring-dns-express.html','This involves a zone transfer from the authoritative DNS server into DNS Express and then DNS Express can answer DNS queries for the zone.','권한 DNS 영역 전송 존 이전 zone transfer'],
  ['Distributed Cloud','Distributed Cloud Technical Knowledge','Changelogs','서비스 문서','https://docs.cloud.f5.com/docs-v2','Changelogs Details on features, bugs, fixes, and caveats for platform and service functions.','XC 릴리스 변경 업데이트 release notes changelog'],
];

export function openStore(dir) {
  mkdirSync(dir,{recursive:true});
  const db = new DatabaseSync(join(dir,'desk.sqlite'));
  db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS docs(id INTEGER PRIMARY KEY, product TEXT, title TEXT, section TEXT, version TEXT, url TEXT, excerpt TEXT, keywords TEXT, kind TEXT);
    CREATE TABLE IF NOT EXISTS cases(id INTEGER PRIMARY KEY, inquiry TEXT, product TEXT, version TEXT, draft TEXT DEFAULT '', status TEXT DEFAULT '검토 중', revision INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY, case_id INTEGER, stamp TEXT DEFAULT CURRENT_TIMESTAMP, action TEXT, draft TEXT, status TEXT, evidence TEXT);
  `);
  const createDoc=db.prepare('INSERT INTO docs(product,title,section,version,url,excerpt,keywords,kind) VALUES(?,?,?,?,?,?,?,?)');
  if(!db.prepare('SELECT id FROM docs LIMIT 1').get()){
    db.exec('BEGIN');
    try {for(const seed of seeds) createDoc.run(...seed,'공식 문서'); db.exec('COMMIT');}
    catch(e){db.exec('ROLLBACK');throw e;}
  }
  return {db,createDoc};
}

export function search(docs, ticket) {
  const words = [...new Set((ticket.inquiry+' '+ticket.product).toLowerCase().match(/[\p{L}\p{N}_.-]+/gu)||[])].filter(w=>w.length>1);
  return docs.map(doc=>{
    const terms=(doc.product+' '+doc.title+' '+doc.section+' '+doc.keywords+' '+doc.excerpt+' '+doc.version).toLowerCase();
    const score=words.reduce((sum,w)=>sum+(terms.includes(w)?2:0),0);
    const versionMatch=ticket.version && doc.version.includes(ticket.version);
    return {doc,score:score ? score+(versionMatch?1:0):0};
  }).filter(hit=>hit.score>0).sort((a,b)=>b.score-a.score||a.doc.id-b.doc.id).slice(0,5).map(hit=>hit.doc);
}
