import type { CdsSubtask } from './cdsShared';

/**
 * NCC 'B' and 'C' certificate written paper (Army Wing), as the practice studio
 * lists it: each subject a heading, its question types under it. Keys and names
 * match the server's bank (Prepyo-Backend/scripts/ncc_bank/subjects.py), where a
 * question's topic is its type's name. Weights are questions in a B / C paper.
 * Drill is practical only (no written marks), so it has no questions.
 */
type Subject = { name: string; weight: string; types: [key: string, name: string, detail: string][] };

const COMMON: Subject[] = [
  { name: 'Weapon Training', weight: 'B 15 · C 5 Qs', types: [
    ['wt-characteristics', 'Rifle Characteristics', 'The .22 and INSAS rifles: calibre, magazine, modes of fire.'],
    ['wt-stripping', 'Stripping, Assembling & Cleaning', 'Taking the rifle apart, cleaning the bore and putting it back.'],
    ['wt-safety', 'Loading, Unloading & Safety', 'Safety rules, range orders and what to do when a rifle fails to fire.'],
    ['wt-positions', 'Firing Positions & Holding', 'Lying, kneeling, sitting and standing; a firm, repeatable hold.'],
    ['wt-aiming', 'Aiming & Trigger Operation', 'Sight picture, breathing, trigger squeeze, groups and MPI.'],
  ] },
  { name: 'National Integration & Awareness', weight: 'B 10 · C 5 Qs', types: [
    ['ni-unity', 'Unity in Diversity', 'National symbols, languages and the people who united India.'],
    ['ni-freedom', 'Freedom Struggle & National Heroes', '1857 to 1947: movements, leaders and landmarks.'],
    ['ni-security', 'Threats to National Security', 'Terrorism, insurgency, extremism, cyber and narco threats.'],
  ] },
  { name: 'Personality Development & Leadership', weight: 'B 39 · C 45 Qs', types: [
    ['pd-self', 'Self-Awareness & Confidence', 'SWOT, the Johari Window, self-esteem and goals.'],
    ['pd-communication', 'Communication Skills', 'Verbal and non-verbal communication, barriers, listening, feedback.'],
    ['pd-thinking', 'Critical Thinking & Decision Making', 'Problem solving, creative and critical thinking, sound decisions.'],
    ['pd-time-stress', 'Time & Stress Management', 'Prioritising, procrastination, and healthy ways to handle stress.'],
    ['pd-teamwork', 'Interpersonal Skills & Teamwork', 'Empathy, conflict resolution and how teams develop.'],
    ['ld-traits', 'Leadership Traits & Styles', 'The traits of a leader and autocratic, democratic and other styles.'],
    ['ld-motivation', 'Motivation', 'Maslow, Herzberg, morale and how leaders motivate.'],
    ['ld-ethics', 'Ethics, Values & Honour Code', 'Integrity, moral courage, values and the NCC pledge.'],
  ] },
  { name: 'Disaster Management', weight: 'B 9 · C 11 Qs', types: [
    ['dm-types', 'Types of Disaster', 'Natural and man-made disasters and what to do in them.'],
    ['dm-bodies', 'Disaster Management Bodies', 'NDMA, NDRF, SDMAs, the 2005 Act and the disaster cycle.'],
    ['dm-relief', 'Rescue, Relief & Essential Services', 'Triage, evacuation, relief camps and essential services.'],
    ['dm-fire', 'Firefighting', 'The fire triangle, classes of fire and extinguishers.'],
  ] },
  { name: 'Social Awareness & Community Development', weight: 'B 16 · C 18 Qs', types: [
    ['sa-service', 'Social Service, NGOs & Civic Duty', 'Social service, NGOs, Swachh Bharat and blood donation.'],
    ['sa-schemes', 'Government Development Schemes', 'MGNREGA, Jan Dhan, Ayushman Bharat and other schemes.'],
    ['sa-evils', 'Social Evils & Drug Abuse', 'Dowry, untouchability, drugs and the laws against them.'],
    ['sa-protection', 'Protection of Children & Women', 'Helplines, child marriage, POCSO and the Right to Education.'],
    ['sa-road', 'Road Safety', 'Signals, helmets, seat belts and helping accident victims.'],
  ] },
  { name: 'Health & Hygiene', weight: 'B 13 · C 14 Qs', types: [
    ['hh-body', 'Structure & Functions of the Body', 'Bones, heart, blood and the body\'s systems.'],
    ['hh-hygiene', 'Personal & Camp Hygiene', 'Personal cleanliness, camp sanitation and safe water.'],
    ['hh-diseases', 'Infectious Diseases & Prevention', 'Malaria, dengue, cholera, TB and how to prevent them.'],
    ['hh-firstaid', 'First Aid', 'Bleeding, burns, fractures, snake bites, CPR and choking.'],
    ['hh-fitness', 'Nutrition, Fitness & Yoga', 'Nutrients, deficiency diseases, BMI and yoga.'],
  ] },
  { name: 'Environment Awareness & Conservation', weight: 'B 0 · C 10 Qs', types: [
    ['env-resources', 'Natural Resources & Conservation', 'Renewable resources, forests, wildlife and conservation.'],
    ['env-pollution', 'Pollution & Waste Management', 'Air, water and noise pollution; the 3 Rs and waste.'],
    ['env-water-energy', 'Water & Energy Conservation', 'Rainwater harvesting, drip irrigation and saving energy.'],
    ['env-climate', 'Climate Change & Wildlife', 'Greenhouse gases, global agreements and wildlife law.'],
  ] },
  { name: 'Obstacle Training', weight: 'B 3 · C 7 Qs', types: [
    ['ot-obstacles', 'Obstacle Course & Safety', 'The obstacles, how to cross them, and staying safe.'],
  ] },
  { name: 'Border & Coastal Areas', weight: 'B 4 · C 5 Qs', types: [
    ['bca-geography', 'Border States & Terrain', 'India\'s neighbours, border lines and frontier states.'],
    ['bca-security', 'Border & Coastal Security', 'BSF, ITBP, SSB, Assam Rifles, the Coast Guard and BRO.'],
  ] },
  { name: 'NCC General', weight: 'B 3 · C 0 Qs', types: [
    ['nccg-organisation', 'Aims, Motto & Organisation', 'The NCC\'s aims, motto, wings, flag and history.'],
    ['nccg-ranks', 'Ranks, Incentives & Camps', 'Cadet ranks, certificates, camps and NCC Special Entry.'],
  ] },
  { name: 'Adventure Activities', weight: 'B 8 · C 0 Qs', types: [
    ['adv-activities', 'Adventure Activities & Camping', 'Land, water and air adventure; trekking and camping safely.'],
  ] },
];

const ARMY: Subject[] = [
  { name: 'Map Reading', weight: 'B 12 · C 15 Qs', types: [
    ['mr-signs', 'Maps & Conventional Signs', 'Topographical maps, colours and the symbols on them.'],
    ['mr-grid', 'Scales & Grid References', 'Map scales and four-, six- and eight-figure grid references.'],
    ['mr-relief', 'Relief, Contours & Gradients', 'Contours, spurs, saddles, re-entrants and working out gradients.'],
    ['mr-bearings', 'Types of North & Bearings', 'True, magnetic and grid north; forward and back bearings.'],
    ['mr-instruments', 'Service Protractor & Prismatic Compass', 'Using the compass and protractor; degrees and mils.'],
    ['mr-position', 'Setting a Map & Finding Position', 'Setting the map, resection, intersection and GPS.'],
  ] },
  { name: 'Field Craft & Battle Craft', weight: 'B 12 · C 15 Qs', types: [
    ['fc-distance', 'Judging Distance', 'Unit of measure, appearance, halving, bracketing and more.'],
    ['fc-targets', 'Description of Ground & Target Indication', 'Reference points, the clock ray method and fire control orders.'],
    ['fc-concealment', 'Observation, Camouflage & Concealment', 'Why things are seen, cover and concealment.'],
    ['fc-formations', 'Field Signals & Section Formations', 'Single file, file, arrowhead, diamond and extended line.'],
    ['fc-fire', 'Fire Control, Fire & Movement', 'Covering fire, moving by bounds, patrols and the section attack.'],
  ] },
  { name: 'Armed Forces', weight: 'B 10 · C 5 Qs', types: [
    ['af-organisation', 'Army Organisation & Commands', 'Commands and their headquarters, arms and services.'],
    ['af-ranks', 'Ranks, Honours & Awards', 'Equivalent ranks of the three services and gallantry awards.'],
    ['af-services', 'Navy, Air Force & Modes of Entry', 'The academies, the services\' days and ways to join.'],
  ] },
  { name: 'Infantry Weapons & Equipment', weight: 'B 8 · C 7 Qs', types: [
    ['iw-weapons', 'Infantry Weapons', 'Rifles, LMGs, carbines, pistols and grenades.'],
    ['iw-equipment', 'Support Weapons & Equipment', 'Mortars, rocket launchers, ATGMs and field equipment.'],
  ] },
  { name: 'Military History', weight: 'B 10 · C 10 Qs', types: [
    ['mh-wars', 'Wars Since Independence', '1947–48, 1962, 1965, 1971, Kargil and other operations.'],
    ['mh-leaders', 'Military Leaders & Gallantry Awards', 'Great Indian commanders and Param Vir Chakra winners.'],
  ] },
  { name: 'Communication', weight: 'B 3 · C 3 Qs', types: [
    ['comm-rt', 'Radio Telephony & Voice Procedure', 'Prowords, the phonetic alphabet and radio discipline.'],
    ['comm-means', 'Means of Communication', 'Line, radio, visual, despatch and satellite communication.'],
  ] },
];

const subtasks = (subjects: Subject[]): CdsSubtask[] =>
  subjects.flatMap(subject =>
    subject.types.map(([key, name, detail]) => ({ key, name, detail, weight: subject.weight, topics: [name], group: subject.name })),
  );

/** NCC's practice question types by paper: common subjects, then Army Wing subjects. */
export const NCC_SUBTASKS = {
  ncc_common: subtasks(COMMON),
  ncc_army: subtasks(ARMY),
};
