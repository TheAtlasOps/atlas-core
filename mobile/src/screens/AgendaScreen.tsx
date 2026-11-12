import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ConnPill, StatusBadge, ThemeMenu, ThemeToggle } from '../components/common';
import { useTheme } from '../theme/ThemeContext';
import { SERVICE_COLOR, SERVICE_ICON } from '../data/mockData';
import type { Visit } from '../types';
import {
  getSchedulingInfo,
  sortPendingVisits,
  sortHistoryVisits,
} from '../utils/scheduling';

// ─── Pantalla Agenda ──────────────────────────────────────────────────────────
const DAYS   = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                'septiembre', 'octubre', 'noviembre', 'diciembre'];

type AgendaProps = {
  visits: Visit[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  online: boolean;
  userName: string;
  onRefresh: () => void;
  onRetry: () => void;
  onLogout: () => void;
  onOpen: (id: string) => void;
};

export function AgendaScreen({
  visits, loading, refreshing, error, online, userName, onRefresh, onRetry, onLogout, onOpen,
}: AgendaProps) {
  const { colors } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'historial'>('pendientes');
  const today = new Date();

  // Separación y ordenamiento de visitas
  const { pendingVisits, completedVisits, scheduledPending, unscheduledPending } = useMemo(() => {
    const pending = visits.filter((v) => v.status !== 'completada');
    const completed = visits.filter((v) => v.status === 'completada');

    const sortedPending = sortPendingVisits(pending, today);
    const sortedHistory = sortHistoryVisits(completed);

    const scheduled = sortedPending.filter((v) => Boolean(v.scheduledDate));
    const unscheduled = sortedPending.filter((v) => !v.scheduledDate);

    return {
      pendingVisits: sortedPending,
      completedVisits: sortedHistory,
      scheduledPending: scheduled,
      unscheduledPending: unscheduled,
    };
  }, [visits]);

  function confirmLogout() {
    setMenuOpen(false);
    Alert.alert('Cerrar sesión', '¿Quieres cerrar tu sesión en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: onLogout },
    ]);
  }

  // Renderizador de tarjeta de visita
  function renderVisitCard(v: Visit) {
    const accentColor = SERVICE_COLOR[v.serviceType] || colors.brand;
    const iconName    = SERVICE_ICON[v.serviceType] || 'tool';
    const isCompleted = v.status === 'completada';
    const schedule    = getSchedulingInfo(v.scheduledDate, v.status, today);

    // Color del icono del badge de programación
    const badgeIconColor =
      schedule.category === 'ATRASADA'
        ? colors.red
        : schedule.category === 'HOY'
        ? colors.brandText
        : schedule.category === 'PROXIMA'
        ? colors.blue
        : colors.text3;

    return (
      <TouchableOpacity
        key={v.id}
        onPress={() => onOpen(v.id)}
        className={`bg-card border border-border-bright rounded-2xl p-3 pl-4 mb-2.5 relative overflow-hidden ${
          isCompleted ? 'opacity-[0.70]' : ''
        }`}
        activeOpacity={0.75}
      >
        {/* Barra lateral de acento */}
        <View
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-[2px]"
          style={{ backgroundColor: isCompleted ? colors.green : accentColor }}
        />

        {/* Cabecera de la tarjeta: Badge de programación + Estado */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1 mr-2">
            <View
              className={`flex-row items-center px-2 py-0.5 rounded-full border mr-2 ${schedule.badgeClass}`}
            >
              <Feather
                name={schedule.iconName}
                size={10}
                color={badgeIconColor}
                style={{ marginRight: 4 }}
              />
              <Text className={`text-[10px] font-bold ${schedule.textClass}`}>
                {schedule.label}
              </Text>
            </View>

            <Text className="font-mono text-[11px] text-text2 flex-shrink" numberOfLines={1}>
              {schedule.displayDateTime}
            </Text>
          </View>

          <StatusBadge status={v.status} />
        </View>

        {/* Contenido principal de la tarjeta */}
        <View className="flex-row items-center justify-between">
          <View
            className="w-9 h-9 rounded-[10px] border items-center justify-center"
            style={{ backgroundColor: accentColor + '20', borderColor: accentColor + '35' }}
          >
            <Feather name={iconName} size={16} color={accentColor} />
          </View>
          <View className="flex-1 ml-2.5">
            <Text className="text-text1 font-bold text-[13px]" numberOfLines={2}>
              {v.title || v.service}
            </Text>
            <Text className="text-xs text-text2 mt-0.5" numberOfLines={1}>
              {v.client}{v.service && v.service !== v.title ? ` · ${v.service}` : ''}
            </Text>
            <View className="flex-row items-center mt-1">
              <Feather name="map-pin" size={11} color={colors.text3} />
              <Text
                className="text-text2 text-[11px] ml-1 flex-shrink"
                numberOfLines={1}
              >
                {v.address}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={14} color={colors.text3} style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-8"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setMenuOpen(false)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-[32px] h-[32px] rounded-[9px] bg-card border border-border-bright items-center justify-center overflow-hidden">
              <Image
                source={require('../../assets/atlas-logo.png')}
                className="w-[28px] h-[28px] rounded-[8px]"
                resizeMode="contain"
                accessibilityLabel="Logotipo oficial de ATLAS"
              />
            </View>
            <View className="ml-2.5 flex-shrink">
              <Text className="text-sm font-semibold text-text1">Atlas técnico</Text>
              {userName ? (
                <Text className="text-[10px] text-text3" numberOfLines={1}>{userName}</Text>
              ) : null}
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <ThemeToggle onPress={() => setMenuOpen((o) => !o)} />
            <ConnPill online={online} onToggle={onRefresh} />
          </View>
        </View>

        {/* Day banner */}
        <View className="bg-card border border-border rounded-2xl p-3.5 mt-4 mb-3.5 flex-row justify-between items-center">
          <View>
            <Text className="font-mono text-[10px] text-text3 tracking-[1px]">{DAYS[today.getDay()]}</Text>
            <Text className="text-text1 font-bold text-xl mt-0.5 tracking-tight">
              {today.getDate()} de {MONTHS[today.getMonth()]}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-text1 font-bold text-[26px] tracking-tight">{pendingVisits.length}</Text>
            <Text className="text-[10px] text-text3 tracking-[0.5px]">
              PENDIENTES · {completedVisits.length} OK
            </Text>
          </View>
        </View>

        {/* Selector de navegación: Pendientes vs Historial */}
        <View className="flex-row p-1 bg-card border border-border rounded-xl mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab('pendientes')}
            className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${
              activeTab === 'pendientes' ? 'bg-brand' : 'bg-transparent'
            }`}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityLabel={`Pendientes, ${pendingVisits.length} órdenes`}
          >
            <Feather
              name="calendar"
              size={13}
              color={activeTab === 'pendientes' ? '#ffffff' : colors.text2}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'pendientes' ? 'text-white' : 'text-text2'
              }`}
            >
              Pendientes
            </Text>
            <View
              className={`ml-2 px-1.5 py-0.5 rounded-full ${
                activeTab === 'pendientes' ? 'bg-white/25' : 'bg-surface'
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  activeTab === 'pendientes' ? 'text-white' : 'text-text3'
                }`}
              >
                {pendingVisits.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('historial')}
            className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${
              activeTab === 'historial' ? 'bg-brand' : 'bg-transparent'
            }`}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityLabel={`Historial, ${completedVisits.length} órdenes completadas`}
          >
            <Feather
              name="check-circle"
              size={13}
              color={activeTab === 'historial' ? '#ffffff' : colors.text2}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'historial' ? 'text-white' : 'text-text2'
              }`}
            >
              Historial
            </Text>
            <View
              className={`ml-2 px-1.5 py-0.5 rounded-full ${
                activeTab === 'historial' ? 'bg-white/25' : 'bg-surface'
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  activeTab === 'historial' ? 'text-white' : 'text-text3'
                }`}
              >
                {completedVisits.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Estado de carga */}
        {loading && (
          <View className="items-center py-10">
            <ActivityIndicator color={colors.brand} />
            <Text className="text-xs text-text2 mt-3">Cargando tus visitas…</Text>
            <Text className="text-[10px] text-text3 mt-1 text-center">
              Si el servidor estaba inactivo, puede tardar hasta un minuto.
            </Text>
          </View>
        )}

        {/* Estado de error */}
        {!loading && error && (
          <View className="bg-red-dim border border-red/30 rounded-2xl p-3.5 mb-3">
            <View className="flex-row items-start">
              <Feather name="alert-circle" size={14} color={colors.red} style={{ marginTop: 1 }} />
              <Text className="text-xs text-red ml-2 flex-1">{error}</Text>
            </View>
            <TouchableOpacity
              onPress={onRetry}
              className="self-start mt-2.5 px-3 py-1.5 rounded-full border border-red/40"
              activeOpacity={0.7}
            >
              <Text className="text-[11px] font-semibold text-red">Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sin visitas en absoluto */}
        {!loading && !error && visits.length === 0 && (
          <View className="items-center py-10">
            <Feather name="inbox" size={26} color={colors.text3} />
            <Text className="text-sm text-text1 font-semibold mt-3">No tienes visitas asignadas</Text>
            <Text className="text-[11px] text-text3 mt-1 text-center">
              Cuando el coordinador te asigne una orden aparecerá aquí.{'\n'}Desliza hacia abajo para actualizar.
            </Text>
          </View>
        )}

        {/* ─── PESTAÑA: PENDIENTES ─── */}
        {!loading && !error && activeTab === 'pendientes' && visits.length > 0 && (
          <View>
            {pendingVisits.length === 0 ? (
              <View className="items-center py-10 px-4 bg-card border border-border rounded-2xl my-2">
                <View className="w-12 h-12 rounded-full bg-green-dim border border-green/30 items-center justify-center mb-3">
                  <Feather name="check" size={22} color={colors.green} />
                </View>
                <Text className="text-sm text-text1 font-bold text-center">
                  ¡Todas tus visitas están completadas!
                </Text>
                <Text className="text-xs text-text2 mt-1 text-center">
                  No tienes órdenes pendientes por ejecutar en este momento.
                </Text>
                {completedVisits.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setActiveTab('historial')}
                    className="mt-4 px-4 py-2 rounded-xl bg-surface border border-border flex-row items-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-semibold text-brand mr-1">
                      Ver historial ({completedVisits.length})
                    </Text>
                    <Feather name="arrow-right" size={13} color={colors.brand} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                {/* 1. Órdenes con fecha programada (ordenadas de más próxima a más lejana) */}
                {scheduledPending.map(renderVisitCard)}

                {/* 2. Sección separada para órdenes sin programar */}
                {unscheduledPending.length > 0 && (
                  <>
                    {scheduledPending.length > 0 && (
                      <View className="flex-row items-center my-3 px-1">
                        <View className="h-[1px] flex-1 bg-border" />
                        <View className="flex-row items-center px-2.5">
                          <Feather name="help-circle" size={11} color={colors.text3} style={{ marginRight: 5 }} />
                          <Text className="text-[10px] font-bold text-text3 uppercase tracking-wider">
                            Sin programar ({unscheduledPending.length})
                          </Text>
                        </View>
                        <View className="h-[1px] flex-1 bg-border" />
                      </View>
                    )}
                    {unscheduledPending.map(renderVisitCard)}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* ─── PESTAÑA: HISTORIAL ─── */}
        {!loading && !error && activeTab === 'historial' && visits.length > 0 && (
          <View>
            {completedVisits.length === 0 ? (
              <View className="items-center py-10 px-4 bg-card border border-border rounded-2xl my-2">
                <Feather name="archive" size={24} color={colors.text3} />
                <Text className="text-sm text-text1 font-semibold mt-3 text-center">
                  Sin visitas en el historial
                </Text>
                <Text className="text-xs text-text2 mt-1 text-center">
                  Las órdenes que completes en terreno se archivarán aquí para su consulta.
                </Text>
              </View>
            ) : (
              completedVisits.map(renderVisitCard)
            )}
          </View>
        )}
      </ScrollView>

      {/* Menú de tema y sesión (flota sobre la pantalla) */}
      {menuOpen && <ThemeMenu onClose={() => setMenuOpen(false)} onLogout={confirmLogout} />}
    </View>
  );
}
