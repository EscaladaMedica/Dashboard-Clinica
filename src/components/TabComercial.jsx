import React, { useState } from 'react';
import { InfoNote } from './UI';
import { useLeadsByStage, useKommoSummary } from '../hooks/useKommo';
import { fmt } from '../data';

function Spinner({ progress }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 0', gap:12 }}>
      <div style={{ width:20, height:20, border:'2px solid var(--border)', borderTop:`2px solid var(--gold)`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:12, color:'var(--text-muted)' }}>
        {progress ? `Carregando conversas — página ${progress.page} (${progress.count} carregadas)` : 'Carregando dados do Kommo...'}
      </div>
    </div>
  );
}

function BigCard({ label, value, sub, accent, delay = 0 }) {
  return (
    <div className="fade-up" style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '22px 24px',
      borderLeft: `3px solid ${accent}`,
      boxShadow: 'var(--shadow-card)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      animationDelay: `${delay}ms`,
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-gold)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
    >
      <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontSize:36, fontWeight:600, color:'var(--text-primary)', fontFamily:"'Playfair Display', serif", lineHeight:1, animation:'countUp 0.5s ease both', animationDelay:`${delay + 100}ms` }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8, borderTop:'0.5px solid var(--border)', paddingTop:8 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:12, paddingLeft:2, display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:20, height:1, background:'var(--gold)', opacity:0.5 }} />
      {children}
      <div style={{ flex:1, height:1, background:'var(--border)' }} />
    </div>
  );
}

function PipelineCard({ name, stages }) {
  const total = stages.reduce((s, x) => s + x.count, 0);
  const max   = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="fade-up" style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 22px',
      marginBottom: 12,
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)', fontFamily:"'Playfair Display', serif" }}>{name}</div>
        <div style={{ fontSize:11, color:'var(--text-muted)', background:'var(--bg-secondary)', padding:'3px 10px', borderRadius:99, border:'0.5px solid var(--border)' }}>
          {total} leads
        </div>
      </div>

      {total === 0 ? (
        <div style={{ fontSize:12, color:'var(--text-muted)', fontStyle:'italic' }}>Nenhum lead neste pipeline no período.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {stages.map((stage, i) => {
            const pct = (stage.count / max) * 100;
            const isActive = stage.count > 0;
            return (
              <div key={i} style={{ opacity: isActive ? 1 : 0.3, transition:'opacity 0.2s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
                  <span style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isActive ? 500 : 400 }}>
                    {stage.name}
                  </span>
                  <span style={{ color:'var(--text-muted)', fontSize:11, fontVariantNumeric:'tabular-nums' }}>
                    {isActive ? `${stage.count}${stage.value > 0 ? ` · ${fmt(stage.value)}` : ''}` : '—'}
                  </span>
                </div>
                <div style={{ height:6, background:'var(--bg-secondary)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{
                    height:'100%',
                    width:`${pct}%`,
                    background: `linear-gradient(90deg, var(--gold), #fdbe59)`,
                    borderRadius:99,
                    transition:'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                    boxShadow: isActive ? '0 0 8px rgba(200,146,42,0.4)' : 'none',
                    minWidth: isActive ? 4 : 0,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TabComercial({ dateFrom, dateTo }) {
  const [activeTab, setActiveTab] = useState('Todos');
  const { stages, loading: lS, error: eS } = useLeadsByStage(dateFrom, dateTo);
  const { summary, loading: lM, error: eM, talkProgress } = useKommoSummary(dateFrom, dateTo);

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
      {isLoading && <Spinner progress={talkProgress} />}
      {error && <InfoNote>Erro ao conectar com Kommo: {error}</InfoNote>}

      {!isLoading && summary && (
        <>
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Conversas em tempo real</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12 }}>
              <BigCard label="Conversas ativas" value={summary.talksTotal.toLocaleString('pt-BR')} sub="total no CRM" accent="#185FA5" delay={0} />
              <BigCard label="Em atendimento" value={summary.talksInWork.toLocaleString('pt-BR')} sub="em andamento agora" accent="#c8922a" delay={60} />
              <BigCard label="Não lidas" value={summary.talksUnread.toLocaleString('pt-BR')} sub="aguardando resposta" accent="#A32D2D" delay={120} />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Leads no período selecionado</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12 }}>
              <BigCard label="Total de leads" value={summary.totalLeads} sub="criados no período" accent="#c8922a" delay={0} />
              <BigCard label="Leads ativos" value={summary.activeLeads} sub="em andamento" accent="#3B6D11" delay={60} />
              <BigCard label="Leads ganhos" value={summary.wonLeads} sub={summary.wonValue > 0 ? fmt(summary.wonValue) : '—'} accent="#3B6D11" delay={120} />
              <BigCard label="Leads perdidos" value={summary.lostLeads} sub="no período" accent="#A32D2D" delay={180} />
              <BigCard label="Valor em pipeline" value={summary.totalValue > 0 ? fmt(summary.totalValue) : '—'} sub="soma total" accent="#534AB7" delay={240} />
            </div>
          </div>

          <div>
            <SectionTitle>Funil por pipeline</SectionTitle>
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              {['Todos', ...pipelines].map(p => (
                <button key={p} onClick={() => setActiveTab(p)} style={{
                  background: activeTab === p ? 'var(--gold)' : 'transparent',
                  border: `0.5px solid ${activeTab === p ? 'var(--gold)' : 'var(--border-strong)'}`,
                  color: activeTab === p ? '#fff' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 14px',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: "'Jost', sans-serif",
                  fontWeight: activeTab === p ? 500 : 400,
                  transition: 'all 0.15s',
                  boxShadow: activeTab === p ? '0 0 12px rgba(200,146,42,0.3)' : 'none',
                }}>{p}</button>
              ))}
            </div>
            {visiblePipelines.map(pipeline => (
              <PipelineCard key={pipeline} name={pipeline} stages={byPipeline[pipeline]} />
            ))}
          </div>
        </>
      )}

      {!isLoading && stages.length === 0 && !error && (
        <InfoNote>Nenhum lead encontrado no período selecionado.</InfoNote>
      )}
    </div>
  );
}
