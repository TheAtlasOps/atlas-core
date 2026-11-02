export const FileSystemUploadType = {
  BINARY_CONTENT: 0,
  MULTIPART: 1,
};

export const FileSystemSessionType = {
  BACKGROUND: 0,
  FOREGROUND: 1,
};

let customUploadAsync = null;

export function setMockUploadAsync(fn) {
  customUploadAsync = fn;
}

export function resetMockUploadAsync() {
  customUploadAsync = null;
}

export async function uploadAsync(url, fileUri, options) {
  if (customUploadAsync) {
    return await customUploadAsync(url, fileUri, options);
  }
  return {
    status: 201,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      success: true,
      filename: 'mock-uploaded.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 54321,
      storage_url: 'evidences/2026/11/01/mock-uploaded.jpg',
      message: 'Archivo validado y almacenado correctamente en Neon Object Storage',
    }),
  };
}

export default {
  FileSystemUploadType,
  FileSystemSessionType,
  uploadAsync,
  setMockUploadAsync,
  resetMockUploadAsync,
};
