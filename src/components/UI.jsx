// Componentes de compatibilidade — o novo design usa classes CSS diretamente
import React from 'react';

export function InfoNote({ children }) {
  return (
    <div className="info-note">
      <span style={{ fontSize:14, flexShrink:0 }}>ℹ</span>
      <span>{children}</span>
    </div>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:14, padding:'20px 22px', ...style }}>
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', marginBottom:14, fontFamily:'var(--font-serif)' }}>{children}</div>;
}

export function SectionLabel({ children }) {
  return (
    <div className="sec-head">
      <div className="sec-line-l" />
      <span className="sec-title">{children}</span>
      <div className="sec-line-r" />
    </div>
  );
}

export function Badge({ type, children }) {
  const map = { green:'badge-green', amber:'badge-amber', red:'badge-red', blue:'badge-blue' };
  return <span className={`badge ${map[type]||'badge-blue'}`}>{children}</span>;
}

export function DataTable({ columns, rows }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ textAlign: col.align||'left', fontWeight:600, fontSize:10, color:'var(--text-2)', padding:'6px 10px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap', letterSpacing:'0.08em', textTransform:'uppercase', background:'var(--s2)' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i) => (
            <tr key={i} onMouseEnter={e => e.currentTarget.style.background='var(--s2)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              {columns.map(col => (
                <td key={col.key} style={{ padding:'8px 10px', borderBottom: i<rows.length-1?'1px solid var(--border)':'none', color: col.muted?'var(--text-3)':'var(--text)', textAlign: col.align||'left', fontVariantNumeric: col.align==='right'?'tabular-nums':undefined }}>
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

export function MetricCard({ label, value, sub, highlight }) {
  return (
    <div style={{ background:'var(--s1)', border:`1px solid ${highlight?'var(--border-acc)':'var(--border)'}`, borderRadius:10, padding:'16px 18px', borderTop: highlight?'2px solid var(--acc)':undefined }}>
      <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:6, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color:'var(--text)', fontFamily:'var(--font-display)', lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:5 }}>{sub}</div>}
    </div>
  );
}

export function DddBars({ data }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {data.map(d => (
        <div key={d.ddd} className="ddd-row">
          <span className="ddd-code">{d.ddd}</span>
          <span className="ddd-state">{d.estado}</span>
          <div className="ddd-track">
            <div className="ddd-fill" style={{ width:`${(d.count/max)*100}%` }} />
          </div>
          <span className="ddd-count">{d.count}</span>
        </div>
      ))}
    </div>
  );
}
