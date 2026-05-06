async function jsonFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    ...options
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

// --- RECIPES ---

export async function fetchRecipes({ query = "" } = {}) {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set("query", query.trim());
  }

  const url = params.toString()
    ? `/api/recipes?${params.toString()}`
    : "/api/recipes";

  return jsonFetch(url);
}

export async function fetchRecipeById(id) {
  return jsonFetch(`/api/recipes/${encodeURIComponent(id)}`);
}

export async function createRecipe(input) {
  return jsonFetch("/api/recipes", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

// --- NEW: MY POSTS ---

export async function fetchMyRecipes() {
  return jsonFetch("/api/my-recipes");
}

// --- NEW: UPDATE RECIPE ---

export async function updateRecipe(id, input) {
  return jsonFetch(`/api/recipes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

// --- AUTH ---

export async function register(input) {
  return jsonFetch("/api/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function login(input) {
  return jsonFetch("/api/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function logout() {
  return jsonFetch("/api/logout", {
    method: "POST"
  });
}

export async function fetchMe() {
  return jsonFetch("/api/me");
}

// --- SAVED ---

export async function fetchSavedRecipes() {
  return jsonFetch("/api/saved");
}

export async function saveRecipe(id) {
  return jsonFetch(`/api/saved/${encodeURIComponent(id)}`, {
    method: "POST"
  });
}

export async function unsaveRecipe(id) {
  return jsonFetch(`/api/saved/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

// --- LIKES ---

export async function fetchLikedRecipes() {
  return jsonFetch("/api/liked");
}

export async function likeRecipe(id) {
  return jsonFetch(`/api/likes/${encodeURIComponent(id)}`, {
    method: "POST"
  });
}

export async function unlikeRecipe(id) {
  return jsonFetch(`/api/likes/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

// --- COMMENTS ---

export async function addComment(id, text) {
  return jsonFetch(`/api/recipes/${encodeURIComponent(id)}/comments`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
}
