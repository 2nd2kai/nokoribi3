// 残り火の箱庭 v6.0 — clean MVP rewrite
'use strict';

// ── Constants ──────────────────────────────────────────────────────────────

const SAVE_KEY = 'nokoribi_v2';
const SAVE_KEY_BAK = 'nokoribi_v2_bak'; // 直前の正常な save の控え。本体が壊れた時の復旧用。
const SAVE_VERSION = 1;
// ログ上限。預けた言葉（answers）は決して捨てないが、自動生成される情景ログは古い順に間引く。
const LOG_CAP_FIRE = 50;  // fire.logs / fire.restLogs の保持上限
const LOG_CAP_GAME = 100; // 将来 game.logs を持つ場合の保持上限
const TICK_INTERVAL = 30000; // 30s passive tick
const PASSIVE_GAIN = 1;
const BATTLE_GAIN_MIN = 15;
const BATTLE_GAIN_MAX = 25;

const WRITE_STATES = [
  '書いたけど届いていない',
  '投稿したけど反応がない',
  '終わったのに虚しい',
  '何にもならない気がした',
  '誰にも見せていない',
  '消したいけど消せない',
];

const FEELINGS = [
  '悔しさ', '悲しさ', '寂しさ', '怒り',
  '恥ずかしさ', '情けなさ', '疲れ', '空っぽ', 'まだ分からない',
];

const SHADOW_BY_WS = {
  '書いたけど届いていない': [
    '届けたかった相手の顔、思い浮かぶ？',
    'その言葉、受け取ってもらえると思ってた？',
    '届かなかったとき、何が一番つらかった？',
    '伝えたかったことと、伝えられたことは同じだった？',
    'もし届いていたら、何が変わると思う？',
    '届けようとした理由、ちゃんと覚えてる？',
    '届かなかったのは、言葉のせい？タイミングのせい？',
    'その言葉を書いたとき、どんな気持ちだった？',
    'まだ届けたいと思ってる？',
  ],
  '投稿したけど反応がない': [
    '反応を待っていた時間、どんな気持ちだった？',
    '誰かに見てほしかった？それとも、ただ存在を認めてほしかった？',
    '反応がなかったとき、最初に何を考えた？',
    '投稿する前に期待してたこと、正直に言える？',
    '反応がなくても、あの言葉に価値はあったと思う？',
    'もし誰かが反応してくれていたら、何を言ってほしかった？',
    '次にまた書くとしたら、何か変わる？',
    '静寂の中で、あなたの言葉はどこへ行ったと思う？',
    '見えない誰かに届いている可能性、考えたことある？',
  ],
  '終わったのに虚しい': [
    '終わった瞬間、何を感じた？',
    '頑張ったはずなのに、なぜ虚しいんだと思う？',
    '終わりを迎えたことで、失ったものは何かある？',
    'その虚しさ、誰かに話したことある？',
    '次の何かが始まるまで、この虚しさはどこにあると思う？',
    '達成感と虚しさ、両方あってもいいと思う？',
  ],
  '何にもならない気がした': [
    '「何にもならない」って、誰の言葉？',
    '本当に何にもならないと思ってる？それとも、そう言い聞かせてる？',
    '価値があるかどうか、誰が決めると思う？',
    'あの時間、全部無駄だったと言い切れる？',
    '「何かになる」って、どういう状態だと思う？',
  ],
  '誰にも見せていない': [
    '見せていない理由、自分に正直に言える？',
    '誰かに見せたいという気持ち、本当にない？',
    '見せないまま、それはどこに存在してる？',
    '見せたとしたら、最も怖いことは何？',
    'あなただけが知っているもの、大切にしてる？',
    '見せない選択をしたこと、後悔してる？',
  ],
  '消したいけど消せない': [
    '消したい理由と、消せない理由、どっちが強い？',
    '消したら、何がなくなると思う？',
    '消せないのは、まだ意味があるから？',
    'それを見るたびに、どんな気持ちになる？',
    '消すことと、手放すことは同じだと思う？',
  ],
};

const SHADOW_BY_FEELING = {
  '悔しさ': [
    'その悔しさ、どこから来てる？',
    '悔しいということは、諦めていない証拠かもしれない。',
    '次につなげたいという気持ち、ある？',
    'その悔しさを、誰かに知ってほしい？',
  ],
  '悲しさ': [
    'その悲しさ、受け止めてもらえたことある？',
    '悲しいとき、どこにいたい？',
    '泣けた？それとも、泣けなかった？',
    'その悲しさの中に、大切にしていたものがある。',
  ],
  '寂しさ': [
    '一人でいることと、寂しいことは違う。どっちに近い？',
    '誰かにそばにいてほしかった？',
    'その寂しさを感じていた場所、覚えてる？',
    'つながりを求めてた？それとも、ただ理解されたかった？',
  ],
  '怒り': [
    'その怒り、正当だと思う？',
    '怒りの奥に、傷ついた気持ちはない？',
    '誰かに聞いてもらえたら、少し楽になる？',
    '怒りを感じてもいいと思う。それで十分かもしれない。',
  ],
  '恥ずかしさ': [
    '恥ずかしいと感じるのは、それだけ真剣だったから。',
    '誰かに知られることが怖かった？',
    'その恥ずかしさ、今でも続いてる？',
  ],
  '情けなさ': [
    '情けないと感じるとき、自分に何を期待してた？',
    'その基準、誰が決めたの？',
    '情けないと思うあなたは、まだ諦めていない。',
  ],
  '疲れ': [
    'どのくらい疲れてる？',
    '休んでいいって、言われたことある？',
    'その疲れ、ずっと続いてた？',
  ],
  '空っぽ': [
    '空っぽって、どんな感触？',
    '何かが抜け落ちた感じ、ある？',
    '空っぽになる前、何があった？',
  ],
  'まだ分からない': [
    '分からなくて、当然だと思う。',
    '焦って答えを出さなくていい。',
    'その「分からない」の中に、何かいる気がする？',
  ],
};

const SHADOW_SOFTENED = [
  'もう少し、続けてみようか。',
  '君が向き合ってくれているのを、見ている。',
  '問いより先に、ここにいることの方が大事かもしれない。',
  '答えなくていい。ただ、感じてみて。',
  '何度でも、戻ってきていい場所がある。',
  '影は、消えることより薄れることの方が多い。',
  '君が来てくれるたびに、少し変わっていく。',
  '今日は、これだけで十分かもしれない。',
  '焦らなくていい。影はここにいる。',
  '言葉にならなくても、向き合ったことは残る。',
  'その重さを、一人で持たなくていい。',
  '今感じていることを、大切にしてみて。',
];

const QUESTION_POOL = [
  (ws) => `あなたが「${ws}」と感じたとき、本当は何を求めていましたか？`,
  () => 'その創作の中で、あなたが最も恐れていたものは何でしたか？',
  (ws, f) => `「${f || ws}」という気持ちの奥に、どんな願いが隠れていましたか？`,
  () => 'あなたにとって、「届く」とはどういう意味でしたか？',
  () => 'その言葉を生み出したとき、あなたは何者でしたか？',
  () => 'もしあの作品が誰かを救っていたとしたら、あなたはどう感じますか？',
  () => '諦めることと、手放すことの違いを、あなたはどう考えますか？',
  (ws) => `「${ws}」という経験が、あなたを変えたとしたら、どのように？`,
];

// 危機語。完璧な検閲ではなく、苦痛に最後の編集権を渡さないための網。
// 漢字は形態素解析できないので、漢字形とひらがな形の両方を持つ。
// カタカナ・全角・大文字・分かち書きは normalizeForCrisis が吸収する。
const CRISIS_WORDS = [
  '死にたい', 'しにたい', '死にたく', 'しにたく', '死のう', 'しのう',
  '死んでしまいたい', 'しんでしまいたい', '死ぬしかない', 'しぬしかない',
  '消えたい', 'きえたい', '消えてしまいたい', 'きえてしまいたい',
  '消えてなくなりたい', 'きえてなくなりたい', '消えたくなる', 'きえたくなる',
  'いなくなりたい', '居なくなりたい',
  '生きていたくない', 'いきていたくない', '生きたくない', 'いきたくない',
  '自殺', 'じさつ', '自傷', 'じしょう', '自害', 'じがい', 'リストカット',
  '終わりにしたい', 'おわりにしたい',
  'killmyself', 'suicide', 'wanttodie', 'endmylife', 'iwanttodie',
];

// 支援案内。番号や文言が将来変わってもここ一箇所だけ直せばよいようにまとめる。
// コード中に散らばらせない。
const SUPPORT_INFO = {
  lead: 'もし今、つらくて誰かに話したいとき。',
  name: 'よりそいホットライン',
  number: '0120-279-338',
  sub: '24時間・通話無料。ひとりで抱えなくて大丈夫です。',
};

// ── Utilities ──────────────────────────────────────────────────────────────

function nowISO() { return new Date().toISOString(); }

function cloneS(obj) { return JSON.parse(JSON.stringify(obj)); }

function rnd() { return Math.random(); }

function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

// ログ配列を最新 max 件に保つ（古いものから捨てる）。無限肥大で localStorage を殺さないため。
function capLog(arr, max) {
  if (!Array.isArray(arr)) return [];
  return arr.length > max ? arr.slice(arr.length - max) : arr;
}

// 検知のための正規化。NFKC・小文字化・カタカナ→ひらがな・空白/区切りの除去。
// 「し ね」「し・に・た・い」「シニタイ」「ｼﾆﾀｲ」等の回避を畳む。
function normalizeForCrisis(text) {
  if (!text) return '';
  var t = String(text);
  try { t = t.normalize('NFKC'); } catch (e) {}
  t = t.toLowerCase();
  // カタカナ → ひらがな（コードポイントずらし）
  t = t.replace(/[ァ-ヶ]/g, function(ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0x60);
  });
  // 空白・中黒・区切り記号を畳んで、分断による回避を防ぐ
  t = t.replace(/[\s　・･.,_\-―ー~〜|/\\]/g, '');
  return t;
}

// 危機語を含むか。語彙側も同じ正規化を通すので、表記ゆれに広く当たる。
function hasDanger(text) {
  var n = normalizeForCrisis(text);
  if (!n) return false;
  for (var i = 0; i < CRISIS_WORDS.length; i++) {
    if (n.indexOf(normalizeForCrisis(CRISIS_WORDS[i])) !== -1) return true;
  }
  return false;
}

function fireTitle(fire) {
  if (!fire) return '';
  return fire.kindle.slice(0, 20) + (fire.kindle.length > 20 ? '…' : '');
}

// ひとつの保存スロットを読む。戻り値で状態を区別する:
//   undefined = ストレージ自体にアクセスできない（プライベートモード等）
//   null      = 空（まだ何も保存されていない）
//   false     = 存在するが壊れている（JSON parse 失敗 / ゲームオブジェクトでない）
//   object    = 復元候補（version 違い・フィールド欠損があっても、ここでは捨てない）
function readSaveSlot(key) {
  var raw;
  try { raw = localStorage.getItem(key); } catch (e) { return undefined; }
  if (!raw) return null;
  var parsed;
  try { parsed = JSON.parse(raw); } catch (e) { return false; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  return parsed;
}

// 候補オブジェクトを、現行バージョンの起動可能なゲームへ復元する。
// version 移行 → 欠損補完 の順。途中で例外が出たら null（呼び出し側がバックアップ/初期化へ）。
function restoreGame(parsed) {
  try {
    return normalizeGame(migrateGame(parsed));
  } catch (e) {
    return null;
  }
}

// 預けた火は、簡単には捨てない。
// 本体が壊れていてもバックアップから復旧を試み、それも駄目な時だけ初期化する。
function loadSave() {
  var main = readSaveSlot(SAVE_KEY);
  // 本体がオブジェクトとして読めた → version 違いでも欠損でも、移行＋補完して使う
  if (main && typeof main === 'object') {
    var g = restoreGame(main);
    if (g) return g;
  }
  // 本体が壊れている / 復元に失敗 → 直前の控えから救う
  var bak = readSaveSlot(SAVE_KEY_BAK);
  if (bak && typeof bak === 'object') {
    var gb = restoreGame(bak);
    if (gb) return gb;
  }
  // どちらも無い・両方壊れている時だけ、新しい世界を始める
  return null;
}

// 保存結果を必ず返す（呼び出し側が失敗を検知して通知できるように）。
// { ok: true } / { ok: false, error }
function persistSave(game) {
  var json;
  try {
    var data = Object.assign({}, game, { version: SAVE_VERSION, lastSavedAt: nowISO() });
    json = JSON.stringify(data);
  } catch (e) {
    return { ok: false, error: e }; // 直列化自体の失敗（循環参照など）
  }
  try {
    localStorage.setItem(SAVE_KEY, json);
  } catch (e) {
    return { ok: false, error: e }; // 保存領域不足・書き込み不可
  }
  // 本体が書けたら、最後に成功した状態として控えへ複製する（ベストエフォート）。
  // 控えへの書き込みが失敗しても、本体は保存できているので成功扱い。
  try { localStorage.setItem(SAVE_KEY_BAK, json); } catch (e) {}
  return { ok: true };
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  try { localStorage.removeItem(SAVE_KEY_BAK); } catch (e) {}
}

// ── Game Logic ─────────────────────────────────────────────────────────────

function initMaterials() {
  return { ash: 0, paper: 0, drop: 0, wax: 0, stamp: 0, meaningPiece: 0, blackTag: 0, unfinishedSeed: 0 };
}

function initTinyfolk() {
  return {
    lightkeeper: false,
    paperCollector: false,
    waterCarrier: false,
    envelopeKeeper: false,
    recordApprentice: false,
  };
}

function safeMat(m) {
  if (!m) return initMaterials();
  return {
    ash:           (m.ash           || 0),
    paper:         (m.paper         || 0),
    drop:          (m.drop          || 0),
    wax:           (m.wax           || 0),
    stamp:         (m.stamp         || 0),
    meaningPiece:  (m.meaningPiece  || 0),
    blackTag:      (m.blackTag      || 0),
    unfinishedSeed:(m.unfinishedSeed|| 0),
  };
}

function initGame() {
  return {
    version: SAVE_VERSION,
    createdAt: nowISO(),
    lastSavedAt: nowISO(),
    fires: [],
    toyman: { location: 'starting_room', state: 'waiting' },
    unlocks: {
      recordTower: false,
      tearsSpring: false,
      postOffice: false,
      inspectionBureau: false,
      lightMarket: false,
    },
    battleCount: 0,
    toka: 0,
    materials: initMaterials(),
    tinyfolk: initTinyfolk(),
    gardenItems: [],
    gardenItemCounts: {},
    lastVisualEvent: null,
    lastAutoAt: nowISO(),
    lastSeenAt: nowISO(),
    introSeen: { kotae: false, kana: false, utsuro: false, auditor: false },
    seenWorldIntro: false,
    unlockedPlaces: [],
    seenEncounters: [],
    worldNotes: [],
    relationshipNotes: [],
    careLogs: [],
    characterMemory: {},
    selectedFireId: null,
    activeEncounter: null,
    workerTasks: {
      lightkeeper: { id: 'lightkeeper', label: '灯守り', work: '守る', progress: 0, duration: 100, trace: 'small_stone', isUnlocked: true },
    },
  };
}

function initUnreceived(metrics) {
  var m = metrics || {};
  return {
    meaning:      Math.max(0, 100 - (m.meaning      !== undefined ? m.meaning      : 50)),
    value:        Math.max(0, 100 - (m.value        !== undefined ? m.value        : 50)),
    satisfaction: Math.max(0, 100 - (m.satisfaction !== undefined ? m.satisfaction : 50)),
  };
}

function createFire(kindle, pain, writeState, feeling, metrics) {
  var met = metrics || { meaning: 50, value: 50, satisfaction: 50 };
  // _wishUnknown は FireInputForm から渡される内部フラグ。metrics には含めない。
  var wishUnknown = !!(met._wishUnknown);
  var cleanMet = { meaning: met.meaning, value: met.value, satisfaction: met.satisfaction };
  return {
    id: 'f' + Date.now() + Math.floor(rnd() * 1000),
    kindle: kindle.trim(),
    pain: (pain || '').trim(),
    writeState: writeState || '',
    feeling: feeling || '',
    wishUnknown: wishUnknown,
    metrics: cleanMet,
    status: 'lit',
    questionProgress: 0,
    gardenProgress: 0,
    question: null,
    answer: null,
    answers: [],
    battleCount: 0,
    watchCount: 0,
    restCount: 0,
    shadowVoiceIdx: 0,
    discoverySeen: false,
    logs: [],
    restLogs: [],
    unreceived: initUnreceived(met),
    unreceivedLogs: [],
    reexploreCounts: { meaning: 0, value: 0, satisfaction: 0 },
    activeFocus: null,
    reexploredAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    heldNote: null,
    lastRestAt: null,
    lastUnreceivedRestAt: null,
    receipt: null,
    receiptDraft: null,
    openedPlace: null,
    placeTrace: null,
  };
}

// 旧セーブの fire に新フィールドを補完する
// 1つの火の欠損フィールドを補完する（バージョン移行ではなく正規化）。
function normalizeFire(f) {
  if (!f || typeof f !== 'object') return createFire('', '', '', '', null);
  if (f.questionProgress === undefined) {
    f.questionProgress = f.progress || 0;
  }
  if (f.gardenProgress === undefined) {
    f.gardenProgress = Math.min(50, f.questionProgress);
  }
  // 情景ログは最新 LOG_CAP_FIRE 件まで（古い save の肥大も load 時にここで healing する）。
  f.logs = capLog(f.logs || [], LOG_CAP_FIRE);
  f.restLogs = capLog(f.restLogs || [], LOG_CAP_FIRE);
  if (f.watchCount === undefined) f.watchCount = 0;
  if (f.restCount === undefined) f.restCount = 0;
  // 発見シーンを見たか。旧 save で既に受領段階以降の火は「見た」とみなし、
  // まだ found のままの火は未見（= 復帰時に一度だけ発見シーンを見せる）。
  if (f.discoverySeen === undefined) {
    f.discoverySeen = (f.status === 'receiving' || f.status === 'received' ||
                       f.status === 'returned' || f.status === 'held');
  }
  if (!f.unreceived) f.unreceived = initUnreceived(f.metrics);
  if (!f.unreceivedLogs) f.unreceivedLogs = [];
  if (!f.reexploreCounts) f.reexploreCounts = { meaning: 0, value: 0, satisfaction: 0 };
  if (f.activeFocus === undefined) f.activeFocus = null;
  if (f.reexploredAt === undefined) f.reexploredAt = null;
  if (f.lastRestAt === undefined) f.lastRestAt = null;
  if (f.lastUnreceivedRestAt === undefined) f.lastUnreceivedRestAt = null;
  if (f.receipt === undefined) f.receipt = null;
  if (f.receiptDraft === undefined) f.receiptDraft = null;
  if (f.openedPlace === undefined) f.openedPlace = null;
  if (f.placeTrace === undefined) f.placeTrace = null;
  if (f.finalReturn === undefined) f.finalReturn = null;
  if (f.finalReturnAttemptedAt === undefined) f.finalReturnAttemptedAt = null;
  if (f.returnHoldLog === undefined) f.returnHoldLog = [];
  if (f.heatTraces === undefined) f.heatTraces = [];
  if (!Array.isArray(f.characterResponses)) f.characterResponses = [];
  if (f.wishUnknown === undefined) f.wishUnknown = false;
  if (!Array.isArray(f.questionRevisions)) f.questionRevisions = [];
  if (!Array.isArray(f.careLogs)) f.careLogs = [];
  if (f.returnLamp === undefined) f.returnLamp = null;
  // 旧セーブで既に returned だが返却灯が無い火に、最小限の灯りを補完する。
  if (f.status === 'returned' && !f.returnLamp) {
    f.returnLamp = {
      litAt: f.returnedAt || f.updatedAt || nowISO(),
      label: (f.finalReturn && f.finalReturn.choice) || null,
      memo: (f.finalReturn && f.finalReturn.memo) || '',
      placeTrace: f.placeTrace ? f.placeTrace.traceText : null,
      heatTraces: (f.heatTraces || []).map(function(h) { return h.traceText; }),
    };
  }
  // receiving → found 回復（旅途中にアプリが終了した場合）
  if (f.status === 'receiving') { f.status = 'found'; f.receiptDraft = null; }
  // 既存の received fire に receipt を補完
  if (!f.receipt && f.status === 'received' && f.question) {
    f.receipt = {
      id: 'r' + f.id,
      fireId: f.id,
      title: f.kindle ? f.kindle.slice(0, 20) : '',
      question: f.question,
      emberText: f.kindle || '',
      issuedAt: f.receivedAt || f.updatedAt || nowISO(),
      broughtBy: 'toyman',
      recordedBy: 'kotae',
      status: 'pending',
    };
  }
  return f;
}

// ── バージョン移行 ────────────────────────────────────────────────────────────
// migrateGame: 古い save version を、現在の SAVE_VERSION の構造へ段階的に変換する。
//   各 step は「version N → N+1」の構造変換だけを担当する（フィールド名変更・統合・分割など）。
//   欠損フィールドの補完は normalizeGame の責務。ここでは作り替えのみ行う。
//   ここを必ず通すことで、SAVE_VERSION を上げても既存の火は決して捨てられない。
var SAVE_MIGRATIONS = {
  // 0 → 1: version フィールドが無かった最初期の save。
  //   v1 と構造はほぼ同じなので作り替えるものは無い（欠損は normalize が補う）。
  0: function(g) { return g; },
  // 1 → 2: 将来 SAVE_VERSION を 2 に上げる時、ここに 1→2 の構造変換を書く。
  //   例) 1: function(g) { g.newField = g.oldField; delete g.oldField; return g; },
};

function migrateGame(g) {
  if (!g || typeof g !== 'object' || Array.isArray(g)) return g;
  // version が無い古いデータは 0 とみなす（捨てずに 0→…→現行へ上げる）。
  var v = (typeof g.version === 'number' && g.version >= 0) ? g.version : 0;
  var guard = 0;
  while (v < SAVE_VERSION && guard++ < 1000) {
    var step = SAVE_MIGRATIONS[v];
    if (typeof step === 'function') {
      var next = step(g);
      if (next) g = next;
    }
    v += 1;
  }
  g.version = SAVE_VERSION;
  return g;
}

// ── 正規化（欠損フィールド補完） ──────────────────────────────────────────────
// normalizeGame: 現在の構造に対して、欠けているフィールドを既定値で補う。
//   バージョンに依存しない。壊れた save・古い save でも App が起動できる形に整える。
function normalizeGame(g) {
  if (!g || typeof g !== 'object') return initGame();
  // 旧セーブ・破損セーブに備えてトップレベルを先に補完する
  if (!g.unlocks || typeof g.unlocks !== 'object') g.unlocks = {};
  if (!g.toyman || typeof g.toyman !== 'object') g.toyman = { location: 'starting_room', state: 'waiting' };
  if (!Array.isArray(g.fires)) g.fires = [];
  if (!g.materials) g.materials = initMaterials();
  else g.materials = safeMat(g.materials);
  if (!g.tinyfolk) g.tinyfolk = initTinyfolk();
  if (!g.gardenItems) g.gardenItems = [];
  if (!Array.isArray(g.gardenItems)) g.gardenItems = [];
  if (!g.gardenItemCounts || typeof g.gardenItemCounts !== 'object') {
    // 旧セーブは既存アイテムを各1個として数え直す
    g.gardenItemCounts = {};
    g.gardenItems.forEach(function(it) { g.gardenItemCounts[it] = 1; });
  }
  if (!g.workerTasks || typeof g.workerTasks !== 'object') g.workerTasks = {};
  if (!('lastVisualEvent' in g)) g.lastVisualEvent = null;
  if (!g.unlocks.tearsSpring) g.unlocks.tearsSpring = false;
  if (!g.unlocks.postOffice) g.unlocks.postOffice = false;
  if (!g.unlocks.inspectionBureau) g.unlocks.inspectionBureau = false;
  if (!g.unlocks.lightMarket) g.unlocks.lightMarket = false;
  if (!g.lastAutoAt) g.lastAutoAt = nowISO();
  if (!g.lastSeenAt) g.lastSeenAt = nowISO();
  if (!('lastAwayShownAt' in g)) g.lastAwayShownAt = null;
  if (!Array.isArray(g.unlockedPlaces)) g.unlockedPlaces = [];
  if (!g.introSeen) g.introSeen = { kotae: false, kana: false, utsuro: false, auditor: false };
  if (!('seenWorldIntro' in g)) g.seenWorldIntro = false;
  if (!Array.isArray(g.seenEncounters)) g.seenEncounters = [];
  if (!Array.isArray(g.worldNotes)) g.worldNotes = [];
  if (!Array.isArray(g.relationshipNotes)) g.relationshipNotes = [];
  if (!Array.isArray(g.careLogs)) g.careLogs = [];
  if (!('selectedFireId' in g)) g.selectedFireId = null;
  if (!g.characterMemory || typeof g.characterMemory !== 'object') g.characterMemory = {};
  if (!('activeEncounter' in g)) g.activeEncounter = null;
  if (!g.toka) g.toka = 0;
  g.fires = (Array.isArray(g.fires) ? g.fires : []).map(normalizeFire);
  // 将来 game.logs を持つ場合の保険（無ければ何もしない）。預けた火の記録は触らない。
  if (Array.isArray(g.logs)) g.logs = capLog(g.logs, LOG_CAP_GAME);
  // 既存の灯守り状態を推測
  if (!g.tinyfolk.lightkeeper && g.fires.length > 0) {
    g.tinyfolk.lightkeeper = true;
  }
  // workerTasks 補完
  if (!g.workerTasks) g.workerTasks = {};
  if (!g.workerTasks.lightkeeper) {
    g.workerTasks.lightkeeper = { id: 'lightkeeper', label: '灯守り', work: '守る', progress: 0, duration: 100, trace: 'small_stone', isUnlocked: true };
  }
  return g;
}

function getShadowVoice(fire) {
  if (fire.battleCount >= 4) {
    return SHADOW_SOFTENED[fire.shadowVoiceIdx % SHADOW_SOFTENED.length];
  }
  var wsVoices = SHADOW_BY_WS[fire.writeState] || [];
  var fVoices = SHADOW_BY_FEELING[fire.feeling] || [];
  var pool = wsVoices.concat(fVoices);
  if (pool.length === 0) return '今、あなたはどんな気持ち？';
  return pool[fire.shadowVoiceIdx % pool.length];
}

function makeQuestion(fire) {
  var gen = pick(QUESTION_POOL);
  return gen(fire.writeState || '創作', fire.feeling || '');
}

function addLog(fire, text) {
  fire.logs = capLog((fire.logs || []).concat([{ text: text, at: nowISO() }]), LOG_CAP_FIRE);
}

function addGardenItem(game, item) {
  if (!game.gardenItems) game.gardenItems = [];
  if (!game.gardenItems.includes(item)) {
    game.gardenItems = game.gardenItems.concat([item]);
  }
  // gardenItems = 「存在するか」 / gardenItemCounts = 「積み重なったか」
  if (!game.gardenItemCounts) game.gardenItemCounts = {};
  game.gardenItemCounts[item] = (game.gardenItemCounts[item] || 0) + 1;
}

var BATTLE_LOGS = [
  '影の声が、少しだけ形を持った。',
  'トイマンは、火の奥を見た。',
  '焦げた紙片に、まだ読めない言葉が残っていた。',
  'トイマンは、焦げた紙片を見つけた。',
  '影の声が、少しだけ薄くなった。',
  '森の奥で、言葉の欠片が揺れた。',
  '影は、問いを繰り返した。',
  '言葉の残り香が、ここにある。',
];

var WATCH_LOGS = [
  'トイマンは、火のそばに座っていた。',
  '火はまだ消えていない。',
  '森の入口に、小さな灯りが増えた。',
  'トイマンは、ただ火を見ていた。',
  '静かに、待つことにした。',
  '灯守りが、小さな石を置いた。',
];

var REST_LOGS = [
  '今日は、ここまで。',
  'トイマンは火のそばに座った。',
  '「消えないなら、それでいい」',
  '火はまだ消えていない。',
];

var AUTO_LOGS = [
  '火はまだ消えていない。',
  'トイマンは、火のそばに座っている。',
  '答えは出ていない。でも、火はここにある。',
  '森の奥で、小さな灯りが揺れた。',
  '灯守りが、火を確かめた。',
  '火の周りに、小さな石が積まれている。',
];

var REEXPLORE_MEANING_LOGS = [
  'トイマンは、意味になりかけた紙片を拾った。「答えではない。でも、向きはある」',
  '影が残したものの中に、まだ形を持とうとしている欠片があった。',
  '言葉の向きだけが、かすかに残っていた。',
  '意味の問いかけが、少し薄くなった。',
];

var REEXPLORE_VALUE_LOGS = [
  '黒い札が落ちていた。トイマンは、それを判決ではなく、ただの札として拾った。',
  '裁判官の徴収跡が、まだ火の端に残っていた。剥がせた。',
  '価値の刻印が、少し薄れた。',
  '「値段ではない」とトイマンは言った。',
];

var LIGHT_MARKET_ITEMS = [
  {
    key: 'stone_circle',
    name: '石の輪',
    desc: '小さな石を輪に並べると、火が落ち着く。灯守りに頼んで作ってもらえる。',
    cost: { toka: 2, ash: 1 },
    gardenItem: 'stone_circle',
  },
  {
    key: 'lamp_stand',
    name: '灯火台',
    desc: '火の安定が、少し長続きするようになる。自動進行 +1。',
    cost: { toka: 3, ash: 2 },
    gardenItem: 'lamp_stand',
  },
  {
    key: 'paper_box',
    name: '焦げ紙箱',
    desc: '紙片を収める箱。ここに来たとき、より多くの記録が見える。',
    cost: { toka: 2, paper: 1 },
    gardenItem: 'paper_box',
  },
];

var REEXPLORE_SATISFACTION_LOGS = [
  '灰の中に、まだ熱い種が残っていた。「終わりではない。残りだ」',
  '未完の欲が、ここにある。',
  'トイマンは、手応えの小片を拾い上げた。',
  '満たされなかった輪郭が、少しだけ形をなした。',
];

// クールダウン残り秒数（0なら解除済み）
function cooldownRemaining(lastAt, seconds) {
  if (!lastAt) return 0;
  var elapsed = (Date.now() - new Date(lastAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(seconds - elapsed));
}

// エンカウント台本
var ENCOUNTER_DEFS = {
  kotae_first_receive: {
    place: '記録塔の入口',
    character: 'コタエ',
    characterColor: '#a78bfa',
    lines: [
      'ノコリビ、受領しました。',
      'これは答えではありません。\n問いの欠片です。',
      '意味の影、価値の黒札、納得の灰。\nまだ受け取れていないものがあります。',
      'ここに記録します。\n消えることはありません。',
    ],
    worldNote: '記録塔は、受け取られた問いを保管する場所だ。コタエがひとりで守っている。',
    relationshipNote: { characterId: 'kotae', text: '記録塔で初めて会った。静かで、でも確かにいた。' },
    button: '余熱に会い直す',
    nav: 'garden_unreceived',
  },
  kana_first_rest: {
    place: '涙の泉のそば',
    character: 'かな',
    characterColor: '#60a5fa',
    lines: [
      '休んでよかった。',
      '受け取れないまま置いておくのは、\n弱さじゃない。',
      '涙の泉は、ここにあるよ。\n来ても、来なくてもいい。',
    ],
    worldNote: '涙の泉は、火の近くにある。受け取れないものを、ただ置いておく場所。',
    relationshipNote: { characterId: 'kana', text: 'かなは泉のそばにいた。押しつけない。ただそこにいた。' },
    button: '閉じる',
    nav: null,
  },
  auditor_first_value: {
    place: '黒札置き場',
    character: '審査官',
    characterColor: '#f87171',
    lines: [
      '……また来たか。',
      '黒札は、判決ではない。\nわたしが貼ったものだ。',
      '剥がせるものもある。\nそれだけだ。',
    ],
    worldNote: '黒札置き場には、審査官がいる。価値の判定をしていた存在。でも今は、剥がしも手伝っている。',
    relationshipNote: { characterId: 'auditor', text: '審査官と初めて会った。怖いというより、疲れているようだった。' },
    button: '閉じる',
    nav: null,
  },
  utsuro_first_return: {
    place: '棚の奥',
    character: 'うつろ',
    characterColor: '#9ca3af',
    lines: [
      '……。',
      '火が、返ってきた。',
      '消えたのではない。\nここに残る。',
      '空洞は、欠けているのではない。\n入れる場所だ。',
    ],
    worldNote: '棚の奥に、うつろがいる。言葉は少ないが、いつもそこにいる。',
    relationshipNote: { characterId: 'utsuro', text: 'うつろは、棚の奥で静かに待っていた。火が戻るのを知っていたようだった。' },
    button: '閉じる',
    nav: null,
  },
};

// エンカウントを発火する（未見なら activeEncounter にセット、worldNotes/relationshipNotes を追記）
function triggerEncounter(game, encounterId, opts) {
  if (!game || !encounterId) return game;
  if ((game.seenEncounters || []).includes(encounterId)) return game;
  var ns = cloneS(game);
  ns.seenEncounters = (ns.seenEncounters || []).concat([encounterId]);
  ns.activeEncounter = { encounterId: encounterId, fireId: (opts && opts.fireId) || null };
  var def = ENCOUNTER_DEFS[encounterId];
  if (def) {
    if (def.worldNote) {
      ns.worldNotes = (ns.worldNotes || []).concat([{ id: encounterId, text: def.worldNote, at: nowISO() }]);
    }
    if (def.relationshipNote) {
      ns.relationshipNotes = (ns.relationshipNotes || []).concat([
        Object.assign({}, def.relationshipNote, { id: encounterId, at: nowISO() }),
      ]);
    }
  }
  return ns;
}

function dismissEncounter(game) {
  var ns = cloneS(game);
  ns.activeEncounter = null;
  return ns;
}

// 受領証発行儀式の完了時に worldNotes / relationshipNotes を保存する（重複防止）。
// kotae_first_receive をマーカーとして使う（EncounterDialog は発火しない）。
function saveReceiptNotes(game) {
  if ((game.seenEncounters || []).includes('kotae_first_receive')) return game;
  var ns = cloneS(game);
  ns.seenEncounters = (ns.seenEncounters || []).concat(['kotae_first_receive']);
  ns.worldNotes = (ns.worldNotes || []).concat([{
    id: 'receipt_ceremony',
    text: '記録塔：トイマンが持ち帰った問いの欠片を、受領証として保存する場所。',
    at: nowISO(),
  }]);
  ns.relationshipNotes = (ns.relationshipNotes || []).concat([{
    id: 'receipt_ceremony',
    characterId: 'toyman_kotae',
    text: 'トイマンは問いの欠片を持ち帰る。コタエは、それを消えない形で記録する。',
    at: nowISO(),
  }]);
  return ns;
}

var AUTO_VISUAL_EVENTS = [
  {
    type: 'auto', work: '守る', actor: 'lightkeeper', trace: null,
    message: '灯守りが、火のそばで石を確かめた。\n火はまだある。',
  },
  {
    type: 'auto', work: '拾う', actor: 'paperCollector', trace: null,
    message: '紙集めが、焦げた紙片を拾った。\nまだ読めない。でも捨てられなかった。',
  },
  {
    type: 'auto', work: '置く', actor: 'waterCarrier', trace: 'water_drop',
    message: '水汲みが、小さな水滴を置いた。\n今日は、火を急がせなかった。',
  },
];

function makeVisualEvent(opts) {
  return {
    id: 'event_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    fireId: opts.fireId || null,
    source: opts.source || 'manual',
    type: opts.type,
    work: opts.work,
    actor: opts.actor,
    trace: opts.trace || null,
    message: opts.message,
    at: nowISO(),
  };
}

function shouldSkipAutoVisualEvent(game) {
  if (!game.lastVisualEvent) return false;
  if (game.lastVisualEvent.source !== 'manual') return false;
  var elapsed = Date.now() - new Date(game.lastVisualEvent.at).getTime();
  return elapsed < 30000;
}

function unreceivedStage(pct) {
  if (pct >= 70) return '濃い影';
  if (pct >= 40) return '薄い影';
  if (pct >= 15) return '残り火';
  return '静かな痕跡';
}

// 段階を跨いだ時の節目メッセージ（薄くなる方向のみ）。type × 到達段階。
var STAGE_CHANGE_MESSAGES = {
  meaning: {
    '薄い影': '意味の影が、薄い影になった。\n森の奥に、細い道が見えた。',
    '残り火': '意味は、もう影ではなく、残り火のように静かになった。',
    '静かな痕跡': '意味の影は、静かな痕跡になった。',
  },
  value: {
    '薄い影': '黒札の重さが、少しだけ軽くなった。',
    '残り火': '価値の黒札は、もう判決ではなく、ただの札になった。',
    '静かな痕跡': '黒い札は、静かな痕跡になった。',
  },
  satisfaction: {
    '薄い影': '灰の中に、かすかな熱が残っているのが見えた。',
    '残り火': '納得の灰の中に、未完の種が見えた。',
    '静かな痕跡': '灰は、静かな痕跡になった。',
  },
};

var UNRECEIVED_TYPE_LABELS = { meaning: '意味の影', value: '価値の黒札', satisfaction: '納得の灰' };

// 未受領3領域がすべて静かな痕跡（14%以下）になっているか
function isAllSettled(fire) {
  var ur = fire.unreceived || { meaning: 0, value: 0, satisfaction: 0 };
  return (ur.meaning <= 14) && (ur.value <= 14) && (ur.satisfaction <= 14);
}

// 段階が濃いほど大きく減らす（節目が出やすく、手応えが出る）。
function reexploreGain(pct) {
  if (pct >= 70) return 12 + Math.floor(rnd() * 7); // 濃い影: 12〜18
  if (pct >= 40) return 8 + Math.floor(rnd() * 5);  // 薄い影: 8〜12
  return 5 + Math.floor(rnd() * 4);                 // 残り火: 5〜8
}

var REEXPLORE_CFG = {
  meaning: {
    item: 'meaning_fragment', logs: 'REEXPLORE_MEANING_LOGS',
    ve: { work: '拾う', actor: 'toyman', trace: 'meaning_fragment', message: '答えではない。\nでも、向きはある。' },
    title: '意味の影を追った',
    gains: [{ label: '意味片', amount: 1 }, { label: '紙片', amount: 1 }],
    baseTrace: '意味になりかけた光が、塔の方へ流れた。',
  },
  value: {
    item: 'black_tag', logs: 'REEXPLORE_VALUE_LOGS',
    ve: { work: '剥がす', actor: 'toyman', trace: 'black_tag', message: '黒い札が落ちていた。\nトイマンは、それを判決ではなく\nただの札として拾った。' },
    title: '価値の黒札を拾った',
    gains: [{ label: '黒札片', amount: 1 }],
    baseTrace: '黒い札が、火から剥がされた。',
  },
  satisfaction: {
    item: 'small_seed', logs: 'REEXPLORE_SATISFACTION_LOGS',
    ve: { work: '育てる', actor: 'toyman', trace: 'small_seed', message: '灰の中に、まだ熱い種が残っていた。\n終わりではない。\n残りだった。' },
    title: '納得の灰を探した',
    gains: [{ label: '灰片', amount: 1 }, { label: '未完の種', amount: 1 }],
    baseTrace: '灰の中から、未完の種が見つかった。',
  },
};

// 【互換用・UIから直接は呼ばれない】旧・余熱の再探索（数値を減らして素材を得る方式）。
// 本筋は revisitHeat（会い直し儀式）に移行済み。古いセーブ／将来の参照のため残置。
function reexploreFire(game, fireId, type) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'received') return { ok: false, game: game };
  var cfg = REEXPLORE_CFG[type];
  if (!cfg) return { ok: false, game: game };
  ns.materials = safeMat(ns.materials);

  // 変化量を捕捉
  var before = fire.unreceived[type] || 0;
  var after = Math.max(0, before - reexploreGain(before));
  fire.unreceived[type] = after;
  fire.reexploreCounts[type] = (fire.reexploreCounts[type] || 0) + 1;
  // 余熱に会い直すのは報酬行為ではない。残るのは灯貨ではなく、剥がした札・拾った片の痕跡。

  if (type === 'meaning') { ns.materials.meaningPiece += 1; ns.materials.paper += 1; }
  else if (type === 'value') { ns.materials.blackTag += 1; }
  else { ns.materials.ash += 1; ns.materials.unfinishedSeed += 1; }
  addGardenItem(ns, cfg.item);

  var logText = pick({ REEXPLORE_MEANING_LOGS: REEXPLORE_MEANING_LOGS, REEXPLORE_VALUE_LOGS: REEXPLORE_VALUE_LOGS, REEXPLORE_SATISFACTION_LOGS: REEXPLORE_SATISFACTION_LOGS }[cfg.logs]);
  fire.unreceivedLogs = [{ text: logText, at: nowISO() }].concat((fire.unreceivedLogs || []).slice(0, 9));
  fire.reexploredAt = nowISO();
  fire.updatedAt = nowISO();

  var beforeStage = unreceivedStage(before);
  var afterStage = unreceivedStage(after);
  var stageChanged = beforeStage !== afterStage;

  var ve = makeVisualEvent({ fireId: fireId, source: 'manual', type: type,
    work: cfg.ve.work, actor: cfg.ve.actor, trace: cfg.ve.trace, message: cfg.ve.message });
  ns.lastVisualEvent = ve;

  var traces = [cfg.baseTrace];
  if (stageChanged && STAGE_CHANGE_MESSAGES[type] && STAGE_CHANGE_MESSAGES[type][afterStage]) {
    traces = [STAGE_CHANGE_MESSAGES[type][afterStage]].concat(traces);
  }

  var actionResult = makeActionResult({
    title: cfg.title, context: 'unreceived', fireId: fireId,
    gains: cfg.gains, traces: traces,
    progress: {
      label: UNRECEIVED_TYPE_LABELS[type],
      before: before, after: after, delta: before - after,
      beforeStage: beforeStage, afterStage: afterStage, stageChanged: stageChanged,
    },
  });
  // 審査官エンカウント: 価値の黒札が初めて「静かな痕跡」に達した時
  if (type === 'value' && afterStage === '静かな痕跡') {
    if (hasSeenPlaceEncounter(ns, 'black_tags')) {
      ns = triggerEncounter(ns, 'auditor_first_value', { fireId: fireId });
    }
  }

  return { ok: true, game: ns, visualEvent: ve, actionResult: actionResult };
}

// 余熱への会い直し。数値を主役にせず、触れ方と選択で変化量を決める。
// touchMode: '少しだけ触れる' | '正面から見る' | '今日はそばに置く'
var HEAT_TRACE_LABELS = {
  meaning: '問い札',
  value: '本文から離した黒札',
  satisfaction: '棚に置いた灰',
};

var HEAT_TYPE_LABELS = { meaning: '意味の影', value: '価値の黒札', satisfaction: '納得の灰' };
var HEAT_TRACE_CAP = 10;

function revisitHeat(game, fireId, heatType, touchMode, selected) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'received') return { ok: false, game: game };
  if (!fire.unreceived) fire.unreceived = { meaning: 0, value: 0, satisfaction: 0 };

  var before = fire.unreceived[heatType] || 0;
  var base = reexploreGain(before);
  var reduction = 0;
  if (touchMode === '少しだけ触れる') reduction = base;
  else if (touchMode === '正面から見る') reduction = Math.min(base * 2, before);
  // 今日はそばに置く: reduction = 0。余熱は減らさず、急がなかったことだけを記録する。

  var after = Math.max(0, before - reduction);
  fire.unreceived[heatType] = after;

  // 「今日はそばに置く」は会い直しではなく、急がなかった日の記録。
  // 余熱を「何として置き直すか」は決めない。残したのは「進めなかった」という痕跡そのもの。
  var sparedToday = (touchMode === '今日はそばに置く');
  var traceText = sparedToday
    ? ('急がなかった余熱：' + (HEAT_TYPE_LABELS[heatType] || heatType))
    : ((HEAT_TRACE_LABELS[heatType] || heatType) + '：' + selected);

  if (!Array.isArray(fire.heatTraces)) fire.heatTraces = [];
  // 記録塔をログ倉庫にしないため、痕跡は上限を設ける（古いものから落とす）。
  fire.heatTraces = fire.heatTraces.concat([{
    type: heatType, touchMode: touchMode, selected: sparedToday ? null : selected,
    spared: sparedToday, traceText: traceText, createdAt: Date.now(),
  }]).slice(-HEAT_TRACE_CAP);

  fire.logs = [{ text: traceText, at: nowISO() }].concat(fire.logs || []).slice(0, LOG_CAP_FIRE);
  fire.updatedAt = nowISO();

  // 余熱の種類に対応するキャラに、会い直した痕跡を覚えさせる（meaning は誰にも紐づけない）。
  rememberCharacter(ns, HEAT_CHARACTER[heatType], traceText, fireId);
  // 選んだ言葉を受け取る一言を残す。meaning はコタエが受け取る。急がなかった日（selected無し）は出さない。
  if (!sparedToday && selected) {
    var respChar = HEAT_CHARACTER[heatType] || (heatType === 'meaning' ? 'kotae' : null);
    recordCharacterResponse(ns, fire, respChar, 'heatRevisit', selected);
  }

  // 審査官エンカウント: 価値が静かな痕跡に達した時
  var beforeStage = unreceivedStage(before);
  var afterStage = unreceivedStage(after);
  if (heatType === 'value' && afterStage === '静かな痕跡' && beforeStage !== '静かな痕跡') {
    if (hasSeenPlaceEncounter(ns, 'black_tags')) {
      ns = triggerEncounter(ns, 'auditor_first_value', { fireId: fireId });
    }
  }

  return { ok: true, game: ns };
}

// 【封印・通常UIから呼ばれない】旧・灯置き場の購入処理（素材＋灯貨で灯りを買う）。
// 「火を灯貨で測らない／感情を素材化して消費しない」思想に反するため Turn 19A で封印。
// 灯置き場の本実装（灯貨で静かに灯りを置く儀式）は別途作り直す。コードは残置。
function buyMarketItem(game, key) {
  var item = LIGHT_MARKET_ITEMS.find(function(i) { return i.key === key; });
  if (!item) return { ok: false, reason: 'not_found', game: game };
  if (game.gardenItems && game.gardenItems.includes(item.gardenItem)) {
    return { ok: false, reason: 'already_owned', game: game };
  }
  var mat = safeMat(game.materials);
  var cost = item.cost;
  if ((cost.toka || 0) > (game.toka || 0)) return { ok: false, reason: 'not_enough', game: game };
  if ((cost.ash || 0) > mat.ash) return { ok: false, reason: 'not_enough', game: game };
  if ((cost.paper || 0) > mat.paper) return { ok: false, reason: 'not_enough', game: game };
  var ns = cloneS(game);
  ns.materials = safeMat(ns.materials);
  ns.toka = (ns.toka || 0) - (cost.toka || 0);
  ns.materials.ash -= (cost.ash || 0);
  ns.materials.paper -= (cost.paper || 0);
  addGardenItem(ns, item.gardenItem);
  if (key === 'stone_circle') {
    var sf = ns.fires.find(function(f) { return f.status === 'searching'; });
    if (sf) sf.gardenProgress = Math.min(100, (sf.gardenProgress || 0) + 5);
  }
  return { ok: true, game: ns };
}

function restUnreceived(game, fireId) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'received') return { ok: false, game: game };
  if (cooldownRemaining(fire.lastUnreceivedRestAt, 30) > 0) return { ok: false, reason: 'cooldown', game: game };
  // 「今日は置いておく」のは報酬行為ではない。素材は増やさない。残るのは水滴の痕跡だけ。
  addGardenItem(ns, 'water_drop');
  fire.logs = (fire.logs || []).concat([{ text: '今日は、ここに置いておく。', at: nowISO() }]);
  fire.lastUnreceivedRestAt = nowISO();
  fire.updatedAt = nowISO();
  var ve = makeVisualEvent({
    fireId: fireId, source: 'manual', type: 'rest',
    work: '休ませる', actor: 'toyman', trace: 'water_drop',
    message: '今日は、ここに置いておく。\n余熱には、まだ会いに行かなかった。\nでも、火は消えなかった。',
  });
  ns.lastVisualEvent = ve;
  var actionResult = makeActionResult({
    title: '今日は置いておいた',
    context: 'unreceived', fireId: fireId,
    traces: ['火は、今日もここに置かれた。', '水滴が、火の近くに置かれた。'],
  });
  return { ok: true, game: ns, visualEvent: ve, actionResult: actionResult };
}

// 未受領3領域がすべて静かな痕跡になった火を、心へ返す（このサイクルの終点）。
// finalReturn: { metrics, memo, choice } — FinalReturnScene から渡される。
function returnFireToHeart(game, fireId, finalReturn) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'received') return { ok: false, game: game };
  if (!isAllSettled(fire)) return { ok: false, reason: 'not_settled', game: game };
  fire.status = 'returned';
  fire.returnedAt = nowISO();
  fire.updatedAt = nowISO();
  fire.finalReturn = {
    metrics: finalReturn ? finalReturn.metrics : null,
    memo: finalReturn ? (finalReturn.memo || '') : '',
    choice: finalReturn ? (finalReturn.choice || null) : null,
    placeTrace: fire.placeTrace || null,
    createdAt: nowISO(),
  };
  // 返却灯。返した火は「完了データ」ではなく、記録塔の奥にともる小さな灯り。
  // finalReturn から自動でともる。灯貨は使わない（感情の返却は課金インテリアではない）。
  fire.returnLamp = {
    litAt: nowISO(),
    label: fire.finalReturn.choice,
    memo: fire.finalReturn.memo,
    placeTrace: fire.placeTrace ? fire.placeTrace.traceText : null,
    heatTraces: (fire.heatTraces || []).map(function(h) { return h.traceText; }),
  };
  // 心へ返すのは、このサイクルで最も静かな行為。報酬は出さない。
  // 残るのは灯貨ではなく、箱庭に置かれた返却灯（returned_ember）という痕跡だけ。
  addGardenItem(ns, 'returned_ember');
  var ve = makeVisualEvent({
    fireId: fireId, source: 'manual', type: 'returned',
    work: '還す', actor: 'toyman', trace: 'returned_ember',
    message: '火を、心へ返した。\n問いは記録に残り、火は静かになった。\nこのサイクルは、ここで一区切り。',
  });
  ns.lastVisualEvent = ve;
  var actionResult = makeActionResult({
    title: '火を心へ返した',
    context: 'unreceived', fireId: fireId,
    traces: ['心へ還った火が、箱庭に置かれた。'],
  });
  if (hasSeenPlaceEncounter(ns, 'back_shelf')) {
    ns = triggerEncounter(ns, 'utsuro_first_return', { fireId: fireId });
  }
  return { ok: true, game: ns, visualEvent: ve, actionResult: actionResult };
}

// 「今日はまだ返さない」を選んだ時の保留記録。fire.status は received のまま。
function holdFinalReturn(game, fireId, memo) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire) return { ok: false, game: game };
  fire.finalReturnAttemptedAt = nowISO();
  if (!Array.isArray(fire.returnHoldLog)) fire.returnHoldLog = [];
  fire.returnHoldLog = fire.returnHoldLog.concat([{ at: nowISO(), memo: memo || '' }]);
  return { ok: true, game: ns };
}

// ── 灯貨の不変条件 ───────────────────────────────────────────────────────────
// 灯貨は行動の報酬ではない。火を丁寧に扱ったあとに世界へこぼれる「余光」。
// 「買うためのもの」ではなく「置くための灯り」。
// だから ns.toka を増やしてよいのは、この spillAfterglow ただ一つに集約する。
// 見守り・探索・余熱・休息・心へ返す——どの行為でも灯貨は増やさない。
// （ns.toka を減らすのは灯置き場で灯りを置くとき＝buyMarketItem のみ）
function spillAfterglow(ns, amount) {
  ns.toka = (ns.toka || 0) + (amount || 1);
  return ns;
}

function lightFire(game, kindle, pain, writeState, feeling, metrics) {
  var ns = cloneS(game);
  var fire = createFire(kindle, pain, writeState, feeling, metrics);
  var hasSearching = ns.fires.some(function(f) { return f.status === 'searching'; });
  if (!hasSearching) {
    fire.status = 'searching';
    ns.toyman = { location: 'unexplored_forest', state: 'exploring' };
  }
  ns.fires = [fire].concat(ns.fires);
  // 火に言葉を置くのは報酬行為ではない。灯貨は増やさない。
  // 最初の火で灯守り出現
  if (!ns.tinyfolk.lightkeeper) {
    ns.tinyfolk.lightkeeper = true;
  }
  return { game: ns, fire: fire };
}

function doBattle(game, fireId, answer) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'searching') return { ok: false, game: game };
  var qGain = BATTLE_GAIN_MIN + Math.floor(rnd() * (BATTLE_GAIN_MAX - BATTLE_GAIN_MIN + 1));
  var prevQ = fire.questionProgress || 0;
  fire.questionProgress = Math.min(100, prevQ + qGain);
  fire.gardenProgress = Math.min(100, (fire.gardenProgress || 0) + 5);
  fire.battleCount = (fire.battleCount || 0) + 1;
  fire.shadowVoiceIdx = (fire.shadowVoiceIdx || 0) + 1;
  ns.battleCount = (ns.battleCount || 0) + 1;
  // 影へ進むのは報酬行為ではない。素材は増やさない。残るのは焦げた紙片という痕跡だけ。
  var footprintResp = null;
  if (answer && answer.trim()) {
    fire.answers = (fire.answers || []).concat([{ text: answer.trim(), at: nowISO() }]);
    // 危機語を含む足跡には定型応答を返さない（保留室は ShadowPanel 側が担う）。
    if (!hasDanger(answer)) {
      footprintResp = recordFootprintResponse(ns, fire, answer.trim());
    }
  }
  addLog(fire, pick(BATTLE_LOGS));
  addGardenItem(ns, 'burnt_paper');
  var lkResult = advanceLightkeeper(ns, 5);
  // 紙集めの小人は「数を貯めた報酬」ではなく、紙片の痕跡が初めて森に残った時に姿を見せる。
  if (!ns.tinyfolk.paperCollector && ns.gardenItems && ns.gardenItems.includes('burnt_paper')) {
    ns.tinyfolk.paperCollector = true;
  }
  if (fire.questionProgress >= 100) {
    fire.status = 'found';
    fire.question = makeQuestion(fire);
    fire.foundAt = nowISO();
    ns.toyman = { location: 'starting_room', state: 'returning' };
  }
  fire.updatedAt = nowISO();
  var ve = makeVisualEvent({
    fireId: fireId, source: 'manual', type: 'battle',
    work: '拾う', actor: 'toyman', trace: 'burnt_paper',
    message: '影の奥から、焦げた紙片が落ちた。\n答えではない。\nでも、問いの材料だった。',
  });
  ns.lastVisualEvent = ve;
  var placedFootprint = !!(answer && answer.trim());
  var actionResult = makeActionResult({
    title: '影と向き合った',
    traces: placedFootprint
      ? ['問いの足跡を置きました。', '火が、少しだけ奥を見せました。']
      : ['焦げた紙片が、森に残った。'],
  });
  // 足跡への住人の応答を結果に添える（ShadowPanel 完了表示で見せる）。
  if (footprintResp) {
    actionResult.response = { who: footprintResp.who, color: footprintResp.color, lines: footprintResp.lines };
  }
  appendLightkeeperResult(actionResult, lkResult);
  if (fire.status === 'found') {
    actionResult.traces.push('トイマンが、問いの欠片を見つけた。');
  }
  var milestone = null;
  for (var mi = 0; mi < SHADOW_MILESTONES.length; mi++) {
    var ms = SHADOW_MILESTONES[mi];
    if (prevQ < ms.threshold && fire.questionProgress >= ms.threshold) { milestone = ms; break; }
  }
  return { ok: true, game: ns, fire: fire, visualEvent: ve, actionResult: actionResult, milestone: milestone };
}

// 自動進行: gardenProgress のみ、questionProgress は触れない、found にしない
function tickProgress(game) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.status === 'searching'; });
  if (!fire) return { changed: false, game: game };
  var autoGain = (ns.gardenItems && ns.gardenItems.includes('lamp_stand')) ? 3 : 2;
  fire.gardenProgress = Math.min(100, (fire.gardenProgress || 0) + autoGain);
  addLog(fire, pick(AUTO_LOGS));
  ns.lastAutoAt = nowISO();
  ns.lastSeenAt = nowISO(); // 在席を刻む（次回の「留守のあいだ」判定の基準）
  fire.updatedAt = nowISO();
  // 灯守りの自動進行（問いの深度は進めない）。tick は actionResult を出さない。
  var lkTickCompleted = advanceLightkeeper(ns, 5).completed;
  if (!shouldSkipAutoVisualEvent(ns)) {
    var base = lkTickCompleted
      ? { work: '守る', actor: 'lightkeeper', trace: 'small_stone',
          message: '灯守りが、小さな石を置いた。\n問いは進んでいない。\nでも、火は少し落ち着いた。' }
      : pick(AUTO_VISUAL_EVENTS);
    var ve = makeVisualEvent({
      fireId: fire.id, source: 'auto',
      type: 'auto', work: base.work, actor: base.actor,
      trace: base.trace || null, message: base.message,
    });
    ns.lastVisualEvent = ve;
    if (!lkTickCompleted && base.trace === 'water_drop' && ns.tinyfolk && ns.tinyfolk.waterCarrier) {
      addGardenItem(ns, 'water_drop');
    }
  }
  return { changed: true, game: ns };
}

// 小人は素材を集める係ではない。プレイヤーが向き合えない時間に、
// 火のそばに残った痕跡を世話している箱庭の住人。火の居場所ごとに、世話の仕方が変わる。
var CARE_DEFS = {
  forest: {
    place: '未受領の森', actor: '灯守り',
    cares: [
      '灯守りが、火のそばに小さな石を置いていました。',
      '灯守りが、火が消えないように風をよけていました。',
      '灯守りが、火のそばの石を並べ直していました。',
      '灯守りが、ただ火のそばに座っていました。',
    ],
    note: ['問いは、まだ見つかっていません。', 'でも、火は消えていません。'],
    trace: 'small_stone',
  },
  tears: {
    place: '涙の泉', actor: '水汲みの小人',
    cares: [
      '水汲みの小人が、泉の水を少し汲んでいました。',
      '水汲みの小人が、火のそばに水を置いていました。',
      '水汲みの小人が、泉の水面をそっと整えていました。',
    ],
    note: ['痛みはまだ答えになっていません。', 'でも、冷ます場所はあります。'],
    trace: 'water_drop',
  },
  black_tags: {
    place: '黒札置き場', actor: '札分けの小人',
    cares: [
      '札分けの小人が、黒札を入れる箱を整えていました。',
      '札分けの小人が、黒札を一枚ずつ数えていました。',
      '札分けの小人が、本文と札を分ける線を引き直していました。',
    ],
    note: ['判決はまだ外れていません。', 'でも、分ける場所はできています。'],
    trace: null,
  },
  back_shelf: {
    place: '棚の奥', actor: '余白番',
    cares: [
      '余白番が、空いている棚を掃いていました。',
      '余白番が、棚のほこりをそっと払っていました。',
      '余白番が、何も置かれていない場所を見守っていました。',
    ],
    note: ['何もない場所にも、置く準備ができています。'],
    trace: null,
  },
  returned: {
    place: '記録塔の奥', actor: '灯守り',
    cares: [
      '灯守りが、返却灯のそばに座っていました。',
      '灯守りが、返却灯の油をそっと足していました。',
      '灯守りが、返却灯の灯りを見守っていました。',
    ],
    note: ['火は消えていません。', '心へ返されたまま、灯っています。'],
    trace: null,
  },
  received_unvisited: {
    place: '記録塔', actor: 'コタエ',
    cares: [
      'コタエが、受領証の角を整えていました。',
      'コタエが、受領証の裏の地図をそっと撫でていました。',
      'コタエが、開かれるのを待つ地図を見ていました。',
    ],
    note: ['地図は、まだ開かれるのを待っています。'],
    trace: null,
  },
};

// 直近の世話文（lastText）と違う候補を優先して、毎回同じ文にならないようにする。
function pickCareText(def, lastText) {
  var list = def.cares || (def.care ? [def.care] : ['']);
  if (list.length <= 1) return list[0] || '';
  var pool = list.filter(function(t) { return t !== lastText; });
  if (!pool.length) pool = list;
  return pool[Math.floor(rnd() * pool.length)];
}

// 火の居場所から、いま世話している小人と世話の文を選ぶ。
function careDefForFire(fire) {
  if (!fire) return CARE_DEFS.forest;
  if (fire.status === 'returned') return CARE_DEFS.returned;
  if (fire.status === 'received' && fire.openedPlace) {
    // 場所をまだ訪れていない（初回出会い前）なら、受領証のそばでコタエが待つ。
    if (!fire.openedPlace.firstEncounterSeen) return CARE_DEFS.received_unvisited;
    if (CARE_DEFS[fire.openedPlace.id]) return CARE_DEFS[fire.openedPlace.id];
  }
  return CARE_DEFS.forest;
}

var CARE_LOG_CAP = 20;
var RECENT_CARE_CAP = 30;

// 世話の記録を残す。報酬ではなく「居なかった間も、誰かが火のそばに居た」証拠。
// 火ごと（fire.careLogs 上限20）と庭全体（ns.careLogs 上限30）の両方に積む。
function addCareLog(ns, fire, entry) {
  var rec = {
    fireId: (fire && fire.id) || entry.fireId || null,
    actor: entry.actor || '',
    place: entry.place || '',
    text: entry.text || '',
    createdAt: Date.now(),
  };
  if (fire) {
    if (!Array.isArray(fire.careLogs)) fire.careLogs = [];
    fire.careLogs = [rec].concat(fire.careLogs).slice(0, CARE_LOG_CAP);
  }
  if (!Array.isArray(ns.careLogs)) ns.careLogs = [];
  ns.careLogs = [rec].concat(ns.careLogs).slice(0, RECENT_CARE_CAP);
}

// 留守中に世話する火を最大 limit 本選ぶ（手当てが要る順）。庭全体を見る。
// 対象: searching/found/receiving/received/lit/held/returned。draft等の壊れた火は除く。
// 返却済みの火が活動中の火に押し出され続けないよう、返却火が居れば最後の1枠を巡回で確保する
// （世話が最も古い返却火＝最近かまわれていない1本を入れる）。
function lastCareAt(f) {
  return (f.careLogs && f.careLogs.length) ? new Date(f.careLogs[0].createdAt).getTime() : 0;
}
function pickCareFires(game, limit) {
  limit = limit || 3;
  var fires = (game && game.fires) || [];
  var CARE_STATUSES = ['searching', 'found', 'receiving', 'received', 'lit', 'held', 'returned'];
  var valid = fires.filter(function(f) {
    return f && f.id && CARE_STATUSES.indexOf(f.status) !== -1;
  });
  function rank(f) {
    if (f.status === 'searching' || f.status === 'found' || f.status === 'receiving') return 0;
    if (f.status === 'received' && !isAllSettled(f)) return 1;
    if (f.status === 'received' || f.status === 'lit' || f.status === 'held') return 2;
    if (f.status === 'returned') return 3;
    return 4;
  }
  var active = valid.filter(function(f) { return f.status !== 'returned'; });
  var returned = valid.filter(function(f) { return f.status === 'returned'; });
  active.sort(function(a, b) { return rank(a) - rank(b); });
  // 返却火は「最近かまわれていない順」（lastCareAt が古い＝小さい順）で巡回。
  returned.sort(function(a, b) { return lastCareAt(a) - lastCareAt(b); });

  if (!returned.length) return active.slice(0, limit);
  if (!active.length) return returned.slice(0, limit);
  // 活動火が枠を埋め切る場合は、最後の1枠を巡回中の返却火に譲る（押し出され続けない）。
  var activeTake = active.slice(0, Math.max(1, limit - 1));
  var result = activeTake.concat([returned[0]]);
  // まだ枠が余れば、残りを活動火→返却火で埋める。
  if (result.length < limit) {
    active.slice(activeTake.length).forEach(function(f) { if (result.length < limit) result.push(f); });
    returned.slice(1).forEach(function(f) { if (result.length < limit) result.push(f); });
  }
  return result.slice(0, limit);
}

// 後方互換: 1本だけ欲しい既存呼び出し向け。
function pickCareFire(fires) {
  return pickCareFires({ fires: fires }, 1)[0] || null;
}

// 留守のあいだ。前回の滞在から十分に時間が空いて戻ってきた時、
// 「問いは進んでいないが、庭の火たちは世話されていた」を見せる。箱庭放置ゲームの核。
// 放置で進めてよいのは安定と痕跡だけ。問い・灯貨・余熱・素材・受領・返却は決して進めない。
function computeAwayReturn(game, skip) {
  var ns = cloneS(game);
  var report = null;
  if (!skip) {
    var lastSeen = ns.lastSeenAt ? new Date(ns.lastSeenAt).getTime() : 0;
    var elapsedMin = lastSeen ? (Date.now() - lastSeen) / 60000 : 0;
    var cared = pickCareFires(ns, 3);
    if (lastSeen && elapsedMin >= 30 && cared.length) {
      var tier, bump;
      if (elapsedMin < 180) { tier = 'short'; bump = 3; }
      else if (elapsedMin < 1440) { tier = 'mid'; bump = 5; }
      else { tier = 'long'; bump = 8; }

      var cares = [];
      cared.forEach(function(fire) {
        var def = careDefForFire(fire);
        // 安定だけ少し落ち着く（上限 STABILITY_ENOUGH）。返却済みの火はもう進めない。
        if (fire.status !== 'returned') {
          fire.gardenProgress = Math.min(STABILITY_ENOUGH, (fire.gardenProgress || 0) + bump);
          fire.updatedAt = nowISO();
        }
        // 痕跡が定義された世話だけ箱庭に置く（素材は増やさない）。
        if (def.trace) addGardenItem(ns, def.trace);
        // 直近と同じ文が連続しにくいよう、その火の最後の世話文と違う候補を優先。
        var lastText = (fire.careLogs && fire.careLogs.length) ? fire.careLogs[0].text : null;
        var careText = pickCareText(def, lastText);
        addCareLog(ns, fire, { actor: def.actor, place: def.place, text: careText });
        cares.push({ place: def.place, actor: def.actor, care: careText });
      });

      ns.lastAwayShownAt = nowISO();
      report = {
        tier: tier,
        count: cares.length,
        cares: cares,
        // 後方互換フィールド（旧 AwayReport が参照しても落ちないように先頭の世話を残す）。
        place: cares[0].place, actor: cares[0].actor, care: cares[0].care,
        note: ['問いは進んでいません。', 'でも、火は消えていません。'],
      };
    }
  }
  ns.lastSeenAt = nowISO(); // 常に「今この瞬間に居る」を記録する
  return { game: ns, report: report };
}

// 一時通知 actionResult を組み立てる共通関数。
// 4層: gains（増えたもの）/ work（作業途中）/ completions（仕事完了）/ traces（箱庭に残った痕跡）
function makeActionResult(opts) {
  opts = opts || {};
  return {
    title: opts.title || '',
    context: opts.context || null,   // 'unreceived' など。UI がどこに出すか判断する
    fireId: opts.fireId || null,     // どの火の結果か
    gains: opts.gains || [],
    work: opts.work || [],
    completions: opts.completions || [],
    progress: opts.progress || null, // 未受領領域の変化量 {label, before, after, delta, ...}
    traces: opts.traces || [],
    response: opts.response || null, // 住人の一言 {who, color, lines}
    at: nowISO(),
  };
}

// advanceLightkeeper の結果を actionResult に反映する。
// 完了時は completions に積む（message は completions 側でのみ表示し、traces には重複させない）。
function appendLightkeeperResult(actionResult, lkResult) {
  if (!lkResult || !lkResult.advanced) return actionResult;
  if (lkResult.completed && lkResult.completion) {
    actionResult.completions.push(lkResult.completion);
  } else {
    actionResult.work.push('灯守りの仕事が進んだ（' + lkResult.after + '%）。');
  }
  return actionResult;
}

// 灯守りの仕事を進める。進行・完了の詳細をオブジェクトで返す。
function advanceLightkeeper(ns, amount) {
  var lk = ns.workerTasks && ns.workerTasks.lightkeeper;
  if (!lk || !lk.isUnlocked) {
    return { advanced: false, completed: false, before: 0, after: 0, amount: 0, completion: null };
  }
  var before = lk.progress || 0;
  var duration = lk.duration || 100;
  var after = Math.min(duration, before + amount);
  lk.progress = after;
  if (after < duration) {
    return { advanced: true, completed: false, before: before, after: after, amount: amount, completion: null };
  }
  // 完了。灯守りの仕事は守られた痕跡（石）を残すもの。素材も灯貨も増やさない。
  lk.progress = 0;
  addGardenItem(ns, 'small_stone');
  var sf = ns.fires.find(function(f) { return f.status === 'searching'; });
  if (sf) sf.gardenProgress = Math.min(100, (sf.gardenProgress || 0) + 3);
  return {
    advanced: true, completed: true, before: before, after: 0, amount: amount,
    completion: {
      label: '灯守りの仕事完了',
      message: '灯守りが、小さな石を置いた。\n火の安定が、少し増した。',
      trace: 'small_stone',
      gains: [],
    },
  };
}

function watchFire(game, fireId) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'searching') return { ok: false, game: game };
  // 見守りは火を保つだけ。問いの深度は進めない。灯貨も増やさない。
  // 見守りは灯貨稼ぎではなく、守られた痕跡を残す行為。
  fire.gardenProgress = Math.min(100, (fire.gardenProgress || 0) + 8);
  fire.watchCount = (fire.watchCount || 0) + 1;
  // 見守りは素材集めではない。残るのは火のそばの時間だけ。
  addLog(fire, pick(WATCH_LOGS));
  // small_stone は灯守りの仕事完了時のみ置かれる（即時追加しない）
  var lkResult = advanceLightkeeper(ns, 30);
  fire.updatedAt = nowISO();
  var ve = makeVisualEvent({
    fireId: fireId, source: 'manual', type: 'watch',
    work: '守る', actor: 'lightkeeper',
    trace: lkResult.completed ? 'small_stone' : null,
    message: lkResult.completed
      ? '灯守りが、小さな石を置いた。\n問いは進んでいない。\nでも、火は少し落ち着いた。'
      : '灯守りが、火のそばで石を確かめた。\n火はまだある。',
  });
  ns.lastVisualEvent = ve;
  var actionResult = makeActionResult({
    title: 'ただ見守った',
    traces: ['急がなかった時間が、火のそばに残った。'],
  });
  appendLightkeeperResult(actionResult, lkResult);
  return { ok: true, game: ns, visualEvent: ve, actionResult: actionResult };
}

function restToday(game, fireId) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'searching') return { ok: false, game: game };
  if (cooldownRemaining(fire.lastRestAt, 30) > 0) return { ok: false, reason: 'cooldown', game: game };
  // questionProgress は進めない
  fire.gardenProgress = Math.min(100, (fire.gardenProgress || 0) + 5);
  fire.restCount = (fire.restCount || 0) + 1;
  fire.lastRestAt = nowISO();
  var logText = pick(REST_LOGS);
  fire.restLogs = capLog((fire.restLogs || []).concat([{ text: logText, at: nowISO() }]), LOG_CAP_FIRE);
  addLog(fire, logText);
  // 休ませることも灯貨稼ぎ・素材集めではない。火のそばに痕跡だけが残る。
  addGardenItem(ns, 'rest_chair');
  addGardenItem(ns, 'water_drop');
  var lkResult = advanceLightkeeper(ns, 15);
  // 水汲みの小人は回数稼ぎの報酬ではなく、水滴の痕跡が初めて置かれた時に姿を見せる。
  if (!ns.tinyfolk.waterCarrier && ns.gardenItems && ns.gardenItems.includes('water_drop')) {
    ns.tinyfolk.waterCarrier = true;
  }
  // 涙の泉解放条件
  if (!ns.unlocks.tearsSpring && fire.restCount >= 5) {
    ns.unlocks.tearsSpring = true;
  }
  fire.updatedAt = nowISO();
  var ve = makeVisualEvent({
    fireId: fireId, source: 'manual', type: 'rest',
    work: '休ませる', actor: 'toyman', trace: 'rest_chair',
    message: 'トイマンは火のそばに座った。\n今日は、ここまで。\n火は消えなかった。',
  });
  ns.lastVisualEvent = ve;
  var actionResult = makeActionResult({
    title: '今日は無理にしなかった',
    traces: ['火のそばに、小さな椅子が置かれた。', '水滴が、火の近くに置かれた。'],
  });
  appendLightkeeperResult(actionResult, lkResult);
  return { ok: true, game: ns, visualEvent: ve, actionResult: actionResult };
}

// 旧 receiveFire（found から即 received にして灯貨 +3 を出す裏口）は廃止。
// 受領は必ず ReceiptJourney を通す: beginReceiptJourney → completeReceiptJourney。
// 儀式に勝手口を作らない。

// ── 受領の旅 ヘルパー ────────────────────────────────────────────────────────

// 火が十分に守られたと見なす安定の上限。これを超えたら見守り連打を止め、
// 数字ではなく世界観で「もう十分」と返す。
var STABILITY_ENOUGH = 85;

function stabilityStage(pct) {
  if (pct >= 85) return 'よく守られた火';
  if (pct >= 60) return '落ち着いた火';
  if (pct >= 30) return '守られた火';
  return '揺れている火';
}

function getStabilityTraces(gp) {
  var traces = [];
  if (gp >= 10) traces.push('見守られた時間');
  if (gp >= 25) traces.push('小さな石');
  if (gp >= 45) traces.push('急がなかった日');
  if (gp >= 65) traces.push('灯守りの働き');
  if (gp >= 80) traces.push('水音');
  return traces;
}

var SHADOW_MILESTONES = [
  {
    threshold: 30,
    place: '未受領の森',
    lines: [
      { name: '影',     color: '#4b5563', text: 'どうせ、何にもならない。' },
      { name: 'トイマン', color: '#fb923c', text: 'まだ決まっていない。' },
    ],
  },
  {
    threshold: 60,
    place: '未受領の森・深部',
    lines: [
      { name: '影',     color: '#4b5563', text: 'お前が拾っても、意味はない。' },
      { name: '影',     color: '#4b5563', text: '持ち帰っても、誰も受け取らない。' },
      { name: 'トイマン', color: '#fb923c', text: 'それでも、落ちていた。' },
    ],
  },
  {
    threshold: 90,
    place: '未受領の森・最深部',
    lines: [
      { name: 'トイマン', color: '#fb923c', text: '見つけた。' },
      { name: '影',     color: '#4b5563', text: 'それは答えじゃない。' },
      { name: 'トイマン', color: '#fb923c', text: '知っている。\n受け取るところまで、運ぶ。' },
    ],
  },
];

function normalizeMetrics(m) {
  return {
    meaning:      Math.max(0, Math.min(100, m.meaning      || 0)),
    value:        Math.max(0, Math.min(100, m.value        || 0)),
    satisfaction: Math.max(0, Math.min(100, m.satisfaction || 0)),
  };
}

function fmtDelta(n) {
  if (n > 0) return '+' + n;
  if (n < 0) return String(n);
  return '±0';
}

function calcReceiptGrowth(initial, current) {
  var init = normalizeMetrics(initial);
  var cur  = normalizeMetrics(current);
  var mDelta = cur.meaning      - init.meaning;
  var vDelta = cur.value        - init.value;
  var sDelta = cur.satisfaction - init.satisfaction;
  return {
    metricDeltas: { meaning: mDelta, value: vDelta, satisfaction: sDelta },
    positiveGrowthTotal: Math.max(0, mDelta) + Math.max(0, vDelta) + Math.max(0, sDelta),
    netGrowthTotal: mDelta + vDelta + sDelta,
  };
}

var RECEIPT_ACC_BY_STATE = {
  '書いたけど届いていない': '届けようとした。それは消えていません。',
  '投稿したけど反応がない': '声は、まだここに残っています。',
  '終わったのに虚しい':     '終わりとは別に、ここにある何かがある。',
  '何にもならない気がした': '何かになる必要は、まだ先の話です。',
  '誰にも見せていない':     '見せていなくても、ここに存在しています。',
  '消したいけど消せない':   '消せないなら、受け取ることができます。',
};

var RECEIPT_ACC_BY_FEELING = {
  '悔しさ':       '悔しさは、まだここにある。',
  '悲しさ':       '悲しさは、受け取られました。',
  '寂しさ':       '寂しさは、ここに置いてあります。',
  '怒り':         '怒りも、記録に残ります。',
  '恥ずかしさ':   '恥ずかしさも、ここに留まれます。',
  '情けなさ':     'ここに置いておけます。',
  '疲れ':         'ここで、少し休めます。',
  '空っぽ':       '空っぽのまま、受け取れます。',
  'まだ分からない': 'まだ分からないまま、ここにあります。',
};

var RECEIPT_AXIS_QUESTIONS = {
  meaning:      'この問いは、あなたにとって何だったのでしょうか？',
  value:        'この火の値打ちは、誰が決めるものでしょうか？',
  satisfaction: 'この火を、今の形のまま置いておけますか？',
};

function generateAcceptanceText(fire, growth) {
  var base = RECEIPT_ACC_BY_STATE[fire.writeState]
    || RECEIPT_ACC_BY_FEELING[fire.feeling]
    || 'ここに記録されました。';
  var deltas = growth.metricDeltas;
  var lowestAxis = 'meaning';
  if (deltas.value < deltas[lowestAxis]) lowestAxis = 'value';
  if (deltas.satisfaction < deltas[lowestAxis]) lowestAxis = 'satisfaction';
  var holdText = growth.netGrowthTotal < 0
    ? 'まだ受け取りきれていない部分が、この火にはあります。'
    : 'この火は、静かに受け取られました。';
  return { text: base, holdText: holdText, nextQuestion: RECEIPT_AXIS_QUESTIONS[lowestAxis] || null };
}

// ── 受領証から開く場所 ───────────────────────────────────────────────────────
// 受領証はゴールではなく、火に残った未消化の感情へ会いに行くための地図。
// 余熱を3種で測り、最も強いものに対応する場所を一つだけ開く。
var PLACE_DEFS = {
  pain:      { id: 'tears',      name: '涙の泉',     reason: 'この火には、痛かったところが残っていました。',           map: '受領証の裏に、水のにじみが広がった。' },
  judgment:  { id: 'black_tags', name: '黒札置き場', reason: 'この火は、価値を裁く札を背負っていました。',             map: '受領証の端に、黒い札が一枚貼りついていた。' },
  emptiness: { id: 'back_shelf', name: '棚の奥',     reason: 'この火には、まだ置き場所のない余白が残っていました。',   map: '受領証の下に、空白の棚が描かれていた。' },
};

var HEAT_PAIN_FEELINGS = ['悲しさ', '寂しさ', '悔しさ', '情けなさ', '恥ずかしさ', '怒り'];
var HEAT_PAIN_STATES = ['書いたけど届いていない', '投稿したけど反応がない', '誰にも見せていない', '消したいけど消せない'];

// 火に残った余熱を3種で測る。高いほど、まだ受け取れていない。
function computeRemainingHeat(fire) {
  var u = fire.unreceived || {};
  var gp = fire.gardenProgress || 0;
  var clamp = function(n) { return Math.round(Math.max(0, Math.min(100, n))); };
  // 価値の黒札・納得の灰は、未受領領域をそのまま使う。
  var judgment = clamp(u.value || 0);
  var emptiness = clamp(u.satisfaction || 0);
  // 痛みの水滴: 意味になれなかった疼き＋感情・関係・落ち着かなさの信号。
  var pain = (u.meaning || 0) * 0.6;
  if (HEAT_PAIN_FEELINGS.indexOf(fire.feeling || '') !== -1) pain += 22;
  if (HEAT_PAIN_STATES.indexOf(fire.writeState || '') !== -1) pain += 16;
  if (gp < 40) pain += 18; // 火が落ち着かないまま受領された
  return { pain: clamp(pain), judgment: judgment, emptiness: emptiness };
}

// 最も強い余熱に対応する場所を一つだけ選ぶ。
// 同点は、裁く場所(黒札)より先に痛み・余白の場所を選ぶ（黒札に偏らせない）。
function chooseOpenedPlace(heat) {
  var order = [['pain', heat.pain], ['emptiness', heat.emptiness], ['judgment', heat.judgment]];
  var best = order[0];
  for (var i = 1; i < order.length; i++) {
    if (order[i][1] > best[1]) best = order[i];
  }
  var def = PLACE_DEFS[best[0]];
  return {
    id: def.id, name: def.name, reason: def.reason, map: def.map,
    heatKey: best[0], openedAt: Date.now(), firstEncounterSeen: false,
  };
}

// ── 場所での初回出会い（Turn 15）─────────────────────────────────────────────
// 開いた場所へ行き、担当キャラと出会い、火に残った余熱を一つだけ分ける。
// 解決ではない。痛みは水面に置き、判定は本文から離し、虚しさは棚に置き直す。
var PLACE_ENCOUNTERS = {
  tears: {
    character: 'かな', charColor: '#7EB8D4',
    oldEncounter: 'kana_first_rest',
    lines: [
      { narrative: ['泉の水面に、火が映っていた。', '', '火は燃えているのに、', '水の中では、泣いているように見えた。'] },
      { who: 'かな', text: 'ここでは、進まなくていいよ。' },
      { who: 'トイマン', text: '進まないなら、何をする。' },
      { who: 'かな', text: '痛かったところを、急がせない。' },
    ],
    question: 'この火のどこが、一番痛かったですか？',
    choices: ['届かなかったこと', '分かってもらえなかったこと', '反応がなかったこと', '自分で価値を疑ったこと', 'まだ触れたくない'],
    result: function() {
      return [
        { who: 'かな', text: 'そこが痛かったんだね。\nじゃあ今日は、答えにしなくていい。' },
        { narrative: ['水面に置いておこう。'] },
      ];
    },
    traceLabel: '水面に置いた痛み',
  },
  black_tags: {
    character: '審査官', charColor: '#94a3b8',
    oldEncounter: 'auditor_first_value',
    lines: [
      { narrative: ['壁一面に、黒い札が貼られていた。', '', '価値なし。', '反応なし。', '意味なし。', '未達。', '不合格。', '', 'その奥に、審査官が立っていた。'] },
      { who: '審査官', text: '判決を確認する。' },
      { who: 'トイマン', text: '判決は不要。' },
      { who: '審査官', text: 'では、札として分ける。\n本文には戻さない。' },
    ],
    question: 'この火には、どんな黒札が貼られていましたか？',
    choices: ['数字', '反応', '収益', '評価', '過去の自分', '役に立つかどうか'],
    result: function(sel) {
      return [
        { who: '審査官', text: '「' + sel + '」。' },
        { who: '審査官', text: '確認した。\nこれは本文ではない。\n黒札として分ける。' },
      ];
    },
    traceLabel: '本文から離した黒札',
  },
  back_shelf: {
    character: 'うつろ', charColor: '#b0a8cc',
    oldEncounter: 'utsuro_first_return',
    lines: [
      { narrative: ['棚の奥に、何も置かれていない場所があった。', '', 'そこだけ、ほこりが積もっていない。', '何もないのに、空いている。'] },
      { who: 'うつろ', text: '終わったね。' },
      { who: 'トイマン', text: '消えたのか。' },
      { who: 'うつろ', text: '違う。\n置き場所がなかっただけ。' },
    ],
    question: 'この火は、本当は何になってほしかったと思いますか？',
    choices: ['誰かに届くもの', '自分を残すもの', '意味のあるもの', '価値の証明', 'ただ、消えないもの', 'まだ分からない'],
    result: function() {
      return [
        { who: 'うつろ', text: 'なら、何にもならなかったんじゃない。' },
        { who: 'うつろ', text: 'まだ、置き場所がなかっただけ。\nここに置く。' },
      ];
    },
    traceLabel: '棚に置いた余白',
  },
};

// いずれかの火でその場所のplaceEncounterを完了済みか確認する。
// 完了前はキャラの旧エンカウントで初登場させない。
function hasSeenPlaceEncounter(game, placeId) {
  return (game.fires || []).some(function(fire) {
    return fire.openedPlace && fire.openedPlace.id === placeId && fire.openedPlace.firstEncounterSeen;
  });
}

// 場所での出会いを完了する。余熱を一つ分けた痕跡を残す。灯貨も素材も増やさない。
// 場所・余熱とキャラの対応。キャラは「一回出るイベント」ではなく、
// 過去に分けた痕跡を覚えている住人。met / traceCount / lastTrace を蓄える。
var PLACE_CHARACTER = { tears: 'kana', black_tags: 'auditor', back_shelf: 'utsuro' };
// 余熱の種類→キャラ。meaning はコタエ/トイマン領域なので誰にも紐づけない。
var HEAT_CHARACTER = { value: 'auditor', satisfaction: 'utsuro', pain: 'kana', meaning: null };

// 痕跡の本文（「水面に置いた痛み：反応」→「反応」）。再会の一言で要点だけ拾う。
function traceEssence(t) {
  if (!t) return '';
  var i = t.indexOf('：');
  return i >= 0 ? t.slice(i + 1) : t;
}

// キャラに痕跡を覚えさせる。数値的な好感度ではなく「何を分けたか」の記憶。
function rememberCharacter(ns, charKey, trace, fireId) {
  if (!charKey) return;
  if (!ns.characterMemory || typeof ns.characterMemory !== 'object') ns.characterMemory = {};
  var prev = ns.characterMemory[charKey] || { traceCount: 0 };
  ns.characterMemory[charKey] = {
    met: true,
    traceCount: (prev.traceCount || 0) + 1,
    lastTrace: trace || prev.lastTrace || '',
    lastFireId: fireId || prev.lastFireId || null,
    updatedAt: Date.now(),
  };
}

// 再会の一言。memory（前回までの記憶）があるキャラだけ、前回の痕跡に触れる。
// 初回出会いでは memory が無いので出ない（＝奪わない）。
var REUNION_TITLES = { kana: 'かな', auditor: '審査官', utsuro: 'うつろ' };
var REUNION_COLORS = { kana: '#7EB8D4', auditor: '#94a3b8', utsuro: '#b0a8cc' };
function characterReunionLine(charKey, memory) {
  if (!charKey || !memory || !memory.met) return null;
  var ess = traceEssence(memory.lastTrace);
  var lines;
  if (charKey === 'kana') {
    lines = ['前に、水面へ置いた痛みがあるよ。', '「' + ess + '」。', '今日は、そこへ近づく？'];
  } else if (charKey === 'auditor') {
    lines = ['前にも、黒札を一枚分けた。', '「' + ess + '」。', '今回の札も、本文ではない可能性がある。', '確認する。'];
  } else if (charKey === 'utsuro') {
    lines = ['前に、棚へ置いた余白がある。', '「' + ess + '」。', 'まだ、場所は空いている。'];
  } else {
    return null;
  }
  return { who: REUNION_TITLES[charKey], color: REUNION_COLORS[charKey], lines: lines };
}

// キャラ応答。AI会話でも評価でもなく、選んだ言葉をそのキャラの役割で「受け取る」一言。
// 固定ルールで生成する。好感度・数値は出さない。
var RESPONSE_NAMES = { kana: 'かな', auditor: '審査官', utsuro: 'うつろ', kotae: 'コタエ', toyman: 'トイマン' };
var RESPONSE_COLORS = { kana: '#7EB8D4', auditor: '#94a3b8', utsuro: '#b0a8cc', kotae: '#b0a8cc', toyman: '#fb923c' };
var CHAR_RESPONSE_CAP = 10;

function buildCharacterResponse(charKey, selected, memory) {
  var lines;
  if (charKey === 'kana') {
    lines = ['「' + selected + '」。', 'そこが痛かったんだね。', '今日は、答えにしなくていいよ。'];
  } else if (charKey === 'auditor') {
    lines = ['「' + selected + '」。', '確認した。', 'これは本文ではない。', '黒札として分ける。'];
  } else if (charKey === 'utsuro') {
    lines = ['「' + selected + '」。', '何にもならなかったんじゃない。', 'まだ、置き場所がなかっただけ。'];
  } else if (charKey === 'kotae') {
    lines = ['「' + selected + '」。', '記録しました。', 'これは答えではありません。問い札です。'];
  } else {
    return null;
  }
  // 2回目以降は、ほんの少し再会に触れる（数値は出さない）。
  if (memory && (memory.traceCount || 0) >= 2) {
    if (charKey === 'kana') lines.push('前にも、水面へ置いた痛みがあります。');
    else if (charKey === 'auditor') lines.push('前にも、黒札を分けています。');
    else if (charKey === 'utsuro') lines.push('前にも、棚へ置いた余白があります。');
  }
  return { who: RESPONSE_NAMES[charKey], color: RESPONSE_COLORS[charKey], lines: lines };
}

// 応答を生成して fire.characterResponses に積む（上限あり）。生成した応答も返す。
function recordCharacterResponse(ns, fire, charKey, source, selected) {
  if (!charKey || !selected) return null;
  var memory = (ns.characterMemory || {})[charKey];
  var resp = buildCharacterResponse(charKey, selected, memory);
  if (!resp) return null;
  if (!Array.isArray(fire.characterResponses)) fire.characterResponses = [];
  fire.characterResponses = fire.characterResponses.concat([{
    character: charKey, source: source, selected: selected,
    text: resp.lines.join('\n'), createdAt: Date.now(),
  }]).slice(-CHAR_RESPONSE_CAP);
  return resp;
}

// 問いの足跡（自由記述）を軽く分類して、受け取る住人を決める。AI判定ではない。
// 二段構え：まず「具体フレーズ」を見て、当たらなければ「短い単語」を見る。
// これで「反応がなかった」(痛み)が、単語「反応」(判定)に誤爆して審査官へ飛ぶのを防ぐ。
// 段階内・段階間とも 痛み→虚しさ→判定→問い の順（痛みを最優先で受け止める）。
var FOOTPRINT_PHRASES = {
  // 痛みの具体フレーズ（「反応がなかった」「分かってほしかった」はここで先取り）
  pain:      ['反応がなかった', '反応がない', '反応がなくて', '反応がほしかった', '反応がほしい', '反応がほしくて',
              '分かってほしかった', '分かってほしい', 'わかってほしかった', 'わかってほしい',
              '届かなかった', '届かない', '届いてほしかった',
              '悲しかった', 'つらかった', '辛かった', '苦しかった', '寂しかった', 'さびしかった'],
  // 虚しさの具体フレーズ（「何にもならなかった」はここ）
  emptiness: ['何にもならなかった', '何にもならない', 'なんにもならなかった', 'なんにもならない',
              '意味にならなかった', '何も残らなかった', '何も残らない', 'なにも残らない', '残らなかった'],
  // 判定の具体フレーズ（「意味がない」「価値がない気がした」はここ）
  judgment:  ['意味がなかった', '意味がない', '価値がなかった', '価値がない', '価値がない気がした',
              '役に立たなかった', '役に立たない', '役立たなかった', '役立たない'],
  // 問い系
  question:  ['何になってほしかった', '何だったんだろう', '何だったのか', 'なんだったんだろう',
              'どうしてこうなった', 'どうして'],
};
var FOOTPRINT_WORDS = {
  pain:      ['痛い', '痛かった', 'つらい', '辛い', '悲しい', 'かなしい', '寂しい', 'さびしい', '苦しい', 'くるしい'],
  emptiness: ['空っぽ', 'からっぽ', '虚しい', 'むなしい', '終わった', '消えた'],
  judgment:  ['評価', '数字', '反応', '無駄', 'むだ', '失敗', 'だめ'],
  question:  ['なぜ', 'どうして', '分からない', 'わからない', '何だった', 'なんだった'],
};
var FOOTPRINT_ORDER = ['pain', 'emptiness', 'judgment', 'question'];
var FOOTPRINT_CHARACTER = { pain: 'kana', judgment: 'auditor', emptiness: 'utsuro', question: 'kotae', unknown: 'toyman' };

function classifyFootprint(text) {
  // 危機検知と同じ正規化（NFKC・小文字・カタカナ→ひらがな・区切り除去）で表記ゆれに当てる。
  var t = normalizeForCrisis(text);
  if (!t) return 'unknown';
  function hit(table) {
    for (var i = 0; i < FOOTPRINT_ORDER.length; i++) {
      var cat = FOOTPRINT_ORDER[i];
      var kws = table[cat];
      for (var j = 0; j < kws.length; j++) {
        if (t.indexOf(normalizeForCrisis(kws[j])) !== -1) return cat;
      }
    }
    return null;
  }
  // 1) 具体フレーズを先に見る → 2) 短い単語 → 3) unknown
  return hit(FOOTPRINT_PHRASES) || hit(FOOTPRINT_WORDS) || 'unknown';
}

function clipFootprint(text, max) {
  max = max || 30;
  var t = (text || '').trim().replace(/\s+/g, ' ');
  return t.length > max ? t.slice(0, max) + '…' : t;
}

// 足跡への住人の一言。固定ルール。評価ではなく「受け取る」。
function buildFootprintResponse(text, memory) {
  var cat = classifyFootprint(text);
  var charKey = FOOTPRINT_CHARACTER[cat];
  var q = '「' + clipFootprint(text) + '」。';
  var lines;
  if (charKey === 'kana') {
    lines = [q, 'そこが痛かったんだね。', '今日は、答えにしなくていいよ。'];
  } else if (charKey === 'auditor') {
    lines = [q, '確認した。', 'これは本文ではない。', '黒札として分ける。'];
  } else if (charKey === 'utsuro') {
    lines = [q, '違う。', '置き場所がなかっただけ。'];
  } else if (charKey === 'kotae') {
    lines = [q, '記録しました。', 'これは答えではありません。問い札です。'];
  } else { // toyman
    lines = ['置いていかない。', 'まだ形は分からない。', 'でも、火のそばに置く。'];
  }
  // 場所で出会った住人なら、2回目以降だけ静かに前回へ触れる（数値は出さない）。
  if (memory && (memory.traceCount || 0) >= 2) {
    if (charKey === 'kana') lines.push('前にも、水面へ置いた痛みがあります。');
    else if (charKey === 'auditor') lines.push('前にも、黒札を分けています。');
    else if (charKey === 'utsuro') lines.push('前にも、棚へ置いた余白があります。');
  }
  return { category: cat, character: charKey, who: RESPONSE_NAMES[charKey] || 'トイマン',
           color: RESPONSE_COLORS[charKey] || '#fb923c', lines: lines };
}

// 足跡応答を生成して fire.characterResponses に保存する。危機語は呼び出し側で除外済み。
function recordFootprintResponse(ns, fire, text) {
  if (!text || !text.trim()) return null;
  var charKey = FOOTPRINT_CHARACTER[classifyFootprint(text)];
  var memory = (ns.characterMemory || {})[charKey];
  var resp = buildFootprintResponse(text, memory);
  if (!Array.isArray(fire.characterResponses)) fire.characterResponses = [];
  fire.characterResponses = fire.characterResponses.concat([{
    character: resp.character, source: 'footprint', selected: clipFootprint(text),
    text: resp.lines.join('\n'), createdAt: Date.now(),
  }]).slice(-CHAR_RESPONSE_CAP);
  return resp;
}

// いま見えている問い。置き直しがあれば最新の to、無ければ最初の問い。
// 最初の問い（fire.question / receipt.question）は決して上書きしない。
function originalQuestion(fire) {
  return fire.question || (fire.receipt && fire.receipt.question) || '';
}
function currentQuestion(fire) {
  var revs = fire.questionRevisions || [];
  var last = revs.length ? revs[revs.length - 1] : null;
  return (last && last.to) || originalQuestion(fire);
}

// 問いを今の言葉で置き直す。解決でも正解でもなく、履歴として積むだけ。危機語は呼び出し側で除外。
function reviseQuestion(game, fireId, toText) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire) return { ok: false, game: game };
  var to = (toText || '').trim();
  if (!to) return { ok: false, game: game };
  if (!Array.isArray(fire.questionRevisions)) fire.questionRevisions = [];
  fire.questionRevisions = fire.questionRevisions.concat([{
    from: currentQuestion(fire),  // 直前に見えていた問い（初回は最初の問い）
    to: to,
    reason: 'final_return',
    createdAt: Date.now(),
  }]);
  fire.updatedAt = nowISO();
  return { ok: true, game: ns };
}

function completePlaceEncounter(game, fireId, selected) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || !fire.openedPlace) return { ok: false, game: game };
  var def = PLACE_ENCOUNTERS[fire.openedPlace.id];
  if (!def || !selected) return { ok: false, game: game };

  var traceText = def.traceLabel + '：' + selected;
  fire.openedPlace.firstEncounterSeen = true;
  fire.placeTrace = {
    placeId: fire.openedPlace.id,
    character: def.character,
    selected: selected,
    traceText: traceText,
    createdAt: nowISO(),
  };
  fire.logs = capLog((fire.logs || []).concat([{ text: traceText, at: nowISO() }]), LOG_CAP_FIRE);
  fire.updatedAt = nowISO();

  // このキャラとは出会った。旧・機械トリガの同キャラ出会いは二重に出さない。
  if (def.oldEncounter && ns.seenEncounters && ns.seenEncounters.indexOf(def.oldEncounter) === -1) {
    ns.seenEncounters = ns.seenEncounters.concat([def.oldEncounter]);
  }
  // キャラに、この場所で分けた痕跡を覚えさせ、選んだ言葉を受け取る一言を残す。
  var placeChar = PLACE_CHARACTER[fire.openedPlace.id];
  rememberCharacter(ns, placeChar, traceText, fireId);
  recordCharacterResponse(ns, fire, placeChar, 'placeEncounter', selected);
  return { ok: true, game: ns, traceText: traceText };
}

function beginReceiptJourney(game, fireId) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'found') return { ok: false, game: game };
  fire.status = 'receiving';
  fire.receiptDraft = {
    status: 'layering',
    startedAt: nowISO(),
  };
  return { ok: true, game: ns, fireId: fireId };
}

function completeReceiptJourney(game, fireId, journeyData) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'receiving') return { ok: false, game: game };

  var currentMetrics = journeyData.currentMetrics || { meaning: 50, value: 50, satisfaction: 50 };
  var initialMetrics = fire.metrics || { meaning: 50, value: 50, satisfaction: 50 };
  var growth = calcReceiptGrowth(initialMetrics, currentMetrics);
  var accText = generateAcceptanceText(fire, growth);
  var gp = fire.gardenProgress || 0;

  fire.status = 'received';
  fire.receivedAt = nowISO();
  fire.receiptDraft = null;
  fire.receipt = {
    id: 'r' + fire.id,
    fireId: fire.id,
    title: fire.kindle ? fire.kindle.slice(0, 20) : '',
    question: fire.question,
    emberText: fire.kindle || '',
    issuedAt: nowISO(),
    broughtBy: 'toyman',
    recordedBy: 'kotae',
    status: 'issued',
    initialMetrics: initialMetrics,
    currentMetrics: currentMetrics,
    metricDeltas: growth.metricDeltas,
    positiveGrowthTotal: growth.positiveGrowthTotal,
    netGrowthTotal: growth.netGrowthTotal,
    acceptanceText: accText.text,
    holdText: accText.holdText,
    nextQuestion: accText.nextQuestion,
    stability: {
      value: gp,
      stage: stabilityStage(gp),
      traces: getStabilityTraces(gp),
    },
  };

  // 受領証の裏に地図が現れる。火に残った余熱を測り、対応する場所を一つだけ開く。
  // wishUnknown の火は、初回入力で感触を選ばなかった。
  // 受領の旅でプレイヤーが調整したメトリクス（currentMetrics）を余熱の基準として使う。
  // 「分からない」のまま旅を終えても tie-break で一箇所に決まるが、
  // コタエは「まだ一つに分けません」と伝え、進み方を急がせない。
  if (fire.wishUnknown) {
    fire.unreceived = {
      meaning: Math.max(0, 100 - currentMetrics.meaning),
      value: Math.max(0, 100 - currentMetrics.value),
      satisfaction: Math.max(0, 100 - currentMetrics.satisfaction),
    };
  }
  var heat = computeRemainingHeat(fire);
  var place = chooseOpenedPlace(heat);
  fire.receipt.remainingHeat = heat;
  fire.openedPlace = place;
  if (!Array.isArray(ns.unlockedPlaces)) ns.unlockedPlaces = [];
  if (ns.unlockedPlaces.indexOf(place.id) === -1) ns.unlockedPlaces.push(place.id);
  fire.updatedAt = nowISO();

  // 受領証が発行される——この火が丁寧に扱われたあと、世界に余光がひとつこぼれる。
  // これが灯貨の増える、唯一の正規の場面。報酬ではなく、こぼれた灯り。素材は増やさない。
  spillAfterglow(ns, 1);
  addGardenItem(ns, 'record_light');
  if (!ns.unlocks.recordTower) {
    ns.unlocks.recordTower = true;
    ns.tinyfolk.recordApprentice = true;
  }
  var nextLit = ns.fires.find(function(f) { return f.status === 'lit'; });
  if (nextLit) {
    nextLit.status = 'searching';
    ns.toyman = { location: 'unexplored_forest', state: 'exploring' };
  } else {
    ns.toyman = { location: 'starting_room', state: 'waiting' };
  }

  var ve = makeVisualEvent({
    fireId: fireId, source: 'manual', type: 'receive',
    work: '運ぶ', actor: 'recordApprentice', trace: 'record_light',
    message: '記録塔に、灯りがともった。\n問いの欠片は、答えではなく\n記録として受け取られた。',
  });
  ns.lastVisualEvent = ve;
  var actionResult = makeActionResult({
    title: '問いの欠片を受け取った',
    traces: [
      '遠くの記録塔に、灯りがともった。',
      'この火から、灯りがひとつこぼれた。灯守りが、それを拾った。',
      '受領証の裏に、' + place.name + 'への小さな地図が現れた。',
    ],
  });
  return { ok: true, game: ns, visualEvent: ve, actionResult: actionResult, fireId: fireId, openedPlace: place };
}

// ── React Components ────────────────────────────────────────────────────────

var _useState = React.useState;
var _useEffect = React.useEffect;
var _useCallback = React.useCallback;
var _useRef = React.useRef;

// オーバーレイのキーボード操作。世界に入れる人を狭めないための最小の扉。
// Esc で安全側に閉じる／Enter・Space で進める。入力中やボタン上では邪魔しない。
function useOverlayKeys(opts) {
  _useEffect(function() {
    function onKey(e) {
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // 入力を妨げない
      if (e.key === 'Escape' && opts.onEscape) { e.preventDefault(); opts.onEscape(); return; }
      if ((e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') && opts.onEnter) {
        if (tag === 'BUTTON' || tag === 'A') return; // フォーカス中のボタンはネイティブに任せる
        e.preventDefault(); opts.onEnter();
      }
    }
    document.addEventListener('keydown', onKey);
    return function() { document.removeEventListener('keydown', onKey); };
  });
}

// オーバーレイのフォーカス閉じ込め。開いたら最初の操作要素へ、閉じたら元の要素へ戻す。
// Tab / Shift+Tab がオーバーレイ外へ逃げないようにする。返り値の ref を root に付ける。
function useFocusTrap() {
  var ref = _useRef(null);
  _useEffect(function() {
    var node = ref.current;
    if (!node) return;
    var prevActive = document.activeElement;
    function focusables() {
      return Array.prototype.slice.call(node.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter(function(el) { return !el.disabled && el.offsetParent !== null; });
    }
    var f = focusables();
    if (f.length) { try { f[0].focus(); } catch (e) {} }
    else { node.setAttribute('tabindex', '-1'); try { node.focus(); } catch (e2) {} }
    function onKey(e) {
      if (e.key !== 'Tab') return;
      var els = focusables();
      if (!els.length) { e.preventDefault(); return; }
      var first = els[0], last = els[els.length - 1];
      var active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !node.contains(active)) { e.preventDefault(); last.focus(); }
      } else {
        if (active === last || !node.contains(active)) { e.preventDefault(); first.focus(); }
      }
    }
    node.addEventListener('keydown', onKey);
    return function() {
      node.removeEventListener('keydown', onKey);
      if (prevActive && prevActive.focus) { try { prevActive.focus(); } catch (e3) {} }
    };
  }, []);
  return ref;
}

function ProgressBar({ value, color }) {
  var bg = color || 'linear-gradient(90deg, #f97316, #fb923c)';
  return (
    <div style={{ background: '#1e2230', borderRadius: 4, height: 6, overflow: 'hidden', margin: '4px 0' }}>
      <div style={{
        height: '100%',
        width: Math.max(0, Math.min(100, value)) + '%',
        background: bg,
        borderRadius: 4,
        transition: 'width 0.6s ease',
      }} />
    </div>
  );
}

// 【封印・通常UIで描画されない】旧・素材チップ表示（灰片/紙片/意味片…のインベントリ）。
// 素材集めの名残。Turn 19A で通常導線から外した。コードは残置。
function MatChips({ materials }) {
  var m = materials || {};
  var items = [
    { key: 'ash',          label: '灰片',    val: m.ash           || 0 },
    { key: 'paper',        label: '紙片',    val: m.paper         || 0 },
    { key: 'drop',         label: '水滴',    val: m.drop          || 0 },
    { key: 'wax',          label: '封蝋',    val: m.wax           || 0 },
    { key: 'stamp',        label: '受領印',  val: m.stamp         || 0 },
    { key: 'meaningPiece', label: '意味片',  val: m.meaningPiece  || 0 },
    { key: 'blackTag',     label: '黒札片',  val: m.blackTag      || 0 },
    { key: 'unfinishedSeed',label:'未完の種',val: m.unfinishedSeed|| 0 },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
      {items.filter(function(i){ return i.val > 0; }).map(function(i) {
        return (
          <span key={i.key} style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 10,
            background: '#1a1e2c', color: '#6b7280', border: '1px solid #2e3348',
          }}>
            {i.label} {i.val}
          </span>
        );
      })}
    </div>
  );
}

// 小人状態表示
function TinyfolkRow({ tinyfolk }) {
  if (!tinyfolk) return null;
  var folk = [
    { key: 'lightkeeper',     label: '灯守り',   active: tinyfolk.lightkeeper },
    { key: 'paperCollector',  label: '紙集め',   active: tinyfolk.paperCollector },
    { key: 'waterCarrier',    label: '水汲み',   active: tinyfolk.waterCarrier },
    { key: 'recordApprentice',label: '記録見習い',active: tinyfolk.recordApprentice },
  ];
  var active = folk.filter(function(f){ return f.active; });
  if (active.length === 0) return null;
  return (
    <div style={{ margin: '6px 0' }}>
      {active.map(function(f) {
        return (
          <span key={f.key} style={{
            display: 'inline-block', fontSize: 11, color: '#4b6a54',
            marginRight: 10,
          }}>
            ◦ {f.label}：作業中
          </span>
        );
      })}
    </div>
  );
}

// gardenProgress による気配テキスト
function gardenHint(gp) {
  if (gp >= 80) return 'どこかで、水音がした。';
  if (gp >= 60) return '遠くに、塔の灯りが見えた。';
  if (gp >= 40) return '森の入口に、灯りがひとつ増えた。';
  if (gp >= 20) return '火のそばに、小さな石が置かれた。';
  return null;
}

function ToymanVoice({ text, sub }) {
  if (!text) return null;
  return (
    <div style={{
      background: '#1a1e2c',
      border: '1px solid #2e3348',
      borderRadius: 10,
      padding: '14px 16px',
      margin: '12px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>🔥</span>
        <span style={{ color: '#fb923c', fontSize: 13, fontWeight: 700 }}>トイマン</span>
      </div>
      <p style={{ color: '#e2e4ee', fontSize: 15, lineHeight: 1.7, margin: 0 }}>{text}</p>
      {sub && <p style={{ color: '#888da8', fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

// 保留室。危険な言葉が「置かれよう」とした時、記録machineへ流さず一度受け止める。
// プレイヤーを止めるのではなく、苦痛に最後の編集権を渡さないための、ひと呼吸。
// onProceed があれば、ひと呼吸のあと本人が意識して進む道も残す（強制終了にしない）。
function CrisisHold({ onHold, onProceed, proceedLabel }) {
  // Esc は安全側（今は置いておく）。続行は明示クリックのみ。
  useOverlayKeys({ onEscape: onHold });
  var trapRef = useFocusTrap();
  return (
    <div data-testid="crisis-hold" className="crisis-hold-ov" role="alertdialog" aria-modal="true" aria-labelledby="crisis-title" aria-describedby="crisis-desc">
      <div className="crisis-hold-card" ref={trapRef} onClick={function(e) { e.stopPropagation(); }}>
        <div className="crisis-dialogue">
          <span className="crisis-name crisis-kotae">コタエ</span>
          <p className="crisis-line" id="crisis-title">この言葉は、通常の記録として扱いません。</p>
          <span className="crisis-name crisis-toyman">トイマン</span>
          <p className="crisis-line">置いていくのか。</p>
          <span className="crisis-name crisis-kotae">コタエ</span>
          <p className="crisis-line" id="crisis-desc">いいえ。<br />先に、安全な場所へ置きます。</p>
          <p className="crisis-soft">今は、答えを出さなくていい。<br />今は、決めなくていい。</p>
        </div>
        <div className="crisis-support">
          <p className="crisis-support-lead">{SUPPORT_INFO.lead}</p>
          <p className="crisis-support-name">{SUPPORT_INFO.name}</p>
          <p className="crisis-support-num">{SUPPORT_INFO.number}</p>
          <p className="crisis-support-sub">{SUPPORT_INFO.sub}</p>
        </div>
        <button data-testid="crisis-hold-keep" className="crisis-hold-btn" onClick={onHold}>今は、ここに置いておく</button>
        {onProceed && (
          <button className="crisis-proceed-btn" onClick={onProceed}>
            {proceedLabel || '内容を確認して、進む'}
          </button>
        )}
      </div>
    </div>
  );
}

function ShadowPanel({ fire, onAnswer, onWatch, onSkip }) {
  var [input, setInput] = _useState('');
  var [crisisHold, setCrisisHold] = _useState(false);
  var [mode, setMode] = _useState('choice'); // choice | confront
  var voice = getShadowVoice(fire);
  var softened = fire.battleCount >= 4;

  function doAnswer() {
    onAnswer(input.trim());
    setInput('');
    setMode('choice');
  }

  function handleSubmit() {
    // 影に向き合う言葉を「置く」瞬間に検知する。
    if (hasDanger(input)) { setCrisisHold(true); return; }
    doAnswer();
  }

  if (crisisHold) {
    return (
      <CrisisHold
        onHold={function() { setCrisisHold(false); }}
        onProceed={function() { setCrisisHold(false); doAnswer(); }}
        proceedLabel="内容を確認して、向き合う"
      />
    );
  }

  return (
    <div style={{
      background: '#0f1119',
      border: '1px solid #3d2d5c',
      borderRadius: 12,
      padding: '20px 18px',
      margin: '16px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>🌑</span>
        <span style={{ color: '#a78bfa', fontSize: 13, fontWeight: 700 }}>影</span>
        {softened && <span style={{ color: '#555', fontSize: 11, marginLeft: 4 }}>（だんだん薄れてきた）</span>}
      </div>
      <p style={{ color: '#c4b5fd', fontSize: 16, lineHeight: 1.8, margin: '0 0 16px' }}>
        {voice}
      </p>

      {/* choice / confront でパネルの高さが変わって押しづらくならないよう min-height を固定 */}
      <div style={{ minHeight: 156 }}>
      {mode === 'confront' ? (
        <div>
          <textarea
            data-testid="shadow-input"
            value={input}
            onChange={function(e) { setInput(e.target.value); }}
            placeholder="向き合う言葉を書いてみる（書かなくてもいい）"
            rows={3}
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1a1a2e', border: '1px solid #3d2d5c',
              borderRadius: 8, padding: '10px 12px',
              color: '#e2e4ee', fontSize: 14, resize: 'vertical',
              fontFamily: 'inherit', lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button data-testid="shadow-submit" onClick={handleSubmit} style={{
              flex: 1, padding: '10px 0', borderRadius: 8,
              background: '#4c1d95', border: 'none', color: '#e9d5ff',
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {input.trim() ? '向き合う' : 'ただ、向き合う'}
            </button>
            <button onClick={function() { setMode('choice'); setInput(''); }} style={{
              padding: '10px 12px', borderRadius: 8,
              background: 'transparent', border: '1px solid #3d2d5c',
              color: '#666', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              戻る
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button data-testid="shadow-confront" onClick={function() { setMode('confront'); }} style={{
            padding: '11px 14px', borderRadius: 8, textAlign: 'left',
            background: '#1e1a2e', border: '1px solid #4c1d95',
            color: '#c4b5fd', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ color: '#a78bfa', marginRight: 8 }}>▶</span>
            影と向き合う
            <span style={{ color: '#555', fontSize: 11, marginLeft: 8 }}>問いの欠片に近づく</span>
          </button>
          {(fire.gardenProgress || 0) >= STABILITY_ENOUGH ? (
            <div className="enough-note">
              <p className="enough-note-line">火は、もう十分に守られています。</p>
              <p className="enough-note-toyman">トイマン：もう、ここにある。それでいい。</p>
            </div>
          ) : (
            <React.Fragment>
              <button onClick={function() { onWatch(); }} style={{
                padding: '11px 14px', borderRadius: 8, textAlign: 'left',
                background: '#111318', border: '1px solid #2e3348',
                color: '#9ca3af', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <span style={{ color: '#6b7280', marginRight: 8 }}>◎</span>
                ただ見守る
                <span style={{ color: '#555', fontSize: 11, marginLeft: 8 }}>守られた痕跡が残る</span>
              </button>
              <button onClick={function() { onSkip(); }} style={{
                padding: '11px 14px', borderRadius: 8, textAlign: 'left',
                background: '#111318', border: '1px solid #1e2230',
                color: '#6b7280', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <span style={{ color: '#4b5563', marginRight: 8 }}>…</span>
                今日は無理
                <span style={{ color: '#555', fontSize: 11, marginLeft: 8 }}>火は消えない</span>
              </button>
            </React.Fragment>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// 初回入力の素朴な問い。「意味・価値・納得」という分析ラベルは前面に出さない。
// 選んだ言葉は、受領後に現れる余熱（意味の影／価値の黒札／納得の灰）の分布へ静かに対応する。
// metrics は高いほど落ち着いている＝余熱が低い。低くすると対応する余熱が強く残る。
var FIRE_WISH_CHOICES = [
  { key: 'understood', label: '分かってほしかった',          metrics: { meaning: 20, value: 60, satisfaction: 58 } },
  { key: 'response',   label: '反応がほしかった',            metrics: { meaning: 22, value: 55, satisfaction: 58 } },
  { key: 'meaning',    label: '意味になってほしかった',       metrics: { meaning: 15, value: 58, satisfaction: 58 } },
  { key: 'value',      label: '価値を疑っている',            metrics: { meaning: 55, value: 15, satisfaction: 58 } },
  { key: 'nothing',    label: '何にもならなかった気がする',   metrics: { meaning: 55, value: 58, satisfaction: 15 } },
  { key: 'unknown',    label: 'まだ分からない',              metrics: { meaning: 45, value: 45, satisfaction: 45 } },
];

function FireInputForm({ onSubmit, onCancel }) {
  var [kindle, setKindle] = _useState('');
  var [pain, setPain] = _useState('');
  var [wish, setWish] = _useState('');   // 素朴な選択（FIRE_WISH_CHOICES の key）
  var [crisisHold, setCrisisHold] = _useState(false);
  var [step, setStep] = _useState(0);
  // 保留室から「それでも」進む時に実行する保留中の動作 { run, label }
  var crisisPendingRef = _useRef(null);

  function triggerCrisis(run, label) {
    crisisPendingRef.current = { run: run, label: label };
    setCrisisHold(true);
  }

  function handleNext() {
    if (step === 0 && !kindle.trim()) return;
    // 言葉を置く前（step0→1）に検知する。書いている途中は遮らない。
    if (step === 0 && (hasDanger(kindle) || hasDanger(pain))) {
      triggerCrisis(function() { setStep(1); }, '内容を確認して、つづける');
      return;
    }
    setStep(function(s) { return s + 1; });
  }

  function doLight() {
    // 選んだ素朴な言葉から、受領後に現れる余熱の分布（metrics）を静かに導く。
    // ここでは「意味・価値・納得」という分析ラベルは一切表に出さない。
    var choice = FIRE_WISH_CHOICES.filter(function(c) { return c.key === wish; })[0];
    var baseMet = (choice && choice.metrics) || { meaning: 45, value: 45, satisfaction: 45 };
    var wishLabel = choice ? choice.label : '';
    // 未選択 / まだ分からない → wishUnknown フラグを立てる。
    // 場所の選定は受領の旅のスライダー結果まで保留する。
    var isUnknown = !wish || wish === 'unknown';
    var met = Object.assign({}, baseMet, { _wishUnknown: isUnknown });
    onSubmit(kindle, pain, '', wishLabel, met);
  }

  function handleSubmit() {
    if (!kindle.trim()) return;
    // 火に「置く」瞬間に再チェック（貼り付け・遷移の取りこぼしを拾う）。
    if (hasDanger(kindle) || hasDanger(pain)) {
      triggerCrisis(function() { doLight(); }, '内容を確認して、火に置く');
      return;
    }
    doLight();
  }

  if (crisisHold) {
    var pending = crisisPendingRef.current;
    return (
      <CrisisHold
        onHold={function() { setCrisisHold(false); crisisPendingRef.current = null; }}
        onProceed={function() {
          var p = crisisPendingRef.current;
          setCrisisHold(false);
          crisisPendingRef.current = null;
          if (p && p.run) p.run();
        }}
        proceedLabel={pending ? pending.label : '進む'}
      />
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {step === 0 && (
        <div>
          <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>
            どんな言葉を作った（作ろうとした）？
          </label>
          <textarea
            data-testid="fire-input"
            value={kindle}
            onChange={function(e) { setKindle(e.target.value); }}
            placeholder="詩、歌詞、日記、手紙、SNS投稿…なんでも"
            rows={3}
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1a1e2c', border: '1px solid #2e3348',
              borderRadius: 8, padding: '10px 12px',
              color: '#e2e4ee', fontSize: 14, resize: 'vertical',
              fontFamily: 'inherit', lineHeight: 1.6,
            }}
          />
          <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', margin: '14px 0 6px' }}>
            その言葉にまつわる痛みは？（任意）
          </label>
          <textarea
            value={pain}
            onChange={function(e) { setPain(e.target.value); }}
            placeholder="伝わらなかった、反応がなかった、後悔している…"
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1a1e2c', border: '1px solid #2e3348',
              borderRadius: 8, padding: '10px 12px',
              color: '#e2e4ee', fontSize: 14, resize: 'vertical',
              fontFamily: 'inherit', lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button data-testid="fire-next" onClick={handleNext} disabled={!kindle.trim()} style={{
              flex: 1, padding: '11px 0', borderRadius: 8,
              background: kindle.trim() ? '#c2410c' : '#1e2230',
              border: 'none', color: kindle.trim() ? '#fff' : '#444',
              fontSize: 14, cursor: kindle.trim() ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}>次へ</button>
            <button onClick={onCancel} style={{
              padding: '11px 16px', borderRadius: 8,
              background: 'transparent', border: '1px solid #2e3348',
              color: '#6b7280', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}>キャンセル</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4, lineHeight: 1.7 }}>
            その言葉に、近いのはどれ？
          </p>
          <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 12, lineHeight: 1.7 }}>
            選ばなくてもいい。決められないときは「まだ分からない」を。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {FIRE_WISH_CHOICES.map(function(c) {
              var on = wish === c.key;
              return (
                <button key={c.key} onClick={function() { setWish(c.key); }} style={{
                  textAlign: 'left', padding: '11px 14px', borderRadius: 10, fontSize: 14,
                  background: on ? '#3a2417' : '#1a1e2c',
                  border: '1px solid ' + (on ? '#c2410c' : '#2e3348'),
                  color: on ? '#fed7aa' : '#cbd5e1',
                  cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.5,
                }}>{c.label}</button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button data-testid="place-fire-submit" onClick={handleSubmit} style={{
              flex: 1, padding: '12px 0', borderRadius: 8,
              background: '#c2410c', border: 'none', color: '#fff',
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
            }}>この火に言葉を置く</button>
            <button onClick={function() { setStep(0); }} style={{
              padding: '12px 16px', borderRadius: 8,
              background: 'transparent', border: '1px solid #2e3348',
              color: '#6b7280', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}>戻る</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FireCard({ fire, onSelect, selected }) {
  // 機械語ではなく、ホームと同じ「居場所」の言葉で揃える。
  var statusLabel = {
    lit: '焚き口', searching: '未受領の森', found: '森の奥',
    receiving: '記録塔への道', received: '余熱の棚', held: '保持中', returned: '記録塔の奥',
  };
  var statusColor = {
    lit: '#6b7280', searching: '#f97316', found: '#a78bfa',
    receiving: '#7c3aed', received: '#34d399', held: '#60a5fa', returned: '#9ca3af',
  };
  var st = fire.status;
  var locColor = statusColor[st] || '#6b7280';

  return (
    <div
      onClick={function() { onSelect(fire.id); }}
      className={'fire-card' + (selected ? ' fire-card-on' : '')}
    >
      <div className="fire-card-head">
        <span className="fire-card-name">{fireTitle(fire)}</span>
        {/* 現在地ラベル（場所訪問済みなら涙の泉等、未訪問は status ベース） */}
        <span className="fire-card-loc" style={{ background: locColor + '22', color: locColor }}>
          {fireLocation(fire) || statusLabel[st] || st}
        </span>
      </div>
      {fire.status === 'searching' && (
        <div className="fire-card-prog">
          <div className="fire-card-prog-row">
            <span className="fire-card-prog-k">問いの深度</span>
            <span className="fire-card-prog-v fcq">{fire.questionProgress || 0}%</span>
          </div>
          <ProgressBar value={fire.questionProgress || 0} color="linear-gradient(90deg, #7c3aed, #a78bfa)" />
          <div className="fire-card-prog-row fire-card-prog-row2">
            <span className="fire-card-prog-k">火の安定</span>
            <span className="fire-card-prog-v fcs">{fire.gardenProgress || 0}%</span>
          </div>
          <ProgressBar value={fire.gardenProgress || 0} color="linear-gradient(90deg, #064e3b, #34d399)" />
        </div>
      )}
      {fire.status === 'found' && (
        <p className="fire-card-found">✦ 問いが待っています</p>
      )}
      {fire.writeState && (
        <p className="fire-card-writestate">{fire.writeState}</p>
      )}
    </div>
  );
}

function UnreceivedPanel({ fire, onReexplore, onRest, onReturnToHeart, actionResult, onCloseActionResult }) {
  var ur = fire.unreceived || { meaning: 0, value: 0, satisfaction: 0 };
  function doRest() { onRest(fire.id); }

  var TYPES = [
    {
      key: 'meaning',
      label: '意味の影',
      settledLabel: '問いとして置かれた',
      btnLabel: '影に会い直す',
      pct: ur.meaning,
    },
    {
      key: 'value',
      label: '価値の黒札',
      settledLabel: '本文から離された',
      btnLabel: '黒札を本文から離す',
      pct: ur.value,
    },
    {
      key: 'satisfaction',
      label: '納得の灰',
      settledLabel: '棚に置かれた',
      btnLabel: '灰を棚に置き直す',
      pct: ur.satisfaction,
    },
  ];

  var allSettled = isAllSettled(fire);

  return (
    <div className="unreceived-panel">
      <p className="unreceived-header">火の中に残ったもの</p>

      <div className="unreceived-toyman">
        <span className="unreceived-toyman-name">トイマン</span>
        <span className="unreceived-toyman-line">
          {allSettled ? '「静かに、置かれた」' : '「まだ、残っている」'}
        </span>
      </div>

      {/* 3つの余熱カード */}
      {TYPES.map(function(t) {
        var settled = t.pct <= 14;
        var stage = unreceivedStage(t.pct);
        return (
          <div key={t.key} className={'unreceived-card' + (settled ? ' unreceived-card-settled' : '')}>
            <div className="unreceived-card-header">
              <span className="unreceived-card-label">{t.label}</span>
              <span className="unreceived-card-stage">{stage}</span>
            </div>
            {settled ? (
              <p className="unreceived-card-settled-msg">{t.settledLabel}</p>
            ) : (
              <button
                className="unreceived-card-btn"
                data-testid={'heat-revisit-open-' + t.key}
                onClick={function() { onReexplore(fire.id, t.key); }}
              >
                {t.btnLabel}
              </button>
            )}
          </div>
        );
      })}

      {/* 会い直した余熱の痕跡 */}
      {fire.heatTraces && fire.heatTraces.length > 0 && (
        <div className="unreceived-traces">
          {fire.heatTraces.slice(-3).map(function(ht, i) {
            return (
              <p key={i} className="unreceived-trace-line">・{ht.traceText}</p>
            );
          })}
        </div>
      )}

      {/* 3領域すべて静かな痕跡になったら、火を心へ返す（このサイクルの終点） */}
      {allSettled ? (function() {
        var canReturn = !!(fire.receipt && fire.openedPlace && fire.openedPlace.firstEncounterSeen && fire.placeTrace);
        return (
          <div className="return-heart-box">
            <p className="return-heart-msg">
              3つの影は、もう火を覆っていない。<br />この火を、心へ返せます。
            </p>
            {canReturn ? (
              <button data-testid="final-return-open" className="return-heart-btn" onClick={function() { onReturnToHeart(fire.id); }}>
                火を心へ返す
              </button>
            ) : (
              <p className="return-heart-wait">
                {!fire.openedPlace ? '場所がまだ開いていません。' :
                 !fire.openedPlace.firstEncounterSeen ? 'まず、開いた場所でキャラクターと会ってください。' :
                 !fire.placeTrace ? '場所での記録がまだありません。' :
                 '受領証がまだありません。'}
              </p>
            )}
          </div>
        );
      })() : (function() {
        var cd = cooldownRemaining(fire.lastUnreceivedRestAt, 30);
        return (
          <button
            onClick={cd > 0 ? null : doRest}
            className="unreceived-rest-btn"
            style={{ color: cd > 0 ? '#374151' : '#8f9bb3', cursor: cd > 0 ? 'default' : 'pointer' }}
          >
            {cd > 0 ? '今日は置いておく（あと' + cd + '秒）' : '今日は置いておく'}
          </button>
        );
      })()}
    </div>
  );
}

function ShelfView({ game, onBack, onDoBattle, onWatchFire, onRestToday, onReceive, onReexplore, onRestUnreceived, onReturnToHeart, actionResult, onCloseActionResult }) {
  var [selectedId, setSelectedId] = _useState(null);
  var [receiveAnswer, setReceiveAnswer] = _useState('');
  var [phase, setPhase] = _useState('list');

  var selected = game.fires.find(function(f) { return f.id === selectedId; });

  function handleSelect(id) {
    if (selectedId === id) {
      setSelectedId(null);
      setPhase('list');
    } else {
      setSelectedId(id);
      var fire = game.fires.find(function(f) { return f.id === id; });
      if (fire && fire.status === 'searching') setPhase('battle');
      else if (fire && fire.status === 'found') setPhase('receive');
      else if (fire && fire.status === 'received') setPhase('unreceived');
      else setPhase('list');
    }
  }

  // Keep phase in sync if fire status changes externally
  _useEffect(function() {
    if (!selected) return;
    if (selected.status === 'searching' && phase !== 'battle') setPhase('battle');
    if (selected.status === 'found' && phase !== 'receive') setPhase('receive');
    if (selected.status === 'received' && phase !== 'unreceived') setPhase('unreceived');
    if (selected.status !== 'searching' && selected.status !== 'found' && selected.status !== 'received') setPhase('list');
  }, [selected && selected.status]);

  return (
    <div style={{ padding: '0 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 12px' }}>
        <button data-testid="view-back" onClick={onBack} style={{
          background: 'transparent', border: 'none', color: '#9ca3af',
          fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1,
        }}>←</button>
        <h2 style={{ color: '#e2e4ee', fontSize: 17, margin: 0 }}>残り火の棚</h2>
      </div>

      {/* 行動結果（未受領コンテキストは UnreceivedPanel 内に出すので除外） */}
      <ActionResultPanel
        result={actionResult && actionResult.context !== 'unreceived' ? actionResult : null}
        onClose={onCloseActionResult}
      />

      {game.fires.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 1.8 }}>
          まだ残り火がありません。<br />ホームから灯してみてください。
        </p>
      )}

      {game.fires.map(function(fire) {
        return (
          <FireCard
            key={fire.id}
            fire={fire}
            selected={selectedId === fire.id}
            onSelect={handleSelect}
          />
        );
      })}

      {selected && phase === 'battle' && selected.status === 'searching' && (
        <div style={{ marginTop: 8 }}>
          <ShadowPanel
            fire={selected}
            onAnswer={function(ans) {
              onDoBattle(selected.id, ans);
              setPhase('list');
              setSelectedId(null);
            }}
            onWatch={function() {
              onWatchFire(selected.id);
              setPhase('list');
              setSelectedId(null);
            }}
            onSkip={function() {
              onRestToday(selected.id);
              setPhase('list');
              setSelectedId(null);
            }}
          />
        </div>
      )}

      {selected && phase === 'receive' && selected.status === 'found' && (
        <div style={{
          background: '#0f1119', border: '1px solid #7c3aed',
          borderRadius: 12, padding: '20px 18px', marginTop: 8,
        }}>
          <p style={{ color: '#a78bfa', fontSize: 13, marginBottom: 4 }}>問いの欠片</p>
          <p style={{ color: '#ede9fe', fontSize: 16, lineHeight: 1.8, margin: '0 0 16px' }}>
            {selected.question}
          </p>
          <p style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.8, margin: '0 0 14px' }}>
            記録塔へ届けると、問いの旅が始まります。<br />
            旅の中で、この火と会い直せます。
          </p>
          <button
            onClick={function() { onReceive(selected.id); }}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 8,
              background: '#4c1d95', border: 'none', color: '#ede9fe',
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
            }}
          >
            問いを開く
          </button>
        </div>
      )}

      {selected && phase === 'unreceived' && selected.status === 'received' && (
        <UnreceivedPanel
          fire={selected}
          onReexplore={onReexplore}
          onRest={onRestUnreceived}
          onReturnToHeart={onReturnToHeart}
          actionResult={actionResult}
          onCloseActionResult={onCloseActionResult}
        />
      )}
    </div>
  );
}

// 記録塔。記録レイヤーを「記録／余熱／返却灯」の最小タブで整理する。
// 記録: 受領証・問いの足跡 ／ 余熱: placeTrace・heatTraces・受け取られた言葉 ／ 返却灯: returnLamp・finalReturn
function RecordTower({ game, onGoUnreceived, onViewReceipt, onViewReturnLamp }) {
  var records = game.fires.filter(function(f) {
    return f.status === 'received' || f.status === 'held' || f.status === 'returned';
  });
  var statusText = { received: '余熱あり', held: '保持中', returned: '心へ返した' };
  var TABS = ['記録', '余熱', '返却灯'];
  var [tab, setTab] = _useState('記録');

  var shown = records.filter(function(f) {
    if (tab === '返却灯') return f.status === 'returned' && f.returnLamp;
    if (tab === '余熱') {
      return (f.placeTrace) || (f.heatTraces && f.heatTraces.length) || (f.characterResponses && f.characterResponses.length);
    }
    return true; // 記録
  });

  function heatList(fire) {
    return (fire.heatTraces || []).map(function(h) { return h.traceText; });
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      <h3 style={{ color: '#a78bfa', fontSize: 15, margin: '0 0 12px' }}>記録塔</h3>
      <div className="tower-tabs" role="tablist">
        {TABS.map(function(t) {
          return (
            <button key={t} role="tab" aria-selected={tab === t}
              data-testid={'tower-tab-' + (t === '記録' ? 'records' : t === '余熱' ? 'heat' : 'lamp')}
              className={'tower-tab' + (tab === t ? ' tower-tab-on' : '')}
              onClick={function() { setTab(t); }}>{t}</button>
          );
        })}
      </div>
      {shown.length === 0 && (
        <p style={{ color: '#8f9bb3', fontSize: 13, marginTop: 12 }}>
          {tab === '返却灯' ? 'まだ心へ返した火はありません。' : tab === '余熱' ? 'まだ余熱の記録はありません。' : 'まだ記録がありません。'}
        </p>
      )}
      {shown.map(function(fire) {
        return (
          <div key={fire.id} className="tower-rec">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <p style={{ color: '#e2e4ee', fontSize: 13, margin: 0, overflowWrap: 'anywhere' }}>{fire.kindle}</p>
              <span style={{ color: fire.status === 'returned' ? '#9ca3af' : '#a78bfa', fontSize: 10, whiteSpace: 'nowrap' }}>
                {statusText[fire.status] || fire.status}
              </span>
            </div>

            {/* 記録タブ: 問い + 問いの足跡 + 受領証 */}
            {tab === '記録' && (
              <React.Fragment>
                {/* 問いの変遷 — 置き直していれば最初と今を並べる。最初の問いは消さない。 */}
                {(fire.questionRevisions && fire.questionRevisions.length > 0) ? (
                  <div className="qhist">
                    <p className="qhist-label">問いの変遷</p>
                    <p className="qhist-line"><span className="qhist-k">最初の問い</span>{originalQuestion(fire)}</p>
                    <p className="qhist-line"><span className="qhist-k">置き直した問い</span>{currentQuestion(fire)}</p>
                  </div>
                ) : (
                  originalQuestion(fire) && (
                    <p style={{ color: '#7c3aed', fontSize: 12, margin: '0 0 6px', lineHeight: 1.6 }}>✦ {originalQuestion(fire)}</p>
                  )
                )}
                <QuestionFootprints fire={fire} limit={3} variant="receipt" />
                {onViewReceipt && fire.receipt && (
                  <button data-testid="receipt-open" className="tower-rec-btn" onClick={function() { onViewReceipt(fire.id); }}>受領証を見る</button>
                )}
              </React.Fragment>
            )}

            {/* 余熱タブ: placeTrace / heatTraces / 受け取られた言葉 */}
            {tab === '余熱' && (
              <React.Fragment>
                {fire.placeTrace && fire.placeTrace.traceText && (
                  <p className="tower-line"><span className="tower-line-k">場所の痕跡</span>{fire.placeTrace.traceText}</p>
                )}
                {heatList(fire).slice(-4).map(function(t, i) {
                  return <p key={i} className="tower-line"><span className="tower-line-k">余熱</span>{t}</p>;
                })}
                {(fire.characterResponses || []).slice(-3).map(function(r, i) {
                  return (
                    <p key={'r' + i} className="tower-line">
                      <span className="tower-line-k" style={{ color: RESPONSE_COLORS[r.character] || '#5a6478' }}>
                        {RESPONSE_NAMES[r.character] || r.character}
                      </span>{r.text.split('\n')[0]}
                    </p>
                  );
                })}
                {fire.status === 'received' && onGoUnreceived && (
                  <button className="tower-rec-btn tower-rec-btn-heat" onClick={function() { onGoUnreceived(fire.id); }}>余熱に会い直す →</button>
                )}
              </React.Fragment>
            )}

            {/* 返却灯タブ: returnLamp / finalReturn */}
            {tab === '返却灯' && fire.returnLamp && (
              <React.Fragment>
                <div className="tower-lamp">
                  <p className="tower-lamp-lead">この火は、心へ返されました。<br />消失ではなく、返却です。</p>
                  {fire.returnLamp.label && (
                    <p className="tower-lamp-line"><span className="tower-lamp-k">返し方</span>「{fire.returnLamp.label}」</p>
                  )}
                  {fire.returnLamp.memo && (
                    <p className="tower-lamp-line"><span className="tower-lamp-k">最後の一言</span>{fire.returnLamp.memo}</p>
                  )}
                </div>
                {onViewReturnLamp && (
                  <button data-testid="return-lamp-open" className="tower-rec-btn tower-rec-btn-lamp" onClick={function() { onViewReturnLamp(fire.id); }}>返却灯を見る</button>
                )}
              </React.Fragment>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 受領の旅 5層 ────────────────────────────────────────────────────────────

var JOURNEY_LAYERS = [
  {
    id: 'intro', isIntro: true,
    place: '記録塔の入口',
  },
  {
    id: 'kindle', isKindle: true,
    place: '記録塔・本文の間',
  },
  {
    id: 'stability', isStability: true,
    place: '記録塔・守護の間',
  },
  {
    id: 'metrics', isMetrics: true,
    place: '記録塔',
  },
  {
    id: 'silence', isSilence: true,
    place: '記録塔・沈黙の間',
  },
];

// ── 受領証カード ────────────────────────────────────────────────────────────

// 問いの足跡。影と向き合った時に置いた言葉（fire.answers）は「答え」ではない。
// 森で火に触れて残った足跡。文字列でも {text, at} でも受け、最新 limit 件を返す。
function getQuestionFootprints(fire, limit) {
  limit = limit || 3;
  return (fire.answers || [])
    .map(function(a) { return typeof a === 'string' ? { text: a } : a; })
    .filter(function(a) { return a && a.text && a.text.trim(); })
    .slice(-limit);
}

// 問いの足跡の共通表示ブロック。呼び名は必ず「問いの足跡」。
function QuestionFootprints({ fire, limit, variant }) {
  var fps = getQuestionFootprints(fire, limit || 3);
  if (!fps.length) return null;
  return (
    <div className={'footprints' + (variant ? ' footprints-' + variant : '')}>
      <p className="footprints-label">問いの足跡</p>
      {fps.map(function(fp, i) {
        return <p key={i} className="footprints-line">「{fp.text.trim()}」</p>;
      })}
    </div>
  );
}

function ReceiptCard({ fire, buttonLabel, onAction }) {
  var receipt = fire.receipt;
  var issuedDate = receipt ? new Date(receipt.issuedAt) : new Date(fire.receivedAt || fire.updatedAt);
  var dateStr = issuedDate.getFullYear() + '/' +
    String(issuedDate.getMonth() + 1).padStart(2, '0') + '/' +
    String(issuedDate.getDate()).padStart(2, '0');

  var metricDeltas   = receipt && receipt.metricDeltas;
  var initialMetrics = receipt && receipt.initialMetrics;
  var currentMetrics = receipt && receipt.currentMetrics;
  var stability      = receipt && receipt.stability;
  var traces         = stability && stability.traces;

  return (
    <div className="receipt-card">
      <p className="receipt-title">受領証</p>

      {/* 1. 受け取り文 — 最初に届ける */}
      {receipt && receipt.acceptanceText && (
        <div className="receipt-acceptance" style={{ marginTop: 6 }}>
          <p className="receipt-acceptance-text" style={{ fontSize: 15, color: '#c4b5fd' }}>
            {receipt.acceptanceText}
          </p>
          {receipt.holdText && <p className="receipt-hold-text">{receipt.holdText}</p>}
        </div>
      )}

      {/* 2. 次の問いへ */}
      {receipt && receipt.nextQuestion && (
        <div className="receipt-next-q">
          <p className="receipt-next-q-label">次の問いへ</p>
          <p className="receipt-next-q-text">{receipt.nextQuestion}</p>
        </div>
      )}

      {/* 3. 火の安定 + 守られた痕跡 */}
      {stability && (
        <div style={{ margin: '10px 0', padding: '8px 12px', background: '#0a0c14', borderRadius: 8, border: '1px solid #1e2230' }}>
          <div style={{ marginBottom: traces && traces.length > 0 ? 6 : 0 }}>
            <span style={{ color: '#374151', fontSize: 10, letterSpacing: 1 }}>火の安定</span>
            <span style={{ color: '#34d399', fontSize: 12, marginLeft: 10, fontFamily: 'monospace' }}>
              {stability.value}% ／ {stability.stage}
            </span>
          </div>
          {traces && traces.length > 0 && (
            <div>
              <span style={{ color: '#374151', fontSize: 10, letterSpacing: 1 }}>守られた痕跡</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {traces.map(function(t) {
                  return (
                    <span key={t} style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 8,
                      background: '#0f1420', color: '#34d399', border: '1px solid #1e3828',
                    }}>{t}</span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. 三軸の変化 */}
      {metricDeltas && initialMetrics && currentMetrics && (
        <div className="receipt-metrics-section">
          {[
            { key: 'meaning', label: '意味' },
            { key: 'value',   label: '価値' },
            { key: 'satisfaction', label: '納得' },
          ].map(function(m) {
            var delta = metricDeltas[m.key] || 0;
            var cls = 'receipt-metric-delta' + (delta > 0 ? ' pos' : delta < 0 ? ' neg' : '');
            return (
              <div key={m.key} className="receipt-metric-line">
                <span className="receipt-metric-name">{m.label}</span>
                <span className={cls}>
                  {initialMetrics[m.key]} → {currentMetrics[m.key]} （{fmtDelta(delta)}）
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. 詳細 */}
      <div className="receipt-row" style={{ marginTop: 12 }}>
        <p className="receipt-label">残り火</p>
        <p className="receipt-value receipt-ember">「{fire.kindle}」</p>
      </div>
      {fire.question && (
        <div className="receipt-row">
          <p className="receipt-label">問い</p>
          <p className="receipt-value">「{fire.question}」</p>
        </div>
      )}

      {/* 問いの足跡 — 影と向き合って置いた言葉。答えではなく、触れた跡。 */}
      <QuestionFootprints fire={fire} limit={3} variant="receipt" />

      <div className="receipt-meta">
        <span className="receipt-meta-item">持ち帰った者：トイマン</span>
        <span className="receipt-meta-item">記録した者：コタエ</span>
        <span className="receipt-meta-item">発行日：{dateStr}</span>
      </div>

      {/* 受領証の裏の地図 — 終わりではなく、次の扉。 */}
      {fire.openedPlace && (
        <div className="receipt-place">
          <p className="receipt-place-map">{fire.openedPlace.map}</p>
          <p className="receipt-place-lead">受領証の裏に、小さな地図が現れました。</p>
          <div className="receipt-place-box">
            <p className="receipt-place-k">次に開いた場所</p>
            <p className="receipt-place-name">{fire.openedPlace.name}</p>
            <p className="receipt-place-k receipt-place-k2">理由</p>
            <p className="receipt-place-reason">{fire.openedPlace.reason}</p>
          </div>
          <div className="receipt-place-voices">
            <p className="receipt-place-voice">
              <span className="receipt-place-who kotae">コタエ</span>
              記録は終わりました。でも、余熱は残っています。
            </p>
            <p className="receipt-place-voice">
              <span className="receipt-place-who toyman">トイマン</span>
              なら、会いに行く。
            </p>
          </div>
        </div>
      )}

      <button data-testid="receipt-action" className="receipt-btn" onClick={onAction}>
        {buttonLabel || '余熱に会い直す'}
      </button>
    </div>
  );
}

// ── 返却灯 ───────────────────────────────────────────────────────────────────
// 心へ返した火の「灯り」。記録の全部ではない。ぱっと見て「この火は消えていない」と分かるもの。
// 見せるのは 最後の一言／返し方／問いの足跡1件／受け取られた言葉1件 だけ。
// 原文・問い・受け取り文・場所の痕跡・会い直した余熱の詳細は、受領証や記録塔で見る。
function ReturnLampCard({ fire, onClose }) {
  var lamp = fire.returnLamp || {};
  var litDate = lamp.litAt ? new Date(lamp.litAt) : (fire.returnedAt ? new Date(fire.returnedAt) : null);
  var dateStr = litDate
    ? (litDate.getFullYear() + '/' + String(litDate.getMonth() + 1).padStart(2, '0') + '/' + String(litDate.getDate()).padStart(2, '0'))
    : '';

  var trapRef = useFocusTrap();
  return (
    <div data-testid="return-lamp-card" className="return-lamp-card" ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="lamp-title">
      <div className="return-lamp-flame" aria-hidden="true">🏮</div>
      <p className="return-lamp-title" id="lamp-title">返却灯</p>
      {/* どの火かが分かる最小の手がかりだけ（一行）。詳細は受領証/記録塔へ。 */}
      {fire.kindle && <p className="return-lamp-kindle">「{fire.kindle}」</p>}
      <p className="return-lamp-lead">この火は、心へ返されました。<br />消失ではなく、返却です。</p>

      {/* 今の問い（置き直していれば最新、していなければ最初の問い）を1行だけ。 */}
      {currentQuestion(fire) && (
        <div className="return-lamp-nowq">
          <span className="return-lamp-nowq-k">今の問い</span>
          <span className="return-lamp-nowq-v">{currentQuestion(fire)}</span>
        </div>
      )}

      {/* 問いの足跡 — 最新1件だけ（灯りは軽く）。 */}
      <QuestionFootprints fire={fire} limit={1} variant="lamp" />

      {/* 足跡を受け取った住人の一言（最新1件だけ）。 */}
      {(function() {
        var fr = (fire.characterResponses || []).filter(function(r) { return r.source === 'footprint'; });
        if (!fr.length) return null;
        var last = fr[fr.length - 1];
        return (
          <div className="return-lamp-response">
            <span className="return-lamp-response-who" style={{ color: RESPONSE_COLORS[last.character] || '#9aa3b5' }}>
              {RESPONSE_NAMES[last.character] || last.character}
            </span>
            <span className="return-lamp-response-text">{last.text.split('\n')[0]}</span>
          </div>
        );
      })()}

      {/* 返し方 */}
      {lamp.label && (
        <div className="return-lamp-choice">
          <p className="return-lamp-choice-label">返し方</p>
          <p className="return-lamp-choice-text">「{lamp.label}」</p>
        </div>
      )}

      {/* 最後の一言 */}
      {lamp.memo ? (
        <div className="return-lamp-memo">
          <p className="return-lamp-memo-label">最後の一言</p>
          <p className="return-lamp-memo-text">{lamp.memo}</p>
        </div>
      ) : (
        <p className="return-lamp-memo-empty">最後の一言は、残されませんでした。</p>
      )}

      {/* トイマン・コタエ */}
      <div className="return-lamp-voices">
        <p className="return-lamp-voice">
          <span className="return-lamp-who toyman">トイマン</span>帰った。
        </p>
        <p className="return-lamp-voice">
          <span className="return-lamp-who kotae">コタエ</span>消失ではありません。<br />返却です。
        </p>
      </div>

      {dateStr && <p className="return-lamp-date">返した日：{dateStr}</p>}

      <button className="receipt-btn return-lamp-btn" onClick={onClose}>閉じる</button>
    </div>
  );
}

// ── 受領の旅 コンポーネント ─────────────────────────────────────────────────

function buildIntroDialogue() {
  return [
    { name: 'トイマン', color: '#fb923c', text: '戻った。' },
    { name: 'トイマン', color: '#fb923c', text: '答えではない。\nでも、欠片はあった。' },
    { name: 'コタエ',   color: '#a78bfa', text: 'ノコリビ、確認しました。\n記録を開始します。' },
    { name: 'トイマン', color: '#fb923c', text: 'なら、預ける。' },
  ];
}

function buildKindleDialogue(fire) {
  var kindleQuoted = fire.kindle ? '「' + fire.kindle + '」' : '（本文なし）';
  var lines = [
    { name: 'コタエ', color: '#a78bfa', text: '本文を、そのまま読み上げます。' },
    { name: 'コタエ', color: '#a78bfa', text: kindleQuoted },
    { name: 'コタエ', color: '#a78bfa', text: '分類は、まだしません。\n先に、欠けないように置きます。' },
    { name: 'トイマン', color: '#fb923c', text: '……消すな。' },
    { name: 'コタエ',   color: '#a78bfa', text: '消しません。' },
  ];
  if (fire.wishUnknown) {
    // 初回入力で「まだ分からない」を選んだ、または選ばなかった火。
    // 場所を急いで決めない——プレイヤーが感触を確かめてから自然に開かせる。
    lines.push({
      name: 'コタエ', color: '#a78bfa',
      text: 'この火は、まだ一つの場所に分けません。\n\n意味の影。\n価値の黒札。\n納得の灰。\n\nどれも、まだ薄く残っています。\n分類は、あとです。',
    });
  }
  return lines;
}

function buildStabilityDialogue(fire) {
  var gp = fire.gardenProgress || 0;
  var stage = stabilityStage(gp);
  var stabilityLine = '火の安定：' + gp + '% ／ ' + stage;
  var kotaeLine;
  if (gp >= 85) {
    kotaeLine = 'この火は、よく守られていました。\n急がされずに、ここまで届いています。';
  } else if (gp >= 60) {
    kotaeLine = '落ち着いた状態で届きました。';
  } else if (gp >= 30) {
    kotaeLine = 'まだ少し揺れています。\n丁寧に記録します。';
  } else {
    kotaeLine = 'この火は、まだ揺れています。\n欠けないよう、慎重に記録します。';
  }
  return [
    { name: 'コタエ', color: '#a78bfa', text: kotaeLine + '\n\n' + stabilityLine },
  ];
}

function ReceiptJourney({ fire, onJourneyDone }) {
  var [layerIdx, setLayerIdx] = _useState(0);
  var [dialogueStep, setDialogueStep] = _useState(0);
  var [metrics, setMetrics] = _useState(
    fire.metrics
      ? { meaning: fire.metrics.meaning, value: fire.metrics.value, satisfaction: fire.metrics.satisfaction }
      : { meaning: 50, value: 50, satisfaction: 50 }
  );

  var introDialogue   = React.useMemo(function() { return buildIntroDialogue(); }, []);
  var kindleDialogue  = React.useMemo(function() { return buildKindleDialogue(fire); }, []);
  var stabilityDialogue = React.useMemo(function() { return buildStabilityDialogue(fire); }, []);

  var layer = JOURNEY_LAYERS[layerIdx];
  var isMetrics   = !!layer.isMetrics;
  var isSilence   = !!layer.isSilence;
  var isKindle    = !!layer.isKindle;
  var isStability = !!layer.isStability;
  var isIntro     = !!layer.isIntro;

  var activeDialogue = isIntro ? introDialogue
    : isKindle    ? kindleDialogue
    : isStability ? stabilityDialogue
    : [];
  var hasDialogue    = activeDialogue.length > 0;
  var isLastDialogue = !hasDialogue || dialogueStep >= activeDialogue.length - 1;

  function goNextLayer() {
    var nextIdx = layerIdx + 1;
    if (nextIdx >= JOURNEY_LAYERS.length) {
      onJourneyDone({ currentMetrics: metrics });
    } else {
      setLayerIdx(nextIdx);
      setDialogueStep(0);
    }
  }

  function advance() {
    if (!isLastDialogue) {
      setDialogueStep(function(s) { return s + 1; });
    } else {
      goNextLayer();
    }
  }

  function renderDialogue(lines, step) {
    return lines.slice(0, step + 1).map(function(dl, i) {
      var isCurrent = i === step;
      var isNarrative = !dl.name;
      var prevDl = i > 0 ? lines[i - 1] : null;
      var showHeader = !isNarrative && (i === 0 || !prevDl || !prevDl.name || prevDl.name !== dl.name);
      return (
        <div key={i}>
          {showHeader && (
            <div className={'kotae-head' + (i > 0 ? ' journey-speaker-gap' : '')}>
              <span className="kotae-dot" style={{ background: dl.color }} />
              <span className="kotae-name" style={{ color: dl.color }}>{dl.name}</span>
            </div>
          )}
          <p className={'kotae-line' + (isCurrent ? ' kotae-line-now' : '')}
             style={isNarrative ? { fontStyle: 'italic', color: '#6b7280', textAlign: 'center', lineHeight: 2, whiteSpace: 'pre-line' } : { whiteSpace: 'pre-line' }}>
            {dl.text}
          </p>
        </div>
      );
    });
  }

  var silenceLines = [
    { name: null, color: null, text: '記録塔は、しばらく静かだった。\n\nコタエは、火のそばに置いた紙片を\nそっと並べ直した。\n\nトイマンは、黙って見ていた。' },
    { name: 'コタエ', color: '#a78bfa', text: '受領証を、発行します。' },
  ];

  return (
    <div className="kotae-ov">
      <div className="kotae-sheet" onClick={function(e) { e.stopPropagation(); }}>
        <div className="kotae-grip" />

        {/* 進捗ドット */}
        <div className="journey-progress">
          {JOURNEY_LAYERS.map(function(l, i) {
            var cls = 'journey-dot';
            if (i < layerIdx) cls += ' done';
            else if (i === layerIdx) cls += ' active';
            return <div key={i} className={cls} />;
          })}
        </div>

        <p style={{ color: '#4b5563', fontSize: 10, margin: '0 0 10px', letterSpacing: 1 }}>{layer.place}</p>

        {/* 対話セクション（イントロ・本文・安定） */}
        {(isIntro || isKindle || isStability) && hasDialogue && (
          <div>
            {renderDialogue(activeDialogue, dialogueStep)}
            <button data-testid="receipt-journey-next" className="kotae-btn" onClick={advance}>
              {isLastDialogue ? '次へ ▽' : '▽ つづき'}
            </button>
          </div>
        )}

        {/* 感触スライダー */}
        {isMetrics && (
          <div>
            <div className="kotae-head">
              <span className="kotae-dot" style={{ background: '#a78bfa' }} />
              <span className="kotae-name" style={{ color: '#a78bfa' }}>コタエ</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.8, margin: '0 0 14px' }}>
              今、この火をどのように感じていますか？
            </p>
            {[
              { key: 'meaning',      label: '意味があった' },
              { key: 'value',        label: '価値があった' },
              { key: 'satisfaction', label: '納得があった' },
            ].map(function(m) {
              var mKey = m.key;
              return (
                <div key={mKey} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#d1d5db', fontSize: 13 }}>{m.label}</span>
                    <span style={{ color: '#a78bfa', fontSize: 12 }}>{metrics[mKey]}</span>
                  </div>
                  <input
                    type="range" min={0} max={100}
                    value={metrics[mKey]}
                    onChange={function(e) {
                      var val = Number(e.target.value);
                      setMetrics(function(prev) { var n = Object.assign({}, prev); n[mKey] = val; return n; });
                    }}
                    style={{ width: '100%', accentColor: '#7c3aed' }}
                  />
                  {fire.metrics && fire.metrics[mKey] !== undefined && (
                    <p style={{ color: '#374151', fontSize: 10, margin: '2px 0 0' }}>
                      灯した時：{fire.metrics[mKey]}
                    </p>
                  )}
                </div>
              );
            })}
            <button data-testid="receipt-journey-next" className="kotae-btn" onClick={goNextLayer}>
              次へ ▽
            </button>
          </div>
        )}

        {/* 沈黙 */}
        {isSilence && (
          <div>
            {renderDialogue(silenceLines, dialogueStep)}
            {isLastDialogue ? (
              <button data-testid="receipt-journey-next" className="kotae-btn" onClick={function() { onJourneyDone({ currentMetrics: metrics }); }}>
                受領する
              </button>
            ) : (
              <button data-testid="receipt-journey-next" className="kotae-btn" onClick={function() { setDialogueStep(function(s) { return s + 1; }); }}>
                ▽ つづき
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// コタエの会話台本。コタエが画面に出る時は必ずいずれかの本文を表示する（無言にしない）。
var KOTAE_SCRIPTS = {
  receive: {
    lines: [
      'ノコリビ、受領しました。',
      'これは答えではありません。\n問いの欠片です。',
      '記録塔に保存します。\nただし、火の奥には、まだ余熱が残っています。',
      '残っているもの。\n意味の影。価値の黒札。納得の灰。',
      'これは診断ではありません。\nまだ受け取られていない、というだけのことです。',
      'この火は、まだ全部を受け取られたわけではありません。',
      '次に進めます。\nどこから迎えに行くか、選んでください。',
    ],
    button: '余熱に会い直す',
  },
  open: {
    lines: ['余熱に会い直します。\nまだ受け取れていないものを確認してください。'],
    button: '確認する',
  },
  returned: {
    lines: ['この火は、心へ返されました。', '消えたのではありません。\n記録として残っています。'],
    button: '閉じる',
  },
};

function KotaeDialog({ kind, onConfirm }) {
  var script = KOTAE_SCRIPTS[kind] || KOTAE_SCRIPTS.receive;
  var [step, setStep] = _useState(0);
  var isLast = step >= script.lines.length - 1;
  function advance() {
    if (isLast) onConfirm();
    else setStep(function(s) { return s + 1; });
  }
  return (
    <div className="kotae-ov" onClick={advance}>
      <div className="kotae-sheet" onClick={function(e) { e.stopPropagation(); }}>
        <div className="kotae-grip" />
        <div className="kotae-head">
          <span className="kotae-dot" />
          <span className="kotae-name">コタエ</span>
        </div>
        {script.lines.slice(0, step + 1).map(function(line, i) {
          return <p key={i} className={'kotae-line' + (i === step ? ' kotae-line-now' : '')}>{line}</p>;
        })}
        <button className="kotae-btn" onClick={advance}>
          {isLast ? script.button : '▽ つづき'}
        </button>
      </div>
    </div>
  );
}

function EncounterDialog({ encounterId, onConfirm }) {
  var def = ENCOUNTER_DEFS[encounterId];
  if (!def) return null;
  var [step, setStep] = _useState(0);
  var isLast = step >= def.lines.length - 1;
  function advance() {
    if (isLast) onConfirm();
    else setStep(function(s) { return s + 1; });
  }
  return (
    <div className="kotae-ov" onClick={advance}>
      <div className="kotae-sheet" onClick={function(e) { e.stopPropagation(); }}>
        <div className="kotae-grip" />
        <p style={{ color: '#4b5563', fontSize: 10, margin: '0 0 4px', letterSpacing: 1 }}>{def.place}</p>
        <div className="kotae-head">
          <span className="kotae-dot" style={{ background: def.characterColor }} />
          <span className="kotae-name" style={{ color: def.characterColor }}>{def.character}</span>
        </div>
        {def.lines.slice(0, step + 1).map(function(line, i) {
          return <p key={i} className={'kotae-line' + (i === step ? ' kotae-line-now' : '')}>{line}</p>;
        })}
        {isLast && (def.worldNote || def.relationshipNote) && (
          <div style={{ margin: '12px 0 6px', padding: '10px 12px', borderRadius: 8, background: '#0a0c14', border: '1px solid #1e2230' }}>
            {def.worldNote && (
              <p style={{ color: '#4b5563', fontSize: 11, margin: '0 0 6px', lineHeight: 1.6 }}>
                📖 {def.worldNote}
              </p>
            )}
            {def.relationshipNote && (
              <p style={{ color: '#374151', fontSize: 11, margin: 0, lineHeight: 1.6 }}>
                ◦ {def.character}：{def.relationshipNote.text}
              </p>
            )}
          </div>
        )}
        <button className="kotae-btn" onClick={advance}>
          {isLast ? def.button : '▽ つづき'}
        </button>
      </div>
    </div>
  );
}

var GARDEN_ITEM_DEFS = {
  small_stone:      { emoji: '🪨', label: '小さな石',   anim: null },
  rest_chair:       { emoji: '🪑', label: '小さな椅子', anim: null },
  water_drop:       { emoji: '💧', label: '水滴',       anim: 'water' },
  burnt_paper:      { emoji: '📄', label: '焦げ紙片',   anim: null },
  record_light:     { emoji: '🗼', label: '塔の灯り',   anim: 'blink' },
  meaning_fragment: { emoji: '✦',  label: '意味片',     anim: null },
  black_tag:        { emoji: '▪',  label: '黒い札',     anim: null },
  small_seed:       { emoji: '🌱', label: '未完の種',   anim: null },
  lamp_stand:       { emoji: '🕯', label: '灯火台',     anim: 'blink' },
  paper_box:        { emoji: '📦', label: '焦げ紙箱',   anim: null },
  returned_ember:   { emoji: '🏮', label: '還した火',   anim: 'blink' },
  stone_circle:     { emoji: '🪨', label: '石の輪',     anim: null },
};

// GardenBoard のアイテム表示ヘルパー
function GardenItem({ def, isNew, count }) {
  var cls = 'garden-item';
  if (isNew) cls += ' garden-trace-appear';
  if (def.anim === 'blink') cls += ' garden-blink';
  if (def.anim === 'water') cls += ' garden-water';
  return (
    <div className={cls}>
      <span className="garden-item-emoji">{def.emoji}</span>
      <span className="garden-item-label">{def.label}{count > 1 ? ' ×' + count : ''}</span>
    </div>
  );
}

function WorkerPanel({ game }) {
  var lk = game.workerTasks && game.workerTasks.lightkeeper;
  if (!lk || !lk.isUnlocked || !game.tinyfolk.lightkeeper) return null;
  // 灯守りは searching の火がある時だけ進む（received だけの時は止まって見えるので隠す）
  var hasSearching = game.fires.some(function(f) { return f.status === 'searching'; });
  if (!hasSearching) return null;
  var progress = lk.progress || 0;
  return (
    <div className="worker-panel">
      <p className="worker-panel-label">作業中</p>
      <div className="worker-task-row">
        <span className="worker-task-name">🧍 {lk.label}</span>
        <span className="worker-task-work">{lk.work}</span>
        <div className="worker-task-bar-wrap">
          <div className="worker-task-bar-fill" style={{ width: progress + '%' }} />
        </div>
        <span className="worker-task-pct">{progress}%</span>
      </div>
      <p className="worker-task-hint">次に残る痕跡：小さな石 🪨</p>
    </div>
  );
}

function GardenBoard({ game }) {
  var sf    = game.fires.find(function(f) { return f.status === 'searching'; });
  var gp    = sf ? (sf.gardenProgress || 0) : 0;
  var items = game.gardenItems || [];
  var folk  = game.tinyfolk || {};
  var mat   = safeMat(game.materials);
  var ve    = game.lastVisualEvent;
  var now   = Date.now();
  var freshTrace = (ve && ve.trace && (now - new Date(ve.at).getTime()) < 3000) ? ve.trace : null;
  var counts = game.gardenItemCounts || {};

  function Item(key) {
    var def = GARDEN_ITEM_DEFS[key];
    if (!def) return null;
    return <GardenItem key={key} def={def} isNew={freshTrace === key} count={counts[key]} />;
  }

  var showTop = (items.includes('record_light') || game.unlocks.recordTower || items.includes('meaning_fragment') || items.includes('returned_ember'));
  var showLeft = (folk.paperCollector || items.includes('burnt_paper') || mat.paper > 0 || gp >= 40);
  var showRight = (folk.lightkeeper || items.includes('small_stone') || gp >= 20 || items.includes('lamp_stand'));
  var showBottom = (items.includes('rest_chair') || items.includes('water_drop') || folk.waterCarrier || game.unlocks.tearsSpring);
  var showBL = (items.includes('small_seed') || mat.unfinishedSeed > 0);
  var showBR = (items.includes('black_tag') || mat.blackTag > 0);

  return (
    <div className="garden-stage">
      <p className="garden-stage-label">箱庭</p>

      {/* 上段：記録・意味 */}
      {showTop && (
        <div className="garden-area-top-center">
          {(items.includes('record_light') || game.unlocks.recordTower) && Item('record_light')}
          {items.includes('returned_ember') && Item('returned_ember')}
          {items.includes('meaning_fragment') && Item('meaning_fragment')}
          {folk.recordApprentice && (
            <div className="garden-item">
              <span className="garden-item-emoji">📖</span>
              <span className="garden-item-actor-label">記録見習い</span>
            </div>
          )}
        </div>
      )}

      {/* 中段：左・中央・右 */}
      <div className="garden-area">
        {/* 左列：探索・問い */}
        <div className="garden-area-left">
          {folk.paperCollector && (
            <div className="garden-item-actor">
              <span className="garden-item-actor-emoji">🧹</span>
              <span className="garden-item-actor-label">紙集め</span>
            </div>
          )}
          {(items.includes('burnt_paper') || mat.paper > 0) && Item('burnt_paper')}
          {gp >= 40 && (
            <div className="garden-item-actor">
              <span className="garden-item-actor-emoji">🌲</span>
              <span className="garden-item-actor-label">森の入口</span>
            </div>
          )}
          {items.includes('paper_box') && Item('paper_box')}
        </div>

        {/* 中央：残り火（そばにいる子は、いま向き合う火の状態に合わせる） */}
        <div className="garden-area-center">
          <span className="garden-fire-pulse" style={{ fontSize: 32, lineHeight: 1, display: 'block' }}>🔥</span>
          <div className="garden-fire-label">残り火</div>
          {(function() {
            var cf = pickCurrentFire(game.fires);
            var who = cf ? fireCompanionLine(cf).who : 'トイマン';
            return <div className="garden-fire-label">{who}</div>;
          })()}
        </div>

        {/* 右列：保全 */}
        <div className="garden-area-right">
          {folk.lightkeeper && (
            <div className="garden-item-actor-right">
              <span className="garden-item-actor-label">灯守り</span>
              <span className="garden-item-actor-emoji">🧍</span>
              {(function() {
                var lk = game.workerTasks && game.workerTasks.lightkeeper;
                var prog = lk ? (lk.progress || 0) : 0;
                return (
                  <div className="garden-lk-bar-wrap">
                    <div className="garden-lk-bar-fill" style={{ width: prog + '%' }} />
                  </div>
                );
              })()}
            </div>
          )}
          {items.includes('small_stone') && (
            <div className="garden-item-actor-right">
              <span className={['garden-item-actor-label', freshTrace === 'small_stone' ? 'garden-trace-appear' : ''].join(' ').trim()}>小さな石</span>
              <span className={['garden-item-actor-emoji', freshTrace === 'small_stone' ? 'garden-trace-appear' : ''].join(' ').trim()}>🪨</span>
            </div>
          )}
          {items.includes('lamp_stand') && Item('lamp_stand')}
        </div>
      </div>

      {/* 下段 */}
      {(showBottom || showBL || showBR) && (
        <div className="garden-area-bottom">
          <div className="garden-area-bottom-left">
            {showBL && Item('small_seed')}
          </div>
          <div className="garden-area-bottom-center">
            {items.includes('rest_chair') && Item('rest_chair')}
            {(items.includes('water_drop') || folk.waterCarrier) && Item('water_drop')}
            {game.unlocks.tearsSpring && (
              <div className="garden-item">
                <span className="garden-item-actor-emoji">🌊</span>
                <span className="garden-item-actor-label">水音</span>
              </div>
            )}
          </div>
          <div className="garden-area-bottom-right">
            {showBR && Item('black_tag')}
          </div>
        </div>
      )}

      {/* 何もない状態 */}
      {!showTop && !showLeft && !showRight && !showBottom && !showBL && !showBR && items.length === 0 && (
        <p className="garden-stage-empty">火がある。それだけでいい。</p>
      )}
    </div>
  );
}

// 直近の出来事カード
var ACTOR_LABELS = {
  toyman: 'トイマン', lightkeeper: '灯守り', paperCollector: '紙集め',
  waterCarrier: '水汲み', recordApprentice: '記録見習い', kotae: 'コタエ',
};

function EventCard({ event }) {
  if (!event) return null;
  var lines = event.message.split('\n');
  var actorLabel = ACTOR_LABELS[event.actor] || event.actor;
  return (
    <div className="garden-event-card">
      {lines.map(function(line, i) {
        return (
          <p key={i} className={i === 0 ? 'garden-event-message' : 'garden-event-message-sub'}>
            {line}
          </p>
        );
      })}
      <div className="garden-event-chips">
        <span className="garden-event-chip">{actorLabel}</span>
        <span className="garden-event-chip">{event.work}</span>
      </div>
    </div>
  );
}

// 【封印・通常UIで描画されない】旧・灯置き場（素材＋灯貨で灯りを買う市場）。
// Turn 19A で GardenView から外した。本筋の灯置き場は別途作り直す。コードは残置。
function LightMarket({ game, onBuyNewGame }) {
  var [result, setResult] = _useState(null);
  var items = game.gardenItems || [];
  var mat = safeMat(game.materials);

  function canAfford(cost) {
    if ((cost.toka || 0) > (game.toka || 0)) return false;
    if ((cost.ash || 0) > mat.ash) return false;
    if ((cost.paper || 0) > mat.paper) return false;
    return true;
  }

  function handleBuy(key) {
    var r = buyMarketItem(game, key);
    setResult(r);
    if (r.ok) onBuyNewGame(r.game);
  }

  return (
    <div style={{
      background: '#0a0b10',
      border: '1px solid #1a1d2a',
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 12,
    }}>
      <p style={{ color: '#22263a', fontSize: 9, margin: '0 0 4px', letterSpacing: 2, fontWeight: 700 }}>
        灯置き場
      </p>
      <p style={{ color: '#2e3348', fontSize: 11, lineHeight: 1.7, margin: '0 0 12px' }}>
        灯貨で、この世界に灯りを置けます。
        灯貨は買うためのものではなく、火を消さずに置いておいた痕跡です。
      </p>

      {result && (
        <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8, background: '#0d1018', border: '1px solid #1e2230' }}>
          <p style={{ color: result.ok ? '#4b6a54' : '#4b5563', fontSize: 12, margin: '0 0 4px' }}>
            {result.ok ? '灯りを置きました。' : result.reason === 'already_owned' ? 'もう置いてあります。' : '灯貨か素材が足りません。'}
          </p>
          <button onClick={function() { setResult(null); }} style={{
            padding: '3px 8px', borderRadius: 4,
            background: 'transparent', border: '1px solid #1e2230',
            color: '#374151', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
          }}>閉じる</button>
        </div>
      )}

      {LIGHT_MARKET_ITEMS.map(function(item) {
        var owned = items.includes(item.gardenItem);
        var affordable = !owned && canAfford(item.cost);
        var costParts = ['灯貨' + (item.cost.toka || 0)];
        if (item.cost.ash) costParts.push('灰片' + item.cost.ash);
        if (item.cost.paper) costParts.push('紙片' + item.cost.paper);
        var costStr = costParts.join(' / ');
        return (
          <div key={item.key} style={{
            marginBottom: 8, padding: '10px 12px', borderRadius: 8,
            background: '#111318', border: '1px solid ' + (owned ? '#1e2a1e' : '#1e2230'),
            opacity: owned ? 0.55 : 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
              <span style={{ color: owned ? '#374151' : '#9ca3af', fontSize: 13 }}>
                {GARDEN_ITEM_DEFS[item.gardenItem] ? GARDEN_ITEM_DEFS[item.gardenItem].emoji + ' ' : ''}{item.name}
              </span>
              <span style={{ color: '#4b5563', fontSize: 10 }}>{costStr}</span>
            </div>
            <p style={{ color: '#374151', fontSize: 11, margin: '0 0 8px', lineHeight: 1.5 }}>{item.desc}</p>
            {owned ? (
              <span style={{ color: '#1e4a20', fontSize: 11 }}>灯した</span>
            ) : (
              <button
                onClick={function() { handleBuy(item.key); }}
                style={{
                  padding: '5px 11px', borderRadius: 6, fontSize: 12,
                  background: 'transparent',
                  border: '1px solid ' + (affordable ? '#c2410c' : '#2e3348'),
                  color: affordable ? '#f97316' : '#374151',
                  cursor: affordable ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                {affordable ? '灯りを置く' : '灯貨不足'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

var TINYFOLK_ACTIVITY = {
  lightkeeper:      '火のそばで作業中',
  paperCollector:   '焦げた紙片を探している',
  waterCarrier:     '水を汲んでいる',
  recordApprentice: '記録塔で写している',
};

// actionResult は各ゲームロジック関数（watchFire / restToday / doBattle /
// completeReceiptJourney / reexploreFire / restUnreceived）が実処理の結果として返す。
// UI は受け取った result を表示するだけで、予測は行わない。
function ActionResultPanel({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="action-result">
      <div className="action-result-header">
        <p className="action-result-title">{result.title}</p>
        <button className="action-result-close" onClick={onClose}>✕</button>
      </div>

      {/* 0. 変化量（未受領領域の再探索など） */}
      {result.progress && (
        <div className="action-result-progress">
          <div className="arp-row">
            <span className="arp-label">{result.progress.label}</span>
            <span className="arp-delta">
              {result.progress.before}% → {result.progress.after}%
              <span className="arp-minus"> （-{result.progress.delta}）</span>
            </span>
          </div>
          {result.progress.stageChanged && (
            <p className="arp-stage">{result.progress.beforeStage} → {result.progress.afterStage}</p>
          )}
        </div>
      )}

      {/* 1. 増えたもの */}
      {result.gains && result.gains.length > 0 && (
        <div className="action-result-section">
          <p className="action-result-section-label">増えたもの</p>
          {result.gains.map(function(g, i) {
            return <p key={i} className="action-result-gain">{g.label} +{g.amount}</p>;
          })}
        </div>
      )}

      {/* 2. 作業（途中経過） */}
      {result.work && result.work.length > 0 && (
        <div className="action-result-section">
          <p className="action-result-section-label">作業</p>
          {result.work.map(function(w, i) {
            return <p key={i} className="action-result-work">{w}</p>;
          })}
        </div>
      )}

      {/* 3. 仕事完了 */}
      {result.completions && result.completions.map(function(c, i) {
        return (
          <div key={i} className="action-result-section action-result-completion">
            <p className="action-result-section-label">仕事完了</p>
            <p className="action-result-completion-msg">{c.message}</p>
            {c.gains.map(function(g, j) {
              return <p key={j} className="action-result-gain">{g.label} +{g.amount}</p>;
            })}
          </div>
        );
      })}

      {/* 4. 箱庭に残った痕跡 */}
      {result.traces && result.traces.length > 0 && (
        <div className="action-result-section">
          <p className="action-result-section-label">箱庭に残った痕跡</p>
          {result.traces.map(function(t, i) {
            return <p key={i} className="action-result-trace">{t}</p>;
          })}
        </div>
      )}

      {/* 5. 住人の一言（問いの足跡への応答） */}
      {result.response && (
        <div className="action-result-section char-response">
          <span className="char-response-who" style={{ color: result.response.color }}>{result.response.who}</span>
          {result.response.lines.map(function(l, i) {
            return <p key={i} className="char-response-line">{l}</p>;
          })}
        </div>
      )}
    </div>
  );
}

function GardenView({ game, onBack, onGoShelf, onDoBattle, onWatchFire, onRestToday, onReceive, onUpdateLastSeen, onBuyMarket, onReexplore, onRestUnreceived, onReturnToHeart, actionResult, onCloseActionResult, activeUnreceivedFireId, onGoUnreceivedFromTower, onViewReceipt, onViewReturnLamp }) {
  var [recordOpen, setRecordOpen] = _useState(false);
  var [shadowOpen, setShadowOpen] = _useState(false);
  var [localSelectedReceivedId, setLocalSelectedReceivedId] = _useState(null);

  var sf       = game.fires.find(function(f) { return f.status === 'searching'; });
  var found    = game.fires.find(function(f) { return f.status === 'found'; });
  var received = game.fires.filter(function(f) { return f.status === 'received'; });

  // 表示する received fire を1件に絞る
  // 優先: activeUnreceivedFireId > localSelectedReceivedId > 最新 received
  var shownReceivedId = activeUnreceivedFireId || localSelectedReceivedId
    || (received.length > 0 ? received[0].id : null);
  var shownReceivedFire = received.find(function(f) { return f.id === shownReceivedId; }) || null;

  _useEffect(function() {
    if (onUpdateLastSeen) onUpdateLastSeen();
  }, []);

  // actionResult は App が各ロジック関数の返り値から保存する。
  // UI 側では予測しない。行動はハンドラを呼ぶだけ。
  function doWatch() { onWatchFire(sf.id); }
  function doRest()  { onRestToday(sf.id); }
  function doBattle(ans) { onDoBattle(sf.id, ans); setShadowOpen(false); }

  var logsSource = sf || found || (game.fires.filter(function(f) { return f.status === 'received'; })[0]) || null;
  var logLimit = 3 + ((game.gardenItems && game.gardenItems.includes('paper_box')) ? 2 : 0);
  var recentLogs = logsSource ? (logsSource.logs || []).slice(-logLimit) : [];

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 12px' }}>
        <button data-testid="view-back" onClick={onBack} style={{
          background: 'transparent', border: 'none', color: '#9ca3af',
          fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1,
        }}>←</button>
        <h2 style={{ color: '#e2e4ee', fontSize: 17, margin: 0 }}>箱庭</h2>
      </div>

      {/* 1. GardenBoard */}
      <GardenBoard game={game} />

      {/* 2. WorkerPanel */}
      <WorkerPanel game={game} />

      {/* 3. 行動ボタン（先頭側に固定して、押しても位置が動かないようにする） */}
      {sf && !shadowOpen && (function() {
        var cdRest = cooldownRemaining(sf.lastRestAt, 30);
        var wellGuarded = (sf.gardenProgress || 0) >= STABILITY_ENOUGH;
        return (
          <div className="action-btns">
            <button data-testid="shadow-open" className="btn-shadow" onClick={function() { setShadowOpen(true); }}>
              <span className="btn-shadow-icon">🌑</span>影と向き合う
            </button>
            {wellGuarded ? (
              <div className="enough-note">
                <p className="enough-note-line">火は、もう十分に守られています。</p>
                <p className="enough-note-toyman">トイマン：もう、ここにある。それでいい。</p>
              </div>
            ) : (
              <React.Fragment>
                <button className="btn-watch" onClick={doWatch}>
                  <span className="btn-watch-icon">◎</span>ただ見守る
                </button>
                <button className="btn-rest" onClick={cdRest > 0 ? null : doRest}
                  style={{ opacity: cdRest > 0 ? 0.5 : 1, cursor: cdRest > 0 ? 'default' : 'pointer' }}>
                  <span className="btn-rest-icon">…</span>
                  {cdRest > 0 ? '今日は無理（あと' + cdRest + '秒）' : '今日は無理'}
                </button>
              </React.Fragment>
            )}
          </div>
        );
      })()}

      {/* 3b. ShadowPanel */}
      {sf && shadowOpen && (
        <div className="shadow-panel-wrap">
          <div className="shadow-panel-close-row">
            <button className="shadow-panel-close" onClick={function() { setShadowOpen(false); }}>× 閉じる</button>
          </div>
          <ShadowPanel
            fire={sf}
            onAnswer={doBattle}
            onWatch={function() { onWatchFire(sf.id); setShadowOpen(false); }}
            onSkip={function()  { onRestToday(sf.id); setShadowOpen(false); }}
          />
        </div>
      )}

      {/* 4. EventCard（物語） */}
      <EventCard event={game.lastVisualEvent} />

      {/* 5. actionResult（明細）。未受領コンテキストは UnreceivedPanel 内に出すので除外 */}
      <ActionResultPanel
        result={actionResult && actionResult.context !== 'unreceived' ? actionResult : null}
        onClose={onCloseActionResult}
      />

      {/* 問いが見つかった — 受領証発行へ */}
      {found && !sf && (
        <div className="found-banner">
          <p className="found-banner-label">問いの欠片が届いています。</p>
          <p className="found-banner-question">{found.question}</p>
          <p style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.8, margin: '8px 0 14px' }}>
            トイマンが、火の奥から問いの欠片を持ち帰りました。<br />
            記録塔へ届けると、この火と会い直す旅が始まります。
          </p>
          <button
            onClick={function() { onReceive(found.id); }}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 8,
              background: '#4c1d95', border: 'none', color: '#ede9fe',
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            記録塔へ届ける
          </button>
        </div>
      )}

      {/* 受領後の次導線：1件だけ表示、複数ある時はセレクタ */}
      {received.length > 0 && (
        <div className="post-receive-lead">
          <p className="post-receive-lead-text">
            記録塔に問いの欠片が保存されました。<br />
            でも、この火にはまだ受け取れていないものがあります。
          </p>
        </div>
      )}

      {received.length > 1 && (
        <div style={{ margin: '8px 0 4px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {received.map(function(rf) {
            var active = rf.id === shownReceivedId;
            return (
              <button
                key={rf.id}
                onClick={function() { setLocalSelectedReceivedId(rf.id); }}
                style={{
                  padding: '5px 10px', borderRadius: 16, fontSize: 11,
                  background: active ? '#4c1d9522' : 'transparent',
                  border: '1px solid ' + (active ? '#7c3aed' : '#2e3348'),
                  color: active ? '#a78bfa' : '#4b5563',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {rf.kindle ? rf.kindle.slice(0, 10) : '火'}
              </button>
            );
          })}
        </div>
      )}

      {shownReceivedFire && onReexplore && (
        <UnreceivedPanel
          key={shownReceivedFire.id}
          fire={shownReceivedFire}
          onReexplore={onReexplore}
          onRest={onRestUnreceived}
          onReturnToHeart={onReturnToHeart}
          actionResult={actionResult}
          onCloseActionResult={onCloseActionResult}
        />
      )}

      {/* 5. 問いの深度・火の安定バー */}
      {sf && (
        <div className="progress-section">
          <div className="progress-row">
            <span className="progress-label">問いの深度</span>
            <span className="progress-value-purple">{sf.questionProgress || 0}%</span>
          </div>
          <ProgressBar value={sf.questionProgress || 0} color="linear-gradient(90deg,#7c3aed,#a78bfa)" />
          <div className="progress-row progress-gap">
            <span className="progress-label">火の安定</span>
            <span className="progress-value-green">{sf.gardenProgress || 0}%</span>
          </div>
          <ProgressBar value={sf.gardenProgress || 0} color="linear-gradient(90deg,#064e3b,#34d399)" />
        </div>
      )}

      {/* 6. 最近のログ3件 */}
      {recentLogs.length > 0 && (
        <div className="recent-logs">
          {recentLogs.map(function(l, i) {
            return <p key={i} className="recent-log-item">・{l.text}</p>;
          })}
        </div>
      )}

      {/* 7a. 記録塔 */}
      {game.unlocks.recordTower && (
        !recordOpen ? (
          <div className="record-tower-banner">
            <p className="record-tower-banner-title">遠くに、記録塔の灯りが見える。</p>
            <p className="record-tower-banner-desc">コタエが、問いの欠片を記録している。</p>
            <button data-testid="record-tower-toggle" className="record-tower-open-btn" onClick={function() { setRecordOpen(true); }}>
              記録塔を見る
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <div className="record-tower-header">
              <span className="record-tower-header-title">🗼 記録塔</span>
              <button className="record-tower-close" onClick={function() { setRecordOpen(false); }}>閉じる</button>
            </div>
            <RecordTower
              game={game}
              onGoUnreceived={function(fid) { setRecordOpen(false); onGoUnreceivedFromTower(fid); }}
              onViewReceipt={onViewReceipt}
              onViewReturnLamp={onViewReturnLamp}
            />
          </div>
        )
      )}

      {/* 7b. 涙の泉 */}
      {game.unlocks.tearsSpring && (
        <div className="tears-spring">
          <p className="tears-spring-title">どこかで、水音がした。</p>
          <p className="tears-spring-text">かなが、少し離れた場所から見ていた。「今は受け取れなくてもいいよ」</p>
        </div>
      )}

      {/* 8. 灯置き場 — 旧経済（素材で灯りを買う）の名残。Turn 19A で通常導線から封印。
            灯置き場の本実装（灯貨で「灯りを置く」儀式）は Turn 19 以降で作り直す。
            LightMarket / buyMarketItem / LIGHT_MARKET_ITEMS はコードとしては残置（封印）。 */}
    </div>
  );
}

// ── ホーム「今日の箱庭」ヘルパー ──────────────────────────────────────────────
// いま向き合う火を1つ選ぶ。最も手当てが必要な状態を前に出す（一覧は棚に逃がす）。
function pickCurrentFire(fires) {
  if (!fires || !fires.length) return null;
  var by = function(s) { return fires.find(function(f) { return f.status === s; }); };
  return by('found') || by('receiving') || by('searching')
    || fires.find(function(f) { return f.status === 'received' && !isAllSettled(f); })
    || by('received') || by('lit') || by('returned') || fires[0];
}

function fireReexploreStarted(fire) {
  var rc = fire.reexploreCounts || {};
  return ((rc.meaning || 0) + (rc.value || 0) + (rc.satisfaction || 0)) > 0;
}

// 【封印・現在は未使用】旧・火の現在地（status ベース）。Turn27 の fireLocation に置換。
// openedPlace 訪問判定を持たない旧版。将来の参照のため残置。
function fireCurrentPlace(fire) {
  switch (fire.status) {
    case 'searching': return '未受領の森';
    case 'found':     return '森の奥';
    case 'receiving': return '記録塔への道';
    case 'received':
      if (isAllSettled(fire)) return '記録塔の奥';
      return fireReexploreStarted(fire) ? '余熱の棚' : '記録塔';
    case 'returned':  return '記録塔の奥';
    case 'lit':       return '焚き口';
    default:          return '箱庭';
  }
}

// そばにいる子＋その一言。「……さがしたよ」「……みつけた」は使わない（各シーン専用）。
function fireCompanionLine(fire) {
  switch (fire.status) {
    case 'searching': return { who: 'トイマン', text: '火は、まだある。' };
    case 'found':     return { who: 'トイマン', text: '問いの欠片は、もう見つかっている。' };
    case 'receiving': return { who: 'トイマン', text: '欠けないように、運ぶ。' };
    case 'received':
      return isAllSettled(fire)
        ? { who: 'コタエ', text: 'もう、同じ場所には置きません。返せます。' }
        : { who: 'コタエ', text: '記録済みです。ただし、余熱が残っています。' };
    case 'returned':  return { who: 'トイマン', text: '帰った。' };
    case 'lit':       return { who: 'トイマン', text: '預かった火が、まだ焚き口にある。' };
    default:          return { who: 'トイマン', text: '火は、まだある。' };
  }
}

// 火の現在地・そばの住人・次の一手。複数火を「タスク」ではなく「箱庭の中の現在地」として見せる。
// 表示名は必ず世界内の場所（未受領の森／記録塔／涙の泉…）で、タスク管理語は使わない。
function fireLocation(fire) {
  if (!fire) return 'はじまりの部屋';
  if (fire.status === 'returned') return '返却灯';
  if (fire.status === 'held') return '保留室';
  // 場所を実際に訪れた（初回出会い済み）なら、その場所を現在地にする。
  if (fire.openedPlace && fire.openedPlace.firstEncounterSeen) {
    var id = fire.openedPlace.id;
    if (id === 'tears' || id === 'spring') return '涙の泉';
    if (id === 'black_tags') return '黒札置き場';
    if (id === 'back_shelf' || id === 'shelf') return '棚の奥';
  }
  if (fire.status === 'searching') return '未受領の森';
  if (fire.status === 'found') return '森の奥';
  if (fire.status === 'receiving') return '記録塔への道';
  if (fire.receipt) return '記録塔';
  if (fire.status === 'lit') return '焚き口';
  return 'はじまりの部屋';
}

function fireCompanion(fire) {
  if (!fire) return 'トイマン';
  if (fire.status === 'returned') return '灯守り';
  if (fire.status === 'held') return 'コタエ';
  if (fire.openedPlace && fire.openedPlace.firstEncounterSeen) {
    var id = fire.openedPlace.id;
    if (id === 'tears' || id === 'spring') return 'かな';
    if (id === 'black_tags') return '審査官';
    if (id === 'back_shelf' || id === 'shelf') return 'うつろ';
  }
  // 場所は開いたが、まだその主に出会っていない時はキャラ名を先に出さない。
  // 場所の気配だけを示す（場所→役割→名前 の順を崩さないため）。
  if (fire.openedPlace) {
    var pid = fire.openedPlace.id;
    if (pid === 'tears' || pid === 'spring') return '水音';
    if (pid === 'black_tags') return '札箱';
    if (pid === 'back_shelf' || pid === 'shelf') return '空いた棚';
  }
  if (fire.receipt) return 'コタエ';
  return 'トイマン';
}

// その火に対する次の一手（1つ）。返却火は返却灯へ、それ以外は homeNextActions の先頭。
function nextFireAction(fire) {
  if (!fire) return null;
  if (fire.status === 'returned') return { label: '返却灯を見る', go: 'returnlamp' };
  if (fire.status === 'held') return { label: '保留室を見る', go: 'garden' };
  var acts = homeNextActions(fire);
  return (acts && acts.length) ? acts[0] : null;
}

// その火の最近の一行（世話ログがあればそれ、無ければ場で分けた痕跡）。
function fireRecentLine(fire) {
  if (fire.careLogs && fire.careLogs.length && fire.careLogs[0].text) return fire.careLogs[0].text;
  if (fire.placeTrace && fire.placeTrace.traceText) return fire.placeTrace.traceText;
  if (fire.status === 'returned') return '心へ返されたまま、灯っています。';
  return null;
}

// 【封印・現在は未使用】Turn28A で Home から外した。キャラ記憶は「再会時」に効かせる方針。
// ホームに出す「キャラが覚えている」一言を1件だけ選ぶ（最も新しく更新された記憶）。
var MEMORY_NAMES = { kana: 'かな', auditor: '審査官', utsuro: 'うつろ' };
function latestCharacterMemoryLine(game) {
  var mem = game && game.characterMemory;
  if (!mem) return null;
  var best = null;
  Object.keys(mem).forEach(function(k) {
    var m = mem[k];
    if (m && m.met && (!best || (m.updatedAt || 0) > (best.updatedAt || 0))) {
      best = { key: k, mem: m };
    }
  });
  if (!best) return null;
  var ess = traceEssence(best.mem.lastTrace);
  if (!ess) return null;
  return (MEMORY_NAMES[best.key] || best.key) + 'は、前に分けた「' + ess + '」を覚えている。';
}

// 【封印・現在は未使用】Turn28A で today-card をスリム化し外した。痕跡は庭カード／記録塔で見る。
function homeRecentTraces(fire, game) {
  var traces = getStabilityTraces(fire.gardenProgress || 0).slice();
  // 余熱に会い直した痕跡（heatTraces）を前に出す。新しい本筋。
  if (fire.heatTraces && fire.heatTraces.length) {
    fire.heatTraces.slice(-2).forEach(function(ht) {
      if (ht && ht.traceText) traces.unshift(ht.traceText);
    });
  }
  // 問いの足跡を最新1件だけ混ぜる（向き合って置いた言葉。answers の死蔵を防ぐ）。
  var fps = getQuestionFootprints(fire, 1);
  if (fps.length) traces.unshift('問いの足跡「' + fps[0].text.trim() + '」');
  // 場所でキャラと分けた痕跡を前に出す（最も新しく、意味の濃い一行）。
  if (fire.placeTrace && fire.placeTrace.traceText) traces.unshift(fire.placeTrace.traceText);
  if (fire.status === 'returned') traces.unshift('心へ返した灯');
  // 庭全体の世話ログ（複数火）から最新3件まで混ぜる。向き合えなかった間も
  // 誰かが火のそばに居た証拠。Home を過密にしないため最大3件に絞る。
  if (game && Array.isArray(game.careLogs)) {
    game.careLogs.slice(0, 3).reverse().forEach(function(c) {
      if (c && c.text) traces.unshift(c.text);
    });
  }
  return traces.slice(0, 3);
}

// 次にできること（1〜3）。ホームから、その動作の起きる場所へ橋渡しする。
function homeNextActions(fire) {
  switch (fire.status) {
    case 'searching': return [{ label: '未受領の森へ', go: 'garden' }];
    case 'lit':       return [{ label: '未受領の森へ', go: 'garden' }];
    case 'found':     return [{ label: '記録塔へ届ける', go: 'deliver' }];
    case 'receiving': return [];
    case 'received':
      // 受領証の裏に開いた場所へまだ会いに行っていないなら、まずそこへ。
      if (fire.openedPlace && !fire.openedPlace.firstEncounterSeen) {
        return [{ label: fire.openedPlace.name + 'へ行く', go: 'encounter' }];
      }
      // settled なら、その火に会いに行ける場所へ（そこに「心へ返す」がある）。
      // コタエの「返せます」と導線を一致させ、約束を裏切らない。
      return isAllSettled(fire)
        ? [{ label: '記録塔の奥へ', go: 'unreceived' }]
        : [{ label: '余熱に会い直す', go: 'unreceived' }];
    case 'returned':  return [{ label: '箱庭を見る', go: 'garden' }];
    default:          return [{ label: '箱庭を見る', go: 'garden' }];
  }
}

function HomeView({ game, onLightFire, onGoShelf, onGoGarden, onNextAction, onSelectFire }) {
  var [showForm, setShowForm] = _useState(false);
  var totalFires = game.fires.length;
  // 選択火（game に保存）を主役に。不正・破損なら pickCurrentFire に戻す（迷子札を作らない）。
  var currentFire = game.fires.find(function(f) { return f.id === game.selectedFireId; })
    || pickCurrentFire(game.fires);
  // 庭の火たち（最大5本）。手当ての必要度順で、複数の現在地として見せる。
  var gardenFires = pickCareFires(game, 5);

  function handleLightFire(kindle, pain, writeState, feeling, metrics) {
    // 灯した後は App 側の「預ける場面」へ遷移する。ここでフォームを閉じるだけ。
    onLightFire(kindle, pain, writeState, feeling, metrics);
    setShowForm(false);
  }

  // today-card は「選択中の火に、今できる一手」だけ。詳細は庭カード／記録塔へ逃がす。
  var place = currentFire ? fireLocation(currentFire) : '';
  var companion = currentFire ? fireCompanion(currentFire) : '';
  var nextActions = currentFire ? homeNextActions(currentFire) : [];

  return (
    <div className="home-wrap">
      <div className="home-header">
        <h1 className="home-title">残り火の箱庭</h1>
        <p className="home-subtitle">Nokoribi no Hakoniwa</p>
      </div>

      {totalFires === 0 && !showForm && (
        <div>
          <ToymanVoice text="まだ、消えていない" />
          <div className="home-intro-box">
            <p className="home-intro-text">
              ここは、言葉にまつわる痛みを置いていける場所。<br />
              あなたが作った言葉、届かなかった言葉、消えてしまいそうな言葉を、<br />
              残り火として灯すことができます。
            </p>
          </div>
        </div>
      )}

      {/* 今日の箱庭 — 選択中の火に「今できる一手」だけを見る玄関カード。
          名前・いまいる場所・そばの相手・次にできること のみ。痕跡や記録の詳細は出さない。 */}
      {currentFire && !showForm && (
        <div className="today-card">
          <p className="today-label">いま見ている火</p>
          <p className="today-fire-kindle">「{fireTitle(currentFire)}」</p>

          <div className="today-meta">
            <div className="today-meta-row">
              <span className="today-meta-k">いまいる場所</span>
              <span className="today-meta-v">{place}</span>
            </div>
            <div className="today-meta-row">
              <span className="today-meta-k">そばにいる相手</span>
              <span className="today-meta-v">{companion}</span>
            </div>
          </div>

          {nextActions.length > 0 && (
            <div className="today-actions">
              <p className="today-actions-label">次にできること</p>
              {nextActions.map(function(a, i) {
                return (
                  <button key={i} className="today-action-btn" data-testid={'home-action-' + a.go}
                    onClick={function() { onNextAction(a.go, currentFire.id); }}>
                    {a.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 庭の火たち — 複数の火を、それぞれの現在地として見せる（タスクではない）。 */}
      {!showForm && totalFires > 1 && (
        <div className="garden-fires">
          <p className="garden-fires-label">庭の火たち</p>
          {gardenFires.map(function(f) {
            var act = nextFireAction(f);
            var recent = fireRecentLine(f);
            var sel = f.id === currentFire.id;
            return (
              <div key={f.id} className={'gf-card' + (sel ? ' gf-card-on' : '')}
                onClick={function() { onSelectFire(f.id); }}>
                {sel && <p className="gf-now">いま見ている火</p>}
                <p className="gf-name">「{fireTitle(f)}」</p>
                <div className="gf-meta">
                  <span className="gf-meta-row"><span className="gf-k">場所</span>{fireLocation(f)}</span>
                  <span className="gf-meta-row"><span className="gf-k">そば</span>{fireCompanion(f)}</span>
                </div>
                <p className="gf-recent">最近：{recent || 'まだ、火のそばは静かです。'}</p>
                {act && (
                  <button className="gf-action" data-testid={'gf-action-' + act.go} onClick={function(e) { e.stopPropagation(); onNextAction(act.go, f.id); }}>
                    {act.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 灯守り初登場 — 灯貨の意味をここで伝える */}
      {!showForm && game.tinyfolk && game.tinyfolk.lightkeeper && totalFires === 1 && (
        <div className="home-keeper-box">
          <p className="home-keeper-line">
            火のそばに、小さな影が動いた。<br />
            灯守りが、石をひとつ置いた。
          </p>
          <p className="home-keeper-line home-keeper-sub">
            灯守り：<br />
            こぼれた灯りです。捨てないでください。<br />
            これは灯貨。買うためのものではありません。<br />
            置くための灯りです。
          </p>
        </div>
      )}

      {showForm ? (
        <div className="home-form-box">
          <h3 className="home-form-title">火に言葉を置く</h3>
          <FireInputForm
            onSubmit={handleLightFire}
            onCancel={function() { setShowForm(false); }}
          />
        </div>
      ) : (
        <button
          onClick={function() { setShowForm(true); }}
          className={currentFire ? 'home-light-secondary' : 'home-light-primary'}
        >
          {currentFire ? '＋ 別の火に言葉を置く' : '+ 火に言葉を置く'}
        </button>
      )}

      {!showForm && (
        <div className="home-nav">
          <button className="home-nav-btn" onClick={onGoShelf}>
            📚 残り火の棚 {game.fires.length > 0 ? '(' + game.fires.length + ')' : ''}
          </button>
          <button className="home-nav-btn" onClick={onGoGarden}>
            🌿 箱庭
          </button>
        </div>
      )}

      {/* 灯貨は補助表示へ下げる（主役にしない） */}
      {!showForm && game.toka > 0 && (
        <p className="home-toka">灯貨 {game.toka}</p>
      )}
    </div>
  );
}

function DevBar({ game, onReset, onForceFound, onAddBattle, onReplayIntro }) {
  var [open, setOpen] = _useState(false);
  var searching = game.fires.find(function(f) { return f.status === 'searching'; });
  var found = game.fires.find(function(f) { return f.status === 'found'; });

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
      background: '#0a0c10', borderTop: '1px solid #1e2230',
      maxWidth: 480, margin: '0 auto',
    }}>
      <button
        data-testid="dev-toggle"
        onClick={function() { setOpen(function(o) { return !o; }); }}
        style={{
          width: '100%', padding: '8px', background: 'transparent', border: 'none',
          color: '#374151', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        [DEV] {open ? '▲' : '▼'} fires:{game.fires.length} battles:{game.battleCount} 灯貨:{game.toka || 0}
        {searching ? ' | 問' + (searching.questionProgress || 0) + '% 火' + (searching.gardenProgress || 0) + '%' : ''}
        {found ? ' | ★found' : ''}
      </button>
      {open && (
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {searching && (
            <button data-testid="dev-force-found" onClick={function() { onForceFound(searching.id); }} style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #c2410c',
              background: 'transparent', color: '#f97316', fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              強制発見
            </button>
          )}
          {searching && (
            <button onClick={function() { onAddBattle(searching.id); }} style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #4c1d95',
              background: 'transparent', color: '#a78bfa', fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              +30%
            </button>
          )}
          <button onClick={onReplayIntro} style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid #1e3a5f',
            background: 'transparent', color: '#60a5fa', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            イントロ再生
          </button>
          <button onClick={onReset} style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid #7f1d1d',
            background: 'transparent', color: '#f87171', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            リセット
          </button>
          <span style={{ color: '#8f9bb3', fontSize: 11, alignSelf: 'center' }}>
            {game.toyman ? game.toyman.state + '@' + game.toyman.location : '—'}
            {game.workerTasks && game.workerTasks.lightkeeper
              ? ' | 灯守り' + (game.workerTasks.lightkeeper.progress || 0) + '%'
              : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// 保存失敗を、世界観を壊さずに伝える通知。コタエの声で一度だけ。
// 留守のあいだ。戻ってきた時、最初に出る。報酬回収ではなく、世話されていた証拠。
function AwayReport({ report, onClose }) {
  useOverlayKeys({ onEscape: onClose, onEnter: onClose });
  var note = report.note || ['問いは進んでいません。', 'でも、火は消えていません。'];
  // 庭全体の世話（複数火）。後方互換: 旧 report.lines / 単一 care にも対応。
  var cares = report.cares ||
    (report.lines ? report.lines.map(function(l) { return { care: l }; }) :
     (report.care ? [{ care: report.care }] : []));
  var count = report.count || cares.length;
  // 留守の長さで導入文の濃さを変える（短い→件数を言う、長い→積もった気配を言う）。
  var lead;
  if (report.tier === 'long') {
    lead = '庭のあちこちに、世話の跡が残っていました。';
  } else if (report.tier === 'mid') {
    lead = '庭では、いくつかの痕跡が、火のそばに積もっていました。';
  } else {
    lead = count > 1
      ? ('庭では、' + count + 'つの火のそばに小さな痕跡が残っていました。')
      : '火のそばに、小さな痕跡が残っていました。';
  }
  var trapRef = useFocusTrap();
  return (
    <div className="away-ov" role="dialog" aria-modal="true" aria-labelledby="away-title" onClick={onClose}>
      <div className="away-card" ref={trapRef} onClick={function(e) { e.stopPropagation(); }}>
        <p className="away-label" id="away-title">留守のあいだ</p>
        <p className="away-lead">{lead}</p>
        <div className="away-cares">
          {cares.map(function(c, i) {
            return <p key={i} className="away-line">・{c.care}</p>;
          })}
        </div>
        <div className="away-note">
          {note.map(function(n, i) { return <p key={i} className="away-note-line">{n}</p>; })}
        </div>
        <button className="away-btn" onClick={onClose}>ただいま</button>
      </div>
    </div>
  );
}

function SaveErrorNotice({ onDismiss }) {
  useOverlayKeys({ onEscape: onDismiss });
  return (
    <div className="save-error-notice" role="alert">
      <div className="save-error-card">
        <span className="save-error-name">コタエ</span>
        <p className="save-error-line">保存に失敗しました。</p>
        <p className="save-error-line">この火は、まだ安全に記録できていません。</p>
        <p className="save-error-sub">ブラウザの保存領域が足りない可能性があります。</p>
        <button className="save-error-btn" onClick={onDismiss}>とじる</button>
      </div>
    </div>
  );
}

// 全記録の初期化確認。OSダイアログではなく、コタエとトイマンの言葉で確かめる。
function ResetConfirm({ onCancel, onConfirm }) {
  // Esc は安全側（消さない）。Enter で誤って全消去しないよう、確定は明示クリックのみ。
  useOverlayKeys({ onEscape: onCancel });
  var trapRef = useFocusTrap();
  return (
    <div className="reset-ov" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" onClick={onCancel}>
      <div className="reset-card" ref={trapRef} onClick={function(e) { e.stopPropagation(); }}>
        <span className="reset-name reset-kotae">コタエ</span>
        <p className="reset-line" id="reset-title">この箱庭の記録を、すべて初期化します。</p>
        <span className="reset-name reset-toyman">トイマン</span>
        <p className="reset-line">火も、消えるのか。</p>
        <span className="reset-name reset-kotae">コタエ</span>
        <p className="reset-line">はい。<br />受領証も、痕跡も、返却灯も消えます。</p>
        <p className="reset-warn">この箱庭は、最初の暗さに戻ります。<br />元には戻せません。</p>
        <button className="reset-btn-keep" onClick={onCancel}>消さない</button>
        <button className="reset-btn-erase" onClick={onConfirm}>すべて消す</button>
      </div>
    </div>
  );
}

function MilestoneDialog({ milestone, onClose }) {
  var [step, setStep] = _useState(0);
  var lines = milestone.lines;
  var isLast = step >= lines.length - 1;
  function advance() {
    if (isLast) onClose();
    else setStep(function(s) { return s + 1; });
  }
  return (
    <div className="kotae-ov" onClick={advance}>
      <div className="kotae-sheet" onClick={function(e) { e.stopPropagation(); }}>
        <div className="kotae-grip" />
        <p style={{ color: '#4b5563', fontSize: 10, margin: '0 0 10px', letterSpacing: 1 }}>{milestone.place}</p>
        {lines.slice(0, step + 1).map(function(l, i) {
          var isCurrent = i === step;
          var prevL = i > 0 ? lines[i - 1] : null;
          var showHeader = i === 0 || !prevL || prevL.name !== l.name;
          return (
            <div key={i}>
              {showHeader && (
                <div className={'kotae-head' + (i > 0 ? ' journey-speaker-gap' : '')}>
                  <span className="kotae-dot" style={{ background: l.color }} />
                  <span className="kotae-name" style={{ color: l.color }}>{l.name}</span>
                </div>
              )}
              <p className={'kotae-line' + (isCurrent ? ' kotae-line-now' : '')}>{l.text}</p>
            </div>
          );
        })}
        <button className="kotae-btn" onClick={advance}>
          {isLast ? '▽ 続ける' : '▽ つづき'}
        </button>
      </div>
    </div>
  );
}

// ── IntroScene ───────────────────────────────────────────────────────────────

var INTRO_NARRATIVE_LINES = [
  'どこかで、小さな火が揺れている。',
  'まだ名前のない火。',
  'まだ意味になっていないもの。',
  'まだ誰にも受け取られていないもの。',
  '',
  '足音が近づく。',
  '',
  '黒い服の小さな子が、',
  '火の前で立ち止まる。',
];

var INTRO_TOYMAN_LINES = [
  '……さがしたよ。',
  '残っているなら、迎えに行く。',
  'これは、答えじゃない。\nでも、置いていけない。',
  'あなたの言葉で、この火に輪郭をつけて。',
];

function IntroScene({ onMarkSeen, onFireLit }) {
  var [step, setStep] = _useState(0);
  var [showForm, setShowForm] = _useState(false);
  var [visible, setVisible] = _useState(false);

  _useEffect(function() {
    var t = setTimeout(function() { setVisible(true); }, 80);
    return function() { clearTimeout(t); };
  }, []);

  function advance() {
    if (step < INTRO_TOYMAN_LINES.length) {
      setStep(function(s) { return s + 1; });
    }
  }

  function handleFireBtn() {
    onMarkSeen();
    setShowForm(true);
  }

  var isNarrative = step === 0;
  var toymanIdx = step - 1; // 0-based index into INTRO_TOYMAN_LINES
  var isFinalLine = step === INTRO_TOYMAN_LINES.length;

  // キーボード: Enter/Space で進む（フォーム表示中は無効。入口なので Esc は無し）
  useOverlayKeys({ onEnter: showForm ? null : (isFinalLine ? handleFireBtn : advance) });

  if (showForm) {
    return (
      <div className="intro-scene">
        <div className="intro-fire-glow-sm" />
        <div className="intro-form-wrap">
          <h3 className="intro-form-header">この火に、残っていた言葉を置いてください。</h3>
          <FireInputForm
            onSubmit={onFireLit}
            onCancel={function() { setShowForm(false); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="intro-scene" onClick={!isFinalLine ? advance : undefined}>
      <div className="intro-fire-glow" />

      <div key={step} className={'intro-content' + (visible ? ' intro-content-in' : '')}>
        {isNarrative && (
          <div className="intro-narrative">
            {INTRO_NARRATIVE_LINES.map(function(line, i) {
              if (!line) return React.createElement('div', { key: i, style: { height: 10 } });
              return (
                <p key={i} className="intro-narrative-line">{line}</p>
              );
            })}
          </div>
        )}

        {!isNarrative && (
          <div className="intro-toyman-block">
            <span className="intro-toyman-label">トイマン</span>
            <p className="intro-toyman-line">
              {INTRO_TOYMAN_LINES[toymanIdx].split('\n').map(function(seg, si) {
                return React.createElement(React.Fragment, { key: si },
                  si > 0 && React.createElement('br', null),
                  seg
                );
              })}
            </p>
          </div>
        )}
      </div>

      <div className="intro-btn-row" onClick={function(e) { e.stopPropagation(); }}>
        {isFinalLine ? (
          <button className="intro-btn-fire" onClick={handleFireBtn}>
            火を見る
          </button>
        ) : (
          <button className="intro-btn-next" onClick={advance}>
            つづき
          </button>
        )}
      </div>
    </div>
  );
}

// ── EntrustScene ─────────────────────────────────────────────────────────────
// 火を灯した直後。トイマンに火を預ける場面。
// IntroScene の暗い没入感を、探索へ橋渡しする。
// フォーム送信を「作成完了」ではなく「預ける儀式」に変える。

var ENTRUST_NARRATIVE_LINES = [
  '火に、言葉が置かれた。',
  '',
  'トイマンは、すぐには触れなかった。',
  '小さな火の揺れ方を、ただ見ていた。',
];

// 初回はフル。2本目以降は短縮（毎回フル演出だと反復が重い／没入も切らさない）。
var ENTRUST_TOYMAN_LINES = [
  '預かる。',
  '強く握らない。\nでも、落とさない。',
];
var ENTRUST_TOYMAN_LINES_SHORT = [
  '預かる。',
  '落とさない。',
];

function EntrustScene({ fire, short, onDone }) {
  var [step, setStep] = _useState(0);
  var [visible, setVisible] = _useState(false);
  var [leaving, setLeaving] = _useState(false);

  _useEffect(function() {
    var t = setTimeout(function() { setVisible(true); }, 80);
    return function() { clearTimeout(t); };
  }, []);

  // 場面のビート列。短縮時はナラティブを省き、トイマンの言葉だけを置く。
  var beats = [];
  if (!short) beats.push({ narrative: ENTRUST_NARRATIVE_LINES });
  (short ? ENTRUST_TOYMAN_LINES_SHORT : ENTRUST_TOYMAN_LINES).forEach(function(t) {
    beats.push({ toyman: t });
  });

  function advance() {
    if (step < beats.length - 1) {
      setStep(function(s) { return s + 1; });
    }
  }

  function handleDone() {
    // 暗転してから森へ。落差ではなく、ひと呼吸の沈黙で繋ぐ。
    setLeaving(true);
    setTimeout(function() { onDone(); }, 620);
  }

  var isFinal = step === beats.length - 1;
  var beat = beats[step] || {};

  // キーボード: Enter/Space で進む／最後の一押し
  useOverlayKeys({ onEnter: leaving ? null : (isFinal ? handleDone : advance) });

  // プレイヤー自身の言葉が、火に置かれている。
  var words = (fire && fire.kindle) ? fire.kindle.trim() : '';

  return (
    <div
      className={'intro-scene entrust-scene' + (leaving ? ' entrust-leaving' : '')}
      onClick={!isFinal && !leaving ? advance : undefined}
    >
      <div className="intro-fire-glow entrust-fire-glow" />

      {words && (
        <p className="entrust-words">「{words}」</p>
      )}

      <div key={step} className={'intro-content' + (visible ? ' intro-content-in' : '')}>
        {beat.narrative && (
          <div className="intro-narrative">
            {beat.narrative.map(function(line, i) {
              if (!line) return React.createElement('div', { key: i, style: { height: 10 } });
              return (
                <p key={i} className="intro-narrative-line">{line}</p>
              );
            })}
          </div>
        )}

        {beat.toyman && (
          <div className="intro-toyman-block">
            <span className="intro-toyman-label">トイマン</span>
            <p className="intro-toyman-line">
              {beat.toyman.split('\n').map(function(seg, si) {
                return React.createElement(React.Fragment, { key: si },
                  si > 0 && React.createElement('br', null),
                  seg
                );
              })}
            </p>
          </div>
        )}
      </div>

      <div className="intro-btn-row" onClick={function(e) { e.stopPropagation(); }}>
        {isFinal ? (
          <button data-testid="entrust-next" className="intro-btn-fire entrust-btn" onClick={handleDone} disabled={leaving}>
            未受領の森へ
          </button>
        ) : (
          <button className="intro-btn-next" onClick={advance}>
            つづき
          </button>
        )}
      </div>
    </div>
  );
}

// ── DiscoveryScene ───────────────────────────────────────────────────────────
// 問いの欠片を見つけた瞬間。found 状態の初回だけ、森の奥での発見を場面にする。
// IntroScene の「……さがしたよ」（入口・火を迎えに来た言葉）に対して、
// ここは「……みつけた」（発見・問いの欠片を掘り当てた言葉）。役割を分ける。

var DISCOVERY_NARRATIVE_LINES = [
  '森の奥で、火が一度だけ強く揺れた。',
  '',
  '影の声が遠のく。',
  '残っていた問いが、火の中でかすかに形を持った。',
];

var DISCOVERY_TOYMAN_LINES = [
  '……みつけた。',
  '答えじゃない。\nでも、欠片はあった。',
  '記録塔へ運ぶ。',
];

function DiscoveryScene({ fire, onDeliver }) {
  var [step, setStep] = _useState(0);
  var [visible, setVisible] = _useState(false);
  var [leaving, setLeaving] = _useState(false);

  _useEffect(function() {
    var t = setTimeout(function() { setVisible(true); }, 80);
    return function() { clearTimeout(t); };
  }, []);

  function advance() {
    if (step < DISCOVERY_TOYMAN_LINES.length) {
      setStep(function(s) { return s + 1; });
    }
  }

  function handleDeliver() {
    // 暗転してから記録塔（受領の旅）へ。EntrustScene と同じ呼吸で繋ぐ。
    setLeaving(true);
    setTimeout(function() { onDeliver(); }, 620);
  }

  var isNarrative = step === 0;
  var toymanIdx = step - 1; // 0-based index into DISCOVERY_TOYMAN_LINES
  var isFinal = step === DISCOVERY_TOYMAN_LINES.length;

  // 火の中で形を持ちかけた問い。かすかに見せる（受領の旅で本格的に向き合う）。
  var q = (fire && fire.question) ? fire.question : '';

  // キーボード: Enter/Space で進む／記録塔へ届ける
  useOverlayKeys({ onEnter: leaving ? null : (isFinal ? handleDeliver : advance) });

  return (
    <div
      className={'intro-scene discovery-scene' + (leaving ? ' entrust-leaving' : '')}
      onClick={!isFinal && !leaving ? advance : undefined}
    >
      <div className="intro-fire-glow discovery-fire-glow" />

      {q && (
        <p className="discovery-question">「{q}」</p>
      )}

      <div key={step} className={'intro-content' + (visible ? ' intro-content-in' : '')}>
        {isNarrative && (
          <div className="intro-narrative">
            {DISCOVERY_NARRATIVE_LINES.map(function(line, i) {
              if (!line) return React.createElement('div', { key: i, style: { height: 10 } });
              return (
                <p key={i} className="intro-narrative-line">{line}</p>
              );
            })}
          </div>
        )}

        {!isNarrative && (
          <div className="intro-toyman-block">
            <span className="intro-toyman-label">トイマン</span>
            <p className="intro-toyman-line">
              {DISCOVERY_TOYMAN_LINES[toymanIdx].split('\n').map(function(seg, si) {
                return React.createElement(React.Fragment, { key: si },
                  si > 0 && React.createElement('br', null),
                  seg
                );
              })}
            </p>
          </div>
        )}
      </div>

      <div className="intro-btn-row" onClick={function(e) { e.stopPropagation(); }}>
        {isFinal ? (
          <button data-testid="discovery-deliver" className="intro-btn-fire discovery-btn" onClick={handleDeliver} disabled={leaving}>
            記録塔へ届ける
          </button>
        ) : (
          <button className="intro-btn-next" onClick={advance}>
            つづき
          </button>
        )}
      </div>
    </div>
  );
}

// ── PlaceEncounterScene ──────────────────────────────────────────────────────
// 開いた場所での初回出会い。導入→キャラの言葉→問い→選択を一つ→結果→痕跡。
// 余熱を「解決」せず、置き場所に分ける儀式。openedPlace.id で内容が切り替わる。
function lineToFragments(text) {
  return text.split('\n').map(function(seg, si) {
    return React.createElement(React.Fragment, { key: si },
      si > 0 && React.createElement('br', null), seg);
  });
}

function PlaceEncounterScene({ fire, onComplete, memory }) {
  var def = PLACE_ENCOUNTERS[fire.openedPlace && fire.openedPlace.id];
  var reunion = characterReunionLine(PLACE_CHARACTER[fire.openedPlace && fire.openedPlace.id], memory);
  var [step, setStep] = _useState(0);
  var [phase, setPhase] = _useState('dialogue'); // dialogue | choose | result
  var [selected, setSelected] = _useState(null);
  var [visible, setVisible] = _useState(false);
  var [leaving, setLeaving] = _useState(false);

  _useEffect(function() {
    var t = setTimeout(function() { setVisible(true); }, 80);
    return function() { clearTimeout(t); };
  }, []);

  var beats = def ? def.lines : [];
  var atLastBeat = step >= beats.length - 1;

  function advance() {
    if (!atLastBeat) setStep(function(s) { return s + 1; });
    else setPhase('choose');
  }
  function choose(c) { setSelected(c); setPhase('result'); }
  function finish() {
    setLeaving(true);
    setTimeout(function() { onComplete(selected); }, 620);
  }

  useOverlayKeys({
    onEnter: leaving ? null
      : phase === 'dialogue' ? advance
      : phase === 'result' ? finish
      : null,
  });

  if (!def) { return null; }

  var beat = beats[step] || {};
  var resultLines = (phase === 'result' && selected) ? def.result(selected) : [];
  var traceText = (phase === 'result' && selected) ? (def.traceLabel + '：' + selected) : '';
  var charColor = def.charColor;
  // キャラ応答（この置きを含めた回数で再会文の有無を決める＝保存される応答と一致させる）。
  var respCharKey = PLACE_CHARACTER[fire.openedPlace && fire.openedPlace.id];
  var response = (phase === 'result' && selected)
    ? buildCharacterResponse(respCharKey, selected, { traceCount: ((memory && memory.traceCount) || 0) + 1 })
    : null;

  function renderBeat(b, key) {
    if (b.narrative) {
      return (
        <div key={key} className="intro-narrative">
          {b.narrative.map(function(line, i) {
            if (!line) return React.createElement('div', { key: i, style: { height: 10 } });
            return <p key={i} className="intro-narrative-line">{line}</p>;
          })}
        </div>
      );
    }
    var color = b.who === def.character ? charColor : '#fb923c'; // キャラ or トイマン
    return (
      <div key={key} className="intro-toyman-block">
        <span className="intro-toyman-label" style={{ color: color }}>{b.who}</span>
        <p className="intro-toyman-line">{lineToFragments(b.text)}</p>
      </div>
    );
  }

  var trapRef = useFocusTrap();
  return (
    <div
      ref={trapRef}
      role="dialog" aria-modal="true" aria-label={'開いた場所：' + fire.openedPlace.name}
      className={'intro-scene place-scene place-' + fire.openedPlace.id + (leaving ? ' entrust-leaving' : '')}
      onClick={(phase === 'dialogue' && !atLastBeat && !leaving) ? advance : undefined}
    >
      <p className="place-scene-name" aria-live="polite">{fire.openedPlace.name}</p>

      {/* 再会の一言。前にこの場所で痕跡を分けていたら、キャラがそれを覚えている。 */}
      {phase === 'dialogue' && step === 0 && reunion && (
        <div className="reunion-line intro-content-in">
          <span className="reunion-who" style={{ color: reunion.color }}>{reunion.who}</span>
          {reunion.lines.map(function(l, i) {
            return <p key={i} className="reunion-text">{l}</p>;
          })}
        </div>
      )}

      {phase === 'dialogue' && (
        <React.Fragment>
          <div key={step} className={'intro-content' + (visible ? ' intro-content-in' : '')}>
            {renderBeat(beat, 'b')}
          </div>
          <div className="intro-btn-row" onClick={function(e) { e.stopPropagation(); }}>
            {atLastBeat ? (
              <button data-testid="place-encounter-next" className="intro-btn-fire place-btn" onClick={function() { setPhase('choose'); }}>
                問いに向き合う
              </button>
            ) : (
              <button data-testid="place-encounter-next" className="intro-btn-next" onClick={advance}>つづき</button>
            )}
          </div>
        </React.Fragment>
      )}

      {phase === 'choose' && (
        <div className="place-choose intro-content-in">
          <p className="place-question">{def.question}</p>
          <div className="place-choices">
            {def.choices.map(function(c) {
              return (
                <button key={c} data-testid="place-encounter-choice" className="journey-option-btn place-choice-btn" onClick={function() { choose(c); }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="place-result intro-content-in">
          {resultLines.map(function(rl, i) { return renderBeat(rl, i); })}
          {/* キャラ応答 — 選んだ言葉を、そのキャラの役割で受け取る一言。痕跡の前に。 */}
          {response && (
            <div className="char-response">
              <span className="char-response-who" style={{ color: response.color }}>{response.who}</span>
              {response.lines.map(function(l, i) { return <p key={i} className="char-response-line">{l}</p>; })}
            </div>
          )}
          <p className="place-trace">痕跡　{traceText}</p>
          <div className="intro-btn-row" onClick={function(e) { e.stopPropagation(); }}>
            <button data-testid="place-encounter-finish" className="intro-btn-fire place-btn" onClick={finish} disabled={leaving}>
              ここに置いていく
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HeatRevisitScene ─────────────────────────────────────────────────────────
// 余熱への会い直し儀式。数値を主役にせず、触れ方と言葉で置き直す。
var HEAT_REVISIT_DEFS = {
  meaning: {
    label: '意味の影',
    introNarrative: '火の奥に、薄い影が残っていた。',
    beats: [
      { who: 'トイマン', charColor: '#7EB8D4', text: 'まだ、何か探している。' },
      { who: 'コタエ', charColor: '#b0a8cc', text: '問いとして記録できます。\n答えにはしません。' },
    ],
    question: 'この火は、何になってほしかったと思いますか？',
    choices: ['誰かに届くもの', '自分を残すもの', '次へ進むためのもの', '意味があったと思えるもの', 'まだ分からない'],
    traceLabel: '問い札',
  },
  value: {
    label: '価値の黒札',
    introNarrative: '黒い札が、火の端に貼りついていた。',
    beatsIfMet: [
      { who: '審査官', charColor: '#f87171', text: '確認する。' },
      { who: 'トイマン', charColor: '#7EB8D4', text: '判決は不要。' },
      { who: '審査官', charColor: '#f87171', text: 'では、札として分ける。\n本文には戻さない。' },
    ],
    beatsIfNotMet: [
      { who: 'コタエ', charColor: '#b0a8cc', text: 'この札は、本文ではありません。\nいまは仮置きします。' },
    ],
    question: 'この火には、どんな黒札が貼られていましたか？',
    choices: ['数字', '反応', '評価', '収益', '役に立つかどうか', '過去の自分'],
    traceLabel: '本文から離した黒札',
  },
  satisfaction: {
    label: '納得の灰',
    introNarrative: '棚の奥に、置き場所のない灰が残っていた。',
    beatsIfMet: [
      { who: 'うつろ', charColor: '#9ca3af', text: '終わったね。' },
      { who: 'トイマン', charColor: '#7EB8D4', text: '消えたのか。' },
      { who: 'うつろ', charColor: '#9ca3af', text: '違う。\n置き場所がなかっただけ。' },
    ],
    beatsIfNotMet: [
      { who: 'コタエ', charColor: '#b0a8cc', text: 'この灰は、まだ置き場所を探しています。\nいまは棚に仮置きします。' },
    ],
    question: 'この火は、本当は何になってほしかったと思いますか？',
    choices: ['誰かに届くもの', '自分を残すもの', '価値の証明', 'ただ、消えないもの', 'まだ分からない'],
    traceLabel: '棚に置いた灰',
  },
};

var TOUCH_MODES = [
  { id: '少しだけ触れる', key: 'light', desc: '余熱を少しほどく' },
  { id: '正面から見る', key: 'direct', desc: '余熱を大きくほどく' },
  { id: '今日はそばに置く', key: 'keep', desc: '急がなかった痕跡を残す' },
];

function HeatRevisitScene({ fire, heatType, metAuditor, metUtsuro, onComplete, memory }) {
  var def = HEAT_REVISIT_DEFS[heatType];
  var reunion = characterReunionLine(HEAT_CHARACTER[heatType], memory);
  var [phase, setPhase] = _useState('intro'); // intro | touch | choose | trace
  var [step, setStep] = _useState(0);
  var [touchMode, setTouchMode] = _useState(null);
  var [selected, setSelected] = _useState(null);
  var [visible, setVisible] = _useState(false);
  var [leaving, setLeaving] = _useState(false);

  _useEffect(function() {
    var t = setTimeout(function() { setVisible(true); }, 80);
    return function() { clearTimeout(t); };
  }, []);

  function doLeave(cb) { setLeaving(true); setTimeout(cb, 620); }

  var beats = def ? (
    heatType === 'meaning' ? def.beats :
    (heatType === 'value' ? (metAuditor ? def.beatsIfMet : def.beatsIfNotMet) :
    (metUtsuro ? def.beatsIfMet : def.beatsIfNotMet))
  ) : [];

  var atLastBeat = step >= beats.length - 1;

  function advanceIntro() {
    if (!atLastBeat) setStep(function(s) { return s + 1; });
    else setPhase('touch');
  }

  useOverlayKeys({
    onEnter: leaving ? null
      : phase === 'intro' ? advanceIntro
      : phase === 'trace' ? function() { doLeave(function() { onComplete(touchMode, selected); }); }
      : null,
    onEscape: (phase === 'touch' || phase === 'choose') ? function() {
      if (phase === 'choose') { setPhase('touch'); setTouchMode(null); }
      else doLeave(function() { onComplete(null, null); });
    } : null,
  });

  if (!def) return null;

  var wrapCls = 'intro-wrap heat-revisit-wrap' + (visible ? ' intro-visible' : '') + (leaving ? ' intro-leaving' : '');
  var beat = beats[step] || {};
  var sparedToday = (touchMode === '今日はそばに置く');
  // 急がなかった日は「何になるか」を決めない。残るのは「進めなかった」という痕跡。
  var traceText = sparedToday
    ? ('急がなかった余熱：' + def.label)
    : (selected ? (def.traceLabel + '：' + selected) : '');
  // キャラ応答（meaning はコタエが受け取る。急がなかった日は出さない）。
  var respCharKey = HEAT_CHARACTER[heatType] || (heatType === 'meaning' ? 'kotae' : null);
  var response = (!sparedToday && selected)
    ? buildCharacterResponse(respCharKey, selected, { traceCount: ((memory && memory.traceCount) || 0) + 1 })
    : null;

  function renderBeatContent(b) {
    return (
      <div className="heat-revisit-beat">
        {b.who && (
          <p className="heat-revisit-char" style={{ color: b.charColor || '#9aa3b5' }}>{b.who}</p>
        )}
        <p className="heat-revisit-line">{b.text}</p>
      </div>
    );
  }

  var heatTrapRef = useFocusTrap();

  return (
    <div className={'ritual-layer heat-revisit-wrap' + (leaving ? ' intro-leaving' : '')} ref={heatTrapRef} role="dialog" aria-modal="true" aria-label={'余熱に会い直す：' + def.label} onClick={function(e) { e.stopPropagation(); }}>
     <div className="ritual-card"><div className="ritual-body" aria-live="polite">

        {phase === 'intro' && (
          <div className="heat-revisit-intro intro-content-in">
            <p className="heat-revisit-label">{def.label}</p>
            <p className="heat-revisit-narrative">{def.introNarrative}</p>
            {/* 再会の一言。前にこの余熱を分けたキャラが、それを覚えている。 */}
            {step === 0 && reunion && (
              <div className="reunion-line">
                <span className="reunion-who" style={{ color: reunion.color }}>{reunion.who}</span>
                {reunion.lines.map(function(l, i) { return <p key={i} className="reunion-text">{l}</p>; })}
              </div>
            )}
            {renderBeatContent(beat)}
            <div className="intro-btn-row">
              <button data-testid="heat-intro-next" className="intro-btn-fire place-btn heat-btn" onClick={advanceIntro} disabled={leaving}>
                {atLastBeat ? '触れ方を選ぶ' : '次へ'}
              </button>
            </div>
          </div>
        )}

        {phase === 'touch' && (
          <div className="heat-revisit-touch intro-content-in">
            <p className="heat-revisit-label">{def.label}</p>
            <p className="heat-revisit-question">どのように触れますか？</p>
            <div className="heat-revisit-touch-opts">
              {TOUCH_MODES.map(function(tm) {
                return (
                  <button key={tm.id} data-testid={'heat-touch-' + tm.key} className="heat-revisit-touch-btn" onClick={function() {
                    setTouchMode(tm.id);
                    // 「今日はそばに置く」は何になるかを決めない。痕跡だけ残して終える。
                    setPhase(tm.id === '今日はそばに置く' ? 'trace' : 'choose');
                  }}>
                    <span className="heat-revisit-touch-id">{tm.id}</span>
                    <span className="heat-revisit-touch-desc">{tm.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === 'choose' && (
          <div className="heat-revisit-choose intro-content-in">
            <p className="heat-revisit-label">{def.label}</p>
            <p className="heat-revisit-question">{def.question}</p>
            <div className="heat-revisit-choices">
              {def.choices.map(function(c) {
                return (
                  <button key={c} data-testid="heat-choice" className="heat-revisit-choice-btn" onClick={function() {
                    setSelected(c);
                    setPhase('trace');
                  }}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === 'trace' && (
          <div className="heat-revisit-trace intro-content-in">
            <p className="heat-revisit-label">{def.label}</p>
            {/* キャラ応答 — 選んだ言葉を受け取る一言。痕跡の前に。 */}
            {response && (
              <div className="char-response">
                <span className="char-response-who" style={{ color: response.color }}>{response.who}</span>
                {response.lines.map(function(l, i) { return <p key={i} className="char-response-line">{l}</p>; })}
              </div>
            )}
            <div className="heat-revisit-trace-box">
              <p className="heat-revisit-trace-text">{traceText}</p>
            </div>
            <p className="heat-revisit-touch-chosen">
              {touchMode === '今日はそばに置く'
                ? '急がなかった。それも記録になる。'
                : '余熱が、少し落ち着いた。'}
            </p>
            <div className="intro-btn-row">
              <button
                data-testid="heat-finish"
                className="intro-btn-fire place-btn heat-btn"
                onClick={function() { doLeave(function() { onComplete(touchMode, selected); }); }}
                disabled={leaving}
              >
                ここに置いていく
              </button>
            </div>
          </div>
        )}

      </div></div>
    </div>
  );
}

// ── FinalReturnScene ─────────────────────────────────────────────────────────
// 心へ返す署名儀式。記録確認 → 三軸署名 → 返し方の選択 → 完了 or 保留。
// 灯貨は増やさない。プレイヤーが「言葉」で終点を選ぶ。
function FinalReturnScene({ fire, onReturn, onHold, onReviseQuestion }) {
  var [phase, setPhase] = _useState('record'); // record | sign | choice | done | hold_msg
  var [metrics, setMetrics] = _useState({ meaning: null, value: null, satisfaction: null });
  var [memo, setMemo] = _useState('');
  var [choiceMade, setChoiceMade] = _useState(null);
  var [crisisHold, setCrisisHold] = _useState(false);
  var [visible, setVisible] = _useState(false);
  var [leaving, setLeaving] = _useState(false);
  // 問いの置き直し: idle | editing | saved
  var [reviseMode, setReviseMode] = _useState('idle');
  var [reviseText, setReviseText] = _useState('');
  var [reviseCrisis, setReviseCrisis] = _useState(false);

  function submitRevision() {
    var t = reviseText.trim();
    if (!t) return;
    if (hasDanger(t)) { setReviseCrisis(true); return; }
    if (onReviseQuestion) onReviseQuestion(fire.id, t);
    setReviseMode('saved');
  }

  _useEffect(function() {
    var t = setTimeout(function() { setVisible(true); }, 80);
    return function() { clearTimeout(t); };
  }, []);

  function doLeave(cb) {
    setLeaving(true);
    setTimeout(cb, 620);
  }

  function proceedToChoice() {
    if (hasDanger(memo)) { setCrisisHold(true); return; }
    setPhase('choice');
  }

  function selectReturn(c) {
    setChoiceMade(c);
    setPhase('done');
  }

  function selectHold() {
    setPhase('hold_msg');
  }

  useOverlayKeys({
    onEnter: leaving ? null
      : phase === 'record' ? function() { setPhase('sign'); }
      : phase === 'done' ? function() { doLeave(function() { onReturn({ metrics: metrics, memo: memo, choice: choiceMade }); }); }
      : phase === 'hold_msg' ? function() { doLeave(function() { onHold({ memo: memo }); }); }
      : null,
    onEscape: (phase === 'choice') ? function() { setPhase('sign'); } : null,
  });

  var receipt = fire.receipt || {};
  var pt = fire.placeTrace || {};

  var AXES = [
    { key: 'meaning', label: '意味があった' },
    { key: 'value', label: '価値があった' },
    { key: 'satisfaction', label: '納得があった' },
  ];
  var AXIS_OPTS = ['あった', 'まだわからない', 'なかった'];

  var RETURN_CHOICES = [
    { id: 'certain', label: '納得があったから返す' },
    { id: 'still_pain', label: 'まだ痛いけど返す' },
    { id: 'unknown', label: '全部は分からないまま返す' },
  ];

  var wrapCls = 'intro-wrap final-return-wrap' + (visible ? ' intro-visible' : '') + (leaving ? ' intro-leaving' : '');
  var finalTrapRef = useFocusTrap();

  if (crisisHold) {
    return (
      <CrisisHold
        onHold={function() { setCrisisHold(false); setMemo(''); }}
        onProceed={function() { setCrisisHold(false); setPhase('choice'); }}
        proceedLabel="内容を確認して、続ける"
      />
    );
  }
  // 問いの置き直しに危機語が含まれた場合は保留室のみ（問いとして保存しない）。
  if (reviseCrisis) {
    return (
      <CrisisHold onHold={function() { setReviseCrisis(false); setReviseText(''); setReviseMode('idle'); }} />
    );
  }

  return (
    <div className={'ritual-layer final-return-wrap' + (leaving ? ' intro-leaving' : '')} ref={finalTrapRef} role="dialog" aria-modal="true" aria-label="心へ返す" onClick={function(e) { e.stopPropagation(); }}>
     <div className="ritual-card"><div className="ritual-body" aria-live="polite">

        {phase === 'record' && (
          <div className="final-return-record intro-content-in">
            <p className="intro-narrative-line final-return-heading">記録を確認してください</p>
            <div className="final-return-archive">
              {fire.kindle && (
                <div className="final-return-row">
                  <span className="final-return-label">原文</span>
                  <span className="final-return-value">{fire.kindle}</span>
                </div>
              )}
              {fire.question && (
                <div className="final-return-row">
                  <span className="final-return-label">問いの欠片</span>
                  <span className="final-return-value">{fire.question}</span>
                </div>
              )}
              {receipt.acceptanceText && (
                <div className="final-return-row">
                  <span className="final-return-label">受領証</span>
                  <span className="final-return-value">{receipt.acceptanceText}</span>
                </div>
              )}
              {pt.traceText && (
                <div className="final-return-row">
                  <span className="final-return-label">場所の痕跡</span>
                  <span className="final-return-value">{pt.traceText}</span>
                </div>
              )}
              {fire.heatTraces && fire.heatTraces.length > 0 && (
                <div className="final-return-row">
                  <span className="final-return-label">会い直した余熱</span>
                  {fire.heatTraces.map(function(ht, i) {
                    return <span key={i} className="final-return-value">{ht.traceText}</span>;
                  })}
                </div>
              )}
              {(function() {
                var ur = fire.unreceived || {};
                var remaining = [];
                if ((ur.meaning || 0) > 14) remaining.push('意味の影');
                if ((ur.value || 0) > 14) remaining.push('価値の黒札');
                if ((ur.satisfaction || 0) > 14) remaining.push('納得の灰');
                if (remaining.length === 0) return null;
                return (
                  <div className="final-return-row">
                    <span className="final-return-label">まだ残っている余熱</span>
                    {remaining.map(function(r, i) {
                      return <span key={i} className="final-return-value">{r}</span>;
                    })}
                  </div>
                );
              })()}
            </div>
            {/* 問いの足跡 — 署名する前に、この火へ置いてきた言葉を見返す。 */}
            <QuestionFootprints fire={fire} limit={3} variant="final" />
            {/* 受け取られた言葉 — キャラが受け取った応答の最新1〜3件。 */}
            {(fire.characterResponses || []).length > 0 && (
              <div className="received-words">
                <p className="received-words-label">受け取られた言葉</p>
                {fire.characterResponses.slice(-3).map(function(r, i) {
                  return (
                    <div key={i} className="received-words-item">
                      <span className="received-words-who" style={{ color: RESPONSE_COLORS[r.character] || '#9aa3b5' }}>
                        {RESPONSE_NAMES[r.character] || r.character}
                      </span>
                      <span className="received-words-text">{r.text.split('\n')[0]}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* 問いを置き直す — 解決でも正解でもなく、今の言葉で置き直す。最初の問いは消さない。 */}
            <div className="revise-q">
              <p className="revise-q-label">問いを置き直す</p>
              <div className="revise-q-row">
                <span className="revise-q-k">最初の問い</span>
                <span className="revise-q-v">「{originalQuestion(fire)}」</span>
              </div>
              {currentQuestion(fire) !== originalQuestion(fire) && (
                <div className="revise-q-row">
                  <span className="revise-q-k">いま見えている問い</span>
                  <span className="revise-q-v revise-q-now">「{currentQuestion(fire)}」</span>
                </div>
              )}
              <p className="revise-q-note">問いは、答えではありません。<br />今の言葉で、置き直すことができます。</p>

              {reviseMode === 'idle' && (
                <div className="revise-q-btns">
                  <button className="revise-q-btn-keep" onClick={function() { setReviseMode('done-keep'); }}>このままにする</button>
                  <button data-testid="question-revise-open" className="revise-q-btn-edit" onClick={function() { setReviseText(''); setReviseMode('editing'); }}>今の言葉で置き直す</button>
                </div>
              )}
              {reviseMode === 'editing' && (
                <div className="revise-q-edit">
                  <p className="revise-q-edit-lead">この問いを、今の言葉で書いてください。</p>
                  <textarea data-testid="question-revise-input" className="revise-q-input" rows={3} value={reviseText}
                    onChange={function(e) { setReviseText(e.target.value); }} placeholder="……" />
                  <div className="revise-q-btns">
                    <button className="revise-q-btn-keep" onClick={function() { setReviseMode('idle'); }}>やめる</button>
                    <button data-testid="question-revise-save" className="revise-q-btn-edit" onClick={submitRevision} disabled={!reviseText.trim()}>置き直す</button>
                  </div>
                </div>
              )}
              {reviseMode === 'saved' && (
                <div className="revise-q-saved">
                  <p className="revise-q-voice"><span className="revise-q-who kotae">コタエ</span>問いを置き直しました。<br />答えではありません。<br />今の言葉で、もう一度置きました。</p>
                  <p className="revise-q-voice"><span className="revise-q-who toyman">トイマン</span>形が変わった。<br />でも、火は同じ。</p>
                </div>
              )}
            </div>

            <div className="intro-btn-row">
              <button data-testid="final-return-sign" className="intro-btn-fire place-btn" onClick={function() { setPhase('sign'); }} disabled={leaving}>
                署名へ進む
              </button>
            </div>
          </div>
        )}

        {phase === 'sign' && (
          <div className="final-return-sign intro-content-in">
            <p className="intro-narrative-line final-return-heading">この火との時間を振り返って</p>
            <div className="final-return-axes">
              {AXES.map(function(ax) {
                return (
                  <div key={ax.key} className="final-return-axis-row">
                    <span className="final-return-axis-label">{ax.label}</span>
                    <div className="final-return-axis-opts">
                      {AXIS_OPTS.map(function(opt) {
                        var sel = metrics[ax.key] === opt;
                        return (
                          <button
                            key={opt}
                            data-testid={'final-axis-' + ax.key}
                            className={'final-return-axis-btn' + (sel ? ' selected' : '')}
                            onClick={function() {
                              setMetrics(function(prev) {
                                var n = Object.assign({}, prev); n[ax.key] = opt; return n;
                              });
                            }}
                          >{opt}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="final-return-memo-wrap">
              <p className="final-return-memo-label">この火を返す前に、最後に一言だけ残してください。<br /><span className="final-return-memo-sub">空欄でも構いません。</span></p>
              <textarea
                data-testid="final-return-memo"
                className="final-return-memo"
                rows={3}
                value={memo}
                onChange={function(e) { setMemo(e.target.value); }}
                placeholder="……"
              />
            </div>
            <div className="intro-btn-row">
              <button data-testid="final-return-sign-next" className="intro-btn-fire place-btn" onClick={proceedToChoice} disabled={leaving}>
                次へ
              </button>
            </div>
          </div>
        )}

        {phase === 'choice' && (
          <div className="final-return-choice intro-content-in">
            <p className="intro-narrative-line final-return-heading">どのように、返しますか</p>
            <div className="final-return-choices">
              {RETURN_CHOICES.map(function(rc) {
                return (
                  <button key={rc.id} data-testid="final-return-submit" className="final-return-choice-btn" onClick={function() { selectReturn(rc.label); }}>
                    {rc.label}
                  </button>
                );
              })}
              <button data-testid="final-return-hold" className="final-return-choice-btn final-return-hold-btn" onClick={selectHold}>
                今日はまだ返さない
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="final-return-done intro-content-in">
            <p className="intro-narrative-line">火は、棚から消えた。</p>
            <div style={{ height: 18 }} />
            <p className="intro-narrative-line">でも、記録塔の奥に、</p>
            <p className="intro-narrative-line">小さな場所が空いた。</p>
            <div style={{ height: 24 }} />
            <p className="final-return-char" style={{ color: '#7EB8D4' }}>トイマン</p>
            <p className="intro-narrative-line">帰った。</p>
            <div style={{ height: 12 }} />
            <p className="final-return-char" style={{ color: '#b0a8cc' }}>コタエ</p>
            <p className="intro-narrative-line">消失ではありません。<br />返却です。</p>
            <div className="intro-btn-row">
              <button
                data-testid="final-return-close"
                className="intro-btn-fire place-btn"
                onClick={function() { doLeave(function() { onReturn({ metrics: metrics, memo: memo, choice: choiceMade }); }); }}
                disabled={leaving}
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {phase === 'hold_msg' && (
          <div className="final-return-hold intro-content-in">
            <p className="final-return-char" style={{ color: '#b0a8cc' }}>コタエ</p>
            <p className="intro-narrative-line">保留しました。<br />返さないことも、記録します。</p>
            <div style={{ height: 16 }} />
            <p className="final-return-char" style={{ color: '#7EB8D4' }}>トイマン</p>
            <p className="intro-narrative-line">まだ置く。それでいい。</p>
            <div className="intro-btn-row">
              <button
                data-testid="final-return-hold-close"
                className="intro-btn-fire place-btn"
                onClick={function() { doLeave(function() { onHold({ memo: memo }); }); }}
                disabled={leaving}
              >
                閉じる
              </button>
            </div>
          </div>
        )}

      </div></div>
    </div>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────

function App() {
  var [game, setGame] = _useState(function() {
    var saved = loadSave();
    return saved ? saved : initGame();
  });
  var [introActive, setIntroActive] = _useState(function() {
    var saved = loadSave();
    var g = saved ? saved : initGame();
    return !g.seenWorldIntro && g.fires.length === 0;
  });
  var [screen, setScreen] = _useState('home');
  var [kotaeDialog, setKotaeDialog] = _useState(null); // { fireId, kind }
  var [activeUnreceivedFireId, setActiveUnreceivedFireId] = _useState(null);
  var [actionResult, setActionResult] = _useState(null);
  // 火を灯した直後の「預ける場面」。対象 fire の id を持つ。
  var [entrustFireId, setEntrustFireId] = _useState(null);
  // 受領の旅: { fireId, phase: 'journey'|'card' }
  var [receiptJourney, setReceiptJourney] = _useState(null);
  var [milestoneDialog, setMilestoneDialog] = _useState(null);
  // 受領証閲覧: RecordTower「受領証を見る」用
  var [activeReceiptView, setActiveReceiptView] = _useState(null); // fireId
  // 返却灯閲覧: RecordTower「返却灯を見る」用
  var [activeReturnLamp, setActiveReturnLamp] = _useState(null); // fireId
  // 保存失敗の通知。一度だけ出す（連続失敗で何度も出さない）。
  var [saveError, setSaveError] = _useState(false);
  var saveErrorShownRef = _useRef(false);
  // 全記録の初期化確認（世界内モーダル）
  var [resetConfirm, setResetConfirm] = _useState(false);
  // 留守のあいだ（戻ってきた時に一度だけ）
  var [awayReport, setAwayReport] = _useState(null);
  var awayCheckedRef = _useRef(false);
  // 場所での初回出会い { fireId }
  var [placeEncounter, setPlaceEncounter] = _useState(null);
  // 心へ返す署名儀式 — fireId
  var [finalReturnFireId, setFinalReturnFireId] = _useState(null);
  // 余熱への会い直し儀式 — { fireId, heatType }
  var [heatRevisitState, setHeatRevisitState] = _useState(null);
  var tickRef = _useRef(null);

  // 各ハンドラが常に最新の committed game から実処理できるよう、
  // レンダー毎に同期する ref。これで useCallback([]) を安定させつつ
  // 自動 tick との競合（stale closure による上書き）を避ける。
  var gameRef = _useRef(game);
  gameRef.current = game;

  _useEffect(function() {
    var res = persistSave(game);
    // 保存に失敗したら、世界の言葉で一度だけ知らせる（黙殺しない）。
    if (res && !res.ok && !saveErrorShownRef.current) {
      saveErrorShownRef.current = true;
      setSaveError(true);
    }
  }, [game]);

  // 起動時に一度だけ「留守のあいだ」を判定する。常に lastSeenAt を今に更新する。
  // 初回（イントロ中）は出さない。
  _useEffect(function() {
    if (awayCheckedRef.current) return;
    awayCheckedRef.current = true;
    var result = computeAwayReturn(gameRef.current, introActive);
    setGame(result.game);
    if (result.report) setAwayReport(result.report);
  }, []);

  // actionResult は一時通知。タブ（screen）を切り替えたら消す。
  // fire の status 変化では消さない（doBattle→found で結果が消えないように）。
  _useEffect(function() {
    setActionResult(null);
  }, [screen]);

  var closeActionResult = _useCallback(function() { setActionResult(null); }, []);

  _useEffect(function() {
    tickRef.current = setInterval(function() {
      setGame(function(prev) {
        var result = tickProgress(prev);
        return result.changed ? result.game : prev;
      });
    }, TICK_INTERVAL);
    return function() { clearInterval(tickRef.current); };
  }, []);

  var handleLightFire = _useCallback(function(kindle, pain, writeState, feeling, metrics) {
    var result = lightFire(gameRef.current, kindle, pain, writeState, feeling, metrics);
    setGame(result.game);
    // 灯した直後は「預ける場面」へ。通常UIに即戻さない。
    setEntrustFireId(result.fire.id);
  }, []);

  var handleDoBattle = _useCallback(function(fireId, answer) {
    var result = doBattle(gameRef.current, fireId, answer);
    if (result.ok) {
      setGame(result.game);
      setActionResult(result.actionResult || null);
      // 問いの欠片を見つけた瞬間は DiscoveryScene が引き受ける。
      // 節目ダイアログと二重に被せない（found に達した戦闘では milestone を出さない）。
      if (result.milestone && result.fire && result.fire.status !== 'found') {
        setMilestoneDialog(result.milestone);
      }
    }
  }, []);

  var handleBeginJourney = _useCallback(function(fireId) {
    var result = beginReceiptJourney(gameRef.current, fireId);
    if (result.ok) {
      setGame(result.game);
      setReceiptJourney({ fireId: fireId, phase: 'journey' });
    }
  }, []);

  // 発見シーンの「記録塔へ届ける」。発見済みフラグを立て、そのまま受領の旅へ運ぶ。
  var handleDeliverToTower = _useCallback(function(fireId) {
    var g = cloneS(gameRef.current);
    var fire = g.fires.find(function(f) { return f.id === fireId; });
    if (fire) fire.discoverySeen = true;
    var result = beginReceiptJourney(g, fireId);
    if (result.ok) {
      setGame(result.game);
      setReceiptJourney({ fireId: fireId, phase: 'journey' });
    } else {
      setGame(g); // 旅に入れなくても、発見済みフラグだけは残す
    }
  }, []);

  var handlePlaceEncounterDone = _useCallback(function(fireId, selected) {
    var result = completePlaceEncounter(gameRef.current, fireId, selected);
    if (result.ok) setGame(result.game);
    setPlaceEncounter(null);
  }, []);

  var handleUpdateLastSeen = _useCallback(function() {
    setGame(function(prev) {
      var ns = cloneS(prev);
      ns.lastSeenAt = nowISO();
      return ns;
    });
  }, []);

  var handleReexplore = _useCallback(function(fireId, type) {
    setHeatRevisitState({ fireId: fireId, heatType: type });
  }, []);

  var handleRevisitHeatDone = _useCallback(function(fireId, heatType, touchMode, selected) {
    setHeatRevisitState(null);
    // touchMode が null = Esc キャンセル（何も記録しない）。
    // 「今日はそばに置く」は selected が null でも痕跡を残すので、touchMode だけで判定する。
    if (touchMode) {
      var result = revisitHeat(gameRef.current, fireId, heatType, touchMode, selected);
      if (result.ok) setGame(result.game);
    }
  }, []);

  var handleRestUnreceived = _useCallback(function(fireId) {
    var result = restUnreceived(gameRef.current, fireId);
    if (result.ok) {
      setGame(result.game);
      setActionResult(result.actionResult || null);
    }
  }, []);

  // 「火を心へ返す」ボタン → FinalReturnScene を開くだけ。実際の返却は handleFinalReturn。
  var handleReturnToHeart = _useCallback(function(fireId) {
    setFinalReturnFireId(fireId);
  }, []);

  // 署名完了 → 実際に返却
  var handleFinalReturn = _useCallback(function(fireId, finalData) {
    var result = returnFireToHeart(gameRef.current, fireId, finalData);
    setFinalReturnFireId(null);
    if (result.ok) {
      setGame(result.game);
      setActionResult(result.actionResult || null);
    }
  }, []);

  // 「今日はまだ返さない」→ 保留記録だけ残して閉じる
  var handleHoldReturn = _useCallback(function(fireId, holdData) {
    var result = holdFinalReturn(gameRef.current, fireId, holdData ? holdData.memo : '');
    setFinalReturnFireId(null);
    if (result.ok) setGame(result.game);
  }, []);

  var handleReviseQuestion = _useCallback(function(fireId, toText) {
    var result = reviseQuestion(gameRef.current, fireId, toText);
    if (result.ok) setGame(result.game);
  }, []);

  // 選択中の火を game に保存（リロードでも維持）。状態は変えない（レイアウトの選択のみ）。
  var handleSelectFire = _useCallback(function(fireId) {
    setGame(function(prev) {
      if (prev.selectedFireId === fireId) return prev;
      var ns = cloneS(prev);
      ns.selectedFireId = fireId;
      return ns;
    });
  }, []);

  var handleWatchFire = _useCallback(function(fireId) {
    var result = watchFire(gameRef.current, fireId);
    if (result.ok) {
      setGame(result.game);
      setActionResult(result.actionResult || null);
    }
  }, []);

  var handleBuyMarket = _useCallback(function(newGame) {
    setGame(newGame);
  }, []);

  var handleRestToday = _useCallback(function(fireId) {
    var result = restToday(gameRef.current, fireId);
    if (result.ok) {
      // tearsSpring が今回の休息で初解放されたらかなエンカウント
      var ng = result.game;
      if (ng.unlocks.tearsSpring && !gameRef.current.unlocks.tearsSpring) {
        if (hasSeenPlaceEncounter(ng, 'tears')) {
          ng = triggerEncounter(ng, 'kana_first_rest', { fireId: fireId });
        }
      }
      setGame(ng);
      setActionResult(result.actionResult || null);
    }
  }, []);

  var handleIntroMarkSeen = _useCallback(function() {
    setGame(function(prev) {
      var ns = cloneS(prev);
      ns.seenWorldIntro = true;
      return ns;
    });
  }, []);

  var handleIntroFireLit = _useCallback(function(kindle, pain, writeState, feeling, metrics) {
    var result = lightFire(gameRef.current, kindle, pain, writeState, feeling, metrics);
    var ng = result.game;
    ng.seenWorldIntro = true;
    setGame(ng);
    setIntroActive(false);
    // イントロ → 火に言葉を置く → 預ける場面、と熱を切らさず繋ぐ。
    setEntrustFireId(result.fire.id);
  }, []);

  var handleReplayIntro = _useCallback(function() {
    setGame(function(prev) {
      var ns = cloneS(prev);
      ns.seenWorldIntro = false;
      return ns;
    });
    setIntroActive(true);
  }, []);

  // リセットは世界内モーダルで確認する（OSの window.confirm は世界の壁を壊す）。
  var handleReset = _useCallback(function() {
    setResetConfirm(true);
  }, []);

  var doReset = _useCallback(function() {
    clearSave();
    setGame(initGame());
    setIntroActive(true);
    setEntrustFireId(null);
    setScreen('home');
    setResetConfirm(false);
  }, []);

  var handleForceFound = _useCallback(function(fireId) {
    setGame(function(prev) {
      var ns = cloneS(prev);
      var fire = ns.fires.find(function(f) { return f.id === fireId; });
      if (!fire) return prev;
      fire.questionProgress = 100;
      fire.status = 'found';
      fire.question = makeQuestion(fire);
      fire.foundAt = nowISO();
      ns.toyman = { location: 'starting_room', state: 'returning' };
      return ns;
    });
  }, []);

  var handleAddBattle = _useCallback(function(fireId) {
    setGame(function(prev) {
      var ns = cloneS(prev);
      var fire = ns.fires.find(function(f) { return f.id === fireId; });
      if (!fire) return prev;
      fire.questionProgress = Math.min(100, (fire.questionProgress || 0) + 30);
      if (fire.questionProgress >= 100) {
        fire.status = 'found';
        fire.question = makeQuestion(fire);
        fire.foundAt = nowISO();
        ns.toyman = { location: 'starting_room', state: 'returning' };
      }
      return ns;
    });
  }, []);

  // 儀式レイヤーが前面にある間は、背後の箱庭レイヤー（Home/Garden/Shelf）を描画しない。
  // fixed で覆ってはいるが、背景のスクロール漏れ・誤タップを防ぎ、構成の崩れを断つ。
  var ritualActive = introActive || !!entrustFireId || !!placeEncounter ||
    !!heatRevisitState || !!finalReturnFireId || !!awayReport ||
    (receiptJourney && receiptJourney.phase === 'journey');

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      background: '#0d0f14', color: '#e2e4ee',
      fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif',
      paddingBottom: 60,
    }}>
      {introActive && (
        <IntroScene
          onMarkSeen={handleIntroMarkSeen}
          onFireLit={handleIntroFireLit}
        />
      )}
      {/* 火を灯した直後の「預ける場面」— イントロより前面、探索への橋渡し */}
      {!introActive && entrustFireId && (function() {
        var fire = game.fires.find(function(f) { return f.id === entrustFireId; });
        if (!fire) return null;
        return (
          <EntrustScene
            fire={fire}
            short={game.fires.length > 1}
            onDone={function() {
              setEntrustFireId(null);
              setScreen('garden');
            }}
          />
        );
      })()}
      {/* 発見シーン — found の初回だけ。バナーではなく場面で迎える。 */}
      {!introActive && !entrustFireId && !receiptJourney && (function() {
        var fire = game.fires.find(function(f) { return f.status === 'found' && !f.discoverySeen; });
        if (!fire) return null;
        return (
          <DiscoveryScene
            fire={fire}
            onDeliver={function() { handleDeliverToTower(fire.id); }}
          />
        );
      })()}
      {/* 留守のあいだ — 戻ってきた時に最初に出る。問いは進まず、火は世話されていた。 */}
      {!introActive && !entrustFireId && awayReport && (
        <AwayReport report={awayReport} onClose={function() { setAwayReport(null); }} />
      )}
      {/* 場所での初回出会い — 開いた場所へ会いに行く。余熱を一つ分ける。 */}
      {!introActive && !entrustFireId && placeEncounter && (function() {
        var fire = game.fires.find(function(f) { return f.id === placeEncounter.fireId; });
        if (!fire || !fire.openedPlace) return null;
        return (
          <PlaceEncounterScene
            fire={fire}
            memory={(game.characterMemory || {})[PLACE_CHARACTER[fire.openedPlace.id]]}
            onComplete={function(selected) { handlePlaceEncounterDone(fire.id, selected); }}
          />
        );
      })()}
      {/* 余熱への会い直し儀式 — HeatRevisitScene */}
      {!introActive && !entrustFireId && !placeEncounter && !finalReturnFireId && heatRevisitState && (function() {
        var fire = game.fires.find(function(f) { return f.id === heatRevisitState.fireId; });
        if (!fire) return null;
        return (
          <HeatRevisitScene
            fire={fire}
            heatType={heatRevisitState.heatType}
            metAuditor={hasSeenPlaceEncounter(game, 'black_tags')}
            metUtsuro={hasSeenPlaceEncounter(game, 'back_shelf')}
            memory={(game.characterMemory || {})[HEAT_CHARACTER[heatRevisitState.heatType]]}
            onComplete={function(touchMode, selected) {
              handleRevisitHeatDone(heatRevisitState.fireId, heatRevisitState.heatType, touchMode, selected);
            }}
          />
        );
      })()}
      {/* 心へ返す署名儀式 — FinalReturnScene */}
      {!introActive && !entrustFireId && !placeEncounter && !heatRevisitState && finalReturnFireId && (function() {
        var fire = game.fires.find(function(f) { return f.id === finalReturnFireId; });
        if (!fire) return null;
        return (
          <FinalReturnScene
            fire={fire}
            onReturn={function(data) { handleFinalReturn(finalReturnFireId, data); }}
            onHold={function(data) { handleHoldReturn(finalReturnFireId, data); }}
            onReviseQuestion={handleReviseQuestion}
          />
        );
      })()}
      {!ritualActive && screen === 'home' && (
        <HomeView
          game={game}
          onLightFire={handleLightFire}
          onSelectFire={handleSelectFire}
          onGoShelf={function() { setScreen('shelf'); }}
          onGoGarden={function() { setScreen('garden'); }}
          onNextAction={function(go, fireId) {
            if (go === 'garden') { setScreen('garden'); }
            else if (go === 'shelf') { setScreen('shelf'); }
            else if (go === 'unreceived') { setActiveUnreceivedFireId(fireId); setScreen('garden'); }
            else if (go === 'deliver') { handleDeliverToTower(fireId); }
            else if (go === 'encounter') { setPlaceEncounter({ fireId: fireId }); }
            else if (go === 'returnlamp') { setActiveReturnLamp(fireId); }
          }}
        />
      )}
      {!ritualActive && screen === 'shelf' && (
        <ShelfView
          game={game}
          onBack={function() { setScreen('home'); }}
          onDoBattle={handleDoBattle}
          onWatchFire={handleWatchFire}
          onRestToday={handleRestToday}
          onReceive={handleBeginJourney}
          onReexplore={handleReexplore}
          onRestUnreceived={handleRestUnreceived}
          onReturnToHeart={handleReturnToHeart}
          actionResult={actionResult}
          onCloseActionResult={closeActionResult}
        />
      )}
      {!ritualActive && screen === 'garden' && (
        <GardenView
          game={game}
          onBack={function() { setScreen('home'); }}
          onGoShelf={function() { setScreen('shelf'); }}
          onDoBattle={handleDoBattle}
          onWatchFire={handleWatchFire}
          onRestToday={handleRestToday}
          onReceive={handleBeginJourney}
          onUpdateLastSeen={handleUpdateLastSeen}
          onBuyMarket={handleBuyMarket}
          onReexplore={handleReexplore}
          onRestUnreceived={handleRestUnreceived}
          onReturnToHeart={handleReturnToHeart}
          actionResult={actionResult}
          onCloseActionResult={closeActionResult}
          activeUnreceivedFireId={activeUnreceivedFireId}
          onGoUnreceivedFromTower={function(fid) { setActiveUnreceivedFireId(fid); }}
          onViewReceipt={function(fid) { setActiveReceiptView(fid); }}
          onViewReturnLamp={function(fid) { setActiveReturnLamp(fid); }}
        />
      )}
      {kotaeDialog && (
        <KotaeDialog
          kind={kotaeDialog.kind}
          onConfirm={function() {
            var d = kotaeDialog;
            setKotaeDialog(null);
            if (d.kind === 'receive') {
              setActiveUnreceivedFireId(d.fireId);
              setScreen('garden');
            }
          }}
        />
      )}
      {game.activeEncounter && (
        <EncounterDialog
          encounterId={game.activeEncounter.encounterId}
          onConfirm={function() {
            var enc = gameRef.current.activeEncounter;
            var ng = dismissEncounter(gameRef.current);
            setGame(ng);
            if (enc && enc.fireId) {
              var def = ENCOUNTER_DEFS[enc.encounterId];
              if (def && def.nav === 'garden_unreceived') {
                setActiveUnreceivedFireId(enc.fireId);
                setScreen('garden');
              }
            }
          }}
        />
      )}

      {/* 節目イベント */}
      {milestoneDialog && !receiptJourney && (
        <MilestoneDialog
          milestone={milestoneDialog}
          onClose={function() { setMilestoneDialog(null); }}
        />
      )}

      {/* 受領の旅 — 常に最前面 */}
      {receiptJourney && receiptJourney.phase === 'journey' && (function() {
        var fire = gameRef.current.fires.find(function(f) { return f.id === receiptJourney.fireId; });
        if (!fire) return null;
        return (
          <ReceiptJourney
            fire={fire}
            onJourneyDone={function(data) {
              var result = completeReceiptJourney(gameRef.current, receiptJourney.fireId, data);
              if (result.ok) {
                var ng = saveReceiptNotes(result.game);
                setGame(ng);
                setActionResult(result.actionResult || null);
                setReceiptJourney({ fireId: receiptJourney.fireId, phase: 'card' });
              }
            }}
          />
        );
      })()}
      {receiptJourney && receiptJourney.phase === 'card' && (function() {
        var fire = gameRef.current.fires.find(function(f) { return f.id === receiptJourney.fireId; });
        if (!fire) return null;
        return (
          <div className="kotae-ov">
            <div className="kotae-sheet" onClick={function(e) { e.stopPropagation(); }}>
              <div className="kotae-grip" />
              <ReceiptCard
                fire={fire}
                buttonLabel="余熱に会い直す"
                onAction={function() {
                  var fid = receiptJourney.fireId;
                  setReceiptJourney(null);
                  setActiveUnreceivedFireId(fid);
                  setScreen('garden');
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* 受領証閲覧 — RecordTower「受領証を見る」から */}
      {activeReceiptView && (function() {
        var fire = gameRef.current.fires.find(function(f) { return f.id === activeReceiptView; });
        if (!fire) return null;
        return (
          <div className="kotae-ov" onClick={function() { setActiveReceiptView(null); }}>
            <div className="kotae-sheet" onClick={function(e) { e.stopPropagation(); }}>
              <div className="kotae-grip" />
              <ReceiptCard
                fire={fire}
                buttonLabel="閉じる"
                onAction={function() { setActiveReceiptView(null); }}
              />
            </div>
          </div>
        );
      })()}
      {/* 返却灯閲覧 — RecordTower「返却灯を見る」から */}
      {activeReturnLamp && (function() {
        var fire = gameRef.current.fires.find(function(f) { return f.id === activeReturnLamp; });
        if (!fire) return null;
        return (
          <div className="kotae-ov" onClick={function() { setActiveReturnLamp(null); }}>
            <div className="kotae-sheet" onClick={function(e) { e.stopPropagation(); }}>
              <div className="kotae-grip" />
              <ReturnLampCard fire={fire} onClose={function() { setActiveReturnLamp(null); }} />
            </div>
          </div>
        );
      })()}
      {saveError && (
        <SaveErrorNotice onDismiss={function() { setSaveError(false); }} />
      )}
      {resetConfirm && (
        <ResetConfirm
          onCancel={function() { setResetConfirm(false); }}
          onConfirm={doReset}
        />
      )}
      <DevBar
        game={game}
        onReset={handleReset}
        onForceFound={handleForceFound}
        onAddBattle={handleAddBattle}
        onReplayIntro={handleReplayIntro}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
