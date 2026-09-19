// Popup script - 智能引導系統

console.log('[LINE Extension Pro] Popup loaded');

// Native Host 需求版本：已安裝的 Host 版本低於此值時，會提示使用者重新安裝以更新。
// ⚠️ 每次「Native Host 腳本本身」有變動時，需同步調高這裡與 docs/install-script.js 的 HOST_VERSION。
const REQUIRED_HOST_VERSION = '2.5.1';

// 比較版本字串（"2.5.0" 形式）；a 比 b 舊回傳 true
function isVersionOlder(a, b) {
    const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] || 0, y = pb[i] || 0;
        if (x < y) return true;
        if (x > y) return false;
    }
    return false;
}

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

// 單次 ping Native Host；成功回傳 Host 回應物件（含 version），失敗（逾時或錯誤）回傳 null
function pingNativeHost(timeoutMs) {
    return new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            console.log('[LINE Extension Pro] ping timeout after', timeoutMs, 'ms');
            resolve(null);
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
                    resolve(null);
                } else {
                    console.log('[LINE Extension Pro] Native Host found:', response);
                    resolve(response || {});
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
    const resp = await pingNativeHost(8000);
    if (resp) return resp;
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
// reason: 'missing'（未安裝）或 'outdated'（版本過舊需更新）
function showInstallGuide(reason, hostVersion) {
    showView('install');

    // 依情境調整標題與說明
    const titleEl = document.getElementById('installTitle');
    const msgEl = document.getElementById('installMessage');
    if (reason === 'outdated') {
        if (titleEl) titleEl.textContent = '需要更新';
        if (msgEl) msgEl.innerHTML =
            '偵測到舊版 Native Host（v' + (hostVersion || '?') + '）。<br>' +
            '請重新複製安裝指令並在終端機執行，即可更新到最新版。';
    } else {
        if (titleEl) titleEl.textContent = '需要完成安裝';
        if (msgEl) msgEl.innerHTML =
            '<strong>安裝步驟：</strong><br>' +
            '1. 沒裝過 LINE？先安裝到 Edge<br>' +
            '2. 複製指令貼到終端機執行<br>' +
            '3. 重新開啟此擴充功能即可使用';
    }

    // Edge LINE 安裝按鈕 - 直接複製網址
    const edgeLineBtn = document.getElementById('edgeLineBtn');
    if (edgeLineBtn) {
        edgeLineBtn.addEventListener('click', () => {
            const edgeLineUrl = 'https://chromewebstore.google.com/detail/line/ophjlpahpchlmihnnnihgmmeilfjmjjc';
            
            // 複製網址到剪貼簿
            navigator.clipboard.writeText(edgeLineUrl).then(() => {
                const originalText = edgeLineBtn.textContent;
                edgeLineBtn.textContent = '已複製，打開 Edge 貼上';
                setTimeout(() => {
                    edgeLineBtn.textContent = originalText;
                }, 3000);
            }).catch(err => {
                console.error('複製失敗:', err);
                alert('請手動複製此網址，貼到 Edge 瀏覽器的網址列：\n' + edgeLineUrl);
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

    // 檢測 Native Host（回傳回應物件或 null）
    const host = await checkNativeHost();

    if (!host) {
        // 未安裝，顯示安裝引導
        console.log('[LINE Extension Pro] Native Host not installed, showing install guide...');
        showInstallGuide('missing');
        return;
    }

    if (isVersionOlder(host.version, REQUIRED_HOST_VERSION)) {
        // 版本過舊，提示重新安裝更新
        console.log('[LINE Extension Pro] Native Host outdated:', host.version, '<', REQUIRED_HOST_VERSION);
        showInstallGuide('outdated', host.version);
        return;
    }

    // 已安裝且版本符合，直接執行
    console.log('[LINE Extension Pro] Native Host OK (v' + host.version + '), opening LINE...');
    showView('running');
    openLINE();
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
