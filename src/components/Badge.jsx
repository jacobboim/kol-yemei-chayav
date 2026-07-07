import React from 'react';

export default function Badge({ name, hebrew, colorVar, bgVar, small }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: `var(${bgVar})`,
      color: `var(${colorVar})`,
      borderRadius: 20,
      padding: small ? '2px 8px' : '3px 11px',
      fontSize: small ? 11 : 12,
      fontWeight: 500,
      whiteSpace: 'nowrap',
      border: `0.5px solid color-mix(in srgb, var(${colorVar}) 25%, transparent)`,
    }}>
      <span style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: small ? 12 : 13 }}>{hebrew}</span>
      <span style={{ opacity: 0.55, margin: '0 1px' }}>·</span>
      <span>{name}</span>
    </span>
  );
}
