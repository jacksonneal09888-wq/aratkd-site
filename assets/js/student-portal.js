const STORAGE_KEYS = {
    progress: "araStudentProgress",
    certificates: "araStudentCertificates",
    session: "araStudentSession",
    sessionToken: "araStudentSessionToken",
    profile: "araStudentProfile"
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

const PORTAL_MODE =
    typeof document !== "undefined" && document.body
        ? document.body.dataset.portalMode || "student"
        : "student";
const IS_ADMIN_MODE = PORTAL_MODE === "admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // Allow certificate uploads up to 10MB
const ACCEPTED_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/heic",
    "image/heif"
];

const STRIPE_LABELS = {
    poomsae: "Forms/Poomsae",
    selfDefense: "Self-defense",
    boardBreaking: "Board Breaking",
    sparring: "Sparring"
};

const BELT_ATTENDANCE_TARGETS = {
    default: { lessons: 25, percent: 0.7 },
    white: { lessons: 25, percent: 0.7 },
    "high-white": { lessons: 25, percent: 0.7 },
    yellow: { lessons: 25, percent: 0.7 },
    "high-yellow": { lessons: 25, percent: 0.7 },
    green: { lessons: 25, percent: 0.7 },
    "high-green": { lessons: 30, percent: 0.743 },
    blue: { lessons: 30, percent: 0.743 },
    "high-blue": { lessons: 32, percent: 0.761 },
    red: { lessons: 42, percent: 0.848 },
    "high-red": { lessons: 48, percent: 0.9 }
};

const READINESS_STORAGE_KEY = "araReadinessTracker";
const ADMIN_VISIBILITY_KEY = "araAdminPanelVisible";

const CERTIFICATE_DB_NAME = "araPortalCertificates";
const CERTIFICATE_STORE_NAME = "certificates";

const certificateStorage = (() => {
    const hasIndexedDB = typeof indexedDB !== "undefined";
    if (!hasIndexedDB) {
        return {
            isAvailable: false,
            save: () => Promise.reject(new Error("IndexedDB is unavailable")),
            load: () => Promise.resolve(null),
            remove: () => Promise.resolve()
        };
    }

    let dbPromise = null;

    function openDb() {
        if (!dbPromise) {
            dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(CERTIFICATE_DB_NAME, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(CERTIFICATE_STORE_NAME)) {
                        db.createObjectStore(CERTIFICATE_STORE_NAME);
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () =>
                    reject(request.error || new Error("Failed to open certificate storage"));
            });
        }
        return dbPromise;
    }

    function save(key, file) {
        return openDb().then(
            (db) =>
                new Promise((resolve, reject) => {
                    const tx = db.transaction(CERTIFICATE_STORE_NAME, "readwrite");
                    tx.onerror = () => reject(tx.error || new Error("Certificate save failed"));
                    const store = tx.objectStore(CERTIFICATE_STORE_NAME);
                    const request = store.put(file, key);
                    request.onsuccess = () => resolve(true);
                    request.onerror = () =>
                        reject(request.error || new Error("Certificate save request failed"));
                })
        );
    }

    function load(key) {
        return openDb().then(
            (db) =>
                new Promise((resolve, reject) => {
                    const tx = db.transaction(CERTIFICATE_STORE_NAME, "readonly");
                    tx.onerror = () => reject(tx.error || new Error("Certificate load failed"));
                    const store = tx.objectStore(CERTIFICATE_STORE_NAME);
                    const request = store.get(key);
                    request.onsuccess = () => resolve(request.result || null);
                    request.onerror = () =>
                        reject(request.error || new Error("Certificate load request failed"));
                })
        );
    }

    function remove(key) {
        return openDb().then(
            (db) =>
                new Promise((resolve, reject) => {
                    const tx = db.transaction(CERTIFICATE_STORE_NAME, "readwrite");
                    tx.onerror = () => reject(tx.error || new Error("Certificate delete failed"));
                    const store = tx.objectStore(CERTIFICATE_STORE_NAME);
                    const request = store.delete(key);
                    request.onsuccess = () => resolve(true);
                    request.onerror = () =>
                        reject(request.error || new Error("Certificate delete request failed"));
                })
        );
    }

    return {
        isAvailable: true,
        save,
        load,
        remove
    };
})();

function loadReadinessStore() {
    if (typeof localStorage === "undefined") {
        return {};
    }
    try {
        const raw = localStorage.getItem(READINESS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.warn("Unable to read readiness tracker from storage.", error);
        return {};
    }
}

function persistReadinessStore() {
    if (typeof localStorage === "undefined") {
        return;
    }
    try {
        localStorage.setItem(READINESS_STORAGE_KEY, JSON.stringify(portalState.readiness));
    } catch (error) {
        console.warn("Unable to persist readiness tracker.", error);
    }
}

function getStripeTemplate(defaultValue = false) {
    return {
        poomsae: Boolean(defaultValue),
        selfDefense: Boolean(defaultValue),
        boardBreaking: Boolean(defaultValue),
        sparring: Boolean(defaultValue)
    };
}

function getReadinessEntry(studentId, beltSlug) {
    if (!studentId || !beltSlug) {
        return {
            classesOffered: 0,
            classesAttended: 0,
            stripes: getStripeTemplate(),
            updatedAt: null
        };
    }

    const studentData = portalState.readiness[studentId] || {};
    const entry = studentData[beltSlug];
    if (!entry) {
        return {
            classesOffered: 0,
            classesAttended: 0,
            stripes: getStripeTemplate(),
            updatedAt: null
        };
    }

    return {
        classesOffered: Number(entry.classesOffered) || 0,
        classesAttended: Number(entry.classesAttended) || 0,
        stripes: {
            poomsae: Boolean(entry.stripes?.poomsae),
            selfDefense: Boolean(entry.stripes?.selfDefense),
            boardBreaking: Boolean(entry.stripes?.boardBreaking),
            sparring: Boolean(entry.stripes?.sparring)
        },
        updatedAt: entry.updatedAt || null
    };
}

function saveReadinessEntry(studentId, beltSlug, payload) {
    if (!studentId || !beltSlug) return;
    if (!portalState.readiness[studentId]) {
        portalState.readiness[studentId] = {};
    }
    portalState.readiness[studentId][beltSlug] = {
        classesOffered: Number(payload.classesOffered) || 0,
        classesAttended: Number(payload.classesAttended) || 0,
        stripes: {
            ...getStripeTemplate(),
            ...(payload.stripes || {})
        },
        updatedAt: payload.updatedAt || new Date().toISOString()
    };
    persistReadinessStore();
}

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
    adminEventsList: document.getElementById("admin-events-list"),
    adminRefresh: document.getElementById("admin-refresh"),
    readinessWrapper: document.getElementById("portal-readiness"),
    readinessTargetLabel: document.getElementById("readiness-target-label"),
    readinessReadyPill: document.getElementById("readiness-ready-pill"),
    readinessForm: document.getElementById("readiness-form"),
    readinessClassesOffered: document.getElementById("readiness-classes-offered"),
    readinessClassesAttended: document.getElementById("readiness-classes-attended"),
    readinessStatus: document.getElementById("readiness-status"),
    readinessChecklist: document.getElementById("readiness-checklist"),
    readinessPercentDisplay: document.getElementById("readiness-percent-display"),
    readinessLessonDisplay: document.getElementById("readiness-lesson-display"),
    readinessStripeInputs: document.querySelectorAll("[data-stripe-field]"),
    beltTestCard: document.getElementById("belt-test-card"),
    beltTestHint: document.getElementById("belt-test-hint"),
    adminSection: document.getElementById("portal-admin-section"),
    adminGeneratedAt: document.getElementById("admin-generated-at"),
    brandReveal: document.querySelector("[data-admin-reveal]")
};

console.log("portalEls:", portalEls); // Debugging line

const portalState = {
    activeStudent: readStoredStudentProfile(),
    isLoading: false,
    progress: readStore(STORAGE_KEYS.progress),
    certificates: readStore(STORAGE_KEYS.certificates),
    sessionToken: readAuthToken(),
    readiness: loadReadinessStore(),
    currentReadiness: null,
    admin: {
        key: null,
        isLoading: false,
        summary: [],
        events: [],
        generatedAt: null
    }
};

normalizeStoredCertificates();
migrateLegacyCertificates();

document.addEventListener("DOMContentLoaded", () => {
    attachHandlers();
    setupAdminReveal();
    if (!IS_ADMIN_MODE) {
        if (HAS_REMOTE_API) {
            attemptRestoreSession();
        } else {
            setStatus("Portal login is temporarily unavailable. Please contact the studio.", "error");
            disableForm();
        }
    }

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
    portalEls.readinessForm?.addEventListener("submit", handleReadinessSubmit);
    portalEls.beltTestApplicationBtn?.addEventListener("click", handleBeltTestButton);
    portalEls.beltTestForm?.addEventListener("submit", handleBeltTestApplication);
    portalEls.adminForm?.addEventListener("submit", handleAdminAuth);
    portalEls.adminRefresh?.addEventListener("click", handleAdminRefresh);
}

async function handleLogin(event) {
    event.preventDefault();
    if (!HAS_REMOTE_API) {
        setStatus("Portal login is unavailable. Please contact the studio.");
        return;
    }
    if (portalState.isLoading) {
        setStatus("Already working on that request...");
        return;
    }

    const idValue = portalEls.studentId?.value.trim() ?? "";
    const dobValue = portalEls.studentDob?.value.trim() ?? "";

    if (!idValue || !dobValue) {
        setStatus("Enter both your Student ID and birthdate.");
        return;
    }

    portalState.isLoading = true;
    disableForm();

    try {
        setStatus("Signing you in...", "progress");
        const loginResponse = await authenticateStudent(idValue, dobValue);
        const token = loginResponse?.token;
        const studentProfile = loginResponse?.student;
        if (!token || !studentProfile) {
            throw new Error("Unable to authenticate with the portal.");
        }

        portalState.sessionToken = token;
        portalState.activeStudent = studentProfile;
        persistSession(studentProfile.id);
        persistAuthToken(token);
        persistStudentProfile(studentProfile);
        portalEls.form?.reset();

        if (Array.isArray(loginResponse?.progress?.records)) {
            applyServerProgressRecords(studentProfile, loginResponse.progress.records, {
                silent: true
            });
        }

        setStatus(`Welcome back, ${studentProfile.name.split(" ")[0]}!`, "success");
        await syncStudentProgress(studentProfile.id);
        renderPortal();
    } catch (error) {
        console.error("handleLogin: Authentication failed.", error);
        const message =
            error?.code === "UNAUTHORIZED"
                ? "We couldn't verify that Student ID and birthdate."
                : error?.message || "Unable to sign in right now. Please try again shortly.";
        setStatus(message);
        portalState.activeStudent = null;
        portalState.sessionToken = null;
        clearSession();
        togglePortal(false);
    } finally {
        portalState.isLoading = false;
        enableForm();
    }
}

function handleLogout() {
    portalState.activeStudent = null;
    portalState.sessionToken = null;
    portalState.currentReadiness = null;
    clearSession();
    togglePortal(false);
    setStatus("You have signed out. Come back soon!", "success");
}

async function attemptRestoreSession() {
    if (!HAS_REMOTE_API) {
        return;
    }

    const savedId = readSession();
    const token = portalState.sessionToken || readAuthToken();
    if (!savedId || !token) {
        clearSession();
        return;
    }

    portalState.sessionToken = token;
    const storedProfile = readStoredStudentProfile();
    if (
        storedProfile &&
        storedProfile.id &&
        storedProfile.id.toLowerCase() === savedId.toLowerCase()
    ) {
        portalState.activeStudent = storedProfile;
        renderPortal();
    }

    try {
        const profile = await fetchStudentProfile();
        if (!profile) {
            clearSession();
            togglePortal(false);
            return;
        }

        portalState.activeStudent = profile;
        persistStudentProfile(profile);
        persistSession(profile.id);
        renderPortal();
        await syncStudentProgress(profile.id, { silent: true });
    } catch (error) {
        if (error?.code === "UNAUTHORIZED") {
            portalState.sessionToken = null;
            portalState.activeStudent = null;
            clearSession();
            togglePortal(false);
            setStatus("Your session expired. Please sign in again.");
        } else {
            console.warn("attemptRestoreSession error:", error);
        }
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
    const nextBelt = hasNext ? BELT_SEQUENCE[unlockedIndex] : null;
    portalEls.nextBelt.textContent = nextBelt?.name ?? "You're at the final belt!";

    renderBeltGrid(student, unlockedIndex, awardedIndex);
    renderCertificateLog(student);
    const readinessState = renderReadinessCard(student, nextBelt);
    updateBeltTestAvailability(nextBelt, readinessState);
    toggleBeltTestForm(false); // Hide form on portal render
}

async function authenticateStudent(studentId, birthDate) {
    const url = buildApiUrl("/portal/login-event");
    if (!url) {
        throw new Error("Portal login is unavailable.");
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            studentId,
            birthDate,
            action: "login",
            actor: "student"
        }),
        mode: "cors",
        credentials: "omit"
    });

    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        console.warn("authenticateStudent: Non-JSON response", error);
    }

    if (!response.ok) {
        const authError = new Error(data?.error || `Login failed (${response.status})`);
        if (response.status === 401) {
            authError.code = "UNAUTHORIZED";
        }
        throw authError;
    }

    return data;
}

async function fetchStudentProfile() {
    if (!HAS_REMOTE_API) return null;
    const token = portalState.sessionToken || readAuthToken();
    if (!token) return null;
    const url = buildApiUrl("/portal/profile");
    if (!url) return null;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        },
        mode: "cors",
        credentials: "omit"
    });

    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        console.warn("fetchStudentProfile: Non-JSON response", error);
    }

    if (response.status === 401 || response.status === 403) {
        const error = new Error("Unauthorized");
        error.code = "UNAUTHORIZED";
        throw error;
    }

    if (!response.ok) {
        throw new Error(data?.error || `Failed to load profile (${response.status})`);
    }

    return data?.student || null;
}

function recordPortalActivity(studentId, action = "login", extraPayload = {}) {
    if (!studentId || !HAS_REMOTE_API) return Promise.resolve();
    const url = buildApiUrl("/portal/login-event");
    if (!url) return Promise.resolve();
    const payload = {
        studentId,
        action,
        actor: "student"
    };
    if (extraPayload && typeof extraPayload === "object") {
        Object.assign(payload, extraPayload);
    }

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
    const token = portalState.sessionToken || readAuthToken();
    if (!token) {
        setStatus("Please sign in again before uploading certificates.");
        return Promise.reject(new Error("Missing authentication token"));
    }
    const url = buildApiUrl("/portal/progress");
    if (!url) return Promise.resolve();
    const payload = {
        studentId,
        beltSlug: belt.slug,
        fileName: certificate.fileName || "",
        uploadedAt: certificate.uploadedAt
    };
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    };

    return fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        mode: "cors",
        credentials: "omit"
    })
        .then((response) => {
            if (response.status === 401 || response.status === 403) {
                const authError = new Error("Unauthorized");
                authError.code = "UNAUTHORIZED";
                throw authError;
            }
            if (!response.ok) {
                throw new Error(`Failed to store progress (${response.status})`);
            }
            return response.json();
        })
        .catch((error) => {
            if (error?.code === "UNAUTHORIZED") {
                portalState.sessionToken = null;
                portalState.activeStudent = null;
                clearSession();
                togglePortal(false);
                setStatus("Your session expired. Please sign in again.");
                return;
            }
            console.warn("recordCertificateProgress error:", error);
        });
}

function syncStudentProgress(studentId, options = {}) {
    if (!studentId || !HAS_REMOTE_API) return Promise.resolve();
    const { silent = false } = options;
    const url = buildApiUrl(`/portal/progress/${encodeURIComponent(studentId)}`);
    if (!url) return Promise.resolve();
    const token = portalState.sessionToken || readAuthToken();
    if (!token) {
        if (!silent) {
            setStatus("Please sign in again to sync your progress.");
        }
        portalState.sessionToken = null;
        portalState.activeStudent = null;
        clearSession();
        togglePortal(false);
        return Promise.resolve();
    }

    return fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
        .then((response) => {
            if (response.status === 404) {
                return { records: [] };
            }
            if (response.status === 401 || response.status === 403) {
                const authError = new Error("Unauthorized");
                authError.code = "UNAUTHORIZED";
                throw authError;
            }
            if (!response.ok) {
                throw new Error(`Progress sync failed (${response.status})`);
            }
            return response.json();
        })
        .then((data) => {
            const student = portalState.activeStudent;
            if (!student) return;
            applyServerProgressRecords(student, data.records, { silent });
        })
        .catch((error) => {
            if (error?.code === "UNAUTHORIZED") {
                portalState.sessionToken = null;
                portalState.activeStudent = null;
                clearSession();
                togglePortal(false);
                setStatus("Your session expired. Please sign in again.");
                return;
            }
            console.warn("syncStudentProgress error:", error);
            if (!silent) {
                const offline =
                    typeof navigator !== "undefined" && navigator.onLine === false;
                const message = offline
                    ? "You're offline—progress stays saved on this device."
                    : "Progress saved locally. We'll sync with the studio once the connection is stable.";
                setStatus(message, "success");
            }
        });
}

function applyServerProgressRecords(student, records, options = {}) {
    if (!student) return;
    const { silent = false } = options;
    const entries = Array.isArray(records) ? records : [];

    const baseIndex = resolveBeltIndex(student.currentBelt);
    const defaultUnlocked = baseIndex >= BELT_SEQUENCE.length - 1 ? baseIndex : baseIndex + 1;
    const lastIndex = BELT_SEQUENCE.length - 1;

    let serverAwarded = baseIndex;
    let serverUnlocked = defaultUnlocked;

    const certificateMap = portalState.certificates[student.id] ?? {};

    entries.forEach((record) => {
        const belt = resolveBeltDataBySlug(record.beltSlug);
        if (!belt) return;
        const beltIndex = resolveBeltIndex(belt.name);
        serverAwarded = Math.max(serverAwarded, beltIndex);
        serverUnlocked = Math.max(serverUnlocked, Math.min(beltIndex + 1, lastIndex));

        const existing = certificateMap[belt.name] ?? {};
        const hasLocalFile = Boolean(
            existing.storageKey || existing.dataUrl || existing.hasFile
        );
        certificateMap[belt.name] = {
            belt: belt.name,
            beltSlug: belt.slug,
            uploadedAt: record.uploadedAt,
            fileName: record.fileName || existing.fileName || "Certificate uploaded",
            fileType: existing.fileType || "",
            fileSize:
                typeof existing.fileSize === "number" && !Number.isNaN(existing.fileSize)
                    ? existing.fileSize
                    : null,
            storageKey: existing.storageKey || null,
            dataUrl: hasLocalFile && !existing.storageKey ? existing.dataUrl || null : null,
            hasFile: hasLocalFile,
            source: hasLocalFile ? existing.source || "local" : "server"
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

    if (!silent && entries.length) {
        setStatus("Progress synced with the studio.", "success");
    }
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
    setAdminLoadingState(true);
    loadAdminActivity(key);
}

function handleAdminRefresh() {
    if (!HAS_REMOTE_API) {
        setAdminStatus("Connect the portal API before using admin tools.");
        return;
    }
    if (!portalState.admin.key) {
        setAdminStatus("Enter the admin key to refresh data.");
        return;
    }
    if (portalState.admin.isLoading) {
        return;
    }
    setAdminStatus("Refreshing activity...", "progress");
    setAdminLoadingState(true);
    loadAdminActivity(portalState.admin.key);
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

function setupAdminReveal() {
    if (!portalEls.adminSection) return;
    if (shouldRevealAdminPanel()) {
        revealAdminSection({ scroll: false });
    }
    const trigger = portalEls.brandReveal;
    if (!trigger) return;
    let tapCount = 0;
    let resetTimer = null;
    trigger.addEventListener("click", () => {
        tapCount += 1;
        if (tapCount >= 3) {
            revealAdminSection({ scroll: true });
            tapCount = 0;
        }
        clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
            tapCount = 0;
        }, 1200);
    });
}

function shouldRevealAdminPanel() {
    try {
        if (sessionStorage.getItem(ADMIN_VISIBILITY_KEY) === "1") {
            return true;
        }
    } catch (error) {
        console.warn("Admin visibility session check failed:", error);
    }
    const params = new URLSearchParams(window.location.search);
    return params.get("admin") === "1" || params.get("mode") === "admin";
}

function revealAdminSection(options = {}) {
    if (!portalEls.adminSection) return;
    if (!portalEls.adminSection.hidden && !options.force) {
        return;
    }
    portalEls.adminSection.hidden = false;
    document.body.dataset.portalMode = "admin";
    try {
        sessionStorage.setItem(ADMIN_VISIBILITY_KEY, "1");
    } catch (error) {
        console.warn("Unable to persist admin visibility flag.", error);
    }
    if (options.scroll !== false) {
        portalEls.adminSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function loadAdminActivity(adminKey, options = {}) {
    const { silent = false } = options;
    if (!HAS_REMOTE_API) {
        setAdminStatus("Admin dashboard is disabled until the portal API is connected.");
        setAdminLoadingState(false);
        return;
    }
    if (!adminKey) {
        setAdminLoadingState(false);
        return;
    }
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
            if (portalEls.adminGeneratedAt) {
                portalEls.adminGeneratedAt.textContent = "—";
            }
            try {
                sessionStorage.removeItem(ADMIN_STORAGE_KEY);
            } catch (err) {
                console.warn(err);
            }
        })
        .finally(() => {
            portalState.admin.isLoading = false;
            setAdminLoadingState(false);
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

    if (portalEls.adminGeneratedAt) {
        portalEls.adminGeneratedAt.textContent = portalState.admin.generatedAt
            ? formatDateTime(portalState.admin.generatedAt)
            : "—";
    }

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

function setAdminLoadingState(isLoading) {
    const submitBtn = portalEls.adminForm?.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = Boolean(isLoading);
    }
    if (portalEls.adminRefresh) {
        portalEls.adminRefresh.disabled = Boolean(isLoading);
    }
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

        if (certificateHasDownload(certificateData)) {
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

            if (certificateHasDownload(certificate)) {
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

function renderReadinessCard(student, targetBelt) {
    if (!portalEls.readinessWrapper) {
        return null;
    }

    if (!student || !targetBelt) {
        portalEls.readinessWrapper.hidden = true;
        portalState.currentReadiness = null;
        portalEls.readinessForm?.reset();
        return null;
    }

    portalEls.readinessWrapper.hidden = false;

    const readinessState = computeReadinessState(student, targetBelt);
    portalState.currentReadiness = readinessState;
    const entry = readinessState.entry;

    if (portalEls.readinessTargetLabel) {
        portalEls.readinessTargetLabel.textContent = `${targetBelt.name}: ${readinessState.goals.lessons} classes · ${formatPercent(readinessState.goals.percent)}`;
    }

    if (portalEls.readinessReadyPill) {
        portalEls.readinessReadyPill.textContent = readinessState.isReady ? "Ready" : "Locked";
        portalEls.readinessReadyPill.classList.toggle("is-ready", readinessState.isReady);
        portalEls.readinessReadyPill.classList.toggle("is-missing", !readinessState.isReady);
    }

    if (portalEls.readinessClassesOffered) {
        portalEls.readinessClassesOffered.value = entry.classesOffered ?? "";
    }

    if (portalEls.readinessClassesAttended) {
        portalEls.readinessClassesAttended.value = entry.classesAttended ?? "";
    }

    if (portalEls.readinessStripeInputs?.length) {
        portalEls.readinessStripeInputs.forEach((input) => {
            const key = input.dataset.stripeField;
            if (!key) return;
            input.checked = Boolean(entry.stripes?.[key]);
        });
    }

    if (portalEls.readinessPercentDisplay) {
        portalEls.readinessPercentDisplay.textContent = entry.classesOffered
            ? formatPercent(readinessState.attendancePercent)
            : "0%";
    }

    if (portalEls.readinessLessonDisplay) {
        portalEls.readinessLessonDisplay.textContent = `${entry.classesAttended} / ${readinessState.goals.lessons}`;
    }

    if (portalEls.readinessChecklist) {
        portalEls.readinessChecklist.innerHTML = "";
        const checklistItems = [
            {
                label: "Lesson Minimum",
                value: `${entry.classesAttended}/${readinessState.goals.lessons}`,
                met: readinessState.lessonsMet
            },
            {
                label: "Attendance %",
                value: entry.classesOffered
                    ? `${formatPercent(readinessState.attendancePercent)} / ${formatPercent(readinessState.goals.percent)}`
                    : "Add classes offered",
                met: readinessState.percentMet
            },
            {
                label: "All 4 Stripes",
                value: `${readinessState.earnedStripes}/${Object.keys(STRIPE_LABELS).length}`,
                met: readinessState.stripesMet
            }
        ];

        checklistItems.forEach((item) => {
            const li = document.createElement("li");
            const labelSpan = document.createElement("span");
            labelSpan.textContent = item.label;
            const valueSpan = document.createElement("span");
            valueSpan.className = "readiness-pill";
            valueSpan.classList.toggle("is-ready", item.met);
            valueSpan.classList.toggle("is-missing", !item.met);
            valueSpan.textContent = item.value;
            li.append(labelSpan, valueSpan);
            portalEls.readinessChecklist.append(li);
        });
    }

    if (portalEls.readinessStatus) {
        if (readinessState.isReady) {
            portalEls.readinessStatus.textContent = "All set! You can request your test date.";
            portalEls.readinessStatus.classList.add("is-success");
        } else {
            const remaining = readinessState.missing.length
                ? readinessState.missing.join(" · ")
                : "Log your attendance details to unlock testing.";
            portalEls.readinessStatus.textContent = `Still needed: ${remaining}`;
            portalEls.readinessStatus.classList.remove("is-success");
        }
    }

    return readinessState;
}

function updateBeltTestAvailability(targetBelt, readinessState) {
    if (
        !portalEls.beltTestCard ||
        !portalEls.beltTestApplicationBtn ||
        !portalEls.beltTestHint
    ) {
        return;
    }

    portalEls.beltTestCard.hidden = false;

    if (!targetBelt) {
        portalEls.beltTestApplicationBtn.disabled = true;
        portalEls.beltTestHint.textContent =
            "You already hold the highest rank on this tracker. No test request needed!";
        toggleBeltTestForm(false);
        return;
    }

    if (!readinessState) {
        portalEls.beltTestApplicationBtn.disabled = true;
        portalEls.beltTestHint.textContent =
            "Log your attendance above to unlock belt test requests.";
        toggleBeltTestForm(false);
        return;
    }

    if (readinessState.isReady) {
        portalEls.beltTestApplicationBtn.disabled = false;
        portalEls.beltTestHint.textContent =
            "All requirements met—request your belt test below.";
    } else {
        portalEls.beltTestApplicationBtn.disabled = true;
        portalEls.beltTestHint.textContent = readinessState.missing.length
            ? `Keep working: ${readinessState.missing.join(" · ")}`
            : "Update the tracker to see what’s missing.";
        toggleBeltTestForm(false);
    }
}

function handleReadinessSubmit(event) {
    event.preventDefault();
    if (!portalState.activeStudent) {
        setStatus("Log in to save your readiness tracker.");
        return;
    }

    const student = portalState.activeStudent;
    const targetBelt =
        portalState.currentReadiness?.targetBelt || resolveUpcomingBelt(student);

    if (!targetBelt) {
        if (portalEls.readinessStatus) {
            portalEls.readinessStatus.textContent =
                "You're already at the final belt—no readiness tracking needed.";
            portalEls.readinessStatus.classList.remove("is-success");
        }
        return;
    }

    const offered = Math.max(
        0,
        Number(portalEls.readinessClassesOffered?.value || 0)
    );
    const attended = Math.max(
        0,
        Number(portalEls.readinessClassesAttended?.value || 0)
    );

    const stripes = getStripeTemplate();
    if (portalEls.readinessStripeInputs?.length) {
        portalEls.readinessStripeInputs.forEach((input) => {
            const key = input.dataset.stripeField;
            if (!key) return;
            stripes[key] = Boolean(input.checked);
        });
    }

    saveReadinessEntry(student.id, targetBelt.slug, {
        classesOffered: offered,
        classesAttended: attended,
        stripes
    });

    recordPortalActivity(student.id, "readiness:update", {
        beltSlug: targetBelt.slug
    });

    const updatedState = renderReadinessCard(student, targetBelt);
    updateBeltTestAvailability(targetBelt, updatedState);

    if (portalEls.readinessStatus && updatedState) {
        portalEls.readinessStatus.textContent = "Tracker saved!";
        portalEls.readinessStatus.classList.add("is-success");
    }
}

function handleBeltTestButton() {
    if (!portalState.activeStudent) {
        setStatus("Log in to request a belt test.");
        return;
    }
    if (!portalState.currentReadiness || !portalState.currentReadiness.isReady) {
        if (portalEls.beltTestHint) {
            portalEls.beltTestHint.textContent =
                "Finish the readiness tracker (classes, attendance, stripes) to unlock this form.";
        }
        return;
    }
    toggleBeltTestForm(true);
}

function resolveUpcomingBelt(student) {
    if (!student) return null;
    const unlockedIndex = ensureUnlockedIndex(student);
    const progress = portalState.progress[student.id] ?? {};
    const awardedIndex =
        typeof progress.awardedIndex === "number"
            ? progress.awardedIndex
            : computeAwardedIndex(student, unlockedIndex);
    if (unlockedIndex > awardedIndex && unlockedIndex < BELT_SEQUENCE.length) {
        return BELT_SEQUENCE[unlockedIndex];
    }
    return null;
}

function computeReadinessState(student, targetBelt) {
    if (!student || !targetBelt) {
        return null;
    }

    const entry = getReadinessEntry(student.id, targetBelt.slug);
    const goals = resolveAttendanceTargets(targetBelt.slug);
    const attendancePercent =
        entry.classesOffered > 0 ? entry.classesAttended / entry.classesOffered : 0;
    const lessonsMet = entry.classesAttended >= goals.lessons;
    const percentMet = entry.classesOffered > 0 && attendancePercent >= goals.percent;
    const stripes = entry.stripes || getStripeTemplate();
    const earnedStripes = Object.values(stripes).filter(Boolean).length;
    const stripesMet = earnedStripes === Object.keys(STRIPE_LABELS).length;

    const missing = [];
    if (!lessonsMet) {
        const diff = Math.max(0, goals.lessons - entry.classesAttended);
        missing.push(diff ? `${diff} more classes` : "Log class attendance");
    }
    if (!percentMet) {
        missing.push(
            entry.classesOffered
                ? `Attendance ${formatPercent(attendancePercent)} / ${formatPercent(goals.percent)}`
                : "Add classes offered to calculate attendance %"
        );
    }
    if (!stripesMet) {
        const needed = Object.entries(stripes)
            .filter(([, complete]) => !complete)
            .map(([key]) => STRIPE_LABELS[key]);
        if (needed.length) {
            missing.push(`Stripes: ${needed.join(", ")}`);
        }
    }

    return {
        targetBelt,
        entry,
        goals,
        attendancePercent,
        lessonsMet,
        percentMet,
        stripesMet,
        earnedStripes,
        missing,
        isReady: lessonsMet && percentMet && stripesMet
    };
}

function resolveAttendanceTargets(slug) {
    return BELT_ATTENDANCE_TARGETS[slug] || BELT_ATTENDANCE_TARGETS.default;
}

async function handleCertificateUpload(file, belt, beltIndex) {
    if (!portalState.activeStudent) return;

    if (file.size > MAX_FILE_SIZE) {
        setStatus("Files up to 10MB please. Compress large photos or PDFs if needed.", "error");
        return;
    }

    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
        setStatus("Use PDF or image formats (JPG, PNG, HEIC).", "error");
        return;
    }

    setStatus("Processing certificate...", "progress");
    try {
        const studentId = portalState.activeStudent.id;
        const payload = await prepareCertificatePayload(
            studentId,
            belt,
            file,
            new Date().toISOString()
        );

        if (!payload) {
            setStatus("We couldn't store that file. Please try again.", "error");
            return;
        }

        storeCertificate(studentId, payload);

        const nextUnlockIndex = beltIndex + 1;
        updateProgress(portalState.activeStudent, nextUnlockIndex);
        recordPortalActivity(studentId, `certificate:${belt.slug}`);

        const syncPromise = HAS_REMOTE_API
            ? recordCertificateProgress(studentId, belt, payload)
            : Promise.resolve();

        const hasNext = nextUnlockIndex < BELT_SEQUENCE.length;
        const nextBeltName = hasNext ? BELT_SEQUENCE[nextUnlockIndex].name : null;
        const successMessage = hasNext
            ? `${belt.name} awarded! ${nextBeltName} is now unlocked—let's go!`
            : `${belt.name} awarded! You've reached the highest rank—outstanding work!`;

        setStatus(successMessage, "success");
        renderPortal();

        syncPromise.finally(() => {
            syncStudentProgress(studentId, { silent: true });
        });
    } catch (error) {
        console.warn("handleCertificateUpload error:", error);
        setStatus("We couldn't process that file. Please try again.", "error");
    }
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

function updateProgress(student, unlockedIndex) {
    if (!student) return;
    const cappedUnlock = Math.min(unlockedIndex, BELT_SEQUENCE.length - 1);
    const awardedIndex = computeAwardedIndex(student, cappedUnlock);

    portalState.progress[student.id] = {
        unlockedIndex: cappedUnlock,
        awardedIndex
    };
    persistProgress();
}

function storeCertificate(studentId, certificate) {
    if (!studentId || !certificate) return;

    if (!portalState.certificates[studentId]) {
        portalState.certificates[studentId] = {};
    }

    const beltName =
        certificate.belt ||
        resolveBeltDataBySlug(certificate.beltSlug)?.name ||
        certificate.beltSlug ||
        "";
    if (!beltName) {
        console.warn("storeCertificate: missing belt identifier", certificate);
        return;
    }

    const existing = portalState.certificates[studentId][beltName] || {};
    const beltSlug =
        certificate.beltSlug ||
        existing.beltSlug ||
        resolveBeltDataByName(beltName)?.slug ||
        slugifyBeltName(beltName);

    const merged = {
        belt: beltName,
        beltSlug,
        uploadedAt: certificate.uploadedAt || existing.uploadedAt || new Date().toISOString(),
        fileName: certificate.fileName || existing.fileName || "",
        fileType: certificate.fileType || existing.fileType || "",
        fileSize:
            typeof certificate.fileSize === "number"
                ? certificate.fileSize
                : existing.fileSize ?? null,
        storageKey: certificate.storageKey || existing.storageKey || null,
        dataUrl: certificate.dataUrl || (!certificate.storageKey ? existing.dataUrl : null) || null,
        hasFile: Boolean(
            certificate.hasFile ||
            certificate.storageKey ||
            certificate.dataUrl ||
            existing.hasFile ||
            existing.storageKey ||
            existing.dataUrl
        ),
        source: certificate.source || existing.source || "local"
    };

    portalState.certificates[studentId][beltName] = merged;
    persistCertificates();
}

async function downloadCertificate(studentId, beltName) {
    const studentCertificates = portalState.certificates[studentId];
    if (!studentCertificates) return;
    const certificate = studentCertificates[beltName];
    if (!certificate) return;

    try {
        let blob = null;
        if (certificate.storageKey && certificateStorage.isAvailable) {
            blob = await certificateStorage.load(certificate.storageKey);
        }

        if (!blob && certificate.dataUrl) {
            blob = dataUrlToBlob(certificate.dataUrl);
        }

        if (!blob) {
            setStatus("We couldn't find that certificate file. Try uploading again.", "error");
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = certificate.fileName || `${beltName}-certificate`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error) {
        console.warn("downloadCertificate error:", error);
        setStatus("We couldn't download that certificate. Please try again.", "error");
    }
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
    } else {
        if (portalEls.readinessWrapper) {
            portalEls.readinessWrapper.hidden = true;
        }
        if (portalEls.beltTestCard) {
            portalEls.beltTestCard.hidden = true;
        }
        if (portalEls.beltTestForm) {
            portalEls.beltTestForm.hidden = true;
            portalEls.beltTestForm.reset();
        }
        portalState.currentReadiness = null;
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

function formatPercent(value, decimals = 1) {
    if (!Number.isFinite(value)) {
        return "0%";
    }
    const percentage = value * 100;
    return `${percentage.toFixed(decimals)}%`;
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

    if (!portalState.currentReadiness || !portalState.currentReadiness.isReady) {
        portalEls.beltTestStatus.textContent =
            "Finish the readiness tracker before submitting your test request.";
        portalEls.beltTestStatus.classList.remove("is-success");
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
            recordPortalActivity(studentId, "belt-test-request", {
                beltSlug: portalState.currentReadiness?.targetBelt?.slug || desiredBelt
            });
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
    clearStudentProfile();
    clearAuthToken();
}

function readSession() {
    try {
        return sessionStorage.getItem(STORAGE_KEYS.session);
    } catch (error) {
        console.warn("Session storage is unavailable", error);
        return null;
    }
}

function persistStudentProfile(profile) {
    if (!profile) {
        clearStudentProfile();
        return;
    }
    try {
        sessionStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    } catch (error) {
        console.warn("Session storage is unavailable", error);
    }
}

function readStoredStudentProfile() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEYS.profile);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn("Session storage is unavailable", error);
        return null;
    }
}

function clearStudentProfile() {
    try {
        sessionStorage.removeItem(STORAGE_KEYS.profile);
    } catch (error) {
        console.warn("Session storage is unavailable", error);
    }
}

function persistAuthToken(token) {
    if (!token) return;
    try {
        sessionStorage.setItem(STORAGE_KEYS.sessionToken, token);
    } catch (error) {
        console.warn("Session storage is unavailable", error);
    }
}

function clearAuthToken() {
    try {
        sessionStorage.removeItem(STORAGE_KEYS.sessionToken);
    } catch (error) {
        console.warn("Session storage is unavailable", error);
    }
}

function readAuthToken() {
    try {
        return sessionStorage.getItem(STORAGE_KEYS.sessionToken);
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
    const certificates = portalState.certificates || {};
    const snapshot = {};

    Object.entries(certificates).forEach(([studentId, records]) => {
        if (!records || typeof records !== "object") {
            return;
        }

        const sanitizedRecords = {};
        Object.entries(records).forEach(([beltName, record]) => {
            if (!record || typeof record !== "object") {
                return;
            }
            const sanitized = sanitizeCertificateRecord(record);
            sanitizedRecords[beltName] = sanitized;
            portalState.certificates[studentId][beltName] = {
                ...record,
                ...sanitized
            };
        });

        if (Object.keys(sanitizedRecords).length) {
            snapshot[studentId] = sanitizedRecords;
        }
    });

    writeStore(STORAGE_KEYS.certificates, snapshot);
}

function writeStore(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn("Unable to save data", error);
        setStatus("Storage is full or disabled. Clear space and try again.");
    }
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

function certificateHasDownload(certificate) {
    if (!certificate) return false;
    const hasStoredBlob = Boolean(certificate.storageKey && certificateStorage.isAvailable);
    const hasInlineData = Boolean(certificate.dataUrl);
    return hasStoredBlob || hasInlineData;
}

function buildCertificateStorageKey(studentId, beltSlug) {
    const normalizedId = (studentId || "").toLowerCase().trim();
    const normalizedSlug = (beltSlug || "").toLowerCase().trim();
    return `${normalizedId}::${normalizedSlug || "unknown"}`;
}

function slugifyBeltName(name) {
    return (name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || null;
}

function resolveBeltDataByName(name) {
    if (!name) return null;
    const normalized = name.toLowerCase().trim();
    return (
        BELT_SEQUENCE.find((belt) => belt.name.toLowerCase() === normalized) ||
        BELT_SEQUENCE.find((belt) => normalized.includes(belt.slug))
    ) || null;
}

function sanitizeCertificateRecord(record) {
    const sanitized = {
        belt: record.belt || "",
        beltSlug: record.beltSlug || null,
        uploadedAt: record.uploadedAt || null,
        fileName: record.fileName || "",
        fileType: record.fileType || "",
        fileSize:
            typeof record.fileSize === "number" && !Number.isNaN(record.fileSize)
                ? record.fileSize
                : null,
        storageKey: record.storageKey || null,
        hasFile: Boolean(record.hasFile || record.storageKey || record.dataUrl),
        source: record.source || "local"
    };

    if (!sanitized.storageKey && record.dataUrl) {
        sanitized.dataUrl = record.dataUrl;
    }

    return sanitized;
}

function normalizeStoredCertificates() {
    const certificates = portalState.certificates || {};
    Object.entries(certificates).forEach(([studentId, records]) => {
        if (!records || typeof records !== "object") {
            portalState.certificates[studentId] = {};
            return;
        }

        Object.entries(records).forEach(([beltName, record]) => {
            if (!record || typeof record !== "object") {
                delete records[beltName];
                return;
            }
            record.belt = record.belt || beltName;
            record.beltSlug =
                record.beltSlug ||
                resolveBeltDataByName(record.belt)?.slug ||
                slugifyBeltName(record.belt);
            record.hasFile = Boolean(record.hasFile || record.storageKey || record.dataUrl);
            record.fileSize =
                typeof record.fileSize === "number" && !Number.isNaN(record.fileSize)
                    ? record.fileSize
                    : null;
        });
    });
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            if (!dataUrl) {
                reject(new Error("Empty file result."));
                return;
            }
            resolve(dataUrl);
        };
        reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
        reader.readAsDataURL(file);
    });
}

function dataUrlToBlob(dataUrl) {
    if (!dataUrl) {
        throw new Error("Missing data URL");
    }
    const segments = dataUrl.split(",");
    if (segments.length < 2) {
        throw new Error("Invalid data URL");
    }
    const meta = segments[0];
    const base64 = segments.slice(1).join(",");
    const match = meta.match(/^data:(.*?);base64$/i);
    const mimeType = match ? match[1] : "application/octet-stream";
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        buffer[index] = binary.charCodeAt(index);
    }
    return new Blob([buffer], { type: mimeType });
}

async function prepareCertificatePayload(studentId, belt, file, uploadedAt) {
    const beltSlug = belt.slug || slugifyBeltName(belt.name);
    if (!beltSlug) {
        throw new Error("Unable to resolve belt slug");
    }

    const payload = {
        belt: belt.name,
        beltSlug,
        fileName: file.name,
        fileType: file.type || "",
        fileSize: file.size,
        uploadedAt,
        source: "local"
    };

    if (certificateStorage.isAvailable) {
        const storageKey = buildCertificateStorageKey(studentId, beltSlug);
        try {
            await certificateStorage.save(storageKey, file);
            return {
                ...payload,
                storageKey,
                hasFile: true
            };
        } catch (error) {
            console.warn(
                "prepareCertificatePayload: IndexedDB save failed, falling back to inline storage.",
                error
            );
        }
    }

    const dataUrl = await readFileAsDataUrl(file);
    return {
        ...payload,
        dataUrl,
        hasFile: Boolean(dataUrl),
        storageKey: null
    };
}

function migrateLegacyCertificates() {
    if (!certificateStorage.isAvailable) {
        return;
    }

    const certificates = portalState.certificates || {};
    const tasks = [];

    Object.entries(certificates).forEach(([studentId, records]) => {
        Object.entries(records || {}).forEach(([beltName, record]) => {
            if (!record || typeof record !== "object") {
                return;
            }
            if (record.storageKey || !record.dataUrl) {
                record.hasFile = Boolean(record.storageKey || record.dataUrl || record.hasFile);
                return;
            }

            const beltSlug =
                record.beltSlug ||
                resolveBeltDataByName(record.belt || beltName)?.slug ||
                slugifyBeltName(record.belt || beltName);
            if (!beltSlug) return;

            const storageKey = buildCertificateStorageKey(studentId, beltSlug);
            const migrationTask = Promise.resolve()
                .then(() => dataUrlToBlob(record.dataUrl))
                .then((blob) => certificateStorage.save(storageKey, blob))
                .then(() => {
                    record.storageKey = storageKey;
                    record.beltSlug = beltSlug;
                    record.hasFile = true;
                    delete record.dataUrl;
                })
                .catch((error) => {
                    console.warn("migrateLegacyCertificates error:", error);
                });

            tasks.push(migrationTask);
        });
    });

    if (!tasks.length) {
        persistCertificates();
        return;
    }

    Promise.allSettled(tasks).finally(() => {
        persistCertificates();
    });
}
