/* Shiny Hunt Counter — web edition.
 *
 * Mirrors the desktop counter (app.py): pick a target by dex number or name,
 * see its shiny sprite, and tally encounters. State lives in localStorage and
 * matches the desktop hunt_log.json shape so the two can import/export each other.
 */

const STORAGE_KEY = "shiny-hunt-log-v1";
const MAX_DEX = 905; // we ship shiny sprites for National Dex 1..905

const els = {
  sprite: document.getElementById("sprite"),
  targetName: document.getElementById("target-name"),
  counter: document.getElementById("counter"),
  oddsLine: document.getElementById("odds-line"),
  increment: document.getElementById("increment"),
  decrement: document.getElementById("decrement"),
  setBtn: document.getElementById("set-btn"),
  resetBtn: document.getElementById("reset-btn"),
  foundBtn: document.getElementById("found-btn"),
  targetInput: document.getElementById("target-input"),
  speciesList: document.getElementById("species-list"),
  oddsPreset: document.getElementById("odds-preset"),
  customOddsField: document.getElementById("custom-odds-field"),
  customOdds: document.getElementById("custom-odds"),
  loadBtn: document.getElementById("load-btn"),
  huntList: document.getElementById("hunt-list"),
  noHunts: document.getElementById("no-hunts"),
  exportBtn: document.getElementById("export-btn"),
  importBtn: document.getElementById("import-btn"),
  importFile: document.getElementById("import-file"),
  installBtn: document.getElementById("install-btn"),
};

// number(string) -> name. Loaded async; used for labels and name->number lookup.
let NAMES = {};
let NAME_TO_NUM = {};

// In-memory log: { last_target_number, entries: { "<num>": {number, name, encounters, odds?} } }
let log = { last_target_number: null, entries: {} };

function spritePath(num) {
  return `shinies/${String(num).padStart(3, "0")}.png`;
}

function displayName(num) {
  const entry = log.entries[String(num)];
  const raw = (entry && entry.name) || NAMES[String(num)] || `Pokemon ${num}`;
  return raw.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/-/g, " ");
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && typeof data === "object" && data.entries) log = data;
  } catch (_) { /* keep defaults */ }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

function currentNum() {
  return log.last_target_number;
}

function currentEntry() {
  const n = currentNum();
  return n == null ? null : log.entries[String(n)];
}

function oddsFor(entry) {
  const o = entry && Number(entry.odds);
  return Number.isFinite(o) && o > 0 ? o : 4096;
}

/* Cumulative chance of having seen at least one shiny by `n` encounters. */
function cumulativeChance(n, odds) {
  if (n <= 0) return 0;
  return 1 - Math.pow(1 - 1 / odds, n);
}

function renderActive() {
  const entry = currentEntry();
  if (!entry) {
    els.sprite.removeAttribute("src");
    els.sprite.style.visibility = "hidden";
    els.targetName.textContent = "No target selected";
    els.counter.textContent = "0";
    els.oddsLine.textContent = "";
    return;
  }
  els.sprite.src = spritePath(entry.number);
  els.sprite.style.visibility = "visible";
  els.sprite.alt = `Shiny ${displayName(entry.number)}`;
  els.targetName.textContent = `${displayName(entry.number)} · #${String(entry.number).padStart(3, "0")}`;
  els.counter.textContent = String(entry.encounters || 0);

  const odds = oddsFor(entry);
  const pct = (cumulativeChance(entry.encounters || 0, odds) * 100).toFixed(2);
  els.oddsLine.textContent = `1/${odds} odds · ${pct}% chance by now`;

  // Reflect this hunt's odds in the selector.
  syncOddsSelector(odds);
}

function syncOddsSelector(odds) {
  const opt = Array.from(els.oddsPreset.options).find((o) => Number(o.value) === odds);
  if (opt) {
    els.oddsPreset.value = String(odds);
    els.customOddsField.hidden = true;
  } else {
    els.oddsPreset.value = "custom";
    els.customOddsField.hidden = false;
    els.customOdds.value = String(odds);
  }
}

function renderList() {
  const nums = Object.keys(log.entries)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => (log.entries[b].encounters || 0) - (log.entries[a].encounters || 0));

  els.huntList.innerHTML = "";
  els.noHunts.hidden = nums.length > 0;

  for (const n of nums) {
    const entry = log.entries[String(n)];
    const li = document.createElement("li");
    li.className = "hunt-row" + (n === currentNum() ? " active" : "");
    li.innerHTML = `
      <img src="${spritePath(n)}" alt="" loading="lazy" />
      <div class="hunt-meta">
        <div class="hunt-name">${displayName(n)}</div>
        <div class="hunt-sub">#${String(n).padStart(3, "0")} · 1/${oddsFor(entry)}</div>
      </div>
      <div class="hunt-count">${entry.encounters || 0}</div>
      <button class="del-btn" title="Delete hunt" aria-label="Delete">×</button>`;

    li.addEventListener("click", (e) => {
      if (e.target.classList.contains("del-btn")) return;
      switchTo(n);
    });
    li.querySelector(".del-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteHunt(n);
    });
    els.huntList.appendChild(li);
  }
}

function render() {
  renderActive();
  renderList();
}

function selectedOdds() {
  if (els.oddsPreset.value === "custom") {
    const v = parseInt(els.customOdds.value, 10);
    return Number.isFinite(v) && v > 0 ? v : 4096;
  }
  return parseInt(els.oddsPreset.value, 10) || 4096;
}

function ensureEntry(num, odds) {
  const key = String(num);
  if (!log.entries[key]) {
    log.entries[key] = {
      number: num,
      name: NAMES[key] || `pokemon-${num}`,
      encounters: 0,
      odds: odds || 4096,
    };
  } else if (odds) {
    log.entries[key].odds = odds;
  }
  return log.entries[key];
}

function switchTo(num) {
  log.last_target_number = num;
  ensureEntry(num);
  save();
  render();
}

function deleteHunt(num) {
  const name = displayName(num);
  if (!confirm(`Delete the ${name} hunt and its count?`)) return;
  delete log.entries[String(num)];
  if (currentNum() === num) {
    const remaining = Object.keys(log.entries).map(Number);
    log.last_target_number = remaining.length ? remaining[0] : null;
  }
  save();
  render();
}

function resolveTarget(raw) {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return null;
  if (/^\d+$/.test(value)) {
    const n = parseInt(value, 10);
    return n >= 1 && n <= MAX_DEX ? n : null;
  }
  const normalized = value.replace(/\s+/g, "-");
  return NAME_TO_NUM[normalized] || null;
}

function loadTarget() {
  const num = resolveTarget(els.targetInput.value);
  if (num == null) {
    alert(`Could not find that Pokemon. Enter a dex number (1–${MAX_DEX}) or a valid name.`);
    return;
  }
  log.last_target_number = num;
  ensureEntry(num, selectedOdds());
  els.targetInput.value = "";
  save();
  render();
}

// --- Counter actions ---------------------------------------------------------

function bump(delta) {
  const entry = currentEntry();
  if (!entry) return;
  entry.encounters = Math.max(0, (entry.encounters || 0) + delta);
  save();
  render();
}

function setCount() {
  const entry = currentEntry();
  if (!entry) return;
  const raw = prompt("Set encounter count:", String(entry.encounters || 0));
  if (raw == null) return;
  const n = parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 0) {
    alert("Enter a whole number 0 or greater.");
    return;
  }
  entry.encounters = n;
  save();
  render();
}

function resetCount() {
  const entry = currentEntry();
  if (!entry) return;
  if (!confirm(`Reset ${displayName(entry.number)} to 0 encounters?`)) return;
  entry.encounters = 0;
  save();
  render();
}

function markFound() {
  const entry = currentEntry();
  if (!entry) return;
  alert(`★ Congrats on shiny ${displayName(entry.number)} after ${entry.encounters || 0} encounters! ★`);
}

// --- Import / export ---------------------------------------------------------

function exportLog() {
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hunt_log.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importLog(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== "object" || typeof data.entries !== "object") {
        throw new Error("missing entries");
      }
      log = {
        last_target_number: data.last_target_number || null,
        entries: data.entries || {},
      };
      save();
      render();
      alert("Hunt log imported.");
    } catch (_) {
      alert("That file is not a valid hunt_log.json.");
    }
  };
  reader.readAsText(file);
}

// --- Wiring ------------------------------------------------------------------

function attachEvents() {
  els.increment.addEventListener("click", () => bump(1));
  els.decrement.addEventListener("click", () => bump(-1));
  els.setBtn.addEventListener("click", setCount);
  els.resetBtn.addEventListener("click", resetCount);
  els.foundBtn.addEventListener("click", markFound);
  els.loadBtn.addEventListener("click", loadTarget);

  els.targetInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadTarget();
  });

  els.oddsPreset.addEventListener("change", () => {
    els.customOddsField.hidden = els.oddsPreset.value !== "custom";
    const entry = currentEntry();
    if (entry) {
      entry.odds = selectedOdds();
      save();
      renderActive();
      renderList();
    }
  });
  els.customOdds.addEventListener("change", () => {
    const entry = currentEntry();
    if (entry) {
      entry.odds = selectedOdds();
      save();
      renderActive();
      renderList();
    }
  });

  els.exportBtn.addEventListener("click", exportLog);
  els.importBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", () => {
    if (els.importFile.files[0]) importLog(els.importFile.files[0]);
    els.importFile.value = "";
  });

  // Space / Enter / ArrowUp anywhere = +1, as long as you're not typing in a field.
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp" || e.key === "+") {
      e.preventDefault();
      bump(1);
    } else if (e.key === "ArrowDown" || e.key === "-") {
      e.preventDefault();
      bump(-1);
    }
  });
}

function populateDatalist() {
  const frag = document.createDocumentFragment();
  for (let n = 1; n <= MAX_DEX; n++) {
    const name = NAMES[String(n)];
    if (!name) continue;
    const opt = document.createElement("option");
    opt.value = name;
    opt.label = `#${String(n).padStart(3, "0")}`;
    frag.appendChild(opt);
  }
  els.speciesList.appendChild(frag);
}

async function init() {
  load();
  // First run with no saved state: seed from the bundled desktop hunt_log.json.
  if (!localStorage.getItem(STORAGE_KEY) && Object.keys(log.entries).length === 0) {
    try {
      const seed = await (await fetch("default_hunt_log.json")).json();
      if (seed && seed.entries) {
        log = { last_target_number: seed.last_target_number || null, entries: seed.entries };
        save();
      }
    } catch (_) { /* no seed available */ }
  }
  try {
    NAMES = await (await fetch("js/pokemon_names.json")).json();
    for (const [num, name] of Object.entries(NAMES)) NAME_TO_NUM[name] = Number(num);
  } catch (_) { /* names optional; numbers still work */ }
  populateDatalist();
  attachEvents();
  render();
}

// PWA install prompt + service worker.
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  els.installBtn.hidden = false;
});
els.installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  els.installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

init();
