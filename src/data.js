// ─── SHEET CONFIG ────────────────────────────────────────────────────────────
const SHEET_ID  = '1f-swsrdHi4hzActznp53s1Os-3Hhgh3tC9vDUB6uLj4';
const SHEET_GID = '0';

// ─── FETCH DA PLANILHA ───────────────────────────────────────────────────────
export async function fetchSheetData() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Falha ao buscar dados da planilha');
  const text = await res.text();
  return parseCSV(text);
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  }).filter(row => row['Campaign Name'] && row['Day']);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── PARSE DE NÚMERO BR (vírgula como decimal) ───────────────────────────────
function parseNum(str) {
  if (!str || str === '') return 0;
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
}

// ─── CLASSIFICAÇÃO DE CAMPANHA ───────────────────────────────────────────────
export function isClinica(campName) {
  const n = campName.toLowerCase();
  return (
    n.includes('leads/whats') ||
    n.includes('leads - whats') ||
    n.includes('leads - wpp') ||
    n.includes('fk - leads - whatsapp') ||
    n.includes('gr - leads') ||
    n.includes('fk | [tráfego]') ||
    n.includes('tráfego')
  ) && !isWebinar(campName);
}

export function isWebinar(campName) {
  const n = campName.toLowerCase();
  return (
    n.includes('webnario') ||
    n.includes('webinar') ||
    n.includes('webná') ||
    n.includes('webnário')
  );
}

// ─── NORMALIZAR ROW ──────────────────────────────────────────────────────────
export function normalizeRow(row) {
  return {
    camp:    row['Campaign Name'] || '',
    cj:      row['Ad Set Name']   || '',
    ad:      row['Ad Name']        || '',
    spent:   parseNum(row['Amount Spent']),
    reach:   parseNum(row['Reach']),
    imp:     parseNum(row['Impressions']),
    cpm:     parseNum(row['CPM (Cost per 1,000 Impressions)']),
    clicks:  parseNum(row['Link Clicks']),
    lpv:     parseNum(row['Landing Page Views']),
    msg:     parseNum(row['Messaging Conversations Started']),
    forms:   parseNum(row['Forms']),
    day:     row['Day'] || '',
  };
}

// ─── FILTRO POR RANGE DE DATAS ───────────────────────────────────────────────
export function filterByDateRange(data, startDate, endDate) {
  if (!startDate && !endDate) return data;
  return data.filter(d => {
    if (!d.day) return false;
    const rowDate = new Date(d.day + 'T00:00:00');
    if (startDate && rowDate < startDate) return false;
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (rowDate > endOfDay) return false;
    }
    return true;
  });
}

// ─── FILTRO LEGADO (period string) ───────────────────────────────────────────
export function filterByPeriod(data, period) {
  const allDates = [...new Set(data.map(d => d.day))].sort();
  if (period === 'month') return data;
  if (period === 'week')  return data.filter(d => allDates.slice(-7).includes(d.day));
  if (period === 'day')   return data.filter(d => d.day === allDates[allDates.length - 1]);
  return data;
}

// ─── FORMATAÇÃO DE DATA ──────────────────────────────────────────────────────
// Input: "2026-04-01" → Output: "01/04"
export function fmtDay(dayStr) {
  if (!dayStr) return '';
  const parts = dayStr.split('-');
  if (parts.length < 3) return dayStr;
  return `${parts[2]}/${parts[1]}`;
}

// ─── FORMATAÇÃO DE VALORES ───────────────────────────────────────────────────
export function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtK(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1000) return 'R$ ' + (n / 1000).toFixed(1).replace('.', ',') + 'k';
  return fmt(n);
}

// ─── CORES ───────────────────────────────────────────────────────────────────
export const GOLD         = '#c8922a';
export const GOLD_LIGHT   = '#fdbe59';
export const BLUE         = '#4D8EFF';
export const GREEN        = '#22D98A';
export const RED          = '#FF3B5C';
export const CHART_COLORS = [GOLD, BLUE, GREEN, '#A855F7', RED, '#FF8C00', '#0F6E56'];

// ─── DDD → ESTADO ────────────────────────────────────────────────────────────
export const DDD_ESTADO = {
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

// ─── TINTIM — ORIGEM DOS LEADS POR DDD ───────────────────────────────────────
const TINTIM_SHEET_ID = '16FeGzeoNUWjBt99Zyw9FgDkn8qzp3-JX5C7e3Yostro';

function parseDateStr(str) {
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(str);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}

function extractDDDStr(phone) {
  if (!phone) return '';
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  if (d.startsWith('0')  && d.length >= 11) d = d.slice(1);
  return d.length >= 10 ? d.slice(0, 2) : '';
}

export async function fetchTintimData() {
  const url = `https://docs.google.com/spreadsheets/d/${TINTIM_SHEET_ID}/export?format=csv&gid=0`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Falha ao buscar dados do Tintim');
  const text = await res.text();
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const fi = pats => headers.findIndex(h => pats.some(p => h.includes(p)));

  const iNome   = fi(['nome', 'name']);
  const iPhone  = fi(['telefone', 'phone', 'fone', 'celular', 'whatsapp']);
  const iDDD    = headers.indexOf('ddd');
  const iEstado = fi(['estado', 'state', 'uf']);
  const iData   = headers.findIndex(h => /^data|^date|timestamp|criado|created/.test(h));

  return lines.slice(1)
    .map(line => {
      const v      = parseCSVLine(line);
      const nome   = iNome   >= 0 ? (v[iNome]   || '').trim() : '';
      const phone  = iPhone  >= 0 ? (v[iPhone]  || '').trim() : '';
      const ddd    = iDDD    >= 0 ? (v[iDDD]    || '').trim() : extractDDDStr(phone);
      const estado = iEstado >= 0 ? (v[iEstado] || '').trim() : (DDD_ESTADO[ddd] || '');
      const day    = parseDateStr(iData >= 0 ? (v[iData] || '') : '');
      return { nome, phone, ddd, estado, day };
    })
    .filter(r => r.nome.length > 0);
}

// ─── MOCK DDD (mantido para compatibilidade) ──────────────────────────────────
export const DDD_MOCK = [];
