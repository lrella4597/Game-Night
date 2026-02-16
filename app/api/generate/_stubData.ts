export interface StubQuestion {
  question: string;
  answer: string;
}

/** At least 8 questions per category, roughly ordered easy → hard. */
const STUB_BANK: Record<string, StubQuestion[]> = {
  SCIENCE: [
    { question: "The chemical symbol for gold is this two-letter abbreviation.", answer: "Au" },
    { question: "Plants convert sunlight into food through this process.", answer: "Photosynthesis" },
    { question: "This layer of Earth's atmosphere contains the ozone layer.", answer: "The stratosphere" },
    { question: "The unit of electrical resistance is named after this German physicist.", answer: "Ohm" },
    { question: "This type of bond forms when two atoms share electrons.", answer: "A covalent bond" },
    { question: "Einstein's famous equation states that energy equals mass times this value squared.", answer: "The speed of light (c)" },
    { question: "This particle has no electric charge and is found in the nucleus of an atom.", answer: "A neutron" },
    { question: "This principle, central to quantum mechanics, states that position and momentum cannot both be precisely known.", answer: "Heisenberg's Uncertainty Principle" },
  ],
  HISTORY: [
    { question: "This ancient wonder, built for a pharaoh, still stands in Giza, Egypt.", answer: "The Great Pyramid of Giza" },
    { question: "This 1215 English charter was the first to limit the power of the monarchy.", answer: "The Magna Carta" },
    { question: "Napoleon Bonaparte was exiled to this remote South Atlantic island after Waterloo.", answer: "Saint Helena" },
    { question: "This treaty formally ended World War I in 1919.", answer: "The Treaty of Versailles" },
    { question: "The storming of this Parisian fortress in 1789 marked the start of the French Revolution.", answer: "The Bastille" },
    { question: "This Carthaginian general famously crossed the Alps with war elephants.", answer: "Hannibal Barca" },
    { question: "This 1648 series of treaties established the principle of state sovereignty in Europe.", answer: "The Peace of Westphalia" },
    { question: "This Mongol ruler unified the nomadic tribes of Northeast Asia and founded the Mongol Empire.", answer: "Genghis Khan" },
  ],
  "POP CULTURE": [
    { question: "This animated studio produced Toy Story, the first fully computer-animated feature film.", answer: "Pixar" },
    { question: "This superhero is also known as the 'Man of Steel' and came to Earth from Krypton.", answer: "Superman" },
    { question: "In the Star Wars universe, this is the name of Han Solo's ship.", answer: "The Millennium Falcon" },
    { question: "This pop star famously wore a meat dress to the 2010 MTV Video Music Awards.", answer: "Lady Gaga" },
    { question: "This HBO series follows a crime family in New Jersey, led by Tony Soprano.", answer: "The Sopranos" },
    { question: "Christopher Nolan directed this 2010 film about a thief who enters people's dreams.", answer: "Inception" },
    { question: "This British band released 'Abbey Road' in 1969 as one of their final albums.", answer: "The Beatles" },
    { question: "The phrase 'I am inevitable' is famously spoken by this Marvel villain.", answer: "Thanos" },
  ],
  GEOGRAPHY: [
    { question: "This is the largest ocean on Earth by surface area.", answer: "The Pacific Ocean" },
    { question: "The Amazon River flows through this South American country before emptying into the Atlantic.", answer: "Brazil" },
    { question: "This narrow body of water separates Alaska from Russia.", answer: "The Bering Strait" },
    { question: "Australia's capital city is this, often mistaken for Sydney.", answer: "Canberra" },
    { question: "This African country has the highest population on the continent.", answer: "Nigeria" },
    { question: "This mountain range forms the natural border between Europe and Asia.", answer: "The Ural Mountains" },
    { question: "This tiny European country is completely surrounded by Italy.", answer: "San Marino" },
    { question: "This narrow strip of land connects North and South America.", answer: "The Isthmus of Panama" },
  ],
  SPORTS: [
    { question: "This sport uses a shuttlecock instead of a ball.", answer: "Badminton" },
    { question: "This country's national rugby team is known as the 'All Blacks'.", answer: "New Zealand" },
    { question: "Athens, Greece hosted the first modern Olympic Games in this year.", answer: "1896" },
    { question: "This boxer was known as 'The Greatest' and won the heavyweight title three times.", answer: "Muhammad Ali" },
    { question: "Michael Phelps holds the record for most Olympic gold medals ever with this number.", answer: "23" },
    { question: "In tennis, this Grand Slam is played on clay courts in Paris.", answer: "The French Open (Roland Garros)" },
    { question: "This American football team has won the most Super Bowl championships.", answer: "The New England Patriots (6 titles)" },
    { question: "This MLB pitcher holds the all-time record for career strikeouts.", answer: "Nolan Ryan (5,714)" },
  ],
  "FOOD & DRINK": [
    { question: "This fruit, when mashed with lime and salt, becomes guacamole.", answer: "Avocado" },
    { question: "This Italian cheese is traditionally used as the primary topping on pizza Margherita.", answer: "Mozzarella" },
    { question: "This spice, harvested from crocus flowers, is the most expensive spice in the world by weight.", answer: "Saffron" },
    { question: "This French technique involves cooking vacuum-sealed food in a precisely heated water bath.", answer: "Sous vide" },
    { question: "This Japanese fermented paste, made from soybeans, is the base of miso soup.", answer: "Miso" },
    { question: "The Maillard reaction, which gives browned food its flavor, is named after this type of scientist.", answer: "A French chemist (Louis-Camille Maillard)" },
    { question: "This cooking fat, rendered from pork, was the dominant frying medium before vegetable oil.", answer: "Lard" },
    { question: "This Indian cooking technique uses a clay oven called a tandoor, giving dishes their characteristic char.", answer: "Tandoori cooking" },
  ],
  DEFAULT: [
    { question: "Leonardo da Vinci painted this enigmatic portrait, now housed in the Louvre.", answer: "The Mona Lisa" },
    { question: "This programming language, named after a Monty Python comedy troupe, was created by Guido van Rossum.", answer: "Python" },
    { question: "The chemical element with atomic number 79, represented by 'Au', is this precious metal.", answer: "Gold" },
    { question: "Newton's Third Law states that for every action there is an equal and opposite one of these.", answer: "Reaction" },
    { question: "This fictional detective lived at 221B Baker Street, London.", answer: "Sherlock Holmes" },
    { question: "The Declaration of Independence was ratified in this year.", answer: "1776" },
    { question: "This gas makes up approximately 78% of Earth's atmosphere.", answer: "Nitrogen" },
    { question: "Mount Olympus, the highest point in Greece, was said to be home to these figures in mythology.", answer: "The Greek gods" },
  ],
};

/** Find the best matching stub pool for a given category name. */
function findPool(categoryName: string): StubQuestion[] {
  const upper = categoryName.toUpperCase();
  // Exact match first
  if (STUB_BANK[upper]) return STUB_BANK[upper];
  // Partial match
  const key = Object.keys(STUB_BANK).find(
    (k) => upper.includes(k) || k.includes(upper)
  );
  return key ? STUB_BANK[key] : STUB_BANK.DEFAULT;
}

/**
 * Pick one stub question for a specific point value.
 * Uses the value's rank in sorted rowValues to index into the pool,
 * with an optional variant offset for variety between calls.
 */
export function pickStubQuestion(
  categoryName: string,
  pointValue: number,
  allRowValues: number[],
  variantSeed = 0
): StubQuestion {
  const pool = findPool(categoryName);
  const sorted = [...allRowValues].sort((a, b) => a - b);
  const rank = sorted.indexOf(pointValue);
  const base = rank >= 0 ? rank : 0;
  const idx = (base + variantSeed) % pool.length;
  return pool[idx];
}

/**
 * Build a full column of stub questions, one per row value.
 * Each question is distinct (uses position-based indexing with per-row offset).
 */
export function buildStubColumn(
  categoryName: string,
  rowValues: number[]
): Array<{ value: number; question: string; answer: string }> {
  const pool = findPool(categoryName);
  const sorted = [...rowValues].sort((a, b) => a - b);
  // Shuffle pool deterministically with mild randomness per call
  const offset = Math.floor(Math.random() * pool.length);
  return sorted.map((v, i) => ({
    value: v,
    ...pool[(offset + i) % pool.length],
  }));
}
