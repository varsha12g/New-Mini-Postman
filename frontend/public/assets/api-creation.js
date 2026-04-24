(() => {
const {
  apiFetch,
  bindThemeToggle,
  ensureAuthenticated,
  getStoredUser,
  hasToken,
  loadHealth,
  loadSession,
  logoutUser,
  setDraftRequest
} = window.MiniPostmanApp;

const userChip = document.getElementById("userChip");
const userName = document.getElementById("userName");
const themeToggleButton = document.getElementById("themeToggle");
const logoutButton = document.getElementById("logoutButton");
const apiCreationConnectionStatus = document.getElementById("apiCreationConnectionStatus");
const createApiForm = document.getElementById("createApiForm");
const apiNameInput = document.getElementById("apiName");
const apiLinkInput = document.getElementById("apiLink");
const apiMethodSelect = document.getElementById("apiMethod");
const apiDescriptionInput = document.getElementById("apiDescription");
const apiBodyInput = document.getElementById("apiBody");
const addApiHeaderButton = document.getElementById("addApiHeader");
const apiHeadersList = document.getElementById("apiHeadersList");
const createApiMessage = document.getElementById("createApiMessage");
const savedApiList = document.getElementById("savedApiList");
const savedApiCount = document.getElementById("savedApiCount");
const saveApiButton = document.getElementById("saveApiButton");

ensureAuthenticated();

const storedUser = getStoredUser();
if (storedUser?.name) {
  userName.textContent = storedUser.name;
}

function syncAuthUi(isAuthenticated) {
  userChip.hidden = !isAuthenticated;
  logoutButton.hidden = false;
  logoutButton.textContent = isAuthenticated ? "Logout" : "Login";
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
  apiHeadersList.appendChild(wrapper);
}

function resetCreateForm() {
  createApiForm.reset();
  apiHeadersList.innerHTML = "";
  createHeaderRow({ key: "Accept", value: "application/json" });
}

function getHeaders() {
  return Array.from(apiHeadersList.querySelectorAll(".header-row")).map((row) => {
    const inputs = row.querySelectorAll("input");
    return {
      key: inputs[0].value.trim(),
      value: inputs[1].value.trim()
    };
  });
}

function formatDate(value) {
  if (!value) {
    return "Just now";
  }

  return new Date(value).toLocaleString();
}

function setMessage(message, isSuccess = false) {
  createApiMessage.textContent = message;
  createApiMessage.classList.toggle("is-success", isSuccess);
}

function renderSavedApis(items) {
  savedApiCount.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
  savedApiList.innerHTML = "";

  if (!items.length) {
    const emptyText = document.createElement("p");
    emptyText.textContent = "No saved APIs yet.";
    savedApiList.appendChild(emptyText);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "saved-api-card";

    const head = document.createElement("div");
    head.className = "saved-api-head";

    const titleBlock = document.createElement("div");
    titleBlock.className = "saved-api-title";

    const name = document.createElement("h3");
    name.textContent = item.name;

    const meta = document.createElement("p");
    meta.className = "saved-api-meta";
    meta.textContent = `${item.method} | ${formatDate(item.created_at)}`;

    titleBlock.append(name, meta);

    const methodBadge = document.createElement("span");
    methodBadge.className = "badge";
    methodBadge.textContent = item.method;

    head.append(titleBlock, methodBadge);

    const link = document.createElement("p");
    link.className = "saved-api-link";
    link.textContent = item.api_link;

    const description = document.createElement("p");
    description.className = "saved-api-description";
    description.textContent = item.description || "No description added.";

    const bodyPreview = document.createElement("pre");
    bodyPreview.className = "saved-api-body";
    bodyPreview.textContent = item.body_text || "No sample body saved.";

    const actions = document.createElement("div");
    actions.className = "saved-api-actions";

    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.className = "primary-button";
    useButton.textContent = "Use in Tester";
    useButton.addEventListener("click", () => {
      setDraftRequest({
        url: item.api_link,
        method: item.method,
        headers: item.headers || [],
        bodyText: item.body_text || ""
      });
      window.location.href = "/app";
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "remove-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      deleteButton.disabled = true;
      deleteButton.textContent = "Deleting...";

      try {
        const response = await apiFetch(`/created-apis/${item.id}`, {
          method: "DELETE"
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not delete saved API.");
        }

        setMessage("Saved API deleted.");
        await loadSavedApis();
      } catch (error) {
        deleteButton.disabled = false;
        deleteButton.textContent = "Delete";
        setMessage(error.message || "Could not delete saved API.");
      }
    });

    actions.append(useButton, deleteButton);
    card.append(head, link, description, bodyPreview, actions);
    savedApiList.appendChild(card);
  });
}

async function hydrateSession() {
  const user = await loadSession();
  userName.textContent = user.name;
  syncAuthUi(true);
}

async function hydrateConnectionStatus() {
  const health = await loadHealth();
  const isConnected = health.ok && health.database === "connected";
  apiCreationConnectionStatus.textContent = isConnected
    ? "Backend and MongoDB are connected for API Creation."
    : "Backend or MongoDB connection issue detected.";
  apiCreationConnectionStatus.classList.toggle("status-text", false);
  apiCreationConnectionStatus.classList.toggle("connection-ok", isConnected);
}

async function loadSavedApis() {
  const response = await apiFetch("/created-apis");
  const data = await response.json();
  renderSavedApis(data.items || []);
}

addApiHeaderButton.addEventListener("click", () => createHeaderRow());

logoutButton.addEventListener("click", () => {
  if (!hasToken()) {
    window.location.href = "/login";
    return;
  }

  logoutUser();
});

createApiForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("Saving API...");
  saveApiButton.disabled = true;

  try {
    const response = await apiFetch("/created-apis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: apiNameInput.value.trim(),
        apiLink: apiLinkInput.value.trim(),
        method: apiMethodSelect.value,
        description: apiDescriptionInput.value.trim(),
        headers: getHeaders(),
        body: apiBodyInput.value.trim()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not save API.");
    }

    setMessage("API saved successfully.", true);
    resetCreateForm();
    await loadSavedApis();
  } catch (error) {
    setMessage(error.message || "Could not save API.");
  } finally {
    saveApiButton.disabled = false;
  }
});

bindThemeToggle(themeToggleButton);
syncAuthUi(hasToken());
resetCreateForm();
hydrateSession().catch(() => {
  syncAuthUi(false);
  if (!userName.textContent.trim()) {
    userName.textContent = "User";
  }
});
hydrateConnectionStatus().catch(() => {
  apiCreationConnectionStatus.textContent = "Could not connect to backend or MongoDB.";
});
loadSavedApis().catch(() => {
  renderSavedApis([]);
  setMessage("Could not load saved APIs.");
});
})();
