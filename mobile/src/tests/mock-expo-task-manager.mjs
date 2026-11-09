export const tasks = new Map();

export const isTaskDefined = (name) => tasks.has(name);
export const defineTask = (name, fn) => { tasks.set(name, fn); };
export const isTaskRegisteredAsync = async () => false;
export const getDefinedTask = (name) => tasks.get(name);

export default {
  tasks,
  isTaskDefined,
  defineTask,
  isTaskRegisteredAsync,
  getDefinedTask,
};
