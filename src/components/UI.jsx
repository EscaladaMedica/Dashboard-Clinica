import React from 'react';

// ─── MetricCard ──────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub, highlight }) {
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(200,146,42,0.15)',
      borderRadius: 10,
      padding: '16px 18px',
      borderTop: highlight ? '2px solid #c8922a' : undefined,
    }}>
      <div style={{ fontSize: 11, color: '#8c7a6a', marginBottom: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: '#1a1209', fontFamily: "'Playfair Display', serif", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: '#8c7a6a', marginTop: 5 }}>{sub}</div>
      )}
    </div>
  );
}

// ─── SectionLabel ────────────────────────────────────────────────────────────
export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#8c7a6a',
      marginBottom: 12,
      paddingLeft: 2,
    }}>
      {children}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(200,146,42,0.15)',
      borderRadius: 12,
      padding: '18px 20px',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── CardTitle ───────────────────────────────────────────────────────────────
export function CardTitle({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1209', marginBottom: 14 }}>
      {children}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
export function Badge({ type, children }) {
  const styles = {
    green: { background: '#EAF3DE', color: '#3B6D11' },
    amber: { background: '#FAEEDA', color: '#854F0B' },
    red:   { background: '#FCEBEB', color: '#A32D2D' },
    blue:  { background: '#E6F1FB', color: '#185FA5' },
  };
  const s = styles[type] || styles.blue;
  return (
    <span style={{
      ...s,
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 99,
      letterSpacing: '0.03em',
    }}>
      {children}
    </span>
  );
}

// ─── DataTable ───────────────────────────────────────────────────────────────
export function DataTable({ columns, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{
                textAlign: col.align || 'left',
                fontWeight: 500,
                fontSize: 11,
                color: '#8c7a6a',
                padding: '6px 10px',
                borderBottom: '0.5px solid rgba(200,146,42,0.15)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.03em',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#faf8f4'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map((col) => (
                <td key={col.key} style={{
                  padding: '8px 10px',
                  borderBottom: i < rows.length - 1 ? '0.5px solid rgba(200,146,42,0.1)' : 'none',
                  color: col.muted ? '#8c7a6a' : '#1a1209',
                  textAlign: col.align || 'left',
                  fontVariantNumeric: col.align === 'right' ? 'tabular-nums' : undefined,
                }}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── DddBars ─────────────────────────────────────────────────────────────────
export function DddBars({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d) => (
        <div key={d.ddd} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <span style={{ width: 28, color: '#8c7a6a', fontVariantNumeric: 'tabular-nums', flexShrink: 0, fontSize: 11 }}>
            {d.ddd}
          </span>
          <span style={{ width: 24, color: '#5c4a38', fontSize: 11, flexShrink: 0 }}>{d.estado}</span>
          <div style={{ flex: 1, height: 12, background: '#faf8f4', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.round((d.count / max) * 100)}%`,
              background: '#c8922a',
              borderRadius: 2,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ width: 24, textAlign: 'right', color: '#8c7a6a', fontSize: 11 }}>{d.count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── InfoNote ────────────────────────────────────────────────────────────────
export function InfoNote({ children }) {
  return (
    <div style={{
      padding: '12px 16px',
      background: '#faf8f4',
      borderRadius: 8,
      fontSize: 12,
      color: '#8c7a6a',
      border: '0.5px solid rgba(200,146,42,0.2)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 12,
    }}>
      <span style={{ fontSize: 14, marginTop: 1 }}>ℹ</span>
      <span>{children}</span>
    </div>
  );
}
