import { fetchRecipes } from "../api.js";
import { store } from "../store.js";
import { el } from "../utils/dom.js";
import { recipeCard } from "../ui/components.js";

export async function renderBrowse() {
  const app = document.querySelector("#app");
  app.innerHTML = "";

  let currentSort = "newest";

  const sortSelect = el("select", {
    className: "input",
    style: "max-width:240px;"
  },
    el("option", { value: "newest" }, "Newest"),
    el("option", { value: "alpha" }, "Alphabetical"),
    el("option", { value: "likes" }, "Most likes"),
    el("option", { value: "time" }, "Time (low → high)")
  );

  sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;
    load();
  });

  const header = el("div", { className: "grid" },
    el("section", { className: "col-8" },
      el("h1", {}, "Browse recipes"),
      el("p", { style: "color:var(--muted)" }, "Search, save, and share your favorites.")
    ),
    el("section", { className: "col-4", style: "display:flex; align-items:end; justify-content:flex-end;" },
      el("div", { style: "display:grid; gap:6px;" },
        el("label", { style: "font-size:0.9rem; color:var(--muted);" }, "Sort by"),
        sortSelect
      )
    )
  );

  const list = el("div", { className: "grid", style: "margin-top:18px" });
  app.append(header, list);

  function sortRecipes(recipes) {
    const sorted = [...recipes];

    switch (currentSort) {
      case "alpha":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "likes":
        sorted.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
        break;
      case "time":
        sorted.sort((a, b) => (a.minutes || 0) - (b.minutes || 0));
        break;
      case "newest":
      default:
        // backend already returns newest first via _id sort
        break;
    }

    return sorted;
  }

  async function load() {
    const { query } = store.get();
    const recipes = await fetchRecipes({ query });

    list.innerHTML = "";

    const sorted = sortRecipes(recipes);

    if (!sorted.length) {
      list.append(
        el("div", { className: "panel", style: "padding:18px; grid-column:1 / -1;" },
          el("h3", { style: "margin:0 0 8px 0;" }, "No recipes found"),
          el("p", { style: "margin:0; color:var(--muted);" }, "Try another search or share a new recipe.")
        )
      );
      return;
    }

    sorted.forEach((r) => list.append(recipeCard(r)));
  }

  window.addEventListener("app:search", load);
  await load();
}