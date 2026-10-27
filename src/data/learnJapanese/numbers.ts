import { Unit } from '../learnKorean/types';
import { vocabLesson } from '../learnKorean/vocab';

const J = 'Japanese';

/** Numbers, money, the clock and the calendar: N5 listening is full of them. */
export const JP_NUMBERS: Unit = {
  id: 'jp-numbers',
  number: 5,
  title: 'Numbers & Time',
  description: 'Count, read prices in yen, tell the time and name the days: the test asks about them often.',
  emoji: '🕒',
  lessons: [
    {
      id: 'one-to-ten',
      title: '1 to 10',
      summary: 'いち, に, さん … じゅう',
      exercises: [
        { kind: 'teach', ko: 'いち · に · さん · よん · ご', speak: 'いち、に、さん、よん、ご', roman: 'ichi · ni · san · yon · go', en: '1 · 2 · 3 · 4 · 5', note: '4 is also し, but よん is safer: し sounds like "death".' },
        { kind: 'teach', ko: 'ろく · なな · はち · きゅう · じゅう', speak: 'ろく、なな、はち、きゅう、じゅう', roman: 'roku · nana · hachi · kyū · jū', en: '6 · 7 · 8 · 9 · 10', note: '7 is also しち, and 9 is also く.' },
        { kind: 'teach', ko: 'じゅういち', roman: 'jū-i-chi', en: '11', note: '10 + 1. And 20 is にじゅう: 2 × 10.' },
        { kind: 'choice', prompt: 'Which number is はち?', ko: 'はち', options: ['8', '4', '7', '9'], answer: 0 },
        { kind: 'choice', prompt: 'Which number is にじゅうご?', ko: 'にじゅうご', options: ['25', '52', '15', '205'], answer: 0, explain: 'に (2) × じゅう (10) + ご (5) = 25.' },
        { kind: 'choice', prompt: 'Listen. Which number did you hear?', speak: 'なな', listenOnly: true, options: ['7', '1', '8', '4'], answer: 0, explain: 'なな (nana) is 7.' },
        { kind: 'choice', prompt: 'Listen. Which number did you hear?', speak: 'さんじゅうよん', listenOnly: true, options: ['34', '43', '304', '14'], answer: 0, explain: 'さんじゅう (30) + よん (4) = 34.' },
        { kind: 'match', prompt: 'Match the number', pairs: [['さん', '3'], ['ろく', '6'], ['きゅう', '9'], ['じゅう', '10']] },
      ],
    },
    {
      id: 'money',
      title: 'Prices',
      summary: 'ひゃく, せん, まん and えん',
      exercises: [
        { kind: 'teach', ko: 'ひゃく · せん · まん', speak: 'ひゃく、せん、まん', roman: 'hyaku · sen · man', en: '100 · 1,000 · 10,000', note: 'Japanese counts in ten-thousands: 50,000 is ごまん, "5 man".' },
        { kind: 'teach', ko: 'さんびゃく', roman: 'san-bya-ku', en: '300', note: 'Some sounds change: 300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく, 3,000 さんぜん.' },
        { kind: 'teach', ko: 'ごひゃくえん', roman: 'go-hya-ku-en', en: '500 yen', picture: '💴', note: 'えん (en) is yen.' },
        { kind: 'teach', ko: 'いくらですか。', roman: 'i-ku-ra de-su ka', en: 'How much is it?' },
        { kind: 'choice', prompt: 'How much is せんごひゃくえん?', ko: 'せんごひゃくえん', options: ['¥1,500', '¥5,100', '¥15,000', '¥150'], answer: 0, explain: 'せん (1,000) + ごひゃく (500).' },
        { kind: 'choice', prompt: 'Listen. How much is it?', speak: 'さんびゃくえんです。', listenOnly: true, options: ['¥300', '¥3,000', '¥30', '¥800'], answer: 0, explain: 'さんびゃく is 300.' },
        { kind: 'choice', prompt: 'Listen. How much is it?', speak: 'にせんはっぴゃくえんです。', listenOnly: true, options: ['¥2,800', '¥2,080', '¥8,200', '¥28,000'], answer: 0, explain: 'にせん (2,000) + はっぴゃく (800).' },
        { kind: 'match', prompt: 'Match the price', pairs: [['ひゃくえん', '¥100'], ['せんえん', '¥1,000'], ['いちまんえん', '¥10,000'], ['ろっぴゃくえん', '¥600']] },
      ],
    },
    {
      id: 'clock',
      title: 'The time',
      summary: 'じ, ふん, はん, ごぜん, ごご',
      exercises: [
        { kind: 'teach', ko: 'さんじ', roman: 'san-ji', en: "3 o'clock", picture: '🕒', note: 'Number + じ is the hour. Watch 4:00 よじ, 7:00 しちじ, 9:00 くじ.' },
        { kind: 'teach', ko: 'じゅっぷん', roman: 'jup-pun', en: '10 minutes', note: 'ふん changes to ぷん after some numbers: いっぷん (1), さんぷん (3), じゅっぷん (10).' },
        { kind: 'teach', ko: 'ろくじはん', roman: 'ro-ku-ji han', en: 'half past six', note: 'はん is half past.' },
        { kind: 'teach', ko: 'ごぜん · ごご', speak: 'ごぜん、ごご', roman: 'gozen · gogo', en: 'a.m. · p.m.', note: 'They come before the time: ごご にじ, 2 p.m.' },
        { kind: 'choice', prompt: 'What time is よじ?', ko: 'よじ', options: ['4:00', '9:00', '7:00', '8:00'], answer: 0 },
        { kind: 'choice', prompt: 'What time is くじはん?', ko: 'くじはん', options: ['9:30', '9:15', '7:30', '10:30'], answer: 0 },
        { kind: 'choice', prompt: 'Listen. What time does it start?', speak: 'じゅぎょうは ごご いちじに はじまります。', listenOnly: true, options: ['1 p.m.', '1 a.m.', '11 a.m.', '7 p.m.'], answer: 0, explain: 'ごご いちじ: 1 p.m. じゅぎょう is a class.' },
        { kind: 'choice', prompt: 'Listen. What time is it?', speak: 'いま、しちじ にじゅっぷんです。', listenOnly: true, options: ['7:20', '7:10', '4:20', '2:07'], answer: 0, explain: 'しちじ (7) にじゅっぷん (20 minutes).' },
        { kind: 'match', prompt: 'Match the time', pairs: [['いちじ', '1:00'], ['しちじ', '7:00'], ['くじ', '9:00'], ['じゅうにじ', '12:00']] },
      ],
    },
    vocabLesson('days', 'Days of the week', 'げつようび to にちようび', [
      { ko: 'げつようび', roman: 'ge-tsu-yō-bi', en: 'Monday' },
      { ko: 'かようび', roman: 'ka-yō-bi', en: 'Tuesday' },
      { ko: 'すいようび', roman: 'su-i-yō-bi', en: 'Wednesday' },
      { ko: 'もくようび', roman: 'mo-ku-yō-bi', en: 'Thursday' },
      { ko: 'きんようび', roman: 'kin-yō-bi', en: 'Friday' },
      { ko: 'どようび', roman: 'do-yō-bi', en: 'Saturday' },
      { ko: 'にちようび', roman: 'ni-chi-yō-bi', en: 'Sunday', note: 'The days are named after the moon, fire, water, wood, gold, earth and the sun.' },
    ], J),
    vocabLesson('when', 'Today and tomorrow', 'きのう, きょう, あした and more', [
      { ko: 'きょう', roman: 'kyō', en: 'today' },
      { ko: 'あした', roman: 'a-shi-ta', en: 'tomorrow' },
      { ko: 'きのう', roman: 'ki-nō', en: 'yesterday' },
      { ko: 'まいにち', roman: 'ma-i-ni-chi', en: 'every day' },
      { ko: 'こんしゅう', roman: 'kon-shū', en: 'this week' },
      { ko: 'らいしゅう', roman: 'ra-i-shū', en: 'next week' },
      { ko: 'せんしゅう', roman: 'sen-shū', en: 'last week' },
      { ko: 'いま', roman: 'i-ma', en: 'now' },
    ], J),
    {
      id: 'dates',
      title: 'Dates',
      summary: 'がつ, にち and the irregular days',
      exercises: [
        { kind: 'teach', ko: 'しがつ', roman: 'shi-ga-tsu', en: 'April', note: 'Month number + がつ. April is しがつ, July しちがつ, September くがつ.' },
        { kind: 'teach', ko: 'ついたち', roman: 'tsu-i-ta-chi', en: 'the 1st (of the month)', note: 'Days 1 to 10 have their own names: ついたち, ふつか, みっか, よっか, いつか …' },
        { kind: 'teach', ko: 'ふつか · みっか · よっか · いつか', speak: 'ふつか、みっか、よっか、いつか', roman: 'futsuka · mikka · yokka · itsuka', en: 'the 2nd · 3rd · 4th · 5th' },
        { kind: 'teach', ko: 'とおか', roman: 'tō-ka', en: 'the 10th', note: 'From the 11th it is regular: じゅういちにち. Except the 14th じゅうよっか, the 20th はつか and the 24th にじゅうよっか.' },
        { kind: 'teach', ko: 'たんじょうび', roman: 'tan-jō-bi', en: 'birthday', picture: '🎂' },
        { kind: 'choice', prompt: 'Which date is ごがつ いつか?', ko: 'ごがつ いつか', options: ['5 May', '5 April', '1 May', '15 May'], answer: 0, explain: 'ごがつ is May, いつか the 5th.' },
        { kind: 'choice', prompt: 'Listen. When is the birthday?', speak: 'わたしの たんじょうびは しちがつ ようかです。', listenOnly: true, options: ['8 July', '4 July', '8 April', '7 August'], answer: 0, explain: 'しちがつ (July) ようか (the 8th).' },
        { kind: 'choice', prompt: 'Listen. Which date did you hear?', speak: 'じゅうにがつ はつか', listenOnly: true, options: ['20 December', '2 December', '12 February', '20 February'], answer: 0, explain: 'じゅうにがつ is December and はつか the 20th.' },
        { kind: 'match', prompt: 'Match the day of the month', pairs: [['ついたち', '1st'], ['みっか', '3rd'], ['とおか', '10th'], ['はつか', '20th']] },
      ],
    },
  ],
};
