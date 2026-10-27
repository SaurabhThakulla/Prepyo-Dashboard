import { Unit } from '../learnKorean/types';
import { vocabLesson } from '../learnKorean/vocab';

const J = 'Japanese';

/**
 * The first N5 kanji, as words: the vocabulary section asks how they are read
 * (Kanji Reading) and written (Word Writing). Each `roman` gives the reading
 * in hiragana and in romaji.
 */
export const JP_KANJI: Unit = {
  id: 'jp-kanji',
  number: 7,
  title: 'N5 Kanji',
  description: 'The kanji N5 tests most: numbers, days, people, places and common verbs, each with its reading.',
  emoji: '漢',
  lessons: [
    {
      id: 'what-kanji',
      title: 'What kanji are',
      summary: 'Pictures that became letters',
      exercises: [
        { kind: 'teach', ko: '山', speak: 'やま', roman: 'やま · yama', en: 'mountain', picture: '⛰️', note: 'Kanji are characters with a meaning. 山 started as a drawing of three peaks.' },
        { kind: 'teach', ko: '川', speak: 'かわ', roman: 'かわ · kawa', en: 'river', picture: '🏞️' },
        { kind: 'teach', ko: '木', speak: 'き', roman: 'き · ki', en: 'tree', picture: '🌳' },
        { kind: 'teach', ko: '日', speak: 'ひ', roman: 'ひ · hi / にち · nichi', en: 'sun; day', picture: '☀️', note: 'Most kanji have more than one reading. Which one is used depends on the word.' },
        { kind: 'teach', ko: '月', speak: 'つき', roman: 'つき · tsuki / がつ · gatsu', en: 'moon; month', picture: '🌙' },
        { kind: 'choice', prompt: 'Which kanji means "mountain"?', options: ['山', '川', '木', '日'], answer: 0 },
        { kind: 'choice', prompt: 'How is 川 read?', ko: '川', options: ['かわ', 'やま', 'き', 'つき'], answer: 0 },
        { kind: 'choice', prompt: 'Which picture is 木?', ko: '木', options: ['🌳', '⛰️', '🏞️', '🌙'], pictureOptions: true, answer: 0 },
        { kind: 'choice', prompt: 'Listen. Which kanji did you hear?', speak: 'やま', listenOnly: true, options: ['山', '川', '木', '月'], answer: 0, explain: 'やま (yama) is 山, mountain.' },
        { kind: 'choice', prompt: 'Listen. Which kanji did you hear?', speak: 'つき', listenOnly: true, options: ['日', '月', '木', '川'], answer: 1, explain: 'つき (tsuki) is 月, moon.' },
        { kind: 'match', prompt: 'Match the kanji to its meaning', pairs: [['山', 'mountain'], ['川', 'river'], ['日', 'sun; day'], ['月', 'moon; month']] },
      ],
    },
    vocabLesson('kanji-numbers', 'Number kanji', '一 二 三 … 百 千 万 円', [
      { ko: '一つ', roman: 'ひとつ · hitotsu', en: 'one (thing)' },
      { ko: '三人', roman: 'さんにん · sannin', en: 'three people' },
      { ko: '五月', roman: 'ごがつ · gogatsu', en: 'May' },
      { ko: '八日', roman: 'ようか · yōka', en: 'the 8th (day)' },
      { ko: '十時', roman: 'じゅうじ · jūji', en: "ten o'clock", picture: '🕙' },
      { ko: '百円', roman: 'ひゃくえん · hyakuen', en: '100 yen', picture: '💴' },
      { ko: '千円', roman: 'せんえん · sen-en', en: '1,000 yen' },
      { ko: '一万円', roman: 'いちまんえん · ichiman-en', en: '10,000 yen' },
    ], J),
    vocabLesson('kanji-days', 'Day and time kanji', '月 火 水 木 金 土 日, 年, 時', [
      { ko: '月曜日', roman: 'げつようび · getsuyōbi', en: 'Monday' },
      { ko: '火曜日', roman: 'かようび · kayōbi', en: 'Tuesday', picture: '🔥' },
      { ko: '水曜日', roman: 'すいようび · suiyōbi', en: 'Wednesday', picture: '💧' },
      { ko: '金曜日', roman: 'きんようび · kin-yōbi', en: 'Friday', picture: '🪙' },
      { ko: '土曜日', roman: 'どようび · doyōbi', en: 'Saturday' },
      { ko: '今日', roman: 'きょう · kyō', en: 'today', note: 'Some words read their kanji in a special way: 今日 is きょう.' },
      { ko: '毎日', roman: 'まいにち · mainichi', en: 'every day' },
      { ko: '時間', roman: 'じかん · jikan', en: 'time; hours' },
    ], J),
    vocabLesson('kanji-people', 'People kanji', '人 男 女 子 父 母 先生 学生', [
      { ko: '人', roman: 'ひと · hito', en: 'person', picture: '🧍' },
      { ko: '男の人', roman: 'おとこのひと · otoko no hito', en: 'man', picture: '👨' },
      { ko: '女の人', roman: 'おんなのひと · onna no hito', en: 'woman', picture: '👩' },
      { ko: '子ども', roman: 'こども · kodomo', en: 'child', picture: '🧒' },
      { ko: '父', roman: 'ちち · chichi', en: '(my) father' },
      { ko: '母', roman: 'はは · haha', en: '(my) mother' },
      { ko: '先生', roman: 'せんせい · sensei', en: 'teacher', picture: '👩‍🏫' },
      { ko: '学生', roman: 'がくせい · gakusei', en: 'student', picture: '🧑‍🎓' },
    ], J),
    vocabLesson('kanji-places', 'Place kanji', '学校 駅 店 会社 国 外', [
      { ko: '学校', roman: 'がっこう · gakkō', en: 'school', picture: '🏫' },
      { ko: '駅', roman: 'えき · eki', en: 'station', picture: '🚉' },
      { ko: '店', roman: 'みせ · mise', en: 'shop', picture: '🏪' },
      { ko: '会社', roman: 'かいしゃ · kaisha', en: 'company', picture: '🏢' },
      { ko: '国', roman: 'くに · kuni', en: 'country', picture: '🗺️' },
      { ko: '外', roman: 'そと · soto', en: 'outside' },
      { ko: '右', roman: 'みぎ · migi', en: 'right', picture: '➡️' },
      { ko: '左', roman: 'ひだり · hidari', en: 'left', picture: '⬅️' },
    ], J),
    vocabLesson('kanji-verbs', 'Verb kanji', '行 来 見 食 飲 読 書 聞', [
      { ko: '行きます', roman: 'いきます · ikimasu', en: 'go' },
      { ko: '来ます', roman: 'きます · kimasu', en: 'come' },
      { ko: '見ます', roman: 'みます · mimasu', en: 'see, watch', picture: '👀' },
      { ko: '食べます', roman: 'たべます · tabemasu', en: 'eat', picture: '🍽️' },
      { ko: '飲みます', roman: 'のみます · nomimasu', en: 'drink', picture: '🥤' },
      { ko: '読みます', roman: 'よみます · yomimasu', en: 'read', picture: '📖' },
      { ko: '書きます', roman: 'かきます · kakimasu', en: 'write', picture: '✍️' },
      { ko: '聞きます', roman: 'ききます · kikimasu', en: 'listen, ask', picture: '👂' },
    ], J),
    vocabLesson('kanji-describe', 'Describing kanji', '大きい 小さい 高い 安い 新しい 古い', [
      { ko: '大きい', roman: 'おおきい · ōkii', en: 'big' },
      { ko: '小さい', roman: 'ちいさい · chīsai', en: 'small' },
      { ko: '高い', roman: 'たかい · takai', en: 'expensive; tall' },
      { ko: '安い', roman: 'やすい · yasui', en: 'cheap' },
      { ko: '新しい', roman: 'あたらしい · atarashii', en: 'new' },
      { ko: '古い', roman: 'ふるい · furui', en: 'old (things)' },
      { ko: '長い', roman: 'ながい · nagai', en: 'long' },
    ], J),
  ],
};
