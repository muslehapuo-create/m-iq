import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Download,
  MessageSquare,
  PenTool,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HERO_BANNER_IMAGE } from '../lib/seedData';
import {
  ITQAN_FIVE_PHASES,
  resolveAssetUrl,
  type ActivityType,
  type AssessmentConfig,
  type ChecklistItem,
  type ITemuRecord,
  type LearningModule,
  type RubricCriterion,
  type SelfAssessmentItem,
  type StudentActivity,
  type StudentProgress,
  type StudentReflection,
  type TopicContent,
} from '../types/miq';
import { IRefleksiIcon } from './IRefleksiIcon';

interface DashboardViewProps {
  modules: LearningModule[];
  topics: TopicContent[];
  checklistItems: ChecklistItem[];
  selfAssessmentItems: SelfAssessmentItem[];
  assessmentConfig: AssessmentConfig;
  rubricCriteria: RubricCriterion[];
  progress: StudentProgress | null;
  reflections: StudentReflection[];
  studentActivities: StudentActivity[];
  itemuRecords?: ITemuRecord[];
  onNavigate: (slug: string) => void;
  onOpenAdmin: () => void;
}

function getActivityMeta(type: ActivityType) {
  switch (type) {
    case 'topic':
      return { label: 'Modul', Icon: BookOpen, color: 'text-[#4C1D95]' };
    case 'checklist':
      return { label: 'Senarai Semak', Icon: CheckSquare, color: 'text-[#9A7414]' };
    case 'self_assessment':
      return { label: 'Penilaian Kendiri', Icon: ClipboardCheck, color: 'text-[#4C1D95]' };
    case 'rubric':
      return { label: 'Rubrik', Icon: Award, color: 'text-[#9A7414]' };
    case 'reflection':
      return { label: 'Refleksi', Icon: PenTool, color: 'text-[#4C1D95]' };
    case 'appointment':
    case 'itemu':
      return { label: 'i-TEMU', Icon: CalendarCheck2, color: 'text-[#4C1D95]' };
    case 'feedback':
    default:
      return { label: 'Maklum Balas', Icon: MessageSquare, color: 'text-slate-600' };
  }
}

export function DashboardView({
  modules,
  topics,
  checklistItems,
  selfAssessmentItems,
  assessmentConfig,
  rubricCriteria,
  progress,
  reflections,
  studentActivities,
  itemuRecords = [],
  onNavigate,
  onOpenAdmin,
}: DashboardViewProps) {
  const { user, profile, isAdmin } = useAuth();
  const myITemuRecords = itemuRecords.filter((r) => !user || r.userId === user.uid);
  const unreadITemuCount = myITemuRecords.filter((r) => r.studentUnread).length;

  const publishedTopics = topics.filter((t) => t.status === 'published');
  const completedTopicIds = progress?.completedTopicIds ?? [];
  const completedTopicsCount = completedTopicIds.filter((id) =>
    publishedTopics.some((t) => t.id === id)
  ).length;
  const topicPct =
    publishedTopics.length > 0
      ? Math.round((completedTopicsCount / publishedTopics.length) * 100)
      : 0;

  const publishedChecklist = checklistItems.filter((c) => c.status === 'published');
  const checkedIds = progress?.checkedChecklistIds ?? [];
  const checkedCount = checkedIds.filter((id) =>
    publishedChecklist.some((c) => c.id === id)
  ).length;
  const checklistPct =
    publishedChecklist.length > 0
      ? Math.round((checkedCount / publishedChecklist.length) * 100)
      : 0;

  const publishedRubrics = rubricCriteria.filter((r) => r.status === 'published');
  const rubricSelections = progress?.rubricSelections ?? {};
  const totalWeight = publishedRubrics.reduce((acc, c) => acc + c.weight, 0);
  const rubricWeighted = publishedRubrics.reduce((acc, c) => {
    const chosen = rubricSelections[c.id];
    if (!chosen) return acc;
    const maxScore = Math.max(...c.levels.map((l) => l.score), 1);
    return acc + (chosen / maxScore) * c.weight;
  }, 0);
  const rubricPct = totalWeight > 0 ? Math.round((rubricWeighted / totalWeight) * 100) : 0;
  const rubricAnsweredCount = publishedRubrics.filter(
    (r) => typeof rubricSelections[r.id] === 'number'
  ).length;

  const myReflections = reflections.filter((r) => !user || r.userId === user.uid);
  const myActivities = studentActivities.filter((a) => !user || a.userId === user.uid);

  const publishedAssessmentItems = selfAssessmentItems.filter((i) => i.status === 'published');
  const hasSelfAssessment =
    typeof progress?.selfAssessmentScore === 'number' &&
    Boolean(progress?.selfAssessmentBandLabel);

  const selfAssessmentDisplay = hasSelfAssessment
    ? assessmentConfig.scoringMethod === 'percentage'
      ? `${progress!.selfAssessmentScore}%`
      : assessmentConfig.scoringMethod === 'average'
      ? `${Number(progress!.selfAssessmentScore).toFixed(2)}/${progress!.selfAssessmentMaxScore ?? 5}`
      : `${progress!.selfAssessmentScore}/${progress!.selfAssessmentMaxScore ?? publishedAssessmentItems.length * 5}`
    : 'Belum Dinilai';

  const learningModules = modules.filter(
    (m) => m.sectionType === 'learning' && (isAdmin || m.status === 'published')
  );
  const navCards = modules.filter((m) => m.slug !== 'dashboard');

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="rounded-xl overflow-hidden border border-slate-200 bg-white grid lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-[#9A7414] mb-2">
              Rangka Kerja M-IQ · {profile?.displayName || 'Pelajar Politeknik'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight mb-3 [text-wrap:balance]">
              Membina Minda Itqan, Membudayakan Kualiti dalam Tindakan
            </h1>
            <p className="text-sm text-slate-600 text-justify leading-relaxed mb-6">
              Selamat datang ke portal pembelajaran digital M-IQ (Mindset Itqan). Terokai setiap modul secara berurutan, lengkapkan senarai semak lima fasa Itqan serta penilaian kendiri, semak rubrik kualiti tugasan dan rekodkan refleksi peribadi anda bagi memastikan setiap tugasan akademik dihasilkan dengan teliti, beretika dan berkualiti tinggi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('pengenalan-miq')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold hover:bg-[#3B0764] transition-colors whitespace-nowrap"
            >
              <span>Mulakan Modul 01</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('instrumen-penilaian-kendiri')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-[#0F172A] hover:border-[#4C1D95]/40 transition-colors whitespace-nowrap"
            >
              <CheckSquare className="w-4 h-4 text-[#9A7414]" />
              <span>Semak &amp; Nilai Kendiri</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-sm font-semibold hover:bg-[#1E293B] transition-colors whitespace-nowrap"
              >
                <Shield className="w-4 h-4" />
                <span>Panel Pentadbir (CMS)</span>
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 min-h-[220px] bg-[#0A1128] relative">
          <img
            src={resolveAssetUrl(HERO_BANNER_IMAGE)}
            alt="Suasana pembelajaran akademik M-IQ"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128]/70 via-transparent to-transparent" />
        </div>
      </section>

      {/* Progress KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Kemajuan Modul</span>
            <BookOpen className="w-4 h-4 text-[#4C1D95]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">{topicPct}%</div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {completedTopicsCount}/{publishedTopics.length} topik selesai
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Senarai Semak Itqan</span>
            <CheckSquare className="w-4 h-4 text-[#9A7414]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">{checklistPct}%</div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {checkedCount}/{publishedChecklist.length} tindakan selesai
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Penilaian Kendiri</span>
            <ClipboardCheck className="w-4 h-4 text-[#4C1D95]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">
            {selfAssessmentDisplay}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            {hasSelfAssessment ? progress?.selfAssessmentBandLabel : 'Skala Likert 1–5'}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#C59B27]/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#4C1D95]">i-Refleksi M-IQ</span>
            <IRefleksiIcon size="sm" className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">
            {myReflections.length} Rekod
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            Rubrik tugasan: {rubricPct}% ({rubricAnsweredCount}/{publishedRubrics.length})
          </div>
        </div>
      </section>

      {/* Featured Official Module: i-Refleksi M-IQ */}
      <section className="rounded-xl overflow-hidden border border-[#C59B27]/50 bg-[#0A1128] text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <IRefleksiIcon size="lg" className="w-12 h-12 shrink-0" />
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-[#F5E6B8] tracking-wide">
              Medium Rasmi Penulisan Refleksi Tugasan · i-REFLEKSI M-IQ
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              i-Refleksi M-IQ — Refleksi Tugasan Berteraskan Nilai Itqan.
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 text-justify leading-relaxed max-w-3xl">
              Lengkapkan refleksi tugasan anda melalui i-Refleksi M-IQ. Refleksi yang telah lengkap boleh dimuat turun dalam format PDF untuk dilampirkan bersama tugasan akademik.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('refleksi-pelajar')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C59B27] text-[#0A1128] text-xs sm:text-sm font-bold hover:bg-[#D4AF37] transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Buka i-Refleksi M-IQ</span>
          </button>
        </div>
      </section>

      {/* Rekod Kemajuan & Sejarah Aktiviti Pembelajaran */}
      <section className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Per-Module & 5-Phase Progress Charts */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Rekod Kemajuan Modul Pembelajaran
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Peratus penyelesaian topik bagi setiap modul M-IQ anda.
                </p>
              </div>
              <span className="text-xs font-bold text-[#4C1D95] tabular-nums">{topicPct}%</span>
            </div>

            <div className="space-y-3">
              {learningModules.map((mod) => {
                const modTopics = publishedTopics.filter((t) => t.moduleId === mod.id);
                const modDone = modTopics.filter((t) => completedTopicIds.includes(t.id)).length;
                const modPct =
                  modTopics.length > 0 ? Math.round((modDone / modTopics.length) * 100) : 0;

                return (
                  <div key={mod.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => onNavigate(mod.slug)}
                        className="font-semibold text-[#0F172A] hover:text-[#4C1D95] text-left truncate"
                      >
                        {mod.title}
                      </button>
                      <span className="font-mono text-slate-600 tabular-nums shrink-0">
                        {modDone}/{modTopics.length} ({modPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-[#4C1D95] transition-all duration-300"
                        style={{ width: `${modPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Kemajuan Senarai Semak 5 Fasa M-IQ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Status pelaksanaan amalan Itqan daripada perancangan hingga penghantaran.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('instrumen-penilaian-kendiri')}
                className="text-xs font-semibold text-[#4C1D95] hover:underline whitespace-nowrap"
              >
                Kemaskini Semakan
              </button>
            </div>

            <div className="space-y-3">
              {ITQAN_FIVE_PHASES.map((phase) => {
                const phaseItems = publishedChecklist.filter((i) => i.category === phase);
                const phaseDone = phaseItems.filter((i) => checkedIds.includes(i.id)).length;
                const phasePct =
                  phaseItems.length > 0 ? Math.round((phaseDone / phaseItems.length) * 100) : 0;
                return (
                  <div key={phase} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-[#0F172A]">{phase}</span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {phaseDone}/{phaseItems.length} ({phasePct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-[#C59B27] transition-all duration-300"
                        style={{ width: `${phasePct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status Cards + Real Activity History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-[#0F172A]">
              Status Penilaian &amp; Refleksi Semasa
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg bg-[#F8F9FC] border border-slate-200 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#0F172A]">
                    Penilaian Kendiri (Skala 1–5)
                  </span>
                  <span
                    className={`font-semibold ${
                      hasSelfAssessment ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {hasSelfAssessment ? 'Selesai' : 'Belum Lengkap'}
                  </span>
                </div>
                {hasSelfAssessment ? (
                  <>
                    <div className="text-sm font-bold text-[#4C1D95] tabular-nums">
                      {selfAssessmentDisplay} · {progress?.selfAssessmentBandLabel}
                    </div>
                    <p className="text-[11px] text-slate-600 text-justify leading-relaxed">
                      {progress?.selfAssessmentInterpretation}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-600">
                    Lengkapkan {publishedAssessmentItems.length} pernyataan skala Likert untuk melihat skor &amp; interpretasi anda.
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-lg bg-[#F8F9FC] border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#0F172A]">Rubrik Kualiti Tugasan</div>
                  <div className="text-slate-600 mt-0.5 tabular-nums">
                    {rubricAnsweredCount}/{publishedRubrics.length} kriteria dinilai ({rubricPct}%)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('rubrik-kualiti-tugasan')}
                  className="text-xs font-semibold text-[#4C1D95] hover:underline shrink-0"
                >
                  Buka Rubrik
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F3E8FF]/40 border border-[#C59B27]/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <IRefleksiIcon size="sm" className="w-6 h-6 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0F172A]">i-Refleksi M-IQ</div>
                    <div className="text-slate-600 mt-0.5 tabular-nums">
                      {myReflections.length > 0
                        ? `${myReflections.length} refleksi telah direkodkan`
                        : 'Belum ada refleksi direkodkan'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('refleksi-pelajar')}
                  className="text-xs font-semibold text-[#4C1D95] hover:underline shrink-0"
                >
                  Tulis Refleksi
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F8F9FC] border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <MessageSquare className="w-5 h-5 text-[#4C1D95] shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0F172A]">
                      Maklum Balas Pensyarah (i-TEMU)
                    </div>
                    <div className="text-slate-600 mt-0.5 tabular-nums">
                      {unreadITemuCount > 0
                        ? `${unreadITemuCount} maklum balas baharu daripada pensyarah`
                        : myITemuRecords.length > 0
                        ? `${myITemuRecords.length} rekod pertanyaan & maklum balas`
                        : 'Ajukan persoalan tugasan & terima maklum balas pensyarah'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('i-temu-pensyarah')}
                  className="text-xs font-semibold text-[#4C1D95] hover:underline shrink-0 whitespace-nowrap"
                >
                  Maklum Balas Pensyarah
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4C1D95]" />
                <span>Sejarah Aktiviti Pembelajaran</span>
              </h2>
              <span className="text-xs text-slate-500 tabular-nums">{myActivities.length} rekod</span>
            </div>

            {myActivities.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 leading-relaxed">
                Belum ada aktiviti pembelajaran direkodkan. Tandakan topik selesai, kemas kini senarai semak, jawab penilaian kendiri atau tulis refleksi untuk memulakan sejarah aktiviti anda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                {myActivities.slice(0, 12).map((act) => {
                  const meta = getActivityMeta(act.activityType);
                  const Icon = meta.Icon;
                  const dateText = act.createdAt?.seconds
                    ? new Date(act.createdAt.seconds * 1000).toLocaleString('ms-MY', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Baru sahaja';
                  return (
                    <div key={act.id} className="px-5 py-3.5 flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[#4C1D95]">
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {dateText}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#0F172A] mt-0.5 truncate">
                          {act.title}
                        </div>
                        {act.detail && (
                          <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                            {act.detail}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Navigation Cards Grid */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Peta Pembelajaran &amp; Instrumen M-IQ
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Pilih mana-mana modul atau instrumen di bawah untuk meneruskan pembelajaran anda.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {navCards.map((mod) => {
            const modTopics = publishedTopics.filter((t) => t.moduleId === mod.id);
            const modDone = modTopics.filter((t) => completedTopicIds.includes(t.id)).length;
            const modComplete = modTopics.length > 0 && modDone === modTopics.length;
            const isReflection =
              mod.sectionType === 'reflection' || mod.slug === 'refleksi-pelajar';

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onNavigate(mod.slug)}
                className={`group text-left p-5 rounded-xl transition-colors flex flex-col justify-between ${
                  isReflection
                    ? 'bg-[#F8F9FC] border-2 border-[#C59B27]/60 hover:border-[#4C1D95]'
                    : 'bg-white border border-slate-200 hover:border-[#4C1D95]/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                    <span className="font-mono font-semibold text-[#4C1D95] tabular-nums">
                      Bahagian {String(mod.navOrder).padStart(2, '0')}
                    </span>
                    {mod.sectionType === 'learning' ? (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        {modComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>
                          {modDone}/{modTopics.length} topik
                        </span>
                      </span>
                    ) : isReflection ? (
                      <span className="font-semibold text-[#9A7414]">
                        Editor &amp; PDF Rasmi
                      </span>
                    ) : mod.sectionType === 'appointment' || mod.slug === 'i-temu-pensyarah' ? (
                      <span className="font-semibold text-[#4C1D95]">
                        Maklum Balas Pensyarah
                      </span>
                    ) : (
                      <span>Instrumen Interaktif</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    {isReflection && <IRefleksiIcon size="md" className="w-8 h-8 shrink-0" />}
                    <h3 className="text-base font-semibold text-[#0F172A] group-hover:text-[#4C1D95] transition-colors">
                      {isReflection && mod.title === 'Refleksi Pelajar'
                        ? 'i-Refleksi M-IQ'
                        : mod.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 text-justify leading-relaxed">
                    {mod.subtitle}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#4C1D95]">
                  <span>{isReflection ? 'Buka i-Refleksi M-IQ' : 'Buka Bahagian'}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
