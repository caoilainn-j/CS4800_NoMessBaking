import { renderHome } from "./pages/home.js";
import { renderBrowse } from "./pages/browse.js";
import { renderRecipeDetail } from "./pages/recipeDetail.js";
import { renderCreateRecipe } from "./pages/createRecipe.js";
import { renderProfile } from "./pages/profile.js";
import { renderSaved } from "./pages/saved.js";
import { renderLiked } from "./pages/liked.js";

const routes = [
  { path: /^#\/$/, render: () => renderHome() },
  { path: /^#\/browse$/, render: () => renderBrowse() },
  { path: /^#\/recipe\/([\w-]+)$/, render: (m) => renderRecipeDetail(m[1]) },
  { path: /^#\/create$/, render: () => renderCreateRecipe() },
  { path: /^#\/profile$/, render: () => renderProfile() },
  { path: /^#\/saved$/, render: () => renderSaved() },
  { path: /^#\/liked$/, render: () => renderLiked() }
];

export function initRouter() {
  const onRoute = () => {
    const hash = window.location.hash || "#/";
    for (const r of routes) {
      const m = hash.match(r.path);
      if (m) return r.render(m);
    }
    window.location.hash = "#/";
  };

  window.addEventListener("hashchange", onRoute);
  onRoute();
}