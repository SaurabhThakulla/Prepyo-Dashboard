import syllabusData from '@/data/syllabus-topics.json';
import { typeKey } from '@/lib/syllabus';
import { Exercise, Lesson, TaskIntroExercise, Unit } from '../learnKorean/types';

/**
 * One lesson per JLPT N5 task. Each explains the task in plain English, then
 * gives two easy questions in its style. The task names and their order come
 * from the syllabus, which is also the order of JLPT_TASK_META: V1–V4
 * vocabulary, G1–G3 grammar, R1–R3 reading, L1–L4 listening.
 *
 * The questions are our own, pitched at a beginner. None is taken from the
 * Japan Foundation's or JEES's sample papers.
 */
type Guide = Omit<TaskIntroExercise, 'kind'> & { practice: Exercise[] };

const GUIDES: Record<string, Guide> = {
  V1: {
    instructionEn: 'How is the underlined word written in hiragana? Choose the best answer from 1, 2, 3 and 4.',
    keyWords: [['ことば', 'word'], ['ひらがな', 'hiragana'], ['どう かきますか', 'how is it written?']],
    what: 'A sentence has one kanji word underlined. The four options are ways to write it in hiragana. One is the right reading.',
    howTo: ['Read the whole sentence: it helps you guess the word.', 'Say the word in your head.', 'Check the small details: long vowels (こう / こ), small っ and the sound marks (゛).'],
    tip: 'The wrong options are almost right: がっこう against がこう or かっこう. Count the beats.',
    practice: [
      { kind: 'choice', prompt: 'How is the underlined word read?', ko: 'まいあさ [学校]に いきます。', options: ['がっこう', 'がこう', 'かっこう', 'がっこ'], answer: 0, explain: '学校 is がっこう: a small っ and a long こう.' },
      { kind: 'choice', prompt: 'How is the underlined word read?', ko: 'この [店]は やすいです。', options: ['みせ', 'みず', 'まち', 'へや'], answer: 0, explain: '店 is みせ, a shop.' },
    ],
  },
  V2: {
    instructionEn: 'How is the underlined word written? Choose the best answer from 1, 2, 3 and 4.',
    keyWords: [['どう かきますか', 'how is it written?']],
    what: 'The opposite of V1: a word is underlined in hiragana, and you choose how it is written in kanji or katakana.',
    howTo: ['Read the underlined hiragana and think of its meaning.', 'Look for the kanji or katakana with that meaning.', 'Watch for kanji that look alike: 右 and 左, 人 and 入.'],
    tip: 'Katakana words often have one wrong letter in the options: テレビ against テルビ. Read each one sound by sound.',
    practice: [
      { kind: 'choice', prompt: 'How is the underlined word written?', ko: '[みぎ]に まがって ください。', options: ['右', '左', '石', '名'], answer: 0, explain: 'みぎ is right, 右. 左 is ひだり, left.' },
      { kind: 'choice', prompt: 'How is the underlined word written?', ko: 'まいばん [てれび]を みます。', options: ['テレビ', 'テルビ', 'テレピ', 'デレビ'], answer: 0, explain: 'TV is テレビ: te-re-bi.' },
    ],
  },
  V3: {
    instructionEn: 'What goes in the ( )? Choose the best answer from 1, 2, 3 and 4.',
    keyWords: [['（　）', 'the gap'], ['はいります', 'goes in']],
    what: 'A sentence has a gap. Four words are given. Only one makes sense in the sentence.',
    howTo: ['Read the sentence and work out what it is about.', 'Try each word in the gap.', 'Choose the one that fits the meaning, not just the grammar.'],
    tip: 'Look at the words around the gap: a verb at the end often tells you what kind of word fits.',
    practice: [
      { kind: 'choice', prompt: 'What goes in the gap?', ko: 'さむいですから、（　　）を きます。', options: ['コート', 'ほん', 'みず', 'でんわ'], answer: 0, explain: '"It is cold, so I put on a coat." きます here means to wear.' },
      { kind: 'choice', prompt: 'What goes in the gap?', ko: 'てがみを（　　）。', options: ['かきます', 'たべます', 'のみます', 'ききます'], answer: 0, explain: '"I write a letter."' },
    ],
  },
  V4: {
    instructionEn: 'There is a sentence that means about the same as the underlined one. Choose the best answer from 1, 2, 3 and 4.',
    keyWords: [['おなじ いみ', 'the same meaning'], ['ぶん', 'sentence']],
    what: 'One sentence is underlined. Four other sentences say something similar. Only one means the same.',
    howTo: ['Find the key word in the underlined sentence.', 'Think of another way to say it: opposites, or the same idea in other words.', 'Check that the whole sentence still means the same.'],
    tip: 'Many of these swap a word for its opposite with ない: たかくない is the same as やすい.',
    practice: [
      { kind: 'choice', prompt: 'Which sentence means about the same?', ko: 'この へやは [あかるくないです]。', options: ['この へやは くらいです。', 'この へやは ひろいです。', 'この へやは きれいです。', 'この へやは あたらしいです。'], answer: 0, explain: 'Not bright (あかるくない) is dark (くらい).' },
      { kind: 'choice', prompt: 'Which sentence means about the same?', ko: '[おととい] びょういんへ いきました。', options: ['ふつかまえに びょういんへ いきました。', 'きのう びょういんへ いきました。', 'あさって びょういんへ いきます。', 'けさ びょういんへ いきました。'], answer: 0, explain: 'おととい is the day before yesterday: two days ago.' },
    ],
  },
  G1: {
    instructionEn: 'What do you put in the ( )? Choose the best answer from 1, 2, 3 and 4.',
    keyWords: [['何を 入れますか', 'what do you put in?']],
    what: 'A sentence has a gap where a particle or a grammar ending goes: は, を, に, で, から, ましょう and so on.',
    howTo: ['Look at the words just before and after the gap.', 'Ask what the gap does: a place you go to? a place you do something? a reason?', 'Choose the particle or form that does that job.'],
    tip: 'This is the biggest grammar task. The Grammar Essentials unit covers the particles it asks about most.',
    practice: [
      { kind: 'choice', prompt: 'What goes in the gap?', ko: 'こうえん（　）さんぽします。', options: ['で', 'を', 'に', 'が'], answer: 0, explain: 'Where you do something takes で.' },
      { kind: 'choice', prompt: 'What goes in the gap?', ko: 'あした いっしょに えいがを（　）。', options: ['みましょう', 'みました', 'みません', 'みて'], answer: 0, explain: 'あした (tomorrow) + いっしょに (together): "Let’s watch a film."' },
    ],
  },
  G2: {
    instructionEn: 'Which goes in the ★ position? Choose the best answer from 1, 2, 3 and 4.',
    keyWords: [['★', 'the starred gap'], ['入る もの', 'the thing that goes in']],
    what: 'A sentence has four gaps and four pieces. Put the pieces in order, then choose the one that sits at the ★.',
    howTo: ['Find the piece that joins to the words just before the gaps.', 'Build the sentence piece by piece. Particles stay with the word before them.', 'Read the finished sentence, then count to the ★.'],
    tip: 'Write the order down as numbers. Many learners build the sentence right but choose the piece in the wrong gap.',
    practice: [
      { kind: 'choice', prompt: 'Put the pieces in order: わたしは ＿ ＿ ★ ＿ のみます。 (ジュース, を, つめたい, いつも). Which piece goes at ★?', options: ['ジュース', 'を', 'つめたい', 'いつも'], answer: 0, explain: 'わたしは いつも つめたい ジュース を のみます: "I always drink cold juice." The third gap is ジュース.' },
      { kind: 'choice', prompt: 'Put the pieces in order: えきの ＿ ★ ＿ ＿ あります。 (ぎんこう, に, が, まえ). Which piece goes at ★?', options: ['に', 'まえ', 'ぎんこう', 'が'], answer: 0, explain: 'えきの まえ に ぎんこう が あります: "There is a bank in front of the station." The second gap is に.' },
    ],
  },
  G3: {
    instructionEn: 'What do you put in the ( )? Think about the meaning of the text and choose the best answer from 1, 2, 3 and 4.',
    keyWords: [['ぶんしょう', 'text'], ['いみ', 'meaning'], ['かんがえて', 'think about']],
    what: 'A short text, often a letter or a student’s essay, has a few gaps. Each question asks what fits one of them.',
    howTo: ['Read the whole text first, not only the gap.', 'Check what comes before: it often tells you the tense or a linking word like でも or それから.', 'Choose the word that keeps the text making sense.'],
    tip: 'でも (but), それから (and then) and だから (so) come up often. Ask whether the next sentence agrees or turns round.',
    practice: [
      { kind: 'choice', prompt: 'What goes in the gap?', ko: 'きのうは あめでした。（　）、うちで ほんを よみました。', options: ['だから', 'でも', 'そして', 'それに'], answer: 0, explain: 'It rained, so (だから) I read at home.' },
      { kind: 'choice', prompt: 'What goes in the gap?', ko: 'わたしの へやは ちいさいです。（　）、まどが おおきくて、あかるいです。', options: ['でも', 'だから', 'それから', 'そして'], answer: 0, explain: 'The room is small, but (でも) it is bright.' },
    ],
  },
  R1: {
    instructionEn: 'Read the text and answer the question. Choose the best answer from 1, 2, 3 and 4.',
    keyWords: [['読んで', 'read'], ['しつもん', 'question'], ['こたえて', 'answer']],
    what: 'A short text of a few lines: a note, a message or a short diary entry. One question asks about it.',
    howTo: ['Read the question first, so you know what to look for.', 'Read the text and find that part.', 'Choose the option that says the same thing, often in different words.'],
    tip: 'Short texts often change plans: “I was going to …, but …”. The answer is usually what happens after でも.',
    practice: [
      { kind: 'choice', prompt: 'Read: 「ラムさん、きょうの じゅぎょうは 3じからです。でも、わたしは びょういんへ いきますから、すこし おくれます。マリア」 What will Maria do?', options: ['Be a little late for class', 'Not come to class', 'Go to class at 2', 'Meet Ram at the hospital'], answer: 0, explain: 'すこし おくれます: she will be a little late, because she is going to the hospital first.' },
      { kind: 'choice', prompt: 'Read: 「きのう、ともだちと デパートへ いきました。わたしは くつを かいました。ともだちは なにも かいませんでした。」 What did the friend buy?', options: ['Nothing', 'Shoes', 'A bag', 'Clothes'], answer: 0, explain: 'なにも かいませんでした: the friend bought nothing.' },
    ],
  },
  R2: {
    instructionEn: 'Read the text and answer the questions. Choose the best answer from 1, 2, 3 and 4.',
    keyWords: [['ぶんしょう', 'text'], ['どうして', 'why']],
    what: 'A longer text, often a student writing about their life in Japan. Two questions ask about details, reasons or feelings.',
    howTo: ['Read the questions first.', 'The answers come in the order of the questions in the text.', 'For "why" questions (どうして), look for から or ので.'],
    tip: 'Do not choose an option just because its words appear in the text. Check that it says what the text says.',
    practice: [
      { kind: 'choice', prompt: 'Read: 「わたしは まいにち あさ 6じに おきます。うちから がっこうまで とおいですから、7じの でんしゃに のります。」 Why does the writer catch the 7:00 train?', options: ['School is far from home', 'They like getting up early', 'The train is cheap', 'Class starts at 7:00'], answer: 0, explain: 'とおいですから: because it is far.' },
      { kind: 'choice', prompt: 'Read: 「日よう日は アルバイトが ありません。ですから、ともだちと こうえんで サッカーを します。」 What does the writer do on Sundays?', options: ['Plays football with friends', 'Works part-time', 'Studies at the library', 'Goes shopping'], answer: 0, explain: 'No part-time job on Sundays, so football in the park.' },
    ],
  },
  R3: {
    instructionEn: 'Look at the notice and answer the question. Choose the best answer from 1, 2, 3 and 4.',
    keyWords: [['おしらせ', 'notice'], ['見て', 'look at']],
    what: 'A notice, timetable, menu or poster, with one question that asks you to find a fact: a time, a price, a day.',
    howTo: ['Read the question and note exactly what it asks: which day? how much?', 'Scan the notice for that part only. You do not need to read all of it.', 'Check any condition in the question, like "on Saturday" or "for two people".'],
    tip: 'Prices and times are the most common answers. The Numbers & Time unit is the best practice for this task.',
    practice: [
      { kind: 'choice', prompt: 'A notice says: 「プール　ごぜん 9じ～ごご 5じ　げつようびは やすみです」 When can you NOT swim?', options: ['On Monday', 'On Sunday', 'At 10 a.m.', 'At 4 p.m.'], answer: 0, explain: 'げつようびは やすみ: closed on Mondays.' },
      { kind: 'choice', prompt: 'A menu says: 「カレー 500えん、ラーメン 600えん、コーヒー 200えん」 You order curry and coffee. How much is it?', options: ['¥700', '¥800', '¥1,100', '¥500'], answer: 0, explain: '500 + 200 = 700 yen.' },
    ],
  },
  L1: {
    instructionEn: 'First listen to the question. Then listen to the talk and choose the best answer from 1 to 4.',
    keyWords: [['はじめに', 'first'], ['しつもん', 'question'], ['はなし', 'talk']],
    what: 'You hear the question, then a conversation, then the question again. It asks what someone will do next or what they need.',
    howTo: ['Listen to the question and hold it in your head: who will do what?', 'In the talk, plans often change. Listen to the end.', 'Choose what the person will do, not what they first said.'],
    tip: 'Phrases like じゃあ (well then) and それから (after that) often come just before the answer.',
    practice: [
      { kind: 'choice', prompt: 'Listen. What will the woman buy?', speak: '男: スーパーで ぎゅうにゅうを かって ください。\n女: たまごも かいますか。\n男: たまごは ありますから、いいです。', listenOnly: true, options: ['Milk only', 'Milk and eggs', 'Eggs only', 'Bread'], answer: 0, explain: 'There are eggs at home already, so only milk.' },
      { kind: 'choice', prompt: 'Listen. Where will they meet?', speak: '女: えきの まえで あいましょうか。\n男: えきは ひとが おおいですから、ほんやの まえは どうですか。\n女: はい、いいですよ。', listenOnly: true, options: ['In front of the bookshop', 'In front of the station', 'Inside the station', 'At the café'], answer: 0, explain: 'The station is crowded, so they meet in front of the bookshop.' },
    ],
  },
  L2: {
    instructionEn: 'First listen to the question. Then listen to the talk and choose the best answer from 1 to 4.',
    keyWords: [['はじめに', 'first'], ['しつもん', 'question']],
    what: 'Like L1, the question comes first, but it asks for one fact from the talk: a time, a reason, a place or a person.',
    howTo: ['Note the question word: いつ (when), どこ (where), どうして (why), なに (what).', 'Listen for that one fact. Ignore the rest.', 'Several options will be mentioned; only one answers the question.'],
    tip: 'Every option is usually said in the talk. Listen for which one actually answers the question.',
    practice: [
      { kind: 'choice', prompt: 'Listen. When is the man’s birthday?', speak: '女: たんじょうびは いつですか。\n男: 3がつ 10かです。\n女: あ、わたしは 3がつ 20かです。', listenOnly: true, options: ['10 March', '20 March', '10 May', '3 October'], answer: 0, explain: 'He says 3がつ とおか: 10 March. The 20th is the woman’s.' },
      { kind: 'choice', prompt: 'Listen. Why didn’t the woman come to the party?', speak: '男: きのう、どうして パーティーに きませんでしたか。\n女: あたまが いたかったんです。\n男: そうですか。もう だいじょうぶですか。', listenOnly: true, options: ['She had a headache', 'She had work', 'She forgot', 'She was travelling'], answer: 0, explain: 'あたまが いたかった: her head hurt.' },
    ],
  },
  L3: {
    instructionEn: 'Look at the picture and listen to the question. What does this person say? Choose the best answer from 1 to 3.',
    keyWords: [['え', 'picture'], ['なんと いいますか', 'what do they say?']],
    what: 'A picture shows a situation and an arrow points at one person. You hear what is happening, then three things they could say.',
    howTo: ['Look at the picture: where are they, and who is the arrow on?', 'Listen to the situation.', 'Choose the phrase that fits: asking, thanking, apologising, offering.'],
    tip: 'In the test the three answers are only heard, not printed. Here they are written so you can learn the phrases.',
    practice: [
      { kind: 'choice', prompt: 'You want to borrow a friend’s pen. What do you say?', options: ['ペンを かして ください。', 'ペンを かしましょう。', 'ペンを かりました。'], answer: 0, explain: 'かして ください: please lend it to me.' },
      { kind: 'choice', prompt: 'You leave the office before your colleagues. What do you say?', options: ['おさきに しつれいします。', 'いただきます。', 'おかえりなさい。'], answer: 0, explain: 'おさきに しつれいします: excuse me for leaving first.' },
    ],
  },
  L4: {
    instructionEn: 'There is no picture. Listen to the sentence and choose the best reply from 1 to 3.',
    keyWords: [['えなどが ありません', 'there is no picture'], ['ぶん', 'sentence']],
    what: 'You hear one short sentence, then three replies. Choose the reply that fits.',
    howTo: ['Listen to what kind of sentence it is: a question, a thanks, an invitation.', 'Think of what you would reply.', 'Choose the reply that matches, in the right tense.'],
    tip: 'It is fast and there is nothing to read. Answer straight away and get ready for the next one.',
    practice: [
      { kind: 'choice', prompt: 'Listen. Choose the best reply.', speak: 'おなまえは?', listenOnly: true, options: ['ラムです。', 'ネパールです。', 'はたちです。'], answer: 0, explain: '"Your name?" "I’m Ram."' },
      { kind: 'choice', prompt: 'Listen. Choose the best reply.', speak: 'いっしょに ひるごはんを たべませんか。', listenOnly: true, options: ['ええ、いいですね。', 'はい、たべました。', 'いいえ、ひるごはんです。'], answer: 0, explain: 'An invitation (〜ませんか): "Yes, that sounds good."' },
    ],
  },
};

const READING_CODES = ['V1', 'V2', 'V3', 'V4', 'G1', 'G2', 'G3', 'R1', 'R2', 'R3'];
const LISTENING_CODES = ['L1', 'L2', 'L3', 'L4'];

function taskLessons(skill: 'reading' | 'listening', codes: string[]): Lesson[] {
  return syllabusData.exams.JLPT.skills[skill].topics.map(({ name, simpleDescription }, i) => {
    const code = codes[i];
    const { practice, ...intro } = GUIDES[code];
    return {
      id: code.toLowerCase(),
      title: `${code} · ${name}`,
      summary: simpleDescription,
      exercises: [{ kind: 'taskIntro', ...intro }, ...practice],
      practice: { code, skill, typeKey: typeKey(name) },
    };
  });
}

export const JLPT_N5: Unit = {
  id: 'jlpt-n5',
  number: 8,
  title: 'JLPT N5',
  description: 'Every task in the test, one lesson each: what it is, how to answer it, and a few easy questions in its style.',
  emoji: '🎯',
  // Each task stands alone, and the practice page links to its own lesson.
  anyOrder: true,
  lessons: [...taskLessons('reading', READING_CODES), ...taskLessons('listening', LISTENING_CODES)],
};
