document.addEventListener('DOMContentLoaded', () => {
  const sendButton = document.getElementById('send-button');
  const userInput = document.getElementById('user-input');
  const readPageButton = document.getElementById('read-page-button');

  sendButton.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  readPageButton.addEventListener('click', readCurrentPage);

  loadChatHistory();
});

async function loadChatHistory() {
  const output = document.getElementById('chat-output');
  output.innerHTML = '';

  chrome.storage.local.get(['chatHistory'], (result) => {
    const history = result.chatHistory || [];
    history.forEach(msg => {
      appendMessage(msg.role, msg.content);
    });
    output.scrollTop = output.scrollHeight;
  });
}

function appendMessage(role, content, isLoading = false) {
  const output = document.getElementById('chat-output');
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', role);
  messageElement.innerHTML = `<strong>${role === 'user' ? '你' : 'Gemini'}:</strong> `;

  if (isLoading) {
    messageElement.innerHTML += `<div class="loading-dots"><span></span><span></span><span></span></div>`;
    messageElement.id = 'loading-message';
  } else {
    messageElement.innerHTML += content;
  }
  output.appendChild(messageElement);
  output.scrollTop = output.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('user-input');
  const output = document.getElementById('chat-output');
  const message = input.value.trim();

  if (!message) return;

  if (message.toLowerCase() === 'cls') {
    output.innerHTML = '';
    chrome.storage.local.set({ chatHistory: [] }, () => {
      appendMessage('system', '對話已清除。');
    });
    input.value = '';
    return;
  }

  appendMessage('user', message);
  input.value = '';

  appendMessage('model', '', true);

  chrome.storage.sync.get(['apiKey'], async (result) => {
    const loadingMessage = document.getElementById('loading-message');

    if (!result.apiKey) {
      if (loadingMessage) loadingMessage.remove();
      appendMessage('system', '錯誤: 請在設定頁面輸入 API 金鑰！');
      return;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${result.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: message }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.candidates[0]?.content?.parts[0]?.text || '無回應';

      if (loadingMessage) loadingMessage.remove();
      appendMessage('model', reply);

      chrome.storage.local.get(['chatHistory'], (result) => {
        const history = result.chatHistory || [];
        history.push({ role: 'user', content: message });
        history.push({ role: 'model', content: reply });
        chrome.storage.local.set({ chatHistory: history });
      });
    } catch (error) {
      if (loadingMessage) loadingMessage.remove();
      appendMessage('system', `錯誤: 無法連接到 Gemini AI: ${error.message}`);
    }

    output.scrollTop = output.scrollHeight;
  });
}

async function readCurrentPage() {
  appendMessage('system', '正在讀取當前網頁內容...');
  const loadingMessage = document.getElementById('loading-message');

  try {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        return {
          title: document.title,
          content: document.body.innerText.substring(0, 5000)
        };
      },
    }, (injectionResults) => {
      if (chrome.runtime.lastError) {
        if (loadingMessage) loadingMessage.remove();
        appendMessage('system', `讀取網頁失敗：${chrome.runtime.lastError.message}`);
        return;
      }

      if (injectionResults && injectionResults[0]?.result) {
        const pageInfo = injectionResults[0].result;
        const prompt = `請根據以下網頁內容進行摘要或分析：\n\n標題：${pageInfo.title}\n\n內容：${pageInfo.content}\n\n`;

        document.getElementById('user-input').value = prompt;
        
        if (loadingMessage) loadingMessage.remove();
        appendMessage('system', '網頁內容已載入到輸入框，請按送出鍵來分析。');
      }
    });

  } catch (error) {
    if (loadingMessage) loadingMessage.remove();
    appendMessage('system', `讀取網頁錯誤：${error.message}`);
  }
}