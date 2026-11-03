const fs = require('fs');
const path = require('path');

const t = new Date();
const y = t.getFullYear();
const m = t.getMonth();
const pad = n => String(n).padStart(2, '0');
const d = dd => `${y}-${pad(m + 1)}-${pad(dd)}`;
const curYm = `${y}-${pad(m + 1)}`;
const prevYm = `${m === 0 ? y - 1 : y}-${pad(m === 0 ? 12 : m)}`;
const hoje = t.getDate();

const s = {
  categories: [
    { id: 'c-aluguel', name: 'Aluguel & Moradia', color: '#2F5DB3', budget: 1500 },
    { id: 'c-casa',    name: 'Casa (luz, água, gás)', color: '#5B7F77', budget: 400 },
    { id: 'c-mercado', name: 'Mercado & Feira', color: '#1E7B58', budget: 800 },
    { id: 'c-comb',    name: 'Combustível & Transporte', color: '#A8721A', budget: 350 },
    { id: 'c-farm',    name: 'Farmácia & Saúde', color: '#C0472F', budget: 200 },
    { id: 'c-lazer',   name: 'Lazer & Restaurante', color: '#7A5FB5', budget: 300 },
    { id: 'c-assin',   name: 'Assinaturas & Internet', color: '#8A6D3B', budget: 250 },
    { id: 'c-outros',  name: 'Outros & Imprevistos', color: '#6E7D83', budget: 200 }
  ],
  fixed: [
    {
      id: 'f-aluguel',
      name: 'Aluguel residencial',
      catId: 'c-aluguel',
      dueDay: 5,
      value: 1200.00,
      active: true,
      recurrence: 'monthly',
      variable: false,
      notes: 'Pix imobiliária: aluguel@imobiliaria.com.br'
    },
    {
      id: 'f-energia',
      name: 'Energia elétrica (Enel / Cemig)',
      catId: 'c-casa',
      dueDay: 10,
      value: 186.40,
      active: true,
      recurrence: 'monthly',
      variable: true,
      monthValues: { [curYm]: 204.50 },
      notes: 'Débito em conta ou boleto digital'
    },
    {
      id: 'f-agua',
      name: 'Água e esgoto (Sabesp / Copasa)',
      catId: 'c-casa',
      dueDay: 8,
      value: 78.90,
      active: true,
      recurrence: 'monthly',
      variable: true,
      monthValues: {},
      notes: 'Vencimento dia 8'
    },
    {
      id: 'f-internet',
      name: 'Internet Fibra 600 Mega',
      catId: 'c-assin',
      dueDay: 15,
      value: 119.90,
      active: true,
      recurrence: 'monthly',
      variable: false
    },
    {
      id: 'f-stream',
      name: 'Streaming (Netflix + Spotify)',
      catId: 'c-assin',
      dueDay: 20,
      value: 65.80,
      active: true,
      recurrence: 'monthly',
      variable: false
    },
    {
      id: 'f-seguro',
      name: 'Seguro do Carro (Parcelado)',
      catId: 'c-comb',
      dueDay: 12,
      value: 185.00,
      active: true,
      recurrence: 'installments',
      installments: { total: 10, startMonth: prevYm },
      notes: 'Porto Seguro — Parcela automática'
    }
  ],
  paidFixed: {
    [curYm]: [
      { id: 'f-aluguel', paidAt: d(Math.min(5, hoje)), paidValue: 1200.00 }
    ]
  },
  vars: [
    { id: 'v1', date: d(Math.max(1, hoje - 4)), catId: 'c-mercado', desc: 'Compras da semana (Hipermercado)', value: 245.80, status: 'pago' },
    { id: 'v2', date: d(Math.max(1, hoje - 2)), catId: 'c-comb',    desc: 'Gasolina aditivada (Posto Shell)',  value: 150.00, status: 'pago' },
    { id: 'v3', date: d(hoje),                  catId: 'c-mercado', desc: 'Padaria e feira livre',          value: 46.50,  status: 'pago' },
    { id: 'v4', date: d(hoje),                  catId: 'c-farm',    desc: 'Medicamentos na Drogaria',        value: 62.90,  status: 'pago' },
    { id: 'v5', date: d(hoje),                  catId: 'c-lazer',   desc: 'Jantar em família (Pizzaria)',   value: 88.00,  status: 'pendente' }
  ]
};

const targetPath = path.join(__dirname, 'data', 'caderneta.json');
fs.writeFileSync(targetPath, JSON.stringify(s, null, 2), 'utf8');
console.log('Seed gerado com sucesso em:', targetPath);
