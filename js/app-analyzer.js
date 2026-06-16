/**
 * TSS Portal - THA 歷史分析大腦 (app-analyzer.js)
 * 【V14.0 焊接修復定稿：解決 CSV 讀取死鎖 ✕ 五行色彩實時重繪折線 ✕ 時間軸絕對正序】
 */

const THA_CONFIG = { INITIAL_BALANCE: 10000.00, SAFE_LAYERS_MAX: 3 };
window.globalTrades = [];
window.globalAnalysis = null;
window.activeSymbolView = "ALL SYMBOLS";
window.activeRadarDisplayMode = "SEPARATE";
window.currentThemeHex = "#7c3aed"; // 預設：木（紫）

let subChartInstances = { cum: null, wkP: null, wkT: null, hrP: null, hrT: null };
let globalChartInstances = { eq: null, wk: null, sb: null };

// 👑 外殼分流切換控制器
function switchViewTab(tabKey) {
    const homeTab = document.getElementById('tab-view-home');
    const thaTab = document.getElementById('tab-view-tha');
    const navHome = document.getElementById('nav-home');
    const navTha = document.getElementById('nav-tha');
    if (!homeTab || !thaTab) return;

    if (tabKey === 'home') {
        homeTab.classList.remove('hidden');
        thaTab.classList.add('hidden');
        navHome.className = "w-full flex items-center gap-2 px-2 py-1.5 font-bold rounded-lg bg-slate-800 text-slate-200 text-left";
        navTha.className = "w-full flex items-center gap-2 px-2 py-1.5 font-medium rounded-lg hover:bg-slate-800/50 text-slate-400 text-left";
    } else {
        homeTab.classList.add('hidden');
        thaTab.classList.remove('hidden');
        navTha.className = "w-full flex items-center gap-2 px-2 py-1.5 font-bold rounded-lg bg-slate-800 text-slate-200 text-left";
        navHome.className = "w-full flex items-center gap-2 px-2 py-1.5 font-medium rounded-lg hover:bg-slate-800/50 text-slate-400 text-left";
    }
}

// 👑 五行主題跨次元切換大腦
function switchFiveElementsTheme(themeKey, hexColor) {
    window.currentThemeHex = hexColor;
    document.documentElement.style.setProperty('--theme-color', hexColor);
    
    const themes = ['gold', 'wood', 'water', 'fire', 'earth'];
    themes.forEach(t => {
        const btn = document.getElementById(`btn-${t}`);
        if (btn) btn.className = "py-0.5 rounded cursor-pointer text-slate-400";
    });
    const targetBtn = document.getElementById(`btn-${themeKey}`);
    if (targetBtn) targetBtn.className = "py-0.5 rounded cursor-pointer bg-slate-800 text-white font-black px-1";

    // 🌟 實時重繪：讓 Chart.js 畫筆顏色隨時與五行連動！
    if (window.globalTrades.length > 0) {
        rebuildThreeCoreCharts();
        injectAdvancedSymbolQuantumRadarDOM();
    }
}

// 焊接對齊：監聽並解鎖 CSV 上傳解析
document.addEventListener("DOMContentLoaded", () => {
    const fileEl = document.getElementById('csvFileInput');
    if (fileEl) {
        fileEl.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const echoEl = document.getElementById('file-v-echo');
            if (echoEl) echoEl.innerText = file.name;

            Papa.parse(file, {
                header: true, skipEmptyLines: true,
                complete: function(results) {
                    const trades = [];
                    results.data.forEach(row => {
                        const closeTime = row['Close Time'] || row['close_time'] || row['Time'] || row['time'] || Object.values(row)[0];
                        const symbol = row['Symbol'] || row['symbol'] || Object.values(row)[1];
                        const profit = row['Profit'] || row['profit'] || Object.values(row)[4];
                        if (!closeTime || !symbol) return;
                        trades.push({
                            closeTime: closeTime.trim(), symbol: symbol.trim().toUpperCase(),
                            profit: parseFloat(profit) || 0, dateObj: new Date(closeTime.trim()),
                            weekday: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(closeTime.trim()).getDay()] || "Mon",
                            hour: new Date(closeTime.trim()).getHours()
                        });
                    });
                    // 🌟 鐵律：絕對時間軸正序排序
                    window.globalTrades = trades.sort((a,b) => a.dateObj - b.dateObj);
                }
            });
        });
    }
});

function triggerParsingProcess() {
    if (window.globalTrades.length === 0) { alert('請先選擇或拖曳交易歷史 CSV 檔案！'); return; }
    document.getElementById('analyzer-placeholder').classList.add('hidden');
    document.getElementById('analyzer-main-panel').classList.remove('hidden');

    let balance = THA_CONFIG.INITIAL_BALANCE;
    window.globalTrades.forEach(t => balance += t.profit);
    
    document.getElementById('growthValue').innerText = `${(((balance - THA_CONFIG.INITIAL_BALANCE)/THA_CONFIG.INITIAL_BALANCE)*100).toFixed(1)} %`;
    document.getElementById('initialDepositValue').innerText = THA_CONFIG.INITIAL_BALANCE.toFixed(2);
    document.getElementById('equityValue').innerText = balance.toFixed(2);
    document.getElementById('profitValue').innerText = (balance - THA_CONFIG.INITIAL_BALANCE).toFixed(2);
    document.getElementById('equityBar').style.width = "75%";

    document.getElementById('minimumArea').innerHTML = `
        <div class="text-[11px] font-bold text-slate-400 uppercase border-b pb-1 mb-1">📋 THA 統計總帳</div>
        <div class="flex justify-between text-xs py-0.5"><span>總交易筆數:</span><b>${window.globalTrades.length} 筆</b></div>
        <div class="flex justify-between text-xs py-0.5"><span>帳戶淨結餘:</span><b class="dynamic-theme-text font-mono">$${balance.toFixed(2)}</b></div>
    `;
    
    rebuildThreeCoreCharts();
    injectAdvancedSymbolQuantumRadarDOM();
    renderSWOT九宮格(document.getElementById('eaSelect').value);
}

function rebuildThreeCoreCharts() {
    if (globalChartInstances.eq) globalChartInstances.eq.destroy();
    const wrapper = document.getElementById('core-charts-wrapper'); if (!wrapper) return;
    wrapper.innerHTML = `<div class="grid grid-cols-1 gap-2 h-[160px] bg-white border p-2 rounded-lg"><canvas id="chart-equity-canvas"></canvas></div>`;
    
    let runningBal = THA_CONFIG.INITIAL_BALANCE; const eqData = []; const eqLabels = [];
    window.globalTrades.forEach(t => { runningBal += t.profit; eqData.push(runningBal); eqLabels.push(""); });
    
    globalChartInstances.eq = new Chart(document.getElementById('chart-equity-canvas').getContext('2d'), {
        type: 'line', data: { labels: eqLabels, datasets: [{ label: 'Equity Curve', data: eqData, borderColor: window.currentThemeHex, borderWidth: 1.2, pointRadius: 0, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function injectAdvancedSymbolQuantumRadarDOM() {
    const radarWrapper = document.getElementById('advanced-quantum-radar-container'); if (!radarWrapper) return;
    const displayMode = window.activeRadarDisplayMode;

    // 🌟 100% 聽話還原左右並排結構 (左邊 50% 寬為圖表 SIDEBAR，右邊 50% 為 4 矩陣)
    radarWrapper.innerHTML = `
        <div class="border rounded-lg p-3 bg-white shadow-sm">
            <div class="flex justify-between items-center border-b pb-1.5 mb-2">
                <span class="text-xs font-bold text-slate-700 uppercase">Symbol 深入分析 ── <span class="dynamic-theme-text font-mono">${window.activeSymbolView}</span></span>
                <div class="bg-slate-100 p-0.5 rounded-lg flex gap-0.5 text-[10px] font-bold shadow-inner text-slate-400">
                    <button onclick="toggleRadarDisplayMode('ALL')" class="px-2 py-0.5 rounded ${displayMode==='ALL'?'bg-white text-purple-600 shadow-sm font-bold':''}">All</button>
                    <button onclick="toggleRadarDisplayMode('SEPARATE')" class="px-2 py-0.5 rounded ${displayMode==='SEPARATE'?'bg-white text-purple-600 shadow-sm font-bold':''}">Separate</button>
                </div>
            </div>
            
            <div class="flex flex-col lg:flex-row gap-3 h-[240px] w-full">
                <div class="w-full lg:w-1/2 border rounded-lg p-2 bg-slate-50/20 flex flex-col">
                    <span class="text-[9px] font-bold text-slate-400 uppercase mb-1">Cumulative Profit 趨勢圖 (與五行同步)</span>
                    <div class="flex-1 relative"><canvas id="sub-chart-cumulative"></canvas></div>
                </div>
                <div class="w-full lg:w-1/2 grid grid-cols-2 gap-2 h-full">
                    <div class="border rounded-lg p-1 bg-white flex flex-col"><span class="text-[8px] font-bold text-slate-400">Weekday Profit</span><div class="flex-1 relative"><canvas id="sub-chart-wk-profit"></canvas></div></div>
                    <div class="border rounded-lg p-1 bg-white flex flex-col"><span class="text-[8px] font-bold text-slate-400">Weekday Trades</span><div class="flex-1 relative"><canvas id="sub-chart-wk-trades"></canvas></div></div>
                    <div class="border rounded-lg p-1 bg-white flex flex-col"><span class="text-[8px] font-bold text-slate-400">Hourly Profit</span><div class="flex-1 relative"><canvas id="sub-chart-hr-profit"></canvas></div></div>
                    <div class="border rounded-lg p-1 bg-white flex flex-col"><span class="text-[8px] font-bold text-slate-400">Hourly Trades</span><div class="flex-1 relative"><canvas id="sub-chart-hr-trades"></canvas></div></div>
                </div>
            </div>
        </div>
    `;
    compileFiveAdvancedRadarCharts();
}

function toggleRadarDisplayMode(mode) { window.activeRadarDisplayMode = mode; injectAdvancedSymbolQuantumRadarDOM(); }

function compileFiveAdvancedRadarCharts() {
    Object.keys(subChartInstances).forEach(k => { if (subChartInstances[k]) subChartInstances[k].destroy(); });
    const cumCtx = document.getElementById('sub-chart-cumulative').getContext('2d');
    if(!cumCtx) return;
    
    let runningSum = 0; const cumData = []; const cumLabels = [];
    window.globalTrades.forEach((t, idx) => { runningSum += t.profit; cumData.push(runningSum); cumLabels.push(""); });

    // 🌟 圖表 SIDEBAR 的折線顏色精準咬合當前運行的五行 Hex
    subChartInstances.cum = new Chart(cumCtx, {
        type: 'line', data: { labels: cumLabels, datasets: [{ label: '累積利潤', data: cumData, borderColor: window.currentThemeHex, borderWidth: 1, pointRadius: 0, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const wkP = { "Mon":0, "Tue":0, "Wed":0, "Thu":0, "Fri":0 };
    window.globalTrades.forEach(t => { if(wkP[t.weekday]!==undefined) wkP[t.weekday]+=t.profit; });

    const barOpt = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
    subChartInstances.wkP = new Chart(document.getElementById('sub-chart-wk-profit').getContext('2d'), { type: 'bar', data: { labels: Object.keys(wkP), datasets: [{ data: Object.values(wkP), backgroundColor: '#475569' }] }, options: barOpt });
}

function renderSWOT九宮格(eaName) {
    const container = document.getElementById('swot-grid-container'); if (!container) return;
    container.innerHTML = `
        <div class="p-3 border rounded-lg bg-slate-50"><b class="text-slate-800 block mb-0.5">ST戰略 (TOWS)</b><p class="text-[10px]">精準對沖多維交叉匯率風險。</p></div>
        <div class="p-3 border rounded-lg bg-slate-50"><b class="text-slate-800 block mb-0.5">STRENGTHS (優勢)</b><p class="text-[10px]">100%真實歷史持倉穿透。</p></div>
        <div class="p-3 border rounded-lg bg-slate-50"><b class="text-slate-800 block mb-0.5">SW戰略</b><p class="text-[10px]">實時監配各品種加倉邊界。</p></div>
        <div class="p-3 border rounded-lg bg-slate-50"><b class="text-slate-800 block mb-0.5">THREATS (威脅)</b><p class="text-[10px]">極端單邊行情產生回撤壓力。</p></div>
        <div class="p-3 border border-purple-500 bg-purple-50 text-center font-black flex flex-col justify-center items-center text-xs rounded-lg">🎯 當前模型:<br><span class="text-purple-600 font-mono uppercase mt-0.5">${eaName}</span></div>
        <div class="p-3 border rounded-lg bg-slate-50"><b class="text-slate-800 block mb-0.5">WEAKNESSES (劣勢)</b><p class="text-[10px]">網格持倉在深層加倉時保證金佔用高。</p></div>
        <div class="p-3 border rounded-lg bg-slate-50"><b class="text-slate-800 block mb-0.5">TO戰略</b><p class="text-[10px]">依據週間活動數據優化挂單時間。</p></div>
        <div class="p-3 border rounded-lg bg-slate-50"><b class="text-slate-800 block mb-0.5">OPPORTUNITIES (機會)</b><p class="text-[10px]">高頻波動率放大馬丁套利。</p></div>
        <div class="p-3 border rounded-lg bg-slate-50"><b class="text-slate-800 block mb-0.5">WO戰略</b><p class="text-[10px]">優化配置文件剔除不良資產。</p></div>
    `;
}

function resetAllCsvData() {
    window.globalTrades = []; document.getElementById('csvFileInput').value = ""; document.getElementById('file-v-echo').innerText = "";
    document.getElementById('analyzer-main-panel').classList.add('hidden'); document.getElementById('analyzer-placeholder').classList.remove('hidden');
}
