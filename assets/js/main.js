const navToggle = document.querySelector(".nav-toggle");
const navList = document.querySelector(".main-nav ul");
const yearTarget = document.getElementById("year");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const SOUND_STORAGE_KEY = "ara:soundFx";
const SOUND_TARGET_SELECTOR = ".cta-btn, .secondary-btn, .floating-cta";

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
