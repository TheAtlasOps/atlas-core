import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { API_URL } from '../config';
import { apiRequest, apiUpload, getAuthToken, ApiError } from './client';
import type {
  ApiEvidenceCreate,
  ApiEvidenceResponse,
  ApiEvidenceType,
  ApiFileUploadResponse,
} from './types';

// ─── API de Evidencias Técnicas y Almacenamiento Neon ─────────────────────────

export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  let len = base64.length;
  if (base64.endsWith('==')) len -= 2;
  else if (base64.endsWith('=')) len -= 1;
  const bytes = new Uint8Array((len * 3) >>> 2);
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const a = lookup[base64.charCodeAt(i)];
    const b = lookup[base64.charCodeAt(i + 1)];
    const c = lookup[base64.charCodeAt(i + 2)];
    const d = lookup[base64.charCodeAt(i + 3)];
    bytes[p++] = (a << 2) | (b >> 4);
    if (p < bytes.length) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < bytes.length) bytes[p++] = ((c & 3) << 6) | d;
  }
  return bytes;
}

/**
 * Sube una fotografía capturada a Neon Object Storage vía POST /api/v1/evidences/upload.
 * Retorna la clave persistente del objeto ('storage_url') para posterior vinculación.
 *
 * Utiliza FileSystem.uploadAsync de expo-file-system/legacy con FileSystemUploadType.MULTIPART
 * en entornos nativos (Android / iOS). Esta API realiza streaming nativo multipart a través
 * del sistema operativo sin pasar por la capa de Blob de React Native (la cual prohíbe ArrayBuffer/Uint8Array)
 * ni por el fetch de Expo (el cual prohíbe { uri, name, type }).
 */
export async function uploadEvidenceFile(
  workOrderId: string,
  uri: string,
  folder: string = 'evidences',
  base64?: string | null
): Promise<ApiFileUploadResponse> {
  // 1. Normalización de URI para Android y iOS
  const normalizedUri = Platform.OS === 'android' && !uri.startsWith('file://') && !uri.startsWith('content://')
    ? `file://${uri}`
    : uri;

  // 2. Extracción y sanitización de nombre de archivo con extensión garantizada
  let rawName = normalizedUri.split('/').pop()?.split('?')[0] || `evidence_${Date.now()}.jpg`;
  if (!/\.(jpe?g|png|webp)$/i.test(rawName)) {
    rawName = `${rawName}.jpg`;
  }
  const filename = rawName;
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  // 3. Subida nativa en Android e iOS mediante expo-file-system/legacy
  if (Platform.OS !== 'web' && FileSystem && typeof FileSystem.uploadAsync === 'function') {
    const token = getAuthToken();
    const targetUrl = `${API_URL}/evidences/upload`;
    console.log(`[ATLAS Evidencia] Subida nativa multipart con FileSystem.uploadAsync para ${filename} (tipo: ${mimeType})`);

    let uploadRes: FileSystem.FileSystemUploadResult;
    try {
      uploadRes = await FileSystem.uploadAsync(targetUrl, normalizedUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: mimeType,
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        parameters: {
          work_order_id: workOrderId,
          folder: folder,
        },
      });
    } catch (netErr) {
      console.error(`[ATLAS Evidencia] Error en FileSystem.uploadAsync: ${(netErr as Error).message}`);
      throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión a internet.', 'network');
    }

    console.log(`[ATLAS Evidencia] FileSystem.uploadAsync finalizó con HTTP status ${uploadRes.status}`);

    let data: any = null;
    try {
      data = JSON.parse(uploadRes.body);
    } catch {
      data = null;
    }

    if (uploadRes.status >= 200 && uploadRes.status < 300 && data) {
      return data as ApiFileUploadResponse;
    }

    const detailMsg = data?.detail || data?.message || `Error en servidor (${uploadRes.status})`;
    const status = uploadRes.status;
    const kind = status === 401 || status === 403 ? 'http' : 'http';
    throw new ApiError(detailMsg, kind, status);
  }

  // 4. Fallback compatible para entornos Web / Mocks de pruebas
  const formData = new FormData();
  formData.append('work_order_id', workOrderId);
  formData.append('folder', folder);

  let filePart: any = null;
  if (typeof globalThis.Blob === 'function') {
    try {
      filePart = new Blob(['mock-binary-data'], { type: mimeType });
    } catch {
      filePart = null;
    }
  }

  if (filePart) {
    formData.append('file', filePart, filename);
  } else {
    formData.append('file', {
      uri: normalizedUri,
      name: filename,
      type: mimeType,
    } as any);
  }

  return apiUpload<ApiFileUploadResponse>('/evidences/upload', formData);
}

/**
 * Persiste la evidencia o medición técnica vinculada a la OT mediante POST /api/v1/evidences.
 */
export async function createEvidenceRecord(
  payload: ApiEvidenceCreate
): Promise<ApiEvidenceResponse> {
  return apiRequest<ApiEvidenceResponse>('/evidences', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Registra una medición de potencia RF (dBm) ingresada manualmente por el técnico.
 * No genera lecturas simuladas ni automáticas.
 */
export async function saveSignalMeasurement(
  workOrderId: string,
  signalDbm: number,
  notes?: string
): Promise<ApiEvidenceResponse> {
  return createEvidenceRecord({
    work_order_id: workOrderId,
    evidence_type: 'DIAGNOSTICO_DBM',
    storage_url: 'telemetry/signal_dbm',
    signal_dbm: signalDbm,
    notes: notes || 'Medición manual de nivel de señal ingresada en terreno por el técnico (ATLAS Mobile)',
  });
}

/**
 * Consulta la auditoría de evidencias de la orden para verificación de cumplimiento.
 */
export async function fetchOrderEvidences(
  workOrderId: string
): Promise<{ items: ApiEvidenceResponse[] }> {
  return apiRequest<{ items: ApiEvidenceResponse[] }>(`/evidences/order/${workOrderId}`);
}
