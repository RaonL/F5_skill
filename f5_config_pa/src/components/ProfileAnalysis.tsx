import { Shield, Key, Fingerprint } from 'lucide-react'
import type { AnalysisResult } from '../types/f5'

interface ProfileAnalysisProps {
  result: AnalysisResult
}

export function ProfileAnalysis({ result }: ProfileAnalysisProps) {
  const sslProfiles = result.config.virtualServers.flatMap(vs =>
    vs.profiles.filter(p => p.type === 'clientssl' || p.type === 'serverssl').map(p => ({
      ...p,
      vsName: vs.name,
    }))
  )

  const vsWithPersistence = result.config.virtualServers.filter(vs => vs.persist.length > 0)
  const vsWithSnat = result.config.virtualServers.filter(vs =>
    vs.sourceAddressTranslation || vs.snat
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* SSL Profile Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-lg bg-purple-50 p-2">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-f5-dark">SSL Profile</h3>
            <p className="text-xs text-f5-gray">{sslProfiles.length}개 사용 중</p>
          </div>
        </div>
        {sslProfiles.length === 0 ? (
          <p className="text-sm text-f5-gray text-center py-4">SSL Profile이 없습니다.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sslProfiles.map((prof, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium text-f5-dark">{prof.name}</span>
                  <span className="text-xs text-f5-gray ml-2">({prof.type})</span>
                </div>
                <span className="text-xs text-f5-accent">{prof.vsName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Persistence Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-lg bg-amber-50 p-2">
            <Fingerprint className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-f5-dark">Persistence</h3>
            <p className="text-xs text-f5-gray">{vsWithPersistence.length}개 VS 사용 중</p>
          </div>
        </div>
        {vsWithPersistence.length === 0 ? (
          <p className="text-sm text-f5-gray text-center py-4">Persistence 설정이 없습니다.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {vsWithPersistence.map((vs, i) => (
              <div key={i} className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-f5-dark block truncate">{vs.name}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {vs.persist.map((p, j) => (
                      <span key={j} className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SNAT Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-lg bg-cyan-50 p-2">
            <Key className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h3 className="font-semibold text-f5-dark">SNAT</h3>
            <p className="text-xs text-f5-gray">{vsWithSnat.length}개 VS 사용 중</p>
          </div>
        </div>
        {vsWithSnat.length === 0 ? (
          <p className="text-sm text-f5-gray text-center py-4">SNAT 설정이 없습니다.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {vsWithSnat.map((vs, i) => (
              <div key={i} className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-f5-dark block truncate">{vs.name}</span>
                  <span className="text-xs font-mono text-f5-gray">
                    {vs.sourceAddressTranslation?.type === 'automap'
                      ? 'Automap'
                      : vs.sourceAddressTranslation?.pool || vs.snat || 'None'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
