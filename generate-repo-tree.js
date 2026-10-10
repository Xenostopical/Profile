#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [sourceRoot, outputFile, repoName] = process.argv.slice(2);
if (!sourceRoot || !outputFile || !repoName) {
  console.error('Usage: node generate-repo-tree.js <sourceRoot> <outputFile> <repoName>');
  process.exit(1);
}

const entries = [];
const dirs = new Set();

function isBinary(buf) {
  const sample = buf.subarray(0, Math.min(buf.length, 8192));
  return sample.includes(0);
}

function lineCount(buf, binary) {
  if (binary) return null;
  if (buf.length === 0) return 0; // empty file = 0 lines
  try {
    return buf.toString('utf8').split(/\r\n|\r|\n/).length - (buf.length && /(?:\r\n|\r|\n)$/.test(buf.toString('utf8')) ? 1 : 0);
  } catch (_) {
    return null;
  }
}

function walk(dir, relative = '') {
  for (const name of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (name.name === '.git' || name.name === 'tree.json') continue;
    const abs = path.join(dir, name.name);
    const rel = relative ? `${relative}/${name.name}` : name.name;
    if (name.isDirectory()) {
      dirs.add(rel);
      walk(abs, rel);
      continue;
    }
    if (!name.isFile()) continue;
    let buf;
    try { buf = fs.readFileSync(abs); } catch (_) { continue; }
    const binary = isBinary(buf);
    entries.push({
      path: rel,
      type: 'file',
      size: buf.length,
      lines: lineCount(buf, binary),
      binary
    });
    let parent = path.posix.dirname(rel);
    while (parent && parent !== '.') {
      dirs.add(parent);
      parent = path.posix.dirname(parent);
    }
  }
}

walk(sourceRoot);
const all = [
  ...[...dirs].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b)).map(p => ({ path: p, type: 'dir' })),
  ...entries.sort((a, b) => a.path.localeCompare(b.path))
];

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify({ version: 1, repo: repoName, entries: all }, null, 2) + '\n');
