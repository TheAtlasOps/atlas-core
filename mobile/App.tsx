import './global.css';

import React, { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { useVisits } from './src/hooks/useVisits';
import { updateOrderStatus } from './src/api/orders';
import { CHECKLIST_ITEMS, MAX_PHOTOS } from './src/data/mockData';
import { AgendaScreen } from './src/screens/AgendaScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { SuccessScreen } from './src/screens/SuccessScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import type { Estado, TabId, ViewName } from './src/types';

// ─── App del técnico (sesión iniciada) ────────────────────────────────────────
function AtlasTecnicoApp() {
  const { user, signOut } = useAuth();
  const { visits, loading, refreshing, error, online, reload, refresh, applyOrder } = useVisits();

  const [view, setView]                   = useState<ViewName>('agenda');
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [tab, setTab]                     = useState<TabId>('resumen');
  const [busy, setBusy]                   = useState(false); // hay un cambio de estado en curso
  const [checkedMap, setCheckedMap]       = useState<Record<string, Record<number, boolean>>>({});
  const [evidenceMap, setEvidenceMap]     = useState<Record<string, string[]>>({});
  const [notesMap, setNotesMap]           = useState<Record<string, string>>({});
  const [dbmMap, setDbmMap]               = useState<Record<string, number>>({});
  const [estadoMap, setEstadoMap]         = useState<Record<string, Estado>>({});
  const [fallaNotes, setFallaNotes]       = useState<Record<string, string>>({});
  const [iccidVerified, setIccidVerified] = useState<Record<string, boolean>>({});

  const key       = selectedId ?? '';
  const visit     = visits.find((v) => v.id === selectedId);
  const checked: Record<number, boolean> = checkedMap[key] ?? {};
  const doneCount = CHECKLIST_ITEMS.filter((i) => checked[i.id]).length;
  const allDone   = doneCount === CHECKLIST_ITEMS.length;
  const evidence: string[] = evidenceMap[key] ?? [];
  const dbm       = dbmMap[key] ?? -76;
  const estado: Estado = estadoMap[key] ?? 'operativo';

  function openVisit(id: string) {
    setSelectedId(id);
    setTab('resumen');
    setView('detail');
  }

  function toggleItem(id: number) {
    setCheckedMap((prev) => {
      const current: Record<number, boolean> = prev[key] ?? {};
      return { ...prev, [key]: { ...current, [id]: !current[id] } };
    });
  }

  // "Confirmar ingreso y comenzar": marca la orden como EN_SITIO en el servidor
  async function confirmAccess() {
    if (!visit || busy) return;
    setBusy(true);
    try {
      if (visit.status === 'programada' || visit.status === 'en_ruta') {
        const updated = await updateOrderStatus(visit.id, 'EN_SITIO', 'Técnico confirmó ingreso al sitio (app móvil)');
        applyOrder(updated);
      }
      setCheckedMap((prev) => {
        const current: Record<number, boolean> = prev[key] ?? {};
        return { ...prev, [key]: { ...current, 1: true } };
      });
      setTab('checklist');
    } catch (e) {
      Alert.alert('No se pudo iniciar la visita', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function addEvidence(uri: string) {
    setEvidenceMap((prev) => {
      const arr: string[] = prev[key] ?? [];
      if (arr.length >= MAX_PHOTOS) return prev;
      return { ...prev, [key]: [...arr, uri] };
    });
  }

  function removeEvidence(uri: string) {
    setEvidenceMap((prev) => {
      const arr: string[] = prev[key] ?? [];
      return { ...prev, [key]: arr.filter((u) => u !== uri) };
    });
  }

  // Resumen de lo registrado en terreno: queda guardado en el historial de la orden
  function buildClosingComment(): string {
    const parts: string[] = [];
    const notes = (notesMap[key] ?? '').trim();
    if (notes) parts.push(`Notas: ${notes}`);
    parts.push(`Señal: ${dbm} dBm`);
    if (estado === 'falla') parts.push(`Equipo con falla: ${(fallaNotes[key] ?? '').trim() || 'sin detalle'}`);
    else parts.push('Equipo operativo');
    if (iccidVerified[key]) parts.push('ICCID verificado en terreno');
    parts.push(`Checklist ${doneCount}/${CHECKLIST_ITEMS.length}`);
    return parts.join(' | ');
  }

  async function finalize() {
    if (!visit || busy) return;
    setBusy(true);
    try {
      const updated = await updateOrderStatus(visit.id, 'COMPLETADA', buildClosingComment());
      applyOrder(updated);
      setView('success');
    } catch (e) {
      Alert.alert('No se pudo finalizar la visita', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {view === 'agenda' && (
        <AgendaScreen
          visits={visits}
          loading={loading}
          refreshing={refreshing}
          error={error}
          online={online}
          userName={user?.fullName ?? ''}
          onRefresh={refresh}
          onRetry={reload}
          onLogout={signOut}
          onOpen={openVisit}
        />
      )}

      {view === 'detail' && visit && (
        <DetailScreen
          visit={visit}
          tab={tab}
          setTab={setTab}
          online={online}
          onToggleOnline={refresh}
          busy={busy}
          onBack={() => setView('agenda')}
          checked={checked}
          doneCount={doneCount}
          allDone={allDone}
          onToggle={toggleItem}
          onConfirmAccess={confirmAccess}
          evidence={evidence}
          onAddEvidence={addEvidence}
          onRemoveEvidence={removeEvidence}
          notes={notesMap[key] ?? ''}
          onNotesChange={(t) => setNotesMap((prev) => ({ ...prev, [key]: t }))}
          dbm={dbm}
          onDbmChange={(v) => setDbmMap((prev) => ({ ...prev, [key]: v }))}
          estado={estado}
          onEstadoChange={(v) => setEstadoMap((prev) => ({ ...prev, [key]: v }))}
          fallaNote={fallaNotes[key] ?? ''}
          onFallaNoteChange={(t) => setFallaNotes((prev) => ({ ...prev, [key]: t }))}
          iccidVerified={!!iccidVerified[key]}
          onIccidVerify={() => setIccidVerified((prev) => ({ ...prev, [key]: !prev[key] }))}
          onFinalize={finalize}
        />
      )}

      {view === 'success' && visit && (
        <SuccessScreen visit={visit} online onDone={() => setView('agenda')} />
      )}
    </>
  );
}

// ─── Selector de pantalla según la sesión ─────────────────────────────────────
function Root() {
  const { isDark, colors } = useTheme();
  const { status } = useAuth();

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-bg">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {status === 'loading' && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.brand} />
          </View>
        )}
        {status === 'signedOut' && <LoginScreen />}
        {status === 'signedIn' && <AtlasTecnicoApp />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function AtlasTecnico() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </ThemeProvider>
  );
}
