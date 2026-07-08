#!/usr/bin/env node
/**
 * fetch-bulk.js
 *
 * Bulk-fetches all Shulchan Arukh simanim + commentaries.
 * Parallel: N simanim at once, each siman fetches SA + all commentaries simultaneously.
 *
 * Usage:
 *   node scripts/fetch-bulk.js                          # all 4 chelakot from siman 1
 *   node scripts/fetch-bulk.js --chelek OC              # one chelek
 *   node scripts/fetch-bulk.js --chelek OC --from 189   # start mid-way
 *   node scripts/fetch-bulk.js --chelek YD --from 1 --to 50
 *   node scripts/fetch-bulk.js --force                  # re-fetch existing files
 *   node scripts/fetch-bulk.js --concurrency 10         # tune parallelism (default 8)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CHELEK_TITLES = {
  OC: 'Orach Chayim',
  YD: 'Yoreh Deah',
  EH: 'Even HaEzer',
  CM: 'Choshen Mishpat',
};

const SEFARIA_NAMES = {
  OC: 'Shulchan Arukh, Orach Chayim',
  YD: 'Shulchan Arukh, Yoreh Deah',
  EH: 'Shulchan Arukh, Even HaEzer',
  CM: 'Shulchan Arukh, Choshen Mishpat',
};

const SIMAN_COUNTS = {
  OC: 697,
  YD: 403,
  EH: 178,
  CM: 427,
};

const COMMENTARIES = [
  {
    id: 'bg', name: "Be'er HaGolah", hebrew: 'באר הגולה',
    prefixes: {
      OC: "Be'er HaGolah on Shulchan Arukh, Orach Chayim",
      YD: "Be'er HaGolah on Shulchan Arukh, Yoreh De'ah",
      EH: "Be'er HaGolah on Shulchan Arukh, Even HaEzer",
      CM: "Be'er HaGolah on Shulchan Arukh, Choshen Mishpat",
    },
  },
  {
    id: 'pm_ea', name: 'Pri Megadim (Eshel Avraham)', hebrew: 'פרי מגדים — אשל אברהם',
    prefixes: {
      OC: 'Peri Megadim on Orach Chayim, Eshel Avraham',
      YD: "Peri Megadim on Yoreh De'ah, Siftei Da'at",
    },
  },
  {
    id: 'pm_mz', name: 'Pri Megadim (Mishbetzos Zahav)', hebrew: 'פרי מגדים — משבצות זהב',
    prefixes: {
      OC: 'Peri Megadim on Orach Chayim, Mishbezot Zahav',
      YD: "Peri Megadim on Yoreh De'ah, Mishbezot Zahav",
    },
  },
  {
    id: 'er', name: 'Elya Rabbah', hebrew: 'אליה רבה',
    prefixes: { OC: 'Eliyah Rabbah on Shulchan Arukh, Orach Chayim' },
  },
  {
    id: 'shach', name: 'Shach', hebrew: 'שך',
    prefixes: {
      YD: "Siftei Kohen on Shulchan Arukh, Yoreh De'ah",
      CM: 'Siftei Kohen on Shulchan Arukh, Choshen Mishpat',
    },
  },
  {
    id: 'taz', name: 'Taz', hebrew: 'ט"ז',
    prefixes: {
      OC: 'Turei Zahav on Shulchan Arukh, Orach Chayim',
      YD: "Turei Zahav on Shulchan Arukh, Yoreh De'ah",
      EH: 'Turei Zahav on Shulchan Arukh, Even HaEzer',
    },
  },
  {
    id: 'ma', name: 'Magen Avraham', hebrew: 'מגן אברהם',
    prefixes: { OC: 'Magen Avraham' },
  },
  {
    id: 'pt', name: 'Pischei Teshuva', hebrew: 'פתחי תשובה',
    prefixes: {
      YD: "Pitchei Teshuva on Shulchan Arukh, Yoreh De'ah",
      EH: 'Pitchei Teshuva on Shulchan Arukh, Even HaEzer',
      CM: 'Pitchei Teshuva on Shulchan Arukh, Choshen Mishpat',
    },
  },
  {
    id: 'bh', name: "Ba'er Hetev", hebrew: 'באר היטב',
    prefixes: {
      OC: "Ba'er Hetev on Shulchan Arukh, Orach Chayim",
      YD: "Ba'er Hetev on Shulchan Arukh, Yoreh De'ah",
      EH: "Ba'er Hetev on Shulchan Arukh, Even HaEzer",
      CM: "Ba'er Hetev on Shulchan Arukh, Choshen Mishpat",
    },
  },
  {
    id: 'mb', name: 'Mishnah Berurah', hebrew: 'משנה ברורה',
    prefixes: { OC: 'Mishnah Berurah' },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function stripHtml(val) {
  if (!val) return '';
  if (Array.isArray(val)) return val.map(v => stripHtml(v)).filter(Boolean).join(' ');
  return String(val).replace(/<[^>]+>/g, '').trim();
}

// Simple concurrency pool — lets N async tasks run simultaneously
function makePool(concurrency) {
  let running = 0;
  const queue = [];
  function drain() {
    while (running < concurrency && queue.length) {
      const { fn, resolve, reject } = queue.shift();
      running++;
      fn().then(v => { running--; resolve(v); drain(); })
          .catch(e => { running--; reject(e); drain(); });
    }
  }
  return fn => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); drain(); });
}

async function fetchWithRetry(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 404 || res.status === 400) return null; // ref doesn't exist
      if (res.status === 429) {
        const wait = 3000 * (i + 1);
        process.stdout.write(`\n  [429] rate-limited, waiting ${wait}ms…\n`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(500 * (i + 1));
    }
  }
}

async function fetchSimanText(bookPrefix, simanNum) {
  const ref = `${bookPrefix} ${simanNum}`;
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0`;
  const data = await fetchWithRetry(url);
  if (!data) return null;

  const heArr = Array.isArray(data.he) ? data.he : [];
  const enArr = Array.isArray(data.text) ? data.text : [];
  const count = Math.max(heArr.length, enArr.length);
  if (count === 0) return null;

  const seifimMap = {};
  for (let i = 0; i < count; i++) {
    const he = stripHtml(heArr[i]);
    const en = stripHtml(enArr[i]);
    if (he || en) seifimMap[i + 1] = { he, en, ref: `${bookPrefix} ${simanNum}:${i + 1}` };
  }
  return Object.keys(seifimMap).length ? seifimMap : null;
}

async function fetchSiman(chelekId, simanNum) {
  const chelekTitle = CHELEK_TITLES[chelekId];
  const bookName = SEFARIA_NAMES[chelekId];
  const commDefs = COMMENTARIES.filter(c => c.prefixes[chelekId]);

  // Fire SA + every applicable commentary in parallel
  const results = await Promise.allSettled([
    fetchSimanText(bookName, simanNum),
    ...commDefs.map(c => fetchSimanText(c.prefixes[chelekId], simanNum)),
  ]);

  const saMap = results[0].status === 'fulfilled' ? results[0].value : null;
  const commMaps = results.slice(1).map(r => r.status === 'fulfilled' ? r.value : null);

  if (!saMap) return null;

  const seifNums = Object.keys(saMap).map(Number).sort((a, b) => a - b);
  const saArr = seifNums.map(seif => ({
    seif,
    he: saMap[seif].he,
    en: saMap[seif].en,
    ref: saMap[seif].ref,
  }));

  const commentaryData = {};
  commDefs.forEach((comm, idx) => {
    const m = commMaps[idx];
    if (m) commentaryData[comm.id] = { id: comm.id, name: comm.name, hebrew: comm.hebrew, seifim: m };
  });

  return {
    chelek: chelekId,
    siman: simanNum,
    chelekTitle,
    seifCount: saArr.length,
    fetchedAt: new Date().toISOString(),
    sa: saArr,
    commentaries: commentaryData,
    enriched: {},
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let chelekFilter = null;
  let fromSiman = 1;
  let toSiman = null;
  let force = false;
  let concurrency = 8;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--chelek')      chelekFilter = args[++i]?.toUpperCase();
    if (args[i] === '--from')        fromSiman = Number(args[++i]);
    if (args[i] === '--to')          toSiman = Number(args[++i]);
    if (args[i] === '--force')       force = true;
    if (args[i] === '--concurrency') concurrency = Number(args[++i]);
  }

  const chelakot = chelekFilter ? [chelekFilter] : ['OC', 'YD', 'EH', 'CM'];
  const pool = makePool(concurrency);

  let totalFetched = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const chelekId of chelakot) {
    if (!CHELEK_TITLES[chelekId]) { console.error(`Unknown chelek "${chelekId}"`); process.exit(1); }

    const startSiman = fromSiman;
    const maxSiman = toSiman || SIMAN_COUNTS[chelekId];
    const outDir = join(ROOT, 'public', 'data', chelekId);
    mkdirSync(outDir, { recursive: true });

    console.log(`\n=== ${chelekId} (${CHELEK_TITLES[chelekId]}) simanim ${startSiman}–${maxSiman}  [concurrency=${concurrency}] ===`);

    const tasks = [];
    for (let siman = startSiman; siman <= maxSiman; siman++) {
      const s = siman;
      const outFile = join(outDir, `${s}.json`);

      if (!force && existsSync(outFile)) { totalSkipped++; continue; }

      tasks.push(pool(async () => {
        try {
          const result = await fetchSiman(chelekId, s);
          if (result && result.sa.length > 0) {
            writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');
            totalFetched++;
            const pct = Math.round((s / maxSiman) * 100);
            const commCount = Object.keys(result.commentaries).length;
            process.stdout.write(`\r  ✓ ${chelekId} ${s}/${maxSiman} (${pct}%) [fetched=${totalFetched}]  seifim=${result.seifCount} comm=${commCount}  `);
          } else {
            totalErrors++;
            process.stdout.write(`\n  ✗ ${chelekId} ${s}: no text\n`);
          }
        } catch (err) {
          totalErrors++;
          process.stdout.write(`\n  Error ${chelekId} ${s}: ${err.message}\n`);
        }
      }));
    }

    await Promise.all(tasks);
    console.log(`\n  Done with ${chelekId}.`);
    fromSiman = 1; // reset for subsequent chelakot
  }

  console.log(`\nFinished. Fetched: ${totalFetched}  Skipped: ${totalSkipped}  Errors: ${totalErrors}`);
}

main();
