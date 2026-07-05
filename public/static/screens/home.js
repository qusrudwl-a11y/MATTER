const CATEGORY_ICONS = {
  wood: 'fa-tree', stone: 'fa-mountain', tile: 'fa-th', metal: 'fa-cog',
  fabric: 'fa-swatchbook', paint: 'fa-paint-roller', glass: 'fa-vector-square', flooring: 'fa-border-all',
};

// ===== 홈: 검색 + 8개 카테고리 =====
route('/home', async () => {
  const app = document.getElementById('app');
  const { data } = await axios.get('/materials/categories');

  app.innerHTML = `
  <div class="page">
    ${topHeader('MATTER', { right: `<span class="text-xs text-gray-400">${API.user?.name || ''}님</span>` })}
    <div class="px-4 pt-4">
      <div class="relative mb-5">
        <input id="home-search" type="text" placeholder="자재·마감기법·협력업체 검색"
          class="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e5e2da] bg-white text-sm" />
        <i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
      </div>
      <div id="search-results" class="hidden mb-5"></div>

      <div id="category-section">
        <h2 class="font-bold mb-3 text-sm text-gray-500">재질 카테고리</h2>
        <div class="grid grid-cols-4 gap-3 mb-6">
          ${data.categories.map((cat) => `
            <a href="#/category/${cat.slug}" class="category-card">
              <i class="fas ${CATEGORY_ICONS[cat.slug] || 'fa-cube'} text-2xl text-sage mb-2 block"></i>
              <div class="text-xs font-bold">${cat.name}</div>
              <div class="text-[10px] text-gray-400 mt-0.5">${cat.material_count}개</div>
            </a>`).join('')}
        </div>

        <div class="grid grid-cols-2 gap-3 mb-6">
          <a href="#/suppliers" class="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <i class="fas fa-truck-fast text-terracotta text-xl"></i>
            <span class="font-bold text-sm">협력업체</span>
          </a>
          <a href="#/specbook" class="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <i class="fas fa-book text-terracotta text-xl"></i>
            <span class="font-bold text-sm">스펙북</span>
          </a>
        </div>
      </div>
    </div>
  </div>
  ${bottomNav('home')}
  <div id="ai-sheet-container"></div>`;

  const searchInput = document.getElementById('home-search');
  const searchResults = document.getElementById('search-results');
  const categorySection = document.getElementById('category-section');
  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const q = e.target.value.trim();
    if (!q) {
      searchResults.classList.add('hidden');
      categorySection.classList.remove('hidden');
      return;
    }
    debounceTimer = setTimeout(async () => {
      const { data } = await axios.get('/materials/search', { params: { q } });
      categorySection.classList.add('hidden');
      searchResults.classList.remove('hidden');
      searchResults.innerHTML = `
        ${data.materials.length ? `
          <h3 class="text-xs font-bold text-gray-500 mb-2">자재 (${data.materials.length})</h3>
          <div class="space-y-2 mb-4">
            ${data.materials.map((m) => `
              <a href="#/material/${m.id}" class="material-card flex items-center gap-3 p-3">
                <div class="w-12 h-12 rounded-lg bg-[#F0EEE8] flex items-center justify-center overflow-hidden shrink-0">
                  ${m.image_url ? `<img src="${m.image_url}" class="w-full h-full object-cover"/>` : `<i class="fas ${CATEGORY_ICONS[m.category_slug] || 'fa-cube'} text-sage"></i>`}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm truncate">${escapeHtml(m.name)}</div>
                  <div class="text-xs text-gray-400">${m.category_name} · ${formatPrice(m.market_price_min, m.market_price_max, m.price_unit)}</div>
                </div>
              </a>`).join('')}
          </div>` : ''}
        ${data.suppliers.length ? `
          <h3 class="text-xs font-bold text-gray-500 mb-2">협력업체 (${data.suppliers.length})</h3>
          <div class="space-y-2">
            ${data.suppliers.map((s) => `
              <a href="#/supplier/${s.id}" class="material-card flex items-center gap-3 p-3">
                <i class="fas fa-truck-fast text-terracotta"></i>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm truncate">${escapeHtml(s.name)}</div>
                  <div class="text-xs text-gray-400">${s.region || ''} ${s.items_handled || ''}</div>
                </div>
              </a>`).join('')}
          </div>` : ''}
        ${!data.materials.length && !data.suppliers.length ? '<p class="text-center text-gray-400 text-sm py-8">검색 결과가 없습니다.</p>' : ''}
      `;
    }, 300);
  });
});

// ===== 카테고리 그리드 페이지 =====
route('/categories', async () => {
  navigate('/home');
});

// ===== 카테고리별 자재 목록 =====
route('/category/:slug', async (params) => {
  const app = document.getElementById('app');
  const { data } = await axios.get(`/materials/category/${params.slug}`);

  app.innerHTML = `
  <div class="page">
    ${topHeader(data.category.name, { back: true })}
    <div class="px-4 pt-4 grid grid-cols-2 gap-3">
      ${data.materials.map((m) => `
        <a href="#/material/${m.id}" class="material-card">
          <div class="aspect-square bg-[#F0EEE8] flex items-center justify-center overflow-hidden">
            ${m.image_url ? `<img src="${m.image_url}" class="w-full h-full object-cover"/>` : `<i class="fas ${CATEGORY_ICONS[params.slug] || 'fa-cube'} text-3xl text-sage"></i>`}
          </div>
          <div class="p-3">
            <div class="font-bold text-sm truncate">${escapeHtml(m.name)}</div>
            <div class="text-xs text-gray-400 mt-1">${formatPrice(m.market_price_min, m.market_price_max, m.price_unit)}</div>
            ${m.source !== 'seed' ? `<span class="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-sage/20 text-sage font-bold">${m.source === 'ai' ? 'AI 추천' : m.source === 'vision' ? '카메라 스캔' : '직접등록'}</span>` : ''}
          </div>
        </a>`).join('')}
      ${!data.materials.length ? '<p class="col-span-2 text-center text-gray-400 py-12">등록된 자재가 없습니다.</p>' : ''}
    </div>
  </div>
  ${bottomNav('category')}`;
});

// ===== 자재 상세 =====
route('/material/:id', async (params) => {
  const app = document.getElementById('app');
  const { data } = await axios.get(`/materials/${params.id}`);
  const m = data.material;

  app.innerHTML = `
  <div class="page">
    ${topHeader('자재 상세', { back: true })}
    <div class="aspect-[4/3] bg-[#F0EEE8] flex items-center justify-center overflow-hidden">
      ${m.image_url ? `<img src="${m.image_url}" class="w-full h-full object-cover"/>` : `<i class="fas ${CATEGORY_ICONS[m.category_slug] || 'fa-cube'} text-5xl text-sage"></i>`}
    </div>
    <div class="px-5 pt-4">
      <div class="text-xs text-sage font-bold mb-1">${m.category_name}</div>
      <h1 class="text-xl font-black mb-2">${escapeHtml(m.name)}</h1>
      <div class="text-lg font-bold text-terracotta mb-4">${formatPrice(m.market_price_min, m.market_price_max, m.price_unit)}</div>

      ${m.description_beginner ? `
      <div class="bg-sage/10 rounded-xl p-4 mb-4">
        <div class="text-xs font-bold text-sage mb-1"><i class="fas fa-graduation-cap"></i> 신입사원을 위한 설명</div>
        <p class="text-sm leading-relaxed">${escapeHtml(m.description_beginner)}</p>
      </div>` : ''}

      <div class="grid grid-cols-2 gap-3 mb-4">
        ${specRow('원산지', m.origin)}
        ${specRow('규격', m.spec)}
        ${specRow('적용', m.application)}
        ${specRow('방염', m.fire_retardant)}
        ${specRow('종류', m.material_type)}
        ${specRow('제작방식', m.fabrication_method)}
        ${specRow('표면마감', m.surface_finish)}
      </div>

      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-sm">납품 협력업체</h3>
        </div>
        ${data.suppliers.length ? `
          <div class="space-y-2">
            ${data.suppliers.map((s) => `
              <div class="material-card flex items-center justify-between p-3">
                <div>
                  <div class="font-bold text-sm">${escapeHtml(s.name)}</div>
                  <div class="text-xs text-gray-400">${s.region || ''} ${s.contact_name ? '· ' + s.contact_name : ''}</div>
                </div>
                <a href="tel:${s.phone}" class="w-9 h-9 rounded-full btn-sage flex items-center justify-center"><i class="fas fa-phone"></i></a>
              </div>`).join('')}
          </div>` : '<p class="text-sm text-gray-400">등록된 협력업체가 없습니다.</p>'}
      </div>
    </div>
  </div>
  ${bottomNav('')}`;
});

function specRow(label, value) {
  if (!value) return '';
  return `<div class="bg-white rounded-lg p-3">
    <div class="text-[10px] text-gray-400 mb-0.5">${label}</div>
    <div class="text-sm font-bold">${escapeHtml(value)}</div>
  </div>`;
}
