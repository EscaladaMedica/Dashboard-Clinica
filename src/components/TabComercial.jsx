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

function BigCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(200,146,42,0.15)',
      borderRadius: 12,
      padding: '20px 22px',
      borderLeft: `3px solid ${color || '#c8922a'}`,
    }}>
      <div style={{ fontSize: 11, color: '#8c7a6a', marginBottom: 8, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 600, color: '#1a1209', fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#8c7a6a', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function PipelineFunnel({ name, stages }) {
  const total = stages.reduce((s, x) => s + x.count, 0);
  const max   = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <CardTitle>{name}</CardTitle>
        <span style={{ fontSize:12, color:'#8c7a6a' }}>{total} leads no período</span>
      </div>
      {total === 0 ? (
        <div style={{ fontSize:12, color:'#8c7a6a', padding:'8px 0' }}>Nenhum lead neste pipeline no período.</div>
      ) : (
        stages.map((stage, i) => {
          const pct = (stage.count / max) * 100;
          const isActive = stage.count > 0;
          return (
            <div key={i} style={{ marginBottom:10, opacity: isActive ? 1 : 0.35 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:12 }}>
                <span style={{ color: isActive ? '#1a1209' : '#8c7a6a', fontWeight: isActive ? 500 : 400 }}>{stage.name}</span>
                <span style={{ color:'#8c7a6a', fontSize:11, fontVariantNumeric:'tabular-nums' }}>
                  {stage.count > 0 ? `${stage.count} leads${stage.value > 0 ? ` · ${fmt(stage.value)}` : ''}` : '—'}
                </span>
              </div>
              <div style={{ height:8, background:'#faf8f4', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:'#c8922a', borderRadius:99, transition:'width 0.6s ease', minWidth: stage.count > 0 ? 4 : 0 }} />
              </div>
            </div>
          );
        })
      )}
    </Card>
  );
}

export default function TabComercial({ dateFrom, dateTo }) {
  const [activeTab, setActiveTab] = useState('Todos');
  const { stages, loading: lS, error: eS } = useLeadsByStage(dateFrom, dateTo);
  const { summary, loading: lM, error: eM } = useKommoSummary(dateFrom, dateTo);

  const isLoading = lS || lM;
  const error     = eS || eM;

  const byPipeline = {};
  stages.forEach(s => {
    if (!byPipeline[s.pipeline]) byPipeline[s.pipeline] = [];
    byPipeline[s.pipeline].push(s);
  });
  const pipelines = Object.keys(byPipeline);
  const visiblePipelines = activeTab === 'Todos' ? pipelines : pipelines.filter(p => p === activeTab);

  return (
    <div>
      <SectionLabel>Visão geral — Kommo (ao vivo)</SectionLabel>

      {isLoading && <Spinner />}
      {error && <InfoNote>Erro ao conectar com Kommo: {error}</InfoNote>}

      {!isLoading && summary && (
        <>
          {/* Bloco 1 — Conversas */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8c7a6a', marginBottom: 10 }}>Conversas</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:24 }}>
              <BigCard label="Conversas ativas" value={summary.talksTotal} sub="total no CRM" color="#185FA5" icon="💬" />
              <BigCard label="Em atendimento" value={summary.talksInWork} sub="em andamento agora" color="#c8922a" icon="⚡" />
              <BigCard label="Não lidas" value={summary.talksUnread} sub="aguardando resposta" color="#A32D2D" icon="📩" />
            </div>
          </div>

          {/* Bloco 2 — Leads */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8c7a6a', marginBottom: 10 }}>Leads no período</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:24 }}>
              <BigCard label="Total de leads" value={summary.totalLeads} sub="criados no período" color="#c8922a" icon="👤" />
              <BigCard label="Leads ativos" value={summary.activeLeads} sub="em andamento" color="#3B6D11" icon="🔄" />
              <BigCard label="Leads ganhos" value={summary.wonLeads} sub={summary.wonValue > 0 ? fmt(summary.wonValue) : 'sem valor registrado'} color="#3B6D11" icon="✅" />
              <BigCard label="Leads perdidos" value={summary.lostLeads} sub="no período" color="#A32D2D" icon="❌" />
              <BigCard label="Valor em pipeline" value={summary.totalValue > 0 ? fmt(summary.totalValue) : '—'} sub="soma total dos leads" color="#534AB7" icon="💰" />
            </div>
          </div>
        </>
      )}

      {/* Funil por pipeline */}
      {!isLoading && pipelines.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8c7a6a', marginBottom: 10 }}>Funil por pipeline</div>
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
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
              }}>{p}</button>
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
