import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  fetchSheetData, normalizeRow, isWebinar, filterByDateRange,
  fmt, fmtDay, CHART_COLORS,
} from '../data';

function SectionHead({ children }) {
  return (
    <div className="sec-head">
      <div className="sec-line-l" />
      <span className="sec-title">{children}</span>
      <div className="sec-line-r" />
    </div>
  );
}

function StatCard({ variant, icon, num, label, sub, delay = 0 }) {
  return (
    <div className={`stat-card sc-${variant} fade-up`} style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-num">{num}</div>
      <div className="stat-lbl">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

const TT_STYLE = {
  backgroundColor: 'var(--s2)',
  border: '1px solid var(--border2)',
  borderRadius: 8,
  fontSize: 11,
  color: 'var(--text)',
};

export default function TabWebinar({ startDate, endDate }) {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchSheetData()
      .then(rows => {
        const normalized = rows.map(normalizeRow).filter(r => isWebinar(r.camp) && r.spent > 0);
        setRawData(normalized);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const data = useMemo(() => filterByDateRange(rawData, startDate, endDate), [rawData, startDate, endDate]);

  const totalSpent = useMemo(() => data.reduce((s, d) => s + d.spent, 0), [data]);
  const totalLpv   = useMemo(() => data.reduce((s, d) => s + d.lpv, 0), [data]);
  const totalForms = useMemo(() => data.reduce((s, d) => s + d.forms, 0), [data]);
  const avgCpm     = useMemo(() => data.length ? data.reduce((s, d) => s + d.cpm, 0) / data.length : 0, [data]);
  const cpl        = totalLpv > 0 ? totalSpent / totalLpv : null;

  const days = useMemo(() => [...new Set(data.map(d => d.day))].sort(), [data]);

  const dailyData = useMemo(() => days.map(day => {
    const rows = data.filter(d => d.day === day);
    return {
      label: fmtDay(day),
      gasto: +rows.reduce((s, d) => s + d.spent, 0).toFixed(2),
      leads: rows.reduce((s, d) => s + d.lpv, 0),
    };
  }), [days, data]);

  const grouped = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const key = `${d.cj}||${d.ad}`;
      if (!map[key]) map[key] = { cj: d.cj, ad: d.ad, spent: 0, lpv: 0, imp: 0 };
      map[key].spent += d.spent;
      map[key].lpv   += d.lpv;
      map[key].imp   += d.imp;
    });
    return Object.values(map).sort((a, b) => b.lpv - a.lpv || b.spent - a.spent);
  }, [data]);

  const maxLpv = Math.max(...grouped.map(r => r.lpv), 1);

  const cjData = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const k = d.cj.split(' - ')[0].slice(0, 20);
      if (!map[k]) map[k] = { name: k, leads: 0, gasto: 0 };
      map[k].leads += d.lpv;
      map[k].gasto += d.spent;
    });
    return Object.values(map).sort((a, b) => b.leads - a.leads);
  }, [data]);

  if (loading) {
    return (
      <div className="spinner-wrap">
        <div className="spinner" />
        <div className="spinner-text">Carregando dados da planilha...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="info-note"><span>⚠</span><span>Erro: {error}</span></div>
    );
  }

  return (
    <div>
      <SectionHead>Tráfego pago — webinário</SectionHead>

      <div className="stat-strip" style={{ marginBottom: 28 }}>
        <StatCard variant="acc"  icon="💸" num={fmt(totalSpent)}        label="Investimento total"   sub="período selecionado"   delay={0} />
        <StatCard variant="blue" icon="📋" num={totalLpv}               label="Leads (LPV)"          sub="landing page views"    delay={60} />
        <StatCard variant="safe" icon="📝" num={totalForms}             label="Formulários"          sub="leads via form nativo" delay={120} />
        <StatCard variant="warn" icon="🎯" num={cpl ? fmt(cpl) : '—'}  label="CPL"                  sub="custo por lead"        delay={180} />
        <StatCard variant="pur"  icon="📊" num={fmt(avgCpm)}            label="CPM médio"            sub="custo por mil imp."    delay={240} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="chart-card">
          <div className="chart-title">Investimento diário</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-3)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickFormatter={v => `R$${v}`} width={60} />
              <Tooltip contentStyle={TT_STYLE} formatter={v => fmt(v)} />
              <Line type="monotone" dataKey="gasto" stroke="var(--blue)" strokeWidth={2} dot={false} name="Gasto" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Leads por conjunto</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cjData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-3)' }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={70} />
              <Tooltip contentStyle={TT_STYLE} />
              <Bar dataKey="leads" fill="var(--blue)" radius={[0, 3, 3, 0]} name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="tbl-wrap">
        <div style={{ padding: '10px 14px', background: 'var(--s2)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-2)' }}>
            Performance por conjunto e criativo
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Conjunto</th>
                <th>Criativo</th>
                <th style={{ textAlign: 'right' }}>Gasto</th>
                <th style={{ textAlign: 'right' }}>Leads</th>
                <th style={{ textAlign: 'right' }}>CPL</th>
                <th>Eficiência</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((r, i) => {
                const cplRow = r.lpv > 0 ? r.spent / r.lpv : null;
                const eff = r.lpv / maxLpv;
                const effClass = eff > 0.6 ? 'badge-green' : eff > 0.2 ? 'badge-amber' : 'badge-red';
                const effLabel = eff > 0.6 ? 'alto' : eff > 0.2 ? 'médio' : 'baixo';
                return (
                  <tr key={i}>
                    <td className="td-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cj}</td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ad}</td>
                    <td className="td-num">{fmt(r.spent)}</td>
                    <td className="td-num">{r.lpv}</td>
                    <td className="td-num">{cplRow ? fmt(cplRow) : '—'}</td>
                    <td><span className={`badge ${effClass}`}>{effLabel}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="info-note" style={{ marginTop: 12 }}>
        <span>ℹ</span>
        <span>Qualidade de lead (qualificação, renda, escala de incômodo) aguardando integração com Kommo.</span>
      </div>
    </div>
  );
}
