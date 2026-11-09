const store = new Map();
export const lastOptions = { getItem: null, setItem: null, deleteItem: null };
export const AFTER_FIRST_UNLOCK = 0;

export const getItemAsync = async (key, options) => {
  lastOptions.getItem = options;
  return store.get(key) ?? null;
};
export const setItemAsync = async (key, val, options) => {
  lastOptions.setItem = options;
  store.set(key, String(val));
};
export const deleteItemAsync = async (key, options) => {
  lastOptions.deleteItem = options;
  store.delete(key);
};

export const resetStore = () => {
  store.clear();
  lastOptions.getItem = null;
  lastOptions.setItem = null;
  lastOptions.deleteItem = null;
};

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  AFTER_FIRST_UNLOCK,
  resetStore,
  lastOptions,
};
