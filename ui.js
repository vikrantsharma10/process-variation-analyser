// ui.js — region builder, form handling, results renderer

let regionCount = 2;
const MAX_REGIONS = 4;

// REGION BUILDER

function createRegionCol(index) {
  const col = document.createElement('div');
  col.className = 'region-col';
  col.dataset.region = index;
  const label = index === 1 ? 'e.g. UAE' : index === 2 ? 'e.g. UK' : index === 3 ? 'e.g. India' : 'e.g. Singapore';
  col.innerHTML = `
    <div class="region-header">
      <input class="region-name-input" type="text" placeholder="${label}" data-region="${index}">
      ${index > 2 ? `<button class="remove-region" onclick="removeRegion(${index})">x</button>` : ''}
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
        <option value="1-5">1-5 people</option>
        <option value="6-15">6-15 people</option>
        <option value="16-50">16-50 people</option>
        <option value="51-100">51-100 people</option>
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

// FORM DATA

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

// DIAGNOSIS RUNNER

async function runDiagnosis() {
  const processName = document.getElementById('process-name').value.trim();
  const context = document.getElementById('process-context').value.trim();
  const audience = document.getElementById('audience-select').value;
  const regions = getRegionData();

  if (!processName) { alert('Please enter a process name.'); return; }
  if (!audience) { alert('Please select your role.'); return; }
  if (regions.length < 2) { alert('Please enter steps for at least 2 regions.'); return; }

  showLoading();

  try {
    const resultText = await runEngine(processName, context, audience, regions);
    hideLoading();
    renderResults(processName, resultText);
  } catch (e) {
    hideLoading();
    alert('Something went wrong running the diagnosis. Please try again.');
    console.error(e);
  }
}

// LOADING STATE

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
  }, 500);
  overlay._interval = interval;
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay._interval) clearInterval(overlay._interval);
  overlay.classList.remove('active');
}

// RESULTS RENDERER — plain text

function renderResults(processName, text) {
  document.getElementById('results-title').textContent = processName;

  // Split into the two output sections
  const poMarker = 'PROCESS OWNER DIAGNOSIS';
  const execMarker = 'EXECUTIVE LEADERSHIP DIAGNOSIS';

  let poText = '';
  let execText = '';

  const poIdx = text.indexOf(poMarker);
  const execIdx = text.indexOf(execMarker);

  if (poIdx !== -1 && execIdx !== -1) {
    if (poIdx < execIdx) {
      poText = text.slice(poIdx, execIdx).trim();
      execText = text.slice(execIdx).trim();
    } else {
      execText = text.slice(execIdx, poIdx).trim();
      poText = text.slice(poIdx).trim();
    }
  } else {
    poText = text;
    execText = '';
  }

  document.getElementById('process-owner-output').textContent = poText;
  document.getElementById('exec-output').textContent = execText;

  const resultsEl = document.getElementById('results-section');
  resultsEl.classList.add('visible');
  resultsEl.scrollIntoView({ behavior: 'smooth' });
}

// COPY

function copyOutput(type) {
  const elId = type === 'process-owner' ? 'process-owner-output' : 'exec-output';
  const processName = document.getElementById('results-title').textContent;
  const content = document.getElementById(elId).textContent;
  const text = `${content}\n\nBuilt by Vikrant Sharma - https://www.linkedin.com/in/vikrantsharma10/`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'COPIED';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'COPY AS TEXT'; btn.classList.remove('copied'); }, 2000);
  });
}

function resetForm() {
  document.getElementById('results-section').classList.remove('visible');
  document.getElementById('input-anchor').scrollIntoView({ behavior: 'smooth' });
}

// INIT
initRegions();
