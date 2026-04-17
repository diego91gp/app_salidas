const ENV = window.ENV_CONFIG || {};
const API_BASE = String(ENV.BASE_URL || '').replace(/\/+$/, '');
const AUTHORIZATION_TOKEN = String(ENV.AUTHORIZATION_TOKEN || '').trim();

const ENDPOINTS = {
  getOperator: String(ENV.GET_OPE_ENDPOINT || '/api/API_GET_OPE'),
  fichaEntrada: String(ENV.FICHA_ENTRADA_ENDPOINT || '/api/API_FICHA_ENTRADA'),
  fichaSalida: String(ENV.FICHA_SALIDA_ENDPOINT || '/api/API_FICHA_SALIDA')
};

const screens = {
  operator: document.getElementById('screen-operator'),
  action: document.getElementById('screen-action'),
  loading: document.getElementById('screen-loading'),
  success: document.getElementById('screen-success'),
  error: document.getElementById('screen-error')
};

const state = {
  operatorName: '',
  operatorEan: '',
  geoIp: null
};

let chronoInterval = null;
let chronoStartAt = null;

const inputOperatorEan = document.getElementById('input-operator-ean');
const formOperatorScan = document.getElementById('form-operator-scan');
const actionOperatorName = document.getElementById('action-operator-name');
const loadingTitle = document.getElementById('loading-title');
const successTitle = document.getElementById('success-title');
const errorText = document.getElementById('error-text');
const errorBanner = document.getElementById('error-banner');
const fichaChrono = document.getElementById('fichar-chrono');
const chronoTimeEl = document.getElementById('fichar-chrono-time');
const chronoSinceEl = document.getElementById('fichar-chrono-since');
const btnEntrada = document.getElementById('btn-entrada');
const btnSalida = document.getElementById('btn-salida');

function setScreen(key) {
  Object.values(screens).forEach((s) => s.classList.add('hidden'));
  screens[key].classList.remove('hidden');
}

function showErrorScreen(message, onDone, durationMs = 2000) {
  errorText.textContent = message || 'ERROR';
  setScreen('error');
  window.clearTimeout(showErrorScreen._timer);
  showErrorScreen._timer = window.setTimeout(() => {
    if (typeof onDone === 'function') onDone();
  }, durationMs);
}

function showSuccessScreen(message, onDone, durationMs = 1400) {
  successTitle.textContent = message || 'COMPLETADO';
  setScreen('success');
  window.clearTimeout(showSuccessScreen._timer);
  showSuccessScreen._timer = window.setTimeout(() => {
    if (typeof onDone === 'function') onDone();
  }, durationMs);
}

function resetToOperator() {
  clearChronoTimer();
  state.operatorName = '';
  state.operatorEan = '';
  inputOperatorEan.value = '';
  setScreen('operator');
  setTimeout(() => inputOperatorEan.focus(), 10);
}

// --- Cronómetro en vivo ---

function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function formatTimeClock(isoString) {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '--:--';
  }
}

function tickChrono() {
  const elapsed = Math.max(0, Math.floor((Date.now() - chronoStartAt.getTime()) / 1000));
  chronoTimeEl.textContent = formatElapsed(elapsed);
}

function startChronoDisplay(startAtIso) {
  chronoStartAt = new Date(startAtIso);
  if (isNaN(chronoStartAt.getTime())) {
    fichaChrono.classList.add('hidden');
    return;
  }
  chronoSinceEl.textContent = `EN CURSO DESDE ${formatTimeClock(startAtIso)}`;
  tickChrono();
  fichaChrono.classList.remove('hidden');
  chronoInterval = setInterval(tickChrono, 1000);
}

function clearChronoTimer() {
  if (chronoInterval) {
    clearInterval(chronoInterval);
    chronoInterval = null;
  }
  chronoStartAt = null;
  fichaChrono.classList.add('hidden');
  chronoTimeEl.textContent = '00:00:00';
  chronoSinceEl.textContent = 'EN CURSO DESDE --:--';
}

// --- GeoIP ---

async function fetchGeoIp() {
  try {
    const cached = localStorage.getItem('geoIp');
    if (cached) {
      state.geoIp = JSON.parse(cached);
      console.log('[GEOIP] Desde caché', state.geoIp);
      return;
    }

    const response = await fetch('https://ipapi.co/json/', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data?.latitude && data?.longitude) {
      state.geoIp = { lat: String(data.latitude), long: String(data.longitude) };
      localStorage.setItem('geoIp', JSON.stringify(state.geoIp));
      console.log('[GEOIP] Obtenido y cacheado', state.geoIp);
    }
  } catch (_) {
    console.warn('[GEOIP] No se pudo obtener geolocalización por IP');
  }
}

function buildGeoBody(extra = {}) {
  if (!state.geoIp) return extra;
  return { ...extra, geolocation: state.geoIp };
}

// --- API interna ---

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

  if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
  if (data?.error) throw new Error(data.error);
  return data;
}

// --- Pantalla de acción ---

function showActionScreen(startAtIso) {
  clearChronoTimer();
  actionOperatorName.textContent = state.operatorName || 'OPERARIO';
  setScreen('action');
  if (startAtIso) {
    startChronoDisplay(startAtIso);
  }
}

// --- Eventos ---

formOperatorScan.addEventListener('submit', async (event) => {
  event.preventDefault();
  const ean = String(inputOperatorEan.value || '').trim();
  if (!ean) return;

  try {
    loadingTitle.textContent = 'VALIDANDO OPERARIO...';
    setScreen('loading');
    const payload = await apiRequest(ENDPOINTS.getOperator, 'GET', null, { operator_ean: ean, show_time: 1 });

    const name = String(payload?.name || '').trim();
    if (!name) throw new Error('OPERARIO NO ENCONTRADO');

    const startAt = String(payload?.start_at || '').trim();

    state.operatorName = name;
    state.operatorEan = ean;

    showActionScreen(startAt || null);
  } catch (error) {
    showErrorScreen(error.message || 'OPERARIO NO ENCONTRADO', () => {
      inputOperatorEan.value = '';
      setScreen('operator');
      setTimeout(() => inputOperatorEan.focus(), 10);
    });
  }
});

btnEntrada.addEventListener('click', async () => {
  try {
    loadingTitle.textContent = 'REGISTRANDO ENTRADA...';
    setScreen('loading');
    await apiRequest(ENDPOINTS.fichaEntrada, 'POST', buildGeoBody({
      operator_ean: state.operatorEan
    }));
    showSuccessScreen('ENTRADA REGISTRADA', resetToOperator);
  } catch (error) {
    showErrorScreen(error.message || 'ERROR AL REGISTRAR ENTRADA', () => showActionScreen(null));
  }
});

btnSalida.addEventListener('click', async () => {
  try {
    loadingTitle.textContent = 'REGISTRANDO SALIDA...';
    setScreen('loading');
    await apiRequest(ENDPOINTS.fichaSalida, 'POST', buildGeoBody({
      operator_ean: state.operatorEan
    }));
    showSuccessScreen('SALIDA REGISTRADA', resetToOperator);
  } catch (error) {
    showErrorScreen(error.message || 'ERROR AL REGISTRAR SALIDA', () => showActionScreen(null));
  }
});

window.addEventListener('keydown', (event) => {
  const onOperator = !screens.operator.classList.contains('hidden');
  if (!onOperator) return;
  if (event.ctrlKey || event.metaKey) return;

  if (/^[a-zA-Z0-9]$/.test(event.key)) {
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
    formOperatorScan.requestSubmit();
  }
});

window.addEventListener('paste', (event) => {
  const onOperator = !screens.operator.classList.contains('hidden');
  if (!onOperator) return;
  const pastedText = event.clipboardData?.getData('text') || '';
  if (!pastedText) return;
  event.preventDefault();
  inputOperatorEan.value += pastedText.trim();
});

window.addEventListener('load', () => {
  fetchGeoIp();
  resetToOperator();
});
