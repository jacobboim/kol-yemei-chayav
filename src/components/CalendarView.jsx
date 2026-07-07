import React, { useState } from 'react';

// Show a grid of simans with progress status
export default function CalendarView({ simanCount, completed, currentSiman, onSelectSiman, chelekLabel }) {
  const [page, setPage] = useState(Math.ceil(currentSiman / 50) - 1);
  const perPage = 50;
  const totalPages = Math.ceil(simanCount / perPage);
  const start = page * perPage + 1;
  const end = Math.min(start + perPage - 1, simanCount);
  const simans = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  function getStatus(s) {
    const done = completed[s] || [];
    if (done.length === 0) return 'none';
    return 'partial'; // we don't track total seif count per siman easily, so partial = any done
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{chelekLabel} — סימנים {start}–{end} of {simanCount}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border-strong)', background: 'var(--cream)', fontSize: 13, cursor: 'pointer', color: 'var(--ink-muted)' }}>
            ← Prev
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border-strong)', background: 'var(--cream)', fontSize: 13, cursor: 'pointer', color: 'var(--ink-muted)' }}>
            Next →
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 6 }}>
        {simans.map(s => {
          const status = getStatus(s);
          const isCurrent = s === currentSiman;
          return (
            <button key={s} onClick={() => onSelectSiman(s)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)',
                border: isCurrent ? '2px solid #b8860b' : status === 'partial' ? '1px solid #2f7d50' : '0.5px solid var(--border)',
                background: isCurrent ? '#fff1c7' : status === 'partial' ? '#dff3e6' : 'var(--parchment)',
                fontSize: 11, fontWeight: isCurrent ? 600 : 400,
                color: isCurrent ? '#8b6914' : status === 'partial' ? '#1f6b43' : 'var(--ink-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.1s',
                fontFamily: "'Frank Ruhl Libre', serif",
              }}>
              {s}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 14, fontSize: 11, color: 'var(--ink-faint)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#dff3e6', border: '1px solid #2f7d50', display: 'inline-block' }} /> Learned
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#fff1c7', border: '1px solid #b8860b', display: 'inline-block' }} /> Today
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--parchment)', border: '0.5px solid var(--border)', display: 'inline-block' }} /> Not yet
        </span>
      </div>
    </div>
  );
}
