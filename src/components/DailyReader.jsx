import React, { useEffect, useState } from "react";
import {
  CHELAKOT,
  COLOR_THEMES,
  HEBREW_FONTS,
  LAYOUT_OPTIONS,
} from "../constants";
import { loadSimanData, useDailyTexts } from "../useSefaria";
import { useProgress } from "../useProgress";
import { useUserSettings } from "../useUserSettings";
import SeifPanel from "./SeifPanel";
import CalendarView from "./CalendarView";
import AuthPanel from "./AuthPanel";

function SettingRow({ label, children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 10,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "var(--ink-muted)",
          minWidth: 80,
          paddingTop: 6,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

function SettingChip({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 11px",
        borderRadius: 20,
        fontSize: 12,
        border: `0.5px solid ${active ? "var(--gold-border)" : "var(--border-strong)"}`,
        background: active ? "var(--gold-light)" : "var(--cream)",
        color: active ? "var(--gold)" : "var(--ink-muted)",
        cursor: "pointer",
        fontWeight: active ? 500 : 400,
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{ height: "0.5px", background: "var(--border)", margin: "10px 0" }}
    />
  );
}

function NavButton({ children, onClick, active, disabled, className }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        padding: "6px 14px",
        borderRadius: "var(--radius-sm)",
        border: `0.5px solid ${active ? "var(--gold-border)" : "var(--border-strong)"}`,
        background: active ? "var(--gold-light)" : "var(--parchment)",
        color: active ? "var(--gold)" : "var(--ink-muted)",
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: active ? 500 : 400,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function DailyReader({ user, onSignIn, onSignUp, onSignOut }) {
  const [chelekId, setChelekId] = useState("OC");
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const {
    layout,
    setLayout,
    colorTheme,
    setColorTheme,
    darkMode,
    setDarkMode,
    hebrewFont,
    setHebrewFont,
  } = useUserSettings(user?.id);

  // Apply color theme + dark/light mode to <html>
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      `${colorTheme}-${darkMode ? "dark" : "light"}`,
    );
  }, [colorTheme, darkMode]);

  // Load Hebrew font and apply via CSS custom property
  useEffect(() => {
    const font = HEBREW_FONTS.find((f) => f.id === hebrewFont);
    if (!font) return;

    if (font.url) {
      const linkId = `heb-font-${hebrewFont}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = font.url;
        document.head.appendChild(link);
      }
      document.documentElement.style.setProperty("--heb-font", font.family);
    } else {
      // Frank Ruhl Libre — already loaded in index.css, just clear override
      document.documentElement.style.removeProperty("--heb-font");
    }
  }, [hebrewFont]);

  const chelek = CHELAKOT.find((c) => c.id === chelekId);
  const {
    currentSiman,
    currentSeifPair,
    doneSiman,
    isSimanDone,
    setSimanDone,
    goToSiman,
    totalDone,
  } = useProgress(chelekId, chelek.simanCount, user?.id);

  const seifA = currentSeifPair;
  const seifB = currentSeifPair + 1;

  const { data, loading, error, reload, seifCount, loadedSiman } =
    useDailyTexts(chelekId, chelek.sefaria, currentSiman, seifA, seifB);
  // Only trust seifCount when the loaded data is actually for the current siman.
  // During a siman transition, seifCount still reflects the previous siman until
  // useDailyTexts's effect runs — using stale seifCount would clamp seifPair wrongly.
  const currentSimanSeifCount =
    loadedSiman === currentSiman ? seifCount || 0 : 0;
  const visibleSeifNums = [seifA, seifB].filter(
    (n) => currentSimanSeifCount > 0 && n <= currentSimanSeifCount,
  );
  const atEndOfChelek =
    currentSiman === chelek.simanCount &&
    currentSimanSeifCount > 0 &&
    currentSeifPair >= currentSimanSeifCount;
  const atLastPairOfSiman =
    currentSimanSeifCount > 0 && currentSeifPair + 2 > currentSimanSeifCount;
  const simanDone = isSimanDone(currentSiman);

  function getLastPairStart(count) {
    if (!count || count < 1) return 1;
    return count % 2 === 0 ? count - 1 : count;
  }

  useEffect(() => {
    if (!currentSimanSeifCount) return;
    if (currentSeifPair <= currentSimanSeifCount) return;
    goToSiman(currentSiman, getLastPairStart(currentSimanSeifCount));
  }, [currentSiman, currentSeifPair, currentSimanSeifCount, goToSiman]);

  async function advance() {
    const nextPair = currentSeifPair + 2;
    if (currentSimanSeifCount > 0 && nextPair <= currentSimanSeifCount) {
      goToSiman(currentSiman, nextPair);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (currentSiman < chelek.simanCount) {
      try {
        await loadSimanData(chelekId, currentSiman + 1);
        goToSiman(currentSiman + 1, 1);
      } catch {
        goToSiman(currentSiman + 1, 1);
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function prevPair() {
    if (currentSeifPair > 1) {
      goToSiman(currentSiman, Math.max(1, currentSeifPair - 2));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (currentSiman > 1) {
      try {
        const prevSimanData = await loadSimanData(chelekId, currentSiman - 1);
        goToSiman(currentSiman - 1, getLastPairStart(prevSimanData?.seifCount));
      } catch {
        goToSiman(currentSiman - 1, 1);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function toggleSimanDone() {
    setSimanDone(currentSiman, !simanDone);
  }

  const seifAData = data?.[seifA];
  const seifBData = data?.[seifB];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {/* Top bar */}
      <div
        style={{
          background: "var(--parchment)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 1.25rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 56,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                className="topbar-title"
                style={{
                  fontFamily: "'Frank Ruhl Libre', serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--ink)",
                }}
              >
                Kol Yemei Chayav
              </span>
            </div>
            <div className="topbar-actions" style={{ display: "flex", gap: 8 }}>
              <NavButton
                onClick={() => setShowCalendar((c) => !c)}
                active={showCalendar}
                className="topbar-btn"
              >
                <span>📅</span><span className="btn-label"> Progress</span>
              </NavButton>
              <NavButton
                onClick={() => setShowSettings((s) => !s)}
                active={showSettings}
                className="topbar-btn"
              >
                <span>⚙️</span><span className="btn-label"> Settings</span>
              </NavButton>
              <NavButton
                onClick={() => setShowAuth((a) => !a)}
                active={showAuth}
                className="topbar-btn"
              >
                {user ? (
                  <><span>👤</span><span className="btn-label"> {user.email.split("@")[0]}</span></>
                ) : (
                  <><span>🔑</span><span className="btn-label"> Sign in</span></>
                )}
              </NavButton>
            </div>
          </div>

          {/* Chelek tabs */}
          <div
            style={{
              display: "flex",
              gap: 4,
              paddingBottom: 10,
              overflowX: "auto",
            }}
          >
            {CHELAKOT.map((c) => (
              <button
                key={c.id}
                onClick={() => setChelekId(c.id)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: "0.5px solid transparent",
                  background:
                    chelekId === c.id ? "var(--gold-light)" : "transparent",
                  color: chelekId === c.id ? "var(--gold)" : "var(--ink-muted)",
                  cursor: "pointer",
                  fontWeight: chelekId === c.id ? 500 : 400,
                  borderColor:
                    chelekId === c.id ? "var(--gold-border)" : "transparent",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Frank Ruhl Libre', serif",
                    marginRight: 5,
                  }}
                >
                  {c.label}
                </span>
                <span style={{ fontSize: 11 }}>{c.english}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{ maxWidth: 820, margin: "0 auto", padding: "1.5rem 1.25rem" }}
      >
        {/* Auth panel */}
        {showAuth && (
          <div
            style={{
              background: "var(--parchment)",
              border: "0.5px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              marginBottom: "1.25rem",
            }}
          >
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
          <div
            style={{
              background: "var(--parchment)",
              border: "0.5px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "1.1rem 1.25rem",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>
              Display settings
            </div>

            {/* Layout */}
            <SettingRow label="Layout">
              {LAYOUT_OPTIONS.map((opt) => (
                <SettingChip
                  key={opt.id}
                  active={layout === opt.id}
                  onClick={() => setLayout(opt.id)}
                >
                  {opt.label}
                </SettingChip>
              ))}
            </SettingRow>

            <Divider />

            {/* Color Theme */}
            <SettingRow label="Theme">
              {COLOR_THEMES.map((t) => (
                <SettingChip
                  key={t.id}
                  active={colorTheme === t.id}
                  onClick={() => setColorTheme(t.id)}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: t.swatch,
                      marginRight: 5,
                      verticalAlign: "middle",
                      marginBottom: 1,
                      border: "1px solid rgba(0,0,0,0.15)",
                    }}
                  />
                  {t.label}
                </SettingChip>
              ))}
            </SettingRow>

            {/* Dark / Light mode */}
            <SettingRow label="Mode">
              <SettingChip
                active={!darkMode}
                onClick={() => setDarkMode(false)}
              >
                ☀ Light
              </SettingChip>
              <SettingChip active={darkMode} onClick={() => setDarkMode(true)}>
                ☽ Dark
              </SettingChip>
            </SettingRow>

            <Divider />

            {/* Hebrew font */}
            <SettingRow label="Hebrew font">
              {HEBREW_FONTS.map((f) => (
                <SettingChip
                  key={f.id}
                  active={hebrewFont === f.id}
                  onClick={() => setHebrewFont(f.id)}
                >
                  {f.label}
                  <span style={{ color: "var(--ink-faint)", marginLeft: 4 }}>
                    · {f.desc}
                  </span>
                </SettingChip>
              ))}
            </SettingRow>
          </div>
        )}

        {/* Calendar / progress panel */}
        {showCalendar && (
          <div
            style={{
              background: "var(--parchment)",
              border: "0.5px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "1.1rem 1.25rem",
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                Progress — {chelek.english}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                {totalDone} simanim completed
              </div>
            </div>
            <CalendarView
              simanCount={chelek.simanCount}
              doneSiman={doneSiman}
              currentSiman={currentSiman}
              chelekLabel={chelek.label}
              onSelectSiman={(s) => {
                goToSiman(s, 1);
                setShowCalendar(false);
              }}
            />
          </div>
        )}

        {/* Siman navigation */}
        <div
          className="siman-nav-row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <h1
                style={{
                  fontFamily: "'Frank Ruhl Libre', serif",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "var(--ink)",
                }}
              >
                סימן {currentSiman}
              </h1>
              <span style={{ fontSize: 14, color: "var(--ink-muted)" }}>
                · {chelek.english}
              </span>
            </div>
            <div
              style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 2 }}
            >
              {visibleSeifNums.length === 2
                ? `סעיפים ${visibleSeifNums[0]}–${visibleSeifNums[1]}`
                : `סעיף ${visibleSeifNums[0] || seifA}`}{" "}
              ·{" "}
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          <div className="siman-nav-btns" style={{ display: "flex", gap: 8 }}>
            <NavButton
              onClick={prevPair}
              disabled={currentSiman <= 1 && currentSeifPair <= 1}
            >
              <span className="btn-label-full">← Prev 2 se'ifim</span>
              <span className="btn-label-short">← Prev</span>
            </NavButton>
            {(atLastPairOfSiman || simanDone) && (
              <NavButton onClick={toggleSimanDone} active={simanDone}>
                <span className="btn-label-full">{simanDone ? "✓ Siman Done" : "Mark Siman Done"}</span>
                <span className="btn-label-short">{simanDone ? "✓ Done" : "Mark"}</span>
              </NavButton>
            )}
            <NavButton onClick={advance} disabled={atEndOfChelek}>
              <span className="btn-label-full">Next 2 se'ifim →</span>
              <span className="btn-label-short">Next →</span>
            </NavButton>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--ink-faint)",
              fontSize: 15,
            }}
          >
            Loading text...
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #fcc",
              borderRadius: "var(--radius)",
              padding: "1rem 1.25rem",
              marginBottom: "1rem",
            }}
          >
            <div style={{ fontWeight: 500, color: "#c00", marginBottom: 4 }}>
              Could not load text
            </div>
            <div style={{ fontSize: 13, color: "#800" }}>{error}</div>
            <button
              onClick={reload}
              style={{
                marginTop: 10,
                fontSize: 13,
                padding: "5px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid #fcc",
                background: "white",
                cursor: "pointer",
                color: "#c00",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Seif A */}
        {!loading && seifAData && (
          <div style={{ marginBottom: "2rem" }}>
            <SeifPanel
              seifNum={seifA}
              siman={currentSiman}
              saSource={seifAData.sa}
              commentaries={seifAData.commentaries}
              layout={layout}
            />
          </div>
        )}

        {/* Divider */}
        {!loading && seifAData && seifBData && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "1.5rem 0",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "0.5px",
                background: "var(--border-strong)",
              }}
            />
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
              }}
            >
              סעיף שני
            </div>
            <div
              style={{
                flex: 1,
                height: "0.5px",
                background: "var(--border-strong)",
              }}
            />
          </div>
        )}

        {/* Seif B */}
        {!loading && seifBData && (
          <div style={{ marginBottom: "2rem" }}>
            <SeifPanel
              seifNum={seifB}
              siman={currentSiman}
              saSource={seifBData.sa}
              commentaries={seifBData.commentaries}
              layout={layout}
            />
          </div>
        )}

        {/* Advance button */}
        {!loading && data && (
          <div
            className="bottom-actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              paddingTop: "1rem",
              borderTop: "0.5px solid var(--border)",
            }}
          >
            {(atLastPairOfSiman || simanDone) && (
              <button
                onClick={toggleSimanDone}
                style={{
                  padding: "9px 16px",
                  borderRadius: "var(--radius)",
                  fontSize: 14,
                  fontWeight: 500,
                  background: simanDone ? "#e7f6ec" : "var(--parchment)",
                  border: `1px solid ${simanDone ? "#2e7d4f" : "var(--border-strong)"}`,
                  color: simanDone ? "#1f6b43" : "var(--ink-muted)",
                  cursor: "pointer",
                }}
              >
                {simanDone ? "✓ Siman Done" : "Mark Siman Done"}
              </button>
            )}
            <button
              onClick={advance}
              disabled={atEndOfChelek}
              style={{
                padding: "9px 20px",
                borderRadius: "var(--radius)",
                fontSize: 14,
                fontWeight: 500,
                background: "var(--gold-light)",
                border: "1px solid var(--gold-border)",
                color: "var(--gold)",
                cursor: atEndOfChelek ? "not-allowed" : "pointer",
                opacity: atEndOfChelek ? 0.6 : 1,
              }}
            >
              Next 2 se'ifim →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
