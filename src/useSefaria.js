/**
 * useSefaria.js
 *
 * Reads pre-generated JSON from /public/data/{chelekId}/{siman}.json
 * No Sefaria API calls at runtime — all data is fetched and enriched
 * locally via scripts/fetch-siman.js + scripts/generate-summaries.js
 */
import { useState, useEffect } from 'react';

const cache = {};

export async function loadSimanData(chelekId, siman) {
  const key = `${chelekId}/${siman}`;
  if (cache[key]) return cache[key];

  const res = await fetch(`/data/${chelekId}/${siman}.json`);
  if (!res.ok) throw new Error(`No data for ${chelekId} siman ${siman}. Run: node scripts/fetch-siman.js --chelek ${chelekId} --siman ${siman}`);

  const data = await res.json();
  cache[key] = data;
  return data;
}

/**
 * Returns seif data in the shape the components expect:
 * { sa: sourceObj, commentaries: [sourceObj, ...] }
 *
 * sourceObj: { id, name, hebrew, colorVar, bgVar, ref, hebrewText, translation, summary }
 */
export function useSimanData(chelekId, siman) {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chelekId || !siman) return;
    setLoading(true);
    setError(null);
    setRaw(null);

    loadSimanData(chelekId, siman)
      .then(setRaw)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [chelekId, siman]);

  return { raw, loading, error };
}

/** Build per-seif data objects for the UI from raw JSON */
export function buildSeifSources(raw, seifNum) {
  if (!raw) return { sa: null, commentaries: [] };

  const saSeif = raw.sa?.find(s => s.seif === seifNum);
  const enrichKey = (id) => `${id}:${seifNum}`;

  const sa = saSeif ? {
    id: 'sa',
    name: 'Shulchan Aruch',
    hebrew: 'שולחן ערוך',
    colorVar: '--badge-sa',
    bgVar: '--badge-sa-bg',
    ref: saSeif.ref,
    hebrewText: saSeif.he,
    translation: saSeif.en || '',
    summary: raw.enriched?.[enrichKey('sa')]?.summary || '',
  } : null;

  const commentaries = Object.entries(raw.commentaries || {})
    .map(([commId, commData]) => {
      const seifText = commData.seifim?.[seifNum] || commData.seifim?.[String(seifNum)];
      if (!seifText) return null;
      const enrichment = raw.enriched?.[enrichKey(commId)] || {};
      return {
        id: commId,
        name: commData.name,
        hebrew: commData.hebrew,
        colorVar: `--badge-${commId.replace('_', '-')}`,
        bgVar: `--badge-${commId.replace('_', '-')}-bg`,
        ref: seifText.ref,
        hebrewText: seifText.he,
        translation: enrichment.translation || seifText.en || '',
        summary: enrichment.summary || '',
      };
    })
    .filter(Boolean);

  return { sa, commentaries };
}

/**
 * Composite hook used by DailyReader.
 * Returns { data, loading, error, reload } where data is keyed by seif number.
 */
export function useDailyTexts(chelekId, _sefariaTitle, siman, seifA, seifB) {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!chelekId || !siman) return;
    setLoading(true);
    setError(null);
    setRaw(null);

    loadSimanData(chelekId, siman)
      .then(setRaw)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [chelekId, siman, tick]);

  const data = raw
    ? {
        [seifA]: buildSeifSources(raw, seifA),
        [seifB]: buildSeifSources(raw, seifB),
      }
    : null;

  return { data, loading, error, reload: () => setTick(t => t + 1) };
}
