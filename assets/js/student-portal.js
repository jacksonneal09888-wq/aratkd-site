const STORAGE_KEYS = {
    progress: "araStudentProgress",
    certificates: "araStudentCertificates",
    session: "araStudentSession"
};

const ADMIN_STORAGE_KEY = "araPortalAdminKey";
const API_BASE_URL = (() => {
    const globalValue = typeof window !== "undefined" ? window.PORTAL_API_BASE : "";
    const bodyValue = typeof document !== "undefined" && document.body ? document.body.dataset.apiBase : "";
    const chosen = globalValue || bodyValue || "";
    if (!chosen) {
        return "";
    }
    return chosen.endsWith("/") ? chosen.slice(0, -1) : chosen;
})();
const HAS_REMOTE_API = Boolean(API_BASE_URL);

function buildApiUrl(path) {
    if (!HAS_REMOTE_API) {
        return null;
    }
    if (!path.startsWith("/")) {
        path = `/${path}`;
    }
    return `${API_BASE_URL}${path}`;
}

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB cap to avoid blowing up localStorage
const ACCEPTED_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/heic",
    "image/heif"
];

const CURRICULUM_PDF = "assets/materials/tkd-curriculum-aras-martial-arts.pdf";

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg)$/i;

const BELT_SEQUENCE = [
    {
        name: "White Belt",
        slug: "white",
        focus: "Foundations: attention stance, courtesy, basic blocks, and home respect goals.",
        studyGuide: "assets/materials/white-belt-form-video.mp4",
        testingChecklist: "assets/materials/tkd-curriculum-white-belt.png",
        image: "assets/Images/belts/white-belt.svg"
    },
    {
        name: "High White Belt",
        slug: "high-white",
        focus: "Early footwork, loud kihaps, and sharp low/high blocks with balance checks.",
        studyGuide: "assets/materials/white-belt-form-video.mp4",
        testingChecklist: "assets/materials/tkd-curriculum-high-white-belt.png",
        image: "assets/Images/belts/high-white-belt.svg"
    },
    {
        name: "Yellow Belt",
        slug: "yellow",
        focus: "Balance, strong front stances, and first round of one-steps.",
        studyGuide: "https://youtu.be/WhkjRruCBTo?si=E-UgOruZShgYSNeT&t=82",
        testingChecklist: "assets/materials/tkd-curriculum-yellow-belt.png",
        image: "assets/Images/belts/yellow-belt.svg"
    },
    {
        name: "High Yellow Belt",
        slug: "high-yellow",
        focus: "Confidence linking front and side kicks with self-defense combinations.",
        studyGuide: "https://youtu.be/tGlrUplKHh8?si=H6A2ThFhMwu03AQ_&t=67",
        testingChecklist: "assets/materials/tkd-curriculum-high-yellow-belt.png",
        image: "assets/Images/belts/high-yellow-belt.svg"
    },
    {
        name: "Green Belt",
        slug: "green",
        focus: "Power generation, stronger poomsae details, sparring drills.",
        studyGuide: "https://youtu.be/ksSqKt0UkWo?si=jowU-x4mP_eGsYh4&t=70",
        testingChecklist: "assets/materials/tkd-curriculum-green-belt.png",
        image: "assets/Images/belts/green-belt.svg"
    },
    {
        name: "High Green Belt",
        slug: "high-green",
        focus: "Footwork triangles, counter-sparring, and advanced combination control.",
        studyGuide: "https://youtu.be/Lt917gacJho?si=aQT6Da0ymYxaaIfl&t=90",
        testingChecklist: "assets/materials/tkd-curriculum-high-green-belt.png",
        image: "assets/Images/belts/high-green-belt.svg"
    },
    {
        name: "Blue Belt",
        slug: "blue",
        focus: "Ring control, board breaks, and intermediate sparring strategies.",
        studyGuide: "https://youtu.be/VdqNEAHWCBM?si=HZPlrrTmsxkAiQPV&t=75",
        testingChecklist: "assets/materials/tkd-curriculum-blue-belt.png",
        image: "assets/Images/belts/blue-belt.svg"
    },
    {
        name: "High Blue Belt",
        slug: "high-blue",
        focus: "Leadership reps, spin kicks, and coaching cues for junior students.",
        studyGuide: "https://youtu.be/jcBwWo4wN7c?si=1yGokYoeRXDiLY5F&t=55",
        testingChecklist: "assets/materials/tkd-curriculum-high-blue-belt.png",
        image: "assets/Images/belts/high-blue-belt.svg"
    },
    {
        name: "Red Belt",
        slug: "red",
        focus: "Demo-ready power, teaching readiness, and board-break creativity.",
        studyGuide: "https://youtu.be/6FUM1p6qqhQ?si=QFCP9UYnsTvd-qcZ&t=61",
        testingChecklist: "assets/materials/tkd-curriculum-red-belt.png",
        image: "assets/Images/belts/red-belt.svg"
    },
    {
        name: "High Red Belt",
        slug: "high-red",
        focus: "Testing rehearsals, mentoring, and black-belt mindset assignments.",
        studyGuide: "https://youtu.be/Gr_Je2ZkgkI?si=bZp1cCvGdrXIRr3W&t=67",
        testingChecklist: "assets/materials/tkd-curriculum-high-red-belt.png",
        image: "assets/Images/belts/high-red-belt.svg"
    },
    {
        name: "Black Belt",
        slug: "black",
        focus: "Sharpen every pillar—forms, sparring, weapons, and service.",
        studyGuide: "assets/materials/black-belt-study-guide.md",
        testingChecklist: "assets/materials/black-belt-testing-checklist.md",
        image: "assets/Images/belts/black-belt.svg"
    },
    {
        name: "Black Belt 2nd Dan",
        slug: "black-2nd-dan",
        focus: "Lead classes with confidence while deepening creative poomsae, sparring strategy, and service projects.",
        studyGuide: "assets/materials/black-2nd-dan-belt-study-guide.md",
        testingChecklist: "assets/materials/black-2nd-dan-belt-testing-checklist.md",
        image: "assets/Images/belts/black-2nd-dan-belt.svg"
    },
    {
        name: "Black Belt 3rd Dan",
        slug: "black-3rd-dan",
        focus: "Coach tournament teams, design curriculum, and demonstrate precision across advanced poomsae and board breaks.",
        studyGuide: "assets/materials/black-3rd-dan-belt-study-guide.md",
        testingChecklist: "assets/materials/black-3rd-dan-belt-testing-checklist.md",
        image: "assets/Images/belts/black-3rd-dan-belt.svg"
    },
    {
        name: "Black Belt 4th Dan",
        slug: "black-4th-dan",
        focus: "Master-level leadership: instructor certification, school mentorship, and community impact planning.",
        studyGuide: "assets/materials/black-4th-dan-belt-study-guide.md",
        testingChecklist: "assets/materials/black-4th-dan-belt-testing-checklist.md",
        image: "assets/Images/belts/black-4th-dan-belt.svg"
    }
];

const BELT_ALIAS_MAPPINGS = [
    {
        slug: "black-2nd-dan",
        keywords: ["2nd dan", "second dan", "2nd degree"]
    },
    {
        slug: "black-3rd-dan",
        keywords: ["3rd dan", "third dan", "3rd degree"]
    },
    {
        slug: "black-4th-dan",
        keywords: ["4th dan", "fourth dan", "4th degree"]
    }
];

const portalEls = {
    form: document.getElementById("student-login-form"),
    studentId: document.getElementById("student-id"),
    studentDob: document.getElementById("student-dob"),
    status: document.getElementById("portal-error"),
    placeholder: document.getElementById("portal-placeholder"),
    app: document.getElementById("portal-app"),
    studentName: document.getElementById("portal-student-name"),
    studentIdDisplay: document.getElementById("portal-student-id"),
    currentBelt: document.getElementById("portal-current-belt"),
    nextBelt: document.getElementById("portal-next-belt"),
    beltGrid: document.getElementById("belt-grid"),
    certificateLog: document.getElementById("certificate-log"),
    logout: document.getElementById("portal-logout"),
    refresh: document.getElementById("portal-refresh"),
    beltTestApplicationBtn: document.getElementById("belt-test-application-btn"),
    beltTestForm: document.getElementById("belt-test-form"),
    testStudentName: document.getElementById("test-student-name"),
    testStudentId: document.getElementById("test-student-id"),
    currentBeltForm: document.getElementById("current-belt"),
    desiredBelt: document.getElementById("desired-belt"),
    testDate: document.getElementById("test-date"),
    beltTestStatus: document.getElementById("belt-test-status"),
    adminForm: document.getElementById("admin-auth-form"),
    adminKeyInput: document.getElementById("admin-key"),
    adminStatus: document.getElementById("admin-status"),
    adminDashboard: document.getElementById("admin-dashboard"),
    adminSummaryBody: document.getElementById("admin-summary-body"),
    adminEventsList: document.getElementById("admin-events-list")
};

console.log("portalEls:", portalEls); // Debugging line

const portalState = {
    students: [],
    activeStudent: null,
    isLoading: true,
    progress: readStore(STORAGE_KEYS.progress),
    certificates: readStore(STORAGE_KEYS.certificates),
    admin: {
        key: null,
        isLoading: false,
        summary: [],
        events: [],
        generatedAt: null
    }
};

document.addEventListener("DOMContentLoaded", () => {
    attachHandlers();
    loadStudents();

    if (HAS_REMOTE_API) {
        attemptRestoreAdminSession();
    } else {
        if (portalEls.adminDashboard) {
            portalEls.adminDashboard.hidden = true;
        }
        setAdminStatus(
            "Admin analytics will appear once the portal API is connected.",
            "progress"
        );
    }
});

function attachHandlers() {
    portalEls.form?.addEventListener("submit", handleLogin);
    portalEls.logout?.addEventListener("click", handleLogout);
    portalEls.refresh?.addEventListener("click", () => {
        if (portalState.activeStudent) {
            renderPortal();
            setStatus("Portal refreshed.", "success");
        }
    });
    portalEls.beltTestApplicationBtn?.addEventListener("click", toggleBeltTestForm);
    portalEls.beltTestForm?.addEventListener("submit", handleBeltTestApplication);
    portalEls.adminForm?.addEventListener("submit", handleAdminAuth);
}

async function loadStudents() {
    disableForm();
    try {
        const response = await fetch("/assets/data/students.json", { cache: "no-store" });
        if (!response.ok) {
            throw new Error("Could not load student roster.");
        }
        const data = await response.json();
        portalState.students = Array.isArray(data) ? data : [];
        portalState.isLoading = false;
        enableForm();
        attemptRestoreSession();
    } catch (error) {
        portalState.isLoading = false;
        disableForm();
        console.error(error);
        setStatus("Student roster is unavailable. Please try again later.");
    } finally {
        portalState.isLoading = false; // Ensure isLoading is always set to false
        enableForm(); // Ensure form is enabled even if loading fails
    }
}

function handleLogin(event) {
    event.preventDefault();
    console.log("handleLogin: function triggered."); // Debugging line
    if (portalState.isLoading) {
        setStatus("Still loading student roster. Please wait a moment.");
        console.log("handleLogin: portalState.isLoading is true, returning.");
        return;
    }

    const idValue = portalEls.studentId?.value.trim() ?? "";
    const dobValue = portalEls.studentDob?.value.trim() ?? "";
    console.log(`handleLogin: idValue=${idValue}, dobValue=${dobValue}`); // Debugging line

    if (!idValue || !dobValue) {
        setStatus("Enter both your Student ID and birthdate.");
        console.log("handleLogin: Missing ID or DOB."); // Debugging line
        return;
    }

    const match = portalState.students.find(
        (record) => record.id.toLowerCase() === idValue.toLowerCase()
    );

    if (!match) {
        setStatus("We couldn't find that Student ID. Double-check with the office.");
        console.log("handleLogin: No student match found."); // Debugging line
        return;
    }

    if (match.birthDate !== dobValue) {
        setStatus("That birthdate does not match our records.");
        console.log("handleLogin: Birthdate mismatch."); // Debugging line
        return;
    }

    portalState.activeStudent = match;
    persistSession(match.id);
    portalEls.form?.reset();
    setStatus(`Welcome back, ${match.name.split(" ")[0]}!`, "success");
    console.log("handleLogin: Calling renderPortal()");
    recordPortalActivity(match.id, "login");
    syncStudentProgress(match.id).finally(() => renderPortal());
}

function handleLogout() {
    portalState.activeStudent = null;
    clearSession();
    togglePortal(false);
    setStatus("You have signed out. Come back soon!", "success");
}

function attemptRestoreSession() {
    const savedId = readSession();
    if (!savedId) return;
    const match = portalState.students.find(
        (record) => record.id.toLowerCase() === savedId.toLowerCase()
    );
    if (match) {
        portalState.activeStudent = match;
        setStatus(`Welcome back, ${match.name.split(" ")[0]}!`, "success");
        syncStudentProgress(match.id, { silent: true }).finally(() => renderPortal());
    }
}

function renderPortal() {
    const student = portalState.activeStudent;
    if (!student) {
        console.log("renderPortal: No active student, calling togglePortal(false)");
        togglePortal(false);
        return;
    }

    console.log("renderPortal: Active student found, calling togglePortal(true)");
    togglePortal(true);
    portalEls.studentName.textContent = student.name;
    portalEls.studentIdDisplay.textContent = student.id;

    const unlockedIndex = ensureUnlockedIndex(student);
    const progress = portalState.progress[student.id] ?? {};
    const awardedIndex =
        typeof progress.awardedIndex === "number"
            ? progress.awardedIndex
            : computeAwardedIndex(student, unlockedIndex);

    portalEls.currentBelt.textContent =
        BELT_SEQUENCE[awardedIndex]?.name ?? student.currentBelt ?? "White Belt";

    const hasNext =
        unlockedIndex > awardedIndex && unlockedIndex < BELT_SEQUENCE.length;
    const nextBeltName = hasNext ? BELT_SEQUENCE[unlockedIndex]?.name : null;
    portalEls.nextBelt.textContent = nextBeltName ?? "You're at the final belt!";

    renderBeltGrid(student, unlockedIndex, awardedIndex);
    renderCertificateLog(student);
    toggleBeltTestForm(false); // Hide form on portal render
}

function recordPortalActivity(studentId, action = "login") {
    if (!studentId || !HAS_REMOTE_API) return Promise.resolve();
    const url = buildApiUrl("/portal/login-event");
    if (!url) return Promise.resolve();
    const payload = {
        studentId,
        action,
        actor: "student"
    };

    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        mode: "cors",
        credentials: "omit"
    }).then((response) => {
        if (!response.ok) {
            throw new Error(`Failed to record activity (${response.status})`);
        }
        return response.json();
    }).catch((error) => {
        console.warn("recordPortalActivity error:", error);
    });
}

function recordCertificateProgress(studentId, belt, certificate) {
    if (!studentId || !belt || !HAS_REMOTE_API) return Promise.resolve();
    const url = buildApiUrl("/portal/progress");
    if (!url) return Promise.resolve();
    const payload = {
        studentId,
        beltSlug: belt.slug,
        fileName: certificate.fileName || "",
        uploadedAt: certificate.uploadedAt
    };

    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        mode: "cors",
        credentials: "omit"
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to store progress (${response.status})`);
            }
            return response.json();
        })
        .catch((error) => {
            console.warn("recordCertificateProgress error:", error);
        });
}

function syncStudentProgress(studentId, options = {}) {
    if (!studentId || !HAS_REMOTE_API) return Promise.resolve();
    const { silent = false } = options;
    const url = buildApiUrl(`/portal/progress/${encodeURIComponent(studentId)}`);
    if (!url) return Promise.resolve();

    return fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit"
    })
        .then((response) => {
            if (response.status === 404) {
                return { records: [] };
            }
            if (!response.ok) {
                throw new Error(`Progress sync failed (${response.status})`);
            }
            return response.json();
        })
        .then((data) => {
            const records = Array.isArray(data.records) ? data.records : [];
            const student = portalState.activeStudent;
            if (!student) return;

            const baseIndex = resolveBeltIndex(student.currentBelt);
            const defaultUnlocked = baseIndex >= BELT_SEQUENCE.length - 1 ? baseIndex : baseIndex + 1;
            const lastIndex = BELT_SEQUENCE.length - 1;

            let serverAwarded = baseIndex;
            let serverUnlocked = defaultUnlocked;

            const certificateMap = portalState.certificates[student.id] ?? {};

            records.forEach((record) => {
                const belt = resolveBeltDataBySlug(record.beltSlug);
                if (!belt) return;
                const beltIndex = resolveBeltIndex(belt.name);
                serverAwarded = Math.max(serverAwarded, beltIndex);
                serverUnlocked = Math.max(serverUnlocked, Math.min(beltIndex + 1, lastIndex));

                const existing = certificateMap[belt.name] ?? {};
                certificateMap[belt.name] = {
                    belt: belt.name,
                    beltSlug: belt.slug,
                    uploadedAt: record.uploadedAt,
                    fileName: record.fileName || existing.fileName || "Certificate uploaded",
                    dataUrl: existing.dataUrl || null,
                    source: existing.dataUrl ? "local" : "server"
                };
            });

            portalState.certificates[student.id] = certificateMap;
            persistCertificates();

            const existingProgress = portalState.progress[student.id] ?? {};
            const mergedUnlocked = Math.max(
                defaultUnlocked,
                existingProgress.unlockedIndex ?? defaultUnlocked,
                serverUnlocked
            );
            const mergedAwarded = Math.max(existingProgress.awardedIndex ?? baseIndex, serverAwarded);

            portalState.progress[student.id] = {
                unlockedIndex: mergedUnlocked,
                awardedIndex: mergedAwarded
            };
            persistProgress();

            if (!silent && records.length) {
                setStatus("Progress synced with the studio.", "success");
            }
        })
        .catch((error) => {
            if (!silent) {
                setStatus("Could not sync progress right now.");
            }
            console.warn("syncStudentProgress error:", error);
        });
}

function handleAdminAuth(event) {
    event.preventDefault();
    if (!portalEls.adminKeyInput) return;

    if (!HAS_REMOTE_API) {
        setAdminStatus("Connect the portal API before using admin tools.");
        return;
    }
    const key = portalEls.adminKeyInput.value.trim();

    if (!key) {
        setAdminStatus("Enter the admin key to continue.");
        return;
    }

    setAdminStatus("Loading activity...", "progress");
    loadAdminActivity(key);
}

function attemptRestoreAdminSession() {
    if (!HAS_REMOTE_API) {
        return;
    }
    try {
        const stored = sessionStorage.getItem(ADMIN_STORAGE_KEY);
        if (stored) {
            if (portalEls.adminKeyInput) {
                portalEls.adminKeyInput.value = stored;
            }
            loadAdminActivity(stored, { silent: true });
        }
    } catch (error) {
        console.warn("Unable to restore admin session:", error);
    }
}

function loadAdminActivity(adminKey, options = {}) {
    if (!HAS_REMOTE_API) {
        setAdminStatus("Admin dashboard is disabled until the portal API is connected.");
        return;
    }
    if (!adminKey) return;
    portalState.admin.isLoading = true;
    const url = buildApiUrl("/portal/admin/activity");
    if (!url) return;

    fetch(url, {
        method: "GET",
        headers: {
            "X-Admin-Key": adminKey
        },
        mode: "cors",
        credentials: "omit"
    })
        .then((response) => {
            if (response.status === 401) {
                throw new Error("Invalid admin key.");
            }
            if (!response.ok) {
                throw new Error(`Failed to load activity (${response.status})`);
            }
            return response.json();
        })
        .then((data) => {
            portalState.admin.key = adminKey;
            portalState.admin.summary = (Array.isArray(data.summary) ? data.summary : []).map((entry) => ({
                studentId: entry.studentId ?? entry.student_id,
                totalEvents: entry.totalEvents ?? entry.total_events ?? 0,
                loginEvents: entry.loginEvents ?? entry.login_events ?? 0,
                lastEventAt: entry.lastEventAt ?? entry.last_event ?? null,
                latestBelt: entry.latestBelt ?? entry.latest_belt ?? null,
                latestBeltUploadedAt: entry.latestBeltUploadedAt ?? entry.latest_belt_uploaded ?? null
            }));
            portalState.admin.events = (Array.isArray(data.events) ? data.events : []).map((event) => ({
                studentId: event.studentId ?? event.student_id,
                action: event.action,
                actor: event.actor,
                recordedAt: event.recordedAt ?? event.created_at ?? null
            }));
            portalState.admin.generatedAt = data.generatedAt ?? null;
            try {
                sessionStorage.setItem(ADMIN_STORAGE_KEY, adminKey);
            } catch (error) {
                console.warn("Unable to persist admin key:", error);
            }
            renderAdminDashboard();
            if (!silent) {
                setAdminStatus(
                    portalState.admin.summary.length
                        ? "Dashboard updated."
                        : "No activity logged yet.",
                    "success"
                );
            }
        })
        .catch((error) => {
            console.error("Admin activity error:", error);
            if (!silent) {
                setAdminStatus(error.message || "Unable to load activity right now.");
            }
            portalState.admin.key = null;
            portalState.admin.summary = [];
            portalState.admin.events = [];
            portalState.admin.generatedAt = null;
            if (portalEls.adminDashboard) {
                portalEls.adminDashboard.hidden = true;
            }
            try {
                sessionStorage.removeItem(ADMIN_STORAGE_KEY);
            } catch (err) {
                console.warn(err);
            }
        })
        .finally(() => {
            portalState.admin.isLoading = false;
        });
}

function renderAdminDashboard() {
    if (!portalEls.adminDashboard || !portalEls.adminSummaryBody || !portalEls.adminEventsList) {
        return;
    }

    if (!HAS_REMOTE_API) {
        portalEls.adminDashboard.hidden = true;
        return;
    }

    portalEls.adminDashboard.hidden = false;

    const summaryBody = portalEls.adminSummaryBody;
    summaryBody.innerHTML = "";

    if (!portalState.admin.summary.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.textContent = "No student activity has been recorded yet.";
        row.appendChild(cell);
        summaryBody.appendChild(row);
    } else {
        portalState.admin.summary.forEach((entry) => {
            const row = document.createElement("tr");
            const studentCell = document.createElement("td");
            studentCell.textContent = entry.studentId;

            const totalCell = document.createElement("td");
            totalCell.textContent = String(entry.totalEvents ?? 0);

            const loginCell = document.createElement("td");
            loginCell.textContent = String(entry.loginEvents ?? 0);

            const latestCell = document.createElement("td");
            if (entry.latestBelt) {
                const beltData = resolveBeltDataBySlug(entry.latestBelt);
                const beltName = beltData ? beltData.name : entry.latestBelt;
                latestCell.innerHTML = `<strong>${beltName}</strong>`;
                if (entry.latestBeltUploadedAt) {
                    const note = document.createElement("div");
                    note.className = "certificate-meta";
                    note.textContent = `Updated ${formatDateTime(entry.latestBeltUploadedAt)}`;
                    latestCell.appendChild(note);
                }
            } else {
                latestCell.textContent = "—";
            }

            const lastCell = document.createElement("td");
            lastCell.textContent = entry.lastEventAt ? formatDateTime(entry.lastEventAt) : "—";

            row.append(studentCell, totalCell, loginCell, latestCell, lastCell);
            summaryBody.appendChild(row);
        });
    }

    const eventsList = portalEls.adminEventsList;
    eventsList.innerHTML = "";
    if (!portalState.admin.events.length) {
        const item = document.createElement("li");
        item.textContent = "No recent events logged.";
        eventsList.appendChild(item);
    } else {
        portalState.admin.events.forEach((event) => {
            const item = document.createElement("li");
            const meta = document.createElement("span");
            meta.className = "admin-event-meta";
            meta.textContent = formatDateTime(event.recordedAt);

            const details = document.createElement("span");
            details.innerHTML = `<strong>${event.studentId}</strong> · ${formatActionLabel(event.action)}`;

            item.append(meta, details);
            eventsList.appendChild(item);
        });
    }
}

function setAdminStatus(message, variant = "error") {
    if (!portalEls.adminStatus) return;
    if (!HAS_REMOTE_API && variant !== "error") {
        portalEls.adminStatus.textContent = message;
        portalEls.adminStatus.classList.remove("is-success", "is-progress");
        portalEls.adminStatus.classList.add("is-progress");
        return;
    }
    portalEls.adminStatus.textContent = message;
    portalEls.adminStatus.classList.toggle("is-success", variant === "success");
    portalEls.adminStatus.classList.toggle("is-progress", variant === "progress");
}

function renderBeltGrid(student, unlockedIndex, awardedIndex) {
    if (!portalEls.beltGrid) return;
    portalEls.beltGrid.innerHTML = "";
    const studentCertificates = portalState.certificates[student.id] ?? {};
    const safeAwardedIndex =
        typeof awardedIndex === "number"
            ? awardedIndex
            : computeAwardedIndex(student, unlockedIndex);

    BELT_SEQUENCE.forEach((belt, index) => {
        const card = document.createElement("article");
        card.className = "belt-card";
        if (index > unlockedIndex) {
            card.classList.add("locked");
        }

        const isAwarded = index <= safeAwardedIndex;
        const isActive = index === unlockedIndex && unlockedIndex > safeAwardedIndex;

        const titleRow = document.createElement("div");
        titleRow.className = "belt-card__head";

        const title = document.createElement("h4");
        title.textContent = belt.name;

        const badge = document.createElement("span");
        badge.classList.add("badge");
        if (isAwarded) {
            badge.classList.add("badge-unlocked");
            badge.textContent = "Awarded";
        } else if (isActive) {
            badge.classList.add("badge-awaiting");
            badge.textContent = "Up Next";
        } else {
            badge.classList.add("badge-locked");
            badge.textContent = "Locked";
        }

        titleRow.append(title, badge);
        card.append(titleRow);

        if (belt.image) {
            const beltImg = document.createElement("img");
            beltImg.src = belt.image;
            beltImg.alt = `${belt.name} illustration`;
            beltImg.className = "belt-card__image";
            beltImg.loading = "lazy";
            card.append(beltImg);
        }

        const resources = document.createElement("div");
        resources.className = "resource-links";
        const isVideoGuide =
            typeof belt.studyGuide === "string" && VIDEO_EXTENSIONS.test(belt.studyGuide);
        const studyLabel =
            isVideoGuide ||
            belt.studyGuide?.includes("youtube.com") ||
            belt.studyGuide?.includes("youtu.be")
            ? "Video Study Guide"
            : index <= unlockedIndex
            ? "Download Study Guide"
            : "Study Guide";
        const studyLink = makeResourceLink(studyLabel, belt.studyGuide, index <= unlockedIndex);
        const testingLink = makeResourceLink(
            index <= unlockedIndex ? "Download Checklist" : "Testing Checklist",
            belt.testingChecklist,
            index <= unlockedIndex
        );
        if (index <= unlockedIndex && !isVideoGuide) {
            applyDownloadFilename(studyLink, belt.studyGuide, `${belt.slug}-study-guide`);
            applyDownloadFilename(testingLink, belt.testingChecklist, `${belt.slug}-testing-checklist`);
        }
        resources.append(studyLink, testingLink);
        card.append(resources);

        const certificateData = studentCertificates[belt.name];
        const status = document.createElement("p");
        status.className = "certificate-status";
        if (certificateData) {
            status.textContent = `Awarded ${formatDate(certificateData.uploadedAt)} • ${certificateData.fileName}`;
        } else if (isActive) {
            status.textContent =
                "Upload your certificate to award this belt and unlock the next rank instantly.";
        } else if (isAwarded) {
            status.textContent =
                "Belt awarded. Upload your certificate to keep a copy in your locker.";
        } else {
            status.textContent = "Keep training—this belt will unlock soon.";
        }
        card.append(status);

        if (certificateData?.dataUrl) {
            const downloadRow = document.createElement("div");
            downloadRow.className = "certificate-action";
            const downloadBtn = document.createElement("button");
            downloadBtn.type = "button";
            downloadBtn.className = "text-link-btn";
            downloadBtn.textContent = "Download certificate";
            downloadBtn.addEventListener("click", () => downloadCertificate(student.id, belt.name));
            downloadRow.append(downloadBtn);
            card.append(downloadRow);
        }

        if (isActive) {
            const actionRow = document.createElement("div");
            actionRow.className = "certificate-action";
            const uploadBtn = document.createElement("button");
            uploadBtn.type = "button";
            uploadBtn.className = "secondary-btn";
            uploadBtn.textContent =
                index === BELT_SEQUENCE.length - 1 ? "Upload Final Certificate" : "Upload Certificate";

            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = ACCEPTED_TYPES.join(",");
            // Use absolute positioning and opacity to hide it, but keep it interactive for programmatic clicks
            fileInput.style.position = "absolute";
            fileInput.style.left = "-9999px"; // Move off-screen
            fileInput.style.opacity = "0";
            fileInput.style.width = "1px";
            fileInput.style.height = "1px";
            fileInput.style.overflow = "hidden";
            fileInput.style.zIndex = "-1";

            uploadBtn.addEventListener("click", () => fileInput.click());
            fileInput.addEventListener("change", (event) => {
                const target = event.target;
                const file = target.files && target.files[0];
                if (file) {
                    handleCertificateUpload(file, belt, index);
                }
                target.value = "";
            });

            actionRow.append(uploadBtn, fileInput);
            card.append(actionRow);
        }

        portalEls.beltGrid.append(card);
    });
}

function renderCertificateLog(student) {
    if (!portalEls.certificateLog) return;
    portalEls.certificateLog.innerHTML = "";

    const heading = document.createElement("h4");
    heading.textContent = "Certificate Uploads";
    portalEls.certificateLog.append(heading);

    const studentCertificates = portalState.certificates[student.id];
    if (!studentCertificates || Object.keys(studentCertificates).length === 0) {
        const empty = document.createElement("p");
        empty.textContent =
            "Upload your certificate after each belt test to unlock the next belt instantly.";
        portalEls.certificateLog.append(empty);
        return;
    }

    const list = document.createElement("ul");
    list.className = "certificate-list";
    Object.values(studentCertificates)
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .forEach((certificate) => {
            const item = document.createElement("li");
            const meta = document.createElement("div");
            meta.innerHTML = `<strong>${certificate.belt}</strong><br><span class="certificate-meta">${formatDate(
                certificate.uploadedAt
            )} • ${certificate.fileName}</span>`;

            item.append(meta);

            if (certificate.dataUrl) {
                const downloadBtn = document.createElement("button");
                downloadBtn.type = "button";
                downloadBtn.textContent = "Download";
                downloadBtn.addEventListener("click", () =>
                    downloadCertificate(student.id, certificate.belt)
                );
                item.append(downloadBtn);
            }
            list.append(item);
        });

    portalEls.certificateLog.append(list);
}

function handleCertificateUpload(file, belt, beltIndex) {
    if (!portalState.activeStudent) return;

    if (file.size > MAX_FILE_SIZE) {
        setStatus("Files up to 3MB please. Compress large photos or PDFs.", "error");
        return;
    }

    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
        setStatus("Use PDF or image formats (JPG, PNG, HEIC).", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (!dataUrl) {
            setStatus("We couldn't read that file. Please try again.");
            return;
        }

        const payload = {
            belt: belt.name,
            beltSlug: belt.slug,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            dataUrl,
            source: "local"
        };

        storeCertificate(portalState.activeStudent.id, payload);

        const nextUnlockIndex = beltIndex + 1;
        updateProgress(portalState.activeStudent.id, nextUnlockIndex);
        recordPortalActivity(portalState.activeStudent.id, `certificate:${belt.slug}`);

        const syncPromise = HAS_REMOTE_API
            ? recordCertificateProgress(portalState.activeStudent.id, belt, payload)
            : Promise.resolve();

        const hasNext = nextUnlockIndex < BELT_SEQUENCE.length;
        const nextBeltName = hasNext ? BELT_SEQUENCE[nextUnlockIndex].name : null;
        const successMessage = hasNext
            ? `${belt.name} awarded! ${nextBeltName} is now unlocked—let's go!`
            : `${belt.name} awarded! You've reached the highest rank—outstanding work!`;

        setStatus(successMessage, "success");
        renderPortal();

        syncPromise.finally(() => {
            syncStudentProgress(portalState.activeStudent.id, { silent: true });
        });
    };

    reader.onerror = () => {
        setStatus("Something went wrong while reading that file.");
    };

    setStatus("Processing certificate...", "progress");
    reader.readAsDataURL(file);
}

function applyDownloadFilename(link, href, baseName) {
    if (!link || !href) return;
    let extension = "";
    try {
        const url = new URL(href, window.location.origin);
        const path = url.pathname || "";
        const match = path.match(/\.([a-z0-9]+)$/i);
        if (!match) {
            return;
        }
        extension = match[1];
    } catch (error) {
        const cleanHref = href.split("#")[0];
        const lastSlash = cleanHref.lastIndexOf("/");
        const segment = lastSlash >= 0 ? cleanHref.slice(lastSlash + 1) : cleanHref;
        const dotIndex = segment.lastIndexOf(".");
        if (dotIndex === -1) {
            return;
        }
        extension = segment.slice(dotIndex + 1);
    }
    if (!extension) return;
    link.setAttribute("download", `${baseName}.${extension}`);
}

function makeResourceLink(label, href, isUnlocked) {
    const link = document.createElement("a");
    link.className = "secondary-btn";
    link.textContent = label;
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener";
    if (!isUnlocked) {
        link.setAttribute("aria-disabled", "true");
    }
    return link;
}

function ensureUnlockedIndex(student) {
    const baseIndex = resolveBeltIndex(student.currentBelt);
    const targetIndex = baseIndex >= BELT_SEQUENCE.length - 1 ? baseIndex : baseIndex + 1;
    const stored = portalState.progress[student.id]?.unlockedIndex;
    const normalized =
        typeof stored === "number"
            ? Math.min(Math.max(stored, targetIndex), BELT_SEQUENCE.length - 1)
            : targetIndex;

    const awardedIndex = computeAwardedIndex(student, normalized);

    if (
        !portalState.progress[student.id] ||
        portalState.progress[student.id].unlockedIndex !== normalized ||
        portalState.progress[student.id].awardedIndex !== awardedIndex
    ) {
        portalState.progress[student.id] = { unlockedIndex: normalized, awardedIndex };
        persistProgress();
    }

    return normalized;
}

function updateProgress(studentId, unlockedIndex) {
    const cappedUnlock = Math.min(unlockedIndex, BELT_SEQUENCE.length - 1);
    const student =
        findStudentRecord(studentId) ??
        (portalState.activeStudent?.id === studentId ? portalState.activeStudent : null);
    const awardedIndex = computeAwardedIndex(student, cappedUnlock);

    portalState.progress[studentId] = {
        unlockedIndex: cappedUnlock,
        awardedIndex
    };
    persistProgress();
}

function storeCertificate(studentId, certificate) {
    if (!portalState.certificates[studentId]) {
        portalState.certificates[studentId] = {};
    }
    portalState.certificates[studentId][certificate.belt] = {
        ...certificate,
        source: certificate.source || "local"
    };
    persistCertificates();
}

function downloadCertificate(studentId, beltName) {
    const studentCertificates = portalState.certificates[studentId];
    if (!studentCertificates) return;
    const certificate = studentCertificates[beltName];
    if (!certificate) return;

    const link = document.createElement("a");
    link.href = certificate.dataUrl;
    link.download = certificate.fileName || `${beltName}-certificate`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function togglePortal(show) {
    if (!portalEls.app || !portalEls.placeholder) {
        console.log("togglePortal: portalEls.app or portalEls.placeholder not found.");
        return;
    }
    console.log(`togglePortal: Setting portalEls.app.hidden to ${!show} (current: ${portalEls.app.hidden})`);
    console.log(`togglePortal: Setting portalEls.placeholder.style.display to ${show ? "none" : "block"} (current: ${portalEls.placeholder.style.display})`);
    portalEls.app.hidden = !show;
    portalEls.placeholder.style.display = show ? "none" : "block";

    if (show) {
        // Scroll to the portal-app section after successful login
        portalEls.app?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function setStatus(message, variant = "error") {
    if (!portalEls.status) return;
    console.log(`setStatus: Message: "${message}", Variant: "${variant}"`); // Debugging line
    portalEls.status.textContent = message;
    if (variant === "success") {
        portalEls.status.classList.add("is-success");
        portalEls.status.classList.remove("is-error");
        portalEls.status.classList.remove("is-progress");
    } else if (variant === "progress") {
        portalEls.status.classList.add("is-progress");
        portalEls.status.classList.remove("is-success");
        portalEls.status.classList.remove("is-error");
    } else { // default to error
        portalEls.status.classList.add("is-error");
        portalEls.status.classList.remove("is-success");
        portalEls.status.classList.remove("is-progress");
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatActionLabel(action) {
    const normalized = (action || "").toString().trim();
    if (!normalized) return "Activity";

    const lower = normalized.toLowerCase();
    if (lower.startsWith("certificate")) {
        const [, slug] = lower.split(":");
        const beltData = slug ? resolveBeltDataBySlug(slug) : null;
        const beltName = beltData ? beltData.name : slug || "belt";
        return `Certificate · ${beltName}`;
    }

    return normalized
        .split(/[\s:_-]+/)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}

function enableForm() {
    const button = portalEls.form?.querySelector("button[type='submit']");
    if (button) {
        button.disabled = false;
    }
}

function disableForm() {
    const button = portalEls.form?.querySelector("button[type='submit']");
    if (button) {
        button.disabled = true;
    }
}

function toggleBeltTestForm(show) {
    if (!portalEls.beltTestForm || !portalState.activeStudent) return;

    if (show === true || (show === undefined && portalEls.beltTestForm.hidden)) {
        portalEls.beltTestForm.hidden = false;
        portalEls.testStudentName.value = portalState.activeStudent.name;
        portalEls.testStudentId.value = portalState.activeStudent.id;
        portalEls.currentBeltForm.value = portalState.activeStudent.currentBelt || "White Belt";
        portalEls.desiredBelt.value = BELT_SEQUENCE[ensureUnlockedIndex(portalState.activeStudent)]?.name || "";
        portalEls.beltTestStatus.textContent = "";
    } else {
        portalEls.beltTestForm.hidden = true;
        portalEls.beltTestForm.reset();
    }
}

async function handleBeltTestApplication(event) {
    event.preventDefault();
    if (!portalState.activeStudent) {
        setStatus("Please log in to submit a belt test application.", "error");
        return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const studentName = formData.get("studentName");
    const studentId = formData.get("studentId");
    const currentBelt = formData.get("currentBelt");
    const desiredBelt = formData.get("desiredBelt");
    const preferredTestDate = formData.get("preferredTestDate");
    const message = formData.get("message");

    if (!studentName || !studentId || !currentBelt || !desiredBelt || !preferredTestDate) {
        portalEls.beltTestStatus.textContent = "Please fill in all required fields.";
        portalEls.beltTestStatus.classList.remove("is-success");
        return;
    }

    try {
        const response = await fetch(form.action, {
            method: form.method,
            body: new URLSearchParams(formData).toString(),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });

        if (response.ok) {
            portalEls.beltTestStatus.textContent = "Belt test application submitted successfully! Master Ara will review it shortly.";
            portalEls.beltTestStatus.classList.add("is-success");
            form.reset();
            toggleBeltTestForm(false);
        } else {
            portalEls.beltTestStatus.textContent = "There was an error submitting your application. Please try again.";
            portalEls.beltTestStatus.classList.remove("is-success");
        }
    } catch (error) {
        console.error("Belt test application submission error:", error);
        portalEls.beltTestStatus.textContent = "Network error. Please check your connection and try again.";
        portalEls.beltTestStatus.classList.remove("is-success");
    }
}

function persistSession(studentId) {
    try {
        sessionStorage.setItem(STORAGE_KEYS.session, studentId);
    } catch (error) {
        console.warn("Session storage is unavailable", error);
    }
}

function clearSession() {
    try {
        sessionStorage.removeItem(STORAGE_KEYS.session);
    } catch (error) {
        console.warn("Session storage is unavailable", error);
    }
}

function readSession() {
    try {
        return sessionStorage.getItem(STORAGE_KEYS.session);
    } catch (error) {
        console.warn("Session storage is unavailable", error);
        return null;
    }
}

function readStore(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.warn("Local storage is unavailable", error);
        return {};
    }
}

function persistProgress() {
    writeStore(STORAGE_KEYS.progress, portalState.progress);
}

function persistCertificates() {
    writeStore(STORAGE_KEYS.certificates, portalState.certificates);
}

function writeStore(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn("Unable to save data", error);
        setStatus("Storage is full or disabled. Clear space and try again.");
    }
}

function findStudentRecord(studentId) {
    if (!studentId) return null;
    const normalizedId = studentId.toLowerCase();
    return (
        portalState.students.find(
            (record) => record.id && record.id.toLowerCase() === normalizedId
        ) ?? null
    );
}

function computeAwardedIndex(student, unlockedIndex) {
    const lastIndex = BELT_SEQUENCE.length - 1;
    const safeUnlock = Math.min(Math.max(unlockedIndex, 0), lastIndex);
    const baseIndex = student ? resolveBeltIndex(student.currentBelt) : 0;

    if (safeUnlock >= lastIndex) {
        return Math.max(baseIndex, lastIndex);
    }

    const previousIndex = Math.max(0, safeUnlock - 1);
    return Math.max(baseIndex, previousIndex);
}

function resolveBeltIndex(beltName) {
    if (!beltName) return 0;
    const normalized = beltName.toLowerCase().trim();

    for (const alias of BELT_ALIAS_MAPPINGS) {
        if (alias.keywords.some((keyword) => normalized.includes(keyword))) {
            const aliasIndex = BELT_SEQUENCE.findIndex((belt) => belt.slug === alias.slug);
            if (aliasIndex >= 0) {
                return aliasIndex;
            }
        }
    }

    const exactMatch = BELT_SEQUENCE.findIndex(
        (belt) => belt.name.toLowerCase() === normalized
    );
    if (exactMatch >= 0) {
        return exactMatch;
    }

    const partialMatch = BELT_SEQUENCE.findIndex((belt) =>
        normalized.includes(belt.name.toLowerCase())
    );
    if (partialMatch >= 0) {
        return partialMatch;
    }

    if (normalized.includes("black")) {
        return BELT_SEQUENCE.length - 1;
    }

    return 0;
}

function resolveBeltDataBySlug(slug) {
    if (!slug) return null;
    const normalized = slug.toLowerCase();
    return (
        BELT_SEQUENCE.find((belt) => belt.slug === normalized) ||
        BELT_SEQUENCE.find((belt) => belt.slug === slug)
    ) || null;
}
