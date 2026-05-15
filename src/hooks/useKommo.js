import { useState, useEffect, useCallback } from 'react';

// Chama a Vercel Function proxy em /api/kommo
async function fetchKommo(endpoint, params = {}) {
  const qs = new URLSearchParams({ endpoint, ...params }).toString();
  const res = await fetch(`/api/kommo?${qs}`);
  if (!res.ok) throw new Error(`Kommo API error: ${res.status}`);
  return res.json();
}

// ─── Hook genérico ────────────────────────────────────────────────────────────
export function useKommo(endpoint, params = {}, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchKommo(endpoint, params);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, JSON.stringify(params)]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

// ─── Busca pipelines + etapas ─────────────────────────────────────────────────
export function usePipelines() {
  return useKommo('pipelines', { limit: 50 });
}

// ─── Busca leads agrupados por etapa (com filtro de data) ────────────────────
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
        // 1. Busca todos os pipelines e etapas
        const pipelines = await fetchKommo('pipelines', { limit: 50 });
        const allPipelines = pipelines?._embedded?.pipelines || [];

        // 2. Para cada pipeline, busca leads com filtro de data
        const params = { limit: 250, 'filter[created_at][from]': dateFrom, 'filter[created_at][to]': dateTo };
        const leadsData = await fetchKommo('leads', params);
        const leads = leadsData?._embedded?.leads || [];

        // 3. Monta mapa: status_id → { name, pipeline_name, count, value }
        const stageMap = {};
        allPipelines.forEach((pipe) => {
          (pipe._embedded?.statuses || []).forEach((status) => {
            if (status.type !== 142) { // ignora "Ganho" e "Perdido" default
              stageMap[status.id] = {
                id: status.id,
                name: status.name,
                pipeline: pipe.name,
                pipeline_id: pipe.id,
                color: status.color || '#888',
                count: 0,
                value: 0,
              };
            }
          });
        });

        // 4. Conta leads por etapa
        leads.forEach((lead) => {
          const sid = lead.status_id;
          if (stageMap[sid]) {
            stageMap[sid].count += 1;
            stageMap[sid].value += lead.price || 0;
          }
        });

        if (!cancelled) {
          setStages(Object.values(stageMap));
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

  return { stages, loading, error };
}

// ─── Busca métricas gerais (conversas, leads ganhos/perdidos) ────────────────
export function useKommoSummary(dateFrom, dateTo) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = {
          limit: 250,
          'filter[created_at][from]': dateFrom,
          'filter[created_at][to]': dateTo,
        };

        const [leadsData, wonData, lostData] = await Promise.all([
          fetchKommo('leads', params),
          fetchKommo('leads', { ...params, 'filter[statuses][0][status_id]': 142 }),
          fetchKommo('leads', { ...params, 'filter[statuses][0][status_id]': 143 }),
        ]);

        const leads = leadsData?._embedded?.leads || [];
        const won   = wonData?._embedded?.leads   || [];
        const lost  = lostData?._embedded?.leads  || [];

        const totalValue    = leads.reduce((s, l) => s + (l.price || 0), 0);
        const wonValue      = won.reduce((s, l) => s + (l.price || 0), 0);

        if (!cancelled) {
          setSummary({
            totalLeads:  leads.length,
            totalValue,
            wonLeads:    won.length,
            wonValue,
            lostLeads:   lost.length,
            activeLeads: leads.length - won.length - lost.length,
          });
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

  return { summary, loading, error };
}
