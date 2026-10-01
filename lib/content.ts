import { supabaseAnonKey, supabaseUrl } from '@/lib/public-env';
import { supabase } from '@/lib/supabase';
import type { Attachment } from '@/context/AuthContext';

export type Article = {
  id: string;
  category: string;
  title: string;
  summary: string;
  body: string;
  hero_label: string | null;
  author: string;
  read_minutes: number;
  recommended_for: Attachment | null;
  published_at: string | null;
};

export type AudioSession = {
  id: string;
  title: string;
  category: string;
  duration_seconds: number;
  audio_url: string | null;
  attachment_focus: Attachment | null;
  is_featured: boolean;
};

export type Exercise = {
  id: string;
  title: string;
  summary: string | null;
  duration_minutes: number;
  attachment_style: Attachment | null;
};

export type QaItem = {
  id: string;
  question: string;
  answer: string;
};

export type Plan = {
  id: string;
  interval: 'monthly' | 'annual';
  name: string;
  price_cents: number;
  badge: string | null;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  icon: string;
  created_at: string;
};

export type CheckIn = {
  id: string;
  check_in_date: string;
  mood: string;
  note: string | null;
  mood_score: number;
};

export type AssessmentQuestion = { id: string; prompt: string; sort_order: number };
export type AssessmentOption = { id: string; label: string; letter: string; style: Attachment; sort_order: number };

export const MOOD_SCORE: Record<string, number> = {
  Disconnected: 20,
  Unsettled: 40,
  Neutral: 55,
  Connected: 75,
  Secure: 90,
};

export function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function durationLabel(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (!s) return `${m} min`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return 'Yesterday';
  return `${Math.round(hrs / 24)}d ago`;
}

export function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export async function fetchArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('id, category, title, summary, body, hero_label, author, read_minutes, recommended_for, published_at')
    .eq('status', 'published')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as Article[];
}

export async function fetchArticle(id: string) {
  const { data, error } = await supabase
    .from('articles')
    .select('id, category, title, summary, body, hero_label, author, read_minutes, recommended_for, published_at')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Article;
}

export type ArticleInput = {
  category: string;
  title: string;
  summary: string;
  body: string;
  author: string;
  read_minutes: number;
};

export async function createArticle(input: ArticleInput) {
  const { error } = await supabase.from('articles').insert({
    ...input,
    status: 'published',
    published_at: new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
}

export async function updateArticle(id: string, input: ArticleInput) {
  const { error } = await supabase.from('articles').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteArticle(id: string) {
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadAudioFile(file: Blob, fileName: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in again.');

  const uploaded = await fetch(`${supabaseUrl}/functions/v1/upload-audio`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/octet-stream',
      'X-File-Name': fileName,
    },
    body: file,
  });
  const payload = await uploaded.json().catch(() => ({}));
  if (!uploaded.ok) throw new Error(payload.error || 'Upload failed');
  return payload.url as string;
}

export async function updateAudioSession(
  id: string,
  input: { title: string; category: string; duration_seconds?: number; audio_url?: string },
) {
  const { error } = await supabase.from('audio_sessions').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteAudioSession(id: string) {
  const { error } = await supabase.from('audio_sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function createAudioSession(input: {
  title: string;
  category: string;
  duration_seconds: number;
  audio_url: string;
}) {
  const { error } = await supabase.from('audio_sessions').insert({
    title: input.title,
    category: input.category,
    duration_seconds: input.duration_seconds,
    audio_url: input.audio_url,
    status: 'published',
    is_featured: false,
  });
  if (error) throw error;
}

export async function fetchAudio() {
  const { data, error } = await supabase
    .from('audio_sessions')
    .select('id, title, category, duration_seconds, audio_url, attachment_focus, is_featured')
    .eq('status', 'published')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as AudioSession[];
}

export async function fetchExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, title, summary, duration_minutes, attachment_style')
    .eq('status', 'published')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function fetchQuestions() {
  const { data, error } = await supabase
    .from('qa_items')
    .select('id, question, answer')
    .eq('status', 'published')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as QaItem[];
}

export async function createQuestion(question: string, answer: string) {
  const { error } = await supabase
    .from('qa_items')
    .insert({ question, answer, status: 'published' });
  if (error) throw error;
}

export async function updateQuestion(id: string, question: string, answer: string) {
  const { error } = await supabase
    .from('qa_items')
    .update({ question, answer })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase.from('qa_items').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchPlans() {
  const { data, error } = await supabase.from('plans').select('id, interval, name, price_cents, badge');
  if (error) throw error;
  return (data ?? []) as Plan[];
}

export async function fetchNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, icon, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NotificationItem[];
}

export async function fetchContinue(userId: string) {
  const { data, error } = await supabase
    .from('article_progress')
    .select('progress_pct, article:articles(id, category, title, read_minutes)')
    .eq('user_id', userId)
    .order('last_opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as {
    progress_pct: number;
    article: { id: string; category: string; title: string; read_minutes: number } | null;
  } | null;
}

export async function touchArticle(userId: string, articleId: string) {
  const { data: existing } = await supabase
    .from('article_progress')
    .select('progress_pct')
    .eq('user_id', userId)
    .eq('article_id', articleId)
    .maybeSingle();
  const progress = existing?.progress_pct ?? 0;
  const { error } = await supabase.from('article_progress').upsert({
    user_id: userId,
    article_id: articleId,
    progress_pct: progress,
    last_opened_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function saveReflection(userId: string, articleId: string, body: string) {
  const { error } = await supabase.from('article_reflections').insert({
    user_id: userId,
    article_id: articleId,
    body,
  });
  if (error) throw error;
}

export async function toggleBookmark(userId: string, kind: 'article' | 'audio' | 'exercise' | 'qa', contentId: string) {
  const { data } = await supabase
    .from('bookmarks')
    .select('content_id')
    .eq('user_id', userId)
    .eq('content_kind', kind)
    .eq('content_id', contentId)
    .maybeSingle();
  if (data) {
    const { error } = await supabase.from('bookmarks').delete().eq('user_id', userId).eq('content_kind', kind).eq('content_id', contentId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('bookmarks').insert({ user_id: userId, content_kind: kind, content_id: contentId });
  if (error) throw error;
  return true;
}

export async function fetchBookmarkIds(userId: string, kind: 'article' | 'audio' | 'exercise' | 'qa') {
  const { data, error } = await supabase.from('bookmarks').select('content_id').eq('user_id', userId).eq('content_kind', kind);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.content_id as string));
}

export async function saveCheckIn(userId: string, mood: string, note: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('check_ins').upsert({
    user_id: userId,
    check_in_date: today,
    mood,
    note: note.trim() || null,
    mood_score: MOOD_SCORE[mood] ?? 50,
  }, { onConflict: 'user_id,check_in_date' });
  if (error) throw error;
}

export async function fetchTodayCheckIn(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('check_ins')
    .select('id, check_in_date, mood, note, mood_score')
    .eq('user_id', userId)
    .eq('check_in_date', today)
    .maybeSingle();
  if (error) throw error;
  return data as CheckIn | null;
}

export async function fetchCheckIns(userId: string) {
  const { data, error } = await supabase
    .from('check_ins')
    .select('id, check_in_date, mood, note, mood_score')
    .eq('user_id', userId)
    .order('check_in_date', { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as CheckIn[];
}

export function streakFrom(checkIns: CheckIn[]) {
  const days = new Set(checkIns.map((row) => row.check_in_date));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function fetchStats(userId: string) {
  const [progress, plays, articles, checkIns] = await Promise.all([
    supabase.from('article_progress').select('progress_pct, completed_at').eq('user_id', userId),
    supabase.from('audio_plays').select('listened_seconds').eq('user_id', userId),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    fetchCheckIns(userId),
  ]);
  if (progress.error) throw progress.error;
  if (plays.error) throw plays.error;
  const lessons = (progress.data ?? []).filter((row) => Number(row.progress_pct) > 0 || row.completed_at).length;
  const audioMinutes = Math.round((plays.data ?? []).reduce((sum, row) => sum + (row.listened_seconds ?? 0), 0) / 60);
  return {
    lessons,
    articleCount: articles.count ?? 0,
    audioMinutes,
    streak: streakFrom(checkIns),
    checkIns,
  };
}

export async function recordPlay(userId: string, sessionId: string, listenedSeconds: number) {
  const { error } = await supabase.from('audio_plays').insert({
    user_id: userId,
    session_id: sessionId,
    listened_seconds: listenedSeconds,
  });
  if (error) throw error;
}

export async function fetchAssessment() {
  const [questions, options] = await Promise.all([
    supabase.from('assessment_questions').select('id, prompt, sort_order').order('sort_order'),
    supabase.from('assessment_options').select('id, label, letter, style, sort_order').order('sort_order'),
  ]);
  if (questions.error) throw questions.error;
  if (options.error) throw options.error;
  return {
    questions: (questions.data ?? []) as AssessmentQuestion[],
    options: (options.data ?? []) as AssessmentOption[],
  };
}

export async function saveAssessment(
  userId: string,
  answers: { questionId: string; optionId: string; style: Attachment }[],
) {
  const totals = { anxious: 0, avoidant: 0, secure: 0 };
  answers.forEach((row) => { totals[row.style] += 1; });
  const count = Math.max(answers.length, 1);
  const anxious = Math.round((totals.anxious / count) * 100);
  const avoidant = Math.round((totals.avoidant / count) * 100);
  const secure = Math.max(0, 100 - anxious - avoidant);
  const primary = (Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'secure') as Attachment;
  const { data: attempt, error } = await supabase
    .from('assessment_attempts')
    .insert({
      user_id: userId,
      anxious_pct: anxious,
      secure_pct: secure,
      avoidant_pct: avoidant,
      primary_pattern: primary,
      summary: 'Your responses show a learned pattern, not a fixed identity.',
      completed_at: new Date().toISOString(),
    })
    .select('id, anxious_pct, secure_pct, avoidant_pct, primary_pattern, summary')
    .single();
  if (error) throw error;
  const { error: answerError } = await supabase.from('assessment_answers').insert(
    answers.map((row) => ({ attempt_id: attempt.id, question_id: row.questionId, option_id: row.optionId })),
  );
  if (answerError) throw answerError;
  await supabase.from('profiles').update({ attachment: primary }).eq('id', userId);
  return attempt as {
    id: string;
    anxious_pct: number;
    secure_pct: number;
    avoidant_pct: number;
    primary_pattern: Attachment;
    summary: string | null;
  };
}

export async function fetchLatestAssessment(userId: string) {
  const { data, error } = await supabase
    .from('assessment_attempts')
    .select('anxious_pct, secure_pct, avoidant_pct, primary_pattern, summary')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as {
    anxious_pct: number;
    secure_pct: number;
    avoidant_pct: number;
    primary_pattern: Attachment;
    summary: string | null;
  } | null;
}

export async function startMembership(interval: 'monthly' | 'annual') {
  const { error } = await supabase.rpc('start_membership', { plan_interval: interval });
  if (error) throw error;
}
