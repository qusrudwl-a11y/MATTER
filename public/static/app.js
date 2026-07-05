// ===== MATTER App - Frontend SPA =====
const API = {
  token: localStorage.getItem('matter_token') || null,
  user: JSON.parse(localStorage.getItem('matter_user') || 'null'),
};

axios.defaults.baseURL = '/api';
axios.interceptors.request.use((config) => {
  // 관리자 API 호출은 별도 토큰을 명시적으로 넘기므로 사용자 토큰으로 덮어쓰지 않음 (계정 체계 완전 분리)
  const isAdminCall = config.url && config.url.startsWith('/admin') && config.headers?.Authorization;
  if (API.token && !isAdminCall) config.headers.Authorization = `Bearer ${API.token}`;
  return config;
});

function setSession(token, user) {
  API.token = token;
  API.user = user;
  localStorage.setItem('matter_token', token);
  localStorage.setItem('matter_user', JSON.stringify(user));
}
function clearSession() {
  API.token = null;
  API.user = null;
  localStorage.removeItem('matter_token');
  localStorage.removeItem('matter_user');
}

// ===== Simple Hash Router =====
const routes = {};
function route(path, handler) { routes[path] = handler; }
function navigate(path) { window.location.hash = path; }

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) window.location.hash = '#/splash';
  render();
});

function currentPath() {
  return window.location.hash.replace('#', '') || '/splash';
}

async function render() {
  const path = currentPath();
  const app = document.getElementById('app');

  // 인증 필요 여부 체크 (splash, onboarding, admin 제외 - admin은 별도 세션 체계 사용)
  const publicPaths = ['/splash', '/onboarding', '/admin'];
  if (!API.token && !publicPaths.includes(path.split('?')[0])) {
    navigate('/onboarding');
    return;
  }

  const [base, queryStr] = path.split('?');
  const params = new URLSearchParams(queryStr || '');

  for (const key in routes) {
    const match = matchRoute(key, base);
    if (match) {
      app.innerHTML = '<div class="flex items-center justify-center h-screen"><div class="spinner"></div></div>';
      try {
        await routes[key](match, params);
      } catch (e) {
        console.error(e);
        app.innerHTML = `<div class="p-8 text-center text-red-500">오류가 발생했습니다: ${escapeHtml(String(e.message || e))}</div>`;
      }
      return;
    }
  }
  app.innerHTML = '<div class="p-8 text-center">페이지를 찾을 수 없습니다.</div>';
}

function matchRoute(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatPrice(min, max, unit) {
  if (!min && !max) return '가격 정보 없음';
  const fmt = (n) => n ? Number(n).toLocaleString('ko-KR') : '';
  if (min && max) return `${fmt(min)} ~ ${fmt(max)}원/${unit || '㎡'}`;
  return `${fmt(min || max)}원/${unit || '㎡'} 내외`;
}

// ===== Bottom Navigation (협력업체 고정 포함) =====
function bottomNav(active) {
  const items = [
    { key: 'home', icon: 'fa-house', label: '홈', path: '/home' },
    { key: 'suppliers', icon: 'fa-truck-fast', label: '협력업체', path: '/suppliers' },
    { key: 'camera', icon: 'fa-camera', label: '카메라', path: '/camera', isCamera: true },
    { key: 'community', icon: 'fa-comments', label: '커뮤니티', path: '/community' },
    { key: 'specbook', icon: 'fa-book', label: '스펙북', path: '/specbook' },
  ];
  return `
  <nav class="bottom-nav">
    ${items.map((it) => {
      if (it.isCamera) {
        return `<a href="#${it.path}" class="bottom-nav-item ${active === it.key ? 'active' : ''}">
          <div class="bottom-nav-camera"><i class="fas ${it.icon}"></i></div>
        </a>`;
      }
      return `<a href="#${it.path}" class="bottom-nav-item ${active === it.key ? 'active' : ''}">
        <i class="fas ${it.icon}"></i><span>${it.label}</span>
      </a>`;
    }).join('')}
  </nav>
  <button onclick="openAiSheet()" class="ai-fab"><i class="fas fa-comment-dots"></i></button>`;
}

function topHeader(title, opts = {}) {
  const userBtn = API.user
    ? `<button onclick="navigate('/mypage')" class="text-xs text-gray-400 flex items-center gap-1">
        <span>${escapeHtml(API.user.name || '')}님</span><i class="fas fa-chevron-right text-[8px]"></i>
      </button>`
    : '';
  return `
  <header class="sticky top-0 bg-[#F5F3EF] z-30 px-4 py-3 flex items-center gap-3 border-b border-[#e5e2da]">
    ${opts.back ? `<button onclick="history.back()" class="text-[#1F2421]"><i class="fas fa-arrow-left"></i></button>` : ''}
    <h1 class="text-lg font-bold flex-1">${title}</h1>
    ${opts.right || userBtn}
  </header>`;
}

window.navigate = navigate;
