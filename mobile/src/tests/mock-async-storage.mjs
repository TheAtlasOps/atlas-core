const store = new Map();

export const getItem = async (key) => store.get(key) ?? null;
export const setItem = async (key, val) => { store.set(key, String(val)); };
export const removeItem = async (key) => { store.delete(key); };

export default { getItem, setItem, removeItem };
