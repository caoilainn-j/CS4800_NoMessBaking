import { el } from "../utils/dom.js";
import { store } from "../store.js";
import { saveRecipe, unsaveRecipe, likeRecipe, unlikeRecipe } from "../api.js";

const FALLBACK_IMAGE = "data:image/svg+xml;utf8," + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="#f6edb5"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="32" fill="#7e5e22">
      No image
    </text>
  </svg>
`);

function isSaved(recipeId) {
  const { user } = store.get();
  return !!user && Array.isArray(user.saved_recipe_ids) && user.saved_recipe_ids.includes(recipeId);
}

function isLiked(recipeId) {
  const { user } = store.get();
  return !!user && Array.isArray(user.liked_recipe_ids) && user.liked_recipe_ids.includes(recipeId);
}

function makeSaveButton(recipeId) {
  const button = el("button", { className: "btn", type: "button" }, "Save");

  async function onToggle() {
    const { user } = store.get();

    if (!user) {
      showToast("Please log in to save posts.");
      window.location.hash = "#/profile";
      return;
    }

    try {
      const wasSaved = isSaved(recipeId);
      const updatedUser = wasSaved
        ? await unsaveRecipe(recipeId)
        : await saveRecipe(recipeId);

      store.set({ user: updatedUser });

      const nowSaved = isSaved(recipeId);
      button.textContent = nowSaved ? "Unsave" : "Save";

      if (wasSaved && !nowSaved) {
        showToast("Removed from saved posts.");

        // Redirect to browse after unsaving
        window.location.hash = "#/browse";
      } else {
        showToast("Saved.");
      }
    } catch (error) {
      showToast(error.message || "Could not update saved posts.");
    }
  }

  button.textContent = isSaved(recipeId) ? "Unsave" : "Save";
  button.addEventListener("click", onToggle);
  return button;
}

function updateLikeDisplays(recipeId, likeCount) {
  document
    .querySelectorAll(`[data-like-count-for="${recipeId}"]`)
    .forEach((node) => {
      node.textContent = formatLikes(likeCount);
    });
}

function makeLikeButton(recipe) {
  const button = el("button", { className: "btn", type: "button" }, "Like");

  async function onToggle() {
    const { user } = store.get();

    if (!user) {
      showToast("Please log in to like posts.");
      window.location.hash = "#/profile";
      return;
    }

    try {
      const wasLiked = isLiked(recipe.id);
      const result = wasLiked
        ? await unlikeRecipe(recipe.id)
        : await likeRecipe(recipe.id);

      store.set({ user: result.user });

      const updated = result.recipe || recipe;
      recipe.like_count = updated.like_count;
      recipe.liked_by_current_user = updated.liked_by_current_user;
      updateLikeDisplays(recipe.id, recipe.like_count);
      button.textContent = `${isLiked(recipe.id) ? "Unlike" : "Like"}`;
      showToast(wasLiked ? "Removed from liked posts." : "Liked.");
    } catch (error) {
      showToast(error.message || "Could not update liked posts.");
    }
  }

  button.textContent = `${isLiked(recipe.id) || recipe.liked_by_current_user ? "Unlike" : "Like"}`;
  button.addEventListener("click", onToggle);
  return button;
}

export function formatDuration(minutes) {
  const mins = Number(minutes) || 0;

  if (mins < 60) {
    return `${mins} min`;
  }

  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;

  if (remaining === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr${hours > 1 ? "s" : ""}${remaining ? ` ${remaining} min` : ""}`;
}

export function formatLikes(count) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? "like" : "likes"}`;
}

export function recipeCard(r) {
  return el("article", { className: "card", style: "grid-column: span 4;" },
    el("img", {
      src: r.image || FALLBACK_IMAGE,
      alt: r.title,
      className: "card__image"
    }),
    el("div", {
      className: "card__body",
      style: "display:flex; flex-direction:column; height:100%;"
    },
      el("h3", { style: "margin:0 0 8px 0" }, r.title),
      el("div", { className: "card__meta" },
        el("span", {}, `By ${r.author}`),
        el("span", {}, formatDuration(r.minutes)),
        el("span", { "data-like-count-for": r.id }, formatLikes(r.like_count)),
        el("span", {}, (r.tags || []).join(" • "))
      ),
      el("div", {
        style: "margin-top:auto; padding-top:16px; display:flex; gap:10px; align-items:center; flex-wrap:nowrap;"
      },
          el("a", { className: "btn", href: `#/recipe/${r.id}` }, "View"),
          makeSaveButton(r.id),
          makeLikeButton(r)
        )
      ),
    )
}

export function renderSaveButton(recipeId) {
  return makeSaveButton(recipeId);
}

export function renderLikeButton(recipe) {
  return makeLikeButton(recipe);
}

export function showToast(message) {
  const root = document.querySelector("#toastRoot");
  const node = el("div", { className: "toast" }, message);
  root.append(node);
  window.setTimeout(() => node.remove(), 2600);
}