function inferUseCases(url, method, payload) {
  const lowerUrl = String(url || "").toLowerCase();
  const cases = [];

  if (lowerUrl.includes("auth") || lowerUrl.includes("login")) {
    cases.push("Use this endpoint to test sign-in or token validation flows.");
  }

  if (lowerUrl.includes("user") || lowerUrl.includes("profile")) {
    cases.push("Useful for profile pages, admin user lists, and onboarding checks.");
  }

  if (lowerUrl.includes("product") || lowerUrl.includes("order")) {
    cases.push("Good for e-commerce dashboards, order tracking, and inventory tools.");
  }

  if (["POST", "PUT", "PATCH"].includes(method) && payload) {
    cases.push("Ideal for validating form submissions before wiring the frontend.");
  }

  if (cases.length === 0) {
    cases.push("Test the API response shape before connecting it to your app or dashboard.");
    cases.push("Use it to validate status codes, timings, and headers during development.");
    cases.push("Helpful for quick smoke tests after backend changes.");
  }

  return cases.slice(0, 3);
}

module.exports = {
  inferUseCases
};
