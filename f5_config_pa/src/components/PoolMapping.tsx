import { useState, useMemo } from 'react'
import { Search, Package, Server, ArrowRight } from 'lucide-react'
import type { AnalysisResult } from '../types/f5'

interface PoolMappingProps {
  result: AnalysisResult
}

export function PoolMapping({ result }: PoolMappingProps) {
  const [search, setSearch] = useState('')
  const [selectedPool, setSelectedPool] = useState<string | null>(null)

  const filteredPools = useMemo(() => {
    return result.config.pools.filter(pool => {
      if (!search) return true
      const q = search.toLowerCase()
      return pool.name.toLowerCase().includes(q) ||
        pool.members.some(m => m.address.includes(q) || m.name.toLowerCase().includes(q))
    })
  }, [result.config.pools, search])

  if (result.config.pools.length === 0) {
    return (
      <div className="text-center py-8 text-f5-gray">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Pool이 없습니다.</p>
      </div>
    )
  }

  const getPoolVS = (poolName: string) => {
    return result.vsPoolMappings
      .filter(m => m.pool.includes(poolName))
      .map(m => m.vs.split('/').pop())
  }

  const selectedPoolData = selectedPool
    ? result.config.pools.find(p => p.name === selectedPool)
    : null

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-f5-gray" />
          <input
            type="text"
            placeholder="Pool 또는 Member IP 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-f5-accent/40"
          />
        </div>

        <div className="space-y-2">
          {filteredPools.map((pool, i) => {
            const usedByVS = getPoolVS(pool.name)
            const isSelected = selectedPool === pool.name
            return (
              <div
                key={i}
                onClick={() => setSelectedPool(isSelected ? null : pool.name)}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-f5-accent bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-f5-accent" />
                      <span className="font-semibold text-f5-dark">{pool.name}</span>
                      {pool.loadBalancingMode && (
                        <span className="text-xs text-f5-gray bg-gray-100 px-2 py-0.5 rounded-full">
                          {pool.loadBalancingMode}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {pool.monitors.map((m, j) => (
                        <span key={j} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          {m.split('/').pop()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-f5-dark">{pool.members.length}</div>
                    <div className="text-xs text-f5-gray">Members</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {pool.members.slice(0, 5).map((m, j) => (
                    <span key={j} className="text-xs font-mono bg-gray-100 text-f5-gray px-2 py-0.5 rounded">
                      {m.address}:{m.port}
                    </span>
                  ))}
                  {pool.members.length > 5 && (
                    <span className="text-xs text-f5-gray">+{pool.members.length - 5}</span>
                  )}
                </div>

                {usedByVS.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-f5-gray">
                    <ArrowRight className="w-3 h-3" />
                    {usedByVS.map((vs, j) => (
                      <span key={j} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                        {vs}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Member Detail Panel */}
      {selectedPoolData && (
        <div className="lg:w-96">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <h3 className="font-semibold text-f5-dark mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-f5-accent" />
              {selectedPoolData.name} - Members
            </h3>
            <div className="space-y-2">
              {selectedPoolData.members.map((m, i) => {
                const memberMappings = result.poolMemberMappings.filter(
                  pm => pm.member.address === m.address && pm.member.port === m.port
                )
                const vsList = memberMappings.flatMap(pm => pm.memberOfVS)
                return (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                    <div className="font-mono text-sm font-medium text-f5-dark">
                      {m.address}:{m.port}
                    </div>
                    <div className="text-xs text-f5-gray mt-1">{m.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {m.state && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          m.state === 'up' ? 'bg-green-50 text-green-700' :
                          m.state === 'down' ? 'bg-red-50 text-red-700' :
                          'bg-gray-100 text-f5-gray'
                        }`}>
                          {m.state}
                        </span>
                      )}
                      {m.monitor && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {m.monitor.split('/').pop()}
                        </span>
                      )}
                    </div>
                    {vsList.length > 0 && (
                      <div className="mt-1.5 text-xs text-f5-gray">
                        VS: {[...new Set(vsList)].map(v => v.split('/').pop()).join(', ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
