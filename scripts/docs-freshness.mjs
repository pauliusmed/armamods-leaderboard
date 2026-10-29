#!/usr/bin/env node
// Rewrites the "Doc freshness" table in docs/README.md from git history.
// Run before a release, or after touching several documents.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

const TARGET = 'docs/README.md'
const START = '<!-- freshness:start -->'
const END = '<!-- freshness:end -->'

const files = execSync('git ls-files "docs/*.md"', { encoding: 'utf8' })
  .split('\n')
  .filter((file) => file && file !== TARGET)
  .sort()

const rows = files.map((file) => {
  const date = execSync(`git log -1 --format=%cs -- "${file}"`, { encoding: 'utf8' }).trim()
  return `| [${basename(file)}](./${basename(file)}) | ${date || '—'} |`
})

const block = [START, '| Document | Last updated |', '|---|---|', ...rows, END].join('\n')
const readme = readFileSync(TARGET, 'utf8')

if (!readme.includes(START) || !readme.includes(END)) {
  console.error(`Missing ${START} / ${END} markers in ${TARGET}`)
  process.exit(1)
}

const updated = readme.replace(
  new RegExp(`${START}[\\s\\S]*?${END}`),
  block,
)

if (updated === readme) {
  console.log(`Doc freshness already current (${files.length} documents)`)
  process.exit(0)
}

writeFileSync(TARGET, updated)
console.log(`Doc freshness updated (${files.length} documents)`)
