const STORAGE_KEYS = {
    progress: "araStudentProgress",
    certificates: "araStudentCertificates",
    session: "araStudentSession",
    sessionToken: "araStudentSessionToken",
    profile: "araStudentProfile"
};

const ADMIN_STORAGE_KEY = "araPortalAdminSession";
const ADMIN_TAB_STORAGE_KEY = "araAdminActiveTab";
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
const ADMIN_TRIGGER_PIN =
    (typeof document !== "undefined" && document.body?.dataset?.adminTriggerPin?.trim()) ||
    "";
let hiddenKeyStreak = 0;
let hiddenKeyLastTime = 0;

function readStoredAdminTab() {
    try {
        const stored = localStorage.getItem(ADMIN_TAB_STORAGE_KEY);
        const allowedTabs = new Set([
            "tab-dashboard",
            "tab-calendar",
            "tab-classes",
            "tab-students",
            "tab-events",
            "tab-membership",
            "tab-notes",
            "tab-settings"
        ]);
        return stored && allowedTabs.has(stored) ? stored : null;
    } catch (error) {
        return null;
    }
}

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
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/heic",
    "image/heif"
];

const CERTIFICATE_KEYWORDS = [
    "certificate of rank",
    "master antonio ara",
    "ara's martial arts",
    "belt",
    "date of examination"
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
    "high-white": { lessons: 27, percent: 0.717 },
    yellow: { lessons: 29, percent: 0.735 },
    "high-yellow": { lessons: 31, percent: 0.752 },
    green: { lessons: 33, percent: 0.77 },
    "high-green": { lessons: 35, percent: 0.787 },
    blue: { lessons: 37, percent: 0.804 },
    "high-blue": { lessons: 39, percent: 0.822 },
    red: { lessons: 42, percent: 0.848 },
    "high-red": { lessons: 48, percent: 0.9 }
};

const READINESS_STORAGE_KEY = "araReadinessTracker";

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

const DUPLICATE_NAME_PATTERNS = [/^jasper\b/i, /^kylan\b/i];

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
    adminUsername: document.getElementById("admin-username"),
    adminPassword: document.getElementById("admin-password"),
    adminPin: document.getElementById("admin-pin"),
    adminStatus: document.getElementById("admin-status"),
    adminDashboard: document.getElementById("admin-dashboard"),
    adminSummaryBody: document.getElementById("admin-summary-body"),
    adminEventsList: document.getElementById("admin-events-list"),
    adminRefresh: document.getElementById("admin-refresh"),
    adminExpand: document.getElementById("admin-expand"),
    adminSummaryDownload: document.getElementById("admin-summary-download"),
    adminLauncher: document.getElementById("admin-launcher"),
    adminModal: document.getElementById("admin-modal"),
    adminBackdrop: document.getElementById("admin-modal-backdrop"),
    adminClose: document.getElementById("admin-close"),
    adminEnroll: document.getElementById("admin-enroll"),
    adminEnrollForm: document.getElementById("admin-enroll-form"),
    adminEnrollStatus: document.getElementById("admin-enroll-status"),
    adminEnrollResult: document.getElementById("admin-enroll-result"),
    adminEnrollDetails: document.getElementById("admin-enroll-details"),
    adminEnrollAttendance: document.getElementById("admin-enroll-attendance"),
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
    readinessAutoSummary: document.getElementById("readiness-auto-summary"),
    readinessAttendance: document.getElementById("readiness-attendance"),
    readinessStripeInputs: document.querySelectorAll("[data-stripe-field]"),
    beltTestCard: document.getElementById("belt-test-card"),
    beltTestHint: document.getElementById("belt-test-hint"),
    adminGeneratedAt: document.getElementById("admin-generated-at"),
    adminAttendance: document.getElementById("admin-attendance"),
    adminAttendanceBody: document.getElementById("admin-attendance-body"),
    adminAttendanceRefresh: document.getElementById("admin-attendance-refresh"),
    adminEvents: document.getElementById("admin-events"),
    adminEventsBody: document.getElementById("admin-events-body"),
    adminEventsRefresh: document.getElementById("admin-events-refresh"),
    adminEventsForm: document.getElementById("admin-events-form"),
    adminEventName: document.getElementById("admin-event-name"),
    adminEventDescription: document.getElementById("admin-event-description"),
    adminEventStart: document.getElementById("admin-event-start"),
    adminEventEnd: document.getElementById("admin-event-end"),
    adminEventCapacity: document.getElementById("admin-event-capacity"),
    adminEventType: document.getElementById("admin-event-type"),
    adminEventActive: document.getElementById("admin-event-active"),
    adminEventsStatus: document.getElementById("admin-events-status"),
    adminTabs: document.getElementById("admin-tabs"),
    adminCalendarUpcoming: document.getElementById("admin-calendar-upcoming"),
    adminEmailForm: document.getElementById("admin-email-form"),
    adminEmailTarget: document.getElementById("email-target"),
    adminEmailSubject: document.getElementById("email-subject"),
    adminEmailBody: document.getElementById("email-body"),
    adminEmailStatus: document.getElementById("email-status"),
    adminRoster: document.getElementById("admin-roster"),
    adminRosterBody: document.getElementById("admin-roster-body"),
    adminRosterRefresh: document.getElementById("admin-roster-refresh"),
    adminRosterDetail: document.getElementById("admin-roster-detail"),
    adminRosterStudentName: document.getElementById("admin-roster-student-name"),
    adminRosterStudentMeta: document.getElementById("admin-roster-student-meta"),
    adminRosterMembership: document.getElementById("admin-roster-membership"),
    adminRosterSave: document.getElementById("admin-roster-save"),
    adminRosterEditForm: document.getElementById("admin-roster-edit-form"),
    adminRosterEditStatus: document.getElementById("admin-roster-edit-status"),
    adminRosterName: document.getElementById("admin-roster-name"),
    adminRosterEmail: document.getElementById("admin-roster-email"),
    adminRosterPhone: document.getElementById("admin-roster-phone"),
    adminRosterBelt: document.getElementById("admin-roster-belt"),
    adminRosterStatus: document.getElementById("admin-roster-status"),
    adminRosterNoteForm: document.getElementById("admin-roster-note-form"),
    adminRosterNoteType: document.getElementById("admin-roster-note-type"),
    adminRosterNoteMessage: document.getElementById("admin-roster-note-message"),
    adminRosterNoteAuthor: document.getElementById("admin-roster-note-author"),
    adminRosterNotesList: document.getElementById("admin-roster-notes-list"),
    adminRosterNewtab: document.getElementById("admin-roster-newtab"),
    adminRosterCardStatus: document.getElementById("admin-roster-card-status"),
    adminRosterCard30: document.getElementById("admin-roster-card-30"),
    adminRosterCard60: document.getElementById("admin-roster-card-60"),
    adminRosterCardMembership: document.getElementById("admin-roster-card-membership"),
    adminRosterLastAttended: document.getElementById("admin-roster-last-attended"),
    adminAttendanceAdjustForm: document.getElementById("admin-attendance-adjust-form"),
    adminAttendanceAdjustValue: document.getElementById("admin-attendance-adjust-value"),
    adminAttendanceAdjustClass: document.getElementById("admin-attendance-adjust-class"),
    adminAttendanceAdjustLevel: document.getElementById("admin-attendance-adjust-level"),
    adminAttendanceAdjustNote: document.getElementById("admin-attendance-adjust-note"),
    adminAttendanceAdjustStatus: document.getElementById("admin-attendance-adjust-status"),
    adminTrigger: document.getElementById("admin-trigger"),
    studentModal: document.getElementById("student-detail-modal"),
    studentModalBackdrop: document.getElementById("student-modal-backdrop"),
    studentModalClose: document.getElementById("student-modal-close"),
    studentModalTitle: document.getElementById("student-modal-title"),
    studentModalMeta: document.getElementById("student-modal-meta"),
    studentModalAvatar: document.getElementById("student-modal-avatar"),
    studentModalStatusPill: document.getElementById("student-modal-status-pill"),
    studentModalLastAttended: document.getElementById("student-modal-last-attended"),
    studentModalLastAttendedPill: document.getElementById("student-modal-lastattended-pill"),
    studentModalLast30: document.getElementById("student-modal-last30"),
    studentModalLast60: document.getElementById("student-modal-last60"),
    studentModalNavButtons: document.querySelectorAll("[data-student-panel-target]"),
    studentModalPanels: document.querySelectorAll("[data-student-panel]"),
    studentModalEditForm: document.getElementById("student-modal-edit-form"),
    studentModalNameInput: document.getElementById("student-modal-name"),
    studentModalEmailInput: document.getElementById("student-modal-email"),
    studentModalPhoneInput: document.getElementById("student-modal-phone"),
    studentModalBelt: document.getElementById("student-modal-belt"),
    studentModalMembership: document.getElementById("student-modal-membership"),
    studentModalStatusField: document.getElementById("student-modal-status"),
    studentModalAttendanceList: document.getElementById("student-modal-attendance-list"),
    studentModalNotesForm: document.getElementById("student-modal-note-form"),
    studentModalNoteType: document.getElementById("student-modal-note-type"),
    studentModalNoteAuthor: document.getElementById("student-modal-note-author"),
    studentModalNoteMessage: document.getElementById("student-modal-note-message"),
    studentModalNotesList: document.getElementById("student-modal-notes-list"),
    studentModalBillingMembership: document.getElementById("student-modal-billing-membership"),
    studentModalBillingStatus: document.getElementById("student-modal-billing-status"),
    studentModalProgressBelt: document.getElementById("student-modal-progress-belt"),
    studentModalProgressMembership: document.getElementById("student-modal-progress-membership"),
    studentModalStatus: document.getElementById("student-modal-status"),
    classModal: document.getElementById("class-attendance-modal"),
    classModalBackdrop: document.getElementById("class-modal-backdrop"),
    classModalClose: document.getElementById("class-modal-close"),
    classModalDone: document.getElementById("class-modal-done"),
    classModalOpen: document.getElementById("class-modal-open"),
    classModalWaiting: document.getElementById("class-modal-waiting"),
    classModalReserved: document.getElementById("class-modal-reserved"),
    classModalAttended: document.getElementById("class-modal-attended"),
    classModalInstructor: document.getElementById("class-modal-instructor"),
    classModalWod: document.getElementById("class-modal-wod"),
    classModalMember: document.getElementById("class-modal-member"),
    classModalReserve: document.getElementById("class-modal-reserve"),
    classModalSignin: document.getElementById("class-modal-signin"),
    classModalDropin: document.getElementById("class-modal-dropin"),
    classModalMoveAll: document.getElementById("class-modal-move-all"),
    classModalClearAttended: document.getElementById("class-modal-clear-attended"),
    classModalEdit: document.getElementById("class-modal-edit"),
    reportCardModal: document.getElementById("admin-report-card"),
    reportCardClose: document.getElementById("report-card-close"),
    reportCardBody: document.getElementById("report-card-body"),
    reportCardDownload: document.getElementById("report-card-download")
};

const portalState = {
    activeStudent: readStoredStudentProfile(),
    isLoading: false,
    progress: readStore(STORAGE_KEYS.progress),
    certificates: readStore(STORAGE_KEYS.certificates),
    sessionToken: readAuthToken(),
    readiness: loadReadinessStore(),
    currentReadiness: null,
    attendanceSummary: {},
    admin: {
        token: null,
        isLoading: false,
        summary: [],
        events: [],
        generatedAt: null,
        attendance: [],
        isAuthorized: false,
        isExpanded: false,
        reportCard: null,
        isCreatingStudent: false,
        newStudent: null,
        roster: [],
        rosterGeneratedAt: null,
        rosterSelected: null,
        rosterNotes: [],
        rosterNotesGeneratedAt: null,
        rosterAttendanceSummary: {},
        events: [],
        eventsGeneratedAt: null,
        activeTab: readStoredAdminTab() || "tab-dashboard",
        studentModalPanel: "overview"
    }
};

const classModalState = {
    waiting: [],
    reserved: [],
    attended: []
};

normalizeStoredCertificates();
migrateLegacyCertificates();

document.addEventListener("DOMContentLoaded", () => {
    attachHandlers();
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
        if (IS_ADMIN_MODE) {
            autoLoginFromPin();
        }
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
    portalEls.adminForm?.addEventListener("submit", handleAdminLogin);
    portalEls.adminRefresh?.addEventListener("click", handleAdminRefresh);
    portalEls.adminRosterRefresh?.addEventListener("click", handleAdminRosterRefresh);
    portalEls.adminLauncher?.addEventListener("click", (event) => {
        event.preventDefault();
        requestAdminAccess();
    });
    portalEls.adminTrigger?.addEventListener("click", (event) => {
        event.preventDefault();
        requestAdminAccess();
    });
    portalEls.adminRosterBody?.addEventListener("click", handleAdminRosterAction);

    portalEls.adminRosterEditForm?.addEventListener("submit", handleRosterEditSubmit);
    portalEls.adminRosterSave?.addEventListener("click", handleAdminMembershipSave);
    portalEls.adminRosterNoteForm?.addEventListener("submit", handleAdminNoteSubmit);
    portalEls.adminAttendanceAdjustForm?.addEventListener("submit", handleAttendanceAdjust);
    portalEls.adminRosterDetail?.addEventListener("click", handleRosterDetailButtons);
    portalEls.adminRosterNewtab?.addEventListener("click", () => {
        const student = portalState.admin.rosterSelected;
        if (!student) return;
        window.open(`${window.location.pathname}?student=${encodeURIComponent(student.id)}#admin`, "_blank");
    });
    portalEls.adminClose?.addEventListener("click", closeAdminModal);
    portalEls.adminBackdrop?.addEventListener("click", closeAdminModal);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            if (portalEls.adminModal && !portalEls.adminModal.hidden) {
                closeAdminModal();
            }
            if (portalEls.classModal && !portalEls.classModal.hidden) {
                closeClassModal();
            }
            if (portalEls.studentModal && !portalEls.studentModal.hidden) {
                closeStudentModal();
            }
        }
    });
    document.addEventListener("keydown", handleHiddenKeySequence);
    portalEls.adminAttendanceRefresh?.addEventListener("click", loadAdminAttendance);
    portalEls.adminEventsRefresh?.addEventListener("click", loadAdminEvents);
    portalEls.adminEventsForm?.addEventListener("submit", handleAdminEventSubmit);
    portalEls.adminEventsBody?.addEventListener("click", handleAdminEventAction);
    portalEls.adminSummaryDownload?.addEventListener("click", downloadAdminSummary);
    portalEls.adminExpand?.addEventListener("click", toggleAdminPanelSize);
    portalEls.adminSummaryBody?.addEventListener("click", handleAdminSummaryAction);
    portalEls.adminEnrollForm?.addEventListener("submit", handleAdminEnrollSubmit);
    portalEls.adminEmailForm?.addEventListener("submit", handleAdminEmailSubmit);
    portalEls.reportCardClose?.addEventListener("click", closeReportCard);
    portalEls.reportCardDownload?.addEventListener("click", downloadReportCard);
    portalEls.reportCardModal?.addEventListener("click", (event) => {
        if (event.target === portalEls.reportCardModal) {
            closeReportCard();
        }
    });
    portalEls.studentModalClose?.addEventListener("click", closeStudentModal);
    portalEls.studentModalBackdrop?.addEventListener("click", closeStudentModal);
    portalEls.studentModalEditForm?.addEventListener("submit", handleStudentModalSave);
    portalEls.studentModalNotesForm?.addEventListener("submit", handleAdminNoteSubmit);
    portalEls.studentModalNavButtons?.forEach((btn) =>
        btn.addEventListener("click", handleStudentModalNav)
    );
    document.addEventListener("click", handleStudentModalAction);
    if (portalEls.adminTabs) {
        portalEls.adminTabs.addEventListener("click", handleAdminTabClick);
    }
    portalEls.classModalOpen?.addEventListener("click", () => openClassModal());
    portalEls.classModalClose?.addEventListener("click", closeClassModal);
    portalEls.classModalDone?.addEventListener("click", closeClassModal);
    portalEls.classModalBackdrop?.addEventListener("click", closeClassModal);
    portalEls.classModalReserve?.addEventListener("click", () => addClassModalEntry("reserved"));
    portalEls.classModalSignin?.addEventListener("click", () => addClassModalEntry("attended"));
    portalEls.classModalDropin?.addEventListener("click", () => addClassModalEntry("attended", "Drop-in Guest"));
    portalEls.classModalMoveAll?.addEventListener("click", moveAllToAttended);
    portalEls.classModalClearAttended?.addEventListener("click", clearClassAttended);
    portalEls.classModalEdit?.addEventListener("click", () => {
        openClassModal();
        portalEls.classModalWod?.focus();
    });
    document.addEventListener("click", handleClassActionButtons);
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

function requestAdminAccess() {
    if (!HAS_REMOTE_API) {
        window.alert("Connect the portal API before using instructor tools.");
        return;
    }
    if (!verifyAdminTriggerPin()) {
        return;
    }
    const pin = (ADMIN_TRIGGER_PIN || "").trim();
    const versionTag = "20241126";
    const base = "portal-admin.html";
    const url = pin
        ? `${base}?v=${versionTag}&pin=${encodeURIComponent(pin)}`
        : `${base}?v=${versionTag}`;
    window.open(url, "_blank", "noopener");
}

function verifyAdminTriggerPin() {
    if (!ADMIN_TRIGGER_PIN) {
        return true;
    }
    const attempt = window.prompt("Enter instructor PIN");
    if (attempt === null) {
        return false;
    }
    if (attempt.trim() !== ADMIN_TRIGGER_PIN) {
        window.alert("Incorrect PIN.");
        return false;
    }
    return true;
}

function handleHiddenKeySequence(event) {
    if (event.key?.toLowerCase() === "a" && event.shiftKey) {
        const now = Date.now();
        if (now - hiddenKeyLastTime > 1200) {
            hiddenKeyStreak = 0;
        }
        hiddenKeyLastTime = now;
        hiddenKeyStreak += 1;
        if (hiddenKeyStreak >= 3) {
            hiddenKeyStreak = 0;
            requestAdminAccess();
        }
        return;
    }
    hiddenKeyStreak = 0;
}

function openAdminModal() {
    if (!HAS_REMOTE_API) {
        window.alert("Connect the portal API before using the instructor dashboard.");
        return;
    }
    if (!portalEls.adminModal) return;
    portalEls.adminModal.hidden = false;
    document.body.classList.add("admin-modal-open");
    resetAdminModalState();
}

function closeAdminModal() {
    if (!portalEls.adminModal) return;
    portalEls.adminModal.hidden = true;
    document.body.classList.remove("admin-modal-open");
    closeReportCard();
}

function resetAdminModalState() {
    if (portalEls.adminForm) {
        portalEls.adminForm.hidden = portalState.admin.isAuthorized;
    }
    if (portalEls.adminDashboard) {
        portalEls.adminDashboard.hidden = !portalState.admin.isAuthorized;
    }
    if (!portalState.admin.isAuthorized) {
        portalEls.adminUsername?.focus();
    }
    renderAdminEnrollSection();
}

function getAdminAuthHeaders(base = {}) {
    const headers = { ...base };
    if (portalState.admin.token) {
        headers.Authorization = `Bearer ${portalState.admin.token}`;
    }
    return headers;
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

    if (HAS_REMOTE_API && student?.id) {
        loadAttendanceSummary(student.id);
    }
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
        .then((data) => {
            markCertificateSynced(studentId, belt.slug, data?.uploadedAt || payload.uploadedAt);
            return data;
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

    const existingCertificates = portalState.certificates[student.id] ?? {};
    const pendingAwardIndex = Object.values(existingCertificates).reduce((highest, record) => {
        if (!record || !record.pendingSync) {
            return highest;
        }
        const belt =
            resolveBeltDataBySlug(record.beltSlug) ||
            resolveBeltDataByName(record.belt) ||
            null;
        if (!belt) {
            return highest;
        }
        const beltIndex = resolveBeltIndex(belt.name);
        return Math.max(highest, beltIndex);
    }, baseIndex);
    const pendingUnlockIndex = Math.min(pendingAwardIndex + 1, lastIndex);
    const serverCertificates = {};

    entries.forEach((record) => {
        const belt = resolveBeltDataBySlug(record.beltSlug);
        if (!belt) return;
        const beltIndex = resolveBeltIndex(belt.name);
        serverAwarded = Math.max(serverAwarded, beltIndex);
        serverUnlocked = Math.max(serverUnlocked, Math.min(beltIndex + 1, lastIndex));

        const existing = existingCertificates[belt.name] ?? {};
        const hasLocalFile = Boolean(
            existing.storageKey || existing.dataUrl || existing.hasFile
        );
        serverCertificates[belt.name] = {
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
            source: "server",
            pendingSync: false
        };
    });

    Object.entries(existingCertificates).forEach(([beltName, record]) => {
        if (serverCertificates[beltName]) {
            return;
        }
        if (record && record.pendingSync) {
            serverCertificates[beltName] = { ...record };
            return;
        }
        if (record?.storageKey && certificateStorage.isAvailable) {
            certificateStorage.remove(record.storageKey).catch(() => {});
        }
    });

    portalState.certificates[student.id] = serverCertificates;
    persistCertificates();

    const existingProgress = portalState.progress[student.id] ?? {};
    const hasServerData = entries.length > 0;
    const mergedUnlocked = hasServerData
        ? Math.max(serverUnlocked, pendingUnlockIndex)
        : Math.max(
              defaultUnlocked,
              existingProgress.unlockedIndex ?? defaultUnlocked,
              pendingUnlockIndex
          );
    const mergedAwarded = hasServerData
        ? Math.max(serverAwarded, pendingAwardIndex, baseIndex)
        : Math.max(existingProgress.awardedIndex ?? baseIndex, pendingAwardIndex, baseIndex);

    portalState.progress[student.id] = {
        unlockedIndex: mergedUnlocked,
        awardedIndex: mergedAwarded
    };
    persistProgress();

    if (!silent && entries.length) {
        setStatus("Progress synced with the studio.", "success");
    }
}

function handleAdminLogin(event) {
    event.preventDefault();
    if (!portalEls.adminUsername || !portalEls.adminPassword) return;

    if (!HAS_REMOTE_API) {
        setAdminStatus("Connect the portal API before using admin tools.");
        return;
    }

    const username = portalEls.adminUsername.value.trim();
    const password = portalEls.adminPassword.value.trim();
    const pin = portalEls.adminPin?.value.trim() || "";

    if (!username || !password) {
        setAdminStatus("Enter your username and password.");
        return;
    }

    setAdminStatus("Verifying credentials...", "progress");
    setAdminLoadingState(true);

    const url = buildApiUrl("/portal/admin/login");
    fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password, pin })
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Invalid credentials.");
            }
            return response.json();
        })
        .then((data) => {
            portalState.admin.isAuthorized = true;
            portalState.admin.token = data.token;
            persistAdminToken(data.token);
            setAdminStatus("Dashboard unlocked.", "success");
            resetAdminModalState();
            loadAdminActivity({ silent: true })
                .then(() => Promise.all([loadAdminRoster({ silent: true }), loadAdminEvents()]))
                .catch(() => {});
        })
        .catch((error) => {
            console.error("Admin login error:", error);
            setAdminStatus(error.message || "Unable to sign in.", "error");
            portalState.admin.isAuthorized = false;
            portalState.admin.token = null;
            persistAdminToken(null);
        })
        .finally(() => {
            setAdminLoadingState(false);
        });
}

function handleAdminRefresh() {
    if (!HAS_REMOTE_API) {
        setAdminStatus("Connect the portal API before using admin tools.");
        return;
    }
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in as Master Ara to refresh data.");
        return;
    }
    if (portalState.admin.isLoading) {
        return;
    }
    setAdminStatus("Refreshing activity...", "progress");
    setAdminLoadingState(true);
    Promise.all([loadAdminActivity({ silent: true }), loadAdminRoster({ silent: true }), loadAdminEvents()])
        .then(() => {
            setAdminStatus("Dashboard updated.", "success");
        })
        .catch((error) => {
            console.error("Admin refresh error:", error);
            setAdminStatus(error.message || "Unable to refresh right now.");
        })
        .finally(() => {
            setAdminLoadingState(false);
        });
}

function handleAdminRosterRefresh(event) {
    event?.preventDefault();
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return;
    }
    loadAdminRoster();
}

function handleAdminEnrollSubmit(event) {
    event.preventDefault();
    if (!portalEls.adminEnrollForm) return;
    if (!HAS_REMOTE_API) {
        setAdminEnrollStatus("Connect the portal API before adding students.");
        return;
    }
    if (!portalState.admin.isAuthorized || !portalState.admin.token) {
        setAdminEnrollStatus("Unlock the admin dashboard first.");
        return;
    }
    if (portalState.admin.isCreatingStudent) {
        return;
    }

    const formData = new FormData(portalEls.adminEnrollForm);
    const name = (formData.get("name") || "").toString().trim();
    const birthDate = (formData.get("birthDate") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const phone = (formData.get("phone") || "").toString().trim();
    const currentBelt = (formData.get("belt") || "White Belt").toString().trim() || "White Belt";
    const classType = (formData.get("classType") || "basic").toString().trim() || "basic";
    const attendanceValue = (formData.get("initialAttendanceDays") || "0").toString();
    const attendanceDays = Number.parseInt(attendanceValue, 10);

    if (!name || !birthDate) {
        setAdminEnrollStatus("Enter the student's name and birth date.");
        return;
    }

    const payload = {
        name,
        birthDate,
        email: email || undefined,
        phone: phone || undefined,
        currentBelt,
        classType,
        initialAttendanceDays: Number.isFinite(attendanceDays) ? attendanceDays : 0
    };

    const url = buildApiUrl("/portal/admin/students");
    if (!url) {
        setAdminEnrollStatus("Missing portal API base URL.");
        return;
    }

    setAdminEnrollStatus("Creating student...", "progress");
    portalState.admin.isCreatingStudent = true;
    syncAdminEnrollButtonState();

    fetch(url, {
        method: "POST",
        headers: getAdminAuthHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify(payload)
    })
        .then((response) =>
            response.json().then((data) => {
                if (!response.ok) {
                    const message = data?.error || "Unable to create student.";
                    throw new Error(message);
                }
                return data;
            })
        )
        .then((data) => {
            portalState.admin.newStudent = {
                student: data.student,
                login: data.login,
                attendanceSeeded: data.attendanceSeeded ?? 0
            };
            setAdminEnrollStatus("Student created successfully.", "success");
            renderAdminEnrollSection();
            portalEls.adminEnrollForm?.reset();
            if (portalEls.adminEnrollAttendance) {
                portalEls.adminEnrollAttendance.value = "3";
            }
            handleAdminRefresh();
        })
        .catch((error) => {
            console.error("Admin enrollment error:", error);
            setAdminEnrollStatus(error.message || "Unable to create student.", "error");
        })
        .finally(() => {
            portalState.admin.isCreatingStudent = false;
            syncAdminEnrollButtonState();
        });
}

function attemptRestoreAdminSession() {
    if (!HAS_REMOTE_API) {
        return;
    }
    const storedToken = readStoredAdminToken();
    if (!storedToken) {
        return;
    }
    portalState.admin.token = storedToken;
    portalState.admin.isAuthorized = true;
    loadAdminActivity({ silent: true })
        .then(() => Promise.all([loadAdminRoster({ silent: true }), loadAdminEvents()]))
        .catch(() => {
            portalState.admin.token = null;
            portalState.admin.isAuthorized = false;
            clearAdminSession();
        });
}

function autoLoginFromPin() {
    try {
        const params = new URLSearchParams(window.location.search);
        const pin = params.get("pin") || "";
        const triggerPin = (ADMIN_TRIGGER_PIN || "").trim();
        if (!pin || !triggerPin || pin !== triggerPin) {
            return;
        }
        const username =
            (document.body.dataset.adminUsername || "MasterAra").trim() || "MasterAra";
        const password =
            (document.body.dataset.adminPassword || "AraTKD").trim() || "AraTKD";
        if (!username || !password) return;
        portalEls.adminUsername.value = username;
        portalEls.adminPassword.value = password;
        if (portalEls.adminPin) {
            portalEls.adminPin.value = pin;
        }
        handleAdminLogin(new Event("submit"));
    } catch (error) {
        console.warn("autoLoginFromPin failed", error);
    }
}

function persistAdminToken(token) {
    try {
        if (!token) {
            sessionStorage.removeItem(ADMIN_STORAGE_KEY);
            return;
        }
        sessionStorage.setItem(
            ADMIN_STORAGE_KEY,
            JSON.stringify({
                token
            })
        );
    } catch (error) {
        console.warn("Unable to persist admin session:", error);
    }
}

function readStoredAdminToken() {
    try {
        const stored = sessionStorage.getItem(ADMIN_STORAGE_KEY);
        if (!stored) {
            return null;
        }
        const payload = JSON.parse(stored);
        return payload?.token || null;
    } catch (error) {
        console.warn("Unable to read admin session:", error);
        return null;
    }
}

function clearAdminSession() {
    portalState.admin.token = null;
    portalState.admin.isAuthorized = false;
    portalState.admin.newStudent = null;
    portalState.admin.rosterAttendanceSummary = {};
    persistAdminToken(null);
}

function filterDuplicateByName(list, resolveName) {
    const seen = new Set();
    if (!Array.isArray(list)) return [];
    return list.filter((item) => {
        const name = (resolveName(item) || "").toString().trim().toLowerCase();
        const isTarget = DUPLICATE_NAME_PATTERNS.some((pattern) => pattern.test(name));
        if (!isTarget) return true;
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
    });
}

function loadAdminActivity(options = {}) {
    const { silent = false } = options;
    if (!HAS_REMOTE_API) {
        setAdminStatus("Admin dashboard is disabled until the portal API is connected.");
        setAdminLoadingState(false);
        return Promise.reject(new Error("Portal API missing"));
    }
    if (!portalState.admin.token) {
        setAdminStatus("Sign in to load analytics.");
        setAdminLoadingState(false);
        return Promise.reject(new Error("Missing admin token"));
    }
    portalState.admin.isLoading = true;
    const url = buildApiUrl("/portal/admin/activity");
    if (!url) return Promise.reject(new Error("Missing API base"));

    return fetch(url, {
        method: "GET",
        headers: getAdminAuthHeaders(),
        mode: "cors",
        credentials: "omit"
    })
        .then((response) => {
            if (response.status === 401) {
                throw new Error("Admin session expired.");
            }
            if (!response.ok) {
                throw new Error(`Failed to load activity (${response.status})`);
            }
            return response.json();
        })
        .then((data) => {
            portalState.admin.isAuthorized = true;
            const mappedSummary = (Array.isArray(data.summary) ? data.summary : []).map((entry) => ({
                studentId: entry.studentId ?? entry.student_id,
                name: entry.name ?? entry.student_name ?? "",
                currentBelt: entry.currentBelt ?? entry.current_belt ?? "",
                totalEvents: entry.totalEvents ?? entry.total_events ?? 0,
                loginEvents: entry.loginEvents ?? entry.login_events ?? 0,
                lastEventAt: entry.lastEventAt ?? entry.last_event ?? null,
                latestBelt: entry.latestBelt ?? entry.latest_belt ?? null,
                latestBeltUploadedAt: entry.latestBeltUploadedAt ?? entry.latest_belt_uploaded ?? null,
                isSuspended: Boolean(entry.isSuspended ?? entry.is_suspended),
                suspendedReason: entry.suspendedReason ?? entry.suspended_reason ?? null,
                suspendedAt: entry.suspendedAt ?? entry.suspended_at ?? null
            }));
            portalState.admin.summary = filterDuplicateByName(mappedSummary, (entry) => entry.name);
            portalState.admin.events = (Array.isArray(data.events) ? data.events : []).map((event) => ({
                studentId: event.studentId ?? event.student_id,
                action: event.action,
                actor: event.actor,
                recordedAt: event.recordedAt ?? event.created_at ?? null
            }));
            portalState.admin.generatedAt = data.generatedAt ?? null;
            renderAdminDashboard();
            loadAdminAttendance();
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
            portalState.admin.token = null;
            portalState.admin.summary = [];
            portalState.admin.events = [];
            portalState.admin.generatedAt = null;
            portalState.admin.isAuthorized = false;
            portalState.admin.newStudent = null;
            if (portalEls.adminDashboard) {
                portalEls.adminDashboard.hidden = true;
            }
            if (portalEls.adminGeneratedAt) {
                portalEls.adminGeneratedAt.textContent = "—";
            }
            clearAdminSession();
            renderAdminEnrollSection();
        })
        .finally(() => {
            portalState.admin.isLoading = false;
            setAdminLoadingState(false);
        });
}

function loadAdminAttendance(event) {
    event?.preventDefault();
    if (!HAS_REMOTE_API) {
        return Promise.reject(new Error("Portal API missing"));
    }
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return Promise.reject(new Error("Missing admin auth"));
    }
    const url = buildApiUrl("/portal/admin/attendance");
    if (!url) return Promise.reject(new Error("Missing API base"));
    return fetch(url, {
        method: "GET",
        headers: getAdminAuthHeaders(),
        mode: "cors",
        credentials: "omit"
    })
        .then((res) => {
            if (res.status === 401) {
                throw new Error("Admin session expired.");
            }
            if (!res.ok) {
                throw new Error("Unable to load attendance feed.");
            }
            return res.json();
        })
        .then((data) => {
            portalState.admin.attendance = Array.isArray(data.sessions) ? data.sessions : [];
            renderAdminAttendance();
            if (portalEls.adminAttendance) {
                portalEls.adminAttendance.hidden = false;
            }
        })
        .catch((error) => {
            console.warn("loadAdminAttendance error:", error);
            if (portalEls.adminAttendanceBody) {
                portalEls.adminAttendanceBody.innerHTML = `<tr><td colspan="5">${error.message || "Unable to load attendance."}</td></tr>`;
            }
        });
}

function loadAdminEvents(event) {
    event?.preventDefault();
    if (!HAS_REMOTE_API) {
        return Promise.reject(new Error("Portal API missing"));
    }
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return Promise.reject(new Error("Missing admin auth"));
    }
    const url = buildApiUrl("/portal/admin/events");
    if (!url) return Promise.reject(new Error("Missing API base"));
    return fetch(url, {
        method: "GET",
        headers: getAdminAuthHeaders(),
        mode: "cors",
        credentials: "omit"
    })
        .then((res) => {
            if (res.status === 401) throw new Error("Admin session expired.");
            if (!res.ok) throw new Error("Unable to load events.");
            return res.json();
        })
        .then((data) => {
            portalState.admin.events = Array.isArray(data.events) ? data.events : [];
            portalState.admin.eventsGeneratedAt = data.generatedAt || null;
            renderAdminEvents();
            if (portalEls.adminEvents) {
                portalEls.adminEvents.hidden = false;
            }
        })
        .catch((error) => {
            console.warn("load events", error);
            if (portalEls.adminEventsBody) {
                portalEls.adminEventsBody.innerHTML = `<tr><td colspan="6">${error.message || "Unable to load events."}</td></tr>`;
            }
        });
}

function handleAdminEventSubmit(event) {
    event?.preventDefault();
    if (!HAS_REMOTE_API || !portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return;
    }
    const url = buildApiUrl("/portal/admin/events");
    const payload = {
        name: portalEls.adminEventName?.value || "",
        description: portalEls.adminEventDescription?.value || "",
        startAt: portalEls.adminEventStart?.value || "",
        endAt: portalEls.adminEventEnd?.value || "",
        capacity: portalEls.adminEventCapacity?.value || "",
        type: portalEls.adminEventType?.value || "Special Class",
        isActive: portalEls.adminEventActive?.checked || false
    };
    setAdminEventsStatus("Saving event...", "progress");
    fetch(url, {
        method: "POST",
        headers: getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
    })
        .then((res) => {
            if (!res.ok) throw new Error("Unable to save event.");
            return res.json();
        })
        .then((data) => {
            portalState.admin.events = Array.isArray(data.events) ? data.events : [];
            renderAdminEvents();
            clearAdminEventForm();
            setAdminEventsStatus("Event saved.", "success");
        })
        .catch((error) => {
            console.error("event submit", error);
            setAdminEventsStatus(error.message || "Unable to save event.", "error");
        });
}

function handleAdminEventAction(event) {
    const button = event.target.closest("button[data-action='toggle-event']");
    if (!button) return;
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return;
    }
    const eventId = button.dataset.eventId;
    const current = portalState.admin.events.find((ev) => ev.id === eventId);
    if (!eventId || !current) return;
    toggleAdminEvent(eventId, !current.isActive);
}

function toggleAdminEvent(eventId, activate) {
    if (!HAS_REMOTE_API) return;
    const url = buildApiUrl(`/portal/admin/events/${encodeURIComponent(eventId)}/toggle`);
    setAdminEventsStatus(activate ? "Activating event..." : "Hiding event...", "progress");
    fetch(url, {
        method: "POST",
        headers: getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ active: activate })
    })
        .then((res) => {
            if (!res.ok) throw new Error("Unable to update event.");
            return res.json();
        })
        .then((data) => {
            portalState.admin.events = Array.isArray(data.events) ? data.events : [];
            renderAdminEvents();
            setAdminEventsStatus(activate ? "Event activated." : "Event hidden.", "success");
        })
        .catch((error) => {
            console.error("toggle event", error);
            setAdminEventsStatus(error.message || "Unable to update event.", "error");
        });
}

function loadAdminRoster(options = {}) {
    const { silent = false } = options;
    if (!HAS_REMOTE_API) {
        return Promise.reject(new Error("Portal API missing"));
    }
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return Promise.reject(new Error("Missing admin auth"));
    }
    const url = buildApiUrl("/portal/admin/students");
    if (!url) return Promise.reject(new Error("Missing API base"));

    return fetch(url, {
        method: "GET",
        headers: getAdminAuthHeaders(),
        mode: "cors",
        credentials: "omit"
    })
        .then((res) => {
            if (res.status === 401) {
                throw new Error("Admin session expired.");
            }
            if (!res.ok) {
                throw new Error("Unable to load roster.");
            }
            return res.json();
        })
        .then((data) => {
            const roster = Array.isArray(data.students) ? data.students : [];
            portalState.admin.roster = filterDuplicateByName(roster, (student) => student.name || "");
            portalState.admin.rosterGeneratedAt = data.generatedAt || null;
            const selectedId = portalState.admin.rosterSelected?.id?.toLowerCase();
            if (selectedId) {
                const refreshed = portalState.admin.roster.find(
                    (entry) => entry.id?.toLowerCase() === selectedId
                );
                if (refreshed) {
                    portalState.admin.rosterSelected = { ...refreshed, ...portalState.admin.rosterSelected };
                }
            }
            renderAdminRoster();
            renderRosterDetail();
            if (!silent) {
                setAdminStatus("Roster updated.", "success");
            }
        })
        .catch((error) => {
            console.error("admin roster error:", error);
            if (!silent) {
                setAdminStatus(error.message || "Unable to load roster.");
            }
            throw error;
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

    if (!portalState.admin.isAuthorized) {
        portalEls.adminDashboard.hidden = true;
        return;
    }

    portalEls.adminDashboard.hidden = false;
    portalEls.adminDashboard.classList.toggle("is-expanded", portalState.admin.isExpanded);
    if (portalEls.adminExpand) {
        portalEls.adminExpand.textContent = portalState.admin.isExpanded
            ? "Collapse Panel"
            : "Expand Panel";
    }

    if (portalEls.adminGeneratedAt) {
        portalEls.adminGeneratedAt.textContent = portalState.admin.generatedAt
            ? formatDateTime(portalState.admin.generatedAt)
            : "—";
    }
    if (portalEls.adminEvents) {
        portalEls.adminEvents.hidden = false;
    }

    const summaryBody = portalEls.adminSummaryBody;
    summaryBody.innerHTML = "";
    summaryBody.innerHTML = "";

    if (!portalState.admin.summary.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.textContent = "No student activity has been recorded yet.";
        row.appendChild(cell);
        summaryBody.appendChild(row);
    } else {
        portalState.admin.summary.forEach((entry) => {
            const row = document.createElement("tr");
            const studentCell = document.createElement("td");
            studentCell.innerHTML = `<strong>${entry.studentId}</strong>`;
            if (entry.name) {
                const meta = document.createElement("div");
                meta.className = "certificate-meta";
                meta.textContent = entry.name;
                studentCell.appendChild(meta);
            }

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

            const statusCell = document.createElement("td");
            const statusPill = document.createElement("span");
            statusPill.className = `admin-status-pill ${
                entry.isSuspended ? "is-suspended" : "is-active"
            }`;
            statusPill.textContent = entry.isSuspended ? "Deactivated" : "Active";
            statusCell.appendChild(statusPill);
            if (entry.isSuspended && entry.suspendedReason) {
                const note = document.createElement("div");
                note.className = "certificate-meta";
                note.textContent = entry.suspendedReason;
                statusCell.appendChild(note);
            }

            const actionsCell = document.createElement("td");
            const actionsWrap = document.createElement("div");
            actionsWrap.className = "admin-row-actions";
            const reportBtn = document.createElement("button");
            reportBtn.type = "button";
            reportBtn.className = "text-link-btn";
            reportBtn.dataset.action = "report";
            reportBtn.dataset.studentId = entry.studentId;
            reportBtn.textContent = "Report Card";
            const suspendBtn = document.createElement("button");
            suspendBtn.type = "button";
            suspendBtn.className = "text-link-btn";
            suspendBtn.dataset.action = entry.isSuspended ? "resume" : "suspend";
            suspendBtn.dataset.studentId = entry.studentId;
            suspendBtn.textContent = entry.isSuspended ? "Reactivate" : "Deactivate";
            actionsWrap.append(reportBtn, suspendBtn);
            actionsCell.appendChild(actionsWrap);

            row.append(studentCell, totalCell, loginCell, latestCell, lastCell, statusCell, actionsCell);
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

    renderAdminAttendance();
    renderAdminEvents();
    renderAdminRoster();
    showAdminTab(portalState.admin.activeTab || "tab-dashboard");
}

function renderAdminAttendance() {
    if (!portalEls.adminAttendanceBody) {
        renderAdminEnrollSection();
        return;
    }
    const sessions = portalState.admin.attendance || [];
    portalEls.adminAttendanceBody.innerHTML = "";
    if (!sessions.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.textContent = "No attendance has been logged yet.";
        row.appendChild(cell);
        portalEls.adminAttendanceBody.appendChild(row);
        if (portalEls.adminAttendance) {
            portalEls.adminAttendance.hidden = true;
        }
        renderAdminEnrollSection();
        return;
    }
    if (portalEls.adminAttendance) {
        portalEls.adminAttendance.hidden = false;
    }
    sessions.forEach((session) => {
        const row = document.createElement("tr");
        const studentCell = document.createElement("td");
        studentCell.textContent = session.studentId;
        const classCell = document.createElement("td");
        classCell.innerHTML = `<strong>${session.classLevel || session.classType}</strong>`;
        const kioskCell = document.createElement("td");
        kioskCell.textContent = session.kioskId || "—";
        const percentCell = document.createElement("td");
        percentCell.textContent =
            typeof session.percentOfGoal === "number" ? `${session.percentOfGoal}%` : "—";
        const timeCell = document.createElement("td");
        timeCell.textContent = session.checkInAt ? formatDateTime(session.checkInAt) : "—";
        row.append(studentCell, classCell, kioskCell, percentCell, timeCell);
        portalEls.adminAttendanceBody.appendChild(row);
    });

    renderAdminEnrollSection();
}

function renderAdminEvents() {
    if (!portalEls.adminEventsBody) {
        return;
    }
    const events = portalState.admin.events || [];
    portalEls.adminEventsBody.innerHTML = "";
    if (!events.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = portalState.admin.isAuthorized ? "No special events yet." : "Sign in to load events.";
        row.appendChild(cell);
        portalEls.adminEventsBody.appendChild(row);
        renderAdminCalendar([]);
        return;
    }
    events.forEach((event) => {
        const row = document.createElement("tr");
        const nameCell = document.createElement("td");
        nameCell.innerHTML = `<strong>${event.name}</strong><div class="certificate-meta">${event.description || ""}</div>`;
        const typeCell = document.createElement("td");
        const typeBadge = document.createElement("span");
        typeBadge.className = "badge badge--gold";
        typeBadge.textContent = event.type || "Special Class";
        typeCell.appendChild(typeBadge);
        const windowCell = document.createElement("td");
        const start = event.startAt ? formatDateTime(event.startAt) : "—";
        const end = event.endAt ? formatDateTime(event.endAt) : "—";
        windowCell.textContent = end && end !== "—" ? `${start} → ${end}` : start;
        const capacityCell = document.createElement("td");
        capacityCell.textContent = event.capacity ? String(event.capacity) : "—";
        const statusCell = document.createElement("td");
        const pill = document.createElement("span");
        pill.className = `admin-status-pill ${event.isActive ? "is-active" : "is-suspended"}`;
        pill.textContent = event.isActive ? "Active" : "Hidden";
        statusCell.appendChild(pill);
        const actionsCell = document.createElement("td");
        const actionsWrap = document.createElement("div");
        actionsWrap.className = "admin-row-actions";
        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "text-link-btn";
        toggleBtn.dataset.action = "toggle-event";
        toggleBtn.dataset.eventId = event.id;
        toggleBtn.textContent = event.isActive ? "Deactivate" : "Activate";
        actionsWrap.append(toggleBtn);
        actionsCell.appendChild(actionsWrap);

        row.append(nameCell, typeCell, windowCell, capacityCell, statusCell, actionsCell);
        portalEls.adminEventsBody.appendChild(row);
    });

    renderAdminCalendar(events);
}

function renderAdminCalendar(events) {
    const calendarContainer = portalEls.adminCalendarUpcoming;
    if (!calendarContainer) return;
    calendarContainer.innerHTML = "";
    const activeEvents = events.filter((event) => event.isActive);
    const displayEvents = activeEvents.length ? activeEvents : events;
    if (!displayEvents.length) {
        const empty = document.createElement("p");
        empty.textContent = portalState.admin.isAuthorized
            ? "No active events scheduled. Add a Special Class or Tournament."
            : "Sign in to load the calendar.";
        calendarContainer.appendChild(empty);
        return;
    }
    const sorted = [...displayEvents].sort((a, b) => {
        const aStart = new Date(a.startAt || a.start_at || 0).getTime();
        const bStart = new Date(b.startAt || b.start_at || 0).getTime();
        return aStart - bStart;
    });

    sorted.forEach((event) => {
        const card = document.createElement("div");
        card.className = "profile-metric";
        const label = document.createElement("p");
        label.className = "profile-metric__label";
        label.textContent = event.type || "Special Class";
        const value = document.createElement("p");
        value.className = "profile-metric__value";
        const start = event.startAt ? formatDateTime(event.startAt) : "—";
        const end = event.endAt ? formatDateTime(event.endAt) : "";
        value.textContent = end ? `${start} → ${end}` : start;
        const meta = document.createElement("div");
        meta.className = "admin-card__meta";
        meta.textContent = event.name || "Event";
        card.append(label, value, meta);
        calendarContainer.appendChild(card);
    });
}

function handleAdminTabClick(event) {
    const button = event.target.closest("[data-admin-tab]");
    if (!button) return;
    const targetId = button.dataset.adminTab;
    if (!targetId) return;
    showAdminTab(targetId);
}

function showAdminTab(tabId) {
    const activeTab = tabId || "tab-dashboard";
    portalState.admin.activeTab = activeTab;
    try {
        localStorage.setItem(ADMIN_TAB_STORAGE_KEY, activeTab);
    } catch (error) {
        console.warn("admin tab storage", error);
    }

    const dataPanels = document.querySelectorAll("[data-admin-panel]");
    if (dataPanels.length) {
        dataPanels.forEach((panel) => {
            const targets = (panel.dataset.adminPanel || "")
                .split(/\s+/)
                .filter(Boolean);
            panel.hidden = !targets.includes(activeTab);
        });
    } else {
        const tabMapping = {
            "tab-dashboard": ["admin-summary", "admin-activity-card"],
            "tab-calendar": ["admin-calendar-card", "admin-attendance", "admin-events"],
            "tab-classes": ["admin-attendance", "class-session-card"],
            "tab-events": ["admin-events"],
            "tab-students": ["admin-roster", "admin-enroll"],
            "tab-membership": ["admin-roster"],
            "tab-notes": ["admin-notes", "admin-roster"],
            "tab-email": ["admin-email"],
            "tab-settings": ["admin-settings"]
        };
        const allSections = [
            "admin-summary",
            "admin-activity-card",
            "admin-calendar-card",
            "admin-attendance",
            "admin-events",
            "admin-roster",
            "admin-enroll",
            "admin-notes",
            "admin-settings",
            "class-session-card"
        ];
        const visible = tabMapping[activeTab] || [];
        allSections.forEach((id) => {
            const section = document.getElementById(id);
            if (section) {
                section.hidden = !visible.includes(id);
            }
        });
    }
    if (portalEls.adminTabs) {
        portalEls.adminTabs.querySelectorAll("[data-admin-tab]").forEach((btn) => {
            btn.classList.toggle("is-active", btn.dataset.adminTab === activeTab);
        });
    }

    if (activeTab === "tab-notes" && portalState.admin.rosterSelected?.id) {
        loadRosterNotes(portalState.admin.rosterSelected.id);
    }
}

function primeClassModalFromAttendance() {
    if (!Array.isArray(portalState.admin.attendance)) return;
    classModalState.attended = portalState.admin.attendance.slice(0, 6).map((session) => ({
        name: session.studentName || session.studentId || "Student",
        detail: session.classLevel || session.classType || "Class",
        at: session.checkInAt || session.createdAt || session.created_at || ""
    }));
}

function renderClassModalLists() {
    const columns = [
        { el: portalEls.classModalWaiting, items: classModalState.waiting, label: "Waiting" },
        { el: portalEls.classModalReserved, items: classModalState.reserved, label: "Reserved" },
        { el: portalEls.classModalAttended, items: classModalState.attended, label: "Attended" }
    ];
    columns.forEach((column) => {
        if (!column.el) return;
        column.el.innerHTML = "";
        if (!column.items.length) {
            const empty = document.createElement("li");
            empty.textContent = `No members in ${column.label.toLowerCase()}.`;
            column.el.appendChild(empty);
            return;
        }
        column.items.forEach((item) => {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${item.name}</strong><div class="certificate-meta">${item.detail || ""}</div>`;
            column.el.appendChild(li);
        });
    });
}

function addClassModalEntry(column, label) {
    if (!classModalState[column]) return;
    const nameInput = (portalEls.classModalMember?.value || "").trim();
    const name = label || nameInput;
    if (!name) return;
    classModalState[column].push({
        name,
        detail: portalEls.classModalWod?.value || "",
        at: new Date().toISOString()
    });
    if (portalEls.classModalMember) {
        portalEls.classModalMember.value = "";
    }
    renderClassModalLists();
}

function moveAllToAttended() {
    classModalState.attended.push(...classModalState.waiting, ...classModalState.reserved);
    classModalState.waiting = [];
    classModalState.reserved = [];
    renderClassModalLists();
}

function clearClassAttended() {
    classModalState.attended = [];
    renderClassModalLists();
}

function openClassModal(defaultAction) {
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return;
    }
    if (!portalEls.classModal) return;
    if (!classModalState.attended.length) {
        primeClassModalFromAttendance();
    }
    portalEls.classModal.hidden = false;
    document.body.classList.add("admin-modal-open");
    renderClassModalLists();
    if (defaultAction && portalEls.classModalMember) {
        portalEls.classModalMember.focus();
        if (defaultAction === "dropin" && !portalEls.classModalMember.value) {
            portalEls.classModalMember.value = "Drop-in Guest";
        }
    }
}

function closeClassModal() {
    if (!portalEls.classModal) return;
    portalEls.classModal.hidden = true;
    if (!portalEls.adminModal || portalEls.adminModal.hidden) {
        document.body.classList.remove("admin-modal-open");
    }
}

function handleClassActionButtons(event) {
    const button = event.target.closest("[data-class-action]");
    if (!button) return;
    const action = button.dataset.classAction;
    if (action === "reserve") {
        openClassModal("reserve");
        return;
    }
    if (action === "signin") {
        openClassModal("signin");
        return;
    }
    if (action === "dropin") {
        openClassModal("dropin");
        return;
    }
    if (action === "move-all") {
        moveAllToAttended();
        openClassModal();
        return;
    }
    if (action === "clear-attended") {
        clearClassAttended();
        openClassModal();
        return;
    }
    if (action === "open-modal") {
        openClassModal();
    }
}

function computeRosterAttendanceStats(studentId) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const summary = portalState.admin.rosterAttendanceSummary?.[studentId];
    if (summary) {
        const recent = Array.isArray(summary.recent) ? summary.recent : [];
        const count30 = recent.filter((entry) => {
            const ts = new Date(entry.checkInAt || entry.created_at || entry.createdAt || "").getTime();
            return Number.isFinite(ts) && now - ts <= 30 * dayMs;
        }).length;
        const totalWindow = summary.totals?.sessions ?? 0;
        const percent =
            typeof summary.attendancePercent === "number" ? Number(summary.attendancePercent) : null;
        return {
            last30: count30 ? `${count30} in 30d` : totalWindow ? "0 in last 30d" : "No logs",
            last60:
                percent !== null
                    ? `${percent}% of goal (${totalWindow} sessions)`
                    : `${totalWindow} in 60d`
        };
    }

    const sessions = (portalState.admin.attendance || []).filter(
        (session) => session.studentId?.toLowerCase() === studentId?.toLowerCase()
    );
    const count30 = sessions.filter((session) => {
        const ts = new Date(session.checkInAt || "").getTime();
        return Number.isFinite(ts) && now - ts <= 30 * dayMs;
    }).length;
    const count60 = sessions.filter((session) => {
        const ts = new Date(session.checkInAt || "").getTime();
        return Number.isFinite(ts) && now - ts <= 60 * dayMs;
    }).length;
    return {
        last30: count30 ? `${count30} in 30d` : "No logs",
        last60: count60 ? `${count60} in ~60d` : "No logs"
    };
}

function getRosterLastAttendance(studentId) {
    if (!studentId) return "No attendance yet";
    const summary = portalState.admin.rosterAttendanceSummary?.[studentId];
    const recentCheck =
        summary?.totals?.lastSession ||
        (Array.isArray(summary?.recent) && summary.recent.length ? summary.recent[0].checkInAt : null);
    if (recentCheck) {
        return formatDateTime(recentCheck);
    }
    const session = (portalState.admin.attendance || []).find(
        (entry) => entry.studentId?.toLowerCase() === studentId.toLowerCase()
    );
    if (session?.checkInAt) {
        return formatDateTime(session.checkInAt);
    }
    return "No attendance yet";
}

function renderAdminRoster() {
    if (!portalEls.adminRosterBody) return;
    const roster = portalState.admin.roster || [];
    portalEls.adminRosterBody.innerHTML = "";
    if (!roster.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.textContent = portalState.admin.isAuthorized
            ? "No students found."
            : "Sign in to load the roster.";
        row.appendChild(cell);
        portalEls.adminRosterBody.appendChild(row);
        if (portalEls.adminRoster) {
            portalEls.adminRoster.hidden = !portalState.admin.isAuthorized;
        }
        return;
    }
    if (portalEls.adminRoster) {
        portalEls.adminRoster.hidden = false;
    }
    roster.forEach((student) => {
        const row = document.createElement("tr");
        row.dataset.studentId = student.id || "";
        row.classList.add("admin-roster-row");
        const idCell = document.createElement("td");
        idCell.innerHTML = `<strong>${student.id}</strong>`;
        const nameCell = document.createElement("td");
        nameCell.textContent = student.name || "—";
        const membershipCell = document.createElement("td");
        membershipCell.textContent = student.membershipType || "Not set";

        const beltCell = document.createElement("td");
        beltCell.textContent = student.currentBelt || "—";

        const statusCell = document.createElement("td");
        const pill = document.createElement("span");
        pill.className = `admin-status-pill ${
            student.isSuspended ? "is-suspended" : "is-active"
        }`;
        pill.textContent = student.isSuspended ? "Deactivated" : "Active";
        statusCell.appendChild(pill);
        if (student.suspendedReason) {
            const note = document.createElement("div");
            note.className = "certificate-meta";
            note.textContent = student.suspendedReason;
            statusCell.appendChild(note);
        }

        const updatedCell = document.createElement("td");
        updatedCell.textContent = student.updatedAt ? formatDateTime(student.updatedAt) : "—";

        const actionsCell = document.createElement("td");
        const actionsWrap = document.createElement("div");
        actionsWrap.className = "admin-row-actions";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "text-link-btn";
        openBtn.dataset.action = "detail";
        openBtn.dataset.studentId = student.id;
        openBtn.textContent = "Details";
        openBtn.title = "Open roster detail to edit info and attendance";

        const suspendBtn = document.createElement("button");
        suspendBtn.type = "button";
        suspendBtn.className = "text-link-btn";
        suspendBtn.dataset.action = student.isSuspended ? "resume" : "suspend";
        suspendBtn.dataset.studentId = student.id;
        suspendBtn.textContent = student.isSuspended ? "Reactivate" : "Deactivate";

        const reportBtn = document.createElement("button");
        reportBtn.type = "button";
        reportBtn.className = "text-link-btn";
        reportBtn.dataset.action = "report";
        reportBtn.dataset.studentId = student.id;
        reportBtn.textContent = "Report Card";

        actionsWrap.append(openBtn, reportBtn, suspendBtn);
        actionsCell.appendChild(actionsWrap);

        row.append(idCell, nameCell, membershipCell, beltCell, statusCell, updatedCell, actionsCell);
        portalEls.adminRosterBody.appendChild(row);
    });
}

function renderAdminEnrollSection() {
    if (!portalEls.adminEnroll) {
        return;
    }
    const isAuthorized = portalState.admin.isAuthorized;
    portalEls.adminEnroll.hidden = !isAuthorized;
    if (!isAuthorized) {
        if (portalEls.adminEnrollResult) {
            portalEls.adminEnrollResult.hidden = true;
        }
        if (portalEls.adminEnrollDetails) {
            portalEls.adminEnrollDetails.innerHTML = "";
        }
        setAdminEnrollStatus("");
        syncAdminEnrollButtonState();
        return;
    }
    const summary = portalState.admin.newStudent;
    if (!summary || !summary.student) {
        if (portalEls.adminEnrollResult) {
            portalEls.adminEnrollResult.hidden = true;
        }
        if (portalEls.adminEnrollDetails) {
            portalEls.adminEnrollDetails.innerHTML = "";
        }
    } else if (portalEls.adminEnrollResult && portalEls.adminEnrollDetails) {
        const student = summary.student || {};
        const login = summary.login || {};
        const attendanceSeeded = Number(summary.attendanceSeeded ?? 0);
        const birthDate = login.birthDate || student.birthDate || "—";
        const contactParts = [student.email, student.phone].filter(Boolean);
        const cards = [
            { label: "Student ID", value: student.id || "—" },
            { label: "Birth Date", value: birthDate },
            {
                label: "Portal Login",
                value: student.id ? `${student.id} + DOB (${birthDate})` : "ID + DOB"
            },
            {
                label: "Attendance",
                value: attendanceSeeded
                    ? `${attendanceSeeded} session${attendanceSeeded === 1 ? "" : "s"}`
                    : "No sessions seeded"
            },
            {
                label: "Contact",
                value: contactParts.length ? contactParts.join(" · ") : "—"
            }
        ];
        portalEls.adminEnrollDetails.innerHTML = "";
        cards.forEach((card) => {
            const wrapper = document.createElement("div");
            wrapper.className = "admin-enroll__detail";
            const label = document.createElement("span");
            label.textContent = card.label;
            const value = document.createElement("strong");
            value.textContent = card.value;
            wrapper.append(label, value);
            portalEls.adminEnrollDetails.appendChild(wrapper);
        });
        portalEls.adminEnrollResult.hidden = false;
    }
    syncAdminEnrollButtonState();
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

function setStudentModalStatus(message, variant = "error") {
    if (!portalEls.studentModalStatus) return;
    portalEls.studentModalStatus.textContent = message || "";
    portalEls.studentModalStatus.classList.toggle("is-success", variant === "success");
    portalEls.studentModalStatus.classList.toggle("is-progress", variant === "progress");
}

function setAdminEnrollStatus(message, variant = "error") {
    if (!portalEls.adminEnrollStatus) return;
    portalEls.adminEnrollStatus.textContent = message || "";
    portalEls.adminEnrollStatus.classList.toggle("is-success", variant === "success");
    portalEls.adminEnrollStatus.classList.toggle("is-progress", variant === "progress");
}

function setAdminEventsStatus(message, variant = "error") {
    if (!portalEls.adminEventsStatus) return;
    portalEls.adminEventsStatus.textContent = message || "";
    portalEls.adminEventsStatus.classList.toggle("is-success", variant === "success");
    portalEls.adminEventsStatus.classList.toggle("is-progress", variant === "progress");
}

function setAdminEmailStatus(message, variant = "error") {
    if (!portalEls.adminEmailStatus) return;
    portalEls.adminEmailStatus.textContent = message || "";
    portalEls.adminEmailStatus.classList.toggle("is-success", variant === "success");
    portalEls.adminEmailStatus.classList.toggle("is-progress", variant === "progress");
}

function clearAdminEventForm() {
    portalEls.adminEventName && (portalEls.adminEventName.value = "");
    portalEls.adminEventDescription && (portalEls.adminEventDescription.value = "");
    portalEls.adminEventStart && (portalEls.adminEventStart.value = "");
    portalEls.adminEventEnd && (portalEls.adminEventEnd.value = "");
    portalEls.adminEventCapacity && (portalEls.adminEventCapacity.value = "");
    portalEls.adminEventType && (portalEls.adminEventType.value = "Special Class");
    if (portalEls.adminEventActive) {
        portalEls.adminEventActive.checked = false;
    }
}

function handleAdminEmailSubmit(event) {
    event?.preventDefault();
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return;
    }
    if (!HAS_REMOTE_API) return;
    const recipientType = portalEls.adminEmailTarget?.value || "all";
    const subject = portalEls.adminEmailSubject?.value?.trim() || "";
    const message = portalEls.adminEmailBody?.value?.trim() || "";
    if (!subject || !message) {
        setAdminEmailStatus("Add a subject and message.");
        return;
    }
    const url = buildApiUrl("/portal/admin/email/send");
    if (!url) return;
    setAdminEmailStatus("Sending email...", "progress");
    fetch(url, {
        method: "POST",
        headers: getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
            recipientType,
            subject,
            message
        })
    })
        .then((res) => {
            if (!res.ok) throw new Error("Unable to send email.");
            return res.json();
        })
        .then(() => {
            setAdminEmailStatus("Email queued for delivery.", "success");
            setAdminStatus("Email queued for delivery.", "success");
            if (portalEls.adminEmailBody) portalEls.adminEmailBody.value = "";
        })
        .catch((error) => {
            console.error("email send", error);
            setAdminEmailStatus(error.message || "Unable to send email.", "error");
        });
}

function setAdminLoadingState(isLoading) {
    const submitBtn = portalEls.adminForm?.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = Boolean(isLoading);
    }
    if (portalEls.adminRefresh) {
        portalEls.adminRefresh.disabled = Boolean(isLoading);
    }
    if (portalEls.adminRosterRefresh) {
        portalEls.adminRosterRefresh.disabled = Boolean(isLoading);
    }
    syncAdminEnrollButtonState();
}

function syncAdminEnrollButtonState() {
    const enrollButton = portalEls.adminEnrollForm?.querySelector("button[type='submit']");
    if (!enrollButton) return;
    const disabled = Boolean(
        portalState.admin.isLoading || portalState.admin.isCreatingStudent || !portalState.admin.isAuthorized
    );
    enrollButton.disabled = disabled;
}

function toggleAdminPanelSize() {
    portalState.admin.isExpanded = !portalState.admin.isExpanded;
    if (portalEls.adminDashboard) {
        portalEls.adminDashboard.classList.toggle("is-expanded", portalState.admin.isExpanded);
    }
    if (portalEls.adminExpand) {
        portalEls.adminExpand.textContent = portalState.admin.isExpanded
            ? "Collapse Panel"
            : "Expand Panel";
    }
}

function downloadAdminSummary() {
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return;
    }
    if (!portalState.admin.summary.length) {
        setAdminStatus("No data to download yet.");
        return;
    }
    const headers = [
        "Student ID",
        "Name",
        "Current Belt",
        "Total Events",
        "Logins",
        "Last Activity",
        "Latest Belt",
        "Latest Upload",
        "Status",
        "Suspended Reason"
    ];
    const rows = portalState.admin.summary.map((entry) => [
        entry.studentId,
        entry.name || "",
        entry.currentBelt || "",
        entry.totalEvents ?? 0,
        entry.loginEvents ?? 0,
        entry.lastEventAt ? formatDateTime(entry.lastEventAt) : "",
        entry.latestBelt || "",
        entry.latestBeltUploadedAt ? formatDateTime(entry.latestBeltUploadedAt) : "",
        entry.isSuspended ? "Suspended" : "Active",
        entry.suspendedReason || ""
    ]);
    const csv = [headers, ...rows]
        .map((cols) =>
            cols
                .map((value) => {
                    const safe = value ?? "";
                    if (typeof safe === "string" && safe.includes(",")) {
                        return `"${safe.replace(/"/g, '""')}"`;
                    }
                    return safe;
                })
                .join(",")
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `portal-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function handleAdminSummaryAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return;
    }
    const studentId = button.dataset.studentId;
    const action = button.dataset.action;
    if (!studentId || !action) return;
    if (action === "report") {
        openReportCard(studentId);
        return;
    }
    const suspend = action === "suspend";
    let reason = "";
    if (suspend) {
        reason = window.prompt("Enter suspension reason", "Billing issue") || "";
    }
    updateStudentSuspension(studentId, suspend, reason);
}

function updateStudentSuspension(studentId, suspend, reason = "") {
    if (!HAS_REMOTE_API) return;
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return;
    }
    const url = buildApiUrl("/portal/admin/suspensions");
    if (!url) return;
    fetch(url, {
        method: "POST",
        headers: getAdminAuthHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            studentId,
            action: suspend ? "suspend" : "resume",
            reason
        })
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Unable to update suspension.");
            }
            return response.json();
        })
        .then((data) => {
            const updated = data.student;
            const record = portalState.admin.summary.find(
                (entry) => entry.studentId?.toLowerCase() === studentId.toLowerCase()
            );
            if (updated) {
                const rosterIdx = portalState.admin.roster.findIndex(
                    (s) => s.id?.toLowerCase() === updated.id?.toLowerCase()
                );
                if (rosterIdx >= 0) {
                    portalState.admin.roster[rosterIdx] = {
                        ...portalState.admin.roster[rosterIdx],
                        ...updated
                    };
                }
                if (portalState.admin.rosterSelected?.id?.toLowerCase() === updated.id?.toLowerCase()) {
                    portalState.admin.rosterSelected = {
                        ...portalState.admin.rosterSelected,
                        ...updated
                    };
                    renderRosterDetail();
                    renderStudentModal();
                }
            }
            if (record && updated) {
                record.isSuspended = Boolean(updated.isSuspended);
                record.suspendedReason = updated.suspendedReason || null;
                record.suspendedAt = updated.suspendedAt || null;
            }
            setAdminStatus(
                suspend ? `${studentId} suspended.` : `${studentId} reinstated.`,
                "success"
            );
            renderAdminDashboard();
        })
        .catch((error) => {
            console.error("updateStudentSuspension error:", error);
            setAdminStatus(error.message || "Unable to update account.", "error");
        });
}

function openReportCard(studentId) {
    if (!HAS_REMOTE_API || !studentId) return;
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return;
    }
    const url = buildApiUrl(`/portal/admin/report-card/${encodeURIComponent(studentId)}`);
    if (!url) return;
    setAdminStatus("Generating report card...", "progress");
    fetch(url, {
        method: "GET",
        headers: getAdminAuthHeaders(),
        mode: "cors",
        credentials: "omit"
    })
        .then((res) => {
            if (!res.ok) {
                throw new Error("Unable to load report card.");
            }
            return res.json();
        })
        .then((data) => {
            portalState.admin.reportCard = data;
            renderReportCard();
            setAdminStatus(`Report card ready for ${data.student?.id || ""}.`, "success");
        })
        .catch((error) => {
            console.error("openReportCard error:", error);
            setAdminStatus(error.message || "Unable to load report card.", "error");
        });
}

function renderReportCard() {
    if (!portalEls.reportCardModal || !portalEls.reportCardBody) return;
    const report = portalState.admin.reportCard;
    if (!report) {
        portalEls.reportCardBody.innerHTML = "<p>Select a student to view report card details.</p>";
        portalEls.reportCardModal.hidden = true;
        return;
    }
    const student = report.student || {};
    const attendance = report.attendance || {};
    const progress = report.progress?.records || [];
    const membership = report.membershipType || student.membershipType || "Not set";
    const summaryHtml = `
        <div class="report-card-section">
            <h4>Student</h4>
            <p><strong>${student.name || student.id}</strong><br>ID: ${
        student.id
    }<br>Current Belt: ${student.currentBelt || "—"}<br>Membership: ${membership}</p>
        </div>
        <div class="report-card-section">
            <h4>Attendance (Last 60 days)</h4>
            <p>Sessions: ${attendance.totals?.sessions ?? 0} • Percent of Goal: ${
        attendance.attendancePercent ?? 0
    }%</p>
            <ul>
                ${(attendance.recent || [])
                    .map(
                        (session) =>
                            `<li>${formatDateTime(session.checkInAt)} — ${session.classType} (${session.classLevel || "All Levels"})</li>`
                    )
                    .join("") || "<li>No recent check-ins.</li>"}
            </ul>
        </div>
        <div class="report-card-section">
            <h4>Belt Progress</h4>
            <ul>
                ${
                    progress.length
                        ? progress
                              .map(
                                  (record) =>
                                      `<li>${record.beltSlug} • ${record.fileName || "Certificate"} • ${formatDateTime(record.uploadedAt)}</li>`
                              )
                              .join("")
                        : "<li>No certificates uploaded yet.</li>"
                }
            </ul>
        </div>
    `;
    portalEls.reportCardBody.innerHTML = summaryHtml;
    portalEls.reportCardModal.hidden = false;
}

function closeReportCard() {
    if (!portalEls.reportCardModal) return;
    portalEls.reportCardModal.hidden = true;
    portalState.admin.reportCard = null;
}

function downloadReportCard() {
    const report = portalState.admin.reportCard;
    if (!report) {
        setAdminStatus("Load a report card first.");
        return;
    }
    const payload = JSON.stringify(report, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-card-${report.student?.id || "student"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
}

async function loadAttendanceSummary(studentId) {
    if (!HAS_REMOTE_API || !studentId) {
        return;
    }
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const url = buildApiUrl(
        `/portal/attendance/${encodeURIComponent(studentId)}?since=${encodeURIComponent(since)}`
    );
    if (!url) return;

    try {
        const res = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${portalState.sessionToken || readAuthToken()}`
            }
        });
        if (!res.ok) {
            throw new Error("Unable to load attendance summary.");
        }
        const data = await res.json();
        portalState.attendanceSummary[studentId] = data;
        updateAttendanceSummaryDisplay(studentId);
    } catch (error) {
        console.warn("loadAttendanceSummary error:", error);
    }
}

function updateAttendanceSummaryDisplay(studentId) {
    if (!portalEls.readinessAutoSummary) return;
    const summary = portalState.attendanceSummary?.[studentId];
    if (!summary) {
        portalEls.readinessAutoSummary.textContent = "";
        if (portalEls.readinessAttendance) {
            portalEls.readinessAttendance.innerHTML = "";
        }
        return;
    }
    const percent = typeof summary.attendancePercent === "number" ? summary.attendancePercent : 0;
    portalEls.readinessPercentDisplay.textContent = `${percent}%`;
    portalEls.readinessAutoSummary.textContent = `Attendance goal progress: ${percent}%`;
    if (portalEls.readinessLessonDisplay) {
        portalEls.readinessLessonDisplay.style.display = "none";
    }
    if (portalEls.readinessChecklist) {
        portalEls.readinessChecklist.style.display = "none";
    }
    if (portalEls.readinessAttendance) {
        portalEls.readinessAttendance.innerHTML = "";
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
    const attendancePenalty = portalState.attendanceSummary[student.id]?.penalty;
    const penaltyMessage = portalState.attendanceSummary[student.id]?.penaltyMessage;
    if (attendancePenalty && penaltyMessage) {
        readinessState.missing.push(penaltyMessage);
        readinessState.isReady = false;
    }
    portalState.currentReadiness = readinessState;
    const entry = readinessState.entry;

    if (portalEls.readinessTargetLabel) {
        portalEls.readinessTargetLabel.textContent = `${targetBelt.name}: attendance goal`;
    }

    if (portalEls.readinessReadyPill) {
        portalEls.readinessReadyPill.textContent = readinessState.isReady ? "Ready" : "Locked";
        portalEls.readinessReadyPill.classList.toggle("is-ready", readinessState.isReady);
        portalEls.readinessReadyPill.classList.toggle("is-missing", !readinessState.isReady);
    }

    if (portalEls.readinessPercentDisplay) {
        portalEls.readinessPercentDisplay.textContent = formatPercent(readinessState.attendancePercent);
    }

    if (portalEls.readinessLessonDisplay) {
        portalEls.readinessLessonDisplay.style.display = "none";
    }

    if (portalEls.readinessChecklist) {
        portalEls.readinessChecklist.style.display = "none";
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

async function validateCertificateFile(file) {
    if (!file) {
        setStatus("Select a certificate to upload.", "error");
        return false;
    }
    if (!file.type.startsWith("image/")) {
        setStatus(
            "Upload a clear photo (JPG or PNG) of the official Ara TKD certificate.",
            "error"
        );
        return false;
    }
    if (typeof Tesseract === "undefined") {
        console.warn("Tesseract unavailable, skipping certificate validation.");
        return true;
    }
    setStatus("Validating certificate design...", "progress");
    const ocrText = await runCertificateOcr(file);
    const normalized = ocrText.toLowerCase();
    const hits = CERTIFICATE_KEYWORDS.filter((keyword) => normalized.includes(keyword));
    if (hits.length < Math.ceil(CERTIFICATE_KEYWORDS.length / 2)) {
        setStatus(
            "We couldn't verify that document. Please upload the official Certificate of Rank.",
            "error"
        );
        return false;
    }
    return true;
}

function runCertificateOcr(file) {
    return new Promise((resolve, reject) => {
        if (typeof Tesseract === "undefined") {
            resolve("");
            return;
        }
        Tesseract.recognize(file, "eng")
            .then((result) => resolve(result?.data?.text || ""))
            .catch((error) => reject(error));
    });
}

async function handleCertificateUpload(file, belt, beltIndex) {
    if (!portalState.activeStudent) return;

    if (file.size > MAX_FILE_SIZE) {
        setStatus("Files up to 10MB please. Compress large photos if needed.", "error");
        return;
    }

    if (file.type === "application/pdf") {
        setStatus("Upload a photo of the certificate instead of a PDF.", "error");
        return;
    }

    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
        setStatus("Use photo formats (JPG, PNG, HEIC).", "error");
        return;
    }

    const isValid = await validateCertificateFile(file);
    if (!isValid) {
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
        source: certificate.source || existing.source || "local",
        pendingSync:
            typeof certificate.pendingSync === "boolean"
                ? certificate.pendingSync
                : true
    };

    portalState.certificates[studentId][beltName] = merged;
    persistCertificates();
}

function markCertificateSynced(studentId, beltSlug, uploadedAt) {
    if (!studentId || !beltSlug) return;
    const certificates = portalState.certificates[studentId];
    if (!certificates) return;
    const beltData = resolveBeltDataBySlug(beltSlug);
    let beltName = beltData?.name || null;
    if (!beltName) {
        beltName =
            Object.keys(certificates).find((name) => {
                const record = certificates[name];
                if (!record) return false;
                if (record.beltSlug && record.beltSlug === beltSlug) {
                    return true;
                }
                const normalized = slugifyBeltName(name);
                return normalized === beltSlug;
            }) || null;
    }
    if (!beltName || !certificates[beltName]) return;
    certificates[beltName].pendingSync = false;
    certificates[beltName].source = "server";
    if (uploadedAt) {
        certificates[beltName].uploadedAt = uploadedAt;
    }
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
        source: record.source || "local",
        pendingSync: Boolean(record.pendingSync)
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
            record.pendingSync = Boolean(record.pendingSync);
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

function handleAdminRosterAction(event) {
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest("tr[data-student-id]");
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return;
    }
    if (!button && row) {
        const targetId = row.dataset.studentId;
        if (targetId) {
            openStudentModal(targetId);
        }
        return;
    }
    if (!button) return;
    const studentId = button.dataset.studentId;
    const action = button.dataset.action;
    if (!studentId || !action) return;
    if (action === "detail") {
        openStudentModal(studentId);
        return;
    }
    if (action === "report") {
        openReportCard(studentId);
        return;
    }
    const suspend = action === "suspend";
    let reason = "";
    if (suspend) {
        reason = window.prompt("Enter suspension reason", "Billing issue") || "";
    }
    updateStudentSuspension(studentId, suspend, reason);
}

function setRosterEditStatus(message, variant = "error") {
    if (!portalEls.adminRosterEditStatus) return;
    portalEls.adminRosterEditStatus.textContent = message || "";
    portalEls.adminRosterEditStatus.classList.toggle("is-success", variant === "success");
    portalEls.adminRosterEditStatus.classList.toggle("is-progress", variant === "progress");
}

function updateRosterAttendanceSummary(studentId, summary) {
    if (!studentId || !summary) return;
    portalState.admin.rosterAttendanceSummary = portalState.admin.rosterAttendanceSummary || {};
    portalState.admin.rosterAttendanceSummary[studentId] = summary;
}

function loadRosterProfile(studentId) {
    if (!HAS_REMOTE_API || !studentId) return;
    const url = buildApiUrl(`/portal/admin/students/${encodeURIComponent(studentId)}/profile`);
    if (!url) return;
    setAdminStatus("Loading roster detail...", "progress");
    fetch(url, {
        method: "GET",
        headers: getAdminAuthHeaders(),
        mode: "cors",
        credentials: "omit"
    })
        .then((res) => {
            if (!res.ok) {
                throw new Error("Unable to load roster detail.");
            }
            return res.json();
        })
        .then((data) => {
            if (data.student) {
                const rosterIndex = portalState.admin.roster.findIndex(
                    (entry) => entry.id?.toLowerCase() === data.student.id?.toLowerCase()
                );
                if (rosterIndex >= 0) {
                    portalState.admin.roster[rosterIndex] = {
                        ...portalState.admin.roster[rosterIndex],
                        ...data.student
                    };
                }
                portalState.admin.rosterSelected = data.student;
            }
            if (Array.isArray(data.notes)) {
                portalState.admin.rosterNotes = data.notes;
            }
            if (data.attendance) {
                updateRosterAttendanceSummary(studentId, data.attendance);
            }
            renderRosterDetail();
            renderRosterNotes();
            renderStudentModal();
            setAdminStatus("Roster detail loaded.", "success");
        })
        .catch((error) => {
            console.error("loadRosterProfile error", error);
            setAdminStatus(error.message || "Unable to load roster detail.", "error");
            loadRosterNotes(studentId);
        });
}

function openStudentModal(studentId) {
    if (!portalState.admin.isAuthorized) {
        setAdminStatus("Sign in first.");
        return;
    }
    const roster = portalState.admin.roster || [];
    const previousId = portalState.admin.rosterSelected?.id;
    const selected =
        roster.find((s) => s.id?.toLowerCase() === studentId?.toLowerCase()) ||
        portalState.admin.rosterSelected;
    if (selected) {
        portalState.admin.rosterSelected = selected;
        if (!previousId || previousId.toLowerCase() !== selected.id?.toLowerCase()) {
            portalState.admin.rosterNotes = [];
            renderRosterNotes();
        }
    }
    portalState.admin.studentModalPanel = "overview";
    setStudentModalStatus("");
    renderRosterDetail();
    renderStudentModal();
    if (portalEls.studentModal) {
        portalEls.studentModal.hidden = false;
        document.body.classList.add("admin-modal-open");
    }
    if (selected?.id) {
        loadRosterProfile(selected.id);
    }
}

function closeStudentModal() {
    if (!portalEls.studentModal) return;
    portalEls.studentModal.hidden = true;
    if (
        (!portalEls.adminModal || portalEls.adminModal.hidden) &&
        (!portalEls.classModal || portalEls.classModal.hidden)
    ) {
        document.body.classList.remove("admin-modal-open");
    }
}

function handleRosterEditSubmit(event) {
    event?.preventDefault();
    if (!portalState.admin.rosterSelected) {
        setAdminStatus("Select a student first.");
        return;
    }
    if (!HAS_REMOTE_API) return;
    const studentId = portalState.admin.rosterSelected.id;
    const payload = {
        name: portalEls.adminRosterName?.value || "",
        email: portalEls.adminRosterEmail?.value || "",
        phone: portalEls.adminRosterPhone?.value || "",
        currentBelt: portalEls.adminRosterBelt?.value || "",
        status: portalEls.adminRosterStatus?.value || "",
        membershipType: portalEls.adminRosterMembership?.value || ""
    };

    const url = buildApiUrl(`/portal/admin/students/${encodeURIComponent(studentId)}`);
    setRosterEditStatus("Saving roster changes...", "progress");
    fetch(url, {
        method: "PATCH",
        headers: getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
    })
        .then((res) => {
            if (!res.ok) throw new Error("Unable to save roster changes.");
            return res.json();
        })
        .then((data) => {
            const updated = data.student;
            if (updated) {
                const idx = portalState.admin.roster.findIndex(
                    (s) => s.id?.toLowerCase() === updated.id?.toLowerCase()
                );
                if (idx >= 0) {
                    portalState.admin.roster[idx] = { ...portalState.admin.roster[idx], ...updated };
                }
                portalState.admin.rosterSelected = { ...portalState.admin.rosterSelected, ...updated };
                renderAdminRoster();
                renderRosterDetail();
                renderStudentModal();
            }
            setRosterEditStatus("Roster updated.", "success");
            setAdminStatus("Roster updated.", "success");
        })
        .catch((error) => {
            console.error("Roster edit", error);
            setRosterEditStatus(error.message || "Unable to save roster.", "error");
        });
}

function handleAdminMembershipSave(event) {
    event?.preventDefault();
    if (!portalState.admin.rosterSelected) {
        setAdminStatus("Select a student first.");
        return;
    }
    if (!HAS_REMOTE_API) return;
    const studentId = portalState.admin.rosterSelected.id;
    const membershipType = portalEls.adminRosterMembership?.value || "";
    const url = buildApiUrl("/portal/admin/students/membership");
    fetch(url, {
        method: "POST",
        headers: getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ studentId, membershipType })
    })
        .then((res) => {
            if (!res.ok) throw new Error("Unable to save membership.");
            return res.json();
        })
        .then((data) => {
            const updated = data.student;
            if (updated) {
                const idx = portalState.admin.roster.findIndex(
                    (s) => s.id?.toLowerCase() === updated.id?.toLowerCase()
                );
                if (idx >= 0) {
                    portalState.admin.roster[idx] = { ...portalState.admin.roster[idx], ...updated };
                }
                portalState.admin.rosterSelected = updated;
                renderAdminRoster();
                renderRosterDetail();
                renderStudentModal();
            }
            setAdminStatus("Membership updated.", "success");
            setStudentModalStatus("Membership updated.", "success");
        })
        .catch((error) => {
            console.error("membership save", error);
            setAdminStatus(error.message || "Unable to save membership.", "error");
            setStudentModalStatus(error.message || "Unable to save membership.", "error");
        });
}

function setAttendanceAdjustStatus(message, variant = "error") {
    if (!portalEls.adminAttendanceAdjustStatus) return;
    portalEls.adminAttendanceAdjustStatus.textContent = message || "";
    portalEls.adminAttendanceAdjustStatus.classList.toggle("is-success", variant === "success");
    portalEls.adminAttendanceAdjustStatus.classList.toggle("is-progress", variant === "progress");
}

function handleAttendanceAdjust(event) {
    event?.preventDefault();
    if (!portalState.admin.rosterSelected) {
        setAdminStatus("Select a student first.");
        return;
    }
    if (!HAS_REMOTE_API) return;
    const studentId = portalState.admin.rosterSelected.id;
    const submitter = event?.submitter;
    const isRemoval = submitter?.dataset?.adjust === "remove";
    const rawValue = Number.parseInt(portalEls.adminAttendanceAdjustValue?.value || "0", 10);
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
        setAttendanceAdjustStatus("Enter how many sessions to adjust.", "error");
        return;
    }
    const delta = isRemoval ? rawValue * -1 : rawValue;
    const classType = portalEls.adminAttendanceAdjustClass?.value || "basic";
    const classLevel = portalEls.adminAttendanceAdjustLevel?.value || "";
    const note = portalEls.adminAttendanceAdjustNote?.value || "";
    adjustStudentAttendance(studentId, delta, { classType, classLevel, note });
}

function adjustStudentAttendance(studentId, delta, options = {}) {
    const url = buildApiUrl("/portal/admin/attendance/adjust");
    if (!url) return;
    setAttendanceAdjustStatus("Applying attendance change...", "progress");
    fetch(url, {
        method: "POST",
        headers: getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
            studentId,
            delta,
            classType: options.classType,
            classLevel: options.classLevel,
            note: options.note
        })
    })
        .then((res) => {
            if (!res.ok) {
                throw new Error("Unable to adjust attendance.");
            }
            return res.json();
        })
        .then((data) => {
            if (data.student) {
                const idx = portalState.admin.roster.findIndex(
                    (s) => s.id?.toLowerCase() === data.student.id?.toLowerCase()
                );
                if (idx >= 0) {
                    portalState.admin.roster[idx] = { ...portalState.admin.roster[idx], ...data.student };
                }
                portalState.admin.rosterSelected = { ...portalState.admin.rosterSelected, ...data.student };
            }
            if (data.attendance) {
                updateRosterAttendanceSummary(studentId, data.attendance);
            }
            renderAdminRoster();
            renderRosterDetail();
            renderStudentModal();
            loadAdminAttendance();
            setAttendanceAdjustStatus(
                `Attendance adjusted (${data.added || 0} added, ${data.removed || 0} removed).`,
                "success"
            );
            setAdminStatus("Attendance updated.", "success");
        })
        .catch((error) => {
            console.error("adjust attendance", error);
            setAttendanceAdjustStatus(error.message || "Unable to adjust attendance.", "error");
        });
}

function handleAdminNoteSubmit(event) {
    event?.preventDefault();
    if (!portalState.admin.rosterSelected) {
        setAdminStatus("Select a student first.");
        setStudentModalStatus("Select a student first.");
        return;
    }
    if (!HAS_REMOTE_API) return;
    const studentId = portalState.admin.rosterSelected.id;
    const isModal = event?.target?.id === "student-modal-note-form";
    const noteType = (isModal ? portalEls.studentModalNoteType : portalEls.adminRosterNoteType)?.value || "note";
    const message =
        (isModal
            ? portalEls.studentModalNoteMessage?.value
            : portalEls.adminRosterNoteMessage?.value
        )?.trim() || "";
    const author =
        (isModal ? portalEls.studentModalNoteAuthor : portalEls.adminRosterNoteAuthor)?.value?.trim() ||
        "Admin";
    if (!message) {
        setAdminStatus("Add a message before saving.");
        setStudentModalStatus("Add a message before saving.");
        return;
    }
    const url = buildApiUrl(`/portal/admin/students/${studentId}/notes`);
    fetch(url, {
        method: "POST",
        headers: getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ noteType, message, author })
    })
        .then((res) => {
            if (!res.ok) throw new Error("Unable to save note.");
            return res.json();
        })
        .then((data) => {
            if (data.note) {
                portalState.admin.rosterNotes = [data.note, ...(portalState.admin.rosterNotes || [])];
                renderRosterNotes();
            }
            if (isModal && portalEls.studentModalNoteMessage) {
                portalEls.studentModalNoteMessage.value = "";
            }
            if (!isModal && portalEls.adminRosterNoteMessage) {
                portalEls.adminRosterNoteMessage.value = "";
            }
            setAdminStatus("Entry added.", "success");
            setStudentModalStatus("Entry added.", "success");
        })
        .catch((error) => {
            console.error("note submit", error);
            setAdminStatus(error.message || "Unable to save entry.", "error");
            setStudentModalStatus(error.message || "Unable to save entry.", "error");
        });
}

function loadRosterNotes(studentId) {
    if (!HAS_REMOTE_API || !studentId) return;
    const url = buildApiUrl(`/portal/admin/students/${studentId}/notes`);
    fetch(url, {
        method: "GET",
        headers: getAdminAuthHeaders(),
        mode: "cors",
        credentials: "omit"
    })
        .then((res) => {
            if (!res.ok) throw new Error("Unable to load notes.");
            return res.json();
        })
        .then((data) => {
            portalState.admin.rosterNotes = Array.isArray(data.notes) ? data.notes : [];
            portalState.admin.rosterNotesGeneratedAt = data.generatedAt || null;
            renderRosterNotes();
        })
        .catch((error) => {
            console.error("load notes", error);
            setAdminStatus(error.message || "Unable to load notes.", "error");
        });
}

function renderRosterDetail() {
    const panel = portalEls.adminRosterDetail;
    if (!panel) return;
    const student = portalState.admin.rosterSelected;
    if (!student) {
        panel.hidden = true;
        return;
    }
    panel.hidden = false;
    setRosterEditStatus("");
    setAttendanceAdjustStatus("");
    if (portalEls.adminRosterName) {
        portalEls.adminRosterName.value = student.name || "";
    }
    if (portalEls.adminRosterEmail) {
        portalEls.adminRosterEmail.value = student.email || "";
    }
    if (portalEls.adminRosterPhone) {
        portalEls.adminRosterPhone.value = student.phone || "";
    }
    if (portalEls.adminRosterStudentName) {
        portalEls.adminRosterStudentName.textContent = student.name || "—";
    }
    if (portalEls.adminRosterStudentMeta) {
        portalEls.adminRosterStudentMeta.textContent = `${student.id || ""} · ${student.phone || ""}`.trim();
    }
    if (portalEls.adminRosterMembership) {
        portalEls.adminRosterMembership.value = student.membershipType || "";
    }
    if (portalEls.adminRosterBelt) {
        portalEls.adminRosterBelt.value = student.currentBelt || "";
    }
    if (portalEls.adminRosterStatus) {
        const status = student.status || (student.isSuspended ? "suspended" : "active");
        portalEls.adminRosterStatus.value = status;
    }
    if (portalEls.adminRosterCardMembership) {
        portalEls.adminRosterCardMembership.textContent = student.membershipType || "Not set";
    }
    if (portalEls.adminRosterCardStatus) {
        const status = student.isSuspended ? "Deactivated" : student.status || "Active";
        portalEls.adminRosterCardStatus.textContent =
            status.charAt(0).toUpperCase() + status.slice(1);
    }
    const stats = computeRosterAttendanceStats(student.id);
    if (portalEls.adminRosterCard30) {
        portalEls.adminRosterCard30.textContent = stats.last30 ?? "—";
    }
    if (portalEls.adminRosterCard60) {
        portalEls.adminRosterCard60.textContent = stats.last60 ?? "—";
    }
    if (portalEls.adminRosterLastAttended) {
        portalEls.adminRosterLastAttended.textContent = getRosterLastAttendance(student.id);
    }
    renderRosterNotes();
}

function renderRosterNotes() {
    const lists = [portalEls.adminRosterNotesList, portalEls.studentModalNotesList].filter(Boolean);
    if (!lists.length) return;
    const notes = portalState.admin.rosterNotes || [];
    lists.forEach((list) => {
        list.innerHTML = "";
        if (!notes.length) {
            const li = document.createElement("li");
            li.textContent = "No notes yet.";
            list.appendChild(li);
            return;
        }
        notes.forEach((note) => {
            const li = document.createElement("li");
            const meta = document.createElement("div");
            meta.className = "admin-roster-notes__meta";
            meta.textContent = `${note.noteType || "note"} · ${note.author || "Admin"} · ${
                note.createdAt ? formatDateTime(note.createdAt) : ""
            }`;
            const body = document.createElement("div");
            body.textContent = note.message;
            li.append(meta, body);
            list.appendChild(li);
        });
    });
}

function setStudentModalPanel(panelId) {
    const target = panelId || "overview";
    portalState.admin.studentModalPanel = target;
    if (portalEls.studentModalPanels?.length) {
        portalEls.studentModalPanels.forEach((panel) => {
            const panels = (panel.dataset.studentPanel || "").split(/\s+/);
            panel.hidden = !panels.includes(target);
        });
    }
    if (portalEls.studentModalNavButtons?.length) {
        portalEls.studentModalNavButtons.forEach((btn) => {
            btn.classList.toggle("is-active", btn.dataset.studentPanelTarget === target);
        });
    }
}

function renderStudentModalAttendance(student) {
    if (!portalEls.studentModalAttendanceList) return;
    const list = portalEls.studentModalAttendanceList;
    list.innerHTML = "";
    if (!student) {
        const li = document.createElement("li");
        li.textContent = "Select a student to view attendance.";
        list.appendChild(li);
        return;
    }
    const summary = portalState.admin.rosterAttendanceSummary?.[student.id];
    const recent = Array.isArray(summary?.recent) ? summary.recent : [];
    const source =
        recent.length > 0
            ? recent
            : (portalState.admin.attendance || []).filter(
                  (entry) => entry.studentId?.toLowerCase() === student.id?.toLowerCase()
              );
    if (!source.length) {
        const li = document.createElement("li");
        li.textContent = "No attendance logged yet.";
        list.appendChild(li);
        return;
    }
    source.slice(0, 8).forEach((entry) => {
        const li = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = entry.classLevel || entry.classType || "Class";
        const meta = document.createElement("div");
        meta.className = "certificate-meta";
        const time = entry.checkInAt || entry.createdAt || entry.created_at;
        meta.textContent = time ? formatDateTime(time) : "—";
        li.append(title, meta);
        list.appendChild(li);
    });
}

function renderStudentModal() {
    if (!portalEls.studentModal) return;
    const student = portalState.admin.rosterSelected;
    if (!student) {
        portalEls.studentModal.hidden = true;
        return;
    }
    const avatarText = (student.name || student.id || "ARA").slice(0, 3).toUpperCase();
    if (portalEls.studentModalAvatar) portalEls.studentModalAvatar.textContent = avatarText;
    if (portalEls.studentModalTitle) {
        portalEls.studentModalTitle.textContent = student.name || student.id || "Student Profile";
    }
    if (portalEls.studentModalMeta) {
        const parts = [student.id, student.phone, student.email].filter(Boolean);
        portalEls.studentModalMeta.textContent = parts.join(" · ") || "—";
    }
    const statusLabel = student.isSuspended ? "Deactivated" : student.status || "Active";
    if (portalEls.studentModalStatusPill) {
        portalEls.studentModalStatusPill.textContent = statusLabel;
        portalEls.studentModalStatusPill.className = `admin-pill ${
            student.isSuspended ? "admin-pill--warning" : "admin-pill--success"
        }`;
    }
    const stats = computeRosterAttendanceStats(student.id);
    const lastAttended = getRosterLastAttendance(student.id);
    if (portalEls.studentModalLast30) portalEls.studentModalLast30.textContent = stats.last30 || "—";
    if (portalEls.studentModalLast60) portalEls.studentModalLast60.textContent = stats.last60 || "—";
    if (portalEls.studentModalLastAttended)
        portalEls.studentModalLastAttended.textContent = `Last attended ${lastAttended}`;
    if (portalEls.studentModalLastAttendedPill)
        portalEls.studentModalLastAttendedPill.textContent = lastAttended || "—";

    if (portalEls.studentModalNameInput) {
        portalEls.studentModalNameInput.value = student.name || "";
    }
    if (portalEls.studentModalEmailInput) {
        portalEls.studentModalEmailInput.value = student.email || "";
    }
    if (portalEls.studentModalPhoneInput) {
        portalEls.studentModalPhoneInput.value = student.phone || "";
    }
    if (portalEls.studentModalBelt) {
        portalEls.studentModalBelt.value = student.currentBelt || "";
    }
    if (portalEls.studentModalMembership) {
        portalEls.studentModalMembership.value = student.membershipType || "";
    }
    if (portalEls.studentModalStatusField) {
        portalEls.studentModalStatusField.value =
            student.status || (student.isSuspended ? "suspended" : "active");
    }

    if (portalEls.studentModalBillingMembership) {
        portalEls.studentModalBillingMembership.textContent = student.membershipType || "Not set";
    }
    if (portalEls.studentModalBillingStatus) {
        portalEls.studentModalBillingStatus.textContent = statusLabel;
    }
    if (portalEls.studentModalProgressBelt) {
        portalEls.studentModalProgressBelt.textContent = student.currentBelt || "—";
    }
    if (portalEls.studentModalProgressMembership) {
        portalEls.studentModalProgressMembership.textContent = student.membershipType || "—";
    }

    renderStudentModalAttendance(student);
    renderRosterNotes();
    setStudentModalPanel(portalState.admin.studentModalPanel || "overview");
}

function handleStudentModalNav(event) {
    const button = event.target.closest("[data-student-panel-target]");
    if (!button) return;
    const target = button.dataset.studentPanelTarget || "overview";
    setStudentModalPanel(target);
}

function handleStudentModalAction(event) {
    const actionBtn = event.target.closest("[data-student-action]");
    if (!actionBtn) return;
    const action = actionBtn.dataset.studentAction;
    if (!portalState.admin.rosterSelected) {
        setStudentModalStatus("Select a student first.");
        return;
    }
    const studentId = portalState.admin.rosterSelected.id;
    if (action === "photo") {
        setStudentModalStatus("Upload/replace photo via staff tools. Log a note if needed.", "success");
        return;
    }
    if (action === "edit") {
        setStudentModalPanel("overview");
        portalEls.studentModalNameInput?.focus();
        return;
    }
    if (["note", "payment", "billing", "credit"].includes(action)) {
        setStudentModalPanel("notes");
        if (portalEls.studentModalNoteType) {
            if (action === "payment") {
                portalEls.studentModalNoteType.value = "payment";
            } else if (action === "credit" || action === "billing") {
                portalEls.studentModalNoteType.value = "billing";
            } else {
                portalEls.studentModalNoteType.value = "conversation";
            }
        }
        portalEls.studentModalNoteMessage?.focus();
        return;
    }
    if (action === "report") {
        openReportCard(studentId);
        return;
    }
    if (action === "deactivate" || action === "activate") {
        const suspend = action === "deactivate";
        updateStudentSuspension(studentId, suspend, suspend ? "Manual deactivate" : "");
        return;
    }
    if (action === "make-staff") {
        setStudentModalStatus("Flagged for staff consideration. Add a note with details.", "success");
    }
}

function handleStudentModalSave(event) {
    event?.preventDefault();
    if (!portalState.admin.rosterSelected) {
        setStudentModalStatus("Select a student first.");
        return;
    }
    if (!HAS_REMOTE_API) return;
    const studentId = portalState.admin.rosterSelected.id;
    const payload = {
        name: portalEls.studentModalNameInput?.value || "",
        email: portalEls.studentModalEmailInput?.value || "",
        phone: portalEls.studentModalPhoneInput?.value || "",
        currentBelt: portalEls.studentModalBelt?.value || "",
        status: portalEls.studentModalStatusField?.value || "",
        membershipType: portalEls.studentModalMembership?.value || ""
    };
    const url = buildApiUrl(`/portal/admin/students/${encodeURIComponent(studentId)}`);
    setStudentModalStatus("Saving student changes...", "progress");
    fetch(url, {
        method: "PATCH",
        headers: getAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
    })
        .then((res) => {
            if (!res.ok) throw new Error("Unable to save student.");
            return res.json();
        })
        .then((data) => {
            const updated = data.student;
            if (updated) {
                const idx = portalState.admin.roster.findIndex(
                    (s) => s.id?.toLowerCase() === updated.id?.toLowerCase()
                );
                if (idx >= 0) {
                    portalState.admin.roster[idx] = { ...portalState.admin.roster[idx], ...updated };
                }
                portalState.admin.rosterSelected = { ...portalState.admin.rosterSelected, ...updated };
                renderAdminRoster();
                renderRosterDetail();
                renderStudentModal();
            }
            setStudentModalStatus("Student updated.", "success");
            setAdminStatus("Student updated.", "success");
        })
        .catch((error) => {
            console.error("Student modal save", error);
            setStudentModalStatus(error.message || "Unable to save student.", "error");
        });
}

function handleRosterDetailButtons(event) {
    const button = event.target.closest('[data-roster-action]');
    if (!button || !portalState.admin.rosterSelected) return;
    const action = button.dataset.rosterAction;
    const studentId = portalState.admin.rosterSelected.id;
    if (action === 'report') {
        openReportCard(studentId);
        return;
    }
    if (action === 'note') {
        if (portalEls.adminRosterNoteType) portalEls.adminRosterNoteType.value = 'note';
        portalEls.adminRosterNoteMessage?.focus();
        return;
    }
    if (action === 'payment') {
        if (portalEls.adminRosterNoteType) portalEls.adminRosterNoteType.value = 'payment';
        portalEls.adminRosterNoteMessage?.focus();
        return;
    }
    if (action === 'deactivate' || action === 'activate') {
        const suspend = action === 'deactivate';
        const reason = suspend ? window.prompt('Enter suspension reason', 'Billing issue') || '' : '' ;
        updateStudentSuspension(studentId, suspend, reason);
        return;
    }
}
