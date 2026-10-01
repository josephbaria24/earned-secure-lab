import React, { useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import vadivam from '@iconify-json/vadivam/icons.json';
import streamlinePlump from '@iconify-json/streamline-plump/icons.json';
import hugeicons from '@iconify-json/hugeicons/icons.json';

const CUSTOM_ICONS: Record<string, { body: string; width: number; height: number }> = {
  'audio-waveform': {
    width: 24,
    height: 24,
    body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M22 14h-.272c-.38 0-.57 0-.732-.036a1.5 1.5 0 0 1-1.084-.957c-.056-.156-.08-.345-.126-.721l-.164-1.306a1.119 1.119 0 0 0-2.223.027l-.8 8.001a1.102 1.102 0 0 1-2.193-.007L13.093 4.996a1.098 1.098 0 0 0-2.186 0L9.594 19a1.102 1.102 0 0 1-2.193.007l-.8-8a1.119 1.119 0 0 0-2.223-.028l-.164 1.306c-.047.376-.07.565-.126.72a1.5 1.5 0 0 1-1.084.958C2.842 14 2.652 14 2.272 14H2"/>',
  },
  'unsettled-face': {
    width: 24,
    height: 24,
    body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m16 15.6l-.27-.2c-.718-.533-1.563-.533-2.28 0l-.27.2c-.718.533-1.564.533-2.282 0l-.27-.2c-.717-.533-1.563-.533-2.28 0L8 15.658m7.625-7.271v.53m-7.25-.53v.53m.375-.167c0-.414-.168-.75-.375-.75S8 8.336 8 8.75s.168.75.375.75s.375-.336.375-.75m7.25 0c0-.414-.168-.75-.375-.75s-.375.336-.375.75s.168.75.375.75s.375-.336.375-.75"/></g>',
  },
  'book-heart': {
    width: 24,
    height: 24,
    body: '<path fill="currentColor" d="M6.012 18H21V4c0-1.103-.897-2-2-2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h15v-2H6.012C5.55 19.988 5 19.806 5 19q0-.15.024-.273c.112-.576.584-.717.988-.727M8.648 7.642a2.224 2.224 0 0 1 3.125 0l.224.219l.223-.219a2.225 2.225 0 0 1 3.126 0a2.13 2.13 0 0 1 0 3.069L11.998 14l-3.349-3.289a2.13 2.13 0 0 1-.001-3.069"/>',
  },
};

type IconSet = 'vadivam' | 'streamline-plump' | 'hugeicons' | 'custom';

const SETS: Record<'vadivam' | 'streamline-plump' | 'hugeicons', { icons: Record<string, { body: string }>; width?: number; height?: number }> = {
  vadivam: vadivam as any,
  'streamline-plump': streamlinePlump as any,
  hugeicons: hugeicons as any,
};

/** Prefer Hugeicons for meaning-heavy UI icons (avoids generic “AI sparkle” look). */
const HUGE_ALIASES: Record<string, string> = {
  'sparkles-outline': 'heart-check',
  sparkles: 'heart-check',
  'leaf-outline': 'favourite',
  'flower-outline': 'heart-add',
  'water-outline': 'book-open-01',
  'analytics-outline': 'quiz-01',
  'chatbubble-ellipses-outline': 'message-question',
  'chatbox-ellipses-outline': 'message-01',
  'bar-chart-outline': 'chart-histogram',
  'checkmark-circle': 'checkmark-circle-02',
  'notifications-outline': 'notification-01',
  'log-out-outline': 'logout-01',
  'options-outline': 'settings-01',
  'bookmark-outline': 'bookmark-02',
  'chevron-forward-circle-outline': 'arrow-right-01',
  'add-circle-outline': 'add-circle',
  grid: 'dashboard-square-01',
  'ellipsis-horizontal': 'more-horizontal',
  'pulse-outline': 'activity-01',
};

/** Map previous Ionicons/Feather names onto Vadivam SVG icons. */
const ALIASES: Record<string, string> = {
  'arrow-back': 'arrow-left',
  'arrow-forward': 'arrow-right',
  'chevron-forward': 'chevron-right',
  'heart-outline': 'heart',
  'headset-outline': 'audio-waveform',
  headset: 'audio-waveform',
  'arrow-up-right-box': 'arrow-up-right',
  'home-outline': 'house',
  home: 'house',
  'book-outline': 'book-heart',
  book: 'book-heart',
  'person-outline': 'user',
  person: 'user',
  'compass-outline': 'compass',
  'edit-3': 'pencil',
  'alert-circle': 'circle-alert',
  'book-open': 'book-open',
};

type Props = {
  name: string;
  size?: number;
  color?: string;
  /** Iconify set. Defaults to vadivam; use hugeicons for clearer UI metaphors. */
  set?: IconSet;
  style?: StyleProp<ViewStyle>;
};

function resolveName(name: string, set: IconSet) {
  if (set === 'custom') return name;
  if (set === 'hugeicons') return HUGE_ALIASES[name] ?? name;
  if (set === 'streamline-plump') return name;
  return ALIASES[name] ?? name;
}

function pickIcon(name: string, set: IconSet, resolved: string) {
  if (set === 'custom' || CUSTOM_ICONS[resolved] || CUSTOM_ICONS[name]) {
    return { icon: CUSTOM_ICONS[resolved] ?? CUSTOM_ICONS[name], width: 24, height: 24, custom: true as const };
  }

  // Prefer Hugeicons when we have a meaning mapping (replaces AI-like sparkles etc.).
  const hugeName = HUGE_ALIASES[name] ?? (set === 'hugeicons' ? resolved : undefined);
  if (hugeName) {
    const pack = SETS.hugeicons;
    const icon = pack.icons[hugeName];
    if (icon) return { icon, width: pack.width ?? 24, height: pack.height ?? 24, custom: false as const };
  }

  if (set === 'hugeicons') return null;

  const pack = SETS[set === 'streamline-plump' ? 'streamline-plump' : 'vadivam'];
  const icon = pack.icons[resolved];
  if (!icon) return null;
  return { icon, width: pack.width ?? 24, height: pack.height ?? 24, custom: false as const };
}

/**
 * Renders Iconify SVG icons (Vadivam, Streamline Plump, Hugeicons) plus custom SVGs.
 * @see https://icon-sets.iconify.design/hugeicons/
 */
export function Icon({ name, size = 24, color = '#000000', set = 'vadivam', style }: Props) {
  const resolved = resolveName(name, set);
  const xml = useMemo(() => {
    const picked = pickIcon(name, set, resolved);
    if (!picked?.icon) return null;
    const body = picked.icon.body.replace(/currentColor/g, color);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${picked.width} ${picked.height}">${body}</svg>`;
  }, [resolved, name, size, color, set]);

  if (!xml) return null;
  return <SvgXml xml={xml} width={size} height={size} style={style} />;
}

export default Icon;
