#!/usr/bin/env node
/**
 * save-enrichment.js
 *
 * Reads enrichment JSON from a file and upserts en + summary into seif_texts.
 *
 * Expected input file format:
 * {
 *   "chelek": "OC",
 *   "siman": 2,
 *   "seifim": {
 *     "1": {
 *       "sa":  { "en": "...", "summary": "..." },
 *       "mb":  { "en": "...", "summary": "..." },
 *       "taz": { "en": "...", "summary": "..." }
 *     },
 *     "2": { ... }
 *   }
 * }
 *
 * Usage:
 *   node scripts/save-enrichment.js enrichment.json
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
}
loadEnv();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node scripts/save-enrichment.js <file.json>');
  process.exit(1);
}

const enrichment = JSON.parse(readFileSync(inputFile, 'utf8'));
const { chelek, siman, seifim } = enrichment;

const rows = [];
for (const [seifStr, sources] of Object.entries(seifim)) {
  for (const [sourceId, content] of Object.entries(sources)) {
    if (!content.en && !content.summary) continue;
    rows.push({
      chelek_id: chelek,
      siman,
      seif: Number(seifStr),
      source_id: sourceId,
      en: content.en || '',
      summary: content.summary || '',
    });
  }
}

console.log(`Upserting ${rows.length} rows for ${chelek} siman ${siman}…`);

const { error } = await supabase
  .from('seif_texts')
  .upsert(rows, { onConflict: 'chelek_id,siman,seif,source_id' });

if (error) { console.error('Upsert failed:', error.message); process.exit(1); }

console.log(`Done. ${rows.length} rows updated.`);
