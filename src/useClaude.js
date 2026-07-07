import { useState, useCallback } from 'react';

const aiCache = {};

async function callClaude(systemPrompt, userPrompt) {
  const key = userPrompt.slice(0, 120);
  if (aiCache[key]) return aiCache[key];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error ${res.status}`);
  const data = await res.json();
  const text = data.content?.find(b => b.type === 'text')?.text || '';
  aiCache[key] = text;
  return text;
}

const SYSTEM = `You are a scholar of halacha helping learners understand the Shulchan Aruch and its classic commentaries.

When given a Hebrew halachic text, respond with a JSON object (no markdown, no preamble) with exactly these fields:
{
  "translation": "A clear, faithful English translation of the Hebrew text",
  "summary": "A 2-4 sentence summary explaining what this source holds, what it is adding or emphasizing, and how it relates to the practical halacha"
}

Keep divine names in Hebrew (ה׳, אלקים etc). Keep technical halachic terms in Hebrew with a brief English gloss on first use. Be scholarly but accessible.`;

export function useAiEnrichment() {
  const [results, setResults] = useState({}); // keyed by ref
  const [loading, setLoading] = useState({});

  const enrich = useCallback(async (source) => {
    const { ref, hebrewText, name } = source;
    if (!hebrewText || results[ref]) return;

    setLoading(prev => ({ ...prev, [ref]: true }));
    try {
      const prompt = `Source: ${name}\n\nHebrew text:\n${hebrewText}`;
      const raw = await callClaude(SYSTEM, prompt);
      let parsed;
      try {
        parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      } catch {
        parsed = { translation: '', summary: raw };
      }
      setResults(prev => ({ ...prev, [ref]: parsed }));
    } catch (e) {
      setResults(prev => ({ ...prev, [ref]: { translation: '', summary: `Could not load AI summary: ${e.message}` } }));
    } finally {
      setLoading(prev => ({ ...prev, [ref]: false }));
    }
  }, [results]);

  return { results, loading, enrich };
}
