#!/usr/bin/env node
// Fails when a tracked Markdown file points at a missing local file or heading.
// External links are not fetched: CI must not depend on the network.
import { execSync } from 'node:child_process'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const ROOT = process.cwd()
const SKIP_SCHEMES = /^(https?:|mailto:|tel:|data:|ftp:)/i

const files = execSync('git ls-files "*.md"', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)

/** GitHub-style heading anchor: lowercase, punctuation removed, spaces become single hyphens. */
function slugify(heading) {
  return heading
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/ /g, '-')
}

function headingsOf(text) {
  const seen = new Map()
  const anchors = new Set()
  for (const line of text.split('\n')) {
    const match = /^#{1,6}\s+(.*)$/.exec(line)
    if (!match) continue
    const base = slugify(match[1])
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    anchors.add(count === 0 ? base : `${base}-${count}`)
  }
  return anchors
}

/** Code fences and inline code hold examples, not links. */
function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
}

function linksOf(text) {
  const links = []
  const inline = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  const definition = /^\s*\[[^\]]+\]:\s*(\S+)/gm
  for (const re of [inline, definition]) {
    let match
    while ((match = re.exec(text)) !== null) {
      links.push({ target: match[1], index: match.index })
    }
  }
  return links
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length
}

const problems = []

for (const file of files) {
  const raw = readFileSync(file, 'utf8')
  const text = stripCode(raw)
  const ownAnchors = headingsOf(raw)

  for (const { target, index } of linksOf(text)) {
    if (SKIP_SCHEMES.test(target)) continue
    if (target.startsWith('<') || target.includes('{{')) continue

    const [pathPart, anchor] = target.split('#')
    const decoded = decodeURI(pathPart)
    const where = `${file}:${lineOf(text, index)}`

    if (decoded === '') {
      if (anchor && !ownAnchors.has(anchor)) {
        problems.push(`${where} missing heading #${anchor} in the same file`)
      }
      continue
    }

    const absolute = resolve(ROOT, dirname(file), decoded)
    if (!existsSync(absolute)) {
      problems.push(`${where} missing target ${target}`)
      continue
    }
    if (!anchor || !decoded.endsWith('.md')) continue
    if (!statSync(absolute).isFile()) continue

    const linkedAnchors = headingsOf(readFileSync(absolute, 'utf8'))
    if (!linkedAnchors.has(anchor)) {
      problems.push(`${where} missing heading #${anchor} in ${decoded}`)
    }
  }
}

if (problems.length > 0) {
  console.error(`Broken documentation links: ${problems.length}`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

console.log(`Documentation links OK (${files.length} files)`)
