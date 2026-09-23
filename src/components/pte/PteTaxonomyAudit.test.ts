import { describe, expect, it } from 'vitest';
import { PTE_SECTIONS } from '@/components/pte/PtePracticeHub';

describe('PTE Academic 23-Archetype Sandbox Validation', () => {
  it('validates Part 1: Speaking & Writing taxonomy coverage in frontend Hub', () => {
    const speakingTasks = PTE_SECTIONS.find(s => s.skill === 'speaking')?.tasks.map(t => t.name) || [];
    const writingTasks = PTE_SECTIONS.find(s => s.skill === 'writing')?.tasks.map(t => t.name) || [];

    // Official post-Aug 2025 speaking tasks in hub
    expect(speakingTasks).toContain('Summarise Group Discussion');
    expect(speakingTasks).toContain('Respond to a Situation');
    expect(speakingTasks).toContain('Read Aloud');
    expect(speakingTasks).toContain('Repeat Sentence');
    expect(speakingTasks).toContain('Describe Image');
    expect(speakingTasks).toContain('Re-tell Lecture');

    // Writing tasks
    expect(writingTasks).toContain('Summarize Written Text');
    expect(writingTasks).toContain('Write Essay');
    // Note: Non-standard coaching item present in current UI:
    expect(writingTasks).toContain('Repeated Essay Questions');
  });

  it('validates Part 2: Reading taxonomy coverage in frontend Hub', () => {
    const readingTasks = PTE_SECTIONS.find(s => s.skill === 'reading')?.tasks.map(t => t.name) || [];
    expect(readingTasks).toContain('Fill in the Blanks (Dropdown)');
    expect(readingTasks).toContain('Multiple Type Multiple Answer');
    expect(readingTasks).toContain('Reorder Paragraph');
    expect(readingTasks).toContain('Reading Fill in the Blanks');
    expect(readingTasks).toContain('Multiple Type Single Answer');
    expect(readingTasks.length).toBe(5);
  });

  it('validates Part 3: Listening taxonomy coverage in frontend Hub', () => {
    const listeningTasks = PTE_SECTIONS.find(s => s.skill === 'listening')?.tasks.map(t => t.name) || [];
    // Verify canonical title case 'Summarize Spoken Text'
    expect(listeningTasks).toContain('Summarize Spoken Text');
    expect(listeningTasks).toContain('Write from Dictation');
    expect(listeningTasks).toContain('Highlight Incorrect Word');
    expect(listeningTasks.length).toBe(8);
  });
});
