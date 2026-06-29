// 残り火の箱庭 — 記録塔受領証→心へ返す E2E
//
// 目的: RecordTowerから受領証を開いたとき、
//       その受領証カードから直接「心へ返す」に進めることを検証する。
//       余熱・場所訪問は一切行わない（wishKnownの火で確認）。
//
// 実行: npm run test:e2e / node e2e/receipt-to-return.e2e.js（要 :3001 起動）

const { BASE_URL, launchBrowser, routeCdn } = require('./_harness');

const CHECKPOINTS = [
  'fresh', 'fire_created', 'entrusted', 'found',
  'receipt_created',
  'receipt_open_from_tower',   // RecordTower から受領証を開いた
  'final_return_opened',       // その受領証の「心へ返す」で FinalReturn が開いた
  'returned', 'lamp_visible',
];

(async () => {
  const reached = {};
  let stoppedAt = null, stopReason = null;
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 390, height: 680 } });
  await routeCdn(page);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  const G = () => page.evaluate(() => JSON.parse(localStorage.getItem('nokoribi_v2')));
  const tid = (id) => page.locator('[data-testid="' + id + '"]');
  async function tap(id, t) {
    const l = tid(id);
    if (await l.count()) { try { await l.first().click({ timeout: 4000 }); await page.waitForTimeout(t || 400); return true; } catch (e) { return false; } }
    return false;
  }
  async function tapText(re, t) {
    const l = page.locator('button', { hasText: re });
    if (await l.count()) { try { await l.first().click({ timeout: 4000 }); await page.waitForTimeout(t || 400); return true; } catch (e) { return false; } }
    return false;
  }
  function mark(cp) { reached[cp] = true; }

  try {
    await page.addInitScript(() => localStorage.removeItem('nokoribi_v2'));
    await page.goto(BASE_URL + '/'); await page.waitForTimeout(2200);

    if (!(await page.locator('.intro-scene').count())) throw new Error('intro not shown');
    mark('fresh');

    // intro
    for (let i = 0; i < 14; i++) { if (await tapText(/火を見る/, 400)) break; await tapText(/つづき/, 250); }

    // 火を置く — wishKnown（分かってほしかった）で場所が開く
    await tid('fire-input').first().fill('伝わらなかった言葉。');
    await tap('fire-next', 400);
    await tapText(/分かってほしかった/, 300);
    await tap('place-fire-submit', 700);
    await page.waitForTimeout(700);
    let g = await G();
    if (!(g && g.fires.length > 0)) throw new Error('fire not created');
    mark('fire_created');

    // 預ける
    for (let i = 0; i < 12; i++) {
      if (!(await page.locator('.entrust-scene').count())) break;
      if (!(await tap('entrust-next', 500))) await page.locator('.intro-btn-next').first().click().catch(() => {});
      await page.waitForTimeout(150);
    }
    g = await G();
    if (g.fires[0].status !== 'searching') throw new Error('not entrusted');
    mark('entrusted');

    // DevBar 強制発見
    await tap('dev-toggle', 350);
    await tap('dev-force-found', 700);
    await tap('dev-toggle', 300);
    g = await G();
    if (g.fires[0].status !== 'found') throw new Error('not found');
    mark('found');

    // 発見シーン → deliver
    await page.waitForTimeout(400);
    for (let i = 0; i < 12; i++) {
      if (!(await page.locator('.intro-scene').count())) break;
      if (await tap('discovery-deliver', 700)) break;
      await page.locator('.intro-btn-next').first().click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // 受領の旅 — スライダーを動かさずに完了
    for (let i = 0; i < 60; i++) {
      if (await tap('receipt-journey-next', 320)) continue;
      await page.waitForTimeout(200);
      if (!(await page.locator('[data-testid="receipt-journey-next"]').count())) break;
    }
    await page.waitForTimeout(500);
    g = await G();
    if (!(g.fires[0].status === 'received' && g.fires[0].receipt)) throw new Error('receipt not created');
    mark('receipt_created');

    // 受領証カードを閉じる（「火の中を見る」→ garden の未受領パネルへ）
    await tapText(/火の中を見る/, 700);
    await page.waitForTimeout(500);

    // GardenView にいる状態で、記録塔を開く
    await tap('record-tower-toggle', 600);
    // 記録タブで「受領証を見る」ボタンを押す
    if (!(await tap('receipt-open', 800))) throw new Error('receipt-open button not found in RecordTower');
    mark('receipt_open_from_tower');

    // ReceiptCard に「心へ返す」ボタン（receipt-action）が出ることを確認して押す
    if (!(await tap('receipt-action', 700))) throw new Error('receipt-action (心へ返す) not found in ReceiptCard from RecordTower');

    // FinalReturn が開いたか確認
    if (!(await page.locator('.final-return-wrap').count())) throw new Error('FinalReturn not opened from RecordTower receipt');
    mark('final_return_opened');

    // 署名 → 返却
    await tap('final-return-sign', 600);
    await tap('final-axis-meaning', 250);
    await tap('final-axis-value', 250);
    await tap('final-axis-satisfaction', 250);
    await tap('final-return-sign-next', 600);
    await tap('final-return-submit', 800);
    await tap('final-return-close', 900);
    g = await G();
    if (g.fires[0].status !== 'returned') throw new Error('not returned (status=' + g.fires[0].status + ')');
    mark('returned');

    // 返却灯
    await tapText(/箱庭/, 600);
    await tap('record-tower-toggle', 600);
    await tap('tower-tab-lamp', 400);
    await tap('return-lamp-open', 700);
    if (await tid('return-lamp-card').count()) mark('lamp_visible');
    else throw new Error('return lamp card not visible');

  } catch (e) {
    stopReason = e.message;
  }

  for (const cp of CHECKPOINTS) { if (!reached[cp]) { stoppedAt = cp; break; } }

  const g = await G().catch(() => null);
  const inv = {};
  if (g) {
    inv.materials_zero = Object.values(g.materials || {}).reduce((a, b) => a + b, 0) === 0;
    inv.selectedFireId_sane = g.selectedFireId === null || (g.fires || []).some(f => f.id === g.selectedFireId);
  }
  const hoverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => -1);

  console.log('=== 記録塔受領証→心へ返す E2E ===');
  CHECKPOINTS.forEach(cp => console.log((reached[cp] ? '✅' : '⬜') + ' ' + cp));
  if (stoppedAt) console.log('STOPPED AT: ' + stoppedAt + (stopReason ? ' — ' + stopReason : ''));
  else console.log('ALL CHECKPOINTS PASSED');
  console.log('invariants:', JSON.stringify(inv), '| hoverflow:', hoverflow);
  console.log('jsErrors:', JSON.stringify(errors.slice(0, 5)));
  await browser.close();
  process.exit(stoppedAt ? 1 : 0);
})();
