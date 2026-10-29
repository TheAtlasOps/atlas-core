import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Almacenamiento de la sesión ──────────────────────────────────────────────
// En iOS/Android el token se guarda cifrado (Keychain / Keystore) con expo-secure-store.
// En web SecureStore no existe, así que se usa AsyncStorage (localStorage).
const isNative = Platform.OS !== 'web';

export async function getStored(key: string): Promise<string | null> {
  try {
    return isNative ? await SecureStore.getItemAsync(key) : await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setStored(key: string, value: string): Promise<void> {
  try {
    if (isNative) await SecureStore.setItemAsync(key, value);
    else await AsyncStorage.setItem(key, value);
  } catch {
    // si falla, la sesión simplemente no se recordará al cerrar la app
  }
}

export async function removeStored(key: string): Promise<void> {
  try {
    if (isNative) await SecureStore.deleteItemAsync(key);
    else await AsyncStorage.removeItem(key);
  } catch {
    // nada que hacer
  }
}
