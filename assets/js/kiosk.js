const apiBase = document.body.dataset.apiBase || "";
const kioskKey = document.body.dataset.kioskKey || "";
const kioskId = document.body.dataset.kioskId || "front-desk";
const isLocalFile = window.location.protocol === "file:";

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
const WEEK_THEMES = [
  {
    label: "Poomsae Week",
    message: "Dial in forms, balance, and power.",
    isActive: (weekNumber) => weekNumber % 2 === 0
  },
  {
    label: "Sparring Week",
    message: "Gloves on! Focus on footwork, timing, and controlled contact.",
    isActive: (weekNumber) => weekNumber % 2 !== 0
  }
];

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
    card.innerHTML = `<h3>${klass.name}</h3><p>${klass.focus}</p><p>${klass.schedule.join(" · ")}</p>`;
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
        kioskId
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
    renderClasses(data.classes || kioskClassCatalogFallback);
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
updateWeekTheme();
fetchWeekTheme();

if (isLocalFile) {
  setStatus("Offline preview: open https://aratkd.com/kiosk.html to check in for real.", "error");
}

function updateWeekTheme() {
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const theme = WEEK_THEMES.find((entry) => entry.isActive(weekNumber)) || WEEK_THEMES[0];
  if (els.weekLabel) {
    els.weekLabel.textContent = theme.label;
  }
  if (els.weekMessage) {
    els.weekMessage.textContent = theme.message;
  }
}

async function fetchWeekTheme() {
  try {
    const res = await fetch("assets/data/week-theme.json?v=" + Date.now());
    if (!res.ok) return;
    const data = await res.json();
    if (data?.label && els.weekLabel) {
      els.weekLabel.textContent = data.label;
    }
    if (data?.message && els.weekMessage) {
      els.weekMessage.textContent = data.message;
    }
  } catch (error) {
    console.warn("Unable to load custom week theme:", error);
  }
}

function getWeekNumber(date) {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  return Math.ceil(((temp - yearStart) / 86400000 + 1) / 7);
}
