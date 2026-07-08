/**
 * useSefaria.js
 *
 * Loads Shulchan Aruch text from Supabase (seif_texts + simanim tables).
 * Fetches only the 2 seifim currently on screen — not the whole siman.
 * Results are cached in memory so back-navigation is instant.
 */
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

// ── In-memory caches ──────────────────────────────────────────────────────────

// keyed by 'OC/1/1'  →  array of seif_texts rows for that seif
const seifCache = new Map();

// keyed by 'OC/1'  →  seif_count integer
const simanMetaCache = new Map();

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getSimanSeifCount(chelekId, siman) {
  const key = `${chelekId}/${siman}`;
  if (simanMetaCache.has(key)) return simanMetaCache.get(key);

  const { data, error } = await supabase
    .from('simanim')
    .select('seif_count')
    .eq('chelek_id', chelekId)
    .eq('siman', siman)
    .single();

  const count = (!error && data) ? data.seif_count : 0;
  simanMetaCache.set(key, count);
  return count;
}

async function fetchSeifPair(chelekId, siman, seifA, seifB) {
  const seifNums = [seifA, seifB].filter(n => n > 0);
  const uncached = seifNums.filter(n => !seifCache.has(`${chelekId}/${siman}/${n}`));

  if (uncached.length > 0) {
    const { data, error } = await supabase
      .from('seif_texts')
      .select('seif, source_id, source_name, source_hebrew, he, en, summary, ref')
      .eq('chelek_id', chelekId)
      .eq('siman', siman)
      .in('seif', uncached)
      .order('seif');

    if (error) throw new Error(error.message);

    // Group rows by seif and store in cache
    const bySeif = {};
    for (const row of (data || [])) {
      (bySeif[row.seif] ??= []).push(row);
    }
    for (const n of uncached) {
      seifCache.set(`${chelekId}/${siman}/${n}`, bySeif[n] || []);
    }
  }

  return seifNums.reduce((acc, n) => {
    acc[n] = buildSeifSources(seifCache.get(`${chelekId}/${siman}/${n}`) || []);
    return acc;
  }, {});
}

// ── Source object builder ─────────────────────────────────────────────────────

function buildSeifSources(rows) {
  const saRow    = rows.find(r => r.source_id === 'sa');
  const commRows = rows.filter(r => r.source_id !== 'sa');

  const sa = saRow ? {
    id: 'sa',
    name: 'Shulchan Aruch',
    hebrew: 'שולחן ערוך',
    colorVar: '--badge-sa',
    bgVar: '--badge-sa-bg',
    ref: saRow.ref,
    hebrewText: saRow.he,
    translation: saRow.en || '',
    summary: saRow.summary || '',
  } : null;

  const commentaries = commRows.map(row => ({
    id: row.source_id,
    name: row.source_name,
    hebrew: row.source_hebrew,
    colorVar: `--badge-${row.source_id.replace(/_/g, '-')}`,
    bgVar: `--badge-${row.source_id.replace(/_/g, '-')}-bg`,
    ref: row.ref,
    hebrewText: row.he,
    translation: row.en || '',
    summary: row.summary || '',
  }));

  return { sa, commentaries };
}

// ── Public API used by DailyReader ────────────────────────────────────────────

/**
 * Called in advance()/prevPair() to warm the cache for an adjacent siman
 * before navigating to it (so the transition feels instant).
 */
export async function loadSimanData(chelekId, siman) {
  await Promise.all([
    getSimanSeifCount(chelekId, siman),
    fetchSeifPair(chelekId, siman, 1, 2),
  ]);
}

/**
 * Primary hook used by DailyReader.
 * Returns the same shape as before so the rest of the UI is unchanged.
 */
export function useDailyTexts(chelekId, _sefariaTitle, siman, seifA, seifB) {
  const [data, setData]               = useState(null);
  const [seifCount, setSeifCount]     = useState(0);
  const [loadedSiman, setLoadedSiman] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [tick, setTick]               = useState(0);

  useEffect(() => {
    if (!chelekId || !siman || !supabase) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      getSimanSeifCount(chelekId, siman),
      fetchSeifPair(chelekId, siman, seifA, seifB),
    ])
      .then(([count, pairData]) => {
        if (cancelled) return;
        setSeifCount(count);
        setData(pairData);
        setLoadedSiman(siman);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [chelekId, siman, seifA, seifB, tick]);

  return {
    data,
    seifCount,
    loadedSiman,
    loading,
    error,
    reload: () => setTick(t => t + 1),
  };
}
