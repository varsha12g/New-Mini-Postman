(() => {
  const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl || "http://127.0.0.1:5000/api";
  const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");
  const createLinkForm = document.getElementById("createLinkForm");
  const linkNameInput = document.getElementById("linkName");
  const jsonInput = document.getElementById("jsonInput");
  const createLinkButton = document.getElementById("createLinkButton");
  const formMessage = document.getElementById("formMessage");
  const connectionBadge = document.getElementById("connectionBadge");
  const latestLinkBadge = document.getElementById("latestLinkBadge");
  const latestLinkText = document.getElementById("latestLinkText");
  const openLatestLinkButton = document.getElementById("openLatestLink");
  const copyLatestLinkButton = document.getElementById("copyLatestLink");
  const jsonPreview = document.getElementById("jsonPreview");
  const savedLinks = document.getElementById("savedLinks");
  const savedCount = document.getElementById("savedCount");

  let latestAbsoluteLink = "";

  function setFormMessage(message, isSuccess = false) {
    formMessage.textContent = message;
    formMessage.classList.toggle("is-success", isSuccess);
  }

  function toPrettyJson(value) {
    return JSON.stringify(value, null, 2);
  }

  function setPreview(value) {
    jsonPreview.classList.remove("is-empty");
    jsonPreview.textContent = toPrettyJson(value);
  }

  function resetPreview() {
    jsonPreview.classList.add("is-empty");
    jsonPreview.textContent = "Stored JSON will appear here...";
  }

  function setLatestLink(linkPath) {
    latestAbsoluteLink = linkPath ? new URL(linkPath, BACKEND_BASE_URL).toString() : "";
    latestLinkText.textContent = latestAbsoluteLink || "Create a JSON API link to see it here.";
    latestLinkBadge.textContent = latestAbsoluteLink ? "Link created" : "No link created yet";
    openLatestLinkButton.disabled = !latestAbsoluteLink;
    copyLatestLinkButton.disabled = !latestAbsoluteLink;
  }

  async function requestJson(path, options = {}) {
    let response;

    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });
    } catch (error) {
      throw new Error("Cannot reach the backend API.");
    }

    let data = {};
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  }

  function renderLinks(items) {
    savedCount.textContent = `${items.length} link${items.length === 1 ? "" : "s"}`;
    savedLinks.innerHTML = "";

    if (!items.length) {
      const emptyState = document.createElement("p");
      emptyState.textContent = "No saved links yet.";
      savedLinks.appendChild(emptyState);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "saved-api-card";

      const head = document.createElement("div");
      head.className = "saved-api-head";

      const titleBlock = document.createElement("div");
      titleBlock.className = "saved-api-title";

      const title = document.createElement("h3");
      title.textContent = item.name;

      const meta = document.createElement("p");
      meta.className = "saved-api-meta";
      meta.textContent = new Date(item.created_at).toLocaleString();

      titleBlock.append(title, meta);

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "JSON";

      head.append(titleBlock, badge);

      const link = document.createElement("p");
      link.className = "saved-api-link";
      link.textContent = new URL(item.api_link, BACKEND_BASE_URL).toString();

      const preview = document.createElement("pre");
      preview.className = "saved-api-body";
      preview.textContent = toPrettyJson(item.payload);

      const actions = document.createElement("div");
      actions.className = "saved-api-actions";

      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "secondary-button";
      openButton.textContent = "Open API";
      openButton.addEventListener("click", () => {
        window.open(new URL(item.api_link, BACKEND_BASE_URL).toString(), "_blank", "noopener,noreferrer");
      });

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "secondary-button";
      copyButton.textContent = "Copy Link";
      copyButton.addEventListener("click", async () => {
        await navigator.clipboard.writeText(new URL(item.api_link, BACKEND_BASE_URL).toString());
        copyButton.textContent = "Copied";
        window.setTimeout(() => {
          copyButton.textContent = "Copy Link";
        }, 1000);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "remove-button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", async () => {
        deleteButton.disabled = true;

        try {
          await requestJson(`/links/${item.id}`, {
            method: "DELETE"
          });

          if (latestAbsoluteLink === new URL(item.api_link, BACKEND_BASE_URL).toString()) {
            setLatestLink("");
            resetPreview();
          }

          setFormMessage("JSON link deleted.", true);
          await loadLinks();
        } catch (error) {
          deleteButton.disabled = false;
          setFormMessage(error.message);
        }
      });

      actions.append(openButton, copyButton, deleteButton);
      card.append(head, link, preview, actions);
      savedLinks.appendChild(card);
    });
  }

  async function loadLinks() {
    const data = await requestJson("/links", {
      method: "GET",
      headers: {}
    });
    renderLinks(data.items || []);
  }

  async function loadHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      connectionBadge.textContent = data.ok ? "MongoDB connected" : "Connection issue";
      connectionBadge.classList.toggle("status-badge-success", Boolean(data.ok));
    } catch (error) {
      connectionBadge.textContent = "Backend offline";
    }
  }

  createLinkForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    createLinkButton.disabled = true;
    setFormMessage("Creating API link...");

    let parsedJson;

    try {
      parsedJson = JSON.parse(jsonInput.value);
    } catch (error) {
      createLinkButton.disabled = false;
      setFormMessage("Please enter valid JSON.");
      return;
    }

    try {
      const data = await requestJson("/links", {
        method: "POST",
        body: JSON.stringify({
          name: linkNameInput.value.trim(),
          payload: parsedJson
        })
      });

      setLatestLink(data.item.api_link);
      setPreview(data.item.payload);
      setFormMessage("API link created successfully.", true);
      linkNameInput.value = "";
      await loadLinks();
    } catch (error) {
      setFormMessage(error.message);
    } finally {
      createLinkButton.disabled = false;
    }
  });

  openLatestLinkButton.addEventListener("click", () => {
    if (latestAbsoluteLink) {
      window.open(latestAbsoluteLink, "_blank", "noopener,noreferrer");
    }
  });

  copyLatestLinkButton.addEventListener("click", async () => {
    if (!latestAbsoluteLink) {
      return;
    }

    await navigator.clipboard.writeText(latestAbsoluteLink);
    copyLatestLinkButton.textContent = "Copied";
    window.setTimeout(() => {
      copyLatestLinkButton.textContent = "Copy Link";
    }, 1000);
  });

  setLatestLink("");
  resetPreview();
  loadHealth();
  loadLinks().catch(() => {
    renderLinks([]);
    setFormMessage("Could not load saved links.");
  });
})();
