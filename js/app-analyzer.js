/**
 * TSS Portal - THA 歷史分析大腦 (app-analyzer.js)
 * 【V14.0 真正歸位定稿：解鎖外殼分流快切 ✕ 五行色彩實時同步 Chart.js 折線】
 */

const THA_CONFIG = { INITIAL_BALANCE: 10000.00 };
window.globalTrades = [];
window.activeSymbolView = "ALL SYMBOLS";
window.activeRadarDisplayMode = "SEPARATE";
window.currentThemeHex = "#7c3aed"; // 預設：木主題尊貴紫

let subChartInstances = { cum: null, wkP: null, wkT: null, hrP: null, hrT: null };
let globalChartInstances = { eq: null, wk: null, sb: null };

// 👑 全站級母外殼 Tab 快切分流大腦
function switchViewTab(tabKey) {
    const homeTab = document.getElementById('tab-view-home');
    const thaTab = document.getElementById('tab-view-tha');
    const navHome = document.getElementById('nav-home');
    const navTha = document.getElementById('nav-tha');

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
    document.getElementById(`btn-${themeKey}`).className = "py-0.5 rounded cursor-pointer bg-slate-800 text-white font-black px-1";

    // 🌟 核心連動：如果當前有數據，秒級重繪 Chart.js，讓折線顏色與五行完美咬合！
    if (window.globalTrades.length > 0) {
        rebuildThreeCoreCharts();
        injectAdvancedSymbolQuantumRadarDOM();
    }
}

// 精密綁定 CSV 異動與正序大排序
document.addEventListener("DOMContentLoaded", () => {
    const fileEl = document.getElementById('csvFileInput');
    if (fileEl) {
        fileEl.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('file-v-echo').innerText = file.name;
            Papa.parse(file, {
                header: true, skipEmptyLines: true,
                complete: function(results) {
                    const trades = [];
                    results.data.forEach(row => {
                        const closeTime = row['Close Time'] || row['close_time'] || Object.values(row)[0];
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
                    window.globalTrades = trades.sort((a,b) => a.dateObj - b.dateObj); // 🌟 正序時間軸鐵律
                }
            });
        });
    }
});

function triggerParsingProcess() {
    if (window.globalTrades.length === 0) { alert('請先裝載 CSV 報告檔案！'); return; }
    document.getElementById('analyzer-placeholder').classList.add('hidden');
    document.getElementById('analyzer-main-panel').classList.remove('hidden');

    let balance = THA_CONFIG.INITIAL_BALANCE;
    window.globalTrades.forEach(t => balance += t.profit);
    
    document.getElementById('growthValue').innerText = `${(((balance - THA_CONFIG.INITIAL_BALANCE)/THA_CONFIG.INITIAL_BALANCE)*100).toFixed(1)} %`;
    document.getElementById('initialDepositValue').innerText = THA_CONFIG.INITIAL_BALANCE.toFixed(2);
    document.getElementById('equityValue').innerText = balance.toFixed(2);
    document.getElementById('profitValue').innerText = (balance - THA_CONFIG.INITIAL_BALANCE).toFixed(2);
    document.getElementById('equityBar').style.width = "70%";

    document.getElementById('minimumArea').innerHTML = `<div class="text-[11px] font-bold text-slate-400 uppercase border-b pb-1">📋 THA 統計總帳</div><div class="text-xs pt-1">總筆數: <b>${window.globalTrades.length} 筆</b></div><div class="text-xs">結算淨值: <b class="dynamic-theme-text font-mono">$${balance.toFixed(2)}</b></div>`;
    
    rebuildThreeCoreCharts();
    injectAdvancedSymbolQuantumRadarDOM();
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

    radarWrapper.innerHTML = `
        <div class="border rounded-lg p-3 bg-white">
            <div class="flex justify-between items-center border-b pb-1.5 mb-2">
                <span class="text-xs font-bold text-slate-700 uppercase">Symbol 深入分析 ── <span class="dynamic-theme-text font-mono">${window.activeSymbolView}</span></span>
                <div class="bg-slate-100 p-0.5 rounded-lg flex gap-0.5 text-[10px] font-bold shadow-inner">
                    <button onclick="toggleRadarDisplayMode('ALL')" class="px-2 py-0.5 rounded ${displayMode==='ALL'?'bg-white text-purple-600 shadow-sm':''}">All</button>
                    <button onclick="toggleRadarDisplayMode('SEPARATE')" class="px-2 py-0.5 rounded ${displayMode==='SEPARATE'?'bg-white text-purple-600 shadow-sm':''}">Separate</button>
                </div>
            </div>
            <!-- 👑 左側圖表 SIDEBAR (50%) ✕ 右側 4 矩陣 (50%) 天秤佈局 -->
            <div class="flex flex-col lg:flex-row gap-3 h-[240px] w-full">
                <div class="w-full lg:w-1/2 border rounded-lg p-2 bg-slate-50/30 flex flex-col">
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
    
    let runningSum = 0; const cumData = []; const cumLabels = [];
    window.globalTrades.forEach((t, idx) => { runningSum += t.profit; cumData.push(runningSum); cumLabels.push(""); });

    // 🌟 圖表 SIDEBAR 折線顏色精準咬合當前運行的五行主題 Hex
    subChartInstances.cum = new Chart(cumCtx, {
        type: 'line', data: { labels: cumLabels, datasets: [{ label: '累積利潤', data: cumData, borderColor: window.currentThemeHex, borderWidth: 1, pointRadius: 0, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const wkP = { "Mon":0, "Tue":0, "Wed":0, "Thu":0, "Fri":0 };
    window.globalTrades.forEach(t => { if(wkP[t.weekday]!==undefined) wkP[t.weekday]+=t.profit; });

    subChartInstances.wkP = new Chart(document.getElementById('sub-chart-wk-profit').getContext('2d'), { type: 'bar', data: { labels: Object.keys(wkP), datasets: [{ data: Object.values(wkP), backgroundColor: '#475569' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
}

function resetAllCsvData() {
    window.globalTrades = []; document.getElementById('csvFileInput').value = ""; document.getElementById('file-v-echo').innerText = "";
    document.getElementById('analyzer-main-panel').classList.add('hidden'); document.getElementById('analyzer-placeholder').classList.remove('hidden');
}
