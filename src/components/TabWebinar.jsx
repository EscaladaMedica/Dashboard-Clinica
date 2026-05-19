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

// ─── FORMATADORES ─────────────────────────────────────────────────────────────
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
  // Remove underscores, normaliza espaços
  let clean = str.replace(/_/g, ' ').trim();
  // Garante formato R$ X.XXX
  clean = clean.replace(/r\$/gi, 'R$').replace(/R\$\s*/, 'R$ ');
  return clean;
}

function parseRendaNum(str) {
  if (!str) return 0;
  let clean = str.replace(/[^\d.,]/g, '');
  clean = clean.replace(/\.(\d{3})/g, '$1');
  clean = clean.replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

// Retorna um valor numérico representativo para a string de renda.
// Suporta valores únicos ("R$ 7.000") e faixas ("R$ 5.000 a R$ 10.000").
function getRendaValue(str) {
  if (!str) return 0;
  // "acima de", "mais de" → acima de 20k
  if (/acima|mais\s*de|superior/i.test(str)) return 25000;
  // Remove prefixo R$ e separadores de milhar para extrair números
  const cleaned = str.toLowerCase()
    .replace(/r\$\s*/g, '')
    .replace(/\.(\d{3})/g, '$1');
  const nums = (cleaned.match(/\d+(?:[.,]\d+)?/g) || [])
    .map(n => parseFloat(n.replace(',', '.')))
    .filter(n => !isNaN(n) && n > 0);
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  // Faixa: usa o ponto médio para classificação
  return (nums[0] + nums[1]) / 2;
}

// R$ 5.000 ou menos = desqualificado por renda
function isDesqualificadoPorRenda(rendaStr) {
  const val = getRendaValue(rendaStr);
  return val > 0 && val <= 5000;
}

function isDesqualificado(lead) {
  return (
    lead.qualificacao === 'Desqualificado' ||
    isDesqualificadoPorRenda(lead.renda)
  );
}

function isQualificado(lead) {
  return lead.qualificacao === 'Qualificado'
    && !!lead.renda                        // renda obrigatória para ser qualificado
    && !isDesqualificadoPorRenda(lead.renda);
}

function rendaFaixa(str) {
  const val = getRendaValue(str);
  if (val <= 0)     return 'Não informado';
  if (val <= 5000)  return 'Até R$ 5k';
  if (val <= 10000) return 'R$ 5k–10k';
  if (val <= 20000) return 'R$ 10k–20k';
  return 'Acima R$ 20k';
}

const FAIXA_ORDER = ['Até R$ 5k','R$ 5k–10k','R$ 10k–20k','Acima R$ 20k','Não informado'];

const DDD_ESTADO = {
  '11':'SP','12':'SP','13':'SP','14':'SP','15':'SP','16':'SP','17':'SP','18':'SP','19':'SP',
  '21':'RJ','22':'RJ','24':'RJ',
  '27':'ES','28':'ES',
  '31':'MG','32':'MG','33':'MG','34':'MG','35':'MG','37':'MG','38':'MG',
  '41':'PR','42':'PR','43':'PR','44':'PR','45':'PR','46':'PR',
  '47':'SC','48':'SC','49':'SC',
  '51':'RS','53':'RS','54':'RS','55':'RS',
  '61':'DF','62':'GO','63':'TO','64':'GO',
  '65':'MT','66':'MT','67':'MS','68':'AC','69':'RO',
  '71':'BA','73':'BA','74':'BA','75':'BA','77':'BA',
  '79':'SE','81':'PE','82':'AL','83':'PB','84':'RN',
  '85':'CE','86':'PI','87':'PE','88':'CE','89':'PI',
  '91':'PA','92':'AM','93':'PA','94':'PA',
  '95':'RR','96':'AP','97':'AM','98':'MA','99':'MA',
};

// ─── COMPONENTES ──────────────────────────────────────────────────────────────
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} de {total}
      </span>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: page === 1 ? 'var(--text-3)' : 'var(--text)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'var(--font)' }}
      >‹</button>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === pages}
        style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: page === pages ? 'var(--text-3)' : 'var(--text)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: page === pages ? 'default' : 'pointer', fontFamily: 'var(--font)' }}
      >›</button>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function TabWebinar({ startDate, endDate, dateFrom, dateTo }) {
  const [rawTrafico, setRawTrafico]     = useState([]);
  const [loadingTrafico, setLoadingT]   = useState(true);
  const [errorTrafico, setErrorT]       = useState(null);
  const [leadsPage, setLeadsPage]       = useState(1);
  const [traficoPage, setTraficoPage]   = useState(1);
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

  // ── Métricas de tráfego ──
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
      if (!map[key]) map[key] = { camp: d.camp, cj: d.cj, ad: d.ad, spent: 0, lpv: 0, forms: 0 };
      map[key].spent += d.spent;
      map[key].lpv   += d.lpv;
      map[key].forms += d.forms;
    });
    return Object.values(map).sort((a, b) => b.spent - a.spent);
  }, [trafico]);

  const traficoPageData = grouped.slice((traficoPage - 1) * PER_PAGE, traficoPage * PER_PAGE);

  // ── Métricas de qualificação ──
  const qualStats = useMemo(() => {
    const total        = kommoLeads.length;
    const qualificados = kommoLeads.filter(isQualificado).length;
    const desqualif    = kommoLeads.filter(isDesqualificado).length;

    // CPL = investimento total / total de leads no pipeline
    const cpl = total > 0 ? totalSpent / total : null;

    // Renda por faixa
    const faixaMap = {};
    kommoLeads.forEach(l => {
      const faixa = rendaFaixa(l.renda);
      faixaMap[faixa] = (faixaMap[faixa] || 0) + 1;
    });
    const rendaData = FAIXA_ORDER.filter(f => faixaMap[f]).map(f => ({ name: f, value: faixaMap[f] }));

    // Escala de incômodo
    const escalaMap = {};
    kommoLeads.forEach(l => {
      if (l.escala) {
        const k = `Escala ${l.escala}`;
        escalaMap[k] = (escalaMap[k] || 0) + 1;
      }
    });
    const escalaData = Object.entries(escalaMap)
      .sort((a, b) => Number(a[0].replace('Escala ', '')) - Number(b[0].replace('Escala ', '')))
      .map(([name, value]) => ({ name, value }));

    // Criativos que trouxeram leads qualificados
    // Fonte: campo utm_content (criativo) ou utm_campaign (campanha) registrado no Kommo no momento do cadastro.
    // Leads sem UTM configurado na URL do anúncio aparecem como não atribuídos.
    const adsMap = {};
    let semAtribuicao = 0;
    kommoLeads.filter(isQualificado).forEach(l => {
      const key = l.utm_content || l.utm_campaign;
      if (key) {
        adsMap[key] = (adsMap[key] || 0) + 1;
      } else {
        semAtribuicao++;
      }
    });
    const adsQualificados = Object.entries(adsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name: name.length > 35 ? name.slice(0,35)+'…' : name, count }));
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

    // DDD dos inscritos
    const dddMap = {};
    kommoLeads.forEach(l => {
      if (l.ddd) dddMap[l.ddd] = (dddMap[l.ddd] || 0) + 1;
    });
    const dddData = Object.entries(dddMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([ddd, count]) => ({ ddd, count, estado: DDD_ESTADO[ddd] || '?' }));

    return { total, qualificados, desqualif, cpl, rendaData, escalaData, topIncomodos, adsQualificados, semAtribuicao, dddData };
  }, [kommoLeads, totalSpent]);

  // Filtro de qualificação na tabela
  const [filtroQual, setFiltroQual] = useState('todos');
  const leadsFiltrados = useMemo(() => {
    if (filtroQual === 'qualificados')  return kommoLeads.filter(isQualificado);
    if (filtroQual === 'desqualificados') return kommoLeads.filter(isDesqualificado);
    return kommoLeads;
  }, [kommoLeads, filtroQual]);

  // Paginação de leads
  const leadsPageData = leadsFiltrados.slice((leadsPage - 1) * PER_PAGE, leadsPage * PER_PAGE);

  return (
    <div>
      {/* ══ 1. CARDS ══════════════════════════════════════════════════════════ */}
      <SectionHead>Webinário — visão geral</SectionHead>

      <div className="stat-strip" style={{ marginBottom: 28 }}>
        <StatCard variant="acc"  icon="💸" num={fmt(totalSpent)}                   label="Investimento total"  sub="período selecionado"  delay={0} />
        <StatCard variant="warn" icon="🎯" num={qualStats.cpl ? fmt(qualStats.cpl) : '—'} label="CPL"          sub="investimento ÷ leads" delay={60} />
        {loadingLeads ? (
          <>
            <div className="stat-card sc-blue fade-up" style={{ animationDelay: '120ms' }}>
              <div className="stat-icon">👥</div>
              <div className="stat-num" style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>…</div>
              <div className="stat-lbl">Total de leads</div>
            </div>
            <div className="stat-card sc-safe fade-up" style={{ animationDelay: '180ms' }}>
              <div className="stat-icon">✅</div>
              <div className="stat-num" style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>…</div>
              <div className="stat-lbl">Qualificados</div>
            </div>
            <div className="stat-card sc-red fade-up" style={{ animationDelay: '240ms' }}>
              <div className="stat-icon">❌</div>
              <div className="stat-num" style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>…</div>
              <div className="stat-lbl">Desqualificados</div>
            </div>
          </>
        ) : (
          <>
            <StatCard variant="blue" icon="👥" num={qualStats.total}        label="Total de leads"   sub="no pipeline webinário" delay={120} />
            <StatCard variant="safe" icon="✅" num={qualStats.qualificados} label="Qualificados"     sub={qualStats.total > 0 ? `${Math.round(qualStats.qualificados / qualStats.total * 100)}% do total` : '—'} delay={180} />
            <StatCard variant="red"  icon="❌" num={qualStats.desqualif}    label="Desqualificados"  sub={qualStats.total > 0 ? `${Math.round(qualStats.desqualif / qualStats.total * 100)}% do total` : '—'} delay={240} />
          </>
        )}
      </div>

      {/* ══ 2. GRÁFICOS DE QUALIFICAÇÃO ══════════════════════════════════════ */}
      {!loadingLeads && kommoLeads.length > 0 && (
        <>
          <SectionHead>Perfil dos leads</SectionHead>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
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

          {qualStats.dddData.length > 0 && (
            <div className="chart-card" style={{ marginBottom: 12 }}>
              <div className="chart-title">DDD dos inscritos</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px 16px' }}>
                {qualStats.dddData.map((item, i) => {
                  const maxCount = qualStats.dddData[0].count;
                  const pct = (item.count / maxCount) * 100;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                          ({item.ddd})
                          <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>{item.estado}</span>
                        </span>
                        <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{item.count}</span>
                      </div>
                      <div className="stage-track">
                        <div className="stage-fill" style={{ width: `${pct}%`, minWidth: 4, background: 'var(--blue)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {kommoLeads.filter(l => !l.ddd).length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-3)' }}>
                  {kommoLeads.filter(l => !l.ddd).length} inscritos sem telefone registrado no Kommo
                </div>
              )}
            </div>
          )}

          {qualStats.topIncomodos.length > 0 && (
            <div className="chart-card" style={{ marginBottom: 12 }}>
              <div className="chart-title">Principais incômodos relatados</div>
              {qualStats.topIncomodos.map((item, i) => {
                const maxCount = qualStats.topIncomodos[0].count;
                const pct = (item.count / maxCount) * 100;
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: 'var(--text)' }}>{item.name}</span>
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

          {(qualStats.adsQualificados.length > 0 || qualStats.semAtribuicao > 0) && (
            <div className="chart-card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="chart-title" style={{ margin: 0 }}>Criativos que trouxeram leads qualificados</div>
                {qualStats.semAtribuicao > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    + {qualStats.semAtribuicao} sem UTM rastreado
                  </span>
                )}
              </div>
              {qualStats.adsQualificados.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>
                  Nenhum lead qualificado com UTM configurado. Configure <code>utm_content</code> ou <code>utm_campaign</code> nas URLs dos anúncios para ver a atribuição por criativo.
                </div>
              )}
              {qualStats.adsQualificados.map((item, i) => {
                const maxCount = qualStats.adsQualificados[0].count;
                const pct = (item.count / maxCount) * 100;
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: 'var(--text)' }}>{item.name}</span>
                      <span style={{ color: 'var(--safe)', fontSize: 11, fontWeight: 600 }}>{item.count} qual.</span>
                    </div>
                    <div className="stage-track">
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--safe)', borderRadius: 99, minWidth: 4, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ 3. TABELA DE LEADS COM QUALIFICAÇÃO ══════════════════════════════ */}
      {!loadingLeads && kommoLeads.length > 0 && (
        <>
          <SectionHead>Leads com qualificação</SectionHead>

          {/* Filtro */}
          <div className="pills" style={{ marginBottom: 12 }}>
            {[['todos','Todos'],['qualificados','Qualificados'],['desqualificados','Desqualificados']].map(([val, label]) => (
              <button key={val} className={`pill${filtroQual === val ? ' active' : ''}`}
                onClick={() => { setFiltroQual(val); setLeadsPage(1); }}>
                {label}
              </button>
            ))}
          </div>

          <div className="tbl-wrap" style={{ marginBottom: 24 }}>
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
                  {leadsPageData.map((lead, i) => {
                    const qual = isQualificado(lead) ? 'Qualificado' : isDesqualificado(lead) ? 'Desqualificado' : lead.qualificacao || null;
                    const qualClass = qual === 'Qualificado' ? 'badge-green' : qual === 'Desqualificado' ? 'badge-red' : 'badge-amber';
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</td>
                        <td>
                          {qual
                            ? <span className={`badge ${qualClass}`}>{qual}</span>
                            : <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ color: 'var(--text-2)' }}>{formatRenda(lead.renda)}</td>
                        <td className="td-num" style={{ color: 'var(--text-2)' }}>{lead.escala || '—'}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-3)', fontSize: 11 }}>
                          {formatFieldText(lead.o_que_incomoda)}
                        </td>
                        <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{lead.utm_content || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={leadsPage} total={leadsFiltrados.length} perPage={PER_PAGE} onChange={p => { setLeadsPage(p); }} />
          </div>
        </>
      )}

      {loadingLeads && (
        <div className="spinner-wrap"><div className="spinner" /><div className="spinner-text">Carregando leads do Kommo...</div></div>
      )}
      {errorLeads && (
        <div className="info-note" style={{ marginBottom: 16 }}><span>⚠</span><span>Erro ao carregar leads: {errorLeads}</span></div>
      )}

      {/* ══ 4. DADOS DE TRÁFEGO ══════════════════════════════════════════════ */}
      <SectionHead>Tráfego pago — webinário</SectionHead>

      {loadingTrafico ? (
        <div className="spinner-wrap"><div className="spinner" /><div className="spinner-text">Carregando dados da planilha...</div></div>
      ) : errorTrafico ? (
        <div className="info-note"><span>⚠</span><span>Erro: {errorTrafico}</span></div>
      ) : (
        <>
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
                    <th>Campanha</th>
                    <th>Conjunto</th>
                    <th>Criativo</th>
                    <th style={{ textAlign: 'right' }}>Gasto</th>
                    <th style={{ textAlign: 'right' }}>Views LP</th>
                    <th style={{ textAlign: 'right' }}>Cadastros</th>
                    <th style={{ textAlign: 'right' }}>CPL</th>
                  </tr>
                </thead>
                <tbody>
                  {traficoPageData.map((r, i) => {
                    // CPL pelo número de cadastros (forms); se zero, usa views LP como fallback
                    const leadsRef = r.forms > 0 ? r.forms : r.lpv;
                    const cplRow   = leadsRef > 0 ? r.spent / leadsRef : null;
                    return (
                      <tr key={i}>
                        <td className="td-muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>{r.camp}</td>
                        <td className="td-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cj}</td>
                        <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ad}</td>
                        <td className="td-num">{fmt(r.spent)}</td>
                        <td className="td-num" style={{ color: 'var(--text-3)' }}>{r.lpv}</td>
                        <td className="td-num" style={{ color: r.forms > 0 ? 'var(--safe)' : 'var(--text-3)' }}>
                          {r.forms > 0 ? r.forms : '—'}
                        </td>
                        <td className="td-num">{cplRow ? fmt(cplRow) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={traficoPage} total={grouped.length} perPage={PER_PAGE} onChange={p => { setTraficoPage(p); }} />
          </div>
        </>
      )}
    </div>
  );
}
