const state = {
  user: null,
  query: "",
  recipes: [],
  savedRecipes: [],
  likedRecipes: []
};

const listeners = new Set();

export const store = {
  get() {
    return structuredClone(state);
  },
  set(patch) {
    Object.assign(state, patch);
    for (const fn of listeners) fn(store.get());
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};