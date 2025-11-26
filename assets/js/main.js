const navToggle = document.querySelector(".nav-toggle");
const navList = document.querySelector(".main-nav ul");
const yearTarget = document.getElementById("year");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const SOUND_STORAGE_KEY = "ara:soundFx";
const SOUND_TARGET_SELECTOR = ".cta-btn, .secondary-btn, .floating-cta";
const CALENDAR_MONTH_OPTIONS = { month: "long", year: "numeric" };
const CALENDAR_DATE_OPTIONS = { weekday: "long", month: "long", day: "numeric" };
const GOOGLE_CALENDAR_GID = "1471011839";
const GOOGLE_CALENDAR_BASE =
    "https://docs.google.com/spreadsheets/d/14cilS4LD8JAs2P7Y-_g8CaoMgLHfqjkYJcDjgpSntE4/export";
const GOOGLE_CALENDAR_CSV_URL = `${GOOGLE_CALENDAR_BASE}?format=csv&gid=${GOOGLE_CALENDAR_GID}`;
const GOOGLE_CALENDAR_DOWNLOAD_URL = `${GOOGLE_CALENDAR_BASE}?format=pdf&gid=${GOOGLE_CALENDAR_GID}`;

function getCalendarCsvUrl() {
    return `${GOOGLE_CALENDAR_CSV_URL}&t=${Date.now()}`;
}
const EVENT_AFTER_SCHOOL = createEvent("After School Success Program", "3:00 PM", "after-school", "Homework lab, healthy snack, and martial arts coaching.");
const EVENT_LITTLE_NINJAS = createEvent("Little Ninjas (Ages 3-5)", "4:30 - 5:00 PM", "class", "Play-based drills that build balance, focus, and courtesy.");
const EVENT_WHITE_YELLOW = createEvent("Kids & Family Taekwondo", "5:00 - 5:45 PM", "class", "White and yellow belts sharpen basics with family training partners welcome.");
const EVENT_GREEN_BLACK = createEvent("Green & Black Belt Training", "5:45 - 6:30/7:00 PM", "class", "Intermediate and advanced poomsae, sparring, and leadership reps.");
const EVENT_TEENS_ADULTS = createEvent("Teens & Adults Taekwondo", "6:30 PM", "class", "High-energy conditioning plus sparring combinations for teens and adults.");
const EVENT_HAPKIDO = createEvent("Hapkido Self-Defense Essentials", "7:30 PM", "event", "Joint locks, situational awareness, and practical defense applications.");
const EVENT_FORMS_SPAR = createEvent("Forms & Sparring Development", "6:00 PM", "class", "Color belts polish poomsae timing, footwork, and ring strategies.");
const EVENT_LEADERSHIP = createEvent("Leadership & Instructor Track", "6:30 PM", "leadership", "Assistant instructors practice mat management and coaching cues.");
const EVENT_ADVANCED_SELF_DEFENSE = createEvent("Advanced Self-Defense Lab", "7:30 PM", "event", "Scenario-based Hapkido combinations with partner drills.");
const EVENT_SPARRING_LAB = createEvent("Sparring Lab & Kickboxing", "6:15 PM", "class", "Footwork, timing, and pad rounds - bring full sparring gear.");
const EVENT_FAMILY_TKD = createEvent("Family Taekwondo Celebration", "5:30 PM", "class", "Families train together with belt stripe reviews and goal setting.");
const EVENT_BLACK_BELT_PREP = createEvent("Black Belt Prep & Board Breaking", "6:30 PM", "leadership", "Testing simulations, board breaks, and mindset coaching.");
const EVENT_RECOVERY = createEvent("Recovery & Mindfulness", "7:30 PM", "event", "Mobility, breathwork, and reflection to end the week strong.");
const EVENT_SATURDAY_CLOSED = createEvent("No Saturday Classes Scheduled", "All Day", "closure", "Check announcements for pop-up seminars or tournament travel days.");
const EVENT_SUNDAY_CLOSED = createEvent("Dojang Closed", "All Day", "closure", "See you on the mat Monday!");
const EVENT_BOARD_BREAK = createEvent("Board Breaking for All Students", "During scheduled classes", "event", "Bring boards and sparring gloves - stripes awarded at the end of class.");

const EVENT_DISPLAY_PRIORITY = {
    focus: 0,
    testing: 1,
    event: 2,
    leadership: 3,
    class: 4,
    "after-school": 5,
    closure: 6
};

const DOJO_CALENDAR_WEEKLY = {
    0: [EVENT_SUNDAY_CLOSED],
    1: [EVENT_AFTER_SCHOOL, EVENT_LITTLE_NINJAS, EVENT_WHITE_YELLOW, EVENT_GREEN_BLACK, EVENT_TEENS_ADULTS, EVENT_HAPKIDO],
    2: [EVENT_AFTER_SCHOOL, EVENT_LITTLE_NINJAS, EVENT_WHITE_YELLOW, EVENT_GREEN_BLACK, EVENT_FORMS_SPAR],
    3: [EVENT_AFTER_SCHOOL, EVENT_LITTLE_NINJAS, EVENT_WHITE_YELLOW, EVENT_GREEN_BLACK, EVENT_LEADERSHIP, EVENT_ADVANCED_SELF_DEFENSE],
    4: [EVENT_AFTER_SCHOOL, EVENT_LITTLE_NINJAS, EVENT_WHITE_YELLOW, EVENT_GREEN_BLACK, EVENT_SPARRING_LAB],
    5: [EVENT_AFTER_SCHOOL, EVENT_LITTLE_NINJAS, EVENT_WHITE_YELLOW, EVENT_GREEN_BLACK, EVENT_FAMILY_TKD, EVENT_BLACK_BELT_PREP, EVENT_RECOVERY],
    6: [EVENT_SATURDAY_CLOSED]
};


const CALENDAR_RANGE_START = parseIsoDate("2025-09-01");
const CALENDAR_RANGE_END = parseIsoDate("2026-12-31");

const CALENDAR_FOCUS_TEMPLATE = [
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

const BASE_CALENDAR_RANGES = [];
const GENERATED_CALENDAR_RANGES = generateFocusRanges(CALENDAR_RANGE_START, CALENDAR_RANGE_END, CALENDAR_FOCUS_TEMPLATE);
const DOJO_CALENDAR_RANGES = [...BASE_CALENDAR_RANGES, ...GENERATED_CALENDAR_RANGES];

const BASE_CALENDAR_DAY_OVERRIDES = {
    "2024-11-16": {
        events: [
            createEvent(
                "Board Break Workshop",
                "11:00 AM",
                "testing",
                "Dial in foot positioning, power generation, and confidence ahead of testing."
            )
        ]
    },
    "2024-11-25": {
        events: [
            createEvent(
                "Winter Games Registration Closes",
                "All Day",
                "event",
                "Last call to join Ara's team roster. Email afetkd@gmail.com to secure your spot."
            )
        ]
    },
    "2024-11-28": {
        replace: true,
        events: [
            createEvent(
                "Dojang Closed · Thanksgiving",
                "All Day",
                "closure",
                "Rest, refuel, and enjoy the holiday. Classes resume on Friday."
            )
        ]
    },
    "2024-12-06": {
        events: [
            createEvent(
                "Taekwondo Winter Games 2025",
                "7:00 AM - 4:00 PM",
                "event",
                "Sparring, poomsae, and board breaking showdown hosted at Ara's Sportsplex."
            )
        ]
    },
    "2024-12-14": {
        replace: true,
        events: [
            createEvent(
                "Color Belt Testing Saturday",
                "10:00 AM",
                "testing",
                "Stripe checks and advancement evaluations for Little Ninjas through brown belts."
            )
        ]
    },
    "2024-12-20": {
        events: [
            createEvent(
                "Holiday Parent Night Out",
                "6:00 PM",
                "event",
                "Games, pizza, and martial arts fun so parents can finish their holiday checklist."
            )
        ]
    },
    "2025-01-06": {
        events: [
            createEvent(
                "Winter Session Kickoff",
                "4:00 PM",
                "event",
                "Welcome back mat talk, goal setting for the new year, and schedule updates."
            )
        ]
    },
    "2025-01-18": {
        replace: true,
        events: [
            createEvent(
                "Sparring Round Robin",
                "1:00 PM",
                "event",
                "Controlled rounds for color belts - gear required, partners assigned on arrival."
            )
        ]
    },
    "2025-02-01": {
        replace: true,
        events: [
            createEvent(
                "Open House & Buddy Class",
                "10:30 AM",
                "event",
                "Bring a friend for intro drills, pad work, and membership Q&A with Master Ara."
            )
        ]
    },
    "2025-09-01": {
        replace: true,
        events: [
            createEvent(
                "No Classes · Labor Day",
                "All Day",
                "closure",
                "Dojang closed for the holiday. Enjoy the long weekend!"
            )
        ]
    }
};

const GENERATED_CALENDAR_DAY_OVERRIDES = generateMonthlyOverrides(CALENDAR_RANGE_START, CALENDAR_RANGE_END, EVENT_BOARD_BREAK);
const DOJO_CALENDAR_DAY_OVERRIDES = mergeOverrides(BASE_CALENDAR_DAY_OVERRIDES, GENERATED_CALENDAR_DAY_OVERRIDES);

const EVENT_CATEGORY_LABELS = {
    "after-school": "After School",
    class: "Class",
    leadership: "Leadership",
    event: "Event",
    testing: "Testing",
    focus: "Focus Week",
    closure: "Closed"
};

if (document.body) {
    document.body.classList.add("js-enabled");
}

if (navToggle && navList) {
    navToggle.addEventListener("click", () => {
        const expanded = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", String(!expanded));
        navList.classList.toggle("active");
    });
}

if (yearTarget) {
    yearTarget.textContent = String(new Date().getFullYear());
}

document.querySelectorAll("[data-hide-after]").forEach((element) => {
    const hideAfter = element.getAttribute("data-hide-after");
    if (!hideAfter) return;

    const hideDate = new Date(hideAfter);
    if (Number.isNaN(hideDate.getTime())) return;

    if (Date.now() >= hideDate.getTime()) {
        element.remove();
    }
});

initRevealAnimations();
initParallaxBackground();
initHoverSoundEffects();
initDojoCalendar();
initSheetCalendar();

function initRevealAnimations() {
    const revealElements = document.querySelectorAll("[data-reveal]");
    if (!revealElements.length) {
        return;
    }

    if (!("IntersectionObserver" in window) || prefersReducedMotion.matches) {
        revealElements.forEach((element) => {
            element.classList.add("is-visible");
        });
        return;
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                const { target } = entry;
                target.classList.add("is-visible");
                obs.unobserve(target);
            });
        },
        {
            threshold: 0.18,
            rootMargin: "0px 0px -10% 0px"
        }
    );

    revealElements.forEach((element) => {
        const rawDelay = Number(element.dataset.revealDelay);
        if (!Number.isNaN(rawDelay)) {
            element.style.transitionDelay = `${rawDelay}ms`;
        }
        observer.observe(element);
    });
}

function initParallaxBackground() {
    const layer = document.querySelector(".parallax-bg");
    if (!layer) {
        return;
    }

    const parallaxScale = 0.18;
    let ticking = false;
    let parallaxEnabled = false;

    const updateTransform = () => {
        const offset = window.scrollY * parallaxScale;
        layer.style.transform = `translate3d(0, ${offset}px, 0)`;
    };

    const handleScroll = () => {
        if (ticking) {
            return;
        }
        ticking = true;
        window.requestAnimationFrame(() => {
            updateTransform();
            ticking = false;
        });
    };

    const enableParallax = () => {
        if (parallaxEnabled) {
            return;
        }
        parallaxEnabled = true;
        updateTransform();
        window.addEventListener("scroll", handleScroll, { passive: true });
    };

    const disableParallax = () => {
        if (!parallaxEnabled) {
            return;
        }
        parallaxEnabled = false;
        window.removeEventListener("scroll", handleScroll);
        layer.style.transform = "translate3d(0, 0, 0)";
    };

    const onMotionChange = (event) => {
        if (event.matches) {
            disableParallax();
        } else {
            enableParallax();
        }
    };

    if (prefersReducedMotion.matches) {
        disableParallax();
    } else {
        enableParallax();
    }

    if (typeof prefersReducedMotion.addEventListener === "function") {
        prefersReducedMotion.addEventListener("change", onMotionChange);
    } else if (typeof prefersReducedMotion.addListener === "function") {
        prefersReducedMotion.addListener(onMotionChange);
    }
}

function initHoverSoundEffects() {
    const soundToggle = document.querySelector("[data-sound-toggle]");
    const soundStatus = document.querySelector("[data-sound-status]");
    const hoverTargets = Array.from(document.querySelectorAll(SOUND_TARGET_SELECTOR));
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!soundToggle && !hoverTargets.length) {
        return;
    }

    if (!AudioContextClass) {
        if (soundStatus) {
            soundStatus.textContent = "N/A";
        }
        if (soundToggle) {
            soundToggle.setAttribute("disabled", "disabled");
        }
        return;
    }

    let audioContext;
    let soundEnabled = false;
    let lastFxAt = 0;

    try {
        const stored = window.localStorage.getItem(SOUND_STORAGE_KEY);
        soundEnabled = stored === "on";
    } catch (error) {
        soundEnabled = false;
    }

    const updateUiState = () => {
        if (soundToggle && soundStatus) {
            soundToggle.setAttribute("aria-pressed", String(soundEnabled));
            soundStatus.textContent = soundEnabled ? "On" : "Off";
        }

        if (document.body) {
            document.body.classList.toggle("sound-enabled", soundEnabled);
        }
    };

    const ensureAudioContext = () => {
        if (!AudioContextClass) {
            return Promise.resolve(null);
        }

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === "suspended") {
            return audioContext
                .resume()
                .then(() => audioContext)
                .catch(() => null);
        }

        return Promise.resolve(audioContext);
    };

    const playHoverFx = () => {
        if (!soundEnabled) {
            return;
        }

        const now = performance.now();
        if (now - lastFxAt < 140) {
            return;
        }
        lastFxAt = now;

        ensureAudioContext()
            .then((ctx) => {
                if (!ctx) {
                    throw new Error("Audio context unavailable");
                }

                const duration = 0.35;
                const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
                const data = buffer.getChannelData(0);

                for (let i = 0; i < buffer.length; i += 1) {
                    const progress = i / buffer.length;
                    const fade = 1 - progress;
                    data[i] = (Math.random() * 2 - 1) * fade * fade;
                }

                const source = ctx.createBufferSource();
                source.buffer = buffer;

                const filter = ctx.createBiquadFilter();
                filter.type = "bandpass";
                filter.frequency.setValueAtTime(850, ctx.currentTime);
                filter.Q.value = 0.8;

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.0001, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

                source.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                source.start(ctx.currentTime);
                source.stop(ctx.currentTime + duration);
            })
            .catch(() => {
                soundEnabled = false;
                updateUiState();
            });
    };

    hoverTargets.forEach((element) => {
        element.addEventListener("pointerenter", (event) => {
            if (event.pointerType && event.pointerType === "touch") {
                return;
            }
            playHoverFx();
        });

        if (!window.PointerEvent) {
            element.addEventListener("mouseenter", playHoverFx);
        }
    });

    if (soundToggle) {
        soundToggle.addEventListener("click", () => {
            soundEnabled = !soundEnabled;
            updateUiState();

            if (soundEnabled) {
                playHoverFx();
            }

            try {
                window.localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? "on" : "off");
            } catch (error) {
                // Ignore storage errors
            }
        });
    }

    updateUiState();
}

function initDojoCalendar() {
    const calendarRoot = document.getElementById("dojo-calendar");
    if (!calendarRoot) {
        return;
    }

    const grid = calendarRoot.querySelector("[data-calendar-grid]");
    const monthLabel = calendarRoot.querySelector("[data-calendar-current]");
    const prevButton = calendarRoot.querySelector("[data-calendar-prev]");
    const nextButton = calendarRoot.querySelector("[data-calendar-next]");
    const eventsContainer = document.getElementById("dojo-calendar-events");

    if (!grid || !monthLabel || !prevButton || !nextButton || !eventsContainer) {
        return;
    }

    const today = new Date();
    const state = {
        visibleMonth: new Date(today.getFullYear(), today.getMonth(), 1),
        selectedDate: new Date(today.getFullYear(), today.getMonth(), today.getDate())
    };

    const render = () => {
        updateMonthLabel();
        buildCalendarDays();
        renderEventsList();
    };

    const updateMonthLabel = () => {
        monthLabel.textContent = state.visibleMonth.toLocaleDateString("en-US", CALENDAR_MONTH_OPTIONS);
    };

    const buildCalendarDays = () => {
        while (grid.children.length > 7) {
            grid.removeChild(grid.lastElementChild);
        }

        const year = state.visibleMonth.getFullYear();
        const month = state.visibleMonth.getMonth();
        const firstDayIndex = state.visibleMonth.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const previousMonthDays = firstDayIndex;
        const previousMonthLastDay = new Date(year, month, 0).getDate();
        const selectedIso = toIsoDate(state.selectedDate);
        const todayIso = toIsoDate(today);

        for (let index = previousMonthDays; index > 0; index -= 1) {
            const dateNumber = previousMonthLastDay - index + 1;
            const date = new Date(year, month - 1, dateNumber);
            grid.appendChild(createCalendarDay(date, { muted: true, todayIso, selectedIso }));
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            const date = new Date(year, month, day);
            grid.appendChild(createCalendarDay(date, { muted: false, todayIso, selectedIso }));
        }

        const totalCells = previousMonthDays + daysInMonth;
        const nextMonthPlaceholders = (7 - (totalCells % 7)) % 7;

        for (let day = 1; day <= nextMonthPlaceholders; day += 1) {
            const date = new Date(year, month + 1, day);
            grid.appendChild(createCalendarDay(date, { muted: true, todayIso, selectedIso }));
        }
    };

    const createCalendarDay = (date, metadata) => {
        const { muted, todayIso, selectedIso } = metadata;
        const isoDate = toIsoDate(date);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "dojo-calendar__day";

        if (muted) {
            button.classList.add("is-muted");
            button.disabled = true;
            button.setAttribute("tabindex", "-1");
        }

        const dateText = document.createElement("span");
        dateText.className = "dojo-calendar__date";
        dateText.textContent = String(date.getDate());
        button.appendChild(dateText);

        const events = getEventsForDate(date);

        if (events.length > 0) {
            button.classList.add("has-events");
            const markers = document.createElement("span");
            markers.className = "dojo-calendar__markers";
            const categories = [];
            events.forEach((event) => {
                const category = event.category || "event";
                if (!categories.includes(category)) {
                    categories.push(category);
                }
            });
            categories.slice(0, 4).forEach((category) => {
                const marker = document.createElement("span");
                marker.className = `dojo-calendar__marker dojo-calendar__marker--${category}`;
                markers.appendChild(marker);
            });
            button.appendChild(markers);
        }

        if (!muted) {
            button.dataset.date = isoDate;
            button.classList.toggle("is-selected", isoDate === selectedIso);
            button.classList.toggle("is-today", isoDate === todayIso);
            button.setAttribute("aria-pressed", String(isoDate === selectedIso));

            const labelParts = [
                date.toLocaleDateString("en-US", CALENDAR_DATE_OPTIONS)
            ];

            if (events.length > 0) {
                const countLabel = `${events.length} ${events.length === 1 ? "event" : "events"}`;
                labelParts.push(countLabel);
                const primaryEvent = events[0];
                if (primaryEvent && primaryEvent.title) {
                    labelParts.push(primaryEvent.title);
                }
            } else {
                labelParts.push("No scheduled events");
            }
            button.setAttribute("aria-label", labelParts.join(" - "));

            button.addEventListener("click", () => {
                state.selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                render();
            });
        } else {
            button.setAttribute("aria-hidden", "true");
        }

        return button;
    };

    const renderEventsList = () => {
        const events = getEventsForDate(state.selectedDate);
        const formattedDate = state.selectedDate.toLocaleDateString("en-US", CALENDAR_DATE_OPTIONS);

        eventsContainer.innerHTML = "";

        const heading = document.createElement("p");
        heading.className = "dojo-calendar__details-heading";
        heading.textContent = formattedDate;
        eventsContainer.appendChild(heading);

        if (!events.length) {
            const empty = document.createElement("p");
            empty.className = "dojo-calendar__empty";
            empty.textContent = "No scheduled programs today - call or text to set up a private lesson or intro visit.";
            eventsContainer.appendChild(empty);
            eventsContainer.appendChild(createCalendarNote());
            return;
        }

        const list = document.createElement("ul");
        list.className = "dojo-calendar__events-list";
        events.forEach((event) => {
            const item = document.createElement("li");
            item.className = "dojo-calendar__event";

            const title = document.createElement("p");
            title.className = "dojo-calendar__event-title";
            title.textContent = event.title;
            item.appendChild(title);

            const meta = document.createElement("p");
            meta.className = "dojo-calendar__event-meta";
            meta.textContent = event.time;
            item.appendChild(meta);

            if (event.description) {
                const description = document.createElement("p");
                description.className = "dojo-calendar__event-meta";
                description.textContent = event.description;
                item.appendChild(description);
            }

            const tag = document.createElement("span");
            const category = event.category || "event";
            tag.className = `dojo-calendar__tag dojo-calendar__tag--${category}`;
            tag.textContent = EVENT_CATEGORY_LABELS[category] || "Event";
            item.appendChild(tag);

            list.appendChild(item);
        });

        eventsContainer.appendChild(list);
        eventsContainer.appendChild(createCalendarNote());
    };

    const createCalendarNote = () => {
        const note = document.createElement("p");
        note.className = "dojo-calendar__note";
        note.textContent = "Green belts and up are welcome to reinforce forms in the White Belt class. Schedule is subject to change depending on attendance - call (919) 799-7500 or email afetkd@gmail.com.";
        return note;
    };

    const changeMonth = (offset) => {
        const current = state.visibleMonth;
        const nextMonth = new Date(current.getFullYear(), current.getMonth() + offset, 1);
        state.visibleMonth = nextMonth;

        if (state.selectedDate.getFullYear() !== nextMonth.getFullYear() || state.selectedDate.getMonth() !== nextMonth.getMonth()) {
            state.selectedDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
        }

        render();
    };

    prevButton.addEventListener("click", () => {
        changeMonth(-1);
    });

    nextButton.addEventListener("click", () => {
        changeMonth(1);
    });

    render();
}

function initSheetCalendar() {
    const roots = Array.from(document.querySelectorAll("[data-calendar-root]"));
    if (!roots.length) {
        return;
    }

    roots.forEach((root) => {
        root.querySelectorAll("[data-calendar-download]").forEach((link) => {
            link.href = GOOGLE_CALENDAR_DOWNLOAD_URL;
            link.setAttribute("download", "");
        });
    });

    fetch(getCalendarCsvUrl(), { cache: "no-store", redirect: "follow" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to load calendar CSV: ${response.status}`);
            }
            return response.text();
        })
        .then((text) => {
            const calendar = parseSheetCalendar(text);
            roots.forEach((root) => {
                renderSheetCalendar(root, calendar);
            });
        })
        .catch((error) => {
            console.error("Calendar sync error:", error);
            roots.forEach((root) => {
                showSheetCalendarError(root);
            });
        });
}

function parseSheetCalendar(csvText) {
    const lines = csvText.split(/\r?\n/).map((line) => line.trim());
    let index = 0;

    const calendar = {
        monthLabel: "",
        note: "",
        year: null,
        month: null,
        weeks: [],
        footnotes: []
    };

    const isSkippableLine = (line) => {
        if (!line) return true;
        return !line.replace(/,/g, "").trim();
    };

    const advance = () => {
        while (index < lines.length && isSkippableLine(lines[index])) {
            index += 1;
        }
    };

    advance();

    if (index < lines.length) {
        const headerCells = splitCsvLine(lines[index]);
        calendar.monthLabel = (headerCells[0] || "").replace(/^"+|"+$/g, "").trim();
        const noteCell = headerCells.find((cell, cellIndex) => cellIndex > 0 && cell);
        if (noteCell) {
            const rawNote = noteCell.replace(/^"+|"+$/g, "").replace(/^\*+\s*/, "").trim();
            calendar.note = rewriteCalendarNote(rawNote);
        }
        index += 1;
    }

    const monthParts = calendar.monthLabel.split(/\s+/);
    if (monthParts.length >= 2) {
        const possibleYear = Number.parseInt(monthParts[monthParts.length - 1], 10);
        const monthName = monthParts.slice(0, -1).join(" ");
        if (!Number.isNaN(possibleYear)) {
            const parsedDate = new Date(`${monthName} 1, ${possibleYear}`);
            if (!Number.isNaN(parsedDate.getTime())) {
                calendar.year = parsedDate.getFullYear();
                calendar.month = parsedDate.getMonth();
            }
        }
    }

    if (calendar.year === null || calendar.month === null) {
        const today = new Date();
        calendar.year = today.getFullYear();
        calendar.month = today.getMonth();
        if (!calendar.monthLabel) {
            calendar.monthLabel = today.toLocaleDateString("en-US", CALENDAR_MONTH_OPTIONS);
        }
    }

    advance();

    if (index < lines.length && /monday/i.test(lines[index])) {
        index += 1;
    }

    let fallbackWeekNumber = 1;
    while (index < lines.length) {
        advance();
        if (index >= lines.length) {
            break;
        }

        const line = lines[index];
        if (!line) {
            index += 1;
            continue;
        }

        if (line.startsWith("*")) {
            break;
        }

        const weekCells = splitCsvLine(line);
        const firstCell = weekCells[0] || "";
        const match = firstCell.match(/week\s*(\d+)?\s*(.*)/i);
        let weekNumber = fallbackWeekNumber;
        let focus = firstCell.replace(/^"+|"+$/g, "").trim();

        if (match) {
            if (match[1]) {
                const parsed = Number.parseInt(match[1], 10);
                if (!Number.isNaN(parsed)) {
                    weekNumber = parsed;
                    fallbackWeekNumber = parsed + 1;
                }
            } else {
                fallbackWeekNumber += 1;
            }
            focus = match[2]?.trim() || focus;
        } else {
            fallbackWeekNumber += 1;
        }

        if (index + 2 >= lines.length) {
            break;
        }

        const dayNumbers = splitCsvLine(lines[index + 1] || "");
        const eventLabels = splitCsvLine(lines[index + 2] || "");
        const sanitizedNumbers = dayNumbers.slice(0, 7);
        const hasDateNumbers = sanitizedNumbers.some((value) => /^\d{1,2}$/.test(value));
        if (!hasDateNumbers) {
            break;
        }
        const sanitizedEvents = eventLabels.slice(0, 7);
        const sideNote =
            eventLabels.slice(7).find((value) => value && value.trim())?.replace(/^"+|"+$/g, "").trim() || "";
        index += 3;

        const days = [];
        for (let column = 0; column < 7; column += 1) {
            days.push({
                number: sanitizedNumbers[column] ?? "",
                label: sanitizedEvents[column] ?? ""
            });
        }

        calendar.weeks.push({
            number: weekNumber,
            focus,
            days,
            note: sideNote,
            theme: deriveFocusTheme(focus)
        });
    }

    for (; index < lines.length; index += 1) {
        const line = lines[index];
        if (!line) {
            continue;
        }
        if (isSkippableLine(line)) {
            continue;
        }

        const pieces = splitCsvLine(line);
        let noteText = pieces.filter(Boolean).join(" • ");
        if (!noteText) {
            continue;
        }
        noteText = noteText.replace(/^"+|"+$/g, "");
        if (noteText.startsWith("*")) {
            noteText = noteText.replace(/^\*+\s*/, (match) => `${match.trim()} `).trim();
        }
        calendar.footnotes.push(noteText);
    }

    if (!calendar.monthLabel) {
        const firstOfMonth = new Date(calendar.year, calendar.month, 1);
        calendar.monthLabel = firstOfMonth.toLocaleDateString("en-US", CALENDAR_MONTH_OPTIONS);
    }

    return calendar;
}

function renderSheetCalendar(root, calendar) {
    if (!root) {
        return;
    }

    const monthTargets = root.querySelectorAll("[data-calendar-month]");
    monthTargets.forEach((element) => {
        element.textContent = calendar.monthLabel;
    });

    const noteElement = root.querySelector("[data-calendar-note]");
    if (noteElement) {
        noteElement.textContent =
            calendar.note ||
            "Private lessons are available on Tuesdays & Thursdays. Stop by the front desk for details.";
    }

    const tbody = root.querySelector("[data-calendar-body]");
    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (!calendar.weeks.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 9;
        cell.textContent = "Calendar data is currently unavailable. Please check back soon.";
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    const daysInMonth = getDaysInMonth(calendar.year, calendar.month);
    let seenStart = false;
   let rolledOver = false;
    let previousValue = null;

    calendar.weeks.forEach((week, weekIndex) => {
        const focusRow = document.createElement("tr");
        focusRow.className = "calendar-week-row calendar-week-row--focus";
        const themeClass = `calendar-week-row--theme-${week.theme || deriveFocusTheme(week.focus)}`;
        focusRow.classList.add(themeClass);

        const weekCell = document.createElement("th");
        weekCell.scope = "row";
        weekCell.rowSpan = 2;

        const labelSpan = document.createElement("span");
        labelSpan.className = "week-label";
        const safeWeekNumber = Number.isFinite(week.number) ? week.number : weekIndex + 1;
        labelSpan.textContent = `Week ${safeWeekNumber}`;

        const focusSpan = document.createElement("span");
        focusSpan.className = "week-focus";
        focusSpan.textContent = week.focus || "";

        weekCell.append(labelSpan, focusSpan);
        focusRow.appendChild(weekCell);

        const focusCell = document.createElement("td");
        focusCell.className = "calendar-week-focus";
        focusCell.colSpan = 7;
        focusCell.textContent = week.focus || "Training Focus";
        focusRow.appendChild(focusCell);

        const noteCell = document.createElement("td");
        noteCell.className = "calendar-week-note";
        noteCell.rowSpan = 2;
        if (week.note) {
            noteCell.textContent = week.note;
        } else {
            noteCell.textContent = "—";
            noteCell.classList.add("is-empty");
        }
        focusRow.appendChild(noteCell);

        tbody.appendChild(focusRow);

        const daysRow = document.createElement("tr");
        daysRow.className = "calendar-week-row calendar-week-row--days";

        week.days.forEach((day) => {
            const cell = document.createElement("td");
            const dayContainer = document.createElement("div");
            dayContainer.className = "calendar-day";

            const numberSpan = document.createElement("span");
            numberSpan.className = "day-number";
            const eventSpan = document.createElement("span");
            eventSpan.className = "day-event";

            const rawNumber = (day.number || "").trim();
            const parsedNumber = Number.parseInt(rawNumber, 10);
            const hasNumber = !Number.isNaN(parsedNumber);
            let isMuted = false;

            if (!hasNumber) {
                numberSpan.textContent = "";
                isMuted = true;
            } else {
                if (!seenStart) {
                    if (parsedNumber === 1) {
                        seenStart = true;
                    } else {
                        isMuted = true;
                    }
                } else if (!rolledOver && previousValue !== null && parsedNumber < previousValue) {
                    rolledOver = true;
                }

                if (rolledOver || parsedNumber > daysInMonth) {
                    isMuted = true;
                }

                numberSpan.textContent = String(parsedNumber);
                previousValue = parsedNumber;
            }

            if (isMuted) {
                numberSpan.classList.add("is-muted");
            }

            const formatted = formatCalendarLabel(day.label);
            eventSpan.textContent = formatted.text;
            if (formatted.className) {
                eventSpan.classList.add(formatted.className);
            }

            dayContainer.append(numberSpan, eventSpan);
            cell.appendChild(dayContainer);
            daysRow.appendChild(cell);
        });

        tbody.appendChild(daysRow);
    });

    const footnoteList = root.querySelector("[data-calendar-footnotes]");
    if (footnoteList) {
        footnoteList.innerHTML = "";
        const notes =
            calendar.footnotes.length > 0
                ? calendar.footnotes
                : ["* Schedule is subject to change.", "** Attendance is important to be eligible to test the next rank."];

        notes.forEach((note) => {
            const li = document.createElement("li");
            li.textContent = note.replace(/^(\*+)/, (match) => `${match} `).trim();
            footnoteList.appendChild(li);
        });
    }

    const table = root.querySelector(".portal-calendar__table");
    if (table) {
        table.setAttribute("aria-label", `${calendar.monthLabel} class calendar`);
    }
}

function deriveFocusTheme(focusText) {
    const normalized = (focusText || "").toLowerCase();
    if (normalized.includes("sparring") || normalized.includes("self defense")) {
        return "sparring";
    }
    if (normalized.includes("break")) {
        return "breaking";
    }
    if (normalized.includes("poomsae")) {
        return "poomsae";
    }
    return "default";
}

function rewriteCalendarNote(noteText) {
    const normalized = noteText.toLowerCase();
    if (
        normalized.includes("sparring weeks") &&
        normalized.includes("chest gear") &&
        normalized.includes("wasting class time")
    ) {
        return "Friendly reminder: During sparring weeks please arrive with chest gear so we can jump right into training together.";
    }
    return noteText;
}

function formatCalendarLabel(rawLabel) {
    const label = (rawLabel || "").trim();
    if (!label) {
        return { text: "—", className: "day-event--empty" };
    }

    const normalized = label.toLowerCase();

    if (normalized === "x" || normalized === "closed" || normalized.includes("no class")) {
        return { text: "No Class", className: "day-event--closed" };
    }
    if (normalized.includes("thank")) {
        return { text: "Thanksgiving - Closed", className: "day-event--closed" };
    }
    if (normalized.includes("test")) {
        return { text: label, className: "day-event--test" };
    }
    if (normalized.includes("gear")) {
        return { text: label, className: "day-event--gear" };
    }
    if (
        normalized.includes("board") ||
        normalized.includes("breaking") ||
        normalized.includes("review") ||
        normalized === "br" ||
        normalized === "pp"
    ) {
        return { text: label, className: "day-event--highlight" };
    }

    return { text: label.replace(/\s+/g, " "), className: "" };
}

function showSheetCalendarError(root) {
    if (!root) {
        return;
    }

    const tbody = root.querySelector("[data-calendar-body]");
    if (tbody) {
        tbody.innerHTML = "";
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 9;
        cell.textContent = "Calendar data is temporarily unavailable. Please check back soon.";
        row.appendChild(cell);
        tbody.appendChild(row);
    }

    const noteElement = root.querySelector("[data-calendar-note]");
    if (noteElement) {
        noteElement.textContent =
            "Calendar data is temporarily unavailable. Contact the front desk for the latest schedule.";
    }
}

function splitCsvLine(line) {
    if (!line) {
        return [];
    }
    const cells = [];
    let current = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];

        if (char === "\"") {
            if (insideQuotes && line[index + 1] === "\"") {
                current += "\"";
                index += 1;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === "," && !insideQuotes) {
            cells.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    cells.push(current.trim());
    return cells.map((cell) => cell.replace(/^"+|"+$/g, "").trim());
}

function generateFocusRanges(startDate, endDate, template) {
    const ranges = [];
    let year = startDate.getFullYear();
    let month = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    while (year < endYear || (year === endYear && month <= endMonth)) {
        const daysInMonth = getDaysInMonth(year, month);
        for (let weekIndex = 0, day = 1; day <= daysInMonth; weekIndex += 1, day += 7) {
            const templateIndex = Math.min(weekIndex, template.length - 1);
            const focus = template[templateIndex];
            ranges.push({
                start: new Date(year, month, day),
                end: new Date(year, month, Math.min(day + 6, daysInMonth)),
                events: [
                    createEvent(focus.title, "During all classes", "focus", focus.description)
                ]
            });
        }

        month += 1;
        if (month > 11) {
            month = 0;
            year += 1;
        }
    }

    return ranges;
}

function generateMonthlyOverrides(startDate, endDate, recurringEvent) {
    const overrides = {};
    let year = startDate.getFullYear();
    let month = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    while (year < endYear || (year === endYear && month <= endMonth)) {
        const secondFriday = getNthWeekdayOfMonth(year, month, 5, 2);
        if (secondFriday) {
            addOverrideEvent(overrides, secondFriday, recurringEvent);
        }

        month += 1;
        if (month > 11) {
            month = 0;
            year += 1;
        }
    }

    return overrides;
}

function getNthWeekdayOfMonth(year, month, weekday, occurrence) {
    const date = new Date(year, month, 1);
    let count = 0;
    while (date.getMonth() === month) {
        if (date.getDay() === weekday) {
            count += 1;
            if (count === occurrence) {
                return new Date(date);
            }
        }
        date.setDate(date.getDate() + 1);
    }
    return null;
}

function addOverrideEvent(map, date, event, replace = false) {
    const iso = toIsoDate(date);
    if (!map[iso] || replace) {
        map[iso] = { events: [], replace: Boolean(replace) };
    }

    if (replace) {
        map[iso].events = [];
    }

    map[iso].events.push({ ...event });
}

function mergeOverrides(base, extra) {
    const merged = {};

    Object.entries(base).forEach(([iso, override]) => {
        merged[iso] = {
            replace: Boolean(override.replace),
            events: Array.isArray(override.events) ? override.events.map((event) => ({ ...event })) : []
        };
    });

    Object.entries(extra).forEach(([iso, override]) => {
        if (!merged[iso]) {
            merged[iso] = { replace: false, events: [] };
        }

        if (override.replace) {
            merged[iso].replace = true;
            merged[iso].events = [];
        }

        if (Array.isArray(override.events)) {
            override.events.forEach((event) => {
                merged[iso].events.push({ ...event });
            });
        }
    });

    return merged;
}

function getEventsForDate(date) {
    const events = [];
    const weekdayEvents = DOJO_CALENDAR_WEEKLY[date.getDay()];
    if (Array.isArray(weekdayEvents)) {
        weekdayEvents.forEach((event) => {
            events.push({ ...event });
        });
    }

    DOJO_CALENDAR_RANGES.forEach((range) => {
        if (date >= range.start && date <= range.end && Array.isArray(range.events)) {
            range.events.forEach((event) => {
                events.push({ ...event });
            });
        }
    });

    if (date.getDay() === 0 || date.getDay() === 6) {
        for (let index = events.length - 1; index >= 0; index -= 1) {
            if (events[index].category === "focus") {
                events.splice(index, 1);
            }
        }
    }

    const override = DOJO_CALENDAR_DAY_OVERRIDES[toIsoDate(date)];
    if (override) {
        if (override.replace) {
            events.length = 0;
        }

        if (Array.isArray(override.events)) {
            override.events.forEach((event) => {
                events.push({ ...event });
            });
        }
    }

    const deduped = dedupeEvents(events);
    deduped.sort((a, b) => (EVENT_DISPLAY_PRIORITY[a.category] ?? 99) - (EVENT_DISPLAY_PRIORITY[b.category] ?? 99));
    return deduped;
}

function toIsoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function createEvent(title, time, category, description) {
    return {
        title,
        time,
        category,
        description
    };
}

function parseIsoDate(isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function dedupeEvents(events) {
    const seen = new Set();
    return events.filter((event) => {
        const key = `${event.title}|${event.time}|${event.category}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
