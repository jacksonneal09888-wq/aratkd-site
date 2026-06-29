function toggleDrawer(drawerEl, show) {
  if (!drawerEl) return;
  const shouldShow = show === undefined ? true : Boolean(show);
  const wasHidden = drawerEl.hidden;
  drawerEl.hidden = !shouldShow;
  document.body.classList.toggle("admin-modal-open", shouldShow);
  const eventName = shouldShow ? "panel-open" : "panel-close";
  if (wasHidden !== !shouldShow) {
    drawerEl.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail: { drawer: drawerEl } }));
  }
}

function bindDrawerTriggers(openBtn, drawer, closeBtn, backdrop) {
  if (openBtn && !openBtn.dataset.bound) {
    openBtn.dataset.bound = "true";
    openBtn.addEventListener("click", () => toggleDrawer(drawer, true));
  }
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "true";
    closeBtn.addEventListener("click", () => toggleDrawer(drawer, false));
  }
  if (backdrop && !backdrop.dataset.bound) {
    backdrop.dataset.bound = "true";
    backdrop.addEventListener("click", () => toggleDrawer(drawer, false));
  }
}

function initPanels() {
  const pairs = [
    {
      open: document.getElementById("admin-event-drawer-open"),
      drawer: document.getElementById("admin-event-drawer"),
      close: document.getElementById("admin-event-drawer-close"),
      backdrop: document.getElementById("admin-event-drawer-backdrop")
    },
    {
      open: document.getElementById("admin-email-drawer-open"),
      drawer: document.getElementById("admin-email-drawer"),
      close: document.getElementById("admin-email-drawer-close"),
      backdrop: document.getElementById("admin-email-drawer-backdrop")
    },
    {
      open: document.getElementById("admin-student-drawer-open"),
      drawer: document.getElementById("student-drawer"),
      close: document.getElementById("student-drawer-close"),
      backdrop: document.getElementById("student-drawer-backdrop")
    },
    {
      open: document.getElementById("admin-class-drawer-open"),
      drawer: document.getElementById("class-drawer"),
      close: document.getElementById("class-drawer-close"),
      backdrop: document.getElementById("class-drawer-backdrop")
    }
  ];
  pairs.forEach(({ open, drawer, close, backdrop }) => bindDrawerTriggers(open, drawer, close, backdrop));

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    pairs.forEach(({ drawer }) => {
      if (drawer && !drawer.hidden) toggleDrawer(drawer, false);
    });
  });
}

function initEmailTemplateTiles() {
  document.querySelectorAll("[data-template]").forEach((tile) => {
    if (tile.dataset.tileBound) return;
    tile.dataset.tileBound = "true";
    tile.addEventListener("click", () => {
      const template = tile.dataset.template;
      const drawer = document.getElementById("admin-email-drawer");
      const select = document.getElementById("email-template");
      if (select) select.value = template;
      if (drawer) toggleDrawer(drawer, true);
    });
  });
}

function initCommRoster() {
  const roster = document.getElementById("comm-student-roster");
  const search = document.getElementById("comm-student-search");
  const threadName = document.getElementById("comm-thread-name");
  const compose = document.getElementById("comm-compose-form");
  if (!roster) return;

  if (!roster.dataset.rosterBound) {
    roster.dataset.rosterBound = "true";
    roster.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-student-id]");
      if (!li) return;
      roster.querySelectorAll("li").forEach((el) => el.classList.remove("is-selected"));
      li.classList.add("is-selected");
      if (threadName) threadName.textContent = li.dataset.studentName || li.textContent.trim();
      if (compose) compose.hidden = false;
      document.body.dispatchEvent(
        new CustomEvent("admin:load-student-notes", {
          detail: { studentId: li.dataset.studentId },
          bubbles: true
        })
      );
    });
  }

  if (search && !search.dataset.searchBound) {
    search.dataset.searchBound = "true";
    search.addEventListener("input", () => {
      const q = search.value.toLowerCase();
      roster.querySelectorAll("li[data-student-id]").forEach((li) => {
        li.hidden = !li.textContent.toLowerCase().includes(q);
      });
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initPanels();
    initEmailTemplateTiles();
    initCommRoster();
  });
  document.body.addEventListener("admin:component:loaded", () => {
    initPanels();
    initEmailTemplateTiles();
    initCommRoster();
  });
  document.body.addEventListener("admin-components-loaded", () => {
    initPanels();
    initEmailTemplateTiles();
    initCommRoster();
  });
}

export { toggleDrawer, initPanels, bindDrawerTriggers };
