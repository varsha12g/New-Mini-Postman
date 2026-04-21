const tabButtons = document.querySelectorAll(".tab-button");
const forms = {
  login: document.getElementById("loginForm"),
  register: document.getElementById("registerForm")
};
const authMessage = document.getElementById("authMessage");

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
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

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
    await submitAuthForm("/api/auth/login", Object.fromEntries(formData.entries()));
    window.location.href = "/app";
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

forms.register.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "Creating your account...";

  try {
    const formData = new FormData(forms.register);
    await submitAuthForm("/api/auth/register", Object.fromEntries(formData.entries()));
    window.location.href = "/app";
  } catch (error) {
    authMessage.textContent = error.message;
  }
});
