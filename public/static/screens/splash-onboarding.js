// ===== 표지 (Splash) =====
route('/splash', async () => {
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="min-h-screen flex flex-col items-center justify-center bg-deepgreen text-white px-8">
    <div class="flex gap-2 mb-8">
      <div class="w-8 h-20 rounded" style="background:#5E9285"></div>
      <div class="w-8 h-28 rounded" style="background:#B85042"></div>
      <div class="w-8 h-16 rounded" style="background:#F5F3EF"></div>
    </div>
    <h1 class="text-4xl font-black tracking-widest mb-2">MATTER</h1>
    <p class="text-xs tracking-[0.3em] text-white/60 mb-10">MATERIAL LIBRARY</p>
    <p class="text-center text-white/80 text-sm leading-relaxed mb-12">
      마감재 정보 · 시장가 · 협력업체 · AI 상담 · 스펙북<br/>
      현장과 사무실을 잇는 자재 통합 플랫폼
    </p>
    <button id="splash-start" class="w-full max-w-xs py-3.5 rounded-full bg-white text-deepgreen font-bold">
      시작하기
    </button>
  </div>`;
  document.getElementById('splash-start').onclick = () => {
    if (API.token) navigate('/home'); else navigate('/onboarding');
  };
});

// ===== 기본 정보 입력 (Onboarding: 계정생성/로그인) =====
route('/onboarding', async () => {
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="min-h-screen flex flex-col justify-center px-6 bg-[#F5F3EF]">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-black text-deepgreen mb-1">MATTER 시작하기</h1>
      <p class="text-sm text-gray-500">회사 · 이름 · 직급 · 연락처만 입력하면 바로 이용할 수 있어요.</p>
    </div>

    <div class="flex bg-white rounded-full p-1 mb-6 shadow-sm">
      <button id="tab-register" class="flex-1 py-2 rounded-full text-sm font-bold bg-deepgreen text-white">계정 만들기</button>
      <button id="tab-login" class="flex-1 py-2 rounded-full text-sm font-bold text-gray-500">기존 계정 로그인</button>
    </div>

    <div id="form-register" class="space-y-3">
      <input id="reg-company" type="text" placeholder="회사명" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] bg-white" />
      <input id="reg-name" type="text" placeholder="이름" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] bg-white" />
      <input id="reg-position" type="text" placeholder="직급/직무 (예: 사원, 디자이너)" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] bg-white" />
      <input id="reg-phone" type="tel" placeholder="연락처 (숫자만, 예: 01012345678)" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] bg-white" />
      <button id="reg-submit" class="w-full py-3.5 rounded-xl btn-primary font-bold mt-2">계정 만들고 시작하기</button>
    </div>

    <div id="form-login" class="space-y-3 hidden">
      <input id="login-phone" type="tel" placeholder="가입한 연락처 (숫자만)" class="w-full px-4 py-3 rounded-xl border border-[#e5e2da] bg-white" />
      <button id="login-submit" class="w-full py-3.5 rounded-xl btn-primary font-bold mt-2">로그인</button>
    </div>

    <p id="onboarding-error" class="text-terracotta text-sm text-center mt-4 hidden"></p>
    <p class="text-xs text-gray-400 text-center mt-6">입력하신 정보는 스펙북·견적 산출물 작성에만 사용됩니다.</p>
  </div>`;

  const tabRegister = document.getElementById('tab-register');
  const tabLogin = document.getElementById('tab-login');
  const formRegister = document.getElementById('form-register');
  const formLogin = document.getElementById('form-login');
  const errorEl = document.getElementById('onboarding-error');

  tabRegister.onclick = () => {
    tabRegister.className = 'flex-1 py-2 rounded-full text-sm font-bold bg-deepgreen text-white';
    tabLogin.className = 'flex-1 py-2 rounded-full text-sm font-bold text-gray-500';
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
  };
  tabLogin.onclick = () => {
    tabLogin.className = 'flex-1 py-2 rounded-full text-sm font-bold bg-deepgreen text-white';
    tabRegister.className = 'flex-1 py-2 rounded-full text-sm font-bold text-gray-500';
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
  };

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }

  document.getElementById('reg-submit').onclick = async () => {
    errorEl.classList.add('hidden');
    const company = document.getElementById('reg-company').value.trim();
    const name = document.getElementById('reg-name').value.trim();
    const position = document.getElementById('reg-position').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    if (!company || !name || !position || !phone) return showError('모든 항목을 입력해주세요.');
    try {
      const { data } = await axios.post('/auth/register', { company, name, position, phone });
      setSession(data.token, data.user);
      navigate('/home');
    } catch (e) {
      showError(e.response?.data?.error || '가입 중 오류가 발생했습니다.');
    }
  };

  document.getElementById('login-submit').onclick = async () => {
    errorEl.classList.add('hidden');
    const phone = document.getElementById('login-phone').value.trim();
    if (!phone) return showError('연락처를 입력해주세요.');
    try {
      const { data } = await axios.post('/auth/login', { phone });
      setSession(data.token, data.user);
      navigate('/home');
    } catch (e) {
      showError(e.response?.data?.error || '로그인 중 오류가 발생했습니다.');
    }
  };
});
