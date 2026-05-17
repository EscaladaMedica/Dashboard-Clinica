import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  fetchSheetData, normalizeRow, isClinica, filterByDateRange,
  fmt, fmtDay, CHART_COLORS, DDD_MOCK,
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

export default function TabClinica({ startDate, endDate }) {
  const [rawData, setRawData]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchSheetData()
      .then(rows => {
        const normalized = rows.map(normalizeRow).filter(r => isClinica(r.camp) && r.spent > 0);
        setRawData(normalized);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const data = useMemo(() => {
    return filterByDateRange(rawData, startDate, endDate);
  }, [rawData, startDate, endDate]);

  const totalSpent = useMemo(() => data.reduce((s, d) => s + d.spent, 0), [data]);
  const totalMsg   = useMemo(() => data.reduce((s, d) => s + d.msg, 0), [data]);
  const avgCpm     = useMemo(() => data.length ? data.reduce((s, d) => s + d.cpm, 0) / data.length : 0, [data]);
  const cpl        = totalMsg > 0 ? totalSpent / totalMsg : null;

  const days = useMemo(() => [...new Set(data.map(d => d.day))].sort(), [data]);

  const dailyData = useMemo(() => days.map(day => {
    const rows = data.filter(d => d.day === day);
    return {
      label: fmtDay(day),
      gasto: +rows.reduce((s, d) => s + d.spent, 0).toFixed(2),
      conversas: rows.reduce((s, d) => s + d.msg, 0),
    };
  }), [days, data]);

  const grouped = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const key = `${d.camp}||${d.cj}||${d.ad}`;
      if (!map[key]) map[key] = { camp: d.camp, cj: d.cj, ad: d.ad, spent: 0, msg: 0 };
      map[key].spent += d.spent;
      map[key].msg   += d.msg;
    });
    return Object.values(map).sort((a, b) => b.msg - a.msg || b.spent - a.spent);
  }, [data]);

  const maxMsg = Math.max(...grouped.map(r => r.msg), 1);

  const campPie = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const k = d.camp.split(' - ')[0].slice(0, 30);
      map[k] = (map[k] || 0) + d.msg;
    });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
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
      <div className="info-note">
        <span>⚠</span>
        <span>Erro ao carregar planilha: {error}</span>
      </div>
    );
  }

  return (
    <div>
      <SectionHead>Tráfego pago — clínica</SectionHead>

      <div className="stat-strip" style={{ marginBottom: 28 }}>
        <StatCard variant="acc"  icon="💸" num={fmt(totalSpent)}         label="Investimento total"     sub={`${data.length} linhas no período`} delay={0} />
        <StatCard variant="blue" icon="💬" num={totalMsg}                 label="Conversas iniciadas"    sub="mensagens WhatsApp" delay={60} />
        <StatCard variant="warn" icon="📊" num={fmt(avgCpm)}              label="CPM médio"              sub="custo por mil impressões" delay={120} />
        <StatCard variant="safe" icon="🎯" num={cpl ? fmt(cpl) : '—'}    label="Custo / conversa"       sub="investimento ÷ conversas" delay={180} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="chart-card">
          <div className="chart-title">Investimento diário</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-3)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickFormatter={v => `R$${v}`} width={55} />
              <Tooltip contentStyle={TT_STYLE} formatter={v => fmt(v)} />
              <Line type="monotone" dataKey="gasto" stroke="var(--acc)" strokeWidth={2} dot={false} name="Gasto" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Conversas por dia</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-3)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <Tooltip contentStyle={TT_STYLE} />
              <Bar dataKey="conversas" fill="var(--acc)" radius={[3, 3, 0, 0]} name="Conversas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="tbl-wrap" style={{ marginBottom: 12 }}>
        <div style={{ padding: '10px 14px', background: 'var(--s2)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-2)' }}>
            Performance — campanha / conjunto / criativo
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Conjunto</th>
                <th>Criativo</th>
                <th style={{ textAlign: 'right' }}>Gasto</th>
                <th style={{ textAlign: 'right' }}>Conversas</th>
                <th style={{ textAlign: 'right' }}>Custo/conv.</th>
                <th>Eficiência</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((r, i) => {
                const cpc = r.msg > 0 ? r.spent / r.msg : null;
                const eff = r.msg / maxMsg;
                const effClass = eff > 0.6 ? 'badge-green' : eff > 0.2 ? 'badge-amber' : 'badge-red';
                const effLabel = eff > 0.6 ? 'alto' : eff > 0.2 ? 'médio' : 'baixo';
                return (
                  <tr key={i}>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.camp}</td>
                    <td className="td-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cj}</td>
                    <td className="td-muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ad}</td>
                    <td className="td-num">{fmt(r.spent)}</td>
                    <td className="td-num">{r.msg}</td>
                    <td className="td-num">{cpc ? fmt(cpc) : '—'}</td>
                    <td><span className={`badge ${effClass}`}>{effLabel}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="chart-card">
          <div className="chart-title">Origem dos leads por DDD <span style={{ color: 'var(--warn)', fontSize: 9, fontWeight: 600 }}>MOCK — aguardando Tintim</span></div>
          {DDD_MOCK.map((d, i) => {
            const max = DDD_MOCK[0].count;
            return (
              <div key={i} className="ddd-row">
                <span className="ddd-code">{d.ddd}</span>
                <span className="ddd-state">{d.estado}</span>
                <div className="ddd-track">
                  <div className="ddd-fill" style={{ width: `${(d.count / max) * 100}%` }} />
                </div>
                <span className="ddd-count">{d.count}</span>
              </div>
            );
          })}
        </div>

        <div className="chart-card">
          <div className="chart-title">Conversas por campanha</div>
          {campPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={campPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={2}>
                  {campPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} formatter={v => [`${v} conversas`]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 10, color: 'var(--text-2)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 20, color: 'var(--text-3)', fontSize: 12 }}>Nenhuma conversa no período.</div>
          )}
        </div>
      </div>
    </div>
  );
}
