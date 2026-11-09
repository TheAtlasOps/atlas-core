import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Almacenamiento de la sesión ──────────────────────────────────────────────
// En iOS/Android el token se guarda cifrado (Keychain / Keystore) con expo-secure-store.
// AFTER_FIRST_UNLOCK permite el acceso a la credencial cifrada con la pantalla bloqueada
// una vez que el usuario ha desbloqueado el teléfono tras encenderlo.
const isNative = Platform.OS !== 'web';

export const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export async function getStored(key: string): Promise<string | null> {
  try {
    return isNative ? await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS) : await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setStored(key: string, value: string): Promise<void> {
  try {
    if (isNative) await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
    else await AsyncStorage.setItem(key, value);
  } catch {
    // si falla, la sesión simplemente no se recordará al cerrar la app
  }
}

export async function removeStored(key: string): Promise<void> {
  try {
    if (isNative) await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
    else await AsyncStorage.removeItem(key);
  } catch {
    // nada que hacer
  }
}
