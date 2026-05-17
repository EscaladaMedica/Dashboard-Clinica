import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  fetchSheetData, normalizeRow, isWebinar, filterByDateRange,
  fmt, fmtDay, CHART_COLORS,
} from '../data';
import { useWebinarLeads } from '../hooks/useKommo';

const TT_STYLE = {
  backgroundColor: 'var(--s2)',
  border: '1px solid var(--border2)',
  borderRadius: 8,
  fontSize: 11,
  color: 'var(--text)',
};

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

function parseRenda(str) {
  if (!str) return 0;
  const n = parseFloat(str.replace(/[^\d,]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function rendaFaixa(val) {
  if (val <= 0)      return 'Não informado';
  if (val < 3000)    return 'Até R$3k';
  if (val < 5000)    return 'R$3k–5k';
  if (val < 10000)   return 'R$5k–10k';
  if (val < 20000)   return 'R$10k–20k';
  return 'Acima R$20k';
}

const FAIXA_ORDER = ['Até R$3k','R$3k–5k','R$5k–10k','R$10k–20k','Acima R$20k','Não informado'];

export default function TabWebinar({ startDate, endDate, dateFrom, dateTo }) {
  // ── Dados de tráfego da planilha ──
  const [rawTrafico, setRawTrafico] = useState([]);
  const [loadingTrafico, setLoadingTrafico] = useState(true);
  const [errorTrafico, setErrorTrafico]     = useState(null);

  useEffect(() => {
    setLoadingTrafico(true);
    fetchSheetData()
      .then(rows => {
        setRawTrafico(rows.map(normalizeRow).filter(r => isWebinar(r.camp) && r.spent > 0));
        setLoadingTrafico(false);
      })
      .catch(e => { setErrorTrafico(e.message); setLoadingTrafico(false); });
  }, []);

  const trafico = useMemo(() => filterByDateRange(rawTrafico, startDate, endDate), [rawTrafico, startDate, endDate]);

  // ── Dados de leads do Kommo ──
  const { leads: kommoLeads, loading: loadingLeads, error: errorLeads } = useWebinarLeads(dateFrom, dateTo);

  // ── Métricas de tráfego ──
  const totalSpent = useMemo(() => trafico.reduce((s, d) => s + d.spent, 0), [trafico]);
  const totalLpv   = useMemo(() => trafico.reduce((s, d) => s + d.lpv, 0), [trafico]);
  const totalForms = useMemo(() => trafico.reduce((s, d) => s + d.forms, 0), [trafico]);
  const avgCpm     = useMemo(() => trafico.length ? trafico.reduce((s, d) => s + d.cpm, 0) / trafico.length : 0, [trafico]);
  const cpl        = totalLpv > 0 ? totalSpent / totalLpv : null;

  const days = useMemo(() => [...new Set(trafico.map(d => d.day))].sort(), [trafico]);
  const dailyData = useMemo(() => days.map(day => {
    const rows = trafico.filter(d => d.day === day);
    return {
      label: fmtDay(day),
      gasto: +rows.reduce((s, d) => s + d.spent, 0).toFixed(2),
      leads: rows.reduce((s, d) => s + d.lpv, 0),
    };
  }), [days, trafico]);

  // ── Métricas de qualificação ──
  const qualStats = useMemo(() => {
    const total         = kommoLeads.length;
    const qualificados  = kommoLeads.filter(l => l.qualificacao === 'Qualificado').length;
    const desqualif     = kommoLeads.filter(l => l.qualificacao === 'Desqualificado').length;
    const semQualif     = kommoLeads.filter(l => !l.qualificacao).length;
    const taxaQual      = total > 0 ? Math.round((qualificados / total) * 100) : 0;

    // Renda por faixa
    const faixaMap = {};
    kommoLeads.forEach(l => {
      const val   = parseRenda(l.renda);
      const faixa = rendaFaixa(val);
      faixaMap[faixa] = (faixaMap[faixa] || 0) + 1;
    });
    const rendaData = FAIXA_ORDER
      .filter(f => faixaMap[f])
      .map(f => ({ name: f, value: faixaMap[f] }));

    // Escala de incômodo
    const escalaMap = {};
    kommoLeads.forEach(l => {
      if (l.escala) escalaMap[l.escala] = (escalaMap[l.escala] || 0) + 1;
    });
    const escalaData = Object.entries(escalaMap)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([name, value]) => ({ name: `Escala ${name}`, value }));

    // Top incômodos
    const incomodoMap = {};
    kommoLeads.forEach(l => {
      if (l.o_que_incomoda) {
        const key = l.o_que_incomoda.slice(0, 40);
        incomodoMap[key] = (incomodoMap[key] || 0) + 1;
      }
    });
    const topIncomodos = Object.entries(incomodoMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    return { total, qualificados, desqualif, semQualif, taxaQual, rendaData, escalaData, topIncomodos };
  }, [kommoLeads]);

  const grouped = useMemo(() => {
    const map = {};
    trafico.forEach(d => {
      const key = `${d.cj}||${d.ad}`;
      if (!map[key]) map[key] = { cj: d.cj, ad: d.ad, spent: 0, lpv: 0 };
      map[key].spent += d.spent;
      map[key].lpv   += d.lpv;
    });
    return Object.values(map).sort((a, b) => b.lpv - a.lpv || b.spent - a.spent);
  }, [trafico]);

  const maxLpv = Math.max(...grouped.map(r => r.lpv), 1);

  return (
    <div>
      {/* ── TRÁFEGO ── */}
      <SectionHead>Tráfego pago — webinário</SectionHead>

      {loadingTrafico ? (
        <div className="spinner-wrap"><div className="spinner" /><div className="spinner-text">Carregando dados da planilha...</div></div>
      ) : errorTrafico ? (
        <div className="info-note"><span>⚠</span><span>Erro ao carregar planilha: {errorTrafico}</span></div>
      ) : (
        <>
          <div className="stat-strip" style={{ marginBottom: 24 }}>
            <StatCard variant="acc"  icon="💸" num={fmt(totalSpent)}       label="Investimento total"   sub="período selecionado"   delay={0} />
            <StatCard variant="blue" icon="📋" num={totalLpv}              label="Leads (LPV)"          sub="landing page views"    delay={60} />
            <StatCard variant="safe" icon="📝" num={totalForms}            label="Formulários"          sub="leads via form nativo" delay={120} />
            <StatCard variant="warn" icon="🎯" num={cpl ? fmt(cpl) : '—'} label="CPL"                  sub="custo por lead"        delay={180} />
            <StatCard variant="pur"  icon="📊" num={fmt(avgCpm)}           label="CPM médio"            sub="custo por mil imp."    delay={240} />
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
                  <Line type="monotone" dataKey="gasto" stroke="var(--blue)" strokeWidth={2} dot={false} name="Gasto" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-title">Leads por dia</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-3)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Bar dataKey="leads" fill="var(--blue)" radius={[3, 3, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="tbl-wrap" style={{ marginBottom: 24 }}>
            <div style={{ padding: '10px 14px', background: 'var(--s2)', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-2)' }}>
                Performance por conjunto e criativo
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Conjunto</th>
                    <th>Criativo</th>
                    <th style={{ textAlign: 'right' }}>Gasto</th>
                    <th style={{ textAlign: 'right' }}>Leads</th>
                    <th style={{ textAlign: 'right' }}>CPL</th>
                    <th>Eficiência</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((r, i) => {
                    const cplRow   = r.lpv > 0 ? r.spent / r.lpv : null;
                    const eff      = r.lpv / maxLpv;
                    const effClass = eff > 0.6 ? 'badge-green' : eff > 0.2 ? 'badge-amber' : 'badge-red';
                    const effLabel = eff > 0.6 ? 'alto' : eff > 0.2 ? 'médio' : 'baixo';
                    return (
                      <tr key={i}>
                        <td className="td-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cj}</td>
                        <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ad}</td>
                        <td className="td-num">{fmt(r.spent)}</td>
                        <td className="td-num">{r.lpv}</td>
                        <td className="td-num">{cplRow ? fmt(cplRow) : '—'}</td>
                        <td><span className={`badge ${effClass}`}>{effLabel}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── QUALIFICAÇÃO DE LEADS (KOMMO) ── */}
      <SectionHead>Qualificação de leads — Kommo</SectionHead>

      {loadingLeads ? (
        <div className="spinner-wrap"><div className="spinner" /><div className="spinner-text">Carregando leads do Kommo...</div></div>
      ) : errorLeads ? (
        <div className="info-note" style={{ marginBottom: 16 }}><span>⚠</span><span>Erro ao carregar leads do Kommo: {errorLeads}</span></div>
      ) : kommoLeads.length === 0 ? (
        <div className="info-note" style={{ marginBottom: 16 }}><span>ℹ</span><span>Nenhum lead no pipeline do webinário no período selecionado.</span></div>
      ) : (
        <>
          {/* Cards de qualificação */}
          <div className="stat-strip" style={{ marginBottom: 24 }}>
            <StatCard variant="acc"  icon="👥" num={qualStats.total}        label="Total de leads"     sub="no pipeline webinário"   delay={0} />
            <StatCard variant="safe" icon="✅" num={qualStats.qualificados} label="Qualificados"       sub={`${qualStats.taxaQual}% do total`} delay={60} />
            <StatCard variant="red"  icon="❌" num={qualStats.desqualif}    label="Desqualificados"    sub="fora do perfil"          delay={120} />
            <StatCard variant="warn" icon="❓" num={qualStats.semQualif}    label="Sem qualificação"   sub="aguardando triagem"      delay={180} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {/* Renda por faixa */}
            {qualStats.rendaData.length > 0 && (
              <div className="chart-card">
                <div className="chart-title">Distribuição por renda</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={qualStats.rendaData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-3)' }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={80} />
                    <Tooltip contentStyle={TT_STYLE} />
                    <Bar dataKey="value" fill="var(--acc)" radius={[0, 3, 3, 0]} name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Escala de incômodo */}
            {qualStats.escalaData.length > 0 && (
              <div className="chart-card">
                <div className="chart-title">Escala de incômodo</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={qualStats.escalaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} allowDecimals={false} />
                    <Tooltip contentStyle={TT_STYLE} />
                    <Bar dataKey="value" fill="var(--safe)" radius={[3, 3, 0, 0]} name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top incômodos */}
          {qualStats.topIncomodos.length > 0 && (
            <div className="chart-card" style={{ marginBottom: 12 }}>
              <div className="chart-title">Principais incômodos relatados</div>
              {qualStats.topIncomodos.map((item, i) => {
                const maxCount = qualStats.topIncomodos[0].count;
                const pct = (item.count / maxCount) * 100;
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: 'var(--text)', fontWeight: 400 }}>{item.name}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{item.count}</span>
                    </div>
                    <div className="stage-track">
                      <div className="stage-fill" style={{ width: `${pct}%`, minWidth: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tabela de leads com qualificação */}
          <div className="tbl-wrap">
            <div style={{ padding: '10px 14px', background: 'var(--s2)', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-2)' }}>
                Leads do webinário com qualificação
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Qualificação</th>
                    <th>Renda</th>
                    <th style={{ textAlign: 'right' }}>Escala</th>
                    <th>O que incomoda</th>
                    <th>Criativo</th>
                  </tr>
                </thead>
                <tbody>
                  {kommoLeads.slice(0, 50).map((lead, i) => {
                    const qualClass = lead.qualificacao === 'Qualificado' ? 'badge-green' : lead.qualificacao === 'Desqualificado' ? 'badge-red' : 'badge-amber';
                    return (
                      <tr key={i}>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{lead.name}</td>
                        <td>
                          {lead.qualificacao
                            ? <span className={`badge ${qualClass}`}>{lead.qualificacao}</span>
                            : <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ color: 'var(--text-2)' }}>{lead.renda || '—'}</td>
                        <td className="td-num" style={{ color: 'var(--text-2)' }}>{lead.escala || '—'}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-3)', fontSize: 11 }}>
                          {lead.o_que_incomoda || '—'}
                        </td>
                        <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{lead.utm_content || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {kommoLeads.length > 50 && (
              <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
                Mostrando 50 de {kommoLeads.length} leads.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
