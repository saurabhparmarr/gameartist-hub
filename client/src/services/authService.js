import api from "./api.js";

function isSafeUser(user) {
  return (
    user &&
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    ["artist", "studio"].includes(user.role)
  );
}

export function getDashboardPath(role) {
  if (role === "artist") return "/artist/dashboard";
  if (role === "studio") return "/studio/dashboard";
  throw new Error("The account has an unrecognized role.");
}

export function getAuthErrorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response) {
    return `The server could not complete your request (HTTP ${error.response.status}). Please try again.`;
  }
  if (error.request) {
    return "Could not reach the server. Check that the backend is running and try again.";
  }
  return error.message || "Something went wrong. Please try again.";
}

export async function registerAccount(account) {
  const response = await api.post("/auth/register", account);
  const result = response.data;

  if (result.success !== true || !isSafeUser(result.data?.user)) {
    throw new Error(result.message || "The server returned an unexpected registration response.");
  }

  return {
    user: result.data.user,
    message: result.message,
  };
}

export async function loginAccount(credentials) {
  const response = await api.post("/auth/login", credentials);
  const result = response.data;

  if (
    result.success !== true ||
    typeof result.data?.token !== "string" ||
    !result.data.token ||
    !isSafeUser(result.data.user)
  ) {
    throw new Error(result.message || "The server returned an unexpected login response.");
  }

  return {
    token: result.data.token,
    user: result.data.user,
  };
}
