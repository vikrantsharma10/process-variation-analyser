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
    const result = await runEngine(processName, context, audience, regions);
    hideLoading();
    renderResults(processName, result);
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

// MARKDOWN PARSER — strips symbols, styles headings and tables

function parseMarkdown(text) {
  const lines = text.split('\n');
  let html = '';
  let inTable = false;
  let tableRows = [];
  let inCodeBlock = false;

  function flushTable() {
    if (tableRows.length === 0) return;

    // First row = header, second row = separator (skip), rest = body
    const headerCells = tableRows[0];
    const bodyRows = tableRows.slice(2);

    let tableHTML = '<div class="output-table-wrap"><table class="output-table"><thead><tr>';
    headerCells.forEach(cell => {
      tableHTML += `<th>${cell}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    bodyRows.forEach(row => {
      tableHTML += '<tr>';
      row.forEach(cell => {
        tableHTML += `<td>${cell}</td>`;
      });
      tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table></div>';
    html += tableHTML;
    tableRows = [];
    inTable = false;
  }

  function parseCells(line) {
    return line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(c => c.trim());
  }

  function isSeparator(cells) {
    return cells.every(c => /^[-:]+$/.test(c));
  }

  function styleInline(str) {
    // Remove bold/italic markers, keep plain text
    return str
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  lines.forEach(line => {
    // Code blocks — render as-is
    if (line.startsWith('```')) {
      if (inTable) flushTable();
      if (inCodeBlock) {
        html += '</pre>';
        inCodeBlock = false;
      } else {
        html += '<pre class="output-code">';
        inCodeBlock = true;
      }
      return;
    }
    if (inCodeBlock) {
      html += escapeHTML(line) + '\n';
      return;
    }

    // Table rows
    if (line.startsWith('|')) {
      const cells = parseCells(line);
      if (isSeparator(cells)) {
        tableRows.push(cells); // keep separator so we can skip it
      } else {
        tableRows.push(cells);
      }
      inTable = true;
      return;
    } else if (inTable) {
      flushTable();
    }

    // Headings — strip #, apply colour class
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);

    if (h1) {
      html += `<h1 class="output-h1">${styleInline(h1[1])}</h1>`;
      return;
    }
    if (h2) {
      html += `<h2 class="output-h2">${styleInline(h2[1])}</h2>`;
      return;
    }
    if (h3) {
      html += `<h3 class="output-h3">${styleInline(h3[1])}</h3>`;
      return;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      html += '<hr class="output-hr">';
      return;
    }

    // Bullet points
    const bullet = line.match(/^[\*\-]\s+(.*)/);
    if (bullet) {
      html += `<div class="output-bullet">· ${styleInline(bullet[1])}</div>`;
      return;
    }

    // Numbered list
    const numbered = line.match(/^(\d+)\.\s+(.*)/);
    if (numbered) {
      html += `<div class="output-numbered"><span class="output-num">${numbered[1]}.</span> ${styleInline(numbered[2])}</div>`;
      return;
    }

    // Empty line
    if (line.trim() === '') {
      html += '<div class="output-spacer"></div>';
      return;
    }

    // Plain paragraph
    html += `<p class="output-p">${styleInline(line)}</p>`;
  });

  if (inTable) flushTable();
  if (inCodeBlock) html += '</pre>';

  return html;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// RESULTS RENDERER

function renderResults(processName, result) {
  document.getElementById('results-title').textContent = processName;

  const poText = result.processOwnerText || '';
  const execText = result.execText || '';

  const poEl = document.getElementById('process-owner-output');
  const execEl = document.getElementById('exec-output');

  poEl.innerHTML = parseMarkdown(poText) + buildFooter();
  execEl.innerHTML = parseMarkdown(execText) + buildFooter();

  const resultsEl = document.getElementById('results-section');
  resultsEl.classList.add('visible');
  resultsEl.scrollIntoView({ behavior: 'smooth' });
}

function buildFooter() {
  return `<div class="output-footer-credit">Built by <a href="https://www.linkedin.com/in/vikrantsharma10/" target="_blank" rel="noopener">Vikrant Sharma</a></div>`;
}

// COPY — top-right button in each box

function copyOutput(type) {
  const elId = type === 'process-owner' ? 'process-owner-output' : 'exec-output';
  const content = document.getElementById(elId).innerText;
  const text = `${content}\n\nBuilt by Vikrant Sharma - https://www.linkedin.com/in/vikrantsharma10/`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector(`[data-copy="${type}"]`);
    if (btn) {
      btn.textContent = 'COPIED';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'COPY'; btn.classList.remove('copied'); }, 2000);
    }
  });
}

function resetForm() {
  document.getElementById('results-section').classList.remove('visible');
  document.getElementById('input-anchor').scrollIntoView({ behavior: 'smooth' });
}

// INIT
initRegions();
