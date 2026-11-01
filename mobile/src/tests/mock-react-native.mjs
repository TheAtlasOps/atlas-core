export const Platform = {
  OS: 'ios',
  select: (obj) => obj.ios || obj.default,
};
export default { Platform };
