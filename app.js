const STORE_CONFIG = {
  name: 'FarmWeb Tech',
  tagline: 'Cepat, Tepat Serta Presisi',
  logoUrl: 'https://res.cloudinary.com/nj31ul1n/image/upload/v1794496879/IMG_1716.jpg',
  domain: 'https://ranting77.store',
  whatsappNumber: '6285119127163',
  city: 'Jakarta, DKI JAKARTA',
  accentColor: '#143A1F'
};

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQf04kdwpUrv4CdAR04Su4IGPaoMXuHElpy3QeLwnhPW6u38lYWrosgxlzAAhdek8fehPpHShjoHLDy/pub?gid=0&single=true&output=csv';

const catalogState = {
  products: [],
  activeCategory: 'Semua',
  searchQuery: ''
};

function createFallbackSvgDataUri(labelText) {
  const cleanLabel = (labelText || 'FT')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || 'FT';

  const safeText = cleanLabel.replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'FT';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#ECFDF5"/><rect x="24" y="24" width="352" height="352" rx="24" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="4"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="96" font-weight="700" fill="#143A1F">${safeText}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function applyImageFallback(imgElement) {
  if (!imgElement || imgElement.dataset.fallbackApplied === 'true') {
    return;
  }
  imgElement.dataset.fallbackApplied = 'true';
  const label = imgElement.dataset.fallbackLabel || imgElement.alt || 'FT';
  imgElement.src = createFallbackSvgDataUri(label);
}

document.addEventListener(
  'error',
  (event) => {
    const target = event.target;
    if (target && target.tagName === 'IMG') {
      applyImageFallback(target);
    }
  },
  true
);

function hideLogoLoader() {
  const loader = document.getElementById('loading-screen');
  if (!loader) {
    return;
  }
  loader.classList.add('is-hidden');
  loader.setAttribute('aria-hidden', 'true');
}

function triggerLogoLoader(durationMs, callback) {
  const loader = document.getElementById('loading-screen');
  if (!loader) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  loader.classList.remove('is-hidden');
  loader.setAttribute('aria-hidden', 'false');

  window.setTimeout(() => {
    hideLogoLoader();
    if (typeof callback === 'function') {
      callback();
    }
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
  const text = String(rawPrice ?? '').trim();
  if (!text) {
    return 'Hubungi Admin';
  }
  const digitsOnly = text.replace(/[^\d]/g, '');
  if (!digitsOnly) {
    return text;
  }
  const numericValue = Number(digitsOnly);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 'Hubungi Admin';
  }
  return `Rp ${numericValue.toLocaleString('id-ID')}`;
}

function parseRFC4180Csv(csvText) {
  const content = String(csvText ?? '').replace(/^\uFEFF/, '');
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1];

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

  return rows.filter((row) => row.some((cell) => cell.trim() !== ''));
}

function mapCsvToProducts(rows) {
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const colIndex = {
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
    const nama = colIndex.nama >= 0 ? (row[colIndex.nama] || '').trim() : '';
    if (!nama) {
      continue;
    }

    const harga = colIndex.harga >= 0 ? (row[colIndex.harga] || '').trim() : '';
    const foto = colIndex.foto >= 0 ? (row[colIndex.foto] || '').trim() : '';
    const deskripsi = colIndex.deskripsi >= 0 ? (row[colIndex.deskripsi] || '').trim() : '';
    const kategoriRaw = colIndex.kategori >= 0 ? (row[colIndex.kategori] || '').trim() : '';
    const tersediaRaw = colIndex.tersedia >= 0 ? (row[colIndex.tersedia] || '').trim() : 'Ya';

    products.push({
      nama,
      harga,
      foto,
      deskripsi,
      kategori: kategoriRaw || 'Umum',
      isAvailable: tersediaRaw.toLowerCase() === 'ya'
    });
  }

  return products;
}

function buildProductWhatsAppUrl(productName) {
  const message = `Halo kak, apakah ${productName} masih tersedia?`;
  return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function buildGeneralWhatsAppUrl() {
  const message = `Halo kak, saya ingin bertanya tentang produk di ${STORE_CONFIG.name}.`;
  return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function renderCategories() {
  const categoryContainer = document.getElementById('category-list');
  if (!categoryContainer) {
    return;
  }

  const uniqueCategories = ['Semua'];
  catalogState.products.forEach((product) => {
    if (product.kategori && !uniqueCategories.includes(product.kategori)) {
      uniqueCategories.push(product.kategori);
    }
  });

  if (!uniqueCategories.includes(catalogState.activeCategory)) {
    catalogState.activeCategory = 'Semua';
  }

  categoryContainer.innerHTML = uniqueCategories
    .map((category) => {
      const isActive = category === catalogState.activeCategory;
      const safeCategory = escapeHtml(category);
      return `<button type="button" role="tab" aria-selected="${isActive}" class="category-pill${isActive ? ' is-active' : ''}" data-category="${safeCategory}">${safeCategory}</button>`;
    })
    .join('');
}

function getFilteredProducts() {
  const keyword = catalogState.searchQuery.trim().toLowerCase();

  return catalogState.products.filter((product) => {
    const matchCategory =
      catalogState.activeCategory === 'Semua' ||
      product.kategori.toLowerCase() === catalogState.activeCategory.toLowerCase();

    if (!matchCategory) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return (
      product.nama.toLowerCase().includes(keyword) ||
      product.deskripsi.toLowerCase().includes(keyword) ||
      product.kategori.toLowerCase().includes(keyword)
    );
  });
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  const statePanel = document.getElementById('state-panel');
  const countLabel = document.getElementById('product-count');

  if (!grid || !statePanel || !countLabel) {
    return;
  }

  const filtered = getFilteredProducts();
  countLabel.textContent = `Menampilkan ${filtered.length} dari ${catalogState.products.length} produk`;

  if (catalogState.products.length === 0) {
    grid.innerHTML = '';
    statePanel.hidden = false;
    statePanel.innerHTML = `
      <h2 class="state-title">Katalog Belum Tersedia</h2>
      <p class="state-desc">Data produk pada etalase masih kosong. Silakan muat ulang atau hubungi admin via WhatsApp.</p>
      <button type="button" class="btn-secondary" data-action="retry">Muat Ulang Katalog</button>
    `;
    return;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    statePanel.hidden = false;
    statePanel.innerHTML = `
      <h2 class="state-title">Produk Tidak Ditemukan</h2>
      <p class="state-desc">Tidak ada produk yang cocok dengan kata kunci atau kategori yang dipilih.</p>
      <button type="button" class="btn-secondary" data-action="reset-filter">Tampilkan Semua Produk</button>
    `;
    return;
  }

  statePanel.hidden = true;
  statePanel.innerHTML = '';

  grid.innerHTML = filtered
    .map((product) => {
      const safeName = escapeHtml(product.nama);
      const safeDesc = escapeHtml(product.deskripsi || 'Produk siap dipesan langsung melalui WhatsApp.');
      const safeCategory = escapeHtml(product.kategori);
      const formattedPrice = escapeHtml(formatRupiah(product.harga));
      const fallbackUri = createFallbackSvgDataUri(product.nama);
      const imageSrc = product.foto ? escapeHtml(product.foto) : fallbackUri;
      const waUrl = escapeHtml(buildProductWhatsAppUrl(product.nama));

      const actionButton = product.isAvailable
        ? `<button type="button" class="btn-order" data-wa-url="${waUrl}">Pesan WhatsApp</button>`
        : `<button type="button" class="btn-order" disabled>Stok Habis</button>`;

      return `
        <article class="product-card">
          <div class="product-media">
            <img
              src="${imageSrc}"
              alt="${safeName}"
              width="400"
              height="400"
              loading="lazy"
              referrerpolicy="no-referrer"
              data-fallback-label="${safeName}"
            >
            <span class="product-badge">${safeCategory}</span>
          </div>
          <div class="product-body">
            <h2 class="product-title">${safeName}</h2>
            <p class="product-desc">${safeDesc}</p>
            <p class="product-price">${formattedPrice}</p>
            ${actionButton}
          </div>
        </article>
      `;
    })
    .join('');
}

function renderErrorState() {
  const grid = document.getElementById('product-grid');
  const statePanel = document.getElementById('state-panel');
  const countLabel = document.getElementById('product-count');

  if (countLabel) {
    countLabel.textContent = 'Gagal memuat katalog';
  }
  if (grid) {
    grid.innerHTML = '';
  }
  if (statePanel) {
    statePanel.hidden = false;
    statePanel.innerHTML = `
      <h2 class="state-title">Koneksi Katalog Terganggu</h2>
      <p class="state-desc">Tidak dapat mengambil data produk terbaru. Periksa koneksi internet Anda lalu coba lagi.</p>
      <button type="button" class="btn-secondary" data-action="retry">Coba Lagi</button>
    `;
  }
}

async function loadCatalog() {
  try {
    const response = await fetch(GOOGLE_SHEET_CSV_URL, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const parsedRows = parseRFC4180Csv(csvText);
    catalogState.products = mapCsvToProducts(parsedRows);

    renderCategories();
    renderProducts();
  } catch (error) {
    renderErrorState();
  }
}

function bindGlobalEvents() {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      catalogState.searchQuery = event.target.value;
      if (searchClear) {
        searchClear.hidden = catalogState.searchQuery.length === 0;
      }
      renderProducts();
    });
  }

  if (searchClear && searchInput) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      catalogState.searchQuery = '';
      searchClear.hidden = true;
      searchInput.focus();
      renderProducts();
    });
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const productWaBtn = target.closest('[data-wa-url]');
    if (productWaBtn && !productWaBtn.hasAttribute('disabled')) {
      const targetUrl = productWaBtn.getAttribute('data-wa-url');
      if (targetUrl) {
        triggerLogoLoader(400, () => {
          window.location.href = targetUrl;
        });
      }
      return;
    }

    const generalWaBtn = target.closest('[data-wa-general]');
    if (generalWaBtn) {
      const targetUrl = buildGeneralWhatsAppUrl();
      triggerLogoLoader(400, () => {
        window.location.href = targetUrl;
      });
      return;
    }

    const categoryBtn = target.closest('[data-category]');
    if (categoryBtn) {
      const selectedCategory = categoryBtn.getAttribute('data-category') || 'Semua';
      catalogState.activeCategory = selectedCategory;
      renderCategories();
      renderProducts();
      return;
    }

    const actionBtn = target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.getAttribute('data-action');
      if (action === 'retry') {
        triggerLogoLoader(400, () => {
          loadCatalog();
        });
      } else if (action === 'reset-filter') {
        catalogState.activeCategory = 'Semua';
        catalogState.searchQuery = '';
        if (searchInput) {
          searchInput.value = '';
        }
        if (searchClear) {
          searchClear.hidden = true;
        }
        renderCategories();
        renderProducts();
      }
    }
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      hideLogoLoader();
    }
  });
}

window.setTimeout(hideLogoLoader, 320);
bindGlobalEvents();
loadCatalog();
