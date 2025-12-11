import { initTheme } from "./theme.js";

const COMPONENTS = {
  "tab-dashboard": "/components/dashboard.html",
  "tab-calendar": "/components/calendar.html",
  "tab-classes": "/components/classes.html",
  "tab-students": "/components/students.html",
  "tab-events": "/components/events.html",
  "tab-membership": "/components/membership.html",
  "tab-email": "/components/email.html",
  "tab-communications": "/components/communications.html",
  "tab-settings": "/components/settings.html"
};

const PANELS = [
  "/panels/student-panel.html",
  "/panels/event-panel.html",
  "/panels/email-panel.html",
  "/panels/class-panel.html"
];

const LAST_TAB_KEY = "araAdminActiveTab";

function setActiveTab(tabId) {
  document.querySelectorAll("[data-admin-tab]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.adminTab === tabId);
  });
}

async function loadComponent(tabId) {
  const target = document.getElementById("admin-main-content") || document.querySelector(".admin-main");
  if (!target) return;
  const url = COMPONENTS[tabId];
  if (!url) return;
  target.setAttribute("aria-busy", "true");
  try {
    const res = await fetch(url, { cache: "no-store" });
    const html = await res.text();
    target.innerHTML = html;
    const detail = { detail: { tabId } };
    document.body.dispatchEvent(new CustomEvent("admin:component:loaded", detail));
    document.body.dispatchEvent(new CustomEvent("admin-components-loaded", detail));
    if (typeof window !== "undefined") {
      if (typeof window.bindAdminEvents === "function") {
        window.bindAdminEvents();
      }
      if (typeof window.adminRefreshIfSignedIn === "function") {
        window.adminRefreshIfSignedIn();
      }
    }
  } catch (err) {
    target.innerHTML = `<section class="admin-card"><p class="form-status is-error">Unable to load ${tabId}. ${err?.message || ""}</p></section>`;
  } finally {
    target.removeAttribute("aria-busy");
  }
}

function persistTab(tabId) {
  try {
    localStorage.setItem(LAST_TAB_KEY, tabId);
  } catch {
    /* ignore */
  }
}

function restoreTab() {
  try {
    const saved = localStorage.getItem(LAST_TAB_KEY);
    return saved && COMPONENTS[saved] ? saved : "tab-dashboard";
  } catch {
    return "tab-dashboard";
  }
}

async function loadPanels() {
  const container = document.body;
  if (!container) return;
  for (const url of PANELS) {
    if (document.querySelector(`[data-panel-src="${url}"]`)) continue;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const html = await res.text();
      const wrapper = document.createElement("div");
      wrapper.dataset.panelSrc = url;
      wrapper.innerHTML = html;
      container.appendChild(wrapper);
    } catch (err) {
      console.warn("Panel load failed", url, err);
    }
  }
}

function initTabs() {
  document.querySelectorAll("[data-admin-tab]").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "true";
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.adminTab;
      setActiveTab(tabId);
      persistTab(tabId);
      loadComponent(tabId);
    });
  });
}

function initLoader() {
  initTheme();
  loadPanels();
  initTabs();
  const initialTab = restoreTab();
  setActiveTab(initialTab);
  loadComponent(initialTab);
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", initLoader, { once: true });
}

export { initLoader, loadComponent, setActiveTab };
