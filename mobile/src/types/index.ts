import React from 'react';
import { Feather } from '@expo/vector-icons';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type Status   = 'programada' | 'en_ruta' | 'en_curso' | 'completada';
export type Estado   = 'operativo' | 'falla';
export type TabId    = 'resumen' | 'checklist' | 'equipo' | 'evidencias' | 'notas';
export type ViewName = 'agenda' | 'detail' | 'success';
export type IconName = React.ComponentProps<typeof Feather>['name'];

/** Visita tal como la muestra la app (se construye a partir de una orden de la API) */
export type Visit = {
  /** UUID de la orden en la base de datos (se usa para las llamadas a la API) */
  id: string;
  /** Número visible de la orden, ej. "OT-0042" */
  code: string;
  time: string;
  client: string;
  /** Etiqueta legible del tipo de servicio, ej. "Instalación de fibra" */
  service: string;
  /** Valor original del backend (ServiceTypeEnum); define color e ícono */
  serviceType: string;
  /** Título/descripción del trabajo */
  title: string;
  description: string | null;
  address: string;
  zone: string;
  status: Status;
  equipo: { modelo: string; iccid: string; falla: string };
};
