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
  return { currentSiman: 1, currentSeifPair: 1, completed: {}, updatedAt: 0 };
}

async function loadFromSupabase(userId, chelekId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('progress')
    .select('current_siman, current_seif_pair, completed, updated_at')
    .eq('user_id', userId)
    .eq('chelek_id', chelekId)
    .single();
  if (error || !data) return null;
  return {
    currentSiman: data.current_siman,
    currentSeifPair: data.current_seif_pair,
    completed: data.completed,
    updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : 0,
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

  // When user logs in, pull from Supabase and use last-write-wins
  useEffect(() => {
    if (!userId || !chelekId) return;
    loadFromSupabase(userId, chelekId).then(remote => {
      setProgress(prev => {
        const local = prev[chelekId] || defaultChelek();
        if (!remote) {
          // No remote record yet — push local up to Supabase
          saveToSupabase(userId, chelekId, local);
          return prev;
        }
        if ((local.updatedAt || 0) > (remote.updatedAt || 0)) {
          // Local is newer (e.g. user unchecked before debounce saved) — push it up
          saveToSupabase(userId, chelekId, local);
          return prev;
        }
        // Remote is newer or same age — use it as source of truth
        const next = { ...prev, [chelekId]: remote };
        saveProgress(next);
        return next;
      });
    });
  }, [userId, chelekId]);

  const chelekProgress = progress[chelekId] || defaultChelek();

  function update(fn) {
    setProgress(prev => {
      const updated = { ...fn(prev[chelekId] || defaultChelek()), updatedAt: Date.now() };
      const next = { ...prev, [chelekId]: updated };
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

  function markSeifsDone(siman, ...seifs) {
    update(cp => {
      const completed = { ...cp.completed };
      if (!completed[siman]) completed[siman] = [];

      const validSeifs = seifs.filter(
        (seif) => Number.isInteger(seif) && seif > 0,
      );
      for (const seif of validSeifs) {
        if (!completed[siman].includes(seif)) completed[siman].push(seif);
      }

      return { ...cp, completed };
    });
  }

  function setSeifsDone(siman, seifs, done) {
    update(cp => {
      const completed = { ...cp.completed };
      if (!completed[siman]) completed[siman] = [];

      const validSeifs = (seifs || []).filter(
        (seif) => Number.isInteger(seif) && seif > 0,
      );

      if (done) {
        for (const seif of validSeifs) {
          if (!completed[siman].includes(seif)) completed[siman].push(seif);
        }
      } else {
        completed[siman] = completed[siman].filter(
          (seif) => !validSeifs.includes(seif),
        );
      }

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
    setSeifsDone,
    goToSiman,
    isSeifDone,
    totalDone,
  };
}
