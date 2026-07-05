// ===== 협력업체 목록 =====
route('/suppliers', async () => {
  const app = document.getElementById('app');
  const { data } = await axios.get('/suppliers');

  app.innerHTML = `
  <div class="page">
    ${topHeader('협력업체', { back: true, right: `<button id="add-supplier-btn" class="text-sage font-bold text-sm"><i class="fas fa-plus"></i> 등록</button>` })}
    <div class="px-4 pt-4 space-y-2">
      ${data.suppliers.map((s) => `
        <a href="#/supplier/${s.id}" class="material-card flex items-center justify-between p-4">
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm">${escapeHtml(s.name)}</div>
            <div class="text-xs text-gray-400 mt-0.5">${s.region || '지역 미등록'} ${s.items_handled ? '· ' + escapeHtml(s.items_handled) : ''}</div>
            ${s.contact_name ? `<div class="text-xs text-gray-400">담당자: ${escapeHtml(s.contact_name)}</div>` : ''}
          </div>
          <a href="tel:${s.phone}" onclick="event.stopPropagation()" class="w-9 h-9 rounded-full btn-sage flex items-center justify-center shrink-0"><i class="fas fa-phone"></i></a>
        </a>`).join('')}
      ${!data.suppliers.length ? '<p class="text-center text-gray-400 py-12">등록된 협력업체가 없습니다.</p>' : ''}
    </div>
  </div>
  ${bottomNav('')}
  <div id="supplier-modal-container"></div>`;

  document.getElementById('add-supplier-btn').onclick = openSupplierModal;
});

route('/supplier/:id', async (params) => {
  const app = document.getElementById('app');
  const { data } = await axios.get(`/suppliers/${params.id}`);
  const s = data.supplier;

  app.innerHTML = `
  <div class="page">
    ${topHeader('업체 상세', { back: true })}
    <div class="px-5 pt-4">
      <h1 class="text-xl font-black mb-1">${escapeHtml(s.name)}</h1>
      <p class="text-sm text-gray-400 mb-4">${s.region || ''}</p>

      <div class="bg-white rounded-xl p-4 mb-4 space-y-2">
        ${s.contact_name ? `<div class="flex justify-between text-sm"><span class="text-gray-400">담당자</span><span class="font-bold">${escapeHtml(s.contact_name)}</span></div>` : ''}
        <div class="flex justify-between text-sm"><span class="text-gray-400">연락처</span><span class="font-bold">${s.phone}</span></div>
        ${s.items_handled ? `<div class="flex justify-between text-sm"><span class="text-gray-400">취급품목</span><span class="font-bold">${escapeHtml(s.items_handled)}</span></div>` : ''}
      </div>

      <a href="tel:${s.phone}" class="block w-full py-3.5 rounded-xl btn-terracotta font-bold text-center mb-6"><i class="fas fa-phone"></i> 바로 전화하기</a>

      <h3 class="font-bold text-sm mb-2">취급 자재</h3>
      <div class="grid grid-cols-2 gap-2">
        ${data.materials.map((m) => `
          <a href="#/material/${m.id}" class="material-card p-3">
            <div class="font-bold text-sm truncate">${escapeHtml(m.name)}</div>
            <div class="text-xs text-gray-400">${m.category_name}</div>
          </a>`).join('')}
        ${!data.materials.length ? '<p class="col-span-2 text-sm text-gray-400">등록된 취급 자재가 없습니다.</p>' : ''}
      </div>
    </div>
  </div>
  ${bottomNav('')}`;
});

function openSupplierModal() {
  const container = document.getElementById('supplier-modal-container');
  container.innerHTML = `
  <div class="ai-sheet-overlay" id="supplier-modal-overlay">
    <div class="ai-sheet p-5">
      <h2 class="font-bold text-lg mb-4">협력업체 등록</h2>
      <div class="space-y-3">
        <input id="sup-name" placeholder="업체명" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da]" />
        <input id="sup-region" placeholder="지역" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da]" />
        <input id="sup-items" placeholder="취급품목 (예: 대리석, 타일)" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da]" />
        <input id="sup-contact" placeholder="담당자명" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da]" />
        <input id="sup-phone" placeholder="연락처" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da]" />
      </div>
      <div class="flex gap-2 mt-5">
        <button id="sup-cancel" class="flex-1 py-3 rounded-xl bg-gray-100 font-bold">취소</button>
        <button id="sup-submit" class="flex-1 py-3 rounded-xl btn-primary font-bold">등록</button>
      </div>
    </div>
  </div>`;

  document.getElementById('sup-cancel').onclick = () => container.innerHTML = '';
  document.getElementById('supplier-modal-overlay').onclick = (e) => { if (e.target.id === 'supplier-modal-overlay') container.innerHTML = ''; };
  document.getElementById('sup-submit').onclick = async () => {
    const name = document.getElementById('sup-name').value.trim();
    const phone = document.getElementById('sup-phone').value.trim();
    if (!name || !phone) return alert('업체명과 연락처는 필수입니다.');
    await axios.post('/suppliers', {
      name, phone,
      region: document.getElementById('sup-region').value.trim(),
      items_handled: document.getElementById('sup-items').value.trim(),
      contact_name: document.getElementById('sup-contact').value.trim(),
    });
    container.innerHTML = '';
    render();
  };
}
