export const Platform = {
  OS: 'android',
  select: (obj) => obj.android || obj.default,
};
export const Alert = {
  alert: () => {},
};
export const Linking = {
  openSettings: async () => {},
};
export const View = () => null;
export const Text = () => null;
export default { Platform, Alert, Linking, View, Text };
