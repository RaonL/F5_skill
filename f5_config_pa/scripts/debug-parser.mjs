import { readFileSync } from 'fs'

// Read the sample file
const content = readFileSync('sample-bigip.conf', 'utf-8')
console.log('File length:', content.length)
console.log('Has CRLF:', content.includes('\r\n'))
console.log('Has LF:', content.includes('\n'))

// Simple tokenizer test
function tokenize(text) {
  const tokens = []
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
      while (i < text.length && !' {}\n\t\r;'.includes(text[i])) {
        word += text[i]; i++
      }
      if (word) tokens.push(word)
    }
  }
  return tokens
}

function parseBlocks(tokens, start = 0) {
  const blocks = []
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
    while (i < tokens.length && tokens[i] !== '\n' && tokens[i] !== ';') {
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

const tokens = tokenize(content)
console.log('\nToken count:', tokens.length)
console.log('First 30 tokens:', tokens.slice(0, 30))

const { blocks } = parseBlocks(tokens)
console.log('\nTop-level blocks:', blocks.length)
console.log('Block types:', blocks.map(b => b.type))

const ltmBlocks = blocks.filter(b => b.children.length > 0)
console.log('\nLTM blocks with children:', ltmBlocks.length)
ltmBlocks.forEach(b => {
  console.log(`  ${b.type}: ${b.path || '(no path)'} (${b.children.length} children)`)
})

const virtualBlocks = blocks.filter(b => b.type === 'virtual')
console.log('\nVirtual Server blocks:', virtualBlocks.length)
virtualBlocks.forEach(vb => {
  console.log(`  Path: "${vb.path}"`)
  console.log(`  Children:`, vb.children.map(c => `${c.type}="${c.body || '(block)'}"`))
})

const poolBlocks = blocks.filter(b => b.type === 'pool')
console.log('\nPool blocks:', poolBlocks.length)
poolBlocks.forEach(pb => {
  console.log(`  Path: "${pb.path}"`)
  console.log(`  Children:`, pb.children.map(c => `${c.type}="${c.body || '(block)'}"`))
})
