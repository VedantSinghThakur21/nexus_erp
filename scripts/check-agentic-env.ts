/**
 * Verifies Agentic AI env vars in nexus_erp/.env.local (project root).
 * Run: npm run agentic:check-env
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'

const root = resolve(__dirname, '..')
const envPath = resolve(root, '.env.local')

config({ path: envPath })

function trim(name: string): string {
  return (process.env[name] || '').trim().replace(/^['"]|['"]$/g, '')
}

function mask(value: string): string {
  if (!value) return '(empty)'
  if (value.length <= 12) return `set (${value.length} chars)`
  return `set (${value.length} chars, starts with ${value.slice(0, 10)}…)`
}

const candidates = [
  'OPENROUTER_API_KEY',
  'OPEN_ROUTER_API_KEY',
  'OPENROUTER_KEY',
] as const

console.log('\nAgentic AI environment check')
console.log('Project root:', root)
console.log('Env file:', envPath, existsSync(envPath) ? 'found' : 'MISSING\n')

if (!existsSync(envPath)) {
  console.error('Create .env.local in the project root (copy from .env.example).')
  process.exit(1)
}

let resolved = ''
let resolvedFrom = ''

for (const name of candidates) {
  const v = trim(name)
  if (v) {
    resolved = v
    resolvedFrom = name
    break
  }
}

const openAi = trim('OPENAI_API_KEY')
if (!resolved && openAi.startsWith('sk-or-')) {
  resolved = openAi
  resolvedFrom = 'OPENAI_API_KEY (OpenRouter key under wrong name — rename to OPENROUTER_API_KEY)'
}

console.log('\nVariable scan:')
for (const name of [...candidates, 'OPENAI_API_KEY', 'OPENROUTER_MODEL', 'REDIS_URL']) {
  console.log(`  ${name}:`, mask(trim(name)))
}

if (!resolved) {
  console.error('\n❌ No OpenRouter API key found.')
  console.error('Add this line to nexus_erp/.env.local (not your home folder):')
  console.error('  OPENROUTER_API_KEY=sk-or-v1-...')
  console.error('Get a key at https://openrouter.ai/keys')
  if (openAi.startsWith('sk-proj-')) {
    console.error('\nNote: OPENAI_API_KEY is an OpenAI key (sk-proj-…), not OpenRouter (sk-or-…).')
  }
  const raw = readFileSync(envPath, 'utf8')
  if (/OPENROUTER/i.test(raw) && !trim('OPENROUTER_API_KEY')) {
    console.error('\nHint: .env.local mentions OPENROUTER but the variable may be commented or misspelled.')
  }
  process.exit(1)
}

console.log(`\n✓ OpenRouter key resolved from: ${resolvedFrom}`)

const model =
  trim('OPENROUTER_MODEL') ||
  trim('OPENROUTER_AGENT_MODEL') ||
  'anthropic/claude-3-haiku (default)'
console.log('  Model:', model)

async function pingOpenRouter() {
  const modelName =
    trim('OPENROUTER_MODEL') || trim('OPENROUTER_AGENT_MODEL') || 'anthropic/claude-3-haiku'
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolved}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': trim('NEXT_PUBLIC_APP_URL') || 'https://avariq.in',
      'X-Title': 'Nexus ERP',
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      max_tokens: 8,
    }),
  })
  const body = await res.text()
  console.log('\nOpenRouter API test:', res.status, res.statusText)
  if (!res.ok) {
    console.error('Response:', body.slice(0, 500))
    process.exit(1)
  }
  console.log('✓ OpenRouter accepted the key')
}

pingOpenRouter().catch((e) => {
  console.error('\n❌ Could not reach OpenRouter:', e instanceof Error ? e.message : e)
  process.exit(1)
})
