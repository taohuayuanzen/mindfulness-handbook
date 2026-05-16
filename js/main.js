/* ================================================================
   Module: DataStore
   ================================================================ */
const DataStore = {
  getAll() { return exercises; },

  getById(id) { return exercises.find(ex => ex.id === id); },

  getByCategory(catKey) {
    return exercises.filter(ex => ex.category === catKey);
  },

  getGroupedByCategory() {
    const grouped = {};
    for (const key of CATEGORY_ORDER) {
      const items = this.getByCategory(key);
      if (items.length > 0) grouped[key] = items;
    }
    return grouped;
  },

  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return exercises;
    return exercises.filter(ex =>
      ex.title.toLowerCase().includes(q) ||
      ex.summary.toLowerCase().includes(q) ||
      ex.tags.some(t => t.toLowerCase().includes(q)) ||
      (CATEGORIES[ex.category] && CATEGORIES[ex.category].label.includes(q))
    );
  },

  filterByCategory(items, catKey) {
    if (!catKey || catKey === 'all') return items;
    return items.filter(ex => ex.category === catKey);
  },
};

/* ================================================================
   Module: Favorites
   ================================================================ */
const Favorites = {
  STORAGE_KEY: 'mindfulness_favorites',

  _list: null,

  _load() {
    if (this._list !== null) return this._list;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this._list = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this._list = [];
    }
    return this._list;
  },

  _save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._list));
    } catch (e) {
      console.warn('无法保存收藏数据到 localStorage:', e.message);
    }
  },

  getAll() { return this._load().slice(); },

  has(id) { return this._load().includes(id); },

  count() { return this._load().length; },

  toggle(id) {
    const list = this._load();
    const idx = list.indexOf(id);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(id);
    }
    this._save();
    this._syncUI();
    if (TabRouter.currentTab === 'favorites') {
      RenderEngine.renderFavoritesTab();
    }
  },

  isFavorited(id) { return this._load().includes(id); },

  _syncUI() {
    const count = this.count();
    const badge = document.getElementById('fav-count-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? '' : 'none';
    }
    document.querySelectorAll('.btn-fav[data-exercise-id]').forEach(btn => {
      const id = parseInt(btn.dataset.exerciseId, 10);
      const isFav = this.isFavorited(id);
      btn.textContent = isFav ? '★' : '☆';
      btn.classList.toggle('active', isFav);
    });
  },

  init() { this._syncUI(); },
};

/* ================================================================
   Module: GuideExpander
   ================================================================ */
const GuideExpander = {
  init() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-expand');
      if (!btn) return;

      const card = btn.closest('.exercise-card');
      if (!card) return;

      const container = card.querySelector('.steps-container');
      if (!container) return;

      const isExpanded = container.classList.contains('expanded');
      if (isExpanded) {
        container.classList.remove('expanded');
        btn.classList.remove('expanded');
        btn.innerHTML = '📖 展开引导词';
      } else {
        container.classList.add('expanded');
        btn.classList.add('expanded');
        btn.innerHTML = '📕 收起引导词';
      }
    });
  },
};

/* ================================================================
   Module: RenderEngine
   ================================================================ */
const RenderEngine = {
  createStepsHTML(steps, tip) {
    if (!steps || steps.length === 0) return '';
    let html = '<div class="steps-inner">';
    steps.forEach((step, i) => {
      html += `
        <div class="step-item" style="transition-delay: ${i * 50}ms;">
          <div class="step-phase">${step.phase}</div>
          <div class="step-text">${step.text}</div>
        </div>`;
    });
    if (tip) {
      html += `<div class="step-tip">${tip}</div>`;
    }
    html += '</div>';
    return html;
  },

  createCard(ex, isTodayCard = false) {
    const cat = CATEGORIES[ex.category];
    const isFav = Favorites.isFavorited(ex.id);
    const extraClass = isTodayCard ? 'today-card' : '';
    const extraPadding = isTodayCard ? 'padding: 2rem;' : '';

    const stepsHTML = this.createStepsHTML(ex.steps, ex.tip);
    const hasSteps = ex.steps && ex.steps.length > 0;

    return `
      <div class="exercise-card ${extraClass}" style="${extraPadding}" data-exercise-id="${ex.id}">
        ${isTodayCard ? '<div class="today-badge">⭐ 今日推荐</div>' : ''}
        <span class="card-category ${ex.category}">${cat.icon} ${cat.label}</span>
        <div class="card-title">${ex.title}</div>
        <div class="card-meta">
          <span>⏱ ${ex.duration}</span>
          <span>📖 ${ex.source}</span>
        </div>
        <div class="card-summary">${ex.summary}</div>
        ${ex.tags && ex.tags.length > 0 ? `
        <div class="card-tags">
          ${ex.tags.map(t => `<span class="card-tag">#${t}</span>`).join('')}
        </div>` : ''}
        <div class="card-actions">
          <button class="btn-fav ${isFav ? 'active' : ''}" data-exercise-id="${ex.id}" onclick="Favorites.toggle(${ex.id})" aria-label="收藏">
            ${isFav ? '★' : '☆'}
          </button>
          ${hasSteps ? `
          <button class="btn-expand" aria-label="展开引导词">
            📖 展开引导词
          </button>` : ''}
        </div>
        ${hasSteps ? `<div class="steps-container">${stepsHTML}</div>` : ''}
      </div>`;
  },

  renderTodayCard(ex) {
    const container = document.getElementById('today-card-container');
    if (!container) return;
    container.innerHTML = this.createCard(ex, true);
  },

  renderAllTab(data, grouped = false) {
    const container = document.getElementById('all-exercises-container');
    const noResults = document.getElementById('no-results');
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = '';
      if (noResults) noResults.classList.remove('hidden');
      return;
    }
    if (noResults) noResults.classList.add('hidden');

    if (grouped) {
      let html = '';
      for (const key of CATEGORY_ORDER) {
        if (data[key] && data[key].length > 0) {
          const cat = CATEGORIES[key];
          html += `
            <div class="category-group">
              <div class="category-header">
                ${cat.icon} ${cat.label} <span class="count">(${data[key].length})</span>
              </div>
              <div class="category-grid">
                ${data[key].map(ex => this.createCard(ex)).join('')}
              </div>
            </div>`;
        }
      }
      container.innerHTML = html;
    } else {
      container.innerHTML = `
        <div class="category-grid">
          ${data.map(ex => this.createCard(ex)).join('')}
        </div>`;
    }
  },

  renderFavoritesTab() {
    const container = document.getElementById('favorites-container');
    const header = document.getElementById('favorites-header');
    const empty = document.getElementById('favorites-empty');
    const favIds = Favorites.getAll();
    const favExercises = favIds.map(id => DataStore.getById(id)).filter(Boolean);

    if (favExercises.length === 0) {
      if (container) container.innerHTML = '';
      if (header) header.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    if (header) header.textContent = `📌 已收藏 ${favExercises.length} 个练习`;
    if (container) {
      container.innerHTML = `<div class="category-grid">${favExercises.map(ex => this.createCard(ex)).join('')}</div>`;
    }
  },
};

/* ================================================================
   Module: TabRouter
   ================================================================ */
const TabRouter = {
  currentTab: 'home',

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === `tab-${tabName}`);
    });
    if (tabName === 'home') {
      TodayPick.show();
    } else if (tabName === 'all') {
      SearchFilter.showAll();
    } else if (tabName === 'favorites') {
      RenderEngine.renderFavoritesTab();
    }
  },
};

/* ================================================================
   Module: TodayPick
   ================================================================ */
const TodayPick = {
  _currentId: null,
  _usedRandIds: [],

  getDailyIndex() {
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const seed = dateStr.split('-').reduce((sum, part) => sum + parseInt(part, 10), 0);
    return seed % exercises.length;
  },

  getDailyExercise() {
    return exercises[this.getDailyIndex()];
  },

  getRandomExercise(excludeId = null) {
    const pool = exercises.filter(ex => ex.id !== excludeId && !this._usedRandIds.includes(ex.id));
    if (pool.length === 0) {
      this._usedRandIds = [];
      return this.getRandomExercise(excludeId);
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this._usedRandIds.push(pick.id);
    return pick;
  },

  show() {
    this._usedRandIds = [];
    this._currentId = null;
    const daily = this.getDailyExercise();
    this._currentId = daily.id;
    RenderEngine.renderTodayCard(daily);
    this._updateDate();
  },

  refresh() {
    const random = this.getRandomExercise(this._currentId);
    this._currentId = random.id;
    RenderEngine.renderTodayCard(random);
  },

  _updateDate() {
    const el = document.getElementById('home-date');
    if (!el) return;
    const now = new Date();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;
    el.textContent = `📅 ${dateStr}`;
  },
};

/* ================================================================
   Module: SearchFilter
   ================================================================ */
const SearchFilter = {
  _currentQuery: '',
  _currentCategory: 'all',
  _debounceTimer: null,

  init() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
          this._currentQuery = searchInput.value;
          this.render();
        }, 200);
      });
    }
    this._renderFilterTags();
  },

  _renderFilterTags() {
    const container = document.getElementById('filter-tags');
    if (!container) return;

    let html = '<span class="filter-tag active" data-cat="all" onclick="SearchFilter.setCategory(\'all\')">全部</span>';
    for (const key of CATEGORY_ORDER) {
      const cat = CATEGORIES[key];
      const count = DataStore.getByCategory(key).length;
      html += `<span class="filter-tag" data-cat="${key}" onclick="SearchFilter.setCategory('${key}')">${cat.icon} ${cat.label} (${count})</span>`;
    }
    container.innerHTML = html;
  },

  setCategory(catKey) {
    this._currentCategory = catKey;
    document.querySelectorAll('.filter-tag').forEach(t => {
      t.classList.toggle('active', t.dataset.cat === catKey);
    });
    this.render();
  },

  render() {
    let results = DataStore.search(this._currentQuery);
    if (this._currentCategory !== 'all') {
      results = results.filter(ex => ex.category === this._currentCategory);
    }
    const grouped = {};
    for (const ex of results) {
      if (!grouped[ex.category]) grouped[ex.category] = [];
      grouped[ex.category].push(ex);
    }
    RenderEngine.renderAllTab(grouped, true);
  },

  showAll() {
    this._currentQuery = '';
    this._currentCategory = 'all';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.filter-tag').forEach(t => {
      t.classList.toggle('active', t.dataset.cat === 'all');
    });
    this.render();
  },
};

/* ================================================================
   Initialization
   ================================================================ */
(function init() {
  Favorites.init();
  GuideExpander.init();
  SearchFilter.init();
  TabRouter.switchTab('home');
})();
