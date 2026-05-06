import { fetchLikedRecipes } from "../api.js";
import { el } from "../utils/dom.js";
import { store } from "../store.js";
import { recipeCard, showToast } from "../ui/components.js";

export async function renderLiked() {
  const app = document.querySelector("#app");
  app.innerHTML = "";

  const { user } = store.get();

  if (!user) {
    app.append(
      el("div", { className: "panel", style: "padding:18px" },
        el("h1", { style: "margin:0 0 8px 0" }, "Liked posts"),
        el("p", { style: "margin:0 0 14px 0; color:var(--muted)" }, "You need to be logged in to view liked posts."),
        el("a", { className: "btn btn--primary", href: "#/profile" }, "Log in")
      )
    );
    return;
  }

  const header = el("div", { className: "grid" },
    el("section", { className: "col-8" },
      el("h1", {}, "Liked posts"),
      el("p", { style: "color:var(--muted)" }, "Recipes you liked.")
    )
  );

  const list = el("div", { className: "grid", style: "margin-top:18px" });
  app.append(header, list);

  try {
    const recipes = await fetchLikedRecipes();
    list.innerHTML = "";

    if (!recipes.length) {
      list.append(
        el("div", { className: "panel", style: "padding:18px; grid-column:1 / -1;" },
          el("h3", { style: "margin:0 0 8px 0;" }, "No liked posts yet"),
          el("p", { style: "margin:0; color:var(--muted);" }, "Browse recipes and click Like to keep them here.")
        )
      );
      return;
    }

    recipes.forEach((r) => list.append(recipeCard(r)));
  } catch (error) {
    showToast(error.message || "Could not load liked posts.");
  }
}