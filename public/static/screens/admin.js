// ===== 관리자(개발자) 전용 화면 =====
// 일반 사용자 세션과 완전히 분리된 별도 토큰(matter_admin_token)을 사용합니다.
// 사용자는 이 화면의 존재를 알 수 없고, 오직 개발자가 직접 URL(#/admin)로 접근합니다.
const AdminAPI = { token: localStorage.getItem('matter_admin_token') || null };

function adminAuthed() { return !!AdminAPI.token; }
function adminHeaders() { return { Authorization: `Bearer ${AdminAPI.token}` }; }

route('/admin', async () => {
  const app = document.getElementById('app');
  if (!adminAuthed()) {
    renderAdminLogin();
    return;
  }
  try {
    await renderAdminDashboard();
  } catch (e) {
    if (e.response?.status === 401 || e.response?.status === 403) {
      localStorage.removeItem('matter_admin_token');
      AdminAPI.token = null;
      renderAdminLogin();
    } else {
      throw e;
    }
  }
});

function renderAdminLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="min-h-screen flex flex-col justify-center px-6 bg-deepgreen">
    <div class="text-center mb-8">
      <i class="fas fa-user-shield text-white text-3xl mb-3"></i>
      <h1 class="text-xl font-black text-white">MATTER 관리자</h1>
      <p class="text-xs text-white/50 mt-1">개발자 전용 - 일반 사용자 계정과 무관합니다</p>
    </div>
    <input id="admin-passcode" type="password" placeholder="관리자 패스코드" class="w-full px-4 py-3 rounded-xl mb-3" />
    <div id="admin-login-error" class="text-terracotta text-sm text-center mb-3 hidden"></div>
    <button id="admin-login-btn" class="w-full py-3.5 rounded-xl bg-white text-deepgreen font-bold">로그인</button>
  </div>`;

  document.getElementById('admin-login-btn').onclick = async () => {
    const passcode = document.getElementById('admin-passcode').value.trim();
    const errEl = document.getElementById('admin-login-error');
    errEl.classList.add('hidden');
    try {
      const { data } = await axios.post('/admin/login', { passcode });
      AdminAPI.token = data.token;
      localStorage.setItem('matter_admin_token', data.token);
      navigate('/admin');
      render();
    } catch (e) {
      errEl.textContent = e.response?.data?.error || '로그인 실패';
      errEl.classList.remove('hidden');
    }
  };
}

async function renderAdminDashboard() {
  const app = document.getElementById('app');
  const [{ data: stats }, { data: usersData }, { data: feedbackData }, { data: activityData }] = await Promise.all([
    axios.get('/admin/stats', { headers: adminHeaders() }),
    axios.get('/admin/users', { headers: adminHeaders() }),
    axios.get('/admin/feedback', { headers: adminHeaders() }),
    axios.get('/admin/activity', { headers: adminHeaders() }),
  ]);

  app.innerHTML = `
  <div class="page bg-[#F5F3EF]">
    <header class="sticky top-0 bg-deepgreen text-white z-30 px-4 py-3 flex items-center justify-between">
      <h1 class="text-lg font-bold"><i class="fas fa-user-shield"></i> 관리자 대시보드</h1>
      <button id="admin-logout-btn" class="text-xs text-white/60">로그아웃</button>
    </header>

    <div class="px-4 pt-4">
      <div class="grid grid-cols-3 gap-2 mb-5">
        ${statCard('사용자', stats.users, 'fa-users')}
        ${statCard('자재', stats.materials, 'fa-cube')}
        ${statCard('프로젝트', stats.projects, 'fa-book')}
        ${statCard('신규 피드백', stats.new_feedback, 'fa-comment-dots', true)}
        ${statCard('협력업체', stats.suppliers, 'fa-truck-fast')}
        ${statCard('게시글', stats.posts, 'fa-comments')}
      </div>

      <div class="flex bg-white rounded-full p-1 mb-4 shadow-sm text-xs">
        <button class="admin-tab flex-1 py-2 rounded-full font-bold" data-tab="feedback">피드백/불만</button>
        <button class="admin-tab flex-1 py-2 rounded-full font-bold" data-tab="users">사용자</button>
        <button class="admin-tab flex-1 py-2 rounded-full font-bold" data-tab="activity">전체 사용내역</button>
      </div>

      <div id="admin-tab-feedback" class="admin-panel space-y-2 pb-8">
        ${feedbackData.feedback.map((f) => `
          <div class="material-card p-3">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs font-bold">${escapeHtml(f.company)} · ${escapeHtml(f.name)} (${escapeHtml(f.phone)})</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded ${f.status === 'new' ? 'bg-terracotta/20 text-terracotta' : 'bg-sage/20 text-sage'} font-bold">${f.status}</span>
            </div>
            <p class="text-sm mb-2">${escapeHtml(f.content)}</p>
            <div class="text-[10px] text-gray-400 mb-2">${new Date(f.created_at).toLocaleString('ko-KR')} · 분류: ${f.category}</div>
            ${f.admin_reply ? `<div class="bg-sage/10 rounded p-2 text-xs mb-2"><b>답변:</b> ${escapeHtml(f.admin_reply)}</div>` : ''}
            <div class="flex gap-2">
              <button class="admin-resolve-btn text-xs px-2 py-1 rounded bg-sage/20 text-sage font-bold" data-id="${f.id}">해결완료 처리</button>
              <button class="admin-reply-btn text-xs px-2 py-1 rounded bg-gray-100 font-bold" data-id="${f.id}">답변 작성</button>
            </div>
          </div>`).join('')}
        ${!feedbackData.feedback.length ? '<p class="text-center text-gray-400 py-8">접수된 피드백이 없습니다.</p>' : ''}
      </div>

      <div id="admin-tab-users" class="admin-panel space-y-2 pb-8 hidden">
        ${usersData.users.map((u) => `
          <div class="material-card p-3">
            <div class="font-bold text-sm">${escapeHtml(u.company)} · ${escapeHtml(u.name)} (${escapeHtml(u.position)})</div>
            <div class="text-xs text-gray-400 mt-0.5">${escapeHtml(u.phone)} · 가입: ${new Date(u.created_at).toLocaleDateString('ko-KR')}</div>
            <div class="text-xs text-gray-400">프로젝트 ${u.project_count}개 · 활동 ${u.activity_count}건</div>
          </div>`).join('')}
      </div>

      <div id="admin-tab-activity" class="admin-panel space-y-1 pb-8 hidden">
        ${activityData.logs.map((l) => `
          <div class="bg-white rounded-lg p-2.5 text-xs">
            <div class="flex justify-between">
              <span class="font-bold text-sage">${escapeHtml(l.action)}</span>
              <span class="text-gray-400">${new Date(l.created_at).toLocaleString('ko-KR')}</span>
            </div>
            <div class="text-gray-500 mt-0.5">${escapeHtml(l.company || '-')} · ${escapeHtml(l.name || '-')} ${l.detail ? '· ' + escapeHtml(String(l.detail).slice(0,60)) : ''}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;

  const tabs = document.querySelectorAll('.admin-tab');
  function setTab(name) {
    tabs.forEach((t) => t.className = 'admin-tab flex-1 py-2 rounded-full font-bold ' + (t.dataset.tab === name ? 'bg-deepgreen text-white' : 'text-gray-500'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.toggle('hidden', p.id !== `admin-tab-${name}`));
  }
  tabs.forEach((t) => t.onclick = () => setTab(t.dataset.tab));
  setTab('feedback');

  document.getElementById('admin-logout-btn').onclick = () => {
    localStorage.removeItem('matter_admin_token');
    AdminAPI.token = null;
    navigate('/admin');
    render();
  };

  document.querySelectorAll('.admin-resolve-btn').forEach((btn) => {
    btn.onclick = async () => {
      await axios.put(`/admin/feedback/${btn.dataset.id}`, { status: 'resolved' }, { headers: adminHeaders() });
      navigate('/admin'); render();
    };
  });
  document.querySelectorAll('.admin-reply-btn').forEach((btn) => {
    btn.onclick = async () => {
      const reply = prompt('사용자에게 보낼 답변을 입력하세요:');
      if (!reply) return;
      await axios.put(`/admin/feedback/${btn.dataset.id}`, { admin_reply: reply, status: 'resolved' }, { headers: adminHeaders() });
      navigate('/admin'); render();
    };
  });
}

function statCard(label, value, icon, highlight) {
  return `<div class="bg-white rounded-xl p-3 text-center ${highlight && value > 0 ? 'ring-2 ring-terracotta' : ''}">
    <i class="fas ${icon} text-sage mb-1"></i>
    <div class="text-lg font-black">${value ?? 0}</div>
    <div class="text-[10px] text-gray-400">${label}</div>
  </div>`;
}
