/* ========================================
   酒ログ - app.js
   日本酒記録アプリのメインロジック
   年別アコーディオン / フィルター / お気に入り等追加
   ======================================== */

(function () {
  'use strict';

  // --- App Version ---
  const APP_VERSION = 'v1.4.7';

  // --- Storage Key ---
  const STORAGE_KEY = 'sake_log_records';

  // --- DOM Elements ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const screenForm = document.getElementById('screen-form');
  const screenList = document.getElementById('screen-list');
  const sakeForm = document.getElementById('sake-form');
  const sakeName = document.getElementById('sake-name');
  const photoInput = document.getElementById('photo-input');
  const photoGrid = document.getElementById('photo-grid');
  const photoAddBtn = document.getElementById('photo-add-btn');
  const photoCount = document.getElementById('photo-count');
  const tempGroup = document.getElementById('temp-group');
  const ratingGroup = document.getElementById('rating-group');
  const memoEl = document.getElementById('memo');
  const sakeUrl = document.getElementById('sake-url');
  const recordDate = document.getElementById('record-date');
  const recordCountEl = document.getElementById('record-count');
  const emptyState = document.getElementById('empty-state');
  const accordionContainer = document.getElementById('accordion-container');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');
  const modalClose = document.getElementById('modal-close');
  const dataMgmtBtn = document.getElementById('data-mgmt-btn');
  const dataModalOverlay = document.getElementById('data-modal-overlay');
  const dataModalClose = document.getElementById('data-modal-close');
  const exportBtn = document.getElementById('export-btn');
  const importInput = document.getElementById('import-input');
  const toast = document.getElementById('toast');
  const saveBtn = document.getElementById('save-btn');
  
  // Tags & Filters
  const favToggle = document.getElementById('fav-toggle');
  const favHeart = document.getElementById('fav-heart');
  const sakuraToggle = document.getElementById('sakura-toggle');
  const yamaguchiToggle = document.getElementById('yamaguchi-toggle');

  const filterFavBtn = document.getElementById('filter-fav');
  const filterSakuraBtn = document.getElementById('filter-sakura');
  const filterYamaguchiBtn = document.getElementById('filter-yamaguchi');

  // v1.1.7 Search & Advanced Filters
  const filterKeyword = document.getElementById('filter-keyword');
  const filterExpandBtn = document.getElementById('filter-expand-btn');
  const advancedPanel = document.getElementById('advanced-filter-panel');
  const yearAllBtn = document.getElementById('year-all-btn');
  const yearSelect = document.getElementById('year-select');
  const monthAllBtn = document.getElementById('month-all-btn');
  const monthSelect = document.getElementById('month-select');
  const ratingFilterGroup = document.getElementById('filter-rating-group');
  const filterResetBtn = document.getElementById('filter-reset-btn');
  const filterInlineResetBtn = document.getElementById('filter-inline-reset-btn');
  const searchSubmit = document.getElementById('search-submit');

  // --- State ---
  let photos = [];
  let selectedTemp = '';
  let selectedRating = 0;
  let editingId = null;
  let isFavorite = false;
  let isSakura = false;
  let isYamaguchi = false;
  let filterFavActive = false;
  let filterSakuraActive = false;
  let filterYamaguchiActive = false;

  // v1.1.7 Filter State
  let selectedYear = 'all';
  let selectedMonth = 'all';
  let selectedMinRating = 0;

  // --- Init ---
  async function init() {
    setDefaultDate();
    bindEvents();
    await migrateFromLocalStorage();
    await renderList();
  }

  function setDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    recordDate.value = `${yyyy}-${mm}-${dd}`;
  }

  // --- Events ---
  function bindEvents() {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    photoInput.addEventListener('change', handlePhotoSelect);

    tempGroup.querySelectorAll('.temp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tempGroup.querySelectorAll('.temp-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedTemp = btn.dataset.value;
      });
    });

    // --- Rating Stars ---
    ratingGroup.querySelectorAll('.rating-star').forEach(star => {
      star.addEventListener('click', () => {
        const value = parseInt(star.dataset.value);
        selectedRating = value;
        ratingGroup.querySelectorAll('.rating-star').forEach((s, i) => {
          s.classList.toggle('active', i < value);
        });
      });
    });

    // --- Special Toggles ---
    favToggle.addEventListener('click', () => {
      isFavorite = !isFavorite;
      favHeart.textContent = isFavorite ? '❤️' : '🤍';
      favToggle.classList.toggle('active', isFavorite);
    });
    sakuraToggle.addEventListener('click', () => {
      isSakura = !isSakura;
      sakuraToggle.classList.toggle('active', isSakura);
    });
    yamaguchiToggle.addEventListener('click', () => {
      isYamaguchi = !isYamaguchi;
      yamaguchiToggle.classList.toggle('active', isYamaguchi);
    });

    sakeForm.addEventListener('submit', handleSubmit);

    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // --- Data Management ---
    dataMgmtBtn.addEventListener('click', () => {
      dataModalOverlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    });
    dataModalClose.addEventListener('click', closeDataModal);
    dataModalOverlay.addEventListener('click', (e) => {
      if (e.target === dataModalOverlay) closeDataModal();
    });
    exportBtn.addEventListener('click', exportData);
    importInput.addEventListener('change', importData);

    // --- Search & Advanced Filters (v1.1.7) ---
    searchSubmit.addEventListener('click', async () => {
      await renderList();
    });

    filterKeyword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        renderList();
        filterKeyword.blur(); // Hide keyboard on mobile
      }
    });

    filterExpandBtn.addEventListener('click', () => {
      const isOpen = advancedPanel.classList.toggle('show');
      filterExpandBtn.classList.toggle('active', isOpen);
    });

    // --- Year / Month (Select + "All" button) ---
    if (yearAllBtn && yearSelect) {
      yearAllBtn.addEventListener('click', () => {
        selectedYear = 'all';
        yearAllBtn.classList.add('active');
        yearSelect.value = '';
        renderList();
      });

      yearSelect.addEventListener('change', () => {
        const val = (yearSelect.value || '').trim();
        if (!val) return;
        selectedYear = val;
        yearAllBtn.classList.remove('active');
        renderList();
      });
    }

    if (monthAllBtn && monthSelect) {
      monthAllBtn.addEventListener('click', () => {
        selectedMonth = 'all';
        monthAllBtn.classList.add('active');
        monthSelect.value = '';
        renderList();
      });

      monthSelect.addEventListener('change', () => {
        const val = (monthSelect.value || '').trim();
        if (!val) return;
        selectedMonth = val;
        monthAllBtn.classList.remove('active');
        renderList();
      });
    }

    ratingFilterGroup.querySelectorAll('.rating-filter-chip, .rating-star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.rating, 10);
        selectedMinRating = val;
        
        // Update UI
        ratingFilterGroup.querySelector('.rating-filter-chip').classList.toggle('active', val === 0);
        ratingFilterGroup.querySelectorAll('.rating-star-btn').forEach((star, i) => {
          star.classList.toggle('active', i < val);
        });
        renderList();
      });
    });

    filterResetBtn.addEventListener('click', () => {
      advancedPanel.classList.remove('show');
      filterExpandBtn.classList.remove('active');
    });
    if (filterInlineResetBtn) filterInlineResetBtn.addEventListener('click', resetAllFilters);

    document.getElementById('guide-toggle-btn').addEventListener('click', () => {
      const steps = document.getElementById('guide-steps');
      const btn = document.getElementById('guide-toggle-btn');
      const isOpen = steps.classList.toggle('open');
      btn.textContent = isOpen ? '▲ 閉じる' : '📱 機種変更の流れを見る';
    });

    document.getElementById('changelog-btn').addEventListener('click', async () => {
      try {
        const response = await fetch('./changelog.json');
        if (!response.ok) throw new Error('Failed to fetch');
        const changelog = await response.json();
        const currentVersion = APP_VERSION;
        if (!changelog[currentVersion]) {
          showToast('⚠️ バージョン情報が見つかりません');
          return;
        }
        showUpdateModal(currentVersion, changelog[currentVersion]);
      } catch (error) {
        console.error('Changelog error:', error);
        showToast('⚠️ 更新履歴の読み込みに失敗しました');
      }
    });

    // --- Filters ---

    filterFavBtn.addEventListener('click', async () => {
      filterFavActive = !filterFavActive;
      filterFavBtn.classList.toggle('active', filterFavActive);
      document.getElementById('filter-fav-icon').textContent = filterFavActive ? '❤️' : '🤍';
      await renderList();
    });
    filterSakuraBtn.addEventListener('click', async () => {
      filterSakuraActive = !filterSakuraActive;
      filterSakuraBtn.classList.toggle('active', filterSakuraActive);
      await renderList();
    });
    filterYamaguchiBtn.addEventListener('click', async () => {
      filterYamaguchiActive = !filterYamaguchiActive;
      filterYamaguchiBtn.classList.toggle('active', filterYamaguchiActive);
      await renderList();
    });
  }

  // --- Tab Switching ---
  async function switchTab(tab) {
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    if (tab === 'form') {
      screenForm.classList.add('active');
      screenList.classList.remove('active');
    } else {
      screenForm.classList.remove('active');
      screenList.classList.add('active');
      await renderList();
    }
  }

  // --- Photo Handling ---
  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files);
    const toProcess = files.slice(0, 5 - photos.length);
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => resizeImage(ev.target.result, 800, r => { photos.push(r); renderPhotos(); });
      reader.readAsDataURL(file);
    });
    photoInput.value = '';
  }

  function resizeImage(dataUrl, maxSize, callback) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = dataUrl;
  }

  function renderPhotos() {
    photoGrid.innerHTML = '';
    photos.forEach((src, i) => {
      const item = document.createElement('div');
      item.className = 'photo-item';
      item.innerHTML = `<img src="${src}"><button type="button" class="photo-remove">✕</button>`;
      item.querySelector('.photo-remove').addEventListener('click', (e) => { e.stopPropagation(); photos.splice(i, 1); renderPhotos(); });
      photoGrid.appendChild(item);
    });
    photoCount.textContent = `${photos.length} / 5 枚`;
    photoAddBtn.classList.toggle('hidden', photos.length >= 5);
  }

  // --- Form Submit ---
  async function handleSubmit(e) {
    e.preventDefault();
    const name = sakeName.value.trim();
    const url = sakeUrl.value.trim();
    if (!name) { showToast('⚠️ 銘柄名を入力してください'); return; }
    const tasteTags = Array.from(document.querySelectorAll('#taste-tags input:checked')).map(cb => cb.value);

    if (editingId) {
      await updateRecord(editingId, {
        name, photos: [...photos], temp: selectedTemp, rating: selectedRating, tags: tasteTags,
        memo: memoEl.value.trim(), url: url, date: recordDate.value,
        favorite: isFavorite, sakura: isSakura, yamaguchi: isYamaguchi
      });
      editingId = null;
      saveBtn.innerHTML = '<span class="save-icon">💾</span> この記録を保存する';
      resetForm();
      showToast('✏️ 記録を更新しました！');
    } else {
      await saveRecord({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name, photos: [...photos], temp: selectedTemp, rating: selectedRating, tags: tasteTags,
        memo: memoEl.value.trim(), url: url, date: recordDate.value,
        favorite: isFavorite, sakura: isSakura, yamaguchi: isYamaguchi, 
        createdAt: new Date().toISOString()
      });
      resetForm();
      showToast('🍓 記録を保存しました！');
    }
    await switchTab('list');
  }

  function resetForm() {
    sakeForm.reset();
    photos = []; selectedTemp = ''; selectedRating = 0; editingId = null;
    isFavorite = isSakura = isYamaguchi = false;
    renderPhotos();
    tempGroup.querySelectorAll('.temp-btn').forEach(b => b.classList.remove('selected'));
    ratingGroup.querySelectorAll('.rating-star').forEach(s => s.classList.remove('active'));
    
    favHeart.textContent = '🤍';
    favToggle.classList.remove('active');
    sakuraToggle.classList.remove('active');
    yamaguchiToggle.classList.remove('active');
    saveBtn.innerHTML = '<span class="save-icon">💾</span> この記録を保存する';
    setDefaultDate();
  }

  async function startEdit(id) {
    const records = await getRecords();
    const r = records.find(rec => rec.id === id);
    if (!r) return;
    closeModal();
    editingId = id;
    sakeName.value = r.name;
    sakeUrl.value = r.url || '';
    photos = [...(r.photos || [])]; renderPhotos();
    selectedTemp = r.temp || '';
    selectedRating = r.rating || 0;
    tempGroup.querySelectorAll('.temp-btn').forEach(b => b.classList.toggle('selected', b.dataset.value === selectedTemp));
    ratingGroup.querySelectorAll('.rating-star').forEach((s, i) => s.classList.toggle('active', i < selectedRating));
    document.querySelectorAll('#taste-tags input[type="checkbox"]').forEach(cb => cb.checked = (r.tags || []).includes(cb.value));
    memoEl.value = r.memo || '';
    recordDate.value = r.date || '';

    isFavorite = !!r.favorite;
    isSakura = !!r.sakura;
    isYamaguchi = !!r.yamaguchi;

    favHeart.textContent = isFavorite ? '❤️' : '🤍';
    favToggle.classList.toggle('active', isFavorite);
    sakuraToggle.classList.toggle('active', isSakura);
    yamaguchiToggle.classList.toggle('active', isYamaguchi);
    
    saveBtn.innerHTML = '<span class="save-icon">✏️</span> この記録を更新する';
    await switchTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Storage (IndexedDB) ---
  const DB_NAME = 'SakeLogDB';
  const STORE_NAME = 'records';
  const DB_VERSION = 1;
  let dbPromise = null;

  function initDB() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = e => { resolve(e.target.result); };
        req.onerror = e => reject(e.target.error);
      });
    }
    return dbPromise;
  }

  async function migrateFromLocalStorage() {
    const localData = localStorage.getItem(STORAGE_KEY);
    if (!localData) return;
    try {
      const records = JSON.parse(localData);
      if (Array.isArray(records) && records.length > 0) {
        const db = await initDB();
        const count = await new Promise((res, rej) => {
          const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).count();
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });
        
        if (count === 0) {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          records.forEach(r => store.put(r));
          await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
          localStorage.removeItem(STORAGE_KEY); // Only remove if successfully migrated
          console.log('Migration successful: localStorage cleaned.');
        } else {
          console.warn('Migration skipped: target IndexedDB is not empty.');
        }
      } else {
        localStorage.removeItem(STORAGE_KEY); // Local was empty/invalid
      }
    } catch (e) {
      console.error('Migration error:', e);
    }
  }

  async function getRecords() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => {
          const dateA = a.date || '';
          const dateB = b.date || '';
          if (dateA === dateB) return (b.createdAt || '').localeCompare(a.createdAt || '');
          return dateB.localeCompare(dateA);
        });
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function saveRecord(record) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function updateRecord(id, data) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) store.put({ ...req.result, ...data });
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function deleteRecord(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = async () => { await renderList(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function clearAllRecords() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  function hasActiveListFilters() {
    return (
      (filterKeyword && filterKeyword.value.trim() !== '') ||
      selectedYear !== 'all' ||
      selectedMonth !== 'all' ||
      selectedMinRating > 0 ||
      filterFavActive ||
      filterSakuraActive ||
      filterYamaguchiActive
    );
  }

  function updateInlineResetVisibility() {
    if (!filterInlineResetBtn) return;
    filterInlineResetBtn.hidden = !hasActiveListFilters();
  }

  // --- Render List ---
  async function renderList() {
    let records = await getRecords();

    // 1. Populate Year Select (Advanced Filter)
    const allRecords = await getRecords();
    const years = [...new Set(allRecords.map(r => getYear(r.date)).filter(y => y))].sort((a,b) => b.localeCompare(a));
    if (yearSelect && yearAllBtn) {
      const prev = selectedYear === 'all' ? '' : selectedYear;
      yearSelect.innerHTML =
        `<option value="" ${selectedYear === 'all' ? 'selected' : ''}>選択…</option>` +
        years.map(y => `<option value="${y}" ${y === prev ? 'selected' : ''}>${y}年</option>`).join('');
      yearAllBtn.classList.toggle('active', selectedYear === 'all');
    }

    if (monthAllBtn && monthSelect) {
      monthAllBtn.classList.toggle('active', selectedMonth === 'all');
      if (selectedMonth === 'all') monthSelect.value = '';
      else monthSelect.value = selectedMonth;
    }

    // 2. Apply Filters
    const kw = filterKeyword.value.toLowerCase().trim();

    // Keyword Filter (Name & Memo)
    if (kw) {
      records = records.filter(r => 
        (r.name || '').toLowerCase().includes(kw) || 
        (r.memo || '').toLowerCase().includes(kw) ||
        (r.tags || []).some(t => t.toLowerCase().includes(kw))
      );
    }

    // Year & Month Filter
    if (selectedYear !== 'all') records = records.filter(r => getYear(r.date) === selectedYear);
    if (selectedMonth !== 'all') records = records.filter(r => getMonth(r.date) === selectedMonth);

    // Rating Filter (Minimum Rating)
    if (selectedMinRating > 0) records = records.filter(r => (r.rating || 0) >= selectedMinRating);

    // Special Tag Filters
    if (filterFavActive) records = records.filter(r => r.favorite);
    if (filterSakuraActive) records = records.filter(r => r.sakura);
    if (filterYamaguchiActive) records = records.filter(r => r.yamaguchi);

    records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    recordCountEl.textContent = `${records.length}件の記録`;
    updateInlineResetVisibility();

    if (records.length === 0) {
      accordionContainer.innerHTML = '';
      emptyState.classList.add('show');
      return;
    }
    emptyState.classList.remove('show');

    const grouped = {};
    records.forEach(r => {
      const y = getYear(r.date) || '不明';
      if (!grouped[y]) grouped[y] = [];
      grouped[y].push(r);
    });

    accordionContainer.innerHTML = Object.keys(grouped).sort((a,b) => b.localeCompare(a)).map((year, yi) => {
      const isOpen = yi === 0;
      
      // Extract available months for this year and sort them
      const availableMonths = [...new Set(grouped[year].map(r => getMonth(r.date)))].sort((a,b) => parseInt(a) - parseInt(b));
      
      const chipsHtml = availableMonths.length > 1 ? `
        <div class="month-chip-bar" data-year="${year}">
          <button class="month-chip active" data-month="all">すべて</button>
          ${availableMonths.map(m => `<button class="month-chip" data-month="${m}">${m}月</button>`).join('')}
        </div>` : '';

      return `
        <div class="accordion-group" data-year="${year}">
          <button class="accordion-header ${isOpen ? 'open' : ''}" data-year="${year}">
            <span class="accordion-title">📅 ${year}年</span>
            <span class="accordion-count">${grouped[year].length}件</span>
            <span class="accordion-arrow">${isOpen ? '▼' : '▶'}</span>
          </button>
          <div class="accordion-body ${isOpen ? 'open' : ''}" data-year="${year}">
            <div class="accordion-body-inner">
              ${chipsHtml}
              <div class="record-list" data-year="${year}">${grouped[year].map(r => buildCard(r)).join('')}</div>
            </div>
          </div>
        </div>`;
    }).join('');

    accordionContainer.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const isOpen = header.classList.toggle('open');
        accordionContainer.querySelector(`.accordion-body[data-year="${header.dataset.year}"]`).classList.toggle('open', isOpen);
        header.querySelector('.accordion-arrow').textContent = isOpen ? '▼' : '▶';
      });
    });

    // --- Monthly Chip Filtering ---
    accordionContainer.querySelectorAll('.month-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const year = chip.parentElement.dataset.year;
        const month = chip.dataset.month;
        const bar = chip.parentElement;
        const list = accordionContainer.querySelector(`.record-list[data-year="${year}"]`);
        
        // Update active state
        bar.querySelectorAll('.month-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        // Filter cards
        list.querySelectorAll('.record-card').forEach(card => {
          if (month === 'all' || card.dataset.month === month) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });

        // Haptic feedback (subtle)
        if ('vibrate' in navigator) navigator.vibrate(5);
      });
    });

    accordionContainer.querySelectorAll('.record-card').forEach(card => card.addEventListener('click', (e) => {
      if(!e.target.closest('.card-s-btn')) openDetail(card.dataset.id);
    }));

    accordionContainer.querySelectorAll('.card-s-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const type = btn.dataset.type, prop = type === 'fav' ? 'favorite' : type;
        const records = await getRecords();
    const r = records.find(x => x.id === btn.dataset.id);
        if (!r) return;
        r[prop] = !r[prop];
        await updateRecord(r.id, r);
        if (type === 'fav') {
          btn.textContent = '❤️';
          btn.classList.toggle('on', r[prop]);
          btn.classList.toggle('off', !r[prop]);
        }
        else { btn.classList.toggle('on', r[prop]); btn.classList.toggle('off', !r[prop]); }
      });
    });
  }

  function resetAllFilters() {
    filterKeyword.value = '';
    selectedYear = 'all';
    selectedMonth = 'all';
    selectedMinRating = 0;
    filterFavActive = false;
    filterSakuraActive = false;
    filterYamaguchiActive = false;

    advancedPanel.classList.remove('show');
    filterExpandBtn.classList.remove('active');
    if (yearAllBtn) yearAllBtn.classList.add('active');
    if (yearSelect) yearSelect.value = '';
    if (monthAllBtn) monthAllBtn.classList.add('active');
    if (monthSelect) monthSelect.value = '';
    ratingFilterGroup.querySelector('.rating-filter-chip').classList.add('active');
    ratingFilterGroup.querySelectorAll('.rating-star-btn').forEach(s => s.classList.remove('active'));
    filterFavBtn.classList.remove('active');
    filterFavBtn.querySelector('span').textContent = '🤍';
    filterSakuraBtn.classList.add('inactive');
    filterSakuraBtn.classList.remove('active');
    filterYamaguchiBtn.classList.add('inactive');
    filterYamaguchiBtn.classList.remove('active');

    renderList();
  }

  function buildCard(r) {
    const specials = `
      <div class="card-specials">
        <button class="card-s-btn ${r.favorite ? 'on' : 'off'}" data-id="${r.id}" data-type="fav">❤️</button>
        <button class="card-s-btn ${r.sakura ? 'on' : 'off'}" data-id="${r.id}" data-type="sakura">🌸</button>
        <button class="card-s-btn ${r.yamaguchi ? 'on' : 'off'}" data-id="${r.id}" data-type="yamaguchi">🐡</button>
      </div>`;
    const dateOverlay = `<span class="card-date-overlay">${formatDateShort(r.date)}</span>`;
    const photo = (r.photos && r.photos.length > 0)
      ? `<div class="card-photo-wrap"><img src="${r.photos[0]}" class="card-photo">
         ${dateOverlay}
         ${r.photos.length > 1 ? `<span class="card-photo-count">📷 ${r.photos.length}</span>` : ''}
         ${specials}</div>`
      : `<div class="card-photo-wrap card-photo-empty"><span class="card-photo-placeholder">🍶</span>${dateOverlay}${specials}</div>`;

    const rating = `<div class="card-rating">${Array.from({length: 5}, (_, i) => {
      const isActive = i < (r.rating || 0);
      return `<span class="card-rating-star ${isActive ? 'active' : ''}" data-value="${i+1}">★</span>`;
    }).join('')}</div>`;
    const temp = r.temp ? `<span class="card-temp">${getTempEmoji(r.temp)} ${r.temp}</span>` : '';
    const rawTags = r.tags || [];
    let tagsBlock = '';
    if (rawTags.length > 0) {
      tagsBlock = `<div class="card-meta-tags"><span class="card-tag card-tag-ellipsis">${escapeHtml(rawTags[0])}</span>`;
      if (rawTags.length > 1) {
        tagsBlock += `<span class="card-tag card-tag-more">+${rawTags.length - 1}</span>`;
      }
      tagsBlock += '</div>';
    }
    const metaHtml = (temp || tagsBlock) ? `<div class="card-meta">${temp}${tagsBlock}</div>` : '';

    return `<div class="record-card" data-id="${r.id}" data-month="${getMonth(r.date)}">${photo}
      <div class="card-body"><h3 class="card-name">${escapeHtml(r.name)}</h3>
      ${rating}
      ${metaHtml}</div></div>`;
  }

  // --- Modal ---
  async function openDetail(id) {
    const records = await getRecords();
    const r = records.find(rec => rec.id === id);
    if (!r) return;

    let photosHtml = '';
    if (r.photos && r.photos.length > 0) {
      const slides = r.photos.map((src, i) => `<div class="carousel-slide ${i === 0 ? 'active' : ''}" data-index="${i}"><img src="${src}"></div>`).join('');
      const dots = r.photos.length > 1 ? `<div class="carousel-dots">${r.photos.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}</div>` : '';
      const counter = r.photos.length > 1 ? `<span class="carousel-counter">1 / ${r.photos.length}</span>` : '';
      photosHtml = `<div class="carousel" data-total="${r.photos.length}"><div class="carousel-viewport"><div class="carousel-track">${slides}</div></div>${counter}${dots}</div>`;
    }

    modalContent.innerHTML = `
      <div class="modal-specials">
        <button class="modal-s-btn" id="modal-fav" data-id="${r.id}">${r.favorite ? '❤️' : '🤍'}</button>
        <button class="modal-s-btn ${r.sakura ? 'on' : 'off'}" id="modal-sakura" data-id="${r.id}">🌸</button>
        <button class="modal-s-btn ${r.yamaguchi ? 'on' : 'off'}" id="modal-yamaguchi" data-id="${r.id}">🐡</button>
        <div class="card-rating" style="margin-left:auto;font-size:1.5rem;">${Array.from({length: 5}, (_, i) => {
          const isActive = i < (r.rating || 0);
          return `<span class="card-rating-star ${isActive ? 'active' : ''}" data-value="${i+1}">★</span>`;
        }).join('')}</div>
      </div>
      <h2 class="modal-name">${escapeHtml(r.name)}</h2>
      <p class="modal-date" style="margin-top:8px;">📅 ${formatDate(r.date)}</p>
      ${photosHtml}
      ${r.tags && r.tags.length > 0 ? `<div class="modal-section"><p class="modal-section-title">味の感想</p><div class="modal-tags">${(r.tags || []).map(t => `<span class="modal-tag">${getTasteLabel(t)}</span>`).join('')}</div></div>` : ''}
      ${r.temp ? `<div class="modal-section"><p class="modal-section-title">飲み方</p><span class="modal-temp">${getTempEmoji(r.temp)} ${r.temp}</span></div>` : ''}
      ${r.memo ? `<div class="modal-section"><p class="modal-section-title">メモ</p><p class="modal-memo">${escapeHtml(r.memo)}</p></div>` : ''}
      ${r.url ? `<div class="modal-section"><p class="modal-section-title">関連リンク（飲んだお店など）</p><a href="${escapeHtml(r.url)}" target="_blank" style="color: var(--blue); font-size: 0.85rem; text-decoration: underline; word-break: break-all;">${escapeHtml(r.url)}</a></div>` : ''}
      <div class="modal-actions">
        <button class="modal-delete-btn" id="modal-delete">🗑 削除</button>
        <button class="modal-edit-btn" id="modal-edit">✏️ 編集</button>
      </div>`;

    ['fav', 'sakura', 'yamaguchi'].forEach(type => {
      document.getElementById(`modal-${type}`).addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const prop = type === 'fav' ? 'favorite' : type;
        r[prop] = !r[prop];
        await updateRecord(r.id, r);
        if (type === 'fav') btn.textContent = r.favorite ? '❤️' : '🤍';
        else { btn.classList.toggle('on', r[prop]); btn.classList.toggle('off', !r[prop]); }
        await renderList(); // back list update
      });
    });

    document.getElementById('modal-edit').addEventListener('click', () => startEdit(r.id));
    document.getElementById('modal-delete').addEventListener('click', async () => {
      if (confirm('この記録を削除しますか？')) { closeModal(); await deleteRecord(r.id); showToast('🗑 削除しました'); }
    });

    modalOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    document.getElementById('detail-modal').scrollTop = 0; // Reset scroll to top

    // 画面が表示（offsetWidthが確定）してから初期化
    setTimeout(() => {
      initCarousel();
    }, 50);
  }

  // --- Carousel / Helpers ---
  function initCarousel() {
    const parent = modalContent.querySelector('.carousel'); if (!parent) return;
    const v = parent.querySelector('.carousel-viewport'); if (!v) return;
    const tot = parseInt(parent.dataset.total, 10); if (tot <= 1) return;
    let cur = 0;
    function updateUI(idx) {
      cur = idx;
      parent.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === cur));
      const cnt = parent.querySelector('.carousel-counter'); if (cnt) cnt.textContent = `${cur + 1} / ${tot}`;
    }
    v.addEventListener('scroll', () => {
      const idx = Math.round(v.scrollLeft / v.offsetWidth);
      if (idx !== cur) updateUI(idx);
    }, { passive: true });
    function goTo(idx) {
      const targetIdx = Math.max(0, Math.min(tot - 1, idx));
      v.scrollTo({ left: targetIdx * v.offsetWidth, behavior: 'smooth' });
    }
    parent.querySelectorAll('.carousel-dot').forEach(d => d.addEventListener('click', () => goTo(parseInt(d.dataset.index, 10))));
  }

  function closeModal() { modalOverlay.classList.remove('show'); document.body.style.overflow = ''; }
  function closeDataModal() { dataModalOverlay.classList.remove('show'); document.body.style.overflow = ''; }

  async function exportData() {
    const records = await getRecords();
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `酒ログ_バックアップ_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 端末の”ファイル”に保存されたことをご確認ください');
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error('PARSE_ERROR');
        if (!confirm(`${data.length}件のデータをインポートします。現在のデータは上書きされます。よろしいですか？`)) return;
        await clearAllRecords();
        for (const record of data) {
          await saveRecord(record);
        }
        closeDataModal();
        await renderList();
        showToast(`📥 ${data.length}件をインポートしました`);
      } catch (e) {
        if (e.message === 'PARSE_ERROR') {
          showToast('⚠️ ファイルの内容が正しくありません');
        } else {
          showToast('⚠️ 読み込み中にエラーが発生しました');
          console.error('Import error:', e);
        }
      }
      importInput.value = '';
    };
    reader.readAsText(file);
  }
  function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }
  function getTasteLabel(t) {
    return ({
      '甘口': '🍯 甘口', '辛口': '🌶️ 辛口', 'さわやか': '🍃 さわやか', '微発泡': '🫧 微発泡',
      '飲みやすい': '😊 飲みやすい', 'とろみあり': '🫗 とろみあり', 'フルーティー': '🍑 フルーティー',
      '濃厚': '🍷 濃厚', 'すっきり': '💎 すっきり', '華やか': '🌸 華やか',
      'アルコール強め': '💪 アルコール強め', 'まろやか': '🌕 まろやか', 'さっぱり': '💦 さっぱり',
      '酸味': '🍋 酸味', '苦味': '☕ 苦味', '芳醇': '🍇 芳醇'
    })[t] || t;
  }

  function getTempEmoji(t) { return ({ '冷酒': '🧊', '常温': '🍶', 'ぬる燗': '♨️', '熱燗': '🔥' })[t] || '🍶'; }
  function getYear(d) { return d ? d.split('-')[0] : ''; }
  function getMonth(d) { return d ? String(parseInt(d.split('-')[1], 10)) : ''; }
  function formatDate(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${y}年${parseInt(m)}月${parseInt(day)}日`; }
  function formatDateShort(d) { if (!d) return ''; const [, m, day] = d.split('-'); return `${parseInt(m)}月${parseInt(day)}日`; }
  function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

    document.addEventListener('DOMContentLoaded', () => {
      // バージョン表示の自動反映
      const badge = document.getElementById('app-version-badge');
      if (badge) badge.textContent = APP_VERSION;

      init();
      initServiceWorker();
      checkAndShowUpdateLog();
    });

    // --- Update Log Display ---
    async function checkAndShowUpdateLog() {
      const LAST_VERSION_KEY = 'sake_log_last_version';
      const currentVersion = APP_VERSION;
      const lastVersion = localStorage.getItem(LAST_VERSION_KEY);

      if (lastVersion && lastVersion !== currentVersion) {
        try {
          const response = await fetch('./changelog.json');
          const changelog = await response.json();
          showUpdateModal(currentVersion, changelog[currentVersion]);
          localStorage.setItem(LAST_VERSION_KEY, currentVersion);
        } catch (error) {
          console.error('Failed to load changelog:', error);
        }
      } else if (!lastVersion) {
        localStorage.setItem(LAST_VERSION_KEY, currentVersion);
      }
    }

    function showUpdateModal(version, versionData) {
      const updateModalOverlay = document.getElementById('update-modal-overlay');
      const updateModalContent = document.getElementById('update-modal-content');
      const updateModalClose = document.getElementById('update-modal-close');

      if (!versionData) return;

      const changesHtml = versionData.changes.map(change => `<li>${change}</li>`).join('');
      updateModalContent.innerHTML = `
        <h2 style="font-size:1.3rem;margin-bottom:0.5rem;color:var(--text-primary);">🎉 アップデート完了</h2>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1.2rem;">${version} (${versionData.date})</p>
        <div style="background:rgba(99,102,241,0.04);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;">
          <p style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">更新内容</p>
          <ul style="margin:0;padding-left:1.2rem;font-size:0.85rem;color:var(--text-body);line-height:1.7;">
            ${changesHtml}
          </ul>
        </div>
        <button onclick="document.getElementById('update-modal-overlay').classList.remove('show');document.body.style.overflow='';" style="width:100%;margin-top:1.2rem;padding:12px;background:linear-gradient(90deg,var(--blue),var(--purple));color:#fff;border:none;border-radius:var(--radius-sm);font-family:inherit;font-size:0.9rem;font-weight:600;cursor:pointer;">閉じる</button>
      `;

      updateModalOverlay.classList.add('show');
      document.body.style.overflow = 'hidden';

      updateModalClose.addEventListener('click', () => {
        updateModalOverlay.classList.remove('show');
        document.body.style.overflow = '';
      });

      updateModalOverlay.addEventListener('click', (e) => {
        if (e.target === updateModalOverlay) {
          updateModalOverlay.classList.remove('show');
          document.body.style.overflow = '';
        }
      });
    }

    // --- Service Worker & Update Logic ---
    let isManualChecking = false;
    let checkUpdateTimeout = null;

    // SWの登録と更新チェック
    function initServiceWorker() {
      const checkUpdateBtn = document.getElementById('check-update-btn');

      // 手動更新チェックボタン（SW登録の成否に関わらず常に反応させる）
      if (checkUpdateBtn) {
        checkUpdateBtn.addEventListener('click', async (e) => {
          e.preventDefault();

          if (!('serviceWorker' in navigator)) {
            alert('この環境では更新機能が利用できません');
            return;
          }

          const reg = await navigator.serviceWorker.getRegistration();
          if (!reg) {
            showToast('⚠️ 更新機能の準備中です（再読み込み後にお試しください）');
            return;
          }

          if (reg.waiting) {
            if (confirm('更新データがあります。このまま更新しますか？')) {
              reg.waiting.postMessage('skipWaiting');
            }
            return;
          }

          isManualChecking = true;
          showToast('🔍 サーバーをチェック中...');
          checkUpdateBtn.classList.add('checking');

          checkUpdateTimeout = setTimeout(() => {
            if (isManualChecking) {
              isManualChecking = false;
              checkUpdateBtn.classList.remove('checking');
              alert('現在更新データはありません');
            }
          }, 5000);

          reg.update().catch(() => {
            isManualChecking = false;
            checkUpdateBtn.classList.remove('checking');
            clearTimeout(checkUpdateTimeout);
            showToast('⚠️ 通信エラーが発生しました');
          });
        });
      }

      if (!('serviceWorker' in navigator)) return;

      navigator.serviceWorker.register('./sw.js').then(reg => {
        // 1時間おきに自動チェック（開きっぱなし対策）
        setInterval(() => {
          reg.update();
        }, 1000 * 60 * 60);

        // 新しいSWが見つかった場合
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (isManualChecking) {
                isManualChecking = false;
                clearTimeout(checkUpdateTimeout);
                if (confirm('更新データがあります。このまま更新しますか？')) {
                  newWorker.postMessage('skipWaiting');
                }
              } else {
                showUpdateNotify();
              }
            }
          });
        });
      }).catch(() => {
        // 手動チェック側でフォールバック通知するため、ここでは握りつぶす
      });

      // 更新ボタン（ヘッダーのバッジ）のイベント
      const updateNotify = document.getElementById('update-notify');
      if (updateNotify) {
        updateNotify.addEventListener('click', () => {
          if (confirm('新しいバージョンがあります。更新しますか？')) {
            navigator.serviceWorker.getRegistration().then(reg => {
              if (reg && reg.waiting) {
                reg.waiting.postMessage('skipWaiting');
              } else {
                window.location.reload();
              }
            });
          }
        });
      }

      // SWが切り替わったらリロード
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    function showUpdateNotify() {
      const notify = document.getElementById('update-notify');
      if (notify) {
        notify.style.display = 'block';
        notify.classList.add('pulse');
      }
    }
  })();
