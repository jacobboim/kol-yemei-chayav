#!/usr/bin/env node
/**
 * fetch-siman.js
 * 
 * Fetches Shulchan Aruch text + all available meforshim for a given
 * chelek + siman from Sefaria and saves raw JSON to public/data/{chelek}/{siman}.json
 *
 * Usage:
 *   node scripts/fetch-siman.js --chelek OC --siman 1
 *   node scripts/fetch-siman.js --chelek OC --siman 1 --siman 2 --siman 3
 *   node scripts/fetch-siman.js --chelek OC --range 1-10
 *   node scripts/fetch-siman.js --chelek YD --range 1-50
 *
 * Or from Claude Code:
 *   "Fetch OC simanim 1 through 20"
 *   → node scripts/fetch-siman.js --chelek OC --range 1-20
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Sefaria title maps ──────────────────────────────────────────────────────

const CHELEK_TITLES = {
  OC: 'Orach Chayim',
  YD: 'Yoreh Deah',
  EH: 'Even HaEzer',
  CM: 'Choshen Mishpat',
};

// For each commentary: which chelakot it covers and the exact Sefaria title prefix
const COMMENTARIES = [
  {
    id: 'bg',
    name: "Be'er HaGolah",
    hebrew: 'באר הגולה',
    prefixes: {
      OC: "Be'er HaGolah on Shulchan Arukh, Orach Chayim",
      YD: "Be'er HaGolah on Shulchan Arukh, Yoreh Deah",
      EH: "Be'er HaGolah on Shulchan Arukh, Even HaEzer",
      CM: "Be'er HaGolah on Shulchan Arukh, Choshen Mishpat",
    },
  },
  {
    id: 'pm_ea',
    name: 'Pri Megadim (Eshel Avraham)',
    hebrew: 'פרי מגדים — אשל אברהם',
    prefixes: {
      OC: 'Peri Megadim on Orach Chayim, Eshel Avraham',
      YD: 'Peri Megadim, Yoreh Deah, Siftei Daat',
    },
  },
  {
    id: 'pm_mz',
    name: 'Pri Megadim (Mishbetzos Zahav)',
    hebrew: 'פרי מגדים — משבצות זהב',
    prefixes: {
      OC: 'Peri Megadim on Orach Chayim, Mishbezot Zahav',
      YD: 'Peri Megadim, Yoreh Deah, Mishbezot Zahav',
    },
  },
  {
    id: 'er',
    name: 'Elya Rabbah',
    hebrew: 'אליה רבה',
    prefixes: {
      OC: 'Eliyah Rabbah on Shulchan Arukh, Orach Chayim',
    },
  },
  {
    id: 'shach',
    name: 'Shach',
    hebrew: 'שך',
    prefixes: {
      YD: 'Shach on Yoreh Deah',
      CM: 'Shach on Choshen Mishpat',
    },
  },
  {
    id: 'taz',
    name: 'Taz',
    hebrew: 'ט"ז',
    prefixes: {
      OC: 'Turei Zahav on Shulchan Arukh, Orach Chayim',
      YD: 'Turei Zahav on Shulchan Arukh, Yoreh Deah',
      EH: 'Turei Zahav on Shulchan Arukh, Even HaEzer',
    },
  },
  {
    id: 'ma',
    name: 'Magen Avraham',
    hebrew: 'מגן אברהם',
    prefixes: {
      OC: 'Magen Avraham',
    },
  },
  {
    id: 'pt',
    name: 'Pischei Teshuva',
    hebrew: 'פתחי תשובה',
    prefixes: {
      YD: 'Pitchei Teshuva on Shulchan Arukh, Yoreh Deah',
      EH: 'Pitchei Teshuva on Shulchan Arukh, Even HaEzer',
      CM: 'Pitchei Teshuva on Shulchan Arukh, Choshen Mishpat',
    },
  },
  {
    id: 'bh',
    name: "Ba'er Hetev",
    hebrew: 'באר היטב',
    prefixes: {
      OC: "Ba'er Hetev on Shulchan Arukh, Orach Chayim",
      YD: "Ba'er Hetev on Shulchan Arukh, Yoreh Deah",
      EH: "Ba'er Hetev on Shulchan Arukh, Even HaEzer",
      CM: "Ba'er Hetev on Shulchan Arukh, Choshen Mishpat",
    },
  },
  {
    id: 'mb',
    name: 'Mishnah Berurah',
    hebrew: 'משנה ברורה',
    prefixes: {
      OC: 'Mishnah Berurah',
    },
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function stripHtml(val) {
  if (!val) return '';
  if (Array.isArray(val)) return val.map(stripHtml).filter(Boolean).join(' ');
  return String(val).replace(/<[^>]+>/g, '').trim();
}

async function fetchWithRetry(url, retries = 3, delayMs = 800) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;      // text doesn't exist — not an error
      if (res.status === 429) {
        console.warn(`  Rate limited, waiting ${delayMs * 2}ms…`);
        await sleep(delayMs * 2);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(delayMs);
    }
  }
}

async function fetchSeifText(titlePrefix, siman, seif) {
  const ref = `${titlePrefix} ${siman}:${seif}`;
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0&commentary=0`;
  const data = await fetchWithRetry(url);
  if (!data) return null;

  const he = stripHtml(data.he);
  const en = stripHtml(data.text);

  // Sefaria returns empty arrays or whitespace for missing text
  if (!he && !en) return null;

  return { ref, he, en };
}

// Discover how many seifim a siman has by probing incrementally
async function discoverSeifCount(titlePrefix, siman, maxSeifs = 30) {
  let count = 0;
  for (let seif = 1; seif <= maxSeifs; seif++) {
    const result = await fetchSeifText(titlePrefix, siman, seif);
    await sleep(120); // be polite to Sefaria
    if (!result) break;
    count = seif;
  }
  return count;
}

// ── Core fetch function ──────────────────────────────────────────────────────

async function fetchSiman(chelekId, simanNum) {
  const chelekTitle = CHELEK_TITLES[chelekId];
  if (!chelekTitle) throw new Error(`Unknown chelek: ${chelekId}`);

  console.log(`\nFetching ${chelekId} siman ${simanNum}…`);

  const saPrefix = `Shulchan Arukh, ${chelekTitle}`;
  const outDir = join(ROOT, 'public', 'data', chelekId);
  const outFile = join(outDir, `${simanNum}.json`);

  mkdirSync(outDir, { recursive: true });

  // 1. Discover seif count for SA
  console.log('  Discovering seif count…');
  const seifCount = await discoverSeifCount(saPrefix, simanNum);
  if (seifCount === 0) {
    console.warn(`  No text found for ${chelekId} siman ${simanNum} — skipping`);
    return;
  }
  console.log(`  Found ${seifCount} seifim`);

  // 2. Fetch all SA seifim
  const seifim = [];
  for (let seif = 1; seif <= seifCount; seif++) {
    const text = await fetchSeifText(saPrefix, simanNum, seif);
    await sleep(150);
    if (text) {
      seifim.push({ seif, he: text.he, en: text.en, ref: text.ref });
    }
  }

  // 3. Fetch available commentaries per seif
  const commentaryData = {}; // { commId: { id, name, hebrew, seifim: { [seif]: {he, en, ref} } } }

  for (const comm of COMMENTARIES) {
    const prefix = comm.prefixes[chelekId];
    if (!prefix) continue;

    const commSeifim = {};
    let anyFound = false;

    for (let seif = 1; seif <= seifCount; seif++) {
      const text = await fetchSeifText(prefix, simanNum, seif);
      await sleep(120);
      if (text) {
        commSeifim[seif] = { he: text.he, en: text.en, ref: text.ref };
        anyFound = true;
      }
    }

    if (anyFound) {
      commentaryData[comm.id] = {
        id: comm.id,
        name: comm.name,
        hebrew: comm.hebrew,
        seifim: commSeifim,
      };
      console.log(`  ✓ ${comm.name} (${Object.keys(commSeifim).length} seifim)`);
    } else {
      console.log(`  – ${comm.name} not available for this siman`);
    }
  }

  // 4. Write output
  const output = {
    chelek: chelekId,
    siman: simanNum,
    chelekTitle,
    seifCount,
    fetchedAt: new Date().toISOString(),
    // SA seifim array
    sa: seifim,
    // Available commentaries
    commentaries: commentaryData,
    // Enrichment placeholder — filled in by generate-summaries.js
    enriched: {},
  };

  writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
  console.log(`  ✓ Saved to public/data/${chelekId}/${simanNum}.json`);
  return output;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  let chelekId = 'OC';
  const simanimToFetch = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--chelek') chelekId = args[++i]?.toUpperCase();
    if (args[i] === '--siman') simanimToFetch.push(Number(args[++i]));
    if (args[i] === '--range') {
      const [from, to] = args[++i].split('-').map(Number);
      for (let s = from; s <= to; s++) simanimToFetch.push(s);
    }
  }

  if (!CHELEK_TITLES[chelekId]) {
    console.error(`Unknown chelek "${chelekId}". Use OC, YD, EH, or CM.`);
    process.exit(1);
  }

  if (simanimToFetch.length === 0) {
    console.error('No simanim specified. Use --siman 1 or --range 1-10');
    process.exit(1);
  }

  console.log(`Fetching ${chelekId}: simanim ${simanimToFetch.join(', ')}`);

  for (const siman of simanimToFetch) {
    try {
      await fetchSiman(chelekId, siman);
      await sleep(400); // pause between simanim
    } catch (err) {
      console.error(`  Error fetching siman ${siman}:`, err.message);
    }
  }

  console.log('\nDone.');
}

main();
