const BOT_CONFIG = {
    name: "Master Ara",
    welcome:
        "Hi, I’m Master Ara 🥋. Ask me about belts, study guides, kicks, schedules, or the student portal. I’ll guide you—or email Master Ara if I can’t.",
    maxHistory: 8,
    fallbackEmail: "afetkd@gmail.com",
    storageKey: "masterAraFallbacks"
};

const knowledgeIndex = [
    // White belt resources
    {
        id: "white-video",
        tags: ["white belt", "study video", "form video", "beginner video"],
        title: "White Belt Form Video",
        resource: "assets/materials/white-belt-form-video.mp4",
        type: "video"
    },
    {
        id: "white-checklist",
        tags: ["white belt", "checklist", "testing"],
        title: "White Belt Checklist",
        resource: "assets/materials/tkd-curriculum-white-belt.png",
        type: "image"
    },
    {
        id: "high-white-checklist",
        tags: ["high white", "checklist", "testing"],
        title: "High White Checklist",
        resource: "assets/materials/tkd-curriculum-high-white-belt.png",
        type: "image"
    },
    // Sample additional resources (extend as needed)
    {
        id: "schedule",
        tags: ["schedule", "classes", "times"],
        title: "Weekly Schedule",
        resource: "#schedule",
        type: "anchor"
    },
    {
        id: "portal",
        tags: ["login", "portal", "student id", "password"],
        title: "Student Portal",
        resource: "https://aratkd.com/student-portal.html",
        type: "link"
    },
    {
        id: "contact",
        tags: ["contact", "phone", "call", "email"],
        title: "Contact Ara’s Sportsplex",
        resource: "#contact",
        type: "anchor"
    }
];

const botState = {
    history: [],
    panelOpen: false,
    sending: false,
    greeted: false,
    fallbacks: (() => {
        try {
            return JSON.parse(localStorage.getItem(BOT_CONFIG.storageKey) ?? "[]");
        } catch (error) {
            console.warn("Unable to read stored fallbacks", error);
            return [];
        }
    })()
};

const createBotElements = () => {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "master-ara__toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "master-ara-panel");
    toggle.innerHTML = `<span aria-hidden="true" class="master-ara__toggle-icon">🥋</span><span class="master-ara__toggle-label">${BOT_CONFIG.name}</span>`;

    const panel = document.createElement("section");
    panel.className = "master-ara";
    panel.id = "master-ara-panel";
    panel.setAttribute("aria-live", "polite");
    panel.hidden = true;

    panel.innerHTML = `
        <header class="master-ara__header">
            <div>
                <p class="master-ara__eyebrow">Assistant</p>
                <h2>${BOT_CONFIG.name}</h2>
                <p class="master-ara__intro">${BOT_CONFIG.welcome}</p>
            </div>
            <button type="button" class="master-ara__close" aria-label="Close chat">&times;</button>
        </header>
        <div class="master-ara__messages" role="log"></div>
        <form class="master-ara__form">
            <label class="master-ara__label" for="master-ara-input">Ask a question</label>
            <textarea id="master-ara-input" class="master-ara__input" rows="2" required placeholder="Where do I find the blue belt checklist?"></textarea>
            <div class="master-ara__actions">
                <button type="submit" class="master-ara__send">Send</button>
                <button type="button" class="master-ara__email">Email Master Ara</button>
            </div>
        </form>
    `;

    return { toggle, panel };
};

const renderMessage = (container, role, text, options = {}) => {
    const item = document.createElement("div");
    item.className = `master-ara__message master-ara__message--${role}`;

    const bubble = document.createElement("div");
    bubble.className = "master-ara__bubble";
    bubble.textContent = text;

    item.append(bubble);

    if (options.actions?.length) {
        const actions = document.createElement("div");
        actions.className = "master-ara__quick-actions";
        options.actions.forEach((action) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "master-ara__quick-btn";
            button.textContent = action.label;
            button.addEventListener("click", action.handler);
            actions.append(button);
        });
        item.append(actions);
    }

    container.append(item);
    container.scrollTop = container.scrollHeight;
};

const findResources = (query) => {
    const normalized = query.toLowerCase();
    return knowledgeIndex.filter((entry) =>
        entry.tags.some((tag) => normalized.includes(tag))
    );
};

const handleResourceMatch = (match) => {
    switch (match.type) {
        case "video":
            return `Here’s the video you need: ${match.resource}`;
        case "image":
            return `Here’s the checklist: ${match.resource}`;
        case "anchor": {
            const target = document.querySelector(match.resource);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
                return `I’ve scrolled to the ${match.title.toLowerCase()} for you.`;
            }
            return `You can view it here: ${window.location.origin}/${match.resource.replace(/^#/, "")}`;
        }
        case "link":
            return `Open this link for more help: ${match.resource}`;
        default:
            return `Here’s what I found: ${match.resource}`;
    }
};

const persistFallback = (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const entry = { question: trimmed, ts: Date.now() };
    botState.fallbacks.push(entry);
    botState.fallbacks = botState.fallbacks.slice(-20);
    try {
        localStorage.setItem(BOT_CONFIG.storageKey, JSON.stringify(botState.fallbacks));
    } catch (error) {
        console.warn("Unable to persist fallback questions", error);
    }
};

const composeResponse = (question) => {
    const matches = findResources(question);
    if (matches.length) {
        return handleResourceMatch(matches[0]);
    }

    const lower = question.toLowerCase();
    if (lower.includes("navigate") || lower.includes("go to") || lower.includes("open")) {
        if (lower.includes("schedule")) {
            const target = document.querySelector("#schedule");
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            return "Here’s the schedule section. Scroll through for each day’s class times.";
        }
        if (lower.includes("student portal") || lower.includes("login")) {
            window.location.href = "https://aratkd.com/student-portal.html";
            return "Opening the student portal… if it did not open, use the top navigation Student Portal link.";
        }
    }

    if (question.includes("schedule")) {
        return "Our full schedule lives on the homepage under the Weekly Schedule section. Need a specific day?";
    }

    if (question.includes("portal")) {
        return "You can reach the student portal from the top navigation or at https://aratkd.com/student-portal.html. Let me know if you need your ID or birthdate format!";
    }

    return null;
};

const handleSubmission = (elements) => {
    if (botState.sending) return;
    const input = elements.input.value.trim();
    if (!input) return;

    botState.sending = true;
    elements.form.classList.add("is-busy");

    renderMessage(elements.messages, "user", input);
    botState.history.push({ role: "user", message: input });

    window.setTimeout(() => {
        const answer = composeResponse(input);
        if (answer) {
            renderMessage(elements.messages, "bot", answer);
            botState.history.push({ role: "bot", message: answer });
        } else {
            persistFallback(input);
            renderMessage(elements.messages, "bot", "I want to get this right. I’ll collect your question and email Master Ara so he can follow up.", {
                actions: [
                    {
                        label: "Send Email",
                        handler: () => {
                            window.location.href = `mailto:${BOT_CONFIG.fallbackEmail}?subject=Question%20for%20Master%20Ara&body=${encodeURIComponent(input)}`;
                        }
                    }
                ]
            });
        }

        elements.form.classList.remove("is-busy");
        botState.sending = false;
        elements.input.value = "";
        elements.input.focus();
    }, 400);
};

document.addEventListener("DOMContentLoaded", () => {
    const { toggle, panel } = createBotElements();
    const messages = panel.querySelector(".master-ara__messages");
    const form = panel.querySelector(".master-ara__form");
    const input = panel.querySelector("#master-ara-input");
    const close = panel.querySelector(".master-ara__close");
    const email = panel.querySelector(".master-ara__email");

    panel.hidden = true;
    panel.dataset.state = "collapsed";

    toggle.addEventListener("click", () => {
        const isOpen = !panel.hidden;
        panel.hidden = isOpen;
        toggle.setAttribute("aria-expanded", String(!isOpen));
        if (!isOpen && !botState.greeted) {
            renderMessage(messages, "bot", BOT_CONFIG.welcome);
            input.focus();
            botState.greeted = true;
        }
        if (!isOpen && botState.greeted) {
            input.focus();
        }
    });

    close.addEventListener("click", () => {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        handleSubmission({ messages, input, form });
    });

    email.addEventListener("click", () => {
        window.location.href = `mailto:${BOT_CONFIG.fallbackEmail}?subject=Question%20for%20Master%20Ara`;
    });

    document.body.append(toggle, panel);
});
