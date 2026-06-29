const apiBase = document.body.dataset.apiBase || "";
const kioskId = document.body.dataset.kioskId || "front-desk";
const isLocalFile = window.location.protocol === "file:";
const ALLOWED_DAYS = [1, 3, 5]; // Monday=1 ... Sunday=0
const themeState = { override: null, rotation: null };
const CALENDAR_SPREADSHEET_ID = "14cilS4LD8JAs2P7Y-_g8CaoMgLHfqjkYJcDjgpSntE4";
const CALENDAR_GID = "1157707621";
let kioskCalendarCsvUrl = `https://docs.google.com/spreadsheets/d/${CALENDAR_SPREADSHEET_ID}/export?format=csv&gid=${CALENDAR_GID}`;

const state = {
  selectedClass: null,
  studentId: ""
};

// Per-session check-in counts per class
const sessionCounts = {};

const els = {
  classGrid: document.getElementById("kiosk-class-grid"),
  studentId: document.getElementById("kiosk-student-id"),
  keypad: document.getElementById("kiosk-keypad"),
  status: document.getElementById("kiosk-status"),
  weekLabel: document.getElementById("kiosk-week-label"),
  weekMessage: document.getElementById("kiosk-week-message"),
  logo: document.getElementById("kiosk-logo"),
  setupPanel: document.getElementById("kiosk-setup-panel"),
  setupKey: document.getElementById("kiosk-setup-key"),
  setupId: document.getElementById("kiosk-setup-id"),
  setupStatus: document.getElementById("kiosk-setup-status"),
  setupSave: document.getElementById("kiosk-setup-save"),
  setupClose: document.getElementById("kiosk-setup-close")
};
const KIOSK_STORAGE_KEY = "araKioskRuntimeKey";
const KIOSK_TRIGGER_WINDOW_MS = 3000;
const KIOSK_TRIGGER_COUNT = 5;
let kioskTriggerCount = 0;
let kioskTriggerStartedAt = 0;
let successDismissTimer = null;

// Keypad layout — ARA prefix key + digits + backspace + confirm
const keypadLayout = ["ARA", "1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];

const FOCUS_TEMPLATE = [
  { title: "Focus Week: Poomsae Foundations", description: "Sharpen stances, kihaps, and form details to launch the training month." },
  { title: "Focus Week: Breaking Practice & Poomsae", description: "Board breaking mechanics plus form refinement to build precision and power." },
  { title: "Focus Week: Sparring - Bring Gear", description: "Footwork, ring strategies, and controlled sparring rounds. Full sparring gear required." },
  { title: "Focus Week: Sparring & Self-Defense", description: "Blend sparring combinations with practical self-defense scenarios." },
  { title: "Focus Week: Poomsae Spotlight & Testing Prep", description: "Dial in patterns, kihaps, and testing etiquette ahead of evaluations." }
];
const FOCUS_RANGE_START = new Date(2025, 8, 1);
const FOCUS_RANGE_END = new Date(2026, 11, 31);
const FALLBACK_FOCUS = {
  sparring: {
    allRanks: "Sparring basics: footwork, timing, and distance control.",
    littleNinjas: "Fun sparring drills and safe contact basics.",
    colorBelts: "Footwork, combos, and ring awareness.",
    blackBelt: "Advanced sparring strategy and counters."
  },
  poomsae: {
    allRanks: "Poomsae: forms, stances, and precision.",
    littleNinjas: "Poomsae basics and balance drills.",
    colorBelts: "Form corrections, rhythm, and kihap timing.",
    blackBelt: "Advanced poomsae detail work."
  }
};
const FALLBACK_SCHEDULES = {
  allRanks:     ["Mon 4:30 PM", "Wed 4:30 PM", "Fri 4:30 PM"],
  littleNinjas: ["Mon 5:00 PM", "Wed 5:00 PM", "Fri 5:00 PM"],
  colorBelts:   ["Mon 5:45 PM", "Wed 5:45 PM", "Fri 5:45 PM"],
  blackBelt:    ["Mon 6:30 PM", "Wed 6:30 PM", "Fri 6:30 PM"]
};
const BELT_LESSON_TARGETS = {
  default: 25, white: 25, "high-white": 25, yellow: 25, "high-yellow": 25,
  green: 25, "high-green": 30, blue: 30, "high-blue": 32, red: 42, "high-red": 48, black: 50
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function normalizeBeltSlug(name) {
  const slug = String(name ?? "").toLowerCase().trim()
    .replace(/belt/g, "").replace(/dan/g, "").replace(/degree/g, "")
    .replace(/[^a-z- ]/g, "").replace(/\s+/g, "-");
  if (!slug) return "default";
  if (slug.includes("high-yellow")) return "high-yellow";
  if (slug.includes("high-white")) return "high-white";
  if (slug.includes("high-green")) return "high-green";
  if (slug.includes("high-blue")) return "high-blue";
  if (slug.includes("high-red")) return "high-red";
  if (slug.includes("white")) return "white";
  if (slug.includes("yellow")) return "yellow";
  if (slug.includes("green")) return "green";
  if (slug.includes("blue")) return "blue";
  if (slug.includes("red")) return "red";
  if (slug.includes("black")) return "black";
  return slug;
}

function resolveLessonsRequired(currentRank) {
  const slug = normalizeBeltSlug(currentRank);
  return BELT_LESSON_TARGETS[slug] || BELT_LESSON_TARGETS.default;
}

function readStoredKioskKey() {
  try { return localStorage.getItem(KIOSK_STORAGE_KEY) || sessionStorage.getItem(KIOSK_STORAGE_KEY) || ""; }
  catch { return ""; }
}

function persistKioskKey(value) {
  try {
    if (!value) { localStorage.removeItem(KIOSK_STORAGE_KEY); sessionStorage.removeItem(KIOSK_STORAGE_KEY); return; }
    localStorage.setItem(KIOSK_STORAGE_KEY, value);
    sessionStorage.setItem(KIOSK_STORAGE_KEY, value);
  } catch { /* ignore */ }
}

function getKioskRuntimeKey() { return readStoredKioskKey() || document.body.dataset.kioskKey || ""; }

function setSetupStatus(message, type = "") {
  if (!els.setupStatus) return;
  els.setupStatus.textContent = message;
  els.setupStatus.className = "ki-setup-status";
  if (type) els.setupStatus.classList.add(type);
}

function openSetupPanel() {
  if (!els.setupPanel) return;
  els.setupPanel.hidden = false;
  if (els.setupId) els.setupId.value = kioskId;
  if (els.setupKey) { els.setupKey.value = readStoredKioskKey(); els.setupKey.focus(); }
  setSetupStatus("Enter the kiosk access key on this device only.");
}

function closeSetupPanel() {
  if (!els.setupPanel) return;
  els.setupPanel.hidden = true;
  kioskTriggerCount = 0;
  kioskTriggerStartedAt = 0;
}

function handleLogoTap() {
  const now = Date.now();
  if (!kioskTriggerStartedAt || now - kioskTriggerStartedAt > KIOSK_TRIGGER_WINDOW_MS) {
    kioskTriggerStartedAt = now;
    kioskTriggerCount = 0;
  }
  kioskTriggerCount += 1;
  if (kioskTriggerCount >= KIOSK_TRIGGER_COUNT) openSetupPanel();
}

function handleSetupSave() {
  const key = (els.setupKey?.value || "").trim();
  if (!key) { setSetupStatus("Enter a kiosk access key before saving.", "error"); return; }
  persistKioskKey(key);
  setSetupStatus("Kiosk key saved on this device.", "success");
  window.setTimeout(() => { closeSetupPanel(); setStatus("Kiosk configured. Ready to check in.", "success"); }, 800);
}

function formatEventWindow(event) {
  if (!event) return "";
  const start = event.startAt || event.start_at || event.start;
  const end = event.endAt || event.end_at || event.end;
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const options = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  const startLabel = startDate ? startDate.toLocaleString(undefined, options) : "";
  const endLabel = endDate ? endDate.toLocaleString(undefined, options) : "";
  return endLabel ? `${startLabel} → ${endLabel}` : startLabel;
}

function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }

function normalizeRotation(rotation) {
  if (!rotation || !rotation.start || !Array.isArray(rotation.themes)) return null;
  const startDate = new Date(`${rotation.start}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) return null;
  const themes = rotation.themes.map(t => ({ key: t.key || "", label: t.label || "", message: t.message || "" })).filter(t => t.label || t.message);
  if (!themes.length) return null;
  return { start: startDate, weeks: Number(rotation.weeks) || 2, themes };
}

function getRotationTheme(date, rotation) {
  if (!rotation?.start || !rotation.themes?.length) return null;
  const blockDays = rotation.weeks * 7;
  const diffMs = startOfDay(date).getTime() - startOfDay(rotation.start).getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const index = diffDays < 0 ? 0 : Math.floor(diffDays / blockDays) % rotation.themes.length;
  return rotation.themes[index] || null;
}

function getActiveTheme(date = new Date()) {
  return (themeState.rotation ? getRotationTheme(date, themeState.rotation) : null) || themeState.override || getFocusForDate(date) || null;
}

function getThemeKey(label = "") {
  const n = label.toLowerCase();
  if (n.includes("sparring")) return "sparring";
  return "poomsae";
}

// Class list — Little Ninjas, Beginning, Intermediate only
function buildFallbackClasses(theme) {
  const focus = FALLBACK_FOCUS[getThemeKey(theme?.label || "")] || FALLBACK_FOCUS.poomsae;
  return [
    { id: "little-ninjas", name: "Little Ninjas", focus: focus.littleNinjas, schedule: FALLBACK_SCHEDULES.littleNinjas },
    { id: "beginning",     name: "Beginning",      focus: focus.allRanks,    schedule: FALLBACK_SCHEDULES.allRanks },
    { id: "intermediate",  name: "Intermediate",   focus: focus.colorBelts,  schedule: FALLBACK_SCHEDULES.colorBelts }
  ];
}

function setStatus(message, type = "") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = "ki-status";
  if (type) els.status.classList.add(type);
}

// Render class cards with fill-bar Option C design
function renderClasses(classes) {
  if (!els.classGrid) return;
  els.classGrid.innerHTML = "";
  classes.forEach((klass, idx) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "ki-class-card";
    card.dataset.classId = klass.id;
    const scheduleText = Array.isArray(klass.schedule) ? klass.schedule.join(" · ") : klass.schedule || "";
    const count = sessionCounts[klass.id] || 0;
    const barWidth = Math.min(count * 8, 100);
    const typeBadge = klass.type ? `<div class="ki-class-card__type">${escapeHtml(klass.type)}</div>` : "";
    card.innerHTML = `
      ${typeBadge}
      <div class="ki-class-card__name">${escapeHtml(klass.name)}</div>
      <div class="ki-class-card__time">${escapeHtml(scheduleText)}</div>
      <div class="ki-class-card__bar-wrap">
        <div class="ki-class-card__bar" style="width:${barWidth}%"></div>
      </div>
      <div class="ki-class-card__count">${count} checked in this session</div>
    `;
    card.addEventListener("click", () => {
      state.selectedClass = klass;
      document.querySelectorAll(".ki-class-card").forEach(el => el.classList.remove("active"));
      card.classList.add("active");
    });
    if (idx === 0) { state.selectedClass = klass; card.classList.add("active"); }
    els.classGrid.appendChild(card);
  });
}

// Update a class card's fill bar after a check-in
function updateClassCard(classId) {
  const card = els.classGrid?.querySelector(`[data-class-id="${escapeHtml(classId)}"]`);
  if (!card) return;
  const count = sessionCounts[classId] || 0;
  const bar = card.querySelector(".ki-class-card__bar");
  const countEl = card.querySelector(".ki-class-card__count");
  if (bar) bar.style.width = `${Math.min(count * 8, 100)}%`;
  if (countEl) countEl.textContent = `${count} checked in this session`;
}

// Render keypad with correct CSS classes
function renderKeypad() {
  if (!els.keypad) return;
  els.keypad.innerHTML = "";
  keypadLayout.forEach((symbol) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ki-key";
    if (symbol === "✓") btn.classList.add("ki-key--confirm");
    if (symbol === "ARA") btn.classList.add("ki-key--ara");
    if (symbol === "⌫") btn.classList.add("ki-key--delete");
    btn.textContent = symbol;
    btn.addEventListener("click", () => handleKey(symbol));
    els.keypad.appendChild(btn);
  });
}

function handleKey(symbol) {
  if (symbol === "⌫") {
    state.studentId = state.studentId.slice(0, -1);
  } else if (symbol === "✓") {
    submitAttendance();
    return;
  } else if (state.studentId.length < 12) {
    if (symbol === "ARA") {
      // Only prepend ara if not already there
      if (!state.studentId.toUpperCase().startsWith("ARA")) {
        appendStudentId("ARA");
      }
    } else {
      appendStudentId(symbol);
    }
  }
  updateStudentInput();
}

function appendStudentId(value) {
  state.studentId = (state.studentId + value).toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
}

function updateStudentInput() {
  if (els.studentId) els.studentId.value = state.studentId;
  // Update visual display
  const display = document.getElementById("ki-display");
  if (display) {
    display.textContent = state.studentId || "—";
    display.classList.toggle("ki-display--active", state.studentId.length > 0);
  }
}

// Add an item to the recent check-ins feed
function addFeedItem(name, belt) {
  const list = document.getElementById("ki-feed-list");
  if (!list) return;
  list.querySelector(".ki-feed__empty")?.remove();
  const li = document.createElement("li");
  li.className = "ki-feed__item ki-feed__item--new";
  const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  li.innerHTML = `
    <span class="ki-feed__dot"></span>
    <span class="ki-feed__name">${escapeHtml(name)}</span>
    <span class="ki-feed__meta">${escapeHtml(belt)}</span>
    <span class="ki-feed__time">${time}</span>
  `;
  list.insertBefore(li, list.firstChild);
  while (list.children.length > 10) list.lastChild?.remove();
  setTimeout(() => li.classList.remove("ki-feed__item--new"), 600);
}

// Show full-screen success overlay with student stats
function showSuccessOverlay(name, belt, stats) {
  const overlay = document.getElementById("ki-success-overlay");
  if (!overlay) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? "—"; };
  set("ki-success-name", name);
  set("ki-success-belt", belt);
  set("ki-success-completed", stats.completed);
  set("ki-success-required", stats.required);
  set("ki-success-remaining", stats.remaining);
  overlay.classList.add("visible");
  if (successDismissTimer) clearTimeout(successDismissTimer);
  successDismissTimer = setTimeout(() => overlay.classList.remove("visible"), 4200);
}

// Live clock in topbar
function updateClock() {
  const timeEl = document.querySelector(".ki-clock__time");
  const dateEl = document.querySelector(".ki-clock__date");
  const now = new Date();
  if (timeEl) timeEl.textContent = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (dateEl) dateEl.textContent = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

async function submitAttendance() {
  if (!state.selectedClass) { setStatus("Select a class first.", "error"); return; }
  if (!state.studentId) { setStatus("Enter your student ID (e.g. ARA016).", "error"); return; }
  const runtimeKioskKey = getKioskRuntimeKey();
  if (!apiBase || !runtimeKioskKey) { setStatus("Kiosk is not configured. Contact the front desk.", "error"); return; }
  const isEvent = Boolean(state.selectedClass.isEvent);
  if (!isEvent && !isAllowedDay()) { setStatus("Attendance check-ins open Mon/Wed/Fri only.", "error"); return; }
  setStatus("Logging attendance…", "progress");
  try {
    // Send ID as-is (uppercased); API normalizes for lookup
    const cleanedId = state.studentId.trim().toUpperCase();
    if (!cleanedId) { setStatus("Enter your student ID.", "error"); return; }
    const res = await fetch(`${apiBase}/kiosk/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Kiosk-Key": runtimeKioskKey },
      body: JSON.stringify({
        studentId: cleanedId,
        classType: state.selectedClass.id,
        classLevel: state.selectedClass.name,
        kioskId,
        eventId: state.selectedClass.eventId || null
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Unable to record attendance");

    state.studentId = "";
    updateStudentInput();

    const studentName = data.student?.name || "Student";
    const currentRank = data.currentRank || data.student?.currentBelt || "White Belt";
    const lessonsCompleted = typeof data.lessonsCompleted === "number" ? data.lessonsCompleted : null;
    const lessonsRequired = resolveLessonsRequired(currentRank);
    const lessonsRemaining = lessonsCompleted === null ? null : Math.max(0, lessonsRequired - lessonsCompleted);

    // Update session count + fill bar
    const classId = state.selectedClass?.id;
    if (classId) {
      sessionCounts[classId] = (sessionCounts[classId] || 0) + 1;
      updateClassCard(classId);
    }

    // Add to feed
    addFeedItem(studentName, currentRank);

    // Show success overlay
    showSuccessOverlay(studentName, currentRank, {
      completed: lessonsCompleted,
      required: lessonsRequired,
      remaining: lessonsRemaining
    });

    setStatus(`✓ ${studentName} checked in`, "success");

  } catch (error) {
    console.error(error);
    if (error.message?.toLowerCase().includes("failed to fetch") && isLocalFile) {
      setStatus("Cannot reach the portal API from a local file. Load via your website.", "error");
    } else {
      setStatus(error.message || "Unable to reach the kiosk service.", "error");
    }
  }
}

function isAllowedDay(date = new Date()) {
  const day = date.getDay();
  return ALLOWED_DAYS.includes(day === 0 ? 7 : day);
}

async function loadClasses() {
  const fallbackClasses = buildFallbackClasses(getActiveTheme());
  if (!apiBase) { renderClasses(fallbackClasses); return; }
  try {
    const res = await fetch(`${apiBase}/kiosk/classes`);
    if (!res.ok) throw new Error("Unable to load classes");
    const data = await res.json();
    if (data.calendarCsvUrl && data.calendarCsvUrl !== kioskCalendarCsvUrl) {
      kioskCalendarCsvUrl = data.calendarCsvUrl;
      await fetchWeekTheme();
      updateWeekTheme();
    }
    const classes = Array.isArray(data.classes) ? data.classes : fallbackClasses;
    const events = Array.isArray(data.events) ? data.events.map(event => ({
      id: `event:${event.id}`, eventId: event.id, name: event.name,
      type: event.type || "Special Event", focus: event.description || "Special Event",
      schedule: [formatEventWindow(event)], isEvent: true
    })) : [];
    renderClasses([...events, ...classes]);
  } catch (error) {
    console.warn(error);
    setStatus("Offline — showing default class list.", "error");
    renderClasses(fallbackClasses);
  }
}

if (els.studentId) {
  els.studentId.addEventListener("input", (event) => {
    const value = (event.target.value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
    state.studentId = value;
    els.studentId.value = value;
    updateStudentInput();
  });
}

function updateWeekTheme() {
  const now = new Date();
  const focus = getActiveTheme(now);
  if (els.weekLabel) els.weekLabel.textContent = focus?.label || "Poomsae Week";
  if (els.weekMessage) els.weekMessage.textContent = focus?.message || "Poomsae week: sharpen forms, stances, and precision.";
}

function bindSetupControls() {
  els.logo?.addEventListener("click", handleLogoTap);
  els.setupSave?.addEventListener("click", handleSetupSave);
  els.setupClose?.addEventListener("click", closeSetupPanel);
}

function splitCsvLine(line) {
  const cells = []; let current = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; } }
    else if (ch === "," && !inQuotes) { cells.push(current); current = ""; }
    else { current += ch; }
  }
  cells.push(current);
  return cells;
}

function parseWeekFocusFromCsv(csvText) {
  const today = new Date();
  const rows = csvText.split(/\r?\n/).map(l => splitCsvLine(l));
  let monthLabel = "";
  for (const row of rows) { const cell = (row[0] || "").replace(/"/g, "").trim(); if (cell) { monthLabel = cell; break; } }
  const monthMatch = monthLabel.match(/(\w+)\s+(\d{4})/);
  if (!monthMatch) return null;
  const sheetDate = new Date(`${monthMatch[1]} 1, ${monthMatch[2]}`);
  if (isNaN(sheetDate.getTime())) return null;
  if (sheetDate.getFullYear() !== today.getFullYear() || sheetDate.getMonth() !== today.getMonth()) return null;
  const todayNum = today.getDate();
  for (let i = 1; i < rows.length - 1; i++) {
    const focusCell = (rows[i][0] || "").replace(/"/g, "").replace(/^★\s*/, "").trim();
    if (!focusCell) continue;
    const nextRow = rows[i + 1] || [];
    const dayNums = nextRow.slice(0, 7).map(v => parseInt((v || "").replace(/"/g, "").trim(), 10));
    if (!dayNums.some(n => !isNaN(n) && n >= 1 && n <= 31)) continue;
    if (dayNums.includes(todayNum)) return focusCell;
    i += 2;
  }
  return null;
}

function themeFromCalendarFocus(focus) {
  const lower = (focus || "").toLowerCase();
  const label = focus.replace(/^week\s*\d+\s*/i, "").trim() || focus;
  if (lower.includes("sparring") || lower.includes("gear")) return { label, message: `${label}: sharpen timing, control, and ring awareness. Bring sparring gear.` };
  if (lower.includes("poomsae") || lower.includes("form")) return { label, message: `${label}: sharpen forms, stances, and precision.` };
  if (lower.includes("break")) return { label, message: `${label}: power, focus, and technique. Bring your boards!` };
  return { label, message: `${label}: train hard and stay focused this week.` };
}

async function fetchWeekTheme() {
  if (kioskCalendarCsvUrl) {
    try {
      const res = await fetch(`${kioskCalendarCsvUrl}&t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const csv = await res.text();
        const focus = parseWeekFocusFromCsv(csv);
        if (focus) { themeState.override = themeFromCalendarFocus(focus); themeState.rotation = null; return; }
      }
    } catch (e) { console.warn("Calendar theme fetch failed:", e); }
  }
  try {
    const res = await fetch(`assets/data/week-theme.json?v=${Date.now()}`);
    if (!res.ok) return;
    const data = await res.json();
    themeState.rotation = normalizeRotation(data?.rotation);
    if (data?.label || data?.message) themeState.override = { label: data.label, message: data.message };
  } catch (e) { console.warn("Theme file fetch failed:", e); }
}

function getFocusForDate(date) {
  if (!date || !(date instanceof Date)) return null;
  if (date < FOCUS_RANGE_START || date > FOCUS_RANGE_END) return null;
  const year = date.getFullYear(), month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let weekIndex = 0, day = 1; day <= daysInMonth; weekIndex += 1, day += 7) {
    const start = new Date(year, month, day);
    const end = new Date(year, month, Math.min(day + 6, daysInMonth));
    if (date >= start && date <= end) {
      const focus = FOCUS_TEMPLATE[Math.min(weekIndex, FOCUS_TEMPLATE.length - 1)];
      return { label: (focus.title || "").replace(/Focus Week:\s*/i, "").trim() || "Focus Week", message: focus.description || "Stay sharp this week." };
    }
  }
  return null;
}

async function initKiosk() {
  // Live clock
  updateClock();
  setInterval(updateClock, 1000);

  renderKeypad();
  bindSetupControls();
  await fetchWeekTheme();
  updateWeekTheme();
  await loadClasses();

  if (!getKioskRuntimeKey()) {
    setStatus("Kiosk not configured on this device. Tap the logo 5× for staff setup.", "error");
  } else if (isLocalFile) {
    setStatus("Local kiosk mode — API will sync when live.", "success");
  }
}

initKiosk();
