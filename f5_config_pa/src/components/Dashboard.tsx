import { useState, useMemo } from 'react'
import {
  Globe, Package, Server, Activity, Shield, AlertTriangle,
  Network
} from 'lucide-react'
import type { AnalysisResult } from '../types/f5'
import { VirtualServerList } from './VirtualServerList'
import { PoolMapping } from './PoolMapping'
import { ProfileAnalysis } from './ProfileAnalysis'
import { UnusedObjects } from './UnusedObjects'
import { TopologyDiagram } from './TopologyDiagram'
import { ReportExport } from './ReportExport'
import { cn } from '../utils/cn'

interface DashboardProps {
  result: AnalysisResult
  onReset: () => void
}

type TabKey = 'vs' | 'pools' | 'profiles' | 'unused' | 'topology'

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'vs', label: 'Virtual Server', icon: <Globe className="w-4 h-4" /> },
  { key: 'pools', label: 'Pool 매핑', icon: <Package className="w-4 h-4" /> },
  { key: 'profiles', label: 'Profile 분석', icon: <Shield className="w-4 h-4" /> },
  { key: 'unused', label: '미사용 Object', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'topology', label: '토폴로지', icon: <Network className="w-4 h-4" /> },
]

export function Dashboard({ result, onReset }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('vs')

  const statsCards = useMemo(() => [
    { label: 'Virtual Server', value: result.totalVS, icon: Globe, color: 'bg-f5-blue text-white' },
    { label: 'Pool', value: result.totalPools, icon: Package, color: 'bg-f5-accent text-white' },
    { label: 'Pool Member', value: result.totalMembers, icon: Server, color: 'bg-f5-success text-white' },
    { label: 'Monitor', value: result.totalMonitors, icon: Activity, color: 'bg-f5-warning text-white' },
    { label: 'Profile', value: result.totalProfiles, icon: Shield, color: 'bg-purple-600 text-white' },
    { label: '미사용 Object', value: result.totalUnused, icon: AlertTriangle,
      color: result.totalUnused > 0 ? 'bg-f5-danger text-white' : 'bg-f5-gray text-white' },
  ], [result])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-f5-dark">F5 LTM 구성 분석기</h1>
          <p className="text-sm text-f5-gray mt-1">
            {result.config.fileName} · {new Date(result.config.parsedAt).toLocaleString('ko-KR')} 분석 완료
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReportExport result={result} />
          <button
            onClick={onReset}
            className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-f5-gray hover:bg-gray-50 transition-colors"
          >
            새 파일 분석
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsCards.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2', stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-2xl font-bold text-f5-dark">{stat.value}</div>
                <div className="text-xs text-f5-gray">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-f5-blue text-white shadow-sm'
                : 'text-f5-gray hover:text-f5-dark hover:bg-gray-50'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'unused' && result.totalUnused > 0 && (
              <span className="ml-1 bg-red-400 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {result.totalUnused}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        {activeTab === 'vs' && <VirtualServerList virtualServers={result.config.virtualServers} />}
        {activeTab === 'pools' && <PoolMapping result={result} />}
        {activeTab === 'profiles' && <ProfileAnalysis result={result} />}
        {activeTab === 'unused' && (
          <UnusedObjects
            unusedObjects={result.unusedObjects}
          />
        )}
        {activeTab === 'topology' && <TopologyDiagram result={result} />}
      </div>
    </div>
  )
}
