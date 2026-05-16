import React, { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { filterByPeriod, fmt, CHART_COLORS, DDD_MOCK } from '../data';
import { CLINICA_RAW } from '../data';

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

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--s2)',
  border: '1px solid var(--border2)',
  borderRadius: 8,
  fontSize: 11,
  color: 'var(--text)',
};

export default function TabClinica({ period }) {
  const data = useMemo(() => filterByPeriod(CLINICA_RAW, period), [period]);

  const totalSpent = useMemo(() => data.reduce((s,d) => s+d.spent, 0), [data]);
  const totalMsg   = useMemo(() => data.reduce((s,d) => s+d.msg, 0), [data]);
  const avgCpm     = useMemo(() => data.length ? data.reduce((s,d) => s+d.cpm,0)/data.length : 0, [data]);
  const cpl        = totalMsg > 0 ? totalSpent / totalMsg : null;

  const days = useMemo(() => [...new Set(data.map(d => d.day))].sort(), [data]);
  const dailyData = useMemo(() => days.map(day => {
    const rows = data.filter(d => d.day===day);
    return {
      label: day.slice(5).replace('-','/'),
      gasto: +rows.reduce((s,d) => s+d.spent,0).toFixed(2),
      conversas: rows.reduce((s,d) => s+d.msg,0),
    };
  }), [days, data]);

  const grouped = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const key = `${d.camp}||${d.cj}||${d.ad}`;
      if (!map[key]) map[key] = { camp:d.camp, cj:d.cj, ad:d.ad, spent:0, msg:0 };
      map[key].spent += d.spent;
      map[key].msg   += d.msg;
    });
    return Object.values(map).sort((a,b) => b.msg-a.msg);
  }, [data]);

  const maxMsg = Math.max(...grouped.map(r => r.msg), 1);

  const campPie = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const k = d.camp.split(' - ')[0];
      map[k] = (map[k]||0) + d.msg;
    });
    return Object.entries(map).map(([name,value]) => ({ name, value }));
  }, [data]);

  return (
    <div>
      <SectionHead>Tráfego pago — clínica</SectionHead>

      <div className="stat-strip" style={{ marginBottom: 28 }}>
        <StatCard variant="acc"  icon="💸" num={fmt(totalSpent)} label="Investimento total" sub={`${data.length} linhas`} delay={0} />
        <StatCard variant="blue" icon="💬" num={totalMsg}        label="Conversas iniciadas" sub="WhatsApp" delay={60} />
        <StatCard variant="warn" icon="📊" num={fmt(avgCpm)}     label="CPM médio"           sub="custo por mil" delay={120} />
        <StatCard variant="safe" icon="🎯" num={cpl ? fmt(cpl) : '—'} label="Custo / conversa" sub="investimento ÷ conversas" delay={180} />
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div className="chart-card">
          <div className="chart-title">Investimento diário</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize:10, fill:'var(--text-3)' }} />
              <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} tickFormatter={v => `R$${v}`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt(v)} />
              <Line type="monotone" dataKey="gasto" stroke="var(--acc)" strokeWidth={2} dot={{ r:3, fill:'var(--acc)' }} name="Gasto" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Conversas por dia</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize:10, fill:'var(--text-3)' }} />
              <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="conversas" fill="var(--acc)" radius={[4,4,0,0]} name="Conversas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance table */}
      <div className="tbl-wrap" style={{ marginBottom:12 }}>
        <div style={{ padding:'10px 14px', background:'var(--s2)', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'var(--text-2)' }}>
            Performance — campanha / conjunto / criativo
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Conjunto</th>
              <th>Criativo</th>
              <th style={{ textAlign:'right' }}>Gasto</th>
              <th style={{ textAlign:'right' }}>Conversas</th>
              <th style={{ textAlign:'right' }}>Custo/conv.</th>
              <th>Eficiência</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((r,i) => {
              const cpc = r.msg > 0 ? r.spent/r.msg : null;
              const eff = r.msg/maxMsg;
              const effClass = eff > 0.6 ? 'badge-green' : eff > 0.2 ? 'badge-amber' : 'badge-red';
              const effLabel = eff > 0.6 ? 'alto' : eff > 0.2 ? 'médio' : 'baixo';
              return (
                <tr key={i}>
                  <td>{r.camp}</td>
                  <td className="td-muted">{r.cj}</td>
                  <td className="td-muted">{r.ad}</td>
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

      {/* DDD + Pizza */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div className="chart-card">
          <div className="chart-title">Origem dos leads por DDD <span style={{ color:'var(--warn)', fontSize:9 }}>mock</span></div>
          {DDD_MOCK.map((d,i) => {
            const max = DDD_MOCK[0].count;
            return (
              <div key={i} className="ddd-row">
                <span className="ddd-code">{d.ddd}</span>
                <span className="ddd-state">{d.estado}</span>
                <div className="ddd-track">
                  <div className="ddd-fill" style={{ width:`${(d.count/max)*100}%` }} />
                </div>
                <span className="ddd-count">{d.count}</span>
              </div>
            );
          })}
        </div>

        <div className="chart-card">
          <div className="chart-title">Conversas por campanha</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={campPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                {campPie.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v} conversas`]} />
              <Legend iconSize={10} wrapperStyle={{ fontSize:11, color:'var(--text-2)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
