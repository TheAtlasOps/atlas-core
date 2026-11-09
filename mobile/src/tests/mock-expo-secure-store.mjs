const store = new Map();

export const getItemAsync = async (key) => store.get(key) ?? null;
export const setItemAsync = async (key, val) => { store.set(key, String(val)); };
export const deleteItemAsync = async (key) => { store.delete(key); };

export default { getItemAsync, setItemAsync, deleteItemAsync };
