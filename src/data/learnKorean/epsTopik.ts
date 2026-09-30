import syllabusData from '@/data/syllabus-topics.json';
import { typeKey } from '@/lib/syllabus';
import { Exercise, Lesson, TaskIntroExercise, Unit } from './types';

/**
 * One lesson per EPS-TOPIK task. Each explains the task in plain English, then
 * gives two or three easy questions in its style. The task names and their
 * order come from the syllabus (R1–R9 are the reading tasks in order, L1–L7
 * the listening ones), which is also the order of EPS_TASK_META.
 *
 * The questions are our own, pitched at a beginner. They are not taken from
 * HRD Korea's sample papers.
 */
type Guide = Omit<TaskIntroExercise, 'kind'> & { practice: Exercise[] };

const GUIDES: Record<string, Guide> = {
  R1: {
    instructionEn: 'Look at the picture and choose the correct word or sentence.',
    keyWords: [['그림', 'picture'], ['보고', 'look and'], ['고르십시오', 'choose']],
    what: 'You see a picture. Four Korean words or short sentences are under it. One of them matches the picture.',
    howTo: ['Look at the picture and say in your head what it shows.', 'Read each option. Cross out the ones you know are wrong.', 'Choose the one that matches.'],
    tip: 'Most of these are everyday things: food, tools, places and actions. The vocabulary units help most here.',
    practice: [
      { kind: 'choice', prompt: 'Choose the word for the picture.', picture: '🧤', options: ['장갑', '모자', '가위', '상자'], answer: 0, explain: '장갑 (jang-gap) is gloves.' },
      { kind: 'choice', prompt: 'Choose the sentence for the picture.', picture: '🍽️', options: ['밥을 먹어요', '물을 마셔요', '잠을 자요', '회사에 가요'], answer: 0, explain: '밥을 먹어요: I eat a meal.' },
    ],
  },
  R2: {
    instructionEn: 'Which of the following has the underlined part used correctly?',
    keyWords: [['밑줄 친 부분', 'the underlined part'], ['맞는 것', 'the correct one']],
    what: 'Four sentences each have one part underlined. Only one of them uses the grammar correctly.',
    howTo: ['Look only at the underlined part.', 'Check the small word endings, like 을/를 and 은/는.', 'Choose the sentence where it is right.'],
    tip: 'After a consonant use 을 and 은. After a vowel use 를 and 는. That rule alone answers many of these.',
    practice: [
      { kind: 'choice', prompt: 'Which underlined part is correct?', options: ['물[을] 마셔요', '물[를] 마셔요', '우유[을] 마셔요', '밥[를] 먹어요'], answer: 0, explain: '물 ends in a consonant (ㄹ), so it takes 을.' },
      { kind: 'choice', prompt: 'Which underlined part is correct?', options: ['저[은] 학생이에요', '저[는] 학생이에요', '저[을] 학생이에요', '저[를] 학생이에요'], answer: 1, explain: '저 ends in a vowel, so it takes 는. 학생 (hak-saeng) means student.' },
    ],
  },
  R3: {
    instructionEn: 'Read the following and answer the question.',
    keyWords: [['글', 'text, writing'], ['읽고', 'read and'], ['물음', 'question'], ['답하십시오', 'answer']],
    what: 'You read a sign, a notice or a simple chart, the kind you see at work or in town, and answer a question about it.',
    howTo: ['Read the question first so you know what to look for.', 'Find that part of the sign or chart.', 'Choose the answer it supports.'],
    tip: 'Learn the common signs by sight: 금연 (no smoking), 출입 금지 (no entry), 위험 (danger), 조심하세요 (be careful).',
    practice: [
      { kind: 'choice', prompt: 'What does this sign mean?', ko: '금연', sign: true, options: ['No smoking', 'No entry', 'Exit', 'Be careful'], answer: 0 },
      { kind: 'choice', prompt: 'What does this sign mean?', ko: '출입 금지', sign: true, options: ['No entry', 'Danger', 'Toilet', 'No smoking'], answer: 0 },
    ],
  },
  R4: {
    instructionEn: 'Which one is related to the following word?',
    keyWords: [['단어', 'word'], ['관계있는', 'related']],
    what: 'You get one word. Choose the word that belongs with it, like a place and the person who works there.',
    howTo: ['Picture the word in real life.', 'Ask: which option would I find there, or use with it?', 'Choose that one.'],
    tip: 'Think in pairs: 병원 and 의사, 은행 and 돈, 가게 and 물건.',
    practice: [
      { kind: 'choice', prompt: 'Which word goes with this one?', ko: '병원', options: ['의사', '버스', '망치', '김치'], answer: 0, explain: '병원 (hospital) goes with 의사 (doctor).' },
      { kind: 'choice', prompt: 'Which word goes with this one?', ko: '은행', options: ['돈', '사과', '안전모', '기숙사'], answer: 0, explain: '은행 (bank) goes with 돈 (money).' },
    ],
  },
  R5: {
    instructionEn: 'Choose the best answer for the blank.',
    keyWords: [['빈칸', 'the blank'], ['알맞은 것', 'the right one']],
    what: 'A sentence or two has a gap. Choose the word that makes it make sense.',
    howTo: ['Read the whole sentence, not only the words next to the gap.', 'Say what the gap must mean in English.', 'Choose the Korean word with that meaning.'],
    tip: 'The first sentence often gives the reason and the second the action. 배가 고파요 (I am hungry) leads to 먹어요 (eat).',
    practice: [
      { kind: 'choice', prompt: 'Choose the word for the blank.', ko: '배가 고파요. 밥을 ___.', options: ['먹어요', '마셔요', '자요', '꺼요'], answer: 0, explain: "I'm hungry. I eat a meal." },
      { kind: 'choice', prompt: 'Choose the word for the blank.', ko: '목이 말라요. 물을 ___.', options: ['자요', '마셔요', '가요', '켜요'], answer: 1, explain: "목이 말라요 means I'm thirsty, so: I drink water." },
    ],
  },
  R6: {
    instructionEn: 'Choose the word that fits the description.',
    keyWords: [['설명', 'description'], ['어휘', 'word, vocabulary']],
    what: 'A short sentence describes something. Choose the word it describes.',
    howTo: ['Find the key idea: a place, a person or a thing.', 'Think which word fits that idea.', 'Choose it.'],
    tip: '곳 (got) means "place" and 사람 means "person". They tell you what kind of word to look for.',
    practice: [
      { kind: 'choice', prompt: 'Which word fits the description?', ko: '아플 때 가는 곳이에요.', options: ['병원', '은행', '공장', '가게'], answer: 0, explain: 'A place you go when you are sick: a hospital.' },
      { kind: 'choice', prompt: 'Which word fits the description?', ko: '돈을 보내거나 바꾸는 곳이에요.', options: ['약국', '은행', '역', '기숙사'], answer: 1, explain: 'A place where you send or change money: a bank.' },
    ],
  },
  R7: {
    instructionEn: 'Read the text and choose what it is about.',
    keyWords: [['무엇에 대한 글', 'what the text is about']],
    what: 'You read a few sentences and choose the topic, such as the weather, a daily routine or a hobby.',
    howTo: ['Read it once without stopping at hard words.', 'Notice which idea repeats.', 'Choose the topic that covers the whole text, not one detail.'],
    tip: 'Wrong options are often one small detail from the text. The right one is the big picture.',
    practice: [
      { kind: 'choice', prompt: 'What is this text about?', ko: '저는 아침 일곱 시에 일어나요. 여덟 시에 회사에 가요. 저녁 여섯 시에 집에 와요.', options: ['하루 생활 (my day)', '음식 (food)', '날씨 (the weather)', '쇼핑 (shopping)'], answer: 0, explain: 'I get up at 7, go to work at 8 and come home at 6: a daily routine.' },
      { kind: 'choice', prompt: 'What is this text about?', ko: '오늘은 비가 와요. 바람도 많이 불어요. 우산이 필요해요.', options: ['날씨 (the weather)', '가족 (family)', '일 (work)', '병원 (hospital)'], answer: 0, explain: 'Rain, wind and an umbrella: the weather.' },
    ],
  },
  R8: {
    instructionEn: 'Read the text and choose the statement that matches it.',
    keyWords: [['내용', 'content'], ['같은 것', 'the same one']],
    what: 'You read a short text, then choose the one statement that says the same thing as the text.',
    howTo: ['Read the options first.', 'Check each one against the text, word by word.', 'One small change, like a different day or number, makes an option wrong.'],
    tip: 'Watch days, times and numbers closely. That is where the wrong options differ.',
    practice: [
      { kind: 'choice', prompt: 'Which statement matches the text?', ko: '우리 공장은 월요일부터 금요일까지 일해요. 토요일과 일요일에는 쉬어요.', options: ['토요일에 쉬어요 (rest on Saturday)', '토요일에 일해요 (work on Saturday)', '월요일에 쉬어요 (rest on Monday)', '매일 일해요 (work every day)'], answer: 0, explain: 'The factory works Monday to Friday and rests on Saturday and Sunday.' },
    ],
  },
  R9: {
    instructionEn: 'Read the description and choose the matching picture.',
    keyWords: [['설명', 'description'], ['그림', 'picture']],
    what: 'The reverse of Picture to Word: you read a sentence and choose the picture it describes. It is in the official standard, but how often it appears varies.',
    howTo: ['Read the sentence and picture it in your head.', 'Look for the key noun or action.', 'Choose the picture that shows it.'],
    tip: 'Nouns and verbs you already know carry the answer. Skip the words you do not know.',
    practice: [
      { kind: 'choice', prompt: 'Which picture matches?', ko: '비가 와요. 우산이 필요해요.', options: ['☂️', '🕶️', '🧤', '👟'], pictureOptions: true, answer: 0, explain: "It's raining, so you need an umbrella (우산)." },
      { kind: 'choice', prompt: 'Which picture matches?', ko: '안전모를 써요.', options: ['⛑️', '🧢', '🎧', '👓'], pictureOptions: true, answer: 0, explain: 'I wear a safety helmet (안전모).' },
    ],
  },
  L1: {
    instructionEn: 'Choose what you heard.',
    keyWords: [['들은 것', 'what you heard']],
    what: 'You hear one word or short sentence. Choose the one you heard. The options often sound alike.',
    howTo: ['Look at the options before the audio starts.', 'Listen for the first sound, then the last.', 'Choose it on the second play if you are unsure.'],
    tip: 'Options differ by one sound, like 사과 and 사자. Practise the Hangul lessons until those are easy.',
    practice: [
      { kind: 'choice', prompt: 'Listen. Which word did you hear?', speak: '사과', listenOnly: true, options: ['사과', '사자', '시계', '수건'], answer: 0, explain: '사과 (sa-gwa), apple.' },
      { kind: 'choice', prompt: 'Listen. What did you hear?', speak: '감사합니다', listenOnly: true, options: ['감사합니다', '죄송합니다', '안녕하세요', '반갑습니다'], answer: 0 },
    ],
  },
  L2: {
    instructionEn: 'Listen and choose the picture related to what you heard.',
    keyWords: [['듣고', 'listen and'], ['들은 내용', 'what you heard'], ['관계있는 그림', 'the related picture']],
    what: 'You hear a word or sentence and choose the picture that matches it. The options are four pictures.',
    howTo: ['Look at all four pictures before the audio.', 'Name each one to yourself in Korean.', 'Listen for the noun or action and choose.'],
    tip: 'Say the Korean word for each picture before the audio starts. You will recognise it faster.',
    practice: [
      { kind: 'choice', prompt: 'Listen. Which picture matches?', speak: '사과를 먹어요', listenOnly: true, options: ['🍎', '🍜', '🥛', '🚌'], pictureOptions: true, answer: 0, explain: '사과를 먹어요: I eat an apple.' },
      { kind: 'choice', prompt: 'Listen. Which picture matches?', speak: '버스를 타요', listenOnly: true, options: ['🚕', '🚌', '🚇', '🚲'], pictureOptions: true, answer: 1, explain: '버스를 타요: I take the bus.' },
    ],
  },
  L3: {
    instructionEn: 'Listen and choose the right answer to the question.',
    keyWords: [['질문', 'question'], ['대답', 'answer, reply']],
    what: 'Someone asks a question. Choose the reply that answers it.',
    howTo: ['Catch the question word: 뭐 (what), 어디 (where), 언제 (when), 몇 시 (what time), 얼마 (how much).', 'That word tells you what kind of answer fits.', 'Choose the reply of that kind.'],
    tip: 'A "what time" question needs a time. A "where" question needs a place. Wrong options often answer a different question.',
    practice: [
      { kind: 'choice', prompt: 'Listen. Choose the right reply.', speak: '지금 몇 시예요?', listenOnly: true, options: ['두 시예요', '천 원이에요', '회사에 가요', '네, 좋아요'], answer: 0, explain: '"What time is it now?" needs a time: 두 시예요, "It is 2 o\'clock".' },
      { kind: 'choice', prompt: 'Listen. Choose the right reply.', speak: '이거 얼마예요?', listenOnly: true, options: ['오천 원이에요', '세 시예요', '병원이에요', '괜찮아요'], answer: 0, explain: '"How much is this?" needs a price.' },
    ],
  },
  L4: {
    instructionEn: 'Listen and choose what comes next.',
    keyWords: [['이어지는 말', 'what is said next']],
    what: 'You hear the start of a conversation. Choose what the other person would naturally say next.',
    howTo: ['Work out the situation: greeting, thanks, apology or a request.', 'Think what people usually reply.', 'Choose that reply.'],
    tip: 'Learn common pairs: 감사합니다 → 아니에요 (you are welcome), 죄송합니다 → 괜찮아요 (it is okay).',
    practice: [
      { kind: 'choice', prompt: 'Listen. What comes next?', speak: '처음 뵙겠습니다.', listenOnly: true, options: ['네, 반갑습니다', '얼마예요?', '고장 났어요', '배고파요'], answer: 0, explain: '"Nice to meet you (first time)" → "Yes, nice to meet you".' },
      { kind: 'choice', prompt: 'Listen. What comes next?', speak: '늦어서 죄송합니다.', listenOnly: true, options: ['괜찮아요', '감사합니다', '안녕하세요', '맛있어요'], answer: 0, explain: '"Sorry I\'m late" → "It\'s okay".' },
    ],
  },
  L5: {
    instructionEn: 'Listen and choose the picture related to what you heard.',
    keyWords: [['듣고', 'listen and'], ['그림', 'picture']],
    what: 'You hear a number: a price, a time, a date or an amount. The pictures show different numbers. Choose the one you heard.',
    howTo: ['Look at how the numbers in the options differ.', 'Listen for the big unit first (천 = 1,000, 만 = 10,000), then the digit in front.', 'Choose the matching number.'],
    tip: 'Money and minutes use 일, 이, 삼. Hours use 한, 두, 세, 네. Revise the Numbers & time lesson first.',
    practice: [
      { kind: 'choice', prompt: 'Listen. How much is it?', speak: '이 사과는 삼천 원이에요.', listenOnly: true, options: ['₩3,000', '₩300', '₩30,000', '₩3,500'], answer: 0, explain: '삼천 원: 삼 (3) × 천 (1,000).' },
      { kind: 'choice', prompt: 'Listen. What time is it?', speak: '네 시 삼십 분이에요.', listenOnly: true, options: ['4:30', '3:40', '4:03', '10:30'], answer: 0, explain: '네 시 (4 o\'clock) 삼십 분 (30 minutes).' },
    ],
  },
  L6: {
    instructionEn: 'Listen and choose the right answer to the question.',
    keyWords: [['질문', 'question'], ['대답', 'answer']],
    what: 'You look at a picture and hear a question about it. Choose the answer that fits the picture.',
    howTo: ['Look at the picture before the audio.', 'Listen for the question word.', 'Answer from what the picture shows.'],
    tip: 'Name the place or thing in the picture in Korean before you listen.',
    practice: [
      { kind: 'choice', prompt: 'Look at the picture and listen. Choose the answer.', picture: '🏥', speak: '여기는 어디예요?', listenOnly: true, options: ['병원이에요', '은행이에요', '학교예요', '공장이에요'], answer: 0, explain: '"Where is this?" The picture shows a hospital (병원).' },
    ],
  },
  L7: {
    instructionEn: 'Listen and choose the right answer to the question.',
    keyWords: [['질문', 'question'], ['대답', 'answer']],
    what: 'You hear a short conversation between two people, then answer a question about it.',
    howTo: ['Read the question and options before the audio.', 'Listen for who says what.', 'Choose the answer the conversation supports.'],
    tip: 'In the test the speakers are 남 (man) and 여 (woman). Keep track of which one the question is about.',
    practice: [
      { kind: 'choice', prompt: 'Listen. What is wrong with the woman?', speak: '남: 어디 아파요? 여: 머리가 아파요.', listenOnly: true, options: ['She has a headache', 'Her stomach hurts', 'She is hungry', 'She is late'], answer: 0, explain: 'Man: "Where does it hurt?" Woman: "My head hurts."' },
      { kind: 'choice', prompt: 'Listen. Where is the man going?', speak: '여: 어디 가요? 남: 은행에 가요.', listenOnly: true, options: ['To the bank', 'To the hospital', 'Home', 'To the factory'], answer: 0, explain: 'Woman: "Where are you going?" Man: "I\'m going to the bank."' },
    ],
  },
};

function taskLessons(skill: 'reading' | 'listening', prefix: 'R' | 'L'): Lesson[] {
  return syllabusData.exams.EPS_TOPIK.skills[skill].topics.map(({ name, simpleDescription }, i) => {
    const code = `${prefix}${i + 1}`;
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

export const EPS_TOPIK: Unit = {
  id: 'eps-topik',
  number: 5,
  title: 'EPS-TOPIK',
  description: 'Every task in the test, one lesson each: what it is, how to answer it, and a few easy questions in its style.',
  emoji: '🎯',
  // Each task stands alone, and the practice page links to its own lesson.
  anyOrder: true,
  lessons: [...taskLessons('reading', 'R'), ...taskLessons('listening', 'L')],
};
