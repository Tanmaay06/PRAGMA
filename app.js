// ============================================================
// PRAGMA Main Application Router & Controller
// Reference Spec Alignment Implementation
// ============================================================

let activeScreen = 'overview';
let currentSiteView = 'map';
let charts = {};
let selectedQueueId = null;
let overrideTargetId = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCommandPalette();
  initClassifyForm();
  renderScreen(activeScreen);

  // Listen for state changes to refresh UI
  window.addEventListener('pragma:state-changed', () => {
    updateBadgeCounts();
    renderScreen(activeScreen);
  });

  updateBadgeCounts();
});

// --- NAVIGATION & ROUTING ---
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const screen = item.dataset.screen;
      if (screen) {
        navigateTo(screen);
      }
    });
  });
}

function navigateTo(screenId) {
  activeScreen = screenId;

  // Update sidebar active item
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.screen === screenId);
  });

  // Toggle screens
  document.querySelectorAll('.screen-view').forEach(s => {
    s.classList.toggle('active', s.id === `screen-${screenId}`);
  });

  // Render current screen
  renderScreen(screenId);
}

function updateBadgeCounts() {
  const store = window.PRAGMA_STORE.getStore();
  const pendingCount = store.reports.filter(r => r.status === 'PENDING').length;
  const badgeEl = document.getElementById('queue-badge');
  if (badgeEl) {
    badgeEl.textContent = pendingCount;
    badgeEl.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }
}

// --- SCREEN RENDERERS ---
function renderScreen(screenId) {
  switch (screenId) {
    case 'overview': renderOverviewScreen(); break;
    case 'classify': /* handled dynamically */ break;
    case 'queue': renderQueueScreen(); break;
    case 'sitemap': renderSitemapScreen(); break;
    case 'lsr': renderLSRScreen(); break;
    case 'trends': renderTrendsScreen(); break;
    case 'health': renderHealthScreen(); break;
    case 'settings': break;
  }
}

// 4.1 OVERVIEW SCREEN
function renderOverviewScreen() {
  const store = window.PRAGMA_STORE.getStore();
  const siteStats = window.PRAGMA_STORE.getSiteStats();
  const totalReports = store.reports.length + store.sites.reduce((acc, s) => acc + s.totalReports, 0);
  const sifCount = store.reports.filter(r => r.sifDecision === 'YES').length + store.sites.reduce((acc, s) => acc + s.sifCount, 0);
  const pendingCount = store.reports.filter(r => r.status === 'PENDING').length;

  document.getElementById('kpi-total').textContent = totalReports.toLocaleString();
  document.getElementById('kpi-sif').textContent = sifCount.toLocaleString();
  document.getElementById('kpi-pending').textContent = pendingCount;

  // Top Risk Sites Table (Section 4.1 Layout)
  const sitesContainer = document.getElementById('overview-sites-table');
  if (sitesContainer) {
    sitesContainer.innerHTML = siteStats.slice(0, 5).map(s => `
      <tr>
        <td style="font-weight:600">${s.name}</td>
        <td class="numeric">${s.totalReports}</td>
        <td class="numeric" style="color:var(--accent-orange);font-weight:600">${s.sifCount}</td>
        <td class="numeric" style="color:${s.sifRateNum > 0.35 ? 'var(--accent-orange)' : 'var(--accent-cyan)'};font-weight:700">${s.sifRate}%</td>
      </tr>
    `).join('');
  }

  // Recent Activity Feed
  const activityContainer = document.getElementById('overview-activity-list');
  if (activityContainer) {
    activityContainer.innerHTML = store.reports.slice(0, 6).map(r => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-2) var(--sp-3);background:var(--bg-base);border:1px solid var(--border-hairline);border-radius:var(--radius-sm)">
        <div>
          <div style="display:flex;align-items:center;gap:var(--sp-2)">
            <span class="${r.sifDecision === 'YES' ? 'badge-sif' : r.sifDecision === 'AMBIGUOUS' ? 'badge-ambiguous' : 'badge-safe'}">${r.sifDecision === 'YES' ? 'SIF' : r.sifDecision === 'AMBIGUOUS' ? 'AMB' : 'SAFE'}</span>
            <span class="mono" style="font-weight:600;color:var(--text-primary)">${r.id}</span>
            <span style="font-size:var(--fs-xs);color:var(--text-secondary)">${r.site}</span>
          </div>
        </div>
        <div class="mono timestamp" style="font-size:var(--fs-xs);color:var(--text-tertiary)">
          ${new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
        </div>
      </div>
    `).join('');
  }
}

// 4.2 CLASSIFY REPORT SCREEN
function initClassifyForm() {
  const select = document.getElementById('sample-report-select');
  const textarea = document.getElementById('report-input-text');
  const analyzeBtn = document.getElementById('analyze-btn');
  const routeBtn = document.getElementById('route-queue-btn');

  if (!select) return;

  select.innerHTML = '<option value="">— Select a pre-loaded sample report —</option>' +
    window.PRAGMA_STORE.SAMPLE_REPORTS.map((s, idx) => `<option value="${idx}">${s.label}</option>`).join('');

  select.addEventListener('change', (e) => {
    const idx = e.target.value;
    if (idx !== '') {
      textarea.value = window.PRAGMA_STORE.SAMPLE_REPORTS[idx].text;
    }
  });

  analyzeBtn.addEventListener('click', async () => {
    const text = textarea.value.trim();
    if (!text) return alert('Please enter report text to analyze.');

    analyzeBtn.disabled = true;
    document.getElementById('classify-result-card').style.display = 'none';

    const progressEl = document.getElementById('classify-progress');
    progressEl.style.display = 'block';

    const steps = ['Preprocessing text narrative...', 'Ontology match: Energy sources...', 'Ontology match: Barrier states...', 'Layer assessment & evidence extraction...'];
    for (let i = 0; i < steps.length; i++) {
      document.getElementById('classify-step-text').textContent = steps[i];
      await new Promise(r => setTimeout(r, 220));
    }

    progressEl.style.display = 'none';
    analyzeBtn.disabled = false;

    const result = window.PRAGMA_ENGINE.analyzeReport(text);
    renderClassifyResult(result, text);
  });

  if (routeBtn) {
    routeBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      const result = window.PRAGMA_ENGINE.analyzeReport(text);

      const added = window.PRAGMA_STORE.addReport({
        site: 'Duliajan Well Pad Area',
        text: text,
        analysis: result
      });

      alert(`Report ${added.id} routed to Human Reviewer Queue!`);
      textarea.value = '';
      select.value = '';
      document.getElementById('classify-result-card').style.display = 'none';
      navigateTo('queue');
    });
  }
}

function renderClassifyResult(result, text) {
  const card = document.getElementById('classify-result-card');
  card.style.display = 'block';

  const badge = document.getElementById('res-verdict-badge');
  badge.textContent = result.decisionLabel;
  badge.className = result.sifDecision === 'YES' ? 'badge-sif' : result.sifDecision === 'AMBIGUOUS' ? 'badge-ambiguous' : 'badge-safe';

  const pct = Math.round(result.confidence * 100);
  document.getElementById('res-confidence').textContent = (result.confidence).toFixed(2);
  const fill = document.getElementById('res-confidence-fill');
  fill.style.width = `${pct}%`;
  fill.style.background = result.sifDecision === 'YES' ? 'var(--accent-orange)' : 'var(--accent-cyan)';

  document.getElementById('res-energy').textContent = result.energyLabel;
  document.getElementById('res-barrier').textContent = result.barrierLabel;

  const lsrContainer = document.getElementById('res-lsr-chips');
  lsrContainer.innerHTML = result.lsrMatched.length > 0
    ? result.lsrMatched.map(l => `<span class="chip lsr">${l}</span>`).join('')
    : '<span style="color:var(--text-tertiary);font-size:var(--fs-xs)">No LSR rule matched</span>';

  document.getElementById('res-evidence-text').innerHTML = result.highlightedText;
  document.getElementById('res-action-text').textContent = result.action;
}

// 4.3 REVIEWER QUEUE SCREEN
function renderQueueScreen() {
  const store = window.PRAGMA_STORE.getStore();
  const railContainer = document.getElementById('queue-rail-items');
  const detailPane = document.getElementById('queue-detail-pane');
  if (!railContainer || !detailPane) return;

  const reports = store.reports;
  if (reports.length === 0) {
    railContainer.innerHTML = '<div style="padding:var(--sp-4);color:var(--text-tertiary);font-size:var(--fs-xs)">No reports pending review.</div>';
    detailPane.innerHTML = '<div style="text-align:center;color:var(--text-tertiary);margin-top:100px">No report selected.</div>';
    return;
  }

  if (!selectedQueueId || !reports.find(r => r.id === selectedQueueId)) {
    selectedQueueId = reports[0].id;
  }

  // Render Left Rail Rows (Section 4.3 Reference)
  railContainer.innerHTML = reports.map(r => `
    <div class="queue-row" onclick="selectQueueReport('${r.id}')" style="padding:var(--sp-3);border-bottom:1px solid var(--border-hairline-soft);cursor:pointer;border-left:3px solid ${r.id === selectedQueueId ? 'var(--accent-orange)' : 'transparent'};background:${r.id === selectedQueueId ? 'var(--bg-surface-raised)' : 'transparent'}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-1)">
        <span class="mono" style="font-weight:600;color:var(--text-primary);font-size:var(--fs-sm)">${r.id}</span>
        <span class="${r.sifDecision === 'YES' ? 'badge-sif' : r.sifDecision === 'AMBIGUOUS' ? 'badge-ambiguous' : 'badge-safe'}" style="font-size:10px">${r.sifDecision === 'YES' ? 'SIF' : r.sifDecision === 'AMBIGUOUS' ? 'AMB' : 'SAFE'}</span>
      </div>
      <div class="confidence" style="margin-bottom:var(--sp-1)">
        <span class="confidence-value mono" style="font-size:11px">${r.confidence.toFixed(2)}</span>
        <span class="confidence-track" style="width:40px;height:3px"><span class="confidence-fill" style="width:${Math.round(r.confidence * 100)}%;background:${r.sifDecision === 'YES' ? 'var(--accent-orange)' : 'var(--accent-cyan)'}"></span></span>
      </div>
      <div class="mono timestamp" style="font-size:10px;color:var(--text-tertiary)">${new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
    </div>
  `).join('');

  // Render Right Detail Pane
  renderQueueDetail(selectedQueueId);
}

function selectQueueReport(id) {
  selectedQueueId = id;
  renderQueueScreen();
}

function renderQueueDetail(id) {
  const store = window.PRAGMA_STORE.getStore();
  const detailPane = document.getElementById('queue-detail-pane');
  const r = store.reports.find(rep => rep.id === id);

  if (!r || !detailPane) return;

  const pct = Math.round(r.confidence * 100);

  detailPane.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--border-hairline);padding-bottom:var(--sp-3)">
      <div>
        <div style="display:flex;align-items:center;gap:var(--sp-3)">
          <h2 class="heading" style="font-size:var(--fs-lg)">${r.id}</h2>
          <span class="${r.sifDecision === 'YES' ? 'badge-sif' : r.sifDecision === 'AMBIGUOUS' ? 'badge-ambiguous' : 'badge-safe'}">${r.decisionLabel}</span>
        </div>
        <div style="font-size:var(--fs-xs);color:var(--text-secondary);margin-top:var(--sp-1)">Site: <strong>${r.site}</strong> | Layer: ${r.layer}</div>
      </div>

      <div class="confidence">
        <span class="confidence-value mono">${r.confidence.toFixed(2)}</span>
        <span class="confidence-track"><span class="confidence-fill" style="width:${pct}%;background:${r.sifDecision === 'YES' ? 'var(--accent-orange)' : 'var(--accent-cyan)'}"></span></span>
      </div>
    </div>

    <div>
      <span class="kpi-label" style="display:block;margin-bottom:var(--sp-1)">Triggered IOGP Life-Saving Rules</span>
      <div style="display:flex;gap:var(--sp-1)">
        ${r.lsrMatched.length > 0 ? r.lsrMatched.map(l => `<span class="chip lsr">${l}</span>`).join('') : '<span style="color:var(--text-tertiary);font-size:var(--fs-xs)">None</span>'}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
      <div style="background:var(--bg-base);padding:var(--sp-2) var(--sp-3);border:1px solid var(--border-hairline);border-radius:var(--radius-sm)">
        <span class="kpi-label" style="display:block;font-size:10px">Energy Source</span>
        <span class="mono" style="font-weight:600;color:var(--text-primary)">${r.energyLabel}</span>
      </div>
      <div style="background:var(--bg-base);padding:var(--sp-2) var(--sp-3);border:1px solid var(--border-hairline);border-radius:var(--radius-sm)">
        <span class="kpi-label" style="display:block;font-size:10px">Barrier Failure Mode</span>
        <span class="mono" style="font-weight:600;color:var(--text-primary)">${r.barrierLabel}</span>
      </div>
    </div>

    <div>
      <span class="kpi-label" style="display:block;margin-bottom:var(--sp-1)">Verbatim Evidence Narrative</span>
      <p class="report-text">${r.highlightedText}</p>
    </div>

    <div class="action-row" style="display:flex;gap:var(--sp-2)">
      <button class="btn-accept" onclick="handleQueueAction('${r.id}', 'ACCEPTED')">Accept</button>
      <button class="btn-override" onclick="openOverrideModal('${r.id}')">Override</button>
      <button class="btn-escalate" onclick="handleQueueAction('${r.id}', 'ESCALATED', 'Escalated to Corporate HSE Steering Committee')">Escalate</button>
    </div>

    <div>
      <span class="kpi-label" style="display:block;margin-bottom:var(--sp-1)">Audit Trail Log</span>
      <div class="audit-trail mono" style="background:var(--bg-base);border:1px solid var(--border-hairline);padding:var(--sp-3);border-radius:var(--radius-sm);font-size:11px">
        ${r.auditLog.map(a => `<div>[${new Date(a.timestamp).toISOString().split('T')[0]}] ${a.user} - ${a.action}: ${a.note}</div>`).join('')}
      </div>
    </div>
  `;
}

function handleQueueAction(id, action, note = '') {
  window.PRAGMA_STORE.updateReportStatus(id, action, note);
  renderQueueScreen();
}

function openOverrideModal(id) {
  overrideTargetId = id;
  document.getElementById('override-modal').classList.add('open');
}

function closeOverrideModal() {
  overrideTargetId = null;
  document.getElementById('override-modal').classList.remove('open');
}

function submitOverride() {
  const reason = document.getElementById('override-reason-text').value.trim();
  if (!reason) return alert('Please enter override justification.');

  if (overrideTargetId) {
    window.PRAGMA_STORE.updateReportStatus(overrideTargetId, 'OVERRIDDEN', `Overridden by HSE Officer: ${reason}`);
    closeOverrideModal();
    renderQueueScreen();
  }
}

// 4.4 SITE RISK MAP SCREEN
function toggleSiteView(view) {
  currentSiteView = view;
  document.getElementById('btn-view-map').classList.toggle('active', view === 'map');
  document.getElementById('btn-view-table').classList.toggle('active', view === 'table');
  document.getElementById('site-map-view').style.display = view === 'map' ? 'block' : 'none';
  document.getElementById('site-table-view').style.display = view === 'table' ? 'block' : 'none';
}

function renderSitemapScreen() {
  const siteStats = window.PRAGMA_STORE.getSiteStats();
  const mapContainer = document.getElementById('site-map-view');
  const tbody = document.getElementById('sitemap-table-body');

  // Render Bubble Field (Map View Layout 4.4)
  if (mapContainer) {
    const bubblePositions = [
      { top: '25%', left: '22%' },
      { top: '35%', left: '55%' },
      { top: '65%', left: '30%' },
      { top: '15%', left: '72%' },
      { top: '70%', left: '70%' },
      { top: '48%', left: '15%' },
      { top: '80%', left: '48%' },
      { top: '40%', left: '82%' },
      { top: '60%', left: '88%' }
    ];

    mapContainer.innerHTML = siteStats.map((s, idx) => {
      const pos = bubblePositions[idx % bubblePositions.length];
      const size = Math.max(54, Math.min(100, s.totalReports / 2.2));
      const bg = s.sifRateNum > 0.35 ? '#F2662B' : s.sifRateNum > 0.22 ? '#E6A23C' : '#4FA8C9';
      return `
        <div class="site-bubble" style="top:${pos.top};left:${pos.left};width:${size}px;height:${size}px;background:${bg}">
          <span>${s.name.split(' ')[0]}</span>
          <span style="font-size:10px;opacity:0.9">${s.sifRate}%</span>
        </div>
      `;
    }).join('');
  }

  // Render Table View
  if (tbody) {
    tbody.innerHTML = siteStats.map((s, idx) => `
      <tr>
        <td class="numeric mono">#${idx + 1}</td>
        <td style="font-weight:600">${s.name}</td>
        <td>${s.location}</td>
        <td class="numeric">${s.totalReports}</td>
        <td class="numeric" style="color:var(--accent-orange);font-weight:600">${s.sifCount}</td>
        <td class="numeric" style="font-weight:700;color:${s.sifRateNum > 0.35 ? 'var(--accent-orange)' : 'var(--accent-cyan)'}">${s.sifRate}%</td>
        <td><span class="${s.sifRateNum > 0.35 ? 'badge-sif' : 'badge-safe'}">${s.riskLevel}</span></td>
      </tr>
    `).join('');
  }
}

// 4.5 LSR ANALYTICS SCREEN
function renderLSRScreen() {
  if (charts.lsr) charts.lsr.destroy();
  if (charts.barrier) charts.barrier.destroy();

  const lsrCtx = document.getElementById('chart-lsr-bar');
  if (lsrCtx) {
    charts.lsr = new Chart(lsrCtx, {
      type: 'bar',
      data: {
        labels: ['Energy Isolation', 'Hot Work', 'Confined Space', 'Line of Fire', 'Working at Height', 'Safe Mech. Lifting', 'Work Authorisation', 'Bypassing Controls', 'Driving'],
        datasets: [
          { label: 'SIF-Potential', data: [52, 67, 38, 44, 71, 35, 58, 41, 29], backgroundColor: '#F2662B' },
          { label: 'Non-SIF', data: [23, 18, 14, 31, 19, 22, 17, 12, 38], backgroundColor: '#1E3A45' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: { stacked: true, grid: { color: '#1A2740' }, ticks: { color: '#8792A8', font: { family: 'JetBrains Mono' } } },
          y: { stacked: true, grid: { color: '#1A2740' }, ticks: { color: '#8792A8', font: { family: 'Inter', size: 11 } } }
        },
        plugins: { legend: { labels: { color: '#E8ECF2', font: { family: 'Inter' } } } }
      }
    });
  }

  const barrierCtx = document.getElementById('chart-barrier-donut');
  if (barrierCtx) {
    charts.barrier = new Chart(barrierCtx, {
      type: 'doughnut',
      data: {
        labels: ['Absent', 'Bypassed', 'Ineffective', 'Not Complied With'],
        datasets: [{ data: [38, 27, 21, 14], backgroundColor: ['#F2662B', '#E6A23C', '#4FA8C9', '#17233D'] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#E8ECF2', font: { family: 'Inter' } } } }
      }
    });
  }
}

// 4.6 TRENDS & PATTERNS SCREEN
function renderTrendsScreen() {
  if (charts.trend) charts.trend.destroy();

  const trendCtx = document.getElementById('chart-trend-line');
  if (trendCtx) {
    charts.trend = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'],
        datasets: [
          { label: 'Duliajan Cluster', data: [22, 24, 25, 21, 28, 26, 30, 29, 42, 31, 33, 35], borderColor: '#F2662B', borderWidth: 2 },
          { label: 'Moran Cluster', data: [31, 29, 34, 38, 32, 35, 33, 48, 36, 37, 39, 41], borderColor: '#E6A23C', borderWidth: 2 },
          { label: 'Naharkatiya Cluster', data: [18, 19, 21, 20, 22, 25, 24, 23, 26, 28, 38, 30], borderColor: '#4FA8C9', borderWidth: 2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: '#1A2740' }, ticks: { color: '#8792A8', font: { family: 'JetBrains Mono' } } },
          y: { grid: { color: '#1A2740' }, ticks: { color: '#8792A8', font: { family: 'JetBrains Mono' } } }
        },
        plugins: { legend: { labels: { color: '#E8ECF2', font: { family: 'Inter' } } } }
      }
    });
  }
}

// 4.7 MODEL HEALTH SCREEN
function renderHealthScreen() {
  if (charts.perf) charts.perf.destroy();

  const perfCtx = document.getElementById('chart-model-perf');
  if (perfCtx) {
    charts.perf = new Chart(perfCtx, {
      type: 'line',
      data: {
        labels: ['v0.3-synthetic', 'v0.4-synthetic', 'v0.5-pilot', 'v1.0-release', 'v1.4-current'],
        datasets: [
          { label: 'Precision', data: [0.71, 0.75, 0.79, 0.83, 0.86], borderColor: '#4FA8C9', borderWidth: 2 },
          { label: 'Recall', data: [0.64, 0.69, 0.74, 0.78, 0.81], borderColor: '#1E3A45', borderWidth: 2 },
          { label: 'F2 Score', data: [0.65, 0.70, 0.75, 0.79, 0.82], borderColor: '#F2662B', borderWidth: 2 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: '#1A2740' }, ticks: { color: '#8792A8', font: { family: 'JetBrains Mono' } } },
          y: { min: 0.5, max: 1.0, grid: { color: '#1A2740' }, ticks: { color: '#8792A8', font: { family: 'JetBrains Mono' } } }
        },
        plugins: { legend: { labels: { color: '#E8ECF2', font: { family: 'Inter' } } } }
      }
    });
  }
}

// CMD+K COMMAND PALETTE
function initCommandPalette() {
  const modal = document.getElementById('cmd-modal');
  const input = document.getElementById('cmd-input');
  const resultsContainer = document.getElementById('cmd-results');

  const commands = [
    { title: 'Overview Dashboard', screen: 'overview', category: 'Navigation' },
    { title: 'Classify Safety Report', screen: 'classify', category: 'Tool' },
    { title: 'Reviewer Queue', screen: 'queue', category: 'Triage' },
    { title: 'Site Risk Map & Bubble Grid', screen: 'sitemap', category: 'Analytics' },
    { title: 'IOGP Life-Saving Rules Analytics', screen: 'lsr', category: 'Analytics' },
    { title: 'Trends & Pattern Clustering', screen: 'trends', category: 'Analytics' },
    { title: 'Model Health & Retraining Tracker', screen: 'health', category: 'System' },
    { title: 'System Info & Architecture', screen: 'settings', category: 'System' },
    { title: 'Reset Session State to Default Seed', action: () => { window.PRAGMA_STORE.resetStore(); alert('Session state reset!'); }, category: 'Admin' }
  ];

  function openPalette() {
    modal.classList.add('open');
    input.value = '';
    renderResults(commands);
    input.focus();
  }

  function closePalette() {
    modal.classList.remove('open');
  }

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      modal.classList.contains('open') ? closePalette() : openPalette();
    }
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closePalette();
    }
  });

  const trigger = document.getElementById('cmd-trigger-btn');
  if (trigger) trigger.addEventListener('click', openPalette);

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase();
    const filtered = commands.filter(c => c.title.toLowerCase().includes(query) || c.category.toLowerCase().includes(query));
    renderResults(filtered);
  });

  function renderResults(list) {
    resultsContainer.innerHTML = list.map(c => `
      <div class="cmd-row" onclick="executeCmd('${c.screen || ''}')">
        <div><strong>${c.title}</strong></div>
        <span class="chip">${c.category}</span>
      </div>
    `).join('');
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePalette();
  });
}

function executeCmd(screenId) {
  document.getElementById('cmd-modal').classList.remove('open');
  if (screenId) navigateTo(screenId);
}
