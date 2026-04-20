// ─── Config ───────────────────────────────────────────────────────────────────
const TC = {
    get base()  { return window.ENV_CONFIG?.BASE_URL || ''; },
    get token() { return window.ENV_CONFIG?.AUTHORIZATION_TOKEN || ''; },
};

// ─── State ────────────────────────────────────────────────────────────────────
const st = {
    raw:            null,   // full API response[0]
    zone:           null,   // current zone object
    positionMap:    {},     // id_posicion → orden (for current zone)
    blockMap:       {},     // id_posicion → bool
    warehouseData:  {},     // [pasillo][gaveta]{left,right}
    allItems:       [],     // all normalized articles
    zoneItems:      [],     // items whose posicion is in current zone
    pendingHighlight: null, // posicion to highlight after zone load
    filteredItems:  [],     // after search/filter
    posToZone:      {},     // id_posicion → { zoneIdx, info, floor }
    searchQuery:    '',
    collection:     '',
};

// ─── API ──────────────────────────────────────────────────────────────────────
const API = {
    _h() {
        return {
            'Authorization': `Basic ${TC.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
    },
    async getStructure() {
        const r = await fetch(`${TC.base}/api/API_ALM_PICKING_STRUCTURE`, { headers: this._h() });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    },
    async getStock(itemId) {
        const r = await fetch(`${TC.base}/api/API_ALM_PICKING_STOCK?item_id=${itemId}`, { headers: this._h() });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    },
    async blockPosition(positionId, block) {
        const r = await fetch(`${TC.base}/api/API_ALM_BLOCK_POSITION`, {
            method: 'POST',
            headers: this._h(),
            body: JSON.stringify({ positionId, bloqueada: block ? 'SI' : 'NO' }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    },
};

// ─── Images ───────────────────────────────────────────────────────────────────
const Img = {
    fallback: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSI0IiBmaWxsPSIjRjVGNUY1Ii8+PHBhdGggZD0iTTE2IDIwSDIwVjI0SDE2VjIwWiIgZmlsbD0iIzk5OSIvPjxwYXRoIGQ9Ik0yMCAyMEg0NFYyNEgyMFYyMFoiIGZpbGw9IiM5OTkiLz48cGF0aCBkPSJNMTYgMjhIMjBWMzJIMTZWMjhaIiBmaWxsPSIjOTk5Ii8+PHBhdGggZD0iTTIwIDI4SDQ0VjMySDIwVjI4WiIgZmlsbD0iIzk5OSIvPjxwYXRoIGQ9Ik0xNiAzNkgyMFY0MEgxNlYzNloiIGZpbGw9IiM5OTkiLz48cGF0aCBkPSJNMjAgMzZINDRWNDBIMjBWMzZaIiBmaWxsPSIjOTk5Ii8+PHBhdGggZD0iTTE2IDQ0SDIwVjQ4SDE2VjQ0WiIgZmlsbD0iIzk5OSIvPjxwYXRoIGQ9Ik0yMCA0NEg0NFY0OEgyMFY0NFoiIGZpbGw9IiM5OTkiLz48L3N2Zz4=',

    optimize(url, size = '200x') {
        if (!url) return null;
        return url.replace(/\/\d+x\//, `/${size}/`);
    },

    make(url, cls, size = '200x') {
        const img = document.createElement('img');
        if (cls) img.className = cls;
        img.draggable = false;
        const src = url ? this.optimize(url, size) : null;
        img.src = src || this.fallback;
        if (src) img.onerror = () => { img.src = this.fallback; };
        return img;
    },
};

// ─── Position math (mirrors main.js) ──────────────────────────────────────────
const Calc = {
    // orden (1-indexed relative) → {pasillo, gaveta, lado}
    snake(orden) {
        if (!st.zone) return null;
        const { gavetas } = st.zone;
        const perAisle = gavetas * 2;
        const pasillo = Math.floor((orden - 1) / perAisle);
        const inAisle = ((orden - 1) % perAisle) + 1;
        let gaveta, lado;
        if (inAisle <= gavetas) {
            lado = 'left';
            gaveta = gavetas - inAisle;
        } else {
            lado = 'right';
            gaveta = gavetas - (inAisle - gavetas);
        }
        return { pasillo, gaveta, lado };
    },

    // (pasillo, gaveta, side) → orden dentro de zona (display number)
    orden(pasillo, gaveta, side) {
        const { gavetas } = st.zone;
        const inAisle = side === 'left'
            ? gavetas - gaveta
            : (gavetas - gaveta) + gavetas;
        return pasillo * (gavetas * 2) + inAisle;
    },

    // (pasillo, gaveta, side) → id_posicion from zone posiciones
    posId(pasillo, gaveta, side) {
        const orden = this.orden(pasillo, gaveta, side);
        const found = st.zone.posiciones?.find(p => p.orden === orden);
        return found ? found.id_posicion : orden;
    },
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const Data = {
    normalize(item) {
        if (!item.posicion || isNaN(item.posicion)) item.posicion = 0;
        if (!item.imagen || typeof item.imagen !== 'string' || !item.imagen.trim()) item.imagen = null;
        return item;
    },

    loadZone(zoneIndex) {
        st.zone = st.raw.zonas[zoneIndex];
        const zone = st.zone;

        // positionMap: id_posicion → orden
        st.positionMap = {};
        st.blockMap    = {};
        for (const p of (zone.posiciones || [])) {
            st.positionMap[p.id_posicion] = p.orden;
            st.blockMap[p.id_posicion]    = p.bloqueada === 'SI' || p.bloqueada === true;
        }

        // Distribute items
        st.warehouseData = {};
        for (let p = 0; p < zone.pasillos; p++) {
            st.warehouseData[p] = {};
            for (let g = 0; g < zone.gavetas; g++) {
                st.warehouseData[p][g] = { left: [], right: [] };
            }
        }
        for (const item of st.allItems) {
            if (!item.posicion) continue;
            const orden = st.positionMap[item.posicion];
            if (orden === undefined) continue;
            const pos = Calc.snake(orden);
            if (!pos) continue;
            const { pasillo, gaveta, lado } = pos;
            if (st.warehouseData[pasillo]?.[gaveta]) {
                st.warehouseData[pasillo][gaveta][lado].push(item);
            }
        }

        // Zone-specific items (assigned to this zone)
        const posIds = new Set(Object.keys(st.positionMap).map(Number));
        st.zoneItems = st.allItems.filter(i => posIds.has(i.posicion));
        st.filteredItems = [...st.zoneItems];
        st.searchQuery = '';
        st.collection  = '';
    },

    filter() {
        let items = st.zoneItems;
        if (st.collection) items = items.filter(i => i.coleccion === st.collection);
        if (st.searchQuery) {
            const q = st.searchQuery.toLowerCase();
            // Search across all items if there's a query, not just zone items
            const base = st.collection
                ? st.allItems.filter(i => i.coleccion === st.collection)
                : st.allItems;
            items = base.filter(i =>
                (i.nombre || '').toLowerCase().includes(q) ||
                String(i.id).includes(q)
            );
        }
        st.filteredItems = items;
    },
};

// ─── Map renderer ─────────────────────────────────────────────────────────────
const MapRender = {
    render() {
        const root = document.getElementById('warehouseMap');
        root.innerHTML = '';
        if (!st.zone) {
            root.innerHTML = '<div class="t-placeholder">Selecciona una zona para ver el mapa</div>';
            return;
        }
        const frag = document.createDocumentFragment();
        for (let p = 0; p < st.zone.pasillos; p++) {
            frag.appendChild(this.aisle(p));
        }
        root.appendChild(frag);
    },

    aisle(p) {
        const el = document.createElement('div');
        el.className = 't-aisle';

        const hdr = document.createElement('div');
        hdr.className = 't-aisle-header';
        hdr.textContent = `P${p + 1}`;
        el.appendChild(hdr);

        const body = document.createElement('div');
        body.className = 't-aisle-body';
        body.appendChild(this.side(p, 'left'));
        body.appendChild(this.center());
        body.appendChild(this.side(p, 'right'));
        el.appendChild(body);
        return el;
    },

    side(p, which) {
        const el = document.createElement('div');
        el.className = 't-side';

        const lbl = document.createElement('div');
        lbl.className = 't-side-lbl';
        lbl.textContent = which === 'left' ? 'I' : 'D';
        el.appendChild(lbl);

        const { gavetas } = st.zone;
        const seq = which === 'left'
            ? Array.from({ length: gavetas }, (_, i) => i)
            : Array.from({ length: gavetas }, (_, i) => gavetas - 1 - i);

        for (const g of seq) {
            el.appendChild(this.position(p, g, which));
        }

        const lblB = lbl.cloneNode(true);
        el.appendChild(lblB);
        return el;
    },

    center() {
        const el = document.createElement('div');
        el.className = 't-aisle-center';
        return el;
    },

    position(p, g, side) {
        const posId  = Calc.posId(p, g, side);
        const orden  = Calc.orden(p, g, side);
        const items  = st.warehouseData[p]?.[g]?.[side] || [];
        const blocked = st.blockMap[posId] || false;

        const el = document.createElement('div');
        el.className = 't-pos' + (items.length ? ' occupied' : '') + (blocked ? ' blocked' : '');
        el.dataset.posId = posId;

        // Info label
        const posLabel = MapRender._posLabel(posId);
        const info = document.createElement('div');
        info.className = 't-pos-info';
        info.textContent = posLabel;
        el.appendChild(info);

        if (items.length) {
            el.appendChild(this.posItems(items));
        }

        el.addEventListener('click', () => Panel.open(posLabel, items));
        return el;
    },

    // "P1-1I" from API info → "P1 1I"
    _posLabel(posId) {
        const raw = st.posToZone[posId]?.info;
        return raw ? raw.replace(/-/g, ' ') : `#${posId}`;
    },

    posItems(items) {
        const wrap = document.createElement('div');
        wrap.className = `t-pos-items ${items.length === 1 ? 'single' : 'multi'}`;

        const show = items.slice(0, items.length === 1 ? 1 : 3);
        for (const item of show) {
            const row = document.createElement('div');
            row.className = 't-pi';
            const img = Img.make(item.imagen, null, '200x');
            const name = document.createElement('div');
            name.className = 't-pi-name';
            name.textContent = item.nombre || item.id;
            row.append(img, name);
            wrap.appendChild(row);
        }
        if (items.length > 3) {
            const more = document.createElement('div');
            more.className = 't-pi-more';
            more.textContent = `+${items.length - 3} más`;
            wrap.appendChild(more);
        }
        return wrap;
    },

    highlight(posicion) {
        document.querySelectorAll('.t-pos.highlighted').forEach(e => e.classList.remove('highlighted'));
        const el = document.querySelector(`.t-pos[data-pos-id="${posicion}"]`);
        if (!el) return;
        el.classList.add('highlighted');
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setTimeout(() => el.classList.remove('highlighted'), 3000);
    },
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const SidebarMgr = {
    _open: false,

    toggle() {
        if (window.matchMedia('(orientation: portrait)').matches) {
            this._open = !this._open;
            document.getElementById('sidebar').classList.toggle('open', this._open);
            document.getElementById('sidebarOverlay').hidden = !this._open;
        } else {
            document.getElementById('sidebar').classList.toggle('collapsed');
        }
    },

    close() {
        this._open = false;
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').hidden = true;
    },

    populateCollections() {
        const sel = document.getElementById('collectionSelect');
        const cols = [...new Set(st.zoneItems.map(i => i.coleccion).filter(Boolean))].sort();
        sel.innerHTML = '<option value="">Todas las colecciones</option>';
        for (const c of cols) {
            const o = document.createElement('option');
            o.value = o.textContent = c;
            sel.appendChild(o);
        }
    },

    renderItems(items) {
        const list  = document.getElementById('itemsList');
        const count = document.getElementById('itemCount');
        list.innerHTML = '';
        count.textContent = `${items.length} artículo${items.length !== 1 ? 's' : ''}`;

        if (!items.length) {
            list.innerHTML = '<div class="t-empty-list">Sin resultados</div>';
            return;
        }

        // Build a set of position IDs for the current zone for badge logic
        const zonePosIds = new Set(Object.keys(st.positionMap).map(Number));

        const frag = document.createDocumentFragment();
        for (const item of items) {
            frag.appendChild(this._card(item, zonePosIds));
        }
        list.appendChild(frag);
    },

    _card(item, zonePosIds) {
        const card = document.createElement('div');
        const hasPos   = item.posicion > 0;
        const inZone   = hasPos && zonePosIds.has(item.posicion);
        card.className = `t-item-card${!hasPos ? ' no-position' : ''}`;

        const img  = Img.make(item.imagen, 't-item-thumb', '200x');
        const info = document.createElement('div');
        info.className = 't-item-info';
        info.innerHTML = `
            <div class="t-item-name">${item.nombre || item.id}</div>
            <div class="t-item-collection">${item.coleccion || ''}</div>
        `;

        const badge = document.createElement('span');
        const pz    = hasPos ? st.posToZone[item.posicion] : null;
        if (pz) {
            badge.className   = `t-item-badge floor-${pz.floor}`;
            badge.textContent = `${pz.info} · ${App._zoneShort(pz.zoneName)}`;
        } else {
            badge.className   = 't-item-badge floor-none';
            badge.textContent = 'Sin asignar';
        }

        card.append(img, info, badge);

        if (inZone) {
            card.addEventListener('click', () => {
                MapRender.highlight(item.posicion);
                SidebarMgr.close();
            });
        } else if (hasPos) {
            card.addEventListener('click', () => {
                const zoneIdx = st.posToZone[item.posicion]?.zoneIdx ?? -1;
                if (zoneIdx === -1) return;
                st.pendingHighlight = item.posicion;
                document.getElementById('zoneSelect').value = zoneIdx;
                App._loadZone(zoneIdx);
                SidebarMgr.close();
            });
        }
        return card;
    },

    updateStats() {
        if (!st.zone) return;
        const { pasillos, gavetas } = st.zone;
        const total  = pasillos * gavetas * 2;
        const posIds = new Set(Object.keys(st.positionMap).map(Number));
        const occ    = new Set(st.allItems.filter(i => posIds.has(i.posicion)).map(i => i.posicion)).size;
        document.getElementById('statOccupied').textContent = occ;
        document.getElementById('statFree').textContent     = total - occ;
        document.getElementById('statRate').textContent     = total ? `${Math.round(occ / total * 100)}%` : '—';
    },
};

// ─── Position panel ───────────────────────────────────────────────────────────
const Panel = {
    open(label, items) {
        document.getElementById('panelTitle').textContent = label;

        const body = document.getElementById('panelBody');
        body.innerHTML = '';

        if (!items.length) {
            body.innerHTML = '<div class="t-panel-empty">Posición vacía</div>';
        } else {
            const frag = document.createDocumentFragment();
            for (const item of items) frag.appendChild(this._row(item));
            body.appendChild(frag);
        }

        document.getElementById('positionPanel').hidden = false;
        ScrollLock.lock();
    },

    close() {
        document.getElementById('positionPanel').hidden = true;
        ScrollLock.unlock();
    },

    _row(item) {
        const row = document.createElement('div');
        row.className = 't-pitem';

        const img  = Img.make(item.imagen, 't-pitem-img', '200x');
        const info = document.createElement('div');
        info.className = 't-pitem-info';
        info.innerHTML = `
            <div class="t-pitem-name">${item.nombre || item.id}</div>
            <div class="t-pitem-col">${item.coleccion || ''}</div>
        `;

        const btn = document.createElement('button');
        btn.className   = 't-stock-btn';
        btn.textContent = 'Ver stock';
        btn.addEventListener('click', e => { e.stopPropagation(); StockModal.open(item); });

        row.append(img, info, btn);
        return row;
    },

    confirmBlock() {
        if (this._posId === null) return;
        BlockModal.show(this._posId, this._blocked);
    },
};

// ─── Stock modal ──────────────────────────────────────────────────────────────
const StockModal = {
    async open(item) {
        const modal   = document.getElementById('stockModal');
        const imgArea = document.getElementById('stockImg');
        const content = document.getElementById('stockContent');

        document.getElementById('stockTitle').textContent = item.nombre || item.id;
        imgArea.innerHTML   = '';
        content.innerHTML   = '<div class="t-loading"><div class="t-spinner"></div></div>';
        modal.hidden = false;
        ScrollLock.lock();

        imgArea.appendChild(Img.make(item.imagen, null, '200x'));

        try {
            const data = await API.getStock(item.id);
            this._render(content, Array.isArray(data) ? data : []);
        } catch {
            content.innerHTML = '<p class="t-stock-no-data" style="color:#ef4444">Error al cargar el stock</p>';
        }
    },

    _render(el, rows) {
        if (!rows.length) {
            el.innerHTML = '<p class="t-stock-no-data">Sin datos de stock</p>';
            return;
        }
        el.innerHTML = `
            <table class="t-stock-table">
                <thead>
                    <tr>
                        <th>Talla</th>
                        <th>Stock gaveta</th>
                        <th>Stock total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => `
                        <tr>
                            <td>${r.talla ?? '—'}</td>
                            <td>${r.stock ?? 0}</td>
                            <td>${r.stock_total ?? 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    close() { document.getElementById('stockModal').hidden = true; ScrollLock.unlock(); },
};


// ─── Scroll lock ──────────────────────────────────────────────────────────────
const ScrollLock = {
    _count: 0,
    lock()   { if (++this._count === 1) document.body.classList.add('scroll-locked'); },
    unlock() { if (--this._count <= 0)  { this._count = 0; document.body.classList.remove('scroll-locked'); } },
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = {
    _timer: null,
    show(msg, type = '') {
        const el = document.getElementById('toast');
        el.textContent = msg;
        el.className   = `t-toast ${type} show`;
        clearTimeout(this._timer);
        this._timer = setTimeout(() => el.classList.remove('show'), 3000);
    },
};

// ─── App ──────────────────────────────────────────────────────────────────────
const App = {
    async init() {
        this._bind();
        const map = document.getElementById('warehouseMap');
        map.innerHTML = '<div class="t-loading"><div class="t-spinner"></div><span>Cargando datos...</span></div>';

        try {
            const raw = await API.getStructure();
            st.raw      = Array.isArray(raw) ? raw[0] : raw;
            st.allItems = (st.raw.articulos || []).map(i => Data.normalize(i));
            this._buildPosToZone(st.raw.zonas || []);
            this._populateZones(st.raw.zonas || []);
            map.innerHTML = '<div class="t-placeholder">Selecciona una zona para ver el mapa</div>';
        } catch (e) {
            map.innerHTML = '<div class="t-placeholder" style="color:#ef4444">Error al cargar los datos</div>';
        }
    },

    _buildPosToZone(zones) {
        st.posToZone = {};
        zones.forEach((z, i) => {
            const floor = App._floor(z.nombre);
            for (const p of (z.posiciones || [])) {
                st.posToZone[p.id_posicion] = { zoneIdx: i, zoneName: z.nombre, info: p.info, floor };
            }
        });
    },

    _floor(nombre) {
        if (!nombre) return 'other';
        const n = nombre.toUpperCase();
        if (n.includes('PLANTA 2')) return 'p2';
        if (n.includes('PLANTA 1')) return 'p1';
        if (n.includes('PLANTA BAJA')) return 'pb';
        return 'other';
    },

    _zoneShort(nombre) {
        if (!nombre) return '';
        return nombre
            .replace('PLANTA BAJA', 'PB')
            .replace('PLANTA 1', 'P1')
            .replace('PLANTA 2', 'P2')
            .replace(/\s*-\s*/g, '-')
            .trim();
    },

    _populateZones(zones) {
        const sel = document.getElementById('zoneSelect');
        sel.innerHTML = '<option value="">Seleccionar zona...</option>';
        zones.forEach((z, i) => {
            const o = document.createElement('option');
            o.value = i;
            o.textContent = z.nombre || `Zona ${i + 1}`;
            sel.appendChild(o);
        });
    },

    _loadZone(index) {
        document.getElementById('warehouseMap').innerHTML =
            '<div class="t-loading"><div class="t-spinner"></div><span>Cargando zona...</span></div>';

        // Push to next tick so spinner renders
        setTimeout(() => {
            Data.loadZone(index);
            MapRender.render();
            SidebarMgr.populateCollections();
            SidebarMgr.renderItems(st.filteredItems);
            SidebarMgr.updateStats();
            document.getElementById('appTitle').textContent  = st.zone.nombre;
            document.getElementById('searchInput').value     = '';
            document.getElementById('collectionSelect').value = '';
            if (st.pendingHighlight !== null) {
                const pos = st.pendingHighlight;
                st.pendingHighlight = null;
                setTimeout(() => MapRender.highlight(pos), 80);
            }
        }, 30);
    },

    _bind() {
        // Zone change
        document.getElementById('zoneSelect').addEventListener('change', e => {
            const v = e.target.value;
            if (v !== '') this._loadZone(parseInt(v));
        });

        // Sidebar toggle
        document.getElementById('btnSidebar').addEventListener('click', () => SidebarMgr.toggle());
        document.getElementById('sidebarOverlay').addEventListener('click', () => SidebarMgr.close());

        // Search (debounced)
        let searchTimer;
        document.getElementById('searchInput').addEventListener('input', e => {
            st.searchQuery = e.target.value.trim();
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                Data.filter();
                SidebarMgr.renderItems(st.filteredItems);
            }, 250);
        });

        // Collection filter
        document.getElementById('collectionSelect').addEventListener('change', e => {
            st.collection  = e.target.value;
            st.searchQuery = '';
            document.getElementById('searchInput').value = '';
            Data.filter();
            SidebarMgr.renderItems(st.filteredItems);
        });

        // Panel close
        document.getElementById('btnPanelClose').addEventListener('click', () => Panel.close());
        document.getElementById('positionPanel').addEventListener('click', e => {
            if (e.target === document.getElementById('positionPanel')) Panel.close();
        });

        // Stock modal close
        document.getElementById('btnStockClose').addEventListener('click', () => StockModal.close());
        document.getElementById('stockModal').addEventListener('click', e => {
            if (e.target === document.getElementById('stockModal')) StockModal.close();
        });

        // Escape key
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            if (!document.getElementById('stockModal').hidden)    { StockModal.close(); return; }
            if (!document.getElementById('positionPanel').hidden) { Panel.close(); return; }
            SidebarMgr.close();
        });
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());
