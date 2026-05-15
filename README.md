# Escalada Médica — Dashboard

Dashboard de gestão MKT + Comercial para Escalada Médica e Webinário Dra. Dayane.

## Stack

- **React 18** + **Recharts** para visualizações
- **Vercel** para deploy (configuração zero)

## Estrutura

```
src/
  data.js              # Dados reais (Meta Ads) + mocks (Kommo/Tintim)
  App.jsx              # Shell, header, tabs, seletor de período
  components/
    UI.jsx             # Componentes reutilizáveis (MetricCard, Badge, DataTable...)
    TabClinica.jsx     # Aba tráfego clínica
    TabComercial.jsx   # Aba comercial (closers, médicos, planos)
    TabWebinar.jsx     # Aba tráfego webinário
```

## Setup local

```bash
npm install
npm start
```

Abre em `http://localhost:3000`

## Deploy no Vercel

1. Faça push para o GitHub
2. Acesse [vercel.com](https://vercel.com) → Import Project → selecione o repositório
3. Framework: **Create React App** (detectado automaticamente)
4. Build command: `npm run build`
5. Output directory: `build`
6. Deploy → pronto

## Integração de dados (próximos passos)

### Meta Ads → Google Sheets (já funciona)
Substituir os arrays em `data.js` por fetch na API pública da planilha:
```js
const SHEET_ID = 'SEU_SHEET_ID';
const GID_CLINICA = 'GID_DA_ABA';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID_CLINICA}`;
```

### Kommo → Comercial
- Make: Kommo webhook → Google Sheets aba `comercial_mock`
- Dashboard lê a aba via API pública

### Tintim → DDD
- Make: Tintim webhook → Google Sheets aba `leads_ddd`
- Dashboard lê e plota barras por DDD/estado

## Status dos dados

| Fonte         | Status          | Aba         |
|---------------|-----------------|-------------|
| Meta Ads      | ✅ Real          | TabClinica, TabWebinar |
| Kommo         | 🟡 Mock          | TabComercial |
| Tintim (DDD)  | 🟡 Mock          | TabClinica |
