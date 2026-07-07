import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const STORAGE_KEY = 'shulchan_aruch_progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function defaultChelek() {
  return { currentSiman: 1, currentSeifPair: 1, completed: {} };
}

// Merge local + remote: take the furthest position, union all completed seifim
function mergeProgress(local, remote) {
  const useRemote =
    remote.currentSiman > local.currentSiman ||
    (remote.currentSiman === local.currentSiman && remote.currentSeifPair > local.currentSeifPair);

  const base = useRemote ? remote : local;
  const other = useRemote ? local : remote;

  const completed = { ...other.completed };
  for (const [siman, seifim] of Object.entries(base.completed)) {
    completed[siman] = Array.from(new Set([...(completed[siman] || []), ...seifim]));
  }

  return { ...base, completed };
}

async function loadFromSupabase(userId, chelekId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('progress')
    .select('current_siman, current_seif_pair, completed')
    .eq('user_id', userId)
    .eq('chelek_id', chelekId)
    .single();
  if (error || !data) return null;
  return {
    currentSiman: data.current_siman,
    currentSeifPair: data.current_seif_pair,
    completed: data.completed,
  };
}

async function saveToSupabase(userId, chelekId, chelekProgress) {
  if (!supabase) return;
  await supabase.from('progress').upsert({
    user_id: userId,
    chelek_id: chelekId,
    current_siman: chelekProgress.currentSiman,
    current_seif_pair: chelekProgress.currentSeifPair,
    completed: chelekProgress.completed,
  }, { onConflict: 'user_id,chelek_id' });
}

// progress shape: { [chelekId]: { currentSiman, currentSeifPair, completed: { [siman]: [seif,...] } } }
export function useProgress(chelekId, simanCount, userId) {
  const [progress, setProgress] = useState(loadProgress);
  const syncTimer = useRef(null);

  // When user logs in, pull from Supabase and merge with local
  useEffect(() => {
    if (!userId || !chelekId) return;
    loadFromSupabase(userId, chelekId).then(remote => {
      if (!remote) return;
      setProgress(prev => {
        const local = prev[chelekId] || defaultChelek();
        const merged = mergeProgress(local, remote);
        const next = { ...prev, [chelekId]: merged };
        saveProgress(next);
        return next;
      });
    });
  }, [userId, chelekId]);

  const chelekProgress = progress[chelekId] || defaultChelek();

  function update(fn) {
    setProgress(prev => {
      const next = { ...prev, [chelekId]: fn(prev[chelekId] || defaultChelek()) };
      saveProgress(next);
      if (userId) {
        clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
          saveToSupabase(userId, chelekId, next[chelekId]);
        }, 1500);
      }
      return next;
    });
  }

  function markSeifsDone(siman, seifA, seifB) {
    update(cp => {
      const completed = { ...cp.completed };
      if (!completed[siman]) completed[siman] = [];
      if (!completed[siman].includes(seifA)) completed[siman].push(seifA);
      if (!completed[siman].includes(seifB)) completed[siman].push(seifB);
      return { ...cp, completed };
    });
  }

  function goToSiman(siman, seifPair) {
    update(cp => ({ ...cp, currentSiman: siman, currentSeifPair: seifPair || 1 }));
  }

  function isSeifDone(siman, seif) {
    return !!(chelekProgress.completed[siman]?.includes(seif));
  }

  const totalDone = Object.values(chelekProgress.completed).reduce((sum, arr) => sum + arr.length, 0);

  return {
    currentSiman: chelekProgress.currentSiman,
    currentSeifPair: chelekProgress.currentSeifPair,
    completed: chelekProgress.completed,
    markSeifsDone,
    goToSiman,
    isSeifDone,
    totalDone,
  };
}
