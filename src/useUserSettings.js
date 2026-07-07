import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

const STORAGE_KEY = 'shulchan_aruch_user_settings';
const DEFAULT_SETTINGS = {
  layout: 'accordion',
};

function loadLocalSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

async function loadSettingsFromSupabase(userId) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('user_settings')
    .select('layout')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return {
    ...DEFAULT_SETTINGS,
    layout: data.layout || DEFAULT_SETTINGS.layout,
  };
}

async function saveSettingsToSupabase(userId, settings) {
  if (!supabase || !userId) return;

  await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      layout: settings.layout,
    },
    { onConflict: 'user_id' },
  );
}

export function useUserSettings(userId) {
  const [settings, setSettings] = useState(loadLocalSettings);
  const syncTimer = useRef(null);

  useEffect(() => {
    saveLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!userId) return;

    loadSettingsFromSupabase(userId).then((remote) => {
      if (!remote) {
        // First login on this account: push local settings up once.
        saveSettingsToSupabase(userId, settings);
        return;
      }

      setSettings((prev) => {
        const next = { ...prev, ...remote };
        saveLocalSettings(next);
        return next;
      });
    });
  }, [userId]);

  function setLayout(layout) {
    setSettings((prev) => {
      const next = { ...prev, layout };

      if (userId) {
        clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
          saveSettingsToSupabase(userId, next);
        }, 600);
      }

      return next;
    });
  }

  return {
    layout: settings.layout,
    setLayout,
  };
}
