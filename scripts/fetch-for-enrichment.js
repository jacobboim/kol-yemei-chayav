#!/usr/bin/env node
/**
 * fetch-for-enrichment.js
 *
 * Fetches a siman's Hebrew text from Supabase and prints it as JSON.
 * Claude Code reads the output, writes translations/summaries, then
 * save-enrichment.js writes them back to Supabase.
 *
 * Usage:
 *   node scripts/fetch-for-enrichment.js --chelek OC --siman 2
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

const args = process.argv.slice(2);
let chelekId = null, simanNum = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--chelek') chelekId = args[++i]?.toUpperCase();
  if (args[i] === '--siman')  simanNum = Number(args[++i]);
}

if (!chelekId || !simanNum) {
  console.error('Usage: node scripts/fetch-for-enrichment.js --chelek OC --siman 2');
  process.exit(1);
}

const { data: rows, error } = await supabase
  .from('seif_texts')
  .select('seif, source_id, source_name, source_hebrew, he, en, summary')
  .eq('chelek_id', chelekId)
  .eq('siman', simanNum)
  .order('seif');

if (error) { console.error('Supabase error:', error.message); process.exit(1); }
if (!rows?.length) { console.error('No rows found.'); process.exit(1); }

// Group by seif for easier reading
const bySeif = {};
for (const row of rows) {
  (bySeif[row.seif] ??= {})[row.source_id] = {
    source_name: row.source_name,
    source_hebrew: row.source_hebrew,
    he: row.he,
    has_en: !!(row.en),
    has_summary: !!(row.summary),
  };
}

console.log(JSON.stringify({ chelek: chelekId, siman: simanNum, seifim: bySeif }, null, 2));
