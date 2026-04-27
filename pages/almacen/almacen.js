const ENV = window.ENV_CONFIG || {};
const API_BASE = String(ENV.BASE_URL || '').replace(/\/+$/, '');
const AUTHORIZATION_TOKEN = String(ENV.AUTHORIZATION_TOKEN || '').trim();
const API_KEY = String(ENV.API_KEY || '').trim();

const ENDPOINTS = {
  getOperator:    String(ENV.GET_OPE_ENDPOINT || '/api/API_GET_OPE'),
  getInventories: '/alm_stock/GET_INVENTORIES',
  queries:        '/api/API_QUERIES',
  invZonaStock:   '/alm_stock/GET_ALM_INV_ZONA_STOCK',
  palByCode:      '/alm_stock/GET_ALM_PAL_BY_CODE',
  altByCode:      '/alm_stock/GET_ALM_ALT_BY_CODE',
  setPosTopal:    '/alm_stock/SET_POS_TO_PAL',
  newBoxByCode:      '/alm_stock/GET_ALM_NEW_BOX_BY_CODE',
  varByEan:          '/alm_stock/GET_VAR_BY_EAN',
  setInvBoxAndArt:   '/alm_stock/SET_FIRST_INV_BOX_AND_ART'
};

const SESSION_KEY_EAN  = 'srk_ope_ean';
const SESSION_KEY_NAME = 'srk_ope_name';

const screens = {
  operator:       document.getElementById('screen-operator'),
  menu:           document.getElementById('screen-menu'),
  inventories:    document.getElementById('screen-inventories'),
  zones:          document.getElementById('screen-zones'),
  zoneStock:      document.getElementById('screen-zone-stock'),
  scanPallet:     document.getElementById('screen-scan-pallet'),
  scanAltura:     document.getElementById('screen-scan-altura'),
  selectPos:      document.getElementById('screen-select-pos'),
  palletSummary:  document.getElementById('screen-pallet-summary'),
  confirm:        document.getElementById('screen-confirm'),
  scanBox:        document.getElementById('screen-scan-box'),
  scanArticle:    document.getElementById('screen-scan-article'),
  units:          document.getElementById('screen-units'),
  loading:        document.getElementById('screen-loading'),
  error:          document.getElementById('screen-error'),
  assignPo:       document.getElementById('screen-assign-po'),
  fechaAprox:     document.getElementById('screen-fecha-aprox')
};

const state = {
  operatorEan:       '',
  operatorName:      '',
  selectedInventory: null,
  selectedInvZona:   null,
  allZonas:          {},
  palletEan:         '',
  palletId:          null,
  palletBoxes:       [],
  alturaEan:         '',
  alturaId:          null,
  alturaName:        '',
  alturaEstName:     '',
  alturaRackName:    '',
  alturaPositions:   [],
  selectedPos:       null,
  boxCode:           '',
  currentBox:        null,
  articleEan:        '',
  artName:           '',
  varName:           '',
  varId:             null,
  artImage:          '',
  comParId:          null,
  comParName:        '',
  comParEta:         '',
  comParList:        [],
  fechaLlegadaAprox: '',
  palletPositioned:  false
};

// ── DOM refs ────────────────────────────────────────────────────────

const inputOperatorEan  = document.getElementById('input-operator-ean');
const formOperatorScan  = document.getElementById('form-operator-scan');
const loadingTitle      = document.getElementById('loading-title');
const errorText         = document.getElementById('error-text');
const operatorBadge     = document.getElementById('operator-badge');
const operatorBadgeName = document.getElementById('operator-badge-name');
const btnBackFloat      = document.getElementById('btn-back-float');
const btnInventarios    = document.getElementById('btn-inventarios');
const inventoriesList   = document.getElementById('inventories-list');
const btnBackFromInv    = document.getElementById('btn-back-from-inventories');
const zonesInvName      = document.getElementById('zones-inv-name');
const zonesList         = document.getElementById('zones-list');
const btnBackFromZones  = document.getElementById('btn-back-from-zones');
const zoneStockInvName  = document.getElementById('zone-stock-inv-name');
const zoneStockTitle    = document.getElementById('zone-stock-title');
const zoneStockList     = document.getElementById('zone-stock-list');
const btnBackFromStock  = document.getElementById('btn-back-from-zone-stock');
const btnEscanearPallet = document.getElementById('btn-escanear-pallet');
const inputPalletEan    = document.getElementById('input-pallet-ean');
const inputAlturaEan    = document.getElementById('input-altura-ean');
const posContextText    = document.getElementById('pos-context-text');
const posTableHead      = document.getElementById('pos-table-head');
const posTableBody      = document.getElementById('pos-table-body');
const btnAsignarPallet  = document.getElementById('btn-asignar-pallet');
const alturaPalletBadge  = document.getElementById('altura-pallet-badge');
const posLocationBadge   = document.getElementById('pos-location-badge');
const summaryPalletTitle = document.getElementById('summary-pallet-title');
const summaryLocation    = document.getElementById('summary-location');
const summaryBoxesBody   = document.getElementById('summary-boxes-body');
const summaryEmptyMsg    = document.getElementById('summary-empty-msg');
const btnAddBox          = document.getElementById('btn-add-box');
const confirmTitle       = document.getElementById('confirm-title');
const confirmMsg         = document.getElementById('confirm-msg');
const btnConfirmYes      = document.getElementById('btn-confirm-yes');
const btnConfirmNo       = document.getElementById('btn-confirm-no');
const inputBoxCode       = document.getElementById('input-box-code');
const boxContextText     = document.getElementById('box-context-text');
const btnResumenPallet   = document.getElementById('btn-resumen-pallet');
const unitsArtImg        = document.getElementById('units-art-img');
const inputArticleEan   = document.getElementById('input-article-ean');
const articleContextTxt = document.getElementById('article-context-text');
const unitsArtName      = document.getElementById('units-art-name');
const unitsVarName      = document.getElementById('units-var-name');
const unitsValueEl      = document.getElementById('units-value');
const btnConfirmUnits      = document.getElementById('btn-confirm-units');
const inputPoSearch        = document.getElementById('input-po-search');
const poListEl             = document.getElementById('po-list');
const btnConfirmPo         = document.getElementById('btn-confirm-po');
const btnSwitchToFecha     = document.getElementById('btn-switch-to-fecha');
const poPalletBadge        = document.getElementById('po-pallet-badge');
const poNumpad             = document.querySelector('#screen-assign-po .numpad');
const calWrapEl            = document.getElementById('cal-wrap');
const fechaSelectedDisplay = document.getElementById('fecha-selected-display');
const btnConfirmFecha      = document.getElementById('btn-confirm-fecha');
const btnBackToPo          = document.getElementById('btn-back-to-po');
const fechaPalletBadge     = document.getElementById('fecha-pallet-badge');

// ── Navegación atrás ────────────────────────────────────────────────

const BACK_MAP = {
  menu:          () => { window.location.href = './index.html'; },
  inventories:   () => setScreen('menu'),
  zones:         () => setScreen('inventories'),
  zoneStock:     () => setScreen('zones'),
  scanPallet:    () => setScreen('zoneStock'),
  scanAltura:    () => enterScanPallet(),
  selectPos:     () => enterScanAltura(),
  assignPo:      () => enterScanPallet(),
  fechaAprox:    () => enterAssignPo(true),
  palletSummary: () => enterScanPallet(),
  scanBox:       () => enterPalletSummary(),
  scanArticle:   () => enterScanBox(),
  units:         () => enterScanArticle()
};

// ── Screen helpers ──────────────────────────────────────────────────

function setScreen(key) {
  scanLocked = false;
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[key].classList.remove('hidden');
  btnBackFloat.classList.toggle('hidden', !(key in BACK_MAP));
}

btnBackFloat.addEventListener('click', () => {
  const activeKey = Object.keys(screens).find(k => !screens[k].classList.contains('hidden'));
  const handler = BACK_MAP[activeKey];
  if (handler) handler();
});

function showError(message, onDone, ms = 2000) {
  errorText.textContent = message || 'ERROR';
  setScreen('error');
  clearTimeout(showError._t);
  showError._t = setTimeout(() => { if (typeof onDone === 'function') onDone(); }, ms);
}

// ── Operator badge ──────────────────────────────────────────────────

function showBadge(name) {
  operatorBadgeName.textContent = name;
  operatorBadge.classList.remove('hidden');
}

// ── Session storage ─────────────────────────────────────────────────

function saveSession(ean, name) {
  try { sessionStorage.setItem(SESSION_KEY_EAN, ean); sessionStorage.setItem(SESSION_KEY_NAME, name); } catch (_) {}
}

function loadSession() {
  try { return { ean: sessionStorage.getItem(SESSION_KEY_EAN) || '', name: sessionStorage.getItem(SESSION_KEY_NAME) || '' }; }
  catch (_) { return { ean: '', name: '' }; }
}

// ── API helpers ─────────────────────────────────────────────────────

async function apiPost(endpoint, queryParams = {}) {
  const headers = { Accept: 'application/json' };
  if (AUTHORIZATION_TOKEN) headers.Authorization = `Basic ${AUTHORIZATION_TOKEN}`;
  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  const url = `${API_BASE}${endpoint}${qs ? '?' + qs : ''}`;
  console.log('[API POST]', url);
  const res = await fetch(url, { method: 'POST', headers, cache: 'no-store' });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  if (data?.error) throw new Error(data.error);
  return data;
}

async function apiGet(endpoint, queryParams = {}) {
  const headers = { Accept: 'application/json' };
  if (AUTHORIZATION_TOKEN) headers.Authorization = `Basic ${AUTHORIZATION_TOKEN}`;
  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  const url = `${API_BASE}${endpoint}${qs ? '?' + qs : ''}`;
  console.log('[API]', url);
  const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  if (data?.error) throw new Error(data.error);
  return data;
}

async function queryAPI(sql) {
  const headers = { Accept: 'application/json' };
  if (AUTHORIZATION_TOKEN) headers.Authorization = `Basic ${AUTHORIZATION_TOKEN}`;
  const url = `${API_BASE}${ENDPOINTS.queries}?apikey=${encodeURIComponent(API_KEY)}&sql=${encodeURIComponent(sql)}`;
  console.log('[QUERY]', sql);
  const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data?.errors?.[0]?.message || `HTTP ${res.status}`);
  return data;
}
// queryAPI se sigue usando para cargar zonas (ALM_INVENTARIO_ZONA + ALM_ZONA)

// ── Operator scan ───────────────────────────────────────────────────

function toOperatorScreen() {
  state.operatorEan = '';
  state.operatorName = '';
  inputOperatorEan.value = '';
  setScreen('operator');
  setTimeout(() => inputOperatorEan.focus(), 10);
}

function toMenuScreen() {
  showBadge(state.operatorName);
  setScreen('menu');
}

formOperatorScan.addEventListener('submit', async (event) => {
  event.preventDefault();
  const ean = String(inputOperatorEan.value || '').trim();
  if (!ean) return;
  lockScan();
  try {
    loadingTitle.textContent = 'VALIDANDO OPERARIO...';
    setScreen('loading');
    const payload = await apiGet(ENDPOINTS.getOperator, { operator_ean: ean });
    const name = String(payload?.name || '').trim();
    if (!name) throw new Error('OPERARIO NO ENCONTRADO');
    state.operatorEan = ean;
    state.operatorName = name;
    saveSession(ean, name);
    toMenuScreen();
  } catch (err) {
    showError(err.message || 'OPERARIO NO ENCONTRADO', () => {
      inputOperatorEan.value = '';
      setScreen('operator');
      setTimeout(() => inputOperatorEan.focus(), 10);
    });
  }
});

// ── Utilidades ──────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (_) { return '—'; }
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function idList(arr) {
  return arr.join(',');
}

// ── Inventarios ─────────────────────────────────────────────────────

btnInventarios.addEventListener('click', async () => {
  try {
    loadingTitle.textContent = 'CARGANDO INVENTARIOS...';
    setScreen('loading');
    const data = await apiGet(ENDPOINTS.getInventories);
    const all = Array.isArray(data) ? data : [];
    // Solo inventarios abiertos: no contado, no consolidado, sin fecha cierre
    const open = all.filter(inv => !inv.CONTADO && !inv.CONSOLIDADO && !inv.FECHA_CERRADO);
    renderInventories(open);
    setScreen('inventories');
  } catch (err) {
    showError(err.message || 'ERROR AL CARGAR INVENTARIOS', () => toMenuScreen());
  }
});

function renderInventories(list) {
  inventoriesList.innerHTML = '';
  if (!list || list.length === 0) {
    inventoriesList.innerHTML = '<p class="inv-empty">NO HAY INVENTARIOS ABIERTOS</p>';
    return;
  }
  list.forEach(inv => {
    const card = document.createElement('button');
    card.className = 'inv-card';
    card.innerHTML = `
      <div>
        <p class="inv-card-title">${escHtml(inv.TITULO)}</p>
        <div class="inv-card-meta">
          <span class="inv-meta-tag">ALMACÉN ${inv.ALMACEN}</span>
          <span class="inv-meta-tag">${fmtDate(inv.FECHA_CREADO)}</span>
        </div>
        ${inv.NOTAS ? `<p class="inv-notes">${escHtml(inv.NOTAS)}</p>` : ''}
      </div>
      <span class="inv-badge inv-badge--abierto">ABIERTO</span>
    `;
    card.addEventListener('click', () => loadZones(inv));
    inventoriesList.appendChild(card);
  });
}

btnBackFromInv.addEventListener('click', () => toMenuScreen());

// ── Zonas ───────────────────────────────────────────────────────────

async function loadZones(inv) {
  state.selectedInventory = inv;
  try {
    loadingTitle.textContent = 'CARGANDO ZONAS...';
    setScreen('loading');

    const [invZonasData, todasZonasData] = await Promise.all([
      queryAPI(`SELECT * FROM ALM_INVENTARIO_ZONA WHERE INVENTARIO=${inv.ID}`),
      queryAPI('SELECT * FROM ALM_ZONA')
    ]);

    const invZonas = invZonasData?.alm_inventario_zona || [];
    const todasZonas = todasZonasData?.alm_zona || [];

    // Cache de zonas por ID para nombre rápido
    state.allZonas = {};
    todasZonas.forEach(z => { state.allZonas[z.id] = z.name; });

    zonesInvName.textContent = escHtml(inv.TITULO);
    renderZones(invZonas);
    setScreen('zones');
  } catch (err) {
    showError(err.message || 'ERROR AL CARGAR ZONAS', () => setScreen('inventories'));
  }
}

function renderZones(invZonas) {
  zonesList.innerHTML = '';
  if (!invZonas || invZonas.length === 0) {
    zonesList.innerHTML = '<p class="inv-empty">ESTE INVENTARIO NO TIENE ZONAS</p>';
    return;
  }
  invZonas.forEach(iz => {
    const zoneName = state.allZonas[iz.alm_zona] || `ZONA ${iz.alm_zona}`;
    const card = document.createElement('button');
    card.className = 'zone-card';
    card.innerHTML = `
      <div>
        <p class="zone-card-name">${escHtml(zoneName)}</p>
        <div class="zone-card-meta">
          <span class="inv-meta-tag">${iz.cajas_contadas} CAJAS</span>
        </div>
      </div>
      <span class="inv-badge ${iz.contada ? 'inv-badge--contado' : 'inv-badge--abierto'}">
        ${iz.contada ? 'CONTADA' : 'PENDIENTE'}
      </span>
    `;
    card.addEventListener('click', () => loadZoneStock(iz, zoneName));
    zonesList.appendChild(card);
  });
}

btnBackFromZones.addEventListener('click', () => setScreen('inventories'));

// ── Stock por zona ──────────────────────────────────────────────────

async function loadZoneStock(invZona, zoneName) {
  state.selectedInvZona = invZona;
  try {
    loadingTitle.textContent = 'CARGANDO STOCK...';
    setScreen('loading');

    const rows = await apiGet(ENDPOINTS.invZonaStock, { inv_zona_id: invZona.id });

    zoneStockInvName.textContent = escHtml(state.selectedInventory?.TITULO || '');
    zoneStockTitle.textContent = escHtml(zoneName);
    renderZoneStock(Array.isArray(rows) ? rows : []);
    setScreen('zoneStock');
  } catch (err) {
    showError(err.message || 'ERROR AL CARGAR STOCK', () => setScreen('zones'));
  }
}

function renderZoneStock(rows) {
  zoneStockList.innerHTML = '';
  if (!rows || rows.length === 0) {
    zoneStockList.innerHTML = '<p class="stock-empty">SIN STOCK CONTADO EN ESTA ZONA</p>';
    return;
  }
  rows.forEach(row => {
    const imgHtml = row.art_image
      ? `<img class="stock-row-img" src="${escHtml(row.art_image)}" alt="" onerror="this.style.display='none'">`
      : `<div class="stock-row-img stock-row-img--empty"></div>`;
    const el = document.createElement('div');
    el.className = 'stock-row';
    el.innerHTML = `
      ${imgHtml}
      <div class="stock-row-info">
        <span class="stock-row-name">${escHtml(row.art_name)}</span>
        <span class="stock-row-var">${escHtml(row.var_name)} &nbsp;·&nbsp; ${row.cajas_contadas} CAJA${row.cajas_contadas !== 1 ? 'S' : ''}</span>
      </div>
      <div class="stock-row-qty">
        <span class="stock-qty-num">${row.cantidad}</span>
        <span class="stock-qty-label">UDS</span>
      </div>
    `;
    zoneStockList.appendChild(el);
  });
}

btnBackFromStock.addEventListener('click', () => setScreen('zones'));

// ── Keyboard / scanner ──────────────────────────────────────────────

function getActiveScanContext() {
  if (!screens.operator.classList.contains('hidden'))    return { input: inputOperatorEan,  submit: () => formOperatorScan.requestSubmit() };
  if (!screens.scanPallet.classList.contains('hidden'))  return { input: inputPalletEan,    submit: submitPalletEan };
  if (!screens.scanAltura.classList.contains('hidden'))  return { input: inputAlturaEan,    submit: submitAlturaEan };
  if (!screens.scanBox.classList.contains('hidden'))     return { input: inputBoxCode,      submit: submitBoxCode };
  if (!screens.scanArticle.classList.contains('hidden')) return { input: inputArticleEan,   submit: submitArticleEan };
  return null;
}

window.addEventListener('keydown', event => {
  if (scanLocked) return;
  if (event.ctrlKey || event.metaKey) return;
  const ctx = getActiveScanContext();
  if (!ctx) return;
  if (/^[a-zA-Z0-9]$/.test(event.key)) { event.preventDefault(); ctx.input.value += event.key; return; }
  if (event.key === 'Backspace') { event.preventDefault(); ctx.input.value = ctx.input.value.slice(0, -1); return; }
  if (event.key === 'Delete')    { event.preventDefault(); ctx.input.value = ''; return; }
  if (event.key === 'Enter')     { event.preventDefault(); ctx.submit(); }
});

window.addEventListener('paste', event => {
  const ctx = getActiveScanContext();
  if (!ctx) return;
  const text = event.clipboardData?.getData('text') || '';
  if (!text) return;
  event.preventDefault();
  ctx.input.value += text.trim();
});

// ── Flujo pallet ────────────────────────────────────────────────────

function enterScanPallet() {
  state.palletEan      = '';
  state.palletId       = null;
  state.palletBoxes    = [];
  state.alturaEan      = '';
  state.alturaId       = null;
  state.alturaName     = '';
  state.alturaEstName  = '';
  state.alturaRackName = '';
  state.alturaPositions = [];
  state.selectedPos    = null;
  state.boxCode        = '';
  state.currentBox     = null;
  state.articleEan     = '';
  state.artName        = '';
  state.varName        = '';
  state.varId          = null;
  state.artImage       = '';
  state.comParId          = null;
  state.comParName        = '';
  state.comParEta         = '';
  state.comParList        = [];
  state.fechaLlegadaAprox = '';
  state.palletPositioned  = false;
  inputPalletEan.value    = '';
  setScreen('scanPallet');
}

async function submitPalletEan() {
  const code = inputPalletEan.value.trim();
  if (!code) return;
  lockScan();
  try {
    loadingTitle.textContent = 'VALIDANDO PALLET...';
    setScreen('loading');
    const pal = await apiGet(ENDPOINTS.palByCode, {
      code,
      alm_zona_id: state.selectedInvZona?.alm_zona
    });
    state.palletEan        = pal.pal_code || code;
    state.palletId         = pal.id;
    state.palletBoxes      = pal.boxes || [];
    state.palletPositioned = pal.positioned;
    if (pal.positioned) {
      state.selectedPos    = { id: pal.alm_pos_id, name: pal.pos_name };
      state.alturaName     = pal.alt_name  || '';
      state.alturaEstName  = pal.est_name  || '';
      state.alturaRackName = pal.rack_name || '';
    }
    enterAssignPo();
  } catch (err) {
    showError(err.message || 'ERROR AL VALIDAR PALLET', () => {
      inputPalletEan.value = '';
      setScreen('scanPallet');
    });
  }
}

function enterScanAltura() {
  state.alturaEan      = '';
  state.alturaId       = null;
  state.alturaName     = '';
  state.alturaEstName  = '';
  state.alturaRackName = '';
  state.alturaPositions = [];
  state.selectedPos    = null;
  inputAlturaEan.value = '';
  alturaPalletBadge.textContent = `PALLET: ${state.palletEan}`;
  setScreen('scanAltura');
}

async function submitAlturaEan() {
  const code = inputAlturaEan.value.trim();
  if (!code) return;
  lockScan();
  try {
    loadingTitle.textContent = 'VALIDANDO ESTANTERÍA...';
    setScreen('loading');
    const alt = await apiGet(ENDPOINTS.altByCode, {
      code,
      alm_zona_id: state.selectedInvZona?.alm_zona
    });
    state.alturaEan      = code;
    state.alturaId       = alt.id;
    state.alturaName     = alt.name;
    state.alturaEstName  = alt.est_name  || '';
    state.alturaRackName = alt.rack_name || '';
    state.alturaPositions = alt.positions || [];
    enterSelectPos();
  } catch (err) {
    showError(err.message || 'ERROR AL VALIDAR ESTANTERÍA', () => {
      inputAlturaEan.value = '';
      setScreen('scanAltura');
    });
  }
}

function enterSelectPos() {
  state.selectedPos = null;
  posContextText.textContent  = `PALLET: ${state.palletEan}`;
  posLocationBadge.textContent = `${state.alturaRackName} / ${state.alturaEstName} / ALTURA ${state.alturaName}`;
  renderPositions();
  btnAsignarPallet.disabled = true;
  setScreen('selectPos');
}

function renderPositions() {
  const positions  = state.alturaPositions || [];
  const hayOcupada = positions.some(p => p.ocupado);

  posTableHead.innerHTML = hayOcupada
    ? '<tr><th>POSICIÓN</th><th>ESTADO</th><th>PALLET INFO</th></tr>'
    : '<tr><th>POSICIÓN</th><th>ESTADO</th></tr>';

  posTableBody.innerHTML = '';
  positions.forEach(p => {
    const tr = document.createElement('tr');
    if (p.ocupado) tr.classList.add('pos-row--occupied');
    const estadoCell = p.ocupado
      ? `<span class="pos-badge pos-badge--occupied">OCUPADO</span>`
      : `<span class="pos-badge pos-badge--free">LIBRE</span>`;
    const palletCell = hayOcupada
      ? `<td class="pos-pal-info">${p.ocupado ? `<span class="pos-pal-code">${escHtml(p.pal_code || '—')}</span><span class="pos-pal-cajas">${p.cajas ? p.cajas + ' CAJ.' : ''}</span>` : ''}</td>`
      : '';
    tr.innerHTML = `<td>${escHtml(p.name)}</td><td>${estadoCell}</td>${palletCell}`;
    if (!p.ocupado) {
      tr.addEventListener('click', () => {
        posTableBody.querySelectorAll('tr').forEach(r => r.classList.remove('pos-row--selected'));
        tr.classList.add('pos-row--selected');
        state.selectedPos = p;
        btnAsignarPallet.disabled = false;
      });
    }
    posTableBody.appendChild(tr);
  });
}

btnAsignarPallet.addEventListener('click', async () => {
  if (!state.selectedPos) return;
  lockScan();
  try {
    loadingTitle.textContent = 'ASIGNANDO PALLET...';
    setScreen('loading');
    await apiPost(ENDPOINTS.setPosTopal, {
      pos_id:   state.selectedPos.id,
      pal_code: state.palletEan
    });
    enterPalletSummary();
  } catch (err) {
    showError(err.message || 'ERROR AL ASIGNAR PALLET', () => setScreen('selectPos'));
  }
});

function enterPalletSummary() {
  summaryPalletTitle.textContent = `PALLET: ${state.palletEan}`;
  const loc = [state.alturaRackName, state.alturaEstName, `ALT.${state.alturaName}`, `POS.${state.selectedPos?.name || ''}`].filter(Boolean).join(' / ');
  summaryLocation.textContent = loc;
  renderPalletBoxes();
  setScreen('palletSummary');
}

function renderPalletBoxes() {
  summaryBoxesBody.innerHTML = '';
  const boxes = [...(state.palletBoxes || [])].sort((a, b) => {
    const nameA = String(a.art_name || ''), nameB = String(b.art_name || '');
    const cmp = nameA.localeCompare(nameB, 'es');
    if (cmp !== 0) return cmp;
    return String(a.var_name || '').localeCompare(String(b.var_name || ''), 'es');
  });
  const hasBoxes = boxes.length > 0;
  summaryEmptyMsg.classList.toggle('hidden', hasBoxes);
  boxes.forEach(b => {
    const imgHtml = b.art_image
      ? `<img class="summary-box-img" src="${escHtml(b.art_image)}" alt="" onerror="this.className='summary-box-img--empty'">`
      : `<span class="summary-box-img--empty"></span>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${imgHtml}</td>
      <td>${escHtml(b.art_name || '—')}</td>
      <td>${escHtml(b.var_name || '—')}</td>
      <td style="font-size:0.72rem;letter-spacing:0.02em">${escHtml(b.code128 || '—')}</td>
    `;
    summaryBoxesBody.appendChild(tr);
  });
}

btnAddBox.addEventListener('click', () => enterScanBox());

function enterScanBox() {
  state.boxCode = '';
  inputBoxCode.value = '';
  const loc = [state.alturaRackName, state.alturaEstName, `ALT.${state.alturaName}`, `POS.${state.selectedPos?.name || ''}`].filter(Boolean).join(' / ');
  boxContextText.textContent = `PALLET: ${state.palletEan} · ${loc}`;
  setScreen('scanBox');
}

async function submitBoxCode() {
  const code = inputBoxCode.value.trim();
  if (!code) return;
  lockScan();
  try {
    loadingTitle.textContent = 'VALIDANDO CAJA...';
    setScreen('loading');
    const box = await apiGet(ENDPOINTS.newBoxByCode, { code, pal_id: state.palletId });
    state.boxCode    = code;
    state.currentBox = box;
    if (box.already_assigned) {
      showConfirm('CAJA YA CONTADA', '¿Desea editarla?',
        () => enterScanArticle(),
        () => { inputBoxCode.value = ''; setScreen('scanBox'); }
      );
    } else {
      enterScanArticle();
    }
  } catch (err) {
    showError(err.message || 'ERROR AL VALIDAR CAJA', () => {
      inputBoxCode.value = '';
      setScreen('scanBox');
    });
  }
}

btnResumenPallet.addEventListener('click', () => enterPalletSummary());

function enterScanArticle() {
  state.articleEan = '';
  state.artName    = '';
  state.varName    = '';
  inputArticleEan.value = '';
  articleContextTxt.textContent = `CAJA: ${state.boxCode}`;
  setScreen('scanArticle');
}

async function submitArticleEan() {
  const ean = inputArticleEan.value.trim();
  if (!ean) return;
  lockScan();
  try {
    loadingTitle.textContent = 'BUSCANDO ARTÍCULO...';
    setScreen('loading');
    const v = await apiGet(ENDPOINTS.varByEan, { ean });
    state.articleEan = ean;
    state.artName    = v.art_name  || '';
    state.varName    = v.var_name  || '';
    state.varId      = v.id;
    state.artImage   = v.art_image || '';
    enterUnits();
  } catch (err) {
    showError(err.message || 'ARTÍCULO NO ENCONTRADO', () => {
      inputArticleEan.value = '';
      setScreen('scanArticle');
    });
  }
}

function enterUnits() {
  unitsValueEl.textContent = '0';
  unitsArtName.textContent = state.artName || state.articleEan || '—';
  unitsVarName.textContent = state.varName || '';
  if (state.artImage) {
    unitsArtImg.src = state.artImage;
    unitsArtImg.classList.remove('hidden');
  } else {
    unitsArtImg.src = '';
    unitsArtImg.classList.add('hidden');
  }
  setScreen('units');
}

let _confirmYes = null;
let _confirmNo  = null;

function showConfirm(title, msg, onYes, onNo) {
  confirmTitle.textContent = title;
  confirmMsg.textContent   = msg;
  _confirmYes = onYes;
  _confirmNo  = onNo;
  setScreen('confirm');
}

btnConfirmYes.addEventListener('click', () => { if (_confirmYes) _confirmYes(); });
btnConfirmNo.addEventListener('click',  () => { if (_confirmNo)  _confirmNo();  });

document.querySelector('#screen-units .numpad').addEventListener('click', e => {
  const btn = e.target.closest('[data-key]');
  if (!btn) return;
  const key = btn.dataset.key;
  let cur = unitsValueEl.textContent;
  if (key === 'clear') { unitsValueEl.textContent = '0'; return; }
  if (key === 'del')   { unitsValueEl.textContent = cur.length > 1 ? cur.slice(0, -1) : '0'; return; }
  if (cur === '0') cur = '';
  if (cur.length >= 4) return;
  unitsValueEl.textContent = cur + key;
});

poNumpad.addEventListener('click', e => {
  const btn = e.target.closest('[data-key]');
  if (!btn) return;
  const key = btn.dataset.key;
  let val = inputPoSearch.value;
  if (key === 'clear') { val = ''; }
  else if (key === 'del') { val = val.slice(0, -1); }
  else { val += key; }
  inputPoSearch.value = val;
  renderPoList(val);
});

async function doConfirmUnits() {
  const qty = parseInt(unitsValueEl.textContent, 10);
  if (!qty || qty <= 0) return;
  lockScan();
  try {
    loadingTitle.textContent = 'GUARDANDO...';
    setScreen('loading');
    await apiPost(ENDPOINTS.setInvBoxAndArt, {
      inv_zona_id:         state.selectedInvZona?.id,
      pal_id:              state.palletId,
      box_id:              state.currentBox?.id,
      art_var_ean:         state.articleEan,
      uds:                 qty,
      ope_name:            state.operatorName,
      com_par_id:          state.comParId          || undefined,
      fecha_llegada_aprox: state.fechaLlegadaAprox || undefined
    });
    loadingTitle.textContent = 'CARGANDO PALLET...';
    const pal = await apiGet(ENDPOINTS.palByCode, {
      code:        state.palletEan,
      alm_zona_id: state.selectedInvZona?.alm_zona
    });
    state.palletBoxes = pal.boxes || [];
    enterPalletSummary();
  } catch (err) {
    showError(err.message || 'ERROR AL GUARDAR', () => setScreen('units'));
  }
}

btnConfirmUnits.addEventListener('click', () => {
  const qty = parseInt(unitsValueEl.textContent, 10);
  if (!qty || qty <= 0) return;
  if (qty > 100) {
    showConfirm(
      `¿${qty} UNIDADES?`,
      'La cantidad introducida es mayor de 100. ¿Desea confirmar?',
      () => doConfirmUnits(),
      () => setScreen('units')
    );
  } else {
    doConfirmUnits();
  }
});

btnEscanearPallet.addEventListener('click', () => enterScanPallet());

// ── PO / Fecha llegada ──────────────────────────────────────────────

function proceedFromPallet() {
  if (state.palletPositioned) { enterPalletSummary(); }
  else { enterScanAltura(); }
}


function renderPoList(term) {
  const t = term.trim().toLowerCase();
  const filtered = t
    ? state.comParList.filter(p => {
        const name = String(p.name || p.nombre || p.codigo || p.id || '').toLowerCase();
        return name.includes(t) || String(p.id).includes(t);
      })
    : state.comParList;

  poListEl.innerHTML = '';
  if (!filtered.length) {
    poListEl.innerHTML = '<p class="po-list-empty">SIN RESULTADOS</p>';
    return;
  }
  filtered.slice(0, 80).forEach(p => {
    const name = p.name || p.nombre || p.codigo || `PO-${p.id}`;
    const btn  = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'po-list-item' + (state.comParId === p.id ? ' po-list-item--selected' : '');
    btn.innerHTML = `<span class="po-item-name">${escHtml(String(name))}</span><span class="po-item-id">#${p.id}</span>`;
    btn.addEventListener('click', () => {
      state.comParId   = p.id;
      state.comParName = String(name);
      state.comParEta  = String(p.f_eta_almacen || '').trim().split('T')[0];
      poListEl.querySelectorAll('.po-list-item').forEach(el => el.classList.remove('po-list-item--selected'));
      btn.classList.add('po-list-item--selected');
      btnConfirmPo.disabled = false;
    });
    poListEl.appendChild(btn);
  });
}

async function enterAssignPo(keepSelection = false) {
  poPalletBadge.textContent = `PALLET: ${state.palletEan}`;
  inputPoSearch.value = '';
  if (!keepSelection) {
    state.comParId   = null;
    state.comParName = '';
  }
  btnConfirmPo.disabled = state.comParId === null;

  if (state.comParList.length === 0) {
    try {
      loadingTitle.textContent = '';
      setScreen('loading');
      const data = await queryAPI('SELECT * FROM COM_PAR');
      const list = data?.com_par || [];
      list.sort((a, b) => b.id - a.id);
      state.comParList = list;
    } catch (err) {
      showError(err.message || 'ERROR AL CARGAR PEDIDOS', () => proceedFromPallet());
      return;
    }
  }
  renderPoList('');
  setScreen('assignPo');
}

btnConfirmPo.addEventListener('click', () => {
  if (state.comParId === null) return;
  if (state.comParEta) state.fechaLlegadaAprox = state.comParEta;
  proceedFromPallet();
});

btnSwitchToFecha.addEventListener('click', () => enterFechaAprox());

// ── Calendario ──────────────────────────────────────────────────────

let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

const MONTHS_ES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
const DAYS_ES   = ['L','M','X','J','V','S','D'];

function renderCalendar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstOfMonth = new Date(calYear, calMonth, 1);
  const lastOfMonth  = new Date(calYear, calMonth + 1, 0);
  const startDow     = (firstOfMonth.getDay() + 6) % 7; // Mon=0 … Sun=6

  const nowYear  = today.getFullYear();
  const nowMonth = today.getMonth();
  const atOrPastNow = calYear > nowYear || (calYear === nowYear && calMonth >= nowMonth);
  const atOrPastNowYear = calYear >= nowYear;

  let html = `
    <div class="cal-header">
      <div class="cal-nav-group">
        <button class="cal-nav-btn" id="cal-prev-year" type="button">«</button>
        <button class="cal-nav-btn" id="cal-prev" type="button">‹</button>
      </div>
      <span class="cal-month-title">${MONTHS_ES[calMonth]} ${calYear}</span>
      <div class="cal-nav-group">
        <button class="cal-nav-btn" id="cal-next" type="button"${atOrPastNow ? ' disabled' : ''}>›</button>
        <button class="cal-nav-btn" id="cal-next-year" type="button"${atOrPastNowYear ? ' disabled' : ''}>»</button>
      </div>
    </div>
    <div class="cal-weekdays">${DAYS_ES.map(d => `<span class="cal-wd">${d}</span>`).join('')}</div>
    <div class="cal-grid">
  `;

  // Siempre 6 filas × 7 cols = 42 celdas para altura fija
  const totalCells = 42;
  const daysInMonth = lastOfMonth.getDate();

  for (let cell = 0; cell < totalCells; cell++) {
    const dayNum = cell - startDow + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      html += `<span class="cal-day cal-day--empty"></span>`;
    } else {
      const dt  = new Date(calYear, calMonth, dayNum);
      const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const past = dt < today;
      const sel  = state.fechaLlegadaAprox === iso;
      html += `<button class="cal-day${!past ? ' cal-day--disabled' : ''}${sel ? ' cal-day--selected' : ''}" data-date="${iso}" type="button"${!past ? ' disabled' : ''}>${dayNum}</button>`;
    }
  }
  html += '</div>';
  calWrapEl.innerHTML = html;

  calWrapEl.querySelector('#cal-prev').addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar();
  });
  calWrapEl.querySelector('#cal-prev-year').addEventListener('click', () => {
    calYear--; renderCalendar();
  });
  const nextBtn = calWrapEl.querySelector('#cal-next');
  if (nextBtn && !nextBtn.disabled) {
    nextBtn.addEventListener('click', () => {
      calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar();
    });
  }
  const nextYearBtn = calWrapEl.querySelector('#cal-next-year');
  if (nextYearBtn && !nextYearBtn.disabled) {
    nextYearBtn.addEventListener('click', () => { calYear++; renderCalendar(); });
  }
  calWrapEl.querySelectorAll('.cal-day:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      state.fechaLlegadaAprox = btn.dataset.date;
      const [y, m, day] = btn.dataset.date.split('-');
      fechaSelectedDisplay.textContent = `FECHA SELECCIONADA: ${day}/${m}/${y}`;
      fechaSelectedDisplay.classList.remove('hidden');
      btnConfirmFecha.disabled = false;
      renderCalendar();
    });
  });
}

function enterFechaAprox() {
  fechaPalletBadge.textContent = `PALLET: ${state.palletEan}`;
  state.fechaLlegadaAprox = '';
  btnConfirmFecha.disabled = true;
  fechaSelectedDisplay.classList.add('hidden');
  calYear  = new Date().getFullYear();
  calMonth = new Date().getMonth();
  renderCalendar();
  setScreen('fechaAprox');
}

btnConfirmFecha.addEventListener('click', () => {
  if (!state.fechaLlegadaAprox) return;
  proceedFromPallet();
});

btnBackToPo.addEventListener('click', () => enterAssignPo(true));

// ── Init ────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  const session = loadSession();
  if (session.ean && session.name) {
    state.operatorEan = session.ean;
    state.operatorName = session.name;
    toMenuScreen();
  } else {
    toOperatorScreen();
  }
});
