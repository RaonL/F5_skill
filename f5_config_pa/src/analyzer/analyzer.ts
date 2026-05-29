import type { F5Config, AnalysisResult, UnusedObject, PoolMemberMapping } from '../types/f5'

function normalizePath(name: string, partition = 'Common'): string {
  if (name.startsWith('/')) return name
  return `/${partition}/${name}`
}

export function analyzeConfig(config: F5Config): AnalysisResult {
  const unusedObjects: UnusedObject[] = []
  const poolMemberMappings: PoolMemberMapping[] = []
  const vsPoolMappings: { vs: string; pool: string }[] = []

  // Track used objects (all stored as normalized paths: /Partition/Name)
  const usedPools = new Set<string>()
  const usedMonitors = new Set<string>()
  const usedProfiles = new Set<string>()
  const usedPersistence = new Set<string>()
  const usedNodes = new Set<string>()
  const usedSnatPools = new Set<string>()
  const usedIRules = new Set<string>()
  const usedPolicies = new Set<string>()

  // Analyze Virtual Servers
  for (const vs of config.virtualServers) {
    // Track Pool usage from VS
    if (vs.pool) {
      const pk = normalizePath(vs.pool)
      usedPools.add(pk)
      vsPoolMappings.push({ vs: vs.fullPath, pool: pk })
    }

    // Track Profile usage
    for (const prof of vs.profiles) {
      usedProfiles.add(normalizePath(prof.name, prof.partition))
    }

    // Track Persistence usage
    for (const pers of vs.persist) {
      usedPersistence.add(normalizePath(pers.name))
    }

    // Track SNAT pool usage
    if (vs.sourceAddressTranslation?.pool) {
      usedSnatPools.add(normalizePath(vs.sourceAddressTranslation.pool))
    }
    if (vs.snat && vs.snat !== 'automap' && vs.snat !== 'none') {
      usedSnatPools.add(normalizePath(vs.snat))
    }

    // Track iRule usage
    if (vs.rules) {
      for (const rule of vs.rules) {
        usedIRules.add(normalizePath(rule))
      }
    }

    // Track Policy usage
    if (vs.policies) {
      for (const pol of vs.policies) {
        usedPolicies.add(normalizePath(pol))
      }
    }
  }

  // Analyze Pools
  for (const pool of config.pools) {
    // Track Monitor usage from Pool
    for (const mon of pool.monitors) {
      usedMonitors.add(normalizePath(mon))
    }

    // Track Node usage from Pool members
    for (const member of pool.members) {
      usedNodes.add(member.address)
    }
  }

  // Build member-to-VS mapping
  const memberVsMap = new Map<string, string[]>()
  for (const mapping of vsPoolMappings) {
    const pool = config.pools.find(
      p => normalizePath(p.name, p.partition) === mapping.pool
    )
    if (pool) {
      for (const member of pool.members) {
        const key = `${member.address}:${member.port}`
        if (!memberVsMap.has(key)) memberVsMap.set(key, [])
        memberVsMap.get(key)!.push(mapping.vs)
      }
    }
  }

  for (const pool of config.pools) {
    for (const member of pool.members) {
      const key = `${member.address}:${member.port}`
      const existing = poolMemberMappings.find(
        m => m.member.address === member.address && m.member.port === member.port && m.poolName === pool.name
      )
      if (!existing) {
        poolMemberMappings.push({
          poolName: pool.name,
          poolPartition: pool.partition,
          member,
          memberOfVS: memberVsMap.get(key) || [],
        })
      } else {
        existing.memberOfVS.push(...(memberVsMap.get(key) || []))
      }
    }
  }

  // Find unused Pools
  for (const pool of config.pools) {
    if (!usedPools.has(normalizePath(pool.name, pool.partition))) {
      unusedObjects.push({
        type: 'Pool',
        name: pool.name,
        partition: pool.partition,
        reason: '어떤 Virtual Server에서도 참조하지 않음',
      })
    }
  }

  // Find unused Monitors
  for (const mon of config.monitors) {
    if (!usedMonitors.has(normalizePath(mon.name, mon.partition))) {
      unusedObjects.push({
        type: 'Monitor',
        name: mon.name,
        partition: mon.partition,
        reason: 'Pool 또는 Node에서 참조하지 않음',
      })
    }
  }

  // Find unused Profiles
  for (const prof of config.profiles) {
    if (!usedProfiles.has(normalizePath(prof.name, prof.partition))) {
      const isDefault =
        prof.name.startsWith('_sys_') ||
        prof.name === 'http' ||
        prof.name === 'tcp' ||
        prof.name === 'udp' ||
        prof.name === 'serverssl' ||
        prof.name === 'clientssl'
      if (!isDefault) {
        unusedObjects.push({
          type: 'Profile',
          name: prof.name,
          partition: prof.partition,
          reason: 'Virtual Server에서 참조하지 않음',
        })
      }
    }
  }

  // Find unused Persistence
  for (const pers of config.persistences) {
    if (!usedPersistence.has(normalizePath(pers.name, pers.partition))) {
      unusedObjects.push({
        type: 'Persistence',
        name: pers.name,
        partition: pers.partition,
        reason: 'Virtual Server에서 참조하지 않음',
      })
    }
  }

  // Find unused Nodes
  for (const node of config.nodes) {
    if (!usedNodes.has(node.address)) {
      unusedObjects.push({
        type: 'Node',
        name: node.name,
        partition: node.partition,
        reason: 'Pool Member로 사용되지 않음',
      })
    }
  }

  // Find unused SNAT pools
  for (const sp of config.snatPools) {
    if (!usedSnatPools.has(normalizePath(sp.name, sp.partition))) {
      unusedObjects.push({
        type: 'SNAT Pool',
        name: sp.name,
        partition: sp.partition,
        reason: 'Virtual Server에서 참조하지 않음',
      })
    }
  }

  // Find unused iRules
  for (const rule of config.iRules) {
    if (!usedIRules.has(normalizePath(rule.name, rule.partition))) {
      unusedObjects.push({
        type: 'iRule',
        name: rule.name,
        partition: rule.partition,
        reason: 'Virtual Server에서 참조하지 않음',
      })
    }
  }

  return {
    config,
    unusedObjects,
    poolMemberMappings,
    vsPoolMappings,
    totalVS: config.virtualServers.length,
    totalPools: config.pools.length,
    totalMembers: config.pools.reduce((sum, p) => sum + p.members.length, 0),
    totalMonitors: config.monitors.length,
    totalProfiles: config.profiles.length,
    totalUnused: unusedObjects.length,
  }
}
