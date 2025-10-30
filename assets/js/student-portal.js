const STORAGE_KEYS = {
    progress: "araStudentProgress",
    certificates: "araStudentCertificates",
    session: "araStudentSession"
};

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
    beltTestStatus: document.getElementById("belt-test-status")
};

console.log("portalEls:", portalEls); // Debugging line

const portalState = {
    students: [],
    activeStudent: null,
    isLoading: true,
    progress: readStore(STORAGE_KEYS.progress),
    certificates: readStore(STORAGE_KEYS.certificates)
};

document.addEventListener("DOMContentLoaded", () => {
    attachHandlers();
    loadStudents();
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
    }
}

function handleLogin(event) {
    event.preventDefault();
    console.log("handleLogin: function triggered."); // Debugging line
    if (portalState.isLoading) {
        setStatus("Still loading student roster. Please wait a moment.");
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
    renderPortal();
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
        renderPortal();
        setStatus(`Welcome back, ${match.name.split(" ")[0]}!`, "success");
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
    portalEls.currentBelt.textContent = student.currentBelt || "White Belt";
    const nextBeltName = BELT_SEQUENCE[unlockedIndex]?.name;
    portalEls.nextBelt.textContent = nextBeltName ?? "You're at the final belt!";

    renderBeltGrid(student, unlockedIndex);
    renderCertificateLog(student);
    toggleBeltTestForm(false); // Hide form on portal render
}

function renderBeltGrid(student, unlockedIndex) {
    if (!portalEls.beltGrid) return;
    portalEls.beltGrid.innerHTML = "";
    const studentCertificates = portalState.certificates[student.id] ?? {};

    BELT_SEQUENCE.forEach((belt, index) => {
        const card = document.createElement("article");
        card.className = "belt-card";
        if (index > unlockedIndex) {
            card.classList.add("locked");
        }

        const titleRow = document.createElement("div");
        titleRow.className = "belt-card__head";

        const title = document.createElement("h4");
        title.textContent = belt.name;

        const badge = document.createElement("span");
        badge.classList.add("badge");
        if (index < unlockedIndex) {
            badge.classList.add("badge-unlocked");
            badge.textContent = "Completed";
        } else if (index === unlockedIndex) {
            badge.classList.add("badge-awaiting");
            badge.textContent = "In Progress";
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
        status.textContent = certificateData
            ? `Uploaded ${formatDate(certificateData.uploadedAt)} • ${certificateData.fileName}`
            : "No certificate uploaded yet.";
        card.append(status);

        if (certificateData) {
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

        if (index === unlockedIndex) {
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
            fileInput.style.display = "none";

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
        empty.textContent = "Upload your certificate after each belt test to unlock new materials.";
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

            const downloadBtn = document.createElement("button");
            downloadBtn.type = "button";
            downloadBtn.textContent = "Download";
            downloadBtn.addEventListener("click", () =>
                downloadCertificate(student.id, certificate.belt)
            );

            item.append(meta, downloadBtn);
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
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            dataUrl
        };

        storeCertificate(portalState.activeStudent.id, payload);

        if (beltIndex < BELT_SEQUENCE.length - 1) {
            updateProgress(portalState.activeStudent.id, beltIndex + 1);
        }

        setStatus(`${belt.name} certificate received. Keep training hard!`, "success");
        renderPortal();
    };

    reader.onerror = () => {
        setStatus("Something went wrong while reading that file.");
    };

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

    if (
        !portalState.progress[student.id] ||
        portalState.progress[student.id].unlockedIndex !== normalized
    ) {
        portalState.progress[student.id] = { unlockedIndex: normalized };
        persistProgress();
    }

    return normalized;
}

function updateProgress(studentId, unlockedIndex) {
    portalState.progress[studentId] = {
        unlockedIndex: Math.min(unlockedIndex, BELT_SEQUENCE.length - 1)
    };
    persistProgress();
}

function storeCertificate(studentId, certificate) {
    if (!portalState.certificates[studentId]) {
        portalState.certificates[studentId] = {};
    }
    portalState.certificates[studentId][certificate.belt] = certificate;
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
}

function setStatus(message, variant = "error") {
    if (!portalEls.status) return;
    portalEls.status.textContent = message;
    if (variant === "success") {
        portalEls.status.classList.add("is-success");
    } else {
        portalEls.status.classList.remove("is-success");
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
