import React, { useState, useRef, useEffect } from 'react';

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT   = ['D','S','T','Q','Q','S','S'];

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inRange(date, start, end) {
  if (!start || !end) return false;
  return date > start && date < end;
}

function CalendarMonth({ year, month, startDate, endDate, hoverDate, onSelect, onHover }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const rangeEnd = endDate || hoverDate;

  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ textAlign: 'center', fontWeight: 500, fontSize: 13, marginBottom: 10, color: '#1a1209' }}>
        {MONTHS_PT[month]} {year}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {DAYS_PT.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, color: '#8c7a6a', padding: '4px 0', fontWeight: 500 }}>{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const isStart   = isSameDay(date, startDate);
          const isEnd     = isSameDay(date, endDate);
          const isInRange = inRange(date, startDate, rangeEnd);
          const isToday   = isSameDay(date, new Date());

          const bg = isStart || isEnd ? '#c8922a'
                   : isInRange        ? 'rgba(200,146,42,0.12)'
                   : 'transparent';
          const color = isStart || isEnd ? '#fff'
                      : isToday         ? '#c8922a'
                      : '#1a1209';
          const br = isStart ? '50% 0 0 50%' : isEnd ? '0 50% 50% 0' : isInRange ? 0 : '50%';

          return (
            <div
              key={i}
              onClick={() => onSelect(date)}
              onMouseEnter={() => onHover(date)}
              style={{
                textAlign: 'center', fontSize: 12, padding: '5px 2px',
                background: bg, color, borderRadius: br,
                cursor: 'pointer', transition: 'background 0.1s',
                fontWeight: isStart || isEnd ? 600 : 400,
              }}
            >
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
  const [hoverDate, setHover] = useState(null);
  const [selecting, setSel]   = useState(null); // null | 'start'
  const [viewYear, setYear]   = useState(new Date().getFullYear());
  const [viewMonth, setMonth] = useState(new Date().getMonth());
  const ref = useRef();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(date) {
    if (!selecting || selecting === 'start') {
      onChange({ startDate: date, endDate: null });
      setSel('end');
    } else {
      if (date < startDate) {
        onChange({ startDate: date, endDate: startDate });
      } else {
        onChange({ startDate, endDate: date });
      }
      setSel(null);
      setOpen(false);
    }
  }

  function fmtDate(d) {
    if (!d) return '—';
    return d.toLocaleDateString('pt-BR');
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const nextYear  = viewMonth === 11 ? viewYear + 1 : viewYear;
  const nextMonthIdx = (viewMonth + 1) % 12;

  // Atalhos rápidos
  function setQuick(label) {
    const today = new Date();
    today.setHours(0,0,0,0);
    if (label === 'hoje') {
      onChange({ startDate: today, endDate: today });
    } else if (label === 'semana') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      onChange({ startDate: start, endDate: today });
    } else if (label === 'mes') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      onChange({ startDate: start, endDate: today });
    } else if (label === 'mes-passado') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end   = new Date(today.getFullYear(), today.getMonth(), 0);
      onChange({ startDate: start, endDate: end });
    }
    setSel(null);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      <button
        onClick={() => { setOpen(o => !o); setSel('start'); }}
        style={{
          background: 'rgba(200,146,42,0.12)',
          border: '0.5px solid rgba(200,146,42,0.3)',
          color: '#fdbe59',
          borderRadius: 6,
          padding: '6px 14px',
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 14 }}>📅</span>
        {fmtDate(startDate)} {endDate && endDate !== startDate ? `→ ${fmtDate(endDate)}` : ''}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: '#fff', border: '0.5px solid rgba(200,146,42,0.2)',
          borderRadius: 12, padding: 16, zIndex: 200,
          boxShadow: '0 8px 32px rgba(14,10,8,0.12)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Atalhos */}
          <div style={{ display: 'flex', gap: 6, borderBottom: '0.5px solid rgba(200,146,42,0.1)', paddingBottom: 10 }}>
            {[['hoje','Hoje'],['semana','7 dias'],['mes','Este mês'],['mes-passado','Mês passado']].map(([v, l]) => (
              <button key={v} onClick={() => setQuick(v)} style={{
                background: 'transparent', border: '0.5px solid rgba(200,146,42,0.25)',
                color: '#5c4a38', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>

          {/* Navegação */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#c8922a', padding: '0 8px' }}>‹</button>
            <div style={{ display: 'flex', gap: 32 }}>
              <CalendarMonth year={viewYear} month={viewMonth} startDate={startDate} endDate={endDate} hoverDate={selecting === 'end' ? hoverDate : null} onSelect={handleSelect} onHover={setHover} />
              <CalendarMonth year={nextYear} month={nextMonthIdx} startDate={startDate} endDate={endDate} hoverDate={selecting === 'end' ? hoverDate : null} onSelect={handleSelect} onHover={setHover} />
            </div>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#c8922a', padding: '0 8px' }}>›</button>
          </div>

          {/* Instrução */}
          <div style={{ fontSize: 11, color: '#8c7a6a', textAlign: 'center', borderTop: '0.5px solid rgba(200,146,42,0.1)', paddingTop: 8 }}>
            {selecting === 'end' ? 'Selecione a data final' : 'Selecione a data inicial'}
          </div>
        </div>
      )}
    </div>
  );
}
