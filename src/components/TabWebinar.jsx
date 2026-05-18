import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  fetchSheetData, normalizeRow, isWebinar, filterByDateRange,
  fmt, fmtDay,
} from '../data';
import { useWebinarLeads } from '../hooks/useKommo';

const TT_STYLE = {
  backgroundColor: 'var(--s2)',
  border: '1px solid var(--border2)',
  borderRadius: 8,
  fontSize: 11,
  color: 'var(--text)',
};

function formatFieldText(str) {
  if (!str) return '—';
  return str
    .replace(/_/g, ' ')
    .replace(/\br\$\s*/gi, 'R$ ')
    .replace(/\bR\$\s*(\d)/g, (_, n) => `R$ ${n}`)
    .replace(/(\d)\.(\d{3})/g, '$1.$2')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function formatRenda(str) {
  if (!str) return 'Não informado';
  let clean = str.replace(/_/g, ' ').trim();
  clean = clean.replace(/r\$/gi, 'R$').replace(/R\$\s*/, 'R$ ');
  return clean;
}

function parseRendaNum(str) {
  if (!str) return 0;
  const n = parseFloat(str.replace(/[^\d,]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function isDesqualificadoPorRenda(rendaStr) {
  const val = parseRendaNum(rendaStr);
  return val > 0 && val <= 5000;
}

function isDesqualificado(lead) {
  return lead.qualificacao === 'Desqualificado' || isDesqualificadoPorRenda(lead.renda);
}

function isQualificado(lead) {
  return lead.qualificacao === 'Qualificado' && !isDesqualificadoPorRenda(lead.renda);
}

function rendaFaixa(str) {
  const val = parseRendaNum(str);
  if (val <= 0)     return 'Não informado';
  if (val <= 3000)  return 'Até R$ 3k';
  if (val <= 5000)  return 'R$ 3k–5k';
  if (val <= 10000) return 'R$ 5k–10k';
  if (val <= 20000) return 'R$ 10k–20k';
  return 'Acima R$ 20k';
}

const FAIXA_ORDER = ['Até R$ 3k','R$ 3k–5k','R$ 5k–10k','R$ 10k–20k','Acima R$ 20k','Não informado'];

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

function Pagination({ page, total, perPage, onChange }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderTop:'1px solid var(--border)', justifyContent:'flex-end' }}>
      <span style={{ fontSize:11, color:'var(--text-3)' }}>
        {(page-1)*perPage+1}–{Math.min(page*perPage,total)} de {total}
      </span>
      <button onClick={() => onChange(page-1)} disabled={page===1} style={{ background:'var(--s2)', border:'1px solid var(--border)', color:page===1?'var(--text-3)':'var(--text)', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:page===1?'default':'pointer', fontFamily:'var(--font)' }}>‹</button>
      <button onClick={() => onChange(page+1)} disabled={page===pages} style={{ background:'var(--s2)', border:'1px solid var(--border)', color:page===pages?'var(--text-3)':'var(--text)', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:page===pages?'default':'pointer', fontFamily:'var(--font)' }}>›</button>
    </div>
  );
}

export default function TabWebinar({ startDate, endDate, dateFrom, dateTo }) {
  const [rawTrafico, setRawTrafico]   = useState([]);
  const [loadingTrafico, setLoadingT] = useState(true);
  const [errorTrafico, setErrorT]     = useState(null);
  const [leadsPage, setLeadsPage]     = useState(1);
  const [traficoPage, setTraficoPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    setLoadingT(true);
    fetchSheetData()
      .then(rows => {
        setRawTrafico(rows.map(normalizeRow).filter(r => isWebinar(r.camp) && r.spent > 0));
        setLoadingT(false);
      })
      .catch(e => { setErrorT(e.message); setLoadingT(false); });
  }, []);

  const trafico = useMemo(
    () => filterByDateRange(rawTrafico, startDate, endDate),
    [rawTrafico, startDate, endDate]
  );

  const { leads: kommoLeads, loading: loadingLeads, error: errorLeads } = useWebinarLeads(dateFrom, dateTo);

  const totalSpent = useMemo(() => trafico.reduce((s, d) => s + d.spent, 0), [trafico]);

  const days = useMemo(() => [...new Set(trafico.map(d => d.day))].sort(), [trafico]);
  const dailyData = useMemo(() => days.map(day => {
    const rows = trafico.filter(d => d.day === day);
    return {
      label: fmtDay(day),
      gasto: +rows.reduce((s, d) => s + d.spent, 0).toFixed(2),
      leads: rows.reduce((s, d) => s + d.lpv, 0),
    };
  }), [days, trafico]);

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
  const traficoPageData = grouped.slice((traficoPage-1)*PER_PAGE, traficoPage*PER_PAGE);

  const qualStats = useMemo(() => {
    const total        = kommoLeads.length;
    const qualificados = kommoLeads.filter(isQualificado).length;
    const desqualif    = kommoLeads.filter(isDesqualificado).length;
    const cpl          = total > 0 ? totalSpent / total : null;

    const faixaMap = {};
    kommoLeads.forEach(l => {
      const faixa = rendaFaixa(l.renda);
      faixaMap[faixa] = (faixaMap[faixa] || 0) + 1;
    });
    const rendaData = FAIXA_ORDER.filter(f => faixaMap[f]).map(f => ({ name: f, value: faixaMap[f] }));

    const escalaMap = {};
    kommoLeads.forEach(l => {
      if (l.escala) {
        const k = `Escala ${l.escala}`;
        escalaMap[k] = (escalaMap[k] || 0) + 1;
      }
    });
    const escalaData = Object.entries(escalaMap)
      .sort((a, b) => Number(a[0].replace('Escala ','')) - Number(b[0].replace('Escala ','')))
      .map(([name, value]) => ({ name, value }));

    const incomodoMap = {};
    kommoLeads.forEach(l => {
      if (l.o_que_incomoda) {
        const key = formatFieldText(l.o_que_incomoda);
        incomodoMap[key] = (incomodoMap[key] || 0) + 1;
      }
    });
    const topIncomodos = Object.entries(incomodoMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    return { total, qualificados, desqualif, cpl, rendaData, escalaData, topIncomodos };
  }, [kommoLeads, totalSpent]);

  const leadsPageData = kommoLeads.slice((leadsPage-1)*PER_PAGE, leadsPage*PER_PAGE);

  return (
    <div>
      {/* ══ 1. CARDS ══════════════════════════════════════════════════════════ */}
      <SectionHead>Webinário — visão geral</SectionHead>
      <div className="stat-strip" style={{ marginBottom: 28 }}>
        <StatCard variant="acc"  icon="💸" num={fmt(totalSpent)} label="Investimento total" sub="período selecionado" delay={0} />
        <StatCard variant="warn" icon="🎯" num={qualStats.cpl ? fmt(qualStats.cpl) : '—'} label="CPL" sub="investimento ÷ leads" delay={60} />
        {loadingLeads ? (
          <>
            {['blue','safe','red'].map((v,i) => (
              <div key={v} className={`stat-card sc-${v} fade-up`} style={{ animationDelay: `${(i+2)*60}ms` }}>
                <div className="stat-num" style={{ fontSize:'1.2rem', color:'var(--text-3)' }}>…</div>
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard variant="blue" icon="👥" num={qualStats.total}        label="Total de leads"  sub="no pipeline webinário" delay={120} />
            <StatCard variant="safe" icon="✅" num={qualStats.qualificados} label="Qualificados"    sub={qualStats.total > 0 ? `${Math.round(qualStats.qualificados/qualStats.total*100)}% do total` : '—'} delay={180} />
            <StatCard variant="red"  icon="❌" num={qualStats.desqualif}    label="Desqualificados" sub={qualStats.total > 0 ? `${Math.round(qualStats.desqualif/qualStats.total*100)}% do total` : '—'} delay={240} />
          </>
        )}
      </div>

      {/* ══ 2. GRÁFICOS DE QUALIFICAÇÃO ══════════════════════════════════════ */}
      {!loadingLeads && kommoLeads.length > 0 && (
        <>
          <SectionHead>Perfil dos leads</SectionHead>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            {qualStats.rendaData.length > 0 && (
              <div className="chart-card">
                <div className="chart-title">Distribuição por renda</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={qualStats.rendaData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize:10, fill:'var(--text-3)' }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize:9, fill:'var(--text-3)' }} width={80} />
                    <Tooltip contentStyle={TT_STYLE} />
                    <Bar dataKey="value" fill="var(--acc)" radius={[0,3,3,0]} name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {qualStats.escalaData.length > 0 && (
              <div className="chart-card">
                <div className="chart-title">Escala de incômodo</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={qualStats.escalaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-3)' }} />
                    <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} allowDecimals={false} />
                    <Tooltip contentStyle={TT_STYLE} />
                    <Bar dataKey="value" fill="var(--safe)" radius={[3,3,0,0]} name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {qualStats.topIncomodos.length > 0 && (
            <div className="chart-card" style={{ marginBottom:24 }}>
              <div className="chart-title">Principais incômodos relatados</div>
              {qualStats.topIncomodos.map((item, i) => {
                const pct = (item.count / qualStats.topIncomodos[0].count) * 100;
                return (
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
                      <span style={{ color:'var(--text)' }}>{item.name}</span>
                      <span style={{ color:'var(--text-3)', fontSize:11 }}>{item.count}</span>
                    </div>
                    <div className="stage-track">
                      <div className="stage-fill" style={{ width:`${pct}%`, minWidth:4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ 3. TABELA DE LEADS ════════════════════════════════════════════════ */}
      {!loadingLeads && kommoLeads.length > 0 && (
        <>
          <SectionHead>Leads com qualificação</SectionHead>
          <div className="tbl-wrap" style={{ marginBottom:24 }}>
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Qualificação</th>
                    <th>Renda</th>
                    <th style={{ textAlign:'right' }}>Escala</th>
                    <th>O que incomoda</th>
                    <th>Criativo</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsPageData.map((lead, i) => {
                    const qual = isQualificado(lead) ? 'Qualificado' : isDesqualificado(lead) ? 'Desqualificado' : lead.qualificacao || null;
                    const qualClass = qual === 'Qualificado' ? 'badge-green' : qual === 'Desqualificado' ? 'badge-red' : 'badge-amber';
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight:500, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.name}</td>
                        <td>{qual ? <span className={`badge ${qualClass}`}>{qual}</span> : <span style={{ color:'var(--text-3)', fontSize:11 }}>—</span>}</td>
                        <td style={{ color:'var(--text-2)' }}>{formatRenda(lead.renda)}</td>
                        <td className="td-num" style={{ color:'var(--text-2)' }}>{lead.escala || '—'}</td>
                        <td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-3)', fontSize:11 }}>{formatFieldText(lead.o_que_incomoda)}</td>
                        <td style={{ color:'var(--text-3)', fontSize:11 }}>{lead.utm_content || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={leadsPage} total={kommoLeads.length} perPage={PER_PAGE} onChange={p => setLeadsPage(p)} />
          </div>
        </>
      )}

      {loadingLeads && <div className="spinner-wrap"><div className="spinner" /><div className="spinner-text">Carregando leads do Kommo...</div></div>}
      {errorLeads && <div className="info-note"><span>⚠</span><span>Erro: {errorLeads}</span></div>}

      {/* ══ 4. TRÁFEGO ═══════════════════════════════════════════════════════ */}
      <SectionHead>Tráfego pago — webinário</SectionHead>
      {loadingTrafico ? (
        <div className="spinner-wrap"><div className="spinner" /><div className="spinner-text">Carregando planilha...</div></div>
      ) : errorTrafico ? (
        <div className="info-note"><span>⚠</span><span>{errorTrafico}</span></div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div className="chart-card">
              <div className="chart-title">Investimento diário</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'var(--text-3)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} tickFormatter={v => `R$${v}`} width={55} />
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
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'var(--text-3)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Bar dataKey="leads" fill="var(--blue)" radius={[3,3,0,0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="tbl-wrap">
            <div style={{ padding:'10px 14px', background:'var(--s2)', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'var(--text-2)' }}>
                Performance por conjunto e criativo
              </span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Conjunto</th>
                    <th>Criativo</th>
                    <th style={{ textAlign:'right' }}>Gasto</th>
                    <th style={{ textAlign:'right' }}>Leads</th>
                    <th style={{ textAlign:'right' }}>CPL</th>
                    <th>Eficiência</th>
                  </tr>
                </thead>
                <tbody>
                  {traficoPageData.map((r, i) => {
                    const cplRow   = r.lpv > 0 ? r.spent / r.lpv : null;
                    const eff      = r.lpv / maxLpv;
                    const effClass = eff > 0.6 ? 'badge-green' : eff > 0.2 ? 'badge-amber' : 'badge-red';
                    const effLabel = eff > 0.6 ? 'alto' : eff > 0.2 ? 'médio' : 'baixo';
                    return (
                      <tr key={i}>
                        <td className="td-muted" style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.cj}</td>
                        <td style={{ maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.ad}</td>
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
            <Pagination page={traficoPage} total={grouped.length} perPage={PER_PAGE} onChange={p => setTraficoPage(p)} />
          </div>
        </>
      )}
    </div>
  );
}
