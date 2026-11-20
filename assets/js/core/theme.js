/* Dark/Light Theme Toggle mit System-Preference, localStorage & Safari theme-color */

const STORAGE_KEY = "gametstudios-theme";
const root = document.documentElement;

// Farben für Safari / Mobile Browser Bar
const THEME_COLORS = {
  light: "#f8f8f8",
  dark: "#0a0a0a"
};

function getStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStored(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* noop */
  }
}

function updateMetaThemeColor(theme) {
  let meta = document.querySelector('meta[name="theme-color"]');
  
  // Falls der Tag im HTML noch komplett fehlt, dynamisch injecten
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  
  // Wichtig: media-Attribut killen, falls Safari noch an Systemwerten klebt
  meta.removeAttribute("media");
  meta.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS.dark);
}

export function getTheme() {
  return root.getAttribute("data-theme") || "dark";
}

export function setTheme(theme) {
  root.setAttribute("data-theme", theme);
  setStored(theme);
  updateMetaThemeColor(theme);

  document.dispatchEvent(
    new CustomEvent("gametstudios:theme-change", { detail: { theme } })
  );
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

export function initTheme() {
  const initial = getStored() || "dark";
  
  // Theme setzen + Safari Statusleiste direkt beim initialen Load färben
  setTheme(initial);

  matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
    if (!getStored()) {
      setTheme(e.matches ? "light" : "dark");
    }
  });
}

initTheme();