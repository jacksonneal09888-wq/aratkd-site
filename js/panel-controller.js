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

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", initPanels);
  document.body.addEventListener("admin:component:loaded", () => {
    // Rebind to newly injected buttons if present
    initPanels();
  });
  document.body.addEventListener("admin-components-loaded", () => initPanels());
}

export { toggleDrawer, initPanels, bindDrawerTriggers };
