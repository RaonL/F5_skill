import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {openStore} from '../store.mjs';
import {reviewCall,reviewInstructions,reviewTools} from './review.mjs';

const catalog=JSON.parse(readFileSync(new URL('./sources.json',import.meta.url),'utf8'));
const {db,createDoc}=openStore(process.env.F5_DESK_DATA || fileURLToPath(new URL('../data/',import.meta.url)));
const catalogById=new Map(catalog.map(s=>[s.id,s]));
const dbDocs=db.prepare('SELECT id, product, title, section, version, url, excerpt, keywords, kind FROM docs ORDER BY id');
const versions=['2025-11-25','2025-06-18','2025-03-26','2024-11-05'];
function excerptRecord(doc){
  const digest=createHash('sha256').update(JSON.stringify(doc)).digest('hex').slice(0,16);
  return {id:'doc-'+doc.id+'-'+digest,title:doc.title,product:doc.product,url:doc.url,kind:doc.kind,
    state:'저장된 발췌문 · 현행성 재확인 필요', keywords:doc.keywords,
    passage:{section:doc.section,version:doc.version||'버전 미상',text:doc.excerpt}};
}
function allRecords(){return [...catalog,...dbDocs.all().map(excerptRecord)];}
function header({id,title,product,url,kind,state,checked,passage}){
  return {id,title,product,url,kind,state,checked:checked||null,section:passage?.section||null,version:passage?.version||null,has_excerpt:Boolean(passage)};
}
function tokens(text){return text.toLowerCase().match(/[\p{L}\p{N}_.-]+/gu)||[];}
function rank(record,query){
  const terms=new Set(tokens([record.id,record.title,record.product,record.kind,record.keywords,record.passage?.version,record.passage?.section,record.passage?.text].filter(Boolean).join(' ')));
  return query.reduce((score,q)=>{
    if(terms.has(q))return score+4;
    if(/^[가-힣]+$/.test(q)&&[...terms].some(t=>t.length>=2&&q.startsWith(t)))return score+1;
    if([...terms].some(t=>/^[a-z0-9-]+$/.test(t)&&q.startsWith(t)&&/^[가-힣]+$/.test(q.slice(t.length))))return score+2;
    return score;
  },0);
}
const tools=[
  {name:'list_sources',description:'사용자가 지정한 출처 10개의 종류, 링크, 원문 확인 상태를 조회합니다.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'search_sources',description:'등록 자료를 문서 번호·한영 제품명·키워드로 검색합니다. 검색된 문서 ID를 read_source에 전달하세요. 수집 범위는 등록된 발췌 및 출처 목록입니다.',inputSchema:{type:'object',properties:{query:{type:'string',minLength:1,maxLength:500}},required:['query'],additionalProperties:false}},
  {name:'read_source',description:'등록된 ID로 출처와 근거 구절·절·버전을 확인합니다. excerpt가 null이면 원문을 추가로 확인하세요. 커뮤니티 사례와 외부 표준은 F5 지원 조건을 보증하지 않습니다.',inputSchema:{type:'object',properties:{id:{type:'string',minLength:1,maxLength:100}},required:['id'],additionalProperties:false}}
].map(tool=>({...tool,annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}}));

function call(name,args){
  if(reviewTools.some(t=>t.name===name))return reviewCall(name,args,{db,createDoc,records:allRecords,rank,tokens});
  const expected={list_sources:null,search_sources:'query',read_source:'id'};
  if(!Object.hasOwn(expected,name))throw Error('등록되지 않은 도구입니다.');
  const key=expected[name];
  if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>k!==key))throw Error('도구 인수를 확인하세요.');
  if(key&&(typeof args[key]!=='string'||!args[key].trim()||args[key].length>(key==='query'?500:100)))throw Error('검색어나 문서 ID를 확인하세요.');
  if(name==='list_sources')return catalog.map(header);
  if(name==='search_sources'){
    const words=[...new Set(tokens(args.query))];
    const matches=allRecords().map(record=>({record,score:rank(record,words)})).filter(hit=>hit.score>0).sort((a,b)=>b.score-a.score);
    return {results:matches.slice(0,8).map(hit=>header(hit.record)),scope:'로컬 자료 목록과 저장된 발췌문'};
  }
  const record=catalogById.get(args.id)||dbDocs.all().map(excerptRecord).find(d=>d.id===args.id);
  if(!record)throw Error('자료 ID를 찾을 수 없습니다. 다시 검색하세요.');
  return {...header(record),excerpt:record.passage?.text||null,
    review:record.passage?'이 절이 질문의 제품·버전과 일치하는지 검토하세요.':'발췌문이 없습니다. 기술 답변에는 원문 확인이 필요합니다.'};
}
function handle(message){
  const {method,id,params}=message;
  if(method==='initialize'){
    if(!params||typeof params.protocolVersion!=='string')return {error:{code:-32602,message:'Missing protocolVersion'}};
    return {result:{protocolVersion:versions.includes(params.protocolVersion)?params.protocolVersion:versions[0],capabilities:{tools:{}},serverInfo:{name:'f5-reference',version:'0.2.0'},instructions:reviewInstructions}};
  }
  if(method==='ping')return {result:{}};
  if(method==='tools/list')return {result:{tools:[...tools,...reviewTools]}};
  if(method==='tools/call'){
    try{
      const value=call(params?.name,params?.arguments??{});
      return {result:{content:[{type:'text',text:JSON.stringify(value)}]}};
    }catch(e){return {result:{isError:true,content:[{type:'text',text:e.message}]}};}
  }
  return {error:{code:-32601,message:'Method not found'}};
}
const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
function write(id,body){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,...body})+'\n');}
for await(const line of lines){
  if(!line.trim())continue;
  let msg;
  try{msg=JSON.parse(line);}catch{write(null,{error:{code:-32700,message:'Parse error'}});continue;}
  if(!msg||msg.jsonrpc!=='2.0'||typeof msg.method!=='string'){write(null,{error:{code:-32600,message:'Invalid request'}});continue;}
  if(!Object.hasOwn(msg,'id'))continue;
  try{write(msg.id,handle(msg));}catch{write(msg.id,{error:{code:-32603,message:'Internal error'}});}
}
db.close();
