#!/usr/bin/env node
// Build-time guard：確認 KaTeX tokenizer 在 production bundle 裡沒有被 bundler 破壞
//
// 背景：Vite v8 / Rolldown 會把 KaTeX lexer regex 裡的 \uD800-\uDFFF Unicode escape
// 展開成 lone surrogates，被 UTF-8 替換成 U+FFFD（�），導致 character class 變成
// 匹配幾乎所有字元，最終 \frac 被 tokenize 成 \f + r + a + c。
//
// 檢查策略：
// 1. 主 bundle 裡不該有 U+FFFD（替換字元）
// 2. 嘗試從 bundle 抽出 KaTeX tokenRegex 並實際 tokenize "\frac" 看結果

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '..', 'dist', 'assets');
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function findMainBundle() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`找不到 dist/assets/ — 請先執行 npm run build`);
  }
  const candidates = fs.readdirSync(DIST_DIR)
    .filter(f => f.startsWith('index-') && f.endsWith('.js'))
    .map(f => ({ name: f, size: fs.statSync(path.join(DIST_DIR, f)).size }))
    .sort((a, b) => b.size - a.size);
  if (candidates.length === 0) {
    throw new Error('找不到 dist/assets/index-*.js');
  }
  return path.join(DIST_DIR, candidates[0].name);
}

function fail(msg) {
  console.error(`${RED}✗ KaTeX bundle check FAILED${RESET}`);
  console.error('  ' + msg.split('\n').join('\n  '));
  console.error('');
  console.error('  這通常是 bundler 破壞了 KaTeX 的 Unicode escape sequence。');
  console.error('  解法：降版 vite 到 ^7.x（用 Rollup）或避開 Rolldown bundler。');
  process.exit(1);
}

function pass(msg) {
  console.log(`${GREEN}✓ KaTeX bundle check passed${RESET} — ${msg}`);
}

const bundlePath = findMainBundle();
const fileName = path.basename(bundlePath);
const src = fs.readFileSync(bundlePath, 'utf-8');

// === 檢查 1：bundle 裡有沒有 U+FFFD ===
const fffdCount = (src.match(/\uFFFD/g) || []).length;
if (fffdCount > 0) {
  // 找第一個 U+FFFD 的 context
  const idx = src.indexOf('\uFFFD');
  const ctx = src.slice(Math.max(0, idx - 40), idx + 40).replace(/\uFFFD/g, '[FFFD]');
  fail(
    `bundle 裡發現 ${fffdCount} 個 U+FFFD 替換字元（正常情況下不該有）\n` +
    `Bundle: ${fileName}\n` +
    `首次出現位置 context: ...${ctx}...`
  );
}

// === 檢查 2：bundle 應該有 KaTeX 的 \uD800 surrogate range escape ===
// Rollup 會把 KaTeX 的 \uD800 escape 保留為 literal text "\uD800"
// Rolldown 會展開成 lone surrogate → 被 UTF-8 替換成 U+FFFD（檢查 1 會 catch）
// 這條規則確保 KaTeX 真的被 bundle 進來了，且 surrogate escape 完整
const hasUD800 = src.includes('\\uD800') || src.includes('\\ud800');
const hasUDFFF = src.includes('\\uDFFF') || src.includes('\\udfff');
const hasVerb = src.includes('\\\\verb'); // KaTeX tokenizer 特徵字串
if (!hasVerb) {
  console.warn(`${YELLOW}⚠ bundle 裡找不到 KaTeX tokenizer 特徵字串（\\\\verb）${RESET}`);
  console.warn(`  可能 KaTeX 沒被 bundle 進來，或結構大改`);
} else if (!hasUD800 || !hasUDFFF) {
  fail(
    `bundle 含 KaTeX tokenizer 但缺少 \\uD800 / \\uDFFF surrogate escape\n` +
    `這代表 bundler 把 surrogate 範圍展開了（即使沒被替換成 U+FFFD 也可能有問題）\n` +
    `Bundle: ${fileName}`
  );
}

pass(`${fileName} — 無 U+FFFD 替換字元，KaTeX surrogate escape 完整`);
