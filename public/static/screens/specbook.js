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
            <div class="font-bold">${escapeHtml(p.name)} ${p.my_role === 'member' ? '<span class="text-[10px] bg-sage/20 text-sage px-1.5 py-0.5 rounded ml-1">초대됨</span>' : ''}</div>
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

// ===== 스펙북: 프로젝트 상세 (항목 목록 + 팀원 + 엑셀 내보내기) =====
route('/specbook/:id', async (params) => {
  const app = document.getElementById('app');
  const { data } = await axios.get(`/specbook/projects/${params.id}`);
  const p = data.project;
  const isOwner = p.user_id === API.user?.id;

  const totalSum = data.items.reduce((sum, it) => sum + (it.total_cost || 0), 0);

  app.innerHTML = `
  <div class="page">
    ${topHeader(p.name, { back: true, right: isOwner
      ? `<button id="delete-project-btn" class="text-red-400 text-sm"><i class="fas fa-trash"></i></button>`
      : `<button id="leave-project-btn" class="text-gray-400 text-sm"><i class="fas fa-right-from-bracket"></i> 나가기</button>` })}
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

      <div class="flex gap-2 mb-4">
        <button id="add-item-btn" class="flex-1 py-3 rounded-xl btn-sage font-bold">
          <i class="fas fa-plus"></i> 마감재 추가
        </button>
        <button id="invite-member-btn" class="px-4 py-3 rounded-xl bg-white border border-[#e5e2da] font-bold text-sm">
          <i class="fas fa-user-plus"></i> 팀원 초대
        </button>
      </div>

      ${data.members && data.members.length ? `
      <div class="mb-4">
        <h3 class="font-bold text-xs text-gray-500 mb-2">참여 팀원</h3>
        <div class="flex flex-wrap gap-2">
          ${data.members.map((m) => `<span class="bg-white border border-[#e5e2da] rounded-full px-3 py-1.5 text-xs">${escapeHtml(m.name)} · ${escapeHtml(m.company)}</span>`).join('')}
        </div>
      </div>` : ''}

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
            ${it.area_value ? `<div class="text-xs text-gray-400 mt-1">면적 ${it.area_value}㎡ · 단가 ${(it.material_unit_price || 0).toLocaleString()}원 · 자재비 ${(it.material_cost || 0).toLocaleString()}원 · 시공비(추정) ${(it.construction_cost_est || 0).toLocaleString()}원 · 합계 <b>${(it.total_cost || 0).toLocaleString()}원</b></div>` : ''}
            ${it.manager_name ? `<div class="text-xs text-gray-400 mt-1">담당: ${escapeHtml(it.manager_name)} ${it.manager_phone ? '· ' + it.manager_phone : ''}</div>` : ''}
          </div>`).join('')}
        ${!data.items.length ? '<p class="text-center text-gray-400 py-8">아직 추가된 자재가 없습니다.</p>' : ''}
      </div>
    </div>
  </div>
  ${bottomNav('specbook')}
  <div id="add-item-modal-container"></div>
  <div id="invite-modal-container"></div>`;

  if (isOwner) {
    document.getElementById('delete-project-btn').onclick = async () => {
      if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;
      await axios.delete(`/specbook/projects/${p.id}`);
      navigate('/specbook');
    };
  } else {
    document.getElementById('leave-project-btn').onclick = async () => {
      if (!confirm('이 프로젝트에서 나가시겠습니까? 참여 목록에서 제거됩니다.')) return;
      await axios.post(`/specbook/projects/${p.id}/leave`);
      navigate('/specbook');
    };
  }

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
  document.getElementById('invite-member-btn').onclick = () => openInviteModal(p.id);
});

window.deleteSpecItem = async (itemId, projectId) => {
  if (!confirm('이 항목을 삭제하시겠습니까?')) return;
  await axios.delete(`/specbook/items/${itemId}`);
  navigate(`/specbook/${projectId}`);
};

function openInviteModal(projectId) {
  const container = document.getElementById('invite-modal-container');
  container.innerHTML = `
  <div class="ai-sheet-overlay" id="invite-overlay">
    <div class="ai-sheet p-5">
      <h2 class="font-bold text-lg mb-2">팀원 초대</h2>
      <p class="text-xs text-gray-400 mb-4">초대할 팀원의 연락처(가입된 계정)를 입력하면 프로젝트를 함께 편집할 수 있어요.</p>
      <input id="invite-phone" type="tel" placeholder="팀원 연락처 (숫자만)" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-3" />
      <div id="invite-error" class="text-terracotta text-sm mb-2 hidden"></div>
      <div class="flex gap-2">
        <button id="invite-cancel" class="flex-1 py-3 rounded-xl bg-gray-100 font-bold">취소</button>
        <button id="invite-submit" class="flex-1 py-3 rounded-xl btn-primary font-bold">초대하기</button>
      </div>
    </div>
  </div>`;
  document.getElementById('invite-cancel').onclick = () => container.innerHTML = '';
  document.getElementById('invite-overlay').onclick = (e) => { if (e.target.id === 'invite-overlay') container.innerHTML = ''; };
  document.getElementById('invite-submit').onclick = async () => {
    const phone = document.getElementById('invite-phone').value.trim();
    const errEl = document.getElementById('invite-error');
    errEl.classList.add('hidden');
    if (!phone) return;
    try {
      const res = await axios.post(`/specbook/projects/${projectId}/members`, { phone });
      container.innerHTML = '';
      alert(`${res.data.invitee.name}님을 팀원으로 초대했습니다.`);
      navigate(`/specbook/${projectId}`);
    } catch (e) {
      errEl.textContent = e.response?.data?.error || '초대 중 오류가 발생했습니다.';
      errEl.classList.remove('hidden');
    }
  };
}

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
        <input id="item-area" placeholder="적용부위" class="px-4 py-3 rounded-xl border border-[#e5e2da]" />
      </div>
      <div class="grid grid-cols-2 gap-2 mb-3">
        <input id="item-manager" placeholder="담당자" class="px-4 py-3 rounded-xl border border-[#e5e2da]" />
        <input id="item-phone" placeholder="연락처" class="px-4 py-3 rounded-xl border border-[#e5e2da]" />
      </div>
      <input id="item-area-value" type="number" step="0.01" placeholder="면적 (㎡) - 입력시 비용 자동계산" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-3" />
      <input id="item-price-override" type="number" placeholder="단가 직접 입력(원/㎡) - 스펙북/스펙에 실제 견적 반영시" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-1" />
      <p class="text-[11px] text-gray-400 mb-4">단가를 직접 입력하면 이 자재의 사용자 제보 평균가에도 함께 반영돼요.</p>

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
    const priceText = selectedMaterial.reported_avg_price
      ? `사용자 제보 평균가: ${Number(selectedMaterial.reported_avg_price).toLocaleString()}원/㎡`
      : `시장가: ${formatPrice(selectedMaterial.market_price_min, selectedMaterial.market_price_max, selectedMaterial.price_unit)}`;
    preview.innerHTML = `<b>${escapeHtml(selectedMaterial.name)}</b> · 규격: ${selectedMaterial.spec || '-'} · ${priceText}`;
  });

  document.getElementById('item-submit').onclick = async () => {
    const payload = {
      material_id: selectedMaterial?.id ? Number(selectedMaterial.id) : undefined,
      code: document.getElementById('item-code').value.trim() || undefined,
      applied_area: document.getElementById('item-area').value.trim() || undefined,
      manager_name: document.getElementById('item-manager').value.trim() || undefined,
      manager_phone: document.getElementById('item-phone').value.trim() || undefined,
      area_value: document.getElementById('item-area-value').value ? Number(document.getElementById('item-area-value').value) : undefined,
      unit_price_override: document.getElementById('item-price-override').value ? Number(document.getElementById('item-price-override').value) : undefined,
    };
    if (!payload.material_id) {
      payload.item_name = prompt('자재명을 입력해주세요:') || '미지정 자재';
    }
    await axios.post(`/specbook/projects/${projectId}/items`, payload);
    container.innerHTML = '';
    navigate(`/specbook/${projectId}`);
  };
}
