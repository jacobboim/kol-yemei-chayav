import React, { useEffect } from 'react';
import Badge from './Badge';

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function Skeleton({ lines = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 14, borderRadius: 4,
          background: 'linear-gradient(90deg, var(--cream-dark) 25%, var(--cream) 50%, var(--cream-dark) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s ease infinite',
          width: i === lines - 1 ? '60%' : '100%',
        }} />
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

export default function SourceBlock({ source, aiResult, aiLoading, onEnrich, layout }) {
  // Auto-trigger enrichment when block is mounted
  useEffect(() => {
    if (source?.hebrewText && !aiResult && !aiLoading) {
      onEnrich?.(source);
    }
  }, [source?.ref]);

  if (!source) return null;

  const { name, hebrew, colorVar, bgVar, hebrewText, translation: builtTranslation, summary: builtSummary } = source;
  const translation = aiResult?.translation || builtTranslation || null;
  const summary = aiResult?.summary || builtSummary || null;

  if (layout === 'sidebyside') {
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ marginBottom: 8 }}>
          <Badge name={name} hebrew={hebrew} colorVar={colorVar} bgVar={bgVar} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Left: translation & summary */}
          <div style={{ background: 'var(--parchment)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <Section label="Translation">
              {aiLoading && !translation ? <Skeleton lines={3} /> : <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--ink-muted)' }}>{translation || '—'}</p>}
            </Section>
            <Section label="Summary">
              {aiLoading && !summary ? <Skeleton lines={2} /> : <p style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--ink-muted)' }}>{summary || ''}</p>}
            </Section>
          </div>
          {/* Right: Hebrew */}
          <div style={{ background: 'var(--parchment)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <Section label="טקסט">
              <p className="heb-text">{hebrewText}</p>
            </Section>
          </div>
        </div>
      </div>
    );
  }

  // Default: stacked or used inside accordion/tabbed
  return (
    <div>
      <Section label="טקסט עברי">
        <p className="heb-text">{hebrewText}</p>
      </Section>
      <Section label="Translation">
        {aiLoading && !translation ? <Skeleton lines={3} /> : <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--ink-muted)' }}>{translation || '—'}</p>}
      </Section>
      <Section label="Summary">
        {aiLoading && !summary ? <Skeleton lines={2} /> : <p style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--ink-muted)' }}>{summary || ''}</p>}
      </Section>
    </div>
  );
}
