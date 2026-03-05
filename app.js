const API_BASE = '';
const MOCK_MODE = true;
const ENDPOINTS = {
  getSalList: '/API/GET_SAL_LIST',
  getOperator: '/API/GET_OPE',
  finishList: '/API/FIN_LIST'
};
const TEST_CODES = {
  listEan: 'TESTEAN',
  operatorEan: 'TESTOPE'
};

const state = {
  currentListEan: null,
  finishItems: [],
  partialItems: [],
  pendingSelectedIndex: null
};

const screens = {
  idle: document.getElementById('screen-idle'),
  operator: document.getElementById('screen-operator'),
  finishChoice: document.getElementById('screen-finish-choice'),
  partial: document.getElementById('screen-partial'),
  pendingDetail: document.getElementById('screen-pending-detail'),
  successCheck: document.getElementById('screen-success-check'),
  message: document.getElementById('screen-message')
};

const errorBanner = document.getElementById('error-banner');

const inputListEan = document.getElementById('input-list-ean');
const inputOperatorEan = document.getElementById('input-operator-ean');
const finishPreview = document.getElementById('finish-preview');
const inputPendingEan = document.getElementById('input-pending-ean');
const partialCount = document.getElementById('partial-count');
const partialItemsContainer = document.getElementById('partial-items');
const payloadBox = document.getElementById('payload-box');
const payloadPreview = document.getElementById('payload-preview');
const pendingKeypad = document.getElementById('pending-keypad');
const pendingDetailTitle = document.getElementById('pending-detail-title');
const pendingDetailCard = document.getElementById('pending-detail-card');
const pendingSingleWrap = document.getElementById('pending-single-wrap');
const pendingQtyWrap = document.getElementById('pending-qty-wrap');
const inputPendingPicked = document.getElementById('input-pending-picked');

const messageTitle = document.getElementById('message-title');
const messageText = document.getElementById('message-text');

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

function toIdle() {
  inputListEan.value = '';
  inputOperatorEan.value = '';
  inputPendingEan.value = '';
  state.currentListEan = null;
  state.finishItems = [];
  state.partialItems = [];
  state.pendingSelectedIndex = null;
  payloadBox.classList.add('hidden');
  payloadPreview.textContent = '';
  idleActions.classList.remove('hidden');
  formListScan.classList.add('hidden');
  setActiveScreen('idle');
}

function asArrayItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

async function apiRequest(endpoint, body) {
  if (MOCK_MODE) {
    return mockApiRequest(endpoint, body);
  }

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  let data = null;

  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    const msg = data?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  if (data?.status && String(data.status).toLowerCase() === 'error') {
    throw new Error(data.message || 'Error en la respuesta de API');
  }

  if (data?.ok === false) {
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
  const normalizedEan = String(body?.ean || '').trim().toUpperCase();

  if (endpoint === ENDPOINTS.getSalList) {
    if (normalizedEan === TEST_CODES.listEan) {
      return { ok: true, message: 'Listado validado (mock)' };
    }
    throw new Error('Listado no encontrado. Usa TESTEAN.');
  }

  if (endpoint === ENDPOINTS.getOperator) {
    if (normalizedEan === TEST_CODES.operatorEan) {
      return { ok: true, message: 'Operario validado (mock)' };
    }
    throw new Error('Operario no encontrado. Usa TESTOPE.');
  }

  if (endpoint === ENDPOINTS.finishList) {
    if (body === undefined) {
      // Primera llamada de finalizar: devolvemos body ficticio con 120 artículos e imagen.
      return {
        ok: true,
        items: generateMockFinishItems(120)
      };
    }

    if (body?.ok === true) {
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
    .filter((item) => !query || String(item.ean || '').includes(query));

  const completed = state.partialItems.filter((item) => item.processed).length;
  partialCount.textContent = `${completed} PROCESADOS / ${state.partialItems.length}`;

  if (!filtered.length) {
    partialItemsContainer.innerHTML = '<div class="item-row-empty">SIN RESULTADOS PARA ESE EAN.</div>';
    return;
  }

  partialItemsContainer.innerHTML = filtered
    .slice(0, 30)
    .map((item) => {
      const notPicked = item.maxQty - item.pickedQty;
      return `
        <button class="pending-result ${item.processed ? 'pending-result-done' : ''}" data-index="${item.index}">
          <img class="item-thumb" src="${escapeHtml(item.url || 'mock-images/item-01.svg')}" alt="" />
          <div class="item-main">
            <strong>${escapeHtml(item.articulo || 'SIN DESCRIPCION')}</strong>
            <span>EAN ${escapeHtml(item.ean || '-')} | UDS ${item.maxQty} | PENDIENTES ${notPicked}</span>
          </div>
        </button>`;
    })
    .join('');
}

function showPendingDetail(index) {
  const item = state.partialItems[index];
  if (!item) return;

  state.pendingSelectedIndex = index;
  pendingDetailTitle.textContent = `PENDIENTE EAN ${item.ean}`;
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

btnStart.addEventListener('click', () => {
  setActiveScreen('idle');
  idleActions.classList.add('hidden');
  formListScan.classList.remove('hidden');
  setTimeout(() => inputListEan.focus(), 10);
});

btnFinish.addEventListener('click', async () => {
  try {
    const data = await apiRequest(ENDPOINTS.finishList);
    state.finishItems = asArrayItems(data);
    renderFinishPreview(state.finishItems);
    setActiveScreen('finishChoice');
  } catch (error) {
    showError(error.message || 'No se pudo finalizar el listado');
  }
});

formListScan.addEventListener('submit', async (event) => {
  event.preventDefault();
  const ean = inputListEan.value.trim();

  if (!ean) return;

  try {
    await apiRequest(ENDPOINTS.getSalList, { ean });
    state.currentListEan = ean;
    setActiveScreen('operator');
    inputOperatorEan.value = '';
    setTimeout(() => inputOperatorEan.focus(), 10);
  } catch (error) {
    showError(error.message || 'Listado no válido');
    inputListEan.select();
  }
});

formOperatorScan.addEventListener('submit', async (event) => {
  event.preventDefault();
  const ean = inputOperatorEan.value.trim();

  if (!ean) return;

  try {
    await apiRequest(ENDPOINTS.getOperator, {
      ean,
      listEan: state.currentListEan
    });

    setActiveScreen('successCheck');
    setTimeout(() => toIdle(), 1000);
  } catch (error) {
    showError(error.message || 'Operario no encontrado');
    inputOperatorEan.select();
    inputOperatorEan.focus();
  }
});

btnAllPicked.addEventListener('click', async () => {
  try {
    await apiRequest(ENDPOINTS.finishList, {
      ok: true,
      items: []
    });

    messageTitle.textContent = 'Listado cerrado';
    messageText.textContent = 'Se confirmó que todo fue recogido.';
    setActiveScreen('message');
    setTimeout(() => toIdle(), 1400);
  } catch (error) {
    showError(error.message || 'No se pudo enviar la confirmación');
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
  inputPendingEan.value = '';
  payloadBox.classList.add('hidden');
  payloadPreview.textContent = '';
  renderPendingResults();
  setActiveScreen('partial');
});

btnCancelPartial.addEventListener('click', () => {
  payloadBox.classList.add('hidden');
  payloadPreview.textContent = '';
  setActiveScreen('finishChoice');
});

pendingKeypad.addEventListener('click', (event) => {
  const key = event.target.dataset.key;
  if (!key) return;

  if (key === 'clear') {
    inputPendingEan.value = '';
  } else if (key === 'back') {
    inputPendingEan.value = inputPendingEan.value.slice(0, -1);
  } else {
    inputPendingEan.value += key;
  }

  renderPendingResults();
});

partialItemsContainer.addEventListener('click', (event) => {
  const result = event.target.closest('.pending-result');
  if (!result) return;
  showPendingDetail(Number(result.dataset.index));
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
  const notPicked = state.partialItems
    .filter((item) => item.processed)
    .map((item) => ({
      ean: item.ean,
      articulo: item.articulo,
      uds: item.maxQty - item.pickedQty,
      recogidas: item.pickedQty
    }))
    .filter((item) => item.uds > 0);

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
