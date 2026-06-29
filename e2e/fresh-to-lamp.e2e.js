// 残り火の箱庭 — fresh→返却灯 真E2E（data-testid ベース）
//
// 目的: 1本の火が「灯す→預ける→向き合う→足跡→受領→場所→出会い→余熱→応答→
//       問いの置き直し→返却→返却灯」と一周することを、UIの class名・文言に依存せず検証する。
// 実行: ローカルHTTPサーバ(:3001)で index.html を配信し、CDN を /tmp/node_modules へ差し替え。
//   NODE_PATH=/opt/node22/lib/node_modules node e2e/fresh-to-lamp.e2e.js
//
// 注記: battle→found の grind だけ DevBar「強制発見」で短縮する（dev-force-found）。
//   これは通常プレイの grind 検証が目的ではなく、fresh→返却灯の一周フロー検証が目的のため。
//   それ以外の儀式（受領の旅・場所出会い・余熱・問い置き直し・署名・返却）は実UIで駆動する。

const { chromium } = require('playwright');

const CHECKPOINTS = [
  'fresh', 'fire_created', 'entrusted', 'footprint_saved', 'found',
  'receipt_created', 'place_unlocked', 'place_encountered', 'heat_revisited',
  'character_response_saved', 'question_revised', 'returned', 'lamp_visible',
];

(async () => {
  const reached = {};
  let stoppedAt = null, stopReason = null;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 680 } });
  await page.route('**unpkg.com/react@18/**', r => r.fulfill({ path: '/tmp/node_modules/react/umd/react.production.min.js' }));
  await page.route('**unpkg.com/react-dom@18/**', r => r.fulfill({ path: '/tmp/node_modules/react-dom/umd/react-dom.production.min.js' }));
  await page.route('**unpkg.com/@babel/**', r => r.fulfill({ path: '/tmp/node_modules/@babel/standalone/babel.min.js' }));
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
    await page.goto('http://localhost:3001/'); await page.waitForTimeout(2200);

    // 1. fresh
    if (!(await page.locator('.intro-scene').count())) throw new Error('intro not shown');
    mark('fresh');

    // intro: つづき×N → 火を見る
    for (let i = 0; i < 14; i++) { if (await tapText(/火を見る/, 400)) break; await tapText(/つづき/, 250); }

    // 2. 火を置く
    await tid('fire-input').first().fill('届かなかった手紙。読んでほしかった。');
    for (let i = 0; i < 6; i++) { if (await tap('place-fire-submit', 700)) break; await tap('fire-next', 350); }
    await page.waitForTimeout(700);
    let g = await G();
    if (!(g && g.fires.length > 0)) throw new Error('fire not created');
    mark('fire_created');

    // 3. 預ける（EntrustScene: つづき→未受領の森へ）
    for (let i = 0; i < 12; i++) {
      if (!(await page.locator('.entrust-scene').count())) break;
      if (!(await tap('entrust-next', 500))) await page.locator('.intro-btn-next').first().click().catch(() => {});
      await page.waitForTimeout(150);
    }
    g = await G();
    if (g.fires[0].status !== 'searching') throw new Error('not entrusted (status=' + g.fires[0].status + ')');
    mark('entrusted');

    // 4-5. 影と向き合う → 問いの足跡
    await tap('shadow-open', 500);
    await tap('shadow-confront', 500);
    if (await tid('shadow-input').count()) {
      await tid('shadow-input').first().fill('反応がほしかった。');
      await tap('shadow-submit', 900);
    }
    g = await G();
    if (!((g.fires[0].answers || []).length > 0)) throw new Error('footprint not saved');
    mark('footprint_saved');

    // grind短縮: DevBar 強制発見（通常プレイのgrind検証は目的外）
    await tap('dev-toggle', 350);
    await tap('dev-force-found', 700);
    await tap('dev-toggle', 300); // DevBar を閉じて下部ボタンの被りを避ける
    g = await G();
    if (g.fires[0].status !== 'found') throw new Error('not found');
    mark('found');

    // 発見シーン → deliver。複数ステップ（つづき）を進めてから deliver を押す。
    await page.waitForTimeout(400);
    for (let i = 0; i < 12; i++) {
      if (!(await page.locator('.intro-scene').count())) break; // 発見シーンが消えた
      if (await tap('discovery-deliver', 700)) break;
      await page.locator('.intro-btn-next').first().click().catch(() => {});
      await page.waitForTimeout(300);
    }
    // 受領の旅: receipt-journey-next を、ジャーニーが終わるまで叩く
    for (let i = 0; i < 60; i++) {
      if (await tap('receipt-journey-next', 320)) continue;
      await page.waitForTimeout(200);
      if (!(await page.locator('[data-testid="receipt-journey-next"]').count())) break;
    }
    await page.waitForTimeout(500);
    g = await G();
    if (!(g.fires[0].status === 'received' && g.fires[0].receipt)) throw new Error('receipt not created (status=' + g.fires[0].status + ')');
    mark('receipt_created');
    if (!g.fires[0].openedPlace) throw new Error('place not unlocked');
    mark('place_unlocked');

    // 受領証カードを閉じる（→ garden に遷移する）。Home に戻ってから場所へ向かう。
    await tap('receipt-action', 700);
    await page.waitForTimeout(300);
    await tap('view-back', 500); // garden → home

    // 10. 開いた場所へ → キャラ出会い
    if (!(await tap('home-action-encounter', 700))) {
      await tap('gf-action-encounter', 700); // 庭カード側からも開ける
    }
    for (let i = 0; i < 12; i++) {
      if (!(await page.locator('.place-scene').count())) break;
      if (await tap('place-encounter-choice', 500)) continue;
      if (await tap('place-encounter-finish', 600)) continue;
      if (await tap('place-encounter-next', 400)) continue;
      await page.locator('.place-scene').click().catch(() => {});
      await page.waitForTimeout(150);
    }
    g = await G();
    if (!(g.fires[0].openedPlace.firstEncounterSeen && g.fires[0].placeTrace)) throw new Error('place not encountered');
    mark('place_encountered');

    // 11-12. 余熱に会い直す（settled まで）＋ キャラ応答
    let revisits = 0;
    for (let n = 0; n < 30; n++) {
      g = await G(); const u = g.fires[0].unreceived;
      if (u.meaning <= 14 && u.value <= 14 && u.satisfaction <= 14) break;
      // 未受領パネルへ
      if (!(await page.locator('[data-testid^="heat-revisit-open-"]').count())) {
        await tap('home-action-unreceived', 600) || await tapText(/余熱に会い直す|記録塔の奥へ/, 600);
      }
      const open = page.locator('[data-testid^="heat-revisit-open-"]');
      if (!(await open.count())) break;
      await open.first().click().catch(() => {}); await page.waitForTimeout(600);
      for (let i = 0; i < 10; i++) {
        if (!(await page.locator('.heat-revisit-wrap').count())) break;
        if (await tap('heat-touch-direct', 450)) continue;     // 正面から見る（大きくほどく）
        if (await tap('heat-choice', 450)) continue;
        if (await tap('heat-finish', 600)) continue;
        await tap('heat-intro-next', 400);
      }
      revisits++;
    }
    if (revisits > 0) mark('heat_revisited');
    g = await G();
    if ((g.fires[0].characterResponses || []).some(r => r.source === 'heatRevisit')) mark('character_response_saved');

    // FinalReturn を開く
    if (!(await page.locator('[data-testid="final-return-open"]').count())) {
      await tap('home-action-unreceived', 600) || await tapText(/記録塔の奥へ/, 600);
    }
    await tap('final-return-open', 800);
    if (!(await page.locator('.final-return-wrap').count())) throw new Error('FinalReturn not opened');

    // 13. 問いの置き直し
    await tap('question-revise-open', 500);
    if (await tid('question-revise-input').count()) {
      await tid('question-revise-input').first().fill('私は、何を受け取ってほしかったのか？');
      await tap('question-revise-save', 700);
    }
    g = await G();
    if ((g.fires[0].questionRevisions || []).length > 0) mark('question_revised');

    // 14-15. 署名 → 返却
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

    // 16. 返却灯を見る
    await tapText(/箱庭/, 600);
    await tap('record-tower-toggle', 600);
    await tap('tower-tab-lamp', 400);
    await tap('return-lamp-open', 700);
    if (await tid('return-lamp-card').count()) mark('lamp_visible');
    else throw new Error('return lamp card not visible');

  } catch (e) {
    stopReason = e.message;
  }

  // 最初に未到達になったチェックポイントを特定
  for (const cp of CHECKPOINTS) { if (!reached[cp]) { stoppedAt = cp; break; } }

  // 不変条件
  const g = await G().catch(() => null);
  const inv = {};
  if (g) {
    inv.materials_zero = Object.values(g.materials || {}).reduce((a, b) => a + b, 0) === 0;
    inv.toka_only_spill = typeof g.toka === 'number' && g.toka <= 1; // 受領の余光1回ぶんのみ
    inv.selectedFireId_sane = g.selectedFireId === null || (g.fires || []).some(f => f.id === g.selectedFireId);
  }
  const hoverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => -1);

  console.log('=== fresh→返却灯 E2E (data-testid) ===');
  CHECKPOINTS.forEach(cp => console.log((reached[cp] ? '✅' : '⬜') + ' ' + cp));
  if (stoppedAt) console.log('STOPPED AT: ' + stoppedAt + (stopReason ? ' — ' + stopReason : ''));
  else console.log('ALL CHECKPOINTS PASSED');
  console.log('invariants:', JSON.stringify(inv), '| hoverflow:', hoverflow);
  console.log('jsErrors:', JSON.stringify(errors.slice(0, 5)));
  await browser.close();
  process.exit(stoppedAt ? 1 : 0);
})();
