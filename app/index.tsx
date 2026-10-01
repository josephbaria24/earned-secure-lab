import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, Platform, Pressable, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as DocumentPicker from 'expo-document-picker';
import { Icon } from '@/components/Icon';
import { SmokeBackground } from '@/components/SmokeBackground';
import { toast } from '@/components/toast';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  ZoomIn,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { useAuth, Attachment } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Article as ArticleRow,
  AudioSession,
  CheckIn,
  Exercise,
  NotificationItem,
  Plan,
  QaItem,
  createArticle,
  createAudioSession,
  createQuestion,
  deleteArticle,
  deleteAudioSession,
  deleteQuestion,
  updateArticle,
  updateAudioSession,
  updateQuestion,
  durationLabel,
  fetchArticle,
  fetchArticles,
  fetchAssessment,
  fetchAudio,
  fetchBookmarkIds,
  fetchContinue,
  fetchExercises,
  fetchLatestAssessment,
  fetchNotifications,
  fetchPlans,
  fetchQuestions,
  fetchStats,
  fetchTodayCheckIn,
  formatDate,
  money,
  recordPlay,
  saveAssessment,
  saveCheckIn,
  saveReflection,
  timeAgo,
  toggleBookmark,
  touchArticle,
} from '@/lib/content';
import colors from '@/constants/colors';

const C = colors.light;
const R = colors.radius;
const brandIcon = require('../assets/images/es_icon.png');
const TAB_ITEMS = [
  ['home', 'Home', 'home-outline'],
  ['learn', 'Learn', 'book-outline'],
  ['audio', 'Audio', 'headset-outline'],
  ['explore', 'Explore', 'compass-outline'],
  ['profile', 'Profile', 'person-outline'],
] as const;
const TAB_BAR_H = 74;
const TAB_SIDE_INSET = 16;
const TAB_BOTTOM_GAP = 12;
const TAB_PILL_INSET = 4;
const TAB_SPRING = { damping: 18, stiffness: 160, mass: 0.7, overshootClamping: false };
type Page = 'home' | 'learn' | 'audio' | 'explore' | 'profile' | 'assessment' | 'article' | 'insights' | 'premium' | 'admin' | 'saved' | 'player' | 'regulate';
const TAB_ORDER: Page[] = ['home', 'learn', 'audio', 'explore', 'profile'];
const STACK_PAGES: Page[] = ['article', 'assessment', 'insights', 'premium', 'admin', 'saved', 'player', 'regulate'];
const easeOut = Easing.out(Easing.cubic);

function FloatingTabBar({ page, go, bottomInset }: { page: Page; go: (p: Page) => void; bottomInset: number }) {
  const { width: screenW } = useWindowDimensions();
  const compact = screenW < 380;
  const sideInset = compact ? 10 : TAB_SIDE_INSET;
  const barH = compact ? 70 : TAB_BAR_H;
  const pillH = compact ? 54 : 58;
  const pillInset = compact ? 3 : TAB_PILL_INSET;
  const floatBottom = Math.max(bottomInset, 8) + (compact ? 8 : TAB_BOTTOM_GAP);
  const activeIndex = Math.max(0, TAB_ITEMS.findIndex((item) => item[0] === page));
  const layouts = useRef<{ x: number; width: number }[]>(TAB_ITEMS.map(() => ({ x: 0, width: 0 })));
  const hasMeasured = useRef(false);
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const ready = useSharedValue(0);

  const slidePill = (index: number, instant = false) => {
    const layout = layouts.current[index];
    if (!layout?.width) return;
    const x = layout.x + pillInset;
    const w = Math.max(layout.width - pillInset * 2, pillH * 0.85);
    if (instant || !hasMeasured.current) {
      pillX.value = x;
      pillW.value = w;
      ready.value = 1;
      hasMeasured.current = true;
      return;
    }
    pillX.value = withSpring(x, TAB_SPRING);
    pillW.value = withSpring(w, TAB_SPRING);
  };

  useEffect(() => {
    hasMeasured.current = false;
  }, [compact, screenW, barH]);

  useEffect(() => {
    slidePill(activeIndex);
  }, [activeIndex, compact, barH]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: ready.value,
    width: pillW.value,
    transform: [{ translateX: pillX.value }],
  }));

  return (
    <View
      style={[
        styles.tabsShadow,
        {
          left: sideInset,
          right: sideInset,
          bottom: floatBottom,
          ...(Platform.OS === 'web'
            ? { boxShadow: '0 10px 28px rgba(24, 59, 80, 0.16)' }
            : null),
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.tabsWrap, { height: barH, borderRadius: barH / 2 }]}>
        <Animated.View
          style={[
            styles.tabPillSlide,
            pillStyle,
            { top: (barH - pillH) / 2, height: pillH, borderRadius: pillH / 2 },
          ]}
          pointerEvents="none"
        />
        {TAB_ITEMS.map((item, index) => {
          const active = page === item[0];
          return (
            <Pressable
              key={item[0]}
              onPress={() => go(item[0])}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                layouts.current[index] = { x, width };
                if (index === activeIndex) slidePill(index, !hasMeasured.current);
              }}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item[1]}
            >
              <View style={styles.tabContent}>
                <Icon name={item[2]} size={compact ? 18 : 20} color={active ? C.primary : '#FFFFFF'} />
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                  numberOfLines={1}
                  allowFontScaling={false}
                >
                  {item[1]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function useTopSafePad() {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'web') return Math.max(insets.top, 12);
  const statusBar = insets.top > 0 ? insets.top : (RNStatusBar.currentHeight ?? 54);
  return statusBar + 12;
}

function navKind(from: Page | null, to: Page) {
  if (!from || from === to) return 'fade' as const;
  const fromTab = TAB_ORDER.indexOf(from);
  const toTab = TAB_ORDER.indexOf(to);
  const fromStack = STACK_PAGES.includes(from);
  const toStack = STACK_PAGES.includes(to);
  if (toStack && !fromStack) return 'push' as const;
  if (fromStack && !toStack) return 'pop' as const;
  if (fromStack && toStack) return 'push' as const;
  if (fromTab !== -1 && toTab !== -1) return toTab > fromTab ? 'tab-forward' as const : 'tab-back' as const;
  return 'fade' as const;
}

function pageTransition(from: Page | null, to: Page) {
  switch (navKind(from, to)) {
    case 'push':
      return { entering: SlideInRight.duration(340).easing(easeOut), exiting: FadeOut.duration(180) };
    case 'pop':
      return { entering: SlideInLeft.duration(320).easing(easeOut), exiting: FadeOut.duration(180) };
    case 'tab-forward':
      return { entering: FadeInRight.duration(300).easing(easeOut), exiting: FadeOut.duration(160) };
    case 'tab-back':
      return { entering: FadeInLeft.duration(300).easing(easeOut), exiting: FadeOut.duration(160) };
    default:
      return { entering: FadeIn.duration(320).easing(easeOut), exiting: FadeOut.duration(180) };
  }
}
const SelectionCtx = React.createContext<{
  articleId: string | null;
  setArticleId: (id: string | null) => void;
  audioSession: AudioSession | null;
  setAudioSession: (session: AudioSession | null) => void;
}>({ articleId: null, setArticleId: () => {}, audioSession: null, setAudioSession: () => {} });

function Button({ label, onPress, secondary = false, icon, loading = false }: { label: string; onPress: () => void; secondary?: boolean; icon?: string; loading?: boolean }) {
  const color = secondary ? C.primary : C.primaryForeground;
  return (
    <Pressable disabled={loading} onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.button, secondary && styles.secondary, (pressed || loading) && { opacity: 0.78 }]}>
      {loading ? <ActivityIndicator color={color} /> : icon ? <Icon name={icon} size={16} color={color} /> : null}
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) { return <View style={[styles.card, style]}>{children}</View>; }
function Pill({ children }: { children: string }) { return <View style={styles.pill}><Text style={styles.pillText}>{children}</Text></View>; }

const MOOD_OPTIONS = [
  ['Disconnected', 'sad-face', 'streamline-plump'],
  ['Unsettled', 'unsettled-face', 'custom'],
  ['Neutral', 'smiley-indiferent', 'streamline-plump'],
  ['Connected', 'smiley-laughing-1', 'streamline-plump'],
  ['Secure', 'smiley-sparks', 'streamline-plump'],
] as const;

function MoodMarqueeLabel({ text, active }: { text: string; active: boolean }) {
  const offset = useSharedValue(0);
  const [boxW, setBoxW] = useState(0);
  const [textW, setTextW] = useState(0);
  const estimatedW = Math.ceil(text.length * 6.4);
  const measuredW = Math.max(textW, estimatedW);
  const overflow = boxW > 0 && measuredW > boxW + 1;
  const gap = 16;
  const labelStyle = [styles.moodText, active && styles.moodTextActive];
  const marqueeLabelStyle = [...labelStyle, styles.moodMarqueeText];

  useEffect(() => {
    cancelAnimation(offset);
    offset.value = 0;
    if (!overflow) return;
    const distance = measuredW + gap;
    const slideMs = Math.max(2400, distance * 52);
    // Slide left → snap back → wait 3s → repeat
    offset.value = withRepeat(
      withSequence(
        withTiming(-distance, { duration: slideMs, easing: Easing.linear }),
        withTiming(0, { duration: 0 }),
        withDelay(3000, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(offset);
  }, [overflow, measuredW, text]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      style={styles.moodMarquee}
      onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}
    >
      {overflow ? (
        <Animated.View style={[styles.moodMarqueeRow, rowStyle]}>
          <Text style={marqueeLabelStyle}>{text}</Text>
          <View style={{ width: gap }} />
          <Text style={marqueeLabelStyle}>{text}</Text>
        </Animated.View>
      ) : (
        <Text style={[labelStyle, { width: '100%', textAlign: 'center' }]}>{text}</Text>
      )}
      <View style={styles.moodMarqueeMeasure} pointerEvents="none" collapsable={false}>
        <Text
          style={[styles.moodText, styles.moodMarqueeMeasureText]}
          onLayout={(e) => setTextW(e.nativeEvent.layout.width)}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

function MoodPicker({ value, onSelect }: { value: string; onSelect: (label: string) => void }) {
  const layouts = useRef<{ x: number; y: number; width: number; height: number }[]>(
    MOOD_OPTIONS.map(() => ({ x: 0, y: 0, width: 0, height: 0 })),
  );
  const hasMeasured = useRef(false);
  const pillX = useSharedValue(0);
  const pillY = useSharedValue(4);
  const pillW = useSharedValue(0);
  const pillH = useSharedValue(68);
  const ready = useSharedValue(0);
  const activeIndex = Math.max(0, MOOD_OPTIONS.findIndex((item) => item[0] === value));
  const hasValue = Boolean(value);

  const slidePill = (index: number, instant = false) => {
    const layout = layouts.current[index];
    if (!layout?.width) return;
    const y = layout.y ?? 4;
    if (instant || !hasMeasured.current) {
      pillX.value = layout.x;
      pillY.value = y;
      pillW.value = layout.width;
      pillH.value = layout.height || 68;
      ready.value = hasValue ? 1 : 0;
      hasMeasured.current = true;
      return;
    }
    pillX.value = withSpring(layout.x, TAB_SPRING);
    pillY.value = withSpring(y, TAB_SPRING);
    pillW.value = withSpring(layout.width, TAB_SPRING);
    pillH.value = withSpring(layout.height || 68, TAB_SPRING);
    ready.value = withTiming(1, { duration: 180 });
  };

  useEffect(() => {
    if (!hasValue) {
      ready.value = withTiming(0, { duration: 160 });
      return;
    }
    slidePill(activeIndex);
  }, [value, activeIndex, hasValue]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: ready.value,
    width: pillW.value,
    height: pillH.value,
    transform: [{ translateX: pillX.value }, { translateY: pillY.value }],
  }));

  return (
    <View style={styles.moods}>
      <Animated.View style={[styles.moodPill, pillStyle]} pointerEvents="none" />
      {MOOD_OPTIONS.map(([label, icon, set], index) => {
        const active = value === label;
        return (
          <Pressable
            key={label}
            onPress={() => onSelect(label)}
            onLayout={(e) => {
              const { x, y, width, height } = e.nativeEvent.layout;
              layouts.current[index] = { x, y, width, height };
              if (hasValue && index === activeIndex) slidePill(index, !hasMeasured.current);
            }}
            style={styles.mood}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Icon name={icon} set={set} size={22} color={active ? C.primaryForeground : C.primary} />
            <MoodMarqueeLabel text={label} active={active} />
          </Pressable>
        );
      })}
    </View>
  );
}

function NotifDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(visible);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const closing = useRef(false);
  const sheetY = useSharedValue(420);
  const scrimOp = useSharedValue(0);

  const finishClose = () => {
    closing.current = false;
    setMounted(false);
    onClose();
  };

  const dismiss = () => {
    if (closing.current) return;
    closing.current = true;
    scrimOp.value = withTiming(0, { duration: 220, easing: easeOut });
    sheetY.value = withTiming(460, { duration: 280, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(finishClose)();
    });
  };

  useEffect(() => {
    if (!visible) return;
    fetchNotifications().then(setItems).catch(() => setItems([]));
  }, [visible]);

  useEffect(() => {
    if (visible) {
      closing.current = false;
      setMounted(true);
      sheetY.value = 420;
      scrimOp.value = 0;
      scrimOp.value = withTiming(1, { duration: 240, easing: easeOut });
      sheetY.value = withSpring(0, { damping: 18, stiffness: 170, mass: 0.85 });
    } else if (mounted && !closing.current) {
      setMounted(false);
    }
  }, [visible]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOp.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.notifRoot}>
        <Animated.View style={[styles.notifScrim, scrimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Dismiss notifications" />
        </Animated.View>
        <Animated.View style={[styles.notifSheet, sheetStyle]}>
          <View style={styles.notifHandle} />
          <View style={styles.notifHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.notifTitle}>Notifications</Text>
              <Text style={styles.muted}>Gentle reminders for your practice</Text>
            </View>
            <Pressable onPress={dismiss} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.notifClose}>×</Text>
            </Pressable>
          </View>
          {items.length === 0 ? (
            <Text style={styles.muted}>No notifications yet.</Text>
          ) : items.map((item, i) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(70 + i * 60).duration(300).easing(easeOut)}>
              <Pressable style={styles.notifRow} onPress={dismiss}>
                <View style={styles.notifIcon}>
                  <Icon name={item.icon} size={18} color={C.primary} set="hugeicons" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.notifRowTitle}>{item.title}</Text>
                  <Text style={styles.muted} numberOfLines={2}>{item.body}</Text>
                </View>
                <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
              </Pressable>
            </Animated.View>
          ))}
          <Pressable onPress={dismiss} style={styles.notifDone} accessibilityRole="button">
            <Text style={styles.link}>Got it</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ShellCtx = React.createContext<{
  externalHeader: boolean;
  setHeaderScrolled: (scrolled: boolean) => void;
}>({ externalHeader: false, setHeaderScrolled: () => {} });

function HeaderBar({
  scrolled,
  title,
  back,
  onBack,
}: {
  scrolled: boolean;
  title: string;
  back?: boolean;
  onBack?: () => void;
}) {
  return (
    <View
      style={[
        styles.headerBar,
        scrolled && styles.headerBarElevated,
        Platform.OS === 'web' && scrolled
          ? ({ boxShadow: '0 6px 16px rgba(24, 59, 80, 0.1)' } as object)
          : null,
      ]}
    >
      <Header title={title} back={back} onBack={onBack} />
    </View>
  );
}

function Header({ title, back, onBack }: { title: string; back?: boolean; onBack?: () => void }) {
  const topPad = useTopSafePad();
  const [notifOpen, setNotifOpen] = useState(false);
  return (
    <>
      <View style={[styles.header, { paddingTop: topPad }]}>
        {back ? (
          <>
            <Pressable onPress={onBack} style={styles.iconBtn} accessibilityRole="button">
              <Icon name="arrow-back" size={22} color={C.primary} />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          </>
        ) : (
          <>
            <View style={styles.miniBrand}>
              <Image source={brandIcon} style={styles.miniLogo} resizeMode="contain" accessibilityLabel="Earned Secure Lab" />
              <Text style={styles.miniName} numberOfLines={1}>Earned Secure Lab</Text>
            </View>
            <Pressable
              style={styles.iconBtn}
              onPress={() => setNotifOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
            >
              <Icon name="notifications-outline" size={21} color={C.primary} />
              <View style={styles.notifDot} />
            </Pressable>
          </>
        )}
      </View>
      <NotifDialog visible={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}

function Screen({
  title,
  back,
  onBack,
  children,
}: {
  title: string;
  back?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  const { externalHeader, setHeaderScrolled } = React.useContext(ShellCtx);
  const [scrolled, setScrolled] = useState(false);
  return (
    <View style={styles.screen}>
      {!externalHeader && (
        <HeaderBar scrolled={scrolled} title={title} back={back} onBack={onBack} />
      )}
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.pad}
        onScroll={(e) => {
          const next = e.nativeEvent.contentOffset.y > 4;
          if (externalHeader) {
            setHeaderScrolled(next);
            return;
          }
          setScrolled((prev) => (prev === next ? prev : next));
        }}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
    </View>
  );
}
const journalArt = require('../assets/images/onboarding-journal.png');
const shieldArt = require('../assets/images/onboarding-shield.png');
const ONBOARDING = [
  {
    art: journalArt,
    kicker: 'FIND YOUR WAY',
    title: 'A compass for what you feel',
    body: 'Journal the moment, notice the pattern, and grow from a place that feels steady.',
  },
  {
    art: shieldArt,
    kicker: 'EARNED SECURITY',
    title: 'Care you can practice',
    body: 'Hold trust, boundaries, and a softer kind of safety until they feel like your own.',
  },
];

function Onboarding({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const artHeight = height < 720 ? 200 : 268;
  const insets = useSafeAreaInsets();
  const index = useSharedValue(0);
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);

  const goTo = (next: number) => {
    if (next >= ONBOARDING.length) {
      onDone();
      return;
    }
    const clamped = Math.max(0, next);
    stepRef.current = clamped;
    setStep(clamped);
    index.value = withSpring(clamped, { damping: 20, stiffness: 170, mass: 0.75 });
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .onEnd((event) => {
      if (event.translationX < -48) runOnJS(goTo)(stepRef.current + 1);
      else if (event.translationX > 48) runOnJS(goTo)(stepRef.current - 1);
    });

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -index.value * width }],
  }));

  return (
    <View style={[gateStyles.screen, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={gateStyles.topBar}>
        <Text style={gateStyles.brand}>Earned Secure Lab</Text>
        <Pressable onPress={onDone} hitSlop={8} accessibilityRole="button">
          <Text style={gateStyles.skip}>Log in</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
        <View style={gateStyles.viewport}>
          <Animated.View style={[gateStyles.track, { width: width * ONBOARDING.length }, trackStyle]}>
            {ONBOARDING.map((slide) => (
              <View key={slide.kicker} style={[gateStyles.slide, { width }]}>
                <View style={gateStyles.copy}>
                  <View style={[gateStyles.artStage, { height: artHeight + 12 }]}>
                    <View style={[gateStyles.artHalo, artHeight < 240 && { width: 168, height: 168, borderRadius: 84 }]} />
                    <Image source={slide.art} style={[gateStyles.art, { height: artHeight }]} resizeMode="contain" accessibilityIgnoresInvertColors />
                  </View>
                  <Text style={gateStyles.kicker}>{slide.kicker}</Text>
                  <Text style={gateStyles.title}>{slide.title}</Text>
                  <Text style={gateStyles.body}>{slide.body}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
      <View style={gateStyles.footer}>
        <View style={gateStyles.dots}>
          {ONBOARDING.map((slide, dot) => (
            <Pressable key={slide.kicker} onPress={() => goTo(dot)} accessibilityRole="button" accessibilityLabel={`Slide ${dot + 1}`}>
              <View style={[gateStyles.dot, dot === step && gateStyles.dotActive]} />
            </Pressable>
          ))}
        </View>
        <View style={gateStyles.action}>
          <Button label={step === ONBOARDING.length - 1 ? 'Continue to log in' : 'Next'} onPress={() => goTo(step + 1)} />
        </View>
      </View>
    </View>
  );
}

function webInstallGuide(): { eyebrow: string; title: string; steps: string[] } | null {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  const touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const iOS = /iPad|iPhone|iPod/.test(ua) || touchMac;
  const android = /Android/i.test(ua);
  const safari = iOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|OPR/i.test(ua);
  if (iOS) {
    return {
      eyebrow: 'SAFARI',
      title: 'Add a Home Screen shortcut',
      steps: [
        safari ? 'Tap the Share button at the bottom of Safari.' : 'Open this page in Safari, then tap the Share button.',
        'Scroll the share sheet and tap Add to Home Screen.',
        'Keep the name Earned Secure Lab, then tap Add.',
        'Open the new icon from your Home Screen.',
      ],
    };
  }
  if (android) {
    return {
      eyebrow: 'ANDROID',
      title: 'Install the Chrome app',
      steps: [
        'Open this page in Chrome.',
        'Tap the three-dot menu in the top right.',
        'Tap Install app, or Add to Home screen.',
        'Confirm Install, then open it from your Home Screen.',
      ],
    };
  }
  return {
    eyebrow: 'CHROME',
    title: 'Install it like an app',
    steps: [
      'Look for the install icon in the address bar.',
      'Or open the three-dot menu and choose Cast, save, and share.',
      'Select Install page as app.',
      'Confirm Install, then open Earned Secure Lab from your apps.',
    ],
  };
}

function InstallBanner() {
  const guide = webInstallGuide();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (!guide || hidden) return null;
  return (
    <View style={gateStyles.install}>
      <View style={gateStyles.installHead}>
        <View style={{ flex: 1 }}>
          <Text style={gateStyles.installEyebrow}>{guide.eyebrow}</Text>
          <Text style={gateStyles.installTitle}>{guide.title}</Text>
        </View>
        <Pressable onPress={() => setHidden(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss install guide">
          <Icon name="cancel-01" size={18} color={C.mutedForeground} set="hugeicons" />
        </Pressable>
      </View>
      <Pressable onPress={() => setOpen((value) => !value)} accessibilityRole="button">
        <Text style={gateStyles.installToggle}>{open ? 'Hide steps' : 'Show step-by-step guide'}</Text>
      </Pressable>
      {open ? guide.steps.map((item, index) => (
        <View key={item} style={gateStyles.installStep}>
          <View style={gateStyles.installNum}><Text style={gateStyles.installNumText}>{index + 1}</Text></View>
          <Text style={gateStyles.installStepText}>{item}</Text>
        </View>
      )) : null}
    </View>
  );
}

function Logo() { return <View style={styles.logoBlock}><Image source={brandIcon} style={styles.logo} resizeMode="contain" accessibilityLabel="Earned Secure Lab" /><Text style={styles.brand}>Earned Secure Lab</Text><Text style={styles.tagline}>Rewiring. Regulating. Restoring.</Text></View>; }
function Login() {
  const { login, signup, resetPassword } = useAuth();
  const topPad = useTopSafePad();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    const message = isSignUp
      ? await signup(first, last, email, password)
      : await login(email, password);
    if (message) setError(message);
    setBusy(false);
  };

  const { width } = useWindowDimensions();
  const sidePad = width < 380 ? 16 : 24;

  return (
    <ScrollView contentContainerStyle={[styles.auth, { paddingTop: topPad, paddingHorizontal: sidePad }]}>
      <View style={gateStyles.authColumn}>
      <Animated.View entering={FadeIn.duration(600)} style={gateStyles.authColumn}>
        <Logo />
        <InstallBanner />
        <Text style={styles.authTitle}>{isSignUp ? 'Begin your path' : 'Welcome back'}</Text>
        <Text style={styles.authCopy}>{isSignUp ? 'Create a gentle practice for understanding and connection.' : 'A little more security, one step at a time.'}</Text>
      </Animated.View>
      <View style={[styles.authForm, gateStyles.authColumn]}>
      {isSignUp && (
        <View style={styles.row}>
          <View style={styles.rowField}><TextInput placeholder="First name" value={first} onChangeText={setFirst} style={styles.input} /></View>
          <View style={styles.rowField}><TextInput placeholder="Last name" value={last} onChangeText={setLast} style={styles.input} /></View>
        </View>
      )}
      <TextInput placeholder="Email address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} />
      <View style={styles.passwordField}>
        <TextInput
          placeholder="Password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
          style={[styles.input, styles.passwordInput]}
        />
        <Pressable
          onPress={() => setShowPassword((open) => !open)}
          style={styles.passwordToggle}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          <Icon name={showPassword ? 'view-off' : 'view'} set="hugeicons" size={20} color={C.mutedForeground} />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={busy ? 'Please wait' : isSignUp ? 'Start My Free Trial' : 'Log in'} onPress={submit} />
      </View>
      {!isSignUp && (
        <Pressable onPress={async () => {
          const message = await resetPassword(email);
          setError(message || (email ? 'Reset link sent. Check your inbox.' : 'Enter your email first.'));
        }}>
          <Text style={[styles.link, { textAlign: 'center', margin: 16 }]}>Forgot password?</Text>
        </Pressable>
      )}
      <Pressable onPress={() => { setIsSignUp(!isSignUp); setError(''); }} style={styles.authFooter}>
        <Text style={styles.muted}>{isSignUp ? 'Already have an account?' : 'New here?'}</Text>
        <Text style={styles.link}>{isSignUp ? ' Log in' : ' Start your free trial'}</Text>
      </Pressable>
      <Text style={styles.disclaimer}>Educational and self-reflection resources, not a substitute for professional mental health care.</Text>
      </View>
    </ScrollView>
  );
}

function greetingFor(name?: string) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${hello}, ${name}` : hello;
}

function patternCopy(attachment: string) {
  if (attachment === 'anxious') return 'Build internal security in moments of uncertainty.';
  if (attachment === 'avoidant') return 'Stay present while honoring your need for space.';
  return 'Practice trust, boundaries, and healthy interdependence.';
}

function Home({ go }: { go: (p: Page) => void }) {
  const { user } = useAuth();
  const { setArticleId } = React.useContext(SelectionCtx);
  const [mood, setMood] = useState('');
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [continueItem, setContinue] = useState<{ id: string; category: string; title: string; read_minutes: number; progress: number } | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [practice, setPractice] = useState<{ title: string; copy: string } | null>(null);
  const [stats, setStats] = useState({ lessons: 0, audioMinutes: 0, streak: 0 });
  const attachment = user?.attachment || 'secure';

  useEffect(() => {
    if (!user) return;
    fetchTodayCheckIn(user.id).then((row) => {
      if (!row) return;
      setMood(row.mood);
      setNote(row.note ?? '');
      setNoteSaved(true);
    }).catch(() => {});
    fetchContinue(user.id).then((row) => {
      const article = Array.isArray(row?.article) ? row.article[0] : row?.article;
      if (!article) return;
      setContinue({ ...article, progress: Number(row?.progress_pct ?? 0) });
    }).catch(() => {});
    fetchExercises().then((rows) => {
      setExercise(rows.find((item) => item.attachment_style === attachment) ?? rows[0] ?? null);
    }).catch(() => {});
    fetchAudio().then((rows) => {
      const featured = rows.find((item) => item.is_featured) ?? rows[0];
      if (featured) setPractice({ title: featured.title, copy: `${durationLabel(featured.duration_seconds)} · ${featured.category}` });
    }).catch(() => {});
    fetchStats(user.id).then((row) => setStats({ lessons: row.lessons, audioMinutes: row.audioMinutes, streak: row.streak })).catch(() => {});
  }, [user?.id, attachment]);

  const selectMood = (value: string) => {
    setMood(value);
    setNoteSaved(false);
  };

  const saveToday = async () => {
    if (!user || !mood) return;
    setSaving(true);
    try {
      await saveCheckIn(user.id, mood, note);
      setNoteSaved(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Home">
      <Animated.View entering={FadeInDown}>
        <Text style={styles.greeting}>{greetingFor(user?.firstName)}</Text>
        <Text style={styles.largeCopy}>A little more security, one step at a time.</Text>
      </Animated.View>
      {user?.role === 'trial' && (
        <Card style={styles.trial}>
          <View>
            <Text style={styles.eyebrow}>FREE TRIAL</Text>
            <Text style={styles.trialTitle}>{user.trialDays} days remaining</Text>
            <Text style={styles.muted}>Keep exploring at your own pace.</Text>
          </View>
          <Pressable onPress={() => go('premium')}><Text style={styles.link}>View plans</Text></Pressable>
        </Card>
      )}
      <Card style={styles.pattern}>
        <View style={styles.circle}><Icon name="leaf-outline" size={23} color={C.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>YOUR PATTERN</Text>
          <Text style={styles.patternTitle}>{attachment[0].toUpperCase() + attachment.slice(1)} tendencies</Text>
          <Text style={styles.muted}>{patternCopy(attachment)}</Text>
        </View>
        <Pressable onPress={() => go('assessment')}><Icon name="chevron-forward" size={20} color={C.primary} /></Pressable>
      </Card>
      <Pressable onPress={() => go('regulate')}>
        <LinearGradient colors={['#183F34', '#28604D']} style={styles.practice}>
          <View style={[styles.circle, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
            <Icon name="pulse-outline" size={24} color={C.primaryForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrowLight}>ONE-MINUTE RESET</Text>
            <Text style={styles.practiceTitle}>Want to regulate?</Text>
            <Text style={styles.practiceCopy}>Follow a slow guided breathing cycle.</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={C.primaryForeground} />
        </LinearGradient>
      </Pressable>
      {continueItem ? (
        <>
          <Text style={styles.sectionTitle}>Continue your journey</Text>
          <Card>
            <Pill>{continueItem.category}</Pill>
            <Text style={styles.cardTitle}>{continueItem.title}</Text>
            <Text style={styles.muted}>{continueItem.read_minutes} min read · {Math.round(continueItem.progress)}% complete</Text>
            <View style={styles.progress}><View style={[styles.fill, { width: `${Math.min(100, continueItem.progress)}%` }]} /></View>
            <Button label="Continue reading" onPress={() => { setArticleId(continueItem.id); go('article'); }} secondary icon="arrow-right" />
          </Card>
        </>
      ) : null}
      <Text style={styles.sectionTitle}>Daily check-in</Text>
      <Card>
        <Text style={styles.questionPrompt}>How connected do you feel today?</Text>
        <MoodPicker value={mood} onSelect={selectMood} />
        {mood ? (
          <Animated.View entering={FadeInDown.duration(320)} style={styles.checkInNote}>
            <Text style={styles.eyebrow}>PERSONAL NOTE</Text>
            <Text style={styles.cardTitle}>What is this feeling asking for?</Text>
            <Text style={styles.muted}>A short reflection can help you stay with yourself after choosing {mood.toLowerCase()}.</Text>
            <TextInput
              multiline
              value={note}
              onChangeText={(text) => { setNote(text); setNoteSaved(false); }}
              placeholder="Write a few words for yourself..."
              style={styles.journal}
              textAlignVertical="top"
            />
            <Button label={saving ? 'Saving' : noteSaved ? 'Note saved' : 'Save check-in'} onPress={saveToday} secondary icon={noteSaved ? 'check' : 'edit-3'} />
            {noteSaved && <Text style={styles.saved}>Saved for today · {mood}{note.trim() ? ' · with note' : ''}</Text>}
          </Animated.View>
        ) : null}
      </Card>
      {exercise ? (
        <>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <Pressable onPress={() => go('learn')}>
            <Card style={styles.recommend}>
              <View style={styles.recommendArt}><Icon name="flower-outline" size={27} color={C.primary} /></View>
              <Text style={styles.cardTitle}>{exercise.title}</Text>
              <Text style={styles.muted}>Practice · {exercise.duration_minutes} min</Text>
            </Card>
          </Pressable>
        </>
      ) : null}
      {practice ? (
        <Pressable onPress={() => go('audio')}>
          <LinearGradient colors={[C.primary, C.blue]} style={styles.practice}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrowLight}>TODAY'S PRACTICE</Text>
              <Text style={styles.practiceTitle}>{practice.title}</Text>
              <Text style={styles.practiceCopy}>{practice.copy}</Text>
            </View>
            <View style={styles.play}><Icon name="play" size={19} color={C.primary} /></View>
          </LinearGradient>
        </Pressable>
      ) : null}
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statValue}>{stats.lessons}</Text><Text style={styles.muted}>Lessons</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{stats.audioMinutes}</Text><Text style={styles.muted}>Audio min</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{stats.streak}</Text><Text style={styles.muted}>Day streak</Text></View>
      </View>
    </Screen>
  );
}

function Learn({ go }: { go: (p: Page) => void }) {
  const { user } = useAuth();
  const { setArticleId } = React.useContext(SelectionCtx);
  const [search, setSearch] = useState('');
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles().then(setArticles).catch(() => setArticles([])).finally(() => setLoading(false));
    if (user) fetchBookmarkIds(user.id, 'article').then(setSaved).catch(() => {});
  }, [user?.id]);

  const filtered = articles.filter((item) => `${item.category} ${item.title} ${item.summary}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <Screen title="Learn">
      <Text style={styles.largeCopy}>A library for the moments you want to meet with more care.</Text>
      <View style={styles.search}>
        <Icon name="search" size={19} color={C.mutedForeground} />
        <TextInput placeholder="Search articles" value={search} onChangeText={setSearch} style={{ flex: 1 }} />
      </View>
      {loading ? <ActivityIndicator color={C.primary} /> : null}
      {!loading && filtered.length === 0 ? <Text style={styles.muted}>No articles yet.</Text> : null}
      {filtered.map((item, i) => (
        <Animated.View entering={FadeInDown.delay(i * 40)} key={item.id}>
          <Pressable onPress={() => { setArticleId(item.id); go('article'); }}>
            <Card style={styles.article}>
              <View style={[styles.thumb, { backgroundColor: i % 2 ? '#EBD8CC' : '#DCE7DF' }]}>
                <Icon name={i % 2 ? 'water-outline' : 'leaf-outline'} size={27} color={C.primary} />
                <Text style={styles.thumbNo}>{String(i + 1).padStart(2, '0')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Pill>{item.category}</Pill>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.muted}>{item.summary}</Text>
                <Text style={styles.read}>{item.read_minutes} min</Text>
              </View>
              <Pressable onPress={async () => {
                if (!user) return;
                const next = await toggleBookmark(user.id, 'article', item.id);
                setSaved((prev) => {
                  const copy = new Set(prev);
                  if (next) copy.add(item.id); else copy.delete(item.id);
                  return copy;
                });
              }}>
                <Icon name={saved.has(item.id) ? 'bookmark' : 'bookmark-outline'} size={19} color={C.primary} />
              </Pressable>
            </Card>
          </Pressable>
        </Animated.View>
      ))}
    </Screen>
  );
}

function Article({ go, goBack }: { go: (p: Page) => void; goBack: () => void }) {
  const { user } = useAuth();
  const { articleId } = React.useContext(SelectionCtx);
  const [article, setArticle] = useState<ArticleRow | null>(null);
  const [reflection, setReflection] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!articleId) return;
    fetchArticle(articleId).then(setArticle).catch(() => setArticle(null));
    if (user) touchArticle(user.id, articleId).catch(() => {});
  }, [articleId, user?.id]);

  if (!article) {
    return <Screen title="Reading" back onBack={goBack}><Text style={styles.muted}>This article is not available.</Text></Screen>;
  }

  return (
    <Screen title="Reading" back onBack={goBack}>
      <View style={styles.hero}>
        <Text style={styles.heroText}>{article.hero_label || article.title}</Text>
        <Icon name="leaf-outline" size={42} color={C.primary} />
      </View>
      <Pill>{article.category}</Pill>
      <Text style={styles.articleTitle}>{article.title}</Text>
      <Text style={styles.muted}>By {article.author} · {article.read_minutes} min read{article.published_at ? ` · ${formatDate(article.published_at)}` : ''}</Text>
      {article.body.split('\n').filter(Boolean).map((paragraph) => (
        <Text key={paragraph.slice(0, 24)} style={styles.body}>{paragraph}</Text>
      ))}
      <Card style={styles.reflection}>
        <Text style={styles.eyebrow}>REFLECT</Text>
        <Text style={styles.cardTitle}>What did this bring up for you?</Text>
        <TextInput multiline placeholder="Write a few words..." value={reflection} onChangeText={setReflection} style={styles.journal} />
        <Button label={saved ? 'Reflection saved' : 'Save reflection'} onPress={async () => {
          if (!user || !reflection.trim()) return;
          await saveReflection(user.id, article.id, reflection.trim());
          setSaved(true);
        }} secondary />
      </Card>
      <Button label="Explore more articles" onPress={() => go('learn')} secondary icon="book-open" />
    </Screen>
  );
}

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

const audioBridge: { current: HTMLAudioElement | null; startAt: number } = { current: null, startAt: 0 };
const PROGRESS_KEY = 'esl-audio-progress';

function readProgress(id: string) {
  try {
    const raw = globalThis.localStorage?.getItem(PROGRESS_KEY);
    const all = raw ? JSON.parse(raw) as Record<string, number> : {};
    return Math.max(0, Number(all[id]) || 0);
  } catch {
    return 0;
  }
}

function writeProgress(id: string, seconds: number, duration = 0) {
  try {
    const raw = globalThis.localStorage?.getItem(PROGRESS_KEY);
    const all = raw ? JSON.parse(raw) as Record<string, number> : {};
    if (seconds < 3 || (duration > 0 && seconds >= duration - 2)) delete all[id];
    else all[id] = Math.floor(seconds);
    globalThis.localStorage?.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {
    // Progress is optional if storage is blocked.
  }
}

function Audio({ go }: { go: (p: Page) => void }) {
  const { setAudioSession } = React.useContext(SelectionCtx);
  const [sessions, setSessions] = useState<AudioSession[]>([]);
  const [savedAt, setSavedAt] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAudio().then((rows) => {
      setSessions(rows);
      const next: Record<string, number> = {};
      rows.forEach((item) => {
        const at = readProgress(item.id);
        if (at > 0) next[item.id] = at;
      });
      setSavedAt(next);
    }).catch(() => setSessions([]));
  }, []);

  const featured = sessions.find((item) => item.is_featured) ?? sessions[0];
  const open = (item: AudioSession, startAt = 0) => {
    if (!item.audio_url) {
      toast.error('This session does not have a Bunny file yet.');
      return;
    }
    if (startAt <= 0) writeProgress(item.id, 0);
    audioBridge.startAt = startAt;
    if (Platform.OS === 'web') {
      audioBridge.current?.pause();
      const el = new window.Audio(item.audio_url);
      audioBridge.current = el;
      void el.play().catch(() => {});
    }
    setAudioSession(item);
    go('player');
  };

  const resumeAt = (item: AudioSession) => {
    const at = savedAt[item.id] ?? readProgress(item.id);
    return at >= 3 && at < item.duration_seconds - 2 ? at : 0;
  };

  return (
    <Screen title="Audio">
      <Text style={styles.largeCopy}>Guided moments for your nervous system, wherever you are.</Text>
      {featured ? (
        <View style={styles.audioFeatured}>
          <View style={styles.audioOrb}><Icon name="headset-outline" size={29} color={C.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrowLight}>FEATURED SESSION</Text>
            <Text style={styles.practiceTitle}>{featured.title}</Text>
            <Text style={styles.practiceCopy}>{durationLabel(featured.duration_seconds)} · {featured.category}</Text>
            {resumeAt(featured) > 0 ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Pressable onPress={() => open(featured, resumeAt(featured))} style={styles.resumeChip}>
                  <Text style={styles.resumeChipText}>Resume {clock(resumeAt(featured))}</Text>
                </Pressable>
                <Pressable onPress={() => open(featured, 0)} style={styles.restartChip}>
                  <Text style={styles.restartChipText}>Start over</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          {resumeAt(featured) > 0 ? null : (
            <Pressable onPress={() => open(featured)} style={styles.play}><Icon name="play" size={19} color={C.primary} set="hugeicons" /></Pressable>
          )}
        </View>
      ) : <Text style={styles.muted}>No audio sessions yet.</Text>}
      <Text style={styles.sectionTitle}>Your audio library</Text>
      {sessions.map((item, i) => {
        const at = resumeAt(item);
        return (
          <Pressable key={item.id} onPress={() => open(item, at)} style={[styles.card, styles.audioRow]}>
            <View style={[styles.audioIcon, { backgroundColor: i % 2 ? C.blue : C.sage }]}><Icon name="pulse-outline" size={22} color={C.primaryForeground} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.category} · {durationLabel(item.duration_seconds)}{at ? ` · Resume ${clock(at)}` : ''}</Text>
            </View>
            <View style={styles.audioPlay}><Icon name="play" size={17} color={C.primary} set="hugeicons" /></View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function BreathingOrbit() {
  const cycle = useSharedValue(0);
  const [second, setSecond] = useState(0);

  useEffect(() => {
    cycle.value = 0;
    cycle.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(cycle);
  }, [cycle]);

  useAnimatedReaction(
    () => Math.min(11, Math.floor(cycle.value * 12)),
    (next, previous) => {
      if (next !== previous) runOnJS(setSecond)(next);
    },
  );

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${cycle.value * 360}deg` }],
  }));

  const noseStyle = useAnimatedStyle(() => {
    const fill = cycle.value <= 0.5 ? cycle.value * 2 : (1 - cycle.value) * 2;
    return { transform: [{ scale: 0.96 + fill * 0.04 }] };
  });

  const fillProps = useAnimatedProps(() => {
    const fill = cycle.value <= 0.5 ? cycle.value * 2 : (1 - cycle.value) * 2;
    const height = fill * 92;
    return { y: 108 - height, height };
  });

  const phase = second < 4
    ? { title: 'First inhale', detail: 'through nose', count: second + 1 }
    : second < 6
      ? { title: 'Second inhale', detail: 'through nose', count: second - 3 }
      : { title: 'Long exhale', detail: 'through mouth', count: second - 5 };

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', inset: 12, borderRadius: 118, borderWidth: 3, borderColor: 'rgba(113,214,181,0.55)' }} />
        {[
          { angle: -98, size: 8, opacity: 0.72 },
          { angle: -105, size: 5, opacity: 0.46 },
        ].map((dot, index) => {
          const radians = dot.angle * Math.PI / 180;
          return (
            <View
              key={index}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 130 + Math.cos(radians) * 117 - dot.size / 2,
                top: 130 + Math.sin(radians) * 117 - dot.size / 2,
                width: dot.size,
                height: dot.size,
                borderRadius: dot.size / 2,
                backgroundColor: `rgba(232,255,247,${dot.opacity})`,
                shadowColor: '#E8FFF7',
                shadowOpacity: dot.opacity,
                shadowRadius: 5,
                elevation: 2,
              }}
            />
          );
        })}
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', inset: 0 }, orbitStyle]}
        >
          <View
            style={{
              position: 'absolute',
              left: 130 - 7.5,
              top: 5.5,
              width: 15,
              height: 15,
              borderRadius: 7.5,
              backgroundColor: '#E8FFF7',
              shadowColor: '#E8FFF7',
              shadowOpacity: 1,
              shadowRadius: 12,
              elevation: 7,
            }}
          />
        </Animated.View>
        <Animated.View style={noseStyle}>
          <Svg width={160} height={160} viewBox="0 0 120 120">
            <Defs>
              <ClipPath id="nose-shape">
                <Path d="M60 13C47 13 45 30 45 46c0 20-8 29-13 42-5 14 7 24 20 17 5-3 11-3 16 0 13 7 25-3 20-17-5-13-13-22-13-42 0-16-2-33-15-33Z" />
              </ClipPath>
            </Defs>
            <Path
              d="M60 13C47 13 45 30 45 46c0 20-8 29-13 42-5 14 7 24 20 17 5-3 11-3 16 0 13 7 25-3 20-17-5-13-13-22-13-42 0-16-2-33-15-33Z"
              fill="none"
              stroke="rgba(149,236,204,0.12)"
              strokeWidth={12}
            />
            <Path
              d="M60 13C47 13 45 30 45 46c0 20-8 29-13 42-5 14 7 24 20 17 5-3 11-3 16 0 13 7 25-3 20-17-5-13-13-22-13-42 0-16-2-33-15-33Z"
              fill="none"
              stroke="rgba(190,255,232,0.24)"
              strokeWidth={6}
            />
            <Path
              d="M60 13C47 13 45 30 45 46c0 20-8 29-13 42-5 14 7 24 20 17 5-3 11-3 16 0 13 7 25-3 20-17-5-13-13-22-13-42 0-16-2-33-15-33Z"
              fill="rgba(255,255,255,0.08)"
              stroke="rgba(232,255,247,0.82)"
              strokeWidth={2.5}
            />
            <G clipPath="url(#nose-shape)">
              <AnimatedRect
                animatedProps={fillProps}
                x={25}
                width={70}
                fill="rgba(149,236,204,0.72)"
              />
            </G>
          </Svg>
        </Animated.View>
      </View>
      <Text style={{ color: C.primaryForeground, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>
        {phase.title}
      </Text>
      <Text style={{ color: 'rgba(255,252,247,0.68)', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 }}>
        {phase.detail}
      </Text>
      <Text style={{ color: C.primaryForeground, fontFamily: 'LibreBaskerville_400Regular', fontSize: 38, marginTop: 6 }}>{phase.count}</Text>
    </View>
  );
}

function Player({ goBack }: { goBack: () => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { audioSession } = React.useContext(SelectionCtx);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(audioSession?.duration_seconds ?? 0);
  const ring = 248;
  const stroke = 7;
  const radius = (ring - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  useEffect(() => {
    if (!audioSession?.audio_url || Platform.OS !== 'web') return;
    const el = audioBridge.current ?? new window.Audio(audioSession.audio_url);
    audioBridge.current = null;
    audio.current = el;
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
    };
    const seekTo = audioBridge.startAt;
    audioBridge.startAt = 0;
    el.ontimeupdate = () => {
      const next = el.currentTime || 0;
      setCurrent(next);
      if (audioSession) writeProgress(audioSession.id, next, el.duration || audioSession.duration_seconds);
    };
    el.onended = () => {
      setPaused(true);
      if (audioSession) writeProgress(audioSession.id, 0);
    };
    const applyStart = () => {
      if (seekTo > 0 && Number.isFinite(el.duration)) el.currentTime = Math.min(seekTo, Math.max(0, el.duration - 1));
    };
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
      applyStart();
    };
    el.onerror = () => toast.error('Bunny could not play this file.');
    if (Number.isFinite(el.duration) && el.duration > 0) {
      setDuration(el.duration);
      applyStart();
    }
    el.play().then(() => {
      setPaused(false);
      if (user) recordPlay(user.id, audioSession.id, audioSession.duration_seconds).catch(() => {});
    }).catch(() => setPaused(true));
    return () => {
      if (audioSession) writeProgress(audioSession.id, el.currentTime || 0, el.duration || audioSession.duration_seconds);
      el.onerror = null;
      el.onended = null;
      el.ontimeupdate = null;
      el.onloadedmetadata = null;
      el.pause();
      el.removeAttribute('src');
      el.load();
      audio.current = null;
    };
  }, [audioSession]);

  const toggle = async () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      await el.play();
      setPaused(false);
      return;
    }
    el.pause();
    setPaused(true);
  };

  const close = () => {
    audio.current?.pause();
    goBack();
  };

  return (
    <LinearGradient colors={['#102820', '#214C3A']} style={{ flex: 1 }}>
      <SmokeBackground />
      <View style={{ flex: 1, zIndex: 1, paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24), paddingHorizontal: 24 }}>
        <Pressable onPress={close} style={[styles.iconBtn, { backgroundColor: 'rgba(255,252,247,0.16)' }]} accessibilityLabel="Close player">
          <Icon name="arrow-left-01" size={20} color={C.primaryForeground} set="hugeicons" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'LibreBaskerville_400Regular', fontSize: 28, color: C.primaryForeground, textAlign: 'center', marginBottom: 8 }}>{audioSession?.title}</Text>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: 'rgba(255,252,247,0.78)', marginBottom: 36 }}>{audioSession?.category}</Text>
          <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={ring} height={ring} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={ring / 2} cy={ring / 2} r={radius} stroke="rgba(255,252,247,0.22)" strokeWidth={stroke} fill="none" />
              <Circle
                cx={ring / 2}
                cy={ring / 2}
                r={radius}
                stroke="#FFFCF7"
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${circ} ${circ}`}
                strokeDashoffset={circ * (1 - progress)}
              />
            </Svg>
            <Pressable onPress={toggle} style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFFCF7', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={paused ? 'Play' : 'Pause'}>
              <Icon name={paused ? 'play' : 'pause'} size={28} color={C.primary} set="hugeicons" />
            </Pressable>
          </View>
          <Text style={{ marginTop: 28, fontFamily: 'Inter_500Medium', fontSize: 16, color: C.primaryForeground }}>{clock(current)} / {clock(duration)}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function Regulate({ goBack }: { goBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={['#0D241D', '#1D4A3B']} style={{ flex: 1 }}>
      <SmokeBackground />
      <View style={{ flex: 1, zIndex: 1, paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24), paddingHorizontal: 24 }}>
        <Pressable onPress={goBack} style={[styles.iconBtn, { backgroundColor: 'rgba(255,252,247,0.16)' }]} accessibilityLabel="Close breathing exercise">
          <Icon name="arrow-left-01" size={20} color={C.primaryForeground} set="hugeicons" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5, color: 'rgba(255,252,247,0.68)', marginBottom: 12 }}>REGULATE</Text>
          <Text style={{ fontFamily: 'LibreBaskerville_400Regular', fontSize: 28, lineHeight: 36, textAlign: 'center', color: C.primaryForeground, marginBottom: 34 }}>Come back to your body</Text>
          <BreathingOrbit />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center', color: 'rgba(255,252,247,0.68)', marginTop: 28 }}>
            Let the light and each dot guide your count.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const EXPLORE_TILES = [
  ['quiz-01', 'Attachment assessment', 'Understand your current pattern', 'assessment'],
  ['message-question', 'Q&A library', 'Answers for real moments', 'learn'],
  ['heart-check', 'Relationship exercises', 'Practice a steadier response', 'learn'],
  ['chart-histogram', 'My insights', 'See your growth over time', 'insights'],
] as const;

function Explore({ go }: { go: (p: Page) => void }) {
  const { width } = useWindowDimensions();
  const [questions, setQuestions] = useState<QaItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const contentW = Math.max(width - 40, 280);
  const gap = 12;
  const cols = contentW >= 720 ? 4 : contentW >= 520 ? 3 : 2;
  const tileW = (contentW - gap * (cols - 1)) / cols;

  useEffect(() => {
    fetchQuestions().then(setQuestions).catch(() => setQuestions([]));
  }, []);

  return (
    <Screen title="Explore">
      <Text style={styles.largeCopy}>Choose what feels useful today. There is no right order.</Text>
      <View style={[styles.grid, { gap }]}>
        {EXPLORE_TILES.map((x) => (
          <Pressable
            key={x[1]}
            onPress={() => go(x[3] as Page)}
            style={[styles.tile, { flexBasis: tileW, flexGrow: 1, minWidth: Math.min(160, tileW), maxWidth: contentW }]}
          >
            <View style={styles.tileIcon}>
              <Icon name={x[0]} size={22} color={C.primary} set="hugeicons" />
            </View>
            <Text style={styles.tileTitle}>{x[1]}</Text>
            <Text style={styles.muted}>{x[2]}</Text>
            <Icon name="arrow-up-right-box" size={18} color={C.primary} style={styles.tileArrow} />
          </Pressable>
        ))}
      </View>
      <Card style={styles.quote}>
        <Icon name="chatbox-ellipses-outline" size={26} color={C.peach} />
        <Text style={styles.quoteText}>Security is not the absence of uncertainty. It is knowing you can stay with yourself inside it.</Text>
      </Card>
      <Text style={styles.sectionTitle}>Questions you may be carrying</Text>
      {questions.length === 0 ? <Text style={styles.muted}>No questions published yet.</Text> : null}
      {questions.map((item) => (
        <Pressable key={item.id} style={styles.qrow} onPress={() => setOpenId(openId === item.id ? null : item.id)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.qtext}>{item.question}</Text>
            {openId === item.id ? <Text style={styles.muted}>{item.answer}</Text> : null}
          </View>
          <Icon name="chevron-forward" size={17} color={C.primary} />
        </Pressable>
      ))}
    </Screen>
  );
}

function Assessment({ go, goBack }: { go: (p: Page) => void; goBack: () => void }) {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<{ id: string; prompt: string }[]>([]);
  const [options, setOptions] = useState<{ id: string; label: string; letter: string; style: Attachment }[]>([]);
  const [picked, setPicked] = useState<{ questionId: string; optionId: string; style: Attachment }[]>([]);
  const [result, setResult] = useState<{ anxious_pct: number; secure_pct: number; avoidant_pct: number; primary_pattern: Attachment; summary: string | null } | null>(null);

  useEffect(() => {
    fetchAssessment().then((data) => {
      setQuestions(data.questions);
      setOptions(data.options);
    }).catch(() => {});
  }, []);

  const progress = useSharedValue(questions.length ? ((step + 1) / questions.length) * 100 : 0);
  useEffect(() => {
    if (!questions.length) return;
    const next = step >= questions.length ? 100 : ((step + 1) / questions.length) * 100;
    progress.value = withTiming(next, { duration: 360, easing: easeOut });
  }, [step, questions.length]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  const choose = async (option: { id: string; style: Attachment }) => {
    if (busy || !user || !questions[step]) return;
    const next = [...picked, { questionId: questions[step].id, optionId: option.id, style: option.style }];
    setPicked(next);
    if (step + 1 < questions.length) {
      setBusy(true);
      setStep((s) => s + 1);
      setTimeout(() => setBusy(false), 380);
      return;
    }
    setBusy(true);
    try {
      const saved = await saveAssessment(user.id, next);
      await refresh();
      setResult(saved);
      setStep(questions.length);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  if (!questions.length) {
    return <Screen title="Attachment assessment" back onBack={goBack}><Text style={styles.muted}>No assessment questions yet.</Text></Screen>;
  }

  if (step >= questions.length && result) {
    const rows = [
      ['Anxious', Number(result.anxious_pct), C.peach],
      ['Secure', Number(result.secure_pct), C.blue],
      ['Avoidant', Number(result.avoidant_pct), C.sage],
    ] as const;
    return (
      <Screen title="Your result" back onBack={goBack}>
        <Animated.View entering={FadeIn.duration(280).easing(easeOut)}>
          <Animated.View entering={ZoomIn.duration(480).easing(easeOut)} style={styles.result}>
            <Text style={styles.resultValue}>{Math.round(Number(rows.find((row) => row[0].toLowerCase() === result.primary_pattern)?.[1] ?? 0))}%</Text>
            <Text style={styles.muted}>primary pattern</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(120).duration(360).easing(easeOut)}>
            <Text style={styles.articleTitle}>{result.primary_pattern[0].toUpperCase() + result.primary_pattern.slice(1)} tendencies</Text>
            <Text style={styles.body}>{result.summary || 'Your responses show a learned pattern, not a fixed identity.'}</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).duration(360).easing(easeOut)}>
            <Card>
              {rows.map(([label, pct, color]) => (
                <View key={label}>
                  <Text style={styles.scoreLabel}>{label} <Text style={styles.score}>{Math.round(pct)}%</Text></Text>
                  <View style={styles.progress}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} /></View>
                </View>
              ))}
            </Card>
            <Button label="See recommendations" onPress={() => go('home')} />
          </Animated.View>
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen title="Attachment assessment" back onBack={goBack}>
      <Text style={styles.eyebrow}>QUESTION {step + 1} OF {questions.length}</Text>
      <View style={styles.progress}>
        <Animated.View style={[styles.fill, progressStyle]} />
      </View>
      <View style={styles.assessStage}>
        <Animated.View
          key={step}
          entering={SlideInRight.duration(340).easing(easeOut)}
          exiting={SlideOutLeft.duration(240).easing(easeOut)}
          style={styles.assessSlide}
        >
          <Text style={styles.assessTitle}>{questions[step]?.prompt}</Text>
          {options.map((option, i) => (
            <Animated.View key={`${step}-${option.id}`} entering={FadeInDown.delay(70 + i * 55).duration(300).easing(easeOut)}>
              <Pressable
                onPress={() => choose(option)}
                disabled={busy}
                style={({ pressed }) => [styles.answer, pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] }]}
                accessibilityRole="button"
              >
                <View style={styles.radio}><Text style={styles.radioText}>{option.letter || String.fromCharCode(65 + i)}</Text></View>
                <Text style={styles.answerText}>{option.label}</Text>
                <Icon name="arrow-forward" size={17} color={C.primary} />
              </Pressable>
            </Animated.View>
          ))}
          <Text style={styles.muted}>There are no right answers. Choose what feels most familiar.</Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

function weekBars(checkIns: CheckIn[]) {
  const byDate = new Map(checkIns.map((row) => [row.check_in_date, row.mood_score]));
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    return { label: labels[day.getDay()], score: byDate.get(key) ?? 0 };
  });
}

function Insights({ goBack }: { goBack: () => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ lessons: 0, articleCount: 0, audioMinutes: 0, checkIns: [] as CheckIn[] });
  const [pattern, setPattern] = useState<{ title: string; copy: string; score: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchStats(user.id).then((row) => setStats({
      lessons: row.lessons,
      articleCount: row.articleCount,
      audioMinutes: row.audioMinutes,
      checkIns: row.checkIns,
    })).catch(() => {});
    fetchLatestAssessment(user.id).then((row) => {
      if (!row) return;
      setPattern({
        title: `${row.primary_pattern[0].toUpperCase() + row.primary_pattern.slice(1)} pattern`,
        copy: row.summary || 'Your latest assessment is saved.',
        score: Math.round(Number(row.primary_pattern === 'anxious' ? row.anxious_pct : row.primary_pattern === 'avoidant' ? row.avoidant_pct : row.secure_pct)),
      });
    }).catch(() => {});
  }, [user?.id]);

  const bars = weekBars(stats.checkIns);

  return (
    <Screen title="My insights" back onBack={goBack}>
      <Text style={styles.largeCopy}>Small moments of awareness become a different way of being.</Text>
      <Card style={styles.insight}>
        <Text style={styles.eyebrow}>CURRENT PATTERN</Text>
        <Text style={styles.insightTitle}>{pattern?.title || 'No assessment yet'}</Text>
        <Text style={styles.muted}>{pattern?.copy || 'Take the attachment assessment to see your pattern.'}</Text>
        <View style={styles.ring}><Text style={styles.resultValue}>{pattern?.score ?? 0}%</Text><Text style={styles.muted}>primary</Text></View>
      </Card>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statValue}>{stats.lessons} / {stats.articleCount}</Text><Text style={styles.muted}>Lessons learned</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{stats.audioMinutes}</Text><Text style={styles.muted}>Audio minutes</Text></View>
      </View>
      <Text style={styles.sectionTitle}>Weekly emotional check-ins</Text>
      <Card>
        <View style={styles.chart}>
          {bars.map((bar, i) => (
            <View key={`${bar.label}-${i}`} style={styles.barWrap}>
              <View style={[styles.bar, { height: Math.max(8, bar.score) }]} />
              <Text style={styles.muted}>{bar.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.muted}>A steadier week is built one check-in at a time.</Text>
      </Card>
    </Screen>
  );
}

function Premium({ go, goBack }: { go: (p: Page) => void; goBack: () => void }) {
  const { upgrade } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchPlans().then(setPlans).catch(() => setPlans([]));
  }, []);

  const checkout = async (interval: 'monthly' | 'annual') => {
    setBusy(true);
    const message = await upgrade(interval);
    setBusy(false);
    if (message) {
      toast.error(message);
      return;
    }
    go('home');
  };

  const monthly = plans.find((plan) => plan.interval === 'monthly');
  const annual = plans.find((plan) => plan.interval === 'annual');

  return (
    <Screen title="Premium" back onBack={goBack}>
      <View style={styles.subHero}>
        <View style={styles.subMark}><Icon name="heart" size={29} color={C.peach} /></View>
        <Text style={styles.subTitle}>Grow toward secure connection</Text>
        <Text style={styles.largeCopy}>Unlock the complete Earned Secure Lab experience.</Text>
      </View>
      <Card>{['Unlimited articles', 'Full audio library', 'Guided exercises', 'Attachment insights', 'Personal progress tracking', 'Full Q&A library'].map((item) => (
        <View style={styles.benefit} key={item}><Icon name="checkmark-circle" size={20} color={C.primary} /><Text style={styles.bodySmall}>{item}</Text></View>
      ))}</Card>
      <View style={styles.plans}>
        {monthly ? (
          <Card style={styles.plan}>
            <Text style={styles.eyebrow}>{monthly.badge || 'MONTHLY'}</Text>
            <Text style={styles.price}>{money(monthly.price_cents)}</Text>
            <Text style={styles.muted}>per month</Text>
            <Button label={busy ? 'Please wait' : 'Choose monthly'} onPress={() => checkout('monthly')} secondary />
          </Card>
        ) : null}
        {annual ? (
          <Card style={[styles.plan, { borderColor: C.peach }]}>
            <Text style={styles.eyebrow}>{annual.badge || 'ANNUAL'}</Text>
            <Text style={styles.price}>{money(annual.price_cents)}</Text>
            <Text style={styles.muted}>per year</Text>
            <Button label={busy ? 'Please wait' : 'Choose annual'} onPress={() => checkout('annual')} />
          </Card>
        ) : null}
      </View>
      {!plans.length ? <Text style={styles.muted}>No plans are published yet.</Text> : null}
    </Screen>
  );
}

function Saved({ go, goBack }: { go: (p: Page) => void; goBack: () => void }) {
  const { user } = useAuth();
  const { setArticleId } = React.useContext(SelectionCtx);
  const [articles, setArticles] = useState<ArticleRow[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchArticles(), fetchBookmarkIds(user.id, 'article')]).then(([rows, ids]) => {
      setArticles(rows.filter((item) => ids.has(item.id)));
    }).catch(() => setArticles([]));
  }, [user?.id]);

  return (
    <Screen title="Saved content" back onBack={goBack}>
      {articles.length === 0 ? <Text style={styles.muted}>Nothing saved yet.</Text> : null}
      {articles.map((item) => (
        <Pressable key={item.id} onPress={() => { setArticleId(item.id); go('article'); }}>
          <Card>
            <Pill>{item.category}</Pill>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.muted}>{item.summary}</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

function Profile({ go }: { go: (p: Page) => void }) {
  const { user, logout } = useAuth();
  const menuItems = [
    ['Saved content', 'bookmark-02', 'saved'],
    ['My progress', 'chart-line-data-01', 'insights'],
    ['Help & support', 'customer-support', 'help'],
    ['About Earned Secure Lab', 'information-circle', 'about'],
  ] as const;

  return (
    <Screen title="Profile">
      <Card style={styles.profile}>
        <View style={styles.bigAvatar}><Text style={styles.bigAvatarText}>{user?.firstName?.[0] || '?'}</Text></View>
        <Text style={styles.profileName}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.muted}>{user?.email}</Text>
        <Pill>{user?.role === 'subscriber' ? 'Premium member' : user?.role === 'admin' ? 'Admin' : 'Free trial'}</Pill>
      </Card>
      <Text style={styles.sectionTitle}>My attachment profile</Text>
      <Card>
        <Text style={styles.muted}>Your current lens</Text>
        <Text style={styles.patternTitle}>{user?.attachment} tendencies</Text>
        <View style={styles.chips}>
          {(['anxious', 'avoidant', 'secure'] as Attachment[]).map((item) => (
            <View key={item} style={styles.chip}>
              <Text style={styles.chipText}>{item}</Text>
            </View>
          ))}
        </View>
        <Button label="Retake assessment" onPress={() => go('assessment')} secondary />
      </Card>
      {user?.role === 'admin' && <Button label="Open Admin Dashboard" onPress={() => go('admin')} icon="grid" />}
      <View style={styles.menu}>
        {menuItems.map(([label, icon, target]) => (
          <Pressable
            key={label}
            style={styles.menuRow}
            onPress={() => {
              if (target === 'help') {
                Alert.alert('Help & support', 'Email support@earnedsecurelab.com and we will reply.');
                return;
              }
              if (target === 'about') {
                Alert.alert('About', 'Earned Secure Lab offers educational self-reflection resources. It is not a substitute for professional mental health care.');
                return;
              }
              go(target as Page);
            }}
          >
            <Icon name={icon} size={20} color={C.primary} set="hugeicons" />
            <Text style={styles.menuText}>{label}</Text>
            <Icon name="chevron-forward" size={17} color={C.mutedForeground} />
          </Pressable>
        ))}
        <Pressable style={styles.menuRow} onPress={logout}>
          <Icon name="logout-01" size={20} color={C.destructive} set="hugeicons" />
          <Text style={[styles.menuText, { color: C.destructive }]}>Log out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type AudioAdminItem = { id: string; title: string; category: string; status: string; duration_seconds: number; audio_url: string | null };
type QaAdminItem = { id: string; question: string; answer: string; status: string };
type ArticleAdminItem = { id: string; title: string; category: string; summary: string; body: string; author: string; read_minutes: number; status: string };
type AdminCache = {
  counts: { users: number; subscribers: number; trial: number; revenue: number };
  lists: Record<string, { title: string; detail: string }[]>;
  articleItems: ArticleAdminItem[];
  audioItems: AudioAdminItem[];
  qaItems: QaAdminItem[];
};
const adminCache: { current: AdminCache | null } = { current: null };
const ADMIN_TABS = ['Overview', 'Articles', 'Audio', 'Q&A', 'Users'] as const;

function AdminTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (tab: string) => void;
}) {
  const layouts = useRef<{ x: number; width: number; height: number }[]>(
    ADMIN_TABS.map(() => ({ x: 0, width: 0, height: 0 })),
  );
  const hasMeasured = useRef(false);
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const pillH = useSharedValue(0);
  const ready = useSharedValue(0);
  const activeIndex = Math.max(0, ADMIN_TABS.indexOf(value as (typeof ADMIN_TABS)[number]));

  const movePill = (index: number, instant = false) => {
    const layout = layouts.current[index];
    if (!layout?.width) return;
    if (instant || !hasMeasured.current) {
      pillX.value = layout.x;
      pillW.value = layout.width;
      pillH.value = layout.height;
      ready.value = 1;
      hasMeasured.current = true;
      return;
    }
    pillX.value = withSpring(layout.x, TAB_SPRING);
    pillW.value = withSpring(layout.width, TAB_SPRING);
    pillH.value = withSpring(layout.height, TAB_SPRING);
  };

  useEffect(() => {
    movePill(activeIndex);
  }, [activeIndex]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: ready.value,
    width: pillW.value,
    height: pillH.value,
    transform: [{ translateX: pillX.value }],
  }));

  return (
    <View style={[styles.adminTabs, { position: 'relative' }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 4,
            borderRadius: 12,
            backgroundColor: C.primary,
          },
          pillStyle,
        ]}
      />
      {ADMIN_TABS.map((item, index) => (
        <Pressable
          key={item}
          onPress={() => onChange(item)}
          onLayout={(event) => {
            const { x, width, height } = event.nativeEvent.layout;
            layouts.current[index] = { x, width, height };
            if (index === activeIndex) movePill(index, !hasMeasured.current);
          }}
          style={[styles.adminTab, { zIndex: 1 }]}
        >
          <Text style={[styles.adminTabText, value === item && { color: C.primaryForeground }]}>
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

async function loadAdminSnapshot() {
  const [profiles, articles, audio, questions, plays, completions] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, role'),
    supabase.from('articles').select('id, title, category, summary, body, author, read_minutes, status'),
    supabase.from('audio_sessions').select('id, title, category, status, duration_seconds, audio_url'),
    supabase.from('qa_items').select('id, question, answer, status'),
    supabase.from('audio_plays').select('id', { count: 'exact', head: true }),
    supabase.from('exercise_completions').select('id', { count: 'exact', head: true }),
  ]);
  const people = profiles.data ?? [];
  const subs = await supabase.from('subscriptions').select('id, plans(price_cents)').eq('status', 'active');
  const revenue = (subs.data ?? []).reduce((sum, row) => {
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    return sum + (plan?.price_cents ?? 0);
  }, 0);
  const snapshot: AdminCache = {
    counts: {
      users: people.length,
      subscribers: people.filter((item) => item.role === 'subscriber').length,
      trial: people.filter((item) => item.role === 'trial').length,
      revenue,
    },
    articleItems: articles.data ?? [],
    audioItems: (audio.data ?? []).filter((item) => item.title && (item.status === 'published' || item.status === 'draft')),
    qaItems: questions.data ?? [],
    lists: {
      Overview: [
        { title: 'Articles published', detail: String((articles.data ?? []).filter((item) => item.status === 'published').length) },
        { title: 'Audio sessions', detail: String((audio.data ?? []).length) },
        { title: 'Audio plays', detail: String(plays.count ?? 0) },
        { title: 'Exercises completed', detail: String(completions.count ?? 0) },
      ],
      Articles: (articles.data ?? []).map((item) => ({ title: item.title, detail: item.status })),
      Audio: (audio.data ?? []).map((item) => ({ title: item.title, detail: item.status })),
      'Q&A': (questions.data ?? []).map((item) => ({ title: item.question, detail: item.status })),
      Users: people.map((item) => ({ title: `${item.first_name} ${item.last_name}`, detail: item.role })),
    },
  };
  adminCache.current = snapshot;
  return snapshot;
}

function Admin({ goBack }: { goBack: () => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('Overview');
  const [lists, setLists] = useState<Record<string, { title: string; detail: string }[]>>(adminCache.current?.lists ?? {});
  const [counts, setCounts] = useState(adminCache.current?.counts ?? { users: 0, subscribers: 0, trial: 0, revenue: 0 });
  const [audioTitle, setAudioTitle] = useState('');
  const [audioCategory, setAudioCategory] = useState('Guided regulation');
  const [audioFile, setAudioFile] = useState<{ name: string; uri: string; mimeType?: string } | null>(null);
  const [editingAudio, setEditingAudio] = useState<{ id: string; audio_url: string | null; duration_seconds: number } | null>(null);
  const [showAudioForm, setShowAudioForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [articleItems, setArticleItems] = useState<ArticleAdminItem[]>(adminCache.current?.articleItems ?? []);
  const [audioItems, setAudioItems] = useState<AudioAdminItem[]>(adminCache.current?.audioItems ?? []);
  const [qaItems, setQaItems] = useState<QaAdminItem[]>(adminCache.current?.qaItems ?? []);
  const [showQaForm, setShowQaForm] = useState(false);
  const [editingQaId, setEditingQaId] = useState<string | null>(null);
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState('');
  const [savingQa, setSavingQa] = useState(false);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleCategory, setArticleCategory] = useState('');
  const [articleSummary, setArticleSummary] = useState('');
  const [articleBody, setArticleBody] = useState('');
  const [articleAuthor, setArticleAuthor] = useState('Earned Secure Lab');
  const [articleMinutes, setArticleMinutes] = useState('5');
  const [savingArticle, setSavingArticle] = useState(false);
  const rows = lists[tab] ?? [];

  useEffect(() => {
    if (reloadKey === 0 && adminCache.current) return;
    let active = true;
    loadAdminSnapshot().then((snapshot) => {
      if (!active) return;
      setCounts(snapshot.counts);
      setArticleItems(snapshot.articleItems);
      setAudioItems(snapshot.audioItems);
      setQaItems(snapshot.qaItems);
      setLists(snapshot.lists);
    }).catch(() => {});
    return () => { active = false; };
  }, [reloadKey]);

  const pickAudio = async () => {
    if (uploading) return;
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['audio/*', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const file = picked.assets[0];
    setAudioFile({ name: file.name, uri: file.uri, mimeType: file.mimeType });
    if (!audioTitle) setAudioTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    toast.success('Audio file selected');
  };

  const readDuration = (uri: string) => new Promise<number>((resolve) => {
    if (Platform.OS !== 'web') {
      resolve(60);
      return;
    }
    const audio = new window.Audio(uri);
    audio.onloadedmetadata = () => resolve(Math.max(1, Math.round(audio.duration || 60)));
    audio.onerror = () => resolve(60);
  });

  const deleteBunnyFile = async (url: string | null) => {
    if (!url) return;
    const endpoint = (process.env.EXPO_PUBLIC_UPLOAD_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
    const removed = await fetch(`${endpoint}/delete-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const payload = await removed.json().catch(() => ({}));
    if (!removed.ok && removed.status !== 400) throw new Error(payload.error || 'Could not delete the Bunny file.');
  };

  const uploadBunnyFile = async (file: { name: string; uri: string }) => {
    const blob = await fetch(file.uri).then((res) => res.blob());
    const endpoint = (process.env.EXPO_PUBLIC_UPLOAD_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
    const uploaded = await fetch(`${endpoint}/upload-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': file.name },
      body: blob,
    });
    const payload = await uploaded.json();
    if (!uploaded.ok) throw new Error(payload.error || 'Upload failed');
    return { url: payload.url as string, seconds: await readDuration(file.uri) };
  };

  const resetAudioForm = () => {
    setAudioTitle('');
    setAudioCategory('Guided regulation');
    setAudioFile(null);
    setEditingAudio(null);
    setShowAudioForm(false);
  };

  const startEditAudio = (item: (typeof audioItems)[number]) => {
    setEditingAudio({ id: item.id, audio_url: item.audio_url, duration_seconds: item.duration_seconds });
    setAudioTitle(item.title);
    setAudioCategory(item.category);
    setAudioFile(null);
    setShowAudioForm(true);
  };

  const removeAudio = (item: (typeof audioItems)[number]) => {
    const run = async () => {
      setDeletingId(item.id);
      try {
        await deleteBunnyFile(item.audio_url);
        await deleteAudioSession(item.id);
        writeProgress(item.id, 0);
        if (editingAudio?.id === item.id) resetAudioForm();
        setReloadKey((value) => value + 1);
        toast.success('Session deleted');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Delete failed');
      } finally {
        setDeletingId('');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove “${item.title}” from the library?`)) run();
      return;
    }
    Alert.alert('Delete session', `Remove “${item.title}” from the library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  const uploadAudio = async () => {
    if (uploading) return;
    if (!audioTitle.trim() || (!audioFile && !editingAudio)) {
      toast.error('Add a title and choose an audio file.');
      return;
    }
    setUploading(true);
    try {
      const uploaded = audioFile ? await uploadBunnyFile(audioFile) : null;
      if (editingAudio) {
        if (uploaded && editingAudio.audio_url) await deleteBunnyFile(editingAudio.audio_url);
        await updateAudioSession(editingAudio.id, {
          title: audioTitle.trim(),
          category: audioCategory.trim() || 'Guided regulation',
          ...(uploaded ? { duration_seconds: uploaded.seconds, audio_url: uploaded.url } : {}),
        });
      } else if (uploaded) {
        await createAudioSession({
          title: audioTitle.trim(),
          category: audioCategory.trim() || 'Guided regulation',
          duration_seconds: uploaded.seconds,
          audio_url: uploaded.url,
        });
      }
      const saved = Boolean(editingAudio);
      resetAudioForm();
      setReloadKey((value) => value + 1);
      toast.success(saved ? 'Session updated' : 'Audio uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetQaForm = () => {
    setQaQuestion('');
    setQaAnswer('');
    setEditingQaId(null);
    setShowQaForm(false);
  };

  const startEditQa = (item: QaAdminItem) => {
    setQaQuestion(item.question);
    setQaAnswer(item.answer);
    setEditingQaId(item.id);
    setShowQaForm(true);
  };

  const saveQa = async () => {
    if (!qaQuestion.trim() || !qaAnswer.trim()) {
      toast.error('Add both a question and an answer.');
      return;
    }
    setSavingQa(true);
    try {
      if (editingQaId) {
        await updateQuestion(editingQaId, qaQuestion.trim(), qaAnswer.trim());
      } else {
        await createQuestion(qaQuestion.trim(), qaAnswer.trim());
      }
      const edited = Boolean(editingQaId);
      resetQaForm();
      setReloadKey((value) => value + 1);
      toast.success(edited ? 'Q&A updated' : 'Q&A added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save Q&A.');
    } finally {
      setSavingQa(false);
    }
  };

  const removeQa = (item: QaAdminItem) => {
    const run = async () => {
      setDeletingId(item.id);
      try {
        await deleteQuestion(item.id);
        if (editingQaId === item.id) resetQaForm();
        setReloadKey((value) => value + 1);
        toast.success('Q&A deleted');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not delete Q&A.');
      } finally {
        setDeletingId('');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete “${item.question}”?`)) void run();
      return;
    }
    Alert.alert('Delete Q&A', `Delete “${item.question}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  const resetArticleForm = () => {
    setArticleTitle('');
    setArticleCategory('');
    setArticleSummary('');
    setArticleBody('');
    setArticleAuthor('Earned Secure Lab');
    setArticleMinutes('5');
    setEditingArticleId(null);
    setShowArticleForm(false);
  };

  const startEditArticle = (item: ArticleAdminItem) => {
    setArticleTitle(item.title);
    setArticleCategory(item.category);
    setArticleSummary(item.summary);
    setArticleBody(item.body);
    setArticleAuthor(item.author);
    setArticleMinutes(String(item.read_minutes));
    setEditingArticleId(item.id);
    setShowArticleForm(true);
  };

  const saveArticle = async () => {
    if (!articleTitle.trim() || !articleCategory.trim() || !articleSummary.trim() || !articleBody.trim()) {
      toast.error('Complete the title, category, summary, and article body.');
      return;
    }
    const input = {
      title: articleTitle.trim(),
      category: articleCategory.trim(),
      summary: articleSummary.trim(),
      body: articleBody.trim(),
      author: articleAuthor.trim() || 'Earned Secure Lab',
      read_minutes: Math.max(1, Number.parseInt(articleMinutes, 10) || 5),
    };
    setSavingArticle(true);
    try {
      if (editingArticleId) await updateArticle(editingArticleId, input);
      else await createArticle(input);
      const edited = Boolean(editingArticleId);
      resetArticleForm();
      setReloadKey((value) => value + 1);
      toast.success(edited ? 'Article updated' : 'Article added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save article.');
    } finally {
      setSavingArticle(false);
    }
  };

  const removeArticle = (item: ArticleAdminItem) => {
    const run = async () => {
      setDeletingId(item.id);
      try {
        await deleteArticle(item.id);
        if (editingArticleId === item.id) resetArticleForm();
        setReloadKey((value) => value + 1);
        toast.success('Article deleted');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not delete article.');
      } finally {
        setDeletingId('');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete “${item.title}”?`)) void run();
      return;
    }
    Alert.alert('Delete article', `Delete “${item.title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
    <Screen title="Admin dashboard" back onBack={goBack}>
      <Card style={styles.adminWelcome}>
        <Text style={styles.eyebrowLight}>ADMIN</Text>
        <Text style={styles.adminTitle}>{greetingFor(user?.firstName)}</Text>
        <Text style={styles.practiceCopy}>A clear view of your growing learning community.</Text>
      </Card>
      <View style={styles.adminGrid}>
        {[
          [[String(counts.users), 'Total users'], [String(counts.subscribers), 'Subscribers']],
          [[String(counts.trial), 'Trial users'], [money(counts.revenue), 'Memberships']],
        ].map((row) => (
          <View key={row[0][1]} style={styles.adminStatRow}>
            {row.map((item) => (
              <Card key={item[1]} style={styles.adminStat}>
                <Text style={styles.adminStatValue}>{item[0]}</Text>
                <Text style={styles.adminStatLabel} numberOfLines={1}>{item[1]}</Text>
              </Card>
            ))}
          </View>
        ))}
      </View>
      <AdminTabs value={tab} onChange={setTab} />
      {tab === 'Articles' && !showArticleForm && (
        <View style={{ marginBottom: 8 }}>
          <Button
            label="Add new"
            icon="add-circle-outline"
            onPress={() => {
              resetArticleForm();
              setShowArticleForm(true);
            }}
          />
        </View>
      )}
      {tab === 'Articles' && showArticleForm && (
        <Card>
          <Text style={styles.sectionTitle}>{editingArticleId ? 'Edit article' : 'New article'}</Text>
          <TextInput placeholder="Title" value={articleTitle} onChangeText={setArticleTitle} style={styles.input} />
          <TextInput placeholder="Category" value={articleCategory} onChangeText={setArticleCategory} style={styles.input} />
          <TextInput
            multiline
            placeholder="Short summary"
            value={articleSummary}
            onChangeText={setArticleSummary}
            style={[styles.input, { minHeight: 82, textAlignVertical: 'top', paddingTop: 14 }]}
          />
          <TextInput
            multiline
            placeholder="Article body"
            value={articleBody}
            onChangeText={setArticleBody}
            style={[styles.input, { minHeight: 180, textAlignVertical: 'top', paddingTop: 14 }]}
          />
          <TextInput placeholder="Author" value={articleAuthor} onChangeText={setArticleAuthor} style={styles.input} />
          <TextInput
            placeholder="Reading time in minutes"
            value={articleMinutes}
            onChangeText={setArticleMinutes}
            keyboardType="number-pad"
            style={styles.input}
          />
          <Button
            loading={savingArticle}
            label={savingArticle ? 'Saving…' : editingArticleId ? 'Save changes' : 'Add article'}
            onPress={saveArticle}
          />
          {!savingArticle ? <Button label="Cancel" secondary onPress={resetArticleForm} /> : null}
        </Card>
      )}
      {tab === 'Audio' && !showAudioForm && (
        <View style={{ marginBottom: 8 }}>
          <Button label="Add new" icon="add-circle-outline" onPress={() => { setEditingAudio(null); setAudioTitle(''); setAudioCategory('Guided regulation'); setAudioFile(null); setShowAudioForm(true); }} />
        </View>
      )}
      {tab === 'Audio' && showAudioForm && (
        <Card>
          <Text style={styles.sectionTitle}>{editingAudio ? 'Edit session' : 'New audio'}</Text>
          <Text style={styles.muted}>{editingAudio ? 'Change the title, category, or audio file.' : 'Add a title, category, and an mp3 or m4a file.'}</Text>
          <TextInput placeholder="Session title" value={audioTitle} onChangeText={setAudioTitle} style={styles.input} />
          <TextInput placeholder="Category" value={audioCategory} onChangeText={setAudioCategory} style={styles.input} />
          <Pressable onPress={pickAudio} disabled={uploading} style={styles.answer}>
            <Icon name="headset-outline" size={18} color={C.primary} />
            <Text style={styles.answerText}>{audioFile ? audioFile.name : editingAudio ? 'Keep the current file, or choose a new one' : 'Choose an mp3 or m4a file'}</Text>
          </Pressable>
          <Button
            loading={uploading}
            label={uploading ? (editingAudio ? 'Saving…' : 'Uploading…') : editingAudio ? 'Save changes' : 'Upload audio'}
            onPress={uploadAudio}
          />
          {!uploading ? <Button label="Cancel" secondary onPress={resetAudioForm} /> : null}
        </Card>
      )}
      {tab === 'Q&A' && !showQaForm && (
        <View style={{ marginBottom: 8 }}>
          <Button
            label="Add new"
            icon="add-circle-outline"
            onPress={() => {
              setEditingQaId(null);
              setQaQuestion('');
              setQaAnswer('');
              setShowQaForm(true);
            }}
          />
        </View>
      )}
      {tab === 'Q&A' && showQaForm && (
        <Card>
          <Text style={styles.sectionTitle}>{editingQaId ? 'Edit Q&A' : 'New Q&A'}</Text>
          <TextInput
            placeholder="Question"
            value={qaQuestion}
            onChangeText={setQaQuestion}
            style={styles.input}
          />
          <TextInput
            multiline
            placeholder="Answer"
            value={qaAnswer}
            onChangeText={setQaAnswer}
            style={[styles.input, { minHeight: 120, textAlignVertical: 'top', paddingTop: 14 }]}
          />
          <Button
            loading={savingQa}
            label={savingQa ? 'Saving…' : editingQaId ? 'Save changes' : 'Add Q&A'}
            onPress={saveQa}
          />
          {!savingQa ? <Button label="Cancel" secondary onPress={resetQaForm} /> : null}
        </Card>
      )}
      <Card>
        <Text style={styles.sectionTitle}>{tab}</Text>
        {tab === 'Articles' ? (
          articleItems.length === 0
            ? <Text style={styles.muted}>No articles yet.</Text>
            : (
              <ScrollView
                style={{ maxHeight: 320 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {articleItems.map((item) => (
                  <View key={item.id} style={styles.adminRow}>
                    <View style={styles.adminDot} />
                    <Text style={[styles.adminRowText, { flex: 1 }]} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.adminMetric}>{item.status}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Pressable onPress={() => startEditArticle(item)} accessibilityLabel="Edit article" hitSlop={8}>
                        <Icon name="pencil-edit-01" size={18} color={C.primary} set="hugeicons" />
                      </Pressable>
                      <Pressable onPress={() => removeArticle(item)} disabled={Boolean(deletingId)} accessibilityLabel="Delete article" hitSlop={8}>
                        {deletingId === item.id
                          ? <ActivityIndicator size="small" color={C.destructive} />
                          : <Icon name="delete-02" size={18} color={C.destructive} set="hugeicons" />}
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )
        ) : tab === 'Audio' ? (
          audioItems.filter((item) => item.title && (item.status === 'published' || item.status === 'draft')).length === 0
            ? <Text style={styles.muted}>No audio sessions yet.</Text>
            : audioItems.filter((item) => item.title && (item.status === 'published' || item.status === 'draft')).map((item) => (
              <View key={item.id} style={styles.adminRow}>
                <View style={styles.adminDot} />
                <Text style={[styles.adminRowText, { flex: 1 }]} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.adminMetric}>{item.status}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable onPress={() => startEditAudio(item)} accessibilityLabel="Edit session" hitSlop={8}>
                    <Icon name="pencil-edit-01" size={18} color={C.primary} set="hugeicons" />
                  </Pressable>
                  <Pressable onPress={() => removeAudio(item)} disabled={Boolean(deletingId)} accessibilityLabel="Delete session" hitSlop={8}>
                    {deletingId === item.id ? <ActivityIndicator size="small" color={C.destructive} /> : <Icon name="delete-02" size={18} color={C.destructive} set="hugeicons" />}
                  </Pressable>
                </View>
              </View>
            ))
        ) : tab === 'Q&A' ? (
          qaItems.length === 0
            ? <Text style={styles.muted}>No Q&A items yet.</Text>
            : qaItems.map((item) => (
              <View key={item.id} style={styles.adminRow}>
                <View style={styles.adminDot} />
                <Text style={[styles.adminRowText, { flex: 1 }]} numberOfLines={2}>{item.question}</Text>
                <Text style={styles.adminMetric}>{item.status}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable onPress={() => startEditQa(item)} accessibilityLabel="Edit Q&A" hitSlop={8}>
                    <Icon name="pencil-edit-01" size={18} color={C.primary} set="hugeicons" />
                  </Pressable>
                  <Pressable onPress={() => removeQa(item)} disabled={Boolean(deletingId)} accessibilityLabel="Delete Q&A" hitSlop={8}>
                    {deletingId === item.id
                      ? <ActivityIndicator size="small" color={C.destructive} />
                      : <Icon name="delete-02" size={18} color={C.destructive} set="hugeicons" />}
                  </Pressable>
                </View>
              </View>
            ))
        ) : rows.length === 0 ? <Text style={styles.muted}>Nothing here yet.</Text> : rows.map((item) => (
          <View key={item.title + item.detail} style={styles.adminRow}>
            <View style={styles.adminDot} />
            <Text style={[styles.adminRowText, { flex: 1 }]} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.adminMetric}>{item.detail}</Text>
          </View>
        ))}
      </Card>
    </Screen>
    </View>
  );
}
function renderPage(page: Page, go: (p: Page) => void, goBack: () => void) {
  switch (page) {
    case 'home': return <Home go={go} />;
    case 'learn': return <Learn go={go} />;
    case 'audio': return <Audio go={go} />;
    case 'explore': return <Explore go={go} />;
    case 'profile': return <Profile go={go} />;
    case 'article': return <Article go={go} goBack={goBack} />;
    case 'saved': return <Saved go={go} goBack={goBack} />;
    case 'assessment': return <Assessment go={go} goBack={goBack} />;
    case 'insights': return <Insights goBack={goBack} />;
    case 'premium': return <Premium go={go} goBack={goBack} />;
    case 'player': return <Player goBack={goBack} />;
    case 'regulate': return <Regulate goBack={goBack} />;
    default: return <Admin goBack={goBack} />;
  }
}

export default function App() {
  const { user, ready } = useAuth();
  const insets = useSafeAreaInsets();
  const [intro, setIntro] = useState(true);
  const [page, setPage] = useState<Page>('home');
  const [articleId, setArticleId] = useState<string | null>(null);
  const [audioSession, setAudioSession] = useState<AudioSession | null>(null);
  const fromPage = useRef<Page | null>(null);
  const go = (next: Page) => {
    if (next === page) return;
    fromPage.current = page;
    setPage(next);
  };
  const goBack = () => {
    const target = fromPage.current && fromPage.current !== page ? fromPage.current : 'home';
    fromPage.current = page;
    setPage(target);
  };

  if (!ready) {
    return (
      <View style={[styles.pageShell, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.pageShell}>
        <Animated.View
          key={intro ? 'splash' : 'login'}
          entering={intro ? FadeIn.duration(420) : FadeInDown.duration(420).easing(easeOut)}
          exiting={FadeOut.duration(240)}
          style={styles.pageFrame}
        >
          {intro ? <Onboarding onDone={() => setIntro(false)} /> : <Login />}
        </Animated.View>
      </View>
    );
  }

  const { entering, exiting } = pageTransition(fromPage.current, page);
  const showTabs = !STACK_PAGES.includes(page);
  const tabBottomInset = Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 8);

  return (
    <SelectionCtx.Provider value={{ articleId, setArticleId, audioSession, setAudioSession }}>
      <View style={styles.pageShell}>
        <Animated.View key={page} entering={entering} exiting={exiting} style={styles.pageFrame}>
          {renderPage(page, go, goBack)}
        </Animated.View>
        {showTabs && <FloatingTabBar page={page} go={go} bottomInset={tabBottomInset} />}
      </View>
    </SelectionCtx.Provider>
  );
}
const styles = StyleSheet.create({ pageShell: { flex: 1, backgroundColor: C.background }, pageFrame: { ...StyleSheet.absoluteFillObject }, screen: { flex: 1, backgroundColor: C.background }, screenScroll: { flex: 1 }, pad: { paddingHorizontal: 20, paddingBottom: 145, paddingTop: 8 }, headerBar: { zIndex: 25, backgroundColor: C.background, paddingHorizontal: 20 }, headerBarElevated: { shadowColor: '#183B50', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, position: 'relative' }, miniBrand: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }, miniLogo: { width: 40, height: 40 }, miniName: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 16, color: C.primary, flexShrink: 1 }, headerTitle: { position: 'absolute', left: 50, right: 50, fontFamily: 'Inter_700Bold', fontSize: 17, color: C.primary, textAlign: 'center' }, iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }, notifDot: { position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: C.peach, borderWidth: 1.5, borderColor: C.card }, notifRoot: { flex: 1, justifyContent: 'flex-end' }, notifScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24, 59, 80, 0.28)' }, notifSheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === 'web' ? 28 : 34, maxHeight: '78%', shadowColor: '#183B50', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 18 }, notifHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 14 }, notifHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }, notifTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 26, color: C.primary, marginBottom: 2 }, notifClose: { fontFamily: 'Inter_500Medium', fontSize: 26, lineHeight: 28, color: C.primary, marginTop: -2 }, notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }, notifIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center' }, notifRowTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: C.primary, marginBottom: 3 }, notifTime: { fontFamily: 'Inter_500Medium', fontSize: 11, color: C.mutedForeground, marginTop: 2 }, notifDone: { alignItems: 'center', paddingTop: 16, paddingBottom: 4 }, greeting: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 32, color: C.primary, marginTop: 8 }, largeCopy: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, color: C.mutedForeground, marginTop: 5, marginBottom: 20 }, card: { backgroundColor: C.card, borderRadius: R, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }, sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: C.primary, marginBottom: 12 }, sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, lineHeight: 21, color: C.primary, marginBottom: 4 }, muted: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: C.mutedForeground }, eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, color: C.blue }, eyebrowLight: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, color: 'rgba(255,255,255,.8)' }, link: { fontFamily: 'Inter_700Bold', fontSize: 12, color: C.primary }, button: { height: 48, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginTop: 12, paddingHorizontal: 17 }, buttonText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: C.primaryForeground }, secondary: { backgroundColor: C.secondary }, secondaryText: { color: C.primary }, pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: C.secondary, marginBottom: 8 }, pillText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: C.primary }, trial: { backgroundColor: '#E6EEE3', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, trialTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 22, color: C.primary, marginVertical: 5 }, pattern: { flexDirection: 'row', alignItems: 'center', gap: 12 }, circle: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center' }, patternTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 20, color: C.primary, marginVertical: 4 }, art: { height: 130, borderRadius: 16, backgroundColor: '#E6DDD3', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, artText: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 25, lineHeight: 26, textAlign: 'center', color: C.primary }, progress: { height: 6, backgroundColor: C.muted, borderRadius: 4, overflow: 'hidden', marginVertical: 11 }, fill: { height: 6, backgroundColor: C.primary, borderRadius: 4 }, questionPrompt: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 20, color: C.primary, marginBottom: 14 }, moods: { flexDirection: 'row', alignItems: 'stretch', gap: 0, position: 'relative', backgroundColor: C.muted, borderRadius: 18, padding: 4 }, moodPill: { position: 'absolute', left: 0, top: 0, borderRadius: 14, backgroundColor: C.primary }, mood: { flex: 1, minWidth: 0, minHeight: 68, borderRadius: 14, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 8, gap: 6, zIndex: 1 }, moodText: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 12, color: C.primary, textAlign: 'center' }, moodTextActive: { color: C.primaryForeground, fontFamily: 'Inter_700Bold' }, moodMarquee: { width: '100%', overflow: 'hidden', height: 12 }, moodMarqueeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' }, moodMarqueeText: { textAlign: 'left', flexShrink: 0, ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap', width: 'max-content', maxWidth: 'none', overflow: 'visible', textOverflow: 'clip' } as object) : null) }, moodMarqueeMeasure: { position: 'absolute', left: -9999, top: 0, opacity: 0 }, moodMarqueeMeasureText: { flexShrink: 0, ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap', width: 'max-content' } as object) : null) }, saved: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.primary, marginTop: 12 }, checkInNote: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border }, recommend: { padding: 10 }, recommendArt: { height: 80, borderRadius: 14, backgroundColor: '#EBD8CC', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, practice: { borderRadius: 22, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }, practiceTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 20, lineHeight: 25, color: C.primaryForeground, marginVertical: 6 }, practiceCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,.8)' }, play: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }, resumeChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: C.card }, resumeChipText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: C.primary }, restartChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(255,252,247,0.16)' }, restartChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: C.primaryForeground }, stats: { flexDirection: 'row', gap: 10 }, stat: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 14 }, statValue: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 25, color: C.primary, marginBottom: 5 }, search: { height: 48, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, marginBottom: 14 }, article: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' }, thumb: { width: 82, height: 100, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, thumbNo: { fontFamily: 'Inter_700Bold', fontSize: 10, color: C.primary, position: 'absolute', bottom: 8, left: 9 }, read: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: C.blue, marginTop: 7 }, hero: { height: 190, borderRadius: 24, backgroundColor: '#E4DDD3', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 20, marginBottom: 18 }, heroText: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 27, lineHeight: 31, color: C.primary }, articleTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 32, lineHeight: 37, color: C.primary, marginVertical: 12 }, body: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 26, color: C.foreground, marginVertical: 9 }, reflection: { backgroundColor: '#E7EEE5', marginTop: 18 }, journal: { minHeight: 92, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 12, textAlignVertical: 'top' }, audioFeatured: { backgroundColor: C.primary, borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 }, audioOrb: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.peach, alignItems: 'center', justifyContent: 'center' }, audioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }, audioIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, audioPlay: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20, width: '100%' }, tile: { minHeight: 168, borderRadius: 22, padding: 16, paddingBottom: 44, backgroundColor: '#E1E9E0', justifyContent: 'flex-start' }, tileIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.55)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, tileTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 19, lineHeight: 23, color: C.primary, marginBottom: 6 }, tileArrow: { position: 'absolute', right: 15, bottom: 15 }, quote: { backgroundColor: '#E7EEE5', padding: 21 }, quoteText: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 21, lineHeight: 29, color: C.primary, marginVertical: 12 }, qrow: { backgroundColor: C.card, borderRadius: 15, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }, qtext: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20, color: C.primary, flex: 1 }, assessTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 29, lineHeight: 36, color: C.primary, marginVertical: 22 }, assessStage: { overflow: 'hidden', position: 'relative', minHeight: 420 }, assessSlide: { width: '100%' }, answer: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border }, radio: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center' }, radioText: { fontFamily: 'Inter_700Bold', color: C.primary }, answerText: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20, color: C.foreground, flex: 1 }, result: { width: 155, height: 155, borderRadius: 78, borderWidth: 14, borderColor: C.peach, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 25, backgroundColor: C.card }, resultValue: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 40, color: C.primary }, scoreLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: C.primary, marginTop: 9 }, score: { fontFamily: 'Inter_700Bold' }, insight: { backgroundColor: '#E1E9E0', minHeight: 230 }, insightTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 29, color: C.primary, marginVertical: 7 }, ring: { width: 110, height: 110, borderRadius: 55, borderWidth: 10, borderColor: C.blue, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginTop: -10 }, chart: { height: 130, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', marginBottom: 12 }, barWrap: { height: 130, justifyContent: 'flex-end', alignItems: 'center', gap: 7 }, bar: { width: 18, borderRadius: 9, backgroundColor: C.primary }, subHero: { alignItems: 'center', paddingVertical: 12 }, subMark: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#F1DED3', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }, subTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 32, lineHeight: 36, textAlign: 'center', color: C.primary }, bodySmall: { fontFamily: 'Inter_500Medium', fontSize: 14, color: C.foreground }, benefit: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 }, plans: { flexDirection: 'row', gap: 10 }, plan: { flex: 1, padding: 14, borderWidth: 2, borderColor: C.border }, price: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 27, color: C.primary, marginTop: 8 }, profile: { alignItems: 'center', paddingVertical: 24 }, bigAvatar: { width: 86, height: 86, borderRadius: 43, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, bigAvatarText: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 38, color: C.primary }, profileName: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 26, color: C.primary, marginBottom: 4 }, chips: { flexDirection: 'row', gap: 7, marginVertical: 14 }, chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 15, backgroundColor: C.muted }, chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: C.primary }, menu: { backgroundColor: C.card, borderRadius: 20, overflow: 'hidden', marginTop: 8 }, menuRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border }, menuText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: C.foreground, flex: 1 }, adminWelcome: { backgroundColor: C.primary }, adminTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 28, color: C.primaryForeground, marginVertical: 7 }, adminGrid: { gap: 8, marginBottom: 14 }, adminStatRow: { flexDirection: 'row', gap: 8 }, adminStat: { flex: 1, marginBottom: 0, paddingVertical: 8, paddingHorizontal: 12 }, adminStatValue: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 18, color: C.primary, lineHeight: 22 }, adminStatLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: C.mutedForeground, marginTop: 1 }, adminTabs: { flexDirection: 'row', backgroundColor: C.muted, borderRadius: 16, padding: 4, marginBottom: 18 }, adminTab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 12 }, adminTabText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: C.mutedForeground }, adminRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }, adminDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.peach }, adminRowText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: C.foreground, flex: 1 }, adminMetric: { fontFamily: 'Inter_700Bold', fontSize: 11, color: C.primary }, tabsShadow: { position: 'absolute', zIndex: 30, shadowColor: '#183B50', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 14 }, tabsWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, backgroundColor: C.primary, borderWidth: 0, overflow: 'hidden' }, tabPillSlide: { position: 'absolute', left: 0, backgroundColor: '#FFFFFF' }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 1, minWidth: 0 }, tabContent: { alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 2, maxWidth: '100%' }, tabLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 12, color: 'rgba(255,255,255,0.82)', textAlign: 'center' }, tabLabelActive: { fontFamily: 'Inter_700Bold', color: C.primary },
 splash: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', padding: 28 }, splashLogoClip: { width: 220, height: 220, borderRadius: 110, overflow: 'hidden', marginBottom: 16 }, splashLogo: { width: 220, height: 220, borderRadius: 110 }, splashTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 34, color: C.primary }, splashTag: { fontFamily: 'Inter_500Medium', fontSize: 13, color: C.blue, letterSpacing: 1.1, marginTop: 10, marginBottom: 42 }, logoBlock: { alignItems: 'center' }, logo: { width: 140, height: 140, marginBottom: 12 }, brand: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 30, color: C.primary, marginTop: 18 }, tagline: { fontFamily: 'Inter_500Medium', fontSize: 12, color: C.blue, letterSpacing: 1, marginTop: 8 }, auth: { flexGrow: 1, backgroundColor: C.background, paddingHorizontal: 24, paddingBottom: 30, alignItems: 'center' }, authForm: { width: 360, maxWidth: '100%', alignSelf: 'center' }, authTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 32, color: C.primary, textAlign: 'center', marginTop: 25 }, authCopy: { fontFamily: 'Inter_400Regular', fontSize: 14, color: C.mutedForeground, textAlign: 'center', marginTop: 6, marginBottom: 25 }, input: { height: 52, width: '100%', backgroundColor: C.card, borderRadius: 15, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, fontFamily: 'Inter_400Regular', fontSize: 15, marginBottom: 12 }, passwordField: { position: 'relative', width: '100%' }, passwordInput: { paddingRight: 48 }, passwordToggle: { position: 'absolute', right: 8, top: 6, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, error: { fontFamily: 'Inter_500Medium', fontSize: 12, color: C.destructive, marginBottom: 4 }, demoRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }, avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.peach, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 17, color: C.primary }, demoName: { fontFamily: 'Inter_700Bold', fontSize: 13, color: C.primary }, authFooter: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 }, disclaimer: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, textAlign: 'center', color: C.mutedForeground, marginTop: 20 }, row: { flexDirection: 'row', gap: 10, width: '100%', alignItems: 'stretch' }, rowField: { flex: 1, minWidth: 0 } });

const gateStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 8 },
  brand: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 16, color: C.primary },
  skip: { fontFamily: 'Inter_700Bold', fontSize: 13, color: C.primary },
  viewport: { flex: 1, overflow: 'hidden' },
  track: { flex: 1, flexDirection: 'row' },
  slide: { flex: 1, justifyContent: 'center' },
  copy: { width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 28, alignItems: 'center' },
  artStage: { width: '100%', height: 280, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  artHalo: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#E7EEE5' },
  art: { width: '100%', height: 260 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.6, color: C.blue, marginBottom: 10 },
  title: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 32, lineHeight: 40, color: C.primary, textAlign: 'center' },
  body: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, color: C.mutedForeground, textAlign: 'center', marginTop: 12 },
  footer: { paddingHorizontal: 28, paddingTop: 8, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotActive: { width: 22, backgroundColor: C.primary },
  action: { width: '100%', maxWidth: 360 },
  authColumn: { width: '100%', maxWidth: 420, alignSelf: 'stretch' },
  install: { width: '100%', alignSelf: 'stretch', backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 18 },
  installHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  installEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, color: C.blue, marginBottom: 4 },
  installTitle: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 18, lineHeight: 24, color: C.primary, flexShrink: 1 },
  installToggle: { fontFamily: 'Inter_700Bold', fontSize: 12, color: C.primary, marginTop: 10 },
  installStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  installNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center' },
  installNumText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: C.primary },
  installStepText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, color: C.foreground },
});