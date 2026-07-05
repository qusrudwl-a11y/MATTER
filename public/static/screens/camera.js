// ===== 카메라 자재 분석 (AI Vision Scan) =====
route('/camera', async () => {
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="page">
    ${topHeader('카메라 자재 분석', { back: true })}
    <div class="px-5 pt-6 flex flex-col items-center">
      <div id="camera-preview" class="w-full aspect-square bg-[#F0EEE8] rounded-2xl flex flex-col items-center justify-center mb-5 overflow-hidden">
        <i class="fas fa-camera text-4xl text-sage mb-3"></i>
        <p class="text-sm text-gray-400 px-8 text-center">마감재를 촬영하면 AI가 종류·마감·대략적 단가를 분석해드려요.</p>
      </div>
      <input type="file" id="camera-input" accept="image/*" capture="environment" class="hidden" />
      <button id="camera-trigger" class="w-full py-3.5 rounded-xl btn-terracotta font-bold mb-3">
        <i class="fas fa-camera"></i> 촬영 / 사진 선택
      </button>
      <div id="camera-result"></div>
    </div>
  </div>
  ${bottomNav('camera')}`;

  const input = document.getElementById('camera-input');
  document.getElementById('camera-trigger').onclick = () => input.click();

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById('camera-preview');
    const resultEl = document.getElementById('camera-result');

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      preview.innerHTML = `<img src="${dataUrl}" class="w-full h-full object-cover" />`;
      resultEl.innerHTML = `<div class="flex flex-col items-center py-6"><div class="spinner mb-3"></div><p class="text-sm text-gray-400">AI가 자재를 분석하고 있어요...</p></div>`;

      try {
        const { data } = await axios.post('/ai/vision-scan', { image_base64: dataUrl });
        resultEl.innerHTML = `
          <div class="bg-white rounded-xl p-4 mb-3">
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs font-bold text-sage">${escapeHtml(data.category_name || '')}</span>
              <span class="text-[10px] text-gray-400">AI 추정 (데모)</span>
            </div>
            <h3 class="font-black text-lg mb-1">${escapeHtml(data.material_type || '분석 결과')}</h3>
            <p class="text-sm text-gray-500 mb-2">표면마감: ${escapeHtml(data.surface_finish || '-')}</p>
            <p class="text-terracotta font-bold mb-3">${data.estimated_price_min ? Number(data.estimated_price_min).toLocaleString() : '-'} ~ ${data.estimated_price_max ? Number(data.estimated_price_max).toLocaleString() : '-'}원/㎡</p>
            ${data.description ? `<p class="text-sm bg-sage/10 rounded-lg p-3 mb-2">${escapeHtml(data.description)}</p>` : ''}
            <p class="text-[11px] text-gray-400">${escapeHtml(data.confidence_note || '')}</p>
          </div>
          <button id="save-scan-btn" class="w-full py-3 rounded-xl btn-sage font-bold">라이브러리에 자재로 등록하기</button>
        `;
        document.getElementById('save-scan-btn').onclick = async () => {
          const btn = document.getElementById('save-scan-btn');
          btn.disabled = true;
          btn.textContent = '등록 중...';
          const res = await axios.post(`/ai/vision-scan/${data.scan_id}/save`);
          navigate(`/material/${res.data.material_id}`);
        };
      } catch (err) {
        resultEl.innerHTML = `<p class="text-center text-red-400 text-sm py-6">분석 중 오류가 발생했습니다: ${escapeHtml(err.response?.data?.error || err.message)}</p>`;
      }
    };
    reader.readAsDataURL(file);
  });
});
