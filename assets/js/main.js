const navToggle = document.querySelector(".nav-toggle");
const navList = document.querySelector(".main-nav ul");
const yearTarget = document.getElementById("year");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const SOUND_STORAGE_KEY = "ara:soundFx";
const SOUND_TARGET_SELECTOR = ".cta-btn, .secondary-btn, .floating-cta";
const CALENDAR_WEEKDAY_LABELS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];
const CALENDAR_MONTH_OPTIONS = { month: "long", year: "numeric" };
const CALENDAR_DATE_OPTIONS = { weekday: "long", month: "long", day: "numeric" };
const DOJO_RECURRING_EVENTS = {
    1: [
        {
            title: "After School Success Program",
            time: "3:00 PM",
            category: "after-school",
            description: "Homework lab, healthy snack, and martial arts coaching to kick off the afternoon."
        },
        {
            title: "Kids & Family Taekwondo",
            time: "5:30 PM",
            category: "class",
            description: "Confidence-building drills and combinations for ages 6+ and training families."
        },
        {
            title: "Teens & Adults Taekwondo",
            time: "6:30 PM",
            category: "class",
            description: "High-energy conditioning, poomsae refinement, and sparring foundations."
        },
        {
            title: "Hapkido Self-Defense Essentials",
            time: "7:30 PM",
            category: "event",
            description: "Joint locks, situational awareness, and practical self-defense strategies."
        }
    ],
    3: [
        {
            title: "After School Success Program",
            time: "3:00 PM",
            category: "after-school",
            description: "STEM challenges, indoor sports, and guided martial arts instruction."
        },
        {
            title: "Forms & Sparring Development",
            time: "5:30 PM",
            category: "class",
            description: "Color belt forms, sparring footwork, and focus drills for tournament prep."
        },
        {
            title: "Leadership & Instructor Track",
            time: "6:30 PM",
            category: "leadership",
            description: "Assistant instructors refine teaching, mat management, and leadership habits."
        },
        {
            title: "Advanced Self-Defense Lab",
            time: "7:30 PM",
            category: "event",
            description: "Scenario-based Hapkido combinations and controlled partner drilling."
        }
    ],
    5: [
        {
            title: "After School Success Program",
            time: "3:00 PM",
            category: "after-school",
            description: "Parent Night Out preparation, goal check-ins, and positive habit coaching."
        },
        {
            title: "Family Taekwondo Celebration",
            time: "5:30 PM",
            category: "class",
            description: "Families train side-by-side with stripe checks and teamwork challenges."
        },
        {
            title: "Black Belt Prep",
            time: "6:30 PM",
            category: "leadership",
            description: "Board breaking combos, sparring tactics, and testing simulations."
        },
        {
            title: "Recovery & Mindfulness",
            time: "7:30 PM",
            category: "event",
            description: "Mobility work, mindset resets, and guided breathing for the weekend."
        }
    ],
    6: [
        {
            title: "Community Camps & Events",
            time: "10:00 AM",
            category: "event",
            description: "Open mat sessions, guest seminars, or camps when school is out."
        },
        {
            title: "Boot Camp Conditioning",
            time: "5:30 PM",
            category: "class",
            description: "Coach Fatima leads endurance, agility, and strength training circuits."
        },
        {
            title: "Open Mat & Sparring Labs",
            time: "6:30 PM",
            category: "class",
            description: "Focus on sparring strategies, target drills, and poomsae polishing."
        },
        {
            title: "Private Lessons",
            time: "7:30 PM",
            category: "event",
            description: "By appointment—belt exam prep, competition coaching, or focused training."
        }
    ]
};
const DOJO_SINGLE_EVENTS = {
    "2024-11-16": [
        {
            title: "Board Break Workshop",
            time: "11:00 AM",
            category: "testing",
            description: "Dial in foot positioning, power generation, and confidence ahead of testing."
        }
    ],
    "2024-11-25": [
        {
            title: "Winter Games Registration Closes",
            time: "All Day",
            category: "event",
            description: "Last call to join Ara's team roster. Email afetkd@gmail.com to secure your spot."
        }
    ],
    "2024-11-28": [
        {
            title: "Dojang Closed · Thanksgiving",
            time: "All Day",
            category: "event",
            description: "Rest, refuel, and enjoy the holiday. Classes resume on Friday."
        }
    ],
    "2024-12-06": [
        {
            title: "Taekwondo Winter Games 2025",
            time: "7:00 AM – 4:00 PM",
            category: "event",
            description: "Sparring, poomsae, and board breaking showdown hosted at Ara's Sportsplex."
        }
    ],
    "2024-12-14": [
        {
            title: "Color Belt Testing Saturday",
            time: "10:00 AM",
            category: "testing",
            description: "Stripe checks and advancement evaluations for Little Ninjas through brown belts."
        }
    ],
    "2024-12-20": [
        {
            title: "Holiday Parent Night Out",
            time: "6:00 PM",
            category: "event",
            description: "Games, pizza, and martial arts fun so parents can finish their holiday checklist."
        }
    ],
    "2025-01-06": [
        {
            title: "Winter Session Kickoff",
            time: "4:00 PM",
            category: "event",
            description: "Welcome back mat talk, goal setting for the new year, and schedule updates."
        }
    ],
    "2025-01-18": [
        {
            title: "Sparring Round Robin",
            time: "1:00 PM",
            category: "event",
            description: "Controlled rounds for color belts—gear required, partners assigned on arrival."
        }
    ],
    "2025-02-01": [
        {
            title: "Open House & Buddy Class",
            time: "10:30 AM",
            category: "event",
            description: "Bring a friend for intro drills, pad work, and membership Q&A with Master Ara."
        }
    ]
};
const EVENT_CATEGORY_LABELS = {
    "after-school": "After School",
    class: "Class",
    leadership: "Leadership",
    event: "Event",
    testing: "Testing"
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
            events.slice(0, 3).forEach((event) => {
                const marker = document.createElement("span");
                marker.className = `dojo-calendar__marker dojo-calendar__marker--${event.category || "event"}`;
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
            } else {
                labelParts.push("No scheduled events");
            }
            button.setAttribute("aria-label", labelParts.join(" — "));

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
            empty.textContent = "No scheduled programs today—call or text to set up a private lesson or intro visit.";
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
        note.textContent = "Need another time or have a question? Call (919) 799-7500 or email afetkd@gmail.com.";
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

function getEventsForDate(date) {
    const events = [];
    const weekdayEvents = DOJO_RECURRING_EVENTS[date.getDay()];
    if (Array.isArray(weekdayEvents)) {
        weekdayEvents.forEach((event) => {
            events.push({ ...event });
        });
    }

    const singleDayEvents = DOJO_SINGLE_EVENTS[toIsoDate(date)];
    if (Array.isArray(singleDayEvents)) {
        singleDayEvents.forEach((event) => {
            events.push({ ...event });
        });
    }

    return events;
}

function toIsoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
