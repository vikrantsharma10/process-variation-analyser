// ui.js — region builder, form handling, results renderer, loading state

let regionCount = 2;
const MAX_REGIONS = 4;

// ─── REGION BUILDER ───────────────────────────────────────────────

function createRegionCol(index) {
  const col = document.createElement('div');
  col.className = 'region-col';
  col.dataset.region = index;
  const label = index === 1 ? 'e.g. UAE' : index === 2 ? 'e.g. UK' : index === 3 ? 'e.g. India' : 'e.g. Singapore';
  col.innerHTML = `
    <div class="region-header">
      <input class="region-name-input" type="text" placeholder="${label}" data-region="${index}">
      ${index > 2 ? `<button class="remove-region" onclick="removeRegion(${index})">×</button>` : ''}
    </div>
    <div class="steps-header">
      <span>STEP DESCRIPTION</span><span>TAT</span>
    </div>
    <div class="step-rows" data-region="${index}">
      ${stepRowHTML(index, 1)}
      ${stepRowHTML(index, 2)}
      ${stepRowHTML(index, 3)}
    </div>
    <button class="add-step-btn" onclick="addStep(${index})">+ ADD ANOTHER STEP</button>
    <div class="region-footer">
      <label class="hc-label">ESTIMATED HEADCOUNT INVOLVED IN THIS PROCESS</label>
      <select class="hc-select" data-region="${index}">
        <option value="1-5">1–5 people</option>
        <option value="6-15">6–15 people</option>
        <option value="16-50">16–50 people</option>
        <option value="51-100">51–100 people</option>
        <option value="100+">100+ people</option>
      </select>
    </div>
  `;
  return col;
}

function stepRowHTML(regionIndex, stepIndex) {
  return `<div class="step-row-input" data-step="${stepIndex}">
    <input type="text" placeholder="e.g. Client submits KYC documents" data-region="${regionIndex}" data-step="${stepIndex}" data-field="desc">
    <input type="text" placeholder="e.g. 2 days" data-region="${regionIndex}" data-step="${stepIndex}" data-field="tat">
  </div>`;
}

function initRegions() {
  const grid = document.getElementById('regions-grid');
  grid.innerHTML = '';
  grid.className = 'regions-grid';
  for (let i = 1; i <= regionCount; i++) {
    grid.appendChild(createRegionCol(i));
  }
  updateGridCols();
  updateAddBtn();
}

function updateGridCols() {
  const grid = document.getElementById('regions-grid');
  grid.className = 'regions-grid' + (regionCount >= 3 ? ` cols-${regionCount}` : '');
}

function updateAddBtn() {
  const btn = document.getElementById('add-region-btn');
  const label = document.getElementById('region-count-label');
  btn.disabled = regionCount >= MAX_REGIONS;
  label.textContent = `${regionCount} OF ${MAX_REGIONS} REGIONS ADDED`;
}

function addRegion() {
  if (regionCount >= MAX_REGIONS) return;
  regionCount++;
  const grid = document.getElementById('regions-grid');
  grid.appendChild(createRegionCol(regionCount));
  updateGridCols();
  updateAddBtn();
}

function removeRegion(index) {
  const grid = document.getElementById('regions-grid');
  const col = grid.querySelector(`[data-region="${index}"]`);
  if (col) col.remove();
  regionCount--;
  updateGridCols();
  updateAddBtn();
}

function addStep(regionIndex) {
  const container = document.querySelector(`.step-rows[data-region="${regionIndex}"]`);
  const existing = container.querySelectorAll('.step-row-input').length;
  container.insertAdjacentHTML('beforeend', stepRowHTML(regionIndex, existing + 1));
}

// ─── FORM DATA ────────────────────────────────────────────────────

function getRegionData() {
  const regions = [];
  document.querySelectorAll('.region-col').forEach(col => {
    const rIndex = col.dataset.region;
    const name = col.querySelector('.region-name-input').value.trim() || `Region ${rIndex}`;
    const steps = [];
    col.querySelectorAll('.step-row-input').forEach(row => {
      const desc = row.querySelector('[data-field="desc"]').value.trim();
      const tat = row.querySelector('[data-field="tat"]').value.trim();
      if (desc) steps.push({ desc, tat: tat || 'N/A' });
    });
    const headcount = col.querySelector('.hc-select').value;
    regions.push({ name, steps, headcount });
  });
  return regions.filter(r => r.steps.length > 0);
}

// ─── DIAGNOSIS RUNNER ─────────────────────────────────────────────

async function runDiagnosis() {
  const processName = document.getElementById('process-name').value.trim();
  const audience = document.getElementById('audience-select').value;
  const regions = getRegionData();

  if (!processName) { alert('Please enter a process name.'); return; }
  if (!audience) { alert('Please select your role.'); return; }
  if (regions.length < 2) { alert('Please enter steps for at least 2 regions.'); return; }

  showLoading();

  try {
    const result = await runEngine(processName, audience, regions);
    hideLoading();
    renderResults(processName, regions, result);
  } catch (e) {
    hideLoading();
    alert('Something went wrong running the diagnosis. Please try again.');
    console.error(e);
  }
}

// ─── LOADING STATE ────────────────────────────────────────────────

function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.add('active');
  const stages = overlay.querySelectorAll('.stage-item');
  stages.forEach(s => s.className = 'stage-item');
  let i = 0;
  const interval = setInterval(() => {
    if (i < stages.length) {
      if (i > 0) stages[i - 1].className = 'stage-item done';
      stages[i].className = 'stage-item active';
      i++;
    } else {
      clearInterval(interval);
    }
  }, 380);
  overlay._interval = interval;
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay._interval) clearInterval(overlay._interval);
  overlay.classList.remove('active');
}

// ─── RESULTS RENDERER ─────────────────────────────────────────────

function renderResults(processName, regions, result) {
  document.getElementById('results-title').textContent = processName;
  document.getElementById('results-process-label').textContent =
    `${regions.length} REGIONS ANALYSED · REFERENCE MARKET: ${result.referenceMarket?.toUpperCase()} · OUTLIER: ${result.outlierMarket?.toUpperCase()}`;

  // Market cards
  const cardsEl = document.getElementById('market-cards');
  cardsEl.innerHTML = '';
  (result.marketSummary || []).forEach(m => {
    const card = document.createElement('div');
    card.className = 'market-card' + (m.isReference ? ' reference' : '') + (m.isOutlier ? ' outlier' : '');
    let badge = '';
    if (m.isReference) badge = '<div class="market-card-badge badge-ref">REFERENCE MARKET</div>';
    if (m.isOutlier) badge = '<div class="market-card-badge badge-out">OUTLIER MARKET</div>';
    card.innerHTML = `
      <div class="market-card-name">${m.name.toUpperCase()}</div>
      ${badge}
      <div class="market-stat"><div class="market-stat-label">STEPS</div><div class="market-stat-val">${m.stepCount}</div></div>
      <div class="market-stat"><div class="market-stat-label">EST. TAT</div><div class="market-stat-val">${m.estimatedTAT}</div></div>
      <div class="market-stat"><div class="market-stat-label">LEGACY STEPS</div><div class="market-stat-val">${m.legacySteps}</div></div>
      <div class="market-stat"><div class="market-stat-label">CAGE LEGITIMACY</div><div class="market-stat-val">${m.cageLegitimacyRatio}</div></div>
    `;
    cardsEl.appendChild(card);
  });

  // Binding constraint
  document.getElementById('constraint-text').textContent = result.bindingConstraint || '';

  // Divergence map
  const thead = document.getElementById('divergence-thead');
  const tbody = document.getElementById('divergence-tbody');
  const regionNames = (result.marketSummary || []).map(m => m.name);
  thead.innerHTML = '<tr><th>STEP</th>' + regionNames.map(n => `<th>${n.toUpperCase()}</th>`).join('') + '</tr>';
  tbody.innerHTML = '';
  (result.divergenceMap || []).forEach(step => {
    const tr = document.createElement('tr');
    let cells = `<td style="color:var(--text-primary);font-size:13px;">${step.stepName}</td>`;
    regionNames.forEach(rn => {
      const rv = step.regionVerdicts?.[rn] || step.regionVerdicts?.[rn.toLowerCase()] || {};
      const verdict = rv.verdict || '—';
      const cause = rv.rootCause || '';
      const cls = verdict === 'Standardise' ? 'v-std' : verdict === 'Modify' ? 'v-mod' : verdict === 'Keep Local' ? 'v-loc' : '';
      cells += `<td><span class="verdict-badge ${cls}">${verdict}</span><br><span style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);letter-spacing:0.1em;">${cause}</span></td>`;
    });
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  });

  // Priority actions
  const paEl = document.getElementById('priority-actions');
  paEl.innerHTML = '';
  (result.priorityActions || []).forEach(a => {
    const div = document.createElement('div');
    div.className = 'p-action';
    const vClass = a.verdict === 'Standardise' ? 'v-std' : a.verdict === 'Modify' ? 'v-mod' : 'v-loc';
    div.innerHTML = `
      <div class="p-badge">${a.priority}</div>
      <div class="p-content">
        <div class="p-title">${a.title} <span class="verdict-badge ${vClass}" style="font-size:8px;margin-left:6px;">${a.verdict || ''}</span></div>
        <div class="p-rationale">${a.rationale}</div>
      </div>`;
    paEl.appendChild(div);
  });

  // Secondary actions
  const saEl = document.getElementById('secondary-actions');
  saEl.innerHTML = '';
  (result.secondaryActions || []).forEach(a => {
    const div = document.createElement('div');
    div.className = 'p-action';
    div.innerHTML = `<div class="p-content"><div class="p-title">${a.title}</div><div class="p-rationale">${a.rationale}</div></div>`;
    saEl.appendChild(div);
  });

  // Analysis bullet lists
  document.getElementById('process-owner-list').innerHTML =
    (result.processOwnerAnalysis || []).map(b => `<li>${b}</li>`).join('');
  document.getElementById('exec-list').innerHTML =
    (result.execAnalysis || []).map(b => `<li>${b}</li>`).join('');

  // Show results
  const resultsEl = document.getElementById('results-section');
  resultsEl.classList.add('visible');
  resultsEl.scrollIntoView({ behavior: 'smooth' });
}

// ─── COPY + RESET ─────────────────────────────────────────────────

function copyOutput(type) {
  const listId = type === 'process-owner' ? 'process-owner-list' : 'exec-list';
  const label = type === 'process-owner' ? 'PROCESS OWNER DIAGNOSIS' : 'EXECUTIVE LEADERSHIP DIAGNOSIS';
  const processName = document.getElementById('results-title').textContent;
  const items = [...document.querySelectorAll(`#${listId} li`)].map(li => `— ${li.textContent}`).join('\n');
  const text = `${label}\n${processName}\n\n${items}\n\nBuilt by Vikrant Sharma — https://www.linkedin.com/in/vikrantsharma10/`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'COPIED ✓';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'COPY AS TEXT ↗'; btn.classList.remove('copied'); }, 2000);
  });
}

function resetForm() {
  document.getElementById('results-section').classList.remove('visible');
  document.getElementById('input-anchor').scrollIntoView({ behavior: 'smooth' });
}

// ─── INIT ─────────────────────────────────────────────────────────
initRegions();
