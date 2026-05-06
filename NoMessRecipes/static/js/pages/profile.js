import { el } from "../utils/dom.js";
import { store } from "../store.js";
import {
  login,
  register,
  fetchMyRecipes,
  updateRecipe
} from "../api.js";
import { showToast } from "../ui/components.js";
import { renderRecipeForm } from "./createRecipe.js";

/* ---------- AUTH ---------- */
function renderAuth(app) {
  let mode = "login";

  const title = el("h1", {}, "Log in");
  const name = el("input", { className: "input", placeholder: "Name" });
  const email = el("input", { className: "input", placeholder: "Email" });
  const password = el("input", {
    className: "input",
    placeholder: "Password",
    type: "password"
  });

  const submit = el("button", { className: "btn btn--primary" }, "Log in");
  const toggle = el("button", { className: "btn" }, "Need an account? Register");

  function sync() {
    const isLogin = mode === "login";
    title.textContent = isLogin ? "Log in" : "Create account";
    submit.textContent = isLogin ? "Log in" : "Register";
    toggle.textContent = isLogin
      ? "Need an account? Register"
      : "Already have an account? Log in";
    name.style.display = isLogin ? "none" : "block";
  }

  toggle.onclick = () => {
    mode = mode === "login" ? "register" : "login";
    sync();
  };

  submit.onclick = async () => {
    try {
      let result;
      if (mode === "login") {
        result = await login({
          email: email.value.trim(),
          password: password.value
        });
        showToast("Logged in.");
      } else {
        result = await register({
          name: name.value.trim(),
          email: email.value.trim(),
          password: password.value
        });
        showToast("Account created.");
      }

      store.set({ user: result });
      window.location.hash = "#/";
    } catch (err) {
      showToast(err.message || "Authentication failed.");
    }
  };

  sync();

  app.append(
    el("div", { className: "panel", style: "padding:18px; max-width:520px;" },
      title,
      name,
      email,
      password,
      el("div", { style: "display:flex; gap:10px; margin-top:10px;" },
        submit,
        toggle
      )
    )
  );
}

/* ---------- MY POSTS ---------- */
function renderMyPosts(app) {
  const container = el("div", { style: "margin-top:24px;" });
  const list = el("div", { style: "display:grid; gap:12px;" });

  async function load() {
    try {
      const posts = await fetchMyRecipes();
      list.innerHTML = "";

      if (!posts.length) {
        list.append(el("p", {}, "You haven’t posted anything yet."));
        return;
      }

      posts.forEach((r) => {
        const viewBtn = el("a", {
          className: "btn",
          href: `#/recipe/${r.id}`
        }, "View");

        const editBtn = el("button", { className: "btn" }, "Edit");

        editBtn.onclick = () => {
          const root = document.querySelector("#app");

          renderRecipeForm(root, {
            initial: r,
            submitLabel: "Save",
            titleText: "Edit Recipe",
            onSubmit: async (payload) => {
              try {
                await updateRecipe(r.id, payload);
                showToast("Updated.");
                renderProfile(); // return to profile view
              } catch (err) {
                showToast(err.message || "Update failed.");
              }
            }
          });
        };

        list.append(
          el("div", { className: "panel", style: "padding:12px;" },
            el("h3", { style: "margin:0 0 6px 0;" }, r.title),
            el("p", { style: "margin:0; color:var(--muted);" }, `${r.minutes} min`),
            el("div", { style: "margin-top:8px; display:flex; gap:10px;" },
              viewBtn,
              editBtn
            )
          )
        );
      });
    } catch (err) {
      showToast(err.message || "Failed to load posts.");
    }
  }

  load();

  container.append(
    el("h2", {}, "My Posts"),
    list
  );

  app.append(container);
}

/* ---------- MAIN ---------- */
export function renderProfile() {
  const app = document.querySelector("#app");
  app.innerHTML = "";

  const { user } = store.get();

  if (!user) {
    renderAuth(app);
    return;
  }

  app.append(
    el("div", { className: "panel", style: "padding:18px;" },
      el("h1", { style: "margin:0 0 8px 0;" }, "Profile"),
      el("p", { style: "margin:0; color:var(--muted);" }, user.name),
      el("p", { style: "margin:0; color:var(--muted);" }, user.email),

      el("div", { style: "margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;" },
        el("a", { className: "btn btn--primary", href: "#/create" }, "Share a recipe"),
        el("a", { className: "btn", href: "#/saved" }, "Saved posts"),
        el("a", { className: "btn", href: "#/liked" }, "Liked posts"),

        el("button", {
          className: "btn",
          onClick: () => window.dispatchEvent(new CustomEvent("app:logout"))
        }, "Log out")
      )
    )
  );

  renderMyPosts(app);
}
