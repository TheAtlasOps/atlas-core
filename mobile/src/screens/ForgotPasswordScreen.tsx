import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { requestPasswordReset } from '../api/auth';
import { useTheme } from '../theme/ThemeContext';
import { isValidEmail } from '../utils/helpers';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

// ─── Pantalla de recuperación de contraseña ──────────────────────────────────
export function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && !loading;

  async function submit() {
    if (!canSubmit) return;
    setError(null);

    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setError('Ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset(cleanEmail);
      setSuccessMessage(
        res.message ||
          'Si el correo corresponde a una cuenta habilitada, recibirás instrucciones para recuperar el acceso.'
      );
    } catch (e) {
      setError(
        (e as Error).message ||
          'No se pudo procesar la solicitud. Intenta nuevamente más tarde.'
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEmail('');
    setError(null);
    setSuccessMessage(null);
  }

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
        {/* Botón superior Volver */}
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio de sesión"
          className="flex-row items-center mb-6 self-start py-1"
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.text2} />
          <Text className="text-xs text-text2 font-medium ml-1.5">
            Volver al inicio de sesión
          </Text>
        </TouchableOpacity>

        {/* Cabecera / Identidad */}
        <View className="items-center mb-7">
          <View className="w-14 h-14 rounded-2xl bg-card border border-brand/40 items-center justify-center mb-3.5">
            <Feather
              name={successMessage ? 'mail' : 'lock'}
              size={24}
              color={colors.brand}
            />
          </View>
          <Text className="text-text1 font-bold text-[22px] tracking-tight">
            {successMessage ? 'Revisa tu correo' : 'Recuperar contraseña'}
          </Text>
          <Text className="text-xs text-text2 text-center mt-1.5 px-4 leading-4">
            {successMessage
              ? 'Hemos procesado tu solicitud de restablecimiento de contraseña.'
              : 'Ingresa tu correo corporativo y te enviaremos las instrucciones para restablecer tu acceso.'}
          </Text>
        </View>

        {/* Estado de Éxito / Confirmación */}
        {successMessage ? (
          <View className="space-y-4">
            <View className="rounded-2xl border border-green/30 bg-green-dim p-4">
              <View className="flex-row items-center mb-2">
                <Feather name="check-circle" size={18} color={colors.green} />
                <Text className="text-sm font-bold text-green ml-2">
                  Instrucciones enviadas
                </Text>
              </View>
              <Text className="text-xs text-text2 leading-5 mb-3">
                {successMessage}
              </Text>
              <View className="border-t border-green/20 pt-3">
                <Text className="text-[11px] text-text3 leading-4">
                  1. Abre el enlace que recibiste en tu correo para ingresar una nueva contraseña.{'\n'}
                  2. Una vez guardada, regresa a esta aplicación e inicia sesión con tu nueva clave.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onBack}
              accessibilityRole="button"
              className="rounded-xl py-[13px] items-center bg-brand mt-2"
              activeOpacity={0.8}
            >
              <Text className="text-sm font-bold text-white">
                Ir a iniciar sesión
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={resetForm}
              accessibilityRole="button"
              className="py-2.5 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-xs text-brand font-medium">
                Intentar con otro correo
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Formulario de Solicitud */
          <View>
            <Text className="text-[11px] text-text3 mb-1.5">
              Correo electrónico registrado
            </Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              placeholder="tu.correo@empresa.cl"
              placeholderTextColor={colors.text3}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="done"
              onSubmitEditing={submit}
              editable={!loading}
              className="bg-card border border-border rounded-xl px-3 py-3 text-text1 text-[14px] mb-3.5"
            />

            {error ? (
              <View className="flex-row items-start rounded-xl border border-red/30 bg-red-dim px-3 py-2.5 mb-4">
                <Feather
                  name="alert-circle"
                  size={14}
                  color={colors.red}
                  style={{ marginTop: 1 }}
                />
                <Text className="text-xs text-red ml-2 flex-1">{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={submit}
              disabled={!canSubmit}
              accessibilityRole="button"
              className={`rounded-xl py-[13px] items-center ${
                canSubmit ? 'bg-brand' : 'bg-surface'
              }`}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  className={`text-sm font-bold ${
                    canSubmit ? 'text-white' : 'text-text3'
                  }`}
                >
                  Enviar instrucciones
                </Text>
              )}
            </TouchableOpacity>

            {loading ? (
              <Text className="text-[10px] text-text3 text-center mt-3">
                Conectando con el servidor seguro de ATLAS…
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
