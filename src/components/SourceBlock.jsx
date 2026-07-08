import Badge from "./Badge";

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-faint)",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export default function SourceBlock({ source, layout }) {
  if (!source) return null;

  const isBeerHaGolah = source.name === "Be'er HaGolah";
  const { name, hebrew, colorVar, bgVar, hebrewText, translation, summary } = source;

  if (layout === "sidebyside") {
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ marginBottom: 8 }}>
          <Badge name={name} hebrew={hebrew} colorVar={colorVar} bgVar={bgVar} />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: (isBeerHaGolah || (!translation && !summary)) ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          {!isBeerHaGolah && (translation || summary) && (
            <div
              style={{
                background: "var(--parchment)",
                border: "0.5px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "1rem",
              }}
            >
              {translation && (
                <Section label="Translation">
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--ink-muted)" }}>
                    {translation}
                  </p>
                </Section>
              )}
              {summary && (
                <Section label="Summary">
                  <p style={{ fontSize: 13, lineHeight: 1.75, color: "var(--ink-muted)" }}>
                    {summary}
                  </p>
                </Section>
              )}
            </div>
          )}
          <div
            style={{
              background: "var(--parchment)",
              border: "0.5px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "1rem",
            }}
          >
            <Section label="Text">
              <p className="heb-text">{hebrewText}</p>
            </Section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!isBeerHaGolah && (
        <>
          {summary && (
            <Section label="Summary">
              <p style={{ fontSize: 13, lineHeight: 1.75, color: "var(--ink-muted)" }}>
                {summary}
              </p>
            </Section>
          )}
          <Section label="Text">
            <p className="heb-text">{hebrewText}</p>
          </Section>
          {translation && (
            <Section label="Translation">
              <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--ink-muted)" }}>
                {translation}
              </p>
            </Section>
          )}
        </>
      )}
      {isBeerHaGolah && (
        <Section label="Text">
          <p className="heb-text">{hebrewText}</p>
        </Section>
      )}
    </div>
  );
}
