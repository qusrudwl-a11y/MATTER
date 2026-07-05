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
            <div class="flex items-center gap-2">
              <div class="font-bold text-sm">${escapeHtml(s.name)}</div>
              ${s.avg_rating ? `<span class="text-[11px] text-terracotta font-bold"><i class="fas fa-star"></i> ${s.avg_rating} (${s.rating_count})</span>` : '<span class="text-[11px] text-gray-300">평가 없음</span>'}
            </div>
            <div class="text-xs text-gray-400 mt-0.5">${s.region || '지역 미등록'} ${s.items_handled ? '· ' + escapeHtml(s.items_handled) : ''}</div>
            ${s.contact_name ? `<div class="text-xs text-gray-400">담당자: ${escapeHtml(s.contact_name)}</div>` : ''}
          </div>
          <a href="tel:${s.phone}" onclick="event.stopPropagation()" class="w-9 h-9 rounded-full btn-sage flex items-center justify-center shrink-0"><i class="fas fa-phone"></i></a>
        </a>`).join('')}
      ${!data.suppliers.length ? '<p class="text-center text-gray-400 py-12">등록된 협력업체가 없습니다. 직접 등록해보세요.</p>' : ''}
    </div>
  </div>
  ${bottomNav('suppliers')}
  <div id="supplier-modal-container"></div>`;

  document.getElementById('add-supplier-btn').onclick = openSupplierModal;
});

route('/supplier/:id', async (params) => {
  const app = document.getElementById('app');
  const { data } = await axios.get(`/suppliers/${params.id}`);
  const { data: ratingData } = await axios.get(`/suppliers/${params.id}/ratings`);
  const s = data.supplier;
  const isOwner = API.user && s.created_by === API.user.id;

  app.innerHTML = `
  <div class="page">
    ${topHeader('업체 상세', { back: true, right: isOwner ? `<button id="delete-supplier-btn" class="text-terracotta text-sm"><i class="fas fa-trash"></i></button>` : '' })}
    <div class="px-5 pt-4">
      <div class="flex items-center gap-2 mb-1">
        <h1 class="text-xl font-black">${escapeHtml(s.name)}</h1>
        ${data.avg_rating ? `<span class="text-sm text-terracotta font-bold"><i class="fas fa-star"></i> ${data.avg_rating}</span>` : ''}
      </div>
      <p class="text-sm text-gray-400 mb-4">${s.region || ''} · 평가 ${data.rating_count}건</p>

      <div class="bg-white rounded-xl p-4 mb-4 space-y-2">
        ${s.contact_name ? `<div class="flex justify-between text-sm"><span class="text-gray-400">담당자</span><span class="font-bold">${escapeHtml(s.contact_name)}</span></div>` : ''}
        <div class="flex justify-between text-sm"><span class="text-gray-400">연락처</span><span class="font-bold">${s.phone}</span></div>
        ${s.items_handled ? `<div class="flex justify-between text-sm"><span class="text-gray-400">취급품목</span><span class="font-bold">${escapeHtml(s.items_handled)}</span></div>` : ''}
      </div>

      <a href="tel:${s.phone}" class="block w-full py-3.5 rounded-xl btn-terracotta font-bold text-center mb-6"><i class="fas fa-phone"></i> 바로 전화하기</a>

      <h3 class="font-bold text-sm mb-2">취급 자재</h3>
      <div class="grid grid-cols-2 gap-2 mb-6">
        ${data.materials.map((m) => `
          <a href="#/material/${m.id}" class="material-card p-3">
            <div class="font-bold text-sm truncate">${escapeHtml(m.name)}</div>
            <div class="text-xs text-gray-400">${m.category_name}</div>
          </a>`).join('')}
        ${!data.materials.length ? '<p class="col-span-2 text-sm text-gray-400">등록된 취급 자재가 없습니다.</p>' : ''}
      </div>

      <div class="flex items-center justify-between mb-2">
        <h3 class="font-bold text-sm">업체 평가</h3>
        <button id="add-rating-btn" class="text-xs text-sage font-bold"><i class="fas fa-star"></i> 평가 작성</button>
      </div>
      <div class="space-y-2 mb-6">
        ${ratingData.ratings.map((r) => `
          <div class="material-card p-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold">${escapeHtml(r.company)} · ${escapeHtml(r.name)}</span>
              <span class="text-terracotta text-xs">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
            </div>
            ${r.comment ? `<p class="text-sm text-gray-600">${escapeHtml(r.comment)}</p>` : ''}
          </div>`).join('')}
        ${!ratingData.ratings.length ? '<p class="text-sm text-gray-400">아직 평가가 없습니다. 이용해보고 첫 평가를 남겨보세요.</p>' : ''}
      </div>
    </div>
  </div>
  ${bottomNav('suppliers')}
  <div id="rating-modal-container"></div>`;

  if (isOwner) {
    document.getElementById('delete-supplier-btn').onclick = async () => {
      if (!confirm('이 업체를 삭제하시겠습니까?')) return;
      await axios.delete(`/suppliers/${s.id}`);
      navigate('/suppliers');
    };
  }

  document.getElementById('add-rating-btn').onclick = () => openRatingModal(s.id);
});

function openRatingModal(supplierId) {
  const container = document.getElementById('rating-modal-container');
  let selectedRating = 5;
  container.innerHTML = `
  <div class="ai-sheet-overlay" id="rating-modal-overlay">
    <div class="ai-sheet p-5">
      <h2 class="font-bold text-lg mb-4">업체 평가 작성</h2>
      <div id="star-picker" class="flex gap-2 mb-4 text-2xl text-terracotta justify-center">
        ${[1,2,3,4,5].map((n) => `<i data-n="${n}" class="fas fa-star star-item cursor-pointer"></i>`).join('')}
      </div>
      <textarea id="rating-comment" placeholder="이용 경험을 공유해주세요 (품질, 응대, 납기 등)" rows="4" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-4"></textarea>
      <div class="flex gap-2">
        <button id="rating-cancel" class="flex-1 py-3 rounded-xl bg-gray-100 font-bold">취소</button>
        <button id="rating-submit" class="flex-1 py-3 rounded-xl btn-primary font-bold">등록</button>
      </div>
    </div>
  </div>`;

  const stars = container.querySelectorAll('.star-item');
  function renderStars() {
    stars.forEach((el) => {
      const n = Number(el.dataset.n);
      el.className = 'fas fa-star star-item cursor-pointer ' + (n <= selectedRating ? '' : 'opacity-25');
    });
  }
  renderStars();
  stars.forEach((el) => el.onclick = () => { selectedRating = Number(el.dataset.n); renderStars(); });

  document.getElementById('rating-cancel').onclick = () => container.innerHTML = '';
  document.getElementById('rating-modal-overlay').onclick = (e) => { if (e.target.id === 'rating-modal-overlay') container.innerHTML = ''; };
  document.getElementById('rating-submit').onclick = async () => {
    await axios.post(`/suppliers/${supplierId}/ratings`, {
      rating: selectedRating,
      comment: document.getElementById('rating-comment').value.trim(),
    });
    container.innerHTML = '';
    navigate(`/supplier/${supplierId}`);
  };
}

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
      <p class="text-xs text-gray-400 mt-2">본인이 등록한 업체는 언제든 삭제할 수 있어요.</p>
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
