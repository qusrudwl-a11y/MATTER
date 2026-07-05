// ===== 마이페이지: 개인정보 / 프로젝트 / 기록 / 나만의 협력사 =====
route('/mypage', async () => {
  const app = document.getElementById('app');
  const { data } = await axios.get('/mypage/overview');
  const { data: myFeedback } = await axios.get('/feedback/my');

  app.innerHTML = `
  <div class="page">
    ${topHeader('마이페이지', { back: true })}
    <div class="px-4 pt-4">
      <div class="bg-deepgreen text-white rounded-xl p-5 mb-5">
        <div class="text-xl font-black mb-1">${escapeHtml(data.profile.name)}님</div>
        <div class="text-sm text-white/70">${escapeHtml(data.profile.company)} · ${escapeHtml(data.profile.position)}</div>
        <div class="text-xs text-white/50 mt-1"><i class="fas fa-phone"></i> ${escapeHtml(data.profile.phone)}</div>
      </div>

      <div class="flex bg-white rounded-full p-1 mb-4 shadow-sm text-xs">
        <button class="mypage-tab flex-1 py-2 rounded-full font-bold" data-tab="projects">프로젝트</button>
        <button class="mypage-tab flex-1 py-2 rounded-full font-bold" data-tab="activity">기록</button>
        <button class="mypage-tab flex-1 py-2 rounded-full font-bold" data-tab="suppliers">내 협력사</button>
        <button class="mypage-tab flex-1 py-2 rounded-full font-bold" data-tab="feedback">피드백</button>
      </div>

      <div id="tab-projects" class="mypage-panel space-y-2">
        ${data.projects.map((p) => `
          <a href="#/specbook/${p.id}" class="material-card flex items-center justify-between p-4">
            <div>
              <div class="font-bold text-sm">${escapeHtml(p.name)} ${p.role === 'member' ? '<span class="text-[10px] bg-sage/20 text-sage px-1.5 py-0.5 rounded ml-1">초대됨</span>' : ''}</div>
              <div class="text-xs text-gray-400 mt-0.5">자재 ${p.item_count}개</div>
            </div>
            <i class="fas fa-chevron-right text-gray-300"></i>
          </a>`).join('')}
        ${!data.projects.length ? '<p class="text-center text-gray-400 py-8">참여 중인 프로젝트가 없습니다.</p>' : ''}
      </div>

      <div id="tab-activity" class="mypage-panel space-y-2 hidden">
        ${data.activity.map((a) => `
          <div class="material-card p-3">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-sage">${activityLabel(a.action)}</span>
              <span class="text-[10px] text-gray-400">${new Date(a.created_at).toLocaleString('ko-KR')}</span>
            </div>
            ${a.detail ? `<p class="text-xs text-gray-500 mt-1 truncate">${escapeHtml(a.detail)}</p>` : ''}
          </div>`).join('')}
        ${!data.activity.length ? '<p class="text-center text-gray-400 py-8">활동 기록이 없습니다.</p>' : ''}
      </div>

      <div id="tab-suppliers" class="mypage-panel space-y-2 hidden">
        ${data.my_suppliers.map((s) => `
          <a href="#/supplier/${s.id}" class="material-card flex items-center justify-between p-4">
            <div>
              <div class="font-bold text-sm">${escapeHtml(s.name)}</div>
              <div class="text-xs text-gray-400 mt-0.5">${s.region || ''} ${s.items_handled ? '· ' + escapeHtml(s.items_handled) : ''}</div>
            </div>
            <i class="fas fa-chevron-right text-gray-300"></i>
          </a>`).join('')}
        ${!data.my_suppliers.length ? '<p class="text-center text-gray-400 py-8">등록한 협력사가 없습니다.</p>' : ''}
      </div>

      <div id="tab-feedback" class="mypage-panel hidden">
        <button id="open-feedback-btn" class="w-full py-3 rounded-xl btn-terracotta font-bold mb-3">
          <i class="fas fa-comment-medical"></i> 불만사항/수정요청 보내기
        </button>
        <div class="space-y-2">
          ${myFeedback.feedback.map((f) => `
            <div class="material-card p-3">
              <div class="flex justify-between items-center mb-1">
                <span class="text-[10px] px-1.5 py-0.5 rounded ${f.status === 'new' ? 'bg-terracotta/20 text-terracotta' : 'bg-sage/20 text-sage'} font-bold">${f.status === 'new' ? '접수됨' : f.status === 'resolved' ? '해결완료' : f.status}</span>
                <span class="text-[10px] text-gray-400">${new Date(f.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
              <p class="text-sm">${escapeHtml(f.content)}</p>
              ${f.admin_reply ? `<div class="bg-sage/10 rounded-lg p-2 mt-2 text-xs"><b>개발자 답변:</b> ${escapeHtml(f.admin_reply)}</div>` : ''}
            </div>`).join('')}
          ${!myFeedback.feedback.length ? '<p class="text-center text-gray-400 py-8">보낸 피드백이 없습니다.</p>' : ''}
        </div>
      </div>

      <button id="mypage-logout-btn" class="w-full py-3 rounded-xl bg-gray-100 font-bold text-gray-500 mt-6 mb-4">로그아웃</button>
    </div>
  </div>
  ${bottomNav('')}
  <div id="feedback-modal-container"></div>`;

  const tabs = document.querySelectorAll('.mypage-tab');
  function setTab(name) {
    tabs.forEach((t) => t.className = 'mypage-tab flex-1 py-2 rounded-full font-bold ' + (t.dataset.tab === name ? 'bg-deepgreen text-white' : 'text-gray-500'));
    document.querySelectorAll('.mypage-panel').forEach((p) => p.classList.toggle('hidden', p.id !== `tab-${name}`));
  }
  tabs.forEach((t) => t.onclick = () => setTab(t.dataset.tab));
  setTab('projects');

  document.getElementById('open-feedback-btn').onclick = openFeedbackModal;
  document.getElementById('mypage-logout-btn').onclick = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    try { await axios.post('/auth/logout'); } catch (e) {}
    clearSession();
    navigate('/onboarding');
  };
});

function activityLabel(action) {
  const map = {
    register: '계정 생성', login: '로그인', ai_chat: 'AI 상담', vision_scan: '카메라 분석',
    specbook_item_add: '스펙북 항목 추가', specbook_export: '엑셀 내보내기', project_create: '프로젝트 생성',
    project_invite: '팀원 초대', supplier_create: '협력업체 등록', supplier_rating: '업체 평가',
    price_report: '가격 제보', category_create: '카테고리 추가', material_photo_upload: '자재 사진 업로드',
    community_post: '게시글 작성', feedback_submit: '피드백 제출',
  };
  return map[action] || action;
}

function openFeedbackModal() {
  const container = document.getElementById('feedback-modal-container');
  container.innerHTML = `
  <div class="ai-sheet-overlay" id="feedback-overlay">
    <div class="ai-sheet p-5">
      <h2 class="font-bold text-lg mb-2">불만사항 / 수정요청</h2>
      <p class="text-xs text-gray-400 mb-4">개발자에게만 전달되며, 서비스 개선에 반영됩니다.</p>
      <textarea id="feedback-content" rows="5" placeholder="불편한 점이나 개선했으면 하는 부분을 자유롭게 적어주세요." class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-4"></textarea>
      <div class="flex gap-2">
        <button id="feedback-cancel" class="flex-1 py-3 rounded-xl bg-gray-100 font-bold">취소</button>
        <button id="feedback-submit" class="flex-1 py-3 rounded-xl btn-primary font-bold">보내기</button>
      </div>
    </div>
  </div>`;
  document.getElementById('feedback-cancel').onclick = () => container.innerHTML = '';
  document.getElementById('feedback-overlay').onclick = (e) => { if (e.target.id === 'feedback-overlay') container.innerHTML = ''; };
  document.getElementById('feedback-submit').onclick = async () => {
    const content = document.getElementById('feedback-content').value.trim();
    if (!content) return;
    await axios.post('/feedback', { content, category: 'manual' });
    container.innerHTML = '';
    alert('소중한 의견 감사합니다. 개발자가 확인 후 반영하겠습니다.');
    navigate('/mypage');
  };
}
