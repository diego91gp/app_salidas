const ENV = window.ENV_CONFIG || {};
const API_BASE = String(ENV.BASE_URL || '').replace(/\/+$/, '');
const AUTHORIZATION_TOKEN = String(ENV.AUTHORIZATION_TOKEN || '').trim();
const MOCK_MODE = false;
const ENDPOINTS = {
  getOperator: '/api/API_GET_OPE',
  assignList: '/api/API_ASSIGN_SAL_LIST',
  finishList: '/api/API_GET_LIST'
};
const TEST_CODES = {
  listEan: 'TESTEAN',
  operatorEan: 'TESTOPE'
};

const state = {
  currentOperatorEan: null,
  currentOperatorName: '',
  currentListEan: null,
  currentCompany: '',
  listScanMode: 'assign',
  finishItems: [],
  partialItems: [],
  confirmedPendingItems: [],
  pendingSelectedIndex: null
};

const screens = {
  idle: document.getElementById('screen-idle'),
  operator: document.getElementById('screen-operator'),
  finishChoice: document.getElementById('screen-finish-choice'),
  partial: document.getElementById('screen-partial'),
  pendingDetail: document.getElementById('screen-pending-detail'),
  successCheck: document.getElementById('screen-success-check'),
  loading: document.getElementById('screen-loading'),
  errorX: document.getElementById('screen-error-x'),
  message: document.getElementById('screen-message')
};

const errorBanner = document.getElementById('error-banner');
const centerModal = document.getElementById('center-modal');

const inputListEan = document.getElementById('input-list-ean');
const inputOperatorEan = document.getElementById('input-operator-ean');
const finishPreview = document.getElementById('finish-preview');
const inputPendingEan = document.getElementById('input-pending-ean');
const partialCount = document.getElementById('partial-count');
const partialItemsContainer = document.getElementById('partial-items');
const confirmedCount = document.getElementById('confirmed-count');
const confirmedItemsContainer = document.getElementById('confirmed-items');
const payloadBox = document.getElementById('payload-box');
const payloadPreview = document.getElementById('payload-preview');
const pendingKeypad = document.getElementById('pending-keypad');
const keypadList = document.getElementById('keypad-list');
const pendingDetailTitle = document.getElementById('pending-detail-title');
const pendingDetailCard = document.getElementById('pending-detail-card');
const pendingSingleWrap = document.getElementById('pending-single-wrap');
const pendingQtyWrap = document.getElementById('pending-qty-wrap');
const inputPendingPicked = document.getElementById('input-pending-picked');

const messageTitle = document.getElementById('message-title');
const messageText = document.getElementById('message-text');
const successTitle = document.getElementById('success-title');
const loadingTitle = document.getElementById('loading-title');
const errorText = document.getElementById('error-text');
const listUserIdentified = document.getElementById('list-user-identified');
const listUserIcon = document.getElementById('list-user-icon');
const idleBrandLogo = document.getElementById('idle-brand-logo');
const idleMainTitle = document.getElementById('idle-main-title');

const btnStart = document.getElementById('btn-start');
const btnFinish = document.getElementById('btn-finish');
const btnAllPicked = document.getElementById('btn-all-picked');
const btnPartialPicked = document.getElementById('btn-partial-picked');
const btnCancelPartial = document.getElementById('btn-cancel-partial');
const btnSendPending = document.getElementById('btn-send-pending');
const btnMessageBack = document.getElementById('btn-message-back');
const btnHomeFloat = document.getElementById('btn-home-float');
const btnPendingSingleConfirm = document.getElementById('btn-pending-single-confirm');
const btnPendingQtyDec = document.getElementById('btn-pending-qty-dec');
const btnPendingQtyInc = document.getElementById('btn-pending-qty-inc');
const btnPendingQtyConfirm = document.getElementById('btn-pending-qty-confirm');

const formListScan = document.getElementById('form-list-scan');
const formOperatorScan = document.getElementById('form-operator-scan');
const idleActions = document.getElementById('idle-actions');

function submitForm(formEl) {
  if (typeof formEl.requestSubmit === 'function') {
    formEl.requestSubmit();
    return;
  }
  formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function applyKeyToInput(inputEl, key) {
  if (key === 'clear') {
    inputEl.value = '';
    return;
  }
  if (key === 'back') {
    inputEl.value = inputEl.value.slice(0, -1);
    return;
  }
  if (/^\d$/.test(key)) {
    inputEl.value += key;
  }
}

function setActiveScreen(key) {
  Object.values(screens).forEach((screen) => screen.classList.add('hidden'));
  screens[key].classList.remove('hidden');
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
  window.clearTimeout(showError._timer);
  showError._timer = window.setTimeout(() => errorBanner.classList.add('hidden'), 5000);
}

function showCenterModal(message, durationMs = 2000) {
  centerModal.textContent = message;
  centerModal.classList.remove('hidden');
  window.clearTimeout(showCenterModal._timer);
  showCenterModal._timer = window.setTimeout(() => centerModal.classList.add('hidden'), durationMs);
}

function showListScanScreen(mode = 'assign') {
  state.listScanMode = mode;
  setActiveScreen('idle');
  idleActions.classList.add('hidden');
  formListScan.classList.remove('hidden');
  inputListEan.value = '';
  if (idleBrandLogo) idleBrandLogo.classList.add('hidden');
  if (idleMainTitle) idleMainTitle.classList.add('hidden');
  const isFinishMode = mode === 'finish';
  if (listUserIcon) {
    listUserIcon.classList.toggle('hidden', isFinishMode);
  }
  if (listUserIdentified) {
    if (isFinishMode) {
      listUserIdentified.classList.add('hidden');
    } else {
      const operatorLabel = state.currentOperatorName || '-';
      listUserIdentified.textContent = `IDENTIFICADO COMO "${operatorLabel}"`;
      listUserIdentified.classList.remove('hidden');
    }
  }
  setTimeout(() => inputListEan.focus(), 10);
}

function showListErrorScreen(message, durationMs = 2000, onDone = showListScanScreen) {
  errorText.textContent = message || 'ERROR';
  setActiveScreen('errorX');
  window.clearTimeout(showListErrorScreen._timer);
  showListErrorScreen._timer = window.setTimeout(() => {
    onDone();
  }, durationMs);
}

function showOperatorScanScreen() {
  setActiveScreen('operator');
  inputOperatorEan.value = '';
  setTimeout(() => inputOperatorEan.focus(), 10);
}

function formatServerResponse(data) {
  if (!data || typeof data !== 'object') return String(data || '');
  if (data.message) return String(data.message);
  if (data.company) return `COMPANIA: ${data.company}`;
  return JSON.stringify(data);
}

function toIdle() {
  inputListEan.value = '';
  inputOperatorEan.value = '';
  inputPendingEan.value = '';
  state.currentOperatorEan = null;
  state.currentOperatorName = '';
  state.currentListEan = null;
  state.currentCompany = '';
  state.listScanMode = 'assign';
  state.finishItems = [];
  state.partialItems = [];
  state.confirmedPendingItems = [];
  state.pendingSelectedIndex = null;
  payloadBox.classList.add('hidden');
  payloadPreview.textContent = '';
  idleActions.classList.remove('hidden');
  formListScan.classList.add('hidden');
  if (idleBrandLogo) idleBrandLogo.classList.remove('hidden');
  if (idleMainTitle) idleMainTitle.classList.remove('hidden');
  if (listUserIcon) listUserIcon.classList.remove('hidden');
  if (listUserIdentified) {
    listUserIdentified.textContent = 'IDENTIFICADO COMO "-"';
    listUserIdentified.classList.remove('hidden');
  }
  setActiveScreen('idle');
}

function asArrayItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function groupItemsByEan(items) {
  const grouped = new Map();

  items.forEach((rawItem) => {
    const ean = String(rawItem?.ean ?? '').trim();
    if (!ean) return;

    const current = grouped.get(ean);
    const qty = Number(rawItem?.uds) || 0;

    if (!current) {
      grouped.set(ean, {
        ean,
        articulo: rawItem?.articulo ?? '',
        uds: qty,
        url: rawItem?.url ?? ''
      });
      return;
    }

    current.uds += qty;
    if (!current.articulo && rawItem?.articulo) current.articulo = rawItem.articulo;
    if (!current.url && rawItem?.url) current.url = rawItem.url;
  });

  return Array.from(grouped.values());
}

async function apiRequest(endpoint, body) {
  if (MOCK_MODE) {
    console.log('[API REQUEST][MOCK]', { endpoint, body });
    return mockApiRequest(endpoint, body);
  }

  const hasOkFlag = typeof body === 'object' && body !== null && Object.prototype.hasOwnProperty.call(body, 'ok');
  const isFinishScan = endpoint === ENDPOINTS.finishList && (!body || !hasOkFlag);
  const isGetEndpoint = endpoint === ENDPOINTS.getOperator || isFinishScan;
  const options = {
    method: isGetEndpoint ? 'GET' : 'POST',
    headers: {
      Accept: 'application/json'
    }
  };

  if (AUTHORIZATION_TOKEN) {
    options.headers.Authorization = `Basic ${AUTHORIZATION_TOKEN}`;
  }

  let url = `${API_BASE}${endpoint}`;

  if (isGetEndpoint) {
    const params = new URLSearchParams();
    Object.entries(body || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params.set(key, String(value));
      }
    });
    const qs = params.toString();
    if (qs) {
      url += `?${qs}`;
    }
  } else {
    options.headers['Content-Type'] = 'application/json';
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
  }

  console.log('[API REQUEST]', {
    method: options.method,
    url,
    headers: options.headers,
    body: body ?? null
  });
  const response = await fetch(url, options);
  let data = null;

  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  console.log('[API RESPONSE]', {
    method: options.method,
    url,
    status: response.status,
    ok: response.ok,
    data
  });

  if (!response.ok) {
    const msg = data?.message || `HTTP ${response.status}`;
    console.error('[API ERROR][HTTP]', {
      method: options.method,
      url,
      status: response.status,
      response: data
    });
    throw new Error(msg);
  }

  if (data?.status && String(data.status).toLowerCase() === 'error') {
    console.error('[API ERROR][STATUS_ERROR]', {
      method: options.method,
      url,
      response: data
    });
    throw new Error(data.message || 'Error en la respuesta de API');
  }

  if (data?.error) {
    console.error('[API ERROR][ERROR_FIELD]', {
      method: options.method,
      url,
      response: data
    });
    throw new Error(data.error);
  }

  if (data?.ok === false) {
    console.error('[API ERROR][OK_FALSE]', {
      method: options.method,
      url,
      response: data
    });
    throw new Error(data.message || 'Operación no válida');
  }

  return data || {};
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function generateMockFinishItems(count = 120) {
  const families = ['Tornillo', 'Arandela', 'Tuerca', 'Brida', 'Etiqueta', 'Guante', 'Caja', 'Precinto'];
  const sizes = ['S', 'M', 'L', 'XL', '10mm', '12mm', '20mm', '30mm'];
  const items = [];

  for (let i = 1; i <= count; i += 1) {
    const family = families[i % families.length];
    const size = sizes[i % sizes.length];
    const padded = String(i).padStart(3, '0');
    items.push({
      ean: `843700${String(i).padStart(6, '0')}`,
      articulo: `${family} industrial ${size} - lote ${padded}`,
      uds: (i % 9) + 1,
      url: `mock-images/item-${String(((i - 1) % 12) + 1).padStart(2, '0')}.svg`
    });
  }

  return items;
}

async function mockApiRequest(endpoint, body) {
  await delay(250);
  const normalizedListEan = String(body?.list_ean || body?.ean || '').trim().toUpperCase();
  const normalizedOperatorEan = String(body?.operator_ean || body?.ean || '').trim().toUpperCase();

  if (endpoint === ENDPOINTS.getOperator) {
    if (normalizedOperatorEan === TEST_CODES.operatorEan) {
      return { ok: true, name: 'OPERARIO TEST' };
    }
    throw new Error('Operario no encontrado. Usa TESTOPE.');
  }

  if (endpoint === ENDPOINTS.assignList) {
    if (normalizedListEan === TEST_CODES.listEan) {
      return { ok: true, company: 'SIROKO' };
    }
    throw new Error('Listado no encontrado. Usa TESTEAN.');
  }

  if (endpoint === ENDPOINTS.finishList) {
    const finishScanId = String(body?.list_ean || body?.id || '').trim();
    if (body === undefined || (finishScanId && body?.ok === undefined)) {
      // Primera llamada de finalizar: devolvemos body ficticio con 120 artículos e imagen.
      return {
        ok: true,
        items: generateMockFinishItems(120)
      };
    }

    if (body?.ok === true) {
      await delay(2750);
      return { ok: true, message: 'Cierre total registrado (mock)' };
    }

    if (body?.ok === false && Array.isArray(body?.items)) {
      return {
        ok: true,
        message: 'Cierre parcial registrado (mock)',
        recibidos: body.items
      };
    }

    throw new Error('Body inválido para FIN_LIST (mock).');
  }

  throw new Error(`Endpoint mock no soportado: ${endpoint}`);
}

function renderFinishPreview(items) {
  if (!items.length) {
    finishPreview.innerHTML = '<p>No hay artículos pendientes en la respuesta.</p>';
    return;
  }

  finishPreview.innerHTML = items
    .map(
      (item) => `
      <div class="preview-row">
        <img class="preview-thumb" src="${escapeHtml(item.url || 'mock-images/item-01.svg')}" alt="" />
        <strong>${item.ean ?? '-'}</strong>
        <span>${item.articulo ?? 'Sin descripción'}</span>
        <span>UDS: ${item.uds ?? 0}</span>
      </div>`
    )
    .join('');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderPendingResults() {
  const query = inputPendingEan.value.trim();
  const filtered = state.partialItems
    .map((item, index) => ({ ...item, index }))
    .filter((item) => !item.processed)
    .filter((item) => !query || String(item.ean || '').includes(query));
  filtered.sort((a, b) =>
    String(a.articulo || '').localeCompare(String(b.articulo || ''), 'es', { sensitivity: 'base' })
  );

  const remaining = state.partialItems.filter((item) => !item.processed).length;
  partialCount.textContent = `RECOGIDOS: ${remaining}`;
  confirmedCount.textContent = `PENDIENTES PICKING: ${state.confirmedPendingItems.length}`;

  if (!filtered.length) {
    partialItemsContainer.innerHTML = '<div class="item-row-empty">SIN RESULTADOS.</div>';
  } else {
    partialItemsContainer.innerHTML = filtered
      .slice(0, 30)
      .map((item) => {
        return `
        <button class="pending-result ${item.processed ? 'pending-result-done' : ''}" data-index="${item.index}">
          <img class="item-thumb" src="${escapeHtml(item.url || 'mock-images/item-01.svg')}" alt="" />
          <div class="item-main">
            <strong>${escapeHtml(item.articulo || 'SIN DESCRIPCION')}</strong>
            <span>EAN ${escapeHtml(item.ean || '-')}</span>
          </div>
        </button>`;
      })
      .join('');
  }

  if (!state.confirmedPendingItems.length) {
    confirmedItemsContainer.innerHTML = '<div class="item-row-empty">SIN PENDIENTES PICKING</div>';
    return;
  }

  confirmedItemsContainer.innerHTML = state.confirmedPendingItems
    .map(
      (item, originalIndex) => `
      <div class="pending-result pending-result-confirmed" data-confirmed-index="${originalIndex}">
        <img class="item-thumb" src="${escapeHtml(item.url || 'mock-images/item-01.svg')}" alt="" />
        <div class="item-main">
          <strong>${escapeHtml(item.articulo || 'SIN DESCRIPCION')}</strong>
        </div>
        <button class="btn-remove-confirmed" type="button" data-remove-confirmed="${originalIndex}">X</button>
      </div>`
    )
    .join('');
}

function getFilteredPendingIndexes() {
  const query = inputPendingEan.value.trim();
  return state.partialItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.processed)
    .filter(({ item }) => !query || String(item.ean || '').includes(query))
    .map(({ index }) => index);
}

function showPendingDetail(index) {
  const item = state.partialItems[index];
  if (!item) return;

  state.pendingSelectedIndex = index;
  pendingDetailTitle.textContent = 'PENDIENTE';
  pendingDetailCard.innerHTML = `
    <img class="item-thumb" src="${escapeHtml(item.url || 'mock-images/item-01.svg')}" alt="" />
    <div class="item-main">
      <strong>${escapeHtml(item.articulo || 'SIN DESCRIPCION')}</strong>
      <span>UNIDADES DEL PEDIDO: ${item.maxQty}</span>
    </div>`;

  if (item.maxQty === 1) {
    pendingSingleWrap.classList.remove('hidden');
    pendingQtyWrap.classList.add('hidden');
  } else {
    inputPendingPicked.value = String(item.pickedQty);
    pendingSingleWrap.classList.add('hidden');
    pendingQtyWrap.classList.remove('hidden');
  }

  setActiveScreen('pendingDetail');
}

function savePendingWithPickedQty(pickedQty) {
  const index = state.pendingSelectedIndex;
  const item = state.partialItems[index];
  if (!item) return;

  item.pickedQty = Math.max(0, Math.min(item.maxQty, Number(pickedQty) || 0));
  item.processed = true;
  state.pendingSelectedIndex = null;
  inputPendingEan.value = '';
  renderPendingResults();
  setActiveScreen('partial');
}

function confirmPendingItem(index) {
  const item = state.partialItems[index];
  if (!item || item.processed) return;

  item.pickedQty = 0;
  item.processed = true;

  state.confirmedPendingItems.push({
    ean: item.ean,
    articulo: item.articulo,
    uds: item.maxQty,
    pendientes: item.maxQty,
    recogidas: 0,
    url: item.url
  });

  inputPendingEan.value = '';
  renderPendingResults();
}

function unconfirmPendingItem(confirmedIndex) {
  const item = state.confirmedPendingItems[confirmedIndex];
  if (!item) return;

  const sourceIndex = state.partialItems.findIndex(
    (source) => source.ean === item.ean && source.articulo === item.articulo && source.processed
  );
  if (sourceIndex >= 0) {
    state.partialItems[sourceIndex].processed = false;
    state.partialItems[sourceIndex].pickedQty = 0;
  }

  state.confirmedPendingItems.splice(confirmedIndex, 1);
  renderPendingResults();
}

btnStart.addEventListener('click', () => {
  showOperatorScanScreen();
});

btnFinish.addEventListener('click', async () => {
  showListScanScreen('finish');
});

formListScan.addEventListener('submit', async (event) => {
  event.preventDefault();
  const ean = inputListEan.value.trim();

  if (!ean) {
    showCenterModal('INTRODUCE EAN DE LISTADO', 1800);
    return;
  }

  try {
    const isFinishMode = state.listScanMode === 'finish';
    loadingTitle.textContent = isFinishMode ? 'CARGANDO LISTADO...' : 'VALIDANDO LISTADO...';
    setActiveScreen('loading');
    if (isFinishMode) {
      const finishResponse = await apiRequest(ENDPOINTS.finishList, { list_ean: ean });
      state.currentListEan = ean;
      state.finishItems = groupItemsByEan(asArrayItems(finishResponse));
      renderFinishPreview(state.finishItems);
      setActiveScreen('finishChoice');
      return;
    }

    const listResponse = await apiRequest(ENDPOINTS.assignList, {
      operator_ean: state.currentOperatorEan,
      list_ean: ean
    });
    state.currentListEan = ean;
    state.currentCompany = String(listResponse?.company || '');
    successTitle.textContent = `OPERARIO ASIGNADO A LISTADO ${ean}${state.currentCompany ? ` ${state.currentCompany}` : ''} CORRECTAMENTE`;
    setActiveScreen('successCheck');
    setTimeout(() => toIdle(), 3000);
  } catch (error) {
    const fallbackMode = state.listScanMode === 'finish' ? 'finish' : 'assign';
    showListErrorScreen(error.message || 'ERROR LISTADO', 2000, () => showListScanScreen(fallbackMode));
  }
});

formOperatorScan.addEventListener('submit', async (event) => {
  event.preventDefault();
  const ean = inputOperatorEan.value.trim();

  if (!ean) return;

  try {
    loadingTitle.textContent = 'VALIDANDO OPERARIO...';
    setActiveScreen('loading');
    const opeResponse = await apiRequest(ENDPOINTS.getOperator, { operator_ean: ean });
    const opeName = String(opeResponse?.name || '').trim();
    if (!opeName) {
      throw new Error('OPERARIO NO ENCONTRADO');
    }
    state.currentOperatorEan = ean;
    state.currentOperatorName = opeName;
    showListScanScreen('assign');
  } catch (error) {
    showListErrorScreen(error.message || 'OPERARIO NO ENCONTRADO', 2000, showOperatorScanScreen);
  }
});

btnAllPicked.addEventListener('click', async () => {
  try {
    loadingTitle.textContent = 'FINALIZANDO LISTADO...';
    setActiveScreen('loading');
    await apiRequest(ENDPOINTS.finishList, {
      ok: true,
      items: []
    });

    successTitle.textContent = 'LISTADO FINALIZADO';
    setActiveScreen('successCheck');
    setTimeout(() => toIdle(), 1200);
  } catch (error) {
    showError(error.message || 'No se pudo enviar la confirmación');
    setActiveScreen('finishChoice');
  }
});

btnPartialPicked.addEventListener('click', () => {
  state.partialItems = state.finishItems.map((item) => ({
    ean: item.ean,
    articulo: item.articulo,
    url: item.url,
    maxQty: Number(item.uds) > 0 ? Number(item.uds) : 1,
    pickedQty: 0,
    processed: false
  }));
  state.confirmedPendingItems = [];
  inputPendingEan.value = '';
  payloadBox.classList.add('hidden');
  payloadPreview.textContent = '';
  renderPendingResults();
  setActiveScreen('partial');
  setTimeout(() => inputPendingEan.focus(), 10);
});

btnCancelPartial.addEventListener('click', () => {
  payloadBox.classList.add('hidden');
  payloadPreview.textContent = '';
  setActiveScreen('finishChoice');
});

keypadList.addEventListener('click', (event) => {
  const key = event.target.dataset.key;
  if (!key) return;
  applyKeyToInput(inputListEan, key);
});

pendingKeypad.addEventListener('click', (event) => {
  const key = event.target.dataset.key;
  if (!key) return;

  applyKeyToInput(inputPendingEan, key);
  renderPendingResults();
});

inputPendingEan.addEventListener('input', () => {
  inputPendingEan.value = inputPendingEan.value.replace(/\D/g, '');
  renderPendingResults();
});

window.addEventListener('keydown', (event) => {
  if (!screens.operator.classList.contains('hidden')) {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      inputOperatorEan.value += event.key;
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      inputOperatorEan.value = inputOperatorEan.value.slice(0, -1);
      return;
    }
    if (event.key === 'Delete') {
      event.preventDefault();
      inputOperatorEan.value = '';
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      submitForm(formOperatorScan);
      return;
    }
  }

  if (!screens.idle.classList.contains('hidden') && !formListScan.classList.contains('hidden')) {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      inputListEan.value += event.key;
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      inputListEan.value = inputListEan.value.slice(0, -1);
      return;
    }
    if (event.key === 'Delete') {
      event.preventDefault();
      inputListEan.value = '';
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      submitForm(formListScan);
      return;
    }
  }

  if (screens.partial.classList.contains('hidden')) return;
  if (!screens.pendingDetail.classList.contains('hidden')) return;

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    inputPendingEan.value += event.key;
    renderPendingResults();
    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    inputPendingEan.value = inputPendingEan.value.slice(0, -1);
    renderPendingResults();
    return;
  }

  if (event.key === 'Delete') {
    event.preventDefault();
    inputPendingEan.value = '';
    renderPendingResults();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const indexes = getFilteredPendingIndexes();
    if (indexes.length > 0) {
      confirmPendingItem(indexes[0]);
    }
  }
});

partialItemsContainer.addEventListener('click', (event) => {
  const result = event.target.closest('.pending-result');
  if (!result) return;
  confirmPendingItem(Number(result.dataset.index));
});

confirmedItemsContainer.addEventListener('click', (event) => {
  const removeButton = event.target.closest('[data-remove-confirmed]');
  if (!removeButton) return;
  unconfirmPendingItem(Number(removeButton.dataset.removeConfirmed));
});

btnPendingSingleConfirm.addEventListener('click', () => {
  savePendingWithPickedQty(0);
});

btnPendingQtyDec.addEventListener('click', () => {
  const current = Number(inputPendingPicked.value || 0);
  inputPendingPicked.value = String(Math.max(0, current - 1));
});

btnPendingQtyInc.addEventListener('click', () => {
  const index = state.pendingSelectedIndex;
  const item = state.partialItems[index];
  if (!item) return;
  const current = Number(inputPendingPicked.value || 0);
  inputPendingPicked.value = String(Math.min(item.maxQty, current + 1));
});

btnPendingQtyConfirm.addEventListener('click', () => {
  savePendingWithPickedQty(Number(inputPendingPicked.value || 0));
});

btnSendPending.addEventListener('click', async () => {
  const notPicked = state.confirmedPendingItems.map((item) => ({
    ean: item.ean,
    articulo: item.articulo,
    uds: item.uds,
    pendientes: item.pendientes,
    recogidas: item.recogidas
  }));

  if (!notPicked.length) {
    showError('NO HAY PENDIENTES PROCESADOS PARA ENVIAR.');
    return;
  }

  const body = {
    ok: false,
    items: notPicked
  };
  payloadPreview.textContent = JSON.stringify(body, null, 2);
  payloadBox.classList.remove('hidden');

  try {
    const apiResponse = await apiRequest(ENDPOINTS.finishList, body);
    payloadPreview.textContent = JSON.stringify(
      {
        enviado: body,
        respuesta: apiResponse,
        estado: 'Incidencia enviada correctamente'
      },
      null,
      2
    );
    payloadBox.classList.remove('hidden');
  } catch (error) {
    showError(error.message || 'No se pudo enviar la incidencia');
  }
});

btnMessageBack.addEventListener('click', toIdle);
btnHomeFloat.addEventListener('click', toIdle);

window.addEventListener('load', () => {
  toIdle();
});
