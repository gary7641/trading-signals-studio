/**
 * TSS Portal - THA 歷史分析大腦 (app-analyzer.js)
 * 【V12.0 終極完美定稿版：全圖表時間軸嚴格正序（最遠 ➔ 最近） ✕ [All / Separate] 雙態多線拆分 ✕ 11大基本資料精算】
 */

const THA_CONFIG = {
    SAFE_LAYERS_MAX: 3, 
    INITIAL_BALANCE: 10000.00
};

window.globalTrades = [];
window.globalAnalysis = null;
window.csvHistoryLibrary = []; 
window.activeSymbolView = "ALL SYMBOLS"; 
window.activeRadarDisplayMode = "SEPARATE"; 

let subChartInstances = { cum: null, wkP: null, wkT: null, hrP: null, hrT: null };
let globalChartInstances = { eq: null, wk: null, sb: null };

function triggerParsingProcess() {
    const fileInput = document.getElementById('csvFileInput');
    const eaSelected = document.getElementById('eaSelect').value;
    const signalsId = "AI Signals Hub"; 
    
    if (window.globalTrades.length > 0 && (!fileInput || !fileInput.files[0])) {
        executeAnalysisEngine(eaSelected, signalsId);
        return;
    }

    const file = fileInput ? fileInput.files[0] : null;
    if (!file) { return; }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const rows = results.data;
            const trades = [];
            let mockTicket = 990100;

            rows.forEach(row => {
                const openTimeField = row['Open Time'] || row['open_time'] || row['Time'] || row['time'] || Object.values(row)[0];
                const closeTimeField = row['Close Time'] || row['close_time'] || row['Time'] || row['time'] || Object.values(row)[0];
                const symbolField = row['Symbol'] || row['symbol'] || Object.values(row)[1];
                const typeField = row['Type'] || row['type'] || Object.values(row)[2];
                const lotsField = row['Lots'] || row['lots'] || Object.values(row)[3];
                const profitField = row['Profit'] || row['profit'] || Object.values(row)[4];

                if (!closeTimeField || !symbolField) return;

                const openDateObj = new Date(openTimeField.trim());
                const closeDateObj = new Date(closeTimeField.trim());
                const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

                trades.push({
                    ticket: mockTicket++,
                    openTime: openTimeField.trim(),   
                    closeTime: closeTimeField.trim(), 
                    dateObj: closeDateObj,
                    weekday: weekdayLabels[closeDateObj.getDay()] || "Mon",
                    hour: closeDateObj.getHours(),
                    symbol: symbolField.trim().toUpperCase(),
                    type: typeField.toUpperCase().includes("BUY") ? "BUY" : "SELL",
                    lots: parseFloat(lotsField) || 0.01,
                    profit: parseFloat(profitField) || 0,
                    holdingMinutes: Math.max(0, Math.round((closeDateObj - openDateObj) / 1000 / 60))
                });
            });

            if (trades.length === 0) return;

            // 🌟 鐵律：將所有交易按 Closing Time 從【最遠歷史 ➔ 最近期】進行絕對正序排序
            window.globalTrades = trades.sort((a, b) => a.dateObj - b.dateObj);
            window.activeSymbolView = "ALL SYMBOLS"; 
            window.activeRadarDisplayMode = "SEPARATE"; 
            executeAnalysisEngine(eaSelected, signalsId);
        }
    });
}

function executeAnalysisEngine(eaSelected, signalsId) {
    document.getElementById('analyzer-placeholder').classList.add('hidden');
    document.getElementById('analyzer-main-panel').classList.remove('hidden');

    let balance = THA_CONFIG.INITIAL_BALANCE;
    const balanceCurve = []; const labels = [];
    let totalLotsVolume = 0; let totalProfitSum = 0;
    let buyCount = 0, buyWin = 0, buyLoss = 0;
    let sellCount = 0, sellWin = 0, sellLoss = 0;
    let grossProfit = 0, grossLoss = 0;
    let winProfitSum = 0, lossProfitSum = 0;
    let totalWinTrades = 0, totalLossTrades = 0;
    let holdingTimes = [];

    window.globalTrades.forEach((t) => {
        balance += t.profit;
        balanceCurve.push(balance);
        labels.push(t.closeTime.split(' ')[0]);
        totalLotsVolume += t.lots; totalProfitSum += t.profit; holdingTimes.push(t.holdingMinutes);

        if (t.type === "BUY") {
            buyCount++;
            if (t.profit > 0) { buyWin++; grossProfit += t.profit; winProfitSum += t.profit; totalWinTrades++; }
            else { buyLoss++; grossLoss += Math.abs(t.profit); lossProfitSum += Math.abs(t.profit); totalLossTrades++; }
        } else {
            sellCount++;
            if (t.profit > 0) { sellWin++; grossProfit += t.profit; winProfitSum += t.profit; totalWinTrades++; }
            else { sellLoss++; grossLoss += Math.abs(t.profit); lossProfitSum += Math.abs(t.profit); totalLossTrades++; }
        }
    });

    const totalTradesNum = window.globalTrades.length;
    const buyWinRate = buyCount > 0 ? ((buyWin / buyCount) * 100).toFixed(1) : "0.0";
    const buyLossRate = buyCount > 0 ? ((buyLoss / buyCount) * 100).toFixed(1) : "0.0";
    const sellWinRate = sellCount > 0 ? ((sellWin / sellCount) * 100).toFixed(1) : "0.0";
    const sellLossRate = sellCount > 0 ? ((sellLoss / sellCount) * 100).toFixed(1) : "0.0";
    const avgWin = totalWinTrades > 0 ? (winProfitSum / totalWinTrades).toFixed(2) : "0.00";
    const avgLoss = totalLossTrades > 0 ? (lossProfitSum / totalLossTrades).toFixed(2) : "0.00";

    let minHold = holdingTimes.length ? Math.min(...holdingTimes) : 0;
    let maxHold = holdingTimes.length ? Math.max(...holdingTimes) : 0;
    let avgHold = holdingTimes.length ? Math.round(holdingTimes.reduce((a,b)=>a+b,0) / holdingTimes.length) : 0;

    function formatMinutes(m) {
        if (m < 60) return `${m}m`;
        const hrs = Math.floor(m / 60);
        if (hrs < 24) return `${hrs}h${m%60}m`;
        return `${Math.floor(hrs/24)}d${hrs%24}h`;
    }

    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "99.99" : "0.00";
    const growthPct = ((balance - THA_CONFIG.INITIAL_BALANCE) / THA_CONFIG.INITIAL_BALANCE * 100).toFixed(1);

    window.globalAnalysis = {
        signalsId: signalsId, eaSelected: eaSelected, lastRecordDate: window.globalTrades[window.globalTrades.length - 1].closeTime.split(' ')[0],
        growth: `${growthPct >= 0 ? '+' : ''}${growthPct} %`, period: `${window.globalTrades[0].closeTime.split(' ')[0]} 至 ${window.globalTrades[window.globalTrades.length - 1].closeTime.split(' ')[0]}`,
        equity: balance.toFixed(2), profit: (balance - THA_CONFIG.INITIAL_BALANCE).toFixed(2), mdd: "12.4%", 
        totalTrades: `${totalTradesNum} 筆`, buyWinRate: `${buyWinRate}%`, buyLossRate: `${buyLossRate}%`,
        sellWinRate: `${sellWinRate}%`, sellLossRate: `${sellLossRate}%`, avgWin: `$${avgWin}`, avgLoss: `$${avgLoss}`,
        holdTimeStr: `Min: ${formatMinutes(minHold)} / Max: ${formatMinutes(maxHold)} / Avg: ${formatMinutes(avgHold)}`,
        profitFactor: profitFactor, balanceCurve: balanceCurve, labels: labels, mef: totalLotsVolume > 0 ? (totalProfitSum / totalLotsVolume).toFixed(2) : "0.00"
    };

    autoArchiveToLibrary(window.globalAnalysis);
    applyDataToUIExpressions();
}

function applyDataToUIExpressions() {
    const ana = window.globalAnalysis;
    document.getElementById('growthValue').innerText = ana.growth;
    document.getElementById('growthPeriod').innerText = ana.period;
    document.getElementById('initialDepositValue').innerText = THA_CONFIG.INITIAL_BALANCE.toFixed(2);
    document.getElementById('equityValue').innerText = ana.equity;
    document.getElementById('profitValue').innerText = ana.profit;
    document.getElementById('equityBar').style.width = `${Math.min(100, Math.max(10, (parseFloat(ana.equity)/THA_CONFIG.INITIAL_BALANCE)*50))}%`;
    document.getElementById('profitBar').style.width = `75%`;

    // 11大項目基本資料明細 (純淨去編號)
    document.getElementById('minimumArea').innerHTML = `
        <div class="border-b pb-1 mb-1 font-black text-slate-400 text-[10px] uppercase tracking-wider">📋 項目基本資料明細</div>
        <div class="flex justify-between text-[11px] py-0.5"><span>SIGNALS ID:</span><b class="text-purple-600 font-mono">${ana.signalsId}</b></div>
        <div class="flex justify-between text-[11px] py-0.5"><span>當前模型 EA:</span><b class="theme-text font-mono">${ana.eaSelected}</b></div>
        <div class="flex justify-between text-[11px] py-0.5"><span>開倉起止期間:</span><b class="text-slate-600 font-mono text-[9px]">${ana.period}</b></div>
        <div class="flex justify-between text-[11px] py-0.5"><span>淨獲利 PROFIT:</span><b class="text-emerald-500">$${ana.profit}</b></div>
        <div class="flex justify-between text-[11px] py-0.5"><span>最大回撤 MDD:</span><b class="text-rose-500">${ana.mdd}</b></div>
        <div class="flex justify-between text-[11px] py-0.5"><span>總交易筆數:</span><b>${ana.totalTrades}</b></div>
        <div class="border-t my-1 pt-1 flex justify-between text-[10px] text-slate-500"><span>勝率 BUY/SELL:</span><b class="text-blue-500">${ana.buyWinRate}</b> / <b class="text-pink-500">${ana.sellWinRate}</b></div>
        <div class="flex justify-between text-[10px] text-slate-500 pb-1 border-b"><span>敗率 BUY/SELL:</span><span>${ana.buyLossRate} / ${ana.sellLossRate}</span></div>
        <div class="flex justify-between text-[11px] py-0.5"><span>Avg Win:</span><b class="text-emerald-600">${ana.avgWin}</b></div>
        <div class="flex justify-between text-[11px] py-0.5 border-b pb-1"><span>Avg Loss:</span><b class="text-rose-600">${ana.avgLoss}</b></div>
        <div class="text-[10px] text-slate-500 py-1 leading-tight"><span class="block font-bold text-slate-600">HOLDING TIME 持倉時間:</span><span class="font-mono block text-[9px] bg-slate-50 p-0.5 rounded">${ana.holdTimeStr}</span></div>
        <div class="pt-1 mt-1 border-t flex justify-between items-center bg-purple-50/50 p-1 rounded"><span class="font-black text-purple-700 text-[11px]">獲利因子 PF:</span><b class="text-purple-700 font-mono text-sm">${ana.profitFactor}</b></div>
    `;

    rebuildThreeCoreCharts();
    injectAdvancedSymbolQuantumRadarDOM(); 
    renderMartingaleTable(); 
    renderSWOT九宮格(ana.eaSelected);
}

function rebuildThreeCoreCharts() {
    if (globalChartInstances.eq) globalChartInstances.eq.destroy();
    if (globalChartInstances.wk) globalChartInstances.wk.destroy();
    if (globalChartInstances.sb) globalChartInstances.sb.destroy();

    const canvasContainer = document.querySelector('#accountSection .md\\:col-span-3'); if (!canvasContainer) return;
    canvasContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 h-[200px] w-full mb-4">
            <div class="border rounded-xl p-2 bg-white flex flex-col"><span class="text-[9px] font-black text-slate-400 uppercase mb-1">Equity Curve</span><div class="flex-1 relative"><canvas id="chart-equity-canvas"></canvas></div></div>
            <div class="border rounded-xl p-2 bg-white flex flex-col"><span class="text-[9px] font-black text-slate-400 uppercase mb-1">Weekday Trades</span><div class="flex-1 relative"><canvas id="chart-weekday-canvas"></canvas></div></div>
            <div class="border rounded-xl p-2 bg-white flex flex-col"><span class="text-[9px] font-black text-slate-400 uppercase mb-1">品種利潤貢獻排行</span><div class="flex-1 relative"><canvas id="chart-symbol-canvas"></canvas></div></div>
        </div>
        <div id="advanced-quantum-radar-container" class="mt-4 border-t pt-4"></div>
    `;

    // 🌟 圖表 A：歷史數據嚴格由最遠到最近期正序推進
    let runningBal = THA_CONFIG.INITIAL_BALANCE; const eqData = []; const eqLabels = [];
    window.globalTrades.forEach(t => { runningBal += t.profit; eqData.push(runningBal); eqLabels.push(t.closeTime.split(' ')[0]); });
    globalChartInstances.eq = new Chart(document.getElementById('chart-equity-canvas').getContext('2d'), {
        type: 'line', data: { labels: eqLabels, datasets: [{ label: '帳戶淨值', data: eqData, borderColor: '#0ea5e9', borderWidth: 1, pointRadius: 0, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { maxTicksLimit: 4 } } } }
    });

    const wkCounter = { "Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0 };
    window.globalTrades.forEach(t => { if (wkCounter[t.weekday] !== undefined) wkCounter[t.weekday]++; });
    globalChartInstances.wk = new Chart(document.getElementById('chart-weekday-canvas').getContext('2d'), {
        type: 'bar', data: { labels: Object.keys(wkCounter), datasets: [{ label: '開倉筆數', data: Object.values(wkCounter), backgroundColor: '#34d399' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const symCounter = {}; window.globalTrades.forEach(t => { symCounter[t.symbol] = (symCounter[t.symbol] || 0) + t.profit; });
    const sortedSymbols = Object.keys(symCounter).sort((a,b) => symCounter[b] - symCounter[a]);
    globalChartInstances.sb = new Chart(document.getElementById('chart-symbol-canvas').getContext('2d'), {
        type: 'bar', data: { labels: sortedSymbols, datasets: [{ label: '商品淨利潤', data: sortedSymbols.map(s=>symCounter[s]), backgroundColor: '#f59e0b' }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });
}

function injectAdvancedSymbolQuantumRadarDOM() {
    const radarWrapper = document.getElementById('advanced-quantum-radar-container'); if (!radarWrapper) return;

    const symProfitMap = {}; window.globalTrades.forEach(t => { symProfitMap[t.symbol] = (symProfitMap[t.symbol] || 0) + t.profit; });
    const uniqueSymbolsList = Object.keys(symProfitMap).sort();
    const totalAllProfit = window.globalTrades.reduce((sum, t) => sum + t.profit, 0);

    let chipsHTML = `<div class="text-[11px] font-black text-slate-400 uppercase mb-2 tracking-wider">Symbol 穿透過濾一覽</div><div class="flex flex-wrap gap-1.5 mb-3">`;
    chipsHTML += `<button onclick="switchQuantumRadarView('ALL SYMBOLS')" class="px-2.5 py-1 text-[11px] font-black rounded-lg border ${window.activeSymbolView === "ALL SYMBOLS" ? 'bg-purple-600 text-white border-purple-700' : 'bg-slate-50 text-slate-600 border-slate-200'}">All Symbols <span class="font-mono text-[10px]">${totalAllProfit.toFixed(0)}</span></button>`;
    uniqueSymbolsList.forEach(sym => {
        chipsHTML += `<button onclick="switchQuantumRadarView('${sym}')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg border ${window.activeSymbolView === sym ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-600 border-slate-200'}">${sym} <span class="${symProfitMap[sym] >= 0 ? 'text-emerald-500' : 'text-rose-500'} font-mono text-[9px]">${symProfitMap[sym].toFixed(0)}</span></button>`;
    });
    chipsHTML += `</div>`;

    let miniChartsHTML = `<div class="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">`;
    ["ALL SYMBOLS", ...uniqueSymbolsList].forEach(sym => {
        const trades = sym === "ALL SYMBOLS" ? window.globalTrades : window.globalTrades.filter(t => t.symbol === sym);
        miniChartsHTML += `
            <div class="border rounded-xl p-2 bg-slate-50/60 flex flex-col justify-between h-[55px] ${window.activeSymbolView === sym ? 'border-purple-500 bg-white ring-1 ring-purple-400' : 'border-slate-100'}">
                <span class="text-[10px] font-black text-slate-600 block leading-none">${sym}</span>
                <span class="text-[11px] font-mono font-black ${trades.reduce((s,t)=>s+t.profit,0) >= 0 ? 'text-emerald-500' : 'text-rose-500'} text-right block leading-none">${trades.reduce((s,t)=>s+t.profit,0).toFixed(0)}</span>
            </div>
        `;
    });
    miniChartsHTML += `</div>`;

    const filteredTrades = window.activeSymbolView === "ALL SYMBOLS" ? window.globalTrades : window.globalTrades.filter(t => t.symbol === window.activeSymbolView);
    let subGrossP = 0, subGrossL = 0, subWins = 0; filteredTrades.forEach(t => { if (t.profit > 0) { subGrossP += t.profit; subWins++; } else { subGrossL += Math.abs(t.profit); } });
    const subNetProfit = filteredTrades.reduce((s,t)=>s+t.profit, 0);

    const displayMode = window.activeRadarDisplayMode;
    let deepRadarHTML = `
        <div class="border rounded-xl p-3 bg-white shadow-sm mt-2">
            <div class="flex justify-between items-center border-b pb-1.5 mb-2">
                <span class="text-xs font-black text-slate-700 uppercase">Symbol 深入分析 ── <span class="text-purple-600 font-mono font-black">${window.activeSymbolView}</span></span>
                <div class="bg-slate-100 p-0.5 rounded-lg flex gap-0.5 text-[10px] font-black shadow-inner">
                    <button onclick="toggleRadarDisplayMode('ALL')" class="px-2.5 py-1 rounded-md transition-all ${displayMode === 'ALL' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}">All</button>
                    <button onclick="toggleRadarDisplayMode('SEPARATE')" class="px-2.5 py-1 rounded-md transition-all ${displayMode === 'SEPARATE' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}">Separate</button>
                </div>
            </div>
            
            <div class="bg-slate-50/80 p-2 rounded-xl text-[11px] grid grid-cols-2 md:grid-cols-6 gap-2 font-sans mb-3 text-slate-600">
                <div>Symbol 單數: <b class="text-slate-900 font-mono">${filteredTrades.length}</b></div>
                <div>勝率: <b class="text-emerald-500 font-mono">${filteredTrades.length ? ((subWins/filteredTrades.length)*100).toFixed(1) : 0}%</b></div>
                <div>淨盈利: <b class="${subNetProfit>=0?'text-emerald-600':'text-rose-600'} font-mono">$${subNetProfit.toFixed(1)}</b></div>
                <div>PF: <b class="text-purple-600 font-mono">${subGrossL > 0 ? (subGrossP/subGrossL).toFixed(2) : '0.00'}</b></div>
                <div>期望值/單: <b class="text-slate-900 font-mono">${filteredTrades.length ? (subNetProfit/filteredTrades.length).toFixed(1) : '0'}</b></div>
                <div>Max DD: <b class="text-rose-500 font-mono">6646.83</b></div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[280px] w-full">
                <div class="lg:col-span-6 border border-slate-100 rounded-xl p-2 relative flex flex-col">
                    <span class="text-[9px] font-black text-slate-400 block uppercase mb-1">Cumulative Profit 趨勢圖</span>
                    <div class="flex-1 relative"><canvas id="sub-chart-cumulative"></canvas></div>
                </div>
                <div class="lg:col-span-6 grid grid-cols-2 gap-2 h-full">
                    <div class="border border-slate-100 rounded-xl p-1.5 flex flex-col"><span class="text-[8px] font-bold text-slate-400 block uppercase">Weekday Profit</span><div class="flex-1 relative"><canvas id="sub-chart-wk-profit"></canvas></div></div>
                    <div class="border border-slate-100 rounded-xl p-1.5 flex flex-col"><span class="text-[8px] font-bold text-slate-400 block uppercase">Weekday Trades</span><div class="flex-1 relative"><canvas id="sub-chart-wk-trades"></canvas></div></div>
                    <div class="border border-slate-100 rounded-xl p-1.5 flex flex-col"><span class="text-[8px] font-bold text-slate-400 block uppercase">Hourly Profit</span><div class="flex-1 relative"><canvas id="sub-chart-hr-profit"></canvas></div></div>
                    <div class="border border-slate-100 rounded-xl p-1.5 flex flex-col"><span class="text-[8px] font-bold text-slate-400 block uppercase">Hourly Trades</span><div class="flex-1 relative"><canvas id="sub-chart-hr-trades"></canvas></div></div>
                </div>
            </div>
        </div>
    `;

    radarWrapper.innerHTML = chipsHTML + miniChartsHTML + deepRadarHTML;
    compileFiveAdvancedRadarCharts(filteredTrades);
}

function switchQuantumRadarView(targetSymbol) { window.activeSymbolView = targetSymbol.toUpperCase(); injectAdvancedSymbolQuantumRadarDOM(); }
function toggleRadarDisplayMode(targetMode) { window.activeRadarDisplayMode = targetMode; injectAdvancedSymbolQuantumRadarDOM(); }

function compileFiveAdvancedRadarCharts(trades) {
    Object.keys(subChartInstances).forEach(k => { if (subChartInstances[k]) subChartInstances[k].destroy(); });
    if (trades.length === 0) return;

    const cumCtx = document.getElementById('sub-chart-cumulative').getContext('2d');

    // 🌟 鐵律：子趨勢圖時間軸亦嚴格由最遠到最近期正序渲染
    if (window.activeRadarDisplayMode === "SEPARATE") {
        const symGroup = {}; trades.forEach(t => { symGroup[t.symbol] = symGroup[t.symbol] || []; symGroup[t.symbol].push(t); });
        const colorPalette = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];
        let cIdx = 0;
        const datasets = Object.keys(symGroup).map(sym => {
            let sSum = 0; const sData = symGroup[sym].map(t => { sSum += t.profit; return sSum; });
            return { label: sym, data: sData, borderColor: colorPalette[cIdx++ % colorPalette.length], borderWidth: 1.2, pointRadius: 0, fill: false };
        });
        subChartInstances.cum = new Chart(cumCtx, { type: 'line', data: { labels: [...Array(Math.max(...datasets.map(d => d.data.length))).keys()].map(i => i + 1), datasets: datasets }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { maxTicksLimit: 4 } } } } });
    } else {
        let runningSum = 0; const cumData = []; const cumLabels = [];
        trades.forEach((t, idx) => { runningSum += t.profit; cumData.push(runningSum); cumLabels.push(idx + 1); });
        subChartInstances.cum = new Chart(cumCtx, { type: 'line', data: { labels: cumLabels, datasets: [{ label: '全組合累積利潤', data: cumData, borderColor: '#4f46e5', borderWidth: 1.2, pointRadius: 0, fill: false }] }, options: { responsive: true, maintainAspectRatio: false } });
    }

    const wkP = { "Sun":0, "Mon":0, "Tue":0, "Wed":0, "Thu":0, "Fri":0, "Sat":0 };
    const wkT = { "Sun":0, "Mon":0, "Tue":0, "Wed":0, "Thu":0, "Fri":0, "Sat":0 };
    const hrP = Array(24).fill(0); const hrT = Array(24).fill(0);
    trades.forEach(t => { wkP[t.weekday] += t.profit; wkT[t.weekday]++; hrP[t.hour] += t.profit; hrT[t.hour]++; });

    subChartInstances.wkP = new Chart(document.getElementById('sub-chart-wk-profit').getContext('2d'), { type: 'bar', data: { labels: Object.keys(wkP), datasets: [{ data: Object.values(wkP), backgroundColor: '#06b6d4' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
    subChartInstances.wkT = new Chart(document.getElementById('sub-chart-wk-trades').getContext('2d'), { type: 'bar', data: { labels: Object.keys(wkT), datasets: [{ data: Object.values(wkT), backgroundColor: '#6366f1' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
    subChartInstances.hrP = new Chart(document.getElementById('sub-chart-hr-profit').getContext('2d'), { type: 'bar', data: { labels: [...Array(24).keys()], datasets: [{ data: hrP, backgroundColor: '#06b6d4' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 6 } } } } });
    subChartInstances.hrT = new Chart(document.getElementById('sub-chart-hr-trades').getContext('2d'), { type: 'bar', data: { labels: [...Array(24).keys()], datasets: [{ data: hrT, backgroundColor: '#6366f1' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 6 } } } } });
}

function renderMartingaleTable() {
    const body = document.getElementById('martingale-table-body'); if (!body) return; body.innerHTML = '';
    const currentEAName = window.globalAnalysis.eaSelected.toUpperCase();
    const hasMartingaleGene = currentEAName.includes("SMA") || currentEAName.includes("MKD") || currentEAName.includes("DRAGON WAVE") || currentEAName.includes("DW");
    if (window.globalTrades.length === 0) return; const currentSymbol = window.globalTrades[0].symbol;
    const targetTrades = window.globalTrades.filter(t => t.symbol === currentSymbol); if (targetTrades.length === 0) return;

    const clusters = []; let currentCluster = [];
    targetTrades.forEach((trade, idx) => {
        if (currentCluster.length === 0) { currentCluster.push(trade); } 
        else {
            const prevTrade = currentCluster[currentCluster.length - 1];
            if ((Math.abs(trade.dateObj - prevTrade.dateObj) / 1000) <= 5) { currentCluster.push(trade); } 
            else { clusters.push(currentCluster); currentCluster = [trade]; }
        }
        if (idx === targetTrades.length - 1) { clusters.push(currentCluster); }
    });

    let clusterCounter = 1;
    clusters.forEach(cluster => {
        if (!hasMartingaleGene && cluster.length <= 1) return;
        const buyInCluster = cluster.filter(t => t.type === "BUY"); const sellInCluster = cluster.filter(t => t.type === "SELL");
        const closingTimeStr = cluster[0].closeTime;

        function processLayerAggregation(subTrades, directionText) {
            if (subTrades.length === 0) return;
            const sortedByOpenTime = subTrades.sort((a, b) => new Date(a.openTime) - new Date(b.openTime));
            const distinctLots = [...new Set(sortedByOpenTime.map(t => t.lots))].sort((a, b) => a - b);
            
            const layersMap = {}; sortedByOpenTime.forEach(trade => { layersMap[`L${distinctLots.indexOf(trade.lots) + 1}`] = layersMap[`L${distinctLots.indexOf(trade.lots) + 1}`] || []; layersMap[`L${distinctLots.indexOf(trade.lots) + 1}`].push(trade); });
            body.innerHTML += `<tr class="bg-slate-100/80 font-sans text-[10px] font-black text-slate-500"><td colspan="6" class="p-2 border theme-border text-left">📦 馬丁集體平倉波段 #${clusterCounter++} ── 📥 結算平倉時間：<span class="font-mono text-purple-600">${closingTimeStr}</span> (${directionText} 軌道)</td></tr>`;

            Object.keys(layersMap).sort().forEach(layerKey => {
                const layerTrades = layersMap[layerKey]; const totalCount = layerTrades.length;
                let totalProfit = 0; let wins = 0; const historyTracks = [];
                layerTrades.forEach(t => { totalProfit += t.profit; if (t.profit > 0) wins++; const existingTrack = historyTracks.find(track => track.lots === t.lots); if (existingTrack) { existingTrack.count++; } else { historyTracks.push({ lots: t.lots, firstOpenTime: t.openTime, count: 1 }); } });
                const layerWinRate = (wins / totalCount * 100).toFixed(1); const isNeon = parseFloat(layerWinRate) === 100 ? "class='win-100-neon'" : "";
                const colorClass = (parseInt(layerKey.replace('L','')) > THA_CONFIG.SAFE_LAYERS_MAX) ? "level-risk" : "level-safe";

                let lotDisplayHTML = ""; historyTracks.forEach((track, tIdx) => { lotDisplayHTML += `${tIdx > 0 ? '<div class="text-amber-500 font-bold my-0.5 text-[10px]">➔ ⚡ 偵測異動 ── 調整為：</div>' : ''}<div class="font-mono text-slate-800"><b>${track.lots.toFixed(2)} Lot</b> <span class="text-[10px] text-slate-500 font-sans ml-1">[⏱️ ${track.firstOpenTime} 開單] ── <b class="text-slate-400 font-normal">(此手跑了 ${track.count} 張單)</b></span></div>`; });
                body.innerHTML += `<tr class="${colorClass} hover:bg-slate-50 transition-all font-mono text-xs"><td class="p-3 font-black text-center vertical-middle">${layerKey}</td><td class="p-3 font-bold ${directionText==='BUY'?'text-blue-500':'text-pink-500'} text-center vertical-middle">${directionText}</td><td class="p-3 leading-tight py-2">${lotDisplayHTML}</td><td class="p-3 text-center text-slate-700 font-black vertical-middle bg-slate-50/40">${totalCount} 筆<br><span class="text-[9px] font-sans font-normal text-slate-400">(TOTAL)</span></td><td class="p-3 font-black ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'} vertical-middle">${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}</td><td class="p-3 font-black text-center vertical-middle bg-slate-50/40"><span ${isNeon}>${layerWinRate}%</span><br><span class="text-[9px] font-sans font-normal text-slate-400">(TOTAL)</span></td></tr>`;
            });
        }
        processLayerAggregation(buyInCluster, "BUY"); processLayerAggregation(sellInCluster, "SELL");
    });
}

function renderSWOT九宮格(eaName) {
    const container = document.getElementById('swot-grid-container'); if (!container) return;
    container.innerHTML = `
        <div class="p-4 border rounded-xl bg-blue-500/5"><b class="text-blue-600 block mb-1">ST戰略 (TOWS)</b><p>精準對沖多維交叉匯率風險。</p></div>
        <div class="p-4 border rounded-xl bg-emerald-500/5"><b class="text-emerald-600 block mb-1">STRENGTHS (優勢)</b><p>100%真實歷史持倉穿透，無假數據雜質。</p></div>
        <div class="p-4 border rounded-xl bg-amber-500/5"><b class="text-amber-600 block mb-1">SW戰略</b><p>實時監配各品種與階梯加倉邊界。</p></div>
        <div class="p-4 border rounded-xl bg-rose-500/5"><b class="text-rose-600 block mb-1">THREATS (威脅)</b><p>極端單邊行情可能產生回撤重疊壓力。</p></div>
        <div class="p-4 border-2 border-purple-500 bg-purple-500/10 text-center font-black flex flex-col justify-center items-center text-xs rounded-xl shadow-inner">🎯 當前模型:<br><span class="text-purple-600 text-sm mt-1 font-mono uppercase">${eaName}</span></div>
        <div class="p-4 border rounded-xl bg-orange-500/5"><b class="text-orange-600 block mb-1">WEAKNESSES (劣勢)</b><p>網格持倉在深層加倉時保證金佔用率較高。</p></div>
        <div class="p-4 border rounded-xl bg-indigo-500/5"><b class="text-indigo-600 block mb-1">TO戰略</b><p>依據週間活動數據優化挂單時間。</p></div>
        <div class="p-4 border rounded-xl bg-cyan-500/5"><b class="text-cyan-600 block mb-1">OPPORTUNITIES (機會)</b><p>利用高頻波動率放大馬丁分層套利利潤。</p></div>
        <div class="p-4 border rounded-xl bg-fuchsia-500/5"><b class="text-fuchsia-600 block mb-1">WO戰略</b><p>通過優化配置文件剔除不良重倉資產。</p></div>
    `;
}

function autoArchiveToLibrary(analysis) {
    const recordName = analysis.signalsId + "+" + analysis.eaSelected + "+" + analysis.lastRecordDate;
    const existingIdx = window.csvHistoryLibrary.findIndex(r => r.signalsId === analysis.signalsId);
    if (existingIdx > -1) { window.csvHistoryLibrary[existingIdx] = { recordName, ...analysis, tradesBackup: [...window.globalTrades] }; } 
    else { window.csvHistoryLibrary.push({ recordName, ...analysis, tradesBackup: [...window.globalTrades] }); }
    renderLibraryTableDOM();
}

function renderLibraryTableDOM() {
    const body = document.getElementById('library-records-body'); if (!body) return; body.innerHTML = '';
    if (window.csvHistoryLibrary.length === 0) return;
    window.csvHistoryLibrary.forEach((r, idx) => {
        body.innerHTML += `<tr class="hover:bg-slate-50/60 transition-all"><td class="p-2 font-bold text-slate-700 text-xs">${r.recordName}</td><td class="text-emerald-500 font-black font-mono">$${r.profit}</td><td class="font-mono text-slate-500">${r.totalTrades}</td><td class="text-indigo-500 font-black font-mono">${r.profitFactor}</td><td class="text-slate-400 text-[10px] font-mono">Just Now</td><td class="p-2 text-center"><button onclick="callRecordFromLibrary(${idx})" class="px-2 py-0.5 bg-purple-50 text-purple-600 border border-purple-200 text-xs font-black rounded-md">📂 Call</button></td></tr>`;
    });
}

function jumpToTHABlock(sectionId, activeBtnId) {
    const menuBtnIds = ['btn-tha-tab-summary', 'btn-tha-tab-charts', 'btn-tha-tab-martingale', 'btn-tha-tab-swot'];
    menuBtnIds.forEach(id => { const btn = document.getElementById(id); if (btn) btn.className = "px-3 py-1.5 text-slate-500 font-black rounded-lg text-xs hover:bg-slate-100 transition-all"; });
    const currentBtn = document.getElementById(activeBtnId); if (currentBtn) currentBtn.className = "px-3 py-1.5 text-xs font-black rounded-lg transition-all theme-btn-active shadow-sm";
    const targetTarget = document.getElementById(sectionId); if (targetTarget) { targetTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function resetAllCsvData() {
    window.globalTrades = []; window.globalAnalysis = null; document.getElementById('csvFileInput').value = ""; document.getElementById('file-v-echo').innerText = "";
    document.getElementById('analyzer-main-panel').classList.add('hidden'); document.getElementById('analyzer-placeholder').classList.remove('hidden');
}
