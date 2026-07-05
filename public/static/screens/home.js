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
    ${topHeader('MATTER')}
    <div class="px-4 pt-4">
      <div class="relative mb-5">
        <input id="home-search" type="text" placeholder="자재·마감기법·협력업체 검색"
          class="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e5e2da] bg-white text-sm" />
        <i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
      </div>
      <div id="search-results" class="hidden mb-5"></div>

      <div id="category-section">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold text-sm text-gray-500">재질 카테고리</h2>
          <button id="add-category-btn" class="text-xs text-sage font-bold"><i class="fas fa-plus"></i> 카테고리 추가</button>
        </div>
        <div class="grid grid-cols-4 gap-3 mb-6">
          ${data.categories.map((cat) => `
            <a href="#/category/${cat.slug}" class="category-card relative">
              ${cat.is_custom ? '<span class="absolute top-1.5 right-1.5 text-[8px] bg-terracotta text-white px-1 py-0.5 rounded">NEW</span>' : ''}
              <i class="fas ${CATEGORY_ICONS[cat.slug] || cat.icon || 'fa-cube'} text-2xl text-sage mb-2 block"></i>
              <div class="text-xs font-bold">${escapeHtml(cat.name)}</div>
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
  <div id="ai-sheet-container"></div>
  <div id="category-modal-container"></div>`;

  document.getElementById('add-category-btn').onclick = openAddCategoryModal;

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
    <div class="aspect-[4/3] bg-[#F0EEE8] flex items-center justify-center overflow-hidden relative">
      ${m.image_url ? `<img src="${m.image_url}" class="w-full h-full object-cover"/>` : `<i class="fas ${CATEGORY_ICONS[m.category_slug] || 'fa-cube'} text-5xl text-sage"></i>`}
      <input type="file" id="material-photo-input" accept="image/*" class="hidden" />
      <button id="material-photo-btn" class="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center">
        <i class="fas fa-camera text-deepgreen"></i>
      </button>
    </div>
    <div class="px-5 pt-4">
      <div class="text-xs text-sage font-bold mb-1">${m.category_name}</div>
      <h1 class="text-xl font-black mb-2">${escapeHtml(m.name)}</h1>
      <div class="text-lg font-bold text-terracotta mb-1">${formatPrice(m.market_price_min, m.market_price_max, m.price_unit)}</div>
      ${m.reported_avg_price ? `<div class="text-sm text-sage font-bold mb-1"><i class="fas fa-users"></i> 사용자 제보 평균가: ${Number(m.reported_avg_price).toLocaleString()}원/${m.price_unit || '㎡'} (${m.reported_count}건)</div>` : ''}
      <button id="price-report-btn" class="text-xs text-gray-400 underline mb-4"><i class="fas fa-won-sign"></i> 실거래가 제보하기</button>

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
  ${bottomNav('')}
  <div id="price-modal-container"></div>`;

  const photoInput = document.getElementById('material-photo-input');
  document.getElementById('material-photo-btn').onclick = () => photoInput.click();
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await axios.post(`/materials/${m.id}/photo`, { image_base64: ev.target.result });
        navigate(`/material/${m.id}`);
      } catch (err) {
        alert('사진 업로드 실패: ' + (err.response?.data?.error || err.message));
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('price-report-btn').onclick = () => openPriceReportModal(m.id);
});

function openPriceReportModal(materialId) {
  const container = document.getElementById('price-modal-container');
  container.innerHTML = `
  <div class="ai-sheet-overlay" id="price-modal-overlay">
    <div class="ai-sheet p-5">
      <h2 class="font-bold text-lg mb-2">실거래가 제보</h2>
      <p class="text-xs text-gray-400 mb-4">직접 겪은 실거래 단가를 입력하면 평균값이 계산되어 다른 사용자에게도 공유돼요.</p>
      <input id="price-input" type="number" placeholder="㎡당 금액 (원)" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-4" />
      <div class="flex gap-2">
        <button id="price-cancel" class="flex-1 py-3 rounded-xl bg-gray-100 font-bold">취소</button>
        <button id="price-submit" class="flex-1 py-3 rounded-xl btn-primary font-bold">제보하기</button>
      </div>
    </div>
  </div>`;
  document.getElementById('price-cancel').onclick = () => container.innerHTML = '';
  document.getElementById('price-modal-overlay').onclick = (e) => { if (e.target.id === 'price-modal-overlay') container.innerHTML = ''; };
  document.getElementById('price-submit').onclick = async () => {
    const price = Number(document.getElementById('price-input').value);
    if (!price || price <= 0) return alert('올바른 금액을 입력해주세요.');
    await axios.post(`/materials/${materialId}/price-report`, { price });
    container.innerHTML = '';
    navigate(`/material/${materialId}`);
  };
}

function specRow(label, value) {
  if (!value) return '';
  return `<div class="bg-white rounded-lg p-3">
    <div class="text-[10px] text-gray-400 mb-0.5">${label}</div>
    <div class="text-sm font-bold">${escapeHtml(value)}</div>
  </div>`;
}

// ===== 카테고리 사용자 추가 (이름만 입력하면 AI가 아이콘·설명 자동 기재) =====
function openAddCategoryModal() {
  const container = document.getElementById('category-modal-container');
  container.innerHTML = `
  <div class="ai-sheet-overlay" id="cat-modal-overlay">
    <div class="ai-sheet p-5">
      <h2 class="font-bold text-lg mb-2">재질 카테고리 추가</h2>
      <p class="text-xs text-gray-400 mb-4">이름만 입력하면 AI가 아이콘과 설명을 자동으로 채워드려요.</p>
      <input id="cat-name" placeholder="예) 콘크리트, 카펫타일, 루버" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-4" />
      <div id="cat-error" class="text-terracotta text-sm mb-2 hidden"></div>
      <div class="flex gap-2">
        <button id="cat-cancel" class="flex-1 py-3 rounded-xl bg-gray-100 font-bold">취소</button>
        <button id="cat-submit" class="flex-1 py-3 rounded-xl btn-primary font-bold">AI로 추가하기</button>
      </div>
    </div>
  </div>`;
  document.getElementById('cat-cancel').onclick = () => container.innerHTML = '';
  document.getElementById('cat-modal-overlay').onclick = (e) => { if (e.target.id === 'cat-modal-overlay') container.innerHTML = ''; };
  document.getElementById('cat-submit').onclick = async () => {
    const name = document.getElementById('cat-name').value.trim();
    const errEl = document.getElementById('cat-error');
    errEl.classList.add('hidden');
    if (!name) return;
    const btn = document.getElementById('cat-submit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI 분석 중...';
    try {
      await axios.post('/materials/categories', { name });
      container.innerHTML = '';
      navigate('/home');
    } catch (e) {
      errEl.textContent = e.response?.data?.error || '카테고리 추가 중 오류가 발생했습니다.';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = 'AI로 추가하기';
    }
  };
}
window.openAddCategoryModal = openAddCategoryModal;
