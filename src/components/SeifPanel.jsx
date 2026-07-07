import React, { useState } from 'react';
import Badge from './Badge';
import SourceBlock from './SourceBlock';

function AccordionItem({ source, aiResult, aiLoading, onEnrich, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);

  return (
    <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 8 }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) onEnrich?.(source); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.8rem 1rem', background: 'var(--parchment)', border: 'none',
          cursor: 'pointer', gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge name={source.name} hebrew={source.hebrew} colorVar={source.colorVar} bgVar={source.bgVar} small />
        </div>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '1rem', background: 'var(--white)', borderTop: '0.5px solid var(--border)' }}>
          <SourceBlock source={source} aiResult={aiResult} aiLoading={aiLoading} onEnrich={onEnrich} layout="stacked" />
        </div>
      )}
    </div>
  );
}

export default function SeifPanel({ seifNum, saSource, commentaries, aiResults, aiLoading, onEnrich, layout, siman }) {
  const [activeTab, setActiveTab] = useState(saSource?.id || '');
  const allSources = [saSource, ...commentaries].filter(Boolean);

  const renderExpandAll = () => {
    if (layout !== 'accordion') return null;
    return null; // handled per-item
  };

  return (
    <div>
      {/* Seif header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--gold-light)', border: '1px solid var(--gold-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, color: 'var(--gold)',
          fontFamily: "'Frank Ruhl Libre', serif",
        }}>
          {hebrewOrdinal(seifNum)}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>סעיף {hebrewOrdinal(seifNum)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Siman {siman}, Se'if {seifNum}</div>
        </div>
      </div>

      {/* SA text always shown first, full-width */}
      {saSource && layout !== 'sidebyside' && (
        <div style={{ background: 'var(--gold-light)', border: '1px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '1rem 1.1rem', marginBottom: '1rem' }}>
          <div style={{ marginBottom: 8 }}>
            <Badge name={saSource.name} hebrew={saSource.hebrew} colorVar={saSource.colorVar} bgVar={saSource.bgVar} />
          </div>
          <SourceBlock source={saSource} aiResult={aiResults[saSource.ref]} aiLoading={aiLoading[saSource.ref]} onEnrich={onEnrich} layout="stacked" />
        </div>
      )}

      {saSource && layout === 'sidebyside' && (
        <div style={{ background: 'var(--gold-light)', border: '1px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '1rem 1.1rem', marginBottom: '1rem' }}>
          <div style={{ marginBottom: 8 }}>
            <Badge name={saSource.name} hebrew={saSource.hebrew} colorVar={saSource.colorVar} bgVar={saSource.bgVar} />
          </div>
          <SourceBlock source={saSource} aiResult={aiResults[saSource.ref]} aiLoading={aiLoading[saSource.ref]} onEnrich={onEnrich} layout="sidebyside" />
        </div>
      )}

      {/* Commentaries label */}
      {commentaries.length > 0 && (
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10 }}>
          מפרשים · Commentaries ({commentaries.length})
        </div>
      )}

      {commentaries.length === 0 && !saSource && (
        <div style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '1rem 0' }}>No text found for this se'if.</div>
      )}

      {/* Commentaries by layout */}
      {layout === 'accordion' && commentaries.map((c, i) => (
        <AccordionItem key={c.ref || c.id} source={c} aiResult={aiResults[c.ref]} aiLoading={aiLoading[c.ref]} onEnrich={onEnrich} defaultOpen={i === 0} />
      ))}

      {layout === 'stacked' && commentaries.map(c => (
        <div key={c.ref || c.id} style={{ background: 'var(--parchment)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem 1.1rem', marginBottom: 10 }}>
          <div style={{ marginBottom: 8 }}><Badge name={c.name} hebrew={c.hebrew} colorVar={c.colorVar} bgVar={c.bgVar} /></div>
          <SourceBlock source={c} aiResult={aiResults[c.ref]} aiLoading={aiLoading[c.ref]} onEnrich={onEnrich} layout="stacked" />
        </div>
      ))}

      {layout === 'sidebyside' && commentaries.map(c => (
        <div key={c.ref || c.id} style={{ background: 'var(--parchment)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.85rem 1rem', marginBottom: 10 }}>
          <SourceBlock source={c} aiResult={aiResults[c.ref]} aiLoading={aiLoading[c.ref]} onEnrich={onEnrich} layout="sidebyside" />
        </div>
      ))}

      {layout === 'tabbed' && commentaries.length > 0 && (
        <div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {commentaries.map(c => (
              <button key={c.id} onClick={() => { setActiveTab(c.id); onEnrich?.(c); }}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, border: '0.5px solid var(--border-strong)',
                  background: activeTab === c.id ? `var(${c.bgVar})` : 'var(--cream)', cursor: 'pointer',
                  color: activeTab === c.id ? `var(${c.colorVar})` : 'var(--ink-muted)', fontWeight: activeTab === c.id ? 500 : 400,
                }}>
                {c.hebrew}
              </button>
            ))}
          </div>
          {commentaries.filter(c => c.id === activeTab).map(c => (
            <div key={c.ref} style={{ background: 'var(--parchment)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem 1.1rem' }}>
              <div style={{ marginBottom: 8 }}><Badge name={c.name} hebrew={c.hebrew} colorVar={c.colorVar} bgVar={c.bgVar} /></div>
              <SourceBlock source={c} aiResult={aiResults[c.ref]} aiLoading={aiLoading[c.ref]} onEnrich={onEnrich} layout="stacked" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Convert seif number to Hebrew letter
function hebrewOrdinal(n) {
  const letters = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ'];
  return letters[n - 1] || String(n);
}
