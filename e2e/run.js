// E2E オーケストレータ（依存ゼロ）。
//   1. 静的サーバを起動し :3001 が応答するまで待つ
//   2. 正常系E2E → 異常系E2E を順に実行
//   3. いずれか失敗ならサーバを止めて非ゼロで終了
// CI でもローカルでも `node e2e/run.js`（= npm run test:e2e）で完結する。
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = process.env.PORT || 3001;
const E2E_DIR = __dirname;

function waitForPort(port, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 15000);
  return new Promise((resolve, reject) => {
    (function tryOnce() {
      const req = http.get({ host: 'localhost', port: port, path: '/' }, (res) => { res.resume(); resolve(); });
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error('server did not start on :' + port));
        else setTimeout(tryOnce, 250);
      });
    })();
  });
}

function runNode(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(E2E_DIR, file)], { stdio: 'inherit', env: process.env });
    child.on('exit', (code) => resolve(code || 0));
  });
}

(async () => {
  const server = spawn(process.execPath, [path.join(E2E_DIR, 'serve.js')], { stdio: 'inherit', env: process.env });
  let exitCode = 0;
  try {
    await waitForPort(PORT, 15000);
    console.log('\n--- 正常系E2E: fresh→返却灯 ---');
    const a = await runNode('fresh-to-lamp.e2e.js');
    console.log('\n--- 異常系E2E: 危機語 / そばに置く / 返さない ---');
    const b = await runNode('abnormal-paths.e2e.js');
    console.log('\n--- 最短帰還E2E: wishUnknown + placePending → 返却灯 ---');
    const c = await runNode('shortest-path.e2e.js');
    exitCode = (a || b || c) ? 1 : 0;
    console.log('\n=== E2E 総合: ' + (exitCode === 0 ? 'PASS' : 'FAIL') +
      ' (normal=' + a + ', abnormal=' + b + ', shortest=' + c + ') ===');
  } catch (e) {
    console.error('E2E runner error:', e.message);
    exitCode = 1;
  } finally {
    server.kill('SIGTERM');
  }
  process.exit(exitCode);
})();
