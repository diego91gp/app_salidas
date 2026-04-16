const ENV = window.ENV_CONFIG || {};
const API_BASE = String(ENV.BASE_URL || '').replace(/\/+$/, '');
const AUTHORIZATION_TOKEN = String(ENV.AUTHORIZATION_TOKEN || '').trim();

const ENDPOINTS = {
  getInventories: String(ENV.PICKING_INV_ENDPOINT || '/api/API_GET_PICKING_INV'),
  createInventory: String(ENV.CREATE_PICKING_INV_ENDPOINT || '/api/API_CREATE_PICKING_INV'),
  getInventoryLines: String(ENV.PICKING_INV_LINES_ENDPOINT || '/api/API_GET_PICKING_INV_LINES'),
  getVarByEan: String(ENV.GET_VAR_BY_EAN_ENDPOINT || '/api/API_GET_VAR_BY_EAN'),
  createInventoryLine: String(ENV.CREATE_PICKING_INV_LINE_ENDPOINT || '/api/API_CREATE_PICKING_INV_LINE'),
  getOperator: String(ENV.GET_OPE_ENDPOINT || '/api/API_GET_OPE')
};

const screens = {
  list: document.getElementById('screen-inventory-list'),
  lines: document.getElementById('screen-inventory-lines'),
  operator: document.getElementById('screen-inventory-operator'),
  count: document.getElementById('screen-inventory-count'),
  varDetail: document.getElementById('screen-inventory-var'),
  loading: document.getElementById('screen-inventory-loading'),
  success: document.getElementById('screen-inventory-success'),
  error: document.getElementById('screen-inventory-error')
};

const inventoryListEl = document.getElementById('inventory-list');
const inventoryCountEl = document.getElementById('inventory-count');
const inventoryLinesListEl = document.getElementById('inventory-lines-list');
const inventoryLinesTitle = document.getElementById('inventory-lines-title');
const loadingTitle = document.getElementById('inventory-loading-title');
const successText = document.getElementById('inventory-success-text');
const errorText = document.getElementById('inventory-error-text');
const scanInput = document.getElementById('input-count-ean');
const errorBanner = document.getElementById('error-banner');
const operatorBadge = document.getElementById('inventory-operator-badge');

const formCountEan = document.getElementById('form-count-ean');
const formInventoryOperatorScan = document.getElementById('form-inventory-operator-scan');
const formVarDetail = document.getElementById('form-var-detail');
const btnBackToScan = document.getElementById('btn-back-to-scan');
const btnBackFromOperator = document.getElementById('btn-back-from-operator');
const btnToggleAvisos = document.getElementById('btn-toggle-avisos');
const keypadVar = document.getElementById('inventory-var-keypad');
const varDetailImage = document.getElementById('var-detail-image');
const varDetailName = document.getElementById('var-detail-name');
const inputVarUds = document.getElementById('input-var-uds');
const inputVarStockMax = document.getElementById('input-var-stock-max');
const inputVarStockMin = document.getElementById('input-var-stock-min');
const inventoryVarAdvanced = document.getElementById('inventory-var-advanced');
const varFormError = document.getElementById('var-form-error');
const inputInventoryOperatorEan = document.getElementById('input-inventory-operator-ean');

const btnReload = document.getElementById('btn-reload-inventories');
const btnCreateInventory = document.getElementById('btn-create-inventory');
const btnGoCount = document.getElementById('btn-go-count');
const btnBackInventoryList = document.getElementById('btn-back-inventory-list');
const btnBackLines = document.getElementById('btn-back-lines');

const state = {
  inventories: [],
  lines: [],
  currentInvId: null,
  currentVar: null,
  activeVarInput: null,
  currentOperatorName: '',
  currentOperatorEan: ''
};

function setScreen(key) {
  Object.values(screens).forEach((screen) => screen.classList.add('hidden'));
  screens[key].classList.remove('hidden');
}

function renderOperatorBadge() {
  if (!operatorBadge) return;
  const name = String(state.currentOperatorName || '').trim();
  if (!name) {
    operatorBadge.textContent = '';
    operatorBadge.classList.add('hidden');
    return;
  }
  operatorBadge.textContent = `OPERARIO: ${name}`;
  operatorBadge.classList.remove('hidden');
}

function focusOperatorInput() {
  setTimeout(() => inputInventoryOperatorEan?.focus(), 10);
}

function showToast(message) {
  errorBanner.textContent = message || 'ERROR';
  errorBanner.classList.remove('hidden');
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => errorBanner.classList.add('hidden'), 2200);
}

function showErrorScreen(message, onDone, durationMs = 1800) {
  errorText.textContent = message || 'ERROR';
  setScreen('error');
  window.clearTimeout(showErrorScreen._timer);
  showErrorScreen._timer = window.setTimeout(() => {
    if (typeof onDone === 'function') onDone();
  }, durationMs);
}

function showSuccessScreen(message, onDone, durationMs = 900) {
  successText.textContent = message || 'CREADO CON EXITO';
  setScreen('success');
  window.clearTimeout(showSuccessScreen._timer);
  showSuccessScreen._timer = window.setTimeout(() => {
    if (typeof onDone === 'function') onDone();
  }, durationMs);
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeVarPayload(payload) {
  const arr = asArray(payload);
  if (!arr.length) return null;
  const row = arr[0] || {};
  return {
    ean: String(row.ean || ''),
    articulo: String(row.articulo || 'ARTICULO'),
    stockMinAviso: String(row.stock_min_aviso ?? ''),
    stockMaxGaveta: String(row.stock_max_gaveta ?? ''),
    url: String(row.url || '')
  };
}

function extractInvId(payload) {
  if (!payload) return '';
  if (typeof payload === 'object' && !Array.isArray(payload) && payload.invId) {
    return String(payload.invId);
  }
  const arr = asArray(payload);
  if (!arr.length) return '';
  return String(arr[0]?.invId || arr[0]?.id || '');
}

function focusScanInput() {
  setTimeout(() => scanInput.focus(), 10);
}

function resetVarDetail() {
  state.currentVar = null;
  state.activeVarInput = inputVarUds;
  varDetailImage.src = 'mock-images/item-01.svg';
  varDetailName.textContent = 'ARTICULO';
  inputVarUds.value = '';
  inputVarStockMax.value = '';
  inputVarStockMin.value = '';
  setVarFormError('');
  if (inventoryVarAdvanced) {
    inventoryVarAdvanced.classList.add('hidden');
  }
  if (btnToggleAvisos) {
    btnToggleAvisos.setAttribute('aria-expanded', 'false');
  }
}

function setActiveVarInput(inputEl) {
  state.activeVarInput = inputEl;
  [inputVarUds, inputVarStockMax, inputVarStockMin].forEach((el) => {
    el.style.outline = '';
    el.style.borderColor = '';
  });
  if (inputEl) {
    inputEl.style.outline = '2px solid rgba(62, 166, 255, 0.45)';
    inputEl.style.borderColor = 'var(--primary)';
  }
}

function applyKeyToVarInput(key) {
  const target = state.activeVarInput || inputVarUds;
  if (!target) return;

  if (key === 'clear') {
    target.value = '';
    return;
  }
  if (key === 'back') {
    target.value = target.value.slice(0, -1);
    return;
  }
  if (/^\d$/.test(key)) {
    target.value += key;
  }
}

function isZeroLike(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!text) return true;
  const n = Number(text);
  return Number.isFinite(n) ? n <= 0 : true;
}

function setVarFormError(message) {
  if (!varFormError) return;
  if (!message) {
    varFormError.textContent = '';
    varFormError.classList.add('hidden');
    return;
  }
  varFormError.textContent = message;
  varFormError.classList.remove('hidden');
}

function renderVarDetail(varData) {
  state.currentVar = { ...varData };
  varDetailImage.src = varData.url || 'mock-images/item-01.svg';
  varDetailName.textContent = varData.articulo || 'ARTICULO';
  inputVarUds.value = '';
  inputVarStockMax.value = isZeroLike(varData.stockMaxGaveta) ? '' : String(varData.stockMaxGaveta || '');
  inputVarStockMin.value = isZeroLike(varData.stockMinAviso) ? '' : String(varData.stockMinAviso || '');
  setVarFormError('');
  const shouldExpandAvisos = isZeroLike(inputVarStockMax.value) || isZeroLike(inputVarStockMin.value);
  if (inventoryVarAdvanced) {
    inventoryVarAdvanced.classList.toggle('hidden', !shouldExpandAvisos);
  }
  if (btnToggleAvisos) {
    btnToggleAvisos.setAttribute('aria-expanded', String(shouldExpandAvisos));
  }
  setActiveVarInput(inputVarUds);
  setScreen('varDetail');
}

async function apiRequest(endpoint, method = 'GET', body, queryParams = {}) {
  const headers = { Accept: 'application/json' };
  if (AUTHORIZATION_TOKEN) {
    headers.Authorization = `Basic ${AUTHORIZATION_TOKEN}`;
  }

  let url = `${API_BASE}${endpoint}`;
  if (method === 'GET') {
    const params = new URLSearchParams();
    Object.entries(queryParams || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        params.set(k, String(v));
      }
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  } else {
    headers['Content-Type'] = 'application/json';
  }

  console.log('[API REQUEST]', { method, url, body: body ?? null });
  const response = await fetch(url, {
    method,
    headers,
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    cache: method === 'GET' ? 'no-store' : 'default'
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  console.log('[API RESPONSE]', { method, url, status: response.status, ok: response.ok, data });

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

function renderInventoryList() {
  const list = state.inventories;
  if (inventoryCountEl) {
    inventoryCountEl.textContent = '';
    inventoryCountEl.classList.add('hidden');
  }

  if (!list.length) {
    inventoryListEl.innerHTML = '';
    inventoryListEl.classList.add('hidden');
    return;
  }

  inventoryListEl.classList.remove('hidden');
  inventoryListEl.innerHTML = list
    .map(
      (item, idx) => `
      <button class="inventory-item inventory-item-simple" type="button" data-index="${idx}">
        <div class="inventory-main">
          <strong>${item.name || 'SIN NOMBRE'}</strong>
        </div>
      </button>`
    )
    .join('');
}

function renderInventoryLines() {
  inventoryLinesTitle.textContent = 'LINEAS INVENTARIO';

  if (!state.lines.length) {
    inventoryLinesTitle.classList.add('hidden');
    inventoryLinesListEl.classList.add('hidden');
    inventoryLinesListEl.innerHTML = '';
    return;
  }

  inventoryLinesTitle.classList.remove('hidden');
  inventoryLinesListEl.classList.remove('hidden');
  inventoryLinesListEl.innerHTML = state.lines
    .map(
      (line) => `
      <div class="inventory-line-item">
        <img class="inventory-thumb" src="${line.url || 'mock-images/item-01.svg'}" alt="" />
        <div class="inventory-main">
          <strong>${line.articulo || 'SIN DESCRIPCION'}</strong>
          <span>EAN ${line.ean || '-'} | UDS ${line.uds || 0}</span>
        </div>
      </div>`
    )
    .join('');
}

async function loadInventories() {
  try {
    loadingTitle.textContent = 'CARGANDO INVENTARIOS...';
    setScreen('loading');
    const payload = await apiRequest(ENDPOINTS.getInventories, 'GET');
    state.inventories = asArray(payload);
    renderInventoryList();
    setScreen('list');
  } catch (error) {
    showErrorScreen(error.message || 'NO SE PUDIERON CARGAR INVENTARIOS', () => {
      state.inventories = [];
      renderInventoryList();
      setScreen('list');
    });
  }
}

async function createInventoryAndLoadLines() {
  try {
    loadingTitle.textContent = 'CREANDO INVENTARIO...';
    setScreen('loading');
    const createResponse = await apiRequest(ENDPOINTS.createInventory, 'POST', {});
    const invId = extractInvId(createResponse);
    if (!invId) {
      throw new Error('NO SE RECIBIO ID DE INVENTARIO');
    }

    state.currentInvId = invId;

    showSuccessScreen('CREADO CON EXITO', async () => {
      try {
        loadingTitle.textContent = 'CARGANDO LINEAS...';
        setScreen('loading');
        const linesResponse = await apiRequest(ENDPOINTS.getInventoryLines, 'GET', null, { INV_ID: invId });
        state.lines = asArray(linesResponse);
        renderInventoryLines();
        setScreen('lines');
      } catch (error) {
        showErrorScreen(error.message || 'NO SE PUDIERON CARGAR LINEAS', () => setScreen('list'));
      }
    });
  } catch (error) {
    showErrorScreen(error.message || 'ERROR CREANDO INVENTARIO', () => setScreen('list'));
  }
}

async function loadLinesForInventory(invId) {
  loadingTitle.textContent = 'CARGANDO LINEAS...';
  setScreen('loading');
  const linesResponse = await apiRequest(ENDPOINTS.getInventoryLines, 'GET', null, { INV_ID: invId });
  state.lines = asArray(linesResponse);
  renderInventoryLines();
  setScreen('lines');
}

btnReload.addEventListener('click', loadInventories);
btnCreateInventory.addEventListener('click', createInventoryAndLoadLines);
btnBackInventoryList.addEventListener('click', () => setScreen('list'));
btnGoCount.addEventListener('click', () => {
  if (!state.currentOperatorEan) {
    inputInventoryOperatorEan.value = '';
    setScreen('operator');
    focusOperatorInput();
    return;
  }
  scanInput.value = '';
  setScreen('count');
  focusScanInput();
});
btnBackLines.addEventListener('click', () => setScreen('lines'));
if (btnBackFromOperator) {
  btnBackFromOperator.addEventListener('click', () => setScreen('lines'));
}

if (btnBackToScan) {
  btnBackToScan.addEventListener('click', () => {
    setScreen('count');
    focusScanInput();
  });
}

if (btnToggleAvisos) {
  btnToggleAvisos.addEventListener('click', () => {
    if (!inventoryVarAdvanced) return;
    inventoryVarAdvanced.classList.toggle('hidden');
    const isExpanded = !inventoryVarAdvanced.classList.contains('hidden');
    btnToggleAvisos.setAttribute('aria-expanded', String(isExpanded));
    if (isExpanded) {
      setActiveVarInput(inputVarStockMax);
    } else {
      setActiveVarInput(inputVarUds);
    }
  });
}

inventoryListEl.addEventListener('click', async (event) => {
  const row = event.target.closest('[data-index]');
  if (!row) return;

  const selected = state.inventories[Number(row.dataset.index)];
  if (!selected) return;

  state.currentInvId = String(selected.id || '');
  if (!state.currentInvId) {
    showErrorScreen('INVENTARIO NO VALIDO', () => setScreen('list'));
    return;
  }

  try {
    await loadLinesForInventory(state.currentInvId);
  } catch (error) {
    showErrorScreen(error.message || 'NO SE PUDIERON CARGAR LINEAS', () => setScreen('list'));
  }
});

formCountEan.addEventListener('submit', async (event) => {
  event.preventDefault();
  const ean = scanInput.value.trim();
  if (!ean) {
    showToast('ESCANEE UN EAN');
    return;
  }

  try {
    loadingTitle.textContent = 'CONSULTANDO EAN...';
    setScreen('loading');
    const payload = await apiRequest(ENDPOINTS.getVarByEan, 'GET', null, { VAR_EAN: ean });
    const normalized = normalizeVarPayload(payload);
    if (!normalized) throw new Error('NO SE ENCUENTRA ESTE EAN');
    renderVarDetail(normalized);
  } catch (error) {
    showErrorScreen(error.message || 'NO SE ENCUENTRA ESTE EAN', () => {
      scanInput.value = '';
      setScreen('count');
      focusScanInput();
    });
  }
});

if (formInventoryOperatorScan) {
  formInventoryOperatorScan.addEventListener('submit', async (event) => {
    event.preventDefault();
    const ean = String(inputInventoryOperatorEan.value || '').trim();
    if (!ean) return;

    try {
      loadingTitle.textContent = 'VALIDANDO OPERARIO...';
      setScreen('loading');
      const payload = await apiRequest(ENDPOINTS.getOperator, 'GET', null, { operator_ean: ean });
      const name = String(payload?.name || '').trim();
      if (!name) {
        throw new Error('OPERARIO NO ENCONTRADO');
      }

      state.currentOperatorEan = ean;
      state.currentOperatorName = name;
      renderOperatorBadge();

      scanInput.value = '';
      setScreen('count');
      focusScanInput();
    } catch (error) {
      showErrorScreen(error.message || 'OPERARIO NO ENCONTRADO', () => {
        inputInventoryOperatorEan.value = '';
        setScreen('operator');
        focusOperatorInput();
      });
    }
  });
}

if (formVarDetail) {
  formVarDetail.addEventListener('submit', async (event) => {
    event.preventDefault();
    setVarFormError('');

    const payload = {
      var_ean: String(state.currentVar?.ean || '').trim(),
      inv_id: String(state.currentInvId || '').trim(),
      operator_ean: String(state.currentOperatorEan || '').trim(),
      uds: String(inputVarUds.value || '').trim(),
      uds_max: String(inputVarStockMax.value || '').trim(),
      uds_aviso: String(inputVarStockMin.value || '').trim()
    };

    if (!payload.var_ean) {
      setVarFormError('EAN NO VALIDO');
      return;
    }
    if (!payload.inv_id) {
      setVarFormError('INVENTARIO NO VALIDO');
      return;
    }
    if (!payload.operator_ean) {
      setVarFormError('ESCANEE OPERARIO');
      setScreen('operator');
      focusOperatorInput();
      return;
    }
    if (!payload.uds) {
      setVarFormError('RELLENE UNIDADES CONTADAS');
      return;
    }
    if (isZeroLike(payload.uds_max)) {
      if (inventoryVarAdvanced) inventoryVarAdvanced.classList.remove('hidden');
      if (btnToggleAvisos) btnToggleAvisos.setAttribute('aria-expanded', 'true');
      setActiveVarInput(inputVarStockMax);
      setVarFormError('RELLENE UDS MAXIMAS POR GAVETA');
      return;
    }
    if (isZeroLike(payload.uds_aviso)) {
      if (inventoryVarAdvanced) inventoryVarAdvanced.classList.remove('hidden');
      if (btnToggleAvisos) btnToggleAvisos.setAttribute('aria-expanded', 'true');
      setActiveVarInput(inputVarStockMin);
      setVarFormError('RELLENE UDS MINIMAS PARA AVISOS');
      return;
    }

    try {
      loadingTitle.textContent = 'GUARDANDO LINEA...';
      setScreen('loading');
      const response = await apiRequest(ENDPOINTS.createInventoryLine, 'POST', payload);
      if (!Number(response?.ok)) {
        throw new Error(response?.error || 'NO SE PUDO GUARDAR LA LINEA');
      }

      loadingTitle.textContent = 'RECARGANDO LINEAS...';
      setScreen('loading');
      await loadLinesForInventory(payload.inv_id);
    } catch (error) {
      showErrorScreen(error.message || 'ERROR GUARDANDO LINEA', () => {
        setScreen('varDetail');
      });
    }
  });
}

[inputVarUds, inputVarStockMax, inputVarStockMin].forEach((inputEl) => {
  if (!inputEl) return;
  inputEl.addEventListener('focus', () => setActiveVarInput(inputEl));
  inputEl.addEventListener('click', () => setActiveVarInput(inputEl));
});

if (keypadVar) {
  keypadVar.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-key]');
    if (!btn) return;
    applyKeyToVarInput(btn.dataset.key || '');
  });
}

window.addEventListener('keydown', (event) => {
  const onOperator = !screens.operator.classList.contains('hidden');
  const onCount = !screens.count.classList.contains('hidden');
  const onVarDetail = !screens.varDetail.classList.contains('hidden');
  if (!onOperator && !onCount && !onVarDetail) return;
  if (event.ctrlKey || event.metaKey) return;

  if (/^[a-zA-Z0-9]$/.test(event.key)) {
    event.preventDefault();
    if (onOperator) {
      inputInventoryOperatorEan.value += event.key;
    } else if (onCount) {
      scanInput.value += event.key;
    } else if (onVarDetail && /^\d$/.test(event.key)) {
      applyKeyToVarInput(event.key);
    }
    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    if (onOperator) {
      inputInventoryOperatorEan.value = inputInventoryOperatorEan.value.slice(0, -1);
    } else if (onCount) {
      scanInput.value = scanInput.value.slice(0, -1);
    } else if (onVarDetail) {
      applyKeyToVarInput('back');
    }
    return;
  }

  if (event.key === 'Delete') {
    event.preventDefault();
    if (onOperator) {
      inputInventoryOperatorEan.value = '';
    } else if (onCount) {
      scanInput.value = '';
    } else if (onVarDetail) {
      applyKeyToVarInput('clear');
    }
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    if (onOperator && formInventoryOperatorScan) {
      formInventoryOperatorScan.requestSubmit();
    } else if (onCount) {
      formCountEan.requestSubmit();
    } else if (onVarDetail && formVarDetail) {
      formVarDetail.requestSubmit();
    }
  }
});

window.addEventListener('paste', (event) => {
  const onOperator = !screens.operator.classList.contains('hidden');
  const onCount = !screens.count.classList.contains('hidden');
  if (!onOperator && !onCount) return;

  const pastedText = event.clipboardData?.getData('text') || '';
  if (!pastedText) return;

  event.preventDefault();
  if (onOperator) {
    inputInventoryOperatorEan.value += pastedText.trim();
  } else {
    scanInput.value += pastedText.trim();
  }
});

window.addEventListener('load', () => {
  resetVarDetail();
  setActiveVarInput(inputVarUds);
  renderOperatorBadge();
  loadInventories();
});
