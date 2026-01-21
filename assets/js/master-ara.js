const BOT_CONFIG = {
    name: "Master Ara",
    welcome: "Hi, I’m Master Ara 🥋. Ask me about belts, study guides, kicks, schedules, or the student portal. I'll guide you—or email Master Ara if I can't.",
    fallbackEmail: "afetkd@gmail.com",
    storageKey: "masterAraFallbacks"
};

const CURRICULUM = [
    {
        "name": "White Belt",
        "aliases": [
            "white",
            "beginner"
        ],
        "resources": [
            {
                "title": "Study Video",
                "resource": "assets/Images/Kicho%201.mp4",
                "type": "video",
                "tags": [
                    "study",
                    "video",
                    "form"
                ]
            },
            {
                "title": "Study Guide",
                "resource": "assets/materials/white-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# White Belt Study Guide\n\n**Focus:** Foundations: attention stance, courtesy, basic blocks, and home respect goals.\n\n## Key Skills\n- Attention stance and confident bow\n- Horse stance with 10 middle punches\n- Front stance low block on both sides\n\n## Home Practice\n- Read the focus statements with a parent or guardian.\n- Log practice minutes daily in your workbook.\n- Stretch for 5 minutes after training."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/tkd-curriculum-white-belt.png",
                "type": "image",
                "tags": [
                    "checklist",
                    "testing"
                ]
            }
        ]
    },
    {
        "name": "High White Belt",
        "aliases": [
            "high white",
            "white advanced"
        ],
        "resources": [
            {
                "title": "Study Guide",
                "resource": "assets/materials/high-white-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# High White Belt Study Guide\n\n**Focus:** Early footwork, loud kihaps, and sharp low/high blocks with balance checks.\n\n## Key Skills\n- Forward stance step-and-punch drill with loud kihap\n- Down block into reverse punch on both sides\n- Courtesy routine: bowing on/off the mat\n\n## Home Practice\n- Drill down-block plus punch combo 20 times.\n- Count each movement out loud with a kihap.\n- Ask a parent to quiz your courtesy statements."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/tkd-curriculum-high-white-belt.png",
                "type": "image",
                "tags": [
                    "checklist",
                    "testing"
                ]
            }
        ]
    },
    {
        "name": "Yellow Belt",
        "aliases": [
            "yellow"
        ],
        "resources": [
            {
                "title": "Study Video",
                "resource": "https://youtu.be/WhkjRruCBTo?si=E-UgOruZShgYSNeT&t=82",
                "type": "link",
                "tags": [
                    "study",
                    "video"
                ]
            },
            {
                "title": "Study Guide",
                "resource": "assets/materials/yellow-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# Yellow Belt Study Guide\n\n**Focus:** Balance, strong front stances, and first round of one-steps.\n\n## Key Skills\n- Front stance transitions with hip rotation\n- Front kick plus step punch combination\n- One-step sparring #1-3 with control\n\n## Home Practice\n- Practice Taegeuk 1 three times daily.\n- Hold front stance for 30 seconds per side.\n- Log stretches and hydration in your workbook."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/tkd-curriculum-yellow-belt.png",
                "type": "image",
                "tags": [
                    "checklist",
                    "testing"
                ]
            }
        ]
    },
    {
        "name": "High Yellow Belt",
        "aliases": [
            "high yellow"
        ],
        "resources": [
            {
                "title": "Study Video",
                "resource": "https://youtu.be/tGlrUplKHh8?si=H6A2ThFhMwu03AQ_&t=67",
                "type": "link",
                "tags": [
                    "study",
                    "video"
                ]
            },
            {
                "title": "Study Guide",
                "resource": "assets/materials/high-yellow-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# High Yellow Belt Study Guide\n\n**Focus:** Confidence linking front and side kicks with self-defense combinations.\n\n## Key Skills\n- Skip front kick into fighting stance\n- Side kick chamber, extension, and retraction\n- Self-defense combo #2 (shoulder grab release)\n\n## Home Practice\n- Shadow skip kicks for 2 minutes without dropping guard.\n- Film yourself performing self-defense #2 and review technique.\n- Update your goal sheet after each home practice."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/tkd-curriculum-high-yellow-belt.png",
                "type": "image",
                "tags": [
                    "checklist",
                    "testing"
                ]
            }
        ]
    },
    {
        "name": "Green Belt",
        "aliases": [
            "green"
        ],
        "resources": [
            {
                "title": "Study Video",
                "resource": "https://youtu.be/ksSqKt0UkWo?si=jowU-x4mP_eGsYh4&t=70",
                "type": "link",
                "tags": [
                    "study",
                    "video"
                ]
            },
            {
                "title": "Study Guide",
                "resource": "assets/materials/green-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# Green Belt Study Guide\n\n**Focus:** Power generation, stronger poomsae details, sparring drills.\n\n## Key Skills\n- Back stance with knife-hand block\n- Round kick plus back kick combination\n- Point sparring entry strategies\n\n## Home Practice\n- Record your poomsae once per week and rewatch for details.\n- Track sparring rounds and targets in your notebook.\n- Stretch hamstrings and hips nightly for 5 minutes."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/tkd-curriculum-green-belt.png",
                "type": "image",
                "tags": [
                    "checklist",
                    "testing"
                ]
            }
        ]
    },
    {
        "name": "High Green Belt",
        "aliases": [
            "high green"
        ],
        "resources": [
            {
                "title": "Study Video",
                "resource": "https://youtu.be/Lt917gacJho?si=aQT6Da0ymYxaaIfl&t=90",
                "type": "link",
                "tags": [
                    "study",
                    "video"
                ]
            },
            {
                "title": "Study Guide",
                "resource": "assets/materials/high-green-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# High Green Belt Study Guide\n\n**Focus:** Footwork triangles, counter-sparring, and advanced combination control.\n\n## Key Skills\n- Triangle footwork drill with fast pivots\n- Counter sparring: block-check-counter combos\n- Board-break rehearsal: turning side kick to power slap shield\n\n## Home Practice\n- Drill triangle footwork for 3 timed sets.\n- Visualize counters for three sparring scenarios before bed.\n- Journal about ring strategy adjustments each week."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/tkd-curriculum-high-green-belt.png",
                "type": "image",
                "tags": [
                    "checklist",
                    "testing"
                ]
            }
        ]
    },
    {
        "name": "Blue Belt",
        "aliases": [
            "blue"
        ],
        "resources": [
            {
                "title": "Study Video",
                "resource": "https://youtu.be/VdqNEAHWCBM?si=HZPlrrTmsxkAiQPV&t=75",
                "type": "link",
                "tags": [
                    "study",
                    "video"
                ]
            },
            {
                "title": "Study Guide",
                "resource": "assets/materials/blue-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# Blue Belt Study Guide\n\n**Focus:** Ring control, board breaks, and intermediate sparring strategies.\n\n## Key Skills\n- Ring control using cut steps and angles\n- Jump round kick with hip snap\n- Self-defense combo #5 (bear-hug defense)\n\n## Home Practice\n- Lead a warm-up for siblings or stuffed animals.\n- Cycle jump round kicks for 20 total reps.\n- Review leadership reminders before class."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/tkd-curriculum-blue-belt.png",
                "type": "image",
                "tags": [
                    "checklist",
                    "testing"
                ]
            }
        ]
    },
    {
        "name": "High Blue Belt",
        "aliases": [
            "high blue"
        ],
        "resources": [
            {
                "title": "Study Video",
                "resource": "https://youtu.be/jcBwWo4wN7c?si=1yGokYoeRXDiLY5F&t=55",
                "type": "link",
                "tags": [
                    "study",
                    "video"
                ]
            },
            {
                "title": "Study Guide",
                "resource": "assets/materials/high-blue-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# High Blue Belt Study Guide\n\n**Focus:** Leadership reps, spin kicks, and coaching cues for junior students.\n\n## Key Skills\n- Spin hook kick mechanics on target\n- Counter-sparring drill with three linked combos\n- Coaching cues for white/yellow belts\n\n## Home Practice\n- Design a 5-minute drill for lower belts and test it.\n- Film spin hook kicks from two angles to check chamber height.\n- Note feedback you give teammates after each class."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/tkd-curriculum-high-blue-belt.png",
                "type": "image",
                "tags": [
                    "checklist",
                    "testing"
                ]
            }
        ]
    },
    {
        "name": "Red Belt",
        "aliases": [
            "red"
        ],
        "resources": [
            {
                "title": "Study Video",
                "resource": "https://youtu.be/6FUM1p6qqhQ?si=QFCP9UYnsTvd-qcZ&t=61",
                "type": "link",
                "tags": [
                    "study",
                    "video"
                ]
            },
            {
                "title": "Study Guide",
                "resource": "assets/materials/red-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# Red Belt Study Guide\n\n**Focus:** Demo-ready power, teaching readiness, and board-break creativity.\n\n## Key Skills\n- Creative form segment planning\n- Breaking combinations with timing\n- Instructor voice projection and mat control\n\n## Home Practice\n- Plan demo combinations inside your training log.\n- Stretch shoulders and back after every break practice.\n- Reflect on how you project your teaching voice."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/tkd-curriculum-red-belt.png",
                "type": "image",
                "tags": [
                    "checklist",
                    "testing"
                ]
            }
        ]
    },
    {
        "name": "High Red Belt",
        "aliases": [
            "high red"
        ],
        "resources": [
            {
                "title": "Study Video",
                "resource": "https://youtu.be/Gr_Je2ZkgkI?si=bZp1cCvGdrXIRr3W&t=67",
                "type": "link",
                "tags": [
                    "study",
                    "video"
                ]
            },
            {
                "title": "Study Guide",
                "resource": "assets/materials/high-red-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# High Red Belt Study Guide\n\n**Focus:** Testing rehearsals, mentoring, and black-belt mindset assignments.\n\n## Key Skills\n- Full test rehearsal with timing cues\n- Mentor a junior student for form corrections\n- Black belt essay outline and service project check-ins\n\n## Home Practice\n- Run a complete mock test weekly and time each segment.\n- Meet with or message your mentee to deliver coaching tips.\n- Draft and revise your black belt essay goals."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/tkd-curriculum-high-red-belt.png",
                "type": "image",
                "tags": [
                    "checklist",
                    "testing"
                ]
            }
        ]
    },
    {
        "name": "Black Belt",
        "aliases": [
            "black"
        ],
        "resources": [
            {
                "title": "Study Guide",
                "resource": "assets/materials/black-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# Black Belt Study Guide\n\n**Focus:** Sharpen every pillar—forms, sparring, weapons, and service.\n\n## Key Skills\n- Poomsae: Koryo or Keumgang refinement\n- Fight camp interval conditioning plan\n- Community service impact reflection\n\n## Home Practice\n- Schedule cross-training and conditioning days.\n- Log teaching hours toward service requirements.\n- Set quarterly growth goals with Master Ara."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/black-belt-testing-checklist.md",
                "type": "document",
                "tags": [
                    "checklist",
                    "testing"
                ],
                "content": "# Black Belt Testing Checklist\n\nUse this list with your instructor to confirm you are test-ready.\n\n- [ ] Teach a 10-minute class segment\n- [ ] Poomsae: Koryo/Keumgang with precision\n- [ ] Board break: three-direction combo including jump kick"
            }
        ]
    },
    {
        "name": "Black Belt 2nd Dan",
        "aliases": [
            "2nd dan",
            "second dan",
            "black belt 2"
        ],
        "resources": [
            {
                "title": "Study Guide",
                "resource": "assets/materials/black-2nd-dan-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# Black Belt 2nd Dan Study Guide\n\n**Focus:** Lead classes with confidence while deepening creative poomsae, sparring strategy, and community service.\n\n## Key Skills\n- Design and run a 15-minute class segment for intermediate students.\n- Demonstrate creative board-break sequences with clean re-chambers.\n- Coach color belts through testing requirements with constructive feedback.\n\n## Home Practice\n- Outline each class you assist and note teaching cues that landed best.\n- Record your poomsae from two angles each week to spot balance or timing gaps.\n- Track service hours toward your leadership project."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/black-2nd-dan-belt-testing-checklist.md",
                "type": "document",
                "tags": [
                    "checklist",
                    "testing"
                ],
                "content": "# Black Belt 2nd Dan Testing Checklist\n\nUse this list with your instructor to confirm you are test-ready.\n\n- [ ] Teach a full warm-up + drill block (minimum 15 minutes) that shows control and voice.\n- [ ] Perform Koryo and Keumgang with tournament-level precision.\n- [ ] Break: three-station combo featuring spin kick + power hand.\n- [ ] Submit a reflection on your community service project and leadership growth."
            }
        ]
    },
    {
        "name": "Black Belt 3rd Dan",
        "aliases": [
            "3rd dan",
            "third dan",
            "black belt 3"
        ],
        "resources": [
            {
                "title": "Study Guide",
                "resource": "assets/materials/black-3rd-dan-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# Black Belt 3rd Dan Study Guide\n\n**Focus:** Coach tournament teams, refine curriculum, and model mastery in advanced poomsae, sparring, and board breaks.\n\n## Key Skills\n- Develop tournament training plans for sparring and poomsae squads.\n- Execute advanced combination board breaks showing power and creativity.\n- Mentor junior black belts through lesson planning and feedback loops.\n\n## Home Practice\n- Keep a weekly coaching journal with notes for each athlete you support.\n- Film self-practice of Taebaek or Pyongwon to analyze rhythm and breathing.\\n- Schedule conditioning blocks that balance lifting, mobility, and recovery."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/black-3rd-dan-belt-testing-checklist.md",
                "type": "document",
                "tags": [
                    "checklist",
                    "testing"
                ],
                "content": "# Black Belt 3rd Dan Testing Checklist\n\nUse this list with your instructor to confirm you are test-ready.\\n\\n- [ ] Lead a full 30-minute class that includes curriculum, corrections, and mat etiquette.\\n- [ ] Perform Taebauk (or designated poomsae) with emphasis on breath control and dynamics.\\n- [ ] Board break: four-direction routine including a flying technique.\\n- [ ] Present a written or video curriculum plan for a 6-week training cycle."
            }
        ]
    },
    {
        "name": "Black Belt 4th Dan",
        "aliases": [
            "4th dan",
            "fourth dan",
            "black belt 4"
        ],
        "resources": [
            {
                "title": "Study Guide",
                "resource": "assets/materials/black-4th-dan-belt-study-guide.md",
                "type": "document",
                "tags": [
                    "study",
                    "guide",
                    "curriculum"
                ],
                "content": "# Black Belt 4th Dan Study Guide\\n\\n**Focus:** Master-level leadership with instructor certification, program mentorship, and community impact planning.\\n\\n## Key Skills\\n- Create strategic plans for school operations, events, and student retention.\\n- Demonstrate mastery of advanced poomsae (Pyongwon, Sipjin, or instructor-designated form).\\n- Facilitate instructor training seminars that align with federation standards.\\n\\n## Home Practice\\n- Build a yearly program roadmap that includes testing, seminars, and outreach.\\n- Meet monthly with Master Ara to review leadership milestones.\\n- Continue personal conditioning with periodized strength, cardio, and mobility sessions."
            },
            {
                "title": "Checklist",
                "resource": "assets/materials/black-4th-dan-belt-testing-checklist.md",
                "type": "document",
                "tags": [
                    "checklist",
                    "testing"
                ],
                "content": "# Black Belt 4th Dan Testing Checklist\\n\\nUse this list with your instructor to confirm you are test-ready.\\n\\n- [ ] Present a 12-month program plan that covers curriculum, testing, marketing, and service.\\n- [ ] Perform Master-level poomsae (Pyongwon/Sipjin or assigned form) with precision.\\n- [ ] Board break: master demonstration featuring at least five techniques and a creative finale.\\n- [ ] Lead an instructor development seminar and submit attendee feedback summaries."
            }
        ]
    },
    {
        "name": "Taekwondo Kicks",
        "aliases": ["kicks", "chagi", "kukkiwon"],
        "resources": [
            {
                "title": "Kukkiwon Kicks Guide",
                "resource": "internal-kukkiwon-kicks",
                "type": "document",
                "tags": ["kicks", "chagi", "kukkiwon", "terminology"],
                "content": "In Kukkiwon-style Taekwondo, kicks (Chagi) are categorized by the direction of the strike and the technique used, ranging from fundamental kicks for beginners to complex jumping and spinning maneuvers for advanced practitioners. Basic kicks (KibonChagi) These are the foundational kicks taught to all students and form the basis for more advanced techniques. Front Kick (ApChagi): A linear, snapping kick to the front using the ball of the foot. It is used for both offense and defense to create distance.Roundhouse Kick (DollyeoChagi): A turning kick delivered with the instep or ball of the foot. It is a staple of Taekwondo sparring.Side Kick (YeopChagi): A powerful kick delivered with the blade of the foot or the heel. It uses a rotation of the hips to generate piercing force.Axe Kick (NaeryeoChagi): A downward kick brought high over the target and brought down like an axe. It can be delivered from the outside-in or inside-out.Back Kick (DwiChagi): A thrusting kick to the rear, executed by turning away from the target. It is known for its power and is often used as a counter-attack.Hook Kick (HuryeoChagi): A whipping kick that strikes the target with the heel, often performed after chambering the leg like a side kick.Crescent Kick (BandalChagi): A kick that travels in a circular arc. It can be performed inward (AnChagi) or outward (BakkatChagi).Push Kick (MeereoChagi): A thrusting front kick used to push an opponent away and control distance. Intermediate and advanced kicks As practitioners progress, they learn more dynamic and complex kicks by adding jumps, spins, and combinations. Spinning Hook Kick (DwiHuryeoChagi): A hook kick performed after a spin, generating significant power. It is also known as a back hook kick.Reverse Turning Kick (BandaeDollyeoChagi): A kick executed with the back leg after turning the body.Jumping Kicks (TtwigiChagi or EedanChagi): These kicks are performed while in the air and include variations such as the Jumping Front Kick (EedanApChagi) and Jumping Side Kick (Twi-myoYeopChagi).Tornado Kick (DolgaeChagi): A flashy and powerful kick that combines a jump and a spinning roundhouse motion.540 Kick: An aerial kicking technique that involves spinning 1½ times before delivering a kick, most often a spinning hook kick. Common kicking terminology Understanding the Korean terminology is crucial for learning Kukkiwon Taekwondo. (Chagi): Kick(Ap): Front(Yeop): Side(Dwi): Back or rear(Dollyeo): Turning or roundhouse(Naeryeo): Downward(Huryeo): Hook(Bandae): Reverse(Ttwigi) / (Eedan): Jumping or flying"
            }
        ]
    }
];

const GLOBAL_RESOURCES = [
    { title: "Weekly Schedule", resource: "#schedule", type: "anchor", tags: ["schedule", "classes", "times"] },
    { title: "Student Portal", resource: "https://aratkd.com/student-portal.html", type: "link", tags: ["portal", "login", "id"] },
    { title: "Contact Ara’s Sportsplex", resource: "#contact", type: "anchor", tags: ["contact", "phone", "email"] }
];

const tokenize = (value) => (value ? value.toLowerCase().match(/[a-z0-9]+/g) ?? [] : []);

const knowledgeIndex = (() => {
    const entries = [];

    const register = (resource, beltName = null, aliases = []) => {
        const beltTokens = beltName ? tokenize(beltName) : [];
        const aliasTokens = aliases.flatMap(tokenize);
        const tokens = new Set([
            ...tokenize(resource.title || ""),
            ...tokenize(resource.type || ""),
            ...beltTokens,
            ...aliasTokens,
            ...(resource.tags || []).flatMap(tokenize)
        ]);

        entries.push({
            id: `${beltName ? beltName.toLowerCase().replace(/\s+/g, "-") : "global"}-${entries.length}`,
            title: beltName ? `${beltName}: ${resource.title}` : resource.title,
            resource: resource.resource,
            type: resource.type,
            tags: resource.tags || [],
            tokens: Array.from(tokens)
        });
    };

    GLOBAL_RESOURCES.forEach((item) => register(item));
    CURRICULUM.forEach((belt) => belt.resources.forEach((resource) => register(resource, belt.name, belt.aliases || [])));

    return entries;
})();

const botState = {
    panelOpen: false,
    sending: false,
    greeted: false,
    history: [],
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
    panel.hidden = true;
    panel.setAttribute("aria-live", "polite");

    panel.innerHTML = `
        <header class="master-ara__header">
            <div>
                <p class="master-ara__eyebrow">Assistant</p>
                <h2>${BOT_CONFIG.name}</h2>
                <p class="master-ara__intro">${BOT_CONFIG.welcome}</p>
            </div>
            <button type="button" class="master-ara__close" aria-label="Close chat">Close</button>
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

const searchKnowledge = (query) => {
    const queryTokens = tokenize(query);
    if (!queryTokens.length) return [];
    const tokenSet = new Set(queryTokens);

    return knowledgeIndex
        .map((entry) => {
            const matches = entry.tokens.filter((token) => tokenSet.has(token)).length;
            const partial = entry.tags.some((tag) => query.toLowerCase().includes(tag.toLowerCase()));
            return { ...entry, score: matches + (partial ? 1 : 0) };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);
};

const handleResourceMatch = (match) => {
    switch (match.type) {
        case "video":
            return `Here’s the video you need: ${match.resource}`;
        case "image":
            return `Here’s the checklist: ${match.resource}`;
        case "document":
            return `Here’s the study guide: ${match.resource}\n\nContent:\n${match.content}`;
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

const composeResponse = (query) => {
    const lowerQuery = query.toLowerCase();
    const matches = searchKnowledge(query);

    if (matches.length) {
        if (matches.length === 1) {
            return handleResourceMatch(matches[0]);
        }
        const summary = matches
            .slice(0, 3)
            .map((match) => `• ${match.title}: ${match.resource}`)
            .join("\n");
        return `I found a few options:\n${summary}`;
    }

    if (lowerQuery.includes("schedule")) {
        const target = document.querySelector("#schedule");
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return "Here’s the schedule section. Scroll through for each day’s class times.";
    }

    if (lowerQuery.includes("portal") || lowerQuery.includes("log")) {
        return "Visit the Student Portal via the top navigation or https://aratkd.com/student-portal.html. Let me know if you need your ID!";
    }

    // Check for specific belt study guides or checklists
    for (const belt of CURRICULUM) {
        const beltNameLower = belt.name.toLowerCase();
        if (lowerQuery.includes(beltNameLower)) {
            for (const resource of belt.resources) {
                const resourceTitleLower = resource.title.toLowerCase();
                if (lowerQuery.includes("study guide") && resourceTitleLower.includes("study guide")) {
                    return handleResourceMatch(resource);
                }
                if (lowerQuery.includes("checklist") && resourceTitleLower.includes("checklist")) {
                    return handleResourceMatch(resource);
                }
                if (lowerQuery.includes("video") && resourceTitleLower.includes("video")) {
                    return handleResourceMatch(resource);
                }
            }
        }
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
            renderMessage(
                elements.messages,
                "bot",
                "I want to get this right. I’ll collect your question and email Master Ara so he can follow up.",
                {
                    actions: [
                        {
                            label: "Send Email",
                            handler: () => {
                                window.location.href = `mailto:${BOT_CONFIG.fallbackEmail}?subject=Question%20for%20Master%20Ara&body=${encodeURIComponent(input)}`;
                            }
                        }
                    ]
                }
            );
        }

        elements.form.classList.remove("is-busy");
        botState.sending = false;
        elements.input.value = "";
        elements.input.focus();
    }, 350);
};

const openPanel = (panel, toggle, input, messages) => {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    botState.panelOpen = true;
    if (!botState.greeted) {
        renderMessage(messages, "bot", BOT_CONFIG.welcome);
        botState.greeted = true;
    }
    input.focus();
};

const closePanel = (panel, toggle) => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    botState.panelOpen = false;
    toggle.focus();
};

document.addEventListener("DOMContentLoaded", () => {
    const { toggle, panel } = createBotElements();
    const messages = panel.querySelector(".master-ara__messages");
    const form = panel.querySelector(".master-ara__form");
    const input = panel.querySelector("#master-ara-input");
    const closeButton = panel.querySelector(".master-ara__close");
    const emailButton = panel.querySelector(".master-ara__email");

    document.body.append(toggle, panel);

    toggle.addEventListener("click", () => {
        if (botState.panelOpen) {
            closePanel(panel, toggle);
        } else {
            openPanel(panel, toggle, input, messages);
        }
    });

    closeButton.addEventListener("click", () => {
        closePanel(panel, toggle);
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        handleSubmission({ messages, input, form });
    });

    emailButton.addEventListener("click", () => {
        window.location.href = `mailto:${BOT_CONFIG.fallbackEmail}?subject=Question%20for%20Master%20Ara`;
    });

    panel.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closePanel(panel, toggle);
        }
    });
});
