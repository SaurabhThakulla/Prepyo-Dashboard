import { SkillType } from './types';

export type PteExamVariant = 'academic' | 'core';

export interface PteTaskConfig {
  id: string;
  name: string;
  code: string;
  skill: SkillType;
  typeKey: string;
  isAi?: boolean;
  isNewAcademic?: boolean;
  academic: {
    active: boolean;
    weight: string;
    labelSuffix?: string;
  };
  core: {
    active: boolean;
    weight: string;
    labelSuffix?: string;
  };
}

/**
 * Complete specification of all PTE Academic vs PTE Core tasks,
 * matching Pearson's official specifications and weights.
 */
export const PTE_TASKS_CONFIG: PteTaskConfig[] = [
  // ── Speaking ──────────────────────────────────────────────────────────
  {
    id: 'ra',
    name: 'Read Aloud',
    code: 'RA',
    skill: 'speaking',
    typeKey: 'readaloud',
    isAi: true,
    academic: { active: true, weight: '4%' },
    core: { active: true, weight: '16%' },
  },
  {
    id: 'rs',
    name: 'Repeat Sentence',
    code: 'RS',
    skill: 'speaking',
    typeKey: 'repeatsentence',
    isAi: true,
    academic: { active: true, weight: '7%' },
    core: { active: true, weight: '19%' },
  },
  {
    id: 'di',
    name: 'Describe Image',
    code: 'DI',
    skill: 'speaking',
    typeKey: 'describeimage',
    isAi: true,
    academic: { active: true, weight: '15%' },
    core: { active: true, weight: '5%' },
  },
  {
    id: 'rl',
    name: 'Retell Lecture',
    code: 'RL',
    skill: 'speaking',
    typeKey: 'retelllecture',
    isAi: true,
    academic: { active: true, weight: '6%' },
    core: { active: false, weight: '', labelSuffix: '(PTEA)' },
  },
  {
    id: 'asq',
    name: 'Answer Short Question',
    code: 'ASQ',
    skill: 'speaking',
    typeKey: 'answershortquestions',
    isAi: true,
    academic: { active: true, weight: '2%' },
    core: { active: true, weight: '<1%' },
  },
  {
    id: 'sgd',
    name: 'Summarize Group Discussion',
    code: 'SGD',
    skill: 'speaking',
    typeKey: 'summarisegroupdiscussion',
    isAi: true,
    isNewAcademic: true,
    academic: { active: true, weight: '9%' },
    core: { active: false, weight: '', labelSuffix: '(PTEA)' },
  },
  {
    id: 'rts',
    name: 'Respond to a Situation',
    code: 'RTS',
    skill: 'speaking',
    typeKey: 'respondtuasituation',
    isAi: true,
    isNewAcademic: true,
    academic: { active: true, weight: '6%' },
    core: { active: true, weight: '3%' },
  },

  // ── Writing ───────────────────────────────────────────────────────────
  {
    id: 'swt',
    name: 'Summarize Written Text',
    code: 'SWT',
    skill: 'writing',
    typeKey: 'summarizewrittentext',
    isAi: true,
    academic: { active: true, weight: '7%' },
    core: { active: true, weight: '4%' },
  },
  {
    id: 'we',
    name: 'Write Essay',
    code: 'WE',
    skill: 'writing',
    typeKey: 'writeessay',
    isAi: true,
    academic: { active: true, weight: '7%' },
    core: { active: false, weight: '', labelSuffix: '(PTEA)' },
  },
  {
    id: 'email',
    name: 'Write Email',
    code: 'EMAIL',
    skill: 'writing',
    typeKey: 'writeemail',
    isAi: true,
    academic: { active: false, weight: '', labelSuffix: '(Core)' },
    core: { active: true, weight: '7%' },
  },

  // ── Reading ───────────────────────────────────────────────────────────
  {
    id: 'fib_d',
    name: 'Fill in the Blanks (Dropdown)',
    code: 'FIB-D',
    skill: 'reading',
    typeKey: 'fillinblanksdropdown',
    academic: { active: true, weight: '7%' },
    core: { active: true, weight: '11%' },
  },
  {
    id: 'mcma_r',
    name: 'Multiple Choice (Multiple)',
    code: 'MCMA-R',
    skill: 'reading',
    typeKey: 'multipletypemultipleanswer',
    academic: { active: true, weight: '1%' },
    core: { active: true, weight: '<1%' },
  },
  {
    id: 'ro',
    name: 'Reorder Paragraph',
    code: 'RO',
    skill: 'reading',
    typeKey: 'reorderparagraph',
    academic: { active: true, weight: '3%' },
    core: { active: true, weight: '2%' },
  },
  {
    id: 'fib_r',
    name: 'Fill in the Blanks (Drag and Drop)',
    code: 'FIB-R',
    skill: 'reading',
    typeKey: 'readingfillinblanks',
    academic: { active: true, weight: '6%' },
    core: { active: true, weight: '6%' },
  },
  {
    id: 'mcsa_r',
    name: 'Multiple Choice (Single)',
    code: 'MCSA-R',
    skill: 'reading',
    typeKey: 'multipletypesingleanswer',
    academic: { active: true, weight: '<1%' },
    core: { active: true, weight: '<1%' },
  },

  // ── Listening ─────────────────────────────────────────────────────────
  {
    id: 'sst',
    name: 'Summarize Spoken Text',
    code: 'SST',
    skill: 'listening',
    typeKey: 'summarizespokentext',
    isAi: true,
    academic: { active: true, weight: '4%' },
    core: { active: true, weight: '4%' },
  },
  {
    id: 'mcma_l',
    name: 'Multiple Choice (Multiple)',
    code: 'MCMA-L',
    skill: 'listening',
    typeKey: 'mcqmultipleanswer',
    academic: { active: true, weight: '1%' },
    core: { active: true, weight: '<1%' },
  },
  {
    id: 'fib_l',
    name: 'Fill in the Blanks',
    code: 'FIB-L',
    skill: 'listening',
    typeKey: 'listeningfillinblanks',
    academic: { active: true, weight: '3%' },
    core: { active: true, weight: '5%' },
  },
  {
    id: 'hcs',
    name: 'Highlight Correct Summary',
    code: 'HCS',
    skill: 'listening',
    typeKey: 'highlightcorrectsummary',
    academic: { active: true, weight: '<1%' },
    core: { active: false, weight: '', labelSuffix: '(PTEA)' },
  },
  {
    id: 'mcsa_l',
    name: 'Multiple Choice (Single)',
    code: 'MCSA-L',
    skill: 'listening',
    typeKey: 'mcqsingleanswer',
    academic: { active: true, weight: '<1%' },
    core: { active: true, weight: '<1%' },
  },
  {
    id: 'smw',
    name: 'Select Missing Word',
    code: 'SMW',
    skill: 'listening',
    typeKey: 'selectmissingword',
    academic: { active: true, weight: '1%' },
    core: { active: true, weight: '<1%' },
  },
  {
    id: 'hiw',
    name: 'Highlight Incorrect Words',
    code: 'HIW',
    skill: 'listening',
    typeKey: 'highlightincorrectword',
    academic: { active: true, weight: '4%' },
    core: { active: true, weight: '5%' },
  },
  {
    id: 'wfd',
    name: 'Write from Dictation',
    code: 'WFD',
    skill: 'listening',
    typeKey: 'writefromdictation',
    academic: { active: true, weight: '5%' },
    core: { active: true, weight: '13%' },
  },
];

export interface ColumnItem {
  id: string;
  name: string;
  cleanName: string;
  code: string;
  typeKey: string;
  skill: SkillType;
  isActive: boolean;
  weight: string;
  isAi?: boolean;
  isNew?: boolean;
  disabledSuffix?: string;
  unavailableReason?: string;
}

/**
 * Returns the exact column items (active tasks followed by disabled/locked tasks)
 * for a skill in the selected PTE variant, matching the reference image layout.
 */
export function getPteSkillColumnItems(variant: PteExamVariant, skill: SkillType): {
  active: ColumnItem[];
  disabled: ColumnItem[];
  all: ColumnItem[];
} {
  const tasks = PTE_TASKS_CONFIG.filter(t => t.skill === skill);
  const active: ColumnItem[] = [];
  const disabled: ColumnItem[] = [];

  for (const task of tasks) {
    const variantInfo = variant === 'core' ? task.core : task.academic;
    if (variantInfo.active) {
      active.push({
        id: task.id,
        name: task.name,
        cleanName: task.name,
        code: task.code,
        typeKey: task.typeKey,
        skill: task.skill,
        isActive: true,
        weight: variantInfo.weight,
        isAi: task.isAi,
        isNew: variant === 'academic' && task.isNewAcademic,
      });
    } else {
      const suffix = variantInfo.labelSuffix || (variant === 'core' ? '(PTEA)' : '(Core)');
      const otherVariant = variant === 'core' ? 'PTE Academic' : 'PTE Core';
      disabled.push({
        id: `${task.id}-disabled`,
        name: `${task.name} ${suffix}`,
        cleanName: task.name,
        code: task.code,
        typeKey: task.typeKey,
        skill: task.skill,
        isActive: false,
        weight: '',
        disabledSuffix: suffix,
        unavailableReason: `Unavailable in ${variant === 'core' ? 'PTE Core' : 'PTE Academic'} (${otherVariant} only)`,
      });
    }
  }

  // Also include the PTEA/Core counterpart indicators if applicable (like in screenshot:
  // e.g. In PTE Core: Summarize Written Text (PTEA) disabled, Respond to a Situation (PTEA) disabled, Summarize Spoken Text (PTEA) disabled.
  // In PTE Academic: Respond to a Situation (Core) disabled, Summarize Written Text (Core) disabled, Summarize Spoken Text (Core) disabled.)
  if (variant === 'core') {
    if (skill === 'speaking') {
      disabled.push({
        id: 'rts-ptea',
        name: 'Respond to a Situation (PTEA)',
        cleanName: 'Respond to a Situation',
        code: 'RTS',
        typeKey: 'respondtuasituation',
        skill: 'speaking',
        isActive: false,
        weight: '',
        disabledSuffix: '(PTEA)',
        unavailableReason: 'PTE Academic situation prompts differ from PTE Core everyday scenarios.',
      });
    } else if (skill === 'writing') {
      disabled.push({
        id: 'swt-ptea',
        name: 'Summarize Written Text (PTEA)',
        cleanName: 'Summarize Written Text',
        code: 'SWT',
        typeKey: 'summarizewrittentext',
        skill: 'writing',
        isActive: false,
        weight: '',
        disabledSuffix: '(PTEA)',
        unavailableReason: 'Academic passages are scored under PTE Academic standards.',
      });
    } else if (skill === 'listening') {
      disabled.push({
        id: 'sst-ptea',
        name: 'Summarize Spoken Text (PTEA)',
        cleanName: 'Summarize Spoken Text',
        code: 'SST',
        typeKey: 'summarizespokentext',
        skill: 'listening',
        isActive: false,
        weight: '',
        disabledSuffix: '(PTEA)',
        unavailableReason: 'Academic spoken audio differs from PTE Core conversational audio.',
      });
    }
  } else {
    // Academic variant: show Core versions disabled at bottom
    if (skill === 'speaking') {
      disabled.push({
        id: 'rts-core',
        name: 'Respond to a Situation (Core)',
        cleanName: 'Respond to a Situation',
        code: 'RTS',
        typeKey: 'respondtuasituation',
        skill: 'speaking',
        isActive: false,
        weight: '',
        disabledSuffix: '(Core)',
        unavailableReason: 'PTE Core situation prompts are specific to General / CLB migration criteria.',
      });
    } else if (skill === 'writing') {
      disabled.push({
        id: 'swt-core',
        name: 'Summarize Written Text (Core)',
        cleanName: 'Summarize Written Text',
        code: 'SWT',
        typeKey: 'summarizewrittentext',
        skill: 'writing',
        isActive: false,
        weight: '',
        disabledSuffix: '(Core)',
        unavailableReason: 'PTE Core text summaries follow CLB standards.',
      });
    } else if (skill === 'listening') {
      disabled.push({
        id: 'sst-core',
        name: 'Summarize Spoken Text (Core)',
        cleanName: 'Summarize Spoken Text',
        code: 'SST',
        typeKey: 'summarizespokentext',
        skill: 'listening',
        isActive: false,
        weight: '',
        disabledSuffix: '(Core)',
        unavailableReason: 'PTE Core spoken summaries follow CLB standards.',
      });
    }
  }

  return {
    active,
    disabled,
    all: [...active, ...disabled],
  };
}

const PTE_TASK_KEY_ALIASES: Record<string, string> = {
  // Speaking
  'readaloud': 'ra',
  'repeatsentence': 'rs',
  'describeimage': 'di',
  'retelllecture': 'rl',
  'answershortquestion': 'asq',
  'answershortquestions': 'asq',
  'summarizegroupdiscussion': 'sgd',
  'summarisegroupdiscussion': 'sgd',
  'respondtoasituation': 'rts',
  'respondtuasituation': 'rts',

  // Writing
  'summarizewrittentext': 'swt',
  'summarisewrittentext': 'swt',
  'writeessay': 'we',
  'repeatedessay': 'we',
  'repeatedessayquestions': 'we',
  'writeemail': 'email',

  // Reading
  'fillinblanksdropdown': 'fib_d',
  'fillintheblanksdropdown': 'fib_d',
  'multipletypemultipleanswer': 'mcma_r',
  'multiplechoicemultiple': 'mcma_r',
  'multiplechoicemultiplereading': 'mcma_r',
  'reorderparagraph': 'ro',
  'readingfillinblanks': 'fib_r',
  'readingfillintheblanks': 'fib_r',
  'fillinblanksdraganddrop': 'fib_r',
  'fillintheblanksdraganddrop': 'fib_r',
  'multipletypesingleanswer': 'mcsa_r',
  'multiplechoicesingle': 'mcsa_r',
  'multiplechoicesinglereading': 'mcsa_r',

  // Listening
  'summarizespokentext': 'sst',
  'summarisespokentext': 'sst',
  'mcqmultipleanswer': 'mcma_l',
  'multiplechoicemultiplelistening': 'mcma_l',
  'listeningfillinblanks': 'fib_l',
  'listeningfillintheblanks': 'fib_l',
  'fillinblanks': 'fib_l',
  'fillintheblanks': 'fib_l',
  'highlightcorrectsummary': 'hcs',
  'mcqsingleanswer': 'mcsa_l',
  'multiplechoicesinglelistening': 'mcsa_l',
  'selectmissingword': 'smw',
  'highlightincorrectword': 'hiw',
  'highlightincorrectwords': 'hiw',
  'writefromdictation': 'wfd',

  // Question bank type ids the names above do not cover
  'pteanswershortquestion': 'asq',
  'ptesummarisegroupdiscussion': 'sgd',
  'ptesummarizegroupdiscussion': 'sgd',
  'pterespondtosituation': 'rts',
  'respondtosituation': 'rts',
  'fillinblanksrw': 'fib_d',
  'readingmcqmultiple': 'mcma_r',
  'ptereadingmcma': 'mcma_r',
  'fillinblanksr': 'fib_r',
  'readingmcqsingle': 'mcsa_r',
  'ptereadingmcsa': 'mcsa_r',
  'ptelisteningmcma': 'mcma_l',
  'ptelisteningfib': 'fib_l',
  'ptelisteningmcsa': 'mcsa_l',
  'ptehighlightincorrectword': 'hiw',
};

/**
 * Normalizes a task name or type key to look up its weight and status.
 */
export function findPteTaskConfig(keyOrName: string): PteTaskConfig | undefined {
  const rawNorm = keyOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliasedId = PTE_TASK_KEY_ALIASES[rawNorm];
  if (aliasedId) {
    const found = PTE_TASKS_CONFIG.find(t => t.id === aliasedId);
    if (found) return found;
  }

  // Fallback fuzzy match
  const norm = rawNorm.replace(/summarise/g, 'summarize').replace(/the/g, '');
  return PTE_TASKS_CONFIG.find(t => {
    const normKey = t.typeKey.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/the/g, '');
    const normName = t.name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/the/g, '');
    return norm === normKey || norm === normName || norm.includes(normKey) || normKey.includes(norm);
  });
}

/**
 * Returns the weight string (e.g. "16%", "4%") for a task in the given PTE variant.
 */
export function getPteTaskWeight(variant: PteExamVariant, keyOrName: string): string | undefined {
  const config = findPteTaskConfig(keyOrName);
  if (!config) return undefined;
  const info = variant === 'core' ? config.core : config.academic;
  return info.active ? info.weight : undefined;
}

export interface PteSkillContribution {
  skill: SkillType;
  percent: number;
}

/**
 * Share of each skill score a PTE Academic task makes up, task's own skill
 * first. Estimates from AlfaPTE's task chart; Pearson does not publish them.
 */
const PTE_ACADEMIC_CONTRIBUTIONS: Record<string, PteSkillContribution[]> = {
  ra: [{ skill: 'speaking', percent: 9 }],
  rs: [{ skill: 'speaking', percent: 16 }, { skill: 'listening', percent: 17 }],
  di: [{ skill: 'speaking', percent: 31 }],
  rl: [{ skill: 'speaking', percent: 13 }, { skill: 'listening', percent: 13 }],
  asq: [{ skill: 'listening', percent: 4 }],
  sgd: [{ skill: 'speaking', percent: 19 }, { skill: 'listening', percent: 20 }],
  rts: [{ skill: 'speaking', percent: 13 }],
  swt: [{ skill: 'writing', percent: 28 }, { skill: 'reading', percent: 23 }],
  we: [{ skill: 'writing', percent: 31 }],
  fib_d: [{ skill: 'reading', percent: 25 }],
  mcma_r: [{ skill: 'reading', percent: 5 }],
  ro: [{ skill: 'reading', percent: 9 }],
  fib_r: [{ skill: 'reading', percent: 20 }],
  mcsa_r: [{ skill: 'reading', percent: 3 }],
  sst: [{ skill: 'listening', percent: 10 }, { skill: 'writing', percent: 18 }],
  mcma_l: [{ skill: 'listening', percent: 3 }],
  fib_l: [{ skill: 'listening', percent: 8 }],
  hcs: [{ skill: 'listening', percent: 2 }, { skill: 'reading', percent: 3 }],
  mcsa_l: [{ skill: 'listening', percent: 2 }],
  smw: [{ skill: 'listening', percent: 1 }],
  hiw: [{ skill: 'listening', percent: 8 }, { skill: 'reading', percent: 13 }],
  wfd: [{ skill: 'listening', percent: 13 }, { skill: 'writing', percent: 23 }],
};

/**
 * Per-skill contributions for a task, or undefined where none are known
 * (PTE Core, or a task not offered in the variant).
 */
export function getPteTaskContributions(
  variant: PteExamVariant,
  keyOrName: string,
): PteSkillContribution[] | undefined {
  if (variant !== 'academic') return undefined;
  const config = findPteTaskConfig(keyOrName);
  if (!config || !config.academic.active) return undefined;
  return PTE_ACADEMIC_CONTRIBUTIONS[config.id];
}

/**
 * Checks whether a task is active in the given PTE variant.
 */
export function isPteTaskAvailable(variant: PteExamVariant, keyOrName: string): boolean {
  const config = findPteTaskConfig(keyOrName);
  if (!config) return true; // Default fallback to allowed if unknown
  return variant === 'core' ? config.core.active : config.academic.active;
}

/**
 * Returns human-readable label if locked.
 */
export function getPteTaskLockedReason(variant: PteExamVariant, keyOrName: string): string | undefined {
  const config = findPteTaskConfig(keyOrName);
  if (!config) return undefined;
  const isCore = variant === 'core';
  const active = isCore ? config.core.active : config.academic.active;
  if (active) return undefined;
  return isCore
    ? `Available in PTE Academic only (${config.core.labelSuffix ?? 'PTEA'})`
    : `Available in PTE Core only (${config.academic.labelSuffix ?? 'Core'})`;
}
