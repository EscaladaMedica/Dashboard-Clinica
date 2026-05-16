import React, { useState, useEffect } from 'react';
import TabClinica   from './components/TabClinica';
import TabComercial from './components/TabComercial';
import TabWebinar   from './components/TabWebinar';
import DateRangePicker from './components/DateRangePicker';

const TABS = [
  { id: 'clinica',   label: 'Clínica — Tráfego' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'webinar',   label: 'Webinário' },
];

function toUnix(date) { return date ? Math.floor(date.getTime() / 1000) : null; }

function getDefaultRange() {
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { startDate: start, endDate: today };
}

function datesToPeriod(s, e) {
  if (!s || !e) return 'month';
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((e - s) / 86400000);
  const som = new Date(today.getFullYear(), today.getMonth(), 1);
  if (s.getTime() === som.getTime()) return 'month';
  if (diff <= 1) return 'day';
  if (diff <= 7) return 'week';
  return 'month';
}

export default function App() {
  const [tab, setTab]           = useState('clinica');
  const [dateRange, setDateRange] = useState(getDefaultRange());
  const [dark, setDark]         = useState(true);

  useEffect(() => {
    document.body.classList.toggle('light-theme', !dark);
  }, [dark]);

  const { startDate, endDate } = dateRange;
  const dateFrom = toUnix(startDate);
  const dateTo   = toUnix(endDate ? new Date(endDate.getTime() + 86399999) : endDate);
  const period   = datesToPeriod(startDate, endDate);

  return (
    <div>
      <header className="topbar">
        {/* Brand */}
        <div className="topbar-brand">
          <img src="/logo-dayane.png" alt="Dra. Dayane Vilela" className="topbar-logo" />
          <div className="topbar-divider" />
          <div className="topbar-label">
            <span className="topbar-name">Dra. Dayane Vilela</span>
            <span className="topbar-sub">Painel de Gestão</span>
          </div>
        </div>

        {/* Tabs (centered via absolute) */}
        <nav className="nav-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`nav-tab${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div className="topbar-right">
          <button className="icon-btn" onClick={() => setDark(d => !d)} title={dark ? 'Modo claro' : 'Modo escuro'}>
            {dark ? '☀️' : '🌙'}
          </button>
          <DateRangePicker startDate={startDate} endDate={endDate} onChange={setDateRange} />
        </div>
      </header>

      <main className="main-content">
        {tab === 'clinica'   && <TabClinica   period={period} />}
        {tab === 'comercial' && <TabComercial dateFrom={dateFrom} dateTo={dateTo} />}
        {tab === 'webinar'   && <TabWebinar   period={period} />}
      </main>

      <footer style={{ textAlign:'center', padding:16, fontSize:10, color:'var(--text-3)', borderTop:'1px solid var(--border)' }}>
        Dra. Dayane Vilela · Dashboard v1.3 · Meta Ads (real) · Kommo (ao vivo)
      </footer>
    </div>
  );
}
