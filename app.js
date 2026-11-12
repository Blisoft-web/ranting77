const STORE_CONFIG = {
  NAMA_TOKO: 'FarmWeb Tech',
  TAGLINE_TOKO: 'Cepat, Tepat Serta Presisi',
  URL_LOGO_TOKO: 'https://i.postimg.cc/fRzDNXYq/IMG-1716.jpg',
  URL_DOMAIN: 'https://ranting77.store',
  NOMOR_WHATSAPP: '6285119127163',
  KOTA_LOKASI: 'Jakarta, DKI JAKARTA'
};

const GOOGLE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQf04kdwpUrv4CdAR04Su4lGPaoMXuHEIpy3QeLwnhPW6u38lYWrosgxIzAAhdek8fehPpHShjoHLDy/pub?gid=0&single=true&output=csv';

const INITIAL_LOADER_MAX_MS = 1500;
const CLICK_LOADER_DURATION_MS = 480;
const FALLBACK_PRODUCT_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Crect width='640' height='480' fill='%23F7F6F2'/%3E%3Crect x='24' y='24' width='592' height='432' fill='none' stroke='%23D8D5CC' stroke-width='2'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='16' fill='%23707772' letter-spacing='3'%3EFARMWEB TECH // KATALOG%3C/text%3E%3C/svg%3E";

const catalogState = {
  products: [],
  activeCategory: 'Semua'
};

let activeLoaderTimeout = null;
let activeHideTimeout = null;

function showLogoLoader() {
  const loaderEl = document.getElementById('loading-screen');
  if (!loaderEl) return;

  if (activeHideTimeout) {
    clearTimeout(activeHideTimeout);
    activeHideTimeout = null;
  }

  loaderEl.classList.remove('is-hidden');
  void loaderEl.offsetWidth;
  loaderEl.classList.remove('is-fading-out');
}

function hideLogoLoader() {
  const loaderEl = document.getElementById('loading-screen');
  if (!loaderEl || loaderEl.classList.contains('is-hidden')) return;

  loaderEl.classList.add('is-fading-out');

  if (activeHideTimeout) {
    clearTimeout(activeHideTimeout);
  }

  activeHideTimeout = setTimeout(() => {
    loaderEl.classList.add('is-hidden');
    activeHideTimeout = null;
  }, 360);
}

function triggerLogoLoader(durationMs = CLICK_LOADER_DURATION_MS, callback) {
  if (activeLoaderTimeout) {
    clearTimeout(activeLoaderTimeout);
    activeLoaderTimeout = null;
  }

  showLogoLoader();

  activeLoaderTimeout = setTimeout(() => {
    activeLoaderTimeout = null;
    hideLogoLoader();
    if (typeof callback === 'function') {
      callback();
    }
  }, durationMs);
}

/* Parses RFC-4180 CSV rows safely, preserving commas and newlines inside quoted cells */
function parseCsvRows(csvText) {
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
      if (char === '\r') {
        i += 1;
      }
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

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function mapCsvToProducts(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.toLowerCase().replace(/\s+/g, ''));

  const findIndex = (candidates) =>
    headers.findIndex((header) => candidates.includes(header));

  const idxNama = findIndex(['nama', 'namaproduk', 'produk', 'name']);
  const idxHarga = findIndex(['harga', 'price', 'nominal']);
  const idxFoto = findIndex(['foto', 'gambar', 'image', 'urlfoto']);
  const idxDeskripsi = findIndex(['deskripsi', 'keterangan', 'description']);
  const idxKategori = findIndex(['kategori', 'category', 'jenis']);
  const idxTersedia = findIndex(['tersedia', 'stok', 'status', 'available']);

  return rows
    .slice(1)
    .map((cells, rowIndex) => {
      const nama = idxNama >= 0 ? cells[idxNama] || '' : '';
      if (!nama) return null;

      const rawHarga = idxHarga >= 0 ? cells[idxHarga] || '0' : '0';
      const foto = idxFoto >= 0 ? cells[idxFoto] || '' : '';
      const deskripsi =
        idxDeskripsi >= 0 && cells[idxDeskripsi]
          ? cells[idxDeskripsi]
          : 'Spesifikasi lengkap tersedia melalui konsultasi langsung bersama tim kami.';
      const kategori =
        idxKategori >= 0 && cells[idxKategori] ? cells[idxKategori] : 'Umum';
      const rawTersedia =
        idxTersedia >= 0 && cells[idxTersedia] ? cells[idxTersedia] : 'Ya';

      return {
        id: `item-${rowIndex + 1}`,
        nama,
        hargaFormatted: formatRupiah(rawHarga),
        foto: isValidHttpUrl(foto) ? foto : FALLBACK_PRODUCT_IMAGE,
        deskripsi,
        kategori,
        tersedia: evaluateAvailability(rawTersedia)
      };
    })
    .filter(Boolean);
}

function isValidHttpUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatRupiah(rawValue) {
  const digitsOnly = String(rawValue).replace(/[^\d]/g, '');
  if (!digitsOnly) {
    return String(rawValue).trim() || 'Hubungi Kami';
  }
  const numericAmount = Number(digitsOnly);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return 'Hubungi Kami';
  }
  return `Rp ${numericAmount.toLocaleString('id-ID')}`;
}

function evaluateAvailability(rawStatus) {
  const normalized = String(rawStatus).trim().toLowerCase();
  const unavailableTokens = ['tidak', 'habis', 'kosong', 'no', 'false', '0', 'sold out'];
  return !unavailableTokens.includes(normalized);
}

function buildWhatsAppOrderUrl(product) {
  const messageLines = [
    `Halo ${STORE_CONFIG.NAMA_TOKO}, saya ingin memesan produk berikut:`,
    '',
    `Produk: ${product.nama}`,
    `Kategori: ${product.kategori}`,
    `Harga: ${product.hargaFormatted}`,
    '',
    'Mohon konfirmasi detail pengerjaan dan langkah selanjutnya.'
  ];
  const encodedMessage = encodeURIComponent(messageLines.join('\n'));
  return `https://wa.me/${STORE_CONFIG.NOMOR_WHATSAPP}?text=${encodedMessage}`;
}

function renderSkeletons(count = 6) {
  const gridEl = document.getElementById('catalog-grid');
  if (!gridEl) return;

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-entry';
    skeleton.setAttribute('aria-hidden', 'true');
    skeleton.innerHTML = `
      <div class="skeleton-block skeleton-media"></div>
      <div class="skeleton-block skeleton-line-sm"></div>
      <div class="skeleton-block skeleton-line-lg"></div>
      <div class="skeleton-block skeleton-line-md"></div>
      <div class="skeleton-block skeleton-btn"></div>
    `;
    fragment.appendChild(skeleton);
  }

  gridEl.replaceChildren(fragment);
}

function showCatalogFeedback(title, description, showRetry = false) {
  const feedbackEl = document.getElementById('catalog-feedback');
  const gridEl = document.getElementById('catalog-grid');
  if (!feedbackEl || !gridEl) return;

  gridEl.replaceChildren();
  feedbackEl.replaceChildren();

  const heading = document.createElement('h3');
  heading.className = 'feedback-title';
  heading.textContent = title;

  const body = document.createElement('p');
  body.className = 'feedback-text';
  body.textContent = description;

  feedbackEl.append(heading, body);

  if (showRetry) {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn-action btn-primary';
    retryBtn.dataset.action = 'reload-catalog';
    retryBtn.textContent = 'Muat Ulang Katalog';
    feedbackEl.appendChild(retryBtn);
  }

  feedbackEl.hidden = false;
}

function hideCatalogFeedback() {
  const feedbackEl = document.getElementById('catalog-feedback');
  if (!feedbackEl) return;
  feedbackEl.hidden = true;
  feedbackEl.replaceChildren();
}

function renderCategoryFilters(products) {
  const filterBar = document.getElementById('category-filters');
  if (!filterBar) return;

  const categories = ['Semua', ...new Set(products.map((item) => item.kategori))];
  const fragment = document.createDocumentFragment();

  categories.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-action filter-tab';
    if (category === catalogState.activeCategory) {
      button.classList.add('is-active');
    }
    button.dataset.category = category;
    button.setAttribute('aria-pressed', String(category === catalogState.activeCategory));
    button.textContent = category;
    fragment.appendChild(button);
  });

  filterBar.replaceChildren(fragment);
}

function renderProducts() {
  const gridEl = document.getElementById('catalog-grid');
  const counterEl = document.getElementById('catalog-counter');
  if (!gridEl) return;

  const filteredProducts =
    catalogState.activeCategory === 'Semua'
      ? catalogState.products
      : catalogState.products.filter(
          (item) => item.kategori === catalogState.activeCategory
        );

  if (counterEl) {
    counterEl.textContent = `MENAMPILKAN ${filteredProducts.length} DARI ${catalogState.products.length} ITEM`;
  }

  if (filteredProducts.length === 0) {
    showCatalogFeedback(
      'Tidak Ada Item pada Kategori Ini',
      'Pilih kategori lain atau tampilkan seluruh daftar katalog yang tersedia.',
      false
    );
    return;
  }

  hideCatalogFeedback();
  const fragment = document.createDocumentFragment();

  filteredProducts.forEach((product) => {
    const article = document.createElement('article');
    article.className = product.tersedia ? 'product-entry' : 'product-entry is-sold-out';

    const mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'product-media';

    const img = document.createElement('img');
    img.className = 'product-image';
    img.src = product.foto;
    img.alt = product.nama;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      if (img.src !== FALLBACK_PRODUCT_IMAGE) {
        img.src = FALLBACK_PRODUCT_IMAGE;
      }
    });
    mediaWrapper.appendChild(img);

    if (!product.tersedia) {
      const stamp = document.createElement('span');
      stamp.className = 'sold-out-stamp';
      stamp.textContent = 'Stok Habis';
      mediaWrapper.appendChild(stamp);
    }

    const metaStrip = document.createElement('div');
    metaStrip.className = 'product-meta-strip';

    const categoryLabel = document.createElement('span');
    categoryLabel.textContent = `KAT: ${product.kategori}`;

    const stockLabel = document.createElement('span');
    stockLabel.className = product.tersedia
      ? 'product-status-ready'
      : 'product-status-empty';
    stockLabel.textContent = product.tersedia ? 'TERSEDIA' : 'STOK HABIS';

    metaStrip.append(categoryLabel, stockLabel);

    const title = document.createElement('h3');
    title.className = 'product-title';
    title.textContent = product.nama;

    const description = document.createElement('p');
    description.className = 'product-description';
    description.textContent = product.deskripsi;

    const footer = document.createElement('div');
    footer.className = 'product-footer';

    const priceRow = document.createElement('div');
    priceRow.className = 'product-price-row';

    const priceLabel = document.createElement('span');
    priceLabel.className = 'price-label';
    priceLabel.textContent = 'HARGA';

    const priceValue = document.createElement('span');
    priceValue.className = 'product-price';
    priceValue.textContent = product.hargaFormatted;

    priceRow.append(priceLabel, priceValue);
    footer.appendChild(priceRow);

    if (product.tersedia) {
      const orderLink = document.createElement('a');
      orderLink.href = buildWhatsAppOrderUrl(product);
      orderLink.target = '_blank';
      orderLink.rel = 'noopener noreferrer';
      orderLink.className = 'btn-action btn-primary btn-order';
      orderLink.textContent = 'Pesan via WhatsApp';
      footer.appendChild(orderLink);
    } else {
      const soldOutButton = document.createElement('button');
      soldOutButton.type = 'button';
      soldOutButton.disabled = true;
      soldOutButton.className = 'btn-action btn-order';
      soldOutButton.textContent = 'Stok Habis';
      footer.appendChild(soldOutButton);
    }

    article.append(mediaWrapper, metaStrip, title, description, footer);
    fragment.appendChild(article);
  });

  gridEl.replaceChildren(fragment);
}

async function fetchAndRenderCatalog(isInitialBoot = false) {
  const counterEl = document.getElementById('catalog-counter');
  if (counterEl) {
    counterEl.textContent = 'MENYINKRONKAN DATA...';
  }

  hideCatalogFeedback();
  renderSkeletons(6);

  let initialMaxTimer = null;
  if (isInitialBoot) {
    initialMaxTimer = setTimeout(() => {
      hideLogoLoader();
    }, INITIAL_LOADER_MAX_MS);
  }

  try {
    const response = await fetch(GOOGLE_SHEET_CSV_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const parsedProducts = mapCsvToProducts(csvText);

    catalogState.products = parsedProducts;
    catalogState.activeCategory = 'Semua';

    if (parsedProducts.length === 0) {
      if (counterEl) counterEl.textContent = '0 ITEM TERDATA';
      renderCategoryFilters([]);
      showCatalogFeedback(
        'Katalog Belum Memiliki Data',
        'Lembar kerja Google Sheets terhubung, namun belum ada baris produk yang dipublikasikan.',
        true
      );
    } else {
      renderCategoryFilters(parsedProducts);
      renderProducts();
    }
  } catch {
    if (counterEl) counterEl.textContent = 'KONEKSI TERGANGGU';
    showCatalogFeedback(
      'Gagal Memuat Data Katalog',
      'Koneksi ke lembar kerja Google Sheets tidak merespons. Periksa jaringan Anda lalu muat ulang katalog.',
      true
    );
  } finally {
    if (isInitialBoot) {
      if (initialMaxTimer) clearTimeout(initialMaxTimer);
      hideLogoLoader();
    }
  }
}

function executeAnchorNavigation(anchorEl) {
  const href = anchorEl.getAttribute('href');
  if (!href) return;

  if (href.startsWith('#')) {
    const targetSection = document.querySelector(href);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }

  if (anchorEl.target === '_blank') {
    const openedWindow = window.open(href, '_blank', 'noopener,noreferrer');
    if (!openedWindow) {
      window.location.assign(href);
    }
    return;
  }

  window.location.assign(href);
}

function registerGlobalInteractionLoader() {
  document.addEventListener('click', (event) => {
    const triggerEl = event.target.closest('button, a, .btn-action');
    if (!triggerEl) return;

    if (
      triggerEl.disabled ||
      triggerEl.getAttribute('aria-disabled') === 'true'
    ) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    triggerLogoLoader(CLICK_LOADER_DURATION_MS, () => {
      if (triggerEl.dataset.category) {
        catalogState.activeCategory = triggerEl.dataset.category;
        renderCategoryFilters(catalogState.products);
        renderProducts();
        return;
      }

      if (triggerEl.dataset.action === 'reload-catalog') {
        fetchAndRenderCatalog(false);
        return;
      }

      if (triggerEl.tagName === 'A') {
        executeAnchorNavigation(triggerEl);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  registerGlobalInteractionLoader();
  fetchAndRenderCatalog(true);
});
