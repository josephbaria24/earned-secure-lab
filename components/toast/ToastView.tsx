import { useToast } from '@/components/toast/ToastContext';
import type { ToastItem, ToastType } from '@/components/toast/types';
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

function backgroundFor(type: ToastType) {
  switch (type) {
    case 'success':
      return '#214C3A';
    case 'error':
      return '#A95F58';
    case 'warning':
      return '#D8A184';
    case 'info':
      return '#668B9C';
    default:
      return '#183B50';
  }
}

function iconFor(type: ToastType) {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '!';
    case 'info':
      return 'i';
    default:
      return '';
  }
}

export function ToastView({ toast, index }: { toast: ToastItem; index: number }) {
  const { dismiss } = useToast();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(toast.options.position === 'top' ? -80 : 80);
  const scale = useSharedValue(0.94);

  const stackOffset = () => {
    const offset = Math.min(index * 8, 16);
    return toast.options.position === 'top' ? offset : -offset;
  };

  useEffect(() => {
    const delay = index * 40;
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 420, easing: Easing.bezier(0.25, 0.46, 0.45, 0.94) });
      translateY.value = withSpring(stackOffset(), { damping: 28, stiffness: 140, mass: 0.8 });
      scale.value = withSpring(Math.max(1 - index * 0.02, 0.92), { damping: 28, stiffness: 140, mass: 0.8 });
    }, delay);

    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    if (toast.options.duration > 0) {
      exitTimer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 320 });
        translateY.value = withTiming(toast.options.position === 'top' ? -24 : 24, { duration: 320 });
        scale.value = withTiming(0.96, { duration: 320 });
        setTimeout(() => {
          runOnJS(dismiss)(toast.id);
          toast.options.onClose?.();
        }, 320);
      }, Math.max(0, toast.options.duration - 320));
    }

    return () => {
      clearTimeout(timer);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [index, toast.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    zIndex: 1000 - index,
  }));

  const hide = () => {
    opacity.value = withTiming(0, { duration: 220 });
    translateY.value = withTiming(toast.options.position === 'top' ? -80 : 80, { duration: 220 });
    setTimeout(() => dismiss(toast.id), 220);
  };

  const icon = iconFor(toast.options.type);

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <Pressable onPress={hide} style={[styles.toast, { backgroundColor: backgroundFor(toast.options.type) }]}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <View style={styles.content}>
          {typeof toast.content === 'string' ? <Text style={styles.text}>{toast.content}</Text> : toast.content}
        </View>
        {toast.options.action ? (
          <Pressable
            onPress={() => {
              toast.options.action?.onPress();
              hide();
            }}
            style={styles.action}
          >
            <Text style={styles.actionText}>{toast.options.action.label}</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    marginVertical: 4,
    borderRadius: 16,
    shadowColor: '#183B50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  icon: {
    color: '#FFFCF7',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    width: 22,
  },
  content: { flex: 1 },
  text: {
    color: '#FFFCF7',
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,252,247,0.18)',
  },
  actionText: {
    color: '#FFFCF7',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
});
