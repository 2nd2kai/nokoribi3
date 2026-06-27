// 残り火の箱庭 v6.0 — clean MVP rewrite
'use strict';

// ── Constants ──────────────────────────────────────────────────────────────

const SAVE_KEY = 'nokoribi_v2';
const SAVE_VERSION = 1;
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

const FIRE_DANGER_WORDS = [
  '死にたい', '消えたい', '消えてしまいたい', '消えたくなる',
  'もう終わりにしたい', '生きていたくない', '自殺', '自傷',
];

// ── Utilities ──────────────────────────────────────────────────────────────

function nowISO() { return new Date().toISOString(); }

function cloneS(obj) { return JSON.parse(JSON.stringify(obj)); }

function rnd() { return Math.random(); }

function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

function hasDanger(text) {
  if (!text) return false;
  return FIRE_DANGER_WORDS.some(function(w) { return text.includes(w); });
}

function fireTitle(fire) {
  if (!fire) return '';
  return fire.kindle.slice(0, 20) + (fire.kindle.length > 20 ? '…' : '');
}

function loadSave() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (parsed.version !== SAVE_VERSION) return null;
    return migrateGame(parsed);
  } catch (e) {
    return null;
  }
}

function persistSave(game) {
  try {
    var data = Object.assign({}, game, { lastSavedAt: nowISO() });
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {}
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
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
    lastAutoAt: nowISO(),
    lastSeenAt: nowISO(),
    introSeen: { kotae: false, kana: false, utsuro: false, auditor: false },
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
  };
}

// 旧セーブの fire に新フィールドを補完する
function migrateFire(f) {
  if (f.questionProgress === undefined) {
    f.questionProgress = f.progress || 0;
  }
  if (f.gardenProgress === undefined) {
    f.gardenProgress = Math.min(50, f.questionProgress);
  }
  if (!f.logs) f.logs = [];
  if (!f.restLogs) f.restLogs = [];
  if (f.watchCount === undefined) f.watchCount = 0;
  if (f.restCount === undefined) f.restCount = 0;
  if (!f.unreceived) f.unreceived = initUnreceived(f.metrics);
  if (!f.unreceivedLogs) f.unreceivedLogs = [];
  if (!f.reexploreCounts) f.reexploreCounts = { meaning: 0, value: 0, satisfaction: 0 };
  if (f.activeFocus === undefined) f.activeFocus = null;
  if (f.reexploredAt === undefined) f.reexploredAt = null;
  return f;
}

function migrateGame(g) {
  if (!g) return g;
  if (!g.materials) g.materials = initMaterials();
  else g.materials = safeMat(g.materials);
  if (!g.tinyfolk) g.tinyfolk = initTinyfolk();
  if (!g.gardenItems) g.gardenItems = [];
  if (!g.unlocks.tearsSpring) g.unlocks.tearsSpring = false;
  if (!g.unlocks.postOffice) g.unlocks.postOffice = false;
  if (!g.unlocks.inspectionBureau) g.unlocks.inspectionBureau = false;
  if (!g.unlocks.lightMarket) g.unlocks.lightMarket = false;
  if (!g.lastAutoAt) g.lastAutoAt = nowISO();
  if (!g.lastSeenAt) g.lastSeenAt = nowISO();
  if (!g.introSeen) g.introSeen = { kotae: false, kana: false, utsuro: false, auditor: false };
  if (!g.toka) g.toka = 0;
  g.fires = (g.fires || []).map(migrateFire);
  // 既存の灯守り状態を推測
  if (!g.tinyfolk.lightkeeper && g.fires.length > 0) {
    g.tinyfolk.lightkeeper = true;
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
  fire.logs = (fire.logs || []).concat([{ text: text, at: nowISO() }]);
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

var REEXPLORE_SATISFACTION_LOGS = [
  '灰の中に、まだ熱い種が残っていた。「終わりではない。残りだ」',
  '未完の欲が、ここにある。',
  'トイマンは、手応えの小片を拾い上げた。',
  '満たされなかった輪郭が、少しだけ形をなした。',
];

function unreceivedStage(pct) {
  if (pct >= 70) return '濃い影';
  if (pct >= 40) return '薄い影';
  if (pct >= 15) return '残り火';
  return '静かな痕跡';
}

function reexploreFire(game, fireId, type) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'received') return { ok: false, game: game };
  ns.materials = safeMat(ns.materials);
  var logText = '';
  if (type === 'meaning') {
    var mGain = 5 + Math.floor(rnd() * 8);
    fire.unreceived.meaning = Math.max(0, fire.unreceived.meaning - mGain);
    ns.materials.meaningPiece += 1;
    ns.materials.paper += 1;
    ns.toka = (ns.toka || 0) + 1;
    fire.reexploreCounts.meaning = (fire.reexploreCounts.meaning || 0) + 1;
    logText = pick(REEXPLORE_MEANING_LOGS);
  } else if (type === 'value') {
    var vGain = 3 + Math.floor(rnd() * 6);
    fire.unreceived.value = Math.max(0, fire.unreceived.value - vGain);
    ns.materials.blackTag += 1;
    ns.toka = (ns.toka || 0) + 1;
    fire.reexploreCounts.value = (fire.reexploreCounts.value || 0) + 1;
    logText = pick(REEXPLORE_VALUE_LOGS);
  } else if (type === 'satisfaction') {
    var sGain = 5 + Math.floor(rnd() * 6);
    fire.unreceived.satisfaction = Math.max(0, fire.unreceived.satisfaction - sGain);
    ns.materials.ash += 1;
    ns.materials.unfinishedSeed += 1;
    ns.toka = (ns.toka || 0) + 1;
    fire.reexploreCounts.satisfaction = (fire.reexploreCounts.satisfaction || 0) + 1;
    logText = pick(REEXPLORE_SATISFACTION_LOGS);
  } else {
    return { ok: false, game: game };
  }
  fire.unreceivedLogs = [{ text: logText, at: nowISO() }].concat(
    (fire.unreceivedLogs || []).slice(0, 9)
  );
  fire.reexploredAt = nowISO();
  fire.updatedAt = nowISO();
  return { ok: true, game: ns };
}

function restUnreceived(game, fireId) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'received') return { ok: false, game: game };
  ns.toka = (ns.toka || 0) + 1;
  ns.materials = safeMat(ns.materials);
  ns.materials.drop += 1;
  fire.logs = (fire.logs || []).concat([{ text: '今日は、ここに置いておく。', at: nowISO() }]);
  fire.updatedAt = nowISO();
  return { ok: true, game: ns };
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
  ns.toka = (ns.toka || 0) + 1;
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
  fire.questionProgress = Math.min(100, (fire.questionProgress || 0) + qGain);
  fire.gardenProgress = Math.min(100, (fire.gardenProgress || 0) + 5);
  fire.battleCount = (fire.battleCount || 0) + 1;
  fire.shadowVoiceIdx = (fire.shadowVoiceIdx || 0) + 1;
  ns.battleCount = (ns.battleCount || 0) + 1;
  ns.toka = (ns.toka || 0) + 2;
  ns.materials = safeMat(ns.materials);
  ns.materials.paper = (ns.materials.paper || 0) + 1;
  if (answer && answer.trim()) {
    fire.answers = (fire.answers || []).concat([{ text: answer.trim(), at: nowISO() }]);
  }
  addLog(fire, pick(BATTLE_LOGS));
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
  return { ok: true, game: ns, fire: fire };
}

// 自動進行: gardenProgress のみ、questionProgress は触れない、found にしない
function tickProgress(game) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.status === 'searching'; });
  if (!fire) return { changed: false, game: game };
  fire.gardenProgress = Math.min(100, (fire.gardenProgress || 0) + 2);
  addLog(fire, pick(AUTO_LOGS));
  ns.lastAutoAt = nowISO();
  fire.updatedAt = nowISO();
  return { changed: true, game: ns };
}

function watchFire(game, fireId) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'searching') return { ok: false, game: game };
  var qGain = Math.floor(rnd() * 4); // 0〜3
  fire.questionProgress = Math.min(100, (fire.questionProgress || 0) + qGain);
  fire.gardenProgress = Math.min(100, (fire.gardenProgress || 0) + 8);
  fire.watchCount = (fire.watchCount || 0) + 1;
  ns.toka = (ns.toka || 0) + 1;
  ns.materials = safeMat(ns.materials);
  ns.materials.ash = (ns.materials.ash || 0) + 1;
  addLog(fire, pick(WATCH_LOGS));
  // 水汲みの小人解放条件（watchでも関係しない → 後でrestで解放）
  if (fire.questionProgress >= 100) {
    fire.status = 'found';
    fire.question = makeQuestion(fire);
    fire.foundAt = nowISO();
    ns.toyman = { location: 'starting_room', state: 'returning' };
  }
  fire.updatedAt = nowISO();
  return { ok: true, game: ns };
}

function restToday(game, fireId) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'searching') return { ok: false, game: game };
  // questionProgress は進めない
  fire.gardenProgress = Math.min(100, (fire.gardenProgress || 0) + 5);
  fire.restCount = (fire.restCount || 0) + 1;
  var logText = pick(REST_LOGS);
  fire.restLogs = (fire.restLogs || []).concat([{ text: logText, at: nowISO() }]);
  addLog(fire, logText);
  ns.toka = (ns.toka || 0) + 1;
  ns.materials = safeMat(ns.materials);
  ns.materials.drop = (ns.materials.drop || 0) + 1;
  // 水汲みの小人解放条件
  if (!ns.tinyfolk.waterCarrier && fire.restCount >= 3) {
    ns.tinyfolk.waterCarrier = true;
  }
  // 涙の泉解放条件
  if (!ns.unlocks.tearsSpring && fire.restCount >= 5) {
    ns.unlocks.tearsSpring = true;
  }
  fire.updatedAt = nowISO();
  return { ok: true, game: ns };
}

function receiveFire(game, fireId, answer) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'found') return { ok: false, game: game };
  fire.status = 'received';
  fire.answer = (answer || '').trim() || null;
  fire.receivedAt = nowISO();
  ns.toka = (ns.toka || 0) + 3;
  ns.materials = safeMat(ns.materials);
  ns.materials.stamp = (ns.materials.stamp || 0) + 1;
  if (!ns.unlocks.recordTower) {
    ns.unlocks.recordTower = true;
    ns.tinyfolk.recordApprentice = true;
  }
  var newlyUnlockedKotae = !!(ns.unlocks.recordTower && !game.unlocks.recordTower && !ns.introSeen.kotae);
  var nextLit = ns.fires.find(function(f) { return f.status === 'lit'; });
  if (nextLit) {
    nextLit.status = 'searching';
    ns.toyman = { location: 'unexplored_forest', state: 'exploring' };
  } else {
    ns.toyman = { location: 'starting_room', state: 'waiting' };
  }
  return { ok: true, game: ns, newlyUnlockedKotae: newlyUnlockedKotae };
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

function ShadowPanel({ fire, onAnswer, onWatch, onSkip }) {
  var [input, setInput] = _useState('');
  var [mode, setMode] = _useState('choice'); // choice | confront
  var voice = getShadowVoice(fire);
  var softened = fire.battleCount >= 4;

  function handleSubmit() {
    onAnswer(input.trim());
    setInput('');
    setMode('choice');
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
            <span style={{ color: '#555', fontSize: 11, marginLeft: 8 }}>+15〜25% / 灯貨+2</span>
          </button>
          <button onClick={function() { onWatch(); }} style={{
            padding: '11px 14px', borderRadius: 8, textAlign: 'left',
            background: '#111318', border: '1px solid #2e3348',
            color: '#9ca3af', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ color: '#6b7280', marginRight: 8 }}>◎</span>
            ただ見守る
            <span style={{ color: '#555', fontSize: 11, marginLeft: 8 }}>+3〜5% / 灯貨+1</span>
          </button>
          <button onClick={function() { onSkip(); }} style={{
            padding: '11px 14px', borderRadius: 8, textAlign: 'left',
            background: '#111318', border: '1px solid #1e2230',
            color: '#6b7280', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ color: '#4b5563', marginRight: 8 }}>…</span>
            今日は無理
            <span style={{ color: '#555', fontSize: 11, marginLeft: 8 }}>+1% / 灯貨+1</span>
          </button>
        </div>
      )}
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
  var [dangerMode, setDangerMode] = _useState(false);
  var [step, setStep] = _useState(0);

  function checkDanger(text) {
    if (hasDanger(text)) setDangerMode(true);
  }

  function handleNext() {
    if (step === 0 && !kindle.trim()) return;
    setStep(function(s) { return s + 1; });
  }

  function handleSubmit() {
    if (!kindle.trim()) return;
    onSubmit(kindle, pain, writeState, feeling, { meaning: meaning, value: value, satisfaction: satisfaction });
  }

  if (dangerMode) {
    return (
      <div style={{ padding: '4px 0' }}>
        <div style={{
          background: '#1c0a0a', border: '1px solid #7f1d1d',
          borderRadius: 10, padding: 20, marginBottom: 16,
        }}>
          <p style={{ color: '#fca5a5', fontSize: 15, lineHeight: 1.8, margin: 0 }}>
            書いてくれてありがとう。<br />
            今、つらい気持ちがあるみたいだね。<br /><br />
            もし誰かに話したいとき、<strong>よりそいホットライン（0120-279-338）</strong>に電話できます。<br />
            残り火は、あなたがここにいてくれることを待っています。
          </p>
        </div>
        <button
          onClick={function() { setDangerMode(false); }}
          style={{
            padding: '10px 20px', borderRadius: 8, border: '1px solid #4b5563',
            background: 'transparent', color: '#9ca3af', fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          戻る
        </button>
      </div>
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
            onChange={function(e) { setKindle(e.target.value); checkDanger(e.target.value); }}
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
            onChange={function(e) { setPain(e.target.value); checkDanger(e.target.value); }}
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
              <span style={{ color: '#d1d5db', fontSize: 13 }}>満足できた</span>
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
    received: '受領済み', held: '保持中', returned: '還した',
  };
  var statusColor = {
    lit: '#6b7280', searching: '#f97316', found: '#a78bfa',
    received: '#34d399', held: '#60a5fa', returned: '#9ca3af',
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

function UnreceivedPanel({ fire, onReexplore, onRest }) {
  var ur = fire.unreceived || { meaning: 0, value: 0, satisfaction: 0 };
  var [lastResult, setLastResult] = _useState(null);

  function doReexplore(type) {
    onReexplore(fire.id, type);
    setLastResult(type);
  }

  function doRest() {
    onRest(fire.id);
    setLastResult('rest');
  }

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
      label: '満足の灰',
      desc: '満足にならず、灰として残ったものがあります。',
      btnLabel: '満足の灰を探す',
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
        まだ受け取れていないもの
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

      {/* 最新再探索ログ */}
      {fire.unreceivedLogs && fire.unreceivedLogs.length > 0 && (
        <div style={{ margin: '4px 0 14px', borderTop: '1px solid #1e2230', paddingTop: 10 }}>
          {fire.unreceivedLogs.slice(0, 3).map(function(l, i) {
            return (
              <p key={i} style={{ color: '#4b5563', fontSize: 11, margin: '3px 0', lineHeight: 1.6 }}>
                ・{l.text}
              </p>
            );
          })}
        </div>
      )}

      {/* 今日は置いておく */}
      <button
        onClick={doRest}
        style={{
          width: '100%', padding: '10px', borderRadius: 8,
          background: 'transparent', border: '1px solid #1e2230',
          color: '#4b5563', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        今日は置いておく
      </button>

      {/* 行動結果 */}
      {lastResult && lastResult !== 'rest' && (
        <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: '#0a0e18', border: '1px solid #1e2230' }}>
          <p style={{ color: '#6b7280', fontSize: 12, margin: 0, lineHeight: 1.7 }}>
            {fire.unreceivedLogs && fire.unreceivedLogs[0] ? fire.unreceivedLogs[0].text : '再探索しました。'}
          </p>
          <p style={{ color: '#374151', fontSize: 11, margin: '4px 0 0' }}>
            灯貨+1
            {lastResult === 'meaning' && ' / 意味片+1 / 紙片+1'}
            {lastResult === 'value' && ' / 黒札片+1'}
            {lastResult === 'satisfaction' && ' / 灰片+1 / 未完の種+1'}
          </p>
          <button onClick={function() { setLastResult(null); }} style={{
            marginTop: 8, padding: '4px 10px', borderRadius: 5,
            background: 'transparent', border: '1px solid #1e2230',
            color: '#4b5563', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>閉じる</button>
        </div>
      )}
      {lastResult === 'rest' && (
        <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: '#0a0e18', border: '1px solid #1e2230' }}>
          <p style={{ color: '#4b5563', fontSize: 12, margin: 0, lineHeight: 1.8 }}>
            今日は、ここに置いておく。<br />
            未受領領域は進まなかった。<br />
            でも、火は消えなかった。
          </p>
          <p style={{ color: '#374151', fontSize: 11, margin: '4px 0 0' }}>灯貨+1 / 水滴+1</p>
          <button onClick={function() { setLastResult(null); }} style={{
            marginTop: 8, padding: '4px 10px', borderRadius: 5,
            background: 'transparent', border: '1px solid #1e2230',
            color: '#4b5563', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>閉じる</button>
        </div>
      )}
    </div>
  );
}

function ShelfView({ game, onBack, onDoBattle, onWatchFire, onRestToday, onReceive, onReexplore, onRestUnreceived }) {
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
          <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>
            答え（任意）
          </label>
          <textarea
            value={receiveAnswer}
            onChange={function(e) { setReceiveAnswer(e.target.value); }}
            placeholder="今思うことを書いてもいい。書かなくてもいい。"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1a1a2e', border: '1px solid #3d2d5c',
              borderRadius: 8, padding: '10px 12px',
              color: '#e2e4ee', fontSize: 14, resize: 'vertical',
              fontFamily: 'inherit', lineHeight: 1.6,
            }}
          />
          <button
            onClick={function() {
              onReceive(selected.id, receiveAnswer);
              setReceiveAnswer('');
              setPhase('unreceived');
            }}
            style={{
              width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 8,
              background: '#4c1d95', border: 'none', color: '#ede9fe',
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
            }}
          >
            受け取る
          </button>
        </div>
      )}

      {selected && phase === 'unreceived' && selected.status === 'received' && (
        <UnreceivedPanel
          fire={selected}
          onReexplore={onReexplore}
          onRest={onRestUnreceived}
        />
      )}
    </div>
  );
}

function RecordTower({ game }) {
  var received = game.fires.filter(function(f) {
    return f.status === 'received' || f.status === 'held' || f.status === 'returned';
  });

  return (
    <div style={{ padding: '0 0 40px' }}>
      <h3 style={{ color: '#a78bfa', fontSize: 15, margin: '0 0 14px' }}>記録塔</h3>
      {received.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: 13 }}>まだ記録がありません。</p>
      )}
      {received.map(function(fire) {
        return (
          <div key={fire.id} style={{
            background: '#151820', border: '1px solid #2e3348',
            borderRadius: 8, padding: '12px 14px', marginBottom: 8,
          }}>
            <p style={{ color: '#e2e4ee', fontSize: 13, margin: '0 0 6px' }}>{fire.kindle}</p>
            {fire.question && (
              <p style={{ color: '#7c3aed', fontSize: 12, margin: '0 0 4px', lineHeight: 1.6 }}>
                ✦ {fire.question}
              </p>
            )}
            {fire.answer && (
              <p style={{ color: '#9ca3af', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                → {fire.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KotaeIntro({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 480, width: '100%',
        background: '#0f1119', border: '1px solid #312e81',
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px 36px',
      }}>
        <div style={{ width: 36, height: 3, background: '#2e3348', borderRadius: 99, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
            background: '#b0a8cc', flexShrink: 0,
          }} />
          <span style={{ color: '#b0a8cc', fontSize: 13, fontWeight: 700 }}>コタエ</span>
        </div>
        <p style={{ color: '#e2e4ee', fontSize: 15, lineHeight: 1.9, margin: '0 0 6px' }}>
          ……届いた。
        </p>
        <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.9, margin: '0 0 20px' }}>
          問いの欠片は、ここに記録されます。<br />
          記録塔の扉が、開きました。
        </p>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 10,
            background: '#312e81', border: 'none', color: '#c7d2fe',
            fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          記録塔を確かめる
        </button>
      </div>
    </div>
  );
}

var TINYFOLK_ACTIVITY = {
  lightkeeper:      '火のそばで作業中',
  paperCollector:   '焦げた紙片を探している',
  waterCarrier:     '水を汲んでいる',
  recordApprentice: '記録塔で写している',
};

function NowStatusPanel({ game }) {
  var sf    = game.fires.find(function(f) { return f.status === 'searching'; });
  var found = game.fires.find(function(f) { return f.status === 'found'; });
  var receivedFires = game.fires.filter(function(f) { return f.status === 'received'; });
  var mat   = safeMat(game.materials);
  var toyman = game.toyman;

  // ── 状態別メインテキスト ──
  var mainLines;
  if (sf) {
    var qp = sf.questionProgress || 0;
    if (qp >= 80) {
      mainLines = ['問いが、もうすぐ形になる。', 'トイマンは、欠片の声を聞いている。'];
    } else if (qp >= 50) {
      mainLines = ['影は、問いかけを繰り返している。', 'トイマンは未受領の森にいる。'];
    } else {
      mainLines = ['火はまだ消えていません。', 'トイマンは未受領の森で、問いの欠片を探しています。'];
    }
  } else if (found) {
    mainLines = ['トイマンが、問いの欠片を見つけました。', 'まだ受け取られてはいません。棚で受け取れます。'];
  } else if (receivedFires.length > 0) {
    mainLines = ['問いの欠片は受け取られました。', 'でも、この火にはまだ受け取れていないものがあります。'];
  } else {
    mainLines = ['今、探索中の火はありません。', '箱庭は静かです。新しい残り火を灯すと、トイマンが向かいます。'];
  }

  // ── 最新ログ3件（exploring fire または最近更新された fire から）──
  var logsSource = sf || found || receivedFires[0] || null;
  var recentLogs = logsSource ? (logsSource.logs || []).slice(-3) : [];

  // ── 一番濃い未受領領域 ──
  var bestUnreceived = null;
  if (receivedFires.length > 0) {
    var bestPct = -1;
    receivedFires.forEach(function(f) {
      var ur = f.unreceived || {};
      [['meaning','意味の影'], ['value','価値の黒札'], ['satisfaction','満足の灰']].forEach(function(pair) {
        var pct = ur[pair[0]] || 0;
        if (pct > bestPct) { bestPct = pct; bestUnreceived = { label: pair[1], pct: pct }; }
      });
    });
    if (bestUnreceived && bestUnreceived.pct <= 0) bestUnreceived = null;
  }

  // ── 小人 ──
  var folk = game.tinyfolk || {};
  var activeFolk = Object.keys(TINYFOLK_ACTIVITY).filter(function(k) { return folk[k]; });

  // ── 次にできること ──
  var nextHint;
  if (sf) {
    nextHint = '影と向き合う・ただ見守る・今日は無理';
  } else if (found) {
    nextHint = '棚で問いの欠片を受け取る';
  } else if (receivedFires.length > 0) {
    nextHint = '棚から再探索する（意味の影・価値の黒札・満足の灰）';
  } else {
    nextHint = '残り火を灯す';
  }

  return (
    <div style={{
      background: '#0f1119',
      border: '1px solid #1e2230',
      borderRadius: 14,
      padding: '16px',
      marginBottom: 14,
    }}>
      {/* ラベル */}
      <p style={{ color: '#374151', fontSize: 9, margin: '0 0 10px', letterSpacing: 2, fontWeight: 700 }}>
        今の箱庭
      </p>

      {/* メインテキスト */}
      {mainLines.map(function(line, i) {
        return (
          <p key={i} style={{
            color: i === 0 ? '#9ca3af' : '#6b7280',
            fontSize: i === 0 ? 13 : 12,
            lineHeight: 1.8, margin: '0 0 4px',
          }}>
            {line}
          </p>
        );
      })}

      {/* 探索中の進行バー */}
      {sf && (
        <div style={{ margin: '12px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: '#4b5563', fontSize: 10 }}>問いの深度</span>
            <span style={{ color: '#a78bfa', fontSize: 10 }}>{sf.questionProgress || 0}%</span>
          </div>
          <ProgressBar value={sf.questionProgress || 0} color="linear-gradient(90deg,#7c3aed,#a78bfa)" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, marginTop: 6 }}>
            <span style={{ color: '#4b5563', fontSize: 10 }}>火の安定</span>
            <span style={{ color: '#34d399', fontSize: 10 }}>{sf.gardenProgress || 0}%</span>
          </div>
          <ProgressBar value={sf.gardenProgress || 0} color="linear-gradient(90deg,#064e3b,#34d399)" />
        </div>
      )}

      {/* 一番濃い未受領領域 */}
      {bestUnreceived && (
        <div style={{ margin: '12px 0 0', padding: '8px 10px', background: '#0d0f1a', borderRadius: 8 }}>
          <p style={{ color: '#374151', fontSize: 9, margin: '0 0 4px', letterSpacing: 1 }}>
            今いちばん濃く残っているもの
          </p>
          <p style={{ color: '#7c3aed', fontSize: 13, margin: 0 }}>
            {bestUnreceived.label} {bestUnreceived.pct}%
            <span style={{ color: '#4b5563', fontSize: 10, marginLeft: 8 }}>
              {unreceivedStage(bestUnreceived.pct)}
            </span>
          </p>
        </div>
      )}

      {/* 見ていない間のこと / 最近のログ */}
      {recentLogs.length > 0 && (
        <div style={{ margin: '12px 0 0', borderTop: '1px solid #1e2230', paddingTop: 10 }}>
          <p style={{ color: '#374151', fontSize: 9, margin: '0 0 6px', letterSpacing: 1 }}>
            最近の様子
          </p>
          {recentLogs.map(function(l, i) {
            return (
              <p key={i} style={{ color: '#374151', fontSize: 11, margin: '2px 0', lineHeight: 1.6 }}>
                ・{l.text}
              </p>
            );
          })}
        </div>
      )}

      {/* 小人 */}
      {activeFolk.length > 0 && (
        <div style={{ margin: '12px 0 0', borderTop: '1px solid #1e2230', paddingTop: 10 }}>
          <p style={{ color: '#374151', fontSize: 9, margin: '0 0 6px', letterSpacing: 1 }}>
            小人の様子
          </p>
          {activeFolk.map(function(k) {
            var labels = { lightkeeper:'灯守り', paperCollector:'紙集め', waterCarrier:'水汲み', recordApprentice:'記録見習い' };
            return (
              <p key={k} style={{ color: '#4b6a54', fontSize: 11, margin: '2px 0' }}>
                {labels[k] || k}：{TINYFOLK_ACTIVITY[k]}
              </p>
            );
          })}
        </div>
      )}

      {/* 素材 */}
      <div style={{ margin: '12px 0 0', borderTop: '1px solid #1e2230', paddingTop: 10 }}>
        <p style={{ color: '#374151', fontSize: 9, margin: '0 0 6px', letterSpacing: 1 }}>素材</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <span style={{ fontSize: 10, color: '#6b7280', padding: '2px 7px', borderRadius: 8, background: '#1a1e2c', border: '1px solid #2e3348' }}>
            灯貨 {game.toka || 0}
          </span>
          {[
            ['ash','灰片'],['paper','紙片'],['drop','水滴'],['wax','封蝋'],['stamp','受領印'],
            ['meaningPiece','意味片'],['blackTag','黒札片'],['unfinishedSeed','未完の種'],
          ].filter(function(p){ return (mat[p[0]]||0) > 0; }).map(function(p) {
            return (
              <span key={p[0]} style={{ fontSize: 10, color: '#6b7280', padding: '2px 7px', borderRadius: 8, background: '#1a1e2c', border: '1px solid #2e3348' }}>
                {p[1]} {mat[p[0]] || 0}
              </span>
            );
          })}
        </div>
      </div>

      {/* 次にできること */}
      <div style={{ margin: '12px 0 0', borderTop: '1px solid #1e2230', paddingTop: 10 }}>
        <p style={{ color: '#374151', fontSize: 9, margin: '0 0 4px', letterSpacing: 1 }}>次にできること</p>
        <p style={{ color: '#4b5563', fontSize: 11, margin: 0, lineHeight: 1.7 }}>{nextHint}</p>
      </div>
    </div>
  );
}

function GardenView({ game, onBack, onDoBattle, onWatchFire, onRestToday, onUpdateLastSeen }) {
  var [recordOpen, setRecordOpen] = _useState(false);
  var [lastAction, setLastAction] = _useState(null); // null | 'rest' | 'watch' | 'battle'
  var [shadowOpen, setShadowOpen] = _useState(false);

  var sf    = game.fires.find(function(f) { return f.status === 'searching'; });
  var found = game.fires.find(function(f) { return f.status === 'found'; });

  _useEffect(function() {
    if (onUpdateLastSeen) onUpdateLastSeen();
  }, []);

  // 行動後テキスト
  function actionResultContent() {
    if (lastAction === 'rest') {
      return {
        lines: [
          '今日は、ここまで。',
          '問いは進まなかった。',
          'でも、火は消えなかった。',
          '',
          'トイマンは火のそばに座った。',
          '「消えないなら、それでいい」',
        ],
        note: '灯貨+1 / 水滴+1 / 火の安定+5',
      };
    }
    if (lastAction === 'watch') {
      return {
        lines: [
          'トイマンは、ただ火を見ていた。',
          '火はまだ消えていない。',
          '灯守りが、小さな石を置いた。',
        ],
        note: '灯貨+1 / 灰片+1 / 火の安定+8',
      };
    }
    if (lastAction === 'battle') {
      return {
        lines: [
          '影の声が、少しだけ薄くなった。',
          '問いが、少し深くなった。',
        ],
        note: '灯貨+2 / 紙片+1 / 問いの深度+15〜25',
      };
    }
    return null;
  }

  var actionResult = actionResultContent();

  return (
    <div style={{ padding: '0 16px 120px' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 12px' }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', color: '#9ca3af',
          fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1,
        }}>←</button>
        <h2 style={{ color: '#e2e4ee', fontSize: 17, margin: 0 }}>箱庭</h2>
      </div>

      {/* ── 行動後メッセージ（最上部）── */}
      {actionResult && (
        <div style={{
          background: '#0a0f0c', border: '1px solid #14532d',
          borderRadius: 10, padding: '14px 16px', marginBottom: 12,
        }}>
          {actionResult.lines.filter(function(l) { return l; }).map(function(line, i) {
            return (
              <p key={i} style={{ color: '#4b6a54', fontSize: 13, lineHeight: 1.9, margin: '2px 0' }}>
                {line}
              </p>
            );
          })}
          <p style={{ color: '#1f4024', fontSize: 11, margin: '8px 0 0' }}>{actionResult.note}</p>
          <button onClick={function() { setLastAction(null); }} style={{
            marginTop: 10, padding: '5px 12px', borderRadius: 5,
            background: 'transparent', border: '1px solid #1e2e20',
            color: '#374151', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>閉じる</button>
        </div>
      )}

      {/* ── 今の様子パネル ── */}
      <NowStatusPanel game={game} />

      {/* ── 問いが見つかった（棚誘導）── */}
      {found && !sf && (
        <div style={{
          background: '#0f0b1a', border: '1px solid #7c3aed',
          borderRadius: 10, padding: '14px 16px', marginBottom: 14,
        }}>
          <p style={{ color: '#a78bfa', fontSize: 12, margin: '0 0 4px' }}>問いの欠片が届いています</p>
          <p style={{ color: '#ede9fe', fontSize: 14, lineHeight: 1.7, margin: '0 0 8px' }}>
            {found.question}
          </p>
          <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
            「残り火の棚」から受け取ってください
          </p>
        </div>
      )}

      {/* ── 行動ボタン（searching 中、行動後以外）── */}
      {sf && lastAction === null && !shadowOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <button onClick={function() { setShadowOpen(true); }} style={{
            padding: '13px 16px', borderRadius: 10, textAlign: 'left',
            background: '#1e1a2e', border: '1px solid #4c1d95',
            color: '#c4b5fd', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ color: '#a78bfa', marginRight: 8 }}>🌑</span>影と向き合う
          </button>
          <button onClick={function() { onWatchFire(sf.id); setLastAction('watch'); }} style={{
            padding: '13px 16px', borderRadius: 10, textAlign: 'left',
            background: '#111318', border: '1px solid #2e3348',
            color: '#9ca3af', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ color: '#6b7280', marginRight: 8 }}>◎</span>ただ見守る
          </button>
          <button onClick={function() { onRestToday(sf.id); setLastAction('rest'); }} style={{
            padding: '13px 16px', borderRadius: 10, textAlign: 'left',
            background: '#111318', border: '1px solid #1e2230',
            color: '#6b7280', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ color: '#4b5563', marginRight: 8 }}>…</span>今日は無理
          </button>
        </div>
      )}

      {/* ── ShadowPanel（影と向き合う押下時のみ）── */}
      {sf && shadowOpen && (
        <div style={{
          background: '#0f1119', border: '1px solid #3d2d5c',
          borderRadius: 12, padding: '4px 0 0', marginBottom: 14,
          maxHeight: 'calc(100dvh - 96px)', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px 0' }}>
            <button onClick={function() { setShadowOpen(false); }} style={{
              background: 'transparent', border: 'none', color: '#4b5563',
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px',
            }}>× 閉じる</button>
          </div>
          <ShadowPanel
            fire={sf}
            onAnswer={function(ans) {
              onDoBattle(sf.id, ans);
              setShadowOpen(false);
              setLastAction('battle');
            }}
            onWatch={function() {
              onWatchFire(sf.id);
              setShadowOpen(false);
              setLastAction('watch');
            }}
            onSkip={function() {
              onRestToday(sf.id);
              setShadowOpen(false);
              setLastAction('rest');
            }}
          />
        </div>
      )}

      {/* ── 記録塔 ── */}
      {game.unlocks.recordTower && (
        <div style={{ marginTop: 8, marginBottom: 12 }}>
          {!recordOpen ? (
            <div style={{ background: '#0f0f1a', border: '1px solid #312e81', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ color: '#6366f1', fontSize: 12, margin: '0 0 4px' }}>
                遠くに、記録塔の灯りが見える。
              </p>
              <p style={{ color: '#4b5563', fontSize: 11, margin: '0 0 8px', lineHeight: 1.6 }}>
                コタエが、問いの欠片を記録している。
              </p>
              <button onClick={function() { setRecordOpen(true); }} style={{
                padding: '6px 12px', borderRadius: 7, background: 'transparent',
                border: '1px solid #312e81', color: '#818cf8',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                記録塔を見る
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#818cf8', fontSize: 13, fontWeight: 700 }}>🗼 記録塔</span>
                <button onClick={function() { setRecordOpen(false); }} style={{
                  marginLeft: 'auto', background: 'transparent', border: 'none',
                  color: '#6b7280', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}>閉じる</button>
              </div>
              <RecordTower game={game} />
            </div>
          )}
        </div>
      )}

      {/* ── 涙の泉の気配 ── */}
      {game.unlocks.tearsSpring && (
        <div style={{ background: '#0a0f14', border: '1px solid #164e63', borderRadius: 10, padding: '10px 13px', marginTop: 8 }}>
          <p style={{ color: '#0e7490', fontSize: 12, margin: '0 0 2px' }}>どこかで、水音がした。</p>
          <p style={{ color: '#374151', fontSize: 11, margin: 0, lineHeight: 1.6 }}>
            かなが、少し離れた場所から見ていた。「今は受け取れなくてもいいよ」
          </p>
        </div>
      )}
    </div>
  );
}

function FireLitResult({ onGoGarden, onGoShelf }) {
  return (
    <div style={{ padding: '24px 0' }}>
      <p style={{ color: '#f97316', fontSize: 15, textAlign: 'center', margin: '0 0 20px', letterSpacing: 0.5 }}>
        火が灯った。
      </p>
      <div style={{
        background: '#1a1e2c', border: '1px solid #2e3348',
        borderRadius: 10, padding: '18px 16px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <span style={{ color: '#fb923c', fontSize: 13, fontWeight: 700 }}>トイマン</span>
        </div>
        <p style={{ color: '#e2e4ee', fontSize: 15, lineHeight: 1.8, margin: 0 }}>
          ……見つけた
        </p>
      </div>
      <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.9, margin: '0 0 24px' }}>
        その火は、まだ誰かに受け取られたわけではありません。<br />
        でも、もう見失われてはいません。<br /><br />
        トイマンは、未受領の森へ向かいました。
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onGoGarden} style={{
          flex: 1, padding: '12px 0', borderRadius: 8,
          background: '#0e2a1a', border: '1px solid #166534',
          color: '#86efac', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          未受領の森を見る
        </button>
        <button onClick={onGoShelf} style={{
          flex: 1, padding: '12px 0', borderRadius: 8,
          background: '#151820', border: '1px solid #2e3348',
          color: '#d1d5db', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          棚を見る
        </button>
      </div>
    </div>
  );
}

function HomeView({ game, onLightFire, onGoShelf, onGoGarden }) {
  var [showForm, setShowForm] = _useState(false);
  var [justLit, setJustLit] = _useState(false);
  var searching = game.fires.find(function(f) { return f.status === 'searching'; });
  var found = game.fires.find(function(f) { return f.status === 'found'; });
  var totalFires = game.fires.length;

  function handleLightFire(kindle, pain, writeState, feeling, metrics) {
    onLightFire(kindle, pain, writeState, feeling, metrics);
    setShowForm(false);
    setJustLit(true);
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

  if (justLit) {
    return (
      <div style={{ padding: '0 16px 80px' }}>
        <div style={{ padding: '20px 0 16px', textAlign: 'center' }}>
          <h1 style={{ color: '#f97316', fontSize: 20, margin: '0 0 4px', letterSpacing: 1 }}>残り火の箱庭</h1>
          <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>Nokoribi no Hakoniwa</p>
          {game.toka > 0 && (
            <p style={{ color: '#4b5563', fontSize: 11, margin: '6px 0 0' }}>灯貨 {game.toka}</p>
          )}
        </div>
        <FireLitResult
          onGoGarden={function() { setJustLit(false); onGoGarden(); }}
          onGoShelf={function() { setJustLit(false); onGoShelf(); }}
        />
      </div>
    );
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

      {/* 灯守り初登場 */}
      {!showForm && game.tinyfolk && game.tinyfolk.lightkeeper && totalFires === 1 && (
        <div style={{
          background: '#0a0e0c', border: '1px solid #14532d',
          borderRadius: 8, padding: '12px 14px', margin: '8px 0',
        }}>
          <p style={{ color: '#4b6a54', fontSize: 12, lineHeight: 1.8, margin: 0 }}>
            火のそばに、小さな影が動いた。<br />
            灯守りが、石をひとつ置いた。
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
          <h3 style={{ color: '#f97316', fontSize: 15, margin: '0 0 14px' }}>残り火を灯す</h3>
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
          + 残り火を灯す
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

function DevBar({ game, onReset, onForceFound, onAddBattle }) {
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
        {searching ? ' | ' + searching.progress + '%' : ''}
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
          <button onClick={onReset} style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid #7f1d1d',
            background: 'transparent', color: '#f87171', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            リセット
          </button>
          <span style={{ color: '#4b5563', fontSize: 11, alignSelf: 'center' }}>
            {game.toyman.state}@{game.toyman.location}
          </span>
        </div>
      )}
    </div>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────

function App() {
  var [game, setGame] = _useState(function() {
    var saved = loadSave();
    return saved ? saved : initGame();
  });
  var [screen, setScreen] = _useState('home');
  var [showKotaeIntro, setShowKotaeIntro] = _useState(false);
  var tickRef = _useRef(null);

  _useEffect(function() {
    persistSave(game);
  }, [game]);

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
    setGame(function(prev) { return lightFire(prev, kindle, pain, writeState, feeling, metrics).game; });
  }, []);

  var handleDoBattle = _useCallback(function(fireId, answer) {
    setGame(function(prev) {
      var result = doBattle(prev, fireId, answer);
      return result.ok ? result.game : prev;
    });
  }, []);

  var handleReceive = _useCallback(function(fireId, answer) {
    setGame(function(prev) {
      var result = receiveFire(prev, fireId, answer);
      if (result.ok && result.newlyUnlockedKotae) {
        setShowKotaeIntro(true);
      }
      return result.ok ? result.game : prev;
    });
  }, []);

  var handleUpdateLastSeen = _useCallback(function() {
    setGame(function(prev) {
      var ns = cloneS(prev);
      ns.lastSeenAt = nowISO();
      return ns;
    });
  }, []);

  var handleReexplore = _useCallback(function(fireId, type) {
    setGame(function(prev) {
      var result = reexploreFire(prev, fireId, type);
      return result.ok ? result.game : prev;
    });
  }, []);

  var handleRestUnreceived = _useCallback(function(fireId) {
    setGame(function(prev) {
      var result = restUnreceived(prev, fireId);
      return result.ok ? result.game : prev;
    });
  }, []);

  var handleWatchFire = _useCallback(function(fireId) {
    setGame(function(prev) {
      var result = watchFire(prev, fireId);
      return result.ok ? result.game : prev;
    });
  }, []);

  var handleRestToday = _useCallback(function(fireId) {
    setGame(function(prev) {
      var result = restToday(prev, fireId);
      return result.ok ? result.game : prev;
    });
  }, []);

  var handleReset = _useCallback(function() {
    if (window.confirm('本当にリセットしますか？')) {
      clearSave();
      setGame(initGame());
      setScreen('home');
    }
  }, []);

  var handleForceFound = _useCallback(function(fireId) {
    setGame(function(prev) {
      var ns = cloneS(prev);
      var fire = ns.fires.find(function(f) { return f.id === fireId; });
      if (!fire) return prev;
      fire.progress = 100;
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
      fire.progress = Math.min(100, (fire.progress || 0) + 30);
      if (fire.progress >= 100) {
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
      {screen === 'home' && (
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
          onReceive={handleReceive}
          onReexplore={handleReexplore}
          onRestUnreceived={handleRestUnreceived}
        />
      )}
      {screen === 'garden' && (
        <GardenView
          game={game}
          onBack={function() { setScreen('home'); }}
          onDoBattle={handleDoBattle}
          onWatchFire={handleWatchFire}
          onRestToday={handleRestToday}
          onUpdateLastSeen={handleUpdateLastSeen}
        />
      )}
      {showKotaeIntro && (
        <KotaeIntro onClose={function() {
          setShowKotaeIntro(false);
          setGame(function(prev) {
            var ns = cloneS(prev);
            ns.introSeen.kotae = true;
            return ns;
          });
        }} />
      )}
      <DevBar
        game={game}
        onReset={handleReset}
        onForceFound={handleForceFound}
        onAddBattle={handleAddBattle}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
