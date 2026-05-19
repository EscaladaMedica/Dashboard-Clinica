import { useState, useEffect } from 'react';

// ─── FETCH BASE ───────────────────────────────────────────────────────────────
async function fetchKommo(endpoint, params = {}) {
  const qs = new URLSearchParams({ endpoint, ...params }).toString();
  const res = await fetch(`/api/kommo?${qs}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Kommo API error: ${res.status}${body ? ' — ' + body.slice(0,100) : ''}`);
  }
  return res.json();
}

// ─── FETCH COM PAGINAÇÃO ──────────────────────────────────────────────────────
async function fetchAllPages(endpoint, baseParams = {}, onProgress) {
  let page = 1;
  let all  = [];
  while (true) {
    const data  = await fetchKommo(endpoint, { ...baseParams, limit: 250, page });
    const embedded = data?._embedded || {};
    const items    = Object.values(embedded)[0] || [];
    all = [...all, ...items];
    if (onProgress) onProgress(page, all.length);
    if (!data?._links?.next) break;
    page++;
    if (page > 20) break;
  }
  return all;
}

// ─── EXTRAI CAMPO CUSTOMIZADO ────────────────────────────────────────────────
export function getCustomField(lead, fieldId) {
  const fields = lead.custom_fields_values || [];
  const field  = fields.find(f => f.field_id === fieldId);
  return field?.values?.[0]?.value || null;
}

// ─── CAMPO IDs — WEBINÁRIO ───────────────────────────────────────────────────
export const FIELD_QUALIFICACAO   = 1024299;
export const FIELD_O_QUE_INCOMODA = 1024301;
export const FIELD_ESCALA         = 1024303;
export const FIELD_RENDA          = 1024305;
export const FIELD_UTM_CONTENT    = 518462;
export const FIELD_UTM_CAMPAIGN   = 518466;

// ─── PIPELINE IDs ─────────────────────────────────────────────────────────────
export const PIPELINE_CLINICA  = 13109195;
export const PIPELINE_WEBINAR  = 13634396;

// ─── HOOK: LEADS POR ETAPA ───────────────────────────────────────────────────
export function useLeadsByStage(dateFrom, dateTo) {
  const [stages, setStages]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const pipelines = await fetchKommo('leads/pipelines', { limit: 50 });
        const allPipelines = pipelines?._embedded?.pipelines || [];

        const params = { limit: 250 };
        if (dateFrom) params['filter[created_at][from]'] = dateFrom;
        if (dateTo)   params['filter[created_at][to]']   = dateTo;

        const leadsData = await fetchKommo('leads', params);
        const leads     = leadsData?._embedded?.leads || [];

        const stageMap = {};
        allPipelines.forEach(pipe => {
          (pipe._embedded?.statuses || []).forEach(status => {
            if (status.type !== 1) {
              stageMap[`${pipe.id}_${status.id}`] = {
                id: status.id, name: status.name,
                pipeline: pipe.name, pipeline_id: pipe.id,
                count: 0, value: 0,
              };
            }
          });
        });

        leads.forEach(lead => {
          const key = `${lead.pipeline_id}_${lead.status_id}`;
          if (stageMap[key]) {
            stageMap[key].count += 1;
            stageMap[key].value += lead.price || 0;
          }
        });

        if (!cancelled) setStages(Object.values(stageMap));
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  return { stages, loading, error };
}

// ─── HOOK: RESUMO GERAL ───────────────────────────────────────────────────────
export function useKommoSummary(dateFrom, dateTo) {
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [talkProgress, setProgress] = useState(null);
  const [talksLimited, setTalksLimited] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setProgress(null);
      setTalksLimited(false);

      try {
        const leadParams = { limit: 250 };
        if (dateFrom) leadParams['filter[created_at][from]'] = dateFrom;
        if (dateTo)   leadParams['filter[created_at][to]']   = dateTo;

        // Busca leads com filtro de data
        const leadsData = await fetchKommo('leads', leadParams);
        const leads     = leadsData?._embedded?.leads || [];

        // Status 142 = ganho, 143 = perdido (padrão Kommo)
        const won    = leads.filter(l => l.status_id === 142);
        const lost   = leads.filter(l => l.status_id === 143);
        const active = leads.filter(l => l.status_id !== 142 && l.status_id !== 143);

        // Talks — sem filtro de data (limitação da API)
        let talksTotal = 0, talksInWork = 0, talksUnread = 0;
        let talksErr = null;
        try {
          const talks = await fetchAllPages('talks', {}, (page, count) => {
            if (!cancelled) setProgress({ page, count });
          });
          talksTotal  = talks.length;
          talksInWork = talks.filter(t => t.is_in_work).length;
          talksUnread = talks.filter(t => !t.is_read).length;
          setTalksLimited(true); // talks sempre sem filtro de data
        } catch (e) {
          talksErr = e.message;
        }

        if (!cancelled) {
          setSummary({
            totalLeads:   leads.length,
            totalValue:   leads.reduce((s, l) => s + (l.price || 0), 0),
            wonLeads:     won.length,
            wonValue:     won.reduce((s, l) => s + (l.price || 0), 0),
            lostLeads:    lost.length,
            activeLeads:  active.length,
            talksTotal,
            talksInWork,
            talksUnread,
            talksErr,
          });
          setProgress(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  return { summary, loading, error, talkProgress, talksLimited };
}

// ─── EXTRAI DDD DE UM NÚMERO BRASILEIRO ──────────────────────────────────────
function extractDDD(phone) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  // Remove DDI 55 (Brasil): 5511999... → 11999...
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  // Remove prefixo 0 antigo: 011999... → 11999...
  if (digits.startsWith('0') && digits.length >= 11) digits = digits.slice(1);
  // Número brasileiro: DDD(2) + local(8-9) = 10 ou 11 dígitos
  if (digits.length >= 10 && digits.length <= 11) return digits.slice(0, 2);
  return null;
}

// ─── HOOK: LEADS DO WEBINÁRIO COM QUALIFICAÇÃO ───────────────────────────────
export function useWebinarLeads(dateFrom, dateTo) {
  const [leads, setLeads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = {
          limit: 250,
          'filter[pipeline_id]': PIPELINE_WEBINAR,
          'with': 'contacts',
        };
        if (dateFrom) params['filter[created_at][from]'] = dateFrom;
        if (dateTo)   params['filter[created_at][to]']   = dateTo;

        const data  = await fetchKommo('leads', params);
        const items = data?._embedded?.leads || [];

        // Coleta IDs únicos de contatos vinculados aos leads
        const contactIds = [...new Set(
          items.flatMap(lead => (lead._embedded?.contacts || []).map(c => c.id))
        )];

        // Busca contatos em lotes para obter telefones (e assim DDD).
        // Usa chaves indexadas (filter[id][0]=X) porque o proxy converte a query em objeto
        // e chaves repetidas (filter[id][]=X) perdem todos os valores exceto o último.
        const contactPhones = {};
        if (contactIds.length > 0) {
          const BATCH = 100;
          for (let b = 0; b < contactIds.length; b += BATCH) {
            try {
              const batch = contactIds.slice(b, b + BATCH);
              const batchParams = { limit: BATCH };
              batch.forEach((id, j) => { batchParams[`filter[id][${j}]`] = id; });
              const contactData = await fetchKommo('contacts', batchParams);
              (contactData?._embedded?.contacts || []).forEach(contact => {
                const phoneField = (contact.custom_fields_values || [])
                  .find(f => f.field_code === 'PHONE' || f.field_type === 'multitext');
                const phone = phoneField?.values?.[0]?.value;
                if (phone) contactPhones[contact.id] = phone;
              });
            } catch (_) { /* lote falhou, continua */ }
          }
        }

        const parsed = items.map(lead => {
          const mainContact = (lead._embedded?.contacts || []).find(c => c.is_main)
            || (lead._embedded?.contacts || [])[0];
          const phone = mainContact ? (contactPhones[mainContact.id] || null) : null;
          return {
            id:             lead.id,
            name:           lead.name,
            status_id:      lead.status_id,
            created_at:     lead.created_at,
            price:          lead.price || 0,
            qualificacao:   getCustomField(lead, FIELD_QUALIFICACAO),
            o_que_incomoda: getCustomField(lead, FIELD_O_QUE_INCOMODA),
            escala:         getCustomField(lead, FIELD_ESCALA),
            renda:          getCustomField(lead, FIELD_RENDA),
            utm_content:    getCustomField(lead, FIELD_UTM_CONTENT),
            utm_campaign:   getCustomField(lead, FIELD_UTM_CAMPAIGN),
            phone,
            ddd:            extractDDD(phone),
          };
        });

        if (!cancelled) setLeads(parsed);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  return { leads, loading, error };
}
