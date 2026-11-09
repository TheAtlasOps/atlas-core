export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react-native') {
    return {
      url: new URL('./mock-react-native.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }
  if (specifier === 'expo-file-system' || specifier === 'expo-file-system/legacy') {
    return {
      url: new URL('./mock-expo-file-system.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }
  if (specifier === 'expo-secure-store') {
    return {
      url: new URL('./mock-expo-secure-store.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }
  if (specifier === 'expo-location') {
    return {
      url: new URL('./mock-expo-location.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }
  if (specifier === 'expo-task-manager') {
    return {
      url: new URL('./mock-expo-task-manager.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }
  if (specifier === '@react-native-async-storage/async-storage') {
    return {
      url: new URL('./mock-async-storage.mjs', import.meta.url).href,
      shortCircuit: true,
    };
  }

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {}
      }
    }
    throw err;
  }
}
