// ===== 스펙북: 프로젝트 목록 =====
route('/specbook', async () => {
  const app = document.getElementById('app');
  const { data } = await axios.get('/specbook/projects');

  app.innerHTML = `
  <div class="page">
    ${topHeader('스펙북', { right: `<button id="new-project-btn" class="text-sage font-bold text-sm"><i class="fas fa-plus"></i> 새 프로젝트</button>` })}
    <div class="px-4 pt-4 space-y-2">
      ${data.projects.map((p) => `
        <a href="#/specbook/${p.id}" class="material-card flex items-center justify-between p-4">
          <div>
            <div class="font-bold">${escapeHtml(p.name)}</div>
            <div class="text-xs text-gray-400 mt-0.5">자재 ${p.item_count}개 · ${new Date(p.updated_at).toLocaleDateString('ko-KR')}</div>
          </div>
          <i class="fas fa-chevron-right text-gray-300"></i>
        </a>`).join('')}
      ${!data.projects.length ? '<p class="text-center text-gray-400 py-12">프로젝트를 만들고 마감재 사양서를 작성해보세요.</p>' : ''}
    </div>
  </div>
  ${bottomNav('specbook')}
  <div id="project-modal-container"></div>`;

  document.getElementById('new-project-btn').onclick = () => {
    const container = document.getElementById('project-modal-container');
    container.innerHTML = `
    <div class="ai-sheet-overlay" id="new-project-overlay">
      <div class="ai-sheet p-5">
        <h2 class="font-bold text-lg mb-4">새 프로젝트</h2>
        <input id="new-project-name" placeholder="프로젝트명 (예: 강남 OO카페)" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-4" />
        <div class="flex gap-2">
          <button id="new-project-cancel" class="flex-1 py-3 rounded-xl bg-gray-100 font-bold">취소</button>
          <button id="new-project-submit" class="flex-1 py-3 rounded-xl btn-primary font-bold">만들기</button>
        </div>
      </div>
    </div>`;
    document.getElementById('new-project-cancel').onclick = () => container.innerHTML = '';
    document.getElementById('new-project-overlay').onclick = (e) => { if (e.target.id === 'new-project-overlay') container.innerHTML = ''; };
    document.getElementById('new-project-submit').onclick = async () => {
      const name = document.getElementById('new-project-name').value.trim();
      if (!name) return alert('프로젝트명을 입력해주세요.');
      const res = await axios.post('/specbook/projects', { name });
      navigate(`/specbook/${res.data.id}`);
    };
  };
});

// ===== 스펙북: 프로젝트 상세 (항목 목록 + 엑셀 내보내기) =====
route('/specbook/:id', async (params) => {
  const app = document.getElementById('app');
  const { data } = await axios.get(`/specbook/projects/${params.id}`);
  const p = data.project;

  const totalSum = data.items.reduce((sum, it) => sum + (it.total_cost || 0), 0);

  app.innerHTML = `
  <div class="page">
    ${topHeader(p.name, { back: true, right: `<button id="delete-project-btn" class="text-red-400 text-sm"><i class="fas fa-trash"></i></button>` })}
    <div class="px-4 pt-4">
      <div class="bg-deepgreen text-white rounded-xl p-4 mb-4 flex justify-between items-center">
        <div>
          <div class="text-xs text-white/60">총 예상 비용 (자재비+시공비)</div>
          <div class="text-xl font-black">${totalSum.toLocaleString()}원</div>
        </div>
        <button id="export-excel-btn" class="px-4 py-2 rounded-lg bg-white text-deepgreen font-bold text-sm">
          <i class="fas fa-file-excel"></i> 엑셀
        </button>
      </div>

      <button id="add-item-btn" class="w-full py-3 rounded-xl btn-sage font-bold mb-4">
        <i class="fas fa-plus"></i> 마감재 추가
      </button>

      <div class="space-y-2">
        ${data.items.map((it) => `
          <div class="material-card p-4">
            <div class="flex justify-between items-start mb-1">
              <div>
                <span class="text-xs font-bold text-terracotta">${it.code}</span>
                <span class="font-bold ml-1">${escapeHtml(it.item_name)}</span>
              </div>
              <button onclick="deleteSpecItem(${it.id}, ${p.id})" class="text-gray-300"><i class="fas fa-times"></i></button>
            </div>
            <div class="text-xs text-gray-400">
              ${it.applied_area ? `적용부위: ${escapeHtml(it.applied_area)} · ` : ''}
              ${it.size_spec ? `규격: ${escapeHtml(it.size_spec)}` : ''}
            </div>
            ${it.area_value ? `<div class="text-xs text-gray-400 mt-1">면적 ${it.area_value}㎡ · 자재비 ${(it.material_cost || 0).toLocaleString()}원 · 시공비(추정) ${(it.construction_cost_est || 0).toLocaleString()}원 · 합계 <b>${(it.total_cost || 0).toLocaleString()}원</b></div>` : ''}
            ${it.manager_name ? `<div class="text-xs text-gray-400 mt-1">담당: ${escapeHtml(it.manager_name)} ${it.manager_phone ? '· ' + it.manager_phone : ''}</div>` : ''}
          </div>`).join('')}
        ${!data.items.length ? '<p class="text-center text-gray-400 py-8">아직 추가된 자재가 없습니다.</p>' : ''}
      </div>
    </div>
  </div>
  ${bottomNav('specbook')}
  <div id="add-item-modal-container"></div>`;

  document.getElementById('delete-project-btn').onclick = async () => {
    if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;
    await axios.delete(`/specbook/projects/${p.id}`);
    navigate('/specbook');
  };

  document.getElementById('export-excel-btn').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
      const res = await axios.get(`/specbook/projects/${p.id}/export/excel`);
      const a = document.createElement('a');
      a.href = res.data.download_url;
      a.download = res.data.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('엑셀 생성 중 오류: ' + (err.response?.data?.error || err.message));
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-file-excel"></i> 엑셀';
    }
  };

  document.getElementById('add-item-btn').onclick = () => openAddItemModal(p.id);
});

window.deleteSpecItem = async (itemId, projectId) => {
  if (!confirm('이 항목을 삭제하시겠습니까?')) return;
  await axios.delete(`/specbook/items/${itemId}`);
  navigate(`/specbook/${projectId}`);
  render();
};

async function openAddItemModal(projectId) {
  const container = document.getElementById('add-item-modal-container');
  const { data: catData } = await axios.get('/materials/categories');

  container.innerHTML = `
  <div class="ai-sheet-overlay" id="add-item-overlay">
    <div class="ai-sheet p-5 overflow-y-auto" style="max-height:85vh;">
      <h2 class="font-bold text-lg mb-4">마감재 추가</h2>

      <label class="text-xs font-bold text-gray-500">카테고리</label>
      <select id="item-category" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-3 mt-1">
        <option value="">직접 입력 (자재 미선택)</option>
        ${catData.categories.map((c) => `<option value="${c.slug}">${c.name}</option>`).join('')}
      </select>

      <label class="text-xs font-bold text-gray-500">자재 선택</label>
      <select id="item-material" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-3 mt-1" disabled>
        <option value="">카테고리를 먼저 선택하세요</option>
      </select>

      <div id="material-preview" class="hidden bg-sage/10 rounded-lg p-3 mb-3 text-sm"></div>

      <div class="grid grid-cols-2 gap-2 mb-3">
        <input id="item-code" placeholder="코드 (미입력시 자동)" class="px-4 py-3 rounded-xl border border-[#e5e2da]" />
        <input id="item-area" type="number" placeholder="적용부위" class="px-4 py-3 rounded-xl border border-[#e5e2da]" />
      </div>
      <div class="grid grid-cols-2 gap-2 mb-3">
        <input id="item-manager" placeholder="담당자" class="px-4 py-3 rounded-xl border border-[#e5e2da]" />
        <input id="item-phone" placeholder="연락처" class="px-4 py-3 rounded-xl border border-[#e5e2da]" />
      </div>
      <input id="item-area-value" type="number" step="0.01" placeholder="면적 (㎡) - 입력시 비용 자동계산" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-4" />

      <div class="flex gap-2">
        <button id="item-cancel" class="flex-1 py-3 rounded-xl bg-gray-100 font-bold">취소</button>
        <button id="item-submit" class="flex-1 py-3 rounded-xl btn-primary font-bold">추가</button>
      </div>
    </div>
  </div>`;

  document.getElementById('item-cancel').onclick = () => container.innerHTML = '';
  document.getElementById('add-item-overlay').onclick = (e) => { if (e.target.id === 'add-item-overlay') container.innerHTML = ''; };

  let selectedMaterial = null;

  document.getElementById('item-category').onchange = async (e) => {
    const slug = e.target.value;
    const materialSelect = document.getElementById('item-material');
    if (!slug) {
      materialSelect.disabled = true;
      materialSelect.innerHTML = '<option value="">카테고리를 먼저 선택하세요</option>';
      return;
    }
    const { data } = await axios.get(`/materials/category/${slug}`);
    materialSelect.disabled = false;
    materialSelect.innerHTML = `<option value="">직접 입력</option>` +
      data.materials.map((m) => `<option value="${m.id}">${m.name}</option>`).join('');
  };

  document.getElementById('item-material').addEventListener('change', async (e) => {
    const id = e.target.value;
    const preview = document.getElementById('material-preview');
    if (!id) { preview.classList.add('hidden'); selectedMaterial = null; return; }
    const { data } = await axios.get(`/materials/${id}`);
    selectedMaterial = data.material;
    preview.classList.remove('hidden');
    preview.innerHTML = `<b>${escapeHtml(selectedMaterial.name)}</b> · 규격: ${selectedMaterial.spec || '-'} · 시장가: ${formatPrice(selectedMaterial.market_price_min, selectedMaterial.market_price_max, selectedMaterial.price_unit)}`;
  });

  document.getElementById('item-submit').onclick = async () => {
    const payload = {
      material_id: selectedMaterial?.id ? Number(selectedMaterial.id) : undefined,
      code: document.getElementById('item-code').value.trim() || undefined,
      applied_area: document.getElementById('item-area').value.trim() || undefined,
      manager_name: document.getElementById('item-manager').value.trim() || undefined,
      manager_phone: document.getElementById('item-phone').value.trim() || undefined,
      area_value: document.getElementById('item-area-value').value ? Number(document.getElementById('item-area-value').value) : undefined,
    };
    if (!payload.material_id) {
      payload.item_name = prompt('자재명을 입력해주세요:') || '미지정 자재';
    }
    await axios.post(`/specbook/projects/${projectId}/items`, payload);
    container.innerHTML = '';
    navigate(`/specbook/${projectId}`);
    render();
  };
}
