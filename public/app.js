/* ============================================================
 * ARIA workspace — frontend
 * Handles: model selection, multi-conversation history (localStorage),
 * streaming chat, and the model-provider manager.
 * ============================================================ */

const $ = (id) => document.getElementById(id);

const els = {
  messages: $('messages'),
  welcome: $('welcome'),
  welcomeSub: $('welcomeSub'),
  input: $('userInput'),
  sendBtn: $('sendBtn'),
  chatContainer: $('chatContainer'),
  modelSelect: $('modelSelect'),
  statusText: $('statusText'),
  statusDot: document.querySelector('.status-dot'),
  chatList: $('chatList'),
  sidebar: $('sidebar'),
  // modal
  settingsModal: $('settingsModal'),
  providerList: $('providerList'),
};

let providers = [];
let conversations = [];   // [{id, title, providerId, messages:[{role,content}]}]
let activeConvId = null;
let streaming = false;

/* ----------------------- Boot ----------------------- */
init();

async function init() {
  loadConversations();
  await loadProviders();
  bindUI();
  renderChatList();
  if (!conversations.length) newConversation();
  else openConversation(conversations[0].id);
}

/* ----------------------- Providers ----------------------- */
async function loadProviders() {
  try {
    const res = await fetch('/api/models');
    providers = await res.json();
  } catch {
    providers = [];
  }
  renderModelSelect();
}

function renderModelSelect() {
  const prev = els.modelSelect.value;
  els.modelSelect.innerHTML = '';
  if (!providers.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No models — click "Manage models"';
    els.modelSelect.appendChild(opt);
    setStatus('No model', 'error');
    return;
  }
  providers.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label + '  ·  ' + p.model;
    els.modelSelect.appendChild(opt);
  });
  // Restore selection: previous → active conversation's model → first.
  const conv = conversations.find((c) => c.id === activeConvId);
  const desired = providers.find((p) => p.id === prev) ? prev
    : (conv && providers.find((p) => p.id === conv.providerId)) ? conv.providerId
    : providers[0].id;
  els.modelSelect.value = desired;
  setStatus('Ready', 'ok');
}

function currentProviderId() {
  return els.modelSelect.value;
}

/* ----------------------- Conversations ----------------------- */
function loadConversations() {
  try {
    conversations = JSON.parse(localStorage.getItem('aria_conversations') || '[]');
  } catch {
    conversations = [];
  }
}

function persistConversations() {
  localStorage.setItem('aria_conversations', JSON.stringify(conversations));
}

function newConversation() {
  const conv = { id: crypto.randomUUID(), title: 'New chat', providerId: currentProviderId(), messages: [] };
  conversations.unshift(conv);
  persistConversations();
  renderChatList();
  openConversation(conv.id);
}

function openConversation(id) {
  activeConvId = id;
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;
  if (conv.providerId && providers.find((p) => p.id === conv.providerId)) {
    els.modelSelect.value = conv.providerId;
  }
  renderMessages(conv);
  renderChatList();
  closeSidebarMobile();
}

function deleteConversation(id) {
  conversations = conversations.filter((c) => c.id !== id);
  persistConversations();
  if (activeConvId === id) {
    if (conversations.length) openConversation(conversations[0].id);
    else newConversation();
  } else {
    renderChatList();
  }
}

function renderChatList() {
  els.chatList.innerHTML = '';
  conversations.forEach((conv) => {
    const item = document.createElement('div');
    item.className = 'chat-item' + (conv.id === activeConvId ? ' active' : '');
    item.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" style="width:15px;height:15px;flex-shrink:0;opacity:.6"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="chat-title"></span>
      <button class="chat-del" title="Delete"><svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    item.querySelector('.chat-title').textContent = conv.title;
    item.addEventListener('click', () => openConversation(conv.id));
    item.querySelector('.chat-del').addEventListener('click', (e) => { e.stopPropagation(); deleteConversation(conv.id); });
    els.chatList.appendChild(item);
  });
}

function renderMessages(conv) {
  els.messages.innerHTML = '';
  if (!conv.messages.length) {
    showWelcome();
    return;
  }
  conv.messages.forEach((m) => appendMessage(m.role, m.content));
  scrollToBottom();
}

function showWelcome() {
  const hasModels = providers.length > 0;
  els.messages.innerHTML = `
    <div class="welcome-screen" id="welcome">
      <div class="welcome-icon"><div class="pulse-ring"></div><span>A</span></div>
      <h2>How can I help you today?</h2>
      <p>${hasModels ? "I'm ARIA — your AI employee. Pick a model and ask me anything." : 'Add a model first — click <strong>Manage models</strong> to connect a local or cloud model.'}</p>
      <div class="suggestion-grid">
        <button class="suggestion-btn" data-prompt="Write a Python function that sorts a list of dictionaries by multiple keys efficiently."><span class="suggestion-icon">⌨</span><span>Write code</span></button>
        <button class="suggestion-btn" data-prompt="What's the best strategy to grow a SaaS startup from 0 to $1M ARR?"><span class="suggestion-icon">📈</span><span>Business strategy</span></button>
        <button class="suggestion-btn" data-prompt="Explain quantum entanglement in simple terms and its practical applications."><span class="suggestion-icon">🔬</span><span>Explain science</span></button>
        <button class="suggestion-btn" data-prompt="My React component re-renders infinitely. What are the likely causes and fixes?"><span class="suggestion-icon">🔧</span><span>Debug a problem</span></button>
      </div>
    </div>`;
  els.messages.querySelectorAll('.suggestion-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      els.input.value = btn.dataset.prompt;
      els.input.dispatchEvent(new Event('input'));
      sendMessage();
    });
  });
}

/* ----------------------- Chat ----------------------- */
function bindUI() {
  els.input.addEventListener('input', () => {
    els.input.style.height = 'auto';
    els.input.style.height = Math.min(els.input.scrollHeight, 200) + 'px';
    els.sendBtn.disabled = els.input.value.trim() === '' || streaming;
  });
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!els.sendBtn.disabled) sendMessage(); }
  });
  els.sendBtn.addEventListener('click', sendMessage);

  $('newChatBtn').addEventListener('click', newConversation);
  $('newChatWide').addEventListener('click', newConversation);
  $('menuBtn').addEventListener('click', () => els.sidebar.classList.toggle('open'));
  els.modelSelect.addEventListener('change', () => {
    const conv = conversations.find((c) => c.id === activeConvId);
    if (conv) { conv.providerId = currentProviderId(); persistConversations(); }
  });

  // Settings modal
  $('settingsBtn').addEventListener('click', openSettings);
  $('closeSettings').addEventListener('click', closeSettings);
  els.settingsModal.addEventListener('click', (e) => { if (e.target === els.settingsModal) closeSettings(); });
  bindForm();
}

function sendMessage() {
  const text = els.input.value.trim();
  if (!text || streaming) return;
  if (!currentProviderId()) { openSettings(); return; }

  const conv = conversations.find((c) => c.id === activeConvId);
  if (!conv) return;

  if (els.welcome || document.getElementById('welcome')) {
    const w = document.getElementById('welcome');
    if (w) w.remove();
  }

  els.input.value = '';
  els.input.style.height = 'auto';

  appendMessage('user', text);
  conv.messages.push({ role: 'user', content: text });
  if (conv.title === 'New chat') {
    conv.title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
    renderChatList();
  }
  conv.providerId = currentProviderId();
  persistConversations();

  streamResponse(conv);
}

function appendMessage(role, content) {
  const msgEl = document.createElement('div');
  msgEl.className = `message ${role}`;
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'You' : 'ARIA';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  if (role === 'assistant') bubble.innerHTML = renderMarkdown(content);
  else bubble.textContent = content;
  msgEl.appendChild(label);
  msgEl.appendChild(bubble);
  els.messages.appendChild(msgEl);
  scrollToBottom();
  return bubble;
}

function showTyping() {
  const msgEl = document.createElement('div');
  msgEl.className = 'message assistant typing-indicator';
  msgEl.id = 'typing-indicator';
  msgEl.innerHTML = `<div class="message-label">ARIA</div><div class="message-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  els.messages.appendChild(msgEl);
  scrollToBottom();
}
function removeTyping() { const el = $('typing-indicator'); if (el) el.remove(); }

async function streamResponse(conv) {
  streaming = true;
  setStatus('Thinking…', 'busy');
  els.sendBtn.disabled = true;
  showTyping();

  let fullText = '';
  let bubble = null;
  let started = false;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: currentProviderId(), messages: conv.messages }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        let event;
        try { event = JSON.parse(raw); } catch { continue; }

        if (event.type === 'text') {
          if (!started) { removeTyping(); bubble = appendMessage('assistant', ''); started = true; setStatus('Responding…', 'busy'); }
          fullText += event.content;
          bubble.innerHTML = renderMarkdown(fullText);
          scrollToBottom();
        } else if (event.type === 'error') {
          removeTyping();
          appendMessage('assistant', '⚠ ' + (event.content || 'An error occurred.'));
          throw new Error(event.content || 'stream error');
        }
      }
    }

    if (fullText) {
      conv.messages.push({ role: 'assistant', content: fullText });
      persistConversations();
    }
    setStatus('Ready', 'ok');
  } catch (err) {
    console.error(err);
    removeTyping();
    if (!started) appendMessage('assistant', '⚠ ' + err.message);
    setStatus('Error', 'error');
  } finally {
    removeTyping();
    streaming = false;
    els.sendBtn.disabled = els.input.value.trim() === '';
    els.input.focus();
  }
}

function setStatus(text, kind) {
  els.statusText.textContent = text;
  els.statusDot.className = 'status-dot' + (kind === 'busy' ? ' busy' : kind === 'error' ? ' error' : '');
}

function scrollToBottom() { els.chatContainer.scrollTop = els.chatContainer.scrollHeight; }
function closeSidebarMobile() { if (window.innerWidth <= 820) els.sidebar.classList.remove('open'); }

/* ----------------------- Settings / provider manager ----------------------- */
let formType = 'anthropic';

function openSettings() { els.settingsModal.hidden = false; renderProviderCards(); resetForm(); }
function closeSettings() { els.settingsModal.hidden = true; }

function renderProviderCards() {
  els.providerList.innerHTML = '';
  if (!providers.length) {
    els.providerList.innerHTML = '<div class="empty-note">No models yet. Add one below — a local server (Ollama, LM Studio) or a cloud API (Claude, OpenAI, OpenRouter…).</div>';
    return;
  }
  providers.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'provider-card';
    const typeLabel = p.type === 'anthropic' ? 'Claude' : 'OpenAI-compatible';
    const where = p.baseURL ? p.baseURL : (p.type === 'anthropic' ? 'api.anthropic.com' : 'api.openai.com');
    card.innerHTML = `
      <div class="pc-icon ${p.type}">${p.type === 'anthropic' ? 'AI' : 'API'}</div>
      <div class="pc-info">
        <div class="pc-label"></div>
        <div class="pc-meta"></div>
      </div>
      <div class="pc-actions">
        <button class="edit" title="Edit"><svg viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="del" title="Delete"><svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>`;
    card.querySelector('.pc-label').textContent = p.label;
    card.querySelector('.pc-meta').textContent = `${typeLabel} · ${p.model} · ${where}${p.hasKey ? ' · key set' : ''}`;
    card.querySelector('.edit').addEventListener('click', () => editProvider(p));
    card.querySelector('.del').addEventListener('click', () => removeProvider(p));
    els.providerList.appendChild(card);
  });
}

function bindForm() {
  document.querySelectorAll('.seg').forEach((seg) => {
    seg.addEventListener('click', () => setFormType(seg.dataset.type));
  });
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => { $('fBaseUrl').value = chip.dataset.url; });
  });
  $('fetchModelsBtn').addEventListener('click', fetchAvailableModels);
  $('fModelList').addEventListener('change', (e) => { if (e.target.value) $('fModel').value = e.target.value; });
  $('testBtn').addEventListener('click', testConnection);
  $('saveBtn').addEventListener('click', saveProvider);
  $('cancelEditBtn').addEventListener('click', resetForm);
}

function setFormType(type) {
  formType = type;
  document.querySelectorAll('.seg').forEach((s) => s.classList.toggle('active', s.dataset.type === type));
  const isLocal = type === 'openai';
  $('baseUrlRow').style.display = '';
  $('baseUrlHint').textContent = isLocal ? '(local server or provider endpoint)' : '(optional — leave blank for Anthropic)';
  $('fBaseUrl').placeholder = isLocal ? 'http://localhost:11434/v1' : 'https://api.anthropic.com (optional)';
  $('keyHint').textContent = isLocal ? '(leave blank for local servers)' : '(required for Claude)';
  $('thinkingRow').style.display = type === 'anthropic' ? '' : 'none';
  $('fModel').placeholder = type === 'anthropic' ? 'claude-opus-4-8' : 'llama3.1 / gpt-4o / mistral';
}

function resetForm() {
  $('editId').value = '';
  $('fLabel').value = '';
  $('fBaseUrl').value = '';
  $('fKey').value = '';
  $('fModel').value = '';
  $('fMaxTokens').value = '4096';
  $('fThinking').checked = true;
  $('fSystem').value = '';
  $('fModelList').hidden = true;
  $('fModelList').innerHTML = '';
  $('formTitle').textContent = 'Add a model';
  $('saveBtn').textContent = 'Save model';
  $('cancelEditBtn').hidden = true;
  setFormMsg('', '');
  setFormType('anthropic');
}

function editProvider(p) {
  $('editId').value = p.id;
  $('fLabel').value = p.label;
  $('fBaseUrl').value = p.baseURL || '';
  $('fKey').value = '';
  $('fKey').placeholder = p.hasKey ? '•••••••• (unchanged — type to replace)' : 'sk-... or leave blank';
  $('fModel').value = p.model;
  $('fMaxTokens').value = p.maxTokens || 4096;
  $('fThinking').checked = !!p.thinking;
  $('fSystem').value = p.system || '';
  $('formTitle').textContent = 'Edit model';
  $('saveBtn').textContent = 'Update model';
  $('cancelEditBtn').hidden = false;
  setFormType(p.type);
  setFormMsg('', '');
  els.providerList.scrollIntoView({ behavior: 'smooth' });
}

function collectForm() {
  return {
    type: formType,
    label: $('fLabel').value,
    baseURL: $('fBaseUrl').value,
    apiKey: $('fKey').value,
    model: $('fModel').value,
    maxTokens: $('fMaxTokens').value,
    thinking: $('fThinking').checked,
    system: $('fSystem').value,
  };
}

async function fetchAvailableModels() {
  setFormMsg('Connecting…', '');
  const payload = collectForm();
  const editId = $('editId').value;
  if (editId && !payload.apiKey) payload.id = editId; // reuse stored key
  try {
    const res = await fetch('/api/models/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!data.ok) { setFormMsg(data.error || 'Could not fetch models.', 'err'); return; }
    const sel = $('fModelList');
    sel.innerHTML = '<option value="">— pick from ' + data.models.length + ' available —</option>';
    data.models.forEach((m) => { const o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o); });
    sel.hidden = false;
    setFormMsg(`Found ${data.models.length} models.`, 'ok');
  } catch (err) {
    setFormMsg('Connection failed: ' + err.message, 'err');
  }
}

async function testConnection() {
  setFormMsg('Testing…', '');
  const payload = collectForm();
  const editId = $('editId').value;
  if (editId && !payload.apiKey) payload.id = editId;
  try {
    const res = await fetch('/api/models/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.ok) setFormMsg(`✓ Connected — ${data.models.length} models reachable.`, 'ok');
    else setFormMsg('✕ ' + (data.error || 'Connection failed.'), 'err');
  } catch (err) {
    setFormMsg('✕ ' + err.message, 'err');
  }
}

async function saveProvider() {
  const payload = collectForm();
  if (!payload.model.trim()) { setFormMsg('A model id is required.', 'err'); return; }
  const editId = $('editId').value;
  setFormMsg('Saving…', '');
  try {
    const url = editId ? `/api/models/${editId}` : '/api/models';
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setFormMsg(data.error || 'Save failed.', 'err'); return; }
    await loadProviders();
    renderProviderCards();
    resetForm();
    setFormMsg('Saved.', 'ok');
  } catch (err) {
    setFormMsg('Save failed: ' + err.message, 'err');
  }
}

async function removeProvider(p) {
  if (!confirm(`Delete "${p.label}"?`)) return;
  await fetch(`/api/models/${p.id}`, { method: 'DELETE' });
  await loadProviders();
  renderProviderCards();
}

function setFormMsg(text, kind) {
  const el = $('formMsg');
  el.textContent = text;
  el.className = 'form-msg' + (kind ? ' ' + kind : '');
}

/* ----------------------- Markdown ----------------------- */
function renderMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${code.replace(/\n$/, '')}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^[*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, (m) => `<ul>${m}</ul>`);
  html = html
    .split(/\n\n+/)
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-3]|ul|ol|li|pre|blockquote)/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
  return html;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
