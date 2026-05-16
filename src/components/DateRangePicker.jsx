import React, { useState, useRef, useEffect } from 'react';

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT   = ['D','S','T','Q','Q','S','S'];

function isSameDay(a, b) {
  return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function inRange(date, start, end) {
  if (!start || !end) return false;
  return date > start && date < end;
}

function CalMonth({ year, month, startDate, endDate, hoverDate, onSelect, onHover, selecting }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(new Date(year, month, d));
  const rangeEnd = endDate || (selecting === 'end' ? hoverDate : null);

  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ textAlign:'center', fontWeight:500, fontSize:12, marginBottom:10, color:'var(--text)' }}>
        {MONTHS_PT[month]} {year}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {DAYS_PT.map((d,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:9, color:'var(--text-3)', padding:'3px 0', fontWeight:600 }}>{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const isStart = isSameDay(date, startDate);
          const isEnd   = isSameDay(date, endDate);
          const isIn    = inRange(date, startDate, rangeEnd);
          const isToday = isSameDay(date, new Date());
          const bg = isStart||isEnd ? 'var(--acc)' : isIn ? 'var(--acc-dim)' : 'transparent';
          const color = isStart||isEnd ? '#000' : isToday ? 'var(--acc)' : 'var(--text)';
          const br = isStart ? '50% 0 0 50%' : isEnd ? '0 50% 50% 0' : isIn ? 0 : '50%';
          return (
            <div key={i} onClick={() => onSelect(date)} onMouseEnter={() => onHover(date)} style={{ textAlign:'center', fontSize:12, padding:'5px 2px', background:bg, color, borderRadius:br, cursor:'pointer', fontWeight: isStart||isEnd ? 700 : 400 }}>
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [open, setOpen]       = useState(false);
  const [hover, setHover]     = useState(null);
  const [selecting, setSel]   = useState(null);
  const [viewYear, setYear]   = useState(new Date().getFullYear());
  const [viewMonth, setMonth] = useState(new Date().getMonth());
  const ref = useRef();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function handleSelect(date) {
    if (!selecting || selecting === 'start') {
      onChange({ startDate: date, endDate: null });
      setSel('end');
    } else {
      if (date < startDate) onChange({ startDate: date, endDate: startDate });
      else onChange({ startDate, endDate: date });
      setSel(null); setOpen(false);
    }
  }

  function quick(type) {
    const today = new Date(); today.setHours(0,0,0,0);
    if (type === 'hoje') onChange({ startDate: today, endDate: today });
    else if (type === 'semana') { const s = new Date(today); s.setDate(today.getDate()-6); onChange({ startDate: s, endDate: today }); }
    else if (type === 'mes') { const s = new Date(today.getFullYear(), today.getMonth(), 1); onChange({ startDate: s, endDate: today }); }
    else if (type === 'mes-passado') { const s = new Date(today.getFullYear(), today.getMonth()-1, 1); const e = new Date(today.getFullYear(), today.getMonth(), 0); onChange({ startDate: s, endDate: e }); }
    setSel(null); setOpen(false);
  }

  const fmt = (d) => d ? d.toLocaleDateString('pt-BR') : '—';
  const nextMonth = (viewMonth+1) % 12;
  const nextYear  = viewMonth === 11 ? viewYear+1 : viewYear;

  return (
    <div ref={ref} style={{ position:'relative', userSelect:'none' }}>
      <button onClick={() => { setOpen(o => !o); setSel('start'); }} style={{
        background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--text-2)',
        borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
        fontFamily: 'var(--font)', transition: 'all 0.18s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-acc)'; e.currentTarget.style.color='var(--acc)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-2)'; }}
      >
        <span>📅</span>
        {fmt(startDate)}{endDate && !isSameDay(startDate,endDate) ? ` → ${fmt(endDate)}` : ''}
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', right:0,
          background:'var(--s1)', border:'1px solid var(--border2)',
          borderRadius:14, padding:16, zIndex:200,
          boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
          display:'flex', flexDirection:'column', gap:12,
          minWidth: 460,
        }}>
          {/* Shortcuts */}
          <div style={{ display:'flex', gap:6, borderBottom:'1px solid var(--border)', paddingBottom:10 }}>
            {[['hoje','Hoje'],['semana','7 dias'],['mes','Este mês'],['mes-passado','Mês passado']].map(([v,l]) => (
              <button key={v} onClick={() => quick(v)} style={{
                background:'transparent', border:'1px solid var(--border)', color:'var(--text-2)',
                borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer',
                fontFamily:'var(--font)', transition:'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-acc)'; e.currentTarget.style.color='var(--acc)'; e.currentTarget.style.background='var(--acc-dim)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-2)'; e.currentTarget.style.background='transparent'; }}
              >{l}</button>
            ))}
          </div>

          {/* Nav */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={() => { if (viewMonth===0) { setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); }}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--acc)', padding:'0 4px', lineHeight:1 }}>‹</button>
            <div style={{ display:'flex', gap:28, flex:1, justifyContent:'center' }}>
              <CalMonth year={viewYear} month={viewMonth} startDate={startDate} endDate={endDate} hoverDate={hover} onSelect={handleSelect} onHover={setHover} selecting={selecting} />
              <CalMonth year={nextYear} month={nextMonth} startDate={startDate} endDate={endDate} hoverDate={hover} onSelect={handleSelect} onHover={setHover} selecting={selecting} />
            </div>
            <button onClick={() => { if (viewMonth===11) { setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); }}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--acc)', padding:'0 4px', lineHeight:1 }}>›</button>
          </div>

          <div style={{ fontSize:11, color:'var(--text-3)', textAlign:'center', borderTop:'1px solid var(--border)', paddingTop:10 }}>
            {selecting==='end' ? 'Selecione a data final' : 'Selecione a data inicial'}
          </div>
        </div>
      )}
    </div>
  );
}
