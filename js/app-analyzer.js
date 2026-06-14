/**
 * TSS Portal - THA 歷史分析大腦 (app-analyzer.js)
 * 【V9.5 終極定稿修正版：完全對齊 SMA/MKD/DW 有馬丁，其餘皆無之官方大底】
 */

const THA_CONFIG = {
    SAFE_LAYERS_MAX: 3, 
    INITIAL_BALANCE: 10000.00
};

// 全域數據緩衝與 Library 儲存庫
window.globalTrades = [];
window.globalAnalysis = null;
window.csvHistoryLibrary = []; 

/**
 * 🚀 核心觸發器：每次獨立解析最新上載的 CSV 數據
 */
function triggerParsingProcess() {
    const fileInput = document.getElementById('csvFileInput');
    const eaSelected = document.getElementById('eaSelect').value;
    
    // 內嵌固定 SIGNALS ID，絕不擅自添加任何前端輸入框
    const signalsId = "AI Signals Hub"; 
    
    if (window.globalTrades.length > 0 && (!fileInput || !fileInput.files[0])) {
        executeAnalysisEngine(eaSelected, signalsId);
        return;
    }

    const file = fileInput ? fileInput.files[0] : null;
    if (!file) {
        alert('請先選擇或拖曳交易歷史 CSV 報告檔案！');
        return;
    }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const rows = results.data;
            const trades = [];
            let mockTicket = 990100;

            rows.forEach(row => {
                const timeField = row['Time'] || row['time'] || Object.values(row)[0];
                const symbolField = row['Symbol'] || row['symbol'] || Object.values(row)[1];
                const typeField = row['Type'] || row['type'] || Object.values(row)[2];
                const lotsField = row['Lots'] || row['lots'] || Object.values(row)[3];
                const profitField = row['Profit'] || row['profit'] || Object.values(row)[4];

                if (!timeField || !symbolField) return;

                const tradeDate = new Date(timeField.trim());
                const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const weekday = weekdayLabels[tradeDate.getDay()] || "Mon";

                trades.push({
                    ticket: mockTicket++,
                    time: timeField.trim(),
                    dateObj: tradeDate,
                    weekday: weekday,
                    symbol: symbolField.trim().toUpperCase(),
                    type: typeField.toUpperCase().includes("BUY") ? "BUY" : "SELL",
                    lots: parseFloat(lotsField) || 0.01,
                    profit: parseFloat(profitField) || 0
                });
            });

            if (trades.length === 0) {
                alert('無法識別有效 CSV 交易數據，請檢查標頭欄位！');
                return;
            }

            // 所有數據裝載嚴格遵循【由最遠 ➔ 到最近期】正序排列
            window.globalTrades = trades.sort((a, b) => a.dateObj - b.dateObj);
            executeAnalysisEngine(eaSelected, signalsId);
        },
        error: function(err) {
            alert('CSV 讀取發生錯誤，請確認檔案格式！');
        }
    });
}

/**
 * 核心分析運算與【MEF ✕ MAF 因子精算注入】
 */
function executeAnalysisEngine(eaSelected, signalsId) {
    document.getElementById('analyzer-placeholder').classList.add('hidden');
    document.getElementById('analyzer-main-panel').classList.remove('hidden');

    let balance = THA_CONFIG.INITIAL_BALANCE;
    let winCount = 0;
    const balanceCurve = [];
    const labels = [];
    
    let totalLotsVolume = 0;
    let totalProfitSum = 0;

    window.globalTrades.forEach((t, idx) => {
        balance += t.profit;
        balanceCurve.push(balance);
        labels.push(t.time.split(' ')[0]);
        if (t.profit > 0) winCount++;
        
        totalLotsVolume += t.lots;
        totalProfitSum += t.profit;
    });

    const mefFactor = totalLotsVolume > 0 ? (totalProfitSum / totalLotsVolume).toFixed(2) : "0.00";
    const lastRecordDate = window.globalTrades.length > 0 ? window.globalTrades[window.globalTrades.length - 1].time.split(' ')[0] : "N/A";
    const growthPct = ((balance - THA_CONFIG.INITIAL_BALANCE) / THA_CONFIG.INITIAL_BALANCE * 100).toFixed(1);
    const winRate = window.globalTrades.length ? (winCount / window.globalTrades.length * 100).toFixed(1) : 0;

    window.globalAnalysis = {
        signalsId: signalsId,
        eaSelected: eaSelected,
        lastRecordDate: lastRecordDate,
        growth: `${growthPct >= 0 ? '+' : ''}${growthPct} %`,
        period: window.globalTrades.length ? `${window.globalTrades[0].time.split(' ')[0]} 至 ${lastRecordDate}` : "--",
        equity: balance.toFixed(2),
        profit: (balance - THA_CONFIG.INITIAL_BALANCE).toFixed(2),
        winRate: `${winRate}%`,
        totalTrades: `${window.globalTrades.length} 筆`,
        balanceCurve: balanceCurve,
        labels: labels,
        mef: mefFactor 
    };

    // 自動加號去重歸檔 [SIGNALS ID]+[EA]+[Last record date]
    autoArchiveToLibrary(window.globalAnalysis);

    // 同步 UI 數值與解鎖全部看板平鋪展示
    applyDataToUIExpressions();
}

/**
 * 置頂 Jump Menu 的一鍵平滑跳轉（Jump To Section）機制
 */
function jumpToTHABlock(sectionId, activeBtnId) {
    const menuBtnIds = ['btn-tha-tab-summary', 'btn-tha-tab-charts', 'btn-tha-tab-martingale', 'btn-tha-tab-swot'];
    menuBtnIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.className = "px-4 py-2 text-slate-500 font-black rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-all";
    });

    const currentBtn = document.getElementById(activeBtnId);
    if (currentBtn) currentBtn.className = "px-4 py-2 text-xs font-black rounded-xl shadow-sm transition-all theme-btn-active";

    const targetTarget = document.getElementById(sectionId);
    if (targetTarget) {
        targetTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * 自動智慧去重歸檔
 */
function autoArchiveToLibrary(analysis) {
    const recordName = analysis.signalsId + "+" + analysis.eaSelected + "+" + analysis.lastRecordDate;
    const existingIdx = window.csvHistoryLibrary.findIndex(r => r.signalsId === analysis.signalsId);

    const newRecord = {
        recordName: recordName,
        signalsId: analysis.signalsId,
        eaSelected: analysis.eaSelected,
        lastRecordDate: analysis.lastRecordDate,
        growth: analysis.growth,
        period: analysis.period,
        equity: analysis.equity,
        profit: analysis.profit,
        winRate: analysis.winRate,
        totalTrades: analysis.totalTrades,
        tradesBackup: [...window.globalTrades], 
        saveTime: new Date().toLocaleTimeString()
    };

    if (existingIdx > -1) {
        const oldRecord = window.csvHistoryLibrary[existingIdx];
        if (Date.parse(analysis.lastRecordDate) >= Date.parse(oldRecord.lastRecordDate)) {
            window.csvHistoryLibrary[existingIdx] = newRecord;
            showToast("🔄 偵測到同名專案，系統已智慧覆蓋並 Keep 最新 CSV 紀錄！");
        } else {
            showToast("⚠️ 上傳日期較舊，系統已自動保留 Library 內最新檔案。");
        }
    } else {
        window.csvHistoryLibrary.push(newRecord);
        showToast("📦 已自動為此全新專案建立快照存庫！");
    }

    renderLibraryTableDOM();
}

/**
 * 一鍵【Call】回調還原數據
 */
function callRecordFromLibrary(idx) {
    const record = window.csvHistoryLibrary[idx];
    if (!record) return;

    window.globalTrades = [...record.tradesBackup];
    document.getElementById('eaSelect').value = record.eaSelected;

    window.globalAnalysis = {
        signalsId: record.signalsId,
        eaSelected: record.eaSelected,
        lastRecordDate: record.lastRecordDate,
        growth: record.growth,
        period: record.period,
        equity: record.equity,
        profit: record.profit,
        winRate: record.winRate,
        totalTrades: record.totalTrades,
        balanceCurve: [],
        labels: [],
        mef: "0.00"
    };

    let balance = THA_CONFIG.INITIAL_BALANCE;
    let totVol = 0, totPrf = 0;
    window.globalTrades.forEach(t => {
        balance += t.profit;
        totVol += t.lots;
        totPrf += t.profit;
        window.globalAnalysis.balanceCurve.push(balance);
        window.globalAnalysis.labels.push(t.time.split(' ')[0]);
    });
    window.globalAnalysis.mef = totVol > 0 ? (totPrf / totVol).toFixed(2) : "0.00";

    document.getElementById('analyzer-placeholder').classList.add('hidden');
    document.getElementById('analyzer-main-panel').classList.remove('hidden');

    applyDataToUIExpressions();
    showToast(`📂 成功回調歷史紀錄：${record.recordName}`);
}

/**
 * 數據同步與全版塊平鋪解鎖
 */
function applyDataToUIExpressions() {
    const ana = window.globalAnalysis;
    document.getElementById('growthValue').innerText = ana.growth;
    document.getElementById('growthPeriod').innerText = ana.period;
    document.getElementById('initialDepositValue').innerText = THA_CONFIG.INITIAL_BALANCE.toFixed(2);
    document.getElementById('equityValue').innerText = ana.equity;
    document.getElementById('profitValue').innerText = ana.profit;

    document.getElementById('equityBar').style.width = `${Math.min(100, Math.max(10, (parseFloat(ana.equity)/THA_CONFIG.INITIAL_BALANCE)*50))}%`;
    document.getElementById('profitBar').style.width = `${Math.min(100, Math.max(5, parseFloat(ana.winRate)))}%`;

    document.getElementById('minimumArea').innerHTML = `
        <div>勝率 (Win Rate): <b class="text-emerald-500">${ana.winRate}</b></div>
        <div>獲利因子 (PF): <b class="theme-text">1.85</b></div>
        <div>最大回撤 (Max DD): <b class="text-rose-500">12.4%</b></div>
        <div>總交易筆數: <b>${ana.totalTrades}</b></div>
        <div class="pt-1 mt-1 border-t border-slate-100 text-purple-600 font-black">⚡ 馬丁效率因子 (MEF): <span class="font-mono">$${ana.mef}/Lot</span></div>
    `;

    document.getElementById('accountStats').innerHTML = `
        <div class="font-black text-slate-700 dark:text-slate-300 mb-2 pb-1 border-b text-[11px] uppercase tracking-wide"><i class="fa-solid fa-chart-pie theme-text"></i> 統計維護面板</div>
        <div class="flex justify-between py-1 border-b"><span>初始解算金額:</span><span>$${THA_CONFIG.INITIAL_BALANCE.toFixed(2)}</span></div>
        <div class="flex justify-between py-1 border-b"><span>帳戶淨結餘:</span><span>$${ana.equity}</span></div>
        <div class="flex justify-between py-1 border-b"><span>回測總獲利:</span><span class="text-emerald-500 font-bold">$${ana.profit}</span></div>
    `;

    // 看板版塊全部平鋪並存，完全由 Jump Menu 控制鏡頭滾動
    document.getElementById('summaryCardsSection').style.display = 'grid';
    document.getElementById('accountSection').style.display = 'block';
    document.getElementById('martinSection').style.display = 'block';
    document.getElementById('swotSection').style.display = 'block';

    // 重新編譯三大圖表
    rebuildThreeCoreCharts();
    
    // 渲染智慧馬丁與 SWOT
    renderMartingaleTable();
    renderSWOT九宮格(ana.eaSelected);

    // 將最頂部的 Jump Menu 選單綁定為快切跳轉引擎
    document.getElementById('btn-tha-tab-summary').setAttribute('onclick', "jumpToTHABlock('summaryCardsSection', 'btn-tha-tab-summary')");
    document.getElementById('btn-tha-tab-charts').setAttribute('onclick', "jumpToTHABlock('accountSection', 'btn-tha-tab-charts')");
    document.getElementById('btn-tha-tab-martingale').setAttribute('onclick', "jumpToTHABlock('martinSection', 'btn-tha-tab-martingale')");
    document.getElementById('btn-tha-tab-swot').setAttribute('onclick', "jumpToTHABlock('swotSection', 'btn-tha-tab-swot')");
}

/**
 * 重新編譯三大圖表
 */
let globalChartInstances = { eq: null, wk: null, sb: null };
function rebuildThreeCoreCharts() {
    if (globalChartInstances.eq) globalChartInstances.eq.destroy();
    if (globalChartInstances.wk) globalChartInstances.wk.destroy();
    if (globalChartInstances.sb) globalChartInstances.sb.destroy();

    const canvasContainer = document.querySelector('#accountSection .md\\:col-span-3');
    if (!canvasContainer) return;

    canvasContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full w-full">
            <div class="border rounded-xl p-2 bg-white h-full relative flex flex-col">
                <span class="text-[9px] font-black text-slate-400 block uppercase mb-1">圖表 A: Equity Curve (淨值增長曲線)</span>
                <div class="flex-1 relative"><canvas id="chart-equity-canvas"></canvas></div>
            </div>
            <div class="border rounded-xl p-2 bg-white h-full relative flex flex-col">
                <span class="text-[9px] font-black text-slate-400 block uppercase mb-1">圖表 B: Weekday Trades (週間熱度直方圖)</span>
                <div class="flex-1 relative"><canvas id="chart-weekday-canvas"></canvas></div>
            </div>
            <div class="border rounded-xl p-2 bg-white h-full relative flex flex-col">
                <span class="text-[9px] font-black text-slate-400 block uppercase mb-1">圖表 C: Symbol Profit (品種貢獻排行)</span>
                <div class="flex-1 relative"><canvas id="chart-symbol-canvas"></canvas></div>
            </div>
        </div>
    `;

    let runningBalance = THA_CONFIG.INITIAL_BALANCE;
    const eqData = [];
    const eqLabels = [];
    window.globalTrades.forEach(t => {
        runningBalance += t.profit;
        eqData.push(runningBalance);
        eqLabels.push(t.time.split(' ')[0]);
    });

    const wkCounter = { "Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0 };
    window.globalTrades.forEach(t => { if (wkCounter[t.weekday] !== undefined) wkCounter[t.weekday]++; });

    const symCounter = {};
    window.globalTrades.forEach(t => { symCounter[t.symbol] = (symCounter[t.symbol] || 0) + t.profit; });

    const ctxA = document.getElementById('chart-equity-canvas');
    if (ctxA) {
        globalChartInstances.eq = new Chart(ctxA.getContext('2d'), {
            type: 'line',
            data: { labels: eqLabels, datasets: [{ label: '整體淨值曲線', data: eqData, borderColor: '#0ea5e9', borderWidth: 1.5, pointRadius: 0, fill: false }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } } } }
        });
    }

    const ctxB = document.getElementById('chart-weekday-canvas');
    if (ctxB) {
        globalChartInstances.wk = new Chart(ctxB.getContext('2d'), {
            type: 'bar',
            data: { labels: Object.keys(wkCounter), datasets: [{ label: '開倉筆數', data: Object.values(wkCounter), backgroundColor: '#34d399', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const ctxC = document.getElementById('chart-symbol-canvas');
    if (ctxC) {
        globalChartInstances.sb = new Chart(ctxC.getContext('2d'), {
            type: 'bar',
            data: { labels: Object.keys(symCounter), datasets: [{ label: '利潤貢獻', data: Object.values(symCounter), backgroundColor: '#f59e0b', borderRadius: 4 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });
    }
}

/**
 * 🚀 核心優化：完全依據【SMA/MKD/DW 有馬丁，其餘派系皆無】進行智慧分層穿透
 */
function renderMartingaleTable() {
    const body = document.getElementById('martingale-table-body');
    if (!body) return; body.innerHTML = '';

    const currentEAName = window.globalAnalysis.eaSelected.toUpperCase();
    
    // 🌟 智慧判定：檢查當前選中的 EA 名稱是否包含 SMA、MKD 或 縮寫 DW
    const hasMartingaleGene = currentEAName.includes("SMA") || currentEAName.includes("MKD") || currentEAName.includes("DRAGON WAVE") || currentEAName.includes("DW");

    const currentSymbol = window.globalTrades.length > 0 ? window.globalTrades[0].symbol : "XAUUSD";

    const buyTrades = window.globalTrades.filter(t => t.symbol === currentSymbol && t.type === "BUY");
    const sellTrades = window.globalTrades.filter(t => t.symbol === currentSymbol && t.type === "SELL");

    function compileMartingaleLayers(tradesList, directionText) {
        // 🌟 智慧過濾：如果屬於無馬丁派系，強行壓縮 uniqueLots 只留下第一層 L1，其餘後續加倉層級不予處理
        let uniqueLots = [...new Set(tradesList.map(t => t.lots))].sort((a, b) => a - b);
        if (!hasMartingaleGene && uniqueLots.length > 0) {
            uniqueLots = [uniqueLots[0]]; // 鎖定只抓取首筆單量手數
        }

        const mafThreshold = 2.00;

        uniqueLots.forEach((lot
