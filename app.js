const STORE_CONFIG = {
  name: 'FarmWeb Tech',
  tagline: 'Cepat, Tepat Serta Presisi',
  logoUrl: 'https://res.cloudinary.com/nj31ul1n/image/upload/f_auto,q_auto,w_200/v1794496879/IMG_1716.jpg',
  domain: 'https://ranting77.store',
  whatsappNumber: '6285119127163',
  location: 'Jakarta, DKI JAKARTA',
  initials: 'FW'
};

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQf04kdwpUrv4CdAR04Su4lGPaoMXuHEIpy3QeLwnhPW6u38lYWrosgxIzAAhdek8fehPpHShjoHLDy/pub?gid=0&single=true&output=csv';

const catalogState = {
  products: [],
  categories: ['Semua'],
  selectedCategory: 'Semua',
  searchQuery: '',
  isLoading: false,
  hasError: false
};

let activeLoaderTimer = null;

function showLogoLoader() {
  const loader = document.getElementById('loading-screen');
  if (!loader) return;
  loader.classList.remove('hidden');
  loader.style.display = 'flex';
  loader.style.visibility = 'visible';
  void loader.offsetWidth;
  loader.style.opacity = '1';
}

function hideLogoLoader() {
  const loader = document.getElementById('loading-screen');
  if (!loader) return;
  loader.style.opacity = '0';
  loader.style.visibility = 'hidden';
  loader.style.display = 'none';
  loader.classList.add('hidden');
}

function replaceBrokenImageWithFallback(imgElement) {
  if (!imgElement || !imgElement.parentNode) return;

  const fallback = document.createElement('div');
  fallback.setAttribute('aria-hidden', 'true');

  if (imgElement.closest('#loading-screen')) {
    fallback.className = 'loader-logo-fallback';
    fallback.textContent = STORE_CONFIG.initials;
  } else if (imgElement.classList.contains('store-logo')) {
    fallback.className = 'store-logo-fallback';
    fallback.textContent = STORE_CONFIG.initials;
  } else {
    fallback.className = 'product-img-fallback';
    fallback.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg><span>Foto Produk</span>';
  }

  imgElement.parentNode.replaceChild(fallback, imgElement);
}

function resolveOptimizedImageUrl(rawUrl, width = 400) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';

  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/')) {
    const segments = trimmed.split('/upload/');
    const afterUpload = segments[1] || '';
    const firstSegment = afterUpload.split('/')[0] || '';
    const hasTransform = /(^|,)(f_|q_|w_|h_|c_|dpr_)/.test(firstSegment);
    if (!hasTransform) {
      return `${segments[0]}/upload/f_auto,q_auto,w_${width}/${afterUpload}`;
    }
    return trimmed;
  }

  if (trimmed.includes('drive.google.com')) {
    const pathMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const paramMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileId = (pathMatch && pathMatch[1]) || (paramMatch && paramMatch[1]);
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  return trimmed;
}

function formatRupiahPrice(rawPrice) {
  const text = String(rawPrice || '').trim();
  if (!text) return 'Hubungi Admin';

  const withoutDecimal = text.replace(/[.,]\d{2}$/, '');
  const numericDigits = withoutDecimal.replace(/[^\d]/g, '');
  if (!numericDigits) return 'Hubungi Admin';

  const numericValue = Number(numericDigits);
  if (Number.isNaN(numericValue)) return 'Hubungi Admin';

  return `Rp ${numericValue.toLocaleString('id-ID')}`;
}

function buildWhatsAppOrderUrl(productName) {
  const cleanName = String(productName || '').trim();
  const message = `Halo kak, apakah ${cleanName} masih tersedia?`;
  return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseRfc4180Csv(csvText) {
  const normalized = String(csvText || '').replace(/^\uFEFF/, '');
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

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

  const nonEmptyRows = rows.filter((row) => row.some((cell) => cell.trim() !== ''));
  if (nonEmptyRows.length < 2) return [];

  const headers = nonEmptyRows[0].map((header) => header.trim().toLowerCase());
  const nameIdx = headers.indexOf('nama');
  const priceIdx = headers.indexOf('harga');
  const photoIdx = headers.indexOf('foto');
  const descIdx = headers.indexOf('deskripsi');
  const categoryIdx = headers.indexOf('kategori');
  const stockIdx = headers.indexOf('tersedia');

  if (nameIdx === -1) return [];

  const parsedProducts = [];

  for (let r = 1; r < nonEmptyRows.length; r += 1) {
    const row = nonEmptyRows[r];
    const name = (row[nameIdx] || '').trim();
    if (!name) continue;

    const rawPrice = priceIdx !== -1 ? (row[priceIdx] || '').trim() : '';
    const rawPhoto = photoIdx !== -1 ? (row[photoIdx] || '').trim() : '';
    const description = descIdx !== -1 ? (row[descIdx] || '').trim() : '';
    const rawCategory = categoryIdx !== -1 ? (row[categoryIdx] || '').trim() : '';
    const rawStock = stockIdx !== -1 ? (row[stockIdx] || '').trim() : 'Ya';

    parsedProducts.push({
      id: `item-${r}`,
      name,
      priceFormatted: formatRupiahPrice(rawPrice),
      photoUrl: resolveOptimizedImageUrl(rawPhoto, 400),
      description,
      category: rawCategory || 'Umum',
      isAvailable: rawStock.toLowerCase() === 'ya'
    });
  }

  return parsedProducts;
}

function waitMs(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
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

      const text = await response.text();
      if (/^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) {
        throw new Error('Invalid CSV payload');
      }

      return text;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await waitMs(retryDelayMs);
      }
    }
  }

  throw lastError || new Error('Gagal memuat data katalog');
}

function renderSkeletonCards(count = 8) {
  const grid = document.getElementById('product-grid');
  const feedback = document.getElementById('catalog-feedback');
  if (!grid) return;

  if (feedback) {
    feedback.hidden = true;
    feedback.innerHTML = '';
  }

  const cards = [];
  for (let i = 0; i < count; i += 1) {
    cards.push(
      '<div class="skeleton-card" aria-hidden="true">' +
        '<div class="skeleton-box skeleton-media"></div>' +
        '<div class="skeleton-content">' +
          '<div class="skeleton-box skeleton-line short"></div>' +
          '<div class="skeleton-box skeleton-line"></div>' +
          '<div class="skeleton-box skeleton-line medium"></div>' +
          '<div class="skeleton-box skeleton-btn"></div>' +
        '</div>' +
      '</div>'
    );
  }

  grid.innerHTML = cards.join('');
}

function renderCategoryPills() {
  const container = document.getElementById('category-list');
  if (!container) return;

  container.innerHTML = catalogState.categories
    .map((category) => {
      const isActive = category === catalogState.selectedCategory;
      const activeClass = isActive ? ' active' : '';
      return `<button type="button" class="category-pill${activeClass}" role="tab" aria-selected="${isActive}" data-action="filter-category" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`;
    })
    .join('');
}

function getFilteredProducts() {
  const query = catalogState.searchQuery.trim().toLowerCase();

  return catalogState.products.filter((product) => {
    const matchesCategory =
      catalogState.selectedCategory === 'Semua' ||
      product.category.toLowerCase() === catalogState.selectedCategory.toLowerCase();

    if (!matchesCategory) return false;
    if (!query) return true;

    return (
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  });
}

function renderProductCatalog() {
  const grid = document.getElementById('product-grid');
  const feedback = document.getElementById('catalog-feedback');
  const statusEl = document.getElementById('catalog-status');
  if (!grid || !feedback || !statusEl) return;

  if (catalogState.hasError) {
    grid.innerHTML = '';
    statusEl.textContent = 'Koneksi ke katalog terganggu';
    feedback.hidden = false;
    feedback.innerHTML =
      '<h2 class="feedback-title">Katalog Belum Dapat Dimuat</h2>' +
      '<p class="feedback-text">Periksa koneksi internet Anda lalu coba muat ulang daftar produk.</p>' +
      '<button type="button" class="btn-secondary" data-action="reload-catalog">Muat Ulang Katalog</button>';
    return;
  }

  const filtered = getFilteredProducts();

  if (catalogState.products.length === 0) {
    grid.innerHTML = '';
    statusEl.textContent = '0 produk tersedia';
    feedback.hidden = false;
    feedback.innerHTML =
      '<h2 class="feedback-title">Belum Ada Produk</h2>' +
      '<p class="feedback-text">Daftar produk saat ini masih kosong. Silakan muat ulang beberapa saat lagi.</p>' +
      '<button type="button" class="btn-secondary" data-action="reload-catalog">Muat Ulang Katalog</button>';
    return;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    statusEl.textContent = '0 produk ditemukan';
    feedback.hidden = false;
    feedback.innerHTML =
      '<h2 class="feedback-title">Produk Tidak Ditemukan</h2>' +
      '<p class="feedback-text">Coba gunakan kata kunci lain atau tampilkan semua kategori produk.</p>' +
      '<button type="button" class="btn-secondary" data-action="reset-filters">Reset Pencarian</button>';
    return;
  }

  feedback.hidden = true;
  feedback.innerHTML = '';
  statusEl.textContent = `Menampilkan ${filtered.length} dari ${catalogState.products.length} produk`;

  const waSvg =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.59 5.96L0 24l6.31-1.65a11.88 11.88 0 0 0 5.75 1.47h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.17-3.44-8.44zM12.07 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.85 9.85 0 0 1-1.51-5.27c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.13 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 7c0 5.46-4.44 9.89-9.9 9.89zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"></path>' +
    '</svg>';

  grid.innerHTML = filtered
    .map((product) => {
      const safeName = escapeHtml(product.name);
      const safeDesc = escapeHtml(product.description);
      const safeCategory = escapeHtml(product.category);
      const safePrice = escapeHtml(product.priceFormatted);

      const mediaMarkup = product.photoUrl
        ? `<img src="${escapeHtml(product.photoUrl)}" alt="${safeName}" width="300" height="300" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
        : '<div class="product-img-fallback" aria-hidden="true"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg><span>Foto Produk</span></div>';

      const stockBadge = product.isAvailable
        ? '<span class="stock-badge is-available">Tersedia</span>'
        : '<span class="stock-badge is-unavailable">Habis</span>';

      const actionButton = product.isAvailable
        ? `<button type="button" class="btn-wa" data-wa-url="${escapeHtml(buildWhatsAppOrderUrl(product.name))}">${waSvg}<span>Pesan via WhatsApp</span></button>`
        : '<button type="button" class="btn-wa is-disabled" disabled>Stok Habis</button>';

      const descriptionMarkup = safeDesc ? `<p class="product-desc">${safeDesc}</p>` : '';

      return (
        '<article class="product-card">' +
          '<div class="product-media">' +
            mediaMarkup +
            stockBadge +
          '</div>' +
          '<div class="product-body">' +
            `<p class="product-category">${safeCategory}</p>` +
            `<h2 class="product-title">${safeName}</h2>` +
            descriptionMarkup +
            '<div class="product-footer">' +
              `<p class="product-price">${safePrice}</p>` +
              actionButton +
            '</div>' +
          '</div>' +
        '</article>'
      );
    })
    .join('');
}

async function loadCatalogData() {
  if (catalogState.isLoading) return;
  catalogState.isLoading = true;
  catalogState.hasError = false;

  const statusEl = document.getElementById('catalog-status');
  if (statusEl) {
    statusEl.textContent = 'Memuat katalog...';
  }

  renderSkeletonCards(8);

  try {
    const csvText = await fetchCsvWithRetry(GOOGLE_SHEET_CSV_URL, 2, 600);
    const products = parseRfc4180Csv(csvText);

    const uniqueCategories = new Set(['Semua']);
    products.forEach((product) => {
      if (product.category) {
        uniqueCategories.add(product.category);
      }
    });

    catalogState.products = products;
    catalogState.categories = Array.from(uniqueCategories);

    if (!catalogState.categories.includes(catalogState.selectedCategory)) {
      catalogState.selectedCategory = 'Semua';
    }

    renderCategoryPills();
    renderProductCatalog();
  } catch (error) {
    catalogState.hasError = true;
    renderProductCatalog();
  } finally {
    catalogState.isLoading = false;
  }
}

function resetSearchAndFilters() {
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search-btn');

  catalogState.searchQuery = '';
  catalogState.selectedCategory = 'Semua';

  if (searchInput) searchInput.value = '';
  if (clearBtn) clearBtn.hidden = true;

  renderCategoryPills();
  renderProductCatalog();
}

function handleInternalButtonAction(trigger, href) {
  const action = trigger.getAttribute('data-action');

  if (action === 'filter-category') {
    const nextCategory = trigger.getAttribute('data-category') || 'Semua';
    catalogState.selectedCategory = nextCategory;
    renderCategoryPills();
    renderProductCatalog();
    return;
  }

  if (action === 'reload-catalog') {
    loadCatalogData();
    return;
  }

  if (action === 'reset-filters') {
    resetSearchAndFilters();
    return;
  }

  if (action === 'clear-search') {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    catalogState.searchQuery = '';
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.hidden = true;
    renderProductCatalog();
    return;
  }

  if (href && href.startsWith('#')) {
    const targetSection = document.querySelector(href);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

document.addEventListener(
  'error',
  (event) => {
    const target = event.target;
    if (target && target.tagName === 'IMG') {
      replaceBrokenImageWithFallback(target);
    }
  },
  true
);

document.addEventListener('click', (event) => {
  if (event.target.closest('#loading-screen')) return;

  const trigger = event.target.closest('button:not([disabled]), a[href], [data-wa-url]');
  if (!trigger) return;

  const waUrl = trigger.getAttribute('data-wa-url');
  const href = trigger.getAttribute('href') || '';
  const isExternalUrl = Boolean(waUrl) || /^https?:\/\//i.test(href) || href.includes('wa.me');

  if (isExternalUrl) {
    const targetUrl = waUrl || href;
    if (!targetUrl) return;
    event.preventDefault();

    if (activeLoaderTimer) clearTimeout(activeLoaderTimer);
    showLogoLoader();

    activeLoaderTimer = setTimeout(() => {
      window.location.href = targetUrl;
    }, 420);
    return;
  }

  if (href.startsWith('#')) {
    event.preventDefault();
  }

  if (activeLoaderTimer) clearTimeout(activeLoaderTimer);
  showLogoLoader();

  activeLoaderTimer = setTimeout(() => {
    handleInternalButtonAction(trigger, href);
    hideLogoLoader();
  }, 300);
});

window.addEventListener('pageshow', () => {
  if (activeLoaderTimer) {
    clearTimeout(activeLoaderTimer);
    activeLoaderTimer = null;
  }
  hideLogoLoader();
});

function initializeCatalogApp() {
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      catalogState.searchQuery = event.target.value;
      if (clearBtn) {
        clearBtn.hidden = catalogState.searchQuery.trim().length === 0;
      }
      renderProductCatalog();
    });
  }

  loadCatalogData();

  setTimeout(() => {
    hideLogoLoader();
  }, 300);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCatalogApp);
} else {
  initializeCatalogApp();
}
