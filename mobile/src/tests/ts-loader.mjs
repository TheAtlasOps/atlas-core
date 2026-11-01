export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react-native') {
    return {
      url: new URL('./mock-react-native.mjs', import.meta.url).href,
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
