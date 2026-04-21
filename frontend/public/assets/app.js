const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl || "http://127.0.0.1:5000/api";
const TOKEN_STORAGE_KEY = "mini-postman-token";
const USER_STORAGE_KEY = "mini-postman-user";
const QUICK_HISTORY_STORAGE_KEY = "mini-postman-quick-history";

const userName = document.getElementById("userName");
const themeToggleButton = document.getElementById("themeToggle");
const profileMenuButton = document.getElementById("profileMenuButton");
const quickMenu = document.getElementById("quickMenu");
const historyShortcut = document.getElementById("historyShortcut");
const menuHistoryList = document.getElementById("menuHistoryList");
const historyModal = document.getElementById("historyModal");
const historyModalBackdrop = document.getElementById("historyModalBackdrop");
const closeHistoryModalButton = document.getElementById("closeHistoryModal");
const addHeaderButton = document.getElementById("addHeader");
const headersList = document.getElementById("headersList");
const sendRequestButton = document.getElementById("sendRequest");
const apiUrlInput = document.getElementById("apiUrl");
const httpMethodSelect = document.getElementById("httpMethod");
const requestBodyTextarea = document.getElementById("requestBody");
const statusCode = document.getElementById("statusCode");
const responseTime = document.getElementById("responseTime");
const responseOutput = document.getElementById("responseOutput");
const suggestionList = document.getElementById("suggestionList");
const historyList = document.getElementById("historyList");
const historySection = document.getElementById("historySection");
const copyJsonButton = document.getElementById("copyJson");

const THEME_STORAGE_KEY = "mini-postman-theme";
let latestResponse = "";

function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function clearAuth() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function getQuickHistory() {
  try {
    const storedValue = localStorage.getItem(QUICK_HISTORY_STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) : [];
  } catch (error) {
    return [];
  }
}

function saveQuickHistory(items) {
  localStorage.setItem(QUICK_HISTORY_STORAGE_KEY, JSON.stringify(items));
}

function setQuickMenuState(isOpen) {
  quickMenu.hidden = !isOpen;
  profileMenuButton.setAttribute("aria-expanded", String(isOpen));
}

function setHistoryModalState(isOpen) {
  historyModal.hidden = !isOpen;
  document.body.classList.toggle("modal-open", isOpen);
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "omit",
    headers
  });

  if (response.status === 401) {
    clearAuth();
    window.location.href = "/login";
    throw new Error("Please login again.");
  }

  return response;
}

function getThemeButtonMarkup(theme) {
  return theme === "light"
    ? '<span class="theme-emoji" aria-hidden="true">&#127769;</span>'
    : '<span class="theme-emoji" aria-hidden="true">&#9728;&#65039;</span>';
}

function getCopyIconMarkup(state = "copy") {
  if (state === "done") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 13l4 4L19 7"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2"></rect>
      <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggleButton.innerHTML = getThemeButtonMarkup(theme);
  themeToggleButton.setAttribute(
    "aria-label",
    theme === "light" ? "Switch to dark mode" : "Switch to light mode"
  );
  themeToggleButton.setAttribute(
    "title",
    theme === "light" ? "Switch to dark mode" : "Switch to light mode"
  );
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
  setTheme(savedTheme);
}

function highlightJson(value) {
  return escapeHtml(value).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let className = "json-number";

      if (match.startsWith('"')) {
        className = match.endsWith(":") ? "json-key" : "json-string";
      } else if (match === "true" || match === "false") {
        className = "json-boolean";
      } else if (match === "null") {
        className = "json-null";
      }

      return `<span class="${className}">${match}</span>`;
    }
  );
}

function setResponseContent(content, type = "empty") {
  responseOutput.classList.remove("is-error", "is-empty");

  if (type === "json") {
    responseOutput.innerHTML = highlightJson(content);
    return;
  }

  if (type === "error") {
    responseOutput.classList.add("is-error");
    responseOutput.textContent = content;
    return;
  }

  responseOutput.classList.add("is-empty");
  responseOutput.textContent = content;
}

function createHeaderRow(header = { key: "", value: "" }) {
  const wrapper = document.createElement("div");
  wrapper.className = "header-row";

  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.placeholder = "Header key";
  keyInput.value = header.key || "";

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.placeholder = "Header value";
  valueInput.value = header.value || "";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-button";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => {
    wrapper.remove();
  });

  wrapper.append(keyInput, valueInput, removeButton);
  headersList.appendChild(wrapper);
}

function getHeaders() {
  return Array.from(headersList.querySelectorAll(".header-row")).map((row) => {
    const inputs = row.querySelectorAll("input");
    return {
      key: inputs[0].value.trim(),
      value: inputs[1].value.trim()
    };
  });
}

function renderSuggestions(items) {
  suggestionList.innerHTML = "";

  if (!items.length) {
    const emptyText = document.createElement("p");
    emptyText.textContent = "Suggestions will appear after a successful request.";
    suggestionList.appendChild(emptyText);
    return;
  }

  items.forEach((item) => {
    const block = document.createElement("p");
    block.textContent = item;
    suggestionList.appendChild(block);
  });
}

function renderHistory(items) {
  historyList.innerHTML = "";

  if (!items.length) {
    const emptyText = document.createElement("p");
    emptyText.textContent = "No recent requests yet.";
    historyList.appendChild(emptyText);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "history-card";

    const topline = document.createElement("div");
    topline.className = "history-topline";

    const header = document.createElement("div");
    const method = document.createElement("strong");
    method.textContent = item.method;
    const status = document.createElement("span");
    status.textContent = item.status_code ?? "-";
    header.append(method, status);

    const actions = document.createElement("div");
    actions.className = "history-actions";
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "remove-button history-delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      deleteButton.disabled = true;
      deleteButton.textContent = "Deleting...";

      try {
        const response = await apiFetch(`/history/${item.id}`, {
          method: "DELETE"
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not delete history.");
        }

        await loadHistory();
      } catch (error) {
        deleteButton.disabled = false;
        deleteButton.textContent = "Delete";
      }
    });
    actions.appendChild(deleteButton);
    topline.append(header, actions);

    const url = document.createElement("p");
    url.textContent = item.url;

    const time = document.createElement("small");
    time.textContent = `${item.response_time_ms} ms`;

    card.append(topline, url, time);
    historyList.appendChild(card);
  });
}

function renderQuickHistory(items) {
  menuHistoryList.innerHTML = "";

  if (!items.length) {
    const emptyText = document.createElement("p");
    emptyText.textContent = "No quick history yet.";
    menuHistoryList.appendChild(emptyText);
    return;
  }

  items.forEach((item) => {
    const entry = document.createElement("button");
    entry.type = "button";
    entry.className = "menu-history-item";

    const topLine = document.createElement("div");
    topLine.className = "menu-history-top";

    const method = document.createElement("strong");
    method.textContent = item.method;

    const meta = document.createElement("span");
    meta.textContent = `${item.status_code ?? "-"} • ${item.response_time_ms ?? "-"} ms`;

    topLine.append(method, meta);

    const url = document.createElement("p");
    url.textContent = item.url;

    entry.append(topLine, url);
    entry.addEventListener("click", () => {
      apiUrlInput.value = item.url || "";
      httpMethodSelect.value = item.method || "GET";
      setHistoryModalState(false);
      apiUrlInput.focus();
    });

    menuHistoryList.appendChild(entry);
  });
}

function rememberQuickHistory(item) {
  const nextItems = [item, ...getQuickHistory()]
    .filter(
      (entry, index, allItems) =>
        allItems.findIndex(
          (candidate) =>
            candidate.url === entry.url &&
            candidate.method === entry.method &&
            candidate.status_code === entry.status_code &&
            candidate.response_time_ms === entry.response_time_ms
        ) === index
    )
    .slice(0, 6);

  saveQuickHistory(nextItems);
  renderQuickHistory(nextItems);
}

async function loadSession() {
  const response = await apiFetch("/config");
  const data = await response.json();
  userName.textContent = data.user.name;
}

async function loadHistory() {
  const response = await apiFetch("/history");
  const data = await response.json();
  renderHistory(data.items || []);
}

profileMenuButton.addEventListener("click", () => {
  setQuickMenuState(quickMenu.hidden);
});

historyShortcut.addEventListener("click", () => {
  setQuickMenuState(false);
  setHistoryModalState(true);
});

closeHistoryModalButton.addEventListener("click", () => {
  setHistoryModalState(false);
});

historyModalBackdrop.addEventListener("click", () => {
  setHistoryModalState(false);
});

document.addEventListener("click", (event) => {
  if (!quickMenu.hidden && !event.target.closest(".menu-wrap")) {
    setQuickMenuState(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !historyModal.hidden) {
    setHistoryModalState(false);
  }

  if (event.key === "Escape" && !quickMenu.hidden) {
    setQuickMenuState(false);
  }
});

themeToggleButton.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
  setTheme(nextTheme);
});

addHeaderButton.addEventListener("click", () => createHeaderRow());

sendRequestButton.addEventListener("click", async () => {
  const url = apiUrlInput.value.trim();
  const method = httpMethodSelect.value;
  const body = requestBodyTextarea.value.trim();

  if (!url) {
    setResponseContent("Please enter an API URL first.", "error");
    return;
  }

  sendRequestButton.disabled = true;
  sendRequestButton.textContent = "Sending...";

  try {
    const response = await apiFetch("/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url,
        method,
        headers: getHeaders(),
        body
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    statusCode.textContent = data.status;
    responseTime.textContent = `${data.duration} ms`;
    latestResponse = JSON.stringify(data.data, null, 2);
    setResponseContent(latestResponse, "json");
    renderSuggestions(data.suggestions || []);
    rememberQuickHistory({
      url,
      method,
      status_code: data.status,
      response_time_ms: data.duration
    });
    await loadHistory();
  } catch (error) {
    latestResponse = "";
    setResponseContent(error.message, "error");
    statusCode.textContent = "Error";
    responseTime.textContent = "-";
    renderSuggestions(["Check the URL, method, headers, JSON body, token, or backend connection and try again."]);
  } finally {
    sendRequestButton.disabled = false;
    sendRequestButton.textContent = "Send Request";
  }
});

copyJsonButton.addEventListener("click", async () => {
  if (!latestResponse) {
    return;
  }

  await navigator.clipboard.writeText(latestResponse);
  copyJsonButton.innerHTML = getCopyIconMarkup("done");

  window.setTimeout(() => {
    copyJsonButton.innerHTML = getCopyIconMarkup();
  }, 1200);
});

if (!getToken()) {
  window.location.href = "/login";
}

loadTheme();
setQuickMenuState(false);
setHistoryModalState(false);
copyJsonButton.innerHTML = getCopyIconMarkup();
createHeaderRow({ key: "Accept", value: "application/json" });
setResponseContent("Response will appear here...", "empty");
renderQuickHistory(getQuickHistory());
loadSession();
loadHistory();
