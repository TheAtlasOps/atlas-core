import './global.css';

import React, { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { useVisits } from './src/hooks/useVisits';
import { updateOrderStatus } from './src/api/orders';
import { uploadEvidenceFile, createEvidenceRecord, saveSignalMeasurement } from './src/api/evidences';
import { CHECKLIST_ITEMS, MAX_PHOTOS } from './src/data/mockData';
import { AgendaScreen } from './src/screens/AgendaScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { SuccessScreen } from './src/screens/SuccessScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import type { Estado, TabId, ViewName, PhotoEvidence } from './src/types';

// ─── App del técnico (sesión iniciada) ────────────────────────────────────────
function AtlasTecnicoApp() {
  const { user, signOut } = useAuth();
  const { visits, loading, refreshing, error, online, reload, refresh, applyOrder } = useVisits();

  const [view, setView]                   = useState<ViewName>('agenda');
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [tab, setTab]                     = useState<TabId>('resumen');
  const [busy, setBusy]                   = useState(false); // hay un cambio de estado en curso
  const [checkedMap, setCheckedMap]       = useState<Record<string, Record<number, boolean>>>({});
  const [evidenceMap, setEvidenceMap]     = useState<Record<string, PhotoEvidence[]>>({});
  const [signalSyncedMap, setSignalSyncedMap] = useState<Record<string, string>>({});
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
  const evidence: PhotoEvidence[] = evidenceMap[key] ?? [];
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

  /**
   * Sube el archivo a Neon Object Storage y persiste la relación en Neon PostgreSQL.
   * Evita duplicaciones y conserva la clave si la llamada subsiguiente falla.
   */
  async function uploadAndRegisterPhoto(orderId: string, item: PhotoEvidence) {
    try {
      let storageUrl = item.storageUrl;

      // Paso 1: Subida física a Neon Object Storage si aún no tiene storageUrl
      if (!storageUrl) {
        const uploadRes = await uploadEvidenceFile(orderId, item.uri);
        storageUrl = uploadRes.storage_url;

        setEvidenceMap((prev) => {
          const list = prev[orderId] ?? [];
          return {
            ...prev,
            [orderId]: list.map((p) => (p.id === item.id ? { ...p, storageUrl } : p)),
          };
        });
      }

      // Paso 2: Registro formal de la evidencia en PostgreSQL
      const evRes = await createEvidenceRecord({
        work_order_id: orderId,
        evidence_type: item.type,
        storage_url: storageUrl,
        notes: `Fotografía (${item.type === 'FOTO_ANTES' ? 'previa' : 'posterior'}) capturada en terreno desde ATLAS Mobile`,
      });

      setEvidenceMap((prev) => {
        const list = prev[orderId] ?? [];
        return {
          ...prev,
          [orderId]: list.map((p) =>
            p.id === item.id ? { ...p, status: 'synced', evidenceId: evRes.id, error: undefined } : p
          ),
        };
      });
    } catch (err) {
      const msg = (err as Error).message || 'Error en subida de evidencia a Neon';
      setEvidenceMap((prev) => {
        const list = prev[orderId] ?? [];
        return {
          ...prev,
          [orderId]: list.map((p) =>
            p.id === item.id ? { ...p, status: 'error', error: msg } : p
          ),
        };
      });
    }
  }

  function addEvidence(uri: string, type: 'FOTO_ANTES' | 'FOTO_DESPUES') {
    if (!selectedId) return;
    const newId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newItem: PhotoEvidence = {
      id: newId,
      uri,
      type,
      status: 'uploading',
    };

    setEvidenceMap((prev) => {
      const current = prev[key] ?? [];
      if (current.length >= MAX_PHOTOS) return prev;
      return { ...prev, [key]: [...current, newItem] };
    });

    void uploadAndRegisterPhoto(selectedId, newItem);
  }

  function retryEvidence(id: string) {
    if (!selectedId) return;
    const current = evidenceMap[key] ?? [];
    const item = current.find((p) => p.id === id);
    if (!item || item.status === 'synced') return;

    setEvidenceMap((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((p) => (p.id === id ? { ...p, status: 'uploading', error: undefined } : p)),
    }));

    void uploadAndRegisterPhoto(selectedId, { ...item, status: 'uploading', error: undefined });
  }

  function toggleEvidenceType(id: string) {
    setEvidenceMap((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((p) =>
        p.id === id
          ? { ...p, type: p.type === 'FOTO_ANTES' ? 'FOTO_DESPUES' : 'FOTO_ANTES' }
          : p
      ),
    }));
  }

  function removeEvidence(id: string) {
    setEvidenceMap((prev) => {
      const current = prev[key] ?? [];
      return { ...prev, [key]: current.filter((p) => p.id !== id) };
    });
  }

  // Resumen de lo registrado en terreno: queda guardado en el historial de la orden
  function buildClosingComment(): string {
    const parts: string[] = [];
    const notes = (notesMap[key] ?? '').trim();
    if (notes) parts.push(`Notas: ${notes}`);
    parts.push(`Señal medida en terreno: ${dbm} dBm`);
    if (estado === 'falla') parts.push(`Equipo con falla: ${(fallaNotes[key] ?? '').trim() || 'sin detalle'}`);
    else parts.push('Equipo operativo');
    if (iccidVerified[key]) parts.push('ICCID verificado en terreno');
    parts.push(`Checklist ${doneCount}/${CHECKLIST_ITEMS.length}`);
    return parts.join(' | ');
  }

  /**
   * Finalización de visita con validaciones estrictas:
   * 1. Ninguna foto puede quedar en error o pendiente de subida.
   * 2. Se persiste la medición manual de señal (dBm).
   * 3. Se respeta la transición de estados (EN_SITIO -> COMPLETADA).
   */
  async function finalize() {
    if (!visit || busy) return;

    // Validación 1: fotos actualmente subiéndose
    const currentEvidence = evidenceMap[key] ?? [];
    const uploadingCount = currentEvidence.filter((p) => p.status === 'uploading').length;
    if (uploadingCount > 0) {
      Alert.alert(
        'Subida en progreso',
        'Hay fotografías subiéndose a Neon Object Storage. Espera a que finalicen antes de cerrar la orden.'
      );
      return;
    }

    // Validación 2: fotos en estado de error
    const errorCount = currentEvidence.filter((p) => p.status === 'error').length;
    if (errorCount > 0) {
      Alert.alert(
        'Evidencias pendientes',
        'Hay fotografías con error de subida a Neon. Por favor pulsa "Reintentar" antes de finalizar la visita.'
      );
      return;
    }

    setBusy(true);
    try {
      // Validación 3: registrar medición técnica de señal (dBm) si aún no está registrada
      if (!signalSyncedMap[key]) {
        const notes = (notesMap[key] ?? '').trim();
        const signalRes = await saveSignalMeasurement(
          visit.id,
          dbm,
          notes ? `Medición manual ingresada en terreno: ${dbm} dBm. ${notes}` : undefined
        );
        setSignalSyncedMap((prev) => ({ ...prev, [key]: signalRes.id }));
      }

      // Validación 4: asegurar transición permitida (si aún estaba en programada o en_ruta -> EN_SITIO)
      if (visit.status === 'programada' || visit.status === 'en_ruta') {
        const inSite = await updateOrderStatus(visit.id, 'EN_SITIO', 'Transición a sitio previa a cierre');
        applyOrder(inSite);
      }

      // Validación 5: marcar orden como COMPLETADA
      const updated = await updateOrderStatus(visit.id, 'COMPLETADA', buildClosingComment());
      applyOrder(updated);
      setView('success');
    } catch (e) {
      Alert.alert(
        'No se pudo finalizar la visita',
        (e as Error).message || 'Ocurrió un error al guardar las evidencias en Neon y cerrar la orden.'
      );
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
          onRetryEvidence={retryEvidence}
          onToggleEvidenceType={toggleEvidenceType}
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
