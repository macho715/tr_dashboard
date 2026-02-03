#!/usr/bin/env node
/**
 * Detect package manager and available scripts from package.json.
 * Outputs JSON to stdout for CI and tooling.
 *
 * Output shape:
 * {
 *   "packageManager": "pnpm" | "npm" | "yarn",
 *   "scripts": { "lint": "lint", "test": "test", "build": "build", ... }
 * }
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const LOCKFILES = [
  ['pnpm', 'pnpm-lock.yaml'],
  ['npm', 'package-lock.json'],
  ['yarn', 'yarn.lock'],
]

const CI_SCRIPT_KEYS = ['lint', 'typecheck', 'tsc', 'check', 'test', 'build']

function pickPm() {
  for (const [pm, lockfile] of LOCKFILES) {
    if (existsSync(resolve(root, lockfile))) return pm
  }
  return 'npm'
}

function loadPackageJson() {
  try {
    const pkgPath = resolve(root, 'package.json')
    return JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    return null
  }
}

function detectScripts(pkg, pm) {
  const pkgScripts = (pkg && pkg.scripts) || {}
  const scripts = {}

  const aliases = {
    typecheck: ['typecheck', 'tsc', 'check-types'],
    lint: ['lint'],
    test: ['test', 'unit', 'ci:test', 'test:run'],
    build: ['build'],
  }

  for (const key of CI_SCRIPT_KEYS) {
    const candidates = aliases[key] || [key]
    const found = candidates.find((c) => c in pkgScripts)
    if (found) scripts[key] = found
  }

  return scripts
}

const pkg = loadPackageJson()
const pm = pickPm()
const scripts = detectScripts(pkg, pm)

const env = {
  packageManager: pm,
  scripts,
}

console.log(JSON.stringify(env, null, 2))
