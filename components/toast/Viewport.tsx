import { useToast } from '@/components/toast/ToastContext';
import { ToastView } from '@/components/toast/ToastView';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ToastViewport() {
  const { toasts } = useToast();
  const insets = useSafeAreaInsets();
  const topToasts = toasts.filter((toast) => toast.options.position === 'top');
  const bottomToasts = toasts.filter((toast) => toast.options.position === 'bottom');

  return (
    <>
      <View pointerEvents="box-none" style={[styles.viewport, styles.top, { paddingTop: insets.top + 12 }]}>
        {topToasts.map((toast, arrayIndex) => (
          <ToastView key={toast.id} toast={toast} index={topToasts.length - 1 - arrayIndex} />
        ))}
      </View>
      <View pointerEvents="box-none" style={[styles.viewport, styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {bottomToasts.map((toast, arrayIndex) => (
          <ToastView key={toast.id} toast={toast} index={bottomToasts.length - 1 - arrayIndex} />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  top: { top: 0 },
  bottom: { bottom: 0 },
});
