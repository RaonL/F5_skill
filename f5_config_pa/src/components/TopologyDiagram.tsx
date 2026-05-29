import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { ZoomIn, ZoomOut, Download, Maximize2 } from 'lucide-react'
import type { AnalysisResult } from '../types/f5'

interface TopologyDiagramProps {
  result: AnalysisResult
}

mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  themeVariables: {
    primaryColor: '#0057b7',
    primaryTextColor: '#fff',
    primaryBorderColor: '#0057b7',
    lineColor: '#94a3b8',
    secondaryColor: '#f0f9ff',
    tertiaryColor: '#f8fafc',
    fontSize: '12px',
  },
  flowchart: {
    curve: 'basis',
    padding: 20,
    nodeSpacing: 50,
    rankSpacing: 80,
  },
})

export function TopologyDiagram({ result }: TopologyDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphIdRef = useRef(`topology-${Date.now()}`)
  const [zoom, setZoom] = useState(100)
  const [error, setError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return

    const render = async () => {
      try {
        setIsRendering(true)
        setError(null)
        const graphId = graphIdRef.current

        let def = 'graph TB\n'
        def += '  classDef vsfill fill:#0057b7,stroke:#0057b7,color:#fff,rx:8\n'
        def += '  classDef poolfill fill:#0ea5e9,stroke:#0284c7,color:#fff,rx:6\n'
        def += '  classDef memfill fill:#10b981,stroke:#059669,color:#fff,rx:4\n'
        def += '  classDef monfill fill:#f59e0b,stroke:#d97706,color:#fff,rx:4\n'

        // Add Virtual Servers (limit to first 20 for readability)
        const maxVS = 20
        const vsToShow = result.config.virtualServers.slice(0, maxVS)
        const vsIds: string[] = []
        vsToShow.forEach((vs, i) => {
          const id = `vs${i}`
          vsIds.push(id)
          const addr = vs.destinationAddress || ''
          const port = vs.destinationPort || ''
          const label = `${vs.name.replace(/[^a-zA-Z0-9]/g, '_')}|${addr}:${port}`
          def += `  ${id}["${label}"]:::vsfill\n`
        })

        if (result.config.virtualServers.length > maxVS) {
          def += `  vsExtra["... ${result.config.virtualServers.length - maxVS} more VS ..."]:::vsfill\n`
        }

        // Add Pools
        const poolIds: Record<string, string> = {}
        result.config.pools.forEach((pool, i) => {
          const id = `p${i}`
          poolIds[pool.name] = id
          def += `  ${id}["${pool.name.replace(/[^a-zA-Z0-9]/g, '_')}(${pool.members.length})"]:::poolfill\n`
        })

        // Add Members (limit to first 30 unique)
        const memberIds: Record<string, string> = {}
        let memIdx = 0
        for (const pool of result.config.pools) {
          for (const member of pool.members) {
            if (memIdx >= 30) break
            const key = `${member.address}:${member.port}`
            if (!memberIds[key]) {
              const id = `m${memIdx++}`
              memberIds[key] = id
              def += `  ${id}["${member.address}:${member.port}"]:::memfill\n`
            }
          }
          if (memIdx >= 30) break
        }

        // Add Monitors (limit to first 10)
        const monitorIds: Record<string, string> = {}
        result.config.monitors.slice(0, 10).forEach((mon, i) => {
          const id = `mon${i}`
          monitorIds[mon.name] = id
          def += `  ${id}["${mon.name.replace(/[^a-zA-Z0-9]/g, '_')}"]:::monfill\n`
        })

        // Connect VS -> Pool
        result.vsPoolMappings.slice(0, 50).forEach(mapping => {
          const vsName = mapping.vs.split('/').pop() || ''
          const vsIdx = vsToShow.findIndex(vs => vs.name === vsName)
          const poolName = mapping.pool.split('/').pop() || ''
          if (vsIdx >= 0 && poolIds[poolName]) {
            def += `  vs${vsIdx} --> ${poolIds[poolName]}\n`
          }
        })

        // Connect Pool -> Member
        let memberConnections = 0
        for (const pool of result.config.pools) {
          const pId = poolIds[pool.name]
          if (!pId) continue
          for (const member of pool.members) {
            if (memberConnections >= 50) break
            const key = `${member.address}:${member.port}`
            const mId = memberIds[key]
            if (mId) {
              def += `  ${pId} --> ${mId}\n`
              memberConnections++
            }
          }
          if (memberConnections >= 50) break
        }

        // Connect Pool -> Monitor
        for (const pool of result.config.pools) {
          const pId = poolIds[pool.name]
          if (!pId) continue
          for (const monName of pool.monitors) {
            const shortName = monName.split('/').pop() || ''
            const mId = monitorIds[shortName]
            if (mId) {
              def += `  ${pId} -.-> ${mId}\n`
            }
          }
        }

        if (!containerRef.current) return
        containerRef.current.innerHTML = ''
        const { svg } = await mermaid.render(graphId, def)
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
        }
        setIsRendering(false)
      } catch (e) {
        console.error('Mermaid render error:', e)
        setError('토폴로지 다이어그램을 생성할 수 없습니다. 설정 데이터가 너무 복잡합니다.')
        setIsRendering(false)
      }
    }
    render()
  }, [result])

  const handleZoomIn = () => setZoom(z => Math.min(z + 20, 200))
  const handleZoomOut = () => setZoom(z => Math.max(z - 20, 40))
  const handleReset = () => setZoom(100)

  const handleDownload = () => {
    const svg = containerRef.current?.querySelector('svg')
    if (svg) {
      const clone = svg.cloneNode(true) as SVGElement
      const serializer = new XMLSerializer()
      const svgStr = serializer.serializeToString(clone)
      const blob = new Blob([svgStr], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `F5_Topology_${new Date().toISOString().slice(0, 10)}.svg`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-f5-dark">구성 토폴로지</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-f5-gray">
            <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 transition-colors" title="축소">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-medium border-x border-gray-200">{zoom}%</span>
            <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 transition-colors" title="확대">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          <button onClick={handleReset} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-f5-gray" title="초기화">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={handleDownload} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-f5-gray" title="SVG 다운로드">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isRendering && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-f5-blue border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-f5-gray">토폴로지 생성 중...</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="bg-white rounded-xl border border-gray-200 p-4 overflow-auto"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
          display: isRendering ? 'none' : 'block',
        }}
      >
        {error && (
          <div className="text-center py-8 text-f5-gray">
            <p>{error}</p>
          </div>
        )}
      </div>

      {!isRendering && !error && (
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#0057b7]" />
            <span className="text-f5-gray">Virtual Server</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#0ea5e9]" />
            <span className="text-f5-gray">Pool</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#10b981]" />
            <span className="text-f5-gray">Member</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#f59e0b]" />
            <span className="text-f5-gray">Monitor</span>
          </div>
          {result.config.virtualServers.length > 20 && (
            <span className="text-f5-gray ml-2">
              (VS {result.config.virtualServers.length}개 중 상위 20개 표시)
            </span>
          )}
        </div>
      )}
    </div>
  )
}
