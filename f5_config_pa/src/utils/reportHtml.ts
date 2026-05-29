import { saveAs } from 'file-saver'
import type { AnalysisResult } from '../types/f5'

export function exportToHtml(result: AnalysisResult) {
  const { config, vsPoolMappings, poolMemberMappings, unusedObjects } = result

  function esc(s: string) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>F5 LTM 구성 분석 리포트</title>
  <style>
    body { font-family: -apple-system, 'Segoe UI', 'Noto Sans KR', sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f8fafc; color: #1e293b; }
    h1 { color: #0057b7; border-bottom: 3px solid #0057b7; padding-bottom: 10px; }
    h2 { color: #0ea5e9; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0 20px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #0057b7; color: white; padding: 10px 12px; text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:hover { background: #f1f5f9; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    .stat-card .num { font-size: 28px; font-weight: bold; color: #0057b7; }
    .stat-card .label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .section { margin-bottom: 30px; }
    .meta { color: #64748b; font-size: 14px; margin: 5px 0; }
  </style>
</head>
<body>
  <h1>🔍 F5 LTM 구성 분석 리포트</h1>
  <p class="meta">설정 파일: ${esc(config.fileName)}</p>
  <p class="meta">분석 시간: ${config.parsedAt}</p>

  <div class="stats">
    <div class="stat-card"><div class="num">${result.totalVS}</div><div class="label">Virtual Server</div></div>
    <div class="stat-card"><div class="num">${result.totalPools}</div><div class="label">Pool</div></div>
    <div class="stat-card"><div class="num">${result.totalMembers}</div><div class="label">Pool Member</div></div>
    <div class="stat-card"><div class="num">${result.totalMonitors}</div><div class="label">Monitor</div></div>
    <div class="stat-card"><div class="num">${result.totalProfiles}</div><div class="label">Profile</div></div>
    <div class="stat-card"><div class="num ${unusedObjects.length > 0 ? 'text-red-600' : ''}">${unusedObjects.length}</div><div class="label">미사용 Object</div></div>
  </div>

  <div class="section">
    <h2>📋 Virtual Server 목록</h2>
    <table>
      <tr><th>이름</th><th>Destination</th><th>Pool</th><th>SNAT</th><th>Persistence</th><th>SSL</th><th>상태</th></tr>
      ${config.virtualServers.map(vs => `<tr>
        <td>${esc(vs.name)}</td>
        <td>${esc(vs.destination)}</td>
        <td>${esc(vs.pool || '-')}</td>
        <td>${esc(vs.sourceAddressTranslation?.type || vs.snat || '-')}</td>
        <td>${esc(vs.persist.map(p => p.name).join(', ') || '-')}</td>
        <td>${esc(vs.profiles.filter(p => p.context === 'clientside').map(p => p.name).join(', ') || '-')}</td>
        <td><span class="badge ${vs.enabled ? 'badge-green' : 'badge-red'}">${vs.enabled ? '활성' : '비활성'}</span></td>
      </tr>`).join('')}
    </table>
  </div>

  <div class="section">
    <h2>📦 Pool 목록</h2>
    <table>
      <tr><th>이름</th><th>LB 방식</th><th>Monitor</th><th>Member</th><th>사용 VS</th></tr>
      ${config.pools.map(pool => {
        const usedByVS = vsPoolMappings.filter(m => m.pool.includes(pool.name)).map(m => m.vs)
        return `<tr>
          <td>${esc(pool.name)}</td>
          <td>${esc(pool.loadBalancingMode || 'round-robin')}</td>
          <td>${esc(pool.monitors.join(', ') || '-')}</td>
          <td>${pool.members.length}</td>
          <td>${esc(usedByVS.join(', ') || '<span class="badge badge-red">미사용</span>')}</td>
        </tr>`
      }).join('')}
    </table>
  </div>

  <div class="section">
    <h2>🔗 Pool Member 매핑</h2>
    <table>
      <tr><th>Pool</th><th>Member</th><th>Address</th><th>Port</th><th>Monitor</th><th>연결된 VS</th></tr>
      ${poolMemberMappings.map(m => `<tr>
        <td>${esc(m.poolName)}</td>
        <td>${esc(m.member.name)}</td>
        <td>${esc(m.member.address)}</td>
        <td>${m.member.port}</td>
        <td>${esc(m.member.monitor || '-')}</td>
        <td>${esc(m.memberOfVS.join(', ') || '-')}</td>
      </tr>`).join('')}
    </table>
  </div>

  <div class="section">
    <h2>📊 Monitor 목록</h2>
    <table>
      <tr><th>이름</th><th>타입</th><th>Interval</th><th>Timeout</th><th>Send</th><th>Recv</th></tr>
      ${config.monitors.map(m => `<tr>
        <td>${esc(m.name)}</td>
        <td>${esc(m.type)}</td>
        <td>${m.interval || '-'}</td>
        <td>${m.timeout || '-'}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${esc(m.send || '-')}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${esc(m.recv || '-')}</td>
      </tr>`).join('')}
    </table>
  </div>

  ${unusedObjects.length > 0 ? `<div class="section">
    <h2>⚠️ 미사용 Object (${unusedObjects.length})</h2>
    <table>
      <tr><th>타입</th><th>이름</th><th>파티션</th><th>사유</th></tr>
      ${unusedObjects.map(u => `<tr>
        <td><span class="badge badge-red">${esc(u.type)}</span></td>
        <td>${esc(u.name)}</td>
        <td>${esc(u.partition)}</td>
        <td>${esc(u.reason)}</td>
      </tr>`).join('')}
    </table>
  </div>` : ''}

  <p class="meta" style="text-align:center;margin-top:40px">Generated by F5 LTM Configuration Analyzer</p>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  saveAs(blob, `F5_LTM_분석_${new Date().toISOString().slice(0, 10)}.html`)
}
