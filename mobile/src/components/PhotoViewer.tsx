import React, { useState } from 'react';
import {
  FlatList, Image, Modal, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// ─── Visor de fotos: zoom (pellizco / doble toque) + deslizar entre fotos ─────
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

function clamp(v: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, v));
}

// ─── Una foto con zoom ────────────────────────────────────────────────────────
function ZoomableImage({ uri, width, height, onZoomChange }: {
  uri: string;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale   = useSharedValue(1);
  const tx      = useSharedValue(0);
  const ty      = useSharedValue(0);
  const startS  = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const startFx = useSharedValue(0);
  const startFy = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  function markZoomed(z: boolean) {
    setZoomed(z);
    onZoomChange(z);
  }

  function resetZoom() {
    scale.value = withTiming(1);
    tx.value    = withTiming(0);
    ty.value    = withTiming(0);
    markZoomed(false);
  }

  // Pellizco: el punto bajo los dedos se mantiene fijo mientras se amplía
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart((e) => {
      startS.value  = scale.value;
      startTx.value = tx.value;
      startTy.value = ty.value;
      startFx.value = e.focalX - width / 2;
      startFy.value = e.focalY - height / 2;
    })
    .onUpdate((e) => {
      const s     = clamp(startS.value * e.scale, 1, MAX_SCALE);
      const ratio = s / startS.value;
      const fx    = e.focalX - width / 2;
      const fy    = e.focalY - height / 2;
      const limX  = (width * (s - 1)) / 2;
      const limY  = (height * (s - 1)) / 2;
      scale.value = s;
      tx.value    = clamp(fx - (startFx.value - startTx.value) * ratio, -limX, limX);
      ty.value    = clamp(fy - (startFy.value - startTy.value) * ratio, -limY, limY);
    })
    .onEnd(() => {
      if (scale.value < 1.05) resetZoom();
      else markZoomed(true);
    });

  // Arrastrar la foto ampliada (solo activo cuando hay zoom)
  const pan = Gesture.Pan()
    .runOnJS(true)
    .enabled(zoomed)
    .maxPointers(1)
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      const limX = (width * (scale.value - 1)) / 2;
      const limY = (height * (scale.value - 1)) / 2;
      tx.value = clamp(startTx.value + e.translationX, -limX, limX);
      ty.value = clamp(startTy.value + e.translationY, -limY, limY);
    });

  // Doble toque: ampliar hacia el punto tocado / volver al tamaño original
  const doubleTap = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((e, success) => {
      if (!success) return;
      if (scale.value > 1) {
        resetZoom();
        return;
      }
      const s    = DOUBLE_TAP_SCALE;
      const fx   = e.x - width / 2;
      const fy   = e.y - height / 2;
      const limX = (width * (s - 1)) / 2;
      const limY = (height * (s - 1)) / 2;
      scale.value = withTiming(s);
      tx.value    = withTiming(clamp(fx * (1 - s), -limX, limX));
      ty.value    = withTiming(clamp(fy * (1 - s), -limY, limY));
      markZoomed(true);
    });

  const composed = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <View style={{ width, height, overflow: 'hidden' }}>
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <Image source={{ uri }} style={{ width, height }} resizeMode="contain" />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

// ─── Contenido del visor (se monta solo mientras el modal está abierto) ───────
function ViewerContent({ uris, startIndex, onClose }: {
  uris: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage]     = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' }}>
      <FlatList
        data={uris}
        keyExtractor={(uri) => uri}
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        windowSize={3}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => (
          <ZoomableImage uri={item} width={width} height={height} onZoomChange={setZoomed} />
        )}
      />

      {/* Barra superior: contador + cerrar */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute', top: insets.top + 8, left: 16, right: 16,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <View className="px-3 py-1.5 rounded-full bg-white/15">
          <Text className="font-mono text-xs text-white">
            {page + 1} / {uris.length}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          className="w-10 h-10 rounded-full bg-white/15 items-center justify-center"
          activeOpacity={0.7}
        >
          <Feather name="x" size={20} color="#F5F5F5" />
        </TouchableOpacity>
      </View>

      {!zoomed && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', bottom: insets.bottom + 16, left: 0, right: 0, alignItems: 'center' }}
        >
          <Text className="text-[11px] text-white/70">
            Pellizca o toca dos veces para ampliar{uris.length > 1 ? ' · desliza para cambiar de foto' : ''}
          </Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

// ─── API pública ──────────────────────────────────────────────────────────────
type PhotoViewerProps = {
  uris: string[];
  /** Índice de la foto a mostrar; `null` = visor cerrado */
  index: number | null;
  onClose: () => void;
};

export function PhotoViewer({ uris, index, onClose }: PhotoViewerProps) {
  return (
    <Modal
      visible={index !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {index !== null && uris.length > 0 ? (
        <ViewerContent uris={uris} startIndex={Math.min(index, uris.length - 1)} onClose={onClose} />
      ) : null}
    </Modal>
  );
}