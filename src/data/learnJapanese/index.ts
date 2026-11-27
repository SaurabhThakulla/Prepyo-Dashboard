import { withListening } from '../learnKorean/vocab';
import { Unit } from '../learnKorean/types';
import { JP_BASIC } from './basic';
import { JP_DAILY } from './dailyLife';
import { JP_GRAMMAR } from './grammar';
import { HIRAGANA } from './hiragana';
import { JLPT_N5 } from './jlpt';
import { JP_KANJI } from './kanji';
import { KATAKANA } from './katakana';
import { JP_NUMBERS } from './numbers';
import { SSW_CARE, SSW_FARM, SSW_FOOD, SSW_JFT, SSW_LIFE } from './ssw';

/**
 * The beginner Japanese course for JLPT N5 (and NAT-TEST 5Q), in the order
 * it is taught: both kana scripts, first words and grammar, numbers, daily
 * life and the first kanji, then the test's own tasks. After them come the
 * units for SSW (特定技能) workers: life and work in Japan, JFT-Basic, and
 * three job fields. As in the Korean course, every unit but the exam tasks
 * gets extra listening questions.
 */
export const JAPANESE_UNITS: Unit[] = [
  ...[HIRAGANA, KATAKANA, JP_BASIC, JP_GRAMMAR, JP_NUMBERS, JP_DAILY, JP_KANJI].map(withListening),
  JLPT_N5,
  ...[SSW_LIFE, SSW_JFT, SSW_CARE, SSW_FOOD, SSW_FARM].map(withListening),
];
