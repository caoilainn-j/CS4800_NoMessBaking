import { jsonFetch } from "./api.js";

export async function likeRecipe(id) {
  return jsonFetch(`/api/recipes/${id}/like`, {
    method: "POST"
  });
}

export async function unlikeRecipe(id) {
  return jsonFetch(`/api/recipes/${id}/like`, {
    method: "DELETE"
  });
}