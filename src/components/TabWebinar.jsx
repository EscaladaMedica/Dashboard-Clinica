import React, { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MetricCard, SectionLabel, Card, CardTitle, Badge, DataTable, InfoNote } from './UI';
import { filterByPeriod, fmt, GOLD, BLUE, CHART_COLORS } from '../data';

export default function TabWebinar({ period }) {
  const data = useMemo(() => filterByPeriod(
    require('../data').WEBINAR_RAW, period
  ), [period]);

  const totalSpent = useMemo(() => data.reduce((s, d) => s + d.spent, 0), [data]);
  const totalLpv   = useMemo(() => data.reduce((s, d) => s + d.lpv, 0), [data]);
  const avgCpm     = useMemo(() => data.length ? data.reduce((s, d) => s + d.cpm, 0) / data.length : 0, [data]);
  const cpl        = totalLpv > 0 ? totalSpent / totalLpv : null;

  const days = useMemo(() => [...new Set(data.map((d) => d.day))].sort(), [data]);

  const dailyData = useMemo(() => days.map((day) => {
    const rows = data.filter((d) => d.day === day);
    return {
      label: day.slice(5).replace('-', '/'),
      gasto: +rows.reduce((s, d) => s + d.spent, 0).toFixed(2),
      leads: rows.reduce((s, d) => s + d.lpv, 0),
    };
  }), [days, data]);

  // Agrupamento por conjunto > criativo
  const grouped = useMemo(() => {
    const map = {};
    data.forEach((d) => {
      const key = `${d.cj}||${d.ad}`;
      if (!map[key]) map[key] = { cj: d.cj, ad: d.ad, spent: 0, lpv: 0, imp: 0 };
      map[key].spent += d.spent;
      map[key].lpv   += d.lpv;
      map[key].imp   += d.imp || 0;
    });
    return Object.values(map).sort((a, b) => b.lpv - a.lpv);
  }, [data]);

  const maxLpv = useMemo(() => Math.max(...grouped.map((r) => r.lpv), 1), [grouped]);

  // Leads por conjunto (barras)
  const cjMap = useMemo(() => {
    const map = {};
    data.forEach((d) => {
      const k = d.cj.split(' - ')[0];
      map[k] = (map[k] || 0) + d.lpv;
    });
    return Object.entries(map).map(([name, leads]) => ({ name, leads })).sort((a, b) => b.leads - a.leads);
  }, [data]);

  const tableColumns = [
    { key: 'cj', label: 'Conjunto', muted: true },
    { key: 'ad', label: 'Criativo' },
    { key: 'spent', label: 'Gasto', align: 'right' },
    { key: 'lpv', label: 'Leads (LPV)', align: 'right' },
    { key: 'cpm', label: 'CPM', align: 'right' },
    { key: 'cpl', label: 'CPL', align: 'right' },
    { key: 'eff', label: 'Eficiência' },
  ];

  const tableRows = grouped.map((r) => {
    const cplRow = r.lpv > 0 ? r.spent / r.lpv : null;
    const cpmRow = r.imp > 0 ? (r.spent / r.imp) * 1000 : null;
    const eff = r.lpv / maxLpv;
    const effType = eff > 0.6 ? 'green' : eff > 0.2 ? 'amber' : 'red';
    const effLabel = eff > 0.6 ? 'alto' : eff > 0.2 ? 'médio' : 'baixo';
    return {
      cj: r.cj,
      ad: r.ad,
      spent: fmt(r.spent),
      lpv: r.lpv,
      cpm: cpmRow ? fmt(cpmRow) : '—',
      cpl: cplRow ? fmt(cplRow) : '—',
      eff: <Badge type={effType}>{effLabel}</Badge>,
    };
  });

  return (
    <div>
      <SectionLabel>Tráfego pago — webinário</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
        <MetricCard label="Investimento total" value={fmt(totalSpent)} sub="período selecionado" highlight />
        <MetricCard label="Inscrições (leads)" value={totalLpv} sub="landing page views" />
        <MetricCard label="CPL webinário" value={cpl ? fmt(cpl) : '—'} sub="custo por lead" />
        <MetricCard label="CPM médio" value={fmt(avgCpm)} sub="custo por mil impressões" />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardTitle>Performance por criativo — webinário</CardTitle>
        <DataTable columns={tableColumns} rows={tableRows} />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardTitle>Investimento diário</CardTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,95,165,0.1)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8c7a6a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8c7a6a' }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v) => fmt(v)} labelStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="gasto" stroke={BLUE} strokeWidth={2} dot={{ r: 3 }} name="Gasto" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>Leads por conjunto de anúncios</CardTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cjMap} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,95,165,0.1)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#8c7a6a' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#8c7a6a' }} width={70} />
              <Tooltip labelStyle={{ fontSize: 11 }} />
              <Bar dataKey="leads" fill={BLUE} radius={[0, 3, 3, 0]} name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <InfoNote>
        Dados de qualidade de lead (qualificação, renda, escala de incômodo) aguardando integração com Kommo via Make.
      </InfoNote>
    </div>
  );
}
