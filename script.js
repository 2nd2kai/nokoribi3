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
    return parsed;
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

function initGame() {
  return {
    version: SAVE_VERSION,
    createdAt: nowISO(),
    lastSavedAt: nowISO(),
    fires: [],
    toyman: { location: 'starting_room', state: 'waiting' },
    unlocks: { recordTower: false },
    battleCount: 0,
  };
}

function createFire(kindle, pain, writeState, feeling, metrics) {
  return {
    id: 'f' + Date.now() + Math.floor(rnd() * 1000),
    kindle: kindle.trim(),
    pain: (pain || '').trim(),
    writeState: writeState || '',
    feeling: feeling || '',
    metrics: metrics || { meaning: 50, value: 50, satisfaction: 50 },
    status: 'lit',
    progress: 0,
    question: null,
    answer: null,
    answers: [],
    battleCount: 0,
    shadowVoiceIdx: 0,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    heldNote: null,
  };
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

function lightFire(game, kindle, pain, writeState, feeling, metrics) {
  var ns = cloneS(game);
  var fire = createFire(kindle, pain, writeState, feeling, metrics);
  var hasSearching = ns.fires.some(function(f) { return f.status === 'searching'; });
  if (!hasSearching) {
    fire.status = 'searching';
    ns.toyman = { location: 'unexplored_forest', state: 'exploring' };
  }
  ns.fires = [fire].concat(ns.fires);
  return { game: ns, fire: fire };
}

function doBattle(game, fireId, answer) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'searching') return { ok: false, game: game };
  var gain = BATTLE_GAIN_MIN + Math.floor(rnd() * (BATTLE_GAIN_MAX - BATTLE_GAIN_MIN + 1));
  fire.progress = Math.min(100, (fire.progress || 0) + gain);
  fire.battleCount = (fire.battleCount || 0) + 1;
  fire.shadowVoiceIdx = (fire.shadowVoiceIdx || 0) + 1;
  ns.battleCount = (ns.battleCount || 0) + 1;
  if (answer && answer.trim()) {
    fire.answers = (fire.answers || []).concat([{ text: answer.trim(), at: nowISO() }]);
  }
  if (fire.progress >= 100) {
    fire.status = 'found';
    fire.question = makeQuestion(fire);
    fire.foundAt = nowISO();
    ns.toyman = { location: 'starting_room', state: 'returning' };
  }
  fire.updatedAt = nowISO();
  return { ok: true, game: ns, fire: fire };
}

function tickProgress(game) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.status === 'searching'; });
  if (!fire) return { changed: false, game: game };
  fire.progress = Math.min(100, (fire.progress || 0) + PASSIVE_GAIN);
  if (fire.progress >= 100) {
    fire.status = 'found';
    fire.question = makeQuestion(fire);
    fire.foundAt = nowISO();
    ns.toyman = { location: 'starting_room', state: 'returning' };
  }
  fire.updatedAt = nowISO();
  return { changed: true, game: ns };
}

function receiveFire(game, fireId, answer) {
  var ns = cloneS(game);
  var fire = ns.fires.find(function(f) { return f.id === fireId; });
  if (!fire || fire.status !== 'found') return { ok: false, game: game };
  fire.status = 'received';
  fire.answer = (answer || '').trim() || null;
  fire.receivedAt = nowISO();
  if (!ns.unlocks.recordTower) {
    ns.unlocks.recordTower = true;
  }
  var nextLit = ns.fires.find(function(f) { return f.status === 'lit'; });
  if (nextLit) {
    nextLit.status = 'searching';
    ns.toyman = { location: 'unexplored_forest', state: 'exploring' };
  } else {
    ns.toyman = { location: 'starting_room', state: 'waiting' };
  }
  return { ok: true, game: ns };
}

// ── React Components ────────────────────────────────────────────────────────

var _useState = React.useState;
var _useEffect = React.useEffect;
var _useCallback = React.useCallback;
var _useRef = React.useRef;

function ProgressBar({ value }) {
  return (
    <div style={{ background: '#1e2230', borderRadius: 4, height: 8, overflow: 'hidden', margin: '8px 0' }}>
      <div style={{
        height: '100%',
        width: Math.max(0, Math.min(100, value)) + '%',
        background: 'linear-gradient(90deg, #f97316, #fb923c)',
        borderRadius: 4,
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
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

function ShadowPanel({ fire, onAnswer, onSkip }) {
  var [input, setInput] = _useState('');
  var voice = getShadowVoice(fire);
  var softened = fire.battleCount >= 4;

  function handleSubmit() {
    onAnswer(input.trim());
    setInput('');
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
      <textarea
        value={input}
        onChange={function(e) { setInput(e.target.value); }}
        placeholder="向き合う言葉を書いてみる（書かなくてもいい）"
        rows={3}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#1a1a2e', border: '1px solid #3d2d5c',
          borderRadius: 8, padding: '10px 12px',
          color: '#e2e4ee', fontSize: 14, resize: 'vertical',
          fontFamily: 'inherit', lineHeight: 1.6,
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={handleSubmit}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 8,
            background: '#4c1d95', border: 'none', color: '#e9d5ff',
            fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {input.trim() ? '向き合う' : 'ただ、向き合う'}
        </button>
        <button
          onClick={onSkip}
          style={{
            padding: '10px 14px', borderRadius: 8,
            background: 'transparent', border: '1px solid #3d2d5c',
            color: '#888', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          今日は無理
        </button>
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
        <ProgressBar value={fire.progress} />
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

function ShelfView({ game, onBack, onDoBattle, onReceive }) {
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
      else setPhase('list');
    }
  }

  // Keep phase in sync if fire status changes externally
  _useEffect(function() {
    if (!selected) return;
    if (selected.status === 'searching' && phase !== 'battle') setPhase('battle');
    if (selected.status === 'found' && phase !== 'receive') setPhase('receive');
    if (selected.status !== 'searching' && selected.status !== 'found') setPhase('list');
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
            onSkip={function() { setPhase('list'); setSelectedId(null); }}
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
              setPhase('list');
              setSelectedId(null);
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

function GardenView({ game, onBack, onDoBattle }) {
  var searching = game.fires.find(function(f) { return f.status === 'searching'; });
  var found = game.fires.find(function(f) { return f.status === 'found'; });
  var toyman = game.toyman;

  var toymanText, toymanSub;
  if (toyman.state === 'exploring') {
    toymanText = '未受領の森の中へ入っていった。影のそばで、静かに待っている。';
    toymanSub = '残り火が届くのを待っているみたい。';
  } else if (toyman.state === 'returning') {
    toymanText = '問いの欠片を見つけて戻ってきた。棚に届けにいくみたいだ。';
    toymanSub = '「残り火の棚」で受け取ってみて。';
  } else {
    toymanText = '箱庭の入口で、静かに火を見ている。';
    toymanSub = '新しい残り火が灯るのを待っているみたい。';
  }

  return (
    <div style={{ padding: '0 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 12px' }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', color: '#9ca3af',
          fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1,
        }}>←</button>
        <h2 style={{ color: '#e2e4ee', fontSize: 17, margin: 0 }}>箱庭</h2>
      </div>

      <div style={{
        background: '#0e1016', border: '1px solid #1e2230',
        borderRadius: 12, padding: '16px', marginBottom: 16,
        minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ color: '#374151', fontSize: 13, textAlign: 'center', margin: 0 }}>
          {toyman.location === 'unexplored_forest' ? '〜 未受領の森 〜' : '〜 はじまりの部屋 〜'}
        </p>
      </div>

      <ToymanVoice text={toymanText} sub={toymanSub} />

      {searching && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#9ca3af', fontSize: 12 }}>探索中: {fireTitle(searching)}</span>
            <span style={{ color: '#f97316', fontSize: 12 }}>{searching.progress}%</span>
          </div>
          <ProgressBar value={searching.progress} />
          <ShadowPanel
            fire={searching}
            onAnswer={function(ans) { onDoBattle(searching.id, ans); }}
            onSkip={function() {}}
          />
        </div>
      )}

      {found && !searching && (
        <div style={{
          background: '#0f0b1a', border: '1px solid #7c3aed',
          borderRadius: 10, padding: '14px 16px', marginTop: 16,
        }}>
          <p style={{ color: '#a78bfa', fontSize: 13, margin: '0 0 6px' }}>
            問いの欠片が届いています
          </p>
          <p style={{ color: '#ede9fe', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            {found.question}
          </p>
          <p style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>
            「残り火の棚」から受け取ってください
          </p>
        </div>
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
    onLightFire(kindle, pain, writeState, feeling, metrics);
    setShowForm(false);
  }

  var toymanGreeting;
  if (game.toyman.state === 'exploring') {
    toymanGreeting = '未受領の森に入っていった。あなたの残り火を探している。';
  } else if (game.toyman.state === 'returning') {
    toymanGreeting = '問いの欠片を見つけて戻ってきた。「残り火の棚」で受け取れるよ。';
  } else if (totalFires === 0) {
    toymanGreeting = 'はじめまして。ここに残り火を置いていっていいよ。';
  } else {
    toymanGreeting = 'また来たんだね。';
  }

  return (
    <div style={{ padding: '0 16px 80px' }}>
      <div style={{ padding: '20px 0 16px', textAlign: 'center' }}>
        <h1 style={{ color: '#f97316', fontSize: 20, margin: '0 0 4px', letterSpacing: 1 }}>
          残り火の箱庭
        </h1>
        <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>Nokoribi no Hakoniwa</p>
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

      {!showForm && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
          {searching && (
            <span style={{
              fontSize: 12, padding: '4px 10px', borderRadius: 12,
              background: '#f9731622', color: '#f97316',
            }}>
              🔥 探索中 {searching.progress}%
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

      {game.unlocks.recordTower && !showForm && (
        <div style={{ marginTop: 28 }}>
          <RecordTower game={game} />
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
        [DEV] {open ? '▲' : '▼'} fires:{game.fires.length} battles:{game.battleCount}
        {searching ? ' | 探索中' + searching.progress + '%' : ''}
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
  var [game, setGame] = _useState(function() { return loadSave() || initGame(); });
  var [screen, setScreen] = _useState('home');
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
          onReceive={handleReceive}
        />
      )}
      {screen === 'garden' && (
        <GardenView
          game={game}
          onBack={function() { setScreen('home'); }}
          onDoBattle={handleDoBattle}
        />
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
