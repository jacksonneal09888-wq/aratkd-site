const apiBase = document.body.dataset.apiBase || "";
const kioskKey = document.body.dataset.kioskKey || "";
const kioskId = document.body.dataset.kioskId || "front-desk";
const isLocalFile = window.location.protocol === "file:";
const ALLOWED_DAYS = [1, 3, 5]; // Monday=1 ... Sunday=0
const themeState = { override: null };

const state = {
  selectedClass: null,
  studentId: ""
};

const els = {
  classGrid: document.getElementById("kiosk-class-grid"),
  studentId: document.getElementById("kiosk-student-id"),
  keypad: document.getElementById("kiosk-keypad"),
  status: document.getElementById("kiosk-status"),
  weekLabel: document.getElementById("kiosk-week-label"),
  weekMessage: document.getElementById("kiosk-week-message")
};

const keypadLayout = ["ARA", "1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];
const FOCUS_TEMPLATE = [
  {
    title: "Focus Week: Poomsae Foundations",
    description: "Sharpen stances, kihaps, and form details to launch the training month."
  },
  {
    title: "Focus Week: Breaking Practice & Poomsae",
    description: "Board breaking mechanics plus form refinement to build precision and power."
  },
  {
    title: "Focus Week: Sparring - Bring Gear",
    description: "Footwork, ring strategies, and controlled sparring rounds. Full sparring gear required."
  },
  {
    title: "Focus Week: Sparring & Self-Defense",
    description: "Blend sparring combinations with practical self-defense scenarios."
  },
  {
    title: "Focus Week: Poomsae Spotlight & Testing Prep",
    description: "Dial in patterns, kihaps, and testing etiquette ahead of evaluations."
  }
];
const FOCUS_RANGE_START = new Date(2025, 8, 1); // 2025-09-01
const FOCUS_RANGE_END = new Date(2026, 11, 31); // 2026-12-31

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

function setStatus(message, type = "") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = "kiosk-status";
  if (type) {
    els.status.classList.add(type);
  }
}

function renderClasses(classes) {
  if (!els.classGrid) return;
  els.classGrid.innerHTML = "";
  classes.forEach((klass, idx) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "class-card";
    const scheduleText = Array.isArray(klass.schedule) ? klass.schedule.join(" · ") : "";
    card.innerHTML = `<h3>${klass.name}</h3><p>${klass.focus}</p><p>${scheduleText}</p>`;
    card.addEventListener("click", () => {
      state.selectedClass = klass;
      document.querySelectorAll(".class-card").forEach((el) => el.classList.remove("active"));
      card.classList.add("active");
    });
    if (idx === 0) {
      state.selectedClass = klass;
      card.classList.add("active");
    }
    els.classGrid.appendChild(card);
  });
}

function renderKeypad() {
  if (!els.keypad) return;
  els.keypad.innerHTML = "";
  keypadLayout.forEach((symbol) => {
    const btn = document.createElement("button");
    btn.type = "button";
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
      appendStudentId("ARA");
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
  if (els.studentId) {
    els.studentId.value = state.studentId;
  }
}

async function submitAttendance() {
  if (!state.selectedClass) {
    setStatus("Select a class first.", "error");
    return;
  }
  if (!state.studentId) {
    setStatus("Enter the student ID.", "error");
    return;
  }
  if (!apiBase || !kioskKey) {
    setStatus("Kiosk is not configured. Contact the front desk.", "error");
    return;
  }
  if (isLocalFile) {
    setStatus("This kiosk must run from https://aratkd.com/kiosk.html to sync attendance.", "error");
    return;
  }
  const isEvent = Boolean(state.selectedClass.isEvent);
  if (!isEvent && !isAllowedDay()) {
    setStatus("Attendance check-ins open Mon/Wed/Fri only. Please see the front desk.", "error");
    return;
  }
  setStatus("Logging attendance...", "progress");
  try {
    const cleanedId = state.studentId.trim().toUpperCase();
    if (!cleanedId) {
      setStatus("Enter the student ID.", "error");
      return;
    }
    const res = await fetch(`${apiBase}/kiosk/check-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kiosk-Key": kioskKey
      },
      body: JSON.stringify({
        studentId: cleanedId,
        classType: state.selectedClass.id,
        classLevel: state.selectedClass.name,
        kioskId,
        eventId: state.selectedClass.eventId || null
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || "Unable to record attendance");
    }
    state.studentId = "";
    updateStudentInput();
    const percent = typeof data.attendancePercent === "number" ? data.attendancePercent : null;
    const percentMessage = percent !== null ? `Attendance ${percent}% toward goal.` : "";
    setStatus(
      `Check-in recorded for ${data.student?.name || "student"} · ${percentMessage}`,
      "success"
    );
  } catch (error) {
    console.error(error);
    if (error.message?.toLowerCase().includes("failed to fetch") && isLocalFile) {
      setStatus("Unable to reach the portal API. Load this kiosk from your website (not a local file).", "error");
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
  if (!apiBase) {
    renderClasses(kioskClassCatalogFallback);
    return;
  }
  try {
    const res = await fetch(`${apiBase}/kiosk/classes`);
    if (!res.ok) {
      throw new Error("Unable to load classes");
    }
    const data = await res.json();
    const classes = Array.isArray(data.classes) ? data.classes : kioskClassCatalogFallback;
    const events = Array.isArray(data.events)
      ? data.events.map((event) => ({
          id: `event:${event.id}`,
          eventId: event.id,
          name: event.name,
          focus: "Special Event",
          schedule: [formatEventWindow(event)],
          isEvent: true
        }))
      : [];
    renderClasses([...events, ...classes]);
  } catch (error) {
    console.warn(error);
    setStatus("Offline? Showing default class list.", "error");
    renderClasses(kioskClassCatalogFallback);
  }
}

const kioskClassCatalogFallback = [
  {
    id: "little-ninjas",
    name: "Little Ninjas",
    focus: "Ages 4-6 • starts 4:30 PM",
    schedule: ["Mon 4:30 PM", "Wed 4:30 PM", "Fri 4:30 PM"]
  },
  {
    id: "basic",
    name: "Basic Class",
    focus: "White–Yellow • starts 5:00 PM",
    schedule: ["Mon 5:00 PM", "Wed 5:00 PM", "Fri 5:00 PM"]
  },
  {
    id: "advanced",
    name: "Advanced Class",
    focus: "High Yellow–Black • starts 6:00 PM",
    schedule: ["Mon 6:00 PM", "Wed 6:00 PM", "Fri 6:00 PM"]
  }
];

if (els.studentId) {
  els.studentId.addEventListener("input", (event) => {
    const value = (event.target.value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
    state.studentId = value;
    els.studentId.value = value;
  });
}

renderKeypad();
loadClasses();
fetchWeekTheme().finally(updateWeekTheme);
updateWeekTheme();

if (isLocalFile) {
  setStatus("Offline preview: open https://aratkd.com/kiosk.html to check in for real.", "error");
}

function updateWeekTheme() {
  const now = new Date();
  const focus = themeState.override || getFocusForDate(now);
  const label = focus?.label || "Poomsae Week";
  const message =
    focus?.message || "Forms focus: polish stances, kihaps, and sharp sequences across all classes.";
  if (els.weekLabel) {
    els.weekLabel.textContent = label;
  }
  if (els.weekMessage) {
    els.weekMessage.textContent = message;
  }
}

function getFocusForDate(date) {
  if (!date || !(date instanceof Date)) return null;
  if (date < FOCUS_RANGE_START || date > FOCUS_RANGE_END) return null;
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let weekIndex = 0, day = 1; day <= daysInMonth; weekIndex += 1, day += 7) {
    const start = new Date(year, month, day);
    const end = new Date(year, month, Math.min(day + 6, daysInMonth));
    if (date >= start && date <= end) {
      const templateIndex = Math.min(weekIndex, FOCUS_TEMPLATE.length - 1);
      const focus = FOCUS_TEMPLATE[templateIndex];
      const label = (focus.title || "").replace(/Focus Week:\\s*/i, "").trim() || "Focus Week";
      return {
        label,
        message: focus.description || "Stay sharp this week."
      };
    }
  }
  return null;
}
