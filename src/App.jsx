import React, { useState } from 'react';
import TabClinica from './components/TabClinica';
import TabComercial from './components/TabComercial';
import TabWebinar from './components/TabWebinar';

const TABS = [
  { id: 'clinica',   label: 'Clínica — Tráfego' },
  { id: 'comercial', label: 'Clínica — Comercial' },
  { id: 'webinar',   label: 'Webinário' },
];

const PERIODS = [
  { value: 'day',   label: 'Hoje' },
  { value: 'week',  label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
];

export default function App() {
  const [tab, setTab]       = useState('clinica');
  const [period, setPeriod] = useState('month');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* ── Header ── */}
      <header style={{
        background: 'var(--brown-deep)',
        padding: '0 32px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* logo mark — triângulo dourado */}
          <svg width="24" height="22" viewBox="0 0 24 22" fill="none">
            <path d="M12 0L24 22H0L12 0Z" fill="#c8922a" />
            <path d="M12 4L20 18H4L12 4Z" fill="#0e0a08" />
            <path d="M12 8L18 18H6L12 8Z" fill="#c8922a" opacity="0.5" />
          </svg>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#fdbe59', fontSize: 15, fontWeight: 500, letterSpacing: '0.08em' }}>
              ESCALADA MÉDICA
            </div>
            <div style={{ color: 'rgba(253,190,89,0.5)', fontSize: 10, letterSpacing: '0.12em', marginTop: -1 }}>
              PAINEL DE GESTÃO
            </div>
          </div>
        </div>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{
            background: 'rgba(200,146,42,0.12)',
            border: '0.5px solid rgba(200,146,42,0.3)',
            color: '#fdbe59',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value} style={{ background: '#15100e', color: '#fdbe59' }}>
              {p.label}
            </option>
          ))}
        </select>
      </header>

      {/* ── Tab Nav ── */}
      <div style={{
        background: '#fff',
        borderBottom: '0.5px solid rgba(200,146,42,0.15)',
        padding: '0 32px',
        display: 'flex',
        gap: 0,
        position: 'sticky',
        top: 60,
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
        {tab === 'comercial' && <TabComercial period={period} />}
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
        Escalada Médica · Dashboard v1.0 · Dados: Meta Ads (real) · Kommo + Tintim (em integração)
      </footer>
    </div>
  );
}
