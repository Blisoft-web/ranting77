const STORE_CONFIG = {
  NAMA_TOKO: 'FarmWeb Tech',
  TAGLINE_TOKO: 'Cepat, Tepat Serta Presisi',
  URL_LOGO_TOKO: 'https://res.cloudinary.com/nj31ul1n/image/upload/f_auto,q_auto,w_200/v1794496879/IMG_1716.jpg',
  URL_DOMAIN: 'https://ranting77.store',
  NOMOR_WHATSAPP: '6285119127163',
  DESKRIPSI_SEO: 'Pembuatan Website Katalog Produk Dengan Integrasi Google Sheets Untuk Memudahkan Pelaku UMKM',
  KOTA_LOKASI: 'Jakarta, DKI JAKARTA',
  THEME_COLOR: '#FFFFFF',
  ACCENT_COLOR: '#143A1F'
};

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQf04kdwpUrv4CdAR04Su4lGPaoMXuHEIpy3QeLwnhPW6u38lYWrosgxIzAAhdek8fehPpHShjoHLDy/pub?gid=0&single=true&output=csv';

const state = {
  products: [],
  categories: ['Semua'],
  activeCategory: 'Semua',
  searchQuery: '',
  loaderTimerId: null
};

function getInitials(text) {
  const cleaned = String(text || STORE_CONFIG.NAMA_TOKO || 'UMKM').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.handleImageFallback = function handleImageFallback(imgEl, labelText, variant) {
  if (!imgEl || !imgEl.parentNode) return;

  const fallback = document.createElement('div');
  const initials = getInitials(labelText);

  if (variant === 'loader') {
    fallback.className = 'loader-logo-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.textContent = initials;
  } else if (variant === 'header') {
    fallback.className = 'store-logo-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.textContent = initials;
  } else {
    fallback.className = 'product-img-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>' +
      '<circle cx="8.5" cy="8.5" r="1.5"></circle>' +
      '<polyline points="21 15 16 10 5 21"></polyline>' +
      '</svg>' +
      '<span>' + escapeHtml(initials) + '</span>';
  }

  imgEl.parentNode.replaceChild(fallback, imgEl);
};

function hideLogoLoader(immediate = false) {
  const loader = document.getElementById('loading-screen');
  if (!loader) return;

  if (state.loaderTimerId) {
    clearTimeout(state.loaderTimerId);
    state.loaderTimerId = null;
  }

  if (immediate) {
    loader.classList.remove('is-fading');
    loader.classList.add('hidden');
    return;
  }

  loader.classList.add('is-fading');
  state.loaderTimerId = setTimeout(() => {
    loader.classList.add('hidden');
    loader.classList.remove('is-fading');
    state.loaderTimerId = null;
  }, 220);
}

function triggerLogoLoader(durationMs, callback) {
  const loader = document.getElementById('loading-screen');
  if (!loader) {
    if (typeof callback === 'function') callback();
    return;
  }

  if (state.loaderTimerId) {
    clearTimeout(state.loaderTimerId);
    state.loaderTimerId = null;
  }

  loader.classList.remove('hidden', 'is-fading');

  state.loaderTimerId = setTimeout(() => {
    state.loaderTimerId = null;
    if (typeof callback === 'function') {
      callback();
    }
  }, durationMs);
}

function resolveOptimizedImageUrl(rawUrl, width = 400) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';

  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/')) {
    const parts = trimmed.split('/upload/');
    const afterUpload = parts[1] || '';
    const firstSegment = afterUpload.split('/')[0] || '';
    const hasTransform = /(^|,)(f_|q_|w_|h_|c_)/.test(firstSegment);

    if (!hasTransform) {
      return `${parts[0]}/upload/f_auto,q_auto,w_${width}/${afterUpload}`;
    }
    return trimmed;
  }

  if (trimmed.includes('drive.google.com')) {
    const pathMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileId = (pathMatch && pathMatch[1]) || (queryMatch && queryMatch[1]);
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  return trimmed;
}

function parseCsvRfc4180(csvText) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  const text = String(csvText || '').replace(/^\uFEFF/, '');

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentField += char;
      }
    } else if (char === '"') {
      insideQuotes = true;
    } else if (char === ',') {
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\r' && nextChar === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      i += 1;
    } else if (char === '\n' || char === '\r') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => String(cell).trim() !== ''));
}

function mapCsvToProducts(csvText) {
  const rows = parseCsvRfc4180(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => String(header).trim().toLowerCase());
  const indexMap = {
    nama: headers.indexOf('nama'),
    harga: headers.indexOf('harga'),
    foto: headers.indexOf('foto'),
    deskripsi: headers.indexOf('deskripsi'),
    kategori: headers.indexOf('kategori'),
    tersedia: headers.indexOf('tersedia')
  };

  const products = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const nama = indexMap.nama >= 0 ? String(row[indexMap.nama] || '').trim() : '';
    if (!nama) continue;

    const rawHarga = indexMap.harga >= 0 ? String(row[indexMap.harga] || '').trim() : '';
    const rawFoto = indexMap.foto >= 0 ? String(row[indexMap.foto] || '').trim() : '';
    const deskripsi = indexMap.deskripsi >= 0 ? String(row[indexMap.deskripsi] || '').trim() : '';
    const kategori = indexMap.kategori >= 0 ? String(row[indexMap.kategori] || '').trim() : '';
    const tersediaRaw = indexMap.tersedia >= 0 ? String(row[indexMap.tersedia] || '').trim() : '';

    products.push({
      nama,
      harga: rawHarga,
      foto: resolveOptimizedImageUrl(rawFoto, 400),
      deskripsi,
      kategori: kategori || 'Umum',
      tersedia: tersediaRaw.toLowerCase() === 'ya'
    });
  }

  return products;
}

function formatRupiah(rawHarga) {
  const digitsOnly = String(rawHarga || '').replace(/[^\d]/g, '');
  if (!digitsOnly) return 'Hubungi Admin';
  return `Rp ${Number(digitsOnly).toLocaleString('id-ID')}`;
}

function buildWhatsAppUrl(productName) {
  const cleanName = String(productName || '').trim();
  const message = `Halo kak, apakah ${cleanName} masih tersedia?`;
  const phone = String(STORE_CONFIG.NOMOR_WHATSAPP || '').replace(/[^\d]/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

async function fetchCsvWithRetry(url, maxRetries = 2, retryDelayMs = 600) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const csvText = await response.text();
      const trimmed = csvText.trim();

      if (!trimmed || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
        throw new Error('Respons CSV tidak valid');
      }

      return csvText;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw lastError || new Error('Gagal memuat data katalog');
}

function renderSkeletons(count = 4) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(
      '<article class="product-card skeleton-card" aria-hidden="true">' +
        '<div class="skeleton-media skeleton-pulse"></div>' +
        '<div class="product-body">' +
          '<div class="skeleton-line skeleton-badge skeleton-pulse"></div>' +
          '<div class="skeleton-line skeleton-title skeleton-pulse"></div>' +
          '<div class="skeleton-line skeleton-desc skeleton-pulse"></div>' +
          '<div class="skeleton-line skeleton-price skeleton-pulse"></div>' +
          '<div class="skeleton-btn skeleton-pulse"></div>' +
        '</div>' +
      '</article>'
    );
  }
  grid.innerHTML = items.join('');
}

function renderCategories() {
  const container = document.getElementById('category-list');
  if (!container) return;

  container.innerHTML = state.categories
    .map((category) => {
      const isActive = category === state.activeCategory;
      return (
        `<button type="button" class="category-pill${isActive ? ' is-active' : ''}" ` +
        `role="tab" aria-selected="${isActive ? 'true' : 'false'}" ` +
        `data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
      );
    })
    .join('');
}

function getFilteredProducts() {
  const query = state.searchQuery.trim().toLowerCase();

  return state.products.filter((item) => {
    const matchesCategory =
      state.activeCategory === 'Semua' ||
      item.kategori.toLowerCase() === state.activeCategory.toLowerCase();

    if (!matchesCategory) return false;
    if (!query) return true;

    return (
      item.nama.toLowerCase().includes(query) ||
      item.deskripsi.toLowerCase().includes(query) ||
      item.kategori.toLowerCase().includes(query)
    );
  });
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  const feedback = document.getElementById('catalog-feedback');
  const countLabel = document.getElementById('catalog-count');
  if (!grid || !feedback || !countLabel) return;

  const filtered = getFilteredProducts();
  countLabel.textContent = `Menampilkan ${filtered.length} produk`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    feedback.hidden = false;
    feedback.innerHTML =
      '<h2 class="feedback-title">Produk tidak ditemukan</h2>' +
      '<p class="feedback-desc">Coba gunakan kata kunci lain atau pilih kategori Semua.</p>' +
      '<button type="button" id="reset-filter-btn" class="btn-reload">Reset Filter</button>';
    return;
  }

  feedback.hidden = true;
  feedback.innerHTML = '';

  const waIconSvg =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.59 5.96L0 24l6.31-1.65a11.87 11.87 0 0 0 5.75 1.47h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.44ZM12.07 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.27c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 7c0 5.46-4.44 9.89-9.89 9.89Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z"/>' +
    '</svg>';

  grid.innerHTML = filtered
    .map((product) => {
      const safeName = escapeHtml(product.nama);
      const safeDesc = escapeHtml(product.deskripsi || 'Hubungi kami untuk detail lengkap produk ini.');
      const safeCategory = escapeHtml(product.kategori);
      const priceText = escapeHtml(formatRupiah(product.harga));
      const badgeClass = product.tersedia ? 'is-available' : 'is-empty';
      const badgeText = product.tersedia ? 'Tersedia' : 'Habis';
      const waUrl = escapeHtml(buildWhatsAppUrl(product.nama));

      const mediaHtml = product.foto
        ? `<img class="product-img" src="${escapeHtml(product.foto)}" alt="${safeName}" width="300" height="300" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="window.handleImageFallback(this, '${safeName}', 'product')">`
        : `<div class="product-img-fallback" aria-hidden="true"><span>${escapeHtml(getInitials(product.nama))}</span></div>`;

      const buttonHtml = product.tersedia
        ? `<button type="button" class="btn-wa" data-wa-url="${waUrl}">${waIconSvg}<span>Pesan via WhatsApp</span></button>`
        : '<button type="button" class="btn-wa" disabled>Stok Habis</button>';

      return (
        '<article class="product-card">' +
          '<div class="product-media">' +
            mediaHtml +
            `<span class="stock-badge ${badgeClass}">${badgeText}</span>` +
          '</div>' +
          '<div class="product-body">' +
            `<p class="product-category">${safeCategory}</p>` +
            `<h2 class="product-title">${safeName}</h2>` +
            `<p class="product-desc">${safeDesc}</p>` +
            `<p class="product-price">${priceText}</p>` +
            buttonHtml +
          '</div>' +
        '</article>'
      );
    })
    .join('');
}

function renderNetworkError() {
  const grid = document.getElementById('product-grid');
  const feedback = document.getElementById('catalog-feedback');
  const countLabel = document.getElementById('catalog-count');
  if (!grid || !feedback || !countLabel) return;

  grid.innerHTML = '';
  countLabel.textContent = 'Katalog gagal dimuat';
  feedback.hidden = false;
  feedback.innerHTML =
    '<h2 class="feedback-title">Koneksi ke Katalog Terputus</h2>' +
    '<p class="feedback-desc">Periksa jaringan internet Anda lalu tekan tombol di bawah untuk memuat ulang data produk.</p>' +
    '<button type="button" id="reload-catalog-btn" class="btn-reload">Muat Ulang Katalog</button>';
}

async function loadCatalog() {
  const feedback = document.getElementById('catalog-feedback');
  const countLabel = document.getElementById('catalog-count');

  if (feedback) {
    feedback.hidden = true;
    feedback.innerHTML = '';
  }
  if (countLabel) {
    countLabel.textContent = 'Memuat etalase produk...';
  }

  renderSkeletons(4);

  try {
    const csvText = await fetchCsvWithRetry(GOOGLE_SHEET_CSV_URL, 2, 600);
    const parsedProducts = mapCsvToProducts(csvText);

    state.products = parsedProducts;

    const uniqueCategories = ['Semua'];
    parsedProducts.forEach((product) => {
      if (product.kategori && !uniqueCategories.includes(product.kategori)) {
        uniqueCategories.push(product.kategori);
      }
    });

    state.categories = uniqueCategories;
    if (!state.categories.includes(state.activeCategory)) {
      state.activeCategory = 'Semua';
    }

    renderCategories();
    renderProducts();
  } catch (error) {
    renderNetworkError();
  }
}

function applyStoreBranding() {
  document.documentElement.style.setProperty('--theme-color', STORE_CONFIG.THEME_COLOR);
  document.documentElement.style.setProperty('--accent-color', STORE_CONFIG.ACCENT_COLOR);

  const storeNameEl = document.getElementById('store-name');
  const taglineEl = document.getElementById('store-tagline');
  const locationEl = document.getElementById('store-location-text');
  const loaderNameEl = document.getElementById('loader-store-name');
  const footerBrandEl = document.getElementById('footer-store-name');
  const footerLocEl = document.getElementById('footer-location');
  const footerYearEl = document.getElementById('footer-year');

  if (storeNameEl) storeNameEl.textContent = STORE_CONFIG.NAMA_TOKO;
  if (taglineEl) taglineEl.textContent = STORE_CONFIG.TAGLINE_TOKO;
  if (locationEl) locationEl.textContent = STORE_CONFIG.KOTA_LOKASI;
  if (loaderNameEl) loaderNameEl.textContent = STORE_CONFIG.NAMA_TOKO;
  if (footerBrandEl) footerBrandEl.textContent = STORE_CONFIG.NAMA_TOKO;
  if (footerLocEl) footerLocEl.textContent = STORE_CONFIG.KOTA_LOKASI;
  if (footerYearEl) footerYearEl.textContent = String(new Date().getFullYear());
}

function bindGlobalEvents() {
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      state.searchQuery = event.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.hidden = state.searchQuery.length === 0;
      }
      renderProducts();
    });
  }

  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.hidden = true;
      searchInput.focus();
      renderProducts();
    });
  }

  document.addEventListener('click', (event) => {
    const waTrigger = event.target.closest('[data-wa-url]');
    if (waTrigger && !waTrigger.disabled) {
      event.preventDefault();
      const targetUrl = waTrigger.getAttribute('data-wa-url');
      if (!targetUrl) return;

      triggerLogoLoader(400, () => {
        window.location.href = targetUrl;
      });
      return;
    }

    const categoryBtn = event.target.closest('[data-category]');
    if (categoryBtn) {
      const selectedCategory = categoryBtn.getAttribute('data-category');
      if (selectedCategory && selectedCategory !== state.activeCategory) {
        state.activeCategory = selectedCategory;
        renderCategories();
        renderProducts();
      }
      return;
    }

    if (event.target.closest('#reload-catalog-btn')) {
      loadCatalog();
      return;
    }

    if (event.target.closest('#reset-filter-btn')) {
      state.activeCategory = 'Semua';
      state.searchQuery = '';
      if (searchInput) searchInput.value = '';
      if (clearSearchBtn) clearSearchBtn.hidden = true;
      renderCategories();
      renderProducts();
    }
  });

  window.addEventListener('pageshow', () => {
    hideLogoLoader(true);
  });
}

applyStoreBranding();
bindGlobalEvents();
setTimeout(() => hideLogoLoader(false), 300);
loadCatalog();
