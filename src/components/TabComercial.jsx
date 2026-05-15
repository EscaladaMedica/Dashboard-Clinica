import React, { useState } from 'react';
import { SectionLabel, Card, CardTitle, InfoNote } from './UI';
import { useLeadsByStage, useKommoSummary } from '../hooks/useKommo';
import { fmt } from '../data';

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', color:'#8c7a6a', fontSize:13, gap:10 }}>
      <div style={{ width:18, height:18, border:'2px solid rgba(200,146,42,0.2)', borderTop:'2px solid #c8922a', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      Carregando dados do Kommo...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MetricCard({ label, value, sub, highlight }) {
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(200,146,42,0.15)',
      borderRadius: 10,
      padding: '16px 18px',
      borderTop: highlight ? '2px solid #c8922a' : undefined,
    }}>
      <div style={{ fontSize: 11, color: '#8c7a6a', marginBottom: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: '#1a1209', fontFamily: "'Playfair Display', serif", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#8c7a6a', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function PipelineFunnel({ name, stages }) {
  const withLeads = stages.filter(s => s.count > 0);
  const total = stages.reduce((s, x) => s + x.count, 0);
  const max = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <CardTitle>{name}</CardTitle>
        <span style={{ fontSize: 12, color: '#8c7a6a' }}>{total} leads no período</span>
      </div>

      {total === 0 ? (
        <div style={{ fontSize: 12, color: '#8c7a6a', padding: '8px 0' }}>Nenhum lead neste pipeline no período selecionado.</div>
      ) : (
        <div>
          {stages.map((stage, i) => {
            const pct = max > 0 ? (stage.count / max) * 100 : 0;
            const isActive = stage.count > 0;
            return (
              <div key={i} style={{ marginBottom: 10, opacity: isActive ? 1 : 0.4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                  <span style={{ color: isActive ? '#1a1209' : '#8c7a6a', fontWeight: isActive ? 500 : 400 }}>{stage.name}</span>
                  <span style={{ color: '#8c7a6a', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                    {stage.count > 0 ? `${stage.count} leads${stage.value > 0 ? ` · ${fmt(stage.value)}` : ''}` : '—'}
                  </span>
                </div>
                <div style={{ height: 8, background: '#faf8f4', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: '#c8922a',
                    borderRadius: 99,
                    transition: 'width 0.6s ease',
                    minWidth: stage.count > 0 ? 4 : 0,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

const PIPELINE_TABS = ['Todos', 'Leads Tráfego - Wpp Thaiza', 'Funil Thaiza', 'Lead Orgânico - IG Morena', 'Webnar'];

export default function TabComercial({ dateFrom, dateTo }) {
  const [activeTab, setActiveTab] = useState('Todos');
  const { stages, loading: lS, error: eS } = useLeadsByStage(dateFrom, dateTo);
  const { summary, loading: lM, error: eM } = useKommoSummary(dateFrom, dateTo);

  const isLoading = lS || lM;
  const error = eS || eM;

  // Agrupa etapas por pipeline
  const byPipeline = {};
  stages.forEach(s => {
    if (!byPipeline[s.pipeline]) byPipeline[s.pipeline] = [];
    byPipeline[s.pipeline].push(s);
  });

  const pipelines = Object.keys(byPipeline);
  const visiblePipelines = activeTab === 'Todos' ? pipelines : pipelines.filter(p => p === activeTab);

  return (
    <div>
      <SectionLabel>Pipeline comercial — Kommo (ao vivo)</SectionLabel>

      {isLoading && <Spinner />}
      {error && <InfoNote>Erro ao conectar com Kommo: {error}</InfoNote>}

      {!isLoading && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
          <MetricCard label="Total de leads" value={summary.totalLeads} sub="no período" highlight />
          <MetricCard label="Leads ativos" value={summary.activeLeads} sub="em andamento" />
          <MetricCard label="Leads ganhos" value={summary.wonLeads} sub={summary.wonValue > 0 ? fmt(summary.wonValue) : '—'} />
          <MetricCard label="Leads perdidos" value={summary.lostLeads} sub="no período" />
          <MetricCard label="Valor em pipeline" value={summary.totalValue > 0 ? fmt(summary.totalValue) : '—'} sub="soma de todos ativos" />
        </div>
      )}

      {!isLoading && pipelines.length > 0 && (
        <>
          {/* Seletor de pipeline */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {['Todos', ...pipelines].map(p => (
              <button key={p} onClick={() => setActiveTab(p)} style={{
                background: activeTab === p ? '#c8922a' : 'transparent',
                border: '0.5px solid rgba(200,146,42,0.3)',
                color: activeTab === p ? '#fff' : '#5c4a38',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: "'Jost', sans-serif",
                fontWeight: activeTab === p ? 500 : 400,
                transition: 'all 0.15s',
              }}>
                {p}
              </button>
            ))}
          </div>

          {visiblePipelines.map(pipeline => (
            <PipelineFunnel key={pipeline} name={pipeline} stages={byPipeline[pipeline]} />
          ))}
        </>
      )}

      {!isLoading && stages.length === 0 && !error && (
        <InfoNote>Nenhum lead encontrado no período selecionado.</InfoNote>
      )}
    </div>
  );
}
