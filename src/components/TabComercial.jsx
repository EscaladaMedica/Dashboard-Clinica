import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { MetricCard, SectionLabel, Card, CardTitle, InfoNote } from './UI';
import { useLeadsByStage, useKommoSummary } from '../hooks/useKommo';
import { fmt, GOLD } from '../data';

const STAGE_ORDER = [
  'PRIMEIRO INTERAÇÃO','CONEXÃO','DIAGNÓSTICO',
  'FOLLOW-UP 01','FOLLOW-UP 02','AGUARDANDO PAGAMENTO',
  'AGENDADO','CONSULTA REALIZADA',
];

function sortStages(stages) {
  return [...stages].sort((a, b) => {
    const ia = STAGE_ORDER.indexOf(a.name.toUpperCase());
    const ib = STAGE_ORDER.indexOf(b.name.toUpperCase());
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', color:'#8c7a6a', fontSize:13, gap:10 }}>
      <div style={{ width:18, height:18, border:'2px solid rgba(200,146,42,0.2)', borderTop:'2px solid #c8922a', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      Carregando dados do Kommo...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FunnelBar({ stage, max }) {
  const pct = max > 0 ? (stage.count / max) * 100 : 0;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
        <span style={{ color:'#5c4a38', fontWeight:500 }}>{stage.name}</span>
        <span style={{ color:'#8c7a6a', fontVariantNumeric:'tabular-nums' }}>
          {stage.count} leads{stage.value > 0 ? ` · ${fmt(stage.value)}` : ''}
        </span>
      </div>
      <div style={{ height:10, background:'#faf8f4', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:'#c8922a', borderRadius:99, transition:'width 0.6s ease', minWidth: stage.count > 0 ? 4 : 0 }} />
      </div>
    </div>
  );
}

export default function TabComercial({ dateFrom, dateTo }) {
  const { stages, loading: lS, error: eS } = useLeadsByStage(dateFrom, dateTo);
  const { summary, loading: lM, error: eM } = useKommoSummary(dateFrom, dateTo);

  const sorted   = sortStages(stages);
  const maxCount = sorted.length > 0 ? Math.max(...sorted.map(s => s.count), 1) : 1;
  const barData  = sorted.map(s => ({ name: s.name.length > 16 ? s.name.slice(0,16)+'…' : s.name, Leads: s.count }));
  const isLoading = lS || lM;
  const error     = eS || eM;

  return (
    <div>
      <SectionLabel>Pipeline comercial — Kommo (ao vivo)</SectionLabel>

      {isLoading && <Spinner />}

      {error && <InfoNote>Erro ao conectar com Kommo: {error}. Verifique KOMMO_TOKEN no Vercel.</InfoNote>}

      {!isLoading && summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10, marginBottom:24 }}>
          <MetricCard label="Total de leads" value={summary.totalLeads} sub="no período" highlight />
          <MetricCard label="Leads ativos" value={summary.activeLeads} sub="em andamento" />
          <MetricCard label="Leads ganhos" value={summary.wonLeads} sub={summary.wonValue > 0 ? fmt(summary.wonValue) : '—'} />
          <MetricCard label="Leads perdidos" value={summary.lostLeads} sub="no período" />
          <MetricCard label="Valor em pipeline" value={summary.totalValue > 0 ? fmt(summary.totalValue) : '—'} sub="soma de todos ativos" />
        </div>
      )}

      {!isLoading && sorted.length > 0 && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <Card>
              <CardTitle>Leads por etapa do funil</CardTitle>
              {sorted.map(s => <FunnelBar key={s.id} stage={s} max={maxCount} />)}
            </Card>

            <Card>
              <CardTitle>Volume por etapa</CardTitle>
              <ResponsiveContainer width="100%" height={Math.max(barData.length * 42 + 40, 220)}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,146,42,0.08)" />
                  <XAxis type="number" tick={{ fontSize:10, fill:'#8c7a6a' }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize:10, fill:'#5c4a38' }} width={120} />
                  <Tooltip labelStyle={{ fontSize:11 }} />
                  <Bar dataKey="Leads" fill={GOLD} radius={[0,4,4,0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card>
            <CardTitle>Detalhamento por etapa</CardTitle>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr>
                    {['Etapa','Pipeline','Leads','Valor total','% do total'].map((h,i) => (
                      <th key={i} style={{ textAlign: i > 1 ? 'right' : 'left', fontWeight:500, fontSize:11, color:'#8c7a6a', padding:'6px 10px', borderBottom:'0.5px solid rgba(200,146,42,0.15)', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s, i) => {
                    const total = sorted.reduce((acc, x) => acc + x.count, 0);
                    const pct   = total > 0 ? ((s.count / total) * 100).toFixed(1) : '0.0';
                    const border = i < sorted.length - 1 ? '0.5px solid rgba(200,146,42,0.08)' : 'none';
                    return (
                      <tr key={s.id} onMouseEnter={e => e.currentTarget.style.background='#faf8f4'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'8px 10px', fontWeight:500, color:'#1a1209', borderBottom:border }}>{s.name}</td>
                        <td style={{ padding:'8px 10px', color:'#8c7a6a', borderBottom:border }}>{s.pipeline}</td>
                        <td style={{ padding:'8px 10px', textAlign:'right', fontVariantNumeric:'tabular-nums', borderBottom:border }}>{s.count}</td>
                        <td style={{ padding:'8px 10px', textAlign:'right', fontVariantNumeric:'tabular-nums', color: s.value > 0 ? '#3B6D11' : '#8c7a6a', borderBottom:border }}>{s.value > 0 ? fmt(s.value) : '—'}</td>
                        <td style={{ padding:'8px 10px', textAlign:'right', color:'#8c7a6a', borderBottom:border }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {!isLoading && sorted.length === 0 && !error && (
        <InfoNote>Nenhum lead encontrado no período selecionado.</InfoNote>
      )}
    </div>
  );
}
