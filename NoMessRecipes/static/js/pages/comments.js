import { jsonFetch } from "./api.js";

export async function fetchComments(recipeId) {
  return jsonFetch(`/api/recipes/${recipeId}/comments`);
}

export async function postComment(recipeId, text) {
  return jsonFetch(`/api/recipes/${recipeId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
}