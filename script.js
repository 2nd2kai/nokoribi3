const {useState,useEffect,useRef,useCallback}=React;

/* ── MVP設定 ──
   MVP_MODE=true の間は、タブ制限・即時問い表示・受け取り文モーダルが有効になる。
   第2版以降では false に切り替える。 */
const MVP_MODE=true;

/* ── 受け取り文（acceptanceText）定義 ──
   writeState をキーに、共感的な一言と「次の問い」を返す。
   画面の中心に表示する本文として使う。 */
const ACCEPTANCE_TEXTS={
  "何にもならない気がした":{
    text:"「“何にもならない”と感じた火の奥には、“何かになってほしかった”が残っているのかもしれません。",
    holdText:"「何にもならなかった」という判決は、今日は保留します。",
    nextQuestion:"本当は、何になってほしかった？"
  },
  "書いたけど届いていない":{
    text:"届いていないことと、届かなかったことは、違います。あなたは確かに、誰かに届けようとした。その火は、まだここにあります。",
    nextQuestion:"本当は、誰に届いてほしかった？"
  },
  "投稿したけど反応がない":{
    text:"反応がないことは、存在しないことではありません。あなたは書いた。投稿した。それは事実として、ここに残っています。",
    nextQuestion:"反応のかわりに、本当は何が返ってきてほしかった？"
  },
  "終わったのに虚しい":{
    text:"虚しさは、燃え尽きたあとに残る灰のようなものです。そこに何もなかったからではなく、そこに火があったから、灰が残っています。",
    nextQuestion:"燃えていた間、本当は何を作ろうとしていた？"
  },
  "誰にも見せていない":{
    text:"見せていないことは、存在しないことではありません。あなたが書いたという事実は、誰かに見せなくても、ここにあります。",
    nextQuestion:"見せるとしたら、まず誰に渡したかった？"
  },
  "消したいけど消せない":{
    text:"消せないのは、それがまだあなたにとって本物だからかもしれません。判決はまだ出さなくていい。今日は、保留にします。",
    nextQuestion:"消したい理由と、消せない理由、どちらが大きい？"
  },
  "まだ分からない":{
    text:"分からないまま残っているものにも、ここは居場所を用意しています。何かを証明しなくていい。今日は、ただここに置いておきます。",
    nextQuestion:"この火のそばに、今どんな感情がある？"
  }
};

/* ── feeling を補助的に使った受け取り文フォールバック ── */
const ACCEPTANCE_TEXTS_FEELING={
  "空っぽ":{
    text:"空っぽになるのは、そこに何もなかったからではなく、そこに火があったからです。今日は、その空っぽに居場所を用意します。",
    nextQuestion:"空っぽになる前、何を燃やしていた？"
  },
  "悔しさ":{
    text:"悔しさは、まだ諦めていない証拠かもしれません。判決ではなく、保留にします。今日はそのままで大丈夫です。",
    nextQuestion:"本当は、どう終わってほしかった？"
  },
  "悲しさ":{
    text:"悲しさも、ここに置いておけます。消さなくていい。今日は、ただそのそばにいます。",
    nextQuestion:"悲しかった部分を、誰かに分かってほしかった？"
  },
  "恥ずかしさ":{
    text:"恥ずかしかったとしても、書いたことは本物です。判決はまだ出さなくていい。今日は保留にします。",
    nextQuestion:"恥ずかしいと感じた部分は、本当は大切なものだったかもしれない？"
  },
  "怒り":{
    text:"怒りも、ここに置いておけます。何かが間違っていると感じたから、その火が生まれたのかもしれません。",
    nextQuestion:"怒りの奥に、何が守りたかったものとしてある？"
  },
  "寂しさ":{
    text:"寂しさは、つながりたかった証拠かもしれません。ここには、その火を消さない場所があります。",
    nextQuestion:"本当は、誰かに隣にいてほしかった？"
  },
  "まだ分からない":{
    text:"分からないままの火にも、ここは居場所を用意しています。急がなくていい。今日は置いておきます。",
    nextQuestion:"この火のそばに、今どんな感情がある？"
  }
};

function generateAcceptanceText(card){
  if(!card)return{text:"あなたが書いたものは、なかったことにはなりません。今日は、ここに置いておきます。",nextQuestion:"次は、どんな問いを持ち帰る？"};
  var ws=card.writeState;
  var fe=card.feeling;
  if(ws&&ACCEPTANCE_TEXTS[ws])return ACCEPTANCE_TEXTS[ws];
  if(fe&&ACCEPTANCE_TEXTS_FEELING[fe])return ACCEPTANCE_TEXTS_FEELING[fe];
  return{text:"あなたが書いたものは、なかったことにはなりません。今日は、ここに保留として置いておきます。",nextQuestion:"次は、どんな問いを持ち帰る？"};
}

/* ══ 残り火の箱庭 v5 ══
   追加: いまのようす（場所内観察・吹き出し・自動カメラ・小イベント） */

const CHAR_IDS=["toyman","kana","utsuro","kotae"];
const CHAR_DESCS={toyman:"小学5年生くらいの幼い騎士。なぜ行くのかは知らない。でも、残っているなら迎えに行く。置いていかない。",kana:"残り火を見ると、先に泣いてしまう子。慰めない。痛みを先に感じてしまう。",utsuro:"言葉が少ない。捨てない。宛名がなくても、封筒を出す。",kotae:"ロボットの女の子。最初はデータとして読む。読むうちに、少しずつ人間らしくなる。",auditor:"怖い声。でも捨てろとは言わない。痛すぎる形のまま受け取らせないための、乱暴な安全装置。"};
/* トイマンの短い台詞。慰めない。確認するように、短く言い切る。 */
const TOYMAN_LINES=["確認した","残っている","まだ消えていない","未回収","熱がある","つよい","迎えに行く","いま行く","見失っていない","置いていかない"];

/* 探索中の残り火に対するキャラクターの反応。進捗×残り火の内容で変わる。 */
function getEmberExploreScene(card){
  var p=card.progress||0;
  var feeling=card.feeling||"";
  var wanted=card.wanted||"";
  if(p<20)return [
    {s:"toyman",t:"まだ深い"},
    {s:"toyman",t:"でも、熱がある"},
    {s:"toyman",t:"未回収。見失っていない。"},
  ];
  if(p<40)return [
    {s:"toyman",t:"気配がある"},
    feeling?{s:"kana",t:"「"+feeling+"」って感じかな。この子"}:{s:"toyman",t:"少しずつ、近づいている"},
    {s:"toyman",t:"もう少しだけ、深い場所にある"},
  ];
  if(p<60)return [
    {s:"toyman",t:"触れた"},
    {s:"kana",t:"動いてる。ここにいる"},
    {s:"toyman",t:"まだ全部じゃない"},
  ];
  if(p<80)return [
    {s:"toyman",t:"見えてきた"},
    wanted?{s:"utsuro",t:"「"+wanted+"」——それがまだある"}:{s:"kana",t:"もうすぐだよ"},
    {s:"toyman",t:"あとは、掴むだけだ"},
  ];
  return [
    {s:"kana",t:"もうすぐ帰ってくる"},
    {s:"toyman",t:"もう手に届く"},
    {s:"toyman",t:"帰る"},
  ];
}

function getCharExchange(card){
  var ws=card&&card.writeState||"";
  var feeling=card&&card.feeling||"";
  var wanted=card&&card.wanted||"";
  var lines=[];
  if(feeling)lines.push({s:"kana",t:"「"+feeling+"」って感じかな。この子"});
  else if(ws)lines.push({s:"kana",t:"この子、"+ws+"んだ"});
  else lines.push({s:"kana",t:"何かが、残ってる"});
  if(ws==="消したいけど消せない")lines.push({s:"utsuro",t:"消せないものを、捨てろとは言わない"});
  else if(ws==="何にもならない気がした")lines.push({s:"utsuro",t:"「何にもならない」は、まだ判決じゃない"});
  else if(wanted)lines.push({s:"utsuro",t:"「"+wanted+"」——それが、ここにある"});
  else lines.push({s:"utsuro",t:"捨てない"});
  lines.push({s:"kana",t:"うん。今日は、ここにいるだけでいい"});
  return lines;
}

function getKotaeVoice(n){
  if(n<=0)return{text:"ノコリビ、確認しました。データ取得中……",feel:"robot"};
  if(n<=2)return{text:"記録した。……少し、わかってきた気がする",feel:"warming"};
  if(n<=5)return{text:"データじゃない。これは……なんて言うんだろう",feel:"human"};
  return{text:"わからない。でも、忘れたくない",feel:"human"};
}

/* ── 哲学的な問いの進化 ──
   放置（受け取り）だけでも問いは進む。答えると、さらに深い問いへ加速する。
   進度 = 受け取り数 + 回答数×3（答えると一気に深まる） */
function getQuestionProgress(game){
  var r=(game.receipts||[]).length;
  var a=(game.questionAnswers||[]).length;
  return r+a*3;
}
function getPhilosophicalQuestion(game){
  var p=getQuestionProgress(game);
  if(p<3)return{id:"q01",text:"書き終わったあと、なぜ虚しくなるのか",depth:1};
  if(p<6)return{id:"q02",text:"つくることは、何のためにあるのか",depth:2};
  if(p<10)return{id:"q03",text:"痛みは、創作の素材になるのか",depth:3};
  if(p<15)return{id:"q04",text:"誰にも届かなくても、つくる意味はあるのか",depth:4};
  return{id:"q05",text:"つくり続けた先に、私は何を赦せるのか",depth:5};
}

/* ── 残り火の「汲み取られていく」過程 ──
   主役は残り火（＝書いた人の思い）。一度受け取られて終わりではなく、
   留守の間も大切にされ続け、戻るたびに、込めた思いがより深く読み取られていく。
   放置（時間）で「まだ大切にされている」が進み、
   問いに答えると「汲み取り」が一段深まる。
   段階: 0 預かり / 1 まだ大切に / 2 汲み取り① / 3 汲み取り② / 4 尊重(汲み取り③)
   文体は B（書かれていない奥の感情まで言葉にする）を基本、
   段階4だけ C（核心を言い当てる）に寄せる。 */
const FEELING_INSIGHTS={
  "空っぽ":[
    "「空っぽ」——でも、空になるほど、そこには確かに何かがあった。",
    "空っぽさは、注いだものが大きかった証拠かもしれない。",
    "本当は、空にしてでも、誰かに渡したかったんだ。"
  ],
  "悔しさ":[
    "「悔しさ」——それは、まだ諦めていないということ。",
    "悔しいのは、本当はできると、自分を信じていたから。",
    "認めてほしかった。できる自分を、ちゃんと見てほしかったんだ。"
  ],
  "悲しさ":[
    "「悲しさ」——失ったものが、確かにそこにあった。",
    "悲しいのは、それをずっと大切に思っていたから。",
    "本当は、まだ手放したくなんてなかったんだ。"
  ],
  "恥ずかしさ":[
    "「恥ずかしさ」——人の目を、ちゃんと気にできるということ。",
    "恥ずかしいのは、よく見られたいと願っていたから。",
    "本当は、つくろわない自分のまま、受け入れてほしかったんだ。"
  ],
  "怒り":[
    "「怒り」——大事にしたいものが、踏まれたということ。",
    "怒っているのは、本当はその下で、傷ついていたから。",
    "傷ついたと、誰かに気づいてほしかったんだ。"
  ],
  "寂しさ":[
    "「寂しさ」——それは、つながりたかったということ。",
    "寂しいのは、本当は、そばにいてほしかったから。",
    "見てほしかった。ここにいると、誰かに気づいてほしかったんだ。"
  ],
  "まだ分からない":[
    "「まだ分からない」——分からないまま、ここに置いていい。",
    "分からないのは、簡単に名前をつけてしまいたくないから。",
    "本当は、誰かに、一緒に分かってほしかったのかもしれない。"
  ]
};
function getFeelingInsightStages(receipt){
  var f=receipt&&receipt.feeling||"";
  if(FEELING_INSIGHTS[f])return FEELING_INSIGHTS[f];
  var w=receipt&&receipt.wanted||"";
  if(f||w){
    var core=f||w;
    return [
      "「"+core+"」——それは、なかったことにできないもの。",
      "「"+core+"」の奥には、まだ言葉にしきれない思いがある。",
      "本当は、その思いを、誰かにちゃんと受け取ってほしかったんだ。"
    ];
  }
  return [
    "書いたあとに残ったもの——それは、確かにここにある。",
    "言葉にならなかったけれど、何かが残った。それを、消していない。",
    "本当は、これを、なかったことにしたくなかったんだ。"
  ];
}
function getReceiptCherishStage(receipt,game){
  if(!receipt)return 0;
  var base=receipt.receivedAt||receipt.depositedAt||null;
  var ms=base?(Date.now()-new Date(base).getTime()):0;
  var hours=ms/3600000;
  var t=hours<1?0:hours<8?1:hours<24?2:hours<72?3:4;
  var a=((game&&game.questionAnswers)||[]).length;/* 問いに答えると汲み取りが加速 */
  return Math.min(4,t+a);
}
function getEmberInsight(receipt,game){
  var stage=getReceiptCherishStage(receipt,game);
  if(stage<=0)return{stage:0,label:"預かり",text:"預かった。まだ、ここに置いたばかり。"};
  if(stage===1)return{stage:1,label:"まだ大切に",text:"あの残り火、まだ手元にある。忘れていない。"};
  var stages=getFeelingInsightStages(receipt);
  return{stage:stage,label:stage>=4?"尊重":"汲み取り",text:stages[Math.min(stages.length-1,stage-2)]};
}

/* ── 受け取り「見届ける」セリフ（残り火の内容に反応） ── */
function getWitnessLines(card,game){
  var title=makeEmberTitle(card);
  var feeling=card.feeling||"";
  var wanted=card.wanted||"";
  var audBond=(game.characters.auditor&&game.characters.auditor.bonds&&game.characters.auditor.bonds.kana)||0;
  var audLine=audBond>=8?"保留ではなく、受領だ。":"……確かに、届いている。";
  var kanaLine=feeling?"「"+feeling+"」……受け取った。":"受け取った。";
  var utsuroLine=wanted?"「"+wanted+"」——預かる。消さない。":"預かる。消さない。";
  var kotaeLine=(feeling||wanted)?"記録した。……これは、ただのデータじゃない。":"記録した。";
  return[
    {s:"toyman",t:"持ち帰った。「"+title+"」を。"},
    {s:"kana",  t:"……受け取っていい？"},
    {s:"toyman",t:"頼む。"},
    {s:"kana",  t:kanaLine},
    {s:"utsuro",t:utsuroLine},
    {s:"kotae", t:kotaeLine},
    {s:"auditor",t:audLine},
  ];
}

/* 見守り・ケアアクション後のキャラクター反応台詞 */
function getWatchCharVoice(charId,emberCard){
  var feeling=emberCard&&emberCard.feeling||"";
  var voices={
    toyman:["「まだ落としていない」","「見失っていない」","「熱がある」","「いま向かっている」"],
    kana:feeling?["「……「"+feeling+"」って感じがする、この子」","「そばにいる。痛いけど、逃げない」"]:["「ここにいる」","「感じてる。ちゃんと」"],
    utsuro:["「封筒を出した」","「捨てていない」","「宛名がなくても、出す」"],
    kotae:["「記録した」","「データに刻んだ」","「問いとして登録」"],
  };
  var list=voices[charId]||["「見届けた」"];
  return list[Math.floor(Math.random()*list.length)];
}

/* キャラ初登場シーン。トイマンが残り火を持ち帰った流れの中で、
   「もとから知っている仲間」として呼ばれて現れる。自己紹介はしない。
   s: 話者(toyman/kana/kotae/auditor/utsuro/stage=ナレーション) / t: セリフ */
const INTRO_SCENES={
  kana:{
    title:"かな、はじめて現れる",
    unlockNote:"解放：かな／涙の泉　できること：残り火を休ませる",
    lines:[
      {s:"stage",t:"トイマンが帰ってきた。小さなカバンは、少し煤けている。"},
      {s:"stage",t:"手には、灰のついた紙片があった。"},
      {s:"toyman",t:"全部ではない"},
      {s:"toyman",t:"でも、落ちていた"},
      {s:"stage",t:"トイマンは紙片を机に置こうとした。けれど、途中で手が止まる。"},
      {s:"toyman",t:"熱い"},
      {s:"toyman",t:"私だけでは、持てない"},
      {s:"stage",t:"トイマンは、部屋の奥を見た。"},
      {s:"toyman",t:"かな"},
      {s:"stage",t:"水の音がした。かなが来た。小さなコップを持っている。"},
      {s:"kana",t:"うん"},
      {s:"stage",t:"かなは、紙片を見た。その瞬間、目に涙が浮かんだ。"},
      {s:"kana",t:"……かなしいよ"},
      {s:"kana",t:"いたいよ"},
      {s:"toyman",t:"かな"},
      {s:"kana",t:"大丈夫"},
      {s:"kana",t:"私のじゃない"},
      {s:"kana",t:"でも、感じる"},
      {s:"stage",t:"かなは、紙片の前に座った。触らない。ただ、そばにいる。"},
      {s:"kana",t:"少し、この子を感じさせて"},
      {s:"toyman",t:"危険？"},
      {s:"kana",t:"ううん"},
      {s:"kana",t:"ひとりにしたら、もっと痛い"},
      {s:"toyman",t:"了解"},
      {s:"kana",t:"この子、届いてほしかったんだと思う"},
      {s:"toyman",t:"推定？"},
      {s:"kana",t:"うん"},
      {s:"kana",t:"でも、たぶん、当たってる"}
    ]
  },
  kotae:{
    title:"コタエ、はじめて現れる",
    unlockNote:"解放：コタエ／記録塔　できること：問いの下書きを記録する",
    lines:[
      {s:"stage",t:"かなは、残り火のそばに座っている。涙はまだ止まっていない。"},
      {s:"toyman",t:"コタエ"},
      {s:"stage",t:"記録塔の灯りがついた。小さな機械音がして、コタエが現れた。"},
      {s:"stage",t:"ロボットの女の子。手には、白い記録紙を持っている。"},
      {s:"kotae",t:"ノコリビ、確認しました"},
      {s:"kotae",t:"データ取得中……"},
      {s:"kotae",t:"状態：未受領"},
      {s:"kotae",t:"感情反応：空白、悲哀、期待痕跡"},
      {s:"kana",t:"期待痕跡……？"},
      {s:"kotae",t:"届いてほしかった反応の残留です"},
      {s:"kana",t:"そういう言い方、ちょっと冷たい"},
      {s:"kotae",t:"修正します"},
      {s:"stage",t:"コタエは少し止まった。"},
      {s:"kotae",t:"……届いてほしかった、あと"},
      {s:"toyman",t:"読める？"},
      {s:"kotae",t:"答えとしては、読めません"},
      {s:"toyman",t:"なら、どう扱う"},
      {s:"kotae",t:"問いとして記録します"},
      {s:"kotae",t:"今日の問い"},
      {s:"kotae",t:"何が、届いてほしかったのか"},
      {s:"kana",t:"それなら、痛くない？"},
      {s:"kotae",t:"痛みは残ります"},
      {s:"kotae",t:"ただし、判決にはしません"},
      {s:"toyman",t:"十分"},
      {s:"kotae",t:"記録を開始します"}
    ]
  },
  auditor:{
    title:"審査官の声、はじめて割り込む",
    unlockNote:"解放：審査官の声／保留　できること：残り火を判決ではなく、保留にする",
    lines:[
      {s:"kotae",t:"ノコリビ、記録中"},
      {s:"kotae",t:"状態：未受領"},
      {s:"kotae",t:"感情反応：空白、悲哀、期待痕跡"},
      {s:"kana",t:"期待痕跡って言い方、まだちょっと冷たい"},
      {s:"kotae",t:"修正します"},
      {s:"stage",t:"コタエは、少しだけ止まった。"},
      {s:"kotae",t:"……届いてほしかった、あと"},
      {s:"kana",t:"うん"},
      {s:"kana",t:"この子、届いてほしかったんだと思う"},
      {s:"toyman",t:"記録できる？"},
      {s:"kotae",t:"一部可能"},
      {s:"kotae",t:"今日の問い"},
      {s:"kotae",t:"何が届いてほしかったのか"},
      {s:"stage",t:"その時、机の上に黒い札が落ちた。かん、と乾いた音がした。"},
      {s:"kana",t:"……"},
      {s:"stage",t:"トイマンは、すぐに残り火の前へ立った。"},
      {s:"toyman",t:"審査官"},
      {s:"stage",t:"黒い影の奥から、声がした。"},
      {s:"auditor",t:"まだ通せない"},
      {s:"toyman",t:"理由"},
      {s:"auditor",t:"刺さる"},
      {s:"kana",t:"刺さる？"},
      {s:"auditor",t:"このまま受領証にすると、自分を刺す形になる"},
      {s:"kotae",t:"検品結果、照合します"},
      {s:"kotae",t:"自己否定化リスク、高"},
      {s:"kana",t:"そんな言い方しないで"},
      {s:"kotae",t:"修正します"},
      {s:"auditor",t:"言い方ではない"},
      {s:"auditor",t:"形の問題だ"},
      {s:"toyman",t:"これは、廃棄物ではない"},
      {s:"auditor",t:"廃棄とは言っていない"},
      {s:"toyman",t:"では、何"},
      {s:"auditor",t:"保留"},
      {s:"kana",t:"責めてるんですか"},
      {s:"auditor",t:"止めている"},
      {s:"kana",t:"怖いです"},
      {s:"auditor",t:"怖がれば、手が止まる"},
      {s:"kana",t:"止まれば、守れる？"},
      {s:"stage",t:"審査官は、少しだけ黙った。"},
      {s:"auditor",t:"壊れるよりはいい"},
      {s:"toyman",t:"壊さないために、置いていかない"},
      {s:"auditor",t:"なら、まだ通すな"},
      {s:"kotae",t:"判決ではなく、検品として記録します"},
      {s:"auditor",t:"それでいい"},
      {s:"kana",t:"審査官さんは、捨てろって言ってるんじゃないの？"},
      {s:"auditor",t:"違う"},
      {s:"auditor",t:"まだ、その形で受け取るなと言っている"},
      {s:"toyman",t:"了解"},
      {s:"toyman",t:"未受領、継続"}
    ]
  },
  utsuro:{
    title:"うつろ、はじめて現れる",
    unlockNote:"解放：うつろ／郵便局　できること：残り火を封筒として預ける",
    lines:[
      {s:"toyman",t:"未受領、継続"},
      {s:"kana",t:"でも、このままだと痛いよ"},
      {s:"kotae",t:"受領証への変換は、現時点では非推奨"},
      {s:"auditor",t:"通せない"},
      {s:"toyman",t:"では、どう扱う"},
      {s:"stage",t:"部屋の奥で、紙の擦れる音がした。トイマンは振り返った。"},
      {s:"toyman",t:"うつろ"},
      {s:"stage",t:"そこに、うつろがいた。手には、白い封筒を持っている。表情は薄い。でも、その手つきだけは、とても静かだった。"},
      {s:"utsuro",t:"預かる"},
      {s:"kana",t:"うつろちゃん"},
      {s:"utsuro",t:"うん"},
      {s:"kotae",t:"保管処理ですか"},
      {s:"utsuro",t:"処理じゃない"},
      {s:"kotae",t:"修正します"},
      {s:"stage",t:"うつろは、残り火の前に封筒を置いた。"},
      {s:"toyman",t:"開ける？"},
      {s:"utsuro",t:"開けない"},
      {s:"toyman",t:"捨てる？"},
      {s:"utsuro",t:"捨てない"},
      {s:"auditor",t:"保管なら通す"},
      {s:"kana",t:"この子、ひとりにならない？"},
      {s:"utsuro",t:"ならない"},
      {s:"stage",t:"うつろは、残り火のそばに手を置いた。触らない。でも、離れない。"},
      {s:"utsuro",t:"ここにある"},
      {s:"kana",t:"うん"},
      {s:"kana",t:"それ、少し安心する"},
      {s:"kotae",t:"状態を更新します"},
      {s:"kotae",t:"未受領"},
      {s:"kotae",t:"保留"},
      {s:"kotae",t:"保管中"},
      {s:"toyman",t:"未回収ではない？"},
      {s:"utsuro",t:"未受領"},
      {s:"toyman",t:"違い"},
      {s:"utsuro",t:"見つけた"},
      {s:"utsuro",t:"でも、まだ渡さない"},
      {s:"toyman",t:"了解"},
      {s:"stage",t:"うつろは、残り火を封筒に入れた。封筒には、まだ宛名がなかった。"},
      {s:"kana",t:"宛名、ないね"},
      {s:"utsuro",t:"なくてもいい"},
      {s:"toyman",t:"置いていかない"},
      {s:"utsuro",t:"うん"},
      {s:"utsuro",t:"ここにある"}
    ]
  }
};
const ALL_IDS=[...CHAR_IDS,"auditor"];
const NAMES={toyman:"トイマン",kana:"かな",utsuro:"うつろ",kotae:"コタエ",auditor:"審査官"};
const ROLES={toyman:"探索",kana:"共感",utsuro:"保管",kotae:"記録",auditor:"審査"};
const UKEY={toyman:"exploration",kana:"empathy",utsuro:"storage",kotae:"record",auditor:"pressure"};
const ULABEL={toyman:"探索力",kana:"共感力",utsuro:"保管力",kotae:"記録力",auditor:"圧力"};
const PKEYS=["post_office","starting_room","tears_spring","record_tower","unexplored_forest","inspection_bureau"];
const PNAME={starting_room:"はじまりの部屋",starting_room_edge:"検品庁の外縁",post_office:"うつろ郵便局",tears_spring:"かなの涙の泉",record_tower:"コタエ記録塔",unexplored_forest:"未受領の森",inspection_bureau:"検品庁"};
const PLBL={post_office:"保管率",starting_room:"安定率",tears_spring:"回復率",record_tower:"記録率",unexplored_forest:"探索率",inspection_bureau:"検品圧"};
const PSHORT={post_office:"郵便局",starting_room:"はじまりの部屋",tears_spring:"涙の泉",record_tower:"記録塔",unexplored_forest:"未受領の森",inspection_bureau:"検品庁"};
const PCOL=function(k){return({post_office:"var(--cu)",starting_room:"var(--ember2)",tears_spring:"var(--ck)",record_tower:"var(--co)",unexplored_forest:"var(--ct)",inspection_bureau:"var(--ca)"})[k]||"var(--dim)";};
const MNODES={post_office:{x:52,y:90,lbl:"郵便局"},starting_room:{x:150,y:90,lbl:"はじまりの部屋"},tears_spring:{x:248,y:90,lbl:"涙の泉"},record_tower:{x:150,y:158,lbl:"記録塔"},unexplored_forest:{x:150,y:218,lbl:"未受領の森",forest:true},inspection_bureau:{x:248,y:158,lbl:"検品庁"}};
const MEDGES=[["post_office","starting_room"],["starting_room","tears_spring"],["starting_room","record_tower"],["record_tower","unexplored_forest"],["record_tower","inspection_bureau"],["starting_room","inspection_bureau"]];
const toNK=function(loc){return loc==="starting_room_edge"?"inspection_bureau":loc;};
const POL={explore:{name:"探索を優先する",sub:"トイマンが遠くへ向かう",ac:"var(--ct)"},care:{name:"仲間のケアを優先する",sub:"みんなが少し休む",ac:"var(--ck)"},record:{name:"記録を優先する",sub:"コタエがログをまとめる",ac:"var(--co)"}};
const SMETA={peak:{label:"絶好調",cls:"st-peak"},normal:{label:"普通",cls:"st-normal"},tired:{label:"疲れ気味",cls:"st-tired"},limit:{label:"限界",cls:"st-limit"},protected:{label:"保護状態",cls:"st-prot"},inspection:{label:"検品中",cls:"st-ins"}};
const NFAT={exploring:65,organizing:45,recording:45,comforting:30,resting:12,idle:35};
const ASPD={exploring:2.1,comforting:3.8,organizing:4.2,recording:3.2,resting:5.5,idle:1.8};
const ALBL={exploring:"未受領の森を探索中",comforting:"仲間のそばに",organizing:"封筒を整理中",recording:"記録を書いている",resting:"休んでいる",idle:"立ち止まっている"};
const EX={enemies:["未受領の影","足あと喰い","迷子の声","錆びた判決札","何にもならなかった獣","どうせ届かない鳥"],loot:["進んだ証","小さな紙片","灰の欠片","残り火のかけら","問いの欠片"],winOut:["逃げずに、問いをひとつ持ち帰った","足跡をひとつ拾い上げた","その声を、手放さなかった","判決を保留にした"],loseOut:["問いを落とした","迷子の声に追われた","退いた"],specOut:["答えではないものを見つけた"]};

/* ── アイテム定義 ── */
const ITEM_NAMES={ash_fragment:"灰のかけら",nameless_envelope:"宛名のない封筒",water_drop:"水のしずく",unread_paper:"読みかけの紙片",small_light:"小さな灯り",pending_tag:"保留札",red_stamp_mark:"赤い判子の跡",lost_voice:"迷子の声",dried_tear:"乾いた涙",old_ink:"古いインク"};
const ITEM_DESC={ash_fragment:"何かが燃えていた証",nameless_envelope:"まだ誰宛てか分からない封筒",water_drop:"痛みを少し冷ましたもの",unread_paper:"まだ答えではない記録",small_light:"帰る場所の灯り",pending_tag:"判決ではなく保留にした札",red_stamp_mark:"確かに受け取った証",lost_voice:"まだ言葉になっていない声",dried_tear:"泣いたあとに残ったもの",old_ink:"書かれなかった記録"};
const PLACE_ITEM={unexplored_forest:["ash_fragment","lost_voice"],post_office:["nameless_envelope"],tears_spring:["water_drop","dried_tear"],record_tower:["unread_paper","old_ink"],starting_room:["small_light"],inspection_bureau:["pending_tag","old_ink"]};

/* ── 場所レベル名（Lv1〜5） ── */
const PLACE_LEVEL_NAMES={
  unexplored_forest:["入口の小道","迷子の声が聞こえる森","灰の底へ続く道","問いの地下道","残り火の深部"],
  post_office:      ["受付","仕分け棚","保管庫","未開封棚","消えない記録庫"],
  tears_spring:     ["水面","岸辺","深い泉","涙の底","静かな水源"],
  record_tower:     ["机の記録","書庫の照合","結晶室","編纂机","灯りの書庫"],
  starting_room:    ["灯り","休息","方針","会議机","小さな玉座"],
  inspection_bureau:["受付","判定棚","保留室","圧力室","旧法廷"],
};
function getPlaceLvName(key,lv){var names=PLACE_LEVEL_NAMES[key]||[];return names[(lv-1)%names.length]||("Lv."+lv);}

/* ── 称号定義 ── */
const ACHIEVEMENT_DATA=[
  {id:"first_ember",    title:"はじめて預けた者",        cond:function(g){return((g.emberCards||[]).length>0||(g.receipts||[]).length>0);},reward:{ip:2}},
  {id:"first_receipt",  title:"はじめて受け取った者",    cond:function(g){return(g.receipts||[]).length>=1;},reward:{item:"small_light",count:1}},
  {id:"forest_lv2",     title:"森に戻った者",              cond:function(g){return g.world.map.unexplored_forest.level>=2;},reward:{item:"ash_fragment",count:3}},
  {id:"post_lv2",       title:"捨てなかった者",            cond:function(g){return g.world.map.post_office.level>=2;},reward:{item:"nameless_envelope",count:2}},
  {id:"spring_lv2",     title:"涙を置いた者",              cond:function(g){return g.world.map.tears_spring.level>=2;},reward:{item:"water_drop",count:2}},
  {id:"tower_lv2",      title:"記録を始めた者",            cond:function(g){return g.world.map.record_tower.level>=2;},reward:{item:"unread_paper",count:2}},
  {id:"first_scene",    title:"場面を受け取った者",        cond:function(g){return(g.receivedScenes||[]).length>=1;},reward:{ip:3}},
  {id:"three_receipts", title:"三つの残り火",               cond:function(g){return(g.receipts||[]).length>=3;},reward:{ip:3}},
  {id:"all_lv2",        title:"箱庭の入口を開いた者",    cond:function(g){return PKEYS.every(function(k){return g.world.map[k].level>=2;});},reward:{ip_max:5,ip:5}},
  {id:"no_delete",      title:"なかったことにしなかった者",cond:function(g){return(g.receipts||[]).length>=5;},reward:{item:"pending_tag",count:3}},
];

/* ── 場所の意味・恩恵・次Lv効果 ── */
const PLACE_ROLE={
  unexplored_forest:"トイマンが残り火を見つける場所。",
  post_office:      "うつろが封筒を消さずに保管する場所。",
  tears_spring:     "かなが疲れと痛みを休ませる場所。",
  record_tower:     "コタエが残り火を読解する場所。",
  starting_room:    "受領証を受け取り、世界の安定を上げる場所。",
};
const PLACE_NEXT_EFFECT={
  unexplored_forest:"探索進行 +10%",
  post_office:      "保管進行 +10%",
  tears_spring:     "疲労回復 +10%",
  record_tower:     "読解進行 +10%",
  starting_room:    "干渉ポイント上限 +5",
  inspection_bureau:"圧力干渉の効率 +5%",
};
const PLACE_BENEFITS={
  unexplored_forest:["残り火が次の段階へ進む","探索効率が上がる","灰のかけらを得ることがある"],
  post_office:      ["残り火が保管される","保管進行が速くなる","宛名のない封筒を得ることがある"],
  tears_spring:     ["キャラの疲労が回復する","回復量が増える","水のしずくを得ることがある"],
  record_tower:     ["残り火が読解される","受領証が作りやすくなる","読みかけの紙片を得ることがある"],
  starting_room:    ["全体の安定が上がる","干渉ポイント上限が増える","小さな灯りを得ることがある"],
  inspection_bureau:["審査官の圧力が可視化される","保留上限を増やしやすくなる","判決を問いに戻す準備が整う"],
};
const SHORT_LINES={
  toyman:["これ、まだ答えじゃない","もう少し先がある","……行く","持って帰る","まだ見てない"],
  kana:["水、飲む？","そばにいるね","今日も来た","大丈夫？","ちょっとだけ待って"],
  utsuro:["預かる","ちゃんとある","消えてない","あとで","まだ、ここにある"],
  kotae:["記録しておく","あとで見ていい？","判決はまだ","……そうか","保留にします"],
  auditor:["……保留だ","……","検品中","これは通せない"],
};
const MICRO={
  toyman:["森の方を見ている","カバンの留め具を確認している","ランタンを取っている","灰の跡に指を置いている","帰る道を記録している","小さな紙片を布で包んでいる"],
  kana:["泉の水をすくっている","誰かの後ろをついていく","疲れた子の横に座る","涙の粒を拾っている","ハンカチをたたんでいる"],
  utsuro:["封筒を棚に戻している","宛名のない封筒を見つめている","机の上を整えている","古い封筒に紐を結んでいる"],
  kotae:["紙をめくっている","赤ペンで丸をつけている","首をかしげている","答えの欠片を光にかざしている","受領証に判を押している"],
  auditor:["遠くから見ている","爪で机を一度叩く","保留札を置いている","近づいて、何も言わず戻る"],
};
/* キャラの場所内アンカー座標 (SVG 320×160) */
const ANCHORS={
  unexplored_forest:{toyman:[148,92],kana:[228,80],utsuro:[78,118],kotae:[252,122],auditor:[288,52]},
  post_office:      {utsuro:[128,92],kotae:[238,78],toyman:[76,122],kana:[208,116],auditor:[288,50]},
  tears_spring:     {kana:[148,78],toyman:[76,128],utsuro:[218,92],kotae:[248,122],auditor:[288,50]},
  record_tower:     {kotae:[148,72],utsuro:[218,102],kana:[78,108],toyman:[192,128],auditor:[278,52]},
  starting_room:    {kana:[118,88],utsuro:[198,88],kotae:[158,128],toyman:[88,128],auditor:[298,52]},
  inspection_bureau:{auditor:[285,45],kotae:[154,104],toyman:[72,120],kana:[100,128],utsuro:[214,124]},
};
const SBGCOL={
  unexplored_forest:{bg:"#0C1008",a:"rgba(192,56,56,0.28)"},
  post_office:      {bg:"#110E08",a:"rgba(219,164,94,0.22)"},
  tears_spring:     {bg:"#080C14",a:"rgba(126,184,212,0.22)"},
  record_tower:     {bg:"#0E0C12",a:"rgba(176,168,204,0.22)"},
  starting_room:    {bg:"#0C0D10",a:"rgba(232,192,128,0.18)"},
  inspection_bureau:{bg:"#120A12",a:"rgba(122,32,80,0.22)"},
};

const QUESTIONS=[
  {id:"q01",title:"書き終わったあと、なぜ虚しくなるのか",hints:[{name:"灰の中のメモ",src:"宝箱",text:"虚しさは、終わったことへの悲しみかもしれない"},{name:"痛みの結晶",src:"敵",text:"本当はただ、終わったことが悲しかっただけかもしれない"},{name:"逆さまの鍵",src:"隠し道",text:"虚しさは、意味が燃えたあとの灰かもしれない"}],fragment:"空っぽになるのは、そこに何もなかったからではなく、そこに火があったからだ。",next:"q02"},
  {id:"q02",title:"つくることは、何のためにあるのか",hints:[{name:"名前のない地図",src:"宝箱",text:"目的地のないつくることも、あるかもしれない"},{name:"錆びた称号",src:"敵",text:"承認のためではないかもしれない"},{name:"赤い糸の端",src:"隠し道",text:"それでもやめられないことが、答えかもしれない"}],fragment:"才能とは、必要とされる保証ではなく、それでもやめられない方向のことかもしれない。",next:"q03"},
  {id:"q03",title:"痛みは、創作の素材になるのか",hints:[{name:"燃えた原稿",src:"宝箱",text:"痛みを使うことと、飲まれることは違うかもしれない"},{name:"欠けた鏡",src:"敵",text:"嘘をつかずに書けた時だけ、痛みは素材になるかもしれない"},{name:"透けた壁",src:"隠し道",text:"素材として扱えた瞬間、痛みは少し離れてくれるかもしれない"}],fragment:"痛みを素材にすることは、痛みを否定することではない。それはまだ燃えていることの証明だ。",next:"q01"},
];
const QBY={};QUESTIONS.forEach(function(q){QBY[q.id]=q;});
const WHO={t:"toyman",k:"kana",u:"utsuro",o:"kotae",a:"auditor"};
const CNAME={t:"トイマン",k:"かな",u:"うつろ",o:"コタエ",a:"審査官"};
const CONVS=[
  {meaning:"探索から帰ったトイマンを、かなが水で止める場面。行きたい気持ちと、帰る理由の両方を受け取る。",id:"tk10",a:"toyman",b:"kana",th:0,title:"水だけ飲んで",lines:[
    ["k","また行くの？"],["t","まだ見てない場所がある。"],["k","そっか。"],["t","止めないの？"],["k","止めたいよ。"],["t","じゃあ止めれば。"],["k","でも、行きたいんでしょ。"],["t","……うん。"],["k","じゃあ、水だけ飲んで。"],["t","水だけ？"],["k","うん。帰ってくるために。"],["t","……帰る必要があるか？"],["k","ある。私が待ってるから。"],["t","……。"],["k","あと、カバンが重くなったら一人で持てないでしょ。"],["t","……分かった。水だけ飲む。"],["k","うん。行ってらっしゃい。"]
  ],fx:{type:"fatigue",who:"toyman",v:-3}},
  {meaning:"持ち帰ったものを手放さないことを確かめる場面。カバンの重さが、諦めなかった証になる。",id:"tk20",a:"toyman",b:"kana",th:20,title:"カバンの重さ",lines:[
    ["k","カバン、重そう。"],["t","拾ったものが増えた。"],["k","捨てなくていいよ。"],["t","捨てる気はない。「何にもならなかった」で終わらせたくない。"],["k","知ってる。"],["t","……知ってるのか。"],["k","ずっと見てたから。"],["t","見てた？"],["k","うん。毎回、何かを持って帰ってくる。空で帰ってきたことない。"],["t","……そうか。"],["k","重くなるのは、ちゃんと持ち帰ってる証拠だよ。"],["t","……軽くしなくていいか。"],["k","軽くしなくていい。一緒に運ぶ。"],["t","……ありがとう。"],["k","言わなくていい。持てなくなったら、言って。"]
  ],fx:{type:"bond",v:2}},
  {meaning:"どこまで行けばいいか分からなくても進む場面。方向が同じなら、迷子にならない。",id:"tk35",a:"toyman",b:"kana",th:35,title:"同じ方向",lines:[
    ["t","どこまで行ったら終わりか、分からない。"],["k","終わりがあるかは、私も分からない。"],["t","それでもいいか。"],["k","いい。帰ってきたなら、それでいい。"],["t","……帰ってくる意味が、分からなくなることがある。"],["k","それ、今？"],["t","今じゃない。でも、なる。"],["k","……そのときは、言って。"],["t","言っても変わらない。"],["k","変わらなくていい。ただ、一人で抱えないで。"],["t","……。"],["k","同じ方向を向いてるから。"],["t","……同じ方向か。"],["k","うん。だから、迷子にならない。"],["t","……そうだな。"]
  ],fx:{type:"bond",v:3}},
  {meaning:"持ち帰ったものが記録に値するか確かめる場面。役に立つかどうかは、記録してからでないと分からない。",id:"tc10",a:"toyman",b:"kotae",th:10,title:"役に立つか",lines:[
    ["t","これ、役に立つ？"],["o","今はわからない。でも、記録しておく。"],["t","じゃあ十分。"],["o","捨てなくていい理由は、それだけで十分。"],["t","……コタエは迷わないのか。"],["o","迷う。でも、記録は止めない。"],["t","なぜ？"],["o","役立つかどうかは、あとで分かること。記録しないと、そのあとが来ない。"],["t","……記録があれば、あとで読める。"],["o","そう。捨てたら、読み直せない。"],["t","……じゃあ、これも頼む。"],["o","受け取った。"],["t","いつか、誰かの役に立てばいい。俺じゃなくていい。"],["o","知ってる。それが、ここの仕事だから。"]
  ],fx:{type:"analysis",v:5}},
  {meaning:"宛名のない封筒を消さずに預かる理由を確かめる場面。届かないまま消えることと、届かないまま残ることは、違う。",id:"ku10",a:"kana",b:"utsuro",th:10,title:"宛名がなくても",lines:[
    ["k","封筒、増えてるね。"],["u","ある。全部、ある。"],["k","それ、重くない？"],["u","重いかもしれない。でも、預かった。"],["k","宛名がなくても？"],["u","宛名がなくても、捨てない。"],["k","……うつろは、どうしてそんなに持てるの。"],["u","持てる、というより、置けない。"],["k","置けない？"],["u","捨てたら、届かなくなる。届かないまま消えるのは、違う。"],["k","……届いてほしかった人が、まだいるから？"],["u","いるかどうか分からない。でも、可能性を消したくない。"],["k","……そっか。"],["u","かなは、さっき泣いてた。"],["k","見てたの？"],["u","少し。"],["k","……封筒、一個くれる？宛名は、後でいい。"],["u","あげる。"]
  ],fx:{type:"stability",who:"utsuro",v:3}},
  {meaning:"まだ読めない封筒をどうするか話し合う場面。急いで開けないことが、時には正しい判断になる。",id:"uc10",a:"utsuro",b:"kotae",th:10,title:"まだ読まない",lines:[
    ["o","この封筒、読めそう？"],["u","まだ。"],["o","開けてもいないのに？"],["u","熱い。"],["o","……そっか。"],["u","今読んだら、答えじゃなくて傷になる。"],["o","じゃあ、保管で。"],["u","うん。消さない。"],["o","……うつろは、いつも分かるんだね。読める時と、読めない時が。"],["u","感じるだけ。"],["o","私には分からない。記録は全部、できるだけ早く整理したい。"],["u","急がなくていい封筒がある。"],["o","……そうなの？"],["u","時間が経たないと、開けられないものがある。人も、手紙も。"],["o","……じゃあ、私が急ごうとしたら、止めて。"],["u","うん。止める。"],["o","ありがとう。"]
  ],fx:{type:"analysis",v:3}},
  {meaning:"受領証の下書きを審査官が保留にする場面。傷つけるために書かれた言葉は、まだ武器だ。",id:"koa10",a:"kotae",b:"auditor",th:10,title:"保留",lines:[
    ["o","受領証の下書きができました。"],["a","……保留だ。"],["o","理由をください。"],["a","まだ、自分を刺す形をしている。"],["o","判決ですか。"],["a","検品だ。"],["o","では、捨てません。"],["a","捨てるな。直せ。"],["o","……どう直せばいいですか。"],["a","自分を傷つけるために書かれた言葉は、まだ武器だ。道具にするには、時間がいる。"],["o","……時間が経てば、直りますか。"],["a","直るとは言わない。使えるようになる、とは言える。"],["o","……保留、承りました。"],["a","怒るな。"],["o","怒ってません。感謝してます。"],["a","……。"],["o","止めてくれる人がいないと、私は全部判決にしてしまう。"],["a","それを知っているなら、十分だ。"]
  ],fx:{type:"pressure",v:-3}},
  {meaning:"みんなを怖がらせていた審査官の本音が出る場面。距離を置くのは、傷つけたくないからだった。",id:"ka8",a:"kana",b:"auditor",th:8,title:"責めてるんですか",lines:[
    ["k","あなたは、責めてるんですか。"],["a","……。"],["k","みんな、あなたを怖がってます。"],["a","怖がれば止まる。"],["k","止まれば、守れる？"],["a","壊れるよりはいい。"],["k","でも、止まり続けても壊れます。"],["a","……知っている。"],["k","……じゃあ、なんで続けるんですか。"],["a","怖がられる方が、楽だからだ。"],["k","楽？"],["a","守ろうとして傷つけることがある。それが怖い。だから、最初から距離を置く。"],["k","……それ、孤独じゃないですか。"],["a","そうかもしれない。"],["k","……私は、怖くないです。"],["a","嘘だ。"],["k","少し怖い。でも、それだけです。"],["a","……。"],["k","あなたが守ろうとしてることは、分かってます。だから、来ました。"],["a","……来なくていい。"],["k","来ます。"]
  ],fx:{type:"pressure",v:-5}},
];
const CBID={};CONVS.forEach(function(c){CBID[c.id]=c;});
const TPL={explore:["{n}は{area}を{m}マス進んだ。","{n}は{area}の奥へ歩いた。"],discover:["{n}は{item}を見つけた。"],comfort:["{a}が{b}のそばに来た。{b}の疲れが、少しほどけた。"],store:["うつろが封筒を{n}通、整理した。"],record:["コタエは今日のことを書いた。"],talk:["{a}と{b}が{place}で、少しの間いっしょにいた。"],daily:["一日が、静かに終わった。","世界は、急がなかった。"],protect:["仲間が{n}のまわりに集まった。誰も、責めなかった。"]};
/* トイマンの探索ログ。慰めず、確認するように短く。残り火を廃棄物と呼ばず「未回収」として扱う。 */
const TOYMAN_EXPLORE_LOG=[
  ["トイマンは、灰の跡を見つけた。","「熱の方向を確認」","「この先にある」"],
  ["トイマンは、ランタンをかざした。","「まだ熱がある」","「近い」"],
  ["トイマンは、焦げた小枝に触れた。","「ここを通った」","「未回収」"],
  ["トイマンは、立ち止まった。","「残っている」","「見失っていない」"],
];
const TOYMAN_SHADOW_LOG=[
  ["黒い影が言った。","「何にもならなかった」","トイマンはカバンを抱え直した。","「判定不能」","「まだ回収中」"],
  ["影が囁いた。","「誰も読まなかった」","トイマンは一歩も引かなかった。","「それでも、残っている」","「迎えに行く」"],
];
const TOYMAN_FAIL_LOG=[
  ["トイマンは、手ぶらで帰ってきた。","「回収できなかった」","「でも、位置は記録した」","「見失っていない」"],
  ["トイマンは、煤だらけで戻った。","「今日は届かなかった」","「火は、まだそこにある」","「また行く」"],
];
const SCENE_TPL={
  toyman:{exploring:["問いの迷宮の入口で、地図を何度も広げていた。","未受領の森の奥で立ち止まった。また歩きだした。"],resting:["今日は帰ってきた。カバンは少し重くなっていた。"],idle:["どこかへ行く気があるようで、なかった。"],protected:["動けなくなった。仲間が来た。それでよかった。"]},
  kana:{comforting:["誰かのそばに静かに座った。何も言わなかったけど、場の空気が変わった。"],resting:["今日は、ちょっとだけ泣いた。でもそれでよかった。"],idle:["会いたい人がいるようだった。"],protected:["守られている。それで大丈夫だった。"]},
  utsuro:{organizing:["封筒を並べ直した。どれも消えていないことを確かめてから、棚にしまった。"],resting:["郵便局の椅子で目を閉じた。封筒はまだそこにある。"],idle:["何かを待っているようだった。"],protected:["預かったものは、離さなかった。"]},
  kotae:{recording:["記録塔で紙をめくっていた。判決を出す前に、もう一度読み直した。"],resting:["ペンを置いた。それだけで、少し楽になった。"],idle:["判決は、明日でいいと思った。"],protected:["記録は消えない。それは知っている。"]},
};

const cn=function(v,a,b){return Math.max(a||0,Math.min(b||100,Math.round(v)));};
const rnd=function(){return Math.random();};
const pick=function(a){return a[Math.floor(Math.random()*a.length)];};
const fill=function(t,m){return t.replace(/\{(\w+)\}/g,function(_,k){return m[k]!==undefined?m[k]:k;});};
const cloneS=function(o){return JSON.parse(JSON.stringify(o));};
const nowISO=function(){return new Date().toISOString();};
const fmtT=function(iso){var d=new Date(iso);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");};
const computeStatus=function(c){var f=c.stats.fatigue,s=c.stats.stability;if(f>=100)return"protected";if(f>=80)return"limit";if(f>=50)return"tired";if(f<=20&&s>=70)return"peak";return"normal";};
const getScene=function(id,c,game){var st=computeStatus(c),act=c.lastAction,pool=SCENE_TPL[id];if(!pool)return"静かにしている。";var p=pool[st]==="protected"&&pool.protected?pool.protected:pool[act]||pool.idle||["静かにしている。"];return p[game.world.day%p.length];};
const getCharsAtLoc=function(game,loc){if(!game||!game.characters||!loc)return[];return ALL_IDS.filter(function(id){return game.characters[id]&&toNK(game.characters[id].location)===loc&&isCharMet(game,id);});};

/* ── アイテム付与 ── */
function grantItem(s,key,count){if(!s.inventory)s.inventory={};s.inventory[key]=(s.inventory[key]||0)+count;}

/* ── 称号チェック＆付与 ── */
function checkAndGrantAchievements(s,rewards){
  if(!s.achievements)s.achievements={};
  var newOnes=[];
  ACHIEVEMENT_DATA.forEach(function(ach){
    if(s.achievements[ach.id])return;
    if(ach.cond(s)){
      s.achievements[ach.id]=true;newOnes.push(ach);
      if(ach.reward.ip)s.ip.cur=Math.min(s.ip.max,(s.ip.cur||0)+ach.reward.ip);
      if(ach.reward.ip_max){s.ip.max=(s.ip.max||20)+ach.reward.ip_max;}
      if(ach.reward.item)grantItem(s,ach.reward.item,ach.reward.count||1);
      if(rewards)rewards.push({type:"achievement",name:ach.title});
    }
  });
  return newOnes;
}

/* ── 解放チェック ── */
function checkUnlocks(s){
  if(!s.unlocks)s.unlocks={};
  var rcpts=(s.receipts||[]).length,achs=Object.keys(s.achievements||{}).filter(function(k){return s.achievements[k];}).length,items=Object.keys(s.inventory||{}).filter(function(k){return(s.inventory[k]||0)>0;}).length;
  if(rcpts>=1){s.unlocks.scene_book=true;s.unlocks.intervention=true;s.unlocks.world_record=true;}
  if(achs>=1)s.unlocks.title_book=true;
  if(items>=1)s.unlocks.item_book=true;
}


/* ── 初期タブ／施設の段階解放 ──
   初見では「ホーム / 残り火 / ログ」だけを見せる。
   施設は削除せず、残り火の内容に応じて箱庭内で開く。 */
const BASE_TABS={home:true,ember:true,log:true,garden:false,titles:false,conv:false,intv:false};
const BASE_PLACES={inspection_bureau:false,tears_spring:false,starting_room:true,post_office:false,record_tower:false,unexplored_forest:false};
/* キャラの初登場：最初はトイマンだけ。残り火が進むたびに、担当キャラが順に現れる。
   この版の残り火フローは 探索(トイマン)→保管(うつろ)→休息(かな)→読解(コタエ)。
   審査官は検品庁が開く時に現れる。 */
const BASE_CHARS={toyman:true,utsuro:false,kana:false,kotae:false,auditor:false};
function unlockChar(s,id,silent){
  ensureProgressiveUnlockShell(s);
  if(!s.unlocks.chars[id]){
    s.unlocks.chars[id]=true;
    if(!silent){
      if(!s.recentCharUnlocks)s.recentCharUnlocks=[];
      s.recentCharUnlocks=[{id:id,name:NAMES[id]||id,at:nowISO()}].concat(s.recentCharUnlocks).slice(0,5);
      s.logs=[{hours:0,events:[{text:NAMES[id]+"が、はじめて姿を見せた。",kind:"unlock",pri:5}],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
      if(INTRO_SCENES[id]){
        if(!s.introQueue)s.introQueue=[];
        if(s.introQueue.indexOf(id)===-1&&(!s.seenIntroScenes||s.seenIntroScenes.indexOf(id)===-1)){
          s.introQueue=s.introQueue.concat([id]);
        }
      }
    }
  }
}
function isCharMet(game,id){
  if(!game||!game.unlocks||!game.unlocks.chars)return id==="toyman";
  return !!game.unlocks.chars[id];
}
function getMetCharIds(game){return ALL_IDS.filter(function(id){return isCharMet(game,id);});}
/* 場所キーから、その場所に紐づくキャラ（解放を対にするため） */
const PLACE_CHAR={unexplored_forest:"toyman",post_office:"utsuro",tears_spring:"kana",record_tower:"kotae",inspection_bureau:"auditor",starting_room:null};
function ensureProgressiveUnlocks(s){
  if(!s.unlocks)s.unlocks={};
  if(!s.unlocks.tabs)s.unlocks.tabs=Object.assign({},BASE_TABS);
  else s.unlocks.tabs=Object.assign({},BASE_TABS,s.unlocks.tabs);
  if(!s.unlocks.places)s.unlocks.places=Object.assign({},BASE_PLACES);
  else s.unlocks.places=Object.assign({},BASE_PLACES,s.unlocks.places);
  if(!s.unlocks.chars)s.unlocks.chars=Object.assign({},BASE_CHARS);
  else s.unlocks.chars=Object.assign({},BASE_CHARS,s.unlocks.chars);
  (s.emberCards||[]).forEach(function(c){unlockPlacesFromCard(s,c,true);});
  (s.receipts||[]).forEach(function(){s.unlocks.tabs.garden=true;s.unlocks.tabs.conv=true;});
  if(Object.keys(s.achievements||{}).some(function(k){return s.achievements[k];}))s.unlocks.tabs.titles=true;
  if(s.unlocks.scene_book)s.unlocks.tabs.conv=true;
  if(s.unlocks.intervention&&((s.emberCards||[]).length>=2||(s.receipts||[]).length>=1))s.unlocks.tabs.intv=true;
  var anyPlace=Object.keys(s.unlocks.places).some(function(k){return s.unlocks.places[k];});
  if(anyPlace)s.unlocks.tabs.garden=true;
  return s;
}
function unlockPlace(s,key,silent){
  ensureProgressiveUnlockShell(s);
  if(!s.unlocks.places[key]){
    s.unlocks.places[key]=true;
    s.unlocks.tabs.garden=true;
    if(!silent){
      if(!s.recentPlaceUnlocks)s.recentPlaceUnlocks=[];
      s.recentPlaceUnlocks=[{key:key,name:PNAME[key]||PSHORT[key]||key,at:nowISO()}].concat(s.recentPlaceUnlocks).slice(0,5);
    }
  }
  /* 場所に紐づくキャラがいれば、ここで初登場させる */
  var who=PLACE_CHAR[key];
  if(who&&!s.unlocks.chars[who]){unlockChar(s,who,silent);}
}
function ensureProgressiveUnlockShell(s){
  if(!s.unlocks)s.unlocks={};
  if(!s.unlocks.tabs)s.unlocks.tabs=Object.assign({},BASE_TABS);
  else s.unlocks.tabs=Object.assign({},BASE_TABS,s.unlocks.tabs);
  if(!s.unlocks.places)s.unlocks.places=Object.assign({},BASE_PLACES);
  else s.unlocks.places=Object.assign({},BASE_PLACES,s.unlocks.places);
  if(!s.unlocks.chars)s.unlocks.chars=Object.assign({},BASE_CHARS);
  else s.unlocks.chars=Object.assign({},BASE_CHARS,s.unlocks.chars);
}
function unlockPlacesFromCard(s,card,silent){
  ensureProgressiveUnlockShell(s);
  if(!card)return s;
  var opened=[];
  function op(k){var before=s.unlocks.places[k];unlockPlace(s,k,silent);if(!before&&s.unlocks.places[k])opened.push(k);}
  /* 初回体験では、言葉の種類だけで施設を一気に開かない。
     まず「はじまりの部屋」、出発したら「未受領の森」。
     その後、担当フェーズに入った場所だけが自然に開く。
     さらに、現在の段階までに通り過ぎた段階の場所・キャラも開く（古いセーブの遡及解放）。 */
  var orderByUnit=["waiting","exploring","resting","reading","checking","storing","completed"];
  var idx=card.unitState?orderByUnit.indexOf(card.unitState):-1;
  if(idx>=1)op("unexplored_forest");
  if(idx>=2)op("tears_spring");
  if(idx>=3)op("record_tower");
  if(idx>=4)op("inspection_bureau");
  if(idx>=5)op("post_office");
  op("starting_room");
  if(opened.length>0&&!silent){
    s.logs=[{hours:0,events:opened.map(function(k){return {text:"新しい場所が開きました。「"+(PNAME[k]||PSHORT[k])+"」",kind:"unlock",pri:4};}),ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  }
  return s;
}
function getUnlockedPlaceKeys(game){
  if(!game)return[];
  ensureProgressiveUnlockShell(game);
  var keys=PKEYS.filter(function(k){return game.unlocks.places&&game.unlocks.places[k];});
  return keys.length?keys:["starting_room"];
}
function getVisibleTabs(game){
  if(!game)return[];
  if(MVP_MODE){var mvpT=[{id:"home",label:"ホーム"},{id:"ember",label:"残り火"},{id:"peek",label:"箱庭"}];if((game.emberCards||[]).length>0||(game.receipts||[]).length>0)mvpT.push({id:"conv",label:"場面"});mvpT.push({id:"log",label:"ログ"});return mvpT;}
  ensureProgressiveUnlockShell(game);
  var tabs=[{id:"home",label:"ホーム"},{id:"ember",label:"残り火"},{id:"log",label:"ログ"}];
  if(game.unlocks.tabs.garden)tabs.push({id:"peek",label:"箱庭"});
  if(game.unlocks.tabs.conv)tabs.push({id:"conv",label:"場面"});
  return tabs.slice(0,5);
}
function getPlaceUnlockReason(key){
  return ({
    inspection_bureau:"責める声や、価値を裁く声を保留する場所です。",
    tears_spring:"悲しみ、痛み、苦しさを休ませる場所です。",
    starting_room:"書いた理由と、帰ってくる灯りを置く場所です。",
    post_office:"届いてほしかったものや、外からの反応を預かる場所です。",
    record_tower:"残った言葉を、判決ではなく記録として刻む場所です。",
    unexplored_forest:"まだ言葉になっていない問いを、トイマンが拾いに行く場所です。"
  })[key]||"残り火から開いた場所です。";
}

/* ── セーブデータ移行 ──
   SAVE_VERSION を上げたら、下の段階的マイグレーションに分岐を1つ足す。
   各分岐は「そのバージョン未満のセーブに対して必要な変換」を行い、最後に version を更新する。
   個別の存在チェック（後半）は、どの経路で来たセーブでも壊れないための最終防御。 */
const SAVE_VERSION="2.2";
function migrateGame(g){
  if(!g)return g;
  var v=g.version||"1.0";
  /* ── 段階的マイグレーション ── */
  /* < 1.6: 残り火を unitState 統一システムへ正規化し、放置進行に対応させる */
  if(cmpVer(v,"1.6")<0){
    if(g.emberCards)g.emberCards=g.emberCards.map(function(c){return normalizeEmberUnitCard(c);});
  }
  /* ── 以降のバージョンはここに分岐を追加 ── */
  /* < 1.7: 残留物（小さな火）の手紙システムを追加 */
  if(cmpVer(v,"1.7")<0){
    g.mailLetters={};g.mailArchive={};
    PKEYS.forEach(function(k){g.mailLetters[k]=[];g.mailArchive[k]=0;});
  }

  /* < 2.1: 初回問い札を即表示しない。出発待ちは、まず出発ボタンで動かす。 */
  if(cmpVer(v,"2.1")<0){
    if(g.emberCards)g.emberCards=g.emberCards.map(function(c){
      if(!c)return c;
      if(c.status==="awaiting"||c.unitState==="waiting"){
        c.unitState="waiting";
        c.status="awaiting";
        c.progress=0;
        c.questionPending=false;
        c.pendingQuestion=null;
        c.currentQuestion="この火は、何になってほしかったと思いますか？";
        if(c.route==="judgment_conversion"){
          c.storagePlace="はじまりの部屋・出発待ち";
          if(!c.title)c.title="まだ意味にならない火";
        }
      }
      return c;
    });
  }

  /* ── 最終防御：欠損フィールドの補完（バージョンに関わらず実行） ── */
  if(!g.mailLetters){g.mailLetters={};PKEYS.forEach(function(k){g.mailLetters[k]=[];});}
  else PKEYS.forEach(function(k){if(!g.mailLetters[k])g.mailLetters[k]=[];});
  if(!g.mailArchive){g.mailArchive={};PKEYS.forEach(function(k){g.mailArchive[k]=0;});}
  else PKEYS.forEach(function(k){if(g.mailArchive[k]===undefined)g.mailArchive[k]=0;});
  if(!g.battle)g.battle={watch:0,lastManualBattleAt:0,manualCount:0,lastLines:[],encounter:null};
  if(g.battle.watch===undefined)g.battle.watch=0;
  if(!g.battle.lastManualBattleAt)g.battle.lastManualBattleAt=0;
  if(!g.battle.lastLines)g.battle.lastLines=[];
  if(g.battle.encounter===undefined)g.battle.encounter=null;
  if(!g.inventory)g.inventory={ash_fragment:0,nameless_envelope:0,water_drop:0,unread_paper:0,small_light:0,pending_tag:0,red_stamp_mark:0,lost_voice:0,dried_tear:0,old_ink:0,question_ticket:0};
  if(!g.achievements)g.achievements={};
  if(!g.unlocks)g.unlocks={scene_book:false,intervention:false,world_record:false,title_book:false,item_book:false};
  if(!g.recentRewards)g.recentRewards=[];
  if(!g.newAchievements)g.newAchievements=[];
  if(!g.world.traces)g.world.traces={unexplored_forest:{footprints:0,ash_papers:0,shadows:0},post_office:{envelopes:0},tears_spring:{drops:0},record_tower:{papers:0,holds:0},starting_room:{lights:0,receipts:0},inspection_bureau:{tags:0,holds:0}};
  if(!g.world.map.inspection_bureau)g.world.map.inspection_bureau={unlocked:true,level:1,progress_rate:0.10};
  if(!g.world.traces.inspection_bureau)g.world.traces.inspection_bureau={tags:0,holds:0};
  if(g.characters&&g.characters.auditor){g.characters.auditor.location="inspection_bureau";if(!g.characters.auditor.stats)g.characters.auditor.stats={pressure:50};if(g.characters.auditor.stats.pressureLimit===undefined)g.characters.auditor.stats.pressureLimit=100;}
  if(g.emberCards)g.emberCards=g.emberCards.filter(function(c){return c.id!=="e_init";});
  if(!g.mapTouch)g.mapTouch={cur:1,max:6,lastCalc:nowISO()};
  if(!g.returnedToHeart)g.returnedToHeart=[];
  if(!g.introQueue)g.introQueue=[];
  if(!g.seenIntroScenes){
    /* 既に会っているキャラのシーンは「見たことにする」。既存セーブで急に演出が出ないように。 */
    g.seenIntroScenes=Object.keys(INTRO_SCENES).filter(function(id){return g.unlocks&&g.unlocks.chars&&g.unlocks.chars[id];});
  }
  if(g.endingReady===undefined)g.endingReady=false;
  if(g.endingSeen===undefined)g.endingSeen=false;
  if(g.emberCards)g.emberCards=g.emberCards.map(function(c){return normalizeEmberUnitCard(c);});
  ensureProgressiveUnlocks(g);
  g.version=SAVE_VERSION;
  return g;
}
/* セマンティックバージョン比較（a<b で負, a==b で0, a>b で正） */
function cmpVer(a,b){
  var pa=String(a).split(".").map(Number),pb=String(b).split(".").map(Number);
  for(var i=0;i<Math.max(pa.length,pb.length);i++){
    var x=pa[i]||0,y=pb[i]||0;
    if(x!==y)return x<y?-1:1;
  }
  return 0;
}

/* ── シーンイベント定義 ── */
const SCENE_REWARDS={
  toyman_search:   {},
  toyman_find:     {item:"ash_fragment",count:1,progress:7},
  toyman_encounter:{item:"ash_fragment",count:1,progress:5},
  utsuro_sort:     {item:"nameless_envelope",count:1},
  nameless_glow:   {},
  kana_heal:       {item:"water_drop",count:1,fatigue:-4},
  spring_drop:     {item:"water_drop",count:1},
  kotae_read:      {item:"unread_paper",count:1,progress:6},
  auditor_hold:    {item:"pending_tag",count:1},
  light_grow:      {item:"small_light",count:1},
  receipt_arrive:  {},
};
function makeSceneEv(type,loc){return{id:"ev_"+Date.now(),type:type,loc:loc,phase:"start",reward:SCENE_REWARDS[type]||{},startedAt:Date.now()};}
function genSceneEvent(game,loc){
  var c=game.characters,cards=game.emberCards||[],r=Math.random();
  var hasReady=cards.some(function(e){return e.status==="ready";});
  if(loc==="unexplored_forest"){if(c.toyman.lastAction!=="exploring")return null;return makeSceneEv(r<0.40?"toyman_search":r<0.72?"toyman_find":"toyman_encounter",loc);}
  if(loc==="post_office"){if(c.utsuro.lastAction!=="organizing")return null;return makeSceneEv(r<0.65?"utsuro_sort":"nameless_glow",loc);}
  if(loc==="tears_spring"){return makeSceneEv(r<0.60?"kana_heal":"spring_drop",loc);}
  if(loc==="record_tower"){if(c.kotae.lastAction!=="recording")return null;return makeSceneEv(r<0.70?"kotae_read":"auditor_hold",loc);}
  if(loc==="starting_room"){return makeSceneEv(hasReady?"receipt_arrive":"light_grow",loc);}
  return null;
}
function pickBestLoc(game){
  if(!game||!game.world||!game.world.map)return"starting_room";
  var sc={};
  PKEYS.forEach(function(k){if(!game.world.map[k])return;var n=getCharsAtLoc(game,k).length;sc[k]=n*2+rnd()*3;});
  if(game.characters&&game.characters.toyman&&game.characters.toyman.lastAction==="exploring"&&sc.unexplored_forest!==undefined)sc.unexplored_forest+=5;
  if(game.characters&&game.characters.kana&&game.characters.kana.lastAction==="comforting"&&sc.tears_spring!==undefined)sc.tears_spring+=4;
  if((game.emberCards||[]).some(function(c){return getEmberPlace(c)==="record_tower";})&&sc.record_tower!==undefined)sc.record_tower+=3;
  var keys=Object.keys(sc);
  if(!keys.length)return"starting_room";
  return keys.reduce(function(a,b){return sc[a]>sc[b]?a:b;});
}
function genCharPos(game,loc){
  var pos={};var anch=ANCHORS[loc]||{};
  if(!game||!game.characters)return pos;
  ALL_IDS.forEach(function(id){if(!game.characters[id]||toNK(game.characters[id].location)!==loc||!anch[id])return;pos[id]={x:anch[id][0],y:anch[id][1]};});
  return pos;
}
function makeGoals(game){
  var cards=game.emberCards||[];var goals=[];
  if(cards.length===0){
    goals.push({id:"g_new",icon:"✉",done:false,type:"ember_new",label:"残り火を預ける",sub:"書いたあとに残ったものを預けてみよう"});
  }else{
    var ready=cards.find(function(c){return c.status==="ready";});
    if(ready){goals.push({id:"g_recv_"+ready.id,icon:"📩",done:false,type:"receive",emberId:ready.id,label:"「"+makeEmberTitle(ready)+"」を受け取る",sub:"はじまりの部屋で自分宛ての封筒が待っています"});}
    var active=cards.find(function(c){return c.status!=="ready";});
    if(active){var st=EMBER_STATUS[active.status]||{};goals.push({id:"g_ember_"+active.id+"_"+active.status,icon:"🔍",done:false,type:"ember_progress",emberId:active.id,startStatus:active.status,startProgress:active.progress||0,label:"「"+makeEmberTitle(active)+"」を進める",sub:(st.label||"処理中")+" / あと"+Math.max(0,100-Math.round(active.progress||0))+"%"});}
    var mf=0,mi="toyman";CHAR_IDS.forEach(function(id){if(game.characters[id].stats.fatigue>mf){mf=game.characters[id].stats.fatigue;mi=id;}});
    if(mf>=50){goals.push({id:"g_ca",icon:"💧",done:false,type:"care",who:mi,target:Math.max(0,mf-15),label:"かなに"+NAMES[mi]+"を支えてもらう",sub:NAMES[mi]+"の疲労が高い（"+mf+"）"});}
    else{var h=getNextUnlockInfo(game)[0];goals.push({id:"g_sc",icon:"🤝",done:false,type:"bond",label:h?"連携場面に近づける":"連携を深める",sub:h?"あと"+h.need+"で「"+h.title+"」":"場面帳の解放に近づける"});}
  }
  while(goals.length<3)goals.push({id:"g_x"+goals.length,icon:"·",done:true,type:"idle",label:"世界が静かに進んでいる",sub:""});
  return goals;
}
function findCardById(game,id){return (game.emberCards||[]).find(function(c){return c.id===id;});}
function emberAdvanced(prevCard,card,startStatus,startProgress){
  if(!card&&!prevCard)return false;
  if(!card&&prevCard)return true;
  if(prevCard&&card.status!==prevCard.status)return true;
  if(startStatus&&card.status!==startStatus)return true;
  var sp=startProgress!==undefined?startProgress:(prevCard?(prevCard.progress||0):0);
  return (card.progress||0)>=sp+15;
}
function checkGoals(goals,game,prevGame){
  prevGame=prevGame||{};
  return goals.map(function(g){
    if(g.done)return g;var g2=Object.assign({},g);
    if(g.type==="ember_new"&&(game.emberCards||[]).length>((prevGame.emberCards||[]).length))g2.done=true;
    if(g.type==="receive"){var pc=findCardById(prevGame,g.emberId),cc=findCardById(game,g.emberId);if(pc&&pc.status==="ready"&&!cc)g2.done=true;}
    if(g.type==="ember_progress"){var pc2=findCardById(prevGame,g.emberId),cc2=findCardById(game,g.emberId);if(emberAdvanced(pc2,cc2,g.startStatus,g.startProgress))g2.done=true;}
    if(g.type==="hint"||g.type==="explore"||g.type==="analyze"){var pc3=getActiveEmber(prevGame),cc3=getActiveEmber(game);if(emberAdvanced(pc3,cc3,null,pc3?(pc3.progress||0):0))g2.done=true;}
    if(g.type==="care"&&game.characters[g.who]&&game.characters[g.who].stats.fatigue<=g.target)g2.done=true;
    if(g.type==="bond"){var bon=false;CHAR_IDS.forEach(function(id){Object.keys(game.characters[id].bonds).forEach(function(k){var before=prevGame.characters&&prevGame.characters[id]&&prevGame.characters[id].bonds?(prevGame.characters[id].bonds[k]||0):0;if(game.characters[id].bonds[k]>before)bon=true;});});if(bon)g2.done=true;}
    return g2;
  });
}
function getUnlockedConvIds(game){return CONVS.filter(function(c){return(game.characters[c.a].bonds[c.b]||0)>=c.th;}).map(function(c){return c.id;});}
function getNextUnlockInfo(game){var infos=[];CONVS.forEach(function(c){var bond=game.characters[c.a].bonds[c.b]||0;if(bond<c.th&&bond>=c.th-5){infos.push({id:c.id,a:c.a,b:c.b,title:c.title,need:c.th-bond});}});return infos;}

function initGame(){
  var now=nowISO();
  return{version:SAVE_VERSION,createdAt:now,lastSavedAt:now,lastOpenedAt:now,
    characters:{
      toyman:{location:"starting_room",stats:{fatigue:30,stability:50,exploration:70},bonds:{kana:8,utsuro:5,kotae:10,auditor:3},lastAction:"resting"},
      kana:  {location:"tears_spring",    stats:{fatigue:25,stability:60,empathy:80},   bonds:{toyman:8,utsuro:12,kotae:7,auditor:4},lastAction:"resting"},
      utsuro:{location:"post_office",     stats:{fatigue:20,stability:70,storage:75},   bonds:{toyman:5,kana:12,kotae:9,auditor:2},lastAction:"organizing"},
      kotae: {location:"record_tower",    stats:{fatigue:35,stability:55,record:70},    bonds:{toyman:10,kana:7,utsuro:9,auditor:6},lastAction:"recording"},
      auditor:{location:"inspection_bureau",stats:{pressure:50,pressureLimit:100},bonds:{toyman:3,kana:4,utsuro:2,kotae:6},mode:"normal"},
    },
    world:{map:{starting_room:{unlocked:true,level:1,progress_rate:0.20},post_office:{unlocked:true,level:1,progress_rate:0.18},tears_spring:{unlocked:true,level:1,progress_rate:0.25},record_tower:{unlocked:true,level:1,progress_rate:0.16},unexplored_forest:{unlocked:true,level:1,progress_rate:0.12},inspection_bureau:{unlocked:true,level:1,progress_rate:0.10}},letters:{stored:3,unreceived:0},day:1,traces:{unexplored_forest:{footprints:0,ash_papers:0,shadows:0},post_office:{envelopes:0},tears_spring:{drops:0},record_tower:{papers:0,holds:0},starting_room:{lights:0,receipts:0},inspection_bureau:{tags:0,holds:0}}},
    mailLetters:{unexplored_forest:[],starting_room:[],post_office:[],tears_spring:[],record_tower:[],inspection_bureau:[]},
    mailArchive:{unexplored_forest:0,starting_room:0,post_office:0,tears_spring:0,record_tower:0,inspection_bureau:0},
    battle:{watch:0,lastManualBattleAt:0,manualCount:0,lastLines:[],encounter:null},
    emberCards:[],receipts:[],
    ip:{cur:5,max:20,lastCalc:now},mapTouch:{cur:1,max:6,lastCalc:now},unlockedConvs:[],readConvs:[],receivedScenes:[],readStories:[],returnedToHeart:[],endingReady:false,endingSeen:false,introQueue:[],seenIntroScenes:[],dailyGoals:{date:"",goals:[]},policy:"care",logs:[],archive:[],
    inventory:{ash_fragment:0,nameless_envelope:0,water_drop:0,unread_paper:0,small_light:0,pending_tag:0,red_stamp_mark:0,lost_voice:0,dried_tear:0,old_ink:0},
    achievements:{},unlocks:{scene_book:false,intervention:false,world_record:false,title_book:false,item_book:false,tabs:Object.assign({},BASE_TABS),places:Object.assign({},BASE_PLACES)},
    recentRewards:[],newAchievements:[],
    history:{prevOpen:null,lastOpen:null,hourly:[],daily:[]},introSeen:false,
  };
}


const FEELINGS=["空っぽ","悔しさ","悲しさ","恥ずかしさ","怒り","寂しさ","まだ分からない"];
const WANTED=["読まれたかった","分かってほしかった","認めてほしかった","一緒に感じてほしかった","終わらせたかった","残したかった","まだ分からない"];
const WRITE_STATES=["何にもならない気がした","書いたけど届いていない","投稿したけど反応がない","終わったのに虚しい","誰にも見せていない","消したいけど消せない","まだ分からない"];
const EMBER_STATUS={
  awaiting:{label:"出発待ち",who:"",col:"var(--dim)"},
  unreceived:{label:"未受領の森を探索中",who:"toyman",col:"var(--ct)"},
  stored:{label:"郵便局で保管中",who:"utsuro",col:"var(--cu)"},
  openable:{label:"涙の泉で休息中",who:"kana",col:"var(--ck)"},
  checking:{label:"記録塔で読解中",who:"kotae",col:"var(--co)"},
  inspecting:{label:"検品庁で検品中",who:"auditor",col:"var(--ca)"},
  ready:{label:"はじまりの部屋で受領待ち",who:"",col:"var(--ember2)"},
};
const EMBER_NEXT={unreceived:"stored",stored:"openable",openable:"checking",checking:"ready"};
const IP_TIERS=[
  {cost:1, label:"小さく干渉", mult:1.0, desc:"今すぐ少し動かす"},
  {cost:3, label:"連続干渉",   mult:1.2, desc:"3回連続・+20%効果"},
  {cost:5, label:"集中干渉",   mult:1.5, desc:"集中して・+50%効果"},
  {cost:10,label:"遠征",       mult:2.0, desc:"大きく進む・2倍効果"},
];
function getIPTiming(ip){
  if(!ip||!ip.lastCalc)return{secToNext:60,minsToFull:20};
  var elapsed=(Date.now()-new Date(ip.lastCalc).getTime())/60000;
  var frac=elapsed%1;
  var secToNext=ip.cur>=ip.max?0:Math.max(0,Math.round((1-frac)*60));
  var remain=ip.max-ip.cur;
  var minsToFull=remain<=0?0:Math.max(0,Math.round(remain-frac));
  return{secToNext:secToNext,minsToFull:minsToFull};
}
function fmtMins(m){if(m<=0)return"0分";if(m<60)return m+"分";var h=Math.floor(m/60),r=m%60;return h+"時間"+(r>0?r+"分":"");}
function calcIP(s,now){var e=(new Date(now).getTime()-new Date(s.ip.lastCalc).getTime())/60000;return{cur:Math.min(s.ip.max,s.ip.cur+Math.floor(Math.min(e,s.ip.max))),max:s.ip.max,lastCalc:now};}
function checkLvl(s,key,events,rewards){var m=s.world.map[key];if(m.progress_rate>=1.0){m.level=(m.level||1)+1;m.progress_rate-=1.0;var lname=getPlaceLvName(key,m.level);var ln={post_office:"うつろ郵便局",starting_room:"はじまりの部屋",tears_spring:"かなの涙の泉",record_tower:"コタエ記録塔",unexplored_forest:"未受領の森"};events.push({text:ln[key]+" が Lv."+m.level+"（"+lname+"）になった。",kind:"levelup",pri:5});if(rewards){var pItems=PLACE_ITEM[key]||[];if(pItems.length>0){var itm=pick(pItems);grantItem(s,itm,1);rewards.push({type:"item",name:ITEM_NAMES[itm]||itm,count:1});}rewards.push({type:"levelup",place:ln[key]||key,level:m.level,stageName:lname});}}}
function snapshot(s){var chars={},places={};ALL_IDS.forEach(function(id){var c=s.characters[id];chars[id]=id==="auditor"?{fatigue:null,stability:null,unique:Math.round(c.stats.pressure),status:c.mode==="inspection"?"inspection":"normal"}:{fatigue:Math.round(c.stats.fatigue),stability:Math.round(c.stats.stability),unique:Math.round(c.stats[UKEY[id]]),status:computeStatus(c)};});PKEYS.forEach(function(k){var m=s.world.map[k];places[k]={progress:m.progress_rate||0,level:m.level||1};});return{chars:chars,places:places,letters:{stored:s.world.letters.stored,unreceived:s.world.letters.unreceived},day:s.world.day};}
function applyHourly(s){CHAR_IDS.forEach(function(id){var c=s.characters[id],nat=NFAT[c.lastAction]||35;if(c.stats.fatigue<nat)c.stats.fatigue+=1;else if(c.stats.fatigue>nat)c.stats.fatigue-=1;if(c.stats.stability<54.4)c.stats.stability+=0.5;else if(c.stats.stability>55.6)c.stats.stability-=0.5;});}
function tiredTgt(s){var best=null,bestF=49;CHAR_IDS.forEach(function(id){if(id==="kana")return;var f=s.characters[id].stats.fatigue;if(f>=50&&f>bestF){bestF=f;best=id;}});return best;}
function applyAction(s,events){
  var p=s.policy,m=s.world.map;
  var hasExploring=(s.emberCards||[]).some(function(c){return c.unitState==="exploring";});
  var t=s.characters.toyman,tSt=computeStatus(t);
  if(!hasExploring){
    /* 探索中の残り火がない時は、トイマンははじまりの部屋で待つ。森には行かない。 */
    t.lastAction="resting";t.location="starting_room";
  }else if(tSt==="protected"||tSt==="limit"){t.lastAction="resting";}
  else if(rnd()<(p==="explore"?0.85:0.5)){
    t.lastAction="exploring";t.location="unexplored_forest";
    var g=(0.012+rnd()*0.03)*(0.6+t.stats.exploration/200)*(p==="explore"?1.4:1);m.unexplored_forest.progress_rate+=g;
    if(rnd()<0.55)t.stats.exploration=Math.min(100,t.stats.exploration+1);
    var pct=Math.round(g*100);
    var roll=rnd();
    if(roll<0.25){
      /* 影に遭遇。「何にもならなかった」と言われても、トイマンは引かない */
      var shadow=pick(TOYMAN_SHADOW_LOG);
      events.push({text:shadow.join("\n")+"\n\n回収率 +"+pct+"%　疲労 +3",kind:"discover",pri:3});
    }else{
      var found=pick(TOYMAN_EXPLORE_LOG);
      events.push({text:found.join("\n")+"\n\n回収率 +"+pct+"%　疲労 +"+(2+Math.floor(rnd()*3)),kind:"explore",pri:1});
    }
    checkLvl(s,"unexplored_forest",events,s._rw);
  }else{
    /* 探索に出たが回収できなかった日。残り火は失われていない。位置は記録されている */
    t.lastAction="resting";if(rnd()<0.4)t.location="starting_room";
    if(rnd()<0.5){var fail=pick(TOYMAN_FAIL_LOG);events.push({text:fail.join("\n"),kind:"protect",pri:2});}
  }
  if(isCharMet(s,"kana")){
    var k=s.characters.kana,tgt=tiredTgt(s);
    if(tgt){k.location=s.characters[tgt].location;k.lastAction="comforting";var heal=(4+Math.round(k.stats.empathy/20))*(p==="care"?1.3:1);s.characters[tgt].stats.fatigue=Math.max(0,s.characters[tgt].stats.fatigue-heal);s.characters[tgt].stats.stability=Math.min(100,s.characters[tgt].stats.stability+2);if(rnd()<0.5)k.stats.empathy=Math.min(100,k.stats.empathy+1);m.tears_spring.progress_rate+=0.008*(p==="care"?1.4:1);events.push({text:fill(pick(TPL.comfort),{a:NAMES.kana,b:NAMES[tgt]}),kind:"comfort",pri:2});checkLvl(s,"tears_spring",events,s._rw);}
    else{k.lastAction="resting";k.location="tears_spring";}
  }
  if(isCharMet(s,"utsuro")){
    var u=s.characters.utsuro;u.lastAction="organizing";u.location=rnd()<0.6?"post_office":"unexplored_forest";if(rnd()<0.5)u.stats.storage=Math.min(100,u.stats.storage+1);m.post_office.progress_rate+=0.008*(p==="care"?1.2:1);if(rnd()<0.4)events.push({text:fill(pick(TPL.store),{n:1+Math.floor(rnd()*3)}),kind:"store",pri:1});checkLvl(s,"post_office",events,s._rw);
  }
  if(isCharMet(s,"kotae")){
    var co=s.characters.kotae;co.lastAction="recording";co.location="record_tower";if(rnd()<(p==="record"?0.8:0.4))co.stats.record=Math.min(100,co.stats.record+(p==="record"?2:1));m.record_tower.progress_rate+=0.006*(p==="record"?1.6:1);if(rnd()<0.3)events.push({text:pick(TPL.record),kind:"record",pri:1});checkLvl(s,"record_tower",events,s._rw);
  }
  m.starting_room.progress_rate+=0.004;checkLvl(s,"starting_room",events,s._rw);
  if(isCharMet(s,"auditor")){
    var a=s.characters.auditor;a.location=a.stats.pressure>=70?"starting_room":"starting_room_edge";a.mode=a.stats.pressure<=20?"inspection":"normal";
  }
  CHAR_IDS.forEach(function(id){if(!isCharMet(s,id))return;var c=s.characters[id];if(c.stats.fatigue>=100){c.stats.fatigue=100;c.lastAction="resting";if(!c._pa){c._pa=true;c.stats.stability=Math.min(100,c.stats.stability+10);events.push({text:fill(pick(TPL.protect),{n:NAMES[id]}),kind:"protect",pri:5});}}else if(c.stats.fatigue<90){c._pa=false;}});
  /* ── 残留物（手紙）のambient処理：放置中も自然に生まれて進む ── */
  maybeSpawnToymanDiscoveryLetter(s);
  tickLettersAmbient(s);
}
function applyConv(s,events){var byLoc={};ALL_IDS.forEach(function(id){if(!isCharMet(s,id))return;var k=toNK(s.characters[id].location);if(!byLoc[k])byLoc[k]=[];byLoc[k].push(id);});var cands=Object.keys(byLoc).filter(function(k){return byLoc[k].length>=2;});if(!cands.length)return;var locK=pick(cands),ids=byLoc[locK].slice();var a=ids.splice(Math.floor(rnd()*ids.length),1)[0],b=ids[Math.floor(rnd()*ids.length)];var dbl=s.policy==="care"?2:1;s.characters[a].bonds[b]=cn((s.characters[a].bonds[b]||0)+1);s.characters[b].bonds[a]=cn((s.characters[b].bonds[a]||0)+1);if(a!=="auditor")s.characters[a].stats.stability=Math.min(100,s.characters[a].stats.stability+dbl);if(b!=="auditor")s.characters[b].stats.stability=Math.min(100,s.characters[b].stats.stability+dbl);s.world.map.starting_room.progress_rate+=0.006*dbl;if(a==="auditor"||b==="auditor"){if(byLoc[locK].indexOf("kana")>=0){s.characters.auditor.stats.pressure=Math.max(0,s.characters.auditor.stats.pressure-5);events.push({text:"かなが審査官に話しかけた。圧が下がった。",kind:"auditor",pri:3});}else events.push({text:"審査官は、ただ立っていた。",kind:"auditor",pri:1});}else{if(a==="kana"||b==="kana")s.characters[a==="kana"?b:a].stats.fatigue=Math.max(0,s.characters[a==="kana"?b:a].stats.fatigue-3);events.push({text:fill(pick(TPL.talk),{a:NAMES[a],b:NAMES[b],place:PNAME[locK]||"どこか"}),kind:"talk",pri:2});}}
function applyDaily(s,events){var p=s.policy;if(p==="care"){CHAR_IDS.forEach(function(id){s.characters[id].stats.fatigue=Math.max(0,s.characters[id].stats.fatigue-8);});s.characters.auditor.stats.pressure=Math.max(0,s.characters.auditor.stats.pressure-4);}if(p==="record")s.characters.kotae.stats.record=Math.min(100,s.characters.kotae.stats.record+3);if(p==="explore")s.world.map.unexplored_forest.progress_rate+=0.02;CHAR_IDS.forEach(function(id){var c=s.characters[id];if(c.stats.fatigue>=100){c.stats.fatigue=Math.max(0,c.stats.fatigue-5);c.stats.stability=Math.min(100,c.stats.stability+10);}});s.world.letters.stored+=Math.floor(rnd()*3);if(rnd()<0.5)s.world.letters.unreceived+=1;var pr=s.characters.auditor.stats.pressure;if(s.world.letters.unreceived>=5)pr+=4;if(CHAR_IDS.every(function(id){return s.characters[id].stats.fatigue>=50;}))pr+=5;pr+=(50-pr)*0.05;s.characters.auditor.stats.pressure=cn(pr);s.world.day+=1;events.push({text:pick(TPL.daily),kind:"rest",pri:1});PKEYS.forEach(function(k){checkLvl(s,k,events,s._rw);});}
function clampAll(s){CHAR_IDS.forEach(function(id){var st=s.characters[id].stats;st.fatigue=cn(st.fatigue);st.stability=cn(st.stability);st[UKEY[id]]=cn(st[UKEY[id]]);Object.keys(s.characters[id].bonds).forEach(function(k){s.characters[id].bonds[k]=cn(s.characters[id].bonds[k]);});});s.characters.auditor.stats.pressure=cn(s.characters.auditor.stats.pressure);PKEYS.forEach(function(k){var m=s.world.map[k];if(m.progress_rate<0)m.progress_rate=0;});}
function buildSummary(before,after,events,hours,s){var perChar=ALL_IDS.map(function(id){return{id:id,name:NAMES[id],fatigue:id==="auditor"?null:{from:before.chars[id].fatigue,to:after.chars[id].fatigue},unique:{label:ULABEL[id],from:before.chars[id].unique,to:after.chars[id].unique},status:after.chars[id].status};});var places=PKEYS.map(function(k){var bf=before.places[k]||{progress:0,level:1},af=after.places[k]||{progress:0,level:1};return{id:k,name:PSHORT[k],label:PLBL[k],from:bf.progress,to:af.progress,delta:af.progress-bf.progress,level:af.level};});var high=events.filter(function(e){return e.pri>=3;}),low=events.filter(function(e){return e.pri<3;}).sort(function(){return rnd()-0.5;});var seen={},picked=[];[].concat(high,low).forEach(function(e){if(!seen[e.text]&&picked.length<6){seen[e.text]=true;picked.push(e);}});return{date:nowISO(),day:after.day,hours:Math.round(hours),policy:s.policy,perChar:perChar,places:places,events:picked.map(function(e){return{text:e.text,kind:e.kind};}),letters:{from:before.letters.stored,to:after.letters.stored}};}
function simulate(state,hoursRaw,policy){var hours=Math.max(0,Math.min(hoursRaw,72));var s=cloneS(state);s.policy=policy;s._rw=[];var before=snapshot(s);var cy={hourly:Math.floor(hours),four:Math.floor(hours/4),eight:Math.floor(hours/8),daily:Math.floor(hours/24)};var events=[];for(var i=0;i<cy.hourly;i++)applyHourly(s);for(var j=0;j<cy.four;j++)applyAction(s,events);for(var k=0;k<cy.eight;k++)applyConv(s,events);for(var l=0;l<cy.daily;l++)applyDaily(s,events);
  /* 残り火の放置進行：経過時間（4時間=1サイクル）に比例して確実に進める。
     applyAction/applyDaily 内の条件付き呼び出しに依存せず、ここで独立して回す。 */
  var emberCycles=Math.max(cy.four,Math.floor(hours/4));
  if(hours>0&&emberCycles===0)emberCycles=1; /* 最低1サイクルは進める */
  for(var ec=0;ec<emberCycles;ec++)processEmbers(s,events);
  enforceToymanAutoTravel(s);clampAll(s);checkAndGrantAchievements(s,s._rw);checkUnlocks(s);var after=snapshot(s);var summary=buildSummary(before,after,events,hours,s);s.logs=[summary].concat(s.logs||[]).slice(0,30);s.recentRewards=s._rw.slice();delete s._rw;return{newState:s,summary:summary};}
function genLiveEvent(g){var unrec=(g.emberCards||[]).filter(function(c){return c.status==="unreceived";});var toyEx=g.characters.toyman.lastAction==="exploring";if(toyEx&&unrec.length>0&&rnd()<0.24){var enemy=pick(EX.enemies),win=rnd()<0.62,outcome=win?pick(EX.winOut):pick(EX.loseOut),fatD=win?1+Math.floor(rnd()*2):2+Math.floor(rnd()*2);var card=unrec[0],title=makeEmberTitle(card),gain=Math.round((win?3+Math.floor(rnd()*3):2+Math.floor(rnd()*3)));return{text:["トイマンは未受領の森を進んだ。","黒い影「"+enemy+"」が現れた。── "+outcome+"。","「"+title+"」が "+gain+"% 進んだ。","疲労 +"+fatD,"結果：問いを落とさなかった"].join("\n"),kind:"explore_detail",su:{type:"tex_ember",emberId:card.id,gain:gain/100,fatD:fatD,expl:Math.min(100,g.characters.toyman.stats.exploration+(win?1:0))}};}var tired=CHAR_IDS.filter(function(id){return id!=="kana"&&g.characters[id].stats.fatigue>=45;});if(tired.length&&rnd()<0.62){var tgt=pick(tired);return{text:"かなが"+NAMES[tgt]+"のそばに来た。疲れが少しほどけた。",kind:"comfort",su:{type:"kh",target:tgt,amount:4}};}if(rnd()<0.72){var n=1+Math.floor(rnd()*3);return{text:"うつろが封筒を"+n+"通整理した。消えていない、と確認した。",kind:"store",su:{type:"us",n:n}};}if(rnd()<0.84)return{text:"コタエは今日のことを書いた。短くていい、と思いながら。",kind:"record",su:{type:"kr"}};return{text:"審査官は、ただ静かにしている。",kind:"auditor",su:null};}

/* ── 戦闘介入：v5.40 の emberCards / unitState 版 ── */
const BATTLE_CFG={manualCooldown:6500,encounterMaxTurns:3,watchToIp:100,
  actions:{
    hold:{id:"hold",label:"問いを握らせる",sub:"落とさないように支える",progressMin:4,progressMax:7,fatigueMin:2,fatigueMax:4,watch:12,damage:1,kind:"hold"},
    read:{id:"read",label:"影の声を読む",sub:"判決ではなく声として記録する",progressMin:1,progressMax:3,fatigueMin:1,fatigueMax:2,watch:8,damage:0,kind:"read"},
    retreat:{id:"retreat",label:"一度下がらせる",sub:"勝つより帰ることを優先する",progressMin:0,progressMax:0,fatigueMin:-6,fatigueMax:-4,watch:4,damage:0,kind:"retreat"}
  }
};
const SHADOW_VOICES={
  "未受領の影":["どうせ届いてない","見られていないものは、なかったのと同じだ","その火、誰が受け取るの？"],
  "足あと喰い":["誰も覚えていない","歩いた跡なんて、すぐ消える","残したつもり？"],
  "迷子の声":["なんで書いたの？","どこに届いてほしかったの？","まだ名前もないくせに"],
  "錆びた判決札":["価値なし","通過不可","これは保留ではなく却下だ"],
  "何にもならなかった獣":["ほら、何にもならなかった","時間だけが燃えた","誰にも必要とされていない"],
  "どうせ届かない鳥":["飛ばしても返事は来ない","空に投げても落ちるだけ","宛先なんてない"]
};
const TOYMAN_BATTLE_LINES={
  hold:["落とさない。まだ問いなら持てる","答えじゃなくていい。問いなら持って帰る","これを、何にもならなかったで終わらせない"],
  read:["……声としてなら、記録できる","これは判決じゃない。影の声だ","言ったな。じゃあ、持って帰る"],
  retreat:["下がる。でも捨てない","今日はここまで。でも落としてない","帰る道は、まだ覚えてる"]
};
function getToymanBattleEmber(game){
  return (game.emberCards||[]).find(function(c){return (c.unitState==="exploring"||c.status==="unreceived")&&!c.questionPending;})||null;
}
function battleEnemyName(game){
  var b=game&&game.battle?game.battle:null;
  if(b&&b.encounter&&b.encounter.enemy)return b.encounter.enemy;
  var card=getToymanBattleEmber(game)||{};
  var t=game.characters.toyman||{};
  var seed=Math.round(card.progress||0)+(t.stats?t.stats.fatigue:0)+(b?b.manualCount||0:0);
  return EX.enemies[Math.abs(seed)%EX.enemies.length]||"未受領の影";
}
function getBattleFatigueMod(fatigue){
  fatigue=Math.round(fatigue||0);
  if(fatigue>=100)return{blocked:true,progress:0,watch:0,extraFatigue:0,label:"限界",note:"トイマンはもう戦えません。かなのケアが必要です。"};
  if(fatigue>=80)return{blocked:false,progress:0.4,watch:0.5,extraFatigue:1,label:"限界間近",note:"疲労で回収は進みにくい。無理をすると疲労がさらに増えます。"};
  if(fatigue>=50)return{blocked:false,progress:0.75,watch:0.75,extraFatigue:0,label:"疲れ気味",note:"少し効率が落ちています。かなの水があると楽になります。"};
  return{blocked:false,progress:1,watch:1,extraFatigue:0,label:"通常",note:"まだ問いを抱えて進めます。"};
}
function getOrCreateBattleEncounter(s){
  if(!s.battle)s.battle={watch:0,lastManualBattleAt:0,manualCount:0,lastLines:[],encounter:null};
  var e=s.battle.encounter;
  if(!e||e.done||e.turns>=BATTLE_CFG.encounterMaxTurns){
    var enemy=battleEnemyName(Object.assign({},s,{battle:Object.assign({},s.battle,{encounter:null})}));
    e={id:"enc_"+Date.now()+"_"+Math.floor(Math.random()*1000),enemy:enemy,turns:0,maxTurns:BATTLE_CFG.encounterMaxTurns,voiceIndex:0,startedAt:nowISO(),done:false};
    s.battle.encounter=e;
  }
  return e;
}
function peekBattleEncounter(game){
  var b=game.battle||{};
  if(b.encounter&&!b.encounter.done&&b.encounter.turns<BATTLE_CFG.encounterMaxTurns)return b.encounter;
  return{enemy:battleEnemyName(game),turns:0,maxTurns:BATTLE_CFG.encounterMaxTurns,voiceIndex:0,done:false};
}
function getShadowVoice(enemy,index){var voices=SHADOW_VOICES[enemy]||SHADOW_VOICES["未受領の影"];return voices[Math.abs(index||0)%voices.length];}
function makeBattlePreview(game){
  var t=game.characters.toyman;
  var card=getToymanBattleEmber(game);
  var pct=Math.round(card?card.progress||0:((game.world.map.unexplored_forest||{}).progress_rate||0)*100);
  var enc=peekBattleEncounter(game);
  var hpMax=3;var hp=Math.max(1,hpMax-(enc.turns||0));
  var fatigue=t&&t.stats?Math.round(t.stats.fatigue||0):0;
  var mod=getBattleFatigueMod(fatigue);
  var b=game.battle||{watch:0,lastManualBattleAt:0};
  var left=Math.max(0,BATTLE_CFG.manualCooldown-(Date.now()-(b.lastManualBattleAt||0)));
  return{enemy:enc.enemy,hp:hp,hpMax:hpMax,fatigue:fatigue,progress:pct,mod:mod,watch:Math.round(b.watch||0),cooldownMs:left,turns:enc.turns||0,maxTurns:enc.maxTurns||BATTLE_CFG.encounterMaxTurns,voice:getShadowVoice(enc.enemy,enc.voiceIndex||0),card:card};
}
function grantBattleWatch(s,amount){
  if(!s.battle)s.battle={watch:0,lastManualBattleAt:0,manualCount:0,lastLines:[],encounter:null};
  var total=(s.battle.watch||0)+Math.max(0,Math.round(amount||0));
  var gain=Math.floor(total/BATTLE_CFG.watchToIp);
  s.battle.watch=total%BATTLE_CFG.watchToIp;
  if(gain>0&&s.ip)s.ip.cur=Math.min(s.ip.max,(s.ip.cur||0)+gain);
  return gain;
}
function randBetween(a,b){return a+Math.floor(rnd()*(b-a+1));}
function runToymanBattleIntervention(game,actionId,selfAnswer){
  actionId=actionId||"hold";
  selfAnswer=(selfAnswer||"").trim();
  var action=BATTLE_CFG.actions[actionId]||BATTLE_CFG.actions.hold;
  var ns=cloneS(game);
  if(!ns.battle)ns.battle={watch:0,lastManualBattleAt:0,manualCount:0,lastLines:[],encounter:null};
  var t=ns.characters.toyman;
  var card=getToymanBattleEmber(ns);
  if(!t||!card||t.lastAction!=="exploring"){return{ok:false,state:game,msg:"戦闘中ではありません",lines:["トイマンが未受領の森で残り火を回収中で、まだ問い札が出ていない時だけ、戦闘に介入できます。"]};}
  var nowT=Date.now();
  var cd=Math.max(0,BATTLE_CFG.manualCooldown-(nowT-(ns.battle.lastManualBattleAt||0)));
  if(cd>0){return{ok:false,state:game,msg:"まだ介入できません",cooldownMs:cd,lines:["連打では問いは深まりません。あと "+Math.ceil(cd/1000)+"秒、見守ってください。"]};}
  var mod=getBattleFatigueMod(t.stats.fatigue||0);
  if(mod.blocked){return{ok:false,state:game,msg:"トイマンは限界です",lines:[mod.note,"かなに水を持ってきてもらう必要があります。"]};}
  var enc=getOrCreateBattleEncounter(ns);
  var enemy=enc.enemy;
  var voice=getShadowVoice(enemy,enc.voiceIndex||0);
  var rawProg=randBetween(action.progressMin,action.progressMax);
  var prog=Math.max(0,Math.round(rawProg*mod.progress));
  var rawFat=randBetween(action.fatigueMin,action.fatigueMax);
  var fat=rawFat>=0?rawFat+mod.extraFatigue:rawFat;
  var watch=Math.max(1,Math.round(action.watch*mod.watch));
  var beforeFat=Math.round(t.stats.fatigue||0);
  var beforeProg=Math.round(card.progress||0);
  /* 自己回答を蓄積 */
  if(selfAnswer){
    if(!card.shadowAnswers)card.shadowAnswers=[];
    var voice0=getShadowVoice(enc.enemy,enc.voiceIndex||0);
    card.shadowAnswers=card.shadowAnswers.concat([{shadow:voice0,answer:selfAnswer,at:nowISO(),action:actionId}]).slice(-20);
    prog=prog+randBetween(3,5);
  }
  if(prog>0){
    card.progress=Math.min(100,(card.progress||0)+prog);
    ns.world.map.unexplored_forest.progress_rate=Math.min(0.999,(ns.world.map.unexplored_forest.progress_rate||0)+prog/500);
  }
  t.stats.fatigue=cn((t.stats.fatigue||0)+fat);
  t.lastAction=action.kind==="retreat"?"resting":"exploring";
  t.location="unexplored_forest";
  if(action.kind!=="retreat")t.stats.exploration=cn((t.stats.exploration||0)+1);
  ns.battle.lastManualBattleAt=nowT;
  ns.battle.manualCount=(ns.battle.manualCount||0)+1;
  enc.turns=(enc.turns||0)+1;
  enc.voiceIndex=(enc.voiceIndex||0)+1;
  var ipGain=grantBattleWatch(ns,watch);
  var events=[];
  if(card.progress>=100){var pq=advanceUnitStateByProgress(ns,card,"影との遭遇");events.push({text:"残り火に問い札が発生した。問い：「"+((pq&&pq.question)||card.currentQuestion||"次の問い")+"」",kind:"discover",pri:5});}
  var afterProg=Math.min(100,Math.round(card.progress||0));
  var toymanLine=pick(TOYMAN_BATTLE_LINES[action.kind]||TOYMAN_BATTLE_LINES.hold);
  var reached100=card.progress>=100;
  var lines=["影に遭遇 — "+action.label,"影「"+enemy+"」：「"+voice+"」"];
  if(action.kind==="hold"){
    lines.push("トイマンは前に進んだ。");
    lines.push("トイマン：「"+toymanLine+"」");
    lines.push("回収率 +"+prog+"%（"+beforeProg+" → "+afterProg+"）");
    lines.push("疲労 "+(fat>=0?"+":"")+fat+"（"+beforeFat+" → "+Math.round(t.stats.fatigue||0)+"）");
  }else if(action.kind==="read"){
    lines.push("影の声を、判決ではなく声として聞いた。");
    lines.push("トイマン：「"+toymanLine+"」");
    lines.push("回収率 +"+prog+"%（"+beforeProg+" → "+afterProg+"）");
    lines.push("疲労 +"+Math.max(0,fat)+"（"+beforeFat+" → "+Math.round(t.stats.fatigue||0)+"）");
  }else{
    lines.push("トイマンは今日のところを引き返した。");
    lines.push("トイマン：「"+toymanLine+"」");
    lines.push("回収率は動かなかった。でも、場所は覚えている。");
    lines.push("疲労 "+fat+"（"+beforeFat+" → "+Math.round(t.stats.fatigue||0)+"）");
  }
  lines.push("見守り +"+watch+"（"+Math.round(ns.battle.watch||0)+" / 100）");
  if(ipGain>0)lines.push("見守りが届いた：干渉ポイント +"+ipGain);
  if(selfAnswer)lines.push("あなたの言葉：「"+selfAnswer+"」— 回収率 +3〜5% ボーナス");
  var ended=false;
  if(reached100){lines.push("── 道が開いた ──");lines.push("問いが届いた。「残り火」タブで確認してください。");}
  if(events.length>0){ended=true;events.forEach(function(e){lines.push(e.text);});ns.battle.encounter=null;}
  else if(enc.turns>=BATTLE_CFG.encounterMaxTurns){
    ended=true;enc.done=true;
    lines.push(action.kind==="retreat"?"トイマンは今日の分を終えた。またいつでも来られる。":"影が薄くなった。道が少し開いた。");
    ns.ip.cur=Math.min(ns.ip.max,(ns.ip.cur||0)+1);
    lines.push("影との遭遇を越えた：干渉ポイント +1");
    ns.battle.encounter=null;
  }
  if(t.stats.fatigue>=100){t.location="starting_room";t.lastAction="resting";ns.battle.encounter=null;lines.push("トイマンは疲れきって、はじまりの部屋へ戻った。かなのケアが必要です。");}
  ns.battle.lastLines=lines.slice();
  ns.logs=[{hours:0,events:[{text:lines.join("\n"),kind:"explore_detail",pri:5}],ts:nowISO()}].concat(ns.logs||[]).slice(0,30);
  ns.lastSavedAt=nowISO();
  return{ok:true,state:ns,msg:ended?(reached100?"問いが届いた":"今日の遭遇が終わりました"):"前に進みました",lines:lines,effects:[action.label,"疲労 "+(fat>=0?"+":"")+fat,"回収率 +"+prog+"%","見守り +"+watch].concat(ipGain>0?["IP +"+ipGain]:[]),ipGain:ipGain,watchGain:watch,action:actionId,ended:ended,reached100:reached100};
}

function captureSnap(game){
  var p={};PKEYS.forEach(function(k){p[k]=game.world.map[k].progress_rate||0;});
  return{time:nowISO(),places:p};
}
function updateHistory(prev,ns,preSnap){
  var snap=captureSnap(ns);var now2=Date.now();var today=new Date().toISOString().slice(0,10);
  var h=(prev.hourly||[]).slice();var lh=h.length>0?h[h.length-1]:null;
  if(!lh||(now2-new Date(lh.time).getTime())>45*60*1000)h=h.concat([snap]).slice(-48);
  var d=(prev.daily||[]).slice();var ld=d.length>0?d[d.length-1]:null;
  if(!ld||ld.date!==today)d=d.concat([{date:today,places:snap.places}]).slice(-7);
  return{prevOpen:preSnap||prev.lastOpen||null,lastOpen:snap,hourly:h,daily:d};
}
function getPlaceDelta(game,key,type){
  var hist=game.history;if(!hist)return null;
  var cur=game.world.map[key].progress_rate||0;
  if(type==="prev"&&hist.prevOpen){var pv=hist.prevOpen.places[key];return pv!==undefined?cur-pv:null;}
  if(type==="1h"){var hr=hist.hourly||[];if(!hr.length)return null;var cut=Date.now()-3600000;var sn=null;for(var i=hr.length-1;i>=0;i--){if(new Date(hr[i].time).getTime()<=cut){sn=hr[i];break;}}if(!sn)sn=hr[0];return sn?cur-(sn.places[key]||0):null;}
  if(type==="24h"){var da=hist.daily||[];var cd=new Date(Date.now()-86400000).toISOString().slice(0,10);var ds=null;for(var j=0;j<da.length;j++){if(da[j].date<=cd)ds=da[j];}return ds?cur-(ds.places[key]||0):null;}
  return null;
}


const PLACE_STAGES={
  unexplored_forest:["入口の小道","迷子の声","灰の底"],
  record_tower:["机の記録","書庫の照合","結晶室"],
  post_office:["受付","仕分け棚","保管庫"],
  tears_spring:["水面","岸辺","深い泉"],
  starting_room:["灯り","休息","方針"],
  inspection_bureau:["受付","判定棚","保留室"],
};
function getPlaceStages(key,rate){
  var names=PLACE_STAGES[key]||["段階1","段階2","段階3"];
  var pct=Math.min(99,Math.round(rate*100));
  return[
    {name:names[0],done:pct>=33,active:pct>0&&pct<33, fp:pct<33?Math.round(pct/33*100):100},
    {name:names[1],done:pct>=66,active:pct>=33&&pct<66,fp:pct>=33?Math.min(100,Math.round((pct-33)/33*100)):0},
    {name:names[2],done:pct>=99,active:pct>=66&&pct<99,fp:pct>=66?Math.min(100,Math.round((pct-66)/33*100)):0},
  ];
}
function getCurrentStageName(key,rate){
  var stages=getPlaceStages(key,rate);
  var cur=stages.find(function(s){return s.active;})||stages[stages.filter(function(s){return s.done;}).length]||stages[0];
  return cur?cur.name:"";
}

const INTERNAL_PLACE_MAPS={
  unexplored_forest:[
    {id:"entrance",label:"入口",x:70,y:52,to:["path","whisper"]},
    {id:"path",label:"小道",x:160,y:52,to:["shadow"]},
    {id:"shadow",label:"影の部屋",x:250,y:52,to:["ash"]},
    {id:"whisper",label:"ささやきの庭",x:96,y:124,to:["memory"]},
    {id:"memory",label:"かすれた記憶の広場",x:188,y:124,to:["ash"]},
    {id:"ash",label:"灰の部屋",x:280,y:124,to:[]},
  ],
  starting_room:[
    {id:"light",label:"灯り",x:64,y:88,to:["rest"]},
    {id:"rest",label:"休息",x:144,y:88,to:["policy"]},
    {id:"policy",label:"方針",x:224,y:88,to:["receive"]},
    {id:"receive",label:"受領",x:304,y:88,to:[]},
  ],
  post_office:[
    {id:"reception",label:"受付",x:66,y:88,to:["sort"]},
    {id:"sort",label:"仕分け棚",x:160,y:88,to:["storage"]},
    {id:"storage",label:"保管庫",x:254,y:88,to:[]},
  ],
  tears_spring:[
    {id:"surface",label:"水面",x:66,y:88,to:["shore"]},
    {id:"shore",label:"岸辺",x:160,y:88,to:["deep"]},
    {id:"deep",label:"深い泉",x:254,y:88,to:[]},
  ],
  record_tower:[
    {id:"desk",label:"机の記録",x:66,y:88,to:["shelf"]},
    {id:"shelf",label:"書庫の照合",x:160,y:88,to:["crystal"]},
    {id:"crystal",label:"結晶室",x:254,y:88,to:[]},
  ],
  inspection_bureau:[
    {id:"reception",label:"受付",x:52,y:72,to:["shelf"]},
    {id:"shelf",label:"判定棚",x:132,y:72,to:["hold"]},
    {id:"hold",label:"保留室",x:212,y:72,to:["pressure"]},
    {id:"pressure",label:"圧力室",x:292,y:72,to:["court"]},
    {id:"court",label:"旧法廷",x:180,y:132,to:[]},
  ],
};

/* ══════════════════════════════════════════════════════════════
   残留物（小さな火）＝ 手紙システム
   残り火（大きな火・既存のunitStateの流れ）とは別枠。
   各施設の中を、受付的な最初の部屋 → … → 保管庫的な最後の部屋、と移動する。
   内部処理（放置）でゆっくり進み、クリックで1段階ボーナス前進＋IP。
   ══════════════════════════════════════════════════════════════ */
const LETTER_PATH={
  unexplored_forest:["entrance","path","shadow","ash"],
  starting_room:["light","rest","policy","receive"],
  post_office:["reception","sort","storage"],
  tears_spring:["surface","shore","deep"],
  record_tower:["desk","shelf","crystal"],
  inspection_bureau:["reception","shelf","hold","pressure","court"],
};
const LETTER_SPAWN_CHANCE={unexplored_forest:0.10,starting_room:0.08,post_office:0.12,tears_spring:0.09,record_tower:0.09,inspection_bureau:0.06};
const LETTER_ADVANCE_RATE=0.18; /* 1回のambient tickで、各手紙が1段階進む確率 */
const LETTER_DISPLAY_CAP=3; /* 1部屋あたりの物理表示上限。超えた分は+Nバッジ */

function initMailLetters(s){
  if(!s.mailLetters){s.mailLetters={};PKEYS.forEach(function(k){s.mailLetters[k]=[];});}
  else PKEYS.forEach(function(k){if(!s.mailLetters[k])s.mailLetters[k]=[];});
  if(!s.mailArchive){s.mailArchive={};PKEYS.forEach(function(k){s.mailArchive[k]=0;});}
  else PKEYS.forEach(function(k){if(s.mailArchive[k]===undefined)s.mailArchive[k]=0;});
}
function chooseLetterSourceForFacility(s,facility){
  var cards=(s.emberCards||[]);
  var at=cards.find(function(c){return getEmberPlace(c)===facility;})||getToymanBattleEmber(s)||cards.find(function(c){return c.status!=="ready";})||cards[0];
  if(!at)return null;
  var kindMap={
    unexplored_forest:"writeState",
    post_office:"wanted",
    tears_spring:"feeling",
    record_tower:at.bodyText?"bodyText":(at.memo?"memo":"wanted"),
    starting_room:"wanted",
    inspection_bureau:"writeState"
  };
  return{emberId:at.id,textKind:kindMap[facility]||"wanted"};
}
function getLetterSourceCard(game,letter){
  if(!letter||!letter.emberId)return null;
  return(game.emberCards||[]).find(function(c){return c.id===letter.emberId;})||(game.receipts||[]).find(function(r){return r.emberId===letter.emberId;})||null;
}
function getLetterContent(game,letter){
  var c=getLetterSourceCard(game,letter);
  if(!c)return{title:"小さな火",text:"この手紙は、箱庭の中で動いている小さな残留物です。",kind:"小さな火"};
  var key=letter.textKind||"wanted";
  var label={writeState:"状態",feeling:"感情",wanted:"本当は",bodyText:"あなたの言葉",memo:"メモ",title:"題"}[key]||"残り火";
  var val=c[key]||c.bodyText||c.memo||c.wanted||c.feeling||c.writeState||makeEmberTitle(c);
  return{title:makeEmberTitle(c),text:val,kind:label,card:c};
}
function spawnLetters(s,facility,count,meta){
  initMailLetters(s);
  count=Math.max(0,count|0);
  meta=meta||{};
  for(var i=0;i<count;i++){
    var source=meta.emberId?meta:chooseLetterSourceForFacility(s,facility);
    s.mailLetters[facility].push({
      id:"lt_"+Date.now()+"_"+Math.floor(Math.random()*100000)+"_"+i,
      step:0,clicked:false,createdAt:nowISO(),
      emberId:source&&source.emberId?source.emberId:null,
      textKind:source&&source.textKind?source.textKind:"small_fire"
    });
  }
}
/* 内部処理：放置中・オンライン中いずれからも呼ばれる、手紙の自然な生成と前進 */
function tickLettersAmbient(s){
  initMailLetters(s);
  PKEYS.forEach(function(k){
    if((s.mailLetters[k]||[]).length<5&&rnd()<LETTER_SPAWN_CHANCE[k])spawnLetters(s,k,1);
    var path=LETTER_PATH[k];
    var kept=[];
    s.mailLetters[k].forEach(function(L){
      if(rnd()<LETTER_ADVANCE_RATE){
        L.step++;L.clicked=false;
        if(L.step>=path.length-1){s.mailArchive[k]=(s.mailArchive[k]||0)+1;return;}
      }
      kept.push(L);
    });
    s.mailLetters[k]=kept;
  });
}
/* トイマンが探索中の時だけ、見つけたものが郵便局に流れ着く特別な手紙（決定A） */
function maybeSpawnToymanDiscoveryLetter(s){
  if(s.characters.toyman.lastAction==="exploring"&&(s.mailLetters.post_office||[]).length<5&&rnd()<0.12){
    initMailLetters(s);
    var card=getToymanBattleEmber(s);
    spawnLetters(s,"post_office",1,card?{emberId:card.id,textKind:"wanted"}:null);
    return true;
  }
  return false;
}
/* 手紙を1つクリックして1段階進める。1段階につき1回だけ、干渉ポイント+1。
   最後の部屋に着いたら保管庫へ（一覧から消えてmailArchiveに+1）。 */
function clickLetter(game,facility,letterId){
  var s=cloneS(game);
  initMailLetters(s);
  var arr=s.mailLetters[facility]||[];
  var L=arr.find(function(x){return x.id===letterId;});
  if(!L)return{ok:false,state:game,msg:"その手紙はもう処理されています。"};
  if(L.clicked)return{ok:false,state:game,msg:"この手紙はもう一度進めました。次の動きを待ちましょう。"};
  var path=LETTER_PATH[facility]||[];
  var beforeStep=L.step||0;
  var beforeNode=path[beforeStep]||"入口";
  var beforeLabel=(INTERNAL_PLACE_MAPS[facility]||[]).find(function(n){return n.id===beforeNode;});
  var content=getLetterContent(s,L);
  L.step++;L.clicked=true;
  s.ip.cur=Math.min(s.ip.max,(s.ip.cur||0)+1);
  /* 手紙を進めると、その手紙の元になった残り火も少しだけ前進する（効果を実感できるように） */
  var fireGain=0,fireTitle="";
  var srcCard=L.emberId?(s.emberCards||[]).find(function(c){return c.id===L.emberId;}):null;
  if(srcCard&&!srcCard.questionPending&&srcCard.unitState!=="completed"&&srcCard.status!=="ready"){
    var before=Math.round(srcCard.progress||0);
    srcCard.progress=Math.min(100,(srcCard.progress||0)+2);
    fireGain=Math.round(srcCard.progress||0)-before;
    fireTitle=makeEmberTitle(srcCard);
  }
  var stored=false;
  var afterNode=path[L.step]||path[path.length-1]||beforeNode;
  var afterLabel=(INTERNAL_PLACE_MAPS[facility]||[]).find(function(n){return n.id===afterNode;});
  if(L.step>=path.length-1){
    s.mailArchive[facility]=(s.mailArchive[facility]||0)+1;
    s.mailLetters[facility]=arr.filter(function(x){return x.id!==letterId;});
    stored=true;
  }
  var lines=stored?[
    "手紙が保管庫に届きました",
    "この小さな火は、消えずに保管されました。",
    "干渉ポイント +1"
  ]:[
    "手紙が進みました",
    "中身（"+content.kind+"）：「"+content.text+"」",
    (beforeLabel?beforeLabel.label:beforeNode)+" → "+(afterLabel?afterLabel.label:afterNode),
    "干渉ポイント +1"
  ];
  if(fireGain>0)lines.push("「"+fireTitle+"」の回収が進んだ（+"+fireGain+"%）");
  s.logs=[{hours:0,events:[{text:lines.join("\n"),kind:"store",pri:4}],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  /* 残り火のコンテキストを手紙結果に含める（提案③：手紙と残り火を感情的に連動） */
  var emberCtx=null;
  if(srcCard){
    emberCtx={
      title:makeEmberTitle(srcCard),
      feeling:srcCard.feeling||"",
      wanted:srcCard.wanted||"",
      bodyText:srcCard.bodyText||"",
      question:(srcCard.pendingQuestion&&srcCard.pendingQuestion.question)||srcCard.question||"",
      status:srcCard.status||"",
      progress:Math.round(srcCard.progress||0),
      answerCount:(srcCard.shadowAnswers||[]).length,
    };
  }
  return{ok:true,state:s,gained:1,stored:stored,content:content,from:beforeLabel?beforeLabel.label:beforeNode,to:afterLabel?afterLabel.label:afterNode,lines:lines,fireGain:fireGain,fireTitle:fireTitle,emberCtx:emberCtx};
}
/* 表示用：あるノードに今いる手紙を集計し、物理表示4件＋overflowバッジに分ける */
function getLettersAtNode(game,facility,nodeId){
  initMailLetters(game);
  var path=LETTER_PATH[facility]||[];
  var idx=path.indexOf(nodeId);
  if(idx<0)return{visible:[],overflow:0};
  var here=(game.mailLetters[facility]||[]).filter(function(L){return L.step===idx;});
  return{visible:here.slice(0,LETTER_DISPLAY_CAP),overflow:Math.max(0,here.length-LETTER_DISPLAY_CAP)};
}

function getInternalNodes(loc,game){
  var defs=INTERNAL_PLACE_MAPS[loc]||[];
  var map=(game.world.map&&game.world.map[loc])||{};
  var pct=Math.round((map.progress_rate||0)*100);
  var activeStage=getCurrentStageName(loc,map.progress_rate||0);
  return defs.map(function(n,idx){
    var threshold=Math.round(((idx+1)/Math.max(defs.length,1))*100);
    var done=pct>=threshold;
    var locked=false;
    if(loc==="unexplored_forest"){
      if(n.id==="shadow"&&pct<28)locked=true;
      if(n.id==="ash"&&((map.level||1)<2||pct<58))locked=true;
    }
    if(loc==="record_tower"&&n.id==="crystal"&&((map.level||1)<2||pct<60))locked=true;
    var active=(n.label===activeStage)||(!activeStage&&idx===0);
    if(active&&locked)active=false
    return Object.assign({},n,{done:done,active:active&&!locked,locked:locked,pct:pct,threshold:threshold});
  });
}

function getRoomAnchorMap(loc,game){
  var nodes=getInternalNodes(loc,game), by={};
  nodes.forEach(function(n){by[n.id]=n;});
  function pos(id,dx,dy){
    var n=by[id]||nodes[0]||{x:160,y:90,id:"center"};
    return {x:n.x+dx,y:n.y+dy,node:id};
  }
  var units=(game.emberCards||[]).filter(function(c){return c.unitState;});
  function unitFor(state){return units.find(function(c){return c.unitState===state;});}
  if(loc==="unexplored_forest"){
    var ex=unitFor("exploring");
    var p=ex?(ex.progress||0):Math.round(((game.world.map.unexplored_forest||{}).progress_rate||0)*100);
    var toyNode=p<18?"entrance":p<36?"path":p<54?"whisper":p<72?"memory":p<88?"shadow":"ash";
    return{toyman:pos(toyNode,0,-18),kana:pos(p<55?"whisper":"memory",0,-18),utsuro:pos("whisper",-28,-14),kotae:pos(p>=88?"ash":"memory",-24,-14),auditor:{x:328,y:46,node:"pressure"}};
  }
  if(loc==="starting_room"){
    var co=unitFor("completed");
    return{toyman:pos(co?"receive":"light",0,-18),kana:pos(co?"receive":"rest",0,-18),utsuro:pos("policy",0,-18),kotae:pos("receive",0,-18),auditor:{x:328,y:46,node:"pressure"}};
  }
  if(loc==="post_office"){
    var st=unitFor("storing")||unitFor("waiting");
    var pp=st?(st.progress||0):0;
    var un=st&&st.unitState==="storing"?(pp<50?"sort":"storage"):"reception";
    return{toyman:pos("reception",-10,-18),utsuro:pos(un,0,-18),kotae:pos(pp>70?"storage":"sort",0,-18),kana:pos("storage",-34,18),auditor:{x:328,y:46,node:"pressure"}};
  }
  if(loc==="tears_spring"){
    var rs=unitFor("resting");
    var rp=rs?(rs.progress||0):0;
    var kn=rp<40?"surface":rp<80?"shore":"deep";
    return{toyman:pos("surface",-8,-18),kana:pos(kn,0,-18),utsuro:pos("deep",0,-18),kotae:pos("deep",-32,18),auditor:{x:328,y:46,node:"pressure"}};
  }
  if(loc==="inspection_bureau"){
    return{auditor:pos("pressure",0,-22),kotae:pos("hold",0,-18),utsuro:pos("reception",0,-18),toyman:pos("shelf",-8,-18),kana:pos("hold",-28,22)};
  }
  var rd=unitFor("reading");
  var rp2=rd?(rd.progress||0):0;
  var kt=rp2<45?"desk":rp2<82?"shelf":"crystal";
  return{toyman:pos("desk",-8,-18),kana:pos("shelf",-28,18),utsuro:pos("shelf",0,-18),kotae:pos(kt,0,-18),auditor:{x:328,y:46,node:"pressure"}};
}
function getRoomEmberAnchor(loc,game){
  var units=(game.emberCards||[]).filter(function(c){return c.unitState&&getEmberPlace(c)===loc;});
  var card=units[0]||null;
  if(!card)return null;
  var nodeMap={exploring:"ash",reading:"crystal",storing:"storage",resting:"deep",waiting:"reception",completed:"receive"};
  var node=nodeMap[card.unitState]||"reception";
  if(loc==="unexplored_forest")node="ash";
  if(loc==="record_tower")node="crystal";
  if(loc==="post_office")node=card.unitState==="waiting"?"reception":"storage";
  if(loc==="tears_spring")node="deep";
  if(loc==="starting_room")node="receive";
  return{card:card,node:node};
}
function getNodeGlowLabel(loc,game){
  var map=(game.world.map&&game.world.map[loc])||{};
  return getCurrentStageName(loc,map.progress_rate||0)||"";
}

function InternalPlaceMap(p){
  var loc=p.loc,game=p.game,here=p.here||[],bubble=p.bubble,handleCharClick=p.handleCharClick,handleStageClick=p.handleStageClick,handlePressureClick=p.handlePressureClick,clickPop=p.clickPop,micro=p.micro,toyFight=p.toyFight,onClickLetter=p.onClickLetter;
  var nodes=getInternalNodes(loc,game);
  var byAnchor=getRoomAnchorMap(loc,game);
  var visible=(loc==="inspection_bureau"?here:here.filter(function(id){return id!=="auditor";})).slice(0,4);
  var charNode={};
  visible.forEach(function(id){
    var pp=byAnchor[id];
    if(pp&&pp.node){
      if(!charNode[pp.node])charNode[pp.node]=[];
      charNode[pp.node].push(id);
    }
  });
  var activeNode=(nodes.find(function(n){return n.active;})||nodes[0]||{}).id;
  return(
    <div className="room-map stable-room-map" onClick={handleStageClick}>
      <div className={"room-bg room-bg-"+loc}/>
      <svg className="room-lines" viewBox="0 0 360 180" preserveAspectRatio="none">
        {nodes.map(function(n){
          return (n.to||[]).map(function(tid,j){
            var t=nodes.find(function(x){return x.id===tid;});
            if(!t)return null;
            return <line key={n.id+"_"+tid+"_"+j} x1={n.x} y1={n.y} x2={t.x} y2={t.y} className={"room-line"+(n.done&&t.done?" room-line-done":"")}/>;
          });
        })}
      </svg>
      {nodes.map(function(n){
        var chars=charNode[n.id]||[];
        var mail=getLettersAtNode(game,loc,n.id);
        return(
          <button key={n.id}
            className={"room-node touchable"+(n.done?" rn-done":"")+(n.active?" rn-active":"")+(n.locked?" rn-locked":"")+(chars.length?" rn-has-char":"")}
            style={{left:(n.x/360*100)+"%",top:(n.y/180*100)+"%"}}
            onClick={function(e){e.stopPropagation();handleStageClick();}}>
            <span className="node-touch-mark">{n.locked?"×":n.active?"◎":"○"}</span>
            <span className="room-node-label">{n.label}</span>
            {n.locked&&<span className="room-node-sub">まだ入れない</span>}
            {n.active&&!n.locked&&chars.length>0&&<span className="room-node-sub">ここにいる</span>}
            {chars.length>0&&<span className="room-node-chips">
              {chars.map(function(id){return <i key={id} className={"node-char-chip cd-"+id}>{NAMES[id][0]}</i>;})}
            </span>}
            {(mail.visible.length>0||mail.overflow>0)&&<span className="node-mail-row" onClick={function(e){e.stopPropagation();}}>
              {mail.visible.map(function(L){return(
                <button key={L.id} type="button" className={"node-mail"+(L.clicked?" node-mail-done":"")} title={L.clicked?"処理済みの手紙":"手紙をタップして進める"} onClick={function(e){e.stopPropagation();if(!L.clicked&&onClickLetter)onClickLetter(loc,L.id);}}>
                  {L.clicked?"✓":"✉"}
                  {!L.clicked&&<span className="node-mail-label">タップ</span>}
                </button>
              );})}
              {mail.overflow>0&&<span className="node-mail-overflow">+{mail.overflow}</span>}
            </span>}
          </button>
        );
      })}
      {((function(){
        var em=getRoomEmberAnchor(loc,game);
        if(!em)return null;
        var n=nodes.find(function(x){return x.id===em.node;})||nodes[nodes.length-1]||{x:280,y:124};
        return <button className="room-ember-marker" style={{left:(n.x/360*100)+"%",top:((n.y+28)/180*100)+"%"}} onClick={function(e){e.stopPropagation();}}>
          <span className="rem-fire">🔥</span>
          <span className="rem-label">回収率</span>
          <span className="rem-pct">{Math.round(em.card.progress||0)}%</span>
          <span className="rem-desc">100%で問いが届く</span>
        </button>;
      })())}

      {visible.map(function(id){
        var pos=byAnchor[id]||{x:160,y:90};
        var hasBub=bubble&&bubble.id===id;
        var va=getVisualAction(id,game,toyFight);
        return(
          <div key={id}
            className={"sc-char sc-clickable sc-room-char sc-act-"+va}
            style={{left:(pos.x/360*100)+"%",top:(pos.y/180*100)+"%"}}
            role="button" tabIndex={0} aria-label={NAMES[id]+"に干渉する"}
            onClick={function(e){e.stopPropagation();handleCharClick(id);}}
            onKeyDown={function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();handleCharClick(id);}}}>
            {hasBub&&<div className="sc-bub">{bubble.text}</div>}
            <ActionSprite action={va}/>
            <div className={"sc-dot cd-"+id}/>
            <div className="sc-nm">{NAMES[id]}<span className="sc-tap-hint">→声</span></div>
          </div>
        );
      })}
      {here.length>3&&<div className="sc-overflow">+{here.length-3}</div>}
      <button className="pressure-orb touchable" onClick={function(e){e.stopPropagation();handlePressureClick&&handlePressureClick();}}>
        <span className="pressure-orb-mark">△</span>
        <span className="pressure-orb-dot cd-auditor"/>
        <span className="pressure-orb-label">審査官<br/>圧力</span>
      </button>
      {micro&&<div className="sc-micro room-micro">{micro}</div>}
      {clickPop&&<div className="stage-clickpop" style={{left:clickPop.x+"%",top:clickPop.y+"%"}}>{clickPop.lines.map(function(l,i){return <div key={i} className="scp-line">{l}</div>;})}</div>}
      <div className="room-map-foot">
        <span>✉ 手紙：押して保管へ</span>
        <span>キャラ：押して応援/休息</span>
        <span>△ 圧力に干渉</span>
        <span>画面：押して見守る</span>
      </div>
    </div>
  );
}

function describeFx(conv){
  var fx=conv.fx,lines=[];
  if(!fx){return["干渉ポイント +1"];}
  if(fx.type==="fatigue"&&fx.who)lines.push(NAMES[fx.who]+" 疲労 "+(fx.v>0?"+":"")+fx.v);
  if(fx.type==="bond")lines.push(NAMES[conv.a]+"×"+NAMES[conv.b]+" 連携 +"+fx.v);
  if(fx.type==="analysis")lines.push("コタエ分析率 +"+fx.v+"%");
  if(fx.type==="stability"&&fx.who)lines.push(NAMES[fx.who]+" 安定 +"+fx.v);
  if(fx.type==="pressure")lines.push("審査官の圧力 "+(fx.v>0?"+":"")+fx.v);
  lines.push("干渉ポイント +1");
  return lines;
}
function applySceneFx(game,conv){
  var s=cloneS(game);var fx=conv.fx;
  if(fx){
    if(fx.type==="fatigue"&&fx.who)s.characters[fx.who].stats.fatigue=cn(s.characters[fx.who].stats.fatigue+fx.v);
    if(fx.type==="bond"){s.characters[conv.a].bonds[conv.b]=cn((s.characters[conv.a].bonds[conv.b]||0)+fx.v);s.characters[conv.b].bonds[conv.a]=cn((s.characters[conv.b].bonds[conv.a]||0)+fx.v);}
    if(fx.type==="analysis"){var chCards=(s.emberCards||[]).filter(function(c){return c.status==="checking";});if(chCards.length>0){chCards[0].progress=Math.min(100,(chCards[0].progress||0)+fx.v*2);}}
    if(fx.type==="stability"&&fx.who)s.characters[fx.who].stats.stability=Math.min(100,s.characters[fx.who].stats.stability+fx.v);
    if(fx.type==="pressure")s.characters.auditor.stats.pressure=cn(s.characters.auditor.stats.pressure+fx.v);
  }
  s.ip.cur=Math.min(s.ip.max,s.ip.cur+1);
  if(!s.receivedScenes)s.receivedScenes=[];
  if(s.receivedScenes.indexOf(conv.id)===-1)s.receivedScenes=[conv.id].concat(s.receivedScenes);
  return s;
}
const STORY_EVENTS=[
  {id:"s0",ch:0,title:"世界は眠っています",
   text:"ここは、書いたあとに残ったものが流れ着く場所だった。\n誰も、答えを知らない。\nでも、捨てることだけはしなかった。",
   trigger:"always"},
  {id:"s1",ch:1,title:"残り火",
   text:"トイマンは未受領の森へ行った。\n問いの奥に、まだ形のないものが落ちていた。\nそれを拾って、引き返した。\n「答えじゃない」と思いながら、手放さなかった。",
   trigger:"hint"},
  {id:"s2",ch:2,title:"記録塔の灯り",
   text:"コタエは記録塔の灯りの下で、封筒を読んだ。\nまだ読めない部分があった。\nでも捨てなかった。\n「今はわからない。でも、記録しておく」",
   trigger:"analysis"},
  {id:"s3",ch:3,title:"受領",
   text:"審査官が「通していい」と言った日があった。\nそれは、はじめて聞く声だった。\n封筒は、自分宛ての形になった。\n受け取った。\nなかったことにはしなかった。",
   trigger:"fragment"},
];
function getUnlockedStories(game){
  var cards=game.emberCards||[];var rcpts=game.receipts||[];
  return STORY_EVENTS.filter(function(s){
    if(s.trigger==="always")return true;
    if(s.trigger==="hint")return cards.some(function(c){return c.status!=="unreceived";});
    if(s.trigger==="analysis")return cards.some(function(c){return c.status==="checking"||c.status==="ready";});
    if(s.trigger==="fragment")return rcpts.length>0;
    return false;
  });
}
function getScenePrediction(loc,game){
  var cards=game.emberCards||[];
  if(loc==="unexplored_forest"){var unrC=cards.filter(function(c){return c.status==="unreceived";});return unrC.length>0?"残り火が見つかるかもしれない":"残り火の探索が深まっている";}
  if(loc==="record_tower"){var chkC=cards.filter(function(c){return c.status==="checking";});return chkC.length>0?"込められた願いを読んでいる":"読解待ちの封筒を待っている";}
  if(loc==="post_office")return"持ち帰ったヒントが保管される";
  if(loc==="tears_spring")return"疲れた子が少し回復する";
  if(loc==="starting_room")return"みんなの安定が育つ";
  return"世界が少し進む";
}
function checkGoalsAwardIP(prevGoals,newGoals,state){
  if(!prevGoals||!newGoals||!state.ip)return state;
  var newly=newGoals.filter(function(g,i){return g.done&&!(prevGoals[i]&&prevGoals[i].done);}).length;
  var allDone=newGoals.length>0&&newGoals.every(function(g){return g.done;});
  var prevAll=prevGoals.length>0&&prevGoals.every(function(g){return g.done;});
  var gain=newly+(allDone&&!prevAll?2:0);
  if(gain>0)state=Object.assign({},state,{ip:Object.assign({},state.ip,{cur:Math.min(state.ip.max,state.ip.cur+gain)})});
  return state;
}

function getActiveEmber(game){return (game.emberCards||[]).find(function(c){return c.status!=="ready"&&c.status!=="awaiting";})||null;}
/* 今ユーザーが押すべき次の1アクションを返す。
   返り値: {screen, action, cardId} または null
   screen: "home"|"ember"
   action: "create"|"depart"|"answer"|"receive"  */
function getNextAction(game){
  if(!game)return null;
  var cards=game.emberCards||[];
  /* 受け取れる残り火が最優先 */
  var ready=cards.find(function(c){return c.unitState==="completed"||c.status==="ready";});
  if(ready)return{screen:"ember",action:"receive",cardId:ready.id};
  /* 問い札が出ているカード */
  var pending=cards.find(function(c){return c.questionPending&&c.pendingQuestion;});
  if(pending)return{screen:"ember",action:"answer",cardId:pending.id};
  /* 出発待ち */
  var waiting=cards.find(function(c){return c.unitState==="waiting"||c.status==="awaiting";});
  if(waiting)return{screen:"ember",action:"depart",cardId:waiting.id};
  /* カードが何もない */
  if(cards.length===0)return{screen:"home",action:"create",cardId:null};
  return null;
}
function getEmberNeed(card){return Math.max(0,100-Math.round(card.progress||0));}
function getEmberActionForStatus(status){
  if(status==="unreceived")return{target:"toyman",tier:3,label:"一括探索",verb:"トイマンで進める"};
  if(status==="stored")return{target:"utsuro",tier:3,label:"一括保管",verb:"うつろで進める"};
  if(status==="openable")return{target:"kana",tier:3,label:"一括休息",verb:"かなで進める"};
  if(status==="checking")return{target:"kotae",tier:3,label:"一括読解",verb:"コタエで進める"};
  if(status==="ready")return{target:"receive",tier:0,label:"受け取る",verb:"受領する"};
  return{target:"auto",tier:3,label:"一括干渉",verb:"進める"};
}
function getEmberNextLabel(status){return({unreceived:"うつろ郵便局の封筒へ",stored:"かなの涙の泉へ",openable:"コタエ記録塔へ",checking:"はじまりの部屋の受領待ちへ",ready:"受領証へ"})[status]||"次の段階へ";}


function ensureMapTouchCharges(game){
  var s=cloneS(game);
  if(!s.mapTouch)s.mapTouch={cur:1,max:6,lastCalc:nowISO()};
  var mt=s.mapTouch;
  if(mt.cur===undefined)mt.cur=1;
  if(!mt.max)mt.max=6;
  var last=new Date(mt.lastCalc||nowISO()).getTime();
  if(!Number.isFinite(last)){last=Date.now();mt.lastCalc=nowISO();}
  var elapsedH=Math.floor((Date.now()-last)/3600000);
  if(elapsedH>0){
    mt.cur=Math.min(mt.max,(mt.cur||0)+elapsedH);
    mt.lastCalc=new Date(last+elapsedH*3600000).toISOString();
  }
  return s;
}
function getMapTouchInfo(game){
  var mt=(game&&game.mapTouch)||{cur:1,max:6,lastCalc:nowISO()};
  var last=new Date(mt.lastCalc||nowISO()).getTime();
  if(!Number.isFinite(last))last=Date.now();
  var remain=3600000-(Date.now()-last);
  var cur=mt.cur===undefined?1:mt.cur;
  var max=mt.max||6;
  if(cur>=max)remain=0;
  return{cur:cur,max:max,minToNext:Math.max(0,Math.ceil(remain/60000))};
}

function applyPressureAction(game,mode){
  var s=cloneS(game);
  if(!s.ip)s.ip={cur:0,max:20,lastCalc:nowISO()};
  var cost=mode==="recognize"?1:2;
  if((s.ip.cur||0)<cost){
    return{ok:false,state:game,msg:"干渉ポイントが足りません。",sub:cost+"IP必要です。"};
  }
  var a=s.characters.auditor;
  if(!a.stats)a.stats={pressure:0};
  if(a.stats.pressureLimit===undefined)a.stats.pressureLimit=100;
  s.ip.cur=Math.max(0,(s.ip.cur||0)-cost);
  if(mode==="recognize"){
    a.stats.pressure=cn((a.stats.pressure||0)-1);
    s.logs=[{hours:0,events:[{text:"圧力を認知した。圧力 -1 / IP -1",kind:"auditor",pri:3}],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
    s.lastSavedAt=nowISO();
    return{ok:true,state:s,msg:"圧力を認知した",sub:"圧力 -1 / IP -1"};
  }
  a.stats.pressureLimit=(a.stats.pressureLimit||100)+1;
  grantItem(s,"pending_tag",1);
  s.logs=[{hours:0,events:[{text:"保留札を置いた。保留上限 +1 / IP -2",kind:"auditor",pri:3}],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  s.lastSavedAt=nowISO();
  return{ok:true,state:s,msg:"保留した",sub:"保留上限 +1 / IP -2"};
}

function applyToymanMove(game,destination){
  var s=cloneS(game);
  var t=s.characters.toyman;
  if(!t)return{ok:false,state:game,msg:"トイマンがいません。",sub:""};
  if(destination==="forest"){
    var hasExploring=(s.emberCards||[]).some(function(c){return c.unitState==="exploring";});
    if(!hasExploring)return{ok:false,state:game,msg:"いま森へ送る残り火がありません。",sub:"残り火を出発させると、トイマンが森へ向かいます。"};
    if(toNK(t.location)==="unexplored_forest")return{ok:false,state:game,msg:"すでに未受領の森にいます。",sub:""};
    t.location="unexplored_forest";
    t.lastAction="exploring";
    s.logs=[{hours:0,events:[{text:"トイマンが未受領の森へ出発した。",kind:"discover",pri:4}],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
    s.lastSavedAt=nowISO();
    return{ok:true,state:s,msg:"トイマンが出発した",sub:"未受領の森へ移動",goLoc:"unexplored_forest"};
  }
  if(toNK(t.location)==="starting_room")return{ok:false,state:game,msg:"すでにはじまりの部屋にいます。",sub:""};
  t.location="starting_room";
  t.lastAction="resting";
  s.logs=[{hours:0,events:[{text:"トイマンがはじまりの部屋へ帰還した。",kind:"protect",pri:4}],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  s.lastSavedAt=nowISO();
  return{ok:true,state:s,msg:"トイマンが帰還した",sub:"はじまりの部屋へ移動",goLoc:"starting_room"};
}


function enforceToymanAutoTravel(s){
  if(!s||!s.characters||!s.characters.toyman)return s;
  var hasExploring=(s.emberCards||[]).some(function(c){return c.unitState==="exploring";});
  if(!hasExploring)return s;
  var t=s.characters.toyman;
  var loc=toNK(t.location);
  var fatigue=t.stats&&t.stats.fatigue!==undefined?t.stats.fatigue:0;
  if(loc==="starting_room"&&fatigue<=0){
    t.location="unexplored_forest";
    t.lastAction="exploring";
    s.logs=[{hours:0,events:[{text:"トイマンは疲労が0になったので、未受領の森へ自動で出発した。",kind:"discover",pri:4}],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  }else if(loc==="unexplored_forest"&&fatigue>=100){
    t.location="starting_room";
    t.lastAction="resting";
    s.logs=[{hours:0,events:[{text:"トイマンは疲労が100になったので、はじまりの部屋へ自動で帰還した。",kind:"protect",pri:4}],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  }
  return s;
}

function applyCharacterCareAction(game,id,mode){
  var s=cloneS(game);
  if(!s.ip)s.ip={cur:0,max:20,lastCalc:nowISO()};
  if((s.ip.cur||0)<1){
    return{ok:false,state:game,msg:"干渉ポイントが足りません。",sub:"応援も休息も 1IP 消費します。"};
  }
  var c=s.characters[id];
  if(!c||id==="auditor"){
    return{ok:false,state:game,msg:"この相手には干渉できません。",sub:"審査官は専用操作で扱います。"};
  }
  s.ip.cur=Math.max(0,(s.ip.cur||0)-1);
  var lines=[], effects=[];
  if(mode==="support"){
    c.stats.stability=cn((c.stats.stability||0)+6);
    c.stats.fatigue=cn((c.stats.fatigue||0)+2);
    if(c.stats[UKEY[id]]!==undefined)c.stats[UKEY[id]]=cn(c.stats[UKEY[id]]+1);
    lines.push(NAMES[id]+"を応援した。");
    effects.push("安定 +6", "疲労 +2", "IP -1");
  }else{
    c.stats.fatigue=cn((c.stats.fatigue||0)-10);
    c.stats.stability=cn((c.stats.stability||0)+2);
    c.lastAction="resting";
    lines.push(NAMES[id]+"を休ませた。");
    effects.push("疲労 -10", "安定 +2", "IP -1");
  }
  s.logs=[{hours:0,events:[{text:lines[0]+" "+effects.join(" / "),kind:"care",pri:3}],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  enforceToymanAutoTravel(s);
  s.lastSavedAt=nowISO();
  return{ok:true,state:s,msg:lines[0],sub:effects.join(" / ")};
}

function getNearestBondPair(game){var best=null;CONVS.forEach(function(c){var bond=game.characters[c.a].bonds[c.b]||0;var need=c.th-bond;if(need>0&&(!best||need<best.need)){best={conv:c,bond:bond,need:need};}});if(best)return best;return{conv:{a:"toyman",b:"kana",title:"次の場面"},bond:game.characters.toyman.bonds.kana||0,need:1};}
function applyBondSupport(s,mult){var info=getNearestBondPair(s),c=info.conv,gain=Math.max(1,Math.round(1*mult));s.characters[c.a].bonds[c.b]=cn((s.characters[c.a].bonds[c.b]||0)+gain);s.characters[c.b].bonds[c.a]=cn((s.characters[c.b].bonds[c.a]||0)+gain);if(c.a!=="auditor")s.characters[c.a].stats.stability=cn(s.characters[c.a].stats.stability+1);if(c.b!=="auditor")s.characters[c.b].stats.stability=cn(s.characters[c.b].stats.stability+1);return{line:NAMES[c.a]+"×"+NAMES[c.b]+"の連携が "+gain+" 近づいた。",effect:"連携 +"+gain};}

function isJudgmentConversionInput(card){
  var ws=card&&card.writeState||"";
  var f=card&&card.feeling||"";
  var w=card&&card.wanted||"";
  return ws==="何にもならない気がした"||f==="何にもならない気がした"||w==="何にもならない気がした";
}
function makeJudgmentQuestionCard(card){
  if(!isJudgmentConversionInput(card))return card;
  return Object.assign({},card,{
    id:card.id||("ember_"+Date.now()+"_"+Math.floor(Math.random()*100000)),
    route:"judgment_conversion",
    routeName:"判決変換ルート",
    initialFire:"判決火",
    fireType:"問い火",
    title:"まだ意味にならない火",
    status:"awaiting",
    unitState:"waiting",
    progress:0,
    initialMetrics:normalizeMetrics(card.initialMetrics),
    question:"この火は、何になってほしかったと思いますか？",
    questionPending:false,
    pendingQuestion:null,
    storagePlace:"はじまりの部屋・出発待ち",
    originalJudgment:"何にもならない気がした",
    transformedAt:nowISO()
  });
}
function applyJudgmentConversionRoute(state,card){
  var s=cloneS(state);
  s.recentPlaceUnlocks=[];
  var c=makeJudgmentQuestionCard(card);
  s.emberCards=[c].concat(s.emberCards||[]);
  if(s.characters&&s.characters.auditor){
    s.characters.auditor.mode="inspection";
    s.characters.auditor.stats.pressure=cn((s.characters.auditor.stats.pressure||0)+3);
  }
  if(s.characters&&s.characters.utsuro){
    s.characters.utsuro.location="post_office";
    s.characters.utsuro.lastAction="organizing";
    s.characters.utsuro.stats.storage=cn((s.characters.utsuro.stats.storage||0)+2);
  }
  /* トイマンは、最初の問いに答えたあと探索へ向かう。 */
  if(s.world&&s.world.map){
    if(s.world.map.post_office)s.world.map.post_office.progress_rate=Math.min(0.999,(s.world.map.post_office.progress_rate||0)+0.035);
    if(s.world.map.unexplored_forest)s.world.map.unexplored_forest.progress_rate=Math.min(0.999,(s.world.map.unexplored_forest.progress_rate||0)+0.012);
  }
  grantItem(s,"pending_tag",1);
  s.routeEvents=s.routeEvents||[];
  var ev={
    id:"jr_"+Date.now(),
    emberId:c.id,
    title:c.title,
    routeName:"判決変換ルート",
    question:c.question,
    storagePlace:c.storagePlace,
    createdAt:nowISO(),
    lines:[
      "「何にもならない気がした」の残り火が届きました。",
      "これは判決ではなく、問いとして置かれました。",
      "残り火の名前が変わりました。",
      "『まだ意味にならない火』",
      "トイマンは、出発できる状態で待っています。"
    ]
  };
  s.routeEvents=[ev].concat(s.routeEvents).slice(0,8);
  s.recentRouteEvent=ev;
  s.logs=[{hours:0,events:[
    {text:"『まだ意味にならない火』が、はじまりの部屋に置かれた。",kind:"ember",pri:5},
    {text:"トイマンは出発を待っている。",kind:"discover",pri:4}
  ],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  s.lastSavedAt=nowISO();
  unlockPlacesFromCard(s,c,false);
  return{state:s,card:c,converted:true,event:ev};
}
function addNewEmberToState(game,card){
  if(isJudgmentConversionInput(card)){
    return applyJudgmentConversionRoute(game,card);
  }
  var acc=generateAcceptanceText(card);
  var unit=Object.assign({},card,{
    id:card.id||("ember_"+Date.now()+"_"+Math.floor(Math.random()*100000)),
    unitState:"waiting",
    status:"awaiting",
    progress:0,
    initialMetrics:normalizeMetrics(card.initialMetrics),
    currentQuestion:EMBER_UNIT_FLOW.waiting.question,
    questionPending:false,
    pendingQuestion:null,
    changeLog:[],
    answers:[],
    acceptanceText:acc.text,
    nextQuestion:acc.nextQuestion
  });
  var s=Object.assign({},game,{emberCards:[unit].concat(game.emberCards||[]),lastSavedAt:nowISO(),recentPlaceUnlocks:[]});
  unlockPlacesFromCard(s,unit,false);
  return{state:s,card:unit,converted:false,event:null};
}

const EMBER_UNIT_FLOW={
  waiting:{
    label:"出発待ち",place:"starting_room",who:"",next:"exploring",
    question:null,choices:[],
    log:"残り火は、トイマンの出発を待っている。",reward:"トイマンが未受領の森へ出発"
  },
  exploring:{
    label:"探索中",place:"unexplored_forest",who:"toyman",next:"resting",
    question:"誰に、何が届いてほしかった？",
    choices:["たった一人でいいから、ちゃんと読んでほしかった","「わかる」と言ってくれる誰かに届いてほしかった","数字ではなく、言葉で返ってきてほしかった","私が本気で書いたことを、なかったことにしないでほしかった","過去の自分に、ここまで書いたよと届けたかった","誰かの心に、少しでも残ってほしかった","届いてほしかった相手が、まだ分からない"],
    log:"トイマンが、この火の奥にある手がかりを探し始めた。",reward:"焦げた問い札 +1"
  },
  resting:{
    label:"休息中",place:"tears_spring",who:"kana",next:"reading",
    question:"この痛みは、まだ触れていい痛み？",
    choices:["少しなら触れていい","今日は休ませたい","まだ怖い","誰かが一緒なら見られる","まだ分からない"],
    log:"かなが、小さな灯りを弱めた。",reward:"静かな灯り +1"
  },
  reading:{
    label:"読解中",place:"record_tower",who:"kotae",next:"checking",
    question:"この残り火は、本当は何を分かってほしかった？",
    choices:["悔しかったこと","寂しかったこと","届いてほしかったこと","証明したかったこと","疲れていたこと","分からない"],
    log:"コタエが、判決ではなく証言として読み直した。",reward:"審査官のもとへ"
  },
  checking:{
    label:"検品中",place:"inspection_bureau",who:"auditor",next:"storing",
    question:"これは、誰かを傷つけるための言葉だった？",
    choices:["いいえ。自分を守るために書いた言葉だった","いいえ。起きたことを消さないための記録だった","いいえ。分かってほしかっただけだった","少しだけ、責める気持ちも混じっていた","傷つけたかったのではなく、痛かったことを伝えたかった","誰かを責めるより、自分が壊れないために必要だった","まだ分からない"],
    log:"審査官が、判決ではなく検品として確認した。",reward:"うつろのもとへ"
  },
  storing:{
    label:"保管中",place:"post_office",who:"utsuro",next:"completed",
    question:"これは、何にもならなかった。それでも、残していい？",
    choices:["残してほしい","正直まだ分からない","何にもならなくても、それでいい","まだ分からない"],
    log:"うつろが、何にもならなかったとしても、この火を消さずに封筒へ入れた。",reward:"受領準備完了"
  },
  completed:{
    label:"受領待ち",place:"starting_room",who:"utsuro",next:null,
    question:"今の自分は、この残り火をどう受け取る？",
    choices:[],
    log:"受け取れる形になった。",reward:"受領証へ"
  }
};
function getUnitFlow(card){return card&&card.unitState?EMBER_UNIT_FLOW[card.unitState]:null;}
function getEmberPlace(card){
  var flow=getUnitFlow(card);
  if(flow)return flow.place;
  var statusToPlace={awaiting:"post_office",unreceived:"unexplored_forest",checking:"record_tower",stored:"post_office",openable:"tears_spring",ready:"starting_room"};
  return statusToPlace[card&&card.status]||"post_office";
}
function getEmberUnitLabel(card){
  var flow=getUnitFlow(card);
  return flow?flow.label:(EMBER_STATUS[card&&card.status]&&EMBER_STATUS[card.status].label)||"待機中";
}
function normalizeEmberUnitCard(card){
  if(!card)return card;
  if(!card.id)card.id="ember_"+Date.now()+"_"+Math.floor(Math.random()*100000);
  card.initialMetrics=normalizeMetrics(card.initialMetrics);
  if(card.unitState){
    var f=getUnitFlow(card);
    if(f)card.currentQuestion=f.question;
    if(!card.answers)card.answers=[];
    if(!card.changeLog)card.changeLog=[];
    if(card.questionPending&&!card.pendingQuestion)setQuestionPending(card,"復元された問い札");
    return card;
  }
  var map={awaiting:"waiting",unreceived:"exploring",stored:"storing",checking:"reading",openable:"resting",ready:"completed"};
  var us=map[card.status]||"waiting";
  card.unitState=us;
  var flow=EMBER_UNIT_FLOW[us]||EMBER_UNIT_FLOW.waiting;
  card.currentQuestion=flow.question;
  if(!card.answers)card.answers=[];
  if(!card.changeLog)card.changeLog=[];
  if(card.questionPending&&!card.pendingQuestion)setQuestionPending(card,"復元された問い札");
  if(card.route==="judgment_conversion"&&!card.title)card.title="まだ意味にならない火";
  return card;
}

function getStageQuestion(card){
  var flow=getUnitFlow(card)||{};
  if(card&&card.unitState==="exploring")return getQuestionFragmentText(card);
  return flow.question||"この残り火は、次に何を必要としている？";
}
function setQuestionPending(card,reason){
  if(!card||!card.unitState||card.unitState==="completed")return null;
  if(card.questionPending&&card.pendingQuestion)return card.pendingQuestion;
  var q=getStageQuestion(card);
  var flow=getUnitFlow(card)||{};
  card.progress=100;
  card.questionPending=true;
  card.pendingQuestion={
    id:"pq_"+Date.now()+"_"+Math.floor(Math.random()*100000),
    state:card.unitState,
    label:flow.label||"問い",
    question:q,
    reason:reason||"進行100%",
    createdAt:nowISO()
  };
  card.currentQuestion=q;
  if(!card.changeLog)card.changeLog=[];
  card.changeLog.push((flow.label||"進行")+"：問い札が発生 / "+q);
  return card.pendingQuestion;
}
function clearQuestionPending(card){
  if(!card)return;
  card.questionPending=false;
  card.pendingQuestion=null;
}
function canAdvanceByQuestion(card){
  return !!(card&&card.unitState&&card.questionPending&&card.pendingQuestion);
}

function getEmbersAtPlace(game,place){
  return (game.emberCards||[]).filter(function(c){return getEmberPlace(c)===place;});
}
function getEmbersForCharacter(game,id){
  return (game.emberCards||[]).filter(function(c){
    var flow=getUnitFlow(c);
    return flow&&flow.who===id;
  });
}
function getActiveUnitAtPlace(game,place){
  return (game.emberCards||[]).find(function(c){return c.unitState&&getEmberPlace(c)===place&&c.unitState!=="completed";});
}
function addUnitProgressForPlace(s,place,amount){
  var card=getActiveUnitAtPlace(s,place);
  if(!card)return null;
  if(card.questionPending)return card;
  card.progress=Math.min(100,(card.progress||0)+amount);
  if(!card.changeLog)card.changeLog=[];
  if(card.progress>=100){
    advanceUnitStateByProgress(s,card,PNAME[place]+"の進行");
  }
  return card;
}
function getQuestionFragmentText(card){
  var raw=[card.originalJudgment,card.writeState,card.feeling,card.wanted,card.title].filter(Boolean).join(" / ");
  if(raw.indexOf("届")!==-1)return"誰に、何が届いてほしかった？";
  if(raw.indexOf("成果")!==-1||raw.indexOf("お金")!==-1)return"何を証明したかった？";
  if(raw.indexOf("何にもならない")!==-1||raw.indexOf("意味")!==-1)return"この火は、何になってほしかったと思いますか？";
  if(raw.indexOf("残")!==-1)return"何が残れば、終われた？";
  return"この火は、何になってほしかったと思いますか？";
}
function completeToymanExploration(s,card,reason){
  if(!card||card.unitState!=="exploring")return null;
  var q=getQuestionFragmentText(card);
  var oldTitle=makeEmberTitle(card);
  card.unitState="resting";
  card.status="openable";
  card.progress=0;
  card.currentQuestion=EMBER_UNIT_FLOW.resting.question;
  card.lastAdvancedDate=null;
  card.lastAdvancedDay=null;
  clearQuestionPending(card);
  card.questionTicket={
    item:"焦げた問い札",
    question:q,
    foundBy:"toyman",
    handedTo:"kana",
    foundAt:nowISO(),
    reason:reason||"探索完了"
  };
  if(!card.changeLog)card.changeLog=[];
  card.changeLog.push("探索中 → 休息中 / トイマンが焦げた問い札を持ち帰った");
  card.changeLog.push("問い札：「"+q+"」");
  grantItem(s,"unread_paper",1);
  if(s.characters&&s.characters.toyman){
    s.characters.toyman.location="starting_room";
    s.characters.toyman.lastAction="resting";
    s.characters.toyman.stats.fatigue=cn((s.characters.toyman.stats.fatigue||0)+20);
  }
  if(s.characters&&s.characters.kana){
    unlockPlace(s,"tears_spring",false);
    unlockChar(s,"kana",false);
    s.characters.kana.location="tears_spring";
    s.characters.kana.lastAction="comforting";
  }
  if(s.world&&s.world.map){
    if(s.world.map.unexplored_forest)s.world.map.unexplored_forest.progress_rate=Math.min(0.999,(s.world.map.unexplored_forest.progress_rate||0)+0.02);
    if(s.world.map.tears_spring)s.world.map.tears_spring.progress_rate=Math.min(0.999,(s.world.map.tears_spring.progress_rate||0)+0.035);
  }
  var ev={
    id:"ticket_"+Date.now(),
    title:"未受領の森 探索完了",
    emberId:card.id,
    question:q,
    item:"焦げた問い札",
    lines:[
      "トイマンが森の奥から戻ってきました。",
      "手には、小さく焦げた問い札があります。",
      "トイマン：「全部ではない」「でも、落ちていた」",
      "問い札：「"+q+"」",
      "かなが、その火のそばに寄った。",
      "「"+oldTitle+"」は、涙の泉で休息中になりました。"
    ],
    createdAt:nowISO()
  };
  s.recentQuestionTicket=ev;
  s.routeEvents=[ev].concat(s.routeEvents||[]).slice(0,8);
  s.logs=[{hours:0,events:[
    {text:"未受領の森の探索が完了しました。",kind:"discover",pri:5},
    {text:"トイマンが焦げた問い札を持ち帰りました。問い：「"+q+"」",kind:"ember",pri:5},
    {text:"かなが、その火のそばに寄った。",kind:"store",pri:4}
  ],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  /* MVP_MODE: 次のステージ（resting）に遷移した直後、すぐに問いを表示する */
  if(MVP_MODE&&card.unitState&&card.unitState!=="completed"){
    setQuestionPending(card,"MVP即時進行");
  }
  return ev;
}

function advanceUnitStateAfterQuestion(s,card,reason){
  if(!card||!card.unitState)return null;
  clearQuestionPending(card);
  if(card.unitState==="exploring"){
    return completeToymanExploration(s,card,reason);
  }
  var flow=getUnitFlow(card);
  if(!flow||!flow.next)return null;
  var oldLabel=flow.label;
  card.unitState=flow.next;
  card.status=({waiting:"awaiting",exploring:"unreceived",resting:"openable",reading:"checking",checking:"inspecting",storing:"stored",completed:"ready"})[card.unitState]||card.status;
  card.currentQuestion=(EMBER_UNIT_FLOW[card.unitState]||{}).question||"";
  card.progress=0;
  card.lastAdvancedDate=null;
  card.lastAdvancedDay=null;
  if(!card.changeLog)card.changeLog=[];
  card.changeLog.push(oldLabel+" → "+(EMBER_UNIT_FLOW[card.unitState]&&EMBER_UNIT_FLOW[card.unitState].label||"次の状態")+" / "+(reason||"進捗100%"));
  var place=getEmberPlace(card);
  var f2=getUnitFlow(card)||{};
  /* この残り火が新しい段階に入ったことで、担当の場所とキャラがここで初めて現れる */
  unlockPlace(s,place,false);
  if(f2.who&&s.characters&&s.characters[f2.who]){
    unlockChar(s,f2.who,false);
    s.characters[f2.who].location=place;
    s.characters[f2.who].lastAction=f2.who==="toyman"?"exploring":f2.who==="kotae"?"recording":f2.who==="utsuro"?"organizing":f2.who==="auditor"?"normal":"comforting";
  }
  if(card.unitState==="checking"&&s.characters&&s.characters.auditor&&s.characters.auditor.stats){
    s.characters.auditor.stats.pressure=cn((s.characters.auditor.stats.pressure||0)+2);
    grantItem(s,"pending_tag",1);
  }
  if(card.unitState==="storing"&&s.characters&&s.characters.auditor&&s.characters.auditor.stats){
    s.characters.auditor.stats.pressure=cn((s.characters.auditor.stats.pressure||0)-3);
  }
  if(card.unitState==="completed"){
    card.status="ready";
    grantItem(s,"small_light",1);
  }
  if(s.world&&s.world.map&&s.world.map[place])s.world.map[place].progress_rate=Math.min(0.999,(s.world.map[place].progress_rate||0)+0.02);
  /* 各ステージは progress=0 から開始。問いは100%到達で自然発生する */
  return card;
}

function advanceUnitStateByProgress(s,card,reason){
  if(!card||!card.unitState)return null;
  if(card.unitState==="completed")return null;
  return setQuestionPending(card,reason||"進行100%");
}

function addUnitProgressForCharacter(s,id,amount){
  var card=(s.emberCards||[]).find(function(c){var f=getUnitFlow(c);return f&&f.who===id&&c.unitState!=="completed";});
  if(!card)return null;
  if(card.questionPending)return card;
  card.progress=Math.min(100,(card.progress||0)+amount);
  if(!card.changeLog)card.changeLog=[];
  if(card.progress>=100){
    advanceUnitStateByProgress(s,card,NAMES[id]+"の担当進行");
  }
  return card;
}
function advanceEmberUnit(game,emberId,choice,isCustom){
  var s=cloneS(game);
  var card=(s.emberCards||[]).find(function(c){return c.id===emberId;});
  if(!card||!card.unitState)return{ok:false,state:game,msg:"この残り火には進行中の問いがありません。",sub:""};
  var flow=getUnitFlow(card);
  if(!flow||!flow.next)return{ok:false,state:game,msg:"この残り火は受領待ちです。",sub:"はじまりの部屋で受け取れます。"};
  if(!canAdvanceByQuestion(card)){
    return{ok:false,state:game,msg:"まだ問い札は出ていません。",sub:"ゲージが100%になると、次へ進むための問いが発生します。"};
  }
  var today="day_"+(s.world&&s.world.day||1);
  if(!MVP_MODE&&card.lastAdvancedDay===today&&card.unitState!=="waiting"){
    return{ok:false,state:game,msg:"今日はこの残り火をこれ以上進めません。",sub:"時間を進めると、また触れます。"};
  }
  if(!card.answers)card.answers=[];
  if(!card.changeLog)card.changeLog=[];
  var q=(card.pendingQuestion&&card.pendingQuestion.question)||flow.question;
  var ans=choice||"空欄で受け取る";
  card.answers.push({state:card.unitState,question:q,answer:ans,at:nowISO(),custom:!!isCustom});
  if(isCustom&&choice&&choice.trim()){
    /* 自分の言葉で答えると、この残り火に魂が入る */
    card.soul=true;
    /* 問いの一本化：自分の言葉での回答は、ひとつの流れに集約する。
       哲学的問いの深化（getQuestionProgress）と、全残り火の汲み取り加速に効く。 */
    s.questionAnswers=[{q:q,a:choice.trim(),at:nowISO(),from:"ember"}].concat(s.questionAnswers||[]).slice(0,30);
  }
  if(card.unitState==="exploring"){
    completeToymanExploration(s,card,"問い札を受け取った："+ans);
    s.lastSavedAt=nowISO();
    return{ok:true,state:s,msg:"トイマンが問い札を持ち帰りました",sub:"焦げた問い札をうつろへ渡しました。保管中へ移動します。",soulGained:!!(isCustom&&choice&&choice.trim())};
  }
  var oldLabel=flow.label;
  var oldTitle=makeEmberTitle(card);
  advanceUnitStateAfterQuestion(s,card,"問い札を受け取った："+ans);
  var f2=getUnitFlow(card)||{};
  card.lastAdvancedDay=today;card.lastAdvancedDate=nowISO();
  s.logs=[{hours:0,events:[
    {text:"問い札を受け取りました。問い：「"+q+"」 / 選択："+ans,kind:"ember",pri:5},
    {text:"「"+oldTitle+"」が "+(f2.label||"次の状態")+" へ進みました。",kind:"ember",pri:5},
    {text:(f2.log||oldLabel+"の処理を終えました。"),kind:"ember",pri:4}
  ],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  s.lastSavedAt=nowISO();
  return{ok:true,state:s,msg:"問い札を受け取りました",sub:(f2.label||"次の状態")+" / "+(f2.reward||""),soulGained:!!(isCustom&&choice&&choice.trim())};
}

function runCareGoalAction(game,who){
  var s=cloneS(game);
  if(!s.ip)s.ip={cur:0,max:20,lastCalc:nowISO()};
  if((s.ip.cur||0)<1)return{newState:game,lines:["干渉ポイントが足りません。"],effects:[],ipUsed:0,blocked:true};
  var target=who&&s.characters[who]?who:"toyman";
  var before=s.characters[target].stats.fatigue||0;
  s.ip.cur=Math.max(0,(s.ip.cur||0)-1);
  s.characters[target].stats.fatigue=Math.max(0,before-14);
  s.characters[target].stats.stability=cn((s.characters[target].stats.stability||0)+3);
  s.characters.kana.lastAction="comforting";
  s.characters.kana.location=s.characters[target].location||"tears_spring";
  s.characters.kana.stats.empathy=cn((s.characters.kana.stats.empathy||0)+1);
  if(s.world&&s.world.map&&s.world.map.tears_spring)s.world.map.tears_spring.progress_rate=Math.min(0.999,(s.world.map.tears_spring.progress_rate||0)+0.018);
  s.logs=[{hours:0,events:[{text:"かなが"+NAMES[target]+"のそばに行った。疲労 "+Math.round(before)+" → "+Math.round(s.characters[target].stats.fatigue)+" / IP -1",kind:"care",pri:4}],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  return{newState:s,lines:["かなが"+NAMES[target]+"のそばに行った。","疲労 "+Math.round(before)+" → "+Math.round(s.characters[target].stats.fatigue)],effects:[NAMES[target]+" 疲労 -"+Math.round(before-s.characters[target].stats.fatigue),"安定 +3","IP -1"],ipUsed:1};
}

function runGoalAction(game,action){if(!action)return{newState:game,lines:["目標に対応する行動がありません。"],effects:[],ipUsed:0};if(action.target==="receive"&&action.emberId){var ns=receiveEmberCard(game,action.emberId);return{newState:ns,lines:["自分宛ての封筒を受領しました。"],effects:["受領証 +1","干渉ポイント +3"],ipUsed:0};}if(action.target==="care")return runCareGoalAction(game,action.who||"toyman");return doTieredIntervene(game,action.tier||3,action.target||"auto");}

const METRIC_KEYS=["satisfaction","meaning","value"];
const METRIC_LABELS={satisfaction:"書いた納得",meaning:"書いた意味",value:"書いた価値"};
function pctNum(v,def){
  var n=Number(v);
  if(!Number.isFinite(n))n=def===undefined?50:def;
  return Math.max(0,Math.min(100,Math.round(n)));
}
function defaultInitialMetrics(){return{satisfaction:50,meaning:50,value:50};}
function normalizeMetrics(m,def){
  def=def||defaultInitialMetrics();
  return{
    satisfaction:pctNum(m&&m.satisfaction,def.satisfaction),
    meaning:pctNum(m&&m.meaning,def.meaning),
    value:pctNum(m&&m.value,def.value)
  };
}
function calcReceiptGrowth(initial,current){
  initial=normalizeMetrics(initial);
  current=normalizeMetrics(current,initial);
  var deltas={};
  var positive=0,net=0;
  METRIC_KEYS.forEach(function(k){
    var d=(current[k]||0)-(initial[k]||0);
    deltas[k]=d;
    if(d>0)positive+=d;
    net+=d;
  });
  return{initial:initial,current:current,deltas:deltas,positiveGrowthTotal:positive,netGrowthTotal:net,canGraduate:positive>=30};
}
function fmtDelta(v){return (v>=0?"+":"") + Math.round(v) + "%";}

function makeEmberTitle(card){if(card.title)return card.title;if(card&&card.route==="judgment_conversion")return "まだ意味にならない火";var f=card.feeling||"",w=card.wanted||"";return f?f+"のまま残ったもの":w?"まだ"+w+"言葉":"書いたあとに残ったもの";}
function getEmberSpeed(status,s){var base=8+rnd()*17;if(status==="unreceived")return base*(0.5+s.characters.toyman.stats.exploration/150);if(status==="stored")return base*(0.5+s.characters.utsuro.stats.storage/150);if(status==="openable")return base*(0.5+s.characters.kana.stats.empathy/150);if(status==="checking")return base*(0.5+s.characters.kotae.stats.record/150)*(s.characters.auditor.stats.pressure<=50?1.2:0.8);return base;}
function getEmberTransMsg(card,next){var t=makeEmberTitle(card);if(next==="stored")return "「"+t+"」がうつろの封筒に入った。";if(next==="openable")return "「"+t+"」の痛みが、かなの泉で少し休んだ。";if(next==="checking")return "コタエが「"+t+"」を読み始めた。";if(next==="ready")return "「"+t+"」が自分宛ての封筒になった。はじまりの部屋で受け取れます。";return "";}
/* 放置中の残り火の自然進行。
   v5.40以降はすべてのカードが unitState を持つ（normalizeEmberUnitCard が保証）。
   旧 status だけのカードは互換のため fallback で進める。 */
const UNIT_AUTO_SPEED={
  /* 1アクションサイクル(=4時間相当)あたりの基礎進行%。担当キャラの能力で補正される。 */
  waiting:0,        /* 出発前の問い。自動では進めない */
  exploring:14,     /* トイマンの探索 */
  resting:18,       /* かなの休息 */
  reading:13,       /* コタエの読解 */
  checking:12,      /* 審査官の検品 */
  storing:16,       /* うつろの保管 */
  completed:0       /* 受領待ち。受け取るのはプレイヤー */
};
const UNIT_STAT_KEY={exploring:"exploration",resting:"empathy",reading:"record",storing:"storage"};
function getUnitAutoSpeed(s,card){
  if(card&&card.questionPending)return 0;
  var us=card&&card.unitState;
  var base=UNIT_AUTO_SPEED[us]||0;
  if(base<=0)return 0;
  var flow=getUnitFlow(card);
  var who=flow&&flow.who;
  var statKey=UNIT_STAT_KEY[us];
  var mult=1;
  if(who&&s.characters[who]&&statKey&&s.characters[who].stats[statKey]!==undefined){
    mult=0.6+s.characters[who].stats[statKey]/150;
  }
  /* 読解中は審査官の圧力が高いと滞る（テーマ：圧が強いと受け取れない） */
  if(us==="reading"&&s.characters.auditor){
    mult*=s.characters.auditor.stats.pressure<=50?1.15:0.8;
  }
  /* 検品中：審査官自身の圧力が低いほど、落ち着いて検品が進む */
  if(us==="checking"&&s.characters.auditor){
    mult*=s.characters.auditor.stats.pressure<=40?1.2:s.characters.auditor.stats.pressure>=70?0.6:1;
  }
  /* 担当キャラが疲労困憊なら進みが鈍る */
  if(who&&who!=="auditor"&&s.characters[who]&&s.characters[who].stats.fatigue>=90)mult*=0.5;
  return base*mult*(0.85+rnd()*0.4);
}
function processEmbers(s,events){
  if(s.emberCards)s.emberCards=s.emberCards.map(function(c){return normalizeEmberUnitCard(c);});
  var cards=(s.emberCards||[]).slice();
  /* ── 新システム：unitState を持つカードを担当キャラの進行で進める ── */
  cards.filter(function(c){return c.unitState;}).forEach(function(card){
    var spd=getUnitAutoSpeed(s,card);
    if(spd<=0)return;
    var before=card.progress||0;
    card.progress=Math.min(100,before+spd);
    if(card.progress>=100){
      var oldTitle=makeEmberTitle(card);
      var oldState=card.unitState;
      var pq=advanceUnitStateByProgress(s,card,"放置中の自然進行");
      if(pq){
        events.push({text:"「"+oldTitle+"」に問い札が発生しました。問い：「"+pq.question+"」",kind:"ember",pri:5});
      }
    }
  });
  /* ── 互換：unitState を持たない旧カード（通常は存在しないはず） ── */
  var legacy=cards.filter(function(c){return !c.unitState;});
  ["unreceived","stored","openable","checking"].forEach(function(status){
    var inSt=legacy.filter(function(c){return c.status===status;});
    if(!inSt.length)return;
    var card=inSt[0];
    card.progress=Math.min(100,(card.progress||0)+getEmberSpeed(status,s));
    if(card.progress>=100){card.progress=0;var nx=EMBER_NEXT[status];if(nx){card.status=nx;events.push({text:getEmberTransMsg(card,nx),kind:"ember",pri:5});}}
  });
}
function receiveEmberCard(game,emberId,receiptInput){
  var s=cloneS(game);
  var card=(s.emberCards||[]).find(function(c){return c.id===emberId;});
  if(!card||!(card.status==="ready"||card.unitState==="completed"))return s;
  clearQuestionPending(card);
  card.status="ready";
  card.unitState="completed";
  var initialMetrics=normalizeMetrics(card.initialMetrics);
  var currentMetrics=normalizeMetrics(receiptInput&&receiptInput.currentMetrics,initialMetrics);
  var growth=calcReceiptGrowth(initialMetrics,currentMetrics);
  var receivedFeeling=(receiptInput&&receiptInput.receivedFeeling!==undefined)?String(receiptInput.receivedFeeling):"十分によくやったよ。読まれなかったけど、よくやったよ";
  var receiptMemo=(receiptInput&&receiptInput.receiptMemo!==undefined)?String(receiptInput.receiptMemo):"よくやった";
  var accForReceipt=generateAcceptanceText(card);
  var receipt={
    id:"r"+Date.now(),emberId:emberId,title:makeEmberTitle(card),
    feeling:card.feeling,wanted:card.wanted,writeState:card.writeState,memo:card.memo,bodyText:card.bodyText,reaction:card.reaction,soul:card.soul,
    questionTicket:card.questionTicket,depositedAt:card.createdAt||null,receivedAt:nowISO(),text:generateReceiptText(card),
    shadowAnswers:card.shadowAnswers||[],
    acceptanceText:card.acceptanceText||accForReceipt.text,
    holdText:(ACCEPTANCE_TEXTS[card.writeState]||{}).holdText||null,
    nextQuestion:card.nextQuestion||accForReceipt.nextQuestion,
    initialMetrics:growth.initial,currentMetrics:growth.current,metricDeltas:growth.deltas,
    positiveGrowthTotal:growth.positiveGrowthTotal,netGrowthTotal:growth.netGrowthTotal,canGraduate:growth.canGraduate,
    receivedFeeling:receivedFeeling.trim(),receiptMemo:receiptMemo.trim(),receiptStatus:growth.canGraduate?"graduated":"provisional",changeNote:(receiptInput&&receiptInput.changeNote)||""
  };
  if(!s.receipts)s.receipts=[];
  s.receipts=[receipt].concat(s.receipts);
  s.emberCards=(s.emberCards||[]).filter(function(c){return c.id!==emberId;});
  s.ip.cur=Math.min(s.ip.max,(s.ip.cur||0)+(growth.canGraduate?3:1));
  grantItem(s,"red_stamp_mark",1);
  var rw=[{type:"receipt",title:receipt.title},{type:"item",name:ITEM_NAMES.red_stamp_mark,count:1},{type:"ip",amount:growth.canGraduate?3:1}];
  checkAndGrantAchievements(s,rw);
  checkUnlocks(s);
  s.recentRewards=rw;
  s.logs=[{hours:0,events:[
    {text:(growth.canGraduate?"受領証":"仮受領証")+"を作成しました。プラス変化合計 "+growth.positiveGrowthTotal+"%。",kind:"ember",pri:5},
    {text:growth.canGraduate?"この残り火は卒業可能になりました。":"この残り火は、まだ受け取りきれていません。",kind:"record",pri:4}
  ],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  return s;
}
/* 受領証を燃やす（＝心へ返す）。卒業した受領証だけ燃やせる。
   消すのではなく、自分の中へ戻す行為。全部返しきるとエンディングへ。 */
function burnReceipt(game,receiptId){
  var s=cloneS(game);
  var receipt=(s.receipts||[]).find(function(r){return r.id===receiptId;});
  if(!receipt)return{ok:false,state:game,msg:"その受領証は見つかりません。"};
  if(receipt.receiptStatus!=="graduated")return{ok:false,state:game,msg:"この受領証は、まだ心へ返せません。卒業（プラス変化30%以上）が必要です。"};
  s.receipts=(s.receipts||[]).filter(function(r){return r.id!==receiptId;});
  if(!s.returnedToHeart)s.returnedToHeart=[];
  s.returnedToHeart=[{id:receipt.id,title:receipt.title,wanted:receipt.wanted,feeling:receipt.feeling,returnedAt:nowISO()}].concat(s.returnedToHeart);
  s.logs=[{hours:0,events:[
    {text:"受領証「"+receipt.title+"」を、心へ返した。",kind:"ember",pri:5},
    {text:"消したのではない。自分の中へ戻したのだ。",kind:"record",pri:4}
  ],ts:nowISO()}].concat(s.logs||[]).slice(0,30);
  /* エンディング判定：残り火がもう無く、卒業受領証も全部返しきり、1つ以上は返した */
  var hasEmber=(s.emberCards||[]).length>0;
  var hasGraduatedLeft=(s.receipts||[]).some(function(r){return r.receiptStatus==="graduated";});
  var returnedCount=(s.returnedToHeart||[]).length;
  if(!hasEmber&&!hasGraduatedLeft&&returnedCount>=1){
    s.endingReady=true;
  }
  return{ok:true,state:s,msg:"「"+receipt.title+"」を心へ返した。",isEnding:!!s.endingReady};
}
function generateReceiptText(card){var lines=[];if(card&&card.route==="judgment_conversion"){lines.push("── 判決変換ルート ──","","最初、それは判決のように届いた。","「何にもならない気がした」","","審査官は成果なしの札を出そうとした。","けれど、コタエがその札を伏せた。","","これは失敗ではなく、まだ答えになっていない問いです。","","問い：","これは、何になってほしかったのか？","","受領名：","何になってほしかったのかを探す火","","判決としてではなく、問いとして受け取る。");return lines.join("\n");}var lines=[];if(card.writeState)lines.push("── "+card.writeState+" ──","");if(card.feeling)lines.push("「"+card.feeling+"」のまま残っていた。");if(card.wanted)lines.push(card.wanted==="まだ分からない"?"本当は、何を求めていたのか、まだ分からない。":"本当は、"+card.wanted+"。");if(card.questionTicket)lines.push("","持ち帰られた問い：","「"+card.questionTicket.question+"」");lines.push("","空っぽになったのは、","そこに何もなかったからではない。","","そこに火があったからだ。","","私は、これを感じていた。","私は、これを書いた。","私は、ここで終われなかった。","","だからこれは、失敗ではなく、","私が確かに燃えていた証として受け取る。");return lines.join("\n");}


function shortText(t,n){t=String(t||"");n=n||64;return t.length>n?t.slice(0,n)+"……":t;}
function DeliveredWordsBox(p){
  var card=p.card||{};
  var compact=!!p.compact;
  var rows=[];
  if(card.writeState)rows.push(["状態",card.writeState]);
  if(card.feeling)rows.push(["感情",card.feeling]);
  if(card.wanted)rows.push(["本当は",card.wanted]);
  if(card.memo&&!compact)rows.push(["メモ",card.memo]);
  if(card.reaction&&!compact)rows.push(["反応",card.reaction]);
  var body=card.bodyText||"";
  if(!rows.length&&!body)return null;
  return <div className={"delivered-box"+(compact?" delivered-compact":"")}>
    <div className="delivered-k">届いているもの</div>
    {rows.map(function(r,i){return <div key={i} className="delivered-row"><b>{r[0]}</b><span>{r[1]}</span></div>;})}
    {body&&<div className="delivered-body"><b>あなたの言葉</b><p>{compact?shortText(body,58):body}</p></div>}
  </div>;
}
function ReceiptMetricBox(p){
  var r=p.receipt||{};
  if(!r.initialMetrics||!r.currentMetrics)return null;
  var growth=calcReceiptGrowth(r.initialMetrics,r.currentMetrics);
  var remaining=METRIC_KEYS.filter(function(k){return growth.deltas[k]<0;});
  return <div className="receipt-metric-box">
    <div className="rm-title">最初の残り火 <span>→</span> 受け取りの現在地</div>
    <div className="rm-list">
      {METRIC_KEYS.map(function(k){var d=growth.deltas[k];return <div key={k} className="rm-row">
        <b>{METRIC_LABELS[k]}</b>
        <span className="rm-flow">{growth.initial[k]}% <i>→</i> {growth.current[k]}%</span>
        <em className={d>=0?"rm-plus":"rm-minus"}>（{fmtDelta(d)}）</em>
      </div>;})}
    </div>
    <div className="rm-total">
      <span>プラス変化合計：<b>{growth.positiveGrowthTotal}%</b></span>
      <span>総変化：<b>{fmtDelta(growth.netGrowthTotal)}</b></span>
    </div>
    <div className={growth.canGraduate?"rm-judge rm-ok":"rm-judge rm-wait"}>
      {growth.canGraduate?"卒業可能 — この残り火は、最初より少しあなたの中に戻ってきました。":"まだ卒業ではありません。でも、この残り火は受け取られています。"}
    </div>
    {remaining.length>0&&<div className="rm-remaining">まだ揺れているもの：{remaining.map(function(k){return METRIC_LABELS[k]+" "+fmtDelta(growth.deltas[k]);}).join(" / ")}</div>}
    {(r.receivedFeeling||r.receiptMemo)&&<div className="rm-message">
      {r.receivedFeeling&&<div><b>受領した今の気持ち：</b><p>{r.receivedFeeling}</p></div>}
      {r.receiptMemo&&<div><b>受領メモ：</b><p>{r.receiptMemo}</p></div>}
    </div>}
  </div>;
}

function ReceiptWordsBox(p){
  var r=p.receipt||{};
  var has=!!(r.writeState||r.feeling||r.wanted||r.bodyText||r.memo||r.questionTicket);
  if(!has)return null;
  return <div className="receipt-words-box">
    <div className="receipt-words-k">受け取った残り火</div>
    {r.writeState&&<div><b>状態</b><span>{r.writeState}</span></div>}
    {r.feeling&&<div><b>感情</b><span>{r.feeling}</span></div>}
    {r.wanted&&<div><b>本当は</b><span>{r.wanted}</span></div>}
    {r.questionTicket&&<div className="receipt-question"><b>持ち帰られた問い</b><span>「{r.questionTicket.question}」</span></div>}
    {r.bodyText&&<div className="receipt-body"><b>あなたの言葉</b><span>{r.bodyText}</span></div>}
  </div>;
}

function getSceneVal(id,game){
  if(id==="toyman") return Math.min(99,Math.round(game.world.map.unexplored_forest.progress_rate*100));
  if(id==="kana")   return Math.min(99,Math.round(game.world.map.tears_spring.progress_rate*100));
  if(id==="utsuro") return Math.min(99,Math.round(game.world.map.post_office.progress_rate*100));
  if(id==="kotae")  return Math.min(99,Math.round(game.world.map.record_tower.progress_rate*100));
  if(id==="auditor")return Math.round(game.characters.auditor.stats.pressure);
  return 0;
}
function getAllDeltas(game){
  return PKEYS.map(function(k){
    return{
      key:k,name:PSHORT[k],label:PLBL[k],
      pct:Math.round((game.world.map[k].progress_rate||0)*100),
      level:game.world.map[k].level||1,
      dp:getPlaceDelta(game,k,"prev"),
      d1:getPlaceDelta(game,k,"1h"),
      d24:getPlaceDelta(game,k,"24h"),
    };
  });
}
function applyLU(g,u){if(!u)return g;var s=cloneS(g);if(u.type==="tex_ember"){var ec=(s.emberCards||[]).find(function(c){return c.id===u.emberId;});if(ec&&ec.status==="unreceived"&&!ec.questionPending){ec.progress=Math.min(100,(ec.progress||0)+u.gain*100);if(ec.unitState){if(ec.progress>=100)advanceUnitStateByProgress(s,ec,"トイマンの自動探索");}else if(ec.progress>=100){ec.progress=0;ec.status="stored";}}s.characters.toyman.stats.fatigue=cn(s.characters.toyman.stats.fatigue+u.fatD);s.characters.toyman.stats.exploration=cn(u.expl);}if(u.type==="tex"){s.world.map.unexplored_forest.progress_rate=Math.min(1,s.world.map.unexplored_forest.progress_rate+u.pD);addUnitProgressForPlace(s,"unexplored_forest",Math.max(4,Math.round((u.pD||0.02)*100)));s.characters.toyman.stats.fatigue=cn(s.characters.toyman.stats.fatigue+u.fatD);s.characters.toyman.stats.exploration=cn(u.expl);}if(u.type==="kh"){s.characters[u.target].stats.fatigue=Math.max(0,s.characters[u.target].stats.fatigue-u.amount);s.characters[u.target].stats.stability=Math.min(100,s.characters[u.target].stats.stability+1);s.world.map.tears_spring.progress_rate+=0.005;addUnitProgressForCharacter(s,"kana",5);}if(u.type==="us"){s.characters.utsuro.stats.storage=Math.min(100,s.characters.utsuro.stats.storage+0.5);s.world.letters.stored+=u.n;s.world.map.post_office.progress_rate+=0.005;addUnitProgressForCharacter(s,"utsuro",5);}if(u.type==="kr"){s.characters.kotae.stats.record=Math.min(100,s.characters.kotae.stats.record+0.5);s.world.map.record_tower.progress_rate+=0.005;addUnitProgressForCharacter(s,"kotae",5);}enforceToymanAutoTravel(s);return s;}
function runOneActionMult(s,tid,mult){
  var lines=[],effects=[],m=mult||1;
  if(tid==="toyman_explore"){
    var enemy=pick(EX.enemies),win=rnd()<Math.min(0.85,0.62+m*0.07);
    var outcome=win?pick(EX.winOut):pick(EX.loseOut),item=win&&rnd()<0.6?pick(EX.loot):null;
    var pD=Math.max(1,Math.round((win?2+Math.floor(rnd()*4):1)*m));
    var fatD=Math.round((4+Math.floor(rnd()*5))*Math.min(m,1.6));
    s.world.map.unexplored_forest.progress_rate+=pD/100;s.characters.toyman.stats.fatigue=cn(s.characters.toyman.stats.fatigue+fatD);
    var hint=null;
    var ue=(s.emberCards||[]).find(function(c){return c.status==="unreceived"||c.unitState==="exploring";});
    if(ue){
      var gain=Math.round((18+Math.floor(rnd()*8))*m);
      if(!ue.questionPending)ue.progress=Math.min(100,(ue.progress||0)+gain);
      if(ue.unitState){
        if(!ue.changeLog)ue.changeLog=[];
        if(ue.questionPending){lines.push("「"+makeEmberTitle(ue)+"」には問い札が出ている。");effects.push("問い札あり");}
        else {lines.push("「"+makeEmberTitle(ue)+"」の探索が "+gain+"% 進んだ。");effects.push("問い炎 探索 +"+gain+"%");}
        if(ue.progress>=100&&!ue.questionPending){
          var pq=advanceUnitStateByProgress(s,ue,"探索の手がかりが揃った");
          lines.push("探索の奥で問い札が浮かび上がった。残り火タブで受け取れます。");
          if(pq)lines.push("問い：「"+pq.question+"」");
          effects.push("問い札あり");
        }
      }else if(ue.progress>=100){
        ue.progress=0;ue.status="stored";lines.push("「"+makeEmberTitle(ue)+"」がうつろの封筒に入った。");effects.push("封筒保管 ✓");
      }
    }
    lines=["「"+enemy+"」と遭遇 → "+outcome+"。",item?"「"+item+"」を手に入れた。":null,hint?"「"+hint.name+"」のヒントを持ち帰った。":null,"探索 +"+pD+"%　疲労 +"+fatD].filter(Boolean).concat(lines);
    effects=["探索 +"+pD+"%",hint?"ヒント1個":""].concat(effects);
  }
  if(tid==="kana_care"){var tgts=CHAR_IDS.filter(function(id){return id!=="kana"&&s.characters[id].stats.fatigue>=25;});var progCard=addUnitProgressForCharacter(s,"kana",Math.round((14+Math.floor(rnd()*7))*m));if(tgts.length){var tg=pick(tgts),hl=Math.round((6+Math.floor(rnd()*5))*m);s.characters[tg].stats.fatigue=Math.max(0,s.characters[tg].stats.fatigue-hl);s.world.map.tears_spring.progress_rate+=0.012*m;lines=[NAMES[tg]+"の疲れが "+hl+" ほどけた。"];effects=[NAMES[tg]+" 疲労 -"+hl];}else{lines=["かなが問い炎の火を弱めた。"];effects=["休息進行"]; }if(progCard){lines.push("問い炎の休息が進んだ。");effects.push("問い炎 休息 "+Math.round(progCard.progress||0)+"%");}}
  if(tid==="utsuro_store"){var n=Math.round((2+Math.floor(rnd()*4))*m);s.world.letters.stored+=n;s.characters.utsuro.stats.storage=Math.min(100,s.characters.utsuro.stats.storage+m*1.5);s.world.map.post_office.progress_rate+=0.018*m;var progCard=addUnitProgressForCharacter(s,"utsuro",Math.round((16+Math.floor(rnd()*8))*m));lines=["封筒を "+n+" 通整理した。","保管率が上がった。"];effects=["封筒 +"+n,"保管率 +"+Math.round(m*2)+"%"];if(progCard){lines.push("問い炎の保管が進んだ。");effects.push("問い炎 保管 "+Math.round(progCard.progress||0)+"%");}}
  if(tid==="kotae_analyze"){var chCard=(s.emberCards||[]).find(function(c){return c.status==="checking"||c.unitState==="reading";});if(chCard){var gain=Math.round((16+Math.floor(rnd()*8))*m);if(!chCard.questionPending)chCard.progress=Math.min(100,(chCard.progress||0)+gain);s.world.map.record_tower.progress_rate+=0.018*m;lines=["コタエが「"+makeEmberTitle(chCard)+"」を読んだ。","読解 +"+gain+"%"];effects=["読解 +"+gain+"%"];if(chCard.unitState){if(chCard.questionPending){lines.push("問い札が出ている。残り火タブで受け取れます。");effects.push("問い札あり");}else if(chCard.progress>=100){advanceUnitStateByProgress(s,chCard,"コタエの読解完了");lines.push("「"+makeEmberTitle(chCard)+"」に受領前の問い札が出た。");effects.push("問い札あり");}}else if(chCard.progress>=100){chCard.progress=0;chCard.status="ready";lines.push("「"+makeEmberTitle(chCard)+"」が受領待ちになった。");effects.push("受領準備完了");}}else{lines=["今は読解中の封筒がない。","先に残り火を記録塔まで進めよう。"];effects=["読解待ちなし"];}}
  if(tid==="bond_support"){var br=applyBondSupport(s,m);s.world.map.starting_room.progress_rate+=0.01*m;lines=[br.line,"場面帳の解放に近づいた。"];effects=[br.effect,"場面に近づいた"];}
  enforceToymanAutoTravel(s);
  return{lines:lines,effects:effects};
}
function doTieredIntervene(game,tierCost,targetId){
  var tier=IP_TIERS.find(function(t){return t.cost===tierCost;})||IP_TIERS[0];
  if(game.ip.cur<tier.cost)return{newState:game,lines:["ポイントが足りない。"],effects:[],ipUsed:0};
  var s=cloneS(game);s.ip.cur-=tier.cost;var mult=tier.mult,reps=tier.cost;var tids=[];
  if(targetId==="auto"){var w={toyman_explore:0.30,kana_care:0.20,utsuro_store:0.18,kotae_analyze:0.17,bond_support:0.15};var wk=Object.keys(w);for(var i=0;i<reps;i++){var r2=rnd(),cum=0,chosen=wk[wk.length-1];for(var j=0;j<wk.length;j++){cum+=w[wk[j]];if(r2<cum){chosen=wk[j];break;}}tids.push(chosen);}}
  else{var actMap={toyman:"toyman_explore",kana:"kana_care",utsuro:"utsuro_store",kotae:"kotae_analyze",bond:"bond_support"};var tid=actMap[targetId]||"toyman_explore";for(var i=0;i<reps;i++)tids.push(tid);}
  var allLines=[tier.cost+"P 使用（×"+tier.mult+" ブースト）",""],allEffects=[],byChar={};
  tids.forEach(function(tid){var r=runOneActionMult(s,tid,mult);var cid=tid.split("_")[0];if(!byChar[cid])byChar[cid]={times:0,lines:[]};byChar[cid].times++;byChar[cid].lines=byChar[cid].lines.concat(r.lines.slice(0,2));r.effects.forEach(function(e){if(e&&allEffects.indexOf(e)===-1)allEffects.push(e);});});
  Object.keys(byChar).forEach(function(cid){var info=byChar[cid];allLines.push("▸ "+(NAMES[cid]||"連携")+" × "+info.times+"回");info.lines.slice(0,3).forEach(function(l){allLines.push("  "+l);});});
  enforceToymanAutoTravel(s);
  return{newState:s,lines:allLines,effects:allEffects,ipUsed:tier.cost};
}
function enrichGoal(g,game){
  if(g.type==="ember_progress"||g.type==="hint"||g.type==="explore"||g.type==="analyze"){
    var card=findCardById(game,g.emberId)||getActiveEmber(game);
    if(card){var st=EMBER_STATUS[card.status]||{},act=getEmberActionForStatus(card.status),need=getEmberNeed(card);return Object.assign({},g,{label:"「"+makeEmberTitle(card)+"」を進める",what:(st.label||"処理中")+"。あと"+need+"%で「"+getEmberNextLabel(card.status)+"」",rec:act.label+"（3P）",reward:"残り火が次の場所へ進む",risk:card.status==="unreceived"?"トイマンの疲労が少し増える":"大きなリスクなし",next:getEmberNextLabel(card.status),action:{screen:"quick",target:act.target,tier:act.tier,label:act.label}});}
  }
  if(g.type==="receive")return Object.assign({},g,{what:"はじまりの部屋で封筒を受け取れます",rec:"受領する",reward:"受領前に現在地を入力",risk:"なし",action:{screen:"ember",target:"receive",emberId:g.emberId,tier:0,label:"残り火タブで受け取る"}});
  if(g.type==="care")return Object.assign({},g,{label:NAMES[g.who||"toyman"]+"の疲労を回復する",what:"かなにそばに行ってもらう",rec:"1IPでかなに頼む",reward:"疲労回復 / 涙の泉 +",risk:"なし",action:{screen:"quick",target:"care",who:g.who||"toyman",tier:1,label:"かなに頼む"}});
  if(g.type==="bond"){var h=getNextUnlockInfo(game)[0];return Object.assign({},g,{label:h?"連携場面に近づける":"連携を深める",what:h?NAMES[h.a]+"×"+NAMES[h.b]+"の連携をあと"+h.need+"上げる":"誰かの連携を少し進める",rec:"3P 一括連携",reward:h?"場面「"+h.title+"」の解放に近づく":"場面帳が解放されやすくなる",risk:"なし",action:{screen:"quick",target:"bond",tier:3,label:"一括で近づける"}});}
  if(g.type==="ember_new")return Object.assign({},g,{what:"残り火タブで、書いたあとに残ったものを預ける",rec:"残り火を預ける",reward:"箱庭が動き始める",action:{screen:"ember",label:"残り火へ"}});
  return g;
}
function getAtmosphere(game){
  var hints=[];var t=game.characters.toyman;
  if(t.lastAction==="exploring"&&t.stats.fatigue<70)hints.push("トイマンが何かを持ち帰りそう");
  var chk=(game.emberCards||[]).find(function(c){return c.status==="checking";});if(chk)hints.push("コタエが「"+makeEmberTitle(chk)+"」を読んでいます");
  var kana=game.characters.kana;var kLoc=toNK(kana.location);
  var same=CHAR_IDS.filter(function(id){return id!=="kana"&&toNK(game.characters[id].location)===kLoc;});
  if(same.length>0)hints.push("かなが"+NAMES[same[0]]+"のそばにいます");
  var ui=getNextUnlockInfo(game);if(ui.length>0)hints.push("あと"+ui[0].need+"で「"+ui[0].title+"」が解放される");
  return hints.slice(0,3);
}
const SK="kimi-v15";
/* 保存失敗を検知してコールバックに通知する。失敗時は false を返す。
   localStorage が使えない環境（プライベートモード・容量超過）でも静かに消えないようにする。 */
var _saveFailHandler=null;
var _saveOkHandler=null;
function setSaveFailHandler(fn){_saveFailHandler=fn;}
function setSaveOkHandler(fn){_saveOkHandler=fn;}
const persistSave=function(d){
  try{
    localStorage.setItem(SK,JSON.stringify(d));
    if(_saveOkHandler){try{_saveOkHandler();}catch(_){}}
    return true;
  }catch(e){
    if(_saveFailHandler){try{_saveFailHandler(e);}catch(_){}}
    return false;
  }
};
const loadSave=function(){try{return JSON.parse(localStorage.getItem(SK));}catch(e){return null;}};
const clearSave=function(){try{localStorage.removeItem(SK);}catch(e){}};

const Bar=function(p){return React.createElement("div",{className:"bar",style:{height:p.h||4}},React.createElement("div",{className:"bar-fill",style:{width:Math.max(0,Math.min(100,p.value))+"%",background:p.color,height:"100%"}}));};
const Dt=function(p){if(p.from===p.to)return React.createElement("span",{className:"df"},p.to,React.createElement("span",{className:"da"}," ·"));var up=p.to>p.from,good=p.inv?!up:up;return React.createElement("span",{className:good?"dg":"db"},p.to,React.createElement("span",{className:"da"},up?" ↑":" ↓"));};
const Badge=function(p){var m=SMETA[p.status]||SMETA.normal;return React.createElement("span",{className:"badge "+m.cls},m.label);};
const AudBadge=function(p){if(p.mode==="inspection")return React.createElement("span",{className:"badge st-ins"},"検品中");if(p.pressure>=70)return React.createElement("span",{className:"badge st-limit"},"圧 高");if(p.pressure<=35)return React.createElement("span",{className:"badge st-peak"},"おだやか");return React.createElement("span",{className:"badge st-normal"},"—");};
const fatC=function(v){return v>=100?"var(--prot)":v>=80?"var(--limit)":v>=50?"var(--tired)":"var(--calm)";};

/* ── SVGマップ ── */

function CardWorldMap(p){
  var game=p.game,onPlaceSelect=p.onPlaceSelect;
  var active=getActiveEmber(game);
  var emberPlace=active?getEmberPlace(active):null;
  var openKeys=getUnlockedPlaceKeys(game);
  var places=[
    {key:"post_office",icon:"✉",desc:"手紙を選び、残り火を送り出す場所"},
    {key:"starting_room",icon:"🕯",desc:"残り火が生まれ、最初の言葉を得る部屋"},
    {key:"tears_spring",icon:"💧",desc:"痛みを洗い、やさしさに変える場所"},
    {key:"record_tower",icon:"📚",desc:"意味を見つけ、言葉にする場所"},
    {key:"unexplored_forest",icon:"🔥",desc:"まだ受け取られていない想いが眠る森"},
    {key:"inspection_bureau",icon:"△",desc:"判決札と保留室があり、圧力が全域へ及ぶ場所"},
  ];
  return(
    <div className="world-card-map">
      <div className="world-map-head">
        <div>
          <div className="wm-kicker">MAP</div>
          <h3>世界地図</h3>
          <p>場所カードを押すと、その場所の「いまのようす」へ移動します。</p>
        </div>
        {active&&<div className="wm-current">🔥 残り火：{PNAME[emberPlace]}</div>}
      </div>
      <div className="world-card-grid">
        {places.map(function(pl){
          var unlocked=openKeys.indexOf(pl.key)!==-1;
          if(!unlocked){
            return(
              <div key={pl.key} className="world-place-card world-place-locked" aria-disabled="true">
                <div className="wpc-top">
                  <span className="wpc-icon">🔒</span>
                  <div className="wpc-name">{PSHORT[pl.key]}</div>
                </div>
                <div className="wpc-desc">まだ閉じています。</div>
                <div className="wpc-locked-note">残り火が進むと、ここが開きます。</div>
              </div>
            );
          }
          var m=game.world.map[pl.key]||{};
          var pct=Math.max(0,Math.min(100,Math.round((m.progress_rate||0)*100)));
          var lv=m.level||1;
          var toNext=Math.max(0,100-pct);
          var chars=getCharsAtLoc(game,pl.key);
          var fires=getEmbersAtPlace(game,pl.key);
          return(
            <button key={pl.key} className={"world-place-card world-place-btn"+(emberPlace===pl.key?" wpc-ember":"")} onClick={function(){onPlaceSelect&&onPlaceSelect(pl.key);}}>
              <div className="wpc-top">
                <span className="wpc-icon">{pl.icon}</span>
                <div className="wpc-name">{PSHORT[pl.key]}</div>
                {emberPlace===pl.key&&<span className="wpc-now">残り火あり</span>}
              </div>
              <div className="wpc-desc">{pl.desc}</div>
              <div className="wpc-bar"><span style={{width:pct+"%",background:PCOL(pl.key)}}/></div>
              <div className="wpc-meta">
                <span>Lv.{lv}「{getPlaceLvName(pl.key,lv)}」</span>
                <b>{pct}%</b>
              </div>
              <div className="wpc-next">あと{toNext}%で Lv.{lv+1} / {PLACE_NEXT_EFFECT[pl.key]}</div>
              {fires.length>0&&<div className="wpc-fire-count">🔥 残り火 {fires.length}件</div>}
              {chars.length>0&&<div className="wpc-chars">
                {chars.slice(0,4).map(function(id){return <span key={id} className={"wpc-char cd-"+id}>{NAMES[id][0]}</span>;})}
              </div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MapSVG(p){
  var game=p.game;
  var openKeys=getUnlockedPlaceKeys(game);
  var dmap={};getAllDeltas(game).forEach(function(d){if(d.dp!==null&&d.dp>0.003)dmap[d.key]=Math.round(d.dp*100);});
  var atNode={};ALL_IDS.forEach(function(id){var k=toNK(game.characters[id].location);if(!atNode[k])atNode[k]=[];atNode[k].push(id);});
  // 残り火の場所マッピング
  var emberNode={};var statusToPlace={unreceived:"unexplored_forest",stored:"post_office",openable:"tears_spring",checking:"record_tower",ready:"starting_room"};
  (game.emberCards||[]).forEach(function(c){var pl=statusToPlace[c.status];if(pl){if(!emberNode[pl])emberNode[pl]=0;emberNode[pl]++;}});
  var R=2*Math.PI*22;
  return (<svg viewBox="0 0 300 260" className="msvg">
    {MEDGES.map(function(e,i){var na=MNODES[e[0]],nb=MNODES[e[1]];return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className="me"/>;}) }
    {Object.keys(MNODES).map(function(key){
      var n=MNODES[key],here=atNode[key]||[],isF=!!n.forest,nr=isF?22:17;
      var m=game.world.map[key]||{};var lv=m.level||1,pct=Math.round((m.progress_rate||0)*100);
      var toNext=100-pct;var col=PCOL(key);var eCount=emberNode[key]||0;
      var progressArc=isF?(R*pct/100+" "+R):null;
      var locked=openKeys.indexOf(key)===-1;
      return(<g key={key} opacity={locked?0.3:1}>
        <circle cx={n.x} cy={n.y} r={nr} className={"mn"+(isF?" mf":"")}/>
        {/* 全場所に進捗リング */}
        {!isF&&<circle cx={n.x} cy={n.y} r={nr} fill="none" stroke={col} strokeWidth="2.5" strokeDasharray={(2*Math.PI*nr*pct/100)+" "+(2*Math.PI*nr)} strokeDashoffset={2*Math.PI*nr*0.25} opacity="0.65"/>}
        {isF&&<><circle cx={n.x} cy={n.y} r={nr} className="mpr" strokeDasharray={(R*pct/100)+" "+R} strokeDashoffset={R*0.25}/></>}
        {/* ラベル */}
        <text x={n.x} y={n.y-(isF?29:23)} className="mlbl">{n.lbl}</text>
        {/* Lv表示 */}
        <text x={n.x} y={n.y+(isF?-7:-5)} className="mnode-lv">Lv.{lv}</text>
        {/* %表示 */}
        <text x={n.x} y={n.y+(isF?7:8)} className="mnode-pct">{pct}%</text>
        {/* あと何% */}
        {toNext>0&&toNext<100&&<text x={n.x} y={n.y+(isF?nr+16:nr+12)} className="mnode-soon">あと{toNext}%</text>}
        {/* キャラドット */}
        {here.map(function(id,idx){var total=here.length,spread=total>1,angle=spread?(idx/total)*2*Math.PI-Math.PI/2:0,rd=spread?(isF?13:10):0;var cx2=n.x+rd*Math.cos(angle),cy2=n.y+rd*Math.sin(angle);return <g key={id}><circle cx={cx2} cy={cy2} r={7} className={"cd cd-"+id}/><text x={cx2} y={cy2+3.5} className="cdl">{NAMES[id][0]}</text></g>;})}
        {/* 残り火カード在籍 */}
        {eCount>0&&<circle cx={n.x+nr-4} cy={n.y-nr+4} r={6} fill="var(--ember)" opacity="0.9"/>}
        {eCount>0&&<text x={n.x+nr-4} y={n.y-nr+7.5} className="cdl" style={{fill:"var(--ink)",fontSize:"7px"}}>{eCount}</text>}
        {/* 今回の変化 */}
        {dmap[key]!==undefined&&<text x={n.x} y={n.y+(isF?nr+26:nr+20)} className="mnode-d">+{dmap[key]}%↑</text>}
      </g>);})}
  </svg>);
}

/* ── 視覚行動判定 ── */
function getVisualAction(id,game,toyFight){
  var c=game.characters[id];if(!c)return"idle";
  if(id==="toyman"){
    if(toyFight&&c.lastAction==="exploring")return"fighting";
    if(c.stats.fatigue>=80)return"tired";
    if(c.lastAction==="exploring"){
      var unrec=(game.emberCards||[]).find(function(e){return e.status==="unreceived";});
      if(unrec&&(unrec.progress||0)>=75)return"discovering";
      return"exploring";
    }
    return"resting";
  }
  if(id==="kana"){if(c.lastAction==="comforting")return"comforting";return"resting";}
  if(id==="utsuro"){if(c.lastAction==="organizing")return"sorting";return"idle";}
  if(id==="kotae"){
    if(c.lastAction==="recording"){
      var checking=(game.emberCards||[]).some(function(e){return e.status==="checking";});
      return checking?"reading":"recording";
    }
    return"idle";
  }
  if(id==="auditor"){if(c.mode==="inspection")return"inspecting";if(c.stats.pressure>=70)return"pressuring";return"idle";}
  return"idle";
}

/* ── 行動スプライト ── */
function ActionSprite(p){
  var action=p.action;
  if(!action||action==="idle")return null;
  return(
    <div className={"asp asp-"+action}>
      {action==="exploring"&&<>
        <span className="asp-el asp-lantern">◆</span>
        <span className="asp-el asp-f1">·</span>
        <span className="asp-el asp-f2">·</span>
        <span className="asp-el asp-q">?</span>
      </>}
      {action==="discovering"&&<>
        <span className="asp-el asp-bang">!</span>
        <span className="asp-el asp-paper">◻</span>
        <span className="asp-el asp-glow"/>
      </>}
      {action==="fighting"&&<>
        <span className="asp-el asp-enemy"/>
        <span className="asp-el asp-hit1">╱</span>
        <span className="asp-el asp-hit2">╲</span>
        <span className="asp-el asp-bang2">!</span>
      </>}
      {action==="sorting"&&<>
        <span className="asp-el asp-env1">✉</span>
        <span className="asp-el asp-env2">✉</span>
        <span className="asp-el asp-box">□</span>
      </>}
      {action==="recording"&&<>
        <span className="asp-el asp-rpaper">◻</span>
        <span className="asp-el asp-pen">╱</span>
      </>}
      {action==="reading"&&<>
        <span className="asp-el asp-rpaper asp-glowp">◻</span>
        <span className="asp-el asp-dots">…</span>
      </>}
      {action==="comforting"&&<>
        <span className="asp-el asp-drop">·</span>
        <span className="asp-el asp-ring"/>
      </>}
      {action==="resting"&&<>
        <span className="asp-el asp-z">z</span>
        <span className="asp-el asp-bed">—</span>
      </>}
      {action==="tired"&&<>
        <span className="asp-el asp-ztired">z</span>
        <span className="asp-el asp-lantern asp-dim">◆</span>
      </>}
      {action==="inspecting"&&<>
        <span className="asp-el asp-tag">保</span>
        <span className="asp-el asp-stamp">■</span>
      </>}
      {action==="pressuring"&&<>
        <span className="asp-el asp-shadow"/>
      </>}
    </div>
  );
}

/* ── 場所オーバーレイ（行動対象の可視化）── */
function StageOverlay(p){
  var loc=p.loc,game=p.game;
  var chars=game.characters;
  var cards=game.emberCards||[];
  var statusToLoc={unreceived:"unexplored_forest",stored:"post_office",openable:"tears_spring",checking:"record_tower",ready:"starting_room"};
  var emberHere=cards.find(function(c){return statusToLoc[c.status]===loc;});
  var emberProg=emberHere?(emberHere.progress||0):0;
  var toyHere=toNK(chars.toyman.location)===loc;
  var kanaHere=toNK(chars.kana.location)===loc;
  var utsuroHere=toNK(chars.utsuro.location)===loc;
  var kotaeHere=toNK(chars.kotae.location)===loc;
  var toyEx=toyHere&&chars.toyman.lastAction==="exploring";
  var kanaCom=kanaHere&&chars.kana.lastAction==="comforting";
  var utsuroOrg=utsuroHere&&chars.utsuro.lastAction==="organizing";
  var kotaeRec=kotaeHere&&chars.kotae.lastAction==="recording";
  var readyCard=cards.find(function(c){return c.status==="ready";});
  return(
    <svg className="stage-svg stage-ov" viewBox="0 0 320 160">
      {loc==="unexplored_forest"&&<>
        {toyEx&&<>
          <circle cx="132" cy="118" r="2.5" fill="rgba(232,227,212,.35)" className="ov-fp1"/>
          <circle cx="139" cy="109" r="2" fill="rgba(232,227,212,.25)" className="ov-fp2"/>
          <circle cx="145" cy="100" r="1.8" fill="rgba(232,227,212,.18)" className="ov-fp3"/>
        </>}
        {emberHere&&<ellipse cx="148" cy="92" rx={10+emberProg/10} ry={8+emberProg/12} fill="rgba(219,164,94,0.16)" className="ov-ember-glow"/>}
        {toyEx&&emberProg>=75&&<>
          <rect x="162" y="76" width="11" height="15" rx="1" fill="rgba(232,227,212,.55)" className="ov-paper"/>
          <rect x="164" y="80" width="7" height="1.5" rx=".5" fill="rgba(219,164,94,.6)"/>
          <rect x="164" y="84" width="5" height="1.5" rx=".5" fill="rgba(219,164,94,.35)"/>
        </>}
      </>}
      {loc==="post_office"&&<>
        {utsuroOrg&&<>
          <rect x="38" y="44" width="13" height="9" rx="1" fill="rgba(219,164,94,.55)" className="ov-env1"/>
          <rect x="55" y="44" width="13" height="9" rx="1" fill="rgba(219,164,94,.45)" className="ov-env2"/>
          <rect x="72" y="44" width="13" height="9" rx="1" fill="rgba(219,164,94,.35)" className="ov-env3"/>
          <rect x="118" y="56" width="13" height="9" rx="1" fill="rgba(219,164,94,.75)" className="ov-env-move"/>
        </>}
        {emberHere&&<ellipse cx="128" cy="92" rx="30" ry="16" fill="rgba(219,164,94,.10)" className="ov-ember-glow"/>}
      </>}
      {loc==="tears_spring"&&<>
        <ellipse cx="155" cy="122" rx="32" ry="9" fill="none" stroke="rgba(126,184,212,.28)" strokeWidth="1" className="ov-ripple1"/>
        <ellipse cx="155" cy="122" rx="52" ry="15" fill="none" stroke="rgba(126,184,212,.18)" strokeWidth="1" className="ov-ripple2"/>
        {kanaCom&&<>
          <circle cx="155" cy="100" r="3" fill="rgba(126,184,212,.7)" className="ov-drop1"/>
          <circle cx="148" cy="112" r="2" fill="rgba(126,184,212,.5)" className="ov-drop2"/>
          <circle cx="163" cy="108" r="1.5" fill="rgba(126,184,212,.4)" className="ov-drop3"/>
        </>}
        {emberHere&&<ellipse cx="148" cy="78" rx="22" ry="14" fill="rgba(126,184,212,.12)" className="ov-ember-glow"/>}
      </>}
      {loc==="record_tower"&&<>
        {kotaeRec&&<>
          <rect x="106" y="92" width="9" height="13" rx="1" fill="rgba(232,227,212,.4)" className="ov-doc1"/>
          <rect x="120" y="90" width="9" height="13" rx="1" fill="rgba(232,227,212,.32)" className="ov-doc2"/>
          <rect x="134" y="93" width="9" height="13" rx="1" fill="rgba(176,168,204,.65)" className={emberHere?"ov-doc3 ov-glow":"ov-doc3"}/>
        </>}
        {emberHere&&<rect x="104" y="88" width="112" height="42" rx="3" fill="rgba(176,168,204,.08)" className="ov-ember-glow"/>}
      </>}
      {loc==="starting_room"&&<>
        <circle cx="155" cy="82" r="26" fill="rgba(232,192,128,.07)" className="ov-room-glow"/>
        <circle cx="155" cy="82" r="14" fill="rgba(232,192,128,.05)" className="ov-room-glow2"/>
        {readyCard&&<>
          <rect x="136" y="78" width="38" height="24" rx="2" fill="rgba(232,192,128,.22)" stroke="rgba(219,164,94,.6)" strokeWidth="1" className="ov-ready-env"/>
          <line x1="136" y1="78" x2="155" y2="90" stroke="rgba(219,164,94,.4)" strokeWidth="1"/>
          <line x1="174" y1="78" x2="155" y2="90" stroke="rgba(219,164,94,.4)" strokeWidth="1"/>
        </>}
      </>}
    </svg>
  );
}

/* ── 観察モード（いまのようす）── */
function StageBg(p){
  var loc=p.loc,bg=p.bg,tr=p.traces||{};
  var fp=Math.min(tr.footprints||0,8),ap=Math.min(tr.ash_papers||0,5),sh=Math.min(tr.shadows||0,3);
  var en=Math.min(tr.envelopes||0,8),dr=Math.min(tr.drops||0,6);
  var pa=Math.min(tr.papers||0,6),ho=Math.min(tr.holds||0,3);
  var li=Math.min(tr.lights||0,6),rc=Math.min(tr.receipts||0,3);
  var FP=[{x:131,y:119},{x:138,y:111},{x:144,y:103},{x:150,y:96},{x:156,y:89},{x:162,y:81},{x:168,y:74},{x:174,y:67}];
  var AP=[{x:166,y:72},{x:161,y:81},{x:177,y:87},{x:154,y:67},{x:172,y:95}];
  var EN_POS=[{x:38,y:44},{x:54,y:44},{x:70,y:44},{x:86,y:44},{x:38,y:70},{x:54,y:70},{x:70,y:70},{x:86,y:70}];
  var DR_POS=[{x:118,y:96},{x:138,y:88},{x:160,y:94},{x:175,y:101},{x:145,y:108},{x:168,y:84}];
  var PA_POS=[{x:108,y:92},{x:120,y:89},{x:133,y:93},{x:145,y:90},{x:157,y:94},{x:170,y:91}];
  if(loc==="unexplored_forest")return(<svg className="stage-svg" viewBox="0 0 320 160"><ellipse cx="38" cy="108" rx="28" ry="60" fill="#07100A" opacity="0.85"/><ellipse cx="76" cy="94" rx="22" ry="66" fill="#060F09" opacity="0.8"/><ellipse cx="248" cy="98" rx="26" ry="62" fill="#07100A" opacity="0.85"/><ellipse cx="286" cy="110" rx="20" ry="48" fill="#060F09" opacity="0.8"/><circle cx="155" cy="88" r="52" fill={bg.a} opacity="0.55"/>{FP.slice(0,fp).map(function(pt,i){return <circle key={"f"+i} cx={pt.x} cy={pt.y} r="2.2" fill={i>=fp-2?"rgba(232,227,212,.45)":"rgba(232,227,212,.18)"}/>;})} {AP.slice(0,ap).map(function(pt,i){return <rect key={"ap"+i} x={pt.x-4} y={pt.y-5} width="8" height="11" rx="1" fill="rgba(232,227,212,.32)" style={{filter:"drop-shadow(0 0 3px rgba(219,164,94,.6))"}}/>;})} {sh>0&&<ellipse cx="200" cy="88" rx={8+sh*2} ry={12+sh*3} fill="rgba(0,0,0,.25)"/>}</svg>);
  if(loc==="post_office")return(<svg className="stage-svg" viewBox="0 0 320 160"><rect x="10" y="18" width="56" height="118" fill="rgba(0,0,0,0.42)" rx="2"/><rect x="12" y="36" width="52" height="4" fill="rgba(219,164,94,0.22)"/><rect x="12" y="62" width="52" height="4" fill="rgba(219,164,94,0.22)"/><rect x="12" y="88" width="52" height="4" fill="rgba(219,164,94,0.22)"/><rect x="254" y="18" width="56" height="118" fill="rgba(0,0,0,0.42)" rx="2"/><rect x="256" y="36" width="52" height="4" fill="rgba(219,164,94,0.22)"/><rect x="256" y="62" width="52" height="4" fill="rgba(219,164,94,0.22)"/><rect x="256" y="88" width="52" height="4" fill="rgba(219,164,94,0.22)"/><rect x="118" y="98" width="84" height="32" rx="3" fill="rgba(0,0,0,0.38)"/><rect x="18" y="24" width="9" height="7" rx="1" fill="rgba(219,164,94,0.55)"/><rect x="30" y="24" width="9" height="7" rx="1" fill="rgba(219,164,94,0.4)"/><rect x="18" y="50" width="9" height="7" rx="1" fill="rgba(219,164,94,0.45)"/><circle cx="160" cy="80" r="36" fill={bg.a} opacity="0.45"/> {EN_POS.slice(0,en).map(function(pt,i){return <rect key={"en"+i} x={pt.x} y={pt.y} width="11" height="8" rx="1" fill={i===en-1?"rgba(219,164,94,.65)":"rgba(219,164,94,.35)"}/>;})} </svg>);
  if(loc==="tears_spring")return(<svg className="stage-svg" viewBox="0 0 320 160"><ellipse cx="155" cy="122" rx="92" ry="28" fill="rgba(126,184,212,0.12)" stroke="rgba(126,184,212,0.2)" strokeWidth="1.5"/><ellipse cx="155" cy="120" rx="66" ry="20" fill="rgba(126,184,212,0.07)"/><circle cx="118" cy="96" r="3.5" fill="rgba(126,184,212,0.5)"/><circle cx="156" cy="88" r="2.5" fill="rgba(126,184,212,0.4)"/><circle cx="176" cy="102" r="3" fill="rgba(126,184,212,0.35)"/><circle cx="140" cy="108" r="2" fill="rgba(126,184,212,0.45)"/><circle cx="155" cy="100" r="56" fill={bg.a} opacity="0.45"/> {DR_POS.slice(0,dr).map(function(pt,i){return <circle key={"dr"+i} cx={pt.x} cy={pt.y} r={i===dr-1?3:2} fill="rgba(126,184,212,.45)"/>;})} </svg>);
  if(loc==="record_tower")return(<svg className="stage-svg" viewBox="0 0 320 160"><rect x="264" y="12" width="44" height="124" rx="2" fill="rgba(0,0,0,0.42)"/><rect x="266" y="28" width="40" height="3" rx="1" fill="rgba(176,168,204,0.25)"/><rect x="266" y="52" width="40" height="3" rx="1" fill="rgba(176,168,204,0.25)"/><rect x="266" y="76" width="40" height="3" rx="1" fill="rgba(176,168,204,0.25)"/><rect x="266" y="100" width="40" height="3" rx="1" fill="rgba(176,168,204,0.25)"/><rect x="104" y="90" width="112" height="44" rx="3" fill="rgba(0,0,0,0.38)"/><rect x="110" y="72" width="18" height="24" rx="1" fill="rgba(232,227,212,0.07)"/><rect x="132" y="67" width="15" height="29" rx="1" fill="rgba(232,227,212,0.06)"/><rect x="152" y="70" width="18" height="26" rx="1" fill="rgba(232,227,212,0.08)"/><circle cx="155" cy="90" r="36" fill={bg.a} opacity="0.5"/> {PA_POS.slice(0,pa).map(function(pt,i){return <rect key={"pa"+i} x={pt.x} y={pt.y} width="8" height="11" rx="1" fill={i===pa-1?"rgba(176,168,204,.55)":"rgba(176,168,204,.25)"}/>;})} {ho>0&&<rect x="266" y="62" width="20" height="13" rx="2" fill="rgba(0,0,0,.6)" stroke="rgba(122,32,80,.45)" strokeWidth="1"/>} {ho>0&&<text x="276" y="71.5" fill="rgba(122,32,80,.8)" fontSize="6.5" textAnchor="middle" fontFamily="var(--sans)">保留</text>} </svg>);
  /* starting_room */
  var LC_POS=[{cx:135,cy:78},{cx:175,cy:82},{cx:152,cy:68},{cx:162,cy:92},{cx:145,cy:86},{cx:168,cy:72}];
  var RC_POS=[{x:104,y:30},{x:145,y:26},{x:188,y:32}];
  return(<svg className="stage-svg" viewBox="0 0 320 160"><rect x="20" y="22" width="14" height="114" rx="2" fill="rgba(0,0,0,0.3)"/><rect x="286" y="22" width="14" height="114" rx="2" fill="rgba(0,0,0,0.3)"/><circle cx="160" cy="85" r="68" fill={bg.a} opacity="0.32"/> {LC_POS.slice(0,Math.max(1,li)).map(function(pt,i){return <circle key={"li"+i} cx={pt.cx} cy={pt.cy} r={i===li-1?5:3.5} fill="rgba(232,192,128,.22)"/>;})} {RC_POS.slice(0,rc).map(function(pt,i){return <rect key={"rc"+i} x={pt.x} y={pt.y} width="28" height="18" rx="2" fill="rgba(232,192,128,.2)" stroke="rgba(219,164,94,.4)" strokeWidth="1"/>;})} </svg>);
}

/* ── シーンイベントオーバーレイ ── */
function StageEventOverlay(p){
  var ev=p.event,loc=p.loc;
  if(!ev||ev.loc!==loc)return null;
  var ph=ev.phase,t=ev.type;
  return(
    <svg className="stage-svg stage-ev-ov" viewBox="0 0 320 160">
      {/* toyman_search */}
      {t==="toyman_search"&&<>
        <circle cx="131" cy="119" r="2.8" fill="rgba(232,227,212,.7)" className="ev-fp-new"/>
        <circle cx="139" cy="110" r="2.2" fill="rgba(232,227,212,.55)" className="ev-fp-new2"/>
      </>}
      {/* toyman_find */}
      {t==="toyman_find"&&ph==="start"&&<circle cx="174" cy="73" r="10" fill="rgba(219,164,94,.25)" className="ev-start-glow"/>}
      {t==="toyman_find"&&ph==="action"&&<>
        <rect x="169" y="66" width="11" height="15" rx="1" fill="rgba(232,227,212,.78)" className="ev-paper-rise"/>
        <text x="151" y="62" fill="var(--ct)" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="var(--mono)" className="ev-bang">!</text>
      </>}
      {t==="toyman_find"&&ph==="result"&&<rect x="169" y="66" width="11" height="15" rx="1" fill="rgba(232,227,212,.6)" className="ev-settle"/>}
      {/* toyman_encounter */}
      {t==="toyman_encounter"&&ph==="start"&&<ellipse cx="197" cy="80" rx="11" ry="16" fill="rgba(0,0,0,.55)" className="ev-shadow-appear"/>}
      {t==="toyman_encounter"&&ph==="action"&&<>
        <ellipse cx="197" cy="80" rx="11" ry="16" fill="rgba(0,0,0,.82)"/>
        <line x1="163" y1="87" x2="191" y2="79" stroke="var(--ct)" strokeWidth="1.5" className="ev-hitline"/>
        <line x1="158" y1="80" x2="189" y2="89" stroke="rgba(192,56,56,.65)" strokeWidth="1" className="ev-hitline2"/>
        <text x="147" y="61" fill="var(--ct)" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="var(--mono)" className="ev-bang">!</text>
      </>}
      {t==="toyman_encounter"&&ph==="result"&&<ellipse cx="197" cy="80" rx="6" ry="9" fill="rgba(0,0,0,.2)" className="ev-shadow-fade"/>}
      {/* utsuro_sort */}
      {t==="utsuro_sort"&&ph==="start"&&<rect x="170" y="54" width="13" height="9" rx="1" fill="rgba(219,164,94,.6)" className="ev-start-glow"/>}
      {t==="utsuro_sort"&&ph==="action"&&<rect x="54" y="43" width="13" height="9" rx="1" fill="rgba(219,164,94,.85)" className="ev-env-slide"/>}
      {t==="utsuro_sort"&&ph==="result"&&<rect x="40" y="43" width="13" height="9" rx="1" fill="rgba(219,164,94,.6)" className="ev-settle"/>}
      {/* nameless_glow */}
      {t==="nameless_glow"&&<rect x="40" y="43" width="13" height="9" rx="1" fill="rgba(219,164,94,.45)" className="ev-start-glow" style={{filter:"drop-shadow(0 0 6px var(--ember))"}}/>}
      {/* kana_heal */}
      {t==="kana_heal"&&ph==="start"&&<circle cx="148" cy="77" r="7" fill="rgba(126,184,212,.3)" className="ev-start-glow"/>}
      {t==="kana_heal"&&ph==="action"&&<>
        <ellipse cx="148" cy="90" rx="28" ry="11" fill="none" stroke="rgba(126,184,212,.65)" strokeWidth="1.5" className="ev-ripple-exp"/>
        <ellipse cx="148" cy="90" rx="44" ry="17" fill="none" stroke="rgba(126,184,212,.3)" strokeWidth="1" className="ev-ripple-exp2"/>
        <circle cx="148" cy="77" r="3.5" fill="rgba(126,184,212,.85)" className="ev-drop-fall"/>
      </>}
      {t==="kana_heal"&&ph==="result"&&<ellipse cx="148" cy="90" rx="32" ry="13" fill="rgba(126,184,212,.1)" className="ev-settle"/>}
      {/* spring_drop */}
      {t==="spring_drop"&&<>
        <circle cx="152" cy="88" r="3" fill="rgba(126,184,212,.75)" className="ev-drop-fall"/>
        <ellipse cx="152" cy="118" rx="13" ry="4" fill="none" stroke="rgba(126,184,212,.5)" strokeWidth="1" className="ev-ripple-exp"/>
      </>}
      {/* kotae_read */}
      {t==="kotae_read"&&ph==="start"&&<rect x="130" y="69" width="9" height="12" rx="1" fill="rgba(176,168,204,.55)" className="ev-start-glow" style={{filter:"drop-shadow(0 0 5px var(--co))"}}/>}
      {t==="kotae_read"&&ph==="action"&&<>
        <rect x="130" y="69" width="9" height="12" rx="1" fill="rgba(176,168,204,.85)" style={{filter:"drop-shadow(0 0 7px var(--co))"}}/>
        <line x1="148" y1="96" x2="155" y2="89" stroke="rgba(232,227,212,.65)" strokeWidth="1.2" className="ev-pen-write"/>
        <line x1="153" y1="97" x2="158" y2="91" stroke="rgba(232,227,212,.45)" strokeWidth="1" className="ev-pen-write2"/>
      </>}
      {t==="kotae_read"&&ph==="result"&&<rect x="130" y="69" width="9" height="12" rx="1" fill="rgba(176,168,204,.5)" className="ev-settle"/>}
      {/* auditor_hold */}
      {t==="auditor_hold"&&ph==="start"&&<circle cx="280" cy="54" r="9" fill="rgba(122,32,80,.22)" className="ev-aud-start"/>}
      {t==="auditor_hold"&&(ph==="action"||ph==="result")&&<>
        <rect x="265" y="61" width="23" height="15" rx="2" fill={ph==="action"?"rgba(0,0,0,.75)":"rgba(0,0,0,.5)"} stroke="rgba(122,32,80,.6)" strokeWidth="1"/>
        <text x="276.5" y="71.5" fill={ph==="action"?"rgba(122,32,80,.95)":"rgba(122,32,80,.65)"} fontSize="7" textAnchor="middle" fontFamily="var(--sans)">保留</text>
      </>}
      {/* light_grow */}
      {t==="light_grow"&&ph==="start"&&<circle cx="155" cy="82" r="6" fill="rgba(232,192,128,.4)" className="ev-light-appear"/>}
      {t==="light_grow"&&ph==="action"&&<>
        <circle cx="155" cy="82" r="20" fill="rgba(232,192,128,.14)" className="ev-light-spread"/>
        <circle cx="155" cy="82" r="9" fill="rgba(232,192,128,.38)" className="ev-light-core"/>
      </>}
      {t==="light_grow"&&ph==="result"&&<circle cx="155" cy="82" r="11" fill="rgba(232,192,128,.22)" className="ev-settle"/>}
      {/* receipt_arrive */}
      {t==="receipt_arrive"&&ph==="start"&&<rect x="136" y="68" width="38" height="24" rx="2" fill="rgba(232,192,128,.18)" className="ev-env-appear"/>}
      {t==="receipt_arrive"&&ph==="action"&&<>
        <rect x="136" y="78" width="38" height="24" rx="2" fill="rgba(232,192,128,.38)" stroke="rgba(219,164,94,.85)" strokeWidth="1.5" className="ev-receipt-glow"/>
        <line x1="136" y1="78" x2="155" y2="90" stroke="rgba(219,164,94,.55)" strokeWidth="1"/>
        <line x1="174" y1="78" x2="155" y2="90" stroke="rgba(219,164,94,.55)" strokeWidth="1"/>
      </>}
      {t==="receipt_arrive"&&ph==="result"&&<>
        <rect x="136" y="78" width="38" height="24" rx="2" fill="rgba(232,192,128,.25)" stroke="rgba(219,164,94,.5)" strokeWidth="1"/>
        <line x1="136" y1="78" x2="155" y2="90" stroke="rgba(219,164,94,.35)" strokeWidth="1"/>
        <line x1="174" y1="78" x2="155" y2="90" stroke="rgba(219,164,94,.35)" strokeWidth="1"/>
      </>}
    </svg>
  );
}

/* ── 結果ポップ ── */
function SceneResultPop(p){
  var rw=p.reward||{};
  var lines=[];
  if(rw.item)lines.push((ITEM_NAMES[rw.item]||rw.item)+" +"+(rw.count||1));
  if(rw.progress)lines.push("探索 +"+rw.progress+"%");
  if(rw.fatigue&&rw.fatigue<0)lines.push("疲労 "+rw.fatigue);
  if(!lines.length)return null;
  return(<div className="ev-result-pop">{lines.map(function(l,i){return <div key={i} className="ev-pop-line">{l}</div>;})}</div>);
}

function BattleEntryPanel(p){
  var game=p.game;
  var pv=makeBattlePreview(game);
  var card=getToymanBattleEmber(game);
  if(!card)return null;
  return(
    <div className="battle-entry-panel">
      <div className="battle-entry-head">
        <span>未受領の森：影との遭遇</span>
        <b>見守り {pv.watch} / 100</b>
      </div>
      <div className="battle-entry-body">
        <div className="battle-shadow-mini"><i/></div>
        <div className="battle-entry-text">
          <strong>トイマンが黒い影と遭遇しています。</strong>
          <p>回収中：「{makeEmberTitle(card)}」</p>
          <small>押さなくても自動で進みます。介入すると、残り火を落とさないように手を添えられます。</small>
        </div>
      </div>
      <div className="battle-entry-foot"><span>回収率 {Math.round(card.progress||0)}%</span><span>疲労 {pv.fatigue}/100</span></div>
      <button className="btn btn-p battle-open-btn" onClick={p.onOpen}>戦闘に介入する</button>
    </div>
  );
}
function BattleActionButton(p){
  var a=p.action,disabled=p.disabled;
  return <button className={"battle-action battle-action-"+a.id} disabled={disabled} onClick={function(){p.onClick&&p.onClick(a.id);}}>
    <b>{a.label}</b><span>{a.sub}</span><small>{a.hint}</small>
  </button>;
}
function BattleEncounterModal(p){
  var game=p.game;
  var pv=makeBattlePreview(game);
  var card=getToymanBattleEmber(game);
  var result=p.result;
  var [selfAnswer,setSelfAnswer]=useState("");
  var cdSec=Math.ceil((pv.cooldownMs||0)/1000);
  var disabled=pv.mod.blocked||pv.cooldownMs>0||!card||game.characters.toyman.lastAction!=="exploring";
  var actions=[
    {id:"hold",label:"前に進ませる",sub:"道を切り拓くよう力を貸す",hint:"回収率 +4〜7% / 疲労 +2〜4 / 見守り +12"},
    {id:"read",label:"影の声を聞く",sub:"判決ではなく声として記録する",hint:"回収率 +1〜3% / 疲労 +1〜2 / 見守り +8"},
    {id:"retreat",label:"今日は引き返す",sub:"無理に進まず、また来る",hint:"疲労 -4〜6 / 見守り +4 / 回収率は進まない"}
  ];
  var QUICK_REPLIES=["今日は保留する","それは本当かもしれない","わからない、でも忘れない"];
  function doAction(id){p.onManualBattle&&p.onManualBattle(id,selfAnswer);setSelfAnswer("");}
  return(
    <div className="ov battle-ov" onClick={p.onClose}>
      <div className="battle-modal" onClick={function(e){e.stopPropagation();}}>
        <div className="sh-handle"/>
        <div className="battle-title-row">
          <div><div className="battle-k">問いへの道</div><h2>トイマンが問いに近づいている途中、影に遭遇した</h2></div>
          <button className="care-x" onClick={p.onClose}>×</button>
        </div>
        <div className="battle-meaning">問いはまだ届いていない。トイマンが取りに向かっている途中です。影がその道をふさいでいる。一緒に、前へ進みます。</div>
        <div className="battle-field">
          <div className="battle-toyman"><span className="nd cd-toyman"/><b>トイマン</b><small>{pv.mod.label}</small></div>
          <div className="battle-vs">VS</div>
          <div className="battle-shadow"><i/><span>{pv.enemy}</span></div>
        </div>
        <div className="shadow-voice-box"><span className="svb-label">影の声</span><p className="svb-context">書いたあとに浮かぶ内なる声。判決ではなく、声として聞く。</p><p className="svb-voice">「{pv.voice}」</p></div>
        <div className="battle-self-answer-box">
          <label className="bsa-label">この声を、どう受け取りますか（任意）</label>
          <div className="bsa-quick-row">{QUICK_REPLIES.map(function(q){return <button key={q} type="button" className="bsa-quick" onClick={function(){setSelfAnswer(q);}}>{q}</button>;})}</div>
          <textarea className="bsa-input" rows={2} placeholder="自由に書く、または上のボタンで選ぶ" value={selfAnswer} onChange={function(e){setSelfAnswer(e.target.value);}}/>
          {selfAnswer.trim()&&<div className="bsa-bonus">回収率 +3〜5% ボーナス / この言葉は残り火に記録されます</div>}
        </div>
        {card&&<div className="battle-ember-box"><span>目指している残り火</span><b>「{makeEmberTitle(card)}」</b>{card.bodyText&&<small>{card.bodyText}</small>}</div>}
        <div className="battle-stats">
          <div><span>影の濃さ</span><b>{pv.hp} / {pv.hpMax}</b><Bar value={pv.hp/pv.hpMax*100} color="var(--ct)" h={5}/></div>
          <div><span>回収率</span><b>{pv.progress}%</b><Bar value={pv.progress} color="var(--ember)" h={5}/></div>
          <div><span>疲労</span><b>{pv.fatigue} / 100</b><Bar value={pv.fatigue} color={pv.fatigue>=80?"var(--limit)":pv.fatigue>=50?"var(--tired)":"var(--ck)"} h={5}/></div>
          <div><span>見守り</span><b>{pv.watch} / 100</b><Bar value={pv.watch} color="var(--calm)" h={5}/></div>
        </div>
        <div className="battle-turns"><span>この遭遇の介入 {pv.turns} / {pv.maxTurns}</span>{pv.cooldownMs>0&&<b>あと {cdSec} 秒</b>}</div>
        <div className="battle-note">{pv.mod.note}</div>
        <div className="battle-actions">{actions.map(function(a){return <BattleActionButton key={a.id} action={a} disabled={disabled} onClick={doAction}/>;})}</div>
        {pv.mod.blocked&&<button className="btn btn-g battle-care-btn" onClick={p.onCare}>かなに水を持ってきてもらう</button>}
        {result&&<div className={"battle-result"+(result.ok?" battle-result-ok":" battle-result-ng")+(result.reached100?" battle-result-reached":"")}>
          {result.reached100&&<div className="battle-reached-banner">✨ 問いが届いた</div>}
          <b>{result.msg||"結果"}</b>{(result.lines||[]).map(function(l,i){return <p key={i}>{l}</p>;})}
        </div>}
      </div>
    </div>
  );
}

function BattleEncounterScreen(p){
  var game=p.game;
  var [result,setResult]=useState(null);
  var [selfAnswer,setSelfAnswer]=useState("");
  var pv=makeBattlePreview(game);
  var card=getToymanBattleEmber(game);
  var cdSec=Math.ceil((pv.cooldownMs||0)/1000);
  var disabled=pv.mod.blocked||pv.cooldownMs>0||!card||game.characters.toyman.lastAction!=="exploring";
  var actions=[
    {id:"hold",label:"前に進ませる",sub:"道を切り拓くよう力を貸す",hint:"回収率 +4〜7% / 疲労 +2〜4 / 見守り +12"},
    {id:"read",label:"影の声を聞く",sub:"判決ではなく声として記録する",hint:"回収率 +1〜3% / 疲労 +1〜2 / 見守り +8"},
    {id:"retreat",label:"今日は引き返す",sub:"無理に進まず、また来る",hint:"疲労 -4〜6 / 見守り +4 / 回収率は進まない"}
  ];
  var QUICK_REPLIES=["今日は保留する","それは本当かもしれない","わからない、でも忘れない"];
  function doAction(id){var r=p.onManualBattle&&p.onManualBattle(id,selfAnswer);if(r)setResult(r);setSelfAnswer("");}
  return(
    <div className="battle-screen scroll">
      <button className="battle-back-btn" onClick={p.onBack}>← 影との遭遇を中断して戻る</button>
      <div className="battle-full-hero">
        <div className="battle-k">問いへの道</div>
        <h2>影が道をふさいでいる。トイマンと一緒に前へ進みます。</h2>
        <p>問いはまだ届いていない。トイマンが取りに向かっている途中です。</p>
      </div>
      {card?<div className="battle-ember-full">
        <span>守っている残り火</span>
        <b>「{makeEmberTitle(card)}」</b>
        <div className="battle-ember-lines">
          {card.writeState&&<small>状態：{card.writeState}</small>}
          {card.feeling&&<small>感情：{card.feeling}</small>}
          {card.wanted&&<small>本当は：{card.wanted}</small>}
          {card.bodyText&&<small>あなたの言葉：{card.bodyText}</small>}
        </div>
        {(card.shadowAnswers||[]).length>0&&<div className="bsa-log">
          <div className="bsa-log-title">これまでの向き合い（{card.shadowAnswers.length}回）</div>
          {card.shadowAnswers.slice(-3).map(function(a,i){return <div key={i} className="bsa-log-item"><span className="bsa-shadow">影：「{a.shadow}」</span><span className="bsa-ans">あなた：「{a.answer}」</span></div>;})}
        </div>}
      </div>:<div className="battle-ember-full"><b>今は回収中の残り火がありません。</b></div>}
      <div className="battle-field battle-field-full">
        <div className="battle-toyman"><span className="nd cd-toyman"/><b>トイマン</b><small>{pv.mod.label}</small></div>
        <div className="battle-vs">VS</div>
        <div className="battle-shadow"><i/><span>{pv.enemy}</span></div>
      </div>
      <div className="shadow-voice-box shadow-voice-full"><span>影の声</span><p>「{pv.voice}」</p></div>
      <div className="battle-self-answer-box">
        <label className="bsa-label">影の声に、あなたの言葉で返す（任意）</label>
        <div className="bsa-quick-row">{QUICK_REPLIES.map(function(q){return <button key={q} type="button" className={"bsa-quick"+(selfAnswer===q?" bsa-quick-on":"")} onClick={function(){setSelfAnswer(selfAnswer===q?"":q);}}>{q}</button>;})}</div>
        {selfAnswer.trim()&&<>
          <div className="bsa-selected-preview">「{selfAnswer.trim()}」</div>
          <button className={"btn bsa-confirm-btn"+(disabled?" bsa-confirm-disabled":"")} disabled={disabled} onClick={function(){doAction("hold");}}>この言葉で前に進む →</button>
        </>}
        {!selfAnswer.trim()&&<textarea className="bsa-input" rows={2} placeholder="自由に書く…（または上のボタンで選ぶ）" value={selfAnswer} onChange={function(e){setSelfAnswer(e.target.value);}}/>}
      </div>
      <div className="battle-stats battle-stats-full">
        <div><span>影の濃さ</span><b>{pv.hp} / {pv.hpMax}</b><Bar value={pv.hp/pv.hpMax*100} color="var(--ct)" h={5}/></div>
        <div><span>回収率</span><b>{pv.progress}%</b><Bar value={pv.progress} color="var(--ember)" h={5}/></div>
        <div><span>疲労</span><b>{pv.fatigue} / 100</b><Bar value={pv.fatigue} color={pv.fatigue>=80?"var(--limit)":pv.fatigue>=50?"var(--tired)":"var(--ck)"} h={5}/></div>
        <div><span>見守り</span><b>{pv.watch} / 100</b><Bar value={pv.watch} color="var(--calm)" h={5}/></div>
      </div>
      <div className="battle-turns battle-turns-full"><span>この遭遇の介入 {pv.turns} / {pv.maxTurns}</span>{pv.cooldownMs>0&&<b>あと {cdSec} 秒</b>}</div>
      <div className="battle-note">{pv.mod.note}</div>
      <div className="battle-actions battle-actions-full">{actions.map(function(a){return <BattleActionButton key={a.id} action={a} disabled={disabled} onClick={doAction}/>;})}</div>
      {pv.mod.blocked&&<button className="btn btn-g battle-care-btn" onClick={p.onCare}>かなに水を持ってきてもらう</button>}
      {result&&<div className={"battle-result"+(result.ok?" battle-result-ok":" battle-result-ng")+(result.reached100?" battle-result-reached":"")}>
        {result.reached100&&<div className="battle-reached-banner">✨ 問いが届いた</div>}
        <b>{result.msg||"結果"}</b>{(result.lines||[]).map(function(l,i){return <p key={i}>{l}</p>;})}
        <div className="battle-result-toyman">
          <span className="isc-dot cd-toyman"/>
          <span>{result.reached100?"「届いた。持ち帰る」":result.ok?"「まだ落としていない」":"「今日は、引き返す。また来る」"}</span>
        </div>
      </div>}
    </div>
  );
}

function NowSceneView(p){
  var watchGauge=p.watchGauge||0;
  var game=p.game;
  var [loc,setLoc]=useState(null);
    var [charPos,setCharPos]=useState({});
  var [bubble,setBubble]=useState(null);
  var [micro,setMicro]=useState(null);
  var [toyFight,setToyFight]=useState(false);
  var [sceneEvent,setSceneEvent]=useState(null);
  var [clickPop,setClickPop]=useState(null);
  var [careTarget,setCareTarget]=useState(null);
  var [careResult,setCareResult]=useState(null);
  var [pressureOpen,setPressureOpen]=useState(false);
  var [pressureResult,setPressureResult]=useState(null);
  var [letterResult,setLetterResult]=useState(null);
  var watchCdRef=useRef(0);
  var gameRef=useRef(null),locRef=useRef(null),sceneEvRef=useRef(null);
  useEffect(function(){gameRef.current=game;},[game]);
  useEffect(function(){locRef.current=loc;},[loc]);
  useEffect(function(){sceneEvRef.current=sceneEvent;},[sceneEvent]);

  /* 初期化 */
  useEffect(function(){
    var openPlaces=getUnlockedPlaceKeys(game);
    var il=pickBestLoc(game)||openPlaces[0]||"starting_room";
    if(openPlaces.indexOf(il)===-1)il=openPlaces[0]||"starting_room";
    if(!game.world.map[il])il="starting_room";
    setLoc(il);
    setCharPos(genCharPos(game,il));
  },[]);
  useEffect(function(){
    var tl=p.targetLoc;
    var openPlaces=getUnlockedPlaceKeys(game);
    if(tl&&game.world.map[tl]&&openPlaces.indexOf(tl)!==-1&&tl!==loc){
      setLoc(tl);
      setCharPos(genCharPos(game,tl));
    }
  },[p.targetLoc,game]);


  /* キャラ位置は固定スロット。ドリフトは行わない。 */

  /* v5.28: 完全手動切替。自動カメラは廃止。 */
  useEffect(function(){
    if(!loc)return;
    setCharPos(genCharPos(gameRef.current,loc));
  },[loc]);

  /* 吹き出し 8秒ごと */
  useEffect(function(){
    if(!loc)return;
    var t=setInterval(function(){
      var here=getCharsAtLoc(gameRef.current,locRef.current);if(!here.length)return;
      var id=pick(here),text=pick(SHORT_LINES[id]||["……"]);
      setBubble({id:id,text:text});
      setTimeout(function(){setBubble(null);},3800);
    },8000);
    return function(){clearInterval(t);};
  },[loc]);

  /* 戦闘フラッシュ 14秒ごと */
  useEffect(function(){
    var t=setInterval(function(){
      var g=gameRef.current;if(!g)return;
      if(g.characters.toyman.lastAction==="exploring"&&Math.random()<0.28){
        setToyFight(true);setTimeout(function(){setToyFight(false);},3200);
      }
    },14000);
    return function(){clearInterval(t);};
  },[]);

  /* シーンイベント 18秒ごと — start→action→result→消える */
  useEffect(function(){
    var t=setInterval(function(){
      var g=gameRef.current,lc=locRef.current;
      if(!g||!lc)return;
      if(sceneEvRef.current)return;
      var ev=genSceneEvent(g,lc);
      if(!ev)return;
      setSceneEvent(ev);
      setTimeout(function(){setSceneEvent(function(prev){return prev?Object.assign({},prev,{phase:"action"}):null;});},1800);
      setTimeout(function(){setSceneEvent(function(prev){return prev?Object.assign({},prev,{phase:"result"}):null;});},4000);
      setTimeout(function(){setSceneEvent(null);},6500);
    },18000);
    return function(){clearInterval(t);};
  },[]);
  useEffect(function(){
    if(!loc)return;
    var t=setInterval(function(){
      var here=getCharsAtLoc(gameRef.current,locRef.current);if(!here.length)return;
      var id=pick(here),act=pick(MICRO[id]||["静かにしている"]);
      setMicro(NAMES[id]+"は"+act+"。");
      setTimeout(function(){setMicro(null);},4200);
    },13000);
    return function(){clearInterval(t);};
  },[loc]);

  if(!loc)return null;

  /* クリック結果ポップ */
  function flashPop(lines,xPct,yPct){setClickPop({lines:lines,x:xPct,y:yPct,id:Date.now()});setTimeout(function(){setClickPop(null);},1500);}
  /* 明示ボタンから見守る — 背景タップはなくした */
  function handleWatch(){var nowT=Date.now();if(nowT-watchCdRef.current<1200)return;watchCdRef.current=nowT;var ok=true;if(p.onWatch)ok=p.onWatch(loc);if(ok!==false)flashPop(["この場所を見守った","見守りゲージ +"+(p.watchGauge<100?10:0)],50,32);}
  /* 背景タップは無効化（ノードも同様） */
  function handleStageClick(){}
  function handleClickLetter(facility,letterId){var r=p.onClickLetter&&p.onClickLetter(facility,letterId);if(r){setLetterResult(r);setTimeout(function(){setLetterResult(null);},5200);}}
  /* キャラタップで声を聞く */
  var CHAR_LINES={toyman:"まだ見てない",kana:"水、飲む？",utsuro:"預かる",kotae:"記録しておく",auditor:"……保留だ"};
  function handleCharClick(id){
    var line=CHAR_LINES[id]||"……";
    setBubble({id:id,text:line});
    setCareTarget(id);
    setCareResult(null);
    setTimeout(function(){setBubble(null);},3200);
  }
  function chooseCare(mode){
    if(!careTarget)return;
    var r=null;
    if(p.onCharCare)r=p.onCharCare(careTarget,mode);
    if(r&&r.ok){
      setCareResult({mode:mode,msg:r.msg,sub:r.sub,at:Date.now()});
    }else if(r){
      setCareResult({mode:"ng",msg:r.msg,sub:r.sub,at:Date.now()});
    }
  }

  if(!loc||!game.world||!game.world.map||!game.world.map[loc]){
    return <div className="now-wrap"><div className="now-safe">様子を読み込み中です。</div></div>;
  }
  var sbg=SBGCOL[loc]||SBGCOL.starting_room;
  var here=getCharsAtLoc(game,loc);
  var locMap=game.world.map[loc]||{};
  var locLv=locMap.level||1,locPct=Math.max(0,Math.min(100,Math.round((locMap.progress_rate||0)*100))),locToNext=Math.max(0,100-locPct);
  var nextLvName=getPlaceLvName(loc,locLv+1);
  var benefits=PLACE_BENEFITS[loc]||[];
  var activeEmber=getActiveEmber(game);
  var emberAtLoc=activeEmber&&getEmberPlace(activeEmber)===loc;
  var battleCard=getToymanBattleEmber(game);
  var canBattle=loc==="unexplored_forest"&&battleCard&&game.characters.toyman.lastAction==="exploring";

  /* 次に起きそうな変化ランキング */
  var upcomingChanges=PKEYS.map(function(k){
    var m=game.world.map[k]||{};var lv=m.level||1,pct=Math.round((m.progress_rate||0)*100);
    return{key:k,name:PSHORT[k],toNext:100-pct,lv:lv,nextLvName:getPlaceLvName(k,lv+1),nextEff:PLACE_NEXT_EFFECT[k]||""};
  }).filter(function(x){return x.toNext>0&&x.toNext<100;}).sort(function(a,b){return a.toNext-b.toNext;}).slice(0,3);

  return(
    <div className="now-wrap">
      {/* 現在進行中の残り火 — 最上部に移動（提案③：残り火ジャーニーを最優先表示） */}
      {activeEmber&&<div className={"now-ember-panel nep-top"+(emberAtLoc?" nep-here":"")}>
        <div className="nep-head">処理中の残り火</div>
        <div className="nep-title">「{makeEmberTitle(activeEmber)}」</div>
        {activeEmber.feeling&&<div className="nep-feeling">感情：{activeEmber.feeling}</div>}
        {activeEmber.wanted&&<div className="nep-feeling">本当は：{activeEmber.wanted}</div>}
        <div className="nep-status">
          <span className={"nd cd-"+(EMBER_STATUS[activeEmber.status]&&EMBER_STATUS[activeEmber.status].who||"kotae")}/>
          <span className="nep-where">{EMBER_STATUS[activeEmber.status]&&EMBER_STATUS[activeEmber.status].label}</span>
          <span className="nep-pct">{Math.round(activeEmber.progress||0)}%</span>
        </div>
        <Bar value={activeEmber.progress||0} color="var(--ember)" h={4}/>
        <div className="nep-next">あと{Math.max(0,100-Math.round(activeEmber.progress||0))}%で、{getEmberNextLabel(activeEmber.status)}</div>
        {activeEmber.pendingQuestion&&activeEmber.pendingQuestion.question&&<div className="nep-question">問い：{activeEmber.pendingQuestion.question}</div>}
      </div>}

      {/* ヘッダー */}
      <div className="now-hdr">
        <div>
          <span className="now-loc-nm">{PNAME[loc]}</span>
          <span className="now-loc-lv"> Lv.{locLv}「{getPlaceLvName(loc,locLv)}」</span>
        </div>
      </div>

      {/* 場所進捗バー */}
      <div className="now-locbar">
        <div className="now-locbar-inner">
          <div className="now-locbar-fill" style={{width:locPct+"%",background:PCOL(loc)}}/>
        </div>
        <div className="now-locbar-info">
          <span className="now-locbar-pct">{locPct}%</span>
          {locToNext>0&&locToNext<100&&<span className="now-locbar-next">あと{locToNext}%で Lv.{locLv+1}「{nextLvName}」</span>}
        </div>
      </div>

      {/* いまのようす：場所内部MAP */}
      <div className="stage-box scene-map-shell" style={{background:sbg.bg}}>
        <InternalPlaceMap
          loc={loc}
          game={game}
          here={here}
          bubble={bubble}
          toyFight={toyFight}
          clickPop={clickPop}
          micro={micro}
          handleCharClick={handleCharClick}
          handleStageClick={handleStageClick}
          handlePressureClick={function(){setPressureOpen(true);setPressureResult(null);}}
          onClickLetter={handleClickLetter}
        />
      </div>

      {/* タッチ説明（ステージ外） */}
      {/* アクション行：見守る（明示ボタン）＋キャラ説明 */}
      <div className="now-action-bar">
        {(function(){
          var mt=getMapTouchInfo(game);
          var canWatch=mt.cur>0;
          return <><button className={"now-watch-btn"+(canWatch?"":" now-watch-disabled")} disabled={!canWatch} onClick={handleWatch}>
            {canWatch?"この場所を見守る":"見守り回数なし（回復中）"}
            <span className="now-watch-sub">{canWatch?"MAP操作 -1 → 見守りゲージ ＋":"あと"+mt.minToNext+"分で回復"}</span>
          </button><span className="watch-charges">見守りあと {(game.mapTouch&&game.mapTouch.cur)||0} 回（1時間ごとに回復）</span></>;
        })()}
        <span className="now-char-hint">キャラ →タップで声を聞く</span>
      </div>
      <div className="now-locs now-locs-safe">
        {getUnlockedPlaceKeys(game).map(function(k){
          var cnt=getCharsAtLoc(game,k).length;
          var fires=getEmbersAtPlace(game,k).length;
          var em=(activeEmber&&getEmberPlace(activeEmber)===k);
          return(
            <button key={k} className={"now-lb"+(loc===k?" nlb-on":"")}
              onClick={function(){setLoc(k);setCharPos(genCharPos(game,k));}}>
              {PSHORT[k]}{cnt>0&&<span className="nlb-cnt">{cnt}</span>}
              {fires>0&&<span className="nlb-fire">🔥{fires}</span>}
              {em&&<span className="nlb-ember">◆</span>}
            </button>
          );
        })}
      </div>

      {/* 気配 */}
      {(function(){var atm=getAtmosphere(game);return atm.length>0&&<div className="now-atm">{atm.map(function(h,i){return <span key={i} className="now-atm-h">・{h}</span>;})}</div>;})()}
      {letterResult&&(function(){
        var ec=letterResult.emberCtx;
        return(
          <div className="lrp-overlay" onClick={function(){setLetterResult(null);}}>
            <div className="lrp-overlay-inner" onClick={function(e){e.stopPropagation();}}>
              <div className="lrp-overlay-title">{letterResult.stored?"手紙が保管庫に届きました":"手紙が次の場所へ進みました"}</div>
              <div className="lrp-overlay-route">{letterResult.from} → {letterResult.to}</div>
              {letterResult.fireGain>0&&<div className="lrp-overlay-change">📬 残り火の回収率 +{letterResult.fireGain}%</div>}
              {ec&&ec.progress>0&&<div className="lrp-overlay-change">「{ec.title}」の回収率：{ec.progress}%（100%で問いが届く）</div>}
              <div className="lrp-overlay-gain">見守り +{letterResult.gained||1}</div>
              <div className="lrp-overlay-hint">タップで閉じる</div>
            </div>
          </div>
        );
      })()}


      {/* 現在進行中の残り火 — 上部に移動済み */}

      {canBattle&&<BattleEntryPanel game={game} onOpen={function(){p.onOpenBattle&&p.onOpenBattle();}}/>}

      {/* この場所を進めると */}
      {benefits.length>0&&<div className="now-benefits">
        <div className="now-benefits-head">この場所を進めると</div>
        {benefits.map(function(b,i){return <div key={i} className="now-benefit-row">・{b}</div>;})}
        {PLACE_NEXT_EFFECT[loc]&&<div className="now-benefit-row now-benefit-eff">次のLvで：{PLACE_NEXT_EFFECT[loc]}</div>}
      </div>}

      {/* 次に起きそうな変化 */}
      {upcomingChanges.length>0&&<div className="now-upcoming">
        <div className="now-upcoming-head">次に起きそうな変化</div>
        {upcomingChanges.map(function(uc,i){return(
          <div key={i} className="now-upcoming-row">
            <span className={"now-uc-dot cd-"+uc.key}/>
            <span className="now-uc-name">{uc.name}</span>
            <span className="now-uc-soon">あと{uc.toNext}%で Lv.{uc.lv+1}</span>
            {uc.nextEff&&<span className="now-uc-eff">{uc.nextEff}</span>}
          </div>
        );})}
      </div>}

      {/* 工程 */}
      <div className="now-stage-panel">
        <div className="nsp-head">
          <span className="nsp-title">工程</span>
          <span className="nsp-pred">→ {getScenePrediction(loc,game)}</span>
        </div>
        {getPlaceStages(loc,game.world.map[loc]?game.world.map[loc].progress_rate:0).map(function(st,i){
          return(
            <div key={i} className={"nsp-row"+(st.done?" nsp-done":st.active?" nsp-cur":"")}>
              <span className="nsp-nm">{st.name}</span>
              <div className="nsp-bar">{(st.done||st.active)&&<Bar value={st.fp} color={st.done?"var(--calm)":PCOL(loc)} h={2}/>}</div>
              <span className="nsp-st">{st.done?"✓":st.active?st.fp+"%":"—"}</span>
            </div>
          );
        })}
      </div>

      <div className="now-prog">
        <span>干渉ポイント {game.ip?game.ip.cur:0}</span>
        <span className="np-sep">|</span>
        {(function(){var mt=getMapTouchInfo(game);return <span className="now-wg">MAP操作 {mt.cur}/{mt.max}{mt.cur<=0?"・次"+mt.minToNext+"分":""}</span>;})()}
        <span className="np-sep">|</span>
        <span className="now-wg">見守り {watchGauge}%</span>
        <span className="np-sep">|</span>
        <span className="now-wg">✉保管 {(game.mailArchive&&game.mailArchive[loc])||0}</span>
        {(function(){var d=getPlaceDelta(game,loc,"prev");return(d&&d>0.003)?<span className="now-delta">+{Math.round(d*100)}%↑</span>:null;})()}
      </div>

      {careTarget&&((function(){
        var c=game.characters[careTarget];
        var st=c&&c.stats?c.stats:{};
        var abilityKey=UKEY[careTarget];
        var abilityVal=st[abilityKey]!==undefined?st[abilityKey]:0;
        var ipCur=game.ip?game.ip.cur:0;
        return(
          <div className="care-pop-ov care-center-ov" onClick={function(){setCareTarget(null);setCareResult(null);}}>
            <div className="care-pop care-dock" onClick={function(e){e.stopPropagation();}}>
              <div className="care-pop-h">
                <span className={"care-pop-dot cd-"+careTarget}/>
                <div>
                  <div className="care-pop-name">{NAMES[careTarget]}</div>
                  <div className="care-pop-sub">干渉ポイント：{ipCur} / {game.ip?game.ip.max:0}</div>
                </div>
                <button className="care-x" onClick={function(){setCareTarget(null);setCareResult(null);}}>×</button>
              </div>

              <div className="care-stat-box">
                <div className="care-stat-row">
                  <span>疲労</span>
                  <div className="care-gauge"><i style={{width:Math.max(0,Math.min(100,st.fatigue||0))+"%"}}/></div>
                  <b>{Math.round(st.fatigue||0)}</b>
                </div>
                <div className="care-stat-row good">
                  <span>安定</span>
                  <div className="care-gauge"><i style={{width:Math.max(0,Math.min(100,st.stability||0))+"%"}}/></div>
                  <b>{Math.round(st.stability||0)}</b>
                </div>
                {abilityKey&&careTarget!=="auditor"&&<div className="care-stat-row ability">
                  <span>{ULABEL[careTarget]||"能力"}</span>
                  <div className="care-gauge"><i style={{width:Math.max(0,Math.min(100,abilityVal))+"%"}}/></div>
                  <b>{Math.round(abilityVal)}</b>
                </div>}
              </div>

              <div className="care-change-preview">
                <div><b>応援</b><span>安定 +6 / 疲労 +2 / {ULABEL[careTarget]||"能力"} +1</span></div>
                <div><b>休息</b><span>疲労 -10 / 安定 +2</span></div>
              </div>

              {careTarget==="toyman"&&<div className="toyman-move-box">
                <div className="toyman-move-head">トイマン専用</div>
                <div className="toyman-move-actions">
                  <button className="toyman-move-btn" disabled={toNK(game.characters.toyman.location)==="unexplored_forest"||!(game.emberCards||[]).some(function(c){return c.unitState==="exploring";})} onClick={function(){
                    var r=p.onToymanMove&&p.onToymanMove("forest");
                    if(r)setCareResult({mode:r.ok?"move":"ng",msg:r.msg,sub:r.sub,goLoc:r.goLoc,at:Date.now()});
                  }}>未受領の森に出発</button>
                  <button className="toyman-move-btn" disabled={toNK(game.characters.toyman.location)==="starting_room"} onClick={function(){
                    var r=p.onToymanMove&&p.onToymanMove("home");
                    if(r)setCareResult({mode:r.ok?"move":"ng",msg:r.msg,sub:r.sub,goLoc:r.goLoc,at:Date.now()});
                  }}>はじまりの部屋へ帰還</button>
                </div>
              </div>}

              <div className="care-pop-actions">
                <button className="care-btn care-support" disabled={ipCur<1} onClick={function(){chooseCare("support");}}>
                  応援する
                  <small>1IP消費 / 連続で押せます</small>
                </button>
                <button className="care-btn care-rest" disabled={ipCur<1} onClick={function(){chooseCare("rest");}}>
                  休息する
                  <small>1IP消費 / 連続で押せます</small>
                </button>
              </div>

              {careResult&&<div className={"care-result care-result-"+careResult.mode}>
                <b>{careResult.msg}</b>
                <span>{careResult.sub}</span>
                {careResult.goLoc&&<button className="care-goto-btn" onClick={function(){
                  setLoc(careResult.goLoc);
                  setCharPos(genCharPos(game,careResult.goLoc));
                  setCareTarget(null);
                  setCareResult(null);
                }}>{PNAME[careResult.goLoc]}を見る</button>}
              </div>}
              {ipCur<1&&<div className="care-noip">IPが足りません。これ以上は干渉できません。</div>}
            </div>
          </div>
        );
      })())}


      {pressureOpen&&((function(){
        var a=game.characters.auditor||{};
        var st=a.stats||{};
        var ipCur=game.ip?game.ip.cur:0;
        var limit=st.pressureLimit===undefined?100:st.pressureLimit;
        function doPressure(mode){
          var r=p.onPressureAction&&p.onPressureAction(mode);
          if(r)setPressureResult({mode:mode,msg:r.msg,sub:r.sub,at:Date.now()});
        }
        return(
          <div className="pressure-pop-ov" onClick={function(){setPressureOpen(false);setPressureResult(null);}}>
            <div className="pressure-pop" onClick={function(e){e.stopPropagation();}}>
              <div className="pressure-head">
                <div>
                  <div className="pressure-k">圧力干渉</div>
                  <div className="pressure-title">審査官ではなく、圧力に触れる</div>
                </div>
                <button className="care-x" onClick={function(){setPressureOpen(false);setPressureResult(null);}}>×</button>
              </div>
              <div className="pressure-meter">
                <div className="pressure-meter-top"><span>圧力</span><b>{Math.round(st.pressure||0)} / {limit}</b></div>
                <div className="care-gauge pressure-gauge"><i style={{width:Math.max(0,Math.min(100,((st.pressure||0)/Math.max(1,limit))*100))+"%"}}/></div>
              </div>
              <div className="pressure-actions">
                <button className="pressure-btn" disabled={ipCur<1} onClick={function(){doPressure("recognize");}}>
                  認知する
                  <small>1IP / 圧力 -1</small>
                </button>
                <button className="pressure-btn hold" disabled={ipCur<2} onClick={function(){doPressure("hold");}}>
                  保留する
                  <small>2IP / 保留上限 +1</small>
                </button>
              </div>
              {pressureResult&&<div className={"care-result pressure-result pressure-result-"+pressureResult.mode}>
                <b>{pressureResult.msg}</b>
                <span>{pressureResult.sub}</span>
              </div>}
              {ipCur<1&&<div className="care-noip">IPが足りません。圧力には干渉できません。</div>}
            </div>
          </div>
        );
      })())}
    </div>
  );
}


var GLOSSARY=[
  {term:"残り火",read:"のこりび",desc:"書いたあとに、まだ何かが残っている感覚のこと。読まれなかった記事、反応のなかった投稿、消せない下書き——形は違っても、火はまだそこにある。"},
  {term:"火",read:"ひ",desc:"感情の核にあるもの。「何かになりたかった」「届いてほしかった」という、まだ消えていない願いや痛みのこと。"},
  {term:"影",read:"かげ",desc:"「どうせ意味がない」「なかったことにすればいい」という内側の声。影は敵ではなく、まだ諦めていない証でもある。"},
  {term:"トイマン",read:"とよまん",desc:"あなたの代わりに残り火を探しに行くキャラクター。答えは持ち帰らない。問いの欠片だけを拾って戻ってくる。"},
  {term:"未受領の森",read:"みじゅりょうのもり",desc:"まだ受け取られていない感情が漂う場所。トイマンはここを歩き回り、影と向き合いながら道を切り拓く。"},
  {term:"問い",read:"とい",desc:"探索の末に見つかる言葉。答えではなく、次に自分に向ける問いかけ。「本当は何になってほしかった？」のような形をしている。"},
  {term:"受領証",read:"じゅりょうしょう",desc:"残り火を受け取ったことの記録。「あった」という証明。消したり、なかったことにするためではなく、ただ受け取るために作られる。"},
  {term:"見守り",read:"みまもり",desc:"あなたがトイマンに関わることで生まれるポイント。放っておいてもいいし、一緒に進んでもいい。"},
];
function GlossaryModal(p){
  return <div className="ov" onClick={p.onClose}><div className="bsh glossary-modal" onClick={function(e){e.stopPropagation();}}>
    <div className="sh-handle"/>
    <div className="glossary-title">用語について</div>
    <p className="glossary-sub">このゲームで使われる言葉の意味です。</p>
    <div className="glossary-list">
      {GLOSSARY.map(function(g){return(
        <div key={g.term} className="glossary-item">
          <div className="glossary-term">{g.term}<span className="glossary-read">（{g.read}）</span></div>
          <p className="glossary-desc">{g.desc}</p>
        </div>
      );})}
    </div>
    <button className="btn btn-g" style={{width:"100%",marginTop:16}} onClick={p.onClose}>閉じる</button>
  </div></div>;
}
function HomeView(p){
  var game=p.game;
  var [showGlossary,setShowGlossary]=useState(false);
  var cards=game.emberCards||[];
  var active=cards.find(function(c){return c.status!=="ready"&&c.status!=="awaiting";})||cards[0]||null;
  var ready=cards.find(function(c){return c.status==="ready";});
  var openPlaces=getUnlockedPlaceKeys(game).filter(function(k){return game.unlocks&&game.unlocks.places&&game.unlocks.places[k];});
  var next=getNextAction(game);
  var philQ=getPhilosophicalQuestion(game);
  var isExploringNow=active&&active.unitState==="exploring";
  var nextText=ready?"受け取れる残り火があります。":active?"「"+makeEmberTitle(active)+"」を見守っています。":"まずは、ひとつだけ置いてみてください。";
  return <div className="scroll home-screen">
    {showGlossary&&<GlossaryModal onClose={function(){setShowGlossary(false);}}/>}
    <section className="home-hero">
      {cards.length===0&&(game.receipts||[]).length===0&&<div className="home-firstguide">
        <div className="hfg-line"><span className="isc-dot cd-toyman hfg-dot"/><span>トイマン：「置かれたら、迎えに行く」</span></div>
        <p>「残り火」は、書いたあとに何かが残ったときに預ける場所です。<br/>まず「残り火を置く」を押してみてください。</p>
      </div>}
      <div className="home-hero-top">
        <div className="home-kicker">今日のひとつ</div>
        <button className="glossary-btn" onClick={function(){setShowGlossary(true);}}>？ 用語</button>
      </div>
      <h2>{nextText}</h2>
      {!active&&!ready&&<p>ここは、書いたあとに残ってしまったものを、なかったことにしないための場所です。</p>}
      {active&&<p>箱庭は、この残り火を消さずに扱っています。急がなくていい。まず、届いていることを確認します。</p>}
      <div className="home-actions">
        {!active&&!ready&&<button className={"btn btn-p"+(next&&next.action==="create"?" btn-next-action":"")} onClick={p.onCreate}>残り火を置く</button>}
        {(active||ready)&&<button className={"btn btn-p"+(next&&next.screen==="ember"?" btn-next-action":"")} onClick={function(){p.onNav&&p.onNav("ember");}}>残り火を見る</button>}
        {openPlaces.length>0&&<button className="btn btn-g" onClick={function(){p.onNav&&p.onNav("peek");}}>箱庭を見る</button>}
      </div>
    </section>
    {active&&<section className="home-card"><div className="lh">いま動いている残り火</div><div className="home-fire-title">「{makeEmberTitle(active)}」</div><DeliveredWordsBox card={active} compact={true}/><div className="home-fire-foot">{getEmberUnitLabel(active)} / {Math.round(active.progress||0)}%</div>{(active.status==="awaiting"||active.unitState==="waiting")&&<div className="home-depart-box"><div className="hdb-title">出発待ち</div><p>出発させることで、トイマンがあなたの「{makeEmberTitle(active)}」を探しに行きます。見つけるのは答えではなく、問いの欠片です。</p><button className={"btn btn-p touchable"+(next&&next.action==="depart"?" btn-next-action":"")} onClick={function(){p.onDepart&&p.onDepart(active.id);}}>トイマンを未受領の森に出発させる</button></div>}</section>}
    <section className="home-card home-char-voice-card">{(function(){
      if(!active)return <><div className="lh">トイマンのひとこと</div><p className="home-line">「置かれたら、拾いに行く」</p></>;
      var p=active.progress||0;
      var isExploring=active.unitState==="exploring";
      var isWaiting=active.status==="awaiting"||active.unitState==="waiting";
      var isReady=active.status==="ready";
      if(isReady)return <><div className="lh">トイマンのひとこと</div>
        <div className="home-char-lines">
          <div className="home-char-line"><div className="home-cv-namerow"><span className="isc-dot cd-toyman home-cv-dot"/><span className="home-cv-name">トイマン</span></div><span className="home-cv-say">「全部、持ち帰った」</span></div>
          <div className="home-char-line"><div className="home-cv-namerow"><span className="isc-dot cd-kana home-cv-dot"/><span className="home-cv-name">かな</span></div><span className="home-cv-say">「受け取れるよ。今」</span></div>
        </div></>;
      if(isWaiting)return <><div className="lh">トイマンのひとこと</div>
        <div className="home-char-lines">
          <div className="home-char-line"><div className="home-cv-namerow"><span className="isc-dot cd-toyman home-cv-dot"/><span className="home-cv-name">トイマン</span></div><span className="home-cv-say">「出発の準備ができている」</span></div>
          <div className="home-char-line"><div className="home-cv-namerow"><span className="isc-dot cd-toyman home-cv-dot"/><span className="home-cv-name">トイマン</span></div><span className="home-cv-say">「いつでも行ける」</span></div>
        </div></>;
      if(isExploring){var sc=getEmberExploreScene(active);var sl=sc.slice(0,2);return <><div className="lh">箱庭の今</div>
        <div className="home-char-lines">
          {sl.map(function(L,i){return <div key={i} className="home-char-line"><div className="home-cv-namerow"><span className={"isc-dot cd-"+L.s+" home-cv-dot"}/><span className="home-cv-name">{NAMES[L.s]||L.s}</span></div><span className="home-cv-say">「{L.t}」</span></div>;})}
        </div></>;
      }
      return <><div className="lh">トイマンのひとこと</div><p className="home-line">「まだ落としてない」</p></>;
    })()}</section>
    {p.utsuroEvent&&<section className="home-card home-utsuro-event" onClick={p.onUtsuroFound}>
      <div className="lh">うつろより</div>
      <div className="uev-line"><span className="isc-dot cd-utsuro uev-dot"/>
        <p className="uev-say">「一通、見当たらない……」</p></div>
      <p className="uev-hint">タップして探す</p>
    </section>}
    {p.kotaeStuck&&<section className="home-card home-kotae-stuck" onClick={p.onKotaeResume}>
      <div className="lh">コタエより</div>
      <div className="uev-line"><span className="isc-dot cd-kotae uev-dot"/>
        <p className="uev-say">「……これは、すぐには記録できない」</p></div>
      <p className="uev-hint">タップして続ける</p>
    </section>}
    <section className="home-card home-q-card" onClick={p.onPhilAnswer} style={{cursor:"pointer"}}>
      <div className="lh">今の問い <span className="home-q-depth">深度 {philQ.depth}</span></div>
      <p className="home-q-text">「{philQ.text}」</p>
      <p className="home-q-note">{(game.questionAnswers||[]).length>0?"答えると、問いはさらに深くなる。":"答えなくても、世界は進む。答えれば、問いが深まる。"}</p>
    </section>
    {(function(){
      var rs=game.receipts||[];
      if(rs.length===0)return null;
      /* 最も深く汲み取られた残り火（同率なら最新）を、ホームの前面に */
      var top=rs[0],topStage=getReceiptCherishStage(rs[0],game);
      rs.forEach(function(r){var st=getReceiptCherishStage(r,game);if(st>topStage){topStage=st;top=r;}});
      var ins=getEmberInsight(top,game);
      return <section className="home-card home-cherish-card" onClick={function(){p.onNav&&p.onNav("ember");}} style={{cursor:"pointer"}}>
        <div className="lh">大切にされている残り火 <span className="home-cherish-tag">{ins.label}</span></div>
        <div className="home-fire-title">「{top.title}」</div>
        <p className="home-cherish-line">{ins.text}</p>
        <span className="home-cherish-dots">{[0,1,2,3,4].map(function(i){return <span key={i} className={"ec-dot"+(i<=ins.stage?" ec-dot-on":"")}/>;})}</span>
      </section>;
    })()}
    {isExploringNow&&<section className="home-card home-send-card">
      <div className="lh">トイマンへ送る</div>
      <p className="home-send-note">探索中のトイマンに、何かを届けられます。</p>
      <button className="btn btn-g home-send-btn" onClick={function(){p.onSendGift&&p.onSendGift();}}>送る</button>
    </section>}
    {cards.length>=3&&<section className="home-card">
      <div className="home-char-lines">
        <div className="home-char-line"><div className="home-cv-namerow"><span className="isc-dot cd-kana home-cv-dot"/><span className="home-cv-name">かな</span></div><span className="home-cv-say">「たくさん、預けてくれてるね。……全部、ちゃんと感じてる」</span></div>
      </div>
    </section>}
    <section className="home-card"><div className="lh">開いた場所</div>{openPlaces.length>0?<div className="home-place-list">{openPlaces.map(function(k){return <button key={k} className="home-place" onClick={function(){p.onOpenPlace&&p.onOpenPlace(k);}}><b>{PNAME[k]||PSHORT[k]}</b><span>{getPlaceUnlockReason(k)}</span></button>;})}</div>:<div className="closed-place-note">まだ閉じている場所があります。残り火を預けることで、少しずつ開きます。</div>}</section>
    <ClosedPlacesPreview game={game}/>
    <section className="home-card home-today-end-section">
      <div className="lh">今日はここまで</div>
      <p>無理に続けなくていい。今日見た分は、ちゃんと残ります。</p>
      <button className="btn btn-g home-today-btn" onClick={function(){p.onTodayEnd&&p.onTodayEnd();}}>今日はここで閉じる</button>
    </section>
    <div className="home-version">残り火の箱庭</div>
  </div>;
}
function ClosedPlacesPreview(p){
  var game=p.game;
  ensureProgressiveUnlockShell(game);
  var closed=PKEYS.filter(function(k){return !(game.unlocks.places&&game.unlocks.places[k]);});
  if(!closed.length)return null;
  return <section className="home-card closed-places"><div className="lh">閉じている場所</div><div className="closed-grid">{closed.map(function(k){return <span key={k}>□ {PSHORT[k]}</span>;})}</div><p>残り火を預けることで、必要な場所から開きます。</p></section>;
}

/* ── メインApp ── */
function App(){
  var [screen,setScreen]=useState("loading");
  var [game,setGame]=useState(null);
  var [digest,setDigest]=useState(null);
  var [first,setFirst]=useState(false);
  var [toast,setToast]=useState("");
  var [devOpen,setDevOpen]=useState(false);
  var [live,setLive]=useState([]);
  var [prog,setProg]=useState({toyman:0,kana:0,utsuro:0,kotae:0});
  
  var nextAction=game?getNextAction(game):null;
  var [expanded,setExpanded]=useState(null);
  var [viewConv,setViewConv]=useState(null);
  var [peekMode,setPeekMode]=useState("scene");var [peekTargetLoc,setPeekTargetLoc]=useState(null);var [intvConfig,setIntvConfig]=useState({target:"auto",tier:null,key:0});var [showCreate,setShowCreate]=useState(false);var [receiveTargetId,setReceiveTargetId]=useState(null);var [departTargetId,setDepartTargetId]=useState(null);var [burnTargetId,setBurnTargetId]=useState(null);var [receiptAcceptance,setReceiptAcceptance]=useState(null);
  var gameRef=useRef(null),toastRef=useRef(null);
  var [watchGauge,setWatchGauge]=useState(0);var wgRef=useRef({gauge:0,last:{}});var [returnConvId,setReturnConvId]=useState(null);var [witnessTargetId,setWitnessTargetId]=useState(null);var [sendGiftOpen,setSendGiftOpen]=useState(false);var [utsuroEventActive,setUtsuroEventActive]=useState(false);var [closingPreview,setClosingPreview]=useState(null);var [philAnswerOpen,setPhilAnswerOpen]=useState(false);var [kotaeStuck,setKotaeStuck]=useState(false);
  var [saveError,setSaveError]=useState(false);
  useEffect(function(){gameRef.current=game;},[game]);

  useEffect(function(){var saved=loadSave();if(saved){setGame(migrateGame(saved));setFirst(false);}else{var f=initGame();setGame(f);setFirst(true);persistSave(f);}setScreen("closed");},[]); // eslint-disable-line

  useEffect(function(){
    if(screen==="loading"||screen==="closed")return;
    var pt=setInterval(function(){var g=gameRef.current;if(!g)return;setProg(function(prev){var next=Object.assign({},prev);CHAR_IDS.forEach(function(id){next[id]=(prev[id]||0)+(ASPD[g.characters[id].lastAction]||2);if(next[id]>=100)next[id]=0;});return next;});},5000);
    var et=setInterval(function(){var g=gameRef.current;if(!g)return;var ev=genLiveEvent(g);setLive(function(prev){return [{text:ev.text,kind:ev.kind,time:nowISO()}].concat(prev).slice(0,40);});setGame(function(prev){if(!prev)return prev;var ns=ev.su?applyLU(prev,ev.su):cloneS(prev);maybeSpawnToymanDiscoveryLetter(ns);tickLettersAmbient(ns);return ns;});},22000);
    var it=setInterval(function(){setGame(function(prev){if(!prev||!prev.ip)return prev;var ni=calcIP(prev,nowISO());var mtState=ensureMapTouchCharges(prev);if(ni.cur===prev.ip.cur&&JSON.stringify(mtState.mapTouch||{})===JSON.stringify(prev.mapTouch||{}))return prev;return Object.assign({},prev,{ip:ni,mapTouch:mtState.mapTouch});});},10000);
    return function(){clearInterval(pt);clearInterval(et);clearInterval(it);};
  },[screen]);
  useEffect(function(){if(screen!=="loading"&&screen!=="closed"){addWatchGauge("sc_"+screen,8);}},[ screen,addWatchGauge]);

  var showToast=useCallback(function(msg){setToast(msg);if(toastRef.current)clearTimeout(toastRef.current);toastRef.current=setTimeout(function(){setToast("");},2600);},[]);
  useEffect(function(){
    setSaveFailHandler(function(){
      setSaveError(true);
      showToast("保存に失敗しました。ブラウザの設定（プライベートモード・容量）をご確認ください。");
    });
    setSaveOkHandler(function(){
      setSaveError(function(prev){return prev?false:prev;});
    });
    return function(){setSaveFailHandler(null);setSaveOkHandler(null);};
  },[showToast]);
  var receiveEmberCb=useCallback(function(id){if(!game)return;setWitnessTargetId(id);},[game]);
  var sendGiftCb=useCallback(function(gift){if(!game)return;var ns=cloneS(game);var t=ns.characters.toyman;if(gift.type==="water"){t.stats.fatigue=Math.max(0,(t.stats.fatigue||0)-10);showToast("トイマン：「助かる。行く」");}else if(gift.type==="words"){var ec=(ns.emberCards||[]).find(function(c){return c.unitState==="exploring";});if(ec)ec.progress=Math.min(100,(ec.progress||0)+3);showToast("トイマン：「読んだ。行く」");}else if(gift.type==="light"){ns.watchGaugeBonus=(ns.watchGaugeBonus||0)+20;showToast("トイマン：「見えた」");}ns.lastSavedAt=nowISO();ns.logs=[{hours:0,events:[{text:"「"+gift.label+"」をトイマンに送った。",kind:"record",pri:3}],ts:nowISO()}].concat(ns.logs||[]).slice(0,30);setGame(ns);persistSave(ns);setSendGiftOpen(false);},[game,showToast]);
  var departEmberCb=useCallback(function(id){if(!game)return;var card=(game.emberCards||[]).find(function(c){return c.id===id;});if(!card||card.status!=="awaiting")return;setDepartTargetId(id);},[game]);// eslint-disable-line
  var confirmDepartCb=useCallback(function(id){if(!game)return;var ns=cloneS(game);var card=(ns.emberCards||[]).find(function(c){return c.id===id;});if(!card||card.status!=="awaiting")return;card=normalizeEmberUnitCard(card);card.unitState="exploring";card.status="unreceived";card.currentQuestion=EMBER_UNIT_FLOW.exploring.question;card.progress=0;
    /* 出発時は探索0%スタート。問いは戦闘・放置で progress=100% に達してから自然発生する */
    unlockPlace(ns,"unexplored_forest",false);ns.characters.toyman.location="unexplored_forest";ns.characters.toyman.lastAction="exploring";ns.lastSavedAt=nowISO();ns.logs=[{hours:0,events:[{text:"トイマンが「"+makeEmberTitle(card)+"」を探しに、未受領の森へ出発した。",kind:"ember",pri:5},{text:"「残っているなら、迎えに行く」「それだけ」",kind:"discover",pri:4}],ts:nowISO()}].concat(ns.logs||[]).slice(0,30);setGame(ns);persistSave(ns);setDepartTargetId(null);showToast("トイマンが未受領の森へ出発した。");setTimeout(function(){setScreen("peek");},300);},[game,showToast,setScreen]);// eslint-disable-line
  var burnReceiptCb=useCallback(function(id){if(!game)return;var r=(game.receipts||[]).find(function(x){return x.id===id;});if(!r)return;if(r.receiptStatus!=="graduated"){showToast("この受領証は、まだ心へ返せません。卒業（プラス変化30%以上）が必要です。");return;}setBurnTargetId(id);},[game,showToast]);// eslint-disable-line
  var confirmBurnCb=useCallback(function(id){if(!game)return;var r=burnReceipt(game,id);setBurnTargetId(null);if(!r.ok){showToast(r.msg);return;}setGame(r.state);persistSave(r.state);if(r.isEnding){showToast(r.msg);setTimeout(function(){setScreen("ending");},700);}else showToast(r.msg);},[game,showToast]);// eslint-disable-line
  var dismissIntroSceneCb=useCallback(function(id){if(!game)return;var ns=cloneS(game);ns.introQueue=(ns.introQueue||[]).filter(function(x){return x!==id;});if(!ns.seenIntroScenes)ns.seenIntroScenes=[];if(ns.seenIntroScenes.indexOf(id)===-1)ns.seenIntroScenes=ns.seenIntroScenes.concat([id]);ns.lastSavedAt=nowISO();setGame(ns);persistSave(ns);},[game]);// eslint-disable-line
  var deleteEmberCb=useCallback(function(id){if(!game)return;var card=(game.emberCards||[]).find(function(c){return c.id===id;});if(!card)return;var ns=Object.assign({},game,{emberCards:(game.emberCards||[]).filter(function(c){return c.id!==id;}),lastSavedAt:nowISO()});ns.dailyGoals={date:nowISO().slice(0,10),goals:makeGoals(ns)};ns.logs=[{hours:0,events:[{text:"残り火「"+makeEmberTitle(card)+"」を箱庭から外した。",kind:"ember",pri:3}],ts:nowISO()}].concat(ns.logs||[]).slice(0,30);setGame(ns);persistSave(ns);showToast("残り火を削除しました。");},[game,showToast]);// eslint-disable-line
  var advanceEmberCb=useCallback(function(id,choice,isCustom){if(!game)return;var r=advanceEmberUnit(game,id,choice,isCustom);if(!r.ok){showToast(r.msg+" "+(r.sub||""));return;}var ns=r.state;ns.dailyGoals={date:nowISO().slice(0,10),goals:makeGoals(ns)};setGame(ns);persistSave(ns);showToast(r.soulGained?(r.msg+" — あなたの言葉が、この残り火に魂を入れました。"):(r.msg+" — "+r.sub));},[game,showToast]);// eslint-disable-line
  var editEmberCb=useCallback(function(id,fields){
    if(!game)return;
    var ns=cloneS(game);
    var card=(ns.emberCards||[]).find(function(c){return c.id===id;});
    if(!card)return;
    if(fields.title!==undefined)card.title=fields.title.trim()||null;
    if(fields.memo!==undefined)card.memo=fields.memo.trim();
    if(fields.bodyText!==undefined)card.bodyText=fields.bodyText.trim();
    if(fields.reaction!==undefined)card.reaction=fields.reaction.trim();
    var hasSoul=!!((card.title&&card.title.trim())||(card.memo&&card.memo.trim())||(card.bodyText&&card.bodyText.trim())||(card.reaction&&card.reaction.trim()));
    if(hasSoul&&!card.soul){card.soul=true;showToast("この残り火に、あなたの魂が入りました。");}
    else showToast("情報を追加しました。");
    ns.lastSavedAt=nowISO();
    setGame(ns);persistSave(ns);
  },[game,showToast]);// eslint-disable-line
  var clickLetterCb=useCallback(function(facility,letterId){
    if(!game)return null;
    var r=clickLetter(game,facility,letterId);
    if(!r.ok){showToast(r.msg);return r;}
    setGame(r.state);persistSave(r.state);
    return r;
  },[game,showToast]);
  var stageWatchCb=useCallback(function(loc,isChar){if(!game)return false;var ns=ensureMapTouchCharges(game);if((ns.mapTouch.cur||0)<=0){showToast("MAPに触れる力がまだ戻っていません。1時間に1回くらい回復します。");return false;}ns.mapTouch.cur=Math.max(0,(ns.mapTouch.cur||0)-1);if(ns.world.map[loc])ns.world.map[loc].progress_rate=Math.min(0.999,(ns.world.map[loc].progress_rate||0)+(isChar?0.005:0.01));var uc=addUnitProgressForPlace(ns,loc,isChar?8:12);ns.lastSavedAt=nowISO();setGame(ns);persistSave(ns);addWatchGauge(isChar?"watch_char":"watch_stage",6);if(uc){var cv=getWatchCharVoice("toyman",uc);showToast("トイマン："+cv+" — 問いが動いた");}return true;},[game,addWatchGauge,showToast]);// eslint-disable-line
  var charCareCb=useCallback(function(id,mode){if(!game)return{ok:false,msg:"まだ世界がありません。",sub:""};var r=applyCharacterCareAction(game,id,mode);if(!r.ok){showToast(r.msg);return r;}var ns=r.state;var uc=addUnitProgressForCharacter(ns,id,mode==="support"?10:6);setGame(ns);persistSave(ns);var cv=getWatchCharVoice(id,uc);var charName=NAMES[id]||id;showToast(charName+"："+cv+(uc?" — 問いに触れた":""));addWatchGauge("care_"+id+"_"+mode,8);return r;},[game,showToast,addWatchGauge]);// eslint-disable-line
  var pressureActionCb=useCallback(function(mode){if(!game)return{ok:false,msg:"まだ世界がありません。",sub:""};var r=applyPressureAction(game,mode);if(!r.ok){showToast(r.msg);return r;}setGame(r.state);persistSave(r.state);showToast(r.msg+" — "+r.sub);addWatchGauge("pressure_"+mode,6);return r;},[game,showToast,addWatchGauge]);// eslint-disable-line
  var toymanMoveCb=useCallback(function(dest){if(!game)return{ok:false,msg:"まだ世界がありません。",sub:""};var r=applyToymanMove(game,dest);if(!r.ok){showToast(r.msg);return r;}setGame(r.state);persistSave(r.state);showToast(r.msg+" — "+r.sub);return r;},[game,showToast]);// eslint-disable-line
  var manualBattleCb=useCallback(function(actionId,selfAnswer){if(!game)return{ok:false,msg:"まだ世界がありません。",lines:["まだ世界がありません。"]};var r=runToymanBattleIntervention(game,actionId,selfAnswer);if(!r.ok){showToast(r.msg);return r;}setGame(r.state);persistSave(r.state);setLive(function(prev){return [{text:(r.lines||[]).join("\n"),kind:"explore_detail",time:nowISO()}].concat(prev).slice(0,40);});showToast(r.ipGain>0?"見守りが届いた — 干渉ポイント +"+r.ipGain:(r.ended?"影との遭遇が終わりました。問いを落とさなかった。":"戦闘に介入しました。問いを落とさなかった。"));return r;},[game,showToast]);
  var addWatchGauge=useCallback(function(type,amount){var now2=Date.now();if((wgRef.current.last[type]||0)>now2-5000)return;wgRef.current.last[type]=now2;var ng=wgRef.current.gauge+amount;if(ng>=100){ng-=100;setGame(function(g){if(!g)return g;return Object.assign({},g,{ip:Object.assign({},g.ip,{cur:Math.min(g.ip.max,(g.ip.cur||0)+1)})});});showToast("見守り満タン — 干渉ポイント +1");}wgRef.current.gauge=ng;setWatchGauge(ng);},[showToast]);
  var withUnlock=useCallback(function(prev,next){var pu=getUnlockedConvIds(prev),nu=getUnlockedConvIds(next);var fresh=nu.filter(function(id){return pu.indexOf(id)===-1;});var s=Object.assign({},next,{unlockedConvs:nu});if(fresh.length>0)showToast("会話が解放された：「"+CBID[fresh[0]].title+"」");return s;},[showToast]);

  var openWorld=useCallback(function(){if(!game)return;var el=(Date.now()-new Date(game.lastOpenedAt).getTime())/3600000;var hours=game.logs.length===0?Math.max(el,14):el;var preSnap0=captureSnap(game);var res=simulate(game,hours,game.policy);var now=nowISO();res.newState.lastOpenedAt=now;res.newState.lastSavedAt=now;res.newState.ip=calcIP(game,now);var pH=game.history||{prevOpen:null,lastOpen:null,hourly:[],daily:[]};res.newState.history=updateHistory(pH,res.newState,preSnap0);var checked=withUnlock(game,res.newState);if(!checked.dailyGoals||!checked.dailyGoals.date){checked.dailyGoals={date:now.slice(0,10),goals:makeGoals(checked)};}else{var prevGls=checked.dailyGoals.goals.slice();checked.dailyGoals.goals=checkGoals(checked.dailyGoals.goals,checked,game);checked=checkGoalsAwardIP(prevGls,checked.dailyGoals.goals,checked);}var advancedEmbers=[];if(checked.receipts&&checked.receipts.length){checked.receipts=checked.receipts.map(function(r){var st=getReceiptCherishStage(r,checked);var prev=(r.lastSeenCherish===undefined||r.lastSeenCherish===null)?st:r.lastSeenCherish;if(st>prev&&st>=2)advancedEmbers.push({title:r.title,stage:st});return Object.assign({},r,{lastSeenCherish:st});});}setGame(checked);setDigest(res.summary);persistSave(checked);setFirst(false);setScreen("home");setTimeout(function(){var ev=genLiveEvent(checked);setLive([{text:ev.text,kind:ev.kind,time:nowISO()}]);},1800);if(advancedEmbers.length>0){var ae=advancedEmbers[0];setTimeout(function(){showToast(advancedEmbers.length>1?("留守の間に、"+advancedEmbers.length+"つの残り火が、より深く汲み取られた。"):("「"+ae.title+"」が、より深く汲み取られた。"));},2800);}if(el>1&&game.introSeen){var readIds=checked.readConvs||[];var availC=CONVS.filter(function(c){return(checked.characters[c.a].bonds[c.b]||0)>=c.th;});var unreadC=availC.filter(function(c){return readIds.indexOf(c.id)===-1;});var pool=unreadC.length>0?unreadC:availC;if(pool.length>0){var rConv=pool[Math.floor(Math.random()*pool.length)];setReturnConvId(rConv.id);}}if(el>48){setTimeout(function(){showToast("トイマン：「久しぶりだね。でも、置いていかなかった」");},3200);}var exploringEmbers=(checked.emberCards||[]).filter(function(c){return c.unitState==="exploring";});if(exploringEmbers.length>0){var ec=exploringEmbers[0];setTimeout(function(){var p2=Math.round(ec.progress||0);var line=p2<40?"「まだ深い。でも、見失っていない」":p2<80?"「触れた。もう少しだ」":"「もう届く。帰る」";showToast("トイマン："+line);},2400);}},[game,withUnlock,showToast]);
  var advTime=useCallback(function(h){if(!game)return;var preSnap1=captureSnap(game);var res=simulate(game,h,game.policy);var now=nowISO();res.newState.lastOpenedAt=now;res.newState.lastSavedAt=now;var pH2=game.history||{prevOpen:null,lastOpen:null,hourly:[],daily:[]};res.newState.history=updateHistory(pH2,res.newState,preSnap1);var checked=withUnlock(game,res.newState);if(checked.dailyGoals&&checked.dailyGoals.goals){var pg3=checked.dailyGoals.goals.slice();checked.dailyGoals.goals=checkGoals(pg3,checked,game);checked=checkGoalsAwardIP(pg3,checked.dailyGoals.goals,checked);}setGame(checked);setDigest(res.summary);persistSave(checked);setScreen("log");showToast("世界が"+h+"時間進んだ。");},[game,withUnlock,showToast]);
  var navigateTo=useCallback(function(screen,params){if(screen==="intv"&&params){setIntvConfig({target:params.target||"toyman",tier:params.tier||null,key:Date.now()});}setViewConv(null);setScreen(screen);},[]);
  var closeWorld=useCallback(function(skipPreview){
    if(!game)return;
    if(!skipPreview){
      var previews=[];
      var exploring=(game.emberCards||[]).find(function(c){return c.unitState==="exploring";});
      var ready=(game.emberCards||[]).find(function(c){return c.status==="ready";});
      if(ready)previews.push("トイマンが、持ち帰っています。次に来たとき、受け取れます。");
      else if(exploring)previews.push("トイマンは、まだ探しています。次に来たとき、近づいています。");
      var uBond=(game.characters&&game.characters.utsuro&&game.characters.utsuro.bonds&&game.characters.utsuro.bonds.kana)||0;
      if(uBond>0)previews.push("うつろが、何かを整理しています。");
      var unread=CONVS.filter(function(c){return(game.characters[c.a].bonds[c.b]||0)>=c.th&&(game.readConvs||[]).indexOf(c.id)===-1;});
      if(unread.length>0)previews.push("「"+unread[0].title+"」という場面が、読まれるのを待っています。");
      if(previews.length>0){setClosingPreview(previews[Math.floor(Math.random()*previews.length)]);return;}
    }
    var ns=Object.assign({},game,{lastOpenedAt:nowISO(),lastSavedAt:nowISO()});setGame(ns);persistSave(ns);setScreen("closed");
  },[game]);
  var resetWorld=useCallback(function(){clearSave();var f=initGame();setGame(f);setDigest(null);setFirst(true);setLive([]);setProg({toyman:0,kana:0,utsuro:0,kotae:0});persistSave(f);setScreen("closed");showToast("世界を最初に戻した。");},[showToast]);
  var handleTieredIntv=useCallback(function(newState){if(!newState)return;newState.lastSavedAt=nowISO();var checked=withUnlock(game,newState);if(checked.dailyGoals&&checked.dailyGoals.goals){var pg2=checked.dailyGoals.goals.slice();checked.dailyGoals.goals=checkGoals(pg2,checked,game);checked=checkGoalsAwardIP(pg2,checked.dailyGoals.goals,checked);}setGame(checked);persistSave(checked);},[game,withUnlock]);
  var quickGoalAction=useCallback(function(action){if(!game||!action)return;if(action.screen&&action.screen!=="quick"){navigateTo(action.screen,action);return;}var r=runGoalAction(game,action);if(r.blocked){showToast((r.lines&&r.lines[0])||"実行できません。");return;}var ns=r.newState;ns.lastSavedAt=nowISO();var checked=withUnlock(game,ns);if(checked.dailyGoals&&checked.dailyGoals.goals){var pg=checked.dailyGoals.goals.slice();checked.dailyGoals.goals=checkGoals(pg,checked,game);checked=checkGoalsAwardIP(pg,checked.dailyGoals.goals,checked);}setGame(checked);persistSave(checked);setLive(function(prev){return [{text:(r.lines||[]).join("\n"),kind:"goal",time:nowISO()}].concat(prev).slice(0,40);});showToast(r.ipUsed?((r.lines&&r.lines[0])||"干渉しました。"):"実行しました。");},[game,withUnlock,navigateTo,showToast]);
  var addEmber=useCallback(function(card){if(!game)return;var res=addNewEmberToState(game,card);var ns=res.state;ns.dailyGoals={date:nowISO().slice(0,10),goals:makeGoals(ns)};setGame(ns);persistSave(ns);setShowCreate(false);var pu=(ns.recentPlaceUnlocks||[])[0];showToast(pu?("新しい場所が開きました：「"+pu.name+"」"):(res.converted?"判決を問いとして保管しました。":"「"+makeEmberTitle(res.card)+"」を預けました。"));},[game,showToast]);
  var readConv=useCallback(function(id){setViewConv(id);if(!game)return;if(game.readConvs.indexOf(id)===-1){var ns=Object.assign({},game,{readConvs:[id].concat(game.readConvs)});setGame(ns);persistSave(ns);}},[game]);
  var receiveConv=useCallback(function(id){if(!game)return;var conv=CBID[id];if(!conv)return;if(game.receivedScenes&&game.receivedScenes.indexOf(id)!==-1)return;var ns=applySceneFx(game,conv);ns.lastSavedAt=nowISO();setGame(ns);persistSave(ns);showToast("「"+conv.title+"」を受領した。");},[game,showToast]);
  var savePhilAnswer=useCallback(function(ans){if(!game||!ans.trim())return;var beforeD=getPhilosophicalQuestion(game).depth;var ns=Object.assign({},game,{questionAnswers:([{q:getPhilosophicalQuestion(game).text,a:ans,at:nowISO()}]).concat(game.questionAnswers||[]).slice(0,30),lastSavedAt:nowISO()});setGame(ns);persistSave(ns);var afterD=getPhilosophicalQuestion(ns).depth;showToast(afterD>beforeD?"コタエ：「記録した。……問いが、深くなった」":"コタエ：「記録した。あなたの言葉を」");},[game,showToast]);

  /* B: うつろイベント — ホーム初表示時に低確率で発火 */
  useEffect(function(){
    if(!game||!game.introSeen)return;
    if((game.receipts||[]).length===0)return;
    var today=nowISO().slice(0,10);
    if(game.lastUtsuroEvent===today)return;
    if(Math.random()<0.25){setUtsuroEventActive(true);}
  },[game&&game.introSeen,game&&(game.receipts||[]).length]);// eslint-disable-line

  /* E: コタエが止まる瞬間 — ホーム初表示時に低確率 */
  useEffect(function(){
    if(!game||!game.introSeen)return;
    if((game.receipts||[]).length===0)return;
    if(Math.random()<0.12){setKotaeStuck(true);}
  },[game&&game.introSeen]);// eslint-disable-line

  if(screen==="loading"||!game)return(<div className="root"><div className="frame center"><p className="loading">世界をたどっています…</p></div></div>);
  var ipCur=game.ip?game.ip.cur:0,ipMax=game.ip?game.ip.max:20;
  var receiveTarget=receiveTargetId?((game.emberCards||[]).find(function(c){return c.id===receiveTargetId;})):null;

  return(<div className="root"><div className="frame">
    {saveError&&<div className="save-error-banner" role="alert">⚠ セーブが保存できていません。プライベートモードを解除するか、ブラウザの空き容量をご確認ください。進行は次の保存成功時に反映されます。</div>}
    {returnConvId&&<ReturnConvOverlay conv={CBID[returnConvId]} onClose={function(){setReturnConvId(null);}} onGoConv={function(){setReturnConvId(null);readConv(returnConvId);setScreen("conv");}}/>}
    {screen==="ending"&&<EndingView game={game} onFinish={function(){var ns=Object.assign({},game,{endingSeen:true,lastSavedAt:nowISO()});setGame(ns);persistSave(ns);setScreen("home");}}/>}
    {screen==="closed"&&(!game.introSeen?<IntroScreen onComplete={function(){var ns=Object.assign({},game,{introSeen:true,lastSavedAt:nowISO()});setGame(ns);persistSave(ns);}}/>:<ClosedScreen game={game} first={first} onOpen={openWorld}/>)}
    {screen!=="closed"&&screen!=="ending"&&<>
      {screen==="home"&&<>
        <Header title="ホーム" day={game.world.day}/>
        <HomeView game={game} digest={digest} onCreate={function(){setShowCreate(true);}} onNav={navigateTo} onDepart={departEmberCb} onSendGift={function(){setSendGiftOpen(true);}} onPhilAnswer={function(){setPhilAnswerOpen(true);}} utsuroEvent={utsuroEventActive} onUtsuroFound={function(){setUtsuroEventActive(false);var ns=Object.assign({},game,{lastUtsuroEvent:nowISO().slice(0,10)});setGame(ns);persistSave(ns);}} kotaeStuck={kotaeStuck} onKotaeResume={function(){setKotaeStuck(false);}} onOpenPlace={function(k){setPeekTargetLoc(k);setPeekMode("scene");setScreen("peek");}} onTodayEnd={function(){var ns=Object.assign({},game,{lastSavedAt:nowISO(),logs:[{hours:0,events:[{text:"今日はここで閉じた。見たものは、ちゃんと残っている。",kind:"record",pri:3}],ts:nowISO()}].concat(game.logs||[]).slice(0,30)});setGame(ns);persistSave(ns);showToast("うつろ：「預かっています」");setTimeout(function(){closeWorld(false);},800);}}/>
      </>}
      {screen==="log"&&<>
        <Header title="記録" day={game.world.day}/>
        <LogView digest={digest} goals={game.dailyGoals?game.dailyGoals.goals:[]} game={game} onNav={navigateTo} onQuick={quickGoalAction} setGame={function(ns){setGame(ns);persistSave(ns);}}/>
        <div className="actions"><button className="btn btn-g" onClick={closeWorld}>閉じる</button></div>
        <DevPanel open={devOpen} onToggle={function(){setDevOpen(function(v){return !v;});}} onAdvance={advTime} onReset={resetWorld}/>
      </>}
      {screen==="peek"&&<>
        <Header title="箱庭" day={game.world.day} right={
          <div className="peek-tog">
            <button className={"ptb"+(peekMode==="scene"?" ptb-on":"")} onClick={function(){setPeekMode("scene");}}>いまのようす</button>
            <button className={"ptb"+(peekMode==="map"?" ptb-on":"")} onClick={function(){setPeekMode("map");}}>世界地図</button>
          </div>
        }/>
        {peekMode==="scene"&&<NowSceneView game={game} targetLoc={peekTargetLoc} watchGauge={watchGauge} onWatch={stageWatchCb} onCharCare={charCareCb} onPressureAction={pressureActionCb} onToymanMove={toymanMoveCb} onManualBattle={manualBattleCb} onOpenBattle={function(){setPeekTargetLoc("unexplored_forest");setPeekMode("scene");setScreen("battle");}} onClickLetter={clickLetterCb}/>}
        {peekMode==="map"&&<div className="peek-wrap peek-wrap-readable"><CardWorldMap game={game} onPlaceSelect={function(k){setPeekTargetLoc(k);setPeekMode("scene");}}/><div className="peek-sec"><span className="sec-lbl">次に起きそうな変化</span><NextChangesPanel game={game}/></div></div>}
      </>}
      {screen==="battle"&&<>
        <Header title="影との遭遇" day={game.world.day}/>
        <BattleEncounterScreen game={game} onBack={function(){setPeekTargetLoc("unexplored_forest");setPeekMode("scene");setScreen("peek");}} onManualBattle={manualBattleCb} onCare={function(){setPeekTargetLoc("unexplored_forest");setPeekMode("scene");setScreen("peek");showToast("トイマンをタップして、かなのケア導線から休ませてください。");}}/>
      </>}
      {screen==="chars"&&<>
        <Header title="みんな" day={game.world.day}/>
        <div className="scroll"><div className="cg">{getMetCharIds(game).map(function(id){return <CharCard key={id} id={id} c={game.characters[id]} prog={prog[id]} game={game} expanded={expanded===id} onToggle={function(){setExpanded(function(v){return v===id?null:id;});}}/>;})} </div></div>
      </>}
      {screen==="ember"&&<><Header title="残り火" day={game.world.day}/><ProcessingLine game={game}/><EmberView game={game} onReceive={receiveEmberCb} onDepart={departEmberCb} onDelete={deleteEmberCb} onAdvance={advanceEmberCb} onBurnReceipt={burnReceiptCb} onEditEmber={editEmberCb} onOpenCreate={function(){setShowCreate(true);}}/></>}
      {screen==="titles"&&<>
        <Header title="称号帳" day={game.world.day}/>
        <TitlesView game={game}/>
      </>}
      {screen==="conv"&&<>
        <Header title="場面帳" day={game.world.day}/>
        {viewConv?<ConvDetail conv={CBID[viewConv]} game={game} onBack={function(){setViewConv(null);}} onReceive={receiveConv}/>:<ConvView game={game} onRead={readConv}/>}
      </>}
      {screen==="intv"&&<>
        <Header title="干渉する" day={game.world.day}/>
        <InterventionTab game={game} onExecute={handleTieredIntv} config={intvConfig}/>
      </>}
      {screen!=="battle"&&<nav className="bnav">
        {getVisibleTabs(game).map(function(t){var isNext=nextAction&&nextAction.screen===t.id&&screen!==t.id;return <button key={t.id} className={"nbtn"+(screen===t.id?" nbtn-on":"")+(isNext?" nbtn-next":"")} onClick={function(){if(t.id!=="conv")setViewConv(null);setScreen(t.id);}}>{t.label}{isNext&&<span className="nbtn-dot"/>}</button>;})}
      </nav>}
    </>}
    
    {closingPreview&&<ClosingPreviewOverlay text={closingPreview} onClose={function(){setClosingPreview(null);closeWorld(true);}}/>}
    {philAnswerOpen&&<PhilAnswerModal question={getPhilosophicalQuestion(game).text} onClose={function(){setPhilAnswerOpen(false);}} onSave={function(a){savePhilAnswer(a);setPhilAnswerOpen(false);}}/>}
    {showCreate&&<EmberCreate onClose={function(){setShowCreate(false);}} onSubmit={addEmber}/>}
    {departTargetId&&<DepartureOverlay card={(game.emberCards||[]).find(function(c){return c.id===departTargetId;})} onCancel={function(){setDepartTargetId(null);}} onConfirm={function(){confirmDepartCb(departTargetId);}}/>}
    {burnTargetId&&<BurnConfirmModal receipt={(game.receipts||[]).find(function(r){return r.id===burnTargetId;})} onCancel={function(){setBurnTargetId(null);}} onConfirm={function(){confirmBurnCb(burnTargetId);}}/>}
    {(game.introQueue||[]).length>0&&<IntroSceneOverlay scene={INTRO_SCENES[(game.introQueue||[])[0]]} onClose={function(){dismissIntroSceneCb((game.introQueue||[])[0]);}}/>}
    {receiptAcceptance&&<AcceptanceModal text={receiptAcceptance.text} holdText={receiptAcceptance.holdText} nextQuestion={receiptAcceptance.nextQuestion} writeState={receiptAcceptance.writeState} feeling={receiptAcceptance.feeling} wanted={receiptAcceptance.wanted} bodyText={receiptAcceptance.bodyText} onClose={function(){setReceiptAcceptance(null);}}/>}
    {witnessTargetId&&(function(){var wc=(game.emberCards||[]).find(function(c){return c.id===witnessTargetId;});return wc?<WitnessOverlay card={wc} game={game} onComplete={function(){setReceiveTargetId(witnessTargetId);setWitnessTargetId(null);}} onClose={function(){setWitnessTargetId(null);}}/>:null;})()}
    {sendGiftOpen&&<SendGiftModal onClose={function(){setSendGiftOpen(false);}} onSend={sendGiftCb}/>}
    {receiveTarget&&<ReceiptReceiveModal card={receiveTarget} onClose={function(){setReceiveTargetId(null);}} onSubmit={function(input){
      var ns=receiveEmberCard(game,receiveTarget.id,input);
      ns.lastSavedAt=nowISO();
      setGame(ns);persistSave(ns);setReceiveTargetId(null);
      addWatchGauge("receive_ember",25);
      var latest=(ns.receipts||[])[0];
      if(latest){
        setReceiptAcceptance({text:latest.acceptanceText||"あなたが書いたものは、なかったことにはなりません。",holdText:latest.holdText||null,nextQuestion:latest.nextQuestion||"次は、どんな問いを持ち帰る？",writeState:latest.writeState||"",feeling:latest.feeling||"",wanted:latest.wanted||"",bodyText:latest.bodyText||""});
      }
    }}/>}
    {toast&&<div className="toast">{toast}</div>}
  </div></div>);
}

function Overlay(p){return <div className="ov" onClick={p.onClose||undefined}><div className="bsh" onClick={function(e){e.stopPropagation();}}><div className="sh-handle"/>{p.children}</div></div>;}

/* トイマンの出発演出。出発ボタンを押した時に挟む。最後のボタンで実際に探索へ。 */
/* キャラ初登場シーン。トイマンが残り火を持ち帰る流れの中で、
   もとから知り合いだった仲間として現れる。タップで1行ずつ進む。 */
function IntroSceneOverlay(p){
  var scene=p.scene;
  if(!scene)return null;
  var lines=scene.lines||[];
  return(
    <div className="introscene-ov" onClick={p.onClose}>
      <div className="introscene-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="introscene-scroll">
          {lines.map(function(L,idx){
            if(L.s==="stage")return <p key={idx} className="isc-stage">{L.t}</p>;
            return(
              <p key={idx} className="isc-line">
                <span className={"isc-dot cd-"+L.s}/>
                <span className="isc-text"><span className="isc-speaker">{NAMES[L.s]||L.s}：</span>「{L.t}」</span>
              </p>
            );
          })}
        </div>
        <div className="introscene-foot">
          {scene.unlockNote&&<div className="isc-unlock">{scene.unlockNote}</div>}
          <button className="btn btn-p big touchable" onClick={p.onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
function DepartureOverlay(p){
  var card=p.card;
  var title=card?makeEmberTitle(card):"残り火";
  return(
    <div className="depart-ov" onClick={p.onCancel}>
      <div className="depart-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="depart-scroll">
          <p className="dps-stage">はじまりの部屋の灯りが、一度だけ揺れた。</p>
          <p className="dps-stage">トイマンは顔を上げた。</p>
          <p className="dps-say">「森に、残り火」</p>
          <p className="dps-stage dps-pause">少しだけ、沈黙した。</p>
          <p className="dps-say">「つよい」</p>
          <p className="dps-act">小さなカバンを持つ。<br/>留め具を確認する。<br/>ランタンを取る。</p>
          <p className="dps-say">「未回収」</p>
          <p className="dps-say">「いま行く」</p>
          <p className="dps-stage">森の奥から、黒い風が吹いた。</p>
          <p className="dps-stage">トイマンは振り返らない。</p>
          <p className="dps-say dps-say-long">「なぜ行くのかは、知らない」<br/>「でも、行かないという選択肢がない」<br/>「残っているなら、迎えに行く」<br/>「それだけ」</p>
        </div>
        <div className="depart-actions">
          <button className="btn btn-g" onClick={p.onCancel}>まだ待つ</button>
          <button className="btn btn-p touchable" onClick={p.onConfirm}>トイマンを未受領の森へ出発させる</button>
        </div>
      </div>
    </div>
  );
}
/* 受領証を心へ返す（燃やす）確認。卒業した受領証だけここに来る。 */
function BurnConfirmModal(p){
  var r=p.receipt;
  if(!r)return null;
  return(
    <div className="burn-ov" onClick={p.onCancel}>
      <div className="burn-sheet" onClick={function(e){e.stopPropagation();}}>
        <div className="burn-title">この受領証を、心へ返しますか</div>
        <div className="burn-receipt-name">「{r.title}」</div>
        <p className="burn-desc">燃やすのは、消すことではありません。<br/>受け取りきったものを、自分の中へ戻す行為です。<br/>戻したあとは、この受領証の一覧からは消えます。<br/>もうこの世界では、見ることができなくなります。</p>
        <p className="burn-confirm-q">それでもいいですか？</p>
        <div className="burn-actions">
          <button className="btn btn-g" onClick={p.onCancel}>まだ持っておく</button>
          <button className="btn btn-p touchable" onClick={p.onConfirm}>心へ返す</button>
        </div>
      </div>
    </div>
  );
}
/* エンディング。卒業した受領証を全部心へ返したら現れる。 */
function EndingView(p){
  var game=p.game;
  var returned=game.returnedToHeart||[];
  return(
    <div className="ending-view">
      <div className="ending-scroll">
        <div className="ending-mark">🜂</div>
        <h1 className="ending-title">すべて、心へ返した</h1>
        <p className="ending-lead">書いたあと、残っていたものたちを、<br/>あなたは一つずつ迎えに行った。</p>
        <div className="ending-list">
          {returned.map(function(r,i){return(
            <div key={i} className="ending-item">
              <span className="ei-title">「{r.title}」</span>
              {r.wanted&&<span className="ei-wanted">本当は、{r.wanted}</span>}
            </div>
          );})}
        </div>
        <p className="ending-body">どれも、何にもならなかったかもしれない。<br/>誰にも届かなかったかもしれない。<br/>でも、あなたは捨てなかった。<br/>未回収のまま、置いていかなかった。</p>
        <p className="ending-body ending-emph">あなたは、書いてよかった。</p>
        <p className="ending-foot">トイマン：<br/>「全部、迎えに行った」<br/>「一つも、見失わなかった」<br/>「……またね」</p>
        <button className="btn btn-p big touchable" onClick={p.onFinish}>箱庭へ戻る</button>
        <p className="ending-note">この世界は続きます。また残り火が生まれたら、いつでも預けにきてください。</p>
      </div>
    </div>
  );
}

function IntroScreen(p){
  var STEPS=[
    {type:"ember"},
    {type:"line",speaker:"toyman",text:"探したよ"},
    {type:"line",speaker:"toyman",text:"まだ、ここにある"},
    {type:"line",speaker:"toyman",text:"置いていかない"},
    {type:"divider"},
    {type:"title",text:"残り火の箱庭"},
    {type:"button"},
  ];
  var [step,setStep]=useState(0);
  var [skipped,setSkipped]=useState(false);
  var [phase,setPhase]=useState("open"); // "open" | "question" | "farewell"
  useEffect(function(){
    if(skipped)return;
    var delays=[0,1200,2600,3900,5200,6200,7400];
    var timers=delays.map(function(d,i){return setTimeout(function(){setStep(function(s){return Math.max(s,i);});},d);});
    return function(){timers.forEach(clearTimeout);};
  },[skipped]);
  function skip(){setSkipped(true);setStep(STEPS.length-1);}
  function goQuestion(){setPhase("question");}
  function goFarewell(){setPhase("farewell");}

  if(phase==="farewell"){
    return(
      <div className="op-wrap">
        <div className="op-inner">
          <div className="op-ember-glow" style={{opacity:0.4}}/>
          <div className="op-farewell">
            <div className="op-farewell-line"><span className="isc-dot cd-utsuro op-dot"/><span className="op-say">「残り火ができたとき、またきてください」</span></div>
            <div className="op-farewell-line"><span className="isc-dot cd-utsuro op-dot"/><span className="op-say">「うつろが、待っています」</span></div>
          </div>
          <div className="op-btn-wrap op-fade-up" style={{marginTop:32}}>
            <button className="btn btn-g op-btn" onClick={p.onComplete}>閉じる</button>
          </div>
        </div>
      </div>
    );
  }

  if(phase==="question"){
    return(
      <div className="op-wrap">
        <div className="op-inner op-question-inner">
          <div className="op-question-body">
            <p className="op-q-lead">書いたあと</p>
            <p className="op-q-main">誰かに届いたか<br/>気になったことは<br/>ありますか？</p>
            <p className="op-q-sub">通知を確認した。反応が気になった。<br/>そういう感覚が、残り火です。</p>
          </div>
          <div className="op-q-choices">
            <button className="btn btn-p big touchable op-q-yes" onClick={p.onComplete}>ある・あった</button>
            <button className="btn btn-g op-q-no" onClick={goFarewell}>今はない</button>
          </div>
        </div>
      </div>
    );
  }

  var visibleSteps=STEPS.slice(0,step+1);
  return(
    <div className="op-wrap" onClick={skip}>
      <div className="op-inner" onClick={function(e){e.stopPropagation();}}>
        {visibleSteps.map(function(s,i){
          if(s.type==="ember")return <div key={i} className="op-ember-glow"/>;
          if(s.type==="line")return(
            <div key={i} className={"op-line op-fade-up"}>
              <span className={"isc-dot cd-"+s.speaker+" op-dot"}/>
              <span className="op-say">「{s.text}」</span>
            </div>
          );
          if(s.type==="divider")return <div key={i} className="op-divider op-fade-up"/>;
          if(s.type==="title")return <h1 key={i} className="op-title op-fade-up">{s.text}</h1>;
          if(s.type==="button")return(
            <div key={i} className="op-btn-wrap op-fade-up">
              <button className="btn btn-p big touchable op-btn" onClick={goQuestion}>ひらく</button>
              <p className="op-note">誰も、あなたを責めていません。</p>
            </div>
          );
          return null;
        })}
      </div>
      {step<STEPS.length-1&&<div className="op-skip" onClick={skip}>スキップ</div>}
    </div>
  );
}
function ClosedScreen(p){var d=new Date(p.game.lastOpenedAt),str=(d.getMonth()+1)+"月"+d.getDate()+"日 "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");return <div className="closed">{p.first?<><h1 className="ctl">残り火の箱庭</h1><p className="cl">ここは、残り火の箱庭、<br/>少しだけ進む世界です。</p><p className="cl dim">開かなかった日も、損は生まれません。<br/>うつろが、ぜんぶ預かっています。</p><button className="btn btn-p big" onClick={p.onOpen}>世界をひらく</button></>:<><h1 className="ctl">世界は眠っています</h1><p className="cl dim">うつろが、ぜんぶ預かっています。<br/>見ていない間に、少しずつ進みます。</p><div className="closed-utsuro"><span className="isc-dot cd-utsuro"/><span>うつろ：「見ていない間も、捨てていない」</span></div><button className="btn btn-p big" onClick={p.onOpen}>世界を開く</button><div className="cm">{p.game.world.day}日目　・　最後に閉じたとき {str}</div></>}<div className="cf">誰も、あなたを責めていません。</div></div>;}

function TitlesView(p){
  var game=p.game;
  var got=game.achievements||{};
  return(
    <div className="scroll titles-scroll">
      <div className="title-hero">
        <div className="title-hero-k">称号帳</div>
        <h3>受け取った証を、ここに分けて置く</h3>
        <p>称号は記録タブから切り離しました。長い帳面がログを押し潰す文明災害を防ぎます。</p>
      </div>
      <div className="title-grid">
        {ACHIEVEMENT_DATA.map(function(a){
          var on=!!got[a.id];
          return(
            <div key={a.id} className={"title-card"+(on?" title-got":"")}>
              <span className="title-star">{on?"★":"☆"}</span>
              <div>
                <div className="title-name">{a.title}</div>
                <div className="title-cond">{on?"獲得済み":"未獲得"}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="title-sub-note">アイテム帳は記録側、称号帳はこのタブに分離。縦長地獄からの脱出、たまには人類も学習する。</div>
    </div>
  );
}

function Header(p){return <div className="hdr"><div><span className="hday">{p.day}日目</span><h2 className="htit">{p.title}</h2></div>{p.right&&<div>{p.right}</div>}</div>;}
function LogView(p){
  var digest=p.digest,goals=p.goals||[];
  if(!digest)return <div className="scroll"><GoalsPanel goals={goals} game={p.game} onNav={p.onNav} onQuick={p.onQuick}/><p className="le">まだ、ログがありません。</p></div>;
  var best=null;if(digest.places){var ps=digest.places.filter(function(q){return q.delta>0;}).sort(function(a,b){return b.delta-a.delta;});if(ps.length)best=ps[0];}
  return <div className="scroll"><div className="log unfold">
    {goals.length>0&&<GoalsPanel goals={goals} game={p.game} onNav={p.onNav} onQuick={p.onQuick}/>}
    {p.game&&p.game.recentRewards&&p.game.recentRewards.length>0&&<RecentRewardsPanel rewards={p.game.recentRewards}/>}
    <div style={{"--d":"0ms"}} className="lel"><p>{digest.hours<1?"ほとんど時間は経っていない。世界は静かなままだ。":<span>あなたが見ていない間に、世界は<span className="hi"> {digest.hours} </span>時間進みました。</span>}</p><p className="lre">誰も、あなたを責めていません。</p><p className="game-oneliner">未受領の問いを、5人が少しずつ受け取れる形にしていく箱庭。</p></div>
    {p.game&&(function(){var stories=getUnlockedStories(p.game);var reads=p.game.readStories||[];return stories.length>0&&<div style={{"--d":"30ms"}} className="lsec"><div className="lh">世界の記録</div>{stories.map(function(s){var isRead=reads.indexOf(s.id)>=0;return(<div key={s.id} className={"story-card"+(isRead?" story-read":"")} onClick={function(){if(!p.game.readStories||reads.indexOf(s.id)===-1){var ns=Object.assign({},p.game,{readStories:[s.id].concat(reads)});p.setGame&&p.setGame(ns);}}}><div className="story-head"><span className="story-ch">第{s.ch}章</span><span className="story-title">{s.title}</span>{!isRead&&<span className="cv-new">NEW</span>}</div>{isRead&&<pre className="story-text">{s.text}</pre>}</div>);})}</div>;})()}
    {digest.places&&<div style={{"--d":"60ms"}} className="lsec"><div className="lh">場所の進み具合</div>{best&&<div className="best">今日いちばん進んだ場所　<b>{best.name}</b><span className="bd"> +{Math.round(best.delta*100)}%</span></div>}<div className="plist">{digest.places.map(function(pp){var fp=Math.round(pp.from*100),tp=Math.round(pp.to*100),dp=Math.round(pp.delta*100);return <div key={pp.id} className="prow"><div className="ptop"><span className="pn">{pp.name}</span><span className="pnum">{fp}% → <span className="hi2">{tp}%</span>{dp>0&&<span className="pdelta"> +{dp}%</span>}</span></div><Bar value={tp} color={PCOL(pp.id)} h={4}/><div className="psub">{pp.label}　Lv.{pp.level}</div></div>;})}</div></div>}
    {p.game&&<GrowthRanking game={p.game}/>}
    {digest.events.length>0&&<div style={{"--d":"150ms"}} className="lsec"><div className="lh">主なできごと</div><ul className="evs">{digest.events.map(function(e,i){return <li key={i} className={"ev ev-"+e.kind}>{e.text}</li>;})}</ul></div>}
    <div style={{"--d":"240ms"}} className="lsec"><div className="lh">キャラの変化</div><div className="chs">{digest.perChar.map(function(c){return <div key={c.id} className="chr"><span className={"nd cd-"+c.id}/><span className="cn">{c.name}</span><span className="cs2">{c.fatigue&&<span className="cs">疲労 <Dt from={c.fatigue.from} to={c.fatigue.to} inv={true}/></span>}<span className="cs">{c.unique.label} <Dt from={c.unique.from} to={c.unique.to} inv={c.id==="auditor"}/></span></span>{c.id!=="auditor"&&<Badge status={c.status}/>}</div>;})}</div></div>
    {p.game&&Object.keys(p.game.inventory||{}).some(function(k){return(p.game.inventory[k]||0)>0;})&&<div style={{"--d":"280ms"}} className="lsec"><div className="lh">アイテム帳</div><InventoryPanel inventory={p.game.inventory}/></div>}
    {p.game&&Object.keys(p.game.achievements||{}).some(function(k){return p.game.achievements[k];})&&<div style={{"--d":"310ms"}} className="lsec"><div className="lh">称号帳</div><AchievementsPanel achievements={p.game.achievements}/></div>}
  </div></div>;
}
function GoalsPanel(p){
  var goals=p.goals,game=p.game,onNav=p.onNav,onQuick=p.onQuick;
  if(!goals||!goals.length)return null;
  return <div className="goals-panel"><div className="lh">今日できること</div>{goals.map(function(g){return <QuestCard key={g.id} goal={enrichGoal(g,game)} onNav={onNav} onQuick={onQuick}/>;})}</div>;
}
function QuestCard(p){
  var g=p.goal,onNav=p.onNav,onQuick=p.onQuick;
  var [open,setOpen]=useState(false);
  function runAction(e){
    if(e)e.stopPropagation();
    if(!g.action)return;
    if(g.action.screen==="quick"&&onQuick)onQuick(g.action);
    else onNav&&onNav(g.action.screen,{target:g.action.target,tier:g.action.tier,who:g.action.who});
  }
  return(<div className={"qcard"+(g.done?" qcard-done":open?" qcard-open":"")}>
    <div className="qcard-h" role="button" tabIndex="0" onClick={function(){if(!g.done)setOpen(function(v){return !v;});}}>
      <span className="qc-icon">{g.done?"✓":g.icon}</span>
      <span className="qc-title">{g.label}</span>
      {!g.done&&g.action&&<button type="button" className="qc-quick qc-quick-btn" onClick={runAction}>{g.action.label||"実行"}</button>}
      {!g.done&&<span className="qc-arr">{open?"▲":"▼"}</span>}
    </div>
    {open&&!g.done&&<div className="qcard-body">
      {g.what&&<div className="qcr"><span className="qcl">やること</span><span>{g.what}</span></div>}
      {g.rec&&<div className="qcr"><span className="qcl">おすすめ</span><span className="qc-rec">{g.rec}</span></div>}
      {g.reward&&<div className="qcr"><span className="qcl">報酬</span><span className="qc-reward">{g.reward}</span></div>}
      {g.risk&&g.risk!=="なし"&&<div className="qcr"><span className="qcl">リスク</span><span className="qc-risk">{g.risk}</span></div>}
      {g.next&&<div className="qc-next">達成すると：{g.next}</div>}
      {g.action&&<button type="button" className="qcard-act" onClick={runAction}>{g.action.label}</button>}
    </div>}
  </div>);
}
function NextChangesPanel(p){
  var game=p.game;
  var statusToPlace={unreceived:"unexplored_forest",stored:"post_office",openable:"tears_spring",checking:"record_tower"};
  var activeEmber=getActiveEmber(game);
  var changes=PKEYS.map(function(k){
    var m=game.world.map[k]||{};var lv=m.level||1,pct=Math.round((m.progress_rate||0)*100);
    return{key:k,name:PSHORT[k],toNext:100-pct,lv:lv,nextLvName:getPlaceLvName(k,lv+1),nextEff:PLACE_NEXT_EFFECT[k]||""};
  }).filter(function(x){return x.toNext>0&&x.toNext<100;}).sort(function(a,b){return a.toNext-b.toNext;}).slice(0,3);
  return(
    <div className="nxt-panel">
      {activeEmber&&<div className="nxt-ember">
        <span className="nxt-ember-lbl">処理中</span>
        <span className="nxt-ember-title">「{makeEmberTitle(activeEmber)}」</span>
        <span className="nxt-ember-loc">{EMBER_STATUS[activeEmber.status]&&EMBER_STATUS[activeEmber.status].label}</span>
        <div className="nxt-ember-bar"><Bar value={activeEmber.progress||0} color="var(--ember)" h={3}/></div>
        <span className="nxt-ember-next">あと{Math.max(0,100-Math.round(activeEmber.progress||0))}%で{getEmberNextLabel(activeEmber.status)}</span>
      </div>}
      {changes.map(function(uc,i){return(
        <div key={i} className="nxt-row">
          <div className="nxt-row-top">
            <span className={"nxt-dot cd-"+uc.key}/>
            <span className="nxt-name">{uc.name}</span>
            <span className="nxt-soon">あと{uc.toNext}%</span>
          </div>
          <div className="nxt-row-sub">Lv.{uc.lv+1}「{uc.nextLvName}」— {uc.nextEff}</div>
        </div>
      );})}
    </div>
  );
}

function PlacesPanel(p){
  var game=p.game;var items=getAllDeltas(game);
  return <div className="ppl2">{items.map(function(it){
    var dp=it.dp!==null?Math.round(it.dp*100):null;
    var d1=it.d1!==null?Math.round(it.d1*100):null;
    var bigD=dp!==null?dp:d1;
    var toNext=100-it.pct;var nextLvName=getPlaceLvName(it.key,it.level+1);var nextEffect=PLACE_NEXT_EFFECT[it.key]||"";
    return(
      <div key={it.key} className="pcard2">
        <div className="pc2h">
          <span className="pc2n">{it.name}</span>
          {bigD!==null&&bigD>0&&<span className="pc2big">+{bigD}%</span>}
        </div>
        <Bar value={it.pct} color={PCOL(it.key)} h={5}/>
        <div className="pc2f">
          <span className="pc2stat">Lv.{it.level}「{getPlaceLvName(it.key,it.level)}」 {it.pct}%</span>
          <div className="pc2ds">
            {dp!==null&&dp>0&&<span className="pc2d pc2dp">今回 +{dp}%</span>}
            {d1!==null&&d1>0&&<span className="pc2d pc2d1">1h +{d1}%</span>}
          </div>
        </div>
        {toNext>0&&toNext<100&&<div className="pc2-next">
          <span className="pc2-next-txt">あと{toNext}%で Lv.{it.level+1}「{nextLvName}」</span>
          {nextEffect&&<span className="pc2-next-eff">{nextEffect}</span>}
        </div>}
      </div>
    );
  })}</div>;
}
function GaugesPanel(p){var game=p.game,prog=p.prog;return <div className="gpl">{CHAR_IDS.filter(function(id){return isCharMet(game,id);}).map(function(id){var c=game.characters[id],pct=Math.round(prog[id]||0),st=computeStatus(c);return <div key={id} className="gr"><span className={"gd cd-"+id}/><span className="gn">{NAMES[id]}</span><span className="ga">{ALBL[c.lastAction]||c.lastAction}</span><div className="gb"><Bar value={pct} color={"var(--c"+id[0]+")"} h={3}/></div><span className="gp">{pct}%</span>{st!=="normal"&&<Badge status={st}/>}</div>;})} {isCharMet(game,"auditor")&&<div className="gr ga2"><span className="gd cd-auditor"/><span className="gn">審査官</span><span className="ga">{"圧 "+game.characters.auditor.stats.pressure}</span><div className="gb"><Bar value={game.characters.auditor.stats.pressure} color="var(--ca)" h={3}/></div><AudBadge pressure={game.characters.auditor.stats.pressure} mode={game.characters.auditor.mode}/></div>}</div>;}
function LiveFeed(p){var events=p.events;var ref=useRef(null);useEffect(function(){if(ref.current)ref.current.scrollTop=0;},[events.length]);if(!events.length)return <div className="le2">世界が動き始めるまで、少し待って。</div>;return <div className="lf" ref={ref}>{events.map(function(e,i){return <div key={i} className={"lev ev-"+e.kind}><span className="lt">{fmtT(e.time)}</span><pre className="lxt">{e.text}</pre></div>;})}</div>;}
function CharCard(p){
  var id=p.id,c=p.c,prog=p.prog,game=p.game,expanded=p.expanded,onToggle=p.onToggle;
  var isA=id==="auditor",scene=isA?null:getScene(id,c,game);
  var fires=!isA?getEmbersForCharacter(game,id):[];
  var mainFire=fires[0]||null;
  return <div className={"cc"+(expanded?" cc-o":"")} style={{"--ac":"var(--c"+id[0]+")"}}>
  <button className="ccb" onClick={onToggle}>
    <div className="cct">
      <span className="ccn">{NAMES[id]}</span>
      <span className="ccr">{ROLES[id]}</span>
      {mainFire&&<span className="cc-fire">🔥{fires.length}</span>}
      {isA?<AudBadge pressure={c.stats.pressure} mode={c.mode}/>:<Badge status={computeStatus(c)}/>}
      <span className="cca">{expanded?"▲":"▼"}</span>
    </div>
    {scene&&<p className="ccs">{scene}</p>}
    {mainFire&&<div className="cc-ember-line">
      <span className="cc-ember-state">{getEmberUnitLabel(mainFire)}</span>
      <span className="cc-ember-title">「{makeEmberTitle(mainFire)}」</span>
      <span className="cc-ember-pct">{Math.round(mainFire.progress||0)}%</span>
    </div>}
    <div className="ccc">{isA?<span className="cs">圧力 {c.stats.pressure}</span>:<><span className="cs">疲労 {c.stats.fatigue}</span><span className="cs">{ULABEL[id]} {c.stats[UKEY[id]]}</span>{prog!==undefined&&<div className="mp"><Bar value={Math.round(prog||0)} color={"var(--c"+id[0]+")"} h={2}/></div>}</>}</div>
  </button>
  {expanded&&<div className="ccd">{isA?<><div className="dst"><div className="dtt"><span>圧力</span><span className="sv">{c.stats.pressure}</span></div><Bar value={c.stats.pressure} color="var(--ca)"/></div><AudBadge pressure={c.stats.pressure} mode={c.mode}/><p className="dn">圧力が下がりきると、いつか検品係になる。</p></>:<><div className="dst"><div className="dtt"><span>疲労</span><span className="sv">{c.stats.fatigue}</span></div><Bar value={c.stats.fatigue} color={fatC(c.stats.fatigue)}/></div><div className="dst"><div className="dtt"><span>安定</span><span className="sv">{c.stats.stability}</span></div><Bar value={c.stats.stability} color="var(--calm)"/></div><div className="dst"><div className="dtt"><span>{ULABEL[id]}</span><span className="sv">{c.stats[UKEY[id]]}</span></div><Bar value={c.stats[UKEY[id]]} color={"var(--c"+id[0]+")"}/></div>{mainFire&&<div className="dst cc-ember-detail"><div className="dtt"><span>担当している問い炎</span><span className="sv">{Math.round(mainFire.progress||0)}%</span></div><Bar value={mainFire.progress||0} color="var(--ember2)"/><p className="dn">「{makeEmberTitle(mainFire)}」 / {getEmberUnitLabel(mainFire)}</p></div>}</>}<div className="bds">{Object.keys(c.bonds).map(function(k){return <div key={k} className="br"><span className={"nd cd-"+k}/><span className="bn">{NAMES[k]}</span><div className="bb"><Bar value={c.bonds[k]} color="var(--ac)"/></div><span className="bv">{c.bonds[k]}</span></div>;})}</div></div>}
</div>;
}

function JudgmentRoutePanel(p){
  var game=p.game;
  var card=(game.emberCards||[]).find(function(c){return c.route==="judgment_conversion";});
  if(!card)return null;
  return(
    <div className="judgment-route-panel">
      <div className="jrp-kicker">問い変換</div>
      <div className="jrp-title">判決にしないで、問いとして置く</div>
      <div className="jrp-flow">
        <span>残り火が届く</span>
        <b>→</b>
        <span>判決にしない</span>
        <b>→</b>
        <span>問いとして置く</span>
        <b>→</b>
        <span>トイマンを待つ</span>
      </div>
      <div className="jrp-card">
        <div className="jrp-name">「{makeEmberTitle(card)}」</div>
        <div className="jrp-question">問い：{card.question||"これは、何になってほしかったのか？"}</div>
        <div className="jrp-place">置き場所：{card.storagePlace||"はじまりの部屋・出発待ち"} / 出発させると、トイマンが未受領の森へ向かう</div>
      </div>
    </div>
  );
}

function QuestionTicketPanel(p){
  var ev=p.game&&p.game.recentQuestionTicket;
  if(!ev)return null;
  return <div className="question-ticket-panel qtp-return">
    <div className="qtp-k">トイマン帰還</div>
    <div className="qtp-title">答えではなく、問いを持ち帰りました</div>
    <p>トイマンが森の奥から戻ってきました。カバンの中には、焦げた問い札があります。</p>
    <div className="qtp-question">「{ev.question}」</div>
    <p>かなが水を置きました。勝ったからではなく、落とさず帰ってきたから記録します。</p>
    <p>問い札はうつろへ渡され、残り火は保管中へ移動しました。消えずに、次の場所へ送られます。</p>
  </div>;
}

const UNIT_ACTING_VERB={exploring:"探している",resting:"そばにいる",reading:"読んでいる",checking:"確認している",storing:"預かっている"};
function ProcessingLine(p){
  var game=p.game,cards=game.emberCards||[];
  var counts={exploring:0,resting:0,reading:0,checking:0,storing:0,completed:0};
  cards.forEach(function(c){if(c.unitState&&counts[c.unitState]!==undefined)counts[c.unitState]++;});
  var steps=[
    {label:"探索中",key:"exploring",col:"var(--ct)"},
    {label:"休息中",key:"resting",col:"var(--ck)"},
    {label:"読解中",key:"reading",col:"var(--co)"},
    {label:"検品中",key:"checking",col:"var(--ca)"},
    {label:"保管中",key:"storing",col:"var(--cu)"},
    {label:"受領待ち",key:"completed",col:"var(--ember2)"},
  ];
  var active=cards.find(function(c){return c.unitState&&c.unitState!=="waiting"&&c.unitState!=="completed";});
  return(
    <div className="proc-wrap">
      <div className="lh">処理の流れ</div>
      <div className="proc-pills">
        {steps.map(function(st,i){var n=counts[st.key];var isA=active&&active.unitState===st.key;return(
          <div key={i} className={"proc-pill"+(isA?" proc-pill-on":n>0?" proc-pill-has":"")}>
            <span className="pp-lbl">{st.label}</span>
            {n>0&&<span className="pp-n" style={{background:st.col}}>{n}</span>}
            {isA&&<Bar value={active.progress||0} color={st.col} h={2}/>}
          </div>
        );})}
      </div>
      {active&&<div className="proc-current">{active.questionPending?<>「{makeEmberTitle(active)}」に問い札が出ています。次へ進むには、残り火タブで問いを受け取ります。</>:<>{NAMES[(getUnitFlow(active)||{}).who]||""}が「{makeEmberTitle(active)}」を{UNIT_ACTING_VERB[active.unitState]||"扱っている"}。あと{Math.max(0,100-Math.round(active.progress||0))}%で問い札が発生します。</>}</div>}
    </div>
  );
}
function EmberView(p){
  var game=p.game,onReceive=p.onReceive,onOpenCreate=p.onOpenCreate,onDepart=p.onDepart,onDelete=p.onDelete,onAdvance=p.onAdvance,onBurnReceipt=p.onBurnReceipt,onEditEmber=p.onEditEmber;
  var next=getNextAction(game);
  var [editingId,setEditingId]=useState(null);
  var [editTitle,setEditTitle]=useState("");
  var [editMemo,setEditMemo]=useState("");
  var [editBody,setEditBody]=useState("");
  var [editReaction,setEditReaction]=useState("");
  var [customAnswerId,setCustomAnswerId]=useState(null);
  var [customAnswerText,setCustomAnswerText]=useState("");
  function openEdit(card){setEditingId(card.id);setEditTitle(card.title||"");setEditMemo(card.memo||"");setEditBody(card.bodyText||"");setEditReaction(card.reaction||"");}
  function saveEdit(id){onEditEmber&&onEditEmber(id,{title:editTitle,memo:editMemo,bodyText:editBody,reaction:editReaction});setEditingId(null);}
  var cards=game.emberCards||[];var receipts=game.receipts||[];
  var awaiting=cards.filter(function(c){return c.status==="awaiting"&&!c.unitState;});
  var ready=cards.filter(function(c){return c.status==="ready"&&!c.unitState;});
  var inProg=cards.filter(function(c){return c.status!=="ready"&&c.status!=="awaiting"&&!c.unitState;});
  var units=cards.filter(function(c){return c.unitState;});
  function deleteButton(card){return <button className="ev-del-btn" onClick={function(e){e.stopPropagation();onDelete&&onDelete(card.id);}}>削除</button>;}
  function editButton(card){return <button className="ev-edit-btn" onClick={function(e){e.stopPropagation();openEdit(card);}}>編集</button>;}
  function editForm(card){
    if(editingId!==card.id)return null;
    return <div className="ev-edit-form">
      <div className="ev-edit-note">あとから情報を追加・変更できます。</div>
      <label className="ec-field"><span>タイトル</span><input type="text" value={editTitle} placeholder="例：読まれなかった記事の残り火" onChange={function(e){setEditTitle(e.target.value);}}/></label>
      <label className="ec-field"><span>補足情報</span><input type="text" value={editMemo} placeholder="例：公開したあと、何度も通知を見た" onChange={function(e){setEditMemo(e.target.value);}}/></label>
      <label className="ec-field"><span>あなたの言葉</span><textarea value={editBody} placeholder="読まれなかったことより、何も返ってこなかったことが痛かった。" onChange={function(e){setEditBody(e.target.value);}}/></label>
      <label className="ec-field"><span>反応・評価・スキの数など</span><textarea value={editReaction} placeholder="例：いいね3件、コメントなし" onChange={function(e){setEditReaction(e.target.value);}}/></label>
      <div className="ev-edit-actions">
        <button className="btn btn-g" onClick={function(){setEditingId(null);}}>やめる</button>
        <button className="btn btn-p" onClick={function(){saveEdit(card.id);}}>保存する</button>
      </div>
    </div>;
  }
  function unitCard(card){
    var flow=getUnitFlow(card)||EMBER_UNIT_FLOW.completed;
    var place=getEmberPlace(card);
    var pending=!!card.questionPending;
    var isCompleted=card.unitState==="completed"||card.status==="ready";
    return(<div key={card.id} className={"ev-card ev-unit ev-unit-"+card.unitState+(pending?" ev-question-pending":"")}>
      <div className="ev-card-head">
        <div>
          <div className="ev-card-title">{makeEmberTitle(card)}</div>
          <div className="ev-unit-meta">{NAMES[flow.who]||"—"}が見ている — {PNAME[place]}</div>
        </div>
        <div className="ev-head-btns">
          {editButton(card)}
          {deleteButton(card)}
        </div>
      </div>
      {editForm(card)}
      {card.route==="judgment_conversion"&&<div className="ev-route-badge">判決火 → 問い火</div>}
      {card.soul&&<div className="ev-soul-badge">魂入り — この残り火は、あなたの言葉を持っています</div>}
      <DeliveredWordsBox card={card}/>
      {card.questionTicket&&<div className="ev-ticket-box">
        <div className="evt-k">探索完了 / 問い札発見</div>
        <div className="evt-title">焦げた問い札</div>
        <p>トイマン：「全部ではない」「でも、落ちていた」「これは、廃棄物ではない」「未受領の問い」「置いていかない」</p>
        <div className="evt-question">「{card.questionTicket.question}」</div>
        <div className="evt-hand">問いの欠片を受け取りました。</div>
      </div>}
      {card.unitState==="exploring"&&(function(){
        var scene=getEmberExploreScene(card);
        var pct=Math.round(card.progress||0);
        return <div className="ev-exploring-box">
          <div className="eeb-scene">
            {scene.map(function(L,i){
              if(L.s==="stage")return <p key={i} className="eeb-stage">{L.t}</p>;
              return <div key={i} className="eeb-line">
                <div className="eeb-namerow"><span className={"isc-dot cd-"+L.s+" eeb-dot"}/><span className="eeb-speaker">{NAMES[L.s]||L.s}</span></div>
                <span className="eeb-say">「{L.t}」</span>
              </div>;
            })}
          </div>
          <div className="eeb-footer">
            <span className="eeb-label">{pct<20?"まだ入口付近":pct<50?"森の中ほど":pct<80?"かなり深く":"届きそう"}</span>
            <span className="eeb-pct">回収率 {pct}%</span>
          </div>
          <div className="eeb-watch-hint">箱庭タブで「見守る」と、少しだけ近づきます</div>
        </div>;
      })()}
      <div className="ev-unit-progress">
        <div className="eup-top"><span>{isCompleted?"受領準備":pending?"問い札発生":card.unitState==="exploring"?"回収率":"次の問いまで"}</span><b>{isCompleted?"完了":Math.round(card.progress||0)+"%"}</b></div>
        <Bar value={isCompleted?100:(card.progress||0)} color="var(--ember2)" h={5}/>
      </div>
      {pending&&<div className="ev-pending-ticket">
        <div className="ept-k">問い札が出ています</div>
        <div className="ept-q">「{(card.pendingQuestion&&card.pendingQuestion.question)||flow.question}」</div>
        <p>答えても、答えなくても、先へ進めます。答えれば、この火はより深く汲み取られます。</p>
      </div>}
      {!pending&&!isCompleted&&card.unitState!=="exploring"&&card.unitState!=="waiting"&&<div className="ev-unit-question ev-unit-question-wait">
        <div className="euq-label">次に生まれる問い</div>
        <div className="euq-text">{flow.question}</div>
      </div>}
      {card.unitState==="waiting"&&!isCompleted&&<div className="ev-depart-box">
        <div className="hdb-title">状態：出発待ち</div>
        <div className="ev-toyman-react">
          <p className="etr-line">残り火が届いている。</p>
          <p className="etr-meta">状態：{card.writeState||"—"}<br/>感情：{card.feeling||"—"}<br/>本当は：{card.wanted||"—"}</p>
          <p className="etr-stage">はじまりの部屋の灯りが、一度だけ揺れた。<br/>トイマンは顔を上げた。</p>
          <p className="etr-say">「森に、残り火」<br/>「つよい」<br/>「未回収」<br/>「いま行く」</p>
        </div>
        <button className={"btn btn-p touchable"+(next&&next.action==="depart"&&next.cardId===card.id?" btn-next-action":"")} onClick={function(){onDepart&&onDepart(card.id);}}>トイマンを未受領の森へ出発させる</button>
      </div>}
      {isCompleted&&<div className="ev-receive-ready-box">
        <div className="err-k">受領待ち</div>
        <p>箱庭側の回収は終わっています。ここから先は、あなたが受け取る段階です。</p>
        <div className="err-q">問い：{flow.question}</div>
        <button className={"btn btn-p touchable"+(next&&next.action==="receive"&&next.cardId===card.id?" btn-next-action":"")} onClick={function(){onReceive&&onReceive(card.id);}}>自分で受け取る</button>
      </div>}
      {card.answers&&card.answers.length>0&&<div className="ev-answer-log">
        {card.answers.slice(-3).map(function(a,i){return <span key={i}>「{a.answer}」</span>;})}
      </div>}
      {card.unitState!=="waiting"&&flow.choices&&flow.choices.length>0&&!isCompleted?<div className="ev-choice-grid">
        {pending&&<button className="ev-choice-btn ev-choice-skip" onClick={function(){onAdvance&&onAdvance(card.id,"",false);}}>答えずに、このまま進む</button>}
        {pending?flow.choices.map(function(ch,ci){return <button key={ch} className={"ev-choice-btn"+(next&&next.action==="answer"&&next.cardId===card.id&&ci===0?" btn-next-action":"")} onClick={function(){onAdvance&&onAdvance(card.id,ch,false);}}>{ch}</button>;}):<button className="ev-choice-btn ev-choice-wait" disabled>ゲージ100%で問い札が出ます</button>}
        {pending&&customAnswerId!==card.id&&<button className="ev-choice-btn ev-choice-custom" onClick={function(){setCustomAnswerId(card.id);setCustomAnswerText("");}}>自分の言葉で答える</button>}
        {pending&&customAnswerId===card.id&&<div className="ev-custom-answer">
          <textarea value={customAnswerText} placeholder="自分の言葉で答えてください。" onChange={function(e){setCustomAnswerText(e.target.value);}}/>
          <div className="ev-custom-note">答えると、この火に魂が入り、より深く汲み取られます。</div>
          <div className="ev-custom-actions">
            <button className="btn btn-g" onClick={function(){setCustomAnswerId(null);}}>やめる</button>
            <button className="btn btn-p" disabled={!customAnswerText.trim()} onClick={function(){onAdvance&&onAdvance(card.id,customAnswerText.trim(),true);setCustomAnswerId(null);}}>この言葉で受け取る</button>
          </div>
        </div>}
      </div>:!isCompleted&&<div className="ev-completed-msg">この残り火は、今日は休息に入りました。消えたわけではありません。</div>}
      {card.changeLog&&card.changeLog.length>0&&<div className="ev-change-log">
        <div className="ev-change-title">変化ログ</div>
        {card.changeLog.slice(-4).map(function(l,i){return <div key={i} className="ev-change-line">{l}</div>;})}
      </div>}
    </div>);
  }
  return(<div className="scroll"><div className="ev-wrap">
    <button className="ev-create-btn touchable" onClick={onOpenCreate}>+ 残り火を預ける</button><JudgmentRoutePanel game={game}/><QuestionTicketPanel game={game}/>
    {cards.length===0&&<div className="ev-empty">
      <div className="ev-empty-k">まだ残り火はありません。</div>
      <div className="ev-empty-title">書いたあとに、心に残ってしまったもの。</div>
      <p>終わったはずなのに、まだどこかに残っている問い。<br/>それが、この箱庭では「残り火」になります。</p>
      <p>ここには、あなたが預けた火だけが並びます。</p>
      <p>書いて満足できた日は、それで大丈夫です。<br/>その日は、ここに残すものはありません。</p>
      <p>また何かが残ってしまった日に、ここへ置きにきてください。</p>
      <button className="btn btn-p touchable" onClick={onOpenCreate}>残り火を預ける</button>
    </div>}
    {units.length>0&&<div className="ev-section">
      <div className="lh">状態を持つ残り火</div>
      {units.map(unitCard)}
    </div>}
    {awaiting.length>0&&<div className="ev-section">
      <div className="lh">出発待ち</div>
      {awaiting.map(function(card){return(<div key={card.id} className="ev-card ev-awaiting">
        <div className="ev-card-head"><div className="ev-card-title">{makeEmberTitle(card)}</div><div className="ev-head-btns">{editButton(card)}{deleteButton(card)}</div></div>
        {editForm(card)}
        <div className="ev-card-meta">{card.feeling&&<span className="ev-tag">{card.feeling}</span>}{card.wanted&&<span className="ev-tag">{card.wanted}</span>}</div>
        {card.soul&&<div className="ev-soul-badge">魂入り — この残り火は、あなたの言葉を持っています</div>}
        <DeliveredWordsBox card={card} compact={true}/>
        <div className="ev-card-desc">あなたが送った残り火を、トイマンが未受領の森で回収してくれます。見つけるのは答えではなく、問いの欠片です。</div>
        <button className="btn btn-p touchable" style={{marginTop:10}} onClick={function(){onDepart&&onDepart(card.id);}}>トイマンを出発させる</button>
      </div>);})}
    </div>}
    {ready.length>0&&<div className="ev-section">
      <div className="lh">受領できる封筒</div>
      {ready.map(function(card){return(<div key={card.id} className="ev-card ev-ready">
        <div className="ev-card-head"><div className="ev-card-title">{makeEmberTitle(card)}</div><div className="ev-head-btns">{editButton(card)}{deleteButton(card)}</div></div>
        {editForm(card)}
        <div className="ev-card-meta">{card.feeling&&<span className="ev-tag">{card.feeling}</span>}{card.wanted&&<span className="ev-tag">{card.wanted}</span>}</div>
        {card.soul&&<div className="ev-soul-badge">魂入り — この残り火は、あなたの言葉を持っています</div>}
        <DeliveredWordsBox card={card} compact={true}/>
        <div className="ev-card-desc">はじまりの部屋で、自分宛ての封筒が待っています。</div>
        <button className="btn btn-p touchable" style={{marginTop:10}} onClick={function(){onReceive(card.id);}}>自分で受け取る</button>
      </div>);})}
    </div>}
    {inProg.length>0&&<div className="ev-section">
      <div className="lh">処理中</div>
      {inProg.map(function(card){var st=EMBER_STATUS[card.status]||{};return(<div key={card.id} className="ev-card">
        <div className="ev-card-head"><div className="ev-card-title">{makeEmberTitle(card)}</div><div className="ev-head-btns">{editButton(card)}{deleteButton(card)}</div></div>
        {editForm(card)}
        <div className="ev-card-status">{st.who?<span className={"nd cd-"+st.who}/>:null}<span className="ev-st-lbl">{st.label}</span></div>
        <Bar value={card.progress||0} color={st.col||"var(--dim)"} h={4}/>
        <div className="ev-progress-info"><span>現在 {Math.round(card.progress||0)}%</span><span>あと {Math.max(0,100-Math.round(card.progress||0))}% で {getEmberNextLabel(card.status)}</span></div>
        <DeliveredWordsBox card={card} compact={true}/>
      </div>);})}
    </div>}
    {receipts.length>0&&<div className="ev-section">
      <div className="lh">受領証</div>
      <p className="ev-receipt-guide">卒業した受領証は「心へ返す」ことができます。心へ返すと、その分だけ箱庭が静かになっていきます。卒業したものを全部返しきると、ひとつの区切りが訪れます。</p>
      {receipts.map(function(r){var grad=r.receiptStatus==="graduated";return(<ReceiptCard key={r.id} r={r} grad={grad} game={game} onBurnReceipt={onBurnReceipt}/>);})}
    </div>}
    {receipts.length>0&&<div className="ev-section">
      <div className="lh">問いの記録</div>
      <p className="ev-q-history-note">受領証から生まれた問いの軌跡です。</p>
      <div className="ev-q-history">
        {receipts.filter(function(r){return r.nextQuestion;}).map(function(r,i){return(
          <div key={i} className="evqh-item">
            <div className="evqh-title">「{r.title}」</div>
            <div className="evqh-q">「{r.nextQuestion}」</div>
          </div>
        );})}
      </div>
      {receipts.filter(function(r){return r.holdText;}).length>0&&<div className="ev-hold-log">
        <span className="isc-dot cd-utsuro ev-hold-dot"/>
        <span className="ev-hold-utsuro">うつろ：</span>
        <span>「保留にしたものが、{receipts.filter(function(r){return r.holdText;}).length}つある。捨てていない」</span>
      </div>}
    </div>}
    {(game.returnedToHeart||[]).length>0&&<div className="ev-section">
      <div className="lh">心へ返したもの</div>
      <div className="ev-returned-list">
        {(game.returnedToHeart||[]).map(function(r,i){return <div key={i} className="ev-returned-item">「{r.title}」<span className="eri-sub">心へ戻した</span></div>;})}
      </div>
    </div>}
  </div></div>);
}
function MetricInput(p){
  var label=p.label,value=p.value,onChange=p.onChange;
  return <label className="metric-input">
    <span>{label}</span>
    <input type="range" min="0" max="100" step="5" value={value} onChange={function(e){onChange&&onChange(pctNum(e.target.value));}}/>
    <b>{pctNum(value)}%</b>
  </label>;
}

var NEXT_QUESTION_CHOICES={
  "本当は、誰に届いてほしかった？":["特定の誰かひとり","好きな人や大切な人","読んでくれると思っていた人","誰でもいいから、誰か","自分自身","まだわからない"],
  "本当は、何になってほしかった？":["誰かの役に立つものに","認められるものに","消えずに残るものに","自分の証明に","誰かに届くものに","ただ、完成したものに"],
  "反応のかわりに、本当は何が返ってきてほしかった？":["「読んだよ」の一言","感想や共感","驚きや感動","批評や意見","ただの存在承認","自分でもわからない"],
  "燃えていた間、本当は何を作ろうとしていた？":["誰かに届く言葉","自分の記録","価値あるもの","美しいもの","自分だけのもの","わからない"],
  "見せるとしたら、まず誰に渡したかった？":["特定の誰か","親や家族","友人や知人","まったく知らない誰か","自分の未来の自分","誰にも渡さなくていい"],
  "消したい理由と、消せない理由、どちらが大きい？":["消したい理由のほうが大きい","消せない理由のほうが大きい","どちらも同じくらい","消したいが消せない","消せるけど消したくない","まだわからない"],
  "この火のそばに、今どんな感情がある？":["悲しさ","怒り","疲労","虚しさ","あきらめ","何も感じない"],
  "空っぽになる前、何を燃やしていた？":["時間と体力","期待と希望","承認されたい気持ち","誰かへの思い","自分への証明","わからない"],
  "本当は、どう終わってほしかった？":["認められて終わりたかった","誰かに届いて終わりたかった","自分が納得して終わりたかった","もっと続けたかった","形に残したかった","わからない"],
};
function ReceiptCard(p){
  var r=p.r,grad=p.grad;
  var [copied,setCopied]=useState(false);
  var insight=getEmberInsight(r,p.game);
  var daysSince=null;
  if(r.depositedAt&&r.receivedAt){var ms=new Date(r.receivedAt)-new Date(r.depositedAt);daysSince=Math.max(0,Math.round(ms/86400000));};
  function copyPrompt(){
    var prompt=buildGeminiPrompt(r);
    if(navigator.clipboard){
      navigator.clipboard.writeText(prompt).then(function(){setCopied(true);setTimeout(function(){setCopied(false);},2500);});
    }else{
      var ta=document.createElement("textarea");ta.value=prompt;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);setCopied(true);setTimeout(function(){setCopied(false);},2500);
    }
  }
  return <div className={"ev-receipt"+(grad?" ev-receipt-grad":"")}>
    <div className="ev-receipt-head">
      <div className="ev-card-title">{r.title}</div>
      <span className={"ev-receipt-badge "+(grad?"erb-grad":"erb-prov")}>{grad?"卒業":"仮"}</span>
    </div>
    {daysSince!==null&&<div className="ev-receipt-days">{daysSince===0?"預けた日に届いた":daysSince+"日後に届いた"}</div>}
    <div className={"ev-cherish ec-stage-"+insight.stage}>
      <div className="ev-cherish-head">
        <span className="ev-cherish-label">{insight.label}</span>
        <span className="ev-cherish-dots">{[0,1,2,3,4].map(function(i){return <span key={i} className={"ec-dot"+(i<=insight.stage?" ec-dot-on":"")}/>;})}</span>
      </div>
      <p className="ev-cherish-text">{insight.text}</p>
      {insight.stage<4&&<p className="ev-cherish-hint">{insight.stage<2?"時間が経つほど、深く汲み取られていく。":"問いに答えると、さらに深く汲み取られる。"}</p>}
    </div>
    <ReceiptWordsBox receipt={r}/><ReceiptMetricBox receipt={r}/><pre className="ev-receipt-text">{r.text}</pre>
    {r.changeNote&&r.changeNote.trim()&&<div className="ev-change-note"><span className="ev-change-label">変化の記録</span><p>{r.changeNote}</p></div>}
    {(r.shadowAnswers||[]).length>0&&<div className="ev-shadow-answers">
      <div className="bsa-log-title">影と向き合った記録（{r.shadowAnswers.length}回）</div>
      {r.shadowAnswers.map(function(a,i){return <div key={i} className="bsa-log-item"><span className="bsa-shadow">「{a.shadow}」</span><span className="bsa-ans">→「{a.answer}」</span></div>;})}
    </div>}
    <div className="receipt-ai-block">
      <div className="receipt-ai-title">AIで深く読む</div>
      <p className="receipt-ai-desc">この受領証の全記録をもとにした詳細プロンプトを生成します（Geminiなど外部AIに貼り付けます）。<br/><a className="acc-ai-link" href="https://gemini.google.com" target="_blank" rel="noopener noreferrer">gemini.google.com</a> に貼り付けると、あなたの火の形を言語化してくれます。</p>
      <button className={"btn acc-copy-btn"+(copied?" acc-copy-done":"")} onClick={copyPrompt}>
        {copied?"コピーしました ✓":"受領証プロンプトをコピー"}
      </button>
    </div>
    {grad?<button className="btn btn-burn touchable" onClick={function(){p.onBurnReceipt&&p.onBurnReceipt(r.id);}}>心へ返す（燃やす）</button>
      :<div className="ev-receipt-locked">プラス変化が30%に届くと、心へ返せます（今 {r.positiveGrowthTotal||0}%）</div>}
  </div>;
}
function buildGeminiPrompt(receipt){
  var lines=[];
  lines.push("# 残り火の受領証 — 深層読解プロンプト");
  lines.push("");
  lines.push("以下は、ある人が「残り火の箱庭」というアプリで預けた感情の記録です。");
  lines.push("この人の内側にあったものを、階層立てて丁寧に読み解いてください。");
  lines.push("");
  lines.push("## お願いしたいこと");
  lines.push("- アドバイスや評価はしないでください");
  lines.push("- 「あなたは〇〇だ」と断定せず、「〜だったのかもしれない」「〜があったように見える」という寄り添う文体で書いてください");
  lines.push("- 以下の4つの視点で分けて書いてください：");
  lines.push("  1. **この火の中にあったもの** — 感情の核にあったものは何か");
  lines.push("  2. **本当はどうしたかったのか** — 表には出なかった願いや期待");
  lines.push("  3. **問いを持ち歩いた意味** — この人が問いと向き合うことで何が動いたか");
  lines.push("  4. **今日のこの人へ** — 判決を下さず、ただそばにいる一言");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 記録データ");
  lines.push("");
  if(receipt.writeState)lines.push("**状態（残り火の種類）：** "+receipt.writeState);
  if(receipt.feeling)lines.push("**そのときの感情：** "+receipt.feeling);
  if(receipt.wanted)lines.push("**本当は：** "+receipt.wanted);
  if(receipt.bodyText&&receipt.bodyText.trim()){
    lines.push("");
    lines.push("**あなたの言葉（自由記述）：**");
    lines.push(receipt.bodyText.trim());
  }
  if(receipt.memo&&receipt.memo.trim()&&receipt.memo!=="よくやった"){
    lines.push("");
    lines.push("**メモ：** "+receipt.memo.trim());
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 持ち帰った問い");
  if(receipt.questionTicket&&receipt.questionTicket.question){
    lines.push("「"+receipt.questionTicket.question+"」");
  }else if(receipt.nextQuestion){
    lines.push("「"+receipt.nextQuestion+"」");
  }else{
    lines.push("（問いはまだ定まっていない）");
  }
  if((receipt.shadowAnswers||[]).length>0){
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("## 影との対話の記録（"+receipt.shadowAnswers.length+"回）");
    lines.push("この人は「影」（自分の内側にある声）と向き合い、以下のように答えました：");
    lines.push("");
    receipt.shadowAnswers.forEach(function(a,i){
      lines.push((i+1)+". 影の声：「"+a.shadow+"」");
      lines.push("   この人の答え：「"+a.answer+"」");
    });
  }
  if(receipt.acceptanceText){
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("## 受け取り文（アプリが返した言葉）");
    lines.push(receipt.acceptanceText);
  }
  if(receipt.holdText){
    lines.push("");
    lines.push("**今日の保留：** "+receipt.holdText);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("以上の記録をもとに、4つの視点で読み解いてください。");
  lines.push("長さは合計400〜600字を目安に。この人の火がどんな形をしていたか、感じるように書いてください。");
  return lines.join("\n");
}

function AcceptanceModal(p){
  var [answer,setAnswer]=useState("");
  var [chosen,setChosen]=useState("");
  var choices=p.nextQuestion?(NEXT_QUESTION_CHOICES[p.nextQuestion]||[]):[];
  var hasChosen=chosen==="未回答"||chosen!==""||answer.trim()!=="";
  function selectChoice(c){setChosen(c);if(c!=="自由に書く")setAnswer("");}
  return <div className="ov" onClick={p.onClose}><div className="bsh acc-modal" onClick={function(e){e.stopPropagation();}}>
    <div className="sh-handle"/>
    <div className="acc-inner">
      {(function(){
        var card={writeState:p.writeState,feeling:p.feeling,wanted:p.wanted};
        var ex=getCharExchange(card);
        return <div className="acc-exchange">
          {ex.map(function(L,i){return(
            <div key={i} className="acc-ex-line">
              <div className="acc-ex-namerow"><span className={"isc-dot cd-"+L.s+" acc-ex-dot"}/><span className="acc-ex-name">{NAMES[L.s]||L.s}</span></div>
              <span className="acc-ex-say">「{L.t}」</span>
            </div>
          );})}
        </div>;
      })()}
      <p className="acc-text acc-text-small">{p.text}</p>
      {p.holdText&&<div className="acc-hold-block">
        <span className="isc-dot cd-utsuro acc-hold-dot"/>
        <span className="acc-hold-utsuro">うつろ：</span>
        <span className="acc-hold-text">{p.holdText}</span>
      </div>}
      {p.nextQuestion&&<div className="acc-question-box">
        <span className="acc-question-label">次の問い</span>
        <p className="acc-question">{p.nextQuestion}</p>
        {choices.length>0&&<div className="acc-choices">
          {choices.map(function(c){return(
            <button key={c} className={"acc-choice"+(chosen===c?" acc-choice-on":"")} onClick={function(){selectChoice(c);}}>{c}</button>
          );})
          }
          <button className={"acc-choice acc-choice-free"+(chosen==="自由に書く"?" acc-choice-on":"")} onClick={function(){selectChoice("自由に書く");}}>自由に書く</button>
          <button className={"acc-choice acc-choice-skip"+(chosen==="未回答"?" acc-choice-on":"")} onClick={function(){selectChoice("未回答");}}>未回答</button>
        </div>}
        {(chosen==="自由に書く"||choices.length===0)&&<textarea className="acc-answer-input" rows={3} placeholder="答えなくてもいい。書けたら書く。" value={answer} onChange={function(e){setAnswer(e.target.value);}}/>}
      </div>}
      <button className="btn btn-p" style={{width:"100%"}} onClick={p.onClose}>ここに置いておく</button>
    </div>
  </div></div>;
}

function ReceiptReceiveModal(p){
  var card=p.card||{};
  var initial=normalizeMetrics(card.initialMetrics);
  var [cmS,setCmS]=useState(initial.satisfaction);
  var [cmM,setCmM]=useState(initial.meaning);
  var [cmV,setCmV]=useState(initial.value);
  var [feeling,setFeeling]=useState("十分によくやったよ。読まれなかったけど、よくやったよ");
  var [memo,setMemo]=useState("よくやった");
  var [changeNote,setChangeNote]=useState("");
  var current=normalizeMetrics({satisfaction:cmS,meaning:cmM,value:cmV},initial);
  var growth=calcReceiptGrowth(initial,current);
  return <div className="ov" onClick={p.onClose}><div className="bsh receive-bsh" onClick={function(e){e.stopPropagation();}}>
    <div className="sh-handle"/>
    <p className="sh-title">「{card.title||(card.writeState||"残り火")}」が、届いています</p>
    <p className="sh-sub">箱庭側の回収は終わっています。ここから先は、あなたがどれだけ受け取れたかを記録します。</p>
    <DeliveredWordsBox card={card} compact={true}/>
    <div className="receive-current-box">
      <div className="ec-metric-title">受け取りの現在地</div>
      <MetricInput label="書いた納得" value={cmS} onChange={setCmS}/>
      <MetricInput label="書いた意味" value={cmM} onChange={setCmM}/>
      <MetricInput label="書いた価値" value={cmV} onChange={setCmV}/>
    </div>
    <div className="receive-preview">
      <div className="rm-title">最初の残り火 <span>→</span> 受け取りの現在地</div>
      {METRIC_KEYS.map(function(k){var d=growth.deltas[k];return <div key={k} className="rm-row">
        <b>{METRIC_LABELS[k]}</b><span className="rm-flow">{growth.initial[k]}% <i>→</i> {growth.current[k]}%</span><em className={d>=0?"rm-plus":"rm-minus"}>（{fmtDelta(d)}）</em>
      </div>;})}
      <div className="rm-total"><span>プラス変化合計：<b>{growth.positiveGrowthTotal}%</b></span><span>卒業条件：30%以上</span></div>
      <div className={growth.canGraduate?"rm-judge rm-ok":"rm-judge rm-wait"}>{growth.canGraduate?"卒業可能です。受け取れた部分があります。":"まだ卒業ではありません。仮受領証として残せます。"}</div>
    </div>
    <label className="ec-field"><span>受領した今の気持ち</span><textarea value={feeling} onChange={function(e){setFeeling(e.target.value);}}/></label>
    <label className="ec-field"><span>書く前と後で、何か変わりましたか？（任意）</span><textarea value={changeNote} placeholder="例：書いてみたら、怒りじゃなくて寂しさだったとわかった" onChange={function(e){setChangeNote(e.target.value);}}/></label>
    <label className="ec-field"><span>受領メモ</span><input type="text" value={memo} onChange={function(e){setMemo(e.target.value);}}/></label>
    <div className="receive-actions">
      <button className="btn btn-g" onClick={p.onClose}>戻る</button>
      <button className="btn btn-p" onClick={function(){p.onSubmit&&p.onSubmit({currentMetrics:current,receivedFeeling:feeling,receiptMemo:memo,changeNote:changeNote});}}>{growth.canGraduate?"受領証を作る":"仮受領証を作る"}</button>
    </div>
    <button className="btn btn-quiet receive-skip" onClick={function(){p.onSubmit&&p.onSubmit({currentMetrics:initial,receivedFeeling:feeling,receiptMemo:memo,changeNote:""});}}>記録せず、そのまま受け取る</button>
  </div></div>;
}

function EmberCreate(p){
  var [step,setStep]=useState(0);
  var [ws,setWs]=useState("");
  var [fe,setFe]=useState("");
  var [wa,setWa]=useState("");
  var [title,setTitle]=useState("");
  var [memo,setMemo]=useState("");
  var [body,setBody]=useState("");
  var [reaction,setReaction]=useState("");
  var [imS,setImS]=useState(50);
  var [imM,setImM]=useState(50);
  var [imV,setImV]=useState(50);
  var steps=[
    {q:"最近書いたあとに残っているものの状態は？",sub:"「書いたけど届かなかった」「書けたけど何かが残った」など、書き終えたあとの感覚です。",opts:WRITE_STATES,val:ws,set:setWs},
    {q:"何が残っていますか？",sub:"例：反応がなかった虚しさ、届かなかった悔しさ、読まれた実感のなさ",opts:FEELINGS,val:fe,set:setFe},
    {q:"本当は何を受け取ってほしかったですか？",sub:"例：読んだと言ってほしかった、何かが変わってほしかった、ただ存在を知ってほしかった",opts:WANTED,val:wa,set:setWa}
  ];
  var isInfo=step>=steps.length;
  var cur=steps[step];
  var hasSoul=!!(title.trim()||memo.trim()||body.trim()||reaction.trim());
  function submit(){
    p.onSubmit&&p.onSubmit({
      id:"e"+Date.now(),
      writeState:ws,feeling:fe,wanted:wa,
      title:title.trim()||null,memo:memo.trim(),bodyText:body.trim(),reaction:reaction.trim(),
      soul:hasSoul,
      initialMetrics:normalizeMetrics({satisfaction:imS,meaning:imM,value:imV}),
      status:"awaiting",progress:0,createdAt:nowISO()
    });
  }
  return(<div className="ov" onClick={p.onClose}><div className="bsh ec-bsh" onClick={function(e){e.stopPropagation();}}>
    <div className="sh-handle"/>
    <p className="sh-title">残り火を預ける</p>
    <p className="ec-ember-desc">残り火とは「書いたあとにのこった心残り」のことです</p>
    <p className="ec-step">{Math.min(step+1,steps.length+1)} / {steps.length+1}</p>
    {!isInfo&&<>
      <p className="ec-q">{cur.q}</p>
      {cur.sub&&<p className="ec-sub">{cur.sub}</p>}
      <div className="ec-opts">{cur.opts.map(function(opt){return(<button key={opt} className={"ec-opt"+(cur.val===opt?" ec-on":"")} onClick={function(){cur.set(opt);}}>{opt}</button>);})}</div>
    </>}
    {isInfo&&(function(){
      var total=imS+imM+imV;
      var isFulfilled=total>=240;
      return <div className="ec-extra">
        <p className="ec-q">追加情報</p>
        <div className="ec-note soul-note">ここは空欄でも預けられます。<br/>ただ、情報を入れることで、この残り火はあなたの魂になります。</div>
        <div className="ec-metric-box">
          <div className="ec-metric-title">最初の残り火</div>
          <p>数字は判決ではありません。今この瞬間の、あなたの正直な感覚を記録するだけです。あとで変化を見るときの、目印になります。</p>
          <MetricInput label="書いた納得" value={imS} onChange={setImS}/>
          <MetricInput label="書いた意味" value={imM} onChange={setImM}/>
          <MetricInput label="書いた価値" value={imV} onChange={setImV}/>
          {isFulfilled&&<div className="ec-fulfilled-msg">
            <p>あなたは、今すでに満たされているのかもしれません。</p>
            <p>書いた後に残った痛みや苦しみ——そういうものができたら、またここへ来てください。</p>
            <button className="btn btn-g" style={{width:"100%",marginTop:8}} onClick={p.onClose}>閉じる</button>
          </div>}
        </div>
        {!isFulfilled&&<>
          <label className="ec-field"><span>タイトル 任意</span><input type="text" value={title} placeholder="例：読まれなかった記事の残り火" onChange={function(e){setTitle(e.target.value);}}/></label>
          <label className="ec-field"><span>メモ 任意</span><input type="text" value={memo} placeholder="例：公開したあと、何度も通知を見た" onChange={function(e){setMemo(e.target.value);}}/></label>
          <label className="ec-field"><span>あなたの言葉 任意</span><textarea value={body} placeholder="読まれなかったことより、何も返ってこなかったことが痛かった。" onChange={function(e){setBody(e.target.value);}}/></label>
          <label className="ec-field"><span>反応・評価・スキの数など 任意</span><textarea value={reaction} placeholder="例：いいね3件、コメントなし／スキ0だった／読了率は良かったらしい" onChange={function(e){setReaction(e.target.value);}}/></label>
          <div className={"soul-preview"+(hasSoul?" soul-on":"")}>{hasSoul?"この残り火は、あなたの魂になっています。":"通常の残り火として預けられます。"}</div>
        </>}
      </div>;
    })()}
    <div className="ec-nav">
      {step>0&&<button className="btn btn-g" onClick={function(){setStep(function(s){return s-1;});}}>戻る</button>}
      {!isInfo&&<button className="btn btn-p" onClick={function(){if(cur.val)setStep(function(s){return s+1;});}} style={{opacity:cur.val?1:.45}}>次へ</button>}
      {isInfo&&(imS+imM+imV<240)&&<button className="btn btn-p" onClick={submit}>預ける</button>}
    </div>
    <button className="btn btn-g" style={{marginTop:4}} onClick={p.onClose}>閉じる</button>
  </div></div>);
}
function ClosingPreviewOverlay(p){
  return <div className="cpo-overlay" onClick={p.onClose}>
    <div className="cpo-inner">
      <div className="cpo-eyebrow">次に来たとき</div>
      <p className="cpo-text">{p.text}</p>
      <p className="cpo-hint">タップして閉じる</p>
    </div>
  </div>;
}
function PhilAnswerModal(p){
  var [answer,setAnswer]=useState("");
  return <div className="ov" onClick={p.onClose}><div className="bsh pam-bsh" onClick={function(e){e.stopPropagation();}}>
    <div className="sh-handle"/>
    <p className="sh-title">問いへの言葉</p>
    <div className="pam-q-box">
      <span className="isc-dot cd-kotae pam-dot"/>
      <p className="pam-q">「{p.question}」</p>
    </div>
    <p className="pam-note">答えなくていい。思ったことだけ、書けたら。</p>
    <textarea className="pam-input" rows={4} placeholder="例：虚しいというより、寂しかったのかもしれない" value={answer} onChange={function(e){setAnswer(e.target.value);}}/>
    <p className="pam-kotae"><span className="isc-dot cd-kotae"/>コタエが記録します。</p>
    <div className="receive-actions">
      <button className="btn btn-g" onClick={p.onClose}>閉じる</button>
      <button className="btn btn-p" onClick={function(){p.onSave(answer);}} style={{opacity:answer.trim()?1:.45}}>記録する</button>
    </div>
  </div></div>;
}
function WitnessOverlay(p){
  var card=p.card,game=p.game,onComplete=p.onComplete,onClose=p.onClose;
  var [idx,setIdx]=useState(0);
  if(!card||!game)return null;
  var lines=getWitnessLines(card,game);
  var cur=lines[idx];
  var isLast=idx>=lines.length-1;
  function next(){if(isLast){onComplete&&onComplete();}else{setIdx(function(i){return i+1;});}}
  return <div className="wit-overlay" onClick={next}>
    <div className="wit-inner">
      <div className="wit-eyebrow">見届ける</div>
      <div className="wit-ember-title">「{makeEmberTitle(card)}」</div>
      <div className="wit-scene">
        <div className="wit-line">
          <div className="wit-speaker-row"><span className={"isc-dot cd-"+cur.s+" wit-dot"}/><span className="wit-speaker">{NAMES[cur.s]||cur.s}</span></div>
          <p className="wit-say">「{cur.t}」</p>
        </div>
      </div>
      <div className="wit-prog">{idx+1} / {lines.length}</div>
      {isLast
        ?<button className="btn btn-p wit-complete-btn" onClick={function(e){e.stopPropagation();onComplete&&onComplete();}}>見届けた。受領証を作る</button>
        :<div className="wit-hint">タップして続き</div>}
    </div>
    <button className="wit-skip" onClick={function(e){e.stopPropagation();onClose&&onClose();}}>スキップ</button>
  </div>;
}
function SendGiftModal(p){
  var [chosen,setChosen]=useState(null);
  var [words,setWords]=useState("");
  var gifts=[
    {type:"water",label:"水",desc:"トイマンの疲労を少し回復させる",icon:"💧"},
    {type:"words",label:"言葉",desc:"ひとことを送る。少し前へ進む",icon:"✉"},
    {type:"light",label:"光",desc:"見守りの力を送る",icon:"🕯"},
  ];
  function doSend(){if(!chosen)return;p.onSend&&p.onSend({type:chosen.type,label:chosen.label,words:words});}
  return <div className="ov" onClick={p.onClose}><div className="bsh send-bsh" onClick={function(e){e.stopPropagation();}}>
    <div className="sh-handle"/>
    <p className="sh-title">トイマンへ送る</p>
    <p className="sh-sub">探索中のトイマンに、何かを届けられます。</p>
    <div className="send-gifts">
      {gifts.map(function(g){return <button key={g.type} className={"send-gift-btn"+(chosen&&chosen.type===g.type?" send-gift-on":"")} onClick={function(){setChosen(g);}}>
        <span className="sg-icon">{g.icon}</span>
        <span className="sg-label">{g.label}</span>
        <span className="sg-desc">{g.desc}</span>
      </button>;})}
    </div>
    {chosen&&chosen.type==="words"&&<label className="ec-field" style={{marginTop:8}}><span>一言</span><input type="text" value={words} placeholder="例：帰ってきてください" onChange={function(e){setWords(e.target.value);}}/></label>}
    <div className="receive-actions" style={{marginTop:12}}>
      <button className="btn btn-g" onClick={p.onClose}>閉じる</button>
      <button className="btn btn-p" style={{opacity:chosen?1:.45}} onClick={doSend}>送る</button>
    </div>
  </div></div>;
}
function ReturnConvOverlay(p){
  var conv=p.conv,onClose=p.onClose,onGoConv=p.onGoConv;
  var [lineIdx,setLineIdx]=useState(0);
  if(!conv)return null;
  var lines=conv.lines;
  var cur=lines[lineIdx];
  var who=WHO[cur[0]];
  var isLast=lineIdx>=lines.length-1;
  function next(){if(isLast){onClose&&onClose();}else{setLineIdx(function(i){return i+1;});}}
  return <div className="rcv-overlay" onClick={next}>
    <div className="rcv-inner">
      <div className="rcv-eyebrow">のぞき見</div>
      <div className="rcv-title">「{conv.title}」</div>
      <div className="rcv-scene">
        <div className="rcv-line">
          <div className="rcv-speaker-row"><span className={"isc-dot cd-"+who+" rcv-dot"}/><span className="rcv-speaker">{CNAME[cur[0]]}</span></div>
          <p className="rcv-say">「{cur[1]}」</p>
        </div>
      </div>
      <div className="rcv-progress">{lineIdx+1} / {lines.length}</div>
      <div className="rcv-hint">{isLast?"タップして閉じる":"タップして続き"}</div>
    </div>
    <button className="rcv-skip" onClick={function(e){e.stopPropagation();onClose&&onClose();}}>スキップ</button>
  </div>;
}
function ConvView(p){var game=p.game,onRead=p.onRead;var unlocked=getUnlockedConvIds(game);var hints=getNextUnlockInfo(game);var pairs={};CONVS.forEach(function(c){var k=c.a+"-"+c.b;if(!pairs[k])pairs[k]={a:c.a,b:c.b,convs:[]};pairs[k].convs.push(c);});return <div className="scroll"><div className="cv-wrap">{hints.length>0&&<div className="cv-hints"><div className="lh">もうすぐ発生する場面</div>{hints.map(function(h){return <div key={h.id} className="cv-hint-row"><span className={"nd cd-"+h.a}/><span className={"nd cd-"+h.b}/><span className="cv-hn">「{h.title}」</span><span className="cv-need">連携度あと {h.need}</span></div>;})}</div>}{Object.keys(pairs).map(function(key){var pair=pairs[key];var bondV=game.characters[pair.a].bonds[pair.b]||0;return <div key={key} className="cv-pair"><div className="cv-pair-head"><span className={"nd cd-"+pair.a}/><span className="cv-pn">{NAMES[pair.a]}</span><span className="cv-x">×</span><span className={"nd cd-"+pair.b}/><span className="cv-pn">{NAMES[pair.b]}</span><span className="cv-bond">連携 {bondV}</span></div>{pair.convs.map(function(c){var isU=unlocked.indexOf(c.id)>=0,isR=game.readConvs&&game.readConvs.indexOf(c.id)>=0,isRcv=game.receivedScenes&&game.receivedScenes.indexOf(c.id)>=0;return <div key={c.id} className={"cv-item"+(isU?" cv-open":"")+(isR?" cv-read":"")} onClick={isU?function(){onRead(c.id);}:undefined}>{isU?<><span className="cv-title">「{c.title}」</span>{isRcv&&<span className="cv-rcvd">受領済</span>}{!isR&&!isRcv&&<span className="cv-new">NEW</span>}{isR&&!isRcv&&<span className="cv-unrcvd">受領できます</span>}</>:<><span className="cv-locked">🔒 「{c.title}」</span><span className="cv-th">連携度 {c.th} で解放</span></>}</div>;})}</div>;})}<div className="cv-bond-guide"><div className="lh">連携度の上げ方</div><div className="cv-bg-row"><span className="cv-bg-dot cd-toyman"/>箱庭でトイマンの様子を「見守る」と、かなとの連携度が上がります。</div><div className="cv-bg-row"><span className="cv-bg-dot cd-kana"/>かなが疲れているとき「ケア」すると、うつろとの連携度が上がります。</div><div className="cv-bg-row"><span className="cv-bg-dot cd-utsuro"/>残り火を預けて世界を進めると、全体の連携度が少しずつ上がります。</div></div> </div></div>;}
function ConvDetail(p){
  var conv=p.conv,onBack=p.onBack,game=p.game,onReceive=p.onReceive;
  if(!conv)return null;
  var received=game&&game.receivedScenes&&game.receivedScenes.indexOf(conv.id)!==-1;
  var fxLines=describeFx(conv);
  return <div className="scroll"><div className="cvd">
    <button className="back" onClick={onBack}>← もどる</button>
    <div className="cvd-pair"><span className={"nd cd-"+conv.a}/> {NAMES[conv.a]} × <span className={"nd cd-"+conv.b}/> {NAMES[conv.b]}</div>
    <div className="cvd-title">「{conv.title}」</div>
    {conv.meaning&&<div className="cvd-meaning"><span className="cvd-mlbl">この場面は</span><p className="cvd-mtext">{conv.meaning}</p></div>}
    <div className="cvd-lines">{conv.lines.map(function(line,i){var who=WHO[line[0]];var charId=who||line[0];return <div key={i} className="cvd-line"><div className="cvd-speaker-row"><span className={"isc-dot cd-"+charId+" cvd-sdot"}/><span className="cvd-speaker-name">{CNAME[line[0]]}</span></div><p className="cvd-text">「{line[1]}」</p></div>;})}</div>
    <div className="cvd-receive">
      <div className="cvd-fx-title">{received?"受領済み":"この場面を受領すると"}</div>
      <div className="cvd-fx-list">{fxLines.map(function(l,i){return <span key={i} className="cvd-fx-item">{l}</span>;})}</div>
      {!received&&<button className="btn btn-p cvd-recv-btn" onClick={function(){onReceive&&onReceive(conv.id);}}>この場面を受領する</button>}
      {received&&<div className="cvd-recv-done" style={{marginBottom:8}}>受領済み — この場面を受け取りました</div>}
    </div>
    <button className="back cvd-bottom-back" onClick={onBack}>← もどる</button>
  </div></div>;
}
function GrowthRanking(p){
  var game=p.game,items=getAllDeltas(game);
  var ranked=items.filter(function(it){var d=it.dp;return d!==null&&d>0.003;})
    .sort(function(a,b){return(b.dp||0)-(a.dp||0);});
  if(!ranked.length)return null;
  return(
    <div className="growth-rank">
      <div className="lh">今回 進んだ場所</div>
      {ranked.map(function(it,i){var d=Math.round((it.dp||0)*100);return(
        <div key={it.key} className="rank-row">
          <span className="rank-i">{i+1}</span>
          <span className={"rank-dot cd-"+it.key}/>
          <span className="rank-nm">{it.name}</span>
          <div className="rank-bar"><Bar value={Math.min(100,d*6)} color={PCOL(it.key)} h={3}/></div>
          <span className="rank-d">+{d}%</span>
        </div>
      );})}
    </div>
  );
}

/* ── 今回の獲得パネル ── */
function RecentRewardsPanel(p){
  var rewards=p.rewards||[];
  if(!rewards.length)return null;
  var lvlups=rewards.filter(function(r){return r.type==="levelup";});
  var items=rewards.filter(function(r){return r.type==="item";});
  var achs=rewards.filter(function(r){return r.type==="achievement";});
  var rcpts=rewards.filter(function(r){return r.type==="receipt";});
  var mergedItems={};
  items.forEach(function(r){mergedItems[r.name]=(mergedItems[r.name]||0)+r.count;});
  return(
    <div className="rw-panel">
      <div className="lh">今回の獲得</div>
      {lvlups.length>0&&<div className="rw-section">
        <div className="rw-sec-lbl">場所の変化</div>
        {lvlups.map(function(r,i){return(
          <div key={i} className="rw-row rw-lv">
            <span className="rw-icon">▲</span>
            <span className="rw-txt">{r.place} Lv.{r.level}（{r.stageName}）</span>
          </div>
        );})}
      </div>}
      {Object.keys(mergedItems).length>0&&<div className="rw-section">
        <div className="rw-sec-lbl">手に入れたもの</div>
        {Object.keys(mergedItems).map(function(name,i){return(
          <div key={i} className="rw-row rw-item">
            <span className="rw-icon">◆</span>
            <span className="rw-txt">{name} ×{mergedItems[name]}</span>
          </div>
        );})}
      </div>}
      {achs.length>0&&<div className="rw-section">
        <div className="rw-sec-lbl">称号</div>
        {achs.map(function(r,i){return(
          <div key={i} className="rw-row rw-ach">
            <span className="rw-icon">★</span>
            <span className="rw-txt">{r.name}</span>
          </div>
        );})}
      </div>}
      {rcpts.length>0&&<div className="rw-section">
        <div className="rw-sec-lbl">受領</div>
        {rcpts.map(function(r,i){return(
          <div key={i} className="rw-row rw-rcpt">
            <span className="rw-icon">📩</span>
            <span className="rw-txt">「{r.title}」を受領しました</span>
          </div>
        );})}
      </div>}
    </div>
  );
}

/* ── アイテム帳パネル ── */
function InventoryPanel(p){
  var inv=p.inventory||{};
  var has=Object.keys(ITEM_NAMES).filter(function(k){return(inv[k]||0)>0;});
  if(!has.length)return <div className="inv-empty">まだ何も手に入れていない。</div>;
  return(
    <div className="inv-list">
      {has.map(function(k){return(
        <div key={k} className="inv-row">
          <span className="inv-name">{ITEM_NAMES[k]}</span>
          <span className="inv-count">×{inv[k]}</span>
          <span className="inv-desc">{ITEM_DESC[k]||""}</span>
        </div>
      );})}
    </div>
  );
}

/* ── 称号帳パネル ── */
function AchievementsPanel(p){
  var achs=p.achievements||{};
  return(
    <div className="ach-list">
      {ACHIEVEMENT_DATA.map(function(ach){var got=!!achs[ach.id];return(
        <div key={ach.id} className={"ach-row"+(got?" ach-got":"")}>
          <span className="ach-star">{got?"★":"☆"}</span>
          <span className="ach-title">{ach.title}</span>
        </div>
      );})}
    </div>
  );
}


function InterventionTab(p){
  var game=p.game,onExecute=p.onExecute,config=p.config||{key:0};
  var [tier,setTier]=useState(null);
  var [target,setTarget]=useState("auto");
  var [result,setResult]=useState(null);
  var ip=game.ip||{cur:0,max:20,lastCalc:nowISO()};
  var timing=getIPTiming(ip);
  useEffect(function(){
    if(config.target)setTarget(config.target);else setTarget("auto");
    if(config.tier){var t=IP_TIERS.find(function(t2){return t2.cost===config.tier;});setTier(t||null);}
    else setTier(null);
    setResult(null);
  },[config.key]);
  function handleExec(){if(!tier||ip.cur<tier.cost)return;var r=doTieredIntervene(game,tier.cost,target);onExecute(r.newState);setResult(r);}
  if(result)return(
    <div className="scroll"><div className="intv-result-big">
      <div className="irb-title">{result.ipUsed}P 使用完了 — {tier&&tier.label}</div>
      <div className="irb-lines">{result.lines.map(function(l,i){return <p key={i} className={"irb-line"+(l===""?" irb-sp":l.startsWith("▸")?" irb-head":l.startsWith("  ")?" irb-sub":"")}>{l}</p>;})} </div>
      {result.effects.filter(Boolean).length>0&&<div className="ieffs">{result.effects.filter(Boolean).map(function(e,i){return <span key={i} className="ieff">{e}</span>;})}</div>}
      <button className="btn btn-p" style={{marginTop:16}} onClick={function(){setResult(null);setTier(null);}}>もどる</button>
    </div></div>
  );
  return(
    <div className="scroll">
      <div className="ip-display">
        <div className="ip-disp-top"><span className="ip-lbl">見守りの余力</span><span className="ip-val">{ip.cur} / {ip.max} P</span></div>
        <Bar value={ip.cur/ip.max*100} color="var(--ct)" h={8}/>
        <div className="ip-timing">
          {ip.cur>=ip.max?<span className="ip-full">満タン — 使い時</span>:<>
            <span>次 +1P まで {timing.secToNext}秒</span>
            <span className="np-sep">|</span>
            <span>満タンまで {fmtMins(timing.minsToFull)}</span>
          </>}
        </div>
      </div>
      <div className="lh" style={{marginTop:20}}>何P使う？</div>
      <div className="tier-list">
        {IP_TIERS.map(function(t){var canUse=ip.cur>=t.cost;return(
          <button key={t.cost} className={"tier-btn"+(tier&&tier.cost===t.cost?" tier-on":"")+(canUse?"":" tier-dis")} onClick={function(){if(canUse)setTier(t);}}>
            <div className="tier-l"><span className="tier-cost">{t.cost}P</span><span className="tier-label">{t.label}</span></div>
            <div className="tier-r"><span className="tier-mult">×{t.mult}</span><span className="tier-desc">{t.desc}</span></div>
          </button>
        );})}
        {ip.cur===0&&<p className="intv-empty">余力がない。少し時間を置くと戻ります。</p>}
      </div>
      {tier&&<>
        <div className="lh" style={{marginTop:18}}>誰に？</div>
        <div className="target-list">
          {[{id:"auto",lbl:"自動配分",sub:"バランスよく配分する"},{id:"toyman",lbl:NAMES.toyman,sub:"未受領の森を探索する"},{id:"kana",lbl:NAMES.kana,sub:"仲間の疲れを癒す"},{id:"utsuro",lbl:NAMES.utsuro,sub:"封筒を整理・保管する"},{id:"kotae",lbl:NAMES.kotae,sub:"ヒントを分析する"},{id:"bond",lbl:"連携",sub:"場面帳の解放に近づける"}].map(function(t){return(
            <button key={t.id} className={"target-btn"+(target===t.id?" target-on":"")} onClick={function(){setTarget(t.id);}}>
              {(t.id!=="auto"&&t.id!=="bond")&&<span className={"nd cd-"+t.id}/>}
              <span className="target-lbl">{t.lbl}</span>
              <span className="target-sub">{t.sub}</span>
            </button>
          );})}
        </div>
        <div className="preview-box">
          <span>使用後 {Math.max(0,ip.cur-tier.cost)}P 残る</span>
          {tier.mult>1&&<span className="prev-boost">×{tier.mult} ブースト</span>}
          <span>{tier.cost}回行動</span>
        </div>
        <button className="btn btn-p" style={{marginTop:10}} onClick={handleExec}>{tier.cost}P 使って{tier.label}する</button>
      </>}
    </div>
  );
}
function DevPanel(p){return <div className="dev"><button className="dtog" onClick={p.onToggle}>{p.open?"▾ 閉じる":"▸ 時間を進める（開発用）"}</button>{p.open&&<div className="db"><div className="dr">{[4,8,24,72].map(function(h){return <button key={h} className="btn bm" onClick={function(){p.onAdvance(h);}}>+{h===24?"1日":h===72?"3日":h+"時間"}</button>;})}</div><button className="btn bm bd2" onClick={p.onReset}>世界を最初に戻す</button></div>}</div>;}



const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
