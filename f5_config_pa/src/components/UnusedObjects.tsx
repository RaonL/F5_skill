import { useState, useMemo } from 'react'
import { AlertTriangle, Search, Trash2, Box, Activity, Shield, FileJson, Link2, Server, Fingerprint } from 'lucide-react'

interface UnusedObjectsProps {
  unusedObjects: { type: string; name: string; partition: string; reason: string }[]
}

const typeIcons: Record<string, React.ReactNode> = {
  'Pool': <Box className="w-4 h-4" />,
  'Monitor': <Activity className="w-4 h-4" />,
  'Profile': <Shield className="w-4 h-4" />,
  'Persistence': <Fingerprint className="w-4 h-4" />,
  'Node': <Server className="w-4 h-4" />,
  'SNAT Pool': <Link2 className="w-4 h-4" />,
  'iRule': <FileJson className="w-4 h-4" />,
}

const typeColors: Record<string, string> = {
  'Pool': 'bg-orange-50 text-orange-700 border-orange-200',
  'Monitor': 'bg-green-50 text-green-700 border-green-200',
  'Profile': 'bg-purple-50 text-purple-700 border-purple-200',
  'Persistence': 'bg-amber-50 text-amber-700 border-amber-200',
  'Node': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'SNAT Pool': 'bg-blue-50 text-blue-700 border-blue-200',
  'iRule': 'bg-rose-50 text-rose-700 border-rose-200',
}

export function UnusedObjects({ unusedObjects }: UnusedObjectsProps) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  const filtered = useMemo(() => {
    return unusedObjects.filter(obj => {
      const matchSearch = !search ||
        obj.name.toLowerCase().includes(search.toLowerCase()) ||
        obj.type.toLowerCase().includes(search.toLowerCase())
      const matchType = filterType === 'all' || obj.type === filterType
      return matchSearch && matchType
    })
  }, [unusedObjects, search, filterType])

  const types = [...new Set(unusedObjects.map(o => o.type))]

  if (unusedObjects.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="rounded-full bg-green-50 p-4 w-fit mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-f5-success" />
        </div>
        <h3 className="text-lg font-semibold text-f5-dark mb-1">미사용 Object가 없습니다</h3>
        <p className="text-sm text-f5-gray">모든 Object가 정상적으로 사용 중입니다.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-red-50 p-2">
            <Trash2 className="w-5 h-5 text-f5-danger" />
          </div>
          <div>
            <h3 className="font-semibold text-f5-dark">미사용 Object</h3>
            <p className="text-xs text-f5-gray">총 {unusedObjects.length}개 발견</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-f5-gray" />
          <input
            type="text"
            placeholder="Object 이름 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-f5-accent/40"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-f5-accent/40"
        >
          <option value="all">모든 타입</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((obj, i) => (
          <div key={i} className={`border rounded-xl p-4 flex items-start gap-3 transition-all hover:shadow-md ${typeColors[obj.type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
            <div className="mt-0.5 flex-shrink-0 opacity-70">
              {typeIcons[obj.type] || <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-white/60">
                  {obj.type}
                </span>
                <span className="text-xs opacity-60">{obj.partition}</span>
              </div>
              <p className="font-medium text-sm break-all">{obj.name}</p>
              <p className="text-xs opacity-70 mt-1">{obj.reason}</p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length < unusedObjects.length && (
        <p className="text-xs text-f5-gray mt-3 text-center">
          전체 {unusedObjects.length}개 중 {filtered.length}개 표시
        </p>
      )}
    </div>
  )
}
