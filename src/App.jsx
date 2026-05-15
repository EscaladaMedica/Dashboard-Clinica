import React, { useState } from 'react';
import TabClinica   from './components/TabClinica';
import TabComercial from './components/TabComercial';
import TabWebinar   from './components/TabWebinar';
import DateRangePicker from './components/DateRangePicker';

const TABS = [
  { id: 'clinica',   label: 'Clínica — Tráfego' },
  { id: 'comercial', label: 'Clínica — Comercial' },
  { id: 'webinar',   label: 'Webinário' },
];

function toUnix(date) {
  return date ? Math.floor(date.getTime() / 1000) : null;
}

function getDefaultRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { startDate: start, endDate: today };
}

// Converte dates para o formato que os componentes de tráfego entendem ("month"/"week"/"day")
function datesToPeriod(startDate, endDate) {
  if (!startDate || !endDate) return 'month';
  const today = new Date(); today.setHours(0,0,0,0);
  const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  if (startDate.getTime() === startOfMonth.getTime()) return 'month';
  if (diffDays <= 1) return 'day';
  if (diffDays <= 7) return 'week';
  return 'month';
}

export default function App() {
  const [tab, setTab]             = useState('clinica');
  const [dateRange, setDateRange] = useState(getDefaultRange());

  const { startDate, endDate } = dateRange;
  const dateFrom = toUnix(startDate);
  const dateTo   = toUnix(endDate ? new Date(endDate.getTime() + 86399999) : endDate); // fim do dia
  const period   = datesToPeriod(startDate, endDate);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* ── Header ── */}
      <header style={{
        background: 'var(--brown-deep)',
        padding: '0 32px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="/logo-dayane.png"
            alt="Dra. Dayane Vilela"
            style={{ height: 44, width: 'auto', objectFit: 'contain' }}
          />
          <div style={{ borderLeft: '0.5px solid rgba(200,146,42,0.25)', paddingLeft: 14 }}>
            <div style={{ fontFamily: "'Jost', sans-serif", color: 'rgba(253,190,89,0.6)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2 }}>
              Painel de gestão
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#fdbe59', fontSize: 13, fontWeight: 500, letterSpacing: '0.06em' }}>
              MKT + Comercial
            </div>
          </div>
        </div>

        {/* Date picker */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={setDateRange}
        />
      </header>

      {/* ── Tab Nav ── */}
      <div style={{
        background: '#fff',
        borderBottom: '0.5px solid rgba(200,146,42,0.15)',
        padding: '0 32px',
        display: 'flex',
        gap: 0,
        position: 'sticky',
        top: 64,
        zIndex: 99,
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #c8922a' : '2px solid transparent',
              color: tab === t.id ? '#1a1209' : '#8c7a6a',
              fontFamily: "'Jost', sans-serif",
              fontSize: 13,
              fontWeight: tab === t.id ? 500 : 400,
              padding: '14px 20px',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px 60px' }}>
        {tab === 'clinica'   && <TabClinica   period={period} />}
        {tab === 'comercial' && <TabComercial dateFrom={dateFrom} dateTo={dateTo} />}
        {tab === 'webinar'   && <TabWebinar   period={period} />}
      </main>

      {/* ── Footer ── */}
      <footer style={{
        textAlign: 'center',
        padding: '16px',
        fontSize: 11,
        color: '#8c7a6a',
        borderTop: '0.5px solid rgba(200,146,42,0.1)',
      }}>
        Dra. Dayane Vilela · Dashboard v1.1 · Meta Ads (real) · Kommo (ao vivo) · Tintim (em integração)
      </footer>
    </div>
  );
}
