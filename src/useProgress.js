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
  return { currentSiman: 1, currentSeifPair: 1, completed: {}, doneSiman: {}, updatedAt: 0 };
}

// Pack doneSiman into completed._done for Supabase storage (no schema change needed)
function packForSupabase(chelekProgress) {
  return {
    ...chelekProgress.completed,
    _done: chelekProgress.doneSiman || {},
  };
}

// Unpack _done out of the completed JSONB field
function unpackFromSupabase(rawCompleted) {
  const { _done, ...seifsDone } = rawCompleted || {};
  return { completed: seifsDone, doneSiman: _done || {} };
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
  const { completed, doneSiman } = unpackFromSupabase(data.completed);
  return {
    currentSiman: data.current_siman,
    currentSeifPair: data.current_seif_pair,
    completed,
    doneSiman,
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
    completed: packForSupabase(chelekProgress),
  }, { onConflict: 'user_id,chelek_id' });
}

export function useProgress(chelekId, simanCount, userId) {
  const [progress, setProgress] = useState(loadProgress);
  const syncTimer = useRef(null);

  useEffect(() => {
    if (!userId || !chelekId) return;
    loadFromSupabase(userId, chelekId).then(remote => {
      setProgress(prev => {
        const local = prev[chelekId] || defaultChelek();
        if (!remote) {
          saveToSupabase(userId, chelekId, local);
          return prev;
        }
        if ((local.updatedAt || 0) > (remote.updatedAt || 0)) {
          saveToSupabase(userId, chelekId, local);
          return prev;
        }
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

  function setSimanDone(siman, done) {
    update(cp => {
      const doneSiman = { ...cp.doneSiman, [siman]: done };
      return { ...cp, doneSiman };
    });
  }

  function goToSiman(siman, seifPair) {
    update(cp => ({ ...cp, currentSiman: siman, currentSeifPair: seifPair || 1 }));
  }

  function isSimanDone(siman) {
    return chelekProgress.doneSiman?.[siman] === true;
  }

  const totalDone = Object.values(chelekProgress.doneSiman || {}).filter(Boolean).length;

  return {
    currentSiman: chelekProgress.currentSiman,
    currentSeifPair: chelekProgress.currentSeifPair,
    doneSiman: chelekProgress.doneSiman || {},
    setSimanDone,
    goToSiman,
    isSimanDone,
    totalDone,
  };
}
