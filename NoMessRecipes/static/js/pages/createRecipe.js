import { createRecipe } from "../api.js";
import { el } from "../utils/dom.js";
import { showToast } from "../ui/components.js";
import { store } from "../store.js";

/* ---------- helpers ---------- */
function isNumericIngredient(line) {
  return /^\s*(\d+(\.\d+)?|\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞])/.test(line);
}

function openTextEditModal(initialValue, { validate } = {}) {
  return new Promise((resolve) => {
    const overlay = el("div", {
      style: `
        position:fixed; inset:0;
        background:rgba(0,0,0,0.4);
        display:flex; align-items:center; justify-content:center;
        z-index:1000;
      `
    });

    const input = el("input", {
      className: "input",
      value: initialValue,
      style: "width:100%;"
    });

    const save = el("button", { className: "btn btn--primary" }, "Save");
    const cancel = el("button", { className: "btn" }, "Cancel");

    const modal = el("div", {
      className: "panel",
      style: "padding:16px; width:400px; display:grid; gap:10px;"
    },
      el("h3", {}, "Edit"),
      input,
      el("div", { style: "display:flex; gap:10px; justify-content:flex-end;" },
        cancel,
        save
      )
    );

    overlay.append(modal);
    document.body.append(overlay);

    input.focus();
    input.select();

    function close(val) {
      overlay.remove();
      resolve(val);
    }

    function trySave() {
      const value = input.value.trim();
      if (!value) return showToast("Cannot be empty.");
      if (validate && !validate(value)) return showToast("Invalid value.");
      close(value);
    }

    save.onclick = trySave;
    cancel.onclick = () => close(null);

    overlay.onclick = (e) => {
      if (e.target === overlay) close(null);
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") trySave();
      if (e.key === "Escape") close(null);
    });
  });
}

/* ---------- CORE REUSABLE FORM ---------- */
export function renderRecipeForm(app, {
  initial = {},
  onSubmit,
  submitLabel = "Publish",
  titleText = "Share a recipe"
} = {}) {
  app.innerHTML = "";

  const { user } = store.get();
  if (!user) {
    app.append(
      el("div", { className: "panel", style: "padding:18px" },
        el("h1", {}, titleText),
        el("p", { style: "color:var(--muted)" }, "You need an account."),
        el("a", { className: "btn btn--primary", href: "#/profile" }, "Log in")
      )
    );
    return;
  }

  let ingredientList = [...(initial.ingredients || [])];
  let stepList = [...(initial.steps || [])];
  let imageData = initial.image || "";

  const title = el("input", { className: "input", value: initial.title || "", placeholder: "Recipe title" });
  const minutes = el("input", { className: "input", value: initial.minutes || "", placeholder: "Minutes" });
  const tags = el("input", {
    className: "input",
    value: (initial.tags || []).join(", "),
    placeholder: "Tags (comma-separated)"
  });

  /* ---------- IMAGE ---------- */
  const imageInput = el("input", { type: "file", accept: "image/*", className: "input" });

  const imagePreview = el("img", {
    src: imageData,
    style: `
      display:${imageData ? "block" : "none"};
      max-width:320px;
      margin-top:8px;
      border-radius:12px;
      border:1px solid var(--border);
    `
  });

  const removeImageBtn = el("button", { className: "btn", type: "button" }, "Remove image");
  removeImageBtn.style.display = imageData ? "inline-flex" : "none";

  imageInput.onchange = () => {
    const file = imageInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      imageData = reader.result;
      imagePreview.src = imageData;
      imagePreview.style.display = "block";
      removeImageBtn.style.display = "inline-flex";
    };
    reader.readAsDataURL(file);
  };

  removeImageBtn.onclick = () => {
    imageData = "";
    imageInput.value = "";
    imagePreview.style.display = "none";
    removeImageBtn.style.display = "none";
  };

  /* ---------- INGREDIENTS ---------- */
  const ingredientInput = el("input", { className: "input", placeholder: "e.g. 1 cup flour" });
  const ingredientListUI = el("ul", { style: "padding-left:18px; margin-top:8px;" });

  function renderIngredients() {
    ingredientListUI.innerHTML = "";

    ingredientList.forEach((item, i) => {
      const editBtn = el("button", { className: "btn" }, "Edit");
      const removeBtn = el("button", { className: "btn" }, "Remove");

      editBtn.onclick = async () => {
        const result = await openTextEditModal(item, { validate: isNumericIngredient });
        if (result) {
          ingredientList[i] = result;
          renderIngredients();
        }
      };

      removeBtn.onclick = () => {
        ingredientList.splice(i, 1);
        renderIngredients();
      };

      ingredientListUI.append(
        el("li", { style: "margin-bottom:8px;" }, item, editBtn, removeBtn)
      );
    });
  }

  ingredientInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const value = ingredientInput.value.trim();
    if (!value) return;
    if (!isNumericIngredient(value)) return showToast("Must start with number.");

    ingredientList.push(value);
    ingredientInput.value = "";
    renderIngredients();
  });

  /* ---------- STEPS ---------- */
  const stepInput = el("input", { className: "input", placeholder: "e.g. Mix ingredients" });
  const stepListUI = el("ul", { style: "list-style:none; padding:0;" });

  function renderSteps() {
    stepListUI.innerHTML = "";

    stepList.forEach((step, i) => {
      const num = el("span", {
        style: "background:var(--primary); padding:4px 8px; border-radius:999px; margin-right:8px;"
      }, i + 1);

      const editBtn = el("button", { className: "btn" }, "Edit");
      const removeBtn = el("button", { className: "btn" }, "Remove");

      editBtn.onclick = async () => {
        const result = await openTextEditModal(step);
        if (result) {
          stepList[i] = result;
          renderSteps();
        }
      };

      removeBtn.onclick = () => {
        stepList.splice(i, 1);
        renderSteps();
      };

      stepListUI.append(
        el("li", { style: "margin-bottom:10px; display:flex; align-items:center;" },
          num,
          el("span", {}, step),
          editBtn,
          removeBtn
        )
      );
    });
  }

  stepInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const value = stepInput.value.trim();
    if (!value) return;

    stepList.push(value);
    stepInput.value = "";
    renderSteps();
  });

  renderIngredients();
  renderSteps();

  /* ---------- SUBMIT ---------- */
  const submitBtn = el("button", { className: "btn btn--primary", type: "submit" }, submitLabel);

  const form = el("form", { className: "form panel", style: "padding:18px; display:grid; gap:10px;" },
    el("h1", {}, titleText),
    el("div", { className: "label" }, "Title", title),
    el("div", { className: "label" }, "Minutes", minutes),
    el("div", { className: "label" }, "Tags", tags),
    el("div", { className: "label" }, "Image", imageInput, imagePreview, removeImageBtn),
    el("div", { className: "label" }, "Ingredients", ingredientInput, ingredientListUI),
    el("div", { className: "label" }, "Steps", stepInput, stepListUI),
    submitBtn
  );

  form.onsubmit = async (e) => {
    e.preventDefault();

    if (!title.value.trim()) return showToast("Title required.");
    if (!ingredientList.length) return showToast("Add ingredients.");
    if (!stepList.length) return showToast("Add steps.");

    const payload = {
      title: title.value.trim(),
      minutes: Number(minutes.value) || 0,
      tags: tags.value.split(",").map(t => t.trim()).filter(Boolean),
      ingredients: ingredientList,
      steps: stepList,
      image: imageData
    };

    await onSubmit(payload);
  };

  app.append(form);
}

/* ---------- CREATE PAGE ---------- */
export function renderCreateRecipe() {
  const app = document.querySelector("#app");

  renderRecipeForm(app, {
    onSubmit: async (payload) => {
      try {
        const created = await createRecipe(payload);
        showToast("Published.");
        window.location.hash = `#/recipe/${created.id}`;
      } catch (err) {
        showToast(err.message || "Failed to publish.");
      }
    }
  });
}