import React, { useState } from 'react';

export default function CalendarView({ simanCount, doneSiman, currentSiman, onSelectSiman, chelekLabel }) {
  const [page, setPage] = useState(Math.ceil(currentSiman / 50) - 1);
  const perPage = 50;
  const totalPages = Math.ceil(simanCount / perPage);
  const start = page * perPage + 1;
  const end = Math.min(start + perPage - 1, simanCount);
  const simans = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  function isDone(s) {
    return doneSiman[s] === true;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
          {chelekLabel} — סימנים {start}–{end} of {simanCount}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border-strong)', background: 'var(--cream)', fontSize: 13, cursor: 'pointer', color: 'var(--ink-muted)' }}
          >
            ← Prev
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border-strong)', background: 'var(--cream)', fontSize: 13, cursor: 'pointer', color: 'var(--ink-muted)' }}
          >
            Next →
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 6 }}>
        {simans.map(s => {
          const done = isDone(s);
          const isCurrent = s === currentSiman;
          return (
            <button
              key={s}
              onClick={() => onSelectSiman(s)}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: 'var(--radius-sm)',
                border: isCurrent
                  ? '2px solid #b8860b'
                  : done
                    ? '1px solid #2f7d50'
                    : '0.5px solid var(--border)',
                background: isCurrent
                  ? '#fff1c7'
                  : done
                    ? '#dff3e6'
                    : 'var(--parchment)',
                fontSize: done && !isCurrent ? 10 : 11,
                fontWeight: isCurrent ? 600 : done ? 500 : 400,
                color: isCurrent
                  ? '#8b6914'
                  : done
                    ? '#1f6b43'
                    : 'var(--ink-muted)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                transition: 'all 0.1s',
                fontFamily: "'Frank Ruhl Libre', serif",
              }}
            >
              {s}
              {done && !isCurrent && (
                <span style={{ fontSize: 8, lineHeight: 1, color: '#2f7d50' }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 14, fontSize: 11, color: 'var(--ink-faint)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#dff3e6', border: '1px solid #2f7d50', display: 'inline-block' }} />
          Done
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#fff1c7', border: '1px solid #b8860b', display: 'inline-block' }} />
          Current
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--parchment)', border: '0.5px solid var(--border)', display: 'inline-block' }} />
          Not yet
        </span>
      </div>
    </div>
  );
}
