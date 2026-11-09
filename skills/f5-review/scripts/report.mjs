import { readFile } from 'node:fs/promises';

function required(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(field + '에 비어 있지 않은 문자열이 필요합니다.');
  }
  return value;
}

function validate(record) {
  for (const key of ['title', 'environment', 'evidenceSource']) required(record[key], key);
  if (record.document !== undefined) {
    for (const key of ['title', 'url', 'scope']) required(record.document?.[key], 'document.' + key);
    if (new URL(record.document.url).protocol !== 'https:') throw new Error('문서 주소는 HTTPS여야 합니다.');
  }
  if (!Array.isArray(record.rows) || !record.rows.length) throw new Error('시험 행이 필요합니다.');
  for (const [i, row] of record.rows.entries()) {
    const field = key => 'rows[' + i + '].' + key;
    for (const key of ['target', 'protocol', 'connection']) required(row?.[key], field(key));
    for (const key of ['packetEvidence', 'classification']) {
      if (row[key] !== null) required(row[key], field(key));
    }
    if (row.logSni !== '' && row.logSni !== null) required(row.logSni, field('logSni'));
  }
}

function cell(text) {
  return (text ?? '자료 없음').replaceAll('\\', '\\\\').replaceAll('|', '\\|').replace(/\r\n|\r|\n/g, ' ');
}

function report(record) {
  validate(record);
  const lines = ['# ' + record.title, '', record.environment, '', '관찰 출처 · ' + record.evidenceSource];
  if (record.document) {
    const doc = record.document;
    lines.push('', doc.scope, '', '[' + doc.title + '](<' + doc.url + '>)');
  }
  lines.push('', '| 대상 | 프로토콜 | 패킷 관찰 | PEM SNI 추출 | PEM 분류 | 접속 관찰 |',
    '|---|---|---|---|---|---|');
  for (const row of record.rows) {
    let sni = '미확인 · 로그 자료 없음';
    if (row.logSni === '') sni = '미추출 · 빈 값';
    else if (row.logSni !== null) sni = '추출 · ' + row.logSni;
    const fields = [row.target, row.protocol, row.packetEvidence, sni, row.classification, row.connection];
    lines.push('| ' + fields.map(cell).join(' | ') + ' |');
  }
  return lines.join('\n');
}

try {
  if (process.argv.length !== 3) throw new Error('사용법: node scripts/report.mjs <기록.json>');
  console.log(report(JSON.parse(await readFile(process.argv[2], 'utf8'))));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
