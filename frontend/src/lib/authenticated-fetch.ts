const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function logoutExpiredSession() {
  sessionStorage.clear();
  ["vergo_user", "vergo_is_logged_in", "vergo_access_token", "vergo_refresh_token"].forEach(
    (key) => localStorage.removeItem(key),
  );
  window.dispatchEvent(new Event("vergo-auth-change"));
  window.location.assign("/auth/login?reason=session-expired");
}

export async function authenticatedFetch(path: string, init?: RequestInit) {
  const send = (accessToken: string) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

  const accessToken = sessionStorage.getItem("vergo_access_token");
  if (!accessToken) return null;

  let response = await send(accessToken);
  if (response.status !== 401) return response;

  const refreshToken = sessionStorage.getItem("vergo_refresh_token");
  if (!refreshToken) {
    logoutExpiredSession();
    return response;
  }

  const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (refreshResponse.status === 401 || refreshResponse.status === 400) {
    logoutExpiredSession();
    return response;
  }
  if (!refreshResponse.ok) return response;

  const refreshed = (await refreshResponse.json()) as {
    accessToken: string;
    refreshToken?: string;
  };
  sessionStorage.setItem("vergo_access_token", refreshed.accessToken);
  if (refreshed.refreshToken) {
    sessionStorage.setItem("vergo_refresh_token", refreshed.refreshToken);
  }
  response = await send(refreshed.accessToken);
  if (response.status === 401) logoutExpiredSession();
  return response;
}
