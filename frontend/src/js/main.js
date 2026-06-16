// ============================================================
// Utilities
// ============================================================

function toLocalDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function todayStr() {
    return toLocalDateStr(new Date());
}

function offsetDateStr(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return toLocalDateStr(d);
}

function formatDateJa(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

function formatSec(seconds) {
    if (seconds < 60) return seconds + "秒";
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;
    if (m < 60) return m + "分" + s + "秒";
    let h = Math.floor(m / 60);
    m = m % 60;
    return h + "時間" + m + "分";
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 75%, 60%)`;
}

function normalizeAppName(raw) {
    if (!raw) return '不明';
    const lower = raw.toLowerCase();
    const exeMatch = raw.match(/^([^\s\[]+\.exe)/i);
    const exeName = exeMatch ? exeMatch[1].toLowerCase() : '';

    if (exeName === 'cursor.exe' || lower.includes('cursor')) return 'Cursor';
    if (lower.includes('youtube')) return 'YouTube';
    if (exeName === 'msedge.exe' || lower.includes('msedge')) return 'Edge';
    if (exeName === 'chrome.exe' || lower.includes('chrome')) {
        if (lower.includes('youtube')) return 'YouTube';
        return 'Chrome';
    }
    if (exeName === 'firefox.exe') return 'Firefox';
    if (exeName === 'code.exe' || lower.includes('vs code') || lower.includes('vscode')) return 'VS Code';
    if (exeName === 'chatgpt.exe' || lower.includes('chatgpt')) return 'ChatGPT';
    if (exeName === 'slack.exe' || lower.includes('slack')) return 'Slack';
    if (exeName === 'discord.exe' || lower.includes('discord')) return 'Discord';
    if (exeName === 'zoom.exe' || lower.includes('zoom')) return 'Zoom';
    if (exeName === 'teams.exe' || lower.includes('teams')) return 'Teams';
    if (exeName === 'notion.exe' || lower.includes('notion')) return 'Notion';
    if (exeName === 'figma.exe' || lower.includes('figma')) return 'Figma';
    if (exeName === 'antigravity.exe' || lower.includes('antigravity')) return 'Antigravity';
    if (exeName === 'explorer.exe') return 'エクスプローラー';
    if (exeName === 'shellexperiencehost.exe' || exeName === 'startmenuexperiencehost.exe') return 'Windowsシェル';
    if (exeName === 'spotify.exe' || lower.includes('spotify')) return 'Spotify';
    if (exeName === 'windowsterminal.exe' || exeName === 'pwsh.exe' || exeName === 'powershell.exe') return 'ターミナル';
    if (exeName === 'cmd.exe') return 'コマンドプロンプト';
    if (raw.toLowerCase() === 'unknown' || raw === '') return '不明';
    if (exeName === 'uiwinmgr.exe') return 'システム通知';
    if (exeName === 'lockapp.exe') return 'ロック画面';
    if (exeName === 'searchhost.exe' || exeName === 'searchapp.exe') return '検索';

    if (exeName) return exeName.replace('.exe', '');
    return raw.replace(/\s*\[.*?\]/g, '').trim() || '不明';
}

// ============================================================
// API Fetch: static file routing (Cloudflare Pages) vs Flask
// ============================================================

let staticManifest = null;

async function loadStaticManifest() {
    if (staticManifest) return staticManifest;
    try {
        const r = await fetch('/data/manifest.json');
        if (r.ok) staticManifest = await r.json();
    } catch (_) { /* local dev */ }
    return staticManifest;
}

function fetchApi(path) {
    const useStatic = document.documentElement.dataset.useStaticApi === 'true';
    if (!useStatic) return fetch(path);

    const [base, qs] = path.split('?');
    const params = new URLSearchParams(qs || '');

    if (base === '/api/trends') {
        const period = params.get('period') || 'today';
        return fetch(`/data/trends-${period}.json`);
    }
    if (base === '/api/timeline' && params.has('date')) {
        return fetch(`/data/timeline-${params.get('date')}.json`);
    }
    if (base === '/api/transitions' && params.has('date')) {
        return fetch(`/data/transitions-${params.get('date')}.json`);
    }
    if (base === '/api/time-analysis' && params.has('date')) {
        return fetch(`/data/time-analysis-${params.get('date')}.json`);
    }
    if (base === '/api/dates') {
        return fetch(`/data/dates-${params.get('year')}-${params.get('month')}.json`);
    }
    if (base === '/api/history/compare' && params.has('date')) {
        return fetch(`/data/history-compare-${params.get('date')}.json`);
    }
    if (base === '/api/history/drift-patterns') {
        const period = params.get('period') || '7days';
        return fetch(`/data/history-drift-${period}.json`);
    }

    const name = base.replace(/^\/api\//, '');
    return fetch(`/data/${name}.json`);
}

// ============================================================
// Navigation
// ============================================================

const PAGE_META = {
    home:    { title: 'Home',    subtitle: '今どうなっているか' },
    today:   { title: 'Today',   subtitle: '今日何をしたか' },
    history: { title: 'History', subtitle: '自分は普段どういう人間なのか' },
};

function switchView(viewId) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nav = document.querySelector(`[data-view="${viewId}"]`);
    if (nav) nav.classList.add('active');

    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');

    const meta = PAGE_META[viewId] || PAGE_META.home;
    document.getElementById('page-title').innerText = meta.title;
    document.getElementById('page-subtitle').innerText = meta.subtitle;

    if (viewId === 'today') loadToday();
    if (viewId === 'history') loadHistory();
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(item.getAttribute('data-view'));
    });
});

// ============================================================
// Live Tracking (1秒ごとに現在アクティブなアプリを更新)
// ============================================================

setInterval(() => {
    fetchApi('/api/current')
        .then(r => r.json())
        .then(data => {
            document.getElementById('live-app-name').innerText = data.app || '-';
            document.getElementById('live-duration').innerText = formatSec(data.duration);
            document.getElementById('live-duration-context').innerText = formatSec(data.duration);
            document.getElementById('live-previous').innerText = data.previous_app || '-';
            document.getElementById('live-today-count').innerText = data.today_count || 0;
            document.getElementById('live-avg-duration').innerText = formatSec(data.avg_duration);

            const sessionPercent = Math.min(Math.round((data.duration / 3600) * 100), 100);
            document.getElementById('session-percent').innerText = sessionPercent + '%';
            const progressRing = document.querySelector('.progress-ring');
            if (progressRing) {
                progressRing.setAttribute('stroke-dasharray', `${sessionPercent}, 100`);
            }
        });
}, 1000);

// ============================================================
// Home View
// ============================================================

function loadHome() {
    const currentHour = new Date().getHours();
    document.getElementById('current-hour-title').innerText = '現在の時間帯';
    document.getElementById('current-hour-range').innerText = `${currentHour}:00 ───────────── ${currentHour + 1}:00`;

    const previousHour = currentHour - 1;
    document.getElementById('previous-hour-title').innerText = '前の時間帯';
    document.getElementById('previous-hour-range').innerText = `${previousHour}:00 ───────────── ${currentHour}:00`;

    fetchApi('/api/timeline')
        .then(r => r.json())
        .then(data => {
            const currentHourData  = data.filter(item => parseInt(item.start.split(":")[0]) === currentHour);
            const previousHourData = data.filter(item => parseInt(item.start.split(":")[0]) === previousHour);
            renderHourTimeline('current-hour-viz',  currentHourData);
            renderHourTimeline('previous-hour-viz', previousHourData);
        });
}

loadHome();
setInterval(loadHome, 10000);

// ============================================================
// Trends (Home画面の使用傾向グラフ)
// ============================================================

let currentTrendPeriod = 'today';

function loadTrends(period = 'today') {
    currentTrendPeriod = period;
    fetchApi(`/api/trends?period=${period}`)
        .then(r => r.json())
        .then(data => {
            const trendsContent = document.getElementById('trends-content');
            if (!trendsContent) return;
            trendsContent.innerHTML = '';

            if (data.trends.length === 0) {
                trendsContent.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">データがありません</p>';
                return;
            }

            const trendChart = document.createElement('div');
            trendChart.className = 'trend-chart';

            data.trends.forEach(trend => {
                const trendItem = document.createElement('div');
                trendItem.className = 'trend-item';
                const maxTime = Math.max(...data.trends.map(t => t.total_time));
                const barWidth = (trend.total_time / maxTime) * 100;
                const topAppsHtml = trend.top_apps.map(app => `
                    <div class="trend-app-item">
                        <span class="trend-app-name">${app.app}</span>
                        <span class="trend-app-time">${formatSec(app.time)}</span>
                    </div>
                `).join('');
                trendItem.innerHTML = `
                    <div class="trend-date">${trend.date}</div>
                    <div class="trend-bar-container">
                        <div class="trend-bar" style="width: ${barWidth}%;">
                            <span class="trend-bar-time">${formatSec(trend.total_time)}</span>
                        </div>
                    </div>
                    <div class="trend-stats"><span>スイッチ: ${trend.switch_count}回</span></div>
                    <div class="trend-apps">${topAppsHtml}</div>
                `;
                trendChart.appendChild(trendItem);
            });
            trendsContent.appendChild(trendChart);
        });
}

document.querySelectorAll('.trend-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.trend-period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadTrends(btn.dataset.period);
    });
});
loadTrends();

// ============================================================
// Gantt Chart (タイムライン描画)
// ============================================================

function renderFullGantt(vizEl, data) {
    if (!vizEl) return;
    vizEl.innerHTML = '';
    if (!data || data.length === 0) {
        vizEl.innerHTML = '<p class="empty-msg">データがありません</p>';
        return;
    }

    function timeToMin(t) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    const allStarts = data.map(d => timeToMin(d.start));
    const allEnds   = data.map(d => timeToMin(d.end));
    const minTime   = Math.min(...allStarts);
    const maxTime   = Math.max(...allEnds);
    const totalMin  = maxTime - minTime || 1;

    const appOrder = [];
    data.forEach(d => {
        const norm = normalizeAppName(d.app);
        if (!appOrder.includes(norm)) appOrder.push(norm);
    });

    const gantt = document.createElement('div');
    gantt.className = 'gantt-full';

    // Axis
    const axisWrap  = document.createElement('div'); axisWrap.className = 'gantt-axis-wrap';
    const axisLabel = document.createElement('div'); axisLabel.className = 'gantt-label-col';
    axisWrap.appendChild(axisLabel);
    const axisTicks = document.createElement('div'); axisTicks.className = 'gantt-timeline-col';
    const startHour = Math.floor(minTime / 60);
    const endHour   = Math.ceil(maxTime / 60);
    for (let h = startHour; h <= endHour; h++) {
        const tickMin = h * 60;
        const leftPct = Math.max(0, ((tickMin - minTime) / totalMin)) * 100;
        const tick = document.createElement('div');
        tick.className = 'gantt-tick';
        tick.style.left = leftPct + '%';
        tick.innerText = `${h}:00`;
        axisTicks.appendChild(tick);
    }
    axisWrap.appendChild(axisTicks);
    gantt.appendChild(axisWrap);

    // Rows
    appOrder.forEach(normApp => {
        const row   = document.createElement('div'); row.className = 'gantt-full-row';
        const label = document.createElement('div'); label.className = 'gantt-full-label'; label.innerText = normApp;
        row.appendChild(label);

        const track = document.createElement('div'); track.className = 'gantt-full-track';
        data.filter(d => normalizeAppName(d.app) === normApp).forEach(seg => {
            const startMin = timeToMin(seg.start);
            const endMin   = timeToMin(seg.end);
            const bar = document.createElement('div');
            bar.className = 'gantt-full-bar';
            bar.style.left       = ((startMin - minTime) / totalMin) * 100 + '%';
            bar.style.width      = Math.max(((endMin - startMin) / totalMin) * 100, 0.3) + '%';
            bar.style.background = stringToColor(normApp);
            bar.addEventListener('mouseenter', (e) => showGanttTooltip(e, seg, normApp));
            bar.addEventListener('mousemove',  moveGanttTooltip);
            bar.addEventListener('mouseleave', hideGanttTooltip);
            track.appendChild(bar);
        });
        row.appendChild(track);
        gantt.appendChild(row);
    });

    vizEl.appendChild(gantt);

    // Legend
    const legend = document.createElement('div'); legend.className = 'gantt-legend';
    appOrder.forEach(normApp => {
        const item = document.createElement('div'); item.className = 'gantt-legend-item';
        item.innerHTML = `<span class="gantt-legend-dot" style="background:${stringToColor(normApp)}"></span>${normApp}`;
        legend.appendChild(item);
    });
    vizEl.appendChild(legend);
}

function renderHourTimeline(containerId, data) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (data.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">データがありません</p>';
        return;
    }

    function timeToMin(t) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    const allStarts = data.map(d => timeToMin(d.start));
    const allEnds   = data.map(d => timeToMin(d.end));
    const minTime   = Math.min(...allStarts);
    const maxTime   = Math.max(...allEnds);
    const totalMin  = maxTime - minTime || 1;

    const appOrder = [];
    data.forEach(d => {
        const norm = normalizeAppName(d.app);
        if (!appOrder.includes(norm)) appOrder.push(norm);
    });

    const gantt = document.createElement('div'); gantt.className = 'gantt-full';

    // Axis with 10-minute ticks
    const axisWrap  = document.createElement('div'); axisWrap.className = 'gantt-axis-wrap';
    const axisLabel = document.createElement('div'); axisLabel.className = 'gantt-label-col';
    axisWrap.appendChild(axisLabel);
    const axisTicks = document.createElement('div'); axisTicks.className = 'gantt-timeline-col';
    const startHour = Math.floor(minTime / 60);
    const endHour   = Math.ceil(maxTime / 60);
    for (let h = startHour; h <= endHour; h++) {
        for (let m = 0; m < 60; m += 10) {
            const tickMin = h * 60 + m;
            if (tickMin < minTime || tickMin > maxTime) continue;
            const leftPct = ((tickMin - minTime) / totalMin) * 100;
            const tick = document.createElement('div');
            tick.className = 'gantt-tick';
            tick.style.left = leftPct + '%';
            tick.innerText = `${h}:${String(m).padStart(2, '0')}`;
            axisTicks.appendChild(tick);
        }
    }
    axisWrap.appendChild(axisTicks);
    gantt.appendChild(axisWrap);

    // Rows
    appOrder.forEach(normApp => {
        const row   = document.createElement('div'); row.className = 'gantt-full-row';
        const label = document.createElement('div'); label.className = 'gantt-full-label';
        label.innerText = normApp; label.title = normApp;
        row.appendChild(label);

        const track = document.createElement('div'); track.className = 'gantt-full-track';
        data.filter(d => normalizeAppName(d.app) === normApp).forEach(seg => {
            const startMin = timeToMin(seg.start);
            const endMin   = timeToMin(seg.end);
            const bar = document.createElement('div');
            bar.className = 'gantt-full-bar';
            bar.style.left       = ((startMin - minTime) / totalMin) * 100 + '%';
            bar.style.width      = Math.max(((endMin - startMin) / totalMin) * 100, 0.5) + '%';
            bar.style.background = stringToColor(normApp);
            bar.addEventListener('mouseenter', (e) => showGanttTooltip(e, seg, normApp));
            bar.addEventListener('mousemove',  moveGanttTooltip);
            bar.addEventListener('mouseleave', hideGanttTooltip);
            track.appendChild(bar);
        });

        // Grid lines every 10 min
        for (let h = startHour; h <= endHour; h++) {
            for (let m = 0; m < 60; m += 10) {
                const tickMin = h * 60 + m;
                if (tickMin < minTime || tickMin > maxTime) continue;
                const grid = document.createElement('div');
                grid.className = 'gantt-grid-line';
                grid.style.left = ((tickMin - minTime) / totalMin) * 100 + '%';
                track.appendChild(grid);
            }
        }

        row.appendChild(track);
        gantt.appendChild(row);
    });
    container.appendChild(gantt);
}

// Tooltip
let ganttTooltipEl = null;
function getOrCreateTooltip() {
    if (!ganttTooltipEl) {
        ganttTooltipEl = document.createElement('div');
        ganttTooltipEl.className = 'gantt-tooltip';
        document.body.appendChild(ganttTooltipEl);
    }
    return ganttTooltipEl;
}
function showGanttTooltip(e, seg, normApp) {
    const tip = getOrCreateTooltip();
    const displayName = normApp || normalizeAppName(seg.app);
    const rawName = seg.app !== displayName ? seg.app : null;
    tip.innerHTML = `
        <div class="gantt-tip-app">${displayName}</div>
        ${rawName ? `<div class="gantt-tip-raw">${rawName}</div>` : ''}
        <div class="gantt-tip-time">${seg.start} 〜 ${seg.end}</div>
        <div class="gantt-tip-dur">${formatSec(seg.sec)}</div>
    `;
    tip.style.display = 'block';
    moveGanttTooltip(e);
}
function moveGanttTooltip(e) {
    const tip = getOrCreateTooltip();
    tip.style.left = (e.clientX + 14) + 'px';
    tip.style.top  = (e.clientY - 12) + 'px';
}
function hideGanttTooltip() {
    getOrCreateTooltip().style.display = 'none';
}

// ============================================================
// Render helpers
// ============================================================

function renderTransitionsList(listEl, data) {
    if (!listEl) return;
    listEl.innerHTML = '';
    const transitions = data.transitions || [];
    if (transitions.length === 0) {
        listEl.innerHTML = '<p class="empty-msg">データがありません</p>';
        return;
    }
    transitions.slice(0, 8).forEach(t => {
        const parts = t.transition.split(' → ');
        if (parts.length !== 2) return;
        const item = document.createElement('div');
        item.className = 'drift-pattern-item';
        item.innerHTML = `
            <div class="drift-pattern-flow">
                <div class="drift-step">${parts[0]}</div>
                <div class="drift-arrow">↓</div>
                <div class="drift-step">${parts[1]}</div>
            </div>
            <div class="drift-count">${t.count}回</div>`;
        listEl.appendChild(item);
    });
}

function renderTimeAnalysisList(listEl, data) {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!data.hourly_blocks || data.hourly_blocks.length === 0) {
        listEl.innerHTML = '<p class="empty-msg">データがありません</p>';
        return;
    }
    data.hourly_blocks.forEach(block => {
        const blockItem = document.createElement('div');
        blockItem.className = 'hourly-block-item';
        const appsHtml = block.segments.map(seg => {
            const norm     = normalizeAppName(seg.app);
            const leftPos  = (seg.start_pos / 60) * 100;
            const width    = Math.max(((seg.end_pos - seg.start_pos) / 60) * 100, 1);
            return `<div class="gantt-row">
                <div class="gantt-row-label">${norm}</div>
                <div class="gantt-row-timeline">
                    <div class="gantt-bar-segment" style="left:${leftPos}%;width:${width}%;background:${stringToColor(norm)}"
                         title="${formatSec(seg.sec)}"></div>
                </div>
            </div>`;
        }).join('');
        blockItem.innerHTML = `
            <div class="hourly-block-header"><div class="hourly-block-title">${block.hour_range}</div></div>
            <div class="gantt-chart">${appsHtml}</div>`;
        listEl.appendChild(blockItem);
    });
}

function renderDayLogList(listEl, data, dateStr) {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!data || data.length === 0) {
        listEl.innerHTML = '<p class="empty-msg">データがありません</p>';
        return;
    }
    const header = document.createElement('div');
    header.className = 'day-log-date';
    header.innerText = formatDateJa(dateStr);
    listEl.appendChild(header);
    data.forEach(seg => {
        const row = document.createElement('div');
        row.className = 'day-log-row';
        const normApp = normalizeAppName(seg.app);
        const showRaw = normApp !== seg.app;
        row.innerHTML = `
            <span class="day-log-time">${seg.start} - ${seg.end}</span>
            <span class="day-log-app">
                ${normApp}
                ${showRaw ? `<span class="day-log-raw-app" title="${seg.app}"> (${seg.app})</span>` : ''}
            </span>
            <span class="day-log-dur">${formatSec(seg.sec)}</span>`;
        listEl.appendChild(row);
    });
}

function renderDriftPatterns(data) {
    const el = document.getElementById('history-drift-list');
    if (!el) return;
    el.innerHTML = '';
    const patterns = data.patterns || [];
    if (patterns.length === 0) {
        el.innerHTML = '<p class="empty-msg">パターンがありません</p>';
        return;
    }
    patterns.forEach(p => {
        const steps = p.steps.map(s => `<div class="drift-step">${s}</div>`).join('<div class="drift-arrow">↓</div>');
        const item = document.createElement('div');
        item.className = 'drift-pattern-item drift-pattern-3';
        item.innerHTML = `
            <div class="drift-pattern-flow">${steps}</div>
            <div class="drift-count">${p.count}回</div>`;
        el.appendChild(item);
    });
}

function renderCompareCards(data) {
    const el = document.getElementById('history-compare-cards');
    if (!el) return;
    el.innerHTML = '';
    (data.metrics || []).forEach(m => {
        const diff    = m.diff;
        const sign    = diff > 0 ? '+' : '';
        const cls     = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';
        const valFmt  = m.key === 'switches' ? `${m.value}回`   : formatSec(m.value);
        const avgFmt  = m.key === 'switches' ? `${m.average}回` : formatSec(m.average);
        const diffFmt = m.key === 'switches' ? `${sign}${diff}回` : `${sign}${formatSec(Math.abs(diff))}`;
        const card    = document.createElement('div');
        card.className = 'compare-card';
        card.innerHTML = `
            <div class="compare-label">${m.label}</div>
            <div class="compare-row">
                <div><span class="compare-sub">選択日は？</span><strong>${valFmt}</strong></div>
                <div><span class="compare-sub">平均は？</span><strong>${avgFmt}</strong></div>
            </div>
            <div class="compare-result ${cls}">結果 ${diffFmt}</div>`;
        el.appendChild(card);
    });
}

// ============================================================
// Day detail loader
// ============================================================

function loadDayDetail(date, ids) {
    const q = `?date=${date}`;
    fetchApi(`/api/timeline${q}`).then(r => r.json()).then(data => {
        renderFullGantt(document.getElementById(ids.timeline), data);
        if (ids.logList) renderDayLogList(document.getElementById(ids.logList), data, date);
    });
    if (ids.transitions) {
        fetchApi(`/api/transitions${q}`).then(r => r.json()).then(data => {
            renderTransitionsList(document.getElementById(ids.transitions), data);
        });
    }
    if (ids.timeAnalysis) {
        fetchApi(`/api/time-analysis${q}`).then(r => r.json()).then(data => {
            renderTimeAnalysisList(document.getElementById(ids.timeAnalysis), data);
        });
    }
}

// ============================================================
// Today View
// ============================================================

function loadToday() {
    loadDayDetail(todayStr(), {
        timeline:     'today-timeline-viz',
        transitions:  'today-transitions-list',
        timeAnalysis: 'today-time-analysis-list',
    });
}

// Behavior Replay
let replayInterval = null;
let replayIndex    = 0;
let replayData     = [];

function setupReplay(btnId, containerId, date) {
    const btn = document.getElementById(btnId);
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
        if (replayInterval) {
            clearInterval(replayInterval);
            replayInterval = null;
            btn.innerText = '▶ 再生';
            return;
        }
        const q = date ? `?date=${date}` : '';
        fetchApi(`/api/timeline${q}`).then(r => r.json()).then(data => {
            replayData  = data;
            replayIndex = 0;
            const container = document.getElementById(containerId);
            container.innerHTML = '';
            btn.innerText = '⏹ 停止';
            replayInterval = setInterval(() => {
                if (replayIndex >= replayData.length) {
                    clearInterval(replayInterval);
                    replayInterval = null;
                    btn.innerText = '▶ 再生';
                    return;
                }
                const item = replayData[replayIndex];
                const el = document.createElement('div');
                el.className = 'replay-item';
                el.innerHTML = `<div class="replay-time">${item.start}</div>
                    <div class="replay-arrow">↓</div>
                    <div class="replay-app">${normalizeAppName(item.app)}</div>`;
                container.appendChild(el);
                container.scrollTop = container.scrollHeight;
                replayIndex++;
            }, 1000);
        });
    });
}
setupReplay('today-replay-btn', 'today-replay-container', todayStr());

// ============================================================
// History View
// ============================================================

let historyCalYear     = new Date().getFullYear();
let historyCalMonth    = new Date().getMonth() + 1;
let historySelectedDate = todayStr();

function loadCalendar() {
    fetchApi(`/api/dates?year=${historyCalYear}&month=${historyCalMonth}`)
        .then(r => r.json())
        .then(data => {
            document.getElementById('cal-title').innerText = `${data.year}年${data.month}月`;
            const grid = document.getElementById('calendar-grid');
            grid.innerHTML = '';
            data.weeks.forEach(week => {
                week.forEach(day => {
                    const cell = document.createElement('button');
                    cell.type = 'button';
                    cell.className = 'cal-day';
                    if (!day) {
                        cell.className += ' cal-empty';
                        cell.disabled = true;
                        grid.appendChild(cell);
                        return;
                    }
                    cell.innerText = day.day;
                    if (day.has_data)  cell.classList.add('has-data');
                    if (!day.has_data) cell.classList.add('no-data');
                    if (day.date === historySelectedDate) cell.classList.add('selected');
                    cell.addEventListener('click', () => {
                        historySelectedDate = day.date;
                        setHistoryDatePick(null);
                        loadHistoryDay();
                        loadCalendar();
                    });
                    grid.appendChild(cell);
                });
            });
        });
}

function setHistoryDatePick(pick) {
    document.querySelectorAll('.date-pick-btn').forEach(b => b.classList.remove('active'));
    if (pick === 'today') {
        historySelectedDate = todayStr();
        document.querySelector('[data-pick="today"]').classList.add('active');
        document.getElementById('history-selected-label').innerText = '選択中: 今日';
    } else if (pick === 'yesterday') {
        historySelectedDate = offsetDateStr(-1);
        document.querySelector('[data-pick="yesterday"]').classList.add('active');
        document.getElementById('history-selected-label').innerText = '選択中: 昨日';
    } else if (pick === 'custom') {
        const custom = document.getElementById('history-custom-date');
        custom.classList.add('active');
        historySelectedDate = custom.value || todayStr();
        document.getElementById('history-selected-label').innerText = `選択中: ${historySelectedDate}`;
    } else if (pick) {
        document.querySelector(`[data-pick="${pick}"]`)?.classList.add('active');
        document.getElementById('history-selected-label').innerText =
            pick === 'last7' ? '比較期間: 過去7日（日付はカレンダーで選択）' : '比較期間: 過去30日（日付はカレンダーで選択）';
    } else {
        document.getElementById('history-selected-label').innerText = `選択中: ${historySelectedDate}`;
    }
}

function loadHistoryDay() {
    const date = historySelectedDate;
    document.getElementById('history-day-flow-title').innerText    = `その日の流れ (${formatDateJa(date)})`;
    document.getElementById('history-day-flow-subtitle').innerText = date;
    loadDayDetail(date, {
        timeline:     'history-timeline-viz',
        logList:      'history-day-log-list',
        transitions:  null,
        timeAnalysis: 'history-time-analysis-list',
    });
    fetchApi(`/api/history/compare?date=${date}`).then(r => r.json()).then(renderCompareCards);
}

function loadHistoryDrift(period) {
    fetchApi(`/api/history/drift-patterns?period=${period}`).then(r => r.json()).then(renderDriftPatterns);
}

function loadHistory() {
    historySelectedDate = historySelectedDate || todayStr();
    loadCalendar();
    loadHistoryDay();
    loadHistoryDrift('7days');
}

// Calendar navigation
document.getElementById('cal-prev')?.addEventListener('click', () => {
    historyCalMonth -= 1;
    if (historyCalMonth < 1) { historyCalMonth = 12; historyCalYear -= 1; }
    loadCalendar();
});
document.getElementById('cal-next')?.addEventListener('click', () => {
    historyCalMonth += 1;
    if (historyCalMonth > 12) { historyCalMonth = 1; historyCalYear += 1; }
    loadCalendar();
});

// Date pick buttons
document.querySelectorAll('.date-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const pick = btn.dataset.pick;
        setHistoryDatePick(pick);
        if (pick === 'today' || pick === 'yesterday') loadHistoryDay();
        if (pick === 'last7')  loadHistoryDrift('7days');
        if (pick === 'last30') loadHistoryDrift('30days');
    });
});

// Custom date input
const customDateInput = document.getElementById('history-custom-date');
if (customDateInput) customDateInput.value = todayStr();
document.getElementById('history-custom-date')?.addEventListener('change', (e) => {
    historySelectedDate = e.target.value;
    setHistoryDatePick('custom');
    loadHistoryDay();
    loadCalendar();
});

// Drift period buttons
document.querySelectorAll('.drift-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.drift-period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadHistoryDrift(btn.dataset.period);
    });
});

loadStaticManifest();
