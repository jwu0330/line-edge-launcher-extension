// Popup script - 智能引導系統

console.log('[LINE Extension Pro] Popup loaded');

// 視圖元素
const views = {
    loading: document.getElementById('loadingView'),
    install: document.getElementById('installView'),
    running: document.getElementById('runningView'),
    error: document.getElementById('errorView')
};

// 顯示指定視圖
function showView(viewName) {
    Object.keys(views).forEach(key => {
        views[key].classList.add('hidden');
    });
    if (views[viewName]) {
        views[viewName].classList.remove('hidden');
    }
}

// 單次 ping Native Host；timeoutMs 內沒回應即視為失敗
function pingNativeHost(timeoutMs) {
    return new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            console.log('[LINE Extension Pro] ping timeout after', timeoutMs, 'ms');
            resolve(false);
        }, timeoutMs);

        chrome.runtime.sendNativeMessage(
            'com.line.opener',
            { action: 'ping' },
            function(response) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (chrome.runtime.lastError) {
                    console.log('[LINE Extension Pro] Native Host not found:', chrome.runtime.lastError.message);
                    resolve(false);
                } else {
                    console.log('[LINE Extension Pro] Native Host found:', response);
                    resolve(true);
                }
            }
        );
    });
}

// 檢測 Native Host 是否已安裝
// 正常回應約 1 秒，但 PowerShell 冷啟動（機器閒置、防毒掃描）偶爾會超過數秒，
// 因此逾時放寬到 8 秒，且第一次失敗會再重試一次（冷啟動後第二次通常很快），
// 避免間歇性誤判為「未安裝」。
async function checkNativeHost() {
    console.log('[LINE Extension Pro] Checking Native Host...');
    if (await pingNativeHost(8000)) return true;
    console.log('[LINE Extension Pro] first ping failed, retrying once...');
    return await pingNativeHost(8000);
}

// 觸發 LINE 開啟
function openLINE() {
    console.log('[LINE Extension Pro] Opening LINE...');
    
    chrome.runtime.sendNativeMessage(
        'com.line.opener',
        { action: 'openLINE' },
        function(response) {
            if (chrome.runtime.lastError) {
                console.error('[LINE Extension Pro] Error:', chrome.runtime.lastError.message);
                showError('無法連接 Native Host：' + chrome.runtime.lastError.message);
            } else {
                console.log('[LINE Extension Pro] Response:', response);
                if (response && response.success) {
                    // 成功，等待一下後關閉 popup
                    setTimeout(() => window.close(), 1000);
                } else {
                    showError('執行失敗：' + (response.error || '未知錯誤'));
                }
            }
        }
    );
}

// 顯示錯誤
function showError(message) {
    showView('error');
    document.getElementById('errorMessage').textContent = message;
}

// 顯示安裝引導
function showInstallGuide() {
    showView('install');
    
    // Edge LINE 安裝按鈕 - 直接複製網址
    const edgeLineBtn = document.getElementById('edgeLineBtn');
    if (edgeLineBtn) {
        edgeLineBtn.addEventListener('click', () => {
            const edgeLineUrl = 'https://chromewebstore.google.com/detail/line/ophjlpahpchlmihnnnihgmmeilfjmjjc';
            
            // 複製網址到剪貼簿
            navigator.clipboard.writeText(edgeLineUrl).then(() => {
                const originalText = edgeLineBtn.textContent;
                edgeLineBtn.textContent = '✅ 已複製！請在 Edge 開啟';
                setTimeout(() => {
                    edgeLineBtn.textContent = originalText;
                }, 2500);
            }).catch(err => {
                console.error('複製失敗:', err);
                alert('請手動複製此網址：\n' + edgeLineUrl);
            });
        });
    }
    
    // Native Host 安裝按鈕 - 開啟一鍵安裝頁面
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const installUrl = 'https://jwu0330.github.io/line-edge-launcher-extension/install.html';
            chrome.tabs.create({ url: installUrl });
        });
    }
}

// 初始化
async function init() {
    console.log('[LINE Extension Pro] Initializing...');
    showView('loading');
    
    // 等待一下讓 UI 顯示
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 檢測 Native Host
    const isInstalled = await checkNativeHost();
    
    if (isInstalled) {
        // 已安裝，直接執行
        console.log('[LINE Extension Pro] Native Host installed, opening LINE...');
        showView('running');
        openLINE();
    } else {
        // 未安裝，顯示安裝引導
        console.log('[LINE Extension Pro] Native Host not installed, showing install guide...');
        showInstallGuide();
    }
}

// 錯誤重試
document.getElementById('retryBtn')?.addEventListener('click', () => {
    init();
});

// 啟動（避免雙重初始化）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
