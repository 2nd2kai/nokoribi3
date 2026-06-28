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
    seenEncounters: [],
    worldNotes: [],
    relationshipNotes: [],
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
  return {
    id: 'f' + Date.now() + Math.floor(rnd() * 1000),
    kindle: kindle.trim(),
    pain: (pain || '').trim(),
    writeState: writeState || '',
    feeling: feeling || '',
    metrics: met,
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
  if (!g.introSeen) g.introSeen = { kotae: false, kana: false, utsuro: false, auditor: false };
  if (!('seenWorldIntro' in g)) g.seenWorldIntro = false;
  if (!Array.isArray(g.seenEncounters)) g.seenEncounters = [];
  if (!Array.isArray(g.worldNotes)) g.worldNotes = [];
  if (!Array.isArray(g.relationshipNotes)) g.relationshipNotes = [];
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
    ns = triggerEncounter(ns, 'auditor_first_value', { fireId: fireId });
  }

  return { ok: true, game: ns, visualEvent: ve, actionResult: actionResult };
}

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
  // 「今日は置いておく」のは報酬行為ではない。残るのは灯貨ではなく、水滴の跡。
  ns.materials = safeMat(ns.materials);
  ns.materials.drop += 1;
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
    gains: [{ label: '水滴', amount: 1 }],
    traces: ['火は、今日もここに置かれた。', '水滴が、火の近くに置かれた。'],
  });
  return { ok: true, game: ns, visualEvent: ve, actionResult: actionResult };
}

// 未受領3領域がすべて静かな痕跡になった火を、心へ返す（このサイクルの終点）。
function returnFireToHeart(game, fireId) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'received') return { ok: false, game: game };
  if (!isAllSettled(fire)) return { ok: false, reason: 'not_settled', game: game };
  fire.status = 'returned';
  fire.returnedAt = nowISO();
  fire.updatedAt = nowISO();
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
  ns = triggerEncounter(ns, 'utsuro_first_return', { fireId: fireId });
  return { ok: true, game: ns, visualEvent: ve, actionResult: actionResult };
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
  // 影へ進むのは報酬行為ではない。残るのは灯貨ではなく、焦げた紙片という痕跡。
  ns.materials = safeMat(ns.materials);
  ns.materials.paper = (ns.materials.paper || 0) + 1;
  if (answer && answer.trim()) {
    fire.answers = (fire.answers || []).concat([{ text: answer.trim(), at: nowISO() }]);
  }
  addLog(fire, pick(BATTLE_LOGS));
  addGardenItem(ns, 'burnt_paper');
  var lkResult = advanceLightkeeper(ns, 5);
  // 紙集めの小人解放条件
  if (!ns.tinyfolk.paperCollector && ns.materials.paper >= 3) {
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
  var actionResult = makeActionResult({
    title: '影と向き合った',
    gains: [{ label: '紙片', amount: 1 }],
    traces: ['焦げた紙片が、森に残った。'],
  });
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
  // 完了。灯守りの仕事は守られた痕跡（石）を残すもの。灯貨は増やさない。
  lk.progress = 0;
  addGardenItem(ns, 'small_stone');
  ns.materials = safeMat(ns.materials);
  ns.materials.ash = (ns.materials.ash || 0) + 1;
  var sf = ns.fires.find(function(f) { return f.status === 'searching'; });
  if (sf) sf.gardenProgress = Math.min(100, (sf.gardenProgress || 0) + 3);
  return {
    advanced: true, completed: true, before: before, after: 0, amount: amount,
    completion: {
      label: '灯守りの仕事完了',
      message: '灯守りが、小さな石を置いた。',
      trace: 'small_stone',
      gains: [
        { label: '灰片', amount: 1 },
        { label: '火の安定', amount: 3 },
      ],
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
  ns.materials = safeMat(ns.materials);
  ns.materials.ash = (ns.materials.ash || 0) + 1;
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
    gains: [{ label: '灰片', amount: 1 }],
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
  // 休ませることも灯貨稼ぎではない。火のそばに痕跡だけが残る。
  ns.materials = safeMat(ns.materials);
  ns.materials.drop = (ns.materials.drop || 0) + 1;
  addGardenItem(ns, 'rest_chair');
  addGardenItem(ns, 'water_drop');
  var lkResult = advanceLightkeeper(ns, 15);
  // 水汲みの小人解放条件
  if (!ns.tinyfolk.waterCarrier && fire.restCount >= 3) {
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
    gains: [{ label: '水滴', amount: 1 }],
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
  fire.updatedAt = nowISO();

  // 受領証が発行される——この火が丁寧に扱われたあと、世界に余光がひとつこぼれる。
  // これが灯貨の増える、唯一の正規の場面。報酬ではなく、こぼれた灯り。
  spillAfterglow(ns, 1);
  ns.materials = safeMat(ns.materials);
  ns.materials.stamp = (ns.materials.stamp || 0) + 1;
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
    gains: [{ label: '受領印', amount: 1 }],
    traces: [
      '遠くの記録塔に、灯りがともった。',
      'この火から、灯りがひとつこぼれた。灯守りが、それを拾った。',
    ],
  });
  return { ok: true, game: ns, visualEvent: ve, actionResult: actionResult, fireId: fireId };
}

// ── React Components ────────────────────────────────────────────────────────

var _useState = React.useState;
var _useEffect = React.useEffect;
var _useCallback = React.useCallback;
var _useRef = React.useRef;

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

// 素材チップ表示
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
  return (
    <div className="crisis-hold-ov" role="alert">
      <div className="crisis-hold-card" onClick={function(e) { e.stopPropagation(); }}>
        <div className="crisis-dialogue">
          <span className="crisis-name crisis-kotae">コタエ</span>
          <p className="crisis-line">この言葉は、通常の記録として扱いません。</p>
          <span className="crisis-name crisis-toyman">トイマン</span>
          <p className="crisis-line">置いていくのか。</p>
          <span className="crisis-name crisis-kotae">コタエ</span>
          <p className="crisis-line">いいえ。<br />先に、安全な場所へ置きます。</p>
          <p className="crisis-soft">今は、答えを出さなくていい。<br />今は、決めなくていい。</p>
        </div>
        <div className="crisis-support">
          <p className="crisis-support-lead">{SUPPORT_INFO.lead}</p>
          <p className="crisis-support-name">{SUPPORT_INFO.name}</p>
          <p className="crisis-support-num">{SUPPORT_INFO.number}</p>
          <p className="crisis-support-sub">{SUPPORT_INFO.sub}</p>
        </div>
        <button className="crisis-hold-btn" onClick={onHold}>今は、ここに置いておく</button>
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
            <button onClick={handleSubmit} style={{
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
          <button onClick={function() { setMode('confront'); }} style={{
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

function FireInputForm({ onSubmit, onCancel }) {
  var [kindle, setKindle] = _useState('');
  var [pain, setPain] = _useState('');
  var [writeState, setWriteState] = _useState('');
  var [feeling, setFeeling] = _useState('');
  var [meaning, setMeaning] = _useState(50);
  var [value, setValue] = _useState(50);
  var [satisfaction, setSatisfaction] = _useState(50);
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
    onSubmit(kindle, pain, writeState, feeling, { meaning: meaning, value: value, satisfaction: satisfaction });
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
            <button onClick={handleNext} disabled={!kindle.trim()} style={{
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
          <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 8 }}>
            その言葉との関係は？
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {WRITE_STATES.map(function(ws) {
              return (
                <button key={ws} onClick={function() { setWriteState(ws); }} style={{
                  padding: '7px 12px', borderRadius: 20, fontSize: 13,
                  background: writeState === ws ? '#7c3aed' : '#1a1e2c',
                  border: '1px solid ' + (writeState === ws ? '#7c3aed' : '#2e3348'),
                  color: writeState === ws ? '#ede9fe' : '#9ca3af',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>{ws}</button>
              );
            })}
          </div>
          <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 8 }}>
            今感じていることに近いのは？
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {FEELINGS.map(function(f) {
              return (
                <button key={f} onClick={function() { setFeeling(f); }} style={{
                  padding: '7px 12px', borderRadius: 20, fontSize: 13,
                  background: feeling === f ? '#0e7490' : '#1a1e2c',
                  border: '1px solid ' + (feeling === f ? '#0e7490' : '#2e3348'),
                  color: feeling === f ? '#cffafe' : '#9ca3af',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>{f}</button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={handleNext} style={{
              flex: 1, padding: '11px 0', borderRadius: 8,
              background: '#c2410c', border: 'none', color: '#fff',
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}>次へ</button>
            <button onClick={function() { setStep(0); }} style={{
              padding: '11px 16px', borderRadius: 8,
              background: 'transparent', border: '1px solid #2e3348',
              color: '#6b7280', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}>戻る</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 14, lineHeight: 1.6 }}>
            その言葉について、今どんな感触がある？
          </p>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#d1d5db', fontSize: 13 }}>意味があった</span>
              <span style={{ color: '#f97316', fontSize: 13 }}>{meaning}</span>
            </div>
            <input type="range" min={0} max={100} value={meaning}
              onChange={function(e) { setMeaning(Number(e.target.value)); }}
              style={{ width: '100%', accentColor: '#f97316' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#d1d5db', fontSize: 13 }}>価値があった</span>
              <span style={{ color: '#f97316', fontSize: 13 }}>{value}</span>
            </div>
            <input type="range" min={0} max={100} value={value}
              onChange={function(e) { setValue(Number(e.target.value)); }}
              style={{ width: '100%', accentColor: '#f97316' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#d1d5db', fontSize: 13 }}>納得があった</span>
              <span style={{ color: '#f97316', fontSize: 13 }}>{satisfaction}</span>
            </div>
            <input type="range" min={0} max={100} value={satisfaction}
              onChange={function(e) { setSatisfaction(Number(e.target.value)); }}
              style={{ width: '100%', accentColor: '#f97316' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={handleSubmit} style={{
              flex: 1, padding: '12px 0', borderRadius: 8,
              background: '#c2410c', border: 'none', color: '#fff',
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
            }}>残り火を灯す</button>
            <button onClick={function() { setStep(1); }} style={{
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
  var statusLabel = {
    lit: '待機中', searching: '探索中', found: '問いが届いた',
    receiving: '旅の途中', received: '受領済み', held: '保持中', returned: '還した',
  };
  var statusColor = {
    lit: '#6b7280', searching: '#f97316', found: '#a78bfa',
    receiving: '#7c3aed', received: '#34d399', held: '#60a5fa', returned: '#9ca3af',
  };
  var st = fire.status;

  return (
    <div
      onClick={function() { onSelect(fire.id); }}
      style={{
        background: selected ? '#1e1a2c' : '#151820',
        border: '1px solid ' + (selected ? '#7c3aed' : '#2e3348'),
        borderRadius: 10, padding: '14px 16px', marginBottom: 10,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ color: '#e2e4ee', fontSize: 14, flex: 1, marginRight: 8 }}>
          {fireTitle(fire)}
        </span>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 10,
          background: (statusColor[st] || '#6b7280') + '22',
          color: statusColor[st] || '#6b7280',
          whiteSpace: 'nowrap',
        }}>
          {statusLabel[st] || st}
        </span>
      </div>
      {fire.status === 'searching' && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
            <span style={{ color: '#6b7280', fontSize: 10 }}>問いの深度</span>
            <span style={{ color: '#a78bfa', fontSize: 10 }}>{fire.questionProgress || 0}%</span>
          </div>
          <ProgressBar value={fire.questionProgress || 0} color="linear-gradient(90deg, #7c3aed, #a78bfa)" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1, marginTop: 4 }}>
            <span style={{ color: '#6b7280', fontSize: 10 }}>火の安定</span>
            <span style={{ color: '#34d399', fontSize: 10 }}>{fire.gardenProgress || 0}%</span>
          </div>
          <ProgressBar value={fire.gardenProgress || 0} color="linear-gradient(90deg, #064e3b, #34d399)" />
        </div>
      )}
      {fire.status === 'found' && (
        <p style={{ color: '#a78bfa', fontSize: 12, margin: '8px 0 0', lineHeight: 1.5 }}>
          ✦ 問いが待っています
        </p>
      )}
      {fire.writeState && (
        <p style={{ color: '#6b7280', fontSize: 11, margin: '6px 0 0' }}>{fire.writeState}</p>
      )}
    </div>
  );
}

function UnreceivedPanel({ fire, onReexplore, onRest, onReturnToHeart, actionResult, onCloseActionResult }) {
  var ur = fire.unreceived || { meaning: 0, value: 0, satisfaction: 0 };

  // 結果表示は共通の ActionResultPanel（App の actionResult）に一本化。
  // ここは操作と未受領領域の状態表示に専念する。
  function doReexplore(type) { onReexplore(fire.id, type); }
  function doRest() { onRest(fire.id); }

  // この火・未受領コンテキストの結果だけを、押した場所の近くに出す
  var localResult = (actionResult && actionResult.context === 'unreceived' && actionResult.fireId === fire.id)
    ? actionResult : null;

  var TYPES = [
    {
      key: 'meaning',
      label: '意味の影',
      desc: '意味として、まだ受け取れていないものがあります。',
      btnLabel: '意味の影を追う',
      pct: ur.meaning,
    },
    {
      key: 'value',
      label: '価値の黒札',
      desc: '価値判定から、まだ切り離せていない黒札があります。',
      btnLabel: '価値の黒札を拾う',
      pct: ur.value,
    },
    {
      key: 'satisfaction',
      label: '納得の灰',
      desc: '納得にならず、灰として残ったものがあります。',
      btnLabel: '納得の灰を探す',
      pct: ur.satisfaction,
    },
  ];

  var allSettled = TYPES.every(function(t) { return t.pct <= 14; });

  return (
    <div style={{
      background: '#0d0f1a', border: '1px solid #2a2340',
      borderRadius: 12, padding: '18px 16px', marginTop: 12,
    }}>
      <p style={{ color: '#4b5563', fontSize: 10, margin: '0 0 10px', letterSpacing: 1 }}>
        会い直す領域
      </p>

      {/* トイマン */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px' }}>
        <span style={{ fontSize: 16 }}>🔥</span>
        <span style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.7 }}>
          {allSettled ? '「静かに、置かれた」' : '「まだ、残っている」'}
        </span>
      </div>

      {/* 3領域 */}
      {TYPES.map(function(t) {
        var stage = unreceivedStage(t.pct);
        var settled = t.pct <= 14;
        return (
          <div key={t.key} style={{
            marginBottom: 14,
            background: '#111318', borderRadius: 8, padding: '12px 13px',
            border: '1px solid ' + (settled ? '#1e2a1e' : '#2a2340'),
            opacity: settled ? 0.7 : 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ color: settled ? '#374151' : '#9ca3af', fontSize: 13 }}>{t.label}</span>
              <span style={{ color: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}>
                {t.pct}% / {stage}
              </span>
            </div>
            <ProgressBar
              value={t.pct}
              color={settled
                ? 'linear-gradient(90deg, #1e2a1e, #374151)'
                : 'linear-gradient(90deg, #4c1d95, #7c3aed)'}
            />
            <p style={{ color: '#4b5563', fontSize: 11, margin: '6px 0 8px', lineHeight: 1.6 }}>
              {settled ? 'この領域は、もう火を支配するほどではありません。' : t.desc}
            </p>
            {!settled && (
              <button
                onClick={function() { doReexplore(t.key); }}
                style={{
                  padding: '7px 12px', borderRadius: 6, fontSize: 12,
                  background: 'transparent', border: '1px solid #4c1d95',
                  color: '#a78bfa', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {t.btnLabel}
              </button>
            )}
          </div>
        );
      })}

      {/* 直近の結果を、押した場所のすぐ近くに出す */}
      {localResult && (
        <ActionResultPanel result={localResult} onClose={onCloseActionResult} />
      )}

      {/* 最新再探索ログ */}
      {fire.unreceivedLogs && fire.unreceivedLogs.length > 0 && (
        <div style={{ margin: '4px 0 14px', borderTop: '1px solid #1e2230', paddingTop: 10 }}>
          {fire.unreceivedLogs.slice(0, 3).map(function(l, i) {
            return (
              <p key={i} style={{ color: '#8f9bb3', fontSize: 11, margin: '3px 0', lineHeight: 1.6 }}>
                ・{l.text}
              </p>
            );
          })}
        </div>
      )}

      {/* 3領域すべて静かな痕跡になったら、火を心へ返す（このサイクルの終点） */}
      {allSettled ? (
        <div className="return-heart-box">
          <p className="return-heart-msg">
            3つの影は、もう火を覆っていない。<br />この火を、心へ返せます。
          </p>
          <button className="return-heart-btn" onClick={function() { onReturnToHeart(fire.id); }}>
            🏮 火を心へ返す
          </button>
        </div>
      ) : (function() {
        var cd = cooldownRemaining(fire.lastUnreceivedRestAt, 30);
        return (
          <button
            onClick={cd > 0 ? null : doRest}
            style={{
              width: '100%', padding: '10px', borderRadius: 8,
              background: 'transparent', border: '1px solid #1e2230',
              color: cd > 0 ? '#374151' : '#8f9bb3', fontSize: 13,
              cursor: cd > 0 ? 'default' : 'pointer', fontFamily: 'inherit',
            }}
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
        <button onClick={onBack} style={{
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

function RecordTower({ game, onGoUnreceived, onViewReceipt }) {
  var records = game.fires.filter(function(f) {
    return f.status === 'received' || f.status === 'held' || f.status === 'returned';
  });
  var statusText = { received: '余熱あり', held: '保持中', returned: '心へ返した' };

  return (
    <div style={{ padding: '0 0 40px' }}>
      <h3 style={{ color: '#a78bfa', fontSize: 15, margin: '0 0 14px' }}>記録塔</h3>
      {records.length === 0 && (
        <p style={{ color: '#8f9bb3', fontSize: 13 }}>まだ記録がありません。</p>
      )}
      {records.map(function(fire) {
        return (
          <div key={fire.id} style={{
            background: '#151820', border: '1px solid #2e3348',
            borderRadius: 8, padding: '12px 14px', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <p style={{ color: '#e2e4ee', fontSize: 13, margin: 0 }}>{fire.kindle}</p>
              <span style={{ color: fire.status === 'returned' ? '#9ca3af' : '#a78bfa', fontSize: 10, whiteSpace: 'nowrap' }}>
                {statusText[fire.status] || fire.status}
              </span>
            </div>
            {fire.question && (
              <p style={{ color: '#7c3aed', fontSize: 12, margin: '0 0 4px', lineHeight: 1.6 }}>
                ✦ {fire.question}
              </p>
            )}
            {fire.answer && (
              <p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 6px', lineHeight: 1.5 }}>
                → {fire.answer}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {onViewReceipt && fire.receipt && (
                <button
                  onClick={function() { onViewReceipt(fire.id); }}
                  style={{
                    padding: '5px 11px', borderRadius: 7,
                    background: 'transparent', border: '1px solid #2a2340',
                    color: '#6b7280', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  受領証を見る
                </button>
              )}
              {fire.status === 'received' && onGoUnreceived && (
                <button
                  onClick={function() { onGoUnreceived(fire.id); }}
                  style={{
                    padding: '5px 11px', borderRadius: 7,
                    background: 'transparent', border: '1px solid #4c1d95',
                    color: '#a78bfa', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  余熱に会い直す →
                </button>
              )}
            </div>
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

      <div className="receipt-meta">
        <span className="receipt-meta-item">持ち帰った者：トイマン</span>
        <span className="receipt-meta-item">記録した者：コタエ</span>
        <span className="receipt-meta-item">発行日：{dateStr}</span>
      </div>

      <button className="receipt-btn" onClick={onAction}>
        {buttonLabel || '余熱に会い直す'}
      </button>
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
  return [
    { name: 'コタエ', color: '#a78bfa', text: '本文を、そのまま読み上げます。' },
    { name: 'コタエ', color: '#a78bfa', text: kindleQuoted },
    { name: 'コタエ', color: '#a78bfa', text: '分類は、まだしません。\n先に、欠けないように置きます。' },
    { name: 'トイマン', color: '#fb923c', text: '……消すな。' },
    { name: 'コタエ',   color: '#a78bfa', text: '消しません。' },
  ];
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
            <button className="kotae-btn" onClick={advance}>
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
            <button className="kotae-btn" onClick={goNextLayer}>
              次へ ▽
            </button>
          </div>
        )}

        {/* 沈黙 */}
        {isSilence && (
          <div>
            {renderDialogue(silenceLines, dialogueStep)}
            {isLastDialogue ? (
              <button className="kotae-btn" onClick={function() { onJourneyDone({ currentMetrics: metrics }); }}>
                受領する
              </button>
            ) : (
              <button className="kotae-btn" onClick={function() { setDialogueStep(function(s) { return s + 1; }); }}>
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
      '意味の影。\n価値の黒札。\n納得の灰。',
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

        {/* 中央：残り火 */}
        <div className="garden-area-center">
          <span className="garden-fire-pulse" style={{ fontSize: 32, lineHeight: 1, display: 'block' }}>🔥</span>
          <div className="garden-fire-label">残り火</div>
          {game.toyman && <div className="garden-fire-label">トイマン</div>}
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
    </div>
  );
}

function GardenView({ game, onBack, onGoShelf, onDoBattle, onWatchFire, onRestToday, onReceive, onUpdateLastSeen, onBuyMarket, onReexplore, onRestUnreceived, onReturnToHeart, actionResult, onCloseActionResult, activeUnreceivedFireId, onGoUnreceivedFromTower, onViewReceipt }) {
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
        <button onClick={onBack} style={{
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
            <button className="btn-shadow" onClick={function() { setShadowOpen(true); }}>
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
            <button className="record-tower-open-btn" onClick={function() { setRecordOpen(true); }}>
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

      {/* 8. 灯置き場（灯守りの仕事が一度完了して small_stone が置かれてから） */}
      {((game.gardenItems && game.gardenItems.includes('small_stone')) || (game.unlocks && game.unlocks.lightMarket)) && (
        <LightMarket game={game} onBuyNewGame={onBuyMarket} />
      )}
    </div>
  );
}

function HomeView({ game, onLightFire, onGoShelf, onGoGarden }) {
  var [showForm, setShowForm] = _useState(false);
  var searching = game.fires.find(function(f) { return f.status === 'searching'; });
  var found = game.fires.find(function(f) { return f.status === 'found'; });
  var totalFires = game.fires.length;

  function handleLightFire(kindle, pain, writeState, feeling, metrics) {
    // 灯した後は App 側の「預ける場面」へ遷移する。ここでフォームを閉じるだけ。
    onLightFire(kindle, pain, writeState, feeling, metrics);
    setShowForm(false);
  }

  var toymanGreeting;
  if (game.toyman.state === 'exploring') {
    toymanGreeting = '火は見えている';
  } else if (game.toyman.state === 'returning') {
    toymanGreeting = '……さがしたよ';
  } else if (totalFires === 0) {
    toymanGreeting = 'まだ、消えていない';
  } else {
    toymanGreeting = 'また来たんだね';
  }

  return (
    <div style={{ padding: '0 16px 80px' }}>
      <div style={{ padding: '20px 0 16px', textAlign: 'center', position: 'relative' }}>
        <h1 style={{ color: '#f97316', fontSize: 20, margin: '0 0 4px', letterSpacing: 1 }}>
          残り火の箱庭
        </h1>
        <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>Nokoribi no Hakoniwa</p>
        {game.toka > 0 && (
          <p style={{ color: '#4b5563', fontSize: 11, margin: '6px 0 0' }}>
            灯貨 {game.toka}
          </p>
        )}
      </div>

      {totalFires === 0 && !showForm && (
        <div style={{
          background: '#111318', border: '1px solid #1e2230',
          borderRadius: 10, padding: '16px', marginBottom: 16,
        }}>
          <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
            ここは、言葉にまつわる痛みを置いていける場所。<br />
            あなたが作った言葉、届かなかった言葉、消えてしまいそうな言葉を、<br />
            残り火として灯すことができます。
          </p>
        </div>
      )}

      {!showForm && (
        <ToymanVoice text={toymanGreeting} />
      )}

      {/* 灯守り初登場 — 灯貨の意味をここで伝える */}
      {!showForm && game.tinyfolk && game.tinyfolk.lightkeeper && totalFires === 1 && (
        <div style={{
          background: '#0a0e0c', border: '1px solid #14532d',
          borderRadius: 8, padding: '12px 14px', margin: '8px 0',
        }}>
          <p style={{ color: '#4b6a54', fontSize: 12, lineHeight: 1.8, margin: '0 0 8px' }}>
            火のそばに、小さな影が動いた。<br />
            灯守りが、石をひとつ置いた。
          </p>
          <p style={{ color: '#3e5a48', fontSize: 12, lineHeight: 1.8, margin: 0 }}>
            灯守り：<br />
            こぼれた灯りです。捨てないでください。<br />
            これは灯貨。買うためのものではありません。<br />
            置くための灯りです。
          </p>
        </div>
      )}

      {!showForm && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
          {searching && (
            <span style={{
              fontSize: 12, padding: '4px 10px', borderRadius: 12,
              background: '#7c3aed22', color: '#a78bfa',
            }}>
              問い {searching.questionProgress || 0}%
            </span>
          )}
          {searching && (
            <span style={{
              fontSize: 12, padding: '4px 10px', borderRadius: 12,
              background: '#06472222', color: '#34d399',
            }}>
              安定 {searching.gardenProgress || 0}%
            </span>
          )}
          {found && (
            <span style={{
              fontSize: 12, padding: '4px 10px', borderRadius: 12,
              background: '#a78bfa22', color: '#a78bfa',
            }}>
              ✦ 問いが届いた
            </span>
          )}
        </div>
      )}

      {showForm ? (
        <div style={{
          background: '#111318', border: '1px solid #2e3348',
          borderRadius: 12, padding: '18px 16px', margin: '12px 0',
        }}>
          <h3 style={{ color: '#f97316', fontSize: 15, margin: '0 0 14px' }}>火に言葉を置く</h3>
          <FireInputForm
            onSubmit={handleLightFire}
            onCancel={function() { setShowForm(false); }}
          />
        </div>
      ) : (
        <button
          onClick={function() { setShowForm(true); }}
          style={{
            width: '100%', padding: '14px', borderRadius: 10,
            background: '#7c1d0a', border: '1px solid #c2410c',
            color: '#fed7aa', fontSize: 15, cursor: 'pointer',
            fontFamily: 'inherit', marginTop: 8, letterSpacing: 0.5,
          }}
        >
          + 火に言葉を置く
        </button>
      )}

      {!showForm && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onGoShelf} style={{
            flex: 1, padding: '11px 0', borderRadius: 8,
            background: '#151820', border: '1px solid #2e3348',
            color: '#d1d5db', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            📚 残り火の棚 {game.fires.length > 0 ? '(' + game.fires.length + ')' : ''}
          </button>
          <button onClick={onGoGarden} style={{
            flex: 1, padding: '11px 0', borderRadius: 8,
            background: '#151820', border: '1px solid #2e3348',
            color: '#d1d5db', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            🌿 箱庭
          </button>
        </div>
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
            <button onClick={function() { onForceFound(searching.id); }} style={{
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
function SaveErrorNotice({ onDismiss }) {
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
  '画面は暗い。',
  '',
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

var ENTRUST_TOYMAN_LINES = [
  '預かる。',
  '強く握らない。\nでも、落とさない。',
];

function EntrustScene({ fire, onDone }) {
  var [step, setStep] = _useState(0);
  var [visible, setVisible] = _useState(false);
  var [leaving, setLeaving] = _useState(false);

  _useEffect(function() {
    var t = setTimeout(function() { setVisible(true); }, 80);
    return function() { clearTimeout(t); };
  }, []);

  function advance() {
    if (step < ENTRUST_TOYMAN_LINES.length) {
      setStep(function(s) { return s + 1; });
    }
  }

  function handleDone() {
    // 暗転してから森へ。落差ではなく、ひと呼吸の沈黙で繋ぐ。
    setLeaving(true);
    setTimeout(function() { onDone(); }, 620);
  }

  var isNarrative = step === 0;
  var toymanIdx = step - 1; // 0-based index into ENTRUST_TOYMAN_LINES
  var isFinal = step === ENTRUST_TOYMAN_LINES.length;

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
        {isNarrative && (
          <div className="intro-narrative">
            {ENTRUST_NARRATIVE_LINES.map(function(line, i) {
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
              {ENTRUST_TOYMAN_LINES[toymanIdx].split('\n').map(function(seg, si) {
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
          <button className="intro-btn-fire entrust-btn" onClick={handleDone} disabled={leaving}>
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
          <button className="intro-btn-fire discovery-btn" onClick={handleDeliver} disabled={leaving}>
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
  // 保存失敗の通知。一度だけ出す（連続失敗で何度も出さない）。
  var [saveError, setSaveError] = _useState(false);
  var saveErrorShownRef = _useRef(false);
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

  var handleUpdateLastSeen = _useCallback(function() {
    setGame(function(prev) {
      var ns = cloneS(prev);
      ns.lastSeenAt = nowISO();
      return ns;
    });
  }, []);

  var handleReexplore = _useCallback(function(fireId, type) {
    var result = reexploreFire(gameRef.current, fireId, type);
    if (result.ok) {
      setGame(result.game);
      setActionResult(result.actionResult || null);
    }
  }, []);

  var handleRestUnreceived = _useCallback(function(fireId) {
    var result = restUnreceived(gameRef.current, fireId);
    if (result.ok) {
      setGame(result.game);
      setActionResult(result.actionResult || null);
    }
  }, []);

  var handleReturnToHeart = _useCallback(function(fireId) {
    var result = returnFireToHeart(gameRef.current, fireId);
    if (result.ok) {
      setGame(result.game);
      setActionResult(result.actionResult || null);
      setKotaeDialog({ fireId: fireId, kind: 'returned' });
    }
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
        ng = triggerEncounter(ng, 'kana_first_rest', { fireId: fireId });
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

  var handleReset = _useCallback(function() {
    if (window.confirm('本当にリセットしますか？')) {
      clearSave();
      setGame(initGame());
      setIntroActive(true);
      setEntrustFireId(null);
      setScreen('home');
    }
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
      {!introActive && screen === 'home' && (
        <HomeView
          game={game}
          onLightFire={handleLightFire}
          onGoShelf={function() { setScreen('shelf'); }}
          onGoGarden={function() { setScreen('garden'); }}
        />
      )}
      {screen === 'shelf' && (
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
      {screen === 'garden' && (
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
      {saveError && (
        <SaveErrorNotice onDismiss={function() { setSaveError(false); }} />
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
