(() => {
  const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl || "http://127.0.0.1:5000/api";
  const TOKEN_STORAGE_KEY = "mini-postman-token";
  const USER_STORAGE_KEY = "mini-postman-user";
  const themeToggleButton = document.getElementById("themeToggle");
  const bindThemeToggle = window.MiniPostmanApp?.bindThemeToggle;

  const tabButtons = document.querySelectorAll(".tab-button");
  const forms = {
    login: document.getElementById("loginForm"),
    register: document.getElementById("registerForm")
  };
  const authMessage = document.getElementById("authMessage");

  function saveAuth(data) {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  }

  function getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  function redirectToApp() {
    window.location.href = "/app";
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      Object.entries(forms).forEach(([key, form]) => {
        form.classList.toggle("active", key === button.dataset.tab);
      });

      authMessage.textContent = "";
    });
  });

  async function submitAuthForm(url, payload) {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new Error("Cannot reach the backend API. Make sure it is running and accessible from this browser.");
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.message || "Authentication failed.");
    }

    return data;
  }

  forms.login.addEventListener("submit", async (event) => {
    event.preventDefault();
    authMessage.textContent = "Signing you in...";

    try {
      const formData = new FormData(forms.login);
      const data = await submitAuthForm(`${API_BASE_URL}/auth/login`, Object.fromEntries(formData.entries()));
      saveAuth(data);
      redirectToApp();
    } catch (error) {
      authMessage.textContent = error.message;
    }
  });

  forms.register.addEventListener("submit", async (event) => {
    event.preventDefault();
    authMessage.textContent = "Creating your account...";

    try {
      const formData = new FormData(forms.register);
      const data = await submitAuthForm(`${API_BASE_URL}/auth/register`, Object.fromEntries(formData.entries()));
      saveAuth(data);
      redirectToApp();
    } catch (error) {
      authMessage.textContent = error.message;
    }
  });

  if (getToken()) {
    redirectToApp();
  }

  if (typeof bindThemeToggle === "function") {
    bindThemeToggle(themeToggleButton);
  }
})();
