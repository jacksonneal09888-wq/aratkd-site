const BOT_CONFIG = {
    name: "Master Ara",
    welcome:
        "Hi, I'm Master Ara. Ask me about belts, study guides, schedules, or the student portal. I'm here to help!",
    maxHistory: 8,
    fallbackEmail: "afetkd@gmail.com"
};

const knowledgeIndex = [
    { id: "white-study-guide-video", tags: ["white belt", "study guide"], resource: "assets/materials/white-belt-form-video.mp4", type: "video" },
    { id: "white-checklist", tags: ["white belt", "checklist"], resource: "assets/materials/tkd-curriculum-white-belt.png", type: "image" },
    { id: "high-white-checklist", tags: ["high white", "checklist"], resource: "assets/materials/tkd-curriculum-high-white-belt.png", type: "image" }
];

const botState = {
    history: [],
    panelOpen: false,
    sending: false
};

const createBotElements = () => {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "master-ara__toggle";
    toggle.innerHTML = `<span aria-hidden="true">🤖</span><span class="master-ara__toggle-label">${BOT_CONFIG.name}</span>`;

    const panel = document.createElement("section");
    panel.className = "master-ara";
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

const composeResponse = (question) => {
    const matches = findResources(question);
    if (matches.length) {
        const primary = matches[0];
        if (primary.type === "video") {
            return `Here’s the study video you’re looking for: ${primary.resource}`;
        }
        return `I found a guide that should help: ${primary.resource}`;
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
        if (!isOpen) {
            renderMessage(messages, "bot", BOT_CONFIG.welcome);
            input.focus();
        }
    });

    close.addEventListener("click", () => {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
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
