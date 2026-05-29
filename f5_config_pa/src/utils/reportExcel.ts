import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { AnalysisResult } from '../types/f5'

export function exportToExcel(result: AnalysisResult) {
  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summaryData = [
    ['항목', '개수'],
    ['Virtual Server', result.totalVS],
    ['Pool', result.totalPools],
    ['Pool Member', result.totalMembers],
    ['Monitor', result.totalMonitors],
    ['Profile', result.totalProfiles],
    ['미사용 Object', result.totalUnused],
    ['분석 시간', result.config.parsedAt],
    ['설정 파일', result.config.fileName],
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summarySheet, '요약')

  // Virtual Servers sheet
  const vsData = [
    ['이름', '파티션', 'Destination', 'Pool', 'SNAT', 'Persistence', 'SSL Profiles', 'Enabled'],
    ...result.config.virtualServers.map(vs => [
      vs.name,
      vs.partition,
      vs.destination,
      vs.pool || '-',
      vs.sourceAddressTranslation?.type || vs.snat || '-',
      vs.persist.map(p => p.name).join(', ') || '-',
      vs.profiles.filter(p => p.context === 'clientside').map(p => p.name).join(', ') || '-',
      vs.enabled ? 'Yes' : 'No',
    ]),
  ]
  const vsSheet = XLSX.utils.aoa_to_sheet(vsData)
  XLSX.utils.book_append_sheet(wb, vsSheet, 'Virtual Server')

  // Pools sheet
  const poolData = [
    ['Pool 이름', '파티션', 'Load Balancing', 'Monitor', 'Member 개수'],
    ...result.config.pools.map(pool => [
      pool.name,
      pool.partition,
      pool.loadBalancingMode || 'round-robin',
      pool.monitors.join(', ') || '-',
      pool.members.length,
    ]),
  ]
  const poolSheet = XLSX.utils.aoa_to_sheet(poolData)
  XLSX.utils.book_append_sheet(wb, poolSheet, 'Pool')

  // Pool Members sheet
  const memberData = [
    ['Pool', 'Member', 'Address', 'Port', 'Monitor', '상태', '연결된 VS'],
    ...result.poolMemberMappings.map(m => [
      m.poolName,
      m.member.name,
      m.member.address,
      m.member.port,
      m.member.monitor || '-',
      m.member.state || '-',
      m.memberOfVS.join(', ') || '-',
    ]),
  ]
  const memberSheet = XLSX.utils.aoa_to_sheet(memberData)
  XLSX.utils.book_append_sheet(wb, memberSheet, 'Pool Members')

  // Monitors sheet
  const monData = [
    ['이름', '타입', '파티션', 'Interval', 'Timeout'],
    ...result.config.monitors.map(m => [
      m.name,
      m.type,
      m.partition,
      m.interval?.toString() || '-',
      m.timeout?.toString() || '-',
    ]),
  ]
  const monSheet = XLSX.utils.aoa_to_sheet(monData)
  XLSX.utils.book_append_sheet(wb, monSheet, 'Monitor')

  // Unused Objects sheet
  if (result.unusedObjects.length > 0) {
    const unusedData = [
      ['타입', '이름', '파티션', '사유'],
      ...result.unusedObjects.map(u => [u.type, u.name, u.partition, u.reason]),
    ]
    const unusedSheet = XLSX.utils.aoa_to_sheet(unusedData)
    XLSX.utils.book_append_sheet(wb, unusedSheet, '미사용 Object')
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, `F5_LTM_분석_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
