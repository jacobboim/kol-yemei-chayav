#!/usr/bin/env node
/**
 * enrich-supabase.js
 *
 * All-in-one enrichment pipeline:
 *   1. Fetches Hebrew text from Supabase
 *   2. Calls Claude API to generate translations + summaries for empty rows
 *   3. Upserts results back to Supabase
 *
 * Usage:
 *   node scripts/enrich-supabase.js --chelek OC --siman 1
 *   node scripts/enrich-supabase.js --chelek OC --range 1-5
 *   node scripts/enrich-supabase.js --chelek OC --siman 1 --force
 *
 * Flags:
 *   --force   Re-generate even rows that already have en + summary
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

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

const anthropic = new Anthropic();

// ── Prompts ───────────────────────────────────────────────────────────────────

const COMMENTARY_PROMPT = `You are a scholar of halacha helping learners understand the Shulchan Aruch and its classic commentaries.

Given a Hebrew halachic text, return ONLY a valid JSON object with no preamble, no markdown fences, no extra text:

{
  "translation": "A clear, faithful English translation of the full Hebrew text",
  "summary": "2–4 sentences explaining: (1) what this source holds or rules, (2) what it adds to or emphasizes beyond the base SA, (3) any dispute or nuance it raises"
}

Rules:
- Keep divine names in Hebrew (ה׳, אלקים, שכינה etc.) — never translate them
- Keep core halachic terms in Hebrew with a brief English gloss on first use
- Be scholarly but accessible — a learned layperson should understand the summary
- The translation should be complete and faithful, not paraphrased
- The summary should explain the source's unique contribution, not just restate the translation`;

const SA_PROMPT = `You are a scholar of halacha helping learners understand the Shulchan Aruch.

Given a Hebrew text from the Shulchan Aruch, return ONLY a valid JSON object with no preamble, no markdown fences, no extra text:

{
  "summary": "2–3 sentences explaining what this halacha rules and any key practical details a learner should know"
}

Rules:
- Keep divine names and halachic terms in Hebrew
- Be concise and practical — focus on what this seif rules`;

// ── Claude API call ───────────────────────────────────────────────────────────

async function enrich(row) {
  const isSA = row.source_id === 'sa';
  const prompt = `Chelek: ${row.chelek_id} | Siman: ${row.siman} | Se'if: ${row.seif}
Source: ${row.source_name || row.source_id}

Hebrew text:
${row.he}`;

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 800,
    system: isSA ? SA_PROMPT : COMMENTARY_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content?.find(b => b.type === 'text')?.text || '';
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { summary: raw.trim() };
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Process one siman ─────────────────────────────────────────────────────────

async function processSiman(chelekId, simanNum, force) {
  console.log(`\n── ${chelekId} siman ${simanNum} ──────────────────────`);

  const { data: rows, error } = await supabase
    .from('seif_texts')
    .select('chelek_id, siman, seif, source_id, source_name, he, en, summary')
    .eq('chelek_id', chelekId)
    .eq('siman', simanNum)
    .order('seif');

  if (error) { console.error('  Fetch error:', error.message); return; }
  if (!rows?.length) { console.log('  No rows found — skipping'); return; }

  const toEnrich = rows.filter(r => {
    if (!r.he) return false;
    if (force) return true;
    const isSA = r.source_id === 'sa';
    // SA: only needs summary (en comes from Sefaria migration)
    if (isSA) return !r.summary;
    // Commentaries: need both en and summary
    return !r.en || !r.summary;
  });

  if (toEnrich.length === 0) {
    console.log(`  All ${rows.length} rows already enriched — use --force to redo`);
    return;
  }

  console.log(`  ${rows.length} rows total, ${toEnrich.length} need enrichment`);

  const upsertRows = [];

  for (const row of toEnrich) {
    const label = `${row.source_id} seif ${row.seif}`;
    process.stdout.write(`  ${label}… `);

    try {
      const result = await enrich(row);
      const upsertData = {
        chelek_id: row.chelek_id,
        siman: row.siman,
        seif: row.seif,
        source_id: row.source_id,
        summary: result.summary || '',
      };

      // For SA: preserve existing Sefaria en; for commentaries: use generated translation
      if (row.source_id !== 'sa') {
        upsertData.en = result.translation || '';
      }

      upsertRows.push(upsertData);
      process.stdout.write('✓\n');
      await sleep(350);
    } catch (err) {
      process.stdout.write(`✗ ${err.message}\n`);
    }
  }

  if (upsertRows.length === 0) return;

  process.stdout.write(`  Saving ${upsertRows.length} rows to Supabase… `);
  const { error: upsertError } = await supabase
    .from('seif_texts')
    .upsert(upsertRows, { onConflict: 'chelek_id,siman,seif,source_id' });

  if (upsertError) {
    process.stdout.write(`✗ ${upsertError.message}\n`);
  } else {
    process.stdout.write('✓ saved\n');
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let chelekId = 'OC';
const simanim = [];
let force = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--chelek') chelekId = args[++i]?.toUpperCase();
  if (args[i] === '--siman')  simanim.push(Number(args[++i]));
  if (args[i] === '--range') {
    const [from, to] = args[++i].split('-').map(Number);
    for (let s = from; s <= to; s++) simanim.push(s);
  }
  if (args[i] === '--force') force = true;
}

if (simanim.length === 0) {
  console.error('Usage: node scripts/enrich-supabase.js --chelek OC --siman 1');
  console.error('       node scripts/enrich-supabase.js --chelek OC --range 1-5');
  process.exit(1);
}

console.log(`Enriching ${chelekId} simanim: ${simanim.join(', ')}${force ? ' (force)' : ''}`);

for (const siman of simanim) {
  await processSiman(chelekId, siman, force);
  if (simanim.indexOf(siman) < simanim.length - 1) await sleep(500);
}

console.log('\nDone.');
