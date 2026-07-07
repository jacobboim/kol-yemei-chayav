import React, { useState } from 'react';
import { CHELAKOT, LAYOUT_OPTIONS } from '../constants';
import { useDailyTexts } from '../useSefaria';
import { useAiEnrichment } from '../useClaude';
import { useProgress } from '../useProgress';
import SeifPanel from './SeifPanel';
import CalendarView from './CalendarView';
import AuthPanel from './AuthPanel';

function NavButton({ children, onClick, active, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '6px 14px', borderRadius: 'var(--radius-sm)',
      border: `0.5px solid ${active ? 'var(--gold-border)' : 'var(--border-strong)'}`,
      background: active ? 'var(--gold-light)' : 'var(--parchment)',
      color: active ? 'var(--gold)' : 'var(--ink-muted)',
      fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: active ? 500 : 400,
      opacity: disabled ? 0.4 : 1,
    }}>{children}</button>
  );
}

export default function DailyReader({ user, onSignIn, onSignUp, onSignOut }) {
  const [chelekId, setChelekId] = useState('OC');
  const [layout, setLayout] = useState('accordion');
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const chelek = CHELAKOT.find(c => c.id === chelekId);
  const { currentSiman, currentSeifPair, completed, markSeifsDone, goToSiman, totalDone } = useProgress(chelekId, chelek.simanCount, user?.id);

  const seifA = currentSeifPair;
  const seifB = currentSeifPair + 1;

  const { data, loading, error, reload } = useDailyTexts(chelekId, chelek.sefaria, currentSiman, seifA, seifB);
  const { results: aiResults, loading: aiLoading, enrich } = useAiEnrichment();

  function advance() {
    markSeifsDone(currentSiman, seifA, seifB);
    goToSiman(currentSiman, currentSeifPair + 2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prevSiman() {
    if (currentSiman > 1) goToSiman(currentSiman - 1, 1);
  }

  const seifAData = data?.[seifA];
  const seifBData = data?.[seifB];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Top bar */}
      <div style={{
        background: 'var(--parchment)', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>שלחן ערוך</span>
              <span style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>Daily Learning</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <NavButton onClick={() => setShowCalendar(c => !c)} active={showCalendar}>📅 Progress</NavButton>
              <NavButton onClick={() => setShowSettings(s => !s)} active={showSettings}>⚙️ Settings</NavButton>
              <NavButton onClick={() => setShowAuth(a => !a)} active={showAuth}>
                {user ? '👤 ' + user.email.split('@')[0] : 'Sign in'}
              </NavButton>
            </div>
          </div>

          {/* Chelek tabs */}
          <div style={{ display: 'flex', gap: 4, paddingBottom: 10, overflowX: 'auto' }}>
            {CHELAKOT.map(c => (
              <button key={c.id} onClick={() => setChelekId(c.id)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, border: '0.5px solid transparent',
                background: chelekId === c.id ? 'var(--gold-light)' : 'transparent',
                color: chelekId === c.id ? 'var(--gold)' : 'var(--ink-muted)',
                cursor: 'pointer', fontWeight: chelekId === c.id ? 500 : 400,
                borderColor: chelekId === c.id ? 'var(--gold-border)' : 'transparent',
                whiteSpace: 'nowrap',
              }}>
                <span style={{ fontFamily: "'Frank Ruhl Libre', serif", marginRight: 5 }}>{c.label}</span>
                <span style={{ fontSize: 11 }}>{c.english}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '1.5rem 1.25rem' }}>

        {/* Auth panel */}
        {showAuth && (
          <div style={{ background: 'var(--parchment)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem' }}>
            <AuthPanel
              user={user}
              onSignIn={onSignIn}
              onSignUp={onSignUp}
              onSignOut={onSignOut}
              onClose={() => setShowAuth(false)}
            />
          </div>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div style={{ background: 'var(--parchment)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Display settings</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--ink-muted)', minWidth: 60 }}>Layout</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {LAYOUT_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setLayout(opt.id)} style={{
                    padding: '5px 13px', borderRadius: 20, fontSize: 12,
                    border: `0.5px solid ${layout === opt.id ? 'var(--gold-border)' : 'var(--border-strong)'}`,
                    background: layout === opt.id ? 'var(--gold-light)' : 'var(--cream)',
                    color: layout === opt.id ? 'var(--gold)' : 'var(--ink-muted)',
                    cursor: 'pointer', fontWeight: layout === opt.id ? 500 : 400,
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Calendar / progress panel */}
        {showCalendar && (
          <div style={{ background: 'var(--parchment)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Progress — {chelek.english}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{totalDone} se'ifim completed</div>
            </div>
            <CalendarView
              simanCount={chelek.simanCount}
              completed={completed}
              currentSiman={currentSiman}
              chelekLabel={chelek.label}
              onSelectSiman={(s) => { goToSiman(s, 1); setShowCalendar(false); }}
            />
          </div>
        )}

        {/* Siman navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <h1 style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>
                סימן {currentSiman}
              </h1>
              <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>· {chelek.english}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 2 }}>
              סעיפים {seifA}–{seifB} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <NavButton onClick={prevSiman} disabled={currentSiman <= 1}>← Prev Siman</NavButton>
            <NavButton onClick={advance}>Next 2 se'ifim →</NavButton>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-faint)', fontSize: 15 }}>
            <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 22, marginBottom: 8 }}>טוען...</div>
            Loading text from Sefaria...
          </div>
        )}

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fcc', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 500, color: '#c00', marginBottom: 4 }}>Could not load text</div>
            <div style={{ fontSize: 13, color: '#800' }}>{error}</div>
            <button onClick={reload} style={{ marginTop: 10, fontSize: 13, padding: '5px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #fcc', background: 'white', cursor: 'pointer', color: '#c00' }}>Retry</button>
          </div>
        )}

        {/* Seif A */}
        {!loading && seifAData && (
          <div style={{ marginBottom: '2rem' }}>
            <SeifPanel
              seifNum={seifA} siman={currentSiman}
              saSource={seifAData.sa}
              commentaries={seifAData.commentaries}
              aiResults={aiResults} aiLoading={aiLoading}
              onEnrich={enrich} layout={layout}
            />
          </div>
        )}

        {/* Divider */}
        {!loading && seifAData && seifBData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border-strong)' }} />
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>סעיף שני</div>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border-strong)' }} />
          </div>
        )}

        {/* Seif B */}
        {!loading && seifBData && (
          <div style={{ marginBottom: '2rem' }}>
            <SeifPanel
              seifNum={seifB} siman={currentSiman}
              saSource={seifBData.sa}
              commentaries={seifBData.commentaries}
              aiResults={aiResults} aiLoading={aiLoading}
              onEnrich={enrich} layout={layout}
            />
          </div>
        )}

        {/* Advance button */}
        {!loading && data && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '0.5px solid var(--border)' }}>
            <button onClick={advance} style={{
              padding: '9px 20px', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 500,
              background: 'var(--gold-light)', border: '1px solid var(--gold-border)', color: 'var(--gold)', cursor: 'pointer',
            }}>
              Next 2 se'ifim →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
