import { readFileSync } from 'fs'

const content = readFileSync('sample-bigip.conf', 'utf-8')

// Check for the start of the VS section
const idx = content.indexOf('ltm virtual')
console.log('Found "ltm virtual" at index:', idx)
if (idx >= 0) {
  const chunk = content.slice(idx, idx + 60)
  console.log('Context:', JSON.stringify(chunk))
  console.log('Bytes:', [...chunk].map(c => c.charCodeAt(0)))
}

// Check line endings
const cr = content.indexOf('\r')
const lf = content.indexOf('\n')
console.log('\nFirst CR at:', cr)
console.log('First LF at:', lf)
console.log('Has CRLF:', content.includes('\r\n'))

// Check actual characters before "ltm virtual"
if (idx > 0) {
  const before = content.slice(idx - 5, idx)
  console.log('\nBefore "ltm":', JSON.stringify(before))
}

// Try a simpler tokenization test
function simpleTokenize(text) {
  const tokens = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '{' || ch === '}' || ch === '\n') {
      tokens.push(ch)
      i++
    } else if (ch === ' ' || ch === '\t' || ch === '\r') {
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

// Find the "ltm virtual" line in tokens
const tokens = simpleTokenize(content)
console.log('\n--- First 60 tokens ---')
for (let j = 0; j < Math.min(60, tokens.length); j++) {
  console.log(`  [${j}]: ${JSON.stringify(tokens[j])}` + (tokens[j] === '\n' ? ' (NEWLINE)' : ''))
}

// Find 'ltm' in tokens
const ltmIdx = tokens.indexOf('ltm')
console.log(`\n'ltm' token index: ${ltmIdx}`)
if (ltmIdx >= 0) {
  console.log(`tokens[${ltmIdx}..${ltmIdx+5}]:`, tokens.slice(ltmIdx, ltmIdx + 6))
}
