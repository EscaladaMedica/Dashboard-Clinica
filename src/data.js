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

// ─── MOCK DDD (substituir quando Tintim estiver integrado) ───────────────────
export const DDD_MOCK = [
  { ddd: '62', estado: 'GO', count: 34 },
  { ddd: '61', estado: 'DF', count: 18 },
  { ddd: '11', estado: 'SP', count: 12 },
  { ddd: '31', estado: 'MG', count: 9  },
  { ddd: '21', estado: 'RJ', count: 7  },
  { ddd: '71', estado: 'BA', count: 5  },
  { ddd: '41', estado: 'PR', count: 4  },
  { ddd: '85', estado: 'CE', count: 3  },
];
