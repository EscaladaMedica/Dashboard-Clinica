import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLeadsByStage, useKommoSummary } from '../hooks/useKommo';
import { fmt } from '../data';

const TT_STYLE = {
  backgroundColor: 'var(--s2)',
  border: '1px solid var(--border2)',
  borderRadius: 8,
  fontSize: 11,
  color: 'var(--text)',
};

function Spinner({ progress }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <div className="spinner-text">
        {progress
          ? `Carregando conversas — pág. ${progress.page} (${progress.count} carregadas)`
          : 'Carregando Kommo...'}
      </div>
    </div>
  );
}

function SectionHead({ children }) {
  return (
    <div className="sec-head">
      <div className="sec-line-l" />
      <span className="sec-title">{children}</span>
      <div className="sec-line-r" />
    </div>
  );
}

function StatCard({ variant, icon, num, label, sub, delay = 0, limited }) {
  return (
    <div className={`stat-card sc-${variant} fade-up`} style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-num">{num ?? 0}</div>
      <div className="stat-lbl">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {limited && (
        <div style={{
          marginTop: 8, fontSize: 9, color: 'var(--warn)',
          background: 'var(--warn-dim)', border: '1px solid rgba(255,140,0,0.25)',
          borderRadius: 5, padding: '2px 6px', fontWeight: 600,
        }}>
          ⚠ sem filtro de data
        </div>
      )}
    </div>
  );
}

function LimitationNote({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', marginBottom: 16,
      background: 'rgba(255,140,0,0.07)', border: '1px solid rgba(255,140,0,0.25)',
      borderRadius: 10, fontSize: 11, color: 'var(--warn)',
    }}>
      <span style={{ flexShrink: 0, fontSize: 13 }}>⚠</span>
      <span>{children}</span>
    </div>
  );
}

function PipelineCard({ name, stages }) {
  const total = stages.reduce((s, x) => s + x.count, 0);
  const max   = Math.max(...stages.map(s => s.count), 1);
  return (
    <div className="pipeline-card">
      <div className="pipeline-header">
        <span className="pipeline-name">{name}</span>
        <span className="pipeline-count">{total} leads</span>
      </div>
      {total === 0
        ? <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>Nenhum lead neste período.</div>
        : stages.map((stage, i) => {
            const pct    = (stage.count / max) * 100;
            const active = stage.count > 0;
            return (
              <div key={i} className={`stage-row${active ? '' : ' dim'}`}>
                <div className="stage-meta">
                  <span className="stage-name">
                    {stage.name}
                    {stage.isConversion && (
                      <span style={{
                        marginLeft: 6, fontSize: 9, fontWeight: 700,
                        background: 'rgba(34,217,138,0.15)', color: 'var(--green)',
                        border: '1px solid rgba(34,217,138,0.35)',
                        borderRadius: 4, padding: '1px 5px', verticalAlign: 'middle',
                      }}>CONVERSÃO</span>
                    )}
                  </span>
                  <span className="stage-val">
                    {active ? `${stage.count}${stage.value > 0 ? ` · ${fmt(stage.value)}` : ''}` : '—'}
                  </span>
                </div>
                <div className="stage-track">
                  <div
                    className="stage-fill"
                    style={{
                      width: `${pct}%`,
                      minWidth: active ? 4 : 0,
                      ...(stage.isConversion ? { background: 'var(--green)' } : {}),
                    }}
                  />
                </div>
              </div>
            );
          })
      }
    </div>
  );
}

export default function TabComercial({ dateFrom, dateTo }) {
  const [activeTab, setActiveTab] = useState('Todos');
  const { stages, loading: lS, error: eS } = useLeadsByStage(dateFrom, dateTo);
  const { summary, loading: lM, error: eM, talkProgress, talksLimited } = useKommoSummary(dateFrom, dateTo);

  const isLoading = lS || lM;
  const error     = eS || eM;

  const byPipeline = {};
  stages.forEach(s => {
    if (!byPipeline[s.pipeline]) byPipeline[s.pipeline] = [];
    byPipeline[s.pipeline].push(s);
  });
  const pipelines = Object.keys(byPipeline);
  const visible   = activeTab === 'Todos' ? pipelines : pipelines.filter(p => p === activeTab);

  return (
    <div>
      {isLoading && <Spinner progress={talkProgress} />}

      {error && (
        <div className="info-note" style={{ marginBottom: 20 }}>
          <span>⚠</span>
          <span>Erro ao conectar com Kommo: {error}</span>
        </div>
      )}

      {!isLoading && summary && (
        <>
          {/* Conversas — só exibe se o endpoint estiver acessível */}
          {!summary.talksErr && (
            <div style={{ marginBottom: 28 }}>
              <SectionHead>Conversas em tempo real</SectionHead>
              <LimitationNote>
                A API do Kommo não suporta filtro de data para conversas. Os números abaixo refletem o estado atual do CRM independente do período selecionado.
              </LimitationNote>
              <div className="stat-strip">
                <StatCard variant="blue" icon="💬" num={(summary.talksTotal  || 0).toLocaleString('pt-BR')} label="Conversas ativas"  sub="total atual no CRM"     delay={0}   limited />
                <StatCard variant="acc"  icon="⚡" num={(summary.talksInWork || 0).toLocaleString('pt-BR')} label="Em atendimento"   sub="em andamento agora"     delay={60}  limited />
                <StatCard variant="red"  icon="📩" num={(summary.talksUnread || 0).toLocaleString('pt-BR')} label="Não lidas"        sub="aguardando resposta"    delay={120} limited />
              </div>
            </div>
          )}

          {/* Leads */}
          <div style={{ marginBottom: 28 }}>
            <SectionHead>Leads no período selecionado</SectionHead>
            <div className="stat-strip">
              <StatCard variant="acc"  icon="👤" num={summary.totalLeads}  label="Total de leads"    sub="criados no período"      delay={0} />
              <StatCard variant="blue" icon="🔄" num={summary.activeLeads} label="Leads ativos"      sub="em andamento"            delay={60} />
              <StatCard variant="safe" icon="✅" num={summary.wonLeads}    label="Leads ganhos"      sub={summary.wonValue > 0 ? fmt(summary.wonValue) : '—'} delay={120} />
              <StatCard variant="red"  icon="❌" num={summary.lostLeads}   label="Leads perdidos"    sub="no período"              delay={180} />
              <StatCard variant="pur"  icon="💰" num={summary.totalValue > 0 ? fmt(summary.totalValue) : '—'} label="Valor em pipeline" sub="soma total" delay={240} />
            </div>
          </div>
        </>
      )}

      {/* Funil por pipeline */}
      {!isLoading && pipelines.length > 0 && (
        <div>
          <SectionHead>Funil por pipeline</SectionHead>
          <div className="pills">
            {['Todos', ...pipelines].map(p => (
              <button key={p} className={`pill${activeTab === p ? ' active' : ''}`} onClick={() => setActiveTab(p)}>
                {p}
              </button>
            ))}
          </div>
          {visible.map(pipeline => (
            <PipelineCard key={pipeline} name={pipeline} stages={byPipeline[pipeline]} />
          ))}
        </div>
      )}

      {!isLoading && stages.length === 0 && !error && (
        <div className="info-note">
          <span>ℹ</span>
          <span>Nenhum lead encontrado no período selecionado.</span>
        </div>
      )}
    </div>
  );
}
