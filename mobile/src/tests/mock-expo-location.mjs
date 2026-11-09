export const Accuracy = { Balanced: 3, High: 4, Low: 1 };

export const mockLocationState = {
  foregroundGranted: true,
  backgroundGranted: true,
  isStarted: false,
  startLocationUpdatesCalls: [],
  stopLocationUpdatesCalls: 0,
  currentPosition: { coords: { latitude: -33.45, longitude: -70.65 } },
};

export const getForegroundPermissionsAsync = async () => ({ granted: mockLocationState.foregroundGranted });
export const requestForegroundPermissionsAsync = async () => ({ granted: mockLocationState.foregroundGranted });
export const getBackgroundPermissionsAsync = async () => ({ granted: mockLocationState.backgroundGranted });
export const requestBackgroundPermissionsAsync = async () => ({ granted: mockLocationState.backgroundGranted });
export const getCurrentPositionAsync = async () => mockLocationState.currentPosition;
export const hasStartedLocationUpdatesAsync = async () => mockLocationState.isStarted;
export const startLocationUpdatesAsync = async (taskName, options) => {
  mockLocationState.isStarted = true;
  mockLocationState.startLocationUpdatesCalls.push({ taskName, options });
};
export const stopLocationUpdatesAsync = async () => {
  mockLocationState.isStarted = false;
  mockLocationState.stopLocationUpdatesCalls++;
};

export function resetMocks() {
  mockLocationState.foregroundGranted = true;
  mockLocationState.backgroundGranted = true;
  mockLocationState.isStarted = false;
  mockLocationState.startLocationUpdatesCalls = [];
  mockLocationState.stopLocationUpdatesCalls = 0;
  mockLocationState.currentPosition = { coords: { latitude: -33.45, longitude: -70.65 } };
}

export default {
  Accuracy,
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  getBackgroundPermissionsAsync,
  requestBackgroundPermissionsAsync,
  getCurrentPositionAsync,
  hasStartedLocationUpdatesAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
  resetMocks,
  mockLocationState,
};
