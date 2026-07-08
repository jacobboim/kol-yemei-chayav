#!/usr/bin/env node
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

const { count: simanCount } = await supabase.from('simanim').select('*', { count: 'exact', head: true });
const { count: seifCount }  = await supabase.from('seif_texts').select('*', { count: 'exact', head: true });

console.log(`simanim rows:    ${simanCount}`);
console.log(`seif_texts rows: ${seifCount}`);

// Spot-check: fetch OC 1, seif 1 SA text
const { data } = await supabase
  .from('seif_texts')
  .select('he, source_id')
  .eq('chelek_id', 'OC').eq('siman', 1).eq('seif', 1)
  .limit(3);

console.log('\nOC 1:1 sample rows:');
for (const row of (data || [])) {
  console.log(`  [${row.source_id}] ${row.he?.slice(0, 80)}…`);
}
