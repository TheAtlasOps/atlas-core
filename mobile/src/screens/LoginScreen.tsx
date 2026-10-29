import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';

// ─── Pantalla de inicio de sesión ─────────────────────────────────────────────
export function LoginScreen() {
  const { colors } = useTheme();
  const { signIn, notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      // al iniciar sesión, App cambia sola a la agenda
    } catch (e) {
      setError((e as Error).message || 'No se pudo iniciar sesión.');
      setLoading(false);
    }
  }

  const message = error ?? notice;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center p-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-8">
          <View className="w-14 h-14 rounded-2xl bg-card border border-brand/40 items-center justify-center mb-3.5">
            <Text className="text-brand text-[26px] font-bold">A</Text>
          </View>
          <Text className="text-text1 font-bold text-[22px] tracking-tight">Atlas técnico</Text>
          <Text className="text-xs text-text2 mt-1">Inicia sesión para ver tus visitas</Text>
        </View>

        <Text className="text-[11px] text-text3 mb-1.5">Correo electrónico</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="tu.correo@empresa.cl"
          placeholderTextColor={colors.text3}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!loading}
          className="bg-card border border-border rounded-xl px-3 py-3 text-text1 text-[14px] mb-3.5"
        />

        <Text className="text-[11px] text-text3 mb-1.5">Contraseña</Text>
        <View className="flex-row items-center bg-card border border-border rounded-xl mb-4">
          <TextInput
            ref={passwordRef}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.text3}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!loading}
            className="flex-1 px-3 py-3 text-text1 text-[14px]"
          />
          <TouchableOpacity
            onPress={() => setShowPassword((s) => !s)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="px-3 py-3"
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={colors.text3} />
          </TouchableOpacity>
        </View>

        {message ? (
          <View
            className={`flex-row items-start rounded-xl border px-3 py-2.5 mb-4 ${
              error ? 'bg-red-dim border-red/30' : 'bg-amber-dim border-amber/30'
            }`}
          >
            <Feather
              name={error ? 'alert-circle' : 'info'}
              size={14}
              color={error ? colors.red : colors.amber}
              style={{ marginTop: 1 }}
            />
            <Text className={`text-xs ml-2 flex-1 ${error ? 'text-red' : 'text-amber'}`}>{message}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={submit}
          disabled={!canSubmit}
          className={`rounded-xl py-[13px] items-center ${canSubmit ? 'bg-brand' : 'bg-surface'}`}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={`text-sm font-bold ${canSubmit ? 'text-white' : 'text-text3'}`}>
              Iniciar sesión
            </Text>
          )}
        </TouchableOpacity>
        {loading ? (
          <Text className="text-[10px] text-text3 text-center mt-3">
            Conectando con el servidor… la primera vez puede tardar hasta un minuto.
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}