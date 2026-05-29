import { useState, useMemo } from 'react'
import { Search, Globe, CheckCircle2, XCircle } from 'lucide-react'
import type { VirtualServer } from '../types/f5'

interface VirtualServerListProps {
  virtualServers: VirtualServer[]
}

export function VirtualServerList({ virtualServers }: VirtualServerListProps) {
  const [search, setSearch] = useState('')
  const [filterEnabled, setFilterEnabled] = useState<string>('all')

  const filtered = useMemo(() => {
    return virtualServers.filter(vs => {
      const matchesSearch = !search ||
        vs.name.toLowerCase().includes(search.toLowerCase()) ||
        vs.destination.toLowerCase().includes(search.toLowerCase()) ||
        (vs.pool && vs.pool.toLowerCase().includes(search.toLowerCase()))
      const matchesStatus = filterEnabled === 'all' ||
        (filterEnabled === 'enabled' && vs.enabled) ||
        (filterEnabled === 'disabled' && !vs.enabled)
      return matchesSearch && matchesStatus
    })
  }, [virtualServers, search, filterEnabled])

  if (virtualServers.length === 0) {
    return (
      <div className="text-center py-8 text-f5-gray">
        <Globe className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Virtual Server가 없습니다.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-f5-gray" />
          <input
            type="text"
            placeholder="VS 이름, IP, Pool 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-f5-accent/40 focus:border-f5-accent"
          />
        </div>
        <select
          value={filterEnabled}
          onChange={e => setFilterEnabled(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-f5-accent/40"
        >
          <option value="all">모든 상태</option>
          <option value="enabled">활성</option>
          <option value="disabled">비활성</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-f5-dark text-white">
              <th className="text-left px-4 py-3 font-medium">이름</th>
              <th className="text-left px-4 py-3 font-medium">Destination</th>
              <th className="text-left px-4 py-3 font-medium">Pool</th>
              <th className="text-left px-4 py-3 font-medium">SNAT</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Persistence</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">SSL</th>
              <th className="text-center px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((vs, i) => (
              <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-f5-dark">{vs.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{vs.destination}</td>
                <td className="px-4 py-3">
                  {vs.pool ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {vs.pool.split('/').pop()}
                    </span>
                  ) : (
                    <span className="text-f5-gray">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {vs.sourceAddressTranslation?.type === 'automap'
                    ? 'Automap'
                    : vs.snat === 'automap'
                    ? 'Automap'
                    : vs.sourceAddressTranslation?.pool || vs.snat || '-'}
                </td>
                <td className="px-4 py-3 text-xs hidden md:table-cell">
                  {vs.persist.map(p => p.name).join(', ') || '-'}
                </td>
                <td className="px-4 py-3 text-xs hidden lg:table-cell">
                  {vs.profiles.filter(p => p.context === 'clientside').map(p => p.name).join(', ') || '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {vs.enabled
                    ? <CheckCircle2 className="w-4 h-4 text-f5-success inline-block" />
                    : <XCircle className="w-4 h-4 text-f5-danger inline-block" />
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-f5-gray mt-2">
        총 {virtualServers.length}개 중 {filtered.length}개 표시
      </p>
    </div>
  )
}
