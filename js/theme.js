const THEME_STORAGE_KEY = "aratkd-theme";

export function getStoredTheme() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(THEME_STORAGE_KEY);
}

export function persistTheme(theme) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function applyTheme(theme) {
  const safeTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", safeTheme);
  document.body.dataset.theme = safeTheme;
  const toggle = document.getElementById("admin-theme-toggle");
  if (toggle) {
    toggle.setAttribute("aria-pressed", safeTheme === "dark");
    toggle.textContent = safeTheme === "dark" ? "🌙 Dark" : "🌞 Light";
  }
}

export function initTheme() {
  const initial = getStoredTheme() || "light";
  applyTheme(initial);
  const toggle = document.getElementById("admin-theme-toggle");
  if (toggle && !toggle.dataset.bound) {
    toggle.dataset.bound = "true";
    toggle.addEventListener("click", () => {
      const next = (document.body.dataset.theme || "light") === "light" ? "dark" : "light";
      applyTheme(next);
      persistTheme(next);
    });
  }
}

// Auto-init if imported directly via script tag
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", initTheme, { once: true });
}
