import { NextResponse } from 'next/server';

export async function GET() {
  const exams = [
    {
      id: 'PTE',
      name: 'PTE Academic',
      version: 'v2026.1',
      description: 'Pearson Test of English Academic preparation with 2-hour full simulation, AI oral fluency and written evaluation.',
      scoreScale: { min: 10, max: 90, standardTarget: 79 },
      skills: [
        {
          id: 'speaking',
          name: 'Speaking',
          taskTypes: [
            { id: 'read-aloud', name: 'Read Aloud', points: 15, prepTime: 35, duration: 40 },
            { id: 'repeat-sentence', name: 'Repeat Sentence', points: 13, prepTime: 3, duration: 15 },
            { id: 'describe-image', name: 'Describe Image', points: 15, prepTime: 25, duration: 40 },
            { id: 'retell-lecture', name: 'Retell Lecture', points: 15, prepTime: 10, duration: 40 },
          ]
        },
        {
          id: 'writing',
          name: 'Writing',
          taskTypes: [
            { id: 'summarize-written-text', name: 'Summarize Written Text', points: 10, prepTime: 0, duration: 600 },
            { id: 'write-essay', name: 'Write Essay', points: 20, prepTime: 0, duration: 1200 },
          ]
        },
        {
          id: 'reading',
          name: 'Reading',
          taskTypes: [
            { id: 'fill-in-blanks-rw', name: 'Reading & Writing: Fill in Blanks', points: 12, duration: 180 },
            { id: 'reorder-paragraphs', name: 'Re-order Paragraphs', points: 12, duration: 240 },
            { id: 'fill-in-blanks-r', name: 'Reading: Fill in Blanks', points: 10, duration: 150 },
            { id: 'multiple-choice-single', name: 'Multiple Choice (Single Answer)', points: 5, duration: 90 },
          ]
        },
        {
          id: 'listening',
          name: 'Listening',
          taskTypes: [
            { id: 'summarize-spoken-text', name: 'Summarize Spoken Text', points: 10, duration: 600 },
            { id: 'write-from-dictation', name: 'Write from Dictation', points: 11, duration: 45 },
            { id: 'fill-in-blanks-l', name: 'Listening: Fill in Blanks', points: 7, duration: 120 },
          ]
        }
      ]
    },
    {
      id: 'IELTS',
      name: 'IELTS (Academic & General)',
      version: 'v2026.1',
      description: 'International English Language Testing System simulator with Band 0–9 rubric evaluation.',
      scoreScale: { min: 1.0, max: 9.0, standardTarget: 7.5 },
      skills: [
        {
          id: 'listening',
          name: 'Listening',
          taskTypes: [
            { id: 'ielts-listening-section1', name: 'Section 1 (Conversation & Form Completion)', points: 10, duration: 300 },
            { id: 'ielts-listening-section2', name: 'Section 2 (Monologue & Map/Plan)', points: 10, duration: 300 },
            { id: 'ielts-listening-section3', name: 'Section 3 (Academic Discussion)', points: 10, duration: 360 },
            { id: 'ielts-listening-section4', name: 'Section 4 (University Lecture)', points: 10, duration: 400 },
          ]
        },
        {
          id: 'reading',
          name: 'Reading',
          taskTypes: [
            { id: 'ielts-reading-tfng', name: 'True / False / Not Given', points: 15, duration: 600 },
            { id: 'ielts-reading-headings', name: 'Matching Headings', points: 15, duration: 600 },
            { id: 'ielts-reading-summary', name: 'Summary Completion', points: 10, duration: 450 },
          ]
        },
        {
          id: 'writing',
          name: 'Writing',
          taskTypes: [
            { id: 'ielts-writing-task1', name: 'Task 1: Academic Report (150 words)', points: 20, duration: 1200 },
            { id: 'ielts-writing-task2', name: 'Task 2: Discursive Essay (250 words)', points: 25, duration: 2400 },
          ]
        },
        {
          id: 'speaking',
          name: 'Speaking',
          taskTypes: [
            { id: 'ielts-speaking-part1', name: 'Part 1: Introduction & Interview', points: 10, duration: 240 },
            { id: 'ielts-speaking-part2', name: 'Part 2: Long Turn (Cue Card)', points: 20, prepTime: 60, duration: 120 },
            { id: 'ielts-speaking-part3', name: 'Part 3: Two-way Discussion', points: 15, duration: 300 },
          ]
        }
      ]
    }
  ];

  return NextResponse.json({ success: true, exams });
}
