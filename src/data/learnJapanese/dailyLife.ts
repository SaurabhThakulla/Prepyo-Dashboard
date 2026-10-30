import { Unit } from '../learnKorean/types';
import { vocabLesson } from '../learnKorean/vocab';

const J = 'Japanese';

/**
 * The everyday themes of N5 reading and listening: food, shopping, getting
 * around, school and work, home, weather and the body.
 */
export const JP_DAILY: Unit = {
  id: 'jp-daily',
  number: 6,
  title: 'Daily Life',
  description: 'Food, shops, trains, school, home, weather and feeling ill: the words of everyday life in Japan.',
  emoji: '🗾',
  lessons: [
    vocabLesson('food', 'Food & drink', 'ごはん, さかな, みず, おちゃ', [
      { ko: 'ごはん', roman: 'go-han', en: 'rice; a meal', picture: '🍚' },
      { ko: 'さかな', roman: 'sa-ka-na', en: 'fish', picture: '🐟' },
      { ko: 'にく', roman: 'ni-ku', en: 'meat', picture: '🥩' },
      { ko: 'やさい', roman: 'ya-sa-i', en: 'vegetables', picture: '🥬' },
      { ko: 'たまご', roman: 'ta-ma-go', en: 'egg', picture: '🥚' },
      { ko: 'みず', roman: 'mi-zu', en: 'water', picture: '💧' },
      { ko: 'ぎゅうにゅう', roman: 'gyū-nyū', en: 'milk', picture: '🥛' },
      { ko: 'くだもの', roman: 'ku-da-mo-no', en: 'fruit', picture: '🍎' },
    ], J),
    vocabLesson('meals', 'Meals', 'あさごはん, ひるごはん, ばんごはん', [
      { ko: 'あさごはん', roman: 'a-sa-go-han', en: 'breakfast', picture: '🍳' },
      { ko: 'ひるごはん', roman: 'hi-ru-go-han', en: 'lunch', picture: '🍱' },
      { ko: 'ばんごはん', roman: 'ban-go-han', en: 'dinner', picture: '🍲' },
      { ko: 'おいしい', roman: 'o-i-shi-i', en: 'delicious', picture: '😋' },
      { ko: 'レストラン', roman: 're-su-to-ran', en: 'restaurant', picture: '🍽️' },
      { ko: 'はし', roman: 'ha-shi', en: 'chopsticks', picture: '🥢' },
      { ko: 'コップ', roman: 'kop-pu', en: 'glass, cup', picture: '🥃' },
    ], J),
    vocabLesson('shopping', 'Shopping', 'みせ, かいます, いくら', [
      { ko: 'みせ', roman: 'mi-se', en: 'shop', picture: '🏪' },
      { ko: 'デパート', roman: 'de-pā-to', en: 'department store', picture: '🏬' },
      { ko: 'スーパー', roman: 'sū-pā', en: 'supermarket', picture: '🛒' },
      { ko: 'おかね', roman: 'o-ka-ne', en: 'money', picture: '💴' },
      { ko: 'さいふ', roman: 'sa-i-fu', en: 'wallet', picture: '👛' },
      { ko: 'くつ', roman: 'ku-tsu', en: 'shoes', picture: '👟' },
      { ko: 'ふく', roman: 'fu-ku', en: 'clothes', picture: '👕' },
      { ko: 'ぼうし', roman: 'bō-shi', en: 'hat', picture: '👒' },
    ], J),
    vocabLesson('transport', 'Getting around', 'えき, でんしゃ, ひだり, みぎ', [
      { ko: 'えき', roman: 'e-ki', en: 'station', picture: '🚉' },
      { ko: 'ちかてつ', roman: 'chi-ka-te-tsu', en: 'subway', picture: '🚇' },
      { ko: 'じてんしゃ', roman: 'ji-ten-sha', en: 'bicycle', picture: '🚲' },
      { ko: 'ひこうき', roman: 'hi-kō-ki', en: 'aeroplane', picture: '✈️' },
      { ko: 'みち', roman: 'mi-chi', en: 'road, street', picture: '🛣️' },
      { ko: 'みぎ', roman: 'mi-gi', en: 'right', picture: '➡️' },
      { ko: 'ひだり', roman: 'hi-da-ri', en: 'left', picture: '⬅️' },
      { ko: 'まっすぐ', roman: 'mas-su-gu', en: 'straight on', picture: '⬆️' },
    ], J),
    vocabLesson('school', 'School & work', 'がっこう, じゅぎょう, しゅくだい, かいしゃ', [
      { ko: 'じゅぎょう', roman: 'ju-gyō', en: 'class, lesson', picture: '🧑‍🏫' },
      { ko: 'しゅくだい', roman: 'shu-ku-da-i', en: 'homework', picture: '📝' },
      { ko: 'しけん', roman: 'shi-ken', en: 'exam', picture: '💯' },
      { ko: 'きょうしつ', roman: 'kyō-shi-tsu', en: 'classroom', picture: '🏫' },
      { ko: 'かいしゃ', roman: 'ka-i-sha', en: 'company', picture: '🏢' },
      { ko: 'しごと', roman: 'shi-go-to', en: 'work, job', picture: '💼' },
      { ko: 'やすみ', roman: 'ya-su-mi', en: 'holiday, day off', picture: '🏖️' },
      { ko: 'べんきょう', roman: 'ben-kyō', en: 'study', picture: '📚' },
    ], J),
    vocabLesson('home', 'At home', 'うち, へや, まど, ドア', [
      { ko: 'うち', roman: 'u-chi', en: 'home, house', picture: '🏠' },
      { ko: 'へや', roman: 'he-ya', en: 'room', picture: '🛏️' },
      { ko: 'まど', roman: 'ma-do', en: 'window', picture: '🪟' },
      { ko: 'ドア', roman: 'do-a', en: 'door', picture: '🚪' },
      { ko: 'だいどころ', roman: 'da-i-do-ko-ro', en: 'kitchen', picture: '🍳' },
      { ko: 'おふろ', roman: 'o-fu-ro', en: 'bath', picture: '🛁' },
      { ko: 'れいぞうこ', roman: 'rei-zō-ko', en: 'fridge', picture: '🧊' },
    ], J),
    vocabLesson('weather', 'Weather & seasons', 'あめ, ゆき, あつい, さむい', [
      { ko: 'てんき', roman: 'ten-ki', en: 'weather', picture: '🌤️' },
      { ko: 'あめ', roman: 'a-me', en: 'rain', picture: '🌧️' },
      { ko: 'ゆき', roman: 'yu-ki', en: 'snow', picture: '❄️' },
      { ko: 'はれ', roman: 'ha-re', en: 'sunny weather', picture: '☀️' },
      { ko: 'あつい', roman: 'a-tsu-i', en: 'hot', picture: '🥵' },
      { ko: 'さむい', roman: 'sa-mu-i', en: 'cold', picture: '🥶' },
      { ko: 'なつ', roman: 'na-tsu', en: 'summer', picture: '🌻' },
      { ko: 'ふゆ', roman: 'fu-yu', en: 'winter', picture: '⛄' },
    ], J),
    vocabLesson('health', 'Body & health', 'あたま, おなか, いたい, びょういん', [
      { ko: 'あたま', roman: 'a-ta-ma', en: 'head', picture: '🙆' },
      { ko: 'おなか', roman: 'o-na-ka', en: 'stomach', picture: '🤰' },
      { ko: 'め', roman: 'me', en: 'eye', picture: '👁️' },
      { ko: 'あし', roman: 'a-shi', en: 'leg, foot', picture: '🦵' },
      { ko: 'いたい', roman: 'i-ta-i', en: 'painful, it hurts', picture: '🤕' },
      { ko: 'びょういん', roman: 'byō-in', en: 'hospital', picture: '🏥', note: 'Do not mix it up with びよういん, a hair salon: the long ょう matters.' },
      { ko: 'くすり', roman: 'ku-su-ri', en: 'medicine', picture: '💊' },
    ], J),
  ],
};
