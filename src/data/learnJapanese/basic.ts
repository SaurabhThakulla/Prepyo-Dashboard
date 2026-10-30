import { Unit } from '../learnKorean/types';
import { vocabLesson } from '../learnKorean/vocab';

const J = 'Japanese';

/** Greetings, introducing yourself, people and the words of every first conversation. */
export const JP_BASIC: Unit = {
  id: 'jp-basic',
  number: 3,
  title: 'Basic Japanese',
  description: 'Greetings, introducing yourself, the people around you and asking simple questions.',
  emoji: '👋',
  lessons: [
    {
      id: 'greetings',
      title: 'Greetings',
      summary: 'Hello, good morning, thank you, sorry',
      exercises: [
        { kind: 'teach', ko: 'こんにちは', roman: 'kon-ni-chi-wa', en: 'hello; good afternoon', note: 'The last は is read "wa".' },
        { kind: 'teach', ko: 'おはようございます', roman: 'o-ha-yō go-za-i-ma-su', en: 'good morning (polite)', note: 'With friends, just おはよう.' },
        { kind: 'teach', ko: 'こんばんは', roman: 'kon-ban-wa', en: 'good evening' },
        { kind: 'teach', ko: 'ありがとうございます', roman: 'a-ri-ga-tō go-za-i-ma-su', en: 'thank you (polite)' },
        { kind: 'teach', ko: 'すみません', roman: 'su-mi-ma-sen', en: 'excuse me; sorry', note: 'Used to get attention, to apologise and even to thank someone who went to trouble for you.' },
        { kind: 'teach', ko: 'さようなら', roman: 'sa-yō-na-ra', en: 'goodbye' },
        { kind: 'choice', prompt: 'It is 8 in the morning. What do you say to your teacher?', options: ['おはようございます', 'こんばんは', 'さようなら', 'すみません'], answer: 0 },
        { kind: 'choice', prompt: 'Listen. What does it mean?', speak: 'ありがとうございます', listenOnly: true, options: ['thank you', 'excuse me', 'good evening', 'goodbye'], answer: 0, explain: 'ありがとうございます (arigatō gozaimasu) is "thank you".' },
        { kind: 'choice', prompt: 'You bump into someone on the train. What do you say?', options: ['こんにちは', 'すみません', 'おはようございます', 'さようなら'], answer: 1 },
        { kind: 'choice', prompt: 'Listen. When would you say this?', speak: 'こんばんは', listenOnly: true, options: ['In the evening', 'In the morning', 'When leaving', 'When saying sorry'], answer: 0, explain: 'こんばんは (konbanwa) is "good evening".' },
        { kind: 'match', prompt: 'Match the greeting to its meaning', pairs: [['こんにちは', 'hello'], ['さようなら', 'goodbye'], ['すみません', 'excuse me'], ['こんばんは', 'good evening']] },
      ],
    },
    {
      id: 'introductions',
      title: 'Introducing yourself',
      summary: 'わたしは … です',
      exercises: [
        { kind: 'teach', ko: 'はじめまして', roman: 'ha-ji-me-ma-shi-te', en: 'nice to meet you (said first)' },
        { kind: 'teach', ko: 'わたし', roman: 'wa-ta-shi', en: 'I, me' },
        { kind: 'teach', ko: 'わたしは ラムです。', roman: 'wa-ta-shi wa Ra-mu de-su', en: 'I am Ram.', note: 'は (wa) marks what you talk about; です makes it polite: "As for me, (I) am Ram."' },
        { kind: 'teach', ko: 'ネパールじんです。', roman: 'Ne-pā-ru-jin de-su', en: 'I am Nepali.', note: 'Country + じん (jin) is a person from that country.' },
        { kind: 'teach', ko: 'がくせいです。', roman: 'ga-ku-sei de-su', en: 'I am a student.' },
        { kind: 'teach', ko: 'よろしく おねがいします', roman: 'yo-ro-shi-ku o-ne-ga-i-shi-ma-su', en: 'please treat me well (said last)', note: 'Every self-introduction ends with this.' },
        { kind: 'choice', prompt: 'What does this mean?', ko: 'わたしは ネパールじんです。', options: ['I am Nepali.', 'I am a student.', 'I am Ram.', 'Nice to meet you.'], answer: 0 },
        { kind: 'choice', prompt: 'Which word goes in the gap? わたし（ ）がくせいです。', options: ['は', 'を', 'で', 'へ'], answer: 0, explain: 'は (wa) marks the topic: わたしは がくせいです.' },
        { kind: 'choice', prompt: 'Listen. What did the person say?', speak: 'はじめまして', listenOnly: true, options: ['Nice to meet you', 'Thank you', 'Good morning', 'Excuse me'], answer: 0, explain: 'はじめまして (hajimemashite) is said when you first meet someone.' },
        { kind: 'choice', prompt: 'Listen. What is the person?', speak: 'わたしは がくせいです。', listenOnly: true, options: ['A student', 'A teacher', 'A doctor', 'Nepali'], answer: 0, explain: 'がくせい (gakusei) is a student.' },
        { kind: 'match', prompt: 'Match the phrase to its meaning', pairs: [['わたし', 'I, me'], ['はじめまして', 'nice to meet you'], ['がくせい', 'student'], ['ネパールじん', 'a Nepali person']] },
      ],
    },
    vocabLesson('people', 'People', 'Teacher, friend, family', [
      { ko: 'せんせい', roman: 'sen-sei', en: 'teacher', picture: '👩‍🏫' },
      { ko: 'ともだち', roman: 'to-mo-da-chi', en: 'friend', picture: '🧑‍🤝‍🧑' },
      { ko: 'かぞく', roman: 'ka-zo-ku', en: 'family', picture: '👪' },
      { ko: 'おとこの ひと', roman: 'o-to-ko no hi-to', en: 'man', picture: '👨' },
      { ko: 'おんなの ひと', roman: 'on-na no hi-to', en: 'woman', picture: '👩' },
      { ko: 'こども', roman: 'ko-do-mo', en: 'child', picture: '🧒' },
      { ko: 'ちち', roman: 'chi-chi', en: '(my) father', note: 'Someone else’s father is おとうさん.' },
      { ko: 'はは', roman: 'ha-ha', en: '(my) mother', note: 'Someone else’s mother is おかあさん.' },
    ], J),
    {
      id: 'questions',
      title: 'Asking questions',
      summary: 'か, なん, どこ, だれ, いつ',
      exercises: [
        { kind: 'teach', ko: 'がくせいですか。', roman: 'ga-ku-sei de-su ka', en: 'Are you a student?', note: 'Add か to the end of a sentence and it becomes a question. No question mark is needed.' },
        { kind: 'teach', ko: 'なん', roman: 'nan', en: 'what', note: 'これは なんですか: What is this?' },
        { kind: 'teach', ko: 'どこ', roman: 'do-ko', en: 'where' },
        { kind: 'teach', ko: 'だれ', roman: 'da-re', en: 'who' },
        { kind: 'teach', ko: 'いつ', roman: 'i-tsu', en: 'when' },
        { kind: 'teach', ko: 'はい / いいえ', speak: 'はい。いいえ。', roman: 'hai · i-ie', en: 'yes / no' },
        { kind: 'choice', prompt: 'Which word asks "where"?', options: ['どこ', 'なん', 'だれ', 'いつ'], answer: 0 },
        { kind: 'choice', prompt: 'What does this mean?', ko: 'トイレは どこですか。', options: ['Where is the toilet?', 'What is the toilet?', 'Who is in the toilet?', 'When is the toilet open?'], answer: 0 },
        { kind: 'choice', prompt: 'Listen. Which question word did you hear?', speak: 'あの ひとは だれですか。', listenOnly: true, options: ['だれ (who)', 'どこ (where)', 'なん (what)', 'いつ (when)'], answer: 0, explain: 'あの ひとは だれですか: Who is that person?' },
        { kind: 'choice', prompt: 'Listen. What is the answer?', speak: 'いいえ、がくせいじゃ ありません。', listenOnly: true, options: ['No', 'Yes', 'I don’t know', 'Thank you'], answer: 0, explain: 'いいえ means no: "No, I am not a student."' },
        { kind: 'match', prompt: 'Match the question word', pairs: [['なん', 'what'], ['どこ', 'where'], ['だれ', 'who'], ['いつ', 'when']] },
      ],
    },
    vocabLesson('this-that', 'This and that', 'これ, それ, あれ and things around you', [
      { ko: 'これ', roman: 'ko-re', en: 'this (near me)', note: 'それ is near you, あれ is over there.' },
      { ko: 'それ', roman: 'so-re', en: 'that (near you)' },
      { ko: 'あれ', roman: 'a-re', en: 'that (over there)' },
      { ko: 'かばん', roman: 'ka-ban', en: 'bag', picture: '👜' },
      { ko: 'とけい', roman: 'to-kei', en: 'watch; clock', picture: '⌚' },
      { ko: 'かさ', roman: 'ka-sa', en: 'umbrella', picture: '☂️' },
      { ko: 'いす', roman: 'i-su', en: 'chair', picture: '🪑' },
      { ko: 'じしょ', roman: 'ji-sho', en: 'dictionary', picture: '📖' },
    ], J),
  ],
};
