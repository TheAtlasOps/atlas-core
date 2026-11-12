import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';

interface LoginScreenProps {
  onForgotPassword?: () => void;
}

// ─── Pantalla de inicio de sesión ─────────────────────────────────────────────
export function LoginScreen({ onForgotPassword }: LoginScreenProps = {}) {
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
      setError((e as Error).message || 'Correo electrónico o contraseña incorrectos.');
      setLoading(false);
    }
  }

  const message = error ?? notice;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-6 py-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera / Identidad ATLAS */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-2xl bg-card border border-border-bright items-center justify-center mb-4 shadow-lg shadow-black/40 overflow-hidden">
            <Image
              source={require('../../assets/atlas-logo.png')}
              className="w-16 h-16 rounded-xl"
              resizeMode="contain"
              accessibilityLabel="Logotipo oficial de ATLAS"
            />
          </View>

          <View className="flex-row items-center px-3 py-1 rounded-full bg-brand-dim border border-brand/30 mb-2.5">
            <Feather name="zap" size={12} color={colors.brandText} style={{ marginRight: 6 }} />
            <Text className="text-[11px] font-semibold text-brand-text tracking-wide uppercase">
              Atlas FSM · App Técnico
            </Text>
          </View>

          <Text className="text-text1 font-bold text-2xl tracking-tight">
            Portal Móvil
          </Text>
          <Text className="text-xs text-text2 mt-1.5 text-center max-w-[260px]">
            Inicia sesión con tus credenciales autorizadas para gestionar tus visitas en terreno
          </Text>
        </View>

        {/* Tarjeta de Formulario */}
        <View className="bg-card border border-border rounded-2xl p-5 mb-4 shadow-sm">
          {/* Campo Correo */}
          <Text className="text-[12px] font-medium text-text2 mb-1.5">
            Correo electrónico
          </Text>
          <View className="flex-row items-center bg-surface/60 border border-border-bright rounded-xl px-3.5 mb-4">
            <Feather name="mail" size={16} color={colors.text3} style={{ marginRight: 10 }} />
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
              className="flex-1 py-3 text-text1 text-[14px]"
            />
          </View>

          {/* Campo Contraseña */}
          <Text className="text-[12px] font-medium text-text2 mb-1.5">
            Contraseña
          </Text>
          <View className="flex-row items-center bg-surface/60 border border-border-bright rounded-xl px-3.5 mb-5">
            <Feather name="lock" size={16} color={colors.text3} style={{ marginRight: 10 }} />
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
              className="flex-1 py-3 text-text1 text-[14px]"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="p-1"
              activeOpacity={0.7}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={colors.text3} />
            </TouchableOpacity>
          </View>

          {/* Mensajes de Error o Aviso */}
          {message ? (
            <View
              className={`flex-row items-start rounded-xl border px-3.5 py-3 mb-5 ${
                error ? 'bg-red-dim border-red/40' : 'bg-amber-dim border-amber/40'
              }`}
            >
              <Feather
                name={error ? 'alert-circle' : 'info'}
                size={16}
                color={error ? colors.red : colors.amber}
                style={{ marginTop: 1, marginRight: 8 }}
              />
              <Text className={`text-xs flex-1 leading-5 ${error ? 'text-red' : 'text-amber'}`}>
                {message}
              </Text>
            </View>
          ) : null}

          {/* Botón de Acceso */}
          <TouchableOpacity
            onPress={submit}
            disabled={!canSubmit}
            className={`rounded-xl py-3.5 items-center justify-center flex-row gap-2 ${
              canSubmit ? 'bg-brand' : 'bg-surface opacity-70'
            }`}
            style={canSubmit ? {
              shadowColor: '#F97316',
              shadowOpacity: 0.35,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            } : undefined}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text className={`text-sm font-bold ${canSubmit ? 'text-white' : 'text-text3'}`}>
                  Iniciar sesión
                </Text>
                <Feather
                  name="arrow-right"
                  size={15}
                  color={canSubmit ? '#ffffff' : colors.text3}
                />
              </>
            )}
          </TouchableOpacity>

          {loading ? (
            <Text className="text-[11px] text-text3 text-center mt-3 leading-4">
              Conectando con el servidor ATLAS… La primera conexión puede tardar unos segundos.
            </Text>
          ) : null}

          {/* Link Olvidaste Contraseña */}
          {onForgotPassword ? (
            <TouchableOpacity
              onPress={onForgotPassword}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="¿Olvidaste tu contraseña?"
              className="mt-4 py-2 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-xs font-semibold text-brand">
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Footer corporativo */}
        <View className="items-center mt-4">
          <Text className="text-[11px] text-text3">
            ATLAS FSM · Versión 1.0.4 · Conexión segura
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}