// ===== AI 자재 상담 (하단 시트, 페이지 전환 없음) =====
let aiSheetOpen = false;

async function openAiSheet() {
  if (!API.token) { navigate('/onboarding'); return; }
  if (aiSheetOpen) return;
  aiSheetOpen = true;

  let container = document.getElementById('ai-sheet-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ai-sheet-container';
    document.getElementById('app').appendChild(container);
  }

  container.innerHTML = `
  <div class="ai-sheet-overlay" id="ai-sheet-overlay">
    <div class="ai-sheet" style="height: 80vh;">
      <div class="flex items-center justify-between p-4 border-b border-[#e5e2da]">
        <h2 class="font-bold"><i class="fas fa-comment-dots text-sage"></i> AI 자재 상담</h2>
        <button id="ai-sheet-close" class="text-gray-400"><i class="fas fa-times text-lg"></i></button>
      </div>
      <div id="ai-chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3"></div>
      <div class="p-3 border-t border-[#e5e2da] flex gap-2">
        <input id="ai-chat-input" type="text" placeholder="예) 물 쓰는 바닥에 좋은 자재 추천해줘"
          class="flex-1 px-4 py-3 rounded-full border border-[#e5e2da] text-sm" />
        <button id="ai-chat-send" class="w-11 h-11 rounded-full btn-primary flex items-center justify-center shrink-0">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  </div>`;

  document.getElementById('ai-sheet-close').onclick = closeAiSheet;
  document.getElementById('ai-sheet-overlay').onclick = (e) => { if (e.target.id === 'ai-sheet-overlay') closeAiSheet(); };

  const input = document.getElementById('ai-chat-input');
  const sendBtn = document.getElementById('ai-chat-send');
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAiMessage(); });
  sendBtn.onclick = sendAiMessage;

  await loadAiHistory();
}

function closeAiSheet() {
  aiSheetOpen = false;
  const container = document.getElementById('ai-sheet-container');
  if (container) container.innerHTML = '';
}

async function loadAiHistory() {
  const messagesEl = document.getElementById('ai-chat-messages');
  try {
    const { data } = await axios.get('/ai/chat/history');
    if (!data.messages.length) {
      messagesEl.innerHTML = `<div class="text-center text-gray-400 text-sm py-8">
        공간이나 조건을 알려주시면 딱 맞는 자재를 추천해드려요.<br/>예: "물 쓰는 바닥에 좋은 자재 추천해줘"
      </div>`;
      return;
    }
    messagesEl.innerHTML = data.messages.map(renderChatBubble).join('');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } catch (e) {
    messagesEl.innerHTML = '<p class="text-center text-red-400 text-sm">대화 이력을 불러올 수 없습니다.</p>';
  }
}

function renderChatBubble(msg) {
  const isUser = msg.role === 'user';
  return `<div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
    <div class="max-w-[80%] px-4 py-2.5 text-sm ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}">
      ${escapeHtml(msg.content)}
    </div>
  </div>`;
}

async function sendAiMessage() {
  const input = document.getElementById('ai-chat-input');
  const message = input.value.trim();
  if (!message) return;
  input.value = '';

  const messagesEl = document.getElementById('ai-chat-messages');
  messagesEl.innerHTML += `<div class="flex justify-end"><div class="max-w-[80%] px-4 py-2.5 text-sm chat-bubble-user">${escapeHtml(message)}</div></div>`;
  messagesEl.innerHTML += `<div id="ai-typing" class="flex justify-start"><div class="chat-bubble-ai px-4 py-2.5"><div class="spinner" style="width:16px;height:16px;"></div></div></div>`;
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const { data } = await axios.post('/ai/chat', { message });
    document.getElementById('ai-typing')?.remove();

    let html = `<div class="flex justify-start"><div class="max-w-[85%] chat-bubble-ai px-4 py-2.5 text-sm">${escapeHtml(data.reply)}</div></div>`;

    if (data.materials && data.materials.length) {
      html += `<div class="flex flex-wrap gap-2 justify-start pl-1">
        ${data.materials.map((m) => `
          <button onclick="closeAiSheet(); navigate('/material/${m.id}')"
            class="bg-white border border-[#e5e2da] rounded-xl px-3 py-2 text-xs flex items-center gap-2 shadow-sm">
            <span class="font-bold">${escapeHtml(m.name)}</span>
            <span class="text-sage"><i class="fas fa-arrow-right"></i></span>
          </button>`).join('')}
      </div>`;
    }
    messagesEl.innerHTML += html;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } catch (e) {
    document.getElementById('ai-typing')?.remove();
    messagesEl.innerHTML += `<div class="flex justify-start"><div class="chat-bubble-ai px-4 py-2.5 text-sm text-red-500">오류가 발생했습니다: ${escapeHtml(e.response?.data?.error || e.message)}</div></div>`;
  }
}

window.closeAiSheet = closeAiSheet;
