import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MetricCard, SectionLabel, Card, CardTitle, Badge, DataTable, InfoNote } from './UI';
import { COMERCIAL_MOCK, fmt, GOLD, BLUE, GREEN, CHART_COLORS } from '../data';

export default function TabComercial({ period }) {
  const d = COMERCIAL_MOCK[period] || COMERCIAL_MOCK.month;

  const convPct = Math.round((d.planos / d.agendadas) * 100);
  const realizadoPct = Math.round((d.realizadas / d.agendadas) * 100);

  const agendDailyData = d.dias.map((dia, i) => ({
    label: dia,
    agendamentos: d.agendsPerDay[i],
  }));

  const closerTableCols = [
    { key: 'name', label: 'Closer' },
    { key: 'agend', label: 'Agendamentos', align: 'right' },
    { key: 'planos', label: 'Planos', align: 'right' },
    { key: 'conv', label: 'Conversão', align: 'right' },
    { key: 'receita', label: 'Receita', align: 'right' },
  ];

  const closerRows = d.closers.map((c) => {
    const pct = Math.round((c.planos / c.agend) * 100);
    const badgeType = pct >= 50 ? 'green' : pct >= 30 ? 'amber' : 'red';
    return {
      name: c.name,
      agend: c.agend,
      planos: c.planos,
      conv: <Badge type={badgeType}>{pct}%</Badge>,
      receita: fmt(c.receita),
    };
  });

  const closerBarData = d.closers.map((c) => ({
    name: c.name.split(' ')[0],
    Agendamentos: c.agend,
    Planos: c.planos,
  }));

  const medicoPieData = d.medicos.map((m) => ({ name: m.name, value: m.consultas }));

  return (
    <div>
      <SectionLabel>Pipeline comercial — clínica</SectionLabel>

      <InfoNote>
        Dados simulados para validação do layout. Integração real via Make + Kommo em andamento.
      </InfoNote>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, margin: '20px 0' }}>
        <MetricCard label="Consultas agendadas" value={d.agendadas} sub="no período" highlight />
        <MetricCard label="Consultas realizadas" value={`${d.realizadas} (${realizadoPct}%)`} sub="das agendadas" />
        <MetricCard label="Planos fechados" value={d.planos} sub="no período" />
        <MetricCard label="Agend. → plano" value={`${convPct}%`} sub="taxa de conversão" />
        <MetricCard label="Ticket médio" value={fmt(d.ticket)} sub="por plano fechado" />
        <MetricCard label="Receita fechada" value={`R$ ${d.receita.toLocaleString('pt-BR')}`} sub="total do período" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardTitle>Agendamentos por closer</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={closerBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,146,42,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8c7a6a' }} />
              <YAxis tick={{ fontSize: 11, fill: '#8c7a6a' }} />
              <Tooltip labelStyle={{ fontSize: 11 }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Agendamentos" fill="rgba(200,146,42,0.4)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Planos" fill={GOLD} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>Consultas por médico</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={medicoPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                {medicoPieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} consultas`]} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardTitle>Agendamentos por dia</CardTitle>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={agendDailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,146,42,0.1)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8c7a6a' }} />
            <YAxis tick={{ fontSize: 10, fill: '#8c7a6a' }} allowDecimals={false} />
            <Tooltip labelStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="agendamentos" stroke={GOLD} strokeWidth={2} dot={{ r: 4 }} name="Agendamentos" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardTitle>Desempenho por closer</CardTitle>
        <DataTable columns={closerTableCols} rows={closerRows} />
      </Card>
    </div>
  );
}
