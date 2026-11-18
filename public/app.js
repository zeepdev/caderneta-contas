/**
 * Caderneta — Contas de Casa
 * Desenvolvido por Athena Growth Marketing
 * Gerenciador financeiro doméstico inteligente, recorrente e 100% funcional.
 * Sincronização em tempo real via Nuvem Supabase + Armazenamento Local.
 */

'use strict';

/* ================= CONFIGURAÇÃO DO SUPABASE ================= */
const SUPABASE_CONFIG = {
  url: 'https://ytqslwzrziodicsqgvnq.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cXNsd3pyemlvZGljc3Fndm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NDAxNDEsImV4cCI6MjEwOTIxNjE0MX0.wWRqjHPekKlBFMkg02cAaIYpxbRpdYi2gw6NUV29TBo'
};

/* ================= ESTADO & CONSTANTES ================= */
const LS_KEY = 'caderneta.v2';
const DEFAULT_CATS = [
  { id: 'c-aluguel', name: 'Aluguel & Moradia', color: '#2F5DB3', budget: 1500 },
  { id: 'c-casa',    name: 'Casa (luz, água, gás)', color: '#5B7F77', budget: 400 },
  { id: 'c-mercado', name: 'Mercado & Feira', color: '#1E7B58', budget: 800 },
  { id: 'c-comb',    name: 'Combustível & Transporte', color: '#A8721A', budget: 350 },
  { id: 'c-farm',    name: 'Farmácia & Saúde', color: '#C0472F', budget: 200 },
  { id: 'c-lazer',   name: 'Lazer & Restaurante', color: '#7A5FB5', budget: 300 },
  { id: 'c-assin',   name: 'Assinaturas & Internet', color: '#8A6D3B', budget: 250 },
  { id: 'c-outros',  name: 'Outros & Imprevistos', color: '#6E7D83', budget: 200 },
];

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

let storageOk = true;
try {
  localStorage.setItem('_t', '1');
  localStorage.removeItem('_t');
} catch (e) {
  storageOk = false;
}

function uid() {
  return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function ymKey(dt) {
  return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1);
}

function ymDate(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function ymAdd(key, n) {
  const d = ymDate(key);
  d.setMonth(d.getMonth() + n);
  return ymKey(d);
}

function diffMonths(fromYm, toYm) {
  const [y1, m1] = fromYm.split('-').map(Number);
  const [y2, m2] = toYm.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

const hojeYM = () => ymKey(new Date());

function fmtBRL(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDiaSem(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const x = new Date(y, m - 1, d, 12, 0, 0);
  return x.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 3500);
}

/* Ícones SVG embutidos */
const IC = {
  edit: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"/></svg>`,
  check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  undo: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>`,
  plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  coin: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>`,
  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`
};

/* Seed de exemplo inicial */
function seed() {
  const t = new Date();
  const y = t.getFullYear(), m = t.getMonth();
  const d = (dd) => `${y}-${pad2(m + 1)}-${pad2(dd)}`;
  const hoje = t.getDate();
  const curYm = ymKey(t);

  return {
    categories: JSON.parse(JSON.stringify(DEFAULT_CATS)),
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
        installments: { total: 10, startMonth: ymAdd(curYm, -2) },
        notes: 'Porto Seguro — Parcela automática'
      }
    ],
    paidFixed: {
      [curYm]: [
        { id: 'f-aluguel', paidAt: d(Math.min(5, hoje)), paidValue: 1200.00 }
      ]
    },
    vars: [
      { id: uid(), date: d(Math.max(1, hoje - 4)), catId: 'c-mercado', desc: 'Compras da semana (Hipermercado)', value: 245.80, status: 'pago' },
      { id: uid(), date: d(Math.max(1, hoje - 2)), catId: 'c-comb',    desc: 'Gasolina aditivada (Posto Shell)',  value: 150.00, status: 'pago' },
      { id: uid(), date: d(hoje),                  catId: 'c-mercado', desc: 'Padaria e feira livre',          value: 46.50,  status: 'pago' },
      { id: uid(), date: d(hoje),                  catId: 'c-farm',    desc: 'Medicamentos na Drogaria',        value: 62.90,  status: 'pago' },
      { id: uid(), date: d(hoje),                  catId: 'c-lazer',   desc: 'Jantar em família (Pizzaria)',   value: 88.00,  status: 'pendente' }
    ]
  };
}

/* ================= GERENCIAMENTO DE DADOS (SUPABASE TEMPO REAL + LOCAL) ================= */
let state = null;
let lastServerTimestamp = 0;
let lastLocalSaveTime = 0;
let pendingRemoteData = null;
let isRealtimeSubscribed = false;

/* ================= ESTADO DE INVESTIMENTOS (RESTRITO & SEPARADO) ================= */
const LS_INVEST_KEY = 'caderneta.investments.v1';
let investmentsState = null;
let isInvestUnlocked = sessionStorage.getItem('caderneta.invest.unlocked') === '1';
let investSelectedDate = new Date().toISOString().split('T')[0];
let investCategoryFilter = 'todas';
let lastInvestServerTimestamp = 0;
let lastInvestLocalSaveTime = 0;
let isInvestRealtimeSubscribed = false;
let pendingInvestRemoteData = null;
let saveInvestSupabaseTimer = null;

const view = {
  ym: hojeYM(),
  tab: 'resumo',
  filtroCat: null,
  filtroFixaStatus: 'todas',
  buscaVar: ''
};

function updateSyncStatus(text, ok = true) {
  const el = document.getElementById('syncText');
  const dot = document.querySelector('.status-dot');
  if (el) el.textContent = text;
  if (dot) dot.style.background = ok ? 'var(--verde)' : 'var(--ambar)';
}

function loadLocal() {
  if (!storageOk) return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveLocal() {
  if (storageOk && state) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {}
  }
}

// Aplica atualização remota de forma 100% segura (sem fechar modais ou perder digitação)
function applyRemoteUpdate(remoteData, serverTimeIso) {
  const serverTime = new Date(serverTimeIso).getTime();

  // Se o servidor tiver dados mais antigos ou iguais ao que já temos, ignora
  if (serverTime <= lastServerTimestamp) return;

  // Se o usuário acabou de salvar localmente (menos de 1.5s), ignora eco da própria alteração
  if (Date.now() - lastLocalSaveTime < 1500) return;

  // Se o conteúdo for idêntico ao que já está em tela, só atualiza o timestamp
  if (JSON.stringify(remoteData) === JSON.stringify(state)) {
    lastServerTimestamp = serverTime;
    return;
  }

  // Se houver um modal (dialog) aberto ou usuário digitando em algum campo, NÃO fecha o modal!
  const hasOpenDialog = !!document.querySelector('dialog[open]');
  const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

  if (hasOpenDialog || isTyping) {
    // Guarda para aplicar assim que fechar o modal
    pendingRemoteData = { data: remoteData, time: serverTime };
    return;
  }

  // Aplica suavemente preservando posição da rolagem
  const scrollY = window.scrollY;
  const currentSearch = view.buscaVar;
  
  state = remoteData;
  lastServerTimestamp = serverTime;
  saveLocal();
  render();
  
  window.scrollTo(0, scrollY);
  
  // Se o campo de busca estiver ativo, restaura
  if (currentSearch) {
    const sInp = document.getElementById('varSearchInput');
    if (sInp) sInp.value = currentSearch;
  }

  toast('Sincronizado da nuvem em tempo real ⚡');
}

// Salva no Supabase com debouncing
let saveSupabaseTimer = null;
async function saveSupabase() {
  clearTimeout(saveSupabaseTimer);
  saveSupabaseTimer = setTimeout(async () => {
    if (!state) return;
    try {
      lastLocalSaveTime = Date.now();
      const nowIso = new Date().toISOString();
      const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/caderneta_state?on_conflict=id`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          id: 'default',
          data: state,
          updated_at: nowIso
        })
      });

      if (res.ok) {
        lastServerTimestamp = new Date(nowIso).getTime();
        updateSyncStatus('Nuvem Supabase sincronizada', true);
      } else {
        throw new Error('HTTP ' + res.status);
      }
    } catch (err) {
      updateSyncStatus('Salvo localmente (offline)', false);
    }
  }, 350);
}

function saveServerDisk() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.startsWith('192.168.')) {
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    }).catch(() => {});
  }
}

function save() {
  lastLocalSaveTime = Date.now();
  saveLocal();
  saveServerDisk();
  saveSupabase();
}

async function fetchFromSupabase() {
  try {
    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/caderneta_state?id=eq.default&select=data,updated_at`, {
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
      }
    });

    if (res.ok) {
      const rows = await res.json();
      if (rows && rows.length > 0 && rows[0].data) {
        const row = rows[0];
        const serverTime = new Date(row.updated_at).getTime();
        if (serverTime > lastServerTimestamp) {
          applyRemoteUpdate(row.data, row.updated_at);
          return true;
        }
      }
    }
  } catch (err) {
    // Offline
  }
  return false;
}

// Configura WebSockets do Supabase para atualização em < 400ms
function setupSupabaseRealtime() {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      const sbClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      sbClient.channel('caderneta-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'caderneta_state',
          filter: 'id=eq.default'
        }, payload => {
          if (payload && payload.new && payload.new.data) {
            applyRemoteUpdate(payload.new.data, payload.new.updated_at);
          }
        })
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            isRealtimeSubscribed = true;
            updateSyncStatus('Tempo Real Ativo (WebSockets)', true);
          }
        });
    } catch (e) {
      // Fallback para polling
    }
  }
}

async function initData() {
  // 1. Carrega local imediato (0ms)
  let localData = loadLocal();
  if (localData && localData.fixed && localData.categories) {
    state = localData;
    render();
  }

  // 1b. Carrega investimentos local imediato (0ms)
  loadInvestLocal();

  // 2. Busca na nuvem Supabase
  const loadedFromCloud = await fetchFromSupabase();
  if (!loadedFromCloud && !state) {
    state = seed();
    save();
    render();
  }

  // 2b. Busca investimentos na nuvem Supabase
  await fetchInvestmentsFromSupabase();

  // 3. Conecta WebSocket em Tempo Real
  setupSupabaseRealtime();
  setupInvestmentsRealtime();

  // 4. Polling inteligente de 5 em 5 segundos como garantia de conexão
  setInterval(async () => {
    if (document.hidden) return; // Economiza rede e bateria se em segundo plano
    await fetchFromSupabase();
    await fetchInvestmentsFromSupabase();
  }, 5000);

  // 5. Verifica se a URL contém hash secreto (#invest ou #investimentos)
  checkHashInvest();
}

/* ================= HELPERS DO MODELO ================= */
function catById(id) {
  return state.categories.find(c => c.id === id) || { name: 'Geral', color: '#6E7D83' };
}

function fixedList(ym = view.ym) {
  return (state.fixed || []).filter(f => {
    if (!f.active) return false;
    
    // Recorrência Parcelada
    if (f.recurrence === 'installments' && f.installments) {
      const diff = diffMonths(f.installments.startMonth, ym);
      if (diff < 0 || diff >= f.installments.total) return false;
    }
    
    // Recorrência Anual
    if (f.recurrence === 'annual' && f.annualMonth) {
      const curMonthNum = ymDate(ym).getMonth() + 1;
      if (curMonthNum !== f.annualMonth) return false;
    }

    return true;
  });
}

function getInstallmentInfo(f, ym = view.ym) {
  if (f.recurrence === 'installments' && f.installments) {
    const diff = diffMonths(f.installments.startMonth, ym);
    const atual = diff + 1;
    const total = f.installments.total;
    return { atual, total };
  }
  return null;
}

function varsDoMes(ym = view.ym) {
  return (state.vars || []).filter(v => v.date && v.date.slice(0, 7) === ym);
}

function effVal(f, ym = view.ym) {
  if (f.monthValues && f.monthValues[ym] != null) {
    return Number(f.monthValues[ym]);
  }
  return Number(f.value || 0);
}

function temValMes(f, ym = view.ym) {
  return f.monthValues && f.monthValues[ym] != null;
}

function isPago(f, ym = view.ym) {
  const arr = (state.paidFixed && state.paidFixed[ym]) || [];
  return arr.some(item => (typeof item === 'string' ? item === f.id : item.id === f.id));
}

function getPagoInfo(f, ym = view.ym) {
  const arr = (state.paidFixed && state.paidFixed[ym]) || [];
  const found = arr.find(item => (typeof item === 'string' ? item === f.id : item.id === f.id));
  if (!found) return null;
  return typeof found === 'string' ? { id: found, paidAt: null } : found;
}

function statusFixa(f, ym = view.ym) {
  if (isPago(f, ym)) return 'pago';
  if (ym !== hojeYM()) return 'aberto';
  const hojeDia = new Date().getDate();
  if (f.dueDay < hojeDia) return 'vencido';
  if (f.dueDay - hojeDia <= 3) return 'a-vencer';
  return 'aberto';
}

function totalFixas(ym = view.ym) {
  return fixedList(ym).reduce((s, f) => s + effVal(f, ym), 0);
}

function totalVars(ym = view.ym) {
  return varsDoMes(ym).reduce((s, v) => s + Number(v.value || 0), 0);
}

function pagoFixas(ym = view.ym) {
  return fixedList(ym).filter(f => isPago(f, ym)).reduce((s, f) => s + effVal(f, ym), 0);
}

function pagoVars(ym = view.ym) {
  return varsDoMes(ym).filter(v => v.status === 'pago').reduce((s, v) => s + Number(v.value || 0), 0);
}

function faltaPagarTotal(ym = view.ym) {
  const fixasAbertas = fixedList(ym).filter(f => !isPago(f, ym)).reduce((s, f) => s + effVal(f, ym), 0);
  const varsPendentes = varsDoMes(ym).filter(v => v.status === 'pendente').reduce((s, v) => s + Number(v.value || 0), 0);
  return fixasAbertas + varsPendentes;
}

/* ================= RENDERIZADOR PRINCIPAL ================= */
function render() {
  if (!state) return;

  const dt = ymDate(view.ym);
  const isAtual = view.ym === hojeYM();
  
  document.getElementById('mesTitulo').innerHTML = `${esc(MESES[dt.getMonth()])} <span>${dt.getFullYear()}</span>`;
  document.getElementById('eyebrowMes').textContent = isAtual ? 'mês em curso' : (view.ym < hojeYM() ? 'mês anterior' : 'mês futuro');
  
  const btnHoje = document.getElementById('btnIrHoje');
  if (btnHoje) {
    btnHoje.style.display = isAtual ? 'none' : 'inline-block';
  }

  const tf = totalFixas();
  const tv = totalVars();
  const totalGeral = tf + tv;
  const pgFix = pagoFixas();
  const pgVar = pagoVars();
  const pgTotal = pgFix + pgVar;
  const falta = faltaPagarTotal();

  document.getElementById('stFixas').textContent = fmtBRL(tf);
  document.getElementById('stVars').textContent = fmtBRL(tv);
  
  const stFaltaEl = document.getElementById('stFalta');
  stFaltaEl.textContent = fmtBRL(falta);
  const faltaBox = document.getElementById('statFaltaBox');
  if (faltaBox) {
    if (falta <= 0 && totalGeral > 0) {
      faltaBox.className = 'stat ok';
      stFaltaEl.textContent = 'R$ 0,00 (Tudo pago!)';
    } else {
      faltaBox.className = 'stat hi';
    }
  }

  const pct = totalGeral > 0 ? Math.min(100, Math.round((pgTotal / totalGeral) * 100)) : 0;
  document.getElementById('pagoFill').style.width = pct + '%';
  document.getElementById('pagoTxt').textContent = `Total quitado: ${fmtBRL(pgTotal)} de ${fmtBRL(totalGeral)} (${pct}%)`;

  const vencidas = fixedList().filter(f => statusFixa(f) === 'vencido');
  const vencTxtEl = document.getElementById('vencTxt');
  if (vencidas.length > 0) {
    vencTxtEl.innerHTML = `<b style="color:var(--verm)">⚠ ${vencidas.length} conta${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''}!</b>`;
  } else {
    vencTxtEl.innerHTML = `<span style="color:var(--verde);font-weight:600">✓ Vencimentos em dia</span>`;
  }

  document.getElementById('nFixas').textContent = fixedList().length;
  document.getElementById('nVars').textContent = varsDoMes().length;
  document.getElementById('nCats').textContent = state.categories.length;

  const tabInvestEl = document.getElementById('tabInvest');
  if (tabInvestEl) {
    tabInvestEl.style.display = isInvestUnlocked ? 'inline-flex' : 'none';
  }

  const heroSec = document.querySelector('section.hero');
  if (heroSec) {
    heroSec.style.display = view.tab === 'invest' ? 'none' : '';
  }

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('on', t.dataset.tab === view.tab);
  });

  const c = document.getElementById('conteudo');
  if (view.tab === 'resumo') c.innerHTML = htmlResumo();
  if (view.tab === 'fixas')  c.innerHTML = htmlFixas();
  if (view.tab === 'vars')   c.innerHTML = htmlVars();
  if (view.tab === 'cats')   c.innerHTML = htmlCats();
  if (view.tab === 'invest') c.innerHTML = htmlInvest();
}

/* ================= 1. TAB: RESUMO ================= */
function donutSVG(itens) {
  const total = itens.reduce((s, i) => s + i.value, 0);
  if (!total) {
    return `<div class="empty" style="border:none;padding:24px 10px;">
      <b>Sem gastos variáveis</b>
      <p style="font-size:13px;color:var(--muted);margin-top:4px">Lance mercado, combustível ou lazer na aba Variáveis.</p>
    </div>`;
  }
  const R = 70, C = 2 * Math.PI * R;
  let off = 0, arcs = '';
  itens.forEach(i => {
    const frac = i.value / total;
    const len = frac * C;
    arcs += `<circle r="${R}" cx="90" cy="90" fill="none" stroke="${i.color}" stroke-width="26" stroke-dasharray="${Math.max(0, len - 2)} ${C - len + 2}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"/>`;
    off += len;
  });
  return `<svg viewBox="0 0 180 180" width="170" height="170" role="img" aria-label="Despesas por categoria">
    <circle r="70" cx="90" cy="90" fill="none" stroke="#E4ECE7" stroke-width="26"/>
    ${arcs}
    <text x="90" y="85" text-anchor="middle" font-family="Spline Sans Mono,monospace" font-weight="700" font-size="16" fill="#1B2A32">${fmtBRL(total).replace('R$', '').trim()}</text>
    <text x="90" y="103" text-anchor="middle" font-size="9.5" fill="#5C6B71" font-weight="700" letter-spacing="1">VARIÁVEIS</text>
  </svg>`;
}

function htmlResumo() {
  const porCat = {};
  varsDoMes().forEach(v => {
    porCat[v.catId] = (porCat[v.catId] || 0) + Number(v.value || 0);
  });
  const itens = Object.entries(porCat).map(([id, val]) => ({
    color: catById(id).color,
    name: catById(id).name,
    value: val
  })).sort((a, b) => b.value - a.value);

  const tv = totalVars();
  const leg = itens.map(i => `
    <li>
      <i style="background:${i.color}"></i>${esc(i.name)}
      <em>${tv > 0 ? Math.round((i.value / tv) * 100) : 0}%</em>
      <b>${fmtBRL(i.value)}</b>
    </li>
  `).join('');

  const abertas = fixedList().filter(f => statusFixa(f) !== 'pago').sort((a, b) => a.dueDay - b.dueDay);
  const vencHTML = abertas.map(f => {
    const st = statusFixa(f);
    const cat = catById(f.catId);
    const chip = st === 'vencido'
      ? `<span class="chip bad">Venceu dia ${f.dueDay}</span>`
      : st === 'a-vencer'
      ? `<span class="chip warn">Vence dia ${f.dueDay}</span>`
      : `<span class="chip neutral">Dia ${f.dueDay}</span>`;

    const parcelInfo = getInstallmentInfo(f);
    const parcelChip = parcelInfo ? `<span class="chip purple">${parcelInfo.atual}/${parcelInfo.total}</span>` : '';

    return `
      <div class="venc-item">
        <div class="dia">
          <small>VENCE</small>${pad2(f.dueDay)}
        </div>
        <div class="mid">
          <b>${esc(f.name)}</b>
          <span>
            <i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${cat.color}"></i>
            ${esc(cat.name)} ${parcelChip}
          </span>
        </div>
        <span class="val">${fmtBRL(effVal(f))}</span>
        ${chip}
        <button class="btn mini success" data-act="pagar" data-id="${f.id}" title="Marcar como pago">
          ${IC.check} Pagar
        </button>
      </div>
    `;
  }).join('') || `<div class="empty" style="border:none;padding:26px 16px;">
    <b>Tudo em dia por aqui! 🎉</b>
    <p style="font-size:13px;color:var(--muted);margin-top:4px">Todas as contas fixas deste mês já foram pagas.</p>
  </div>`;

  const ult = [...varsDoMes()]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 6)
    .map(v => {
      const cat = catById(v.catId);
      const isPendente = v.status === 'pendente';
      return `
        <div class="v-item ${isPendente ? 'pendente' : ''}">
          <div class="cdot" style="background:${cat.color}22">
            <i style="background:${cat.color}"></i>
          </div>
          <div class="mid">
            <b>${esc(v.desc || cat.name)}</b>
            <span>${fmtDiaSem(v.date)} · ${esc(cat.name)}</span>
          </div>
          <span class="val">${fmtBRL(v.value)}</span>
          ${isPendente ? '<span class="chip warn">pendente</span>' : '<span class="chip ok">pago</span>'}
          <button class="mini-ic" data-act="toggle-var-status" data-id="${v.id}" title="${isPendente ? 'Marcar como pago' : 'Marcar como pendente'}">
            ${isPendente ? IC.check : IC.undo}
          </button>
        </div>
      `;
    }).join('') || `<div class="empty" style="border:none;padding:26px 16px;">
      <b>Nenhum gasto lançado ainda</b>
      <p style="font-size:13px;color:var(--muted);margin-top:4px">Adicione gastos diários na aba Variáveis.</p>
    </div>`;

  return `
    <div class="sect-head" style="margin-top:4px">
      <div>
        <h2>Radar do mês</h2>
        <span class="sub">Gastos por categoria em ${esc(MESES[ymDate(view.ym).getMonth()])}</span>
      </div>
      <button class="btn ghost mini" data-act="quick-var-jump">${IC.plus} Lançar despesa rápida</button>
    </div>
    
    <div class="res-grid">
      <div class="card donut-card">
        <div class="donut-wrap">
          ${donutSVG(itens)}
          ${itens.length ? `<ul class="legend">${leg}</ul>` : ''}
        </div>
      </div>
      <div>
        <div class="sect-head" style="margin:0 2px 8px">
          <h2>Próximos vencimentos</h2>
          <span class="sub">${abertas.length} conta${abertas.length === 1 ? '' : 's'} em aberto</span>
        </div>
        <div class="card venc-list">${vencHTML}</div>
      </div>
    </div>

    <div class="sect-head">
      <div>
        <h2>Últimos lançamentos</h2>
        <span class="sub">Compras e despesas do dia a dia</span>
      </div>
      <button class="btn ghost mini" data-act="go-vars">Ver todos (${varsDoMes().length}) →</button>
    </div>
    ${ult}
  `;
}

/* ================= 2. TAB: CONTAS FIXAS & RECORRENTES ================= */
function htmlFixas() {
  let lista = fixedList();

  if (view.filtroFixaStatus === 'abertas') {
    lista = lista.filter(f => statusFixa(f) !== 'pago');
  } else if (view.filtroFixaStatus === 'pagas') {
    lista = lista.filter(f => statusFixa(f) === 'pago');
  } else if (view.filtroFixaStatus === 'vencidas') {
    lista = lista.filter(f => statusFixa(f) === 'vencido');
  }

  lista.sort((a, b) => a.dueDay - b.dueDay);

  const itens = lista.map(f => {
    const st = statusFixa(f);
    const cat = catById(f.catId);
    const pago = st === 'pago';
    const estim = f.variable && !temValMes(f);

    const chip = pago
      ? `<span class="chip ok">✓ Paga</span>`
      : st === 'vencido'
      ? `<span class="chip bad">Vencida</span>`
      : st === 'a-vencer'
      ? `<span class="chip warn">A vencer</span>`
      : `<span class="chip neutral">Em aberto</span>`;

    const chipVal = f.variable
      ? (temValMes(f) ? `<span class="chip ok">Fatura lançada</span>` : `<span class="chip warn">Estimativa</span>`)
      : '';

    const parcelInfo = getInstallmentInfo(f);
    const parcelChip = parcelInfo ? `<span class="chip purple">Parcela ${parcelInfo.atual} de ${parcelInfo.total}</span>` : '';

    const recLabel = f.recurrence === 'installments'
      ? `Parcelado (${parcelInfo ? parcelInfo.atual + '/' + parcelInfo.total : ''})`
      : f.recurrence === 'annual'
      ? `Anual (Mês ${f.annualMonth})`
      : `Mensal (todo mês)`;

    const pagoInfo = getPagoInfo(f);
    const pagoDateText = pago && pagoInfo && pagoInfo.paidAt
      ? `<span class="paid-date-badge">✓ Pago em ${fmtDiaSem(pagoInfo.paidAt)}</span>`
      : '';

    // Status único, limpo e sem sobreposição
    let statusBadge = '';
    if (pago) {
      statusBadge = `<div class="badge-pago-solid">PAGO</div>`;
    } else if (st === 'vencido') {
      statusBadge = `<span class="chip bad">Vencida</span>`;
    } else if (st === 'a-vencer') {
      statusBadge = `<span class="chip warn">A vencer</span>`;
    } else {
      statusBadge = `<span class="chip neutral">Em aberto</span>`;
    }

    return `
      <div class="fixa ${pago ? 'pago' : ''} ${f.variable ? 'var' : ''} ${f.recurrence === 'installments' ? 'parcelada' : ''}">
        <div class="stub"></div>
        <div class="main">
          <div class="info">
            <span class="cat"><i style="background:${cat.color}"></i>${esc(cat.name)}</span>
            <b>${esc(f.name)}</b>
            <span>Vence todo dia ${f.dueDay} · ${recLabel} ${f.variable ? '· valor varia por mês' : ''}</span>
            ${f.notes ? `<div class="notes-preview" title="${esc(f.notes)}">${esc(f.notes)}</div>` : ''}
            ${pagoDateText}
          </div>

          <div class="valor">
            ${estim && !pago ? '~ ' : ''}${fmtBRL(effVal(f))}
            <small>VENCE DIA ${pad2(f.dueDay)} ${estim && !pago ? '· ESTIMADO' : ''}</small>
          </div>

          <div class="status-col">
            ${statusBadge}
            ${chipVal}
            ${parcelChip}
          </div>

          <div class="acts">
            ${pago
              ? `<button class="btn ghost mini btn-estornar" data-act="desmarcar" data-id="${f.id}" title="Reabrir / estornar pagamento">
                   ${IC.undo} Estornar
                 </button>`
              : `<button class="btn mini success" data-act="pagar" data-id="${f.id}" title="Confirmar pagamento">
                   ${IC.check} Paguei
                 </button>`}
            
            <button class="mini-ic" data-act="val-mes" data-id="${f.id}" aria-label="Ajustar valor deste mês" title="Ajustar valor deste mês">
              ${IC.coin}
            </button>
            <button class="mini-ic" data-act="edit-fixa" data-id="${f.id}" aria-label="Editar conta fixa" title="Editar conta">
              ${IC.edit}
            </button>
            <button class="mini-ic del" data-act="del-fixa" data-id="${f.id}" aria-label="Excluir conta fixa" title="Excluir conta">
              ${IC.trash}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="sect-head" style="margin-top:4px">
      <div>
        <h2>Contas fixas & recorrentes</h2>
        <span class="sub">Total: ${fmtBRL(totalFixas())} · ${fmtBRL(pagoFixas())} já pago neste mês</span>
      </div>
      <button class="btn" data-act="new-fixa">${IC.plus} Nova conta fixa / recorrente</button>
    </div>

    <div class="fixa-filtros">
      <button class="fchip ${view.filtroFixaStatus === 'todas' ? 'on' : ''}" data-act="filtro-fixa" data-id="todas">Todas as contas</button>
      <button class="fchip ${view.filtroFixaStatus === 'abertas' ? 'on' : ''}" data-act="filtro-fixa" data-id="abertas">Em aberto</button>
      <button class="fchip ${view.filtroFixaStatus === 'pagas' ? 'on' : ''}" data-act="filtro-fixa" data-id="pagas">Pagas</button>
      <button class="fchip ${view.filtroFixaStatus === 'vencidas' ? 'on' : ''}" data-act="filtro-fixa" data-id="vencidas">Vencidas</button>
    </div>

    ${itens || `<div class="empty">
      <b>Nenhuma conta encontrada</b>
      <p style="font-size:13.5px;color:var(--muted);margin-top:4px">Cadastre aluguel, luz, condomínio, internet ou compras parceladas que se repetem todo mês.</p>
    </div>`}
  `;
}

/* ================= 3. TAB: VARIÁVEIS ================= */
function htmlVars() {
  const cats = state.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const hoje = new Date();
  const isoHoje = `${hoje.getFullYear()}-${pad2(hoje.getMonth() + 1)}-${pad2(hoje.getDate())}`;
  const defDate = view.ym === hojeYM() ? isoHoje : `${view.ym}-01`;

  let lista = varsDoMes();

  if (view.filtroCat) {
    lista = lista.filter(v => v.catId === view.filtroCat);
  }

  if (view.buscaVar) {
    const q = view.buscaVar.toLowerCase();
    lista = lista.filter(v => (v.desc && v.desc.toLowerCase().includes(q)) || (catById(v.catId).name.toLowerCase().includes(q)));
  }

  lista.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const porDia = {};
  lista.forEach(v => {
    (porDia[v.date] = porDia[v.date] || []).push(v);
  });

  const grupos = Object.entries(porDia).map(([dia, items]) => {
    const tot = items.reduce((s, v) => s + Number(v.value || 0), 0);
    return `
      <div class="dia-grupo">
        <h3>
          <span>${fmtDiaSem(dia)}</span>
          <b>${fmtBRL(tot)}</b>
        </h3>
        ${items.map(v => {
          const cat = catById(v.catId);
          const isPendente = v.status === 'pendente';
          return `
            <div class="v-item ${isPendente ? 'pendente' : ''}">
              <div class="cdot" style="background:${cat.color}22">
                <i style="background:${cat.color}"></i>
              </div>
              <div class="mid">
                <b>${esc(v.desc || cat.name)}</b>
                <span>${esc(cat.name)}</span>
              </div>
              <span class="val">${fmtBRL(v.value)}</span>
              ${isPendente ? '<span class="chip warn">pendente</span>' : '<span class="chip ok">pago</span>'}
              <div class="acts">
                <button class="mini-ic" data-act="toggle-var-status" data-id="${v.id}" title="${isPendente ? 'Marcar como pago' : 'Marcar como pendente'}">
                  ${isPendente ? IC.check : IC.undo}
                </button>
                <button class="mini-ic" data-act="edit-var" data-id="${v.id}" aria-label="Editar" title="Editar">
                  ${IC.edit}
                </button>
                <button class="mini-ic del" data-act="del-var" data-id="${v.id}" aria-label="Excluir" title="Excluir">
                  ${IC.trash}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');

  const chips = `<button class="fchip ${view.filtroCat ? '' : 'on'}" data-act="filtro" data-id="">Todas</button>` +
    state.categories.map(c => `
      <button class="fchip ${view.filtroCat === c.id ? 'on' : ''}" data-act="filtro" data-id="${c.id}">
        <i style="background:${c.color}"></i>${esc(c.name)}
      </button>
    `).join('');

  return `
    <div class="sect-head" style="margin-top:4px">
      <div>
        <h2>Despesas variáveis do dia a dia</h2>
        <span class="sub">Total lançado em ${esc(MESES[ymDate(view.ym).getMonth()])}: ${fmtBRL(totalVars())}</span>
      </div>
    </div>

    <div class="card quickadd">
      <div class="fld">
        <label for="qaData">Data</label>
        <input type="date" id="qaData" value="${defDate}" min="${view.ym}-01" max="${view.ym}-31">
      </div>
      <div class="fld">
        <label for="qaCat">Categoria</label>
        <select id="qaCat">${cats}</select>
      </div>
      <div class="fld">
        <label for="qaDesc">Descrição do gasto</label>
        <input type="text" id="qaDesc" placeholder="ex.: Supermercado, gasolina, padaria..." maxlength="80">
      </div>
      <div class="fld">
        <label for="qaVal">Valor (R$)</label>
        <input type="number" id="qaVal" min="0" step="0.01" placeholder="0,00" inputmode="decimal">
      </div>
      <div class="fld">
        <label for="qaStatus">Status</label>
        <select id="qaStatus">
          <option value="pago" selected>Já pago</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>
      <button class="btn" data-act="add-var">${IC.plus} Lançar</button>
    </div>

    <div class="var-toolbar">
      <div class="filtros" style="margin-bottom:0">${chips}</div>
      <div class="search-box">
        ${IC.search}
        <input type="text" id="varSearchInput" placeholder="Buscar despesa..." value="${esc(view.buscaVar)}">
      </div>
    </div>

    ${grupos || `<div class="empty">
      <b>Nenhuma despesa variável encontrada</b>
      <p style="font-size:13.5px;color:var(--muted);margin-top:4px">Use o formulário acima para registrar gastos diários.</p>
    </div>`}
  `;
}

/* ================= 4. TAB: CATEGORIAS ================= */
function htmlCats() {
  const cards = state.categories.map(c => {
    const gastoVar = varsDoMes().filter(v => v.catId === c.id).reduce((s, v) => s + Number(v.value || 0), 0);
    const fixasQtd = state.fixed.filter(f => f.active && f.catId === c.id).length;
    let limHTML = '';

    if (c.budget > 0) {
      const p = Math.min(100, (gastoVar / c.budget) * 100);
      const cor = p >= 100 ? 'var(--verm)' : p >= 75 ? 'var(--ambar)' : 'var(--verde)';
      limHTML = `
        <div class="lim">
          <div class="pbar"><i style="width:${p}%;background:${cor}"></i></div>
          <p>${fmtBRL(gastoVar)} de ${fmtBRL(c.budget)} (${Math.round(p)}%) ${p >= 100 ? '— teto ultrapassado!' : p >= 75 ? '— atenção ao teto' : '— dentro do limite'}</p>
        </div>
      `;
    }

    return `
      <div class="card cat-card">
        <div class="top">
          <i style="background:${c.color}"></i>
          <b>${esc(c.name)}</b>
          <button class="mini-ic" data-act="edit-cat" data-id="${c.id}" aria-label="Editar categoria" title="Editar">
            ${IC.edit}
          </button>
          <button class="mini-ic del" data-act="del-cat" data-id="${c.id}" aria-label="Excluir categoria" title="Excluir">
            ${IC.trash}
          </button>
        </div>
        <div class="gasto">
          ${fmtBRL(gastoVar)}
          <small>em variáveis este mês</small>
        </div>
        <span class="sub" style="font-size:11.5px;color:var(--muted);margin-top:4px;display:block">
          ${fixasQtd ? `${fixasQtd} conta${fixasQtd > 1 ? 's' : ''} fixa${fixasQtd > 1 ? 's' : ''} vinculada${fixasQtd > 1 ? 's' : ''}` : 'Sem contas fixas vinculadas'}
        </span>
        ${limHTML}
      </div>
    `;
  }).join('');

  return `
    <div class="sect-head" style="margin-top:4px">
      <div>
        <h2>Categorias & Tetos de Gastos</h2>
        <span class="sub">Organize despesas e defina metas de limite mensal</span>
      </div>
      <button class="btn" data-act="new-cat">${IC.plus} Nova categoria</button>
    </div>
    <div class="cat-grid">${cards}</div>
  `;
}

/* ================= EVENTOS & INTERAÇÕES GLOBAIS ================= */
document.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (tab) {
    view.tab = tab.dataset.tab;
    render();
    return;
  }

  const b = e.target.closest('[data-act]');
  if (!b) return;

  const act = b.dataset.act;
  const id = b.dataset.id;

  if (act === 'pagar') {
    const f = state.fixed.find(x => x.id === id);
    if (!f) return;
    if (f.variable && !temValMes(f)) {
      dlgConfirmarPagamentoVariavel(f);
    } else {
      marcarFixaPaga(f, effVal(f));
    }
  }

  if (act === 'desmarcar') {
    desmarcarFixaPaga(id);
  }

  if (act === 'new-fixa') dlgFixa();
  if (act === 'edit-fixa') dlgFixa(state.fixed.find(f => f.id === id));
  if (act === 'val-mes') dlgMes(state.fixed.find(x => x.id === id));
  if (act === 'del-fixa') {
    const f = state.fixed.find(x => x.id === id);
    if (!f) return;
    confirmDlg(
      'Excluir conta recorrente',
      `Tem certeza que deseja excluir <b>${esc(f.name)}</b> (${fmtBRL(f.value)})? Ela não aparecerá mais nos próximos meses.`,
      () => {
        state.fixed = state.fixed.filter(x => x.id !== id);
        save();
        render();
        toast('Conta excluída com sucesso.');
      }
    );
  }

  if (act === 'filtro-fixa') {
    view.filtroFixaStatus = id;
    render();
  }

  if (act === 'add-var') addVar();
  if (act === 'edit-var') dlgVar(state.vars.find(v => v.id === id));
  if (act === 'toggle-var-status') {
    const v = state.vars.find(x => x.id === id);
    if (v) {
      v.status = v.status === 'pendente' ? 'pago' : 'pendente';
      save();
      render();
      toast(`Gasto marcado como ${v.status === 'pago' ? 'pago ✔' : 'pendente ⏳'}`);
    }
  }
  if (act === 'del-var') {
    confirmDlg('Excluir lançamento', 'Excluir esta despesa permanentemente?', () => {
      state.vars = state.vars.filter(x => x.id !== id);
      save();
      render();
      toast('Lançamento excluído.');
    });
  }

  if (act === 'filtro') {
    view.filtroCat = id || null;
    render();
  }

  if (act === 'quick-var-jump' || act === 'go-vars') {
    view.tab = 'vars';
    render();
    if (act === 'quick-var-jump') {
      setTimeout(() => {
        const inp = document.getElementById('qaDesc');
        if (inp) inp.focus();
      }, 50);
    }
  }

  if (act === 'new-cat') dlgCat();
  if (act === 'edit-cat') dlgCat(state.categories.find(c => c.id === id));
  if (act === 'del-cat') {
    const c = catById(id);
    const usos = state.vars.filter(v => v.catId === id).length + state.fixed.filter(f => f.catId === id).length;
    confirmDlg(
      'Excluir categoria',
      `Excluir a categoria <b>${esc(c.name)}</b>?` +
      (usos ? `<span class="delinfo" style="display:block;margin-top:8px">Atenção: há ${usos} conta(s) ou gasto(s) vinculados a ela — eles serão movidos para "Outros".</span>` : ''),
      () => {
        const fallback = state.categories.find(x => x.name.toLowerCase().includes('outros')) || state.categories[0];
        state.vars.forEach(v => { if (v.catId === id) v.catId = fallback.id; });
        state.fixed.forEach(f => { if (f.catId === id) f.catId = fallback.id; });
        state.categories = state.categories.filter(x => x.id !== id);
        save();
        render();
        toast('Categoria excluída com sucesso.');
      }
    );
  }

  /* Ações da Carteira de Investimentos */
  if (act === 'invest-novo') dlgInvestAporte();
  if (act === 'invest-edit') {
    const dep = (investmentsState.deposits || []).find(d => d.id === id);
    if (dep) dlgInvestAporte(dep);
  }
  if (act === 'invest-del') {
    const dep = (investmentsState.deposits || []).find(d => d.id === id);
    if (!dep) return;
    confirmDlg(
      'Excluir Aporte',
      `Tem certeza que deseja excluir o aporte <b>${esc(dep.description)}</b> (${fmtBRL(dep.amount)})? Esta ação não pode ser desfeita.`,
      () => {
        investmentsState.deposits = investmentsState.deposits.filter(d => d.id !== id);
        saveInvestments();
        render();
        toast('Aporte excluído com sucesso.');
      }
    );
  }
  if (act === 'invest-withdraw') {
    const dep = (investmentsState.deposits || []).find(d => d.id === id);
    if (dep) dlgInvestWithdraw(dep);
  }
  if (act === 'invest-del-withdraw') {
    const depId = b.dataset.depid;
    const wid = b.dataset.wid;
    const dep = (investmentsState.deposits || []).find(d => d.id === depId);
    if (dep && Array.isArray(dep.withdrawals)) {
      dep.withdrawals = dep.withdrawals.filter(w => w.id !== wid);
      saveInvestments();
      render();
      toast('Resgate estornado com sucesso.');
    }
  }
  if (act === 'invest-lock') lockInvestments();
  if (act === 'invest-pin') dlgInvestPin();
  if (act === 'invest-filter-cat') {
    investCategoryFilter = b.dataset.cat || 'todas';
    render();
  }
  if (act === 'invest-sim-quick') {
    const todayStr = new Date().toISOString().split('T')[0];
    if (b.dataset.days != null) {
      const dCount = Number(b.dataset.days);
      investSelectedDate = dCount === 0 ? todayStr : addDays(todayStr, dCount);
    } else if (b.dataset.months != null) {
      investSelectedDate = addMonths(todayStr, Number(b.dataset.months));
    }
    render();
  }
});

document.addEventListener('change', e => {
  if (e.target && e.target.id === 'inpInvestDate') {
    investSelectedDate = e.target.value || new Date().toISOString().split('T')[0];
    render();
  }
});

document.addEventListener('input', e => {
  if (e.target && e.target.id === 'varSearchInput') {
    view.buscaVar = e.target.value.trim();
    render();
    const searchInput = document.getElementById('varSearchInput');
    if (searchInput) {
      searchInput.focus();
      searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }
  }
});

document.getElementById('mesAnt').onclick = () => {
  view.ym = ymAdd(view.ym, -1);
  render();
};
document.getElementById('mesProx').onclick = () => {
  view.ym = ymAdd(view.ym, 1);
  render();
};
document.getElementById('btnIrHoje').onclick = () => {
  view.ym = hojeYM();
  render();
};

document.addEventListener('keydown', e => {
  if (e.target.matches('input, select, textarea') || document.querySelector('dialog[open]')) return;
  if (e.key === 'ArrowLeft') {
    view.ym = ymAdd(view.ym, -1);
    render();
  }
  if (e.key === 'ArrowRight') {
    view.ym = ymAdd(view.ym, 1);
    render();
  }
});

/* ================= FUNÇÕES DE PAGAMENTO ================= */
function marcarFixaPaga(f, valorPago) {
  const pagoArr = state.paidFixed[view.ym] || [];
  const hojeIso = new Date().toISOString().slice(0, 10);

  const filtered = pagoArr.filter(x => (typeof x === 'string' ? x !== f.id : x.id !== f.id));
  filtered.push({
    id: f.id,
    paidAt: hojeIso,
    paidValue: Number(valorPago || effVal(f))
  });

  state.paidFixed[view.ym] = filtered;
  save();
  render();
  toast(`✓ Conta "${f.name}" marcada como paga!`);
}

function desmarcarFixaPaga(id) {
  const arr = state.paidFixed[view.ym] || [];
  state.paidFixed[view.ym] = arr.filter(x => (typeof x === 'string' ? x !== id : x.id !== id));
  save();
  render();
  toast('Marcação de pagamento estornada.');
}

function dlgConfirmarPagamentoVariavel(f) {
  const nomeMes = `${MESES[ymDate(view.ym).getMonth()]} de ${ymDate(view.ym).getFullYear()}`;
  const d = dlgOpen(
    `Confirmar pagamento — ${esc(f.name)}`,
    `Esta é uma conta de valor variável (como energia, água ou gás). Informe o valor exato cobrado na fatura deste mês (${nomeMes}):`,
    `
      <div class="fld" style="margin-bottom:12px">
        <label>Valor da fatura paga em ${nomeMes} (R$)</label>
        <input id="pgExactVal" type="number" min="0" step="0.01" inputmode="decimal" value="${f.value}">
      </div>
      <p style="font-size:12.5px;color:var(--muted)">
        Valor de referência / estimativa: <b>${fmtBRL(f.value)}</b>
      </p>
    `,
    d2 => {
      const val = parseFloat(d2.querySelector('#pgExactVal').value);
      if (!(val > 0)) {
        toast('Digite um valor maior que zero.');
        return false;
      }
      f.monthValues = f.monthValues || {};
      f.monthValues[view.ym] = Math.round(val * 100) / 100;
      marcarFixaPaga(f, val);
    },
    'Confirmar pagamento'
  );
  setTimeout(() => {
    const inp = d.querySelector('#pgExactVal');
    if (inp) inp.select();
  }, 50);
}

/* ================= ADICIONAR / EDITAR DESPESA VARIÁVEL ================= */
function addVar() {
  const data = document.getElementById('qaData').value;
  const catId = document.getElementById('qaCat').value;
  const desc = document.getElementById('qaDesc').value.trim();
  const val = parseFloat(document.getElementById('qaVal').value);
  const status = document.getElementById('qaStatus').value;

  if (!data) {
    toast('Selecione a data do gasto.');
    return;
  }
  if (!(val > 0)) {
    toast('Digite um valor maior que zero.');
    return;
  }

  state.vars.push({
    id: uid(),
    date: data,
    catId,
    desc,
    value: Math.round(val * 100) / 100,
    status: status || 'pago'
  });

  save();
  render();
  toast(`Lançado: ${fmtBRL(val)}${desc ? ' — ' + desc : ''}`);

  document.getElementById('qaDesc').value = '';
  document.getElementById('qaVal').value = '';
  document.getElementById('qaDesc').focus();
}

function dlgVar(v) {
  const cats = state.categories.map(c => `<option value="${c.id}" ${v && v.catId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const d = dlgOpen(
    'Editar lançamento',
    'Atualize os detalhes desta despesa variável:',
    `
      <div class="grid2">
        <div class="fld">
          <label>Data</label>
          <input id="vrData" type="date" value="${v?.date || ''}">
        </div>
        <div class="fld">
          <label>Categoria</label>
          <select id="vrCat">${cats}</select>
        </div>
        <div class="fld" style="grid-column:1/-1">
          <label>Descrição</label>
          <input id="vrDesc" type="text" maxlength="80" value="${esc(v?.desc || '')}" placeholder="ex.: Feira, farmácia, combustível...">
        </div>
        <div class="fld">
          <label>Valor (R$)</label>
          <input id="vrVal" type="number" min="0" step="0.01" inputmode="decimal" value="${v ? v.value : ''}">
        </div>
        <div class="fld">
          <label>Status</label>
          <select id="vrStatus">
            <option value="pago" ${v?.status === 'pago' ? 'selected' : ''}>Já pago</option>
            <option value="pendente" ${v?.status === 'pendente' ? 'selected' : ''}>Pendente</option>
          </select>
        </div>
      </div>
    `,
    d2 => {
      const data = d2.querySelector('#vrData').value;
      const val = parseFloat(d2.querySelector('#vrVal').value);
      if (!data) { toast('Escolha a data.'); return false; }
      if (!(val > 0)) { toast('Digite um valor maior que zero.'); return false; }

      Object.assign(v, {
        date: data,
        catId: d2.querySelector('#vrCat').value,
        desc: d2.querySelector('#vrDesc').value.trim(),
        value: Math.round(val * 100) / 100,
        status: d2.querySelector('#vrStatus').value
      });

      save();
      render();
      toast('Lançamento atualizado.');
    }
  );
  setTimeout(() => d.querySelector('#vrDesc').focus(), 50);
}

/* ================= ADICIONAR / EDITAR CONTA FIXA & RECORRÊNCIA ================= */
function dlgFixa(f) {
  const cats = state.categories.map(c => `
    <option value="${c.id}" ${f && f.catId === c.id ? 'selected' : ''}>${esc(c.name)}</option>
  `).join('');

  const curRec = f?.recurrence || 'monthly';
  const totalParcelas = f?.installments?.total || 10;
  const startParcela = f?.installments?.startMonth || view.ym;
  const annualM = f?.annualMonth || (ymDate(view.ym).getMonth() + 1);

  const d = dlgOpen(
    f ? 'Editar conta recorrente' : 'Nova conta recorrente',
    'Configure contas mensais, assinaturas ou despesas parceladas que se repetem automaticamente no calendário:',
    `
      <div class="grid2">
        <div class="fld" style="grid-column:1/-1">
          <label>Nome da conta / serviço</label>
          <input id="fxNome" type="text" maxlength="60" placeholder="ex.: Aluguel, Condomínio, Energia Enel, Netflix, Seguro" value="${esc(f?.name || '')}">
        </div>

        <div class="fld">
          <label>Categoria</label>
          <select id="fxCat">${cats}</select>
        </div>

        <div class="fld">
          <label>Dia do vencimento (1 a 31)</label>
          <input id="fxDia" type="number" min="1" max="31" value="${f?.dueDay || 10}">
        </div>

        <div class="fld" style="grid-column:1/-1">
          <label>Valor mensal (R$) ${f?.variable ? '— usado como estimativa' : ''}</label>
          <input id="fxVal" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" value="${f ? f.value : ''}">
        </div>

        <div class="fld" style="grid-column:1/-1">
          <label>Tipo de recorrência</label>
          <select id="fxRecurrence">
            <option value="monthly" ${curRec === 'monthly' ? 'selected' : ''}>Mensal contínua (se repete todo mês)</option>
            <option value="installments" ${curRec === 'installments' ? 'selected' : ''}>Parcelada (número fixo de parcelas)</option>
            <option value="annual" ${curRec === 'annual' ? 'selected' : ''}>Anual (uma vez ao ano, ex.: IPVA / IPTU)</option>
          </select>
        </div>

        <div id="boxParcelas" class="grid2" style="grid-column:1/-1; display:${curRec === 'installments' ? 'grid' : 'none'}; background:var(--bg); padding:10px 12px; border-radius:9px;">
          <div class="fld">
            <label>Total de parcelas</label>
            <input id="fxTotalParcelas" type="number" min="2" max="120" value="${totalParcelas}">
          </div>
          <div class="fld">
            <label>Mês de início (YYYY-MM)</label>
            <input id="fxStartMonth" type="month" value="${startParcela}">
          </div>
        </div>

        <div id="boxAnual" class="fld" style="grid-column:1/-1; display:${curRec === 'annual' ? 'block' : 'none'}; background:var(--bg); padding:10px 12px; border-radius:9px;">
          <label>Mês da cobrança anual</label>
          <select id="fxAnnualMonth">
            ${MESES.map((m, idx) => `<option value="${idx + 1}" ${annualM === (idx + 1) ? 'selected' : ''}>${esc(m)}</option>`).join('')}
          </select>
        </div>

        <label style="display:flex;gap:10px;align-items:flex-start;grid-column:1/-1;font-size:13.5px;font-weight:600;cursor:pointer;padding:4px 0;line-height:1.4">
          <input type="checkbox" id="fxVar" style="width:18px;height:18px;flex:none;margin-top:2px;accent-color:#1E7B58" ${f && f.variable ? 'checked' : ''}>
          <span>O valor varia a cada mês (Luz, água, gás, fatura de cartão...) — o app usa o valor acima como estimativa e permite lançar o boleto real a cada mês</span>
        </label>

        <div class="fld" style="grid-column:1/-1">
          <label>Observação, Chave Pix ou Código de barras (opcional)</label>
          <input id="fxNotes" type="text" maxlength="120" placeholder="ex.: Chave Pix, débito em conta, código do cliente" value="${esc(f?.notes || '')}">
        </div>
      </div>
    `,
    d2 => {
      const nome = d2.querySelector('#fxNome').value.trim();
      const dia = parseInt(d2.querySelector('#fxDia').value, 10);
      const val = parseFloat(d2.querySelector('#fxVal').value);
      const rec = d2.querySelector('#fxRecurrence').value;
      const catId = d2.querySelector('#fxCat').value;
      const variavel = d2.querySelector('#fxVar').checked;
      const notes = d2.querySelector('#fxNotes').value.trim();

      if (!nome) { toast('Dê um nome à conta.'); return false; }
      if (!(dia >= 1 && dia <= 31)) { toast('Dia de vencimento deve ser entre 1 e 31.'); return false; }
      if (!(val > 0)) { toast('Digite um valor maior que zero.'); return false; }

      const contaData = {
        name: nome,
        catId,
        dueDay: dia,
        value: Math.round(val * 100) / 100,
        active: true,
        variable: variavel,
        recurrence: rec,
        notes: notes || undefined
      };

      if (rec === 'installments') {
        const total = parseInt(d2.querySelector('#fxTotalParcelas').value, 10) || 12;
        const start = d2.querySelector('#fxStartMonth').value || view.ym;
        contaData.installments = { total, startMonth: start };
      }

      if (rec === 'annual') {
        contaData.annualMonth = parseInt(d2.querySelector('#fxAnnualMonth').value, 10) || 1;
      }

      if (f) {
        Object.assign(f, contaData);
        toast('Conta atualizada com sucesso.');
      } else {
        contaData.id = uid();
        contaData.monthValues = {};
        state.fixed.push(contaData);
        toast('Conta recorrente cadastrada!');
      }

      save();
      render();
    },
    f ? 'Salvar alterações' : 'Cadastrar conta'
  );

  const recSelect = d.querySelector('#fxRecurrence');
  const boxParcelas = d.querySelector('#boxParcelas');
  const boxAnual = d.querySelector('#boxAnual');
  recSelect.onchange = () => {
    boxParcelas.style.display = recSelect.value === 'installments' ? 'grid' : 'none';
    boxAnual.style.display = recSelect.value === 'annual' ? 'block' : 'none';
  };

  setTimeout(() => d.querySelector('#fxNome').focus(), 50);
}

/* Ajuste pontual de valor para contas variáveis */
function dlgMes(f) {
  const nomeMes = `${MESES[ymDate(view.ym).getMonth()]} de ${ymDate(view.ym).getFullYear()}`;
  const d = dlgOpen(
    'Valor desta conta no mês',
    `<b>${esc(f.name)}</b> — ${nomeMes}.<br>O valor salvo aqui vale exclusivamente para <b>${nomeMes}</b>. Os demais meses continuam usando o valor de referência (${fmtBRL(f.value)}).`,
    `
      <div class="fld">
        <label>Valor em ${nomeMes} (R$)</label>
        <input id="mvVal" type="number" min="0" step="0.01" inputmode="decimal" value="${effVal(f)}">
      </div>
      ${temValMes(f) ? `
        <p style="font-size:12.5px;color:var(--muted);margin-top:12px">
          Valor atual deste mês: <b>${fmtBRL(f.monthValues[view.ym])}</b>.
          <button class="btn ghost mini" id="mvReset" style="margin-left:6px">Voltar ao valor típico (${fmtBRL(f.value)})</button>
        </p>
      ` : ''}
    `,
    d2 => {
      const val = parseFloat(d2.querySelector('#mvVal').value);
      if (!(val > 0)) { toast('Digite um valor maior que zero.'); return false; }
      f.monthValues = f.monthValues || {};
      f.monthValues[view.ym] = Math.round(val * 100) / 100;
      save();
      render();
      toast(`Valor de ${nomeMes} salvo: ${fmtBRL(val)}`);
    },
    'Salvar valor'
  );

  const rst = d.querySelector('#mvReset');
  if (rst) {
    rst.onclick = () => {
      delete f.monthValues[view.ym];
      save();
      d.close();
      render();
      toast('Restaurado o valor típico.');
    };
  }

  setTimeout(() => {
    const inp = d.querySelector('#mvVal');
    if (inp) inp.select();
  }, 50);
}

/* ================= ADICIONAR / EDITAR CATEGORIA ================= */
function dlgCat(c) {
  const d = dlgOpen(
    c ? 'Editar categoria' : 'Nova categoria',
    'As categorias organizam suas contas fixas, despesas do dia a dia e alimentam os gráficos:',
    `
      <div class="grid2">
        <div class="fld" style="grid-column:1/-1">
          <label>Nome da categoria</label>
          <input id="ctNome" type="text" maxlength="40" placeholder="ex.: Alimentação, Educação, Animais de Estimação" value="${esc(c?.name || '')}">
        </div>
        <div class="fld">
          <label>Cor de identificação</label>
          <input id="ctCor" type="color" value="${c?.color || '#2F5DB3'}" style="height:42px;padding:3px;cursor:pointer">
        </div>
        <div class="fld">
          <label>Teto mensal sugerido (R$) — opcional</label>
          <input id="ctLim" type="number" min="0" step="1" inputmode="decimal" placeholder="Sem limite" value="${c && c.budget ? c.budget : ''}">
        </div>
      </div>
    `,
    d2 => {
      const nome = d2.querySelector('#ctNome').value.trim();
      if (!nome) { toast('Dê um nome à categoria.'); return false; }
      const lim = parseFloat(d2.querySelector('#ctLim').value);
      const dados = {
        name: nome,
        color: d2.querySelector('#ctCor').value,
        budget: lim > 0 ? Math.round(lim * 100) / 100 : 0
      };

      if (c) {
        Object.assign(c, dados);
        toast('Categoria atualizada.');
      } else {
        state.categories.push({ id: uid(), ...dados });
        toast('Categoria criada!');
      }

      save();
      render();
    }
  );
  setTimeout(() => d.querySelector('#ctNome').focus(), 50);
}

/* ================= SISTEMA DE MODAL & CONFIRMAÇÃO ================= */
function dlgOpen(title, hint, bodyHTML, onSave, saveLabel) {
  const old = document.querySelector('dialog');
  if (old) old.remove();

  const d = document.createElement('dialog');
  d.innerHTML = `
    <div class="dlg">
      <h3>${title}</h3>
      ${hint ? `<p class="hint">${hint}</p>` : ''}
      ${bodyHTML}
      <div class="row-btns">
        <button class="btn ghost" data-x="c">Cancelar</button>
        <button class="btn" data-x="s">${saveLabel || 'Salvar'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(d);
  d.showModal();

  d.querySelector('[data-x="c"]').onclick = () => d.close();
  d.querySelector('[data-x="s"]').onclick = () => {
    if (onSave(d) !== false) d.close();
  };
  d.addEventListener('close', () => {
    d.remove();
    if (pendingRemoteData) {
      const p = pendingRemoteData;
      pendingRemoteData = null;
      applyRemoteUpdate(p.data, new Date(p.time).toISOString());
    }
    if (pendingInvestRemoteData) {
      const pi = pendingInvestRemoteData;
      pendingInvestRemoteData = null;
      applyInvestRemoteUpdate(pi.data, new Date(pi.time).toISOString());
    }
  });
  return d;
}

function confirmDlg(title, msgHTML, onOk) {
  const old = document.querySelector('dialog');
  if (old) old.remove();

  const d = document.createElement('dialog');
  d.innerHTML = `
    <div class="dlg">
      <h3>${title}</h3>
      <p class="hint" style="margin-bottom:12px">${msgHTML}</p>
      <div class="row-btns">
        <button class="btn ghost" data-x="c">Cancelar</button>
        <button class="btn danger" data-x="s">Confirmar exclusão</button>
      </div>
    </div>
  `;
  document.body.appendChild(d);
  d.showModal();

  d.querySelector('[data-x="c"]').onclick = () => d.close();
  d.querySelector('[data-x="s"]').onclick = () => {
    d.close();
    onOk();
  };
  d.addEventListener('close', () => {
    d.remove();
    if (pendingRemoteData) {
      const p = pendingRemoteData;
      pendingRemoteData = null;
      applyRemoteUpdate(p.data, new Date(p.time).toISOString());
    }
    if (pendingInvestRemoteData) {
      const pi = pendingInvestRemoteData;
      pendingInvestRemoteData = null;
      applyInvestRemoteUpdate(pi.data, new Date(pi.time).toISOString());
    }
  });
}

/* ================= AJUSTES, BACKUP & EXPORTAÇÃO ================= */
document.getElementById('btnAjustes').onclick = () => {
  const d = dlgOpen(
    'Ajustes & Dados',
    'Sincronização em Nuvem Supabase ativa. Gerencie backups ou exporte relatórios:',
    `
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn ghost" id="ajCsv" style="justify-content:flex-start">
          ${IC.plus} Exportar mês atual em Planilha (.CSV com acentuação)
        </button>
        <button class="btn ghost" id="ajBkp" style="justify-content:flex-start">
          ⤓ Baixar Backup Completo (.JSON)
        </button>
        <button class="btn ghost" id="ajImp" style="justify-content:flex-start">
          ⤒ Restaurar Backup (.JSON)
        </button>
        <button class="btn ghost" id="ajDemo" style="justify-content:flex-start">
          ↺ Recarregar Dados de Exemplo
        </button>
        <button class="btn danger" id="ajWipe" style="justify-content:flex-start">
          Apagar todos os dados
        </button>
        <button class="btn ghost" id="ajInvest" style="justify-content:flex-start;border-top:1px dashed var(--line);margin-top:6px;padding-top:10px">
          🔒 Área Restrita (Investimentos)
        </button>
        <input type="file" id="ajFile" accept=".json,application/json" style="display:none">
      </div>
    `
  );

  d.querySelector('#ajCsv').onclick = () => { d.close(); exportCsv(); };
  d.querySelector('#ajBkp').onclick = () => {
    d.close();
    download(`caderneta-backup-${hojeYM()}.json`, JSON.stringify(state, null, 2), 'application/json');
    toast('Backup baixado com sucesso.');
  };
  d.querySelector('#ajImp').onclick = () => d.querySelector('#ajFile').click();
  d.querySelector('#ajFile').onchange = ev => {
    const file = ev.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!s.categories || !s.fixed || !s.vars) throw new Error('Formato inválido');
        state = s;
        save();
        d.close();
        render();
        toast('Backup restaurado e sincronizado na Nuvem! ✔');
      } catch (e) {
        toast('Arquivo inválido — use um backup legítimo da Caderneta.');
      }
    };
    r.readAsText(file);
  };

  d.querySelector('#ajDemo').onclick = () => {
    confirmDlg('Recarregar exemplo', 'Isso substituirá as contas atuais pelos dados de exemplo na nuvem e localmente. Continuar?', () => {
      state = seed();
      save();
      d.close();
      render();
      toast('Dados de exemplo recarregados e sincronizados.');
    });
  };

  d.querySelector('#ajWipe').onclick = () => {
    confirmDlg('Apagar todos os dados', 'Tem certeza? Isso apagará todas as contas fixas, gastos e categorias permanentemente.', () => {
      state = {
        categories: JSON.parse(JSON.stringify(DEFAULT_CATS)),
        fixed: [],
        paidFixed: {},
        vars: []
      };
      save();
      d.close();
      render();
      toast('Dados limpos. Começo zerado!');
    });
  };

  const bInvest = d.querySelector('#ajInvest');
  if (bInvest) {
    bInvest.onclick = () => {
      d.close();
      promptInvestUnlock();
    };
  }
};

function download(nome, conteudo, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo || 'text/plain;charset=utf-8' }));
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function exportCsv() {
  const linhas = [['Data', 'Descrição', 'Categoria', 'Tipo', 'Status', 'Valor (R$)'].join(';')];

  fixedList().forEach(f => {
    const pago = isPago(f);
    const dataVenc = `${view.ym}-${pad2(f.dueDay)}`;
    linhas.push([
      dataVenc,
      `"${(f.name || '').replace(/"/g, '""')}"`,
      `"${catById(f.catId).name}"`,
      `"Fixa${f.variable ? ' variável' : ''}"`,
      pago ? '"Paga"' : '"Em aberto"',
      effVal(f).toFixed(2).replace('.', ',')
    ].join(';'));
  });

  varsDoMes().sort((a, b) => a.date.localeCompare(b.date)).forEach(v => {
    linhas.push([
      v.date,
      `"${(v.desc || '').replace(/"/g, '""')}"`,
      `"${catById(v.catId).name}"`,
      '"Variável"',
      v.status === 'pendente' ? '"Pendente"' : '"Pago"',
      Number(v.value || 0).toFixed(2).replace('.', ',')
    ].join(';'));
  });

  download(`caderneta-${view.ym}.csv`, '\uFEFF' + linhas.join('\n'), 'text/csv;charset=utf-8');
  toast('Planilha CSV gerada com sucesso.');
}

/* ================= MÓDULO RESTRITO: INVESTIMENTOS & JUROS COMPOSTOS ================= */

function defaultInvestmentsState() {
  return {
    pin: '1234',
    defaultRate: 10,
    categories: ['Investimento Principal', 'Renda Fixa', 'Ações', 'Reserva de Emergência'],
    deposits: []
  };
}

function loadInvestLocal() {
  if (!storageOk) return null;
  try {
    const raw = localStorage.getItem(LS_INVEST_KEY);
    if (raw) {
      investmentsState = JSON.parse(raw);
      return investmentsState;
    }
  } catch (e) {}
  investmentsState = defaultInvestmentsState();
  return investmentsState;
}

function saveInvestLocal() {
  if (storageOk && investmentsState) {
    try {
      localStorage.setItem(LS_INVEST_KEY, JSON.stringify(investmentsState));
    } catch (e) {}
  }
}

async function saveInvestSupabase() {
  clearTimeout(saveInvestSupabaseTimer);
  saveInvestSupabaseTimer = setTimeout(async () => {
    if (!investmentsState) return;
    try {
      lastInvestLocalSaveTime = Date.now();
      const nowIso = new Date().toISOString();
      const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/investments_state?on_conflict=id`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          id: 'default',
          data: investmentsState,
          updated_at: nowIso
        })
      });
      if (res.ok) {
        lastInvestServerTimestamp = new Date(nowIso).getTime();
      }
    } catch (err) {
      console.warn('Investments Supabase sync offline:', err);
    }
  }, 400);
}

function saveInvestments() {
  lastInvestLocalSaveTime = Date.now();
  saveInvestLocal();
  saveInvestSupabase();
}

async function fetchInvestmentsFromSupabase() {
  try {
    const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/investments_state?id=eq.default&select=data,updated_at`, {
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
      }
    });

    if (res.ok) {
      const rows = await res.json();
      if (rows && rows.length > 0 && rows[0].data) {
        const row = rows[0];
        const serverTime = new Date(row.updated_at).getTime();
        if (serverTime > lastInvestServerTimestamp) {
          applyInvestRemoteUpdate(row.data, row.updated_at);
          return true;
        }
      }
    }
  } catch (err) {
    // Offline
  }
  return false;
}

function setupInvestmentsRealtime() {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      const sbClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      sbClient.channel('investments-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'investments_state',
          filter: 'id=eq.default'
        }, payload => {
          if (payload && payload.new && payload.new.data) {
            applyInvestRemoteUpdate(payload.new.data, payload.new.updated_at);
          }
        })
        .subscribe();
    } catch (e) {}
  }
}

function applyInvestRemoteUpdate(remoteData, serverTimeIso) {
  const serverTime = new Date(serverTimeIso).getTime();
  if (serverTime <= lastInvestServerTimestamp) return;
  if (Date.now() - lastInvestLocalSaveTime < 1500) return;
  if (JSON.stringify(remoteData) === JSON.stringify(investmentsState)) {
    lastInvestServerTimestamp = serverTime;
    return;
  }

  const hasOpenDialog = !!document.querySelector('dialog[open]');
  const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

  if (hasOpenDialog || isTyping) {
    pendingInvestRemoteData = { data: remoteData, time: serverTime };
    return;
  }

  investmentsState = remoteData;
  lastInvestServerTimestamp = serverTime;
  saveInvestLocal();
  if (view.tab === 'invest') {
    render();
  }
}

/* Helpers de Matemática Financeira e Projeção */
function getElapsedDays(startDateStr, targetDateStr) {
  if (!startDateStr || !targetDateStr || targetDateStr < startDateStr) return 0;
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [tY, tM, tD] = targetDateStr.split('-').map(Number);
  const dStart = new Date(Date.UTC(sY, sM - 1, sD));
  const dTarget = new Date(Date.UTC(tY, tM - 1, tD));
  const diffTime = dTarget.getTime() - dStart.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split('T')[0];
}

function addMonths(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().split('T')[0];
}

function formatDateBR(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function calculateDepositStats(deposit, targetDateStr = investSelectedDate) {
  const initialAmount = Number(deposit.amount) || 0;
  const ratePercent = Number(deposit.monthly_rate ?? 10) / 100;
  const type = deposit.compounding_type === 'monthly_strict' ? 'monthly' : 'daily';
  const rawWithdrawals = Array.isArray(deposit.withdrawals) ? deposit.withdrawals : [];

  const dailyRate = Math.pow(1 + ratePercent, 1 / 30) - 1; // 10% a.m. = ~0.3182% ao dia

  if (!deposit.date || targetDateStr < deposit.date) {
    return {
      initialAmount,
      currentValue: initialAmount,
      totalYield: 0,
      totalWithdrawn: 0,
      dailyGain: 0,
      dailyRatePercent: dailyRate * 100,
      daysActive: 0,
      ratePercent: ratePercent * 100,
      compoundingType: type,
      withdrawals: []
    };
  }

  const activeWithdrawals = rawWithdrawals
    .filter(w => w.date && w.date <= targetDateStr && w.date >= deposit.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalWithdrawn = activeWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const [sYear, sMonth, sDay] = deposit.date.split('-').map(Number);
  const daysActive = getElapsedDays(deposit.date, targetDateStr);

  let currentBalance = initialAmount;

  if (type === 'daily') {
    const dStart = new Date(Date.UTC(sYear, sMonth - 1, sDay));
    for (let day = 1; day <= daysActive; day++) {
      const curTime = dStart.getTime() + day * 24 * 60 * 60 * 1000;
      const curDateObj = new Date(curTime);
      const curDateStr = curDateObj.toISOString().split('T')[0];

      if (currentBalance > 0) {
        currentBalance = currentBalance * (1 + dailyRate);
      }

      const withsOnDay = activeWithdrawals.filter(w => w.date === curDateStr);
      for (const w of withsOnDay) {
        currentBalance = Math.max(0, currentBalance - (Number(w.amount) || 0));
      }
    }
  } else {
    // monthly compounding
    const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);
    let yearsDiff = tYear - sYear;
    let monthsDiff = tMonth - sMonth;
    let totalMonths = yearsDiff * 12 + monthsDiff;
    const maxDays = new Date(tYear, tMonth, 0).getDate();
    if (tDay < Math.min(sDay, maxDays)) totalMonths -= 1;
    totalMonths = Math.max(0, totalMonths);

    for (let m = 1; m <= totalMonths; m++) {
      if (currentBalance > 0) {
        currentBalance = currentBalance * (1 + ratePercent);
      }
    }
    for (const w of activeWithdrawals) {
      currentBalance = Math.max(0, currentBalance - (Number(w.amount) || 0));
    }
  }

  const totalYield = Math.max(0, (currentBalance + totalWithdrawn) - initialAmount);
  const dailyGain = currentBalance * dailyRate;

  return {
    initialAmount,
    currentValue: currentBalance,
    totalYield,
    totalWithdrawn,
    dailyGain,
    dailyRatePercent: dailyRate * 100,
    daysActive,
    ratePercent: ratePercent * 100,
    compoundingType: type,
    withdrawals: activeWithdrawals
  };
}

function calculatePortfolioStats(deposits, targetDateStr = investSelectedDate) {
  let totalInvested = 0;
  let currentValue = 0;
  let totalYield = 0;
  let totalWithdrawn = 0;
  let totalDailyGain = 0;
  let depositDetails = [];

  for (const dep of deposits) {
    const stats = calculateDepositStats(dep, targetDateStr);
    totalInvested += stats.initialAmount;
    currentValue += stats.currentValue;
    totalYield += stats.totalYield;
    totalWithdrawn += stats.totalWithdrawn;
    totalDailyGain += stats.dailyGain;

    depositDetails.push({
      ...dep,
      stats
    });
  }

  return {
    totalInvested,
    currentValue,
    totalYield,
    totalWithdrawn,
    totalDailyGain,
    profitabilityPercentage: totalInvested > 0 ? (totalYield / totalInvested) * 100 : 0,
    depositDetails
  };
}

/* Renderização HTML da Aba de Investimentos */
function htmlInvest() {
  if (!investmentsState) {
    return `<div class="empty" style="padding:40px 10px;">
      <b>Carregando investimentos...</b>
    </div>`;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const isFuture = investSelectedDate > todayStr;
  const isPast = investSelectedDate < todayStr;
  const isToday = investSelectedDate === todayStr;

  const rawDeposits = investmentsState.deposits || [];
  const filteredDeposits = investCategoryFilter === 'todas'
    ? rawDeposits
    : rawDeposits.filter(d => d.category === investCategoryFilter);

  const stats = calculatePortfolioStats(filteredDeposits, investSelectedDate);
  const allStats = calculatePortfolioStats(rawDeposits, investSelectedDate);

  const cats = ['todas', ...(investmentsState.categories || [])];
  const catPills = cats.map(c => `
    <button class="invest-cat-btn ${investCategoryFilter === c ? 'active' : ''}" data-act="invest-filter-cat" data-cat="${esc(c)}">
      ${c === 'todas' ? 'Todas as Categorias' : esc(c)}
    </button>
  `).join('');

  const simBanner = !isToday ? `
    <div class="invest-sim-banner">
      <span>
        ⏳ <b>Simulação Ativa:</b> Exibindo projeção com rendimento até <b>${formatDateBR(investSelectedDate)}</b> 
        (${isFuture ? `+${getElapsedDays(todayStr, investSelectedDate)} dias no futuro` : `${getElapsedDays(investSelectedDate, todayStr)} dias no passado`}).
      </span>
      <button class="invest-sim-btn active" data-act="invest-sim-quick" data-days="0" style="padding:4px 10px;font-size:11px">
        Voltar para Hoje
      </button>
    </div>
  ` : '';

  let rowsHTML = '';
  if (filteredDeposits.length === 0) {
    rowsHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:36px 14px;color:var(--muted)">
          <div style="font-size:32px;margin-bottom:8px">📈</div>
          <b style="color:var(--ink);font-size:15px;display:block;margin-bottom:4px">Nenhum aporte registrado ${investCategoryFilter !== 'todas' ? 'nesta categoria' : 'na carteira'}</b>
          <p style="font-size:13px;max-width:380px;margin:0 auto 16px">Adicione seu capital para ver o rendimento diário proporcional a 10% ao mês rendendo automaticamente.</p>
          <button class="btn" data-act="invest-novo" style="margin:0 auto">
            ${IC.plus} Registrar Primeiro Aporte
          </button>
        </td>
      </tr>
    `;
  } else {
    rowsHTML = stats.depositDetails.map(dep => {
      const dStats = dep.stats;
      const daysPassed = dStats.daysActive;
      const withdrawals = dep.withdrawals || [];

      const withdrawalsListHTML = withdrawals.length > 0 ? `
        <div class="invest-withdrawn-tags">
          ${withdrawals.map(w => `
            <span class="invest-withdrawn-tag">
              <span>💵 Resgate: -${fmtBRL(w.amount)} (${formatDateBR(w.date)})${w.description ? ` · ${esc(w.description)}` : ''}</span>
              <button data-act="invest-del-withdraw" data-depid="${esc(dep.id)}" data-wid="${esc(w.id)}" title="Estornar resgate">×</button>
            </span>
          `).join('')}
        </div>
      ` : '';

      return `
        <tr>
          <td class="invest-cell-date">
            <b>${formatDateBR(dep.date)}</b>
            <small>${daysPassed} dia${daysPassed === 1 ? '' : 's'} decorrido${daysPassed === 1 ? '' : 's'}</small>
          </td>
          <td>
            <span class="invest-cell-cat" style="background:var(--verde-soft);color:var(--verde-dark);border:1px solid #bde1d3">
              ${esc(dep.category || 'Geral')}
            </span>
          </td>
          <td class="invest-cell-desc">
            ${esc(dep.description || 'Aporte de Capital')}
            <small>Taxa: ${dep.monthly_rate ?? 10}% a.m. (${dep.compounding_type === 'monthly_strict' ? 'Mensal' : 'Juros Diários'})</small>
            ${withdrawalsListHTML}
          </td>
          <td class="invest-cell-num">
            ${fmtBRL(dep.amount)}
            ${dStats.totalWithdrawn > 0 ? `<small style="display:block;color:#92400e;font-size:10.5px">Resgatado: ${fmtBRL(dStats.totalWithdrawn)}</small>` : ''}
          </td>
          <td class="invest-cell-num profit">
            +${fmtBRL(dStats.totalYield)}
            <small style="display:block;color:var(--verde);font-size:10.5px">
              +${dep.amount > 0 ? ((dStats.totalYield / dep.amount) * 100).toFixed(1) : 0}%
            </small>
          </td>
          <td class="invest-cell-num current">
            ${fmtBRL(dStats.currentValue)}
            <small style="display:block;color:var(--muted);font-size:10.5px">+${fmtBRL(dStats.dailyGain)}/dia</small>
          </td>
          <td>
            <div class="invest-actions-cell">
              <button class="invest-btn-sm withdraw" data-act="invest-withdraw" data-id="${esc(dep.id)}" title="Realizar resgate parcial ou total" ${dStats.currentValue <= 0 ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
                💵 Resgatar
              </button>
              <button class="invest-btn-sm" data-act="invest-edit" data-id="${esc(dep.id)}" title="Editar aporte">
                ${IC.edit}
              </button>
              <button class="invest-btn-sm" data-act="invest-del" data-id="${esc(dep.id)}" title="Excluir aporte" style="color:var(--verm)">
                ${IC.trash}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  return `
    <div class="invest-wrap">
      <!-- Header de Investimentos -->
      <div class="invest-head">
        <div class="invest-head-title">
          <h2>
            <span>Investimentos & Patrimônio</span>
            <span class="invest-badge-secret">🔒 Área Restrita</span>
          </h2>
          <p>Rendimento contínuo dia a dia proporcional a 10%/mês (~0,318% a cada 24h).</p>
        </div>
        <div class="invest-head-acts">
          <button class="btn" data-act="invest-novo">
            ${IC.plus} Novo Aporte
          </button>
          <button class="btn ghost" data-act="invest-pin" title="Alterar PIN de 4 dígitos">
            🔑 Alterar PIN
          </button>
          <button class="btn ghost" data-act="invest-lock" title="Bloquear e ocultar carteira" style="color:var(--verm)">
            🔒 Bloquear
          </button>
        </div>
      </div>

      <!-- Simulador Temporal ("Viagem no Tempo") -->
      <div class="invest-sim">
        <div class="invest-sim-top">
          <div class="invest-sim-desc">
            <div class="invest-sim-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="invest-sim-text">
              <b>Simulador de Viagem no Tempo</b>
              <span>Consulte o valor do seu patrimônio hoje ou projete qualquer data futura:</span>
            </div>
          </div>
          <div class="invest-sim-controls">
            <button class="invest-sim-btn ${isToday ? 'active' : ''}" data-act="invest-sim-quick" data-days="0">Hoje</button>
            <button class="invest-sim-btn" data-act="invest-sim-quick" data-days="30">+30 Dias</button>
            <button class="invest-sim-btn" data-act="invest-sim-quick" data-months="3">+3 Meses</button>
            <button class="invest-sim-btn" data-act="invest-sim-quick" data-months="6">+6 Meses</button>
            <button class="invest-sim-btn" data-act="invest-sim-quick" data-months="12">+1 Ano</button>
            <input type="date" class="invest-sim-date-input" id="inpInvestDate" value="${investSelectedDate}" title="Escolher data exata">
          </div>
        </div>
        ${simBanner}
      </div>

      <!-- Grid de 4 Cards KPI -->
      <div class="invest-kpi-grid">
        <!-- Card 1: Total Aportado -->
        <div class="invest-kpi-card">
          <div class="invest-kpi-head">
            <span class="invest-kpi-label">Total Aportado</span>
            <div class="invest-kpi-icon" style="background:#eaf4ef;color:var(--verde)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M7 15h0M2 10h20"/>
              </svg>
            </div>
          </div>
          <div class="invest-kpi-val">${fmtBRL(allStats.totalInvested)}</div>
          <div class="invest-kpi-foot">
            <span>Capital principal aportado</span>
            ${allStats.totalWithdrawn > 0 ? `<span class="invest-kpi-badge amber">Retirado: ${fmtBRL(allStats.totalWithdrawn)}</span>` : ''}
          </div>
        </div>

        <!-- Card 2: Lucro Líquido Acumulado -->
        <div class="invest-kpi-card highlight">
          <div class="invest-kpi-head">
            <span class="invest-kpi-label">Lucro Líquido</span>
            <div class="invest-kpi-icon" style="background:#d9f1e6;color:var(--verde-dark)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
          </div>
          <div class="invest-kpi-val green">+${fmtBRL(allStats.totalYield)}</div>
          <div class="invest-kpi-foot">
            <span class="invest-kpi-badge green">+${allStats.profitabilityPercentage.toFixed(1)}%</span>
            <span>lucro sobre o capital</span>
          </div>
        </div>

        <!-- Card 3: Saldo Atual / Patrimônio -->
        <div class="invest-kpi-card highlight" style="border-color:#52c499">
          <div class="invest-kpi-head">
            <span class="invest-kpi-label" style="color:var(--verde-dark)">
              Saldo Atual ${isFuture ? '(Simulado)' : ''}
            </span>
            <div class="invest-kpi-icon" style="background:var(--verde);color:#fff">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
          </div>
          <div class="invest-kpi-val green" style="font-size:26px">${fmtBRL(allStats.currentValue)}</div>
          <div class="invest-kpi-foot">
            <span class="invest-kpi-badge green">⚡ Atualiza todo dia</span>
            <span>Patrimônio líquido acumulado</span>
          </div>
        </div>

        <!-- Card 4: Rendimento Diário (+R$/dia) -->
        <div class="invest-kpi-card">
          <div class="invest-kpi-head">
            <span class="invest-kpi-label">Rendimento Diário</span>
            <div class="invest-kpi-icon" style="background:#fef3c7;color:#b45309">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
          </div>
          <div class="invest-kpi-val amber">+${fmtBRL(allStats.totalDailyGain)} <span style="font-size:13px;color:var(--muted);font-weight:normal">/dia</span></div>
          <div class="invest-kpi-foot">
            <span>Ganhando ~0,32% a cada 24 horas (10% ao mês)</span>
          </div>
        </div>
      </div>

      <!-- Filtro de Categorias -->
      <div class="invest-cats">
        ${catPills}
      </div>

      <!-- Tabela de Aportes -->
      <div class="invest-table-card">
        <div class="invest-table-head">
          <h3>
            <span>Tabela de Aportes</span>
            <span class="chip neutral" style="font-weight:700">${filteredDeposits.length} aporte${filteredDeposits.length === 1 ? '' : 's'}</span>
          </h3>
          <button class="btn" data-act="invest-novo" style="padding:6px 12px;font-size:12.5px">
            ${IC.plus} Novo Aporte
          </button>
        </div>
        <div class="invest-table-wrap">
          <table class="invest-table">
            <thead>
              <tr>
                <th>Data do Aporte</th>
                <th>Categoria</th>
                <th>Descrição / Regime</th>
                <th>Aporte Inicial</th>
                <th>Lucro Acumulado</th>
                <th>Saldo Disponível</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/* Modais de Desbloqueio, Aportes, Resgates e PIN */
function promptInvestUnlock() {
  const currentPin = (investmentsState && investmentsState.pin) || '1234';

  const d = dlgOpen(
    'Área Restrita — Investimentos',
    'Digite seu PIN de 4 dígitos para acessar a sua carteira secreta:',
    `
      <div class="pin-box">
        <input type="password" maxlength="4" pattern="[0-9]*" inputmode="numeric" id="pinInput" class="pin-input" autofocus placeholder="••••" autocomplete="off">
        <div class="pin-quick-grid">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" class="pin-key" data-k="${n}">${n}</button>`).join('')}
          <button type="button" class="pin-key" data-k="clear" style="font-size:14px;color:var(--verm)">Apagar</button>
          <button type="button" class="pin-key" data-k="0">0</button>
          <button type="button" class="pin-key" data-k="ok" style="font-size:14px;color:var(--verde);background:#eaf7f1">OK</button>
        </div>
      </div>
    `,
    dModal => {
      const val = dModal.querySelector('#pinInput').value.trim();
      if (val === currentPin) {
        isInvestUnlocked = true;
        sessionStorage.setItem('caderneta.invest.unlocked', '1');
        const tabEl = document.getElementById('tabInvest');
        if (tabEl) tabEl.style.display = 'inline-flex';
        view.tab = 'invest';
        render();
        toast('Carteira de investimentos desbloqueada 📈');
        return true;
      } else {
        const inp = dModal.querySelector('#pinInput');
        inp.classList.remove('pin-shake');
        void inp.offsetWidth;
        inp.classList.add('pin-shake');
        inp.value = '';
        toast('PIN incorreto! Tente novamente.');
        return false;
      }
    },
    'Acessar Carteira'
  );

  const inp = d.querySelector('#pinInput');
  setTimeout(() => inp && inp.focus(), 80);

  d.querySelectorAll('.pin-key').forEach(k => {
    k.onclick = () => {
      const key = k.dataset.k;
      if (key === 'clear') {
        inp.value = '';
      } else if (key === 'ok') {
        d.querySelector('[data-x="s"]').click();
      } else {
        if (inp.value.length < 4) {
          inp.value += key;
          if (inp.value.length === 4) {
            setTimeout(() => d.querySelector('[data-x="s"]').click(), 120);
          }
        }
      }
    };
  });

  inp.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      d.querySelector('[data-x="s"]').click();
    }
  };
}

function lockInvestments() {
  isInvestUnlocked = false;
  sessionStorage.removeItem('caderneta.invest.unlocked');
  const tabEl = document.getElementById('tabInvest');
  if (tabEl) tabEl.style.display = 'none';
  view.tab = 'resumo';
  render();
  toast('Investimentos bloqueados e ocultos 🔒');
}

function dlgInvestAporte(editDep) {
  const isEdit = Boolean(editDep);
  const curCats = (investmentsState && investmentsState.categories) || ['Investimento Principal', 'Renda Fixa', 'Ações', 'Reserva'];
  const todayStr = new Date().toISOString().split('T')[0];

  const defaultDesc = isEdit ? editDep.description : '';
  const defaultCat = isEdit ? editDep.category : (curCats[0] || 'Investimento Principal');
  const defaultVal = isEdit ? Number(editDep.amount || 0).toFixed(2) : '';
  const defaultDate = isEdit ? editDep.date : todayStr;
  const defaultRate = isEdit ? (editDep.monthly_rate ?? 10) : 10;
  const defaultType = isEdit ? (editDep.compounding_type || 'daily') : 'daily';

  const catOptions = curCats.map(c => `<option value="${esc(c)}" ${c === defaultCat ? 'selected' : ''}>${esc(c)}</option>`).join('');

  const d = dlgOpen(
    isEdit ? 'Editar Aporte de Capital' : 'Novo Aporte de Capital',
    'Informe os dados do investimento. O rendimento é calculado todo dia com base na taxa mensal informada:',
    `
      <div style="display:flex;flex-direction:column;gap:12px">
        <label class="field">
          <span>Descrição do investimento</span>
          <input type="text" id="invDesc" class="field-inp" placeholder="Ex: Aporte Principal, CDB 10% a.m." value="${esc(defaultDesc)}">
        </label>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label class="field">
            <span>Categoria</span>
            <select id="invCatSelect" class="field-inp">
              ${catOptions}
              <option value="__nova__">+ Criar nova categoria...</option>
            </select>
          </label>
          <label class="field" id="boxNovaCat" style="display:none">
            <span>Nome da nova categoria</span>
            <input type="text" id="invNovaCat" class="field-inp" placeholder="Ex: Cripto, Imobiliário">
          </label>
          <label class="field">
            <span>Data do Aporte</span>
            <input type="date" id="invDate" class="field-inp" value="${defaultDate}">
          </label>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label class="field">
            <span>Valor Aportado (R$)</span>
            <input type="number" step="0.01" min="0.01" id="invAmount" class="field-inp" placeholder="1000,00" value="${defaultVal}">
          </label>
          <label class="field">
            <span>Rentabilidade (% ao mês)</span>
            <input type="number" step="0.1" min="0.1" id="invRate" class="field-inp" value="${defaultRate}">
          </label>
        </div>

        <label class="field">
          <span>Regime de Juros</span>
          <select id="invType" class="field-inp">
            <option value="daily" ${defaultType === 'daily' ? 'selected' : ''}>⚡ Juros Diários Compostos (~0,318% ao dia - Recomendado)</option>
            <option value="monthly_strict" ${defaultType === 'monthly_strict' ? 'selected' : ''}>📅 Juros Mensais no Aniversário do Aporte</option>
          </select>
        </label>

        <!-- Live Preview -->
        <div id="invPreviewBox" style="background:var(--verde-soft);border:1px solid #b7ded0;border-radius:8px;padding:10px 12px;font-size:12.5px;color:var(--verde-dark)">
          Digite o valor e a data para visualizar a projeção em tempo real.
        </div>
      </div>
    `,
    dModal => {
      const desc = dModal.querySelector('#invDesc').value.trim() || 'Aporte de Capital';
      const catSel = dModal.querySelector('#invCatSelect').value;
      const novaCat = dModal.querySelector('#invNovaCat').value.trim();
      const finalCat = (catSel === '__nova__' && novaCat) ? novaCat : (catSel === '__nova__' ? 'Investimento Geral' : catSel);
      const amount = Number(dModal.querySelector('#invAmount').value);
      const date = dModal.querySelector('#invDate').value;
      const monthlyRate = Number(dModal.querySelector('#invRate').value) || 10;
      const compoundingType = dModal.querySelector('#invType').value;

      if (!amount || amount <= 0) {
        toast('Informe um valor de aporte maior que zero.');
        return false;
      }
      if (!date) {
        toast('Informe a data do aporte.');
        return false;
      }

      if (finalCat && !investmentsState.categories.includes(finalCat)) {
        investmentsState.categories.push(finalCat);
      }

      if (isEdit) {
        editDep.description = desc;
        editDep.category = finalCat;
        editDep.amount = amount;
        editDep.date = date;
        editDep.monthly_rate = monthlyRate;
        editDep.compounding_type = compoundingType;
      } else {
        const newDep = {
          id: 'dep_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          description: desc,
          category: finalCat,
          amount: amount,
          date: date,
          monthly_rate: monthlyRate,
          compounding_type: compoundingType,
          withdrawals: []
        };
        investmentsState.deposits.push(newDep);

        if (window.confetti) {
          window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        }
      }

      saveInvestments();
      render();
      toast(isEdit ? 'Aporte atualizado com sucesso!' : 'Aporte de capital cadastrado com sucesso!');
      return true;
    },
    isEdit ? 'Salvar Alterações' : 'Cadastrar Aporte'
  );

  const catSelEl = d.querySelector('#invCatSelect');
  const boxNovaCatEl = d.querySelector('#boxNovaCat');
  catSelEl.onchange = () => {
    boxNovaCatEl.style.display = catSelEl.value === '__nova__' ? 'block' : 'none';
  };

  const updatePreview = () => {
    const amt = Number(d.querySelector('#invAmount').value);
    const dt = d.querySelector('#invDate').value;
    const rt = Number(d.querySelector('#invRate').value) || 10;
    const tp = d.querySelector('#invType').value;
    const box = d.querySelector('#invPreviewBox');

    if (!amt || amt <= 0 || !dt) {
      box.innerHTML = `Digite o valor e a data para visualizar a projeção em tempo real.`;
      return;
    }

    const tempDep = {
      amount: amt,
      date: dt,
      monthly_rate: rt,
      compounding_type: tp,
      withdrawals: isEdit && editDep ? editDep.withdrawals : []
    };
    const st = calculateDepositStats(tempDep, todayStr);
    box.innerHTML = `
      <b>Simulação até hoje (${st.daysActive} dias):</b><br>
      Saldo acumulado: <b>${fmtBRL(st.currentValue)}</b> &nbsp;·&nbsp; Lucro de <b>+${fmtBRL(st.totalYield)}</b> (+${amt > 0 ? ((st.totalYield / amt) * 100).toFixed(1) : 0}%)<br>
      <small style="color:var(--verde-dark);opacity:0.9">Rendendo <b>+${fmtBRL(st.dailyGain)} por dia</b>.</small>
    `;
  };

  d.querySelector('#invAmount').oninput = updatePreview;
  d.querySelector('#invDate').oninput = updatePreview;
  d.querySelector('#invRate').oninput = updatePreview;
  d.querySelector('#invType').onchange = updatePreview;
  updatePreview();
}

function dlgInvestWithdraw(dep) {
  if (!dep) return;
  const todayStr = new Date().toISOString().split('T')[0];
  const stats = calculateDepositStats(dep, todayStr);
  const curBal = stats.currentValue;
  const roundedBal = Math.round(curBal * 100) / 100;

  const pastWiths = dep.withdrawals || [];
  const pastWithsHTML = pastWiths.length > 0 ? `
    <div style="border-top:1px dashed var(--line);padding-top:10px;margin-top:10px">
      <span style="font-size:12px;font-weight:700;color:var(--muted);display:block;margin-bottom:6px">Histórico de resgates anteriores neste aporte:</span>
      <div style="display:flex;flex-direction:column;gap:5px;max-height:110px;overflow-y:auto">
        ${pastWiths.map(w => `
          <div style="display:flex;align-items:center;justify-content:space-between;background:#fef7ea;border:1px solid #fae6c6;padding:5px 8px;border-radius:6px;font-size:12px">
            <span><b>-${fmtBRL(w.amount)}</b> em ${formatDateBR(w.date)} (${esc(w.description || 'Resgate')})</span>
            <button class="btn danger" style="padding:2px 6px;font-size:11px" data-act="del-past-with" data-wid="${esc(w.id)}">Estornar</button>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const d = dlgOpen(
    'Resgatar do Aporte',
    `Retire parte ou a totalidade do saldo acumulado deste aporte (${esc(dep.description)}). O saldo restante continuará rendendo normalmente:`,
    `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="background:#f4faf6;border:1px solid #c2e5d6;padding:12px 14px;border-radius:8px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Saldo Disponível</span>
            <b style="display:block;font-size:20px;font-family:var(--mono);color:var(--verde)">${fmtBRL(curBal)}</b>
          </div>
          <span class="chip neutral" style="font-family:var(--mono);font-size:12px">Aporte inicial: ${fmtBRL(dep.amount)}</span>
        </div>

        <div>
          <span style="font-size:12px;font-weight:600;color:var(--ink-light);display:block;margin-bottom:6px">Atalhos de resgate:</span>
          <div style="display:flex;gap:6px">
            <button type="button" class="invest-sim-btn" data-pct="25">25%</button>
            <button type="button" class="invest-sim-btn" data-pct="50">50%</button>
            <button type="button" class="invest-sim-btn" data-pct="75">75%</button>
            <button type="button" class="invest-sim-btn" data-pct="100" style="background:#fdf0d5;color:#8f5a09;border-color:#f8d89a">100% (Total)</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label class="field">
            <span>Valor a Retirar (R$)</span>
            <input type="number" step="0.01" min="0.01" max="${roundedBal.toFixed(2)}" id="wAmount" class="field-inp" placeholder="0,00">
          </label>
          <label class="field">
            <span>Data do Resgate</span>
            <input type="date" id="wDate" class="field-inp" value="${todayStr}">
          </label>
        </div>

        <label class="field">
          <span>Motivo / Descrição</span>
          <input type="text" id="wDesc" class="field-inp" placeholder="Ex: Retirada de lucros, Compra de equipamento" value="Resgate Parcial">
        </label>

        ${pastWithsHTML}
      </div>
    `,
    dModal => {
      const amt = Number(dModal.querySelector('#wAmount').value);
      const dt = dModal.querySelector('#wDate').value;
      const desc = dModal.querySelector('#wDesc').value.trim() || 'Resgate Parcial';

      if (!amt || amt <= 0) {
        toast('Informe um valor de resgate maior que zero.');
        return false;
      }
      if (amt > roundedBal + 0.01) {
        toast(`O valor do resgate (${fmtBRL(amt)}) não pode exceder o saldo disponível (${fmtBRL(roundedBal)}).`);
        return false;
      }
      if (!dt) {
        toast('Informe a data do resgate.');
        return false;
      }

      if (!Array.isArray(dep.withdrawals)) {
        dep.withdrawals = [];
      }

      dep.withdrawals.push({
        id: 'w_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        amount: Math.min(amt, curBal),
        date: dt,
        description: desc
      });

      saveInvestments();
      render();
      toast(`Resgate de ${fmtBRL(amt)} realizado com sucesso!`);
      return true;
    },
    'Confirmar Resgate'
  );

  d.querySelectorAll('[data-pct]').forEach(btn => {
    btn.onclick = () => {
      const pct = Number(btn.dataset.pct);
      const val = pct === 100 ? roundedBal : (Math.floor(curBal * (pct / 100) * 100) / 100);
      d.querySelector('#wAmount').value = val.toFixed(2);
    };
  });

  d.querySelectorAll('[data-act="del-past-with"]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const wid = btn.dataset.wid;
      dep.withdrawals = dep.withdrawals.filter(w => w.id !== wid);
      saveInvestments();
      d.close();
      dlgInvestWithdraw(dep);
      toast('Resgate anterior estornado com sucesso.');
    };
  });
}

function dlgInvestPin() {
  const currentPin = (investmentsState && investmentsState.pin) || '1234';

  dlgOpen(
    'Alterar PIN de Segurança',
    'Defina uma nova senha numérica de 4 dígitos para proteger o acesso aos seus investimentos:',
    `
      <div style="display:flex;flex-direction:column;gap:12px">
        <label class="field">
          <span>PIN Atual (4 dígitos)</span>
          <input type="password" maxlength="4" pattern="[0-9]*" inputmode="numeric" id="pinCur" class="field-inp" placeholder="••••">
        </label>
        <label class="field">
          <span>Novo PIN (4 dígitos)</span>
          <input type="password" maxlength="4" pattern="[0-9]*" inputmode="numeric" id="pinNew" class="field-inp" placeholder="••••">
        </label>
        <label class="field">
          <span>Confirmar Novo PIN</span>
          <input type="password" maxlength="4" pattern="[0-9]*" inputmode="numeric" id="pinConf" class="field-inp" placeholder="••••">
        </label>
      </div>
    `,
    dModal => {
      const cur = dModal.querySelector('#pinCur').value.trim();
      const n1 = dModal.querySelector('#pinNew').value.trim();
      const n2 = dModal.querySelector('#pinConf').value.trim();

      if (cur !== currentPin) {
        toast('O PIN atual informado está incorreto.');
        return false;
      }
      if (!/^\d{4}$/.test(n1)) {
        toast('O novo PIN deve conter exatamente 4 números.');
        return false;
      }
      if (n1 !== n2) {
        toast('A confirmação do novo PIN não confere.');
        return false;
      }

      investmentsState.pin = n1;
      saveInvestments();
      toast('PIN alterado com sucesso! ✔');
      return true;
    },
    'Salvar Novo PIN'
  );
}

/* Gatilhos Secretos de Acesso à Carteira */
let secretDotClicks = 0;
let secretDotTimer = null;
const secretTriggerEl = document.getElementById('secretTrigger');
if (secretTriggerEl) {
  secretTriggerEl.addEventListener('click', (e) => {
    e.stopPropagation();
    secretDotClicks++;
    clearTimeout(secretDotTimer);
    secretDotTimer = setTimeout(() => { secretDotClicks = 0; }, 800);
    if (secretDotClicks >= 2) {
      secretDotClicks = 0;
      promptInvestUnlock();
    }
  });
}

window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
    e.preventDefault();
    promptInvestUnlock();
  }
});

function checkHashInvest() {
  if (location.hash === '#invest' || location.hash === '#investimentos') {
    if (!isInvestUnlocked) {
      promptInvestUnlock();
    } else {
      view.tab = 'invest';
      render();
    }
  }
}
window.addEventListener('hashchange', checkHashInvest);

/* ================= INICIALIZAÇÃO ================= */
initData();
