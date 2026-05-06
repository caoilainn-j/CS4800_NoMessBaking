import { initRouter } from "./router.js";
import { store } from "./store.js";
import { showToast } from "./ui/components.js";
import { fetchMe, logout } from "./api.js";

function updateAuthButton(user) {
  const button = document.querySelector("#authButton");
  if (!button) return;
  button.textContent = user ? user.name : "Login";
}

async function bootstrapAuth() {
  try {
    const result = await fetchMe();
    store.set({ user: result.user });
  } catch {
    store.set({ user: null });
  }
}

function wireGlobalUI() {
  const search = document.querySelector("#searchInput");
  search?.addEventListener("input", (e) => {
    store.set({ query: e.target.value });

    if (window.location.hash !== "#/browse") {
      window.location.hash = "#/browse";
      return;
    }

    window.dispatchEvent(new CustomEvent("app:search"));
  });

  document.querySelector("#authButton")?.addEventListener("click", () => {
    window.location.hash = "#/profile";
  });

  store.subscribe(({ user }) => {
    updateAuthButton(user);
  });

  window.addEventListener("app:logout", async () => {
    try {
      await logout();
      store.set({ user: null, savedRecipes: [], likedRecipes: [] });
      showToast("Logged out.");
      window.location.hash = "#/";
    } catch (error) {
      showToast(error.message || "Could not log out.");
    }
  });
}

async function start() {
  wireGlobalUI();
  await bootstrapAuth();
  updateAuthButton(store.get().user);
  initRouter();
}

start();