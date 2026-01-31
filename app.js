const LEVEL_BASE_XP = 30;
const XP_PER_LEVEL = 6;
const MAX_LEVEL = 6;

const costTables = {
  stat: [0, 0, 3, 6, 9, 12, 15],
  perk: [0, 1, 2, 4, 6, 8, 10],
};

const levelInput = document.getElementById('level-input');
const xpInput = document.getElementById('xp-input');
const xpSync = document.getElementById('xp-sync');
const resetBtn = document.getElementById('reset-btn');
const resetAllocBtn = document.getElementById('reset-alloc-btn');

const totals = {
  available: document.getElementById('xp-available'),
  stats: document.getElementById('xp-stats'),
  perks: document.getElementById('xp-perks'),
  remaining: document.getElementById('xp-remaining'),
  remainingCard: document.getElementById('xp-remaining-card'),
};

const perksList = document.getElementById('perks-list');
const addPerkBtn = document.getElementById('add-perk');

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function costToLevel(kind, level) {
  if (level <= 0) return 0;
  const table = kind === 'stat' ? costTables.stat : costTables.perk;
  return table[level] ?? table[table.length - 1];
}

function costBetween(kind, base, current) {
  let sum = 0;
  for (let lvl = base + 1; lvl <= current; lvl += 1) {
    sum += costToLevel(kind, lvl);
  }
  return sum;
}

function getRowKind(row) {
  return row.dataset.kind;
}

function getRowBase(row) {
  const input = row.querySelector('.base-input');
  const kind = getRowKind(row);
  const min = kind === 'stat' ? 1 : 0;
  const raw = Number(input.value);
  const value = clamp(raw, min, MAX_LEVEL);
  input.value = value;
  return value;
}

function getRowCurrent(row) {
  return clamp(Number(row.dataset.current), 0, MAX_LEVEL);
}

function setRowCurrent(row, value) {
  const current = clamp(value, 0, MAX_LEVEL);
  row.dataset.current = String(current);
  const currentEl = row.querySelector('[data-role="current"]');
  if (currentEl) {
    currentEl.textContent = String(current);
  }
}

function updateRowCost(row) {
  const base = getRowBase(row);
  const current = Math.max(getRowCurrent(row), base);
  setRowCurrent(row, current);
  const cost = costBetween(getRowKind(row), base, current);
  const costEl = row.querySelector('[data-role="cost"]');
  if (costEl) costEl.textContent = String(cost);
  return cost;
}

function getXP() {
  return clamp(Number(xpInput.value), 0, 9999);
}

function computeTotals() {
  let statsSpent = 0;
  let perksSpent = 0;

  document.querySelectorAll('.row[data-kind]').forEach((row) => {
    const kind = getRowKind(row);
    const cost = updateRowCost(row);
    if (kind === 'stat') statsSpent += cost;
    if (kind === 'perk') perksSpent += cost;
  });

  const available = getXP();
  const totalSpent = statsSpent + perksSpent;
  const remaining = available - totalSpent;

  totals.available.textContent = String(available);
  totals.stats.textContent = String(statsSpent);
  totals.perks.textContent = String(perksSpent);
  totals.remaining.textContent = String(remaining);
  totals.remainingCard.classList.toggle('metric--alert', remaining < 0);

  return { available, remaining };
}

function updateButtons(remaining) {
  document.querySelectorAll('.row[data-kind]').forEach((row) => {
    const base = getRowBase(row);
    const current = getRowCurrent(row);
    const kind = getRowKind(row);
    const decBtn = row.querySelector('[data-action="dec"]');
    const incBtn = row.querySelector('[data-action="inc"]');
    if (decBtn) decBtn.disabled = current <= base;
    if (incBtn) {
      const nextCost = costToLevel(kind, current + 1);
      incBtn.disabled = current >= MAX_LEVEL || remaining < nextCost;
    }
  });
}

function updateAll() {
  const totalsNow = computeTotals();
  updateButtons(totalsNow.remaining);
}

function syncXPFromLevel() {
  const level = clamp(Number(levelInput.value), 1, 99);
  levelInput.value = String(level);
  if (xpSync.checked) {
    xpInput.value = String(LEVEL_BASE_XP + level * XP_PER_LEVEL);
    xpInput.disabled = true;
  } else {
    xpInput.disabled = false;
  }
}

function handleStepClick(button) {
  const row = button.closest('.row[data-kind]');
  if (!row) return;
  const action = button.dataset.action;
  const base = getRowBase(row);
  const current = getRowCurrent(row);
  const kind = getRowKind(row);

  if (action === 'dec' && current > base) {
    setRowCurrent(row, current - 1);
    updateAll();
    return;
  }

  if (action === 'inc' && current < MAX_LEVEL) {
    const { remaining } = computeTotals();
    const nextCost = costToLevel(kind, current + 1);
    if (remaining >= nextCost) {
      setRowCurrent(row, current + 1);
      updateAll();
    }
  }
}

function handleBaseChange(input) {
  const row = input.closest('.row[data-kind]');
  if (!row) return;
  const base = getRowBase(row);
  const current = getRowCurrent(row);
  if (current < base) {
    setRowCurrent(row, base);
  }
  updateAll();
}

function createDynamicRow(kind) {
  const row = document.createElement('div');
  row.className = 'row';
  row.dataset.kind = kind;
  row.dataset.current = '0';

  const label = 'Название';

  row.innerHTML = `
    <div class="cell">
      <input class="name-input" type="text" placeholder="${label}" />
    </div>
    <div class="cell">
      <select class="type-select">
        <option value="trait">Черта</option>
        <option value="ability">Способность</option>
      </select>
    </div>
    <div class="cell">
      <input class="base-input" type="number" min="0" max="6" value="0" />
    </div>
    <div class="cell purchase">
      <button class="step" data-action="dec" type="button">-</button>
      <span class="current" data-role="current">0</span>
      <button class="step" data-action="inc" type="button">+</button>
    </div>
    <div class="cell cost" data-role="cost">0</div>
    <div class="cell">
      <button class="remove-btn" type="button">Удалить</button>
    </div>
  `;

  return row;
}

function addRow(list, kind) {
  const row = createDynamicRow(kind);
  list.appendChild(row);
  updateAll();
}

function clearDynamic(list) {
  list.querySelectorAll('.row[data-kind]').forEach((row) => row.remove());
}

function resetAll() {
  levelInput.value = '1';
  xpSync.checked = true;
  syncXPFromLevel();
  xpInput.value = '36';

  document.querySelectorAll('#stats-panel .row[data-kind]').forEach((row) => {
    const baseInput = row.querySelector('.base-input');
    baseInput.value = '1';
    setRowCurrent(row, 1);
  });

  perksList.querySelectorAll('.row[data-kind]').forEach((row) => {
    const baseInput = row.querySelector('.base-input');
    if (baseInput) baseInput.value = '0';
    setRowCurrent(row, 0);
  });

  updateAll();
}

function resetAllocated() {
  document.querySelectorAll('.row[data-kind]').forEach((row) => {
    const base = getRowBase(row);
    setRowCurrent(row, base);
  });
  updateAll();
}

levelInput.addEventListener('input', () => {
  syncXPFromLevel();
  updateAll();
});

xpInput.addEventListener('input', () => {
  xpInput.value = String(getXP());
  updateAll();
});

xpSync.addEventListener('change', () => {
  syncXPFromLevel();
  updateAll();
});

resetBtn.addEventListener('click', resetAll);
resetAllocBtn.addEventListener('click', resetAllocated);
addPerkBtn.addEventListener('click', () => addRow(perksList, 'perk'));

// Delegated events

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.matches('[data-action]')) {
    handleStepClick(button);
  }

  if (button.classList.contains('remove-btn')) {
    const row = button.closest('.row[data-kind]');
    if (row) row.remove();
    updateAll();
  }
});

document.addEventListener('input', (event) => {
  const input = event.target;
  if (input.classList.contains('base-input')) {
    handleBaseChange(input);
  }
});

// Init

syncXPFromLevel();
addRow(perksList, 'perk');
updateAll();
