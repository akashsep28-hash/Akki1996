const messagesEl = document.getElementById('messages');
const welcomeEl = document.getElementById('welcome');
const inputEl = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

const conversationHistory = [];

// Auto-resize textarea
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + 'px';
  sendBtn.disabled = inputEl.value.trim() === '';
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

// Suggestion buttons
document.querySelectorAll('.suggestion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    inputEl.value = btn.dataset.prompt;
    inputEl.dispatchEvent(new Event('input'));
    sendMessage();
  });
});

function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  if (welcomeEl) welcomeEl.remove();

  inputEl.value = '';
  inputEl.style.height = 'auto';
  sendBtn.disabled = true;

  appendMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });

  streamResponse();
}

function appendMessage(role, content) {
  const msgEl = document.createElement('div');
  msgEl.className = `message ${role}`;

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'You' : 'ARIA';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  if (role === 'assistant') {
    bubble.innerHTML = renderMarkdown(content);
  } else {
    bubble.textContent = content;
  }

  msgEl.appendChild(label);
  msgEl.appendChild(bubble);
  messagesEl.appendChild(msgEl);
  scrollToBottom();

  return bubble;
}

function showTypingIndicator() {
  const msgEl = document.createElement('div');
  msgEl.className = 'message assistant typing-indicator';
  msgEl.id = 'typing-indicator';

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = 'ARIA';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

  msgEl.appendChild(label);
  msgEl.appendChild(bubble);
  messagesEl.appendChild(msgEl);
  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

async function streamResponse() {
  showTypingIndicator();

  let fullText = '';
  let assistantBubble = null;
  let started = false;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const reader = response.body.getReader();
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
          if (!started) {
            removeTypingIndicator();
            assistantBubble = appendMessage('assistant', '');
            started = true;
          }
          fullText += event.content;
          assistantBubble.innerHTML = renderMarkdown(fullText);
          scrollToBottom();
        } else if (event.type === 'done') {
          break;
        } else if (event.type === 'error') {
          removeTypingIndicator();
          appendMessage('assistant', '⚠ An error occurred. Please try again.');
          return;
        }
      }
    }

    if (fullText) {
      conversationHistory.push({ role: 'assistant', content: fullText });
    }
  } catch (err) {
    console.error('Fetch error:', err);
    removeTypingIndicator();
    appendMessage('assistant', '⚠ Connection error. Please check your setup and try again.');
  } finally {
    removeTypingIndicator();
    sendBtn.disabled = inputEl.value.trim() === '';
    inputEl.focus();
  }
}

function scrollToBottom() {
  const container = messagesEl.closest('.chat-container');
  if (container) container.scrollTop = container.scrollHeight;
}

// Minimal markdown renderer
function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered list
  html = html.replace(/^[*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>(\n|$))+/g, (match) => `<ul>${match}</ul>`);

  // Ordered list
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs (double newline)
  html = html
    .split(/\n\n+/)
    .map(block => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-3]|ul|ol|li|pre|blockquote)/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
