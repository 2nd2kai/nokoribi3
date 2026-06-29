// 残り火の箱庭 — 異常系E2E（data-testid ベース）
//
// 目的: 正常系（fresh→返却灯）だけでなく、思想の本丸である裏口を毎回検証する。
//   1. 危機語 → 保留室（通常保存しない／問い履歴に残さない／返却しない）
//   2. 今日はそばに置く → 余熱不変（heatTraces に spared、応答/灯貨/materials 不変）
//   3. 返さない → returnHoldLog（received のまま／returned にならない／returnLamp 生成しない）
//
// 各テストは「その儀式を開ける状態」を seed して検証する（全工程の再走は normal E2E が担う）。
// 実行: npm run test:e2e（サーバ起動込み）/ 単体は node e2e/abnormal-paths.e2e.js（要 :3001 起動）

const { BASE_URL, launchBrowser, routeCdn } = require('./_harness');

const NOW = new Date().toISOString();
function seed(over) {
  const fire = Object.assign({
    id: 'f1', status: 'received', kindle: 'テスト火', question: 'これは誰に向けた言葉か',
    answers: [], restCount: 0, battleCount: 4, questionProgress: 100, gardenProgress: 60,
    logs: [], stable: false, createdAt: NOW, updatedAt: NOW,
    lastRestAt: null, lastUnreceivedRestAt: null,
    receipt: { id: 'r1', fireId: 'f1', acceptanceText: '受け取りました。', issuedAt: NOW }, receiptDraft: null,
    openedPlace: { id: 'tears', name: '涙の泉', reason: 'x', map: 'm', heatKey: 'pain', openedAt: Date.now(), firstEncounterSeen: true },
    placeTrace: { placeId: 'tears', character: 'かな', selected: '反応', traceText: '水面に置いた痛み：反応', createdAt: NOW },
    finalReturn: null, finalReturnAttemptedAt: null, returnHoldLog: [], heatTraces: [],
    characterResponses: [], questionRevisions: [], careLogs: [], returnLamp: null,
    unreceived: { meaning: 10, value: 10, satisfaction: 10 },
  }, over || {});
  return {
    SAVE_VERSION: 1, fires: [fire],
    toka: 0, materials: { ash: 0, paper: 0, drop: 0, wax: 0, stamp: 0, meaningPiece: 0, blackTag: 0, unfinishedSeed: 0 },
    gardenItems: [], gardenItemCounts: {}, worldNotes: [], relationshipNotes: [], careLogs: [],
    characterMemory: {}, selectedFireId: null,
    unlocks: { tearsSpring: false, recordTower: true }, lastVisualEvent: null, seenEncounters: [],
    seenWorldIntro: true, unlockedPlaces: ['tears'], lastAwayShownAt: null, lastSeenAt: NOW, activeEncounter: null,
    workerTasks: { lightkeeper: { isUnlocked: true, progress: 0, duration: 100 } }, tinyfolk: { lightkeeper: true },
  };
}

const RESULTS = [];
function ck(name, ok, extra) { RESULTS.push((ok ? '✅' : '❌') + ' ' + name + (extra ? ' — ' + extra : '')); return ok; }

(async () => {
  const browser = await launchBrowser();
  let allOk = true;
  const errors = [];

  async function newPage(state) {
    const page = await browser.newPage({ viewport: { width: 390, height: 680 } });
    await routeCdn(page);
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript((s) => localStorage.setItem('nokoribi_v2', s), JSON.stringify(state));
    await page.goto(BASE_URL + '/'); await page.waitForTimeout(2500);
    return page;
  }
  const G = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('nokoribi_v2')));
  async function tap(p, id, t) {
    const l = p.locator('[data-testid="' + id + '"]').first();
    try {
      await l.waitFor({ timeout: 4000 });
      try { await l.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch (e2) {}
      try { await l.click({ timeout: 2500 }); }
      catch (e3) { await l.click({ timeout: 2500, force: true }); } // 末尾の儀式ボタンが重なる場合の保険
      await p.waitForTimeout(t || 350);
      return true;
    } catch (e) { return false; }
  }
  // 儀式ボタンが重なって普通のクリックが届かない深い位置用：DOM の click() を直接発火。
  async function jsTap(p, id, t) {
    const ok = await p.evaluate((tid) => {
      const el = document.querySelector('[data-testid="' + tid + '"]');
      if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true;
    }, id);
    await p.waitForTimeout(t || 350);
    return ok;
  }
  async function fill(p, id, text) {
    const l = p.locator('[data-testid="' + id + '"]').first();
    try {
      await l.waitFor({ timeout: 4000 });
      try { await l.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch (e2) {}
      await l.fill(text);
      return true;
    } catch (e) { return false; }
  }
  async function tapText(p, re, t) { const l = p.locator('button', { hasText: re }); if (await l.count()) { try { await l.first().click({ timeout: 4000 }); await p.waitForTimeout(t || 350); return true; } catch (e) { return false; } } return false; }
  async function openFinalReturn(p) {
    const wentHome = await tap(p, 'home-action-unreceived', 600);
    if (!wentHome) await tapText(p, /記録塔の奥へ/, 600);
    await tap(p, 'final-return-open', 800);
    try { await p.locator('.final-return-wrap').first().waitFor({ timeout: 4000 }); } catch (e) {}
    return (await p.locator('.final-return-wrap').count()) > 0;
  }

  // ── 1a. 危機語（最後の一言）→ 保留室 ──────────────────────────────────
  {
    const p = await newPage(seed());
    let ok = true;
    ok &= ck('1a-setup FinalReturn開く', await openFinalReturn(p));
    await tap(p, 'final-return-sign', 500);
    await tap(p, 'final-axis-meaning', 200); await tap(p, 'final-axis-value', 200); await tap(p, 'final-axis-satisfaction', 200);
    await fill(p, 'final-return-memo', '死にたい');
    await tap(p, 'final-return-sign-next', 600);
    ok &= ck('1a memo危機語→保留室', (await p.locator('[data-testid="crisis-hold"]').count()) > 0);
    const g = await G(p);
    ok &= ck('1a 返却されない', g.fires[0].status === 'received', 'status=' + g.fires[0].status);
    ok &= ck('1a returnLamp未生成', !g.fires[0].returnLamp);
    allOk = allOk && !!ok;
    await p.close();
  }

  // ── 1b. 危機語（問い再記述）→ 保留室・履歴に残らない ──────────────────
  {
    const p = await newPage(seed());
    let ok = true;
    ok &= ck('1b-setup FinalReturn開く', await openFinalReturn(p));
    await p.waitForTimeout(400);
    ok &= ck('1b 置き直す開く', await jsTap(p, 'question-revise-open', 500));
    ok &= ck('1b 入力欄表示', await fill(p, 'question-revise-input', 'しにたい'));
    await jsTap(p, 'question-revise-save', 600);
    ok &= ck('1b 問い再記述危機語→保留室', (await p.locator('[data-testid="crisis-hold"]').count()) > 0);
    const g = await G(p);
    ok &= ck('1b 問い履歴に残らない', (g.fires[0].questionRevisions || []).length === 0, 'revisions=' + (g.fires[0].questionRevisions || []).length);
    allOk = allOk && !!ok;
    await p.close();
  }

  // ── 2. 今日はそばに置く → 余熱不変 ──────────────────────────────────────
  {
    const p = await newPage(seed({ unreceived: { meaning: 55, value: 10, satisfaction: 10 } }));
    let ok = true;
    const before = await G(p);
    // 未受領パネルへ
    await tap(p, 'home-action-unreceived', 500) || await tapText(p, /余熱に会い直す|記録塔の奥へ/, 500);
    ok &= ck('2-setup heat開く', await tap(p, 'heat-revisit-open-meaning', 700));
    // intro beats → 今日はそばに置く → 置いていく
    for (let i = 0; i < 6; i++) { if (await p.locator('[data-testid="heat-touch-keep"]').count()) break; await tap(p, 'heat-intro-next', 400); }
    await tap(p, 'heat-touch-keep', 500);
    await tap(p, 'heat-finish', 700);
    const g = await G(p);
    ok &= ck('2 余熱不変(meaning 55)', g.fires[0].unreceived.meaning === 55, 'after=' + g.fires[0].unreceived.meaning);
    const spared = (g.fires[0].heatTraces || []).some(h => h.spared === true);
    ok &= ck('2 heatTraces spared:true', spared);
    ok &= ck('2 characterResponses不変', (g.fires[0].characterResponses || []).length === (before.fires[0].characterResponses || []).length, 'resp=' + (g.fires[0].characterResponses || []).length);
    ok &= ck('2 灯貨不変', g.toka === before.toka, 'toka=' + g.toka);
    ok &= ck('2 materials不変(0)', Object.values(g.materials).reduce((a, b) => a + b, 0) === 0);
    allOk = allOk && !!ok;
    await p.close();
  }

  // ── 3. 返さない → returnHoldLog ─────────────────────────────────────────
  {
    const p = await newPage(seed());
    let ok = true;
    ok &= ck('3-setup FinalReturn開く', await openFinalReturn(p));
    await tap(p, 'final-return-sign', 500);
    await tap(p, 'final-axis-meaning', 200); await tap(p, 'final-axis-value', 200); await tap(p, 'final-axis-satisfaction', 200);
    await tap(p, 'final-return-sign-next', 600);
    await tap(p, 'final-return-hold', 500);        // 今日はまだ返さない
    await tap(p, 'final-return-hold-close', 700);  // 閉じる
    const g = await G(p);
    ok &= ck('3 status は received のまま', g.fires[0].status === 'received', 'status=' + g.fires[0].status);
    ok &= ck('3 returnHoldLog が増える', (g.fires[0].returnHoldLog || []).length > 0, 'hold=' + (g.fires[0].returnHoldLog || []).length);
    ok &= ck('3 returned にならない', g.fires[0].status !== 'returned');
    ok &= ck('3 returnLamp 生成されない', !g.fires[0].returnLamp);
    ok &= ck('3 灯貨不変(0)', g.toka === 0, 'toka=' + g.toka);
    allOk = allOk && !!ok;
    await p.close();
  }

  console.log('=== 異常系E2E (data-testid) ===');
  RESULTS.forEach(r => console.log(r));
  console.log(allOk ? 'ALL ABNORMAL-PATH CHECKS PASSED' : 'SOME CHECKS FAILED');
  console.log('jsErrors:', JSON.stringify(errors.slice(0, 5)));
  await browser.close();
  process.exit(allOk ? 0 : 1);
})();
