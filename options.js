// ... (displayStatus 和 saveApiKey 函數保持不變) ...
function displayStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = isError ? 'error' : 'success';
  setTimeout(() => {
    status.textContent = '';
    status.className = '';
  }, 3000);
}

function saveApiKey() {
  const apiKey = document.getElementById('api-key').value.trim();

  if (!apiKey) {
    displayStatus('請輸入有效的 API 金鑰！', true);
    return;
  }

  chrome.storage.sync.set({ apiKey }, () => {
    if (chrome.runtime.lastError) {
      displayStatus(`儲存失敗：${chrome.runtime.lastError.message}`, true);
    } else {
      displayStatus('API 金鑰已儲存！');
    }
  });
}

// ... (testApiKey 函數保持不變) ...
async function testApiKey() {
  const apiKey = document.getElementById('api-key').value.trim();

  if (!apiKey) {
    displayStatus('請先輸入 API 金鑰！', true);
    return;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: 'Test API key' }] }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      displayStatus('API 金鑰有效！');
    } else {
      displayStatus('API 金鑰無效：無效的回應格式', true);
    }
  } catch (error) {
    displayStatus(`API 金鑰無效：${error.message}`, true);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['apiKey'], (result) => {
    if (chrome.runtime.lastError) {
      displayStatus(`載入失敗：${chrome.runtime.lastError.message}`, true);
      return;
    }
    if (result.apiKey) {
      document.getElementById('api-key').value = result.apiKey;
    }
  });

  document.getElementById('save-button').addEventListener('click', saveApiKey);
  document.getElementById('test-button').addEventListener('click', testApiKey);

  // 監聽連結的點擊事件，確保它能正常在新分頁打開
  const apiLink = document.querySelector('.api-key-link a');
  if (apiLink) {
    apiLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: e.target.href });
    });
  }
});