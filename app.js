const STORE_CONFIG = {
  namaToko: 'FarmWeb Tech',
  taglineToko: 'Cepat, Tepat Serta Presisi',
  urlLogoToko: 'https://i.postimg.cc/fRzDNXYq/IMG-1716.jpg',
  urlDomain: 'https://ranting77.store',
  nomorWhatsApp: '6285119127163',
  kotaLokasi: 'Jakarta, DKI JAKARTA'
};

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQf04kdwpUrv4CdAR04Su4lGPaoMXuHEIpy3QeLwnhPW6u38lYWrosgxIzAAhdek8fehPpHShjoHLDy/pub?gid=0&single=true&output=csv';

const FALLBACK_PRODUCT_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
  '<rect width="400" height="300" fill="#F1F5F9"/>' +
  '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="16" font-weight="600">FarmWeb Tech</text>' +
  '</svg>'
);

const state = {
  products: [],
  activeCategory: 'Semua',
  searchQuery: '',
  isFetchError: false
};

let activeLoaderTimer = null;
let activeHideTimer = null;

function hideInitialLoadingScreen() {
  const loader = document.getElementById('loading-screen');
  if (!loader || loader.classList.contains('is-hidden')) return;

  loader.classList.add('is-fading');
  window.setTimeout(() => {
    loader.classList.add('is-hidden');
    loader.classList.remove('is-fading');
  }, 280);
}

function triggerLogoLoader(durationMs = 450, callback = null) {
  const loader = document.getElementById('loading-screen');
  if (!loader) {
    if (typeof callback === 'function') callback();
    return;
  }

  window.clearTimeout(activeLoaderTimer);
  window.clearTimeout(activeHideTimer);

  loader.classList.remove('is-hidden', 'is-fading');
  void loader.offsetWidth;

  activeLoaderTimer = window.setTimeout(() => {
    loader.classList.add('is-fading');
    activeHideTimer = window.setTimeout(() => {
      loader.classList.add('is-hidden');
      loader.classList.remove('is-fading');
      if (typeof callback === 'function') callback();
    }, 240);
  }, durationMs);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRupiah(rawPrice) {
  const cleaned = String(rawPrice ?? '').replace(/[^\d]/g, '');
  const numericValue = Number(cleaned);
  if (!cleaned || Number.isNaN(numericValue)) {
    return 'Hubungi Admin';
  }
  return `Rp ${numericValue.toLocaleString('id-ID')}`;
}

function buildWhatsAppUrl(namaProduk) {
  const pesan = `Halo kak, apakah ${namaProduk} masih tersedia?`;
  return `https://wa.me/${STORE_CONFIG.nomorWhatsApp}?text=${encodeURIComponent(pesan)}`;
}

function isProductAvailable(status) {
  return String(status ?? '').trim().toLowerCase() === 'ya';
}

function parseCSV(csvText) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
      if (char === '\r') i += 1;
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.toLowerCase().trim());
  const indexMap = {
    nama: headers.indexOf('nama'),
    harga: headers.indexOf('harga'),
    foto: headers.indexOf('foto'),
    deskripsi: headers.indexOf('deskripsi'),
    kategori: headers.indexOf('kategori'),
    tersedia: headers.indexOf('tersedia')
  };

  return rows
    .slice(1)
    .map((cols) => ({
      nama: indexMap.nama >= 0 ? cols[indexMap.nama] || '' : '',
      harga: indexMap.harga >= 0 ? cols[indexMap.harga] || '' : '',
      foto: indexMap.foto >= 0 ? cols[indexMap.foto] || '' : '',
      deskripsi: indexMap.deskripsi >= 0 ? cols[indexMap.deskripsi] || '' : '',
      kategori: indexMap.kategori >= 0 ? cols[indexMap.kategori] || 'Umum' : 'Umum',
      tersedia: indexMap.tersedia >= 0 ? cols[indexMap.tersedia] || 'Tidak' : 'Tidak'
    }))
    .filter((item) => item.nama !== '');
}

function renderSkeletons(count = 8) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  grid.innerHTML = Array.from({ length: count })
    .map(
      () => `
      <article class="skeleton-card" aria-hidden="true">
        <div class="skeleton-box skeleton-media"></div>
        <div class="skeleton-content">
          <div class="skeleton-box skeleton-line w-40"></div>
          <div class="skeleton-box skeleton-line w-85"></div>
          <div class="skeleton-box skeleton-line w-60"></div>
          <div class="skeleton-box skeleton-btn"></div>
        </div>
      </article>`
    )
    .join('');
}

function renderCategories(products) {
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  const uniqueCategories = ['Semua'];
  products.forEach((product) => {
    const label = product.kategori.trim() || 'Umum';
    if (!uniqueCategories.some((cat) => cat.toLowerCase() === label.toLowerCase())) {
      uniqueCategories.push(label);
    }
  });

  nav.innerHTML = uniqueCategories
    .map((category) => {
      const isActive = category.toLowerCase() === state.activeCategory.toLowerCase();
      return `<button type="button" class="category-pill${isActive ? ' is-active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`;
    })
    .join('');
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  const statusEl = document.getElementById('catalog-status');
  const feedbackEl = document.getElementById('state-feedback');
  const stateTitle = document.getElementById('state-title');
  const stateMessage = document.getElementById('state-message');
  const stateActionBtn = document.getElementById('state-action-btn');

  if (!grid || !statusEl || !feedbackEl) return;

  if (state.isFetchError) {
    grid.innerHTML = '';
    statusEl.textContent = 'Gagal memuat katalog';
    stateTitle.textContent = 'Koneksi ke katalog terganggu';
    stateMessage.textContent = 'Periksa koneksi internet Anda lalu muat ulang daftar produk.';
    stateActionBtn.textContent = 'Muat Ulang Katalog';
    stateActionBtn.dataset.action = 'retry';
    feedbackEl.hidden = false;
    return;
  }

  const normalizedQuery = state.searchQuery.trim().toLowerCase();
  const filteredProducts = state.products.filter((product) => {
    const matchesCategory =
      state.activeCategory.toLowerCase() === 'semua' ||
      product.kategori.toLowerCase() === state.activeCategory.toLowerCase();

    const matchesQuery =
      normalizedQuery === '' ||
      product.nama.toLowerCase().includes(normalizedQuery) ||
      product.deskripsi.toLowerCase().includes(normalizedQuery) ||
      product.kategori.toLowerCase().includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });

  statusEl.textContent = `Menampilkan ${filteredProducts.length} dari ${state.products.length} produk`;

  if (filteredProducts.length === 0) {
    grid.innerHTML = '';
    stateTitle.textContent = 'Produk tidak ditemukan';
    stateMessage.textContent = 'Coba ubah kata kunci pencarian atau pilih kategori lain.';
    stateActionBtn.textContent = 'Tampilkan Semua Produk';
    stateActionBtn.dataset.action = 'reset';
    feedbackEl.hidden = false;
    return;
  }

  feedbackEl.hidden = true;

  grid.innerHTML = filteredProducts
    .map((product) => {
      const available = isProductAvailable(product.tersedia);
      const imageUrl = product.foto ? escapeHtml(product.foto) : FALLBACK_PRODUCT_IMAGE;
      const safeName = escapeHtml(product.nama);
      const safeDesc = escapeHtml(product.deskripsi || 'Siap dipesan langsung melalui WhatsApp.');
      const safeCategory = escapeHtml(product.kategori || 'Umum');
      const formattedPrice = formatRupiah(product.harga);
      const waUrl = buildWhatsAppUrl(product.nama);

      return `
      <article class="product-card">
        <div class="product-media">
          <img
            src="${imageUrl}"
            alt="${safeName}"
            class="product-image"
            loading="lazy"
            onerror="this.onerror=null;this.src='${FALLBACK_PRODUCT_IMAGE}';"
          >
          <span class="stock-badge ${available ? 'is-available' : 'is-out'}">
            ${available ? 'Tersedia' : 'Stok Habis'}
          </span>
        </div>
        <div class="product-body">
          <span class="product-category">${safeCategory}</span>
          <h2 class="product-title">${safeName}</h2>
          <p class="product-desc">${safeDesc}</p>
          <p class="product-price">${formattedPrice}</p>
          ${
            available
              ? `<button type="button" class="btn-action btn-whatsapp" data-wa-url="${escapeHtml(waUrl)}">Pesan via WhatsApp</button>`
              : `<button type="button" class="btn-action" disabled>Stok Habis</button>`
          }
        </div>
      </article>`;
    })
    .join('');
}

async function fetchCatalogData() {
  state.isFetchError = false;
  renderSkeletons(8);

  const response = await fetch(GOOGLE_SHEET_CSV_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const csvText = await response.text();
  state.products = parseCSV(csvText);
  renderCategories(state.products);
  renderProducts();
}

function resetFilters() {
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search-btn');

  state.activeCategory = 'Semua';
  state.searchQuery = '';
  if (searchInput) searchInput.value = '';
  if (clearBtn) clearBtn.hidden = true;

  renderCategories(state.products);
  renderProducts();
}

function openExternalTarget(url) {
  const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (!openedWindow) {
    window.location.href = url;
  }
}

function setupGlobalEventDelegation() {
  document.addEventListener('click', (event) => {
    const interactiveEl = event.target.closest('button, a, .btn-action');
    if (!interactiveEl || interactiveEl.disabled) return;

    if (interactiveEl.id === 'clear-search-btn') {
      resetFilters();
      return;
    }

    const waUrl = interactiveEl.dataset.waUrl;
    if (waUrl) {
      event.preventDefault();
      triggerLogoLoader(450, () => openExternalTarget(waUrl));
      return;
    }

    const category = interactiveEl.dataset.category;
    if (category) {
      event.preventDefault();
      triggerLogoLoader(400, () => {
        state.activeCategory = category;
        renderCategories(state.products);
        renderProducts();
      });
      return;
    }

    if (interactiveEl.id === 'state-action-btn') {
      event.preventDefault();
      const actionType = interactiveEl.dataset.action;
      triggerLogoLoader(420, () => {
        if (actionType === 'retry') {
          fetchCatalogData().catch(() => {
            state.isFetchError = true;
            renderProducts();
          });
        } else {
          resetFilters();
        }
      });
      return;
    }

    if (interactiveEl.tagName === 'A' && interactiveEl.href) {
      event.preventDefault();
      const destination = interactiveEl.href;
      triggerLogoLoader(450, () => {
        if (destination.startsWith('https://wa.me/')) {
          openExternalTarget(destination);
        } else {
          window.location.assign(destination);
        }
      });
    }
  });
}

function setupSearchListener() {
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search-btn');
  if (!searchInput) return;

  let debounceTimer = null;

  searchInput.addEventListener('input', (event) => {
    const value = event.target.value;
    if (clearBtn) clearBtn.hidden = value.length === 0;

    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      state.searchQuery = value;
      renderProducts();
    }, 180);
  });
}

async function initializeStoreCatalog() {
  setupGlobalEventDelegation();
  setupSearchListener();

  const maxSplashTimeout = new Promise((resolve) => {
    window.setTimeout(resolve, 1200);
  });

  const dataLoadPromise = fetchCatalogData().catch(() => {
    state.isFetchError = true;
    renderProducts();
  });

  await Promise.race([dataLoadPromise, maxSplashTimeout]);
  hideInitialLoadingScreen();
}

document.addEventListener('DOMContentLoaded', initializeStoreCatalog);
