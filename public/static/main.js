// Utilities
function fetchApi(path) {
    const useStatic = document.documentElement.dataset.useStaticApi === 'true';
    if (!useStatic) return fetch(path);

    if (path.startsWith('/api/trends')) {
        const period = new URLSearchParams(path.split('?')[1] || '').get('period') || 'today';
        return fetch(`/data/trends-${period}.json`);
    }
    const name = path.replace(/^\/api\//, '');
    return fetch(`/data/${name}.json`);
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

/**
 * アプリ名を人間が読みやすい短い名前に正規化する。
 * 例: "Cursor.exe [action - Cursor]" → "Cursor"
 * 元の名前はツールチップで確認できる。
 */
function normalizeAppName(raw) {
    if (!raw) return '不明';

    const lower = raw.toLowerCase();

    // Extract exe base name (before first space or bracket)
    const exeMatch = raw.match(/^([^\s\[]+\.exe)/i);
    const exeName = exeMatch ? exeMatch[1].toLowerCase() : '';

    // --- Cursor ---
    if (exeName === 'cursor.exe' || lower.includes('cursor')) return 'Cursor';
    // --- YouTube (check before Edge) ---
    if (lower.includes('youtube')) return 'YouTube';
    // --- Edge ---
    if (exeName === 'msedge.exe' || lower.includes('msedge')) return 'Edge';
    // --- Chrome ---
    if (exeName === 'chrome.exe' || lower.includes('chrome')) {
        if (lower.includes('youtube')) return 'YouTube';
        return 'Chrome';
    }
    // --- Firefox ---
    if (exeName === 'firefox.exe') return 'Firefox';
    // --- VS Code ---
    if (exeName === 'code.exe' || lower.includes('vs code') || lower.includes('vscode')) return 'VS Code';
    // --- ChatGPT ---
    if (exeName === 'chatgpt.exe' || lower.includes('chatgpt')) return 'ChatGPT';
    // --- Slack ---
    if (exeName === 'slack.exe' || lower.includes('slack')) return 'Slack';
    // --- Discord ---
    if (exeName === 'discord.exe' || lower.includes('discord')) return 'Discord';
    // --- Zoom ---
    if (exeName === 'zoom.exe' || lower.includes('zoom')) return 'Zoom';
    // --- Teams ---
    if (exeName === 'teams.exe' || lower.includes('teams')) return 'Teams';
    // --- Notion ---
    if (exeName === 'notion.exe' || lower.includes('notion')) return 'Notion';
    // --- Figma ---
    if (exeName === 'figma.exe' || lower.includes('figma')) return 'Figma';
    // --- Antigravity ---
    if (exeName === 'antigravity.exe' || lower.includes('antigravity')) return 'Antigravity';
    // --- Explorer / File Manager ---
    if (exeName === 'explorer.exe') return 'エクスプローラー';
    // --- Shell / Start Menu / Taskbar ---
    if (exeName === 'shellexperiencehost.exe' || exeName === 'startmenuexperiencehost.exe') return 'Windowsシェル';
    // --- Spotify ---
    if (exeName === 'spotify.exe' || lower.includes('spotify')) return 'Spotify';
    // --- Terminal / PowerShell ---
    if (exeName === 'windowsterminal.exe' || exeName === 'pwsh.exe' || exeName === 'powershell.exe') return 'ターミナル';
    if (exeName === 'cmd.exe') return 'コマンドプロンプト';
    // --- Unknown / uiWinMgr / system processes ---
    if (raw.toLowerCase() === 'unknown' || raw === '') return '不明';
    if (exeName === 'uiwinmgr.exe') return 'システム通知';
    if (exeName === 'lockapp.exe') return 'ロック画面';
    if (exeName === 'searchhost.exe' || exeName === 'searchapp.exe') return '検索';

    // Fallback: strip ".exe [...]" → just the exe base without extension
    if (exeName) {
        return exeName.replace('.exe', '');
    }
    // Last resort: strip bracketed part
    return raw.replace(/\s*\[.*?\]/g, '').trim() || '不明';
}

// Navigation Logic
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        const viewId = item.getAttribute('data-view');
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewId}`).classList.add('active');

        if (viewId === 'app') loadTransitions();
    });
});

// Real-time loop
setInterval(() => {
    fetchApi('/api/current')
        .then(r => r.json())
        .then(data => {
            // Live tracking section
            document.getElementById('live-app-name').innerText = data.app || '-';
            document.getElementById('live-duration').innerText = formatSec(data.duration);
            document.getElementById('live-duration-context').innerText = formatSec(data.duration);
            document.getElementById('live-previous').innerText = data.previous_app || '-';
            document.getElementById('live-today-count').innerText = data.today_count || 0;
            document.getElementById('live-avg-duration').innerText = formatSec(data.avg_duration);

            // Update session progress circle
            const sessionPercent = Math.min(Math.round((data.duration / 3600) * 100), 100);
            document.getElementById('session-percent').innerText = sessionPercent + '%';
            const progressRing = document.querySelector('.progress-ring');
            if (progressRing) {
                progressRing.setAttribute('stroke-dasharray', `${sessionPercent}, 100`);
            }
        });
}, 1000);

// Load Home (Summary & Timeline)
function loadHome() {
    // Load current hour timeline
    const currentHour = new Date().getHours();
    document.getElementById('current-hour-title').innerText = '現在の時間帯';
    document.getElementById('current-hour-range').innerText = `${currentHour}:00 ───────────── ${currentHour + 1}:00`;

    const previousHour = currentHour - 1;
    document.getElementById('previous-hour-title').innerText = '前の時間帯';
    document.getElementById('previous-hour-range').innerText = `${previousHour}:00 ───────────── ${currentHour}:00`;

    fetchApi('/api/timeline')
        .then(r => r.json())
        .then(data => {
            // Filter data for current hour
            const currentHourData = data.filter(item => {
                const hour = parseInt(item.start.split(":")[0]);
                return hour === currentHour;
            });

            // Filter data for previous hour
            const previousHourData = data.filter(item => {
                const hour = parseInt(item.start.split(":")[0]);
                return hour === previousHour;
            });

            // Render current hour timeline
            renderHourTimeline('current-hour-viz', currentHourData);

            // Render previous hour timeline
            renderHourTimeline('previous-hour-viz', previousHourData);
        });

    // Load recent transitions
    fetchApi('/api/transitions')
        .then(r => r.json())
        .then(data => {
            const recentList = document.getElementById('recent-transitions-list');
            recentList.innerHTML = '';

            data.transitions.slice(0, 5).forEach(t => {
                const parts = t.transition.split(' → ');
                if (parts.length === 2) {
                    const item = document.createElement('div');
                    item.className = 'drift-pattern-item';
                    item.innerHTML = `
                        <div class="drift-pattern-flow">
                            <div class="drift-step">${parts[0]}</div>
                            <div class="drift-arrow">↓</div>
                            <div class="drift-step">${parts[1]}</div>
                        </div>
                        <div class="drift-count">${t.count}回</div>
                    `;
                    recentList.appendChild(item);
                }
            });
        });

}

// Load Transitions and App usage
function loadTransitions() {
    // Load full timeline for details view — Gantt Chart
    fetchApi('/api/timeline')
        .then(r => r.json())
        .then(data => {
            const viz = document.getElementById('full-timeline-viz');
            if (!viz) return;
            viz.innerHTML = '';

            if (data.length === 0) {
                viz.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">データがありません</p>';
                return;
            }

            // Determine overall time range (minutes since midnight)
            function timeToMin(t) {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            }

            const allStarts = data.map(d => timeToMin(d.start));
            const allEnds = data.map(d => timeToMin(d.end));
            const minTime = Math.min(...allStarts);
            const maxTime = Math.max(...allEnds);
            const totalMin = maxTime - minTime || 1;

            // Collect unique normalized apps (ordered by first appearance)
            const appOrder = [];
            data.forEach(d => {
                const norm = normalizeAppName(d.app);
                if (!appOrder.includes(norm)) appOrder.push(norm);
            });

            // Build Gantt wrapper
            const gantt = document.createElement('div');
            gantt.className = 'gantt-full';

            // --- Time axis header ---
            const axisWrap = document.createElement('div');
            axisWrap.className = 'gantt-axis-wrap';

            const axisLabel = document.createElement('div');
            axisLabel.className = 'gantt-label-col';
            axisWrap.appendChild(axisLabel);

            const axisTicks = document.createElement('div');
            axisTicks.className = 'gantt-timeline-col';

            // Generate hour ticks
            const startHour = Math.floor(minTime / 60);
            const endHour = Math.ceil(maxTime / 60);
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

            // --- Rows per normalized app ---
            appOrder.forEach(normApp => {
                const row = document.createElement('div');
                row.className = 'gantt-full-row';

                // Label (normalized name)
                const label = document.createElement('div');
                label.className = 'gantt-full-label';
                label.innerText = normApp;
                label.title = normApp;
                row.appendChild(label);

                // Track
                const track = document.createElement('div');
                track.className = 'gantt-full-track';

                data.filter(d => normalizeAppName(d.app) === normApp).forEach(seg => {
                    const startMin = timeToMin(seg.start);
                    const endMin = timeToMin(seg.end);
                    const leftPct = ((startMin - minTime) / totalMin) * 100;
                    const widthPct = Math.max(((endMin - startMin) / totalMin) * 100, 0.3);

                    const bar = document.createElement('div');
                    bar.className = 'gantt-full-bar';
                    bar.style.left = leftPct + '%';
                    bar.style.width = widthPct + '%';
                    bar.style.background = stringToColor(normApp);

                    // Tooltip: show normalized name + original
                    bar.addEventListener('mouseenter', (e) => showGanttTooltip(e, seg, normApp));
                    bar.addEventListener('mousemove', moveGanttTooltip);
                    bar.addEventListener('mouseleave', hideGanttTooltip);

                    track.appendChild(bar);
                });

                // Grid lines behind bars
                for (let h = startHour; h <= endHour; h++) {
                    const tickMin = h * 60;
                    const leftPct = Math.max(0, ((tickMin - minTime) / totalMin)) * 100;
                    const grid = document.createElement('div');
                    grid.className = 'gantt-grid-line';
                    grid.style.left = leftPct + '%';
                    track.appendChild(grid);
                }

                row.appendChild(track);
                gantt.appendChild(row);
            });

            viz.appendChild(gantt);

            // Legend
            const legend = document.createElement('div');
            legend.className = 'gantt-legend';
            appOrder.forEach(normApp => {
                const item = document.createElement('div');
                item.className = 'gantt-legend-item';
                item.innerHTML = `<span class="gantt-legend-dot" style="background:${stringToColor(normApp)}"></span>${normApp}`;
                legend.appendChild(item);
            });
            viz.appendChild(legend);
        });

    // Load recent transitions
    fetchApi('/api/transitions')
        .then(r => r.json())
        .then(data => {
            const recentList = document.getElementById('recent-transitions-list');
            if (!recentList) return;
            recentList.innerHTML = '';

            data.transitions.slice(0, 5).forEach(t => {
                const parts = t.transition.split(' → ');
                if (parts.length === 2) {
                    const item = document.createElement('div');
                    item.className = 'drift-pattern-item';
                    item.innerHTML = `
                        <div class="drift-pattern-flow">
                            <div class="drift-step">${parts[0]}</div>
                            <div class="drift-arrow">↓</div>
                            <div class="drift-step">${parts[1]}</div>
                        </div>
                        <div class="drift-count">${t.count}回</div>
                    `;
                    recentList.appendChild(item);
                }
            });
        });

    // Load time analysis
    fetchApi('/api/time-analysis')
        .then(r => r.json())
        .then(data => {
            const timeAnalysisList = document.getElementById('time-analysis-list');
            if (!timeAnalysisList) return;
            timeAnalysisList.innerHTML = '';

            if (data.hourly_blocks.length === 0) {
                timeAnalysisList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">データがありません</p>';
                return;
            }

            data.hourly_blocks.forEach(block => {
                const blockItem = document.createElement('div');
                blockItem.className = 'hourly-block-item';

                // Generate color for each app
                const appColors = {};
                block.segments.forEach((seg, index) => {
                    if (!appColors[seg.app]) {
                        appColors[seg.app] = generateColor(index);
                    }
                });

                // Create gantt chart with separate rows for each app
                const appsHtml = Object.keys(appColors).map(app => {
                    const color = appColors[app];
                    const appSegments = block.segments.filter(seg => seg.app === app);

                    const segmentsHtml = appSegments.map(seg => {
                        const leftPos = (seg.start_pos / 60) * 100;
                        const width = ((seg.end_pos - seg.start_pos) / 60) * 100;
                        return `
                            <div class="gantt-bar-segment" 
                                 style="left: ${leftPos}%; width: ${width}%; background: ${color};"
                                 title="${formatSec(seg.sec)}">
                            </div>
                        `;
                    }).join('');

                    return `
                        <div class="gantt-row">
                            <div class="gantt-row-label">${app}</div>
                            <div class="gantt-row-timeline">
                                ${segmentsHtml}
                            </div>
                        </div>
                    `;
                }).join('');

                blockItem.innerHTML = `
                    <div class="hourly-block-header">
                        <div class="hourly-block-title">${block.hour_range}</div>
                    </div>
                    <div class="gantt-chart">
                        ${appsHtml}
                    </div>
                `;
                timeAnalysisList.appendChild(blockItem);
            });
        });

    // Load app history
    fetchApi('/api/app-history')
        .then(r => r.json())
        .then(data => {
            const appHistoryList = document.getElementById('app-history-list');
            if (!appHistoryList) return;
            appHistoryList.innerHTML = '';

            if (data.history.length === 0) {
                appHistoryList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">データがありません</p>';
                return;
            }

            data.history.slice(0, 10).forEach(app => {
                const appItem = document.createElement('div');
                appItem.className = 'app-history-item';
                appItem.style.cursor = 'pointer';

                const datesHtml = app.dates.map(date => `
                    <div class="app-history-date">
                        <div class="app-history-date-header">
                            <div class="app-history-date-title">${date.date}</div>
                            <div class="app-history-date-stats">
                                <span>総時間: ${formatSec(date.total_time)}</span>
                                <span>セッション: ${date.session_count}回</span>
                            </div>
                        </div>
                    </div>
                `).join('');

                appItem.innerHTML = `
                    <div class="app-history-header">
                        <div class="app-history-name">${app.app}</div>
                        <div class="app-history-expand">▼</div>
                    </div>
                    <div class="app-history-dates" style="display: none;">
                        ${datesHtml}
                    </div>
                `;

                // Toggle details on click
                appItem.addEventListener('click', () => {
                    const datesDiv = appItem.querySelector('.app-history-dates');
                    const expandDiv = appItem.querySelector('.app-history-expand');
                    if (datesDiv.style.display === 'none') {
                        datesDiv.style.display = 'block';
                        expandDiv.innerText = '▲';
                    } else {
                        datesDiv.style.display = 'none';
                        expandDiv.innerText = '▼';
                    }
                });

                appHistoryList.appendChild(appItem);
            });
        });
}

// Initialize
loadHome();
setInterval(loadHome, 10000); // refresh timeline every 10 sec

// Load habits
function loadHabits() {
    fetchApi('/api/habits')
        .then(r => r.json())
        .then(data => {
            const habitsList = document.getElementById('habits-list');
            habitsList.innerHTML = '';

            if (data.habits.length === 0) {
                habitsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">まだ癖は発見されていません</p>';
                return;
            }

            data.habits.forEach(habit => {
                const habitItem = document.createElement('div');
                habitItem.className = 'habit-item';
                habitItem.innerHTML = `
                    <div class="habit-icon">${habit.icon}</div>
                    <div class="habit-content">
                        <div class="habit-title">${habit.title}</div>
                        <div class="habit-description">${habit.description}</div>
                    </div>
                `;
                habitsList.appendChild(habitItem);
            });
        });
}

// Load habits on page load
loadHabits();

// Load trends
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

            // Create trend chart
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
                    <div class="trend-stats">
                        <span>スイッチ: ${trend.switch_count}回</span>
                    </div>
                    <div class="trend-apps">
                        ${topAppsHtml}
                    </div>
                `;
                trendChart.appendChild(trendItem);
            });

            trendsContent.appendChild(trendChart);
        });
}

// Trend period button handlers
document.querySelectorAll('.trend-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.trend-period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const period = btn.dataset.period;
        loadTrends(period);
    });
});

// Load trends on page load
loadTrends();

// Render hour timeline — Gantt style
function renderHourTimeline(containerId, data) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">データがありません</p>';
        return;
    }

    function timeToMinInHour(t) {
        // returns minutes within the hour (0-60)
        return parseInt(t.split(':')[1]);
    }
    function timeToMin(t) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    // Determine the full minute range covered by this hour's data
    const allStarts = data.map(d => timeToMin(d.start));
    const allEnds = data.map(d => timeToMin(d.end));
    const minTime = Math.min(...allStarts);
    const maxTime = Math.max(...allEnds);
    const totalMin = maxTime - minTime || 1;

    // Unique normalized apps
    const appOrder = [];
    data.forEach(d => {
        const norm = normalizeAppName(d.app);
        if (!appOrder.includes(norm)) appOrder.push(norm);
    });

    const gantt = document.createElement('div');
    gantt.className = 'gantt-full';

    // --- Axis ---
    const axisWrap = document.createElement('div');
    axisWrap.className = 'gantt-axis-wrap';
    const axisLabel = document.createElement('div');
    axisLabel.className = 'gantt-label-col';
    axisWrap.appendChild(axisLabel);
    const axisTicks = document.createElement('div');
    axisTicks.className = 'gantt-timeline-col';

    // Tick every 10 minutes
    const startHour = Math.floor(minTime / 60);
    const endHour = Math.ceil(maxTime / 60);
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

    // --- Rows (grouped by normalized name) ---
    appOrder.forEach(normApp => {
        const row = document.createElement('div');
        row.className = 'gantt-full-row';

        const label = document.createElement('div');
        label.className = 'gantt-full-label';
        label.innerText = normApp;
        label.title = normApp;
        row.appendChild(label);

        const track = document.createElement('div');
        track.className = 'gantt-full-track';

        data.filter(d => normalizeAppName(d.app) === normApp).forEach(seg => {
            const startMin = timeToMin(seg.start);
            const endMin = timeToMin(seg.end);
            const leftPct = ((startMin - minTime) / totalMin) * 100;
            const widthPct = Math.max(((endMin - startMin) / totalMin) * 100, 0.5);

            const bar = document.createElement('div');
            bar.className = 'gantt-full-bar';
            bar.style.left = leftPct + '%';
            bar.style.width = widthPct + '%';
            bar.style.background = stringToColor(normApp);
            bar.addEventListener('mouseenter', (e) => showGanttTooltip(e, seg, normApp));
            bar.addEventListener('mousemove', moveGanttTooltip);
            bar.addEventListener('mouseleave', hideGanttTooltip);
            track.appendChild(bar);
        });

        // Grid lines
        for (let h = startHour; h <= endHour; h++) {
            for (let m = 0; m < 60; m += 10) {
                const tickMin = h * 60 + m;
                if (tickMin < minTime || tickMin > maxTime) continue;
                const leftPct = ((tickMin - minTime) / totalMin) * 100;
                const grid = document.createElement('div');
                grid.className = 'gantt-grid-line';
                grid.style.left = leftPct + '%';
                track.appendChild(grid);
            }
        }

        row.appendChild(track);
        gantt.appendChild(row);
    });

    container.appendChild(gantt);
}

// View Details Button
document.getElementById('view-details-btn').addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('[data-view="app"]').classList.add('active');
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById('view-app').classList.add('active');
    loadTransitions();
});

// Gantt Tooltip
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
    tip.style.top = (e.clientY - 12) + 'px';
}

function hideGanttTooltip() {
    const tip = getOrCreateTooltip();
    tip.style.display = 'none';
}

// Behavior Replay
let replayInterval = null;
let replayIndex = 0;
let replayData = [];

document.getElementById('replay-btn').addEventListener('click', () => {
    const btn = document.getElementById('replay-btn');
    if (replayInterval) {
        // Stop replay
        clearInterval(replayInterval);
        replayInterval = null;
        btn.innerText = '▶ 再生';
    } else {
        // Start replay
        fetchApi('/api/timeline')
            .then(r => r.json())
            .then(data => {
                replayData = data;
                replayIndex = 0;
                const container = document.getElementById('replay-container');
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
                    const replayItem = document.createElement('div');
                    replayItem.className = 'replay-item';
                    replayItem.innerHTML = `
                        <div class="replay-time">${item.start}</div>
                        <div class="replay-arrow">↓</div>
                        <div class="replay-app">${item.app}</div>
                    `;
                    container.appendChild(replayItem);
                    container.scrollTop = container.scrollHeight;
                    replayIndex++;
                }, 1000); // 1 second per item
            });
    }
});
