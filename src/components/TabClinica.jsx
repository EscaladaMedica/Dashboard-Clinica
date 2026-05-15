import React, { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MetricCard, SectionLabel, Card, CardTitle, Badge, DataTable, DddBars, InfoNote } from './UI';
import { filterByPeriod, fmt, GOLD, BLUE, GREEN, RED, CHART_COLORS, DDD_MOCK } from '../data';

const CAMP_LABEL_MAP = {
  "Gr - Leads/whats - 26/09": "Leads/WhatsApp",
  "GR - Leads - wpp - 27/03": "Leads/wpp mar",
  "FK | [TRÁFEGO] - Visitas ao Perfil": "Visitas Perfil",
};

function shortCamp(name) {
  return CAMP_LABEL_MAP[name] || name.split(' - ')[0];
}

export default function TabClinica({ period }) {
  const data = useMemo(() => filterByPeriod(
    require('../data').CLINICA_RAW, period
  ), [period]);

  const totalSpent = useMemo(() => data.reduce((s, d) => s + d.spent, 0), [data]);
  const totalMsg   = useMemo(() => data.reduce((s, d) => s + d.msg, 0), [data]);
  const avgCpm     = useMemo(() => data.length ? data.reduce((s, d) => s + d.cpm, 0) / data.length : 0, [data]);
  const cpl        = totalMsg > 0 ? totalSpent / totalMsg : null;

  // Dados por dia
  const days = useMemo(() => [...new Set(data.map((d) => d.day))].sort(), [data]);
  const dailyData = useMemo(() => days.map((day) => {
    const rows = data.filter((d) => d.day === day);
    return {
      label: day.slice(5).replace('-', '/'),
      gasto: +rows.reduce((s, d) => s + d.spent, 0).toFixed(2),
      conversas: rows.reduce((s, d) => s + d.msg, 0),
    };
  }), [days, data]);

  // Agrupamento campanha > conjunto > criativo
  const grouped = useMemo(() => {
    const map = {};
    data.forEach((d) => {
      const key = `${d.camp}||${d.cj}||${d.ad}`;
      if (!map[key]) map[key] = { camp: d.camp, cj: d.cj, ad: d.ad, spent: 0, msg: 0 };
      map[key].spent += d.spent;
      map[key].msg   += d.msg;
    });
    return Object.values(map).sort((a, b) => b.msg - a.msg);
  }, [data]);

  const maxMsg = useMemo(() => Math.max(...grouped.map((r) => r.msg), 1), [grouped]);

  // Pizza por campanha
  const campPie = useMemo(() => {
    const map = {};
    data.forEach((d) => {
      const k = shortCamp(d.camp);
      map[k] = (map[k] || 0) + d.msg;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  const tableColumns = [
    { key: 'camp', label: 'Campanha' },
    { key: 'cj', label: 'Conjunto', muted: true },
    { key: 'ad', label: 'Criativo', muted: true },
    { key: 'spent', label: 'Gasto', align: 'right' },
    { key: 'msg', label: 'Conversas', align: 'right' },
    { key: 'cpm', label: 'CPM médio', align: 'right' },
    { key: 'cpc', label: 'Custo/conv.', align: 'right' },
    { key: 'eff', label: 'Eficiência' },
  ];

  const tableRows = grouped.map((r) => {
    const cpc = r.msg > 0 ? r.spent / r.msg : null;
    const eff = r.msg / maxMsg;
    const effType = eff > 0.6 ? 'green' : eff > 0.2 ? 'amber' : 'red';
    const effLabel = eff > 0.6 ? 'alto' : eff > 0.2 ? 'médio' : 'baixo';
    return {
      camp: r.camp,
      cj: r.cj,
      ad: r.ad,
      spent: fmt(r.spent),
      msg: r.msg,
      cpm: fmt(avgCpm),
      cpc: cpc ? fmt(cpc) : '—',
      eff: <Badge type={effType}>{effLabel}</Badge>,
    };
  });

  return (
    <div>
      <SectionLabel>Tráfego pago — clínica</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
        <MetricCard label="Investimento total" value={fmt(totalSpent)} sub={`${data.length} linhas no período`} highlight />
        <MetricCard label="Conversas iniciadas" value={totalMsg} sub="mensagens whatsapp" />
        <MetricCard label="CPM médio" value={fmt(avgCpm)} sub="custo por mil impressões" />
        <MetricCard label="Custo por conversa" value={cpl ? fmt(cpl) : '—'} sub="investimento / conversas" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardTitle>Investimento diário</CardTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,146,42,0.1)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8c7a6a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8c7a6a' }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v) => fmt(v)} labelStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="gasto" stroke={GOLD} strokeWidth={2} dot={{ r: 3 }} name="Gasto" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>Conversas por dia</CardTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,146,42,0.1)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8c7a6a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8c7a6a' }} />
              <Tooltip labelStyle={{ fontSize: 11 }} />
              <Bar dataKey="conversas" fill={GOLD} radius={[3, 3, 0, 0]} name="Conversas" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardTitle>Performance por campanha, conjunto e criativo</CardTitle>
        <DataTable columns={tableColumns} rows={tableRows} />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardTitle>Origem dos leads por DDD</CardTitle>
          <InfoNote>DDD simulado — aguardando integração com Tintim via Make</InfoNote>
          <div style={{ marginTop: 14 }}>
            <DddBars data={DDD_MOCK} />
          </div>
        </Card>

        <Card>
          <CardTitle>Conversas por campanha</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={campPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                {campPie.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} conversas`]} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
