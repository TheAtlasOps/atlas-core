import { Platform } from 'react-native';
import { apiRequest, apiUpload } from './client';
import type {
  ApiEvidenceCreate,
  ApiEvidenceResponse,
  ApiEvidenceType,
  ApiFileUploadResponse,
} from './types';

// ─── API de Evidencias Técnicas y Almacenamiento Neon ─────────────────────────

/**
 * Sube una fotografía capturada a Neon Object Storage vía POST /api/v1/evidences/upload.
 * Retorna la clave persistente del objeto ('storage_url') para posterior vinculación.
 */
export async function uploadEvidenceFile(
  workOrderId: string,
  uri: string,
  folder: string = 'evidences'
): Promise<ApiFileUploadResponse> {
  const filename = uri.split('/').pop() || `evidence_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const formData = new FormData();
  formData.append('work_order_id', workOrderId);
  formData.append('folder', folder);

  if (Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('data:')) {
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append('file', blob, filename);
  } else {
    // Formato estándar multipart para React Native / Expo
    formData.append('file', {
      uri,
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
