import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  Edit3,
  ListChecks,
  Save,
  Square,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  evaluateSelfAssessment,
  ITQAN_FIVE_PHASES,
  LIKERT_SCALE_OPTIONS,
  type AssessmentConfig,
  type ChecklistItem,
  type SelfAssessmentItem,
  type StudentProgress,
} from '../types/miq';

interface ChecklistViewProps {
  items: ChecklistItem[];
  selfAssessmentItems: SelfAssessmentItem[];
  assessmentConfig: AssessmentConfig;
  progress: StudentProgress | null;
  onToggleItem: (itemId: string) => Promise<void>;
  onSubmitSelfAssessment: (
    responses: Record<string, number>,
    publishedItems: SelfAssessmentItem[],
    config: AssessmentConfig
  ) => Promise<void>;
  onOpenAdminChecklist: (subTab?: 'checklist' | 'self-assessment') => void;
}

export function ChecklistView({
  items,
  selfAssessmentItems,
  assessmentConfig,
  progress,
  onToggleItem,
  onSubmitSelfAssessment,
  onOpenAdminChecklist,
}: ChecklistViewProps) {
  const { isAdmin } = useAuth();
  const [activeInstrument, setActiveInstrument] = useState<'checklist' | 'self-assessment'>(
    'checklist'
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');

  // Self-assessment Likert state synced from Firestore progress
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentNotice, setAssessmentNotice] = useState<string | null>(null);

  useEffect(() => {
    if (progress?.selfAssessmentResponses) {
      setResponses(progress.selfAssessmentResponses);
    }
  }, [progress?.selfAssessmentResponses]);

  const visibleItems = useMemo(
    () => (isAdmin ? items : items.filter((i) => i.status === 'published')),
    [isAdmin, items]
  );

  const visibleAssessmentItems = useMemo(
    () =>
      isAdmin
        ? selfAssessmentItems
        : selfAssessmentItems.filter((i) => i.status === 'published'),
    [isAdmin, selfAssessmentItems]
  );

  const publishedAssessmentItems = useMemo(
    () => selfAssessmentItems.filter((i) => i.status === 'published'),
    [selfAssessmentItems]
  );

  const checkedIds = progress?.checkedChecklistIds ?? [];
  const completedCount = visibleItems.filter((i) => checkedIds.includes(i.id)).length;
  const pct =
    visibleItems.length > 0 ? Math.round((completedCount / visibleItems.length) * 100) : 0;

  // Group checklist items prioritizing the 5 M-IQ phases in canonical order
  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const phase of ITQAN_FIVE_PHASES) {
      map.set(phase, []);
    }
    for (const item of visibleItems) {
      const cat = item.category || 'Umum';
      const arr = map.get(cat) || [];
      arr.push(item);
      map.set(cat, arr);
    }
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [visibleItems]);

  const visibleGrouped = useMemo(() => {
    if (selectedPhaseFilter === 'all') return grouped;
    return grouped.filter(([category]) => category === selectedPhaseFilter);
  }, [grouped, selectedPhaseFilter]);

  const groupedAssessment = useMemo(() => {
    const map = new Map<string, SelfAssessmentItem[]>();
    for (const item of visibleAssessmentItems) {
      const cat = item.category || 'Umum';
      const arr = map.get(cat) || [];
      arr.push(item);
      map.set(cat, arr);
    }
    return Array.from(map.entries());
  }, [visibleAssessmentItems]);

  const liveEvaluation = useMemo(
    () => evaluateSelfAssessment(responses, visibleAssessmentItems, assessmentConfig),
    [responses, visibleAssessmentItems, assessmentConfig]
  );

  const hasSavedSubmission =
    typeof progress?.selfAssessmentScore === 'number' &&
    Boolean(progress?.selfAssessmentBandLabel);

  const allAnswered =
    visibleAssessmentItems.length > 0 &&
    liveEvaluation.answeredCount === visibleAssessmentItems.length;

  const handleToggle = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await onToggleItem(id);
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveAssessment = async () => {
    if (savingAssessment || visibleAssessmentItems.length === 0) return;
    if (liveEvaluation.answeredCount === 0) {
      setAssessmentNotice('Sila pilih skala 1–5 bagi pernyataan penilaian kendiri terlebih dahulu.');
      return;
    }
    setSavingAssessment(true);
    setAssessmentNotice(null);
    try {
      const targetItems =
        publishedAssessmentItems.length > 0 ? publishedAssessmentItems : visibleAssessmentItems;
      await onSubmitSelfAssessment(responses, targetItems, assessmentConfig);
      setAssessmentNotice('Keputusan penilaian kendiri anda telah disimpan ke rekod kemajuan.');
    } finally {
      setSavingAssessment(false);
    }
  };

  const formatScoreDisplay = (score: number, maxScore: number) => {
    if (assessmentConfig.scoringMethod === 'percentage') return `${score}%`;
    if (assessmentConfig.scoringMethod === 'average') return `${score.toFixed(2)} / ${maxScore}`;
    return `${score} / ${maxScore}`;
  };

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold text-[#9A7414] mb-1.5">
            Bahagian 09 · Instrumen Penilaian Kendiri &amp; Amalan Itqan
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2">
            Senarai Semak &amp; Penilaian Kendiri M-IQ
          </h1>
          <p className="text-sm text-slate-600 text-justify leading-relaxed">
            Pantau pelaksanaan tugasan anda melalui senarai semak lima fasa M-IQ dan lengkapkan instrumen penilaian kendiri berskala Likert 1–5 bagi mendapatkan skor serta interpretasi kualiti kerja anda.
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-start lg:items-end gap-2">
          {activeInstrument === 'checklist' ? (
            <>
              <div className="text-3xl font-bold text-[#4C1D95] tabular-nums">{pct}%</div>
              <div className="text-xs text-slate-500 tabular-nums">
                {completedCount} daripada {visibleItems.length} tindakan Itqan selesai
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-[#4C1D95] tabular-nums">
                {hasSavedSubmission
                  ? formatScoreDisplay(
                      progress!.selfAssessmentScore!,
                      progress!.selfAssessmentMaxScore ?? liveEvaluation.displayMax
                    )
                  : `${liveEvaluation.answeredCount}/${visibleAssessmentItems.length}`}
              </div>
              <div className="text-xs text-slate-500 tabular-nums">
                {hasSavedSubmission
                  ? progress?.selfAssessmentBandLabel
                  : 'Pernyataan skala Likert dijawab'}
              </div>
            </>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onOpenAdminChecklist(activeInstrument)}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-xs font-semibold hover:bg-[#1E293B] transition-colors whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>
                {activeInstrument === 'checklist'
                  ? 'Urus Senarai Semak'
                  : 'Urus Item & Pemarkahan Kendiri'}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Segmented Switcher */}
      <div className="inline-flex flex-wrap p-1 rounded-xl bg-white border border-slate-200 gap-1">
        <button
          type="button"
          onClick={() => setActiveInstrument('checklist')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
            activeInstrument === 'checklist'
              ? 'bg-[#4C1D95] text-white'
              : 'text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>Senarai Semak Amalan Itqan (5 Fasa)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveInstrument('self-assessment')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
            activeInstrument === 'self-assessment'
              ? 'bg-[#4C1D95] text-white'
              : 'text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Penilaian Kendiri (Skala 1–5)</span>
        </button>
      </div>

      {activeInstrument === 'checklist' ? (
        <div className="space-y-6">
          {/* 5-Phase Summary Strip */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  Kemajuan Mengikut Lima Fasa M-IQ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih fasa untuk menapis tindakan atau tandakan terus item di bawah.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#4C1D95] tabular-nums">
                Keseluruhan: {completedCount}/{visibleItems.length} ({pct}%)
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-[#4C1D95] transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {grouped.map(([category, catItems]) => {
                const doneInCat = catItems.filter((i) => checkedIds.includes(i.id)).length;
                const catPct =
                  catItems.length > 0 ? Math.round((doneInCat / catItems.length) * 100) : 0;
                const isSelected = selectedPhaseFilter === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setSelectedPhaseFilter((prev) => (prev === category ? 'all' : category))
                    }
                    className={`text-left p-3.5 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-[#4C1D95] bg-[#4C1D95]/5'
                        : 'border-slate-200 bg-[#F8F9FC] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-[#0F172A] truncate">
                        {category}
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#4C1D95] tabular-nums shrink-0">
                        {catPct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-[#C59B27] transition-all duration-300"
                        style={{ width: `${catPct}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {doneInCat}/{catItems.length} tindakan selesai
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedPhaseFilter !== 'all' && (
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedPhaseFilter('all')}
                  className="text-xs font-semibold text-[#4C1D95] hover:underline"
                >
                  Papar semua fasa ({grouped.length})
                </button>
              </div>
            )}
          </div>

          {visibleGrouped.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-600">
              Tiada item senarai semak diterbitkan setakat ini.
            </div>
          ) : (
            <div className="space-y-5">
              {visibleGrouped.map(([category, catItems]) => {
                const doneInCat = catItems.filter((i) => checkedIds.includes(i.id)).length;
                return (
                  <section
                    key={category}
                    className="rounded-xl bg-white border border-slate-200 overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200 flex items-center justify-between gap-4">
                      <h2 className="text-base font-semibold text-[#0F172A]">{category}</h2>
                      <span className="text-xs font-medium text-slate-600 tabular-nums">
                        {doneInCat}/{catItems.length} selesai
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {catItems.map((item) => {
                        const checked = checkedIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleToggle(item.id)}
                            disabled={busyId === item.id}
                            className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex items-start gap-4"
                          >
                            {checked ? (
                              <CheckSquare className="w-5 h-5 text-[#4C1D95] shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-sm font-semibold ${
                                  checked ? 'text-[#4C1D95]' : 'text-[#0F172A]'
                                }`}
                              >
                                {item.title}
                                {item.status === 'draft' ? ' (Draf)' : ''}
                              </div>
                              {item.description && (
                                <p className="text-xs text-slate-600 text-justify leading-relaxed mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Scale Legend */}
          <section className="rounded-xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Panduan Skala Penilaian Kendiri (1–5)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pilih tahap persetujuan yang paling tepat menggambarkan amalan anda dalam tugasan ini.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#4C1D95] tabular-nums">
                {liveEvaluation.answeredCount}/{visibleAssessmentItems.length} pernyataan dijawab
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {LIKERT_SCALE_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className="p-3 rounded-lg bg-[#F8F9FC] border border-slate-200 text-center"
                >
                  <div className="text-base font-bold text-[#4C1D95] font-mono tabular-nums">
                    {opt.value}
                  </div>
                  <div className="text-xs font-medium text-[#0F172A] mt-0.5">{opt.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Statements by Category */}
          {groupedAssessment.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-600">
              Tiada pernyataan penilaian kendiri diterbitkan setakat ini.
            </div>
          ) : (
            <div className="space-y-5">
              {groupedAssessment.map(([category, catItems]) => (
                <section
                  key={category}
                  className="rounded-xl bg-white border border-slate-200 overflow-hidden"
                >
                  <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200 flex items-center justify-between gap-4">
                    <h3 className="text-base font-semibold text-[#0F172A]">{category}</h3>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {catItems.filter((i) => typeof responses[i.id] === 'number').length}/
                      {catItems.length} dijawab
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {catItems.map((item, idx) => {
                      const chosen = responses[item.id];
                      return (
                        <div key={item.id} className="p-5 sm:px-6 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-[#0F172A] text-justify leading-relaxed">
                              <span className="font-mono text-xs text-[#4C1D95] mr-2 tabular-nums">
                                {String(idx + 1).padStart(2, '0')}.
                              </span>
                              {item.statement}
                              {item.status === 'draft' ? ' (Draf)' : ''}
                            </p>
                            {typeof chosen === 'number' && (
                              <span className="text-xs font-semibold text-[#4C1D95] shrink-0 tabular-nums">
                                Skor {chosen}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-5 gap-2">
                            {LIKERT_SCALE_OPTIONS.map((opt) => {
                              const active = chosen === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() =>
                                    setResponses((prev) => ({ ...prev, [item.id]: opt.value }))
                                  }
                                  aria-label={`${opt.value} - ${opt.label}`}
                                  className={`py-2 px-2 rounded-lg border text-center transition-colors ${
                                    active
                                      ? 'bg-[#4C1D95] border-[#4C1D95] text-white'
                                      : 'bg-white border-slate-200 text-slate-700 hover:border-[#4C1D95]/40'
                                  }`}
                                >
                                  <div className="text-sm font-bold font-mono tabular-nums">
                                    {opt.value}
                                  </div>
                                  <div
                                    className={`text-[10px] leading-tight mt-0.5 hidden sm:block ${
                                      active ? 'text-white/90' : 'text-slate-500'
                                    }`}
                                  >
                                    {opt.label}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Save & Compute Action + Result Interpretation */}
          <section className="rounded-xl bg-white border border-slate-200 p-6 space-y-5">
            {assessmentNotice && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{assessmentNotice}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Simpan &amp; Semak Keputusan Penilaian Kendiri
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                  {allAnswered
                    ? 'Semua pernyataan telah dijawab. Klik butang untuk merekod skor rasmi anda.'
                    : `Sila jawab semua pernyataan untuk ketepatan penuh (${liveEvaluation.answeredCount}/${visibleAssessmentItems.length} dijawab).`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveAssessment}
                disabled={savingAssessment || liveEvaluation.answeredCount === 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold hover:bg-[#3B0764] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                <span>
                  {savingAssessment ? 'Menyimpan Keputusan...' : 'Simpan & Lihat Keputusan'}
                </span>
              </button>
            </div>

            {(hasSavedSubmission || liveEvaluation.answeredCount > 0) && (
              <div className="pt-5 border-t border-slate-200 grid lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-5 rounded-xl bg-[#0A1128] text-white p-6 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#F5E6B8] flex items-center gap-1.5 mb-2">
                      <Award className="w-4 h-4" />
                      <span>
                        {hasSavedSubmission
                          ? 'Keputusan Penilaian Kendiri Disimpan'
                          : 'Pratonton Skor Semasa'}
                      </span>
                    </div>
                    <div className="text-4xl font-bold text-white tabular-nums">
                      {formatScoreDisplay(
                        liveEvaluation.displayScore,
                        liveEvaluation.displayMax
                      )}
                    </div>
                    <div className="text-sm font-semibold text-[#F5E6B8] mt-2">
                      {liveEvaluation.matchedBand.label}
                    </div>
                    <p className="text-xs text-slate-300 text-justify leading-relaxed mt-2">
                      {liveEvaluation.matchedBand.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs text-slate-400">Jumlah Mata</div>
                      <div className="text-sm font-bold text-white tabular-nums mt-0.5">
                        {liveEvaluation.rawSum}/{liveEvaluation.maxSum}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Purata</div>
                      <div className="text-sm font-bold text-white tabular-nums mt-0.5">
                        {liveEvaluation.average.toFixed(2)}/5.00
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Peratus</div>
                      <div className="text-sm font-bold text-[#F5E6B8] tabular-nums mt-0.5">
                        {liveEvaluation.percentage}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 rounded-xl bg-[#F8F9FC] border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Jadual Interpretasi Skor (Ditetapkan Pentadbir)
                    </h4>
                    <span className="text-[11px] font-medium text-slate-500">
                      Kaedah:{' '}
                      {assessmentConfig.scoringMethod === 'percentage'
                        ? 'Peratus (%)'
                        : assessmentConfig.scoringMethod === 'sum'
                        ? 'Jumlah Skor'
                        : 'Purata Skala (1–5)'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {assessmentConfig.bands.map((band, bIdx) => {
                      const isCurrentBand = band.label === liveEvaluation.matchedBand.label;
                      return (
                        <div
                          key={bIdx}
                          className={`p-3 rounded-lg border text-xs transition-colors ${
                            isCurrentBand
                              ? 'bg-white border-[#4C1D95] text-[#0F172A]'
                              : 'bg-white/70 border-slate-200 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 font-semibold">
                            <span className={isCurrentBand ? 'text-[#4C1D95]' : 'text-[#0F172A]'}>
                              {band.label}
                            </span>
                            <span className="font-mono tabular-nums text-[#9A7414]">
                              {band.minScore} – {band.maxScore}
                              {assessmentConfig.scoringMethod === 'percentage' ? '%' : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 text-justify leading-relaxed mt-1">
                            {band.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
