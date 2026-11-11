import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Image, Alert, Linking, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';

import { ConnPill, StatusBadge, SectionLabel, DataRow, Card } from '../components/common';
import { PhotoViewer } from '../components/PhotoViewer';
import { useTheme } from '../theme/ThemeContext';
import { CHECKLIST_ITEMS, TABS, MAX_PHOTOS } from '../data/mockData';
import { dbmQuality, formatTimeAgo } from '../utils/helpers';
import { useGpsTrackingStatus } from '../services/trackingService';
import type { Visit, TabId, Estado, PhotoEvidence } from '../types';

// ─── Pantalla Detalle ─────────────────────────────────────────────────────────
type DetailProps = {
  visit: Visit;
  tab: TabId; setTab: (t: TabId) => void;
  online: boolean; onToggleOnline: () => void;
  /** true mientras se guarda un cambio de estado en el servidor */
  busy: boolean;
  onBack: () => void;
  checked: Record<number, boolean>; doneCount: number; allDone: boolean;
  onToggle: (id: number) => void;
  onConfirmAccess: () => void;
  onStartRoute: () => void;
  evidence: PhotoEvidence[];
  onAddEvidence: (uri: string, type: 'FOTO_ANTES' | 'FOTO_DESPUES', base64?: string | null) => void;
  onRemoveEvidence: (id: string) => void;
  onRetryEvidence: (id: string) => void;
  onToggleEvidenceType: (id: string) => void;
  notes: string; onNotesChange: (t: string) => void;
  dbm: number; onDbmChange: (v: number) => void;
  estado: Estado; onEstadoChange: (v: Estado) => void;
  fallaNote: string; onFallaNoteChange: (t: string) => void;
  iccidVerified: boolean; onIccidVerify: () => void;
  onFinalize: () => void;
};

function GpsTrackingBadge() {
  const tracking = useGpsTrackingStatus();
  const [now, setNow] = useState(Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  if (tracking.state === 'starting') {
    return (
      <View className="flex-col gap-1 bg-amber-500/10 border border-amber-500/30 rounded-xl py-2 px-3">
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#F59E0B" />
          <Text className="text-amber-500 text-xs font-bold">
            Iniciando GPS en segundo plano...
          </Text>
        </View>
        <Text className="text-amber-600/80 text-[11px]">
          Conectando con satélites y habilitando servicio continuo en Android.
        </Text>
      </View>
    );
  }

  if (tracking.state === 'error') {
    return (
      <View className="flex-col gap-1 bg-rose-500/10 border border-rose-500/30 rounded-xl py-2 px-3">
        <View className="flex-row items-center gap-2">
          <View className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <Text className="text-rose-500 text-xs font-bold">
            {tracking.errorMessage || 'Problema de transmisión GPS'}
          </Text>
        </View>
        <Text className="text-rose-600/80 text-[11px]">
          Reintentando enviar coordenadas automáticamente.
        </Text>
      </View>
    );
  }

  if (tracking.state === 'active') {
    const timeAgo = tracking.lastSentAt ? formatTimeAgo(tracking.lastSentAt, now) : 'hace un momento';
    return (
      <View className="flex-col gap-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl py-2 px-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <Text className="text-emerald-600 text-xs font-bold">
              GPS en segundo plano activo
            </Text>
          </View>
          <Text className="text-emerald-700 text-[11px] font-semibold">
            {timeAgo}
          </Text>
        </View>
        <Text className="text-emerald-700/80 text-[11px]">
          Transmitiendo ubicación en vivo · Pantalla bloqueada admitida
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-col gap-1 bg-brand/10 border border-brand/30 rounded-xl py-2 px-3">
      <View className="flex-row items-center gap-2">
        <View className="w-2 h-2 rounded-full bg-brand" />
        <Text className="text-brand text-xs font-semibold">
          Preparando seguimiento GPS para la ruta...
        </Text>
      </View>
    </View>
  );
}

export function DetailScreen(p: DetailProps) {
  const { colors } = useTheme();
  const quality  = dbmQuality(p.dbm, colors);
  const total    = CHECKLIST_ITEMS.length;
  const progress = `${(p.doneCount / total) * 100}%` as `${number}%`;
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  function alertPermisoFaltante(mensaje: string) {
    Alert.alert('Permiso requerido', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
    ]);
  }

  async function tomarFoto(type: 'FOTO_ANTES' | 'FOTO_DESPUES') {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      alertPermisoFaltante('Activa el acceso a la cámara para registrar evidencia fotográfica en terreno.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.4, // Compresión controlada: asegura archivos < 1.5 MB manteniendo nitidez técnica
      base64: true, // Captura bytes reales sin alteración para validación RNF-SEG-05
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      p.onAddEvidence(result.assets[0].uri, type, result.assets[0].base64);
    }
  }

  async function elegirDeGaleria(type: 'FOTO_ANTES' | 'FOTO_DESPUES') {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      alertPermisoFaltante('Activa el acceso a tus fotos para adjuntar evidencia desde la galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.4, // Compresión controlada: asegura archivos < 1.5 MB manteniendo nitidez técnica
      base64: true, // Captura bytes reales sin alteración para validación RNF-SEG-05
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      p.onAddEvidence(result.assets[0].uri, type, result.assets[0].base64);
    }
  }

  function handleAddEvidence() {
    if (p.evidence.length >= MAX_PHOTOS) return;
    const defaultType = p.evidence.length === 0 ? 'FOTO_ANTES' : 'FOTO_DESPUES';

    Alert.alert('Capturar evidencia fotográfica', 'Selecciona el tipo de fotografía para esta orden:', [
      {
        text: 'Cámara (Foto Antes)',
        onPress: () => tomarFoto('FOTO_ANTES'),
      },
      {
        text: 'Cámara (Foto Después)',
        onPress: () => tomarFoto('FOTO_DESPUES'),
      },
      {
        text: 'Elegir de galería',
        onPress: () => elegirDeGaleria(defaultType),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function handleRemoveEvidence(id: string) {
    Alert.alert('Quitar foto', '¿Eliminar esta foto de la evidencia?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => p.onRemoveEvidence(id) },
    ]);
  }

  return (
    <View className="flex-1">
      {/* Top bar */}
      <View className="px-4 pt-3 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            onPress={p.onBack}
            className="bg-overlay/[0.06] border border-border rounded-[9px] p-[7px] items-center justify-center"
          >
            <Feather name="arrow-left" size={16} color={colors.text1} />
          </TouchableOpacity>
          <ConnPill online={p.online} onToggle={p.onToggleOnline} />
        </View>
        <Text className="font-mono text-[10px] text-text3 mb-[3px]">
          {p.visit.code} · {p.visit.zone}
        </Text>
        <View className="flex-row items-center justify-between mb-0.5">
          <Text className="text-text1 font-bold text-[17px] flex-1 tracking-tight mr-2" numberOfLines={2}>
            {p.visit.title || p.visit.service}
          </Text>
          <StatusBadge status={p.visit.status} />
        </View>
        <Text className="text-xs text-text2">
          {p.visit.client}{p.visit.service ? ` · ${p.visit.service}` : ''}
        </Text>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-grow-0 border-b border-border"
        contentContainerClassName="px-3"
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => p.setTab(t.id)}
            className={`px-2.5 py-2 border-b-2 ${p.tab === t.id ? 'border-brand' : 'border-transparent'}`}
          >
            <Text className={`text-xs ${p.tab === t.id ? 'font-semibold text-text1' : 'text-text3'}`}>
              {t.label}{t.id === 'checklist' ? ` ${p.doneCount}/${total}` : ''}
              {t.id === 'evidencias' && p.evidence.length > 0 ? ` (${p.evidence.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* RESUMEN */}
        {p.tab === 'resumen' && (
          <View>
            <Card className="mb-[10px]">
              <DataRow icon="file-text" label="Orden"     value={p.visit.title || p.visit.service} />
              <DataRow icon="tool"      label="Servicio"  value={p.visit.service} />
              <DataRow icon="map-pin"   label="Dirección" value={p.visit.address} />
              <DataRow icon="clock"     label="Ventana"   value={p.visit.time} mono />
              <DataRow icon="map"       label="Zona"      value={p.visit.zone} />
              <DataRow icon="clipboard" label="Detalle"   value={p.visit.description || 'Sin descripción adicional'} last />
            </Card>
            <SectionLabel>Hardware asignado</SectionLabel>
            <Card className="mb-4">
              <DataRow label="Modelo Router"  value={p.visit.equipo.modelo} />
              <DataRow label="N° Serie"       value={p.visit.equipo.serie} mono />
              <DataRow label="ICCID SIM"      value={p.visit.equipo.iccid} mono />
              <DataRow label="Última falla"   value={p.visit.equipo.falla} last />
            </Card>
            {p.visit.status === 'programada' && (
              <TouchableOpacity
                onPress={p.onStartRoute}
                disabled={p.busy}
                className={`bg-brand rounded-xl p-[13px] items-center flex-row justify-center gap-2 ${p.busy ? 'opacity-60' : ''}`}
                style={{
                  shadowColor: '#F97316', shadowOpacity: 0.35, shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 }, elevation: 6,
                }}
              >
                {p.busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="navigation" size={16} color="#fff" />
                    <Text className="text-white text-sm font-bold">Iniciar ruta (En camino)</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {p.visit.status === 'en_ruta' && (
              <View className="gap-2.5">
                <GpsTrackingBadge />
                <TouchableOpacity
                  onPress={p.onConfirmAccess}
                  disabled={p.busy}
                  className={`bg-emerald-600 rounded-xl p-[13px] items-center flex-row justify-center gap-2 ${p.busy ? 'opacity-60' : ''}`}
                  style={{
                    shadowColor: '#059669', shadowOpacity: 0.35, shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 }, elevation: 6,
                  }}
                >
                  {p.busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="map-pin" size={16} color="#fff" />
                      <Text className="text-white text-sm font-bold">Confirmar llegada al sitio</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {p.visit.status === 'en_curso' && (
              <TouchableOpacity
                onPress={() => p.setTab('checklist')}
                className="bg-surface border border-border rounded-xl p-[13px] items-center flex-row justify-center gap-2"
              >
                <Feather name="check-square" size={16} color={colors.text1} />
                <Text className="text-text1 text-sm font-semibold">Continuar con checklist técnico</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* CHECKLIST */}
        {p.tab === 'checklist' && (
          <View>
            <View className="flex-row items-center mb-3.5">
              <View className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
                <View className="h-full bg-brand rounded-full" style={{ width: progress }} />
              </View>
              <Text className="font-mono text-[11px] text-text2 ml-2.5">
                {p.doneCount}/{total}
              </Text>
            </View>
            {CHECKLIST_ITEMS.map((item, idx) => {
              const isChecked = !!p.checked[item.id];
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => p.onToggle(item.id)}
                  className={`flex-row items-start gap-2.5 border rounded-xl p-[11px] mb-[7px] ${
                    isChecked ? 'bg-green-dim border-green/25' : 'bg-card border-border'
                  }`}
                  activeOpacity={0.75}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-[1.5px] items-center justify-center mt-px ${
                      isChecked ? 'bg-green border-green' : 'border-text3'
                    }`}
                  >
                    {isChecked ? <Feather name="check" size={11} color="#fff" /> : null}
                  </View>
                  <View className="flex-1">
                    <Text className={`font-bold text-xs ${isChecked ? 'text-green' : 'text-text1'}`}>
                      {String(idx + 1).padStart(2, '0')} {item.title}
                    </Text>
                    <Text className="text-text2 text-[11px] mt-0.5">{item.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* EQUIPO */}
        {p.tab === 'equipo' && (
          <View>
            <SectionLabel>Hardware asignado en sistema</SectionLabel>
            <Card className="mb-3.5">
              <DataRow label="Modelo Router"  value={p.visit.equipo.modelo} />
              <DataRow label="N° Serie"       value={p.visit.equipo.serie} mono />
              <DataRow label="ICCID SIM"      value={p.visit.equipo.iccid} mono last />
            </Card>

            <SectionLabel>Medición técnica en terreno</SectionLabel>
            <Card className="mb-[10px]">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs text-text2 font-medium">Nivel de señal RF</Text>
                <Text className="font-mono text-xs font-semibold" style={{ color: quality.color }}>
                  {p.dbm} dBm · {quality.label}
                </Text>
              </View>
              <Text className="text-[10px] text-text3 mb-2.5">
                Medición manual ingresada en terreno por el técnico
              </Text>

              {/* Signal bars */}
              <View className="flex-row items-end h-6 mb-2.5">
                {[1, 2, 3, 4].map((b) => (
                  <View
                    key={b}
                    className="flex-1 mx-0.5 rounded-[3px]"
                    style={{
                      height: 6 + b * 4,
                      backgroundColor: b <= quality.bars ? quality.color : colors.surface,
                    }}
                  />
                ))}
              </View>

              <Slider
                minimumValue={-110}
                maximumValue={-50}
                step={1}
                value={p.dbm}
                onValueChange={p.onDbmChange}
                minimumTrackTintColor={colors.brand}
                maximumTrackTintColor={colors.surface}
                thumbTintColor={colors.brand}
                style={{ width: '100%' }}
              />

              <View className="h-px bg-border my-3" />

              <Text className="text-xs text-text2 font-medium mb-2">
                Estado del equipo
              </Text>
              <View className={`flex-row gap-2 ${p.estado === 'falla' ? 'mb-2.5' : 'mb-0'}`}>
                {(['operativo', 'falla'] as const).map((opt) => {
                  const active = p.estado === opt;
                  const activeClass = opt === 'operativo'
                    ? 'border-green/50 bg-green-dim'
                    : 'border-red/50 bg-red-dim';
                  const textActiveClass = opt === 'operativo' ? 'text-green' : 'text-red';
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => p.onEstadoChange(opt)}
                      className={`flex-1 p-[9px] rounded-[10px] border items-center ${
                        active ? activeClass : 'border-border bg-transparent'
                      }`}
                    >
                      <Text className={`text-xs font-semibold ${active ? textActiveClass : 'text-text3'}`}>
                        {opt === 'operativo' ? 'Operativo' : 'Con falla'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {p.estado === 'falla' && (
                <TextInput
                  value={p.fallaNote}
                  onChangeText={p.onFallaNoteChange}
                  placeholder="Describe la falla encontrada"
                  placeholderTextColor={colors.text3}
                  multiline
                  numberOfLines={3}
                  className="bg-card border border-red/30 rounded-xl p-3 text-text1 text-[13px] min-h-[120px]"
                  style={{ textAlignVertical: 'top' }}
                />
              )}
            </Card>

            <TouchableOpacity
              onPress={p.onIccidVerify}
              className={`flex-row items-center gap-2.5 border rounded-xl p-[11px] mb-[7px] ${
                p.iccidVerified ? 'bg-green-dim border-green/25' : 'bg-card border-border'
              }`}
              activeOpacity={0.75}
            >
              <View
                className={`w-5 h-5 rounded-[5px] border-[1.5px] items-center justify-center ${
                  p.iccidVerified ? 'bg-green border-green' : 'border-text3'
                }`}
              >
                {p.iccidVerified ? <Feather name="check" size={11} color="#fff" /> : null}
              </View>
              <Text className={`text-xs ${p.iccidVerified ? 'text-green' : 'text-text2'}`}>
                ICCID de SIM verificado en terreno
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* EVIDENCIAS */}
        {p.tab === 'evidencias' && (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <SectionLabel>Fotografías en terreno</SectionLabel>
              <Text className="font-mono text-[10px] text-text3">
                {p.evidence.length}/{MAX_PHOTOS}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {p.evidence.map((item, idx) => {
                const isUploading = item.status === 'uploading';
                const isSynced    = item.status === 'synced';
                const isError     = item.status === 'error';

                return (
                  <View
                    key={item.id}
                    className="w-[30%] aspect-square rounded-[10px] border border-border overflow-hidden relative"
                  >
                    <TouchableOpacity
                      onPress={() => {
                        if (item.status === 'error' && item.error) {
                          Alert.alert('Diagnóstico de subida', `${item.error}\n\nToca "Reintentar" para volver a enviar.`);
                        } else {
                          setPreviewIndex(idx);
                        }
                      }}
                      activeOpacity={0.85}
                      className="w-full h-full"
                    >
                      <Image source={{ uri: item.uri }} className="w-full h-full" resizeMode="cover" />
                    </TouchableOpacity>

                    {/* Badge tipo de foto (Antes / Después) */}
                    <TouchableOpacity
                      onPress={() => p.onToggleEvidenceType(item.id)}
                      className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 flex-row items-center"
                    >
                      <Text className="text-[9px] font-bold text-white">
                        {item.type === 'FOTO_ANTES' ? 'ANTES' : 'DESPUÉS'}
                      </Text>
                    </TouchableOpacity>

                    {/* Botón eliminar */}
                    <TouchableOpacity
                      onPress={() => handleRemoveEvidence(item.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 items-center justify-center"
                    >
                      <Feather name="x" size={12} color="#F5F5F5" />
                    </TouchableOpacity>

                    {/* Estado de subida overlay */}
                    {isUploading && (
                      <View className="absolute inset-0 bg-black/60 items-center justify-center p-1">
                        <ActivityIndicator size="small" color="#F97316" />
                        <Text className="text-[9px] text-white font-medium mt-1">Subiendo...</Text>
                      </View>
                    )}

                    {isSynced && (
                      <View className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-green/90 flex-row items-center gap-0.5">
                        <Feather name="check" size={10} color="#fff" />
                        <Text className="text-[8px] font-bold text-white">Neon</Text>
                      </View>
                    )}

                    {isError && (
                      <TouchableOpacity
                        onPress={() => p.onRetryEvidence(item.id)}
                        className="absolute inset-x-0 bottom-0 bg-red/90 p-1 flex-row items-center justify-center gap-1"
                      >
                        <Feather name="refresh-cw" size={10} color="#fff" />
                        <Text className="text-[9px] font-bold text-white">Reintentar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              {p.evidence.length < MAX_PHOTOS && (
                <TouchableOpacity
                  onPress={handleAddEvidence}
                  className="w-[30%] aspect-square rounded-[10px] border border-dashed border-border items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={20} color={colors.text3} />
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-[10px] text-text3 mt-2">
              Toca una foto para verla en pantalla completa · Toca la etiqueta para alternar ANTES/DESPUÉS · Las fotos se almacenan directamente en Neon Object Storage.
            </Text>
          </View>
        )}

        {/* NOTAS */}
        {p.tab === 'notas' && (
          <TextInput
            value={p.notes}
            onChangeText={p.onNotesChange}
            placeholder="Agrega notas u observaciones de la visita"
            placeholderTextColor={colors.text3}
            multiline
            numberOfLines={9}
            className="bg-card border border-border rounded-xl p-3 text-text1 text-[13px] min-h-[120px]"
            style={{ textAlignVertical: 'top' }}
          />
        )}
      </ScrollView>

      {/* Finalize bar */}
      {p.visit.status !== 'completada' && p.tab !== 'resumen' && (
        <View className="p-3.5 border-t border-border">
          {!p.allDone && (
            <Text className="text-[10px] text-text3 text-center mb-[7px]">
              Completa el checklist para finalizar · {p.doneCount}/{total}
            </Text>
          )}
          <TouchableOpacity
            onPress={p.onFinalize}
            disabled={!p.allDone || p.busy}
            className={`rounded-xl p-[13px] items-center ${p.allDone ? 'bg-brand' : 'bg-surface'} ${p.busy ? 'opacity-60' : ''}`}
            style={p.allDone ? {
              shadowColor: '#F97316', shadowOpacity: 0.35, shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 }, elevation: 6,
            } : undefined}
            activeOpacity={p.allDone ? 0.8 : 1}
          >
            {p.busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className={`text-sm font-bold ${p.allDone ? 'text-white' : 'text-text3'}`}>
                Finalizar visita
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Visor de fotos: zoom + deslizar entre fotos */}
      <PhotoViewer
        uris={p.evidence.map((e) => e.uri)}
        index={previewIndex}
        onClose={() => setPreviewIndex(null)}
      />
    </View>
  );
}
