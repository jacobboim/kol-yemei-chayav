#!/usr/bin/env node
/**
 * generate-summaries.js
 *
 * Reads raw siman JSON files (output of fetch-siman.js), sends each source's
 * Hebrew text to Claude via the Anthropic SDK, and writes back an enriched
 * JSON with translations + summaries for every seif × source.
 *
 * Designed to run locally with Claude Code / Anthropic SDK installed.
 *
 * Usage:
 *   node scripts/generate-summaries.js --chelek OC --siman 1
 *   node scripts/generate-summaries.js --chelek OC --range 1-10
 *   node scripts/generate-summaries.js --chelek OC --range 1-10 --force
 *
 * Flags:
 *   --force   Re-generate even if enrichment already exists in the file
 *
 * Or instruct Claude Code directly:
 *   "Generate summaries for OC simanim 1–5"
 *   → node scripts/generate-summaries.js --chelek OC --range 1-5
 *
 * Requirements:
 *   npm install @anthropic-ai/sdk
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   (or use Claude Code which injects the key automatically)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const client = new Anthropic();

// ── Prompt ───────────────────────────────────────────────────────────────────

// Used for commentaries (needs translation + summary)
const SYSTEM_PROMPT = `You are a scholar of halacha helping learners understand the Shulchan Aruch and its classic commentaries.

Given a Hebrew halachic text, return ONLY a valid JSON object with no preamble, no markdown fences, no extra text:

{
  "translation": "A clear, faithful English translation of the full Hebrew text",
  "summary": "2–4 sentences explaining: (1) what this source holds or rules, (2) what it adds to or emphasizes beyond the base SA, (3) any dispute or nuance it raises"
}

Rules:
- Keep divine names in Hebrew (ה׳, אלקים, שכינה etc.) — never translate them
- Keep core halachic terms in Hebrew with a brief English gloss on first use (e.g. kavvanah (intention))
- Be scholarly but accessible — a learned layperson should understand the summary
- The translation should be complete and faithful, not paraphrased
- The summary should explain the source's unique contribution, not just restate the translation`;

// Used for SA seifim — Sefaria already provides English, so only generate a summary
const SA_SYSTEM_PROMPT = `You are a scholar of halacha helping learners understand the Shulchan Aruch.

Given a Hebrew text from the Shulchan Aruch, return ONLY a valid JSON object with no preamble, no markdown fences, no extra text:

{
  "translation": "",
  "summary": "2–3 sentences explaining what this halacha rules and any key practical details a learner should know"
}

Rules:
- Keep divine names and halachic terms in Hebrew
- Be concise and practical — focus on what this seif rules`;

// ── Core enrichment function ─────────────────────────────────────────────────

async function enrichSource({ sourceId, sourceName, hebrewText, siman, seif, chelekId }) {
  const prompt = `Chelek: ${chelekId} | Siman: ${siman} | Se'if: ${seif}
Source: ${sourceName}

Hebrew text:
${hebrewText}`;

  const message = await client.messages.create({
    model: 'claude-opus-4-6',      // use best local model for quality
    max_tokens: 800,
    system: sourceId === 'sa' ? SA_SYSTEM_PROMPT : SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content?.find(b => b.type === 'text')?.text || '';

  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    // If JSON parse fails, salvage what we can
    return { translation: '', summary: raw.trim() };
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Process one siman file ───────────────────────────────────────────────────

async function processSiman(chelekId, simanNum, force = false) {
  const filePath = join(ROOT, 'public', 'data', chelekId, `${simanNum}.json`);

  if (!existsSync(filePath)) {
    console.error(`  File not found: ${filePath}`);
    console.error(`  Run fetch-siman.js first: node scripts/fetch-siman.js --chelek ${chelekId} --siman ${simanNum}`);
    return;
  }

  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  const enriched = raw.enriched || {};

  console.log(`\nEnriching ${chelekId} siman ${simanNum} (${raw.seifCount} seifim)…`);

  let changed = false;

  // Process SA seifim
  for (const seifData of raw.sa) {
    const key = `sa:${seifData.seif}`;
    if (!force && enriched[key]) {
      process.stdout.write(`  [skip] SA seif ${seifData.seif} (already enriched)\n`);
      continue;
    }
    if (!seifData.he) continue;

    process.stdout.write(`  Enriching SA seif ${seifData.seif}… `);
    try {
      const result = await enrichSource({
        sourceId: 'sa',
        sourceName: 'Shulchan Aruch',
        hebrewText: seifData.he,
        siman: simanNum,
        seif: seifData.seif,
        chelekId,
      });
      enriched[key] = result;
      changed = true;
      process.stdout.write('✓\n');
      await sleep(400);
    } catch (err) {
      process.stdout.write(`✗ ${err.message}\n`);
    }
  }

  // Process each commentary
  for (const [commId, commData] of Object.entries(raw.commentaries)) {
    console.log(`  Enriching ${commData.name}…`);
    for (const [seif, seifText] of Object.entries(commData.seifim)) {
      const key = `${commId}:${seif}`;
      if (!force && enriched[key]) {
        process.stdout.write(`    [skip] seif ${seif} (already enriched)\n`);
        continue;
      }
      if (!seifText.he) continue;

      process.stdout.write(`    seif ${seif}… `);
      try {
        const result = await enrichSource({
          sourceId: commId,
          sourceName: commData.name,
          hebrewText: seifText.he,
          siman: simanNum,
          seif: Number(seif),
          chelekId,
        });
        enriched[key] = result;
        changed = true;
        process.stdout.write('✓\n');
        await sleep(350);
      } catch (err) {
        process.stdout.write(`✗ ${err.message}\n`);
      }
    }
  }

  if (changed) {
    raw.enriched = enriched;
    raw.enrichedAt = new Date().toISOString();
    writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf8');
    console.log(`  ✓ Saved enriched JSON`);
  } else {
    console.log(`  No changes (use --force to re-generate)`);
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  let chelekId = 'OC';
  const simanimToProcess = [];
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--chelek')  chelekId = args[++i]?.toUpperCase();
    if (args[i] === '--siman')   simanimToProcess.push(Number(args[++i]));
    if (args[i] === '--range') {
      const [from, to] = args[++i].split('-').map(Number);
      for (let s = from; s <= to; s++) simanimToProcess.push(s);
    }
    if (args[i] === '--force') force = true;
  }

  if (simanimToProcess.length === 0) {
    console.error('No simanim specified. Use --siman 1 or --range 1-10');
    process.exit(1);
  }

  console.log(`Generating summaries for ${chelekId}: simanim ${simanimToProcess.join(', ')}${force ? ' (force)' : ''}`);

  for (const siman of simanimToProcess) {
    try {
      await processSiman(chelekId, siman, force);
      await sleep(600);
    } catch (err) {
      console.error(`  Error processing siman ${siman}:`, err.message);
    }
  }

  console.log('\nDone. Run `npm run dev` and the app will use the pre-generated data.');
}

main();
