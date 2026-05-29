export interface NodeDef {
  name: string
  address: string
  partition: string
  monitor?: string
  description?: string
}

export interface PoolMember {
  name: string
  address: string
  port: number
  monitor?: string
  session?: string
  state?: string
  partition: string
}

export interface Monitor {
  name: string
  partition: string
  type: string
  interval?: number
  timeout?: number
  send?: string
  recv?: string
}

export interface Pool {
  name: string
  partition: string
  fullPath: string
  members: PoolMember[]
  monitor?: string
  monitors: string[]
  loadBalancingMode?: string
  description?: string
}

export interface Profile {
  name: string
  partition: string
  type: string
  context?: string
}

export interface Persistence {
  name: string
  partition: string
  type: string
}

export interface SnatPool {
  name: string
  partition: string
  members: string[]
}

export interface VirtualServer {
  name: string
  partition: string
  fullPath: string
  destination: string
  destinationAddress: string
  destinationPort: number
  pool?: string
  enabled: boolean
  profiles: Profile[]
  persist: Persistence[]
  sourceAddressTranslation?: {
    type: string
    pool?: string
  }
  vlans?: string[]
  vlansEnabled?: boolean
  description?: string
  snat?: string
  rules?: string[]
  policies?: string[]
}

export interface IRule {
  name: string
  partition: string
  definition?: string
}

export interface Policy {
  name: string
  partition: string
  rules?: string[]
}

export interface F5Config {
  fileName: string
  virtualServers: VirtualServer[]
  pools: Pool[]
  monitors: Monitor[]
  profiles: Profile[]
  persistences: Persistence[]
  snatPools: SnatPool[]
  nodes: NodeDef[]
  iRules: IRule[]
  policies: Policy[]
  parsedAt: string
}

export interface UnusedObject {
  type: string
  name: string
  partition: string
  reason: string
}

export interface PoolMemberMapping {
  poolName: string
  poolPartition: string
  member: PoolMember
  memberOfVS: string[]
}

export interface AnalysisResult {
  config: F5Config
  unusedObjects: UnusedObject[]
  poolMemberMappings: PoolMemberMapping[]
  vsPoolMappings: { vs: string; pool: string }[]
  totalVS: number
  totalPools: number
  totalMembers: number
  totalMonitors: number
  totalProfiles: number
  totalUnused: number
}
