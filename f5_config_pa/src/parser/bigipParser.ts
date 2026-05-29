import type {
  F5Config, VirtualServer, Pool, PoolMember, Monitor,
  Profile, Persistence, NodeDef, SnatPool, IRule, Policy
} from '../types/f5'

interface Block {
  type: string
  path: string
  body: string
  children: Block[]
}

function tokenize(text: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '{' || ch === '}' || ch === '\n') {
      tokens.push(ch)
      i++
    } else if (ch === '"') {
      let str = ''
      i++
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\') { str += text[i + 1]; i += 2 }
        else { str += text[i]; i++ }
      }
      tokens.push(`"${str}"`)
      i++
    } else if (ch === '#' || (ch === '/' && text[i + 1] === '*')) {
      if (ch === '#') {
        while (i < text.length && text[i] !== '\n') i++
      } else {
        i += 2
        while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
        i += 2
      }
    } else if (ch === ' ' || ch === '\t' || ch === '\r') {
      i++
    } else if (ch === ';') {
      tokens.push(';')
      i++
    } else {
      let word = ''
      while (i < text.length && !' {}"\n\t\r;'.includes(text[i])) {
        word += text[i]; i++
      }
      if (word) tokens.push(word)
    }
  }
  return tokens
}

function parseBlocks(tokens: string[], start = 0): { blocks: Block[]; end: number } {
  const blocks: Block[] = []
  let i = start
  while (i < tokens.length) {
    const tok = tokens[i]
    if (tok === '}') { return { blocks, end: i } }
    if (tok === '\n') { i++; continue }
    if (tok === '{') {
      if (blocks.length > 0) {
        const parent = blocks[blocks.length - 1]
        const { blocks: children, end } = parseBlocks(tokens, i + 1)
        parent.children = children
        i = end + 1
      } else {
        const { end } = parseBlocks(tokens, i + 1)
        i = end + 1
      }
      continue
    }
    if (tokens[i + 1] === '{') {
      blocks.push({ type: tok, path: '', body: '', children: [] })
      i++
      continue
    }
    let line = ''
    while (i < tokens.length && tokens[i] !== '\n' && tokens[i] !== ';' && tokens[i] !== '{' && tokens[i] !== '}') {
      if (line) line += ' '
      line += tokens[i]; i++
    }
    if (tokens[i] === ';') i++
    line = line.trim()
    if (!line) continue

    const parts = line.split(/\s+/)
    if (parts[0] === 'ltm' && parts.length >= 3) {
      blocks.push({ type: parts[1], path: parts.slice(2).join(' '), body: '', children: [] })
    } else {
      if (parts.length === 1) {
        blocks.push({ type: parts[0], path: '', body: '', children: [] })
      } else {
        blocks.push({ type: parts[0], path: '', body: parts.slice(1).join(' '), children: [] })
      }
    }
  }
  return { blocks, end: i }
}

function parsePartition(fullPath: string): { name: string; partition: string } {
  if (fullPath.startsWith('/')) {
    const parts = fullPath.split('/').filter(Boolean)
    if (parts.length >= 2) {
      return { name: parts.slice(1).join('/'), partition: parts[0] }
    }
    return { name: parts[0] || fullPath, partition: 'Common' }
  }
  return { name: fullPath, partition: 'Common' }
}

function extractMembers(block: Block): PoolMember[] {
  const members: PoolMember[] = []
  const memberBlock = block.children.find(c => c.type === 'members')
  const items = memberBlock ? memberBlock.children : block.children

  for (const child of items) {
    const hasPort = child.type.includes(':')
    if (!hasPort && child.children.length === 0) continue

    const rawName = child.type
    const colonIdx = rawName.lastIndexOf(':')
    const portStr = colonIdx >= 0 ? rawName.substring(colonIdx + 1) : '0'
    const addrPart = colonIdx >= 0 ? rawName.substring(0, colonIdx) : rawName
    const port = parseInt(portStr) || 0

    const { name } = parsePartition(rawName)

    const member: PoolMember = {
      name,
      address: addrPart.replace(/^\/[^/]+\//, ''),
      port,
      partition: 'Common',
    }

    for (const prop of child.children) {
      if (prop.type === 'address') member.address = prop.body || prop.type
      if (prop.type === 'monitor') member.monitor = prop.body || prop.type
      if (prop.type === 'session') member.session = prop.body?.trim().replace(/"/g, '') || prop.type
      if (prop.type === 'state') member.state = prop.body?.trim().replace(/"/g, '') || prop.type
    }
    members.push(member)
  }
  return members
}

function extractProfiles(block: Block): Profile[] {
  const profiles: Profile[] = []
  const profileBlock = block.children.find(c => c.type === 'profiles')
  const items = profileBlock ? profileBlock.children : block.children

  for (const child of items) {
    const { name, partition } = parsePartition(child.type)
    if (!name) continue
    let context = ''
    for (const prop of child.children) {
      if (prop.type === 'context') context = prop.body || prop.type
    }
    profiles.push({ name, partition, type: '', context })
  }
  return profiles
}

function extractPersistence(block: Block): Persistence[] {
  const persistences: Persistence[] = []
  const persistBlock = block.children.find(c => c.type === 'persist')
  const items = persistBlock ? persistBlock.children : block.children

  for (const child of items) {
    const { name, partition } = parsePartition(child.type)
    if (!name) continue
    persistences.push({ name, partition, type: '' })
  }
  return persistences
}

function findChild(block: Block, type: string): Block | undefined {
  return block.children.find(c => c.type === type)
}

function getProperty(block: Block, type: string): string {
  const child = findChild(block, type)
  if (!child) return ''
  return child.body?.trim() || child.children[0]?.type || ''
}

export function parseBigipConf(content: string, fileName: string): F5Config {
  const tokens = tokenize(content)
  const { blocks } = parseBlocks(tokens)

  const virtualServers: VirtualServer[] = []
  const pools: Pool[] = []
  const monitors: Monitor[] = []
  const profiles: Profile[] = []
  const persistences: Persistence[] = []
  const snatPools: SnatPool[] = []
  const nodes: NodeDef[] = []
  const iRules: IRule[] = []
  const policies: Policy[] = []

  for (const block of blocks) {
    if (block.type === 'virtual') {
      const { name, partition } = parsePartition(block.path)
      const vs: VirtualServer = {
        name, partition, fullPath: `/${partition}/${name}`,
        destination: '', destinationAddress: '', destinationPort: 0,
        enabled: true, profiles: [], persist: [],
      }

      const destStr = getProperty(block, 'destination')
      vs.destination = destStr
      const destMatch = destStr.match(/([\d.]+):(\d+)/) || destStr.match(/([^\s:]+):(\d+)/)
      if (destMatch) {
        vs.destinationAddress = destMatch[1].replace(/^\/[^/]+\//, '')
        vs.destinationPort = parseInt(destMatch[2])
      }

      vs.pool = getProperty(block, 'pool') || undefined
      vs.description = getProperty(block, 'description') || undefined

      const profileBlock = findChild(block, 'profiles')
      if (profileBlock) vs.profiles = extractProfiles(profileBlock)

      const persistBlock = findChild(block, 'persist')
      if (persistBlock) vs.persist = extractPersistence(persistBlock)

      const snatChild = findChild(block, 'snat')
      if (snatChild) {
        vs.snat = snatChild.body?.trim() || 'automap'
      }

      const satBlock = findChild(block, 'source-address-translation')
      if (satBlock) {
        const sat: { type: string; pool?: string } = { type: 'none' }
        const typeVal = getProperty(satBlock, 'type')
        if (typeVal) sat.type = typeVal
        const poolVal = getProperty(satBlock, 'pool')
        if (poolVal) sat.pool = poolVal
        vs.sourceAddressTranslation = sat
      }

      const vlanBlock = findChild(block, 'vlans')
      if (vlanBlock) {
        vs.vlans = vlanBlock.children.map(c => c.type).filter(Boolean)
      }
      if (findChild(block, 'vlans-enabled')) {
        vs.vlansEnabled = true
      }
      if (findChild(block, 'disabled')) {
        vs.enabled = false
      }

      const rulesBlock = findChild(block, 'rules')
      if (rulesBlock) {
        vs.rules = rulesBlock.children.map(c => c.type).filter(Boolean)
      }

      const policiesBlock = findChild(block, 'policies')
      if (policiesBlock) {
        vs.policies = policiesBlock.children.map(c => c.type).filter(Boolean)
      }

      virtualServers.push(vs)
    } else if (block.type === 'pool') {
      const { name, partition } = parsePartition(block.path)
      const pool: Pool = {
        name, partition, fullPath: `/${partition}/${name}`,
        members: [], monitors: [],
      }

      pool.members = extractMembers(block)

      const monStr = getProperty(block, 'monitor')
      if (monStr) {
        pool.monitors = monStr.split(/\s+/).filter(m => m !== 'and').filter(Boolean)
        pool.monitor = pool.monitors[0]
      }

      const lbMode = getProperty(block, 'load-balancing-mode')
      if (lbMode) pool.loadBalancingMode = lbMode

      pool.description = getProperty(block, 'description') || undefined

      pools.push(pool)
    } else if (block.type === 'monitor') {
      const parts = block.path.split(/\s+/)
      const monType = parts[0]
      const monPath = parts.slice(1).join(' ')
      const { name, partition } = parsePartition(monPath || monType)
      const monitor: Monitor = { name, partition, type: monType }

      const intervalStr = getProperty(block, 'interval')
      if (intervalStr) monitor.interval = parseInt(intervalStr) || undefined
      const timeoutStr = getProperty(block, 'timeout')
      if (timeoutStr) monitor.timeout = parseInt(timeoutStr) || undefined

      const sendVal = getProperty(block, 'send')
      if (sendVal) monitor.send = sendVal.replace(/"/g, '')
      const recvVal = getProperty(block, 'recv')
      if (recvVal) monitor.recv = recvVal.replace(/"/g, '')

      monitors.push(monitor)
    } else if (block.type === 'profile') {
      const parts = block.path.split(/\s+/)
      const profType = parts[0]
      const profName = parts.slice(1).join(' ')
      const { name, partition } = parsePartition(profName)
      const context = getProperty(block, 'context')
      profiles.push({ name, partition, type: profType, context })
    } else if (block.type === 'persistence') {
      const parts = block.path.split(/\s+/)
      const persType = parts[0]
      const persPath = parts.slice(1).join(' ')
      const { name, partition } = parsePartition(persPath || persType)
      persistences.push({ name, partition, type: persType })
    } else if (block.type === 'snatpool') {
      const { name, partition } = parsePartition(block.path)
      const members: string[] = []
      const membersBlock = findChild(block, 'members')
      if (membersBlock) {
        members.push(...membersBlock.children.map(c => c.type).filter(Boolean))
      }
      snatPools.push({ name, partition, members })
    } else if (block.type === 'node') {
      const { name, partition } = parsePartition(block.path)
      const node: NodeDef = { name, partition, address: '' }
      node.address = getProperty(block, 'address')
      const monVal = getProperty(block, 'monitor')
      if (monVal) node.monitor = monVal
      const descVal = getProperty(block, 'description')
      if (descVal) node.description = descVal.replace(/"/g, '')
      nodes.push(node)
    } else if (block.type === 'rule') {
      const { name, partition } = parsePartition(block.path)
      iRules.push({ name, partition })
    } else if (block.type === 'policy') {
      const { name, partition } = parsePartition(block.path)
      const ruleNames: string[] = []
      const rulesBlock = findChild(block, 'rules')
      if (rulesBlock) {
        ruleNames.push(...rulesBlock.children.map(c => c.type).filter(Boolean))
      }
      policies.push({ name, partition, rules: ruleNames })
    }
  }

  return {
    fileName,
    virtualServers,
    pools,
    monitors,
    profiles,
    persistences,
    snatPools,
    nodes,
    iRules,
    policies,
    parsedAt: new Date().toISOString(),
  }
}
