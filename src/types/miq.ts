import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'admin';

export type ModuleSectionType =
  | 'dashboard'
  | 'learning'
  | 'checklist'
  | 'rubric'
  | 'reflection'
  | 'appointment'
  | 'feedback';

export type PublishStatus = 'draft' | 'published';

export type TopicFontFamily = 'sans' | 'serif' | 'editorial' | 'mono';
export type TopicFontSize = 'sm' | 'base' | 'lg' | 'xl';
export type TopicTextAlign = 'justify' | 'left' | 'center' | 'right';

export interface TopicStyle {
  fontFamily: TopicFontFamily;
  fontSize: TopicFontSize;
  textColor: string;
  backgroundColor?: string;
  textAlign: TopicTextAlign;
}

export interface ExternalLinkItem {
  label: string;
  url: string;
}

export interface ReferenceMaterialItem {
  title: string;
  source: string;
  url: string;
}

export interface TopicAttachment {
  name: string;
  url: string;
  type: 'image' | 'document';
  size: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: UserRole;
  program: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AdminGrant {
  uid: string;
  email: string;
  grantedBy: string;
  createdAt?: Timestamp;
}

export interface LearningModule {
  id: string;
  slug: string;
  navOrder: number;
  title: string;
  subtitle: string;
  sectionType: ModuleSectionType;
  status: PublishStatus;
  coverImageUrl: string;
  isCore: boolean;
  updatedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SubModule {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  order: number;
  status: PublishStatus;
  updatedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TopicContent {
  id: string;
  moduleId: string;
  subModuleId?: string;
  title: string;
  summary: string;
  order: number;
  status: PublishStatus;
  content: string;
  style: TopicStyle;
  youtubeUrls: string[];
  externalLinks: ExternalLinkItem[];
  attachments: TopicAttachment[];
  referenceMaterials?: ReferenceMaterialItem[];
  updatedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LearningResource {
  id: string;
  title: string;
  description: string;
  moduleId: string;
  resourceType: 'document' | 'image' | 'video' | 'link';
  url: string;
  fileName: string;
  storagePath: string;
  status: PublishStatus;
  uploadedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  order: number;
  status: PublishStatus;
  updatedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SelfAssessmentItem {
  id: string;
  category: string;
  statement: string;
  order: number;
  status: PublishStatus;
  updatedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ScoringMethod = 'percentage' | 'sum' | 'average';

export interface AssessmentBand {
  minScore: number;
  maxScore: number;
  label: string;
  description: string;
}

export interface AssessmentConfig {
  id: string;
  scoringMethod: ScoringMethod;
  scaleMin: number;
  scaleMax: number;
  bands: AssessmentBand[];
  updatedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface RubricLevel {
  label: string;
  score: number;
  description: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  weight: number;
  order: number;
  levels: RubricLevel[];
  status: PublishStatus;
  updatedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StudentProgress {
  userId: string;
  completedTopicIds: string[];
  checkedChecklistIds: string[];
  rubricSelections: Record<string, number>;
  selfAssessmentResponses?: Record<string, number>;
  selfAssessmentScore?: number;
  selfAssessmentMaxScore?: number;
  selfAssessmentScorePct?: number;
  selfAssessmentBandLabel?: string;
  selfAssessmentInterpretation?: string;
  selfAssessmentSubmittedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ReflectionStatus = 'draft' | 'completed';

export interface GuidedReflectionAnswer {
  id: string;
  prompt: string;
  answer: string;
}

export const REFLECTION_GUIDED_QUESTIONS: Array<{
  id: string;
  shortLabel: string;
  prompt: string;
  guidance?: string;
  placeholder: string;
}> = [
  {
    id: 'q1-pengalaman',
    shortLabel: 'Pelaksanaan 5 Fasa M-IQ',
    prompt:
      '1. Bagaimanakah penerapan lima fasa M-IQ (Pemikiran Itqan, Perancangan Berstrategi, Pelaksanaan, Semakan & Penghantaran) membantu anda menyiapkan tugasan ini secara sistematik?',
    placeholder:
      'Huraikan bagaimana anda merancang masa, memahami kehendak tugasan dan melaksanakannya mengikut fasa M-IQ...',
  },
  {
    id: 'q2-kekuatan',
    shortLabel: 'Kekuatan Hasil Kerja',
    prompt:
      '2. Apakah kekuatan utama hasil kerja tugasan anda dari segi ketepatan maklumat, kualiti isi, susunan penulisan dan ketelitian?',
    placeholder:
      'Nyatakan aspek terbaik hasil kerja anda yang membuktikan kesungguhan dan piawaian Itqan...',
  },
  {
    id: 'q3-kelemahan',
    shortLabel: 'Kelemahan & Cabaran',
    prompt:
      '3. Apakah kelemahan, cabaran atau kesilapan yang anda kenal pasti sepanjang proses menyiapkan tugasan ini?',
    placeholder:
      'Kenal pasti kekangan atau kesilapan yang berlaku dengan jujur untuk dijadikan pengajaran...',
  },
  {
    id: 'q4-penambahbaikan',
    shortLabel: 'Langkah Penambahbaikan',
    prompt:
      '4. Apakah langkah penambahbaikan konkrit yang perlu anda lakukan bagi meningkatkan kualiti tugasan akademik seterusnya?',
    placeholder:
      'Senaraikan tindakan pembetulan yang jelas dan praktikal untuk tugasan akan datang...',
  },
  {
    id: 'q5-itqan-ai',
    shortLabel: 'Nilai Itqan & Etika AI',
    prompt:
      '5. Bagaimanakah anda mengaplikasikan nilai Itqan melalui kesungguhan, tanggungjawab dan ketelitian dalam menyiapkan tugasan ini bagi memastikan hasil kerja yang berkualiti? Jika menggunakan AI Generatif, bagaimanakah anda memastikan penggunaannya beretika dan maklumat yang diperoleh disemak kesahihannya?',
    guidance:
      'Panduan jawapan: Jelaskan bagaimana anda mengamalkan kesungguhan, tanggungjawab dan ketelitian bagi memastikan penghasilan tugasan yang berkualiti, serta bagaimana penggunaan AI Generatif dikawal secara beretika dan disemak kesahihannya.',
    placeholder:
      'Huraikan penerapan kesungguhan, tanggungjawab dan ketelitian untuk menghasilkan tugasan yang berkualiti, serta langkah etika dan semakan kesahihan maklumat sekiranya menggunakan AI Generatif...',
  },
];

export const Q5_ITQAN_PROMPT =
  REFLECTION_GUIDED_QUESTIONS[4].prompt;

export function normalizeGuidedPrompt(id: string, prompt: string): string {
  if (id === 'q5-itqan-ai' || /^5\.\s+Bagaimanakah anda menzahirkan nilai Itqan/i.test(prompt)) {
    return Q5_ITQAN_PROMPT;
  }
  const canonical = REFLECTION_GUIDED_QUESTIONS.find((q) => q.id === id);
  return canonical ? canonical.prompt : prompt;
}

export function normalizeReflectionGuidedAnswers(
  answers?: GuidedReflectionAnswer[]
): GuidedReflectionAnswer[] | undefined {
  if (!answers || answers.length === 0) return answers;
  return answers.map((item) => ({
    ...item,
    prompt: normalizeGuidedPrompt(item.id, item.prompt),
  }));
}

export interface StudentReflection {
  id: string;
  userId: string;
  userName: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  assignmentTitle?: string;
  courseCode?: string;
  courseName?: string;
  studentRegNo?: string;
  program?: string;
  lecturerName?: string;
  status?: ReflectionStatus;
  style?: TopicStyle;
  guidedAnswers?: GuidedReflectionAnswer[];
  body: string;
  strengths?: string;
  weaknesses?: string;
  improvements?: string;
  itqanTakeaway: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export function stripHtmlToText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h2|h3|h4|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export type ActivityType =
  | 'topic'
  | 'checklist'
  | 'self_assessment'
  | 'rubric'
  | 'reflection'
  | 'appointment'
  | 'itemu'
  | 'feedback';

export interface StudentActivity {
  id: string;
  userId: string;
  userName: string;
  activityType: ActivityType;
  title: string;
  detail: string;
  createdAt?: Timestamp;
}

export type FeedbackCategory = 'modul' | 'antaramuka' | 'teknikal' | 'umum';

export interface StudentFeedback {
  id: string;
  userId: string;
  userName: string;
  category: FeedbackCategory;
  rating: number;
  message: string;
  adminReply: string;
  status: 'new' | 'reviewed';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LecturerDirectoryEntry {
  uid: string;
  displayName: string;
  title: string;
  isPrimary: boolean;
  active: boolean;
  updatedAt?: Timestamp;
}

export type AppointmentStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rescheduled'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type AppointmentMode = 'bersemuka' | 'dalam_talian';

export interface LecturerAppointment {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  studentRegNo: string;
  program: string;
  lecturerUid: string;
  lecturerName: string;
  courseCode: string;
  courseName: string;
  purpose: string;
  meetingMode: AppointmentMode;
  preferredDate: string;
  preferredTime: string;
  proposedDate: string;
  proposedTime: string;
  status: AppointmentStatus;
  rejectionReason: string;
  lecturerFeedback: string;
  meetingLocationOrLink: string;
  meetingOutcome: string;
  studentUnread: boolean;
  adminUnread: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  respondedAt?: Timestamp;
}

export type ITemuStatus =
  | 'dihantar'
  | 'menunggu_maklum_balas'
  | 'sedang_disemak'
  | 'maklum_balas_diberikan'
  | 'selesai';

export type ITemuAssignmentType =
  | 'tugasan_individu'
  | 'tugasan_berkumpulan'
  | 'projek'
  | 'pembentangan'
  | 'laporan'
  | 'kajian_penyelidikan'
  | 'lain_lain';

export const ITEMU_ASSIGNMENT_TYPE_LABELS: Record<ITemuAssignmentType, string> = {
  tugasan_individu: 'Tugasan Individu',
  tugasan_berkumpulan: 'Tugasan Berkumpulan',
  projek: 'Projek',
  pembentangan: 'Pembentangan',
  laporan: 'Laporan',
  kajian_penyelidikan: 'Kajian atau Penyelidikan',
  lain_lain: 'Lain-lain',
};

export const ITEMU_STATUS_META: Record<
  ITemuStatus,
  { label: string; textColor: string; surfaceClass: string }
> = {
  dihantar: {
    label: 'Dihantar',
    textColor: 'text-slate-700',
    surfaceClass: 'bg-slate-50 border-slate-200',
  },
  menunggu_maklum_balas: {
    label: 'Menunggu Maklum Balas',
    textColor: 'text-amber-700',
    surfaceClass: 'bg-amber-50/70 border-amber-200',
  },
  sedang_disemak: {
    label: 'Sedang Disemak',
    textColor: 'text-[#4C1D95]',
    surfaceClass: 'bg-[#F3E8FF]/60 border-[#4C1D95]/25',
  },
  maklum_balas_diberikan: {
    label: 'Maklum Balas Diberikan',
    textColor: 'text-emerald-700',
    surfaceClass: 'bg-emerald-50/70 border-emerald-200',
  },
  selesai: {
    label: 'Selesai',
    textColor: 'text-[#0A1128]',
    surfaceClass: 'bg-[#FAF3DC] border-[#C59B27]/50',
  },
};

export interface ITemuAttachment {
  name: string;
  url: string;
  storagePath: string;
  type: 'image' | 'document';
  size: number;
}

export interface ITemuRecord {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  studentRegNo: string;
  program: string;
  studentClass: string;
  courseCode: string;
  courseName: string;
  assignmentTitle: string;
  assignmentType: ITemuAssignmentType;
  assignmentTypeOther: string;
  targetSubmissionDate: string;
  guidanceArea: string;
  questionOrIssue: string;
  feedbackExplanation: string;
  attachments: ITemuAttachment[];
  lecturerUid: string;
  lecturerName: string;
  status: ITemuStatus;
  detailedFeedback: string;
  strengthsReview: string;
  weaknessesReview: string;
  improvementSuggestions: string;
  nextActionGuide: string;
  feedbackStyle: TopicStyle;
  feedbackByUid: string;
  feedbackByName: string;
  studentFollowUpNote: string;
  studentUnread: boolean;
  adminUnread: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  feedbackAt?: Timestamp;
}

export const ITQAN_FIVE_PHASES = [
  'Fasa 1: Pemikiran Itqan',
  'Fasa 2: Perancangan Berstrategi',
  'Fasa 3: Pelaksanaan',
  'Fasa 4: Semakan dan Penambahbaikan',
  'Fasa 5: Penghantaran',
] as const;

export const LIKERT_SCALE_OPTIONS = [
  { value: 1, label: 'Sangat Tidak Setuju', shortLabel: '1 · STS' },
  { value: 2, label: 'Tidak Setuju', shortLabel: '2 · TS' },
  { value: 3, label: 'Tidak Pasti', shortLabel: '3 · TP' },
  { value: 4, label: 'Setuju', shortLabel: '4 · S' },
  { value: 5, label: 'Sangat Setuju', shortLabel: '5 · SS' },
] as const;

export interface SelfAssessmentEvaluation {
  answeredCount: number;
  totalItems: number;
  rawSum: number;
  maxSum: number;
  average: number;
  percentage: number;
  displayScore: number;
  displayMax: number;
  matchedBand: AssessmentBand;
}

export function evaluateSelfAssessment(
  responses: Record<string, number>,
  items: SelfAssessmentItem[],
  config: AssessmentConfig
): SelfAssessmentEvaluation {
  const totalItems = items.length;
  let answeredCount = 0;
  let rawSum = 0;

  for (const item of items) {
    const val = responses[item.id];
    if (typeof val === 'number' && val >= config.scaleMin && val <= config.scaleMax) {
      answeredCount += 1;
      rawSum += val;
    }
  }

  const maxSum = totalItems * config.scaleMax;
  const average = answeredCount > 0 ? Number((rawSum / answeredCount).toFixed(2)) : 0;
  const percentage = maxSum > 0 ? Math.round((rawSum / maxSum) * 100) : 0;

  let displayScore = percentage;
  let displayMax = 100;
  if (config.scoringMethod === 'sum') {
    displayScore = rawSum;
    displayMax = maxSum;
  } else if (config.scoringMethod === 'average') {
    displayScore = average;
    displayMax = config.scaleMax;
  }

  const sortedBands = [...config.bands].sort((a, b) => b.minScore - a.minScore);
  const matchedBand =
    sortedBands.find((b) => displayScore >= b.minScore && displayScore <= b.maxScore) ||
    sortedBands.find((b) => displayScore >= b.minScore) ||
    sortedBands[sortedBands.length - 1] || {
      minScore: 0,
      maxScore: 100,
      label: 'Penilaian Direkodkan',
      description: 'Skor penilaian kendiri anda telah direkodkan.',
    };

  return {
    answeredCount,
    totalItems,
    rawSum,
    maxSum,
    average,
    percentage,
    displayScore,
    displayMax,
    matchedBand,
  };
}

export const DEFAULT_TOPIC_STYLE: TopicStyle = {
  fontFamily: 'sans',
  fontSize: 'base',
  textColor: '#1E293B',
  backgroundColor: 'transparent',
  textAlign: 'justify',
};

export function sanitizeId(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return cleaned || `item-${Date.now()}`;
}

export function isSafeHttpUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/src/assets/') || trimmed.startsWith('/m-iq/src/assets/')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function resolveAssetUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('/src/assets/')) return trimmed;
  const basePrefix = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return basePrefix ? `${basePrefix}${trimmed}` : trimmed;
}

export function extractYoutubeId(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();
    let candidate: string | null = null;
    if (host === 'youtu.be') {
      candidate = parsed.pathname.slice(1).split('/')[0] || null;
    } else if (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'www.youtube-nocookie.com'
    ) {
      if (parsed.pathname.startsWith('/embed/')) {
        candidate = parsed.pathname.split('/')[2] || null;
      } else if (parsed.pathname.startsWith('/shorts/')) {
        candidate = parsed.pathname.split('/')[2] || null;
      } else {
        candidate = parsed.searchParams.get('v');
      }
    }
    if (candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
      return candidate;
    }
    return null;
  } catch {
    return null;
  }
}

export function extractGoogleDrivePreviewUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'drive.google.com') {
      return null;
    }
    const match = parsed.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]{10,80})\/(?:preview|view)$/);
    if (!match) return null;
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function getTopicFontClass(fontFamily: TopicFontFamily): string {
  switch (fontFamily) {
    case 'serif':
      return 'font-serif';
    case 'editorial':
      return 'font-serif tracking-[0.01em]';
    case 'mono':
      return 'font-mono';
    case 'sans':
    default:
      return 'font-sans';
  }
}

export function getTopicFontSizeClass(fontSize: TopicFontSize): string {
  switch (fontSize) {
    case 'sm':
      return 'text-sm leading-relaxed';
    case 'lg':
      return 'text-lg leading-relaxed';
    case 'xl':
      return 'text-xl leading-relaxed';
    case 'base':
    default:
      return 'text-base leading-[1.75]';
  }
}

export function getTopicAlignClass(textAlign: TopicTextAlign): string {
  switch (textAlign) {
    case 'left':
      return 'text-left';
    case 'center':
      return 'text-center';
    case 'right':
      return 'text-right';
    case 'justify':
    default:
      return 'text-justify';
  }
}
