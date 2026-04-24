const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl || "http://127.0.0.1:5000/api";
const TOKEN_STORAGE_KEY = "mini-postman-token";
const USER_STORAGE_KEY = "mini-postman-user";
const THEME_STORAGE_KEY = "mini-postman-theme";
const REQUEST_DRAFT_STORAGE_KEY = "mini-postman-request-draft";

function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function hasToken() {
  return Boolean(getToken());
}

function getStoredUser() {
  try {
    const storedValue = localStorage.getItem(USER_STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch (error) {
    return null;
  }
}

function saveStoredUser(user) {
  if (!user) {
    return;
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function ensureAuthenticated() {
  if (!getToken()) {
    window.location.href = "/login";
    return false;
  }

  return true;
}

function getThemeButtonMarkup(theme) {
  return theme === "light"
    ? '<span class="theme-emoji" aria-hidden="true">&#9728;&#65039;</span><span class="theme-label">Light</span>'
    : '<span class="theme-emoji" aria-hidden="true">&#127769;</span><span class="theme-label">Dark</span>';
}

function setTheme(theme, button) {
  document.body.dataset.theme = theme;

  if (button) {
    button.innerHTML = getThemeButtonMarkup(theme);
    button.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
    button.setAttribute("title", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
  }

  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function bindThemeToggle(button) {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
  setTheme(savedTheme, button);

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
    setTheme(nextTheme, button);
  });
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "omit",
      headers
    });
  } catch (error) {
    throw new Error(`Cannot reach the backend API at ${API_BASE_URL}. Make sure the backend server is running.`);
  }

  if (response.status === 401) {
    clearAuth();
    window.location.href = "/login";
    throw new Error("Please login again.");
  }

  return response;
}

async function loadSession() {
  const response = await apiFetch("/config");
  const data = await response.json();
  saveStoredUser(data.user);
  return data.user;
}

async function loadHealth() {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      credentials: "omit"
    });
  } catch (error) {
    throw new Error(`Cannot reach the backend health endpoint at ${API_BASE_URL}/health.`);
  }

  if (!response.ok) {
    throw new Error("Backend health check failed.");
  }

  return response.json();
}

async function logoutUser() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: getToken()
        ? {
            Authorization: `Bearer ${getToken()}`
          }
        : {}
    });
  } catch (error) {
    // Ignore logout network issues because auth is stored locally.
  }

  clearAuth();
  window.location.replace("/login");
}

function setDraftRequest(payload) {
  localStorage.setItem(REQUEST_DRAFT_STORAGE_KEY, JSON.stringify(payload));
}

function consumeDraftRequest() {
  try {
    const storedValue = localStorage.getItem(REQUEST_DRAFT_STORAGE_KEY);
    localStorage.removeItem(REQUEST_DRAFT_STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch (error) {
    localStorage.removeItem(REQUEST_DRAFT_STORAGE_KEY);
    return null;
  }
}

window.MiniPostmanApp = {
  apiFetch,
  bindThemeToggle,
  consumeDraftRequest,
  ensureAuthenticated,
  getStoredUser,
  hasToken,
  loadHealth,
  loadSession,
  logoutUser,
  saveStoredUser,
  setDraftRequest
};
