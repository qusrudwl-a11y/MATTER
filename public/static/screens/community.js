// ===== 커뮤니티 게시판 (비밀글 설정 가능) =====
route('/community', async () => {
  const app = document.getElementById('app');
  const { data } = await axios.get('/community/posts');

  app.innerHTML = `
  <div class="page">
    ${topHeader('커뮤니티', { right: `<button id="new-post-btn" class="text-sage font-bold text-sm"><i class="fas fa-pen"></i> 글쓰기</button>` })}
    <div class="px-4 pt-4 space-y-2">
      ${data.posts.map((p) => `
        <a href="#/community/${p.id}" class="material-card flex items-center justify-between p-4">
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm truncate">
              ${p.is_private ? '<i class="fas fa-lock text-gray-400 mr-1"></i>' : ''}${escapeHtml(p.title)}
            </div>
            <div class="text-xs text-gray-400 mt-0.5">${escapeHtml(p.company)} · ${escapeHtml(p.name)} · 댓글 ${p.comment_count} · 조회 ${p.view_count}</div>
          </div>
          <i class="fas fa-chevron-right text-gray-300"></i>
        </a>`).join('')}
      ${!data.posts.length ? '<p class="text-center text-gray-400 py-12">첫 게시글을 작성해보세요.</p>' : ''}
    </div>
  </div>
  ${bottomNav('community')}
  <div id="post-modal-container"></div>`;

  document.getElementById('new-post-btn').onclick = openNewPostModal;
});

route('/community/:id', async (params, urlParams) => {
  const app = document.getElementById('app');
  const pin = urlParams.get('pin') || '';
  let data;
  try {
    const res = await axios.get(`/community/posts/${params.id}`, { params: pin ? { pin } : {} });
    data = res.data;
  } catch (e) {
    if (e.response?.status === 403 && e.response?.data?.locked) {
      renderPinPrompt(params.id);
      return;
    }
    throw e;
  }

  const post = data.post;
  app.innerHTML = `
  <div class="page">
    ${topHeader('게시글', { back: true, right: data.is_owner ? `<button id="delete-post-btn" class="text-red-400 text-sm"><i class="fas fa-trash"></i></button>` : '' })}
    <div class="px-5 pt-4">
      <h1 class="text-xl font-black mb-1">${post.is_private ? '<i class="fas fa-lock text-gray-400 mr-1"></i>' : ''}${escapeHtml(post.title)}</h1>
      <div class="text-xs text-gray-400 mb-4">${escapeHtml(post.company)} · ${escapeHtml(post.name)} · ${new Date(post.created_at).toLocaleString('ko-KR')}</div>
      <div class="bg-white rounded-xl p-4 mb-6 text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(post.content)}</div>

      <h3 class="font-bold text-sm mb-2">댓글 ${data.comments.length}</h3>
      <div class="space-y-2 mb-4">
        ${data.comments.map((cm) => `
          <div class="material-card p-3">
            <div class="text-xs font-bold text-gray-500 mb-1">${escapeHtml(cm.company)} · ${escapeHtml(cm.name)}</div>
            <p class="text-sm">${escapeHtml(cm.content)}</p>
          </div>`).join('')}
        ${!data.comments.length ? '<p class="text-sm text-gray-400">첫 댓글을 남겨보세요.</p>' : ''}
      </div>
      <div class="flex gap-2 mb-8">
        <input id="comment-input" placeholder="댓글을 입력하세요" class="flex-1 px-4 py-3 rounded-xl border border-[#e5e2da]" />
        <button id="comment-submit" class="w-12 h-12 rounded-xl btn-primary flex items-center justify-center"><i class="fas fa-paper-plane"></i></button>
      </div>
    </div>
  </div>
  ${bottomNav('community')}`;

  document.getElementById('comment-submit').onclick = async () => {
    const content = document.getElementById('comment-input').value.trim();
    if (!content) return;
    await axios.post(`/community/posts/${params.id}/comments`, { content, pin });
    navigate(`/community/${params.id}${pin ? '?pin=' + pin : ''}`);
  };

  if (data.is_owner) {
    document.getElementById('delete-post-btn').onclick = async () => {
      if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
      await axios.delete(`/community/posts/${params.id}`);
      navigate('/community');
    };
  }
});

function renderPinPrompt(postId) {
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="page">
    ${topHeader('비밀글', { back: true })}
    <div class="px-6 pt-16 flex flex-col items-center">
      <i class="fas fa-lock text-4xl text-gray-300 mb-4"></i>
      <p class="text-sm text-gray-500 mb-4">이 글은 비밀글입니다. PIN을 입력해주세요.</p>
      <input id="pin-input" type="password" inputmode="numeric" placeholder="PIN 번호" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-3 text-center" />
      <div id="pin-error" class="text-terracotta text-sm mb-3 hidden">PIN이 올바르지 않습니다.</div>
      <button id="pin-submit" class="w-full py-3 rounded-xl btn-primary font-bold">확인</button>
    </div>
  </div>
  ${bottomNav('community')}`;

  document.getElementById('pin-submit').onclick = () => {
    const pin = document.getElementById('pin-input').value.trim();
    if (!pin) return;
    navigate(`/community/${postId}?pin=${encodeURIComponent(pin)}`);
  };
}

function openNewPostModal() {
  const container = document.getElementById('post-modal-container');
  container.innerHTML = `
  <div class="ai-sheet-overlay" id="post-modal-overlay">
    <div class="ai-sheet p-5 overflow-y-auto" style="max-height:85vh;">
      <h2 class="font-bold text-lg mb-4">게시글 작성</h2>
      <input id="post-title" placeholder="제목" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-3" />
      <textarea id="post-content" rows="6" placeholder="내용을 입력하세요" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-3"></textarea>
      <label class="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" id="post-private" /> 비밀글로 설정
      </label>
      <input id="post-pin" type="password" inputmode="numeric" placeholder="PIN (4자리 이상)" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] mb-4 hidden" />
      <div class="flex gap-2">
        <button id="post-cancel" class="flex-1 py-3 rounded-xl bg-gray-100 font-bold">취소</button>
        <button id="post-submit" class="flex-1 py-3 rounded-xl btn-primary font-bold">등록</button>
      </div>
    </div>
  </div>`;

  const privateCheck = document.getElementById('post-private');
  const pinInput = document.getElementById('post-pin');
  privateCheck.onchange = () => pinInput.classList.toggle('hidden', !privateCheck.checked);

  document.getElementById('post-cancel').onclick = () => container.innerHTML = '';
  document.getElementById('post-modal-overlay').onclick = (e) => { if (e.target.id === 'post-modal-overlay') container.innerHTML = ''; };
  document.getElementById('post-submit').onclick = async () => {
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const isPrivate = privateCheck.checked;
    const pin = pinInput.value.trim();
    if (!title || !content) return alert('제목과 내용을 입력해주세요.');
    if (isPrivate && pin.length < 4) return alert('비밀글은 4자리 이상 PIN이 필요합니다.');
    try {
      await axios.post('/community/posts', { title, content, is_private: isPrivate, pin });
      container.innerHTML = '';
      navigate('/community');
    } catch (e) {
      alert(e.response?.data?.error || '등록 중 오류가 발생했습니다.');
    }
  };
}
