import { fetchRecipeById, addComment, fetchMe } from "../api.js";
import { el } from "../utils/dom.js";
import {
  showToast,
  renderSaveButton,
  renderLikeButton,
  formatDuration,
  formatLikes
} from "../ui/components.js";

const FALLBACK_IMAGE = "data:image/svg+xml;utf8," + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="#f6edb5"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="32" fill="#7e5e22">
      No image
    </text>
  </svg>
`);

export async function renderRecipeDetail(id) {
  const app = document.querySelector("#app");
  app.innerHTML = "";

  let recipe;
  let user = null;

  try {
    recipe = await fetchRecipeById(id);
    const me = await fetchMe();
    user = me.user;
  } catch {
    app.append(el("div", { className: "panel", style: "padding:14px" }, `Not found: ${id}`));
    return;
  }

  // --- COMMENTS UI ---
  const commentsList = el("div", {
    style: "margin-top:12px; display:grid; gap:10px;"
  });

  function renderComments() {
    commentsList.innerHTML = "";

    if (!recipe.comments || !recipe.comments.length) {
      commentsList.append(
        el("p", { style: "color:var(--muted); margin:0;" }, "No comments yet.")
      );
      return;
    }

    recipe.comments.forEach(c => {
      commentsList.append(
        el("div", { className: "panel", style: "padding:10px;" },
          el("div", { style: "font-weight:600; margin-bottom:4px;" }, c.author),
          el("div", {
            style: "font-size:0.9rem; color:var(--muted); margin-bottom:6px;"
          }, new Date(c.created_at).toLocaleString()),
          el("div", {}, c.text)
        )
      );
    });
  }

  renderComments();

  // --- COMMENT INPUT (ONLY IF LOGGED IN) ---
  let commentSection;

  if (user) {
    const commentInput = el("textarea", {
      className: "input textarea",
      placeholder: "Write a comment..."
    });

    const submitCommentBtn = el("button", {
      className: "btn btn--primary",
      type: "button"
    }, "Post");

    submitCommentBtn.addEventListener("click", async () => {
      const text = commentInput.value.trim();
      if (!text) return;

      try {
        await addComment(recipe.id, text);
        showToast("Comment posted.");
        commentInput.value = "";

        recipe = await fetchRecipeById(id);
        renderComments();
      } catch (err) {
        showToast(err.message || "Failed to post comment.");
      }
    });

    commentSection = el("div", { style: "display:grid; gap:8px; margin-top:10px;" },
      commentInput,
      submitCommentBtn
    );

  } else {
    commentSection = el("p", {
      style: "color:var(--muted); margin-top:10px;"
    }, "Log in to post a comment.");
  }

  app.append(
    el("div", { className: "panel", style: "padding:18px" },
      el("a", { className: "btn", href: "#/browse" }, "← Back"),
      el("h1", { style: "margin:14px 0 6px 0" }, recipe.title),

      el("div", {
        style: "color:var(--muted); display:flex; gap:6px; flex-wrap:wrap;"
      },
        el("span", {}, `By ${recipe.author}`),
        el("span", {}, "•"),
        el("span", {}, formatDuration(recipe.minutes)),
        el("span", {}, "•"),
        el("span", { "data-like-count-for": recipe.id }, formatLikes(recipe.like_count)),
        el("span", {}, "•"),
        el("span", {}, `${recipe.comment_count || 0} comments`)
      ),

      el("img", {
        src: recipe.image || FALLBACK_IMAGE,
        alt: recipe.title,
        style: "display:block; width:100%; max-width:720px; aspect-ratio:16/9; object-fit:cover; border-radius:14px; border:1px solid var(--border); margin:16px auto 0 auto;"
      }),

      el("div", { style: "margin-top:14px; display:flex; gap:10px; flex-wrap:wrap" },
        ...(recipe.tags || []).map(t =>
          el("span", {
            className: "panel",
            style: "padding:6px 10px; border-radius:999px; box-shadow:none;"
          }, t)
        )
      ),

      el("h2", { style: "margin-top:18px" }, "Ingredients"),
      el("ul", { style: "padding-left:18px; margin-top:8px;" },
        ...(recipe.ingredients || []).map(i =>
          el("li", { style: "margin-bottom:8px;" }, i)
        )
      ),

      el("h2", { style: "margin-top:18px" }, "Steps"),
      el("ol", { style: "padding-left:18px; margin-top:8px;" },
        ...(recipe.steps || []).map(s =>
          el("li", { style: "margin-bottom:12px;" }, s)
        )
      ),

      el("div", { style: "margin-top:18px; display:flex; gap:10px" },
        renderSaveButton(recipe.id),
        renderLikeButton(recipe)
      ),

      el("h2", { style: "margin-top:24px" }, "Comments"),

      commentSection,
      commentsList
    )
  );
}


