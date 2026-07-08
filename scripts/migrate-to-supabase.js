#!/usr/bin/env node
/**
 * migrate-to-supabase.js
 *
 * Reads all public/data/{chelek}/{siman}.json files and upserts them
 * into the Supabase `simanim` and `seif_texts` tables.
 *
 * Requires .env in project root with:
 *   VITE_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...   ← service_role key (not anon key)
 *
 * Usage:
 *   node scripts/migrate-to-supabase.js
 *   node scripts/migrate-to-supabase.js --chelek OC        # one section only
 *   node scripts/migrate-to-supabase.js --chelek OC --from 1 --to 50
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Load .env manually (no dotenv dependency needed) ─────────────────────────
function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Add to .env:\n  VITE_SUPABASE_URL=...\n  SUPABASE_SERVICE_KEY=...');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const CHELAKOT = ['OC', 'YD', 'EH', 'CM'];
const BATCH_SIZE = 500;

const SA_SOURCE = { id: 'sa', name: 'Shulchan Aruch', hebrew: 'שולחן ערוך' };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function upsertBatch(table, rows) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'chelek_id,siman,seif,source_id' });
  if (error) throw new Error(`${table} upsert failed: ${error.message}`);
}

async function upsertSimanMeta(rows) {
  const { error } = await supabase.from('simanim').upsert(rows, { onConflict: 'chelek_id,siman' });
  if (error) throw new Error(`simanim upsert failed: ${error.message}`);
}

async function migrateSiman(chelekId, simanNum, simanData) {
  const textRows = [];

  // SA seifim
  for (const s of (simanData.sa || [])) {
    if (!s.he && !s.en) continue;
    textRows.push({
      chelek_id: chelekId,
      siman: simanNum,
      seif: s.seif,
      source_id: SA_SOURCE.id,
      source_name: SA_SOURCE.name,
      source_hebrew: SA_SOURCE.hebrew,
      he: s.he || '',
      en: s.en || '',
      ref: s.ref || '',
    });
  }

  // Commentary seifim
  for (const [commId, commData] of Object.entries(simanData.commentaries || {})) {
    for (const [seifStr, seifText] of Object.entries(commData.seifim || {})) {
      if (!seifText.he && !seifText.en) continue;
      textRows.push({
        chelek_id: chelekId,
        siman: simanNum,
        seif: Number(seifStr),
        source_id: commId,
        source_name: commData.name || commId,
        source_hebrew: commData.hebrew || '',
        he: seifText.he || '',
        en: seifText.en || '',
        ref: seifText.ref || '',
      });
    }
  }

  return textRows;
}

async function main() {
  const args = process.argv.slice(2);
  let chelekFilter = null;
  let fromSiman = 1;
  let toSiman = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--chelek') chelekFilter = args[++i]?.toUpperCase();
    if (args[i] === '--from')   fromSiman = Number(args[++i]);
    if (args[i] === '--to')     toSiman   = Number(args[++i]);
  }

  const chelakot = chelekFilter ? [chelekFilter] : CHELAKOT;

  let totalSimanim = 0;
  let totalRows = 0;

  for (const chelekId of chelakot) {
    const dataDir = join(ROOT, 'public', 'data', chelekId);
    if (!existsSync(dataDir)) {
      console.log(`No data directory for ${chelekId}, skipping.`);
      continue;
    }

    const files = readdirSync(dataDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ file: f, num: parseInt(f) }))
      .filter(({ num }) => !isNaN(num) && num >= fromSiman && (!toSiman || num <= toSiman))
      .sort((a, b) => a.num - b.num);

    console.log(`\n=== ${chelekId}: ${files.length} simanim ===`);

    const simanMetaBatch = [];
    let textBatch = [];

    async function flushTextBatch() {
      if (textBatch.length === 0) return;
      for (let i = 0; i < textBatch.length; i += BATCH_SIZE) {
        await upsertBatch('seif_texts', textBatch.slice(i, i + BATCH_SIZE));
        await sleep(50);
      }
      totalRows += textBatch.length;
      textBatch = [];
    }

    for (let i = 0; i < files.length; i++) {
      const { file, num } = files[i];
      const filePath = join(dataDir, file);

      let data;
      try {
        data = JSON.parse(readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.error(`  ✗ Failed to parse ${file}: ${e.message}`);
        continue;
      }

      simanMetaBatch.push({
        chelek_id: chelekId,
        siman: num,
        seif_count: data.seifCount || data.sa?.length || 0,
      });

      const rows = await migrateSiman(chelekId, num, data);
      textBatch.push(...rows);
      totalSimanim++;

      const pct = Math.round(((i + 1) / files.length) * 100);
      process.stdout.write(`\r  ${chelekId} ${num}/${files.length} (${pct}%) — queued ${textBatch.length} rows  `);

      // Flush text batch when it gets large
      if (textBatch.length >= BATCH_SIZE * 4) {
        await flushTextBatch();
      }
    }

    // Flush remaining text rows
    await flushTextBatch();

    // Upsert siman metadata
    for (let i = 0; i < simanMetaBatch.length; i += BATCH_SIZE) {
      await upsertSimanMeta(simanMetaBatch.slice(i, i + BATCH_SIZE));
    }

    console.log(`\n  ✓ ${chelekId} done.`);
  }

  console.log(`\nMigration complete.`);
  console.log(`  Simanim:   ${totalSimanim}`);
  console.log(`  Text rows: ${totalRows}`);
}

main().catch(err => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
