// E2E 共通ハーネス。ローカル(/tmp/node_modules, /opt/pw-browsers)にも CI(node_modules,
// playwright install)にも移植できるよう、依存パスを env で差し替え可能にする。
//
// env:
//   BASE_URL        既定 http://localhost:3001
//   CDN_DIR         CDN差し替え用UMDの探索ルート（既定: ./node_modules）。
//                   ローカルで /tmp/node_modules を使う場合は CDN_DIR=/tmp/node_modules
//   PW_EXECUTABLE   Chromium 実行ファイルの明示パス（未指定なら Playwright が自動解決）

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const CDN_DIR = process.env.CDN_DIR || path.resolve(__dirname, '..', 'node_modules');

// index.html が読む3つの CDN を、ローカルの UMD ファイルへ差し替える。
const CDN_MAP = [
  { match: '**unpkg.com/react@18/**', file: 'react/umd/react.production.min.js' },
  { match: '**unpkg.com/react-dom@18/**', file: 'react-dom/umd/react-dom.production.min.js' },
  { match: '**unpkg.com/@babel/**', file: '@babel/standalone/babel.min.js' },
];

function resolveCdn(rel) {
  const p = path.join(CDN_DIR, rel);
  if (!fs.existsSync(p)) {
    throw new Error('CDN file not found: ' + p + '\n  (npm install を実行したか、CDN_DIR を確認してください)');
  }
  return p;
}

async function launchBrowser() {
  const opts = { args: ['--no-sandbox'] };
  if (process.env.PW_EXECUTABLE) opts.executablePath = process.env.PW_EXECUTABLE;
  return chromium.launch(opts);
}

async function routeCdn(page) {
  for (const c of CDN_MAP) {
    const file = resolveCdn(c.file);
    await page.route(c.match, (r) => r.fulfill({ path: file }));
  }
}

module.exports = { BASE_URL, launchBrowser, routeCdn };
