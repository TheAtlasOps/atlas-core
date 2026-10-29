import React from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeContext';
import type { ThemePreference } from '../theme/ThemeContext';
import { STATUS_META } from '../data/mockData';
import type { Status, IconName } from '../types';

// ─── Componentes reutilizables ────────────────────────────────────────────────
export function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <View className={`flex-row items-center px-[9px] py-[3px] rounded-full ${m.wrapClass}`}>
      <View className={`w-[5px] h-[5px] rounded-[3px] mr-[5px] ${m.dotClass}`} />
      <Text className={`text-[11px] font-medium ${m.textClass}`}>{m.label}</Text>
    </View>
  );
}

export function ConnPill({ online, onToggle }: { online: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onToggle}
      className={`flex-row items-center gap-[5px] border px-2.5 py-1 rounded-full ${
        online ? 'bg-blue/10 border-blue/30' : 'bg-amber/10 border-amber/30'
      }`}
    >
      <Feather name={online ? 'wifi' : 'wifi-off'} size={11} color={online ? colors.blue : colors.amber} />
      <Text className={`text-[11px] font-medium ml-1 ${online ? 'text-blue' : 'text-amber'}`}>
        {online ? 'En línea' : 'Sin conexión'}
      </Text>
    </TouchableOpacity>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[10px] font-semibold tracking-[1.5px] uppercase text-text3 mb-2">
      {children}
    </Text>
  );
}

export function DataRow({ icon, label, value, mono, last }: {
  icon?: IconName; label: string; value: string; mono?: boolean; last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View className={`flex-row items-center py-[9px] ${last ? '' : 'border-b border-border'}`}>
      {icon ? <Feather name={icon} size={13} color={colors.text3} style={{ marginRight: 4 }} /> : null}
      <Text className="text-[11px] text-text3 w-[84px]">{label}</Text>
      <Text
        className={`text-xs text-text1 font-medium flex-1 text-right ${mono ? 'font-mono text-text2' : ''}`}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={`bg-card border border-border rounded-2xl p-3.5 ${className ?? ''}`}>
      {children}
    </View>
  );
}

// ─── Selector de tema ─────────────────────────────────────────────────────────
const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string; icon: IconName }[] = [
  { value: 'system', label: 'Automático', hint: 'Según el dispositivo', icon: 'smartphone' },
  { value: 'light',  label: 'Claro',      hint: 'Siempre claro',        icon: 'sun' },
  { value: 'dark',   label: 'Oscuro',     hint: 'Siempre oscuro',       icon: 'moon' },
];

// Botón del header: el ícono refleja la opción elegida. Abre/cierra el menú.
export function ThemeToggle({ onPress }: { onPress: () => void }) {
  const { preference, colors } = useTheme();
  const icon = THEME_OPTIONS.find((o) => o.value === preference)?.icon ?? 'moon';
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Cambiar tema de la aplicación"
      activeOpacity={0.7}
      className="w-[30px] h-[30px] rounded-full bg-overlay/[0.06] border border-border items-center justify-center"
    >
      <Feather name={icon} size={14} color={colors.text1} />
    </TouchableOpacity>
  );
}

// Menú flotante (tema + cerrar sesión)
export function ThemeMenu({ onClose, onLogout }: { onClose: () => void; onLogout?: () => void }) {
  const { preference, setPreference, colors } = useTheme();
  return (
    <>
      {/* Toque fuera del menú = cerrar */}
      <Pressable onPress={onClose} className="absolute top-0 bottom-0 left-0 right-0" />
      <View
        className="absolute right-4 top-[54px] w-[220px] bg-card border border-border-bright rounded-2xl p-1.5"
        style={{
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 }, elevation: 8,
        }}
      >
        {THEME_OPTIONS.map((o) => {
          const active = preference === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => {
                setPreference(o.value);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              activeOpacity={0.7}
              className={`flex-row items-center gap-2.5 px-2.5 py-2 rounded-xl ${active ? 'bg-brand/10' : ''}`}
            >
              <View className="w-7 h-7 rounded-full bg-overlay/[0.06] items-center justify-center">
                <Feather name={o.icon} size={14} color={active ? colors.brand : colors.text2} />
              </View>
              <View className="flex-1">
                <Text className={`text-[13px] font-semibold ${active ? 'text-brand-text' : 'text-text1'}`}>
                  {o.label}
                </Text>
                <Text className="text-[11px] text-text3">{o.hint}</Text>
              </View>
              {active ? <Feather name="check" size={14} color={colors.brand} /> : null}
            </TouchableOpacity>
          );
        })}

        {onLogout ? (
          <>
            <View className="h-px bg-border my-1.5 mx-1" />
            <TouchableOpacity
              onPress={onLogout}
              accessibilityRole="button"
              activeOpacity={0.7}
              className="flex-row items-center gap-2.5 px-2.5 py-2 rounded-xl"
            >
              <View className="w-7 h-7 rounded-full bg-red-dim items-center justify-center">
                <Feather name="log-out" size={14} color={colors.red} />
              </View>
              <Text className="text-[13px] font-semibold text-red">Cerrar sesión</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </>
  );
}