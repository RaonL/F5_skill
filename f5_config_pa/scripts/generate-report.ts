import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { parseBigipConf } from '../src/parser/bigipParser'
import { analyzeConfig } from '../src/analyzer/analyzer'
import type { AnalysisResult } from '../src/types/f5'

const samplePath = resolve('sample-bigip.conf')

if (!existsSync(samplePath)) {
  console.error('sample-bigip.conf not found!')
  process.exit(1)
}

const content = readFileSync(samplePath, 'utf-8')
console.log(`📄 Loaded sample file: ${content.length} bytes`)

// Parse
const config = parseBigipConf(content, 'sample-bigip.conf')
console.log(`✅ Parsed: ${config.virtualServers.length} VS, ${config.pools.length} Pools, ${config.monitors.length} Monitors`)

// Analyze
const result = analyzeConfig(config)
console.log(`✅ Analyzed: ${result.totalUnused} unused objects found`)

// ---- Generate HTML Report ----
function esc(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const html = koHTMLReport(result, config)

writeFileSync(resolve('f5-report.html'), html, 'utf-8')
console.log('✅ Report saved to: f5-report.html')
console.log(`   File size: ${html.length} bytes`)

function koHTMLReport(result: AnalysisResult, config: any) {
  return koReportTemplate(result, config)
}

function koReportTemplate(result: AnalysisResult, _config: any) {
  const { config, vsPoolMappings, poolMemberMappings, unusedObjects } = result

  return koReportString(config, esc, unusedObjects, vsPoolMappings, poolMemberMappings, result)
}

function koReportString(
  config: any, esc: (s: string) => string,
  unusedObjects: any[], vsPoolMappings: any[], poolMemberMappings: any[], result: any
) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>F5 LTM 구성 분석 리포트</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', 'Noto Sans KR', sans-serif; background: #f1f5f9; color: #1e293b; }
    .header { background: linear-gradient(135deg, #0057b7 0%, #0ea5e9 100%); color: white; padding: 30px 40px; }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header p { opacity: 0.85; font-size: 14px; }
    .container { max-width: 1200px; margin: 0 auto; padding: 30px 20px; }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 30px; }
    .stat-card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .stat-card .num { font-size: 32px; font-weight: 700; }
    .stat-card .num.blue { color: #0057b7; }
    .stat-card .num.red { color: #dc2626; }
    .stat-card .num.green { color: #16a34a; }
    .stat-card .num.purple { color: #7c3aed; }
    .stat-card .label { font-size: 12px; color: #64748b; margin-top: 6px; font-weight: 500; }

    .section { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 24px; overflow: hidden; }
    .section-title { padding: 16px 20px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8fafc; padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-gray { background: #f1f5f9; color: #475569; }

    .vs-card { border: 1px solid #e2e8f0; border-radius: 8px; margin: 12px 16px; padding: 16px; }
    .vs-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .vs-card-title { font-weight: 600; font-size: 14px; }
    .vs-card-body { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .vs-card-body > div { font-size: 13px; color: #475569; }
    .vs-card-body strong { color: #1e293b; }

    .member-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
    .member-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .member-dot.up { background: #16a34a; }
    .member-dot.down { background: #dc2626; }
    .member-dot.unknown { background: #94a3b8; }

    .unused-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid #f1f5f9; }
    .unused-item:last-child { border-bottom: none; }

    .footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; }

    .topology-section { padding: 20px; text-align: center; }
    .topology-placeholder { background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 40px; color: #94a3b8; font-size: 14px; }

    @media (max-width: 768px) {
      .vs-card-body { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 F5 LTM 구성 분석 리포트</h1>
    <p>설정 파일: ${esc(config.fileName)} | 분석 시간: ${config.parsedAt}</p>
  </div>

  <div class="container">
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card"><div class="num blue">${result.totalVS}</div><div class="label">Virtual Server</div></div>
      <div class="stat-card"><div class="num green">${result.totalPools}</div><div class="label">Pool</div></div>
      <div class="stat-card"><div class="num purple">${result.totalMembers}</div><div class="label">Pool Member</div></div>
      <div class="stat-card"><div class="num blue">${result.totalMonitors}</div><div class="label">Monitor</div></div>
      <div class="stat-card"><div class="num green">${result.totalProfiles}</div><div class="label">Profile</div></div>
      <div class="stat-card"><div class="num ${unusedObjects.length > 0 ? 'red' : 'green'}">${unusedObjects.length}</div><div class="label">미사용 Object</div></div>
    </div>

    <!-- Virtual Server List -->
    <div class="section">
      <div class="section-title">🌐 Virtual Server 목록</div>
      <table>
        <tr><th>이름</th><th>Destination</th><th>Pool</th><th>SSL</th><th>Persistence</th><th>상태</th></tr>
        ${config.virtualServers.map((vs: any) => `<tr>
          <td><strong>${esc(vs.name)}</strong></td>
          <td>${esc(vs.destinationAddress)}:${vs.destinationPort}</td>
          <td>${esc(vs.pool || '-')}</td>
          <td>${esc(vs.profiles.filter((p: any) => p.context === 'clientside').map((p: any) => p.name).join(', ') || '-')}</td>
          <td>${esc(vs.persist.map((p: any) => p.name).join(', ') || '-')}</td>
          <td><span class="badge ${vs.enabled ? 'badge-green' : 'badge-red'}">${vs.enabled ? '활성' : '비활성'}</span></td>
        </tr>`).join('')}
      </table>
    </div>

    <!-- Pool Detail Cards -->
    <div class="section">
      <div class="section-title">📦 Pool 상세 정보</div>
      ${config.pools.map((pool: any) => {
        const usedByVS = vsPoolMappings
          .filter((m: any) => m.pool.includes(pool.name))
          .map((m: any) => m.vs.split('/').pop())
        return `<div class="vs-card">
          <div class="vs-card-header">
            <span class="vs-card-title">${esc(pool.name)}</span>
            <span class="badge ${usedByVS.length > 0 ? 'badge-green' : 'badge-red'}">${usedByVS.length > 0 ? usedByVS.length + '개 VS 연결' : '미사용'}</span>
          </div>
          <div class="vs-card-body">
            <div><strong>LB 방식:</strong> ${esc(pool.loadBalancingMode || 'round-robin')}</div>
            <div><strong>Monitor:</strong> ${esc(pool.monitors.join(', ') || '없음')}</div>
            <div><strong>연결 VS:</strong> ${usedByVS.length > 0 ? esc(usedByVS.join(', ')) : '<span style="color:#dc2626">없음</span>'}</div>
            <div><strong>Member:</strong> ${pool.members.length}개</div>
          </div>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9">
            ${pool.members.map((m: any) => `<div class="member-row">
              <span class="member-dot ${m.state === 'up' ? 'up' : m.state === 'down' ? 'down' : 'unknown'}"></span>
              <span>${esc(m.address)}:${m.port}</span>
              <span class="badge ${m.state === 'up' ? 'badge-green' : m.state === 'down' ? 'badge-red' : 'badge-gray'}">${esc(m.state || 'unknown')}</span>
              ${m.monitor ? `<span class="badge badge-blue">${esc(m.monitor)}</span>` : ''}
            </div>`).join('')}
          </div>
        </div>`
      }).join('')}
    </div>

    <!-- Monitor List -->
    <div class="section">
      <div class="section-title">📊 Monitor 목록</div>
      <table>
        <tr><th>이름</th><th>타입</th><th>Interval</th><th>Timeout</th><th>Send</th><th>Recv</th></tr>
        ${config.monitors.map((m: any) => `<tr>
          <td><strong>${esc(m.name)}</strong></td>
          <td><span class="badge badge-purple">${esc(m.type)}</span></td>
          <td>${m.interval || '-'}초</td>
          <td>${m.timeout || '-'}초</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(m.send || '')}">${esc(m.send?.substring(0, 40) || '-')}</td>
          <td>${esc(m.recv || '-')}</td>
        </tr>`).join('')}
      </table>
    </div>

    <!-- Profile / SSL / Persistence -->
    <div class="section">
      <div class="section-title">🔐 Profile / SSL / Persistence</div>
      <table>
        <tr><th>이름</th><th>타입</th><th>Context</th><th>연결 VS</th></tr>
        ${config.profiles.map((prof: any) => {
          const usedBy = config.virtualServers.filter((vs: any) =>
            vs.profiles.some((p: any) => p.name === prof.name)
          )
          return `<tr>
            <td><strong>${esc(prof.name)}</strong></td>
            <td><span class="badge badge-purple">${esc(prof.type || 'N/A')}</span></td>
            <td>${esc(prof.context || '-')}</td>
            <td>${usedBy.length > 0 ? esc(usedBy.map((v: any) => v.name).join(', ')) : '<span class="badge badge-red">미사용</span>'}</td>
          </tr>`
        }).join('')}
      </table>
    </div>

    <!-- iRule List -->
    <div class="section">
      <div class="section-title">📜 iRule 목록</div>
      <table>
        <tr><th>이름</th><th>연결 VS</th></tr>
        ${config.iRules.map((rule: any) => {
          const usedBy = config.virtualServers.filter((vs: any) =>
            vs.rules?.some((r: string) => r.includes(rule.name))
          )
          return `<tr>
            <td><strong>${esc(rule.name)}</strong></td>
            <td>${usedBy.length > 0 ? esc(usedBy.map((v: any) => v.name).join(', ')) : '<span class="badge badge-red">미사용</span>'}</td>
          </tr>`
        }).join('')}
      </table>
    </div>

    <!-- Unused Objects -->
    <div class="section">
      <div class="section-title">⚠️ 미사용 Object (${unusedObjects.length})</div>
      ${unusedObjects.length > 0 ? unusedObjects.map((u: any) => `<div class="unused-item">
        <span class="badge badge-red">${esc(u.type)}</span>
        <span><strong>${esc(u.name)}</strong></span>
        <span style="color:#64748b;font-size:12px;margin-left:auto">${esc(u.reason)}</span>
      </div>`).join('') : '<div style="padding:20px;text-align:center;color:#16a34a">✅ 사용되지 않는 Object가 없습니다.</div>'}
    </div>

    <!-- Node List -->
    <div class="section">
      <div class="section-title">🖥️ Node 목록</div>
      <table>
        <tr><th>이름</th><th>주소</th><th>Monitor</th><th>설명</th></tr>
        ${config.nodes.map((n: any) => {
          const isUsed = poolMemberMappings.some((m: any) => m.member.address === n.address)
          return `<tr>
            <td><strong>${esc(n.name)}</strong></td>
            <td>${esc(n.address)}</td>
            <td>${esc(n.monitor || '-')}</td>
            <td>${esc(n.description || '-')} ${!isUsed ? '<span class="badge badge-red">미사용</span>' : ''}</td>
          </tr>`
        }).join('')}
      </table>
    </div>

    <!-- SNAT Pools -->
    <div class="section">
      <div class="section-title">🌍 SNAT Pool 목록</div>
      <table>
        <tr><th>이름</th><th>Members</th></tr>
        ${config.snatPools.map((sp: any) => `<tr>
          <td><strong>${esc(sp.name)}</strong></td>
          <td>${esc(sp.members.join(', ') || '(empty)')}</td>
        </tr>`).join('')}
      </table>
    </div>

    <!-- Topology -->
    <div class="section">
      <div class="section-title">🗺️ 토폴로지</div>
      <div class="topology-section">
        <div class="topology-placeholder">
          <div style="font-size:40px;margin-bottom:16px">🌐</div>
          <div>토폴로지 다이어그램은 웹 대시보드에서 Mermaid.js로 시각화됩니다.</div>
          <div style="margin-top:8px;font-size:12px">아래 텍스트 기반 구조를 참고하세요:</div>
          <div style="margin-top:16px;text-align:left;max-width:500px;margin-left:auto;margin-right:auto;font-family:monospace;font-size:11px;line-height:1.8">
${config.virtualServers.map((vs: any) => {
  const pool = config.pools.find((p: any) => vs.pool?.includes(p.name))
  return `  🌐 ${esc(vs.name)} (${esc(vs.destinationAddress)}:${vs.destinationPort})
  └─ 📦 ${esc(pool?.name || vs.pool || '(no pool)')}
     ${(pool?.members || []).map((m: any) => `└─ 🖥️ ${esc(m.address)}:${m.port} [${m.state || 'unknown'}]`).join('\\n     ')}`
}).join('\\n')}
          </div>
        </div>
      </div>
    </div>

    <!-- Members Table -->
    <div class="section">
      <div class="section-title">🔗 Pool Member 상세 매핑</div>
      <table>
        <tr><th>Pool</th><th>Member</th><th>주소:Port</th><th>상태</th><th>연결 VS</th></tr>
        ${poolMemberMappings.map((m: any) => `<tr>
          <td><strong>${esc(m.poolName)}</strong></td>
          <td>${esc(m.member.name)}</td>
          <td>${esc(m.member.address)}:${m.member.port}</td>
          <td><span class="badge ${m.member.state === 'up' ? 'badge-green' : m.member.state === 'down' ? 'badge-red' : 'badge-gray'}">${esc(m.member.state || 'unknown')}</span></td>
          <td>${m.memberOfVS.map((vs: string) => esc(vs.split('/').pop() || vs)).join(', ') || '-'}</td>
        </tr>`).join('')}
      </table>
    </div>
  </div>

  <div class="footer">
    Generated by F5 LTM Configuration Analyzer v1.0 | ${config.parsedAt}
  </div>
</body>
</html>`
}
