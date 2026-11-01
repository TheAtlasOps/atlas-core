// ─── DTOs de la API (backend FastAPI de Atlas) ────────────────────────────────
export type ApiOrderStatus =
  | 'IDLE' | 'CONFIRMADA' | 'EN_RUTA' | 'EN_SITIO' | 'COMPLETADA' | 'CANCELADA';

export type ApiClient = {
  id: string;
  business_name: string;
  contact_person: string | null;
  contact_phone: string;
  contact_email: string;
  address: string;
  comuna: string;
};

export type ApiOrderItem = {
  id: string;
  work_order_id: string;
  sim_card_id?: string | null;
  equipment_id?: string | null;
  action_type?: string;
  sim_iccid?: string | null;
  equipment_serial?: string | null;
  equipment_model?: string | null;
  equipment_brand?: string | null;
};

export type ApiOrder = {
  id: string;
  order_number: string;
  title: string;
  description: string | null;
  service_type: string;
  priority: string;
  status: ApiOrderStatus;
  client_id: string;
  technician_id: string | null;
  scheduled_date: string; // ISO 8601
  eta: string | null;
  address_override: string | null;
  comuna_override: string | null;
  client: ApiClient | null;
  items?: ApiOrderItem[];
};

export type ApiOrderList = {
  items: ApiOrder[];
  total: number;
  page: number;
  size: number;
  pages: number;
};

export type ApiToken = {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
};

/** Sesión guardada en el dispositivo */
export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

// ─── DTOs de Evidencias y Mediciones Técnicas ─────────────────────────────────
export type ApiEvidenceType =
  | 'FOTO_ANTES'
  | 'FOTO_DESPUES'
  | 'TEST_VELOCIDAD'
  | 'DIAGNOSTICO_DBM'
  | 'FIRMA_CLIENTE';

export type ApiFileUploadResponse = {
  success: boolean;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_url: string;
  message: string;
};

export type ApiEvidenceCreate = {
  work_order_id: string;
  evidence_type: ApiEvidenceType;
  storage_url: string;
  signal_dbm?: number | null;
  speed_download_mbps?: number | null;
  speed_upload_mbps?: number | null;
  validated_iccid?: string | null;
  validated_imsi?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type ApiEvidenceResponse = {
  id: string;
  work_order_id: string;
  technician_id: string;
  technician_name?: string | null;
  evidence_type: ApiEvidenceType;
  storage_url: string;
  signal_dbm?: number | null;
  speed_download_mbps?: number | null;
  speed_upload_mbps?: number | null;
  validated_iccid?: string | null;
  validated_imsi?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
  captured_at: string;
};
