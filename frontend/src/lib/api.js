const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export async function fetchWithAuth(endpoint, options = {}, token = "mock-driver-token") {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function uploadPodMultipart(formData, isPublic = false, token = null) {
  const url = isPublic ? `${API_BASE}/public/upload/${token}` : `${API_BASE}/pods/upload`;
  const headers = isPublic ? {} : { Authorization: "Bearer mock-driver-token" };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
  }

  return response.json();
}
