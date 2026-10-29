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
