import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ConnPill, StatusBadge, ThemeMenu, ThemeToggle } from '../components/common';
import { useTheme } from '../theme/ThemeContext';
import { SERVICE_COLOR, SERVICE_ICON } from '../data/mockData';
import type { Visit } from '../types';

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
  const completed = visits.filter((v) => v.status === 'completada').length;
  const today = new Date();

  function confirmLogout() {
    setMenuOpen(false);
    Alert.alert('Cerrar sesión', '¿Quieres cerrar tu sesión en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: onLogout },
    ]);
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
            <View className="w-[30px] h-[30px] rounded-[9px] bg-card border border-brand/40 items-center justify-center">
              <Text className="text-brand text-base font-bold">A</Text>
            </View>
            <View className="ml-2 flex-shrink">
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
            <Text className="text-text1 font-bold text-[26px] tracking-tight">{visits.length}</Text>
            <Text className="text-[10px] text-text3 tracking-[0.5px]">
              VISITAS · {completed} OK
            </Text>
          </View>
        </View>

        {/* Cargando (primera vez) */}
        {loading && (
          <View className="items-center py-10">
            <ActivityIndicator color={colors.brand} />
            <Text className="text-xs text-text2 mt-3">Cargando tus visitas…</Text>
            <Text className="text-[10px] text-text3 mt-1 text-center">
              Si el servidor estaba inactivo, puede tardar hasta un minuto.
            </Text>
          </View>
        )}

        {/* Error */}
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

        {/* Sin visitas */}
        {!loading && !error && visits.length === 0 && (
          <View className="items-center py-10">
            <Feather name="inbox" size={26} color={colors.text3} />
            <Text className="text-sm text-text1 font-semibold mt-3">No tienes visitas asignadas</Text>
            <Text className="text-[11px] text-text3 mt-1 text-center">
              Cuando el coordinador te asigne una orden aparecerá aquí.{'\n'}Desliza hacia abajo para actualizar.
            </Text>
          </View>
        )}

        {/* Visit cards */}
        {visits.map((v) => {
          const accentColor = SERVICE_COLOR[v.serviceType] || colors.brand;
          const iconName    = SERVICE_ICON[v.serviceType] || 'tool';
          const isCompleted = v.status === 'completada';
          return (
            <TouchableOpacity
              key={v.id}
              onPress={() => onOpen(v.id)}
              className={`bg-card border border-border-bright rounded-2xl p-3 pl-4 mb-2 relative overflow-hidden ${
                isCompleted ? 'opacity-[0.55]' : ''
              }`}
              activeOpacity={0.75}
            >
              {/* left accent bar */}
              <View
                className="absolute left-0 top-2 bottom-2 w-[3px] rounded-[2px]"
                style={{ backgroundColor: isCompleted ? colors.text3 : accentColor }}
              />

              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Feather name="clock" size={11} color={colors.text3} />
                  <Text className="font-mono text-[11px] text-text3 ml-1">{v.time}</Text>
                </View>
                <StatusBadge status={v.status} />
              </View>

              <View className="flex-row items-center justify-between">
                <View
                  className="w-9 h-9 rounded-[10px] border items-center justify-center"
                  style={{ backgroundColor: accentColor + '20', borderColor: accentColor + '35' }}
                >
                  <Feather name={iconName} size={16} color={accentColor} />
                </View>
                <View className="flex-1 ml-2.5">
                  <Text className="text-text1 font-bold text-[13px]">{v.service}</Text>
                  <Text className="text-xs text-text2">{v.client}</Text>
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
        })}
      </ScrollView>

      {/* Menú de tema y sesión (flota sobre la pantalla) */}
      {menuOpen && <ThemeMenu onClose={() => setMenuOpen(false)} onLogout={confirmLogout} />}
    </View>
  );
}
