import { useState, useEffect } from 'react';

async function fetchKommo(endpoint, params = {}) {
  const qs = new URLSearchParams({ endpoint, ...params }).toString();
  const res = await fetch(`/api/kommo?${qs}`);
  if (!res.ok) throw new Error(`Kommo API error: ${res.status}`);
  return res.json();
}

async function fetchAllPages(endpoint, baseParams = {}, onProgress) {
  let page = 1;
  let all = [];
  while (true) {
    const data = await fetchKommo(endpoint, { ...baseParams, limit: 250, page });
    const key = endpoint.split('/')[0];
    const embedded = data?._embedded;
    const items = embedded ? Object.values(embedded)[0] : [];
    all = [...all, ...items];
    if (onProgress) onProgress(page, all.length);
    if (!data?._links?.next) break;
    page++;
    if (page > 20) break;
  }
  return all;
}

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

        const leadsData = await fetchKommo('leads', {
          limit: 250,
          'filter[created_at][from]': dateFrom,
          'filter[created_at][to]': dateTo,
        });
        const leads = leadsData?._embedded?.leads || [];

        const stageMap = {};
        allPipelines.forEach((pipe) => {
          (pipe._embedded?.statuses || []).forEach((status) => {
            if (status.type !== 1) {
              stageMap[`${pipe.id}_${status.id}`] = {
                id: status.id,
                name: status.name,
                pipeline: pipe.name,
                pipeline_id: pipe.id,
                count: 0,
                value: 0,
              };
            }
          });
        });

        leads.forEach((lead) => {
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

export function useKommoSummary(dateFrom, dateTo) {
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [talkProgress, setProgress] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setProgress(null);
      try {
        const [leadsData, talks] = await Promise.all([
          fetchKommo('leads', {
            limit: 250,
            'filter[created_at][from]': dateFrom,
            'filter[created_at][to]': dateTo,
          }),
          fetchAllPages('talks', {}, (page, count) => {
            if (!cancelled) setProgress({ page, count });
          }),
        ]);

        const leads   = leadsData?._embedded?.leads || [];
        const won     = leads.filter(l => l.status_id === 142);
        const lost    = leads.filter(l => l.status_id === 143);
        const active  = leads.filter(l => l.status_id !== 142 && l.status_id !== 143);
        const inWork  = talks.filter(t => t.is_in_work);
        const unread  = talks.filter(t => !t.is_read);

        if (!cancelled) {
          setSummary({
            totalLeads:  leads.length,
            totalValue:  leads.reduce((s, l) => s + (l.price || 0), 0),
            wonLeads:    won.length,
            wonValue:    won.reduce((s, l) => s + (l.price || 0), 0),
            lostLeads:   lost.length,
            activeLeads: active.length,
            talksTotal:  talks.length,
            talksInWork: inWork.length,
            talksUnread: unread.length,
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

  return { summary, loading, error, talkProgress };
}
