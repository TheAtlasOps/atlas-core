import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeContext';
import type { Visit } from '../types';

// ─── Pantalla Éxito ───────────────────────────────────────────────────────────
type SuccessProps = {
  visit: Visit;
  online: boolean;
  onDone: () => void;
};

export function SuccessScreen({ visit, online, onDone }: SuccessProps) {
  const { colors } = useTheme();
  return (
    <View className="flex-1 items-center justify-center p-6">
      <View className="w-16 h-16 rounded-full bg-green-dim border border-green/25 items-center justify-center mb-[18px]">
        <Feather name="check-circle" size={30} color={colors.green} />
      </View>
      <Text className="text-text1 font-bold text-[22px] mb-1.5 tracking-tight">Visita finalizada</Text>
      <Text className="text-xs text-text2 mb-5 text-center max-w-[230px]">
        {visit.service} · {visit.client}
      </Text>
      <View
        className={`flex-row items-center px-3.5 py-[7px] rounded-full border mb-7 ${
          online ? 'bg-green-dim border-green/30' : 'bg-brand-dim border-brand/30'
        }`}
      >
        <Feather name={online ? 'check' : 'alert-triangle'} size={12} color={online ? colors.green : colors.brandText} />
        <Text className={`text-xs ml-1.5 font-medium ${online ? 'text-green' : 'text-brand-text'}`}>
          {online ? 'Sincronizada con el sistema' : 'Guardada · pendiente de sincronizar'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDone}
        className="bg-brand rounded-xl py-[13px] px-8 items-center"
        style={{
          shadowColor: '#F97316', shadowOpacity: 0.35, shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 }, elevation: 6,
        }}
      >
        <Text className="text-white text-sm font-bold">Volver a mis visitas</Text>
      </TouchableOpacity>
    </View>
  );
}