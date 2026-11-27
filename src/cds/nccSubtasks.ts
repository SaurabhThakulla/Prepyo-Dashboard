import type { CdsSubtask } from './cdsShared';

/**
 * NCC 'B' and 'C' certificate written paper, as the practice studio
 * lists it: each subject a heading, its question types under it. Keys and names
 * match the server's bank (Prepyo-Backend/scripts/ncc_bank/subjects.py), where a
 * question's topic is its type's name. Weights are questions in a B / C paper.
 * Drill is practical only (no written marks), so it has no questions.
 */
type Subject = { name: string; weight: string; types: [key: string, name: string, detail: string][] };

/** "B 15 · C 5 Qs" as marks: 2 marks a question, so "B 30 · C 10 marks". */
const marksOf = (weight: string) => weight.replace(/\d+/g, n => String(Number(n) * 2)).replace('Qs', 'marks');

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
  { name: 'Drill', weight: 'B 0 · C 0 Qs', types: [
    ['drl-drill', 'Foot, Arms & Ceremonial Drill', 'Words of command, foot drill, rifle salutes and guards (viva / practical notes).'],
  ] },
  { name: 'General Awareness', weight: 'B 0 · C 0 Qs', types: [
    ['ga-india-states', 'India: States, Capitals & Polity', 'States, capitals, national symbols, Constitution and parliamentary basics.'],
    ['ga-geography', 'Rivers, Mountains & Natural World', 'Rivers, dams, peaks, wildlife sanctuaries, soils and flora.'],
    ['ga-history', 'History, Freedom Struggle & Leaders', 'Ancient and medieval heritage, UNESCO sites, freedom struggle and pioneers.'],
    ['ga-defence-world', 'Defence, World Capitals & International Orgs', 'Defence academies, mottos, world capitals and global bodies.'],
    ['ga-economy-culture', 'Economy, Railways, Culture, Sports & Awards', 'Banking, minerals, railways, agriculture, arts, awards and sports.'],
    ['ga-science-tech', 'Science, Anatomy, Diseases, IT & Miscellaneous', 'Human body, health, physics, chemistry, inventions, abbreviations and IT.'],
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
    subject.types.map(([key, name, detail]) => ({
      key,
      name,
      detail,
      weight: subject.weight,
      topics: [name],
      group: subject.name,
      groupNote: marksOf(subject.weight),
    })),
  );

// Naval and Air Wing subjects (DG NCC directive, SNCCO 2022, Appendix AC and AD);
// a paper's 55 specialised questions are spread over them by their written marks
// (Prepyo-Backend/scripts/ncc_bank/wing_subjects.py).
const NAVY: Subject[] = [
  { name: 'Naval Orientation & Service Subjects', weight: 'B 18 · C 18 Qs', types: [
    ['nv-organisation', 'Navy Organisation, Commands & Ranks', 'Naval commands, training establishments and equal ranks.'],
    ['nv-ships', 'Ships, Submarines & Naval Aviation', 'Carriers, destroyers, submarines, missiles and naval aircraft.'],
    ['nv-history', 'Naval History & Traditions', 'From the Cholas to 1971; ceremonies and customs at sea.'],
  ] },
  { name: 'Naval Communication', weight: 'B 5 · C 5 Qs', types: [
    ['nv-signals', 'Visual Signalling: Flags, Semaphore & Morse', 'Code flags, semaphore and the Morse code.'],
    ['nv-radio', 'Radio Procedure & Phonetics', 'Prowords, distress calls and the phonetic alphabet.'],
  ] },
  { name: 'Navigation', weight: 'B 5 · C 6 Qs', types: [
    ['nv-charts', 'Charts, Latitude & Compass', 'Latitude and longitude, charts, variation and fixes.'],
    ['nv-tides', 'Tides, Lights & Buoyage', 'Spring and neap tides, lighthouses and IALA buoys.'],
  ] },
  { name: 'Seamanship', weight: 'B 8 · C 15 Qs', types: [
    ['nv-ship-parts', 'Parts of a Ship & Boat', 'Bow, stern, keel, bulkheads and the rest of a ship.'],
    ['nv-ropes', 'Ropes, Knots & Anchors', 'Bends, hitches, splices and anchor work.'],
    ['nv-boats', 'Boat Pulling & Sailing', 'Pulling orders, parts of a sail and points of sailing.'],
  ] },
  { name: 'NBCD', weight: 'B 8 · C 4 Qs', types: [
    ['nv-damage', 'Firefighting & Damage Control at Sea', 'Fires, flooding, plugging and shoring on board.'],
    ['nv-nbc', 'Nuclear, Biological & Chemical Defence', 'Respirators, decontamination and fallout.'],
  ] },
  { name: 'Ship & Boat Modelling', weight: 'B 8 · C 3 Qs', types: [
    ['nv-modelling', 'Ship & Boat Modelling', 'Scales, materials, static and working models.'],
  ] },
  { name: 'Swimming', weight: 'B 3 · C 4 Qs', types: [
    ['nv-swimming', 'Swimming & Water Safety', 'Strokes, water safety and helping someone in the water.'],
  ] },
];

const AIR: Subject[] = [
  { name: 'General Service Knowledge', weight: 'B 13 · C 10 Qs', types: [
    ['af-iaf', 'IAF Organisation, Commands & Ranks', 'Air commands, academies and equal ranks.'],
    ['af-aircraft', 'Aircraft of the IAF', 'Fighters, transports, helicopters and missiles.'],
  ] },
  { name: 'Air Campaigns', weight: 'B 5 · C 30 Qs', types: [
    ['af-wars', 'Air Wars of India', '1947–48, 1962, 1965, 1971, Kargil and Balakot.'],
    ['af-operations', 'Air Operations & Relief Missions', 'Airlifts, evacuations and disaster relief.'],
  ] },
  { name: 'Principles of Flight', weight: 'B 8 · C 0 Qs', types: [
    ['af-forces', 'Forces on an Aircraft & Lift', 'Lift, weight, thrust, drag and the stall.'],
    ['af-controls', 'Control Surfaces & Stability', 'Ailerons, elevators, rudder, flaps and the three axes.'],
  ] },
  { name: 'Airmanship', weight: 'B 7 · C 0 Qs', types: [
    ['af-airmanship', 'Airfield, Air Traffic Control & Flying Safety', 'Runways, lights, ATC signals and flying safety.'],
  ] },
  { name: 'Navigation', weight: 'B 8 · C 0 Qs', types: [
    ['af-navigation', 'Air Navigation', 'Heading, track, drift, ground speed and radio aids.'],
  ] },
  { name: 'Aero Engines & Airframes', weight: 'B 7 · C 5 Qs', types: [
    ['af-engines', 'Aero Engines', 'Piston, jet, turbofan and turboprop engines.'],
    ['af-airframes', 'Airframes & Aircraft Parts', 'Fuselage, wings, tail unit and landing gear.'],
  ] },
  { name: 'Basic Flight Instruments', weight: 'B 2 · C 0 Qs', types: [
    ['af-instruments', 'Basic Flight Instruments', 'Altimeter, airspeed, attitude and heading.'],
  ] },
  { name: 'Aero Modelling', weight: 'B 5 · C 10 Qs', types: [
    ['af-modelling', 'Aero Modelling', 'Gliders, control-line and radio-controlled models.'],
  ] },
];

/** NCC's practice question types by paper: common subjects, then each wing's subjects. */
export const NCC_SUBTASKS = {
  ncc_common: subtasks(COMMON),
  ncc_army: subtasks(ARMY),
  ncc_navy: subtasks(NAVY),
  ncc_air: subtasks(AIR),
};
