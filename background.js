chrome.action.onClicked.addListener(() => {
  // 檢查瀏覽器是否支援 sidePanel API
  if (chrome.sidePanel) {
    // 取得當前作用中的視窗
    chrome.windows.getCurrent({ populate: true }, (window) => {
      if (chrome.runtime.lastError) {
        console.error("Failed to get current window:", chrome.runtime.lastError.message);
        return;
      }
      
      if (window) {
        // 如果有找到作用中的視窗，就嘗試開啟側邊面板
        chrome.sidePanel.open({ windowId: window.id }, () => {
          if (chrome.runtime.lastError) {
            console.error("Failed to open side panel:", chrome.runtime.lastError.message);
          }
        });
      } else {
        console.warn("No active window found.");
      }
    });
  } else {
    console.warn("Side panel API is not supported in this browser version.");
  }
});