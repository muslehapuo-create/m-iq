import { useState } from 'react';
import { Award, BarChart3, Edit3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { RubricCriterion, StudentProgress } from '../types/miq';

interface RubricViewProps {
  criteria: RubricCriterion[];
  progress: StudentProgress | null;
  onSelectScore: (criterionId: string, score: number) => Promise<void>;
  onOpenAdminRubric: () => void;
}

function getRubricTierLabel(pct: number, selectedCount: number): {
  title: string;
  guidance: string;
} {
  if (selectedCount === 0) {
    return {
      title: 'Belum Dinilai',
      guidance:
        'Pilih tahap pencapaian pada setiap kriteria di bawah untuk mengira skor kesediaan tugasan.',
    };
  }
  if (pct >= 80) {
    return {
      title: 'Cemerlang (Piawaian Itqan)',
      guidance:
        'Tugasan memenuhi piawaian kualiti Itqan yang tinggi dari aspek fakta, isi, rujukan, etika AI dan ketelitian.',
    };
  }
  if (pct >= 60) {
    return {
      title: 'Baik',
      guidance:
        'Kualiti tugasan baik. Semak semula kriteria yang masih berada di tahap sederhana untuk penambahbaikan.',
    };
  }
  if (pct >= 40) {
    return {
      title: 'Memuaskan (Perlu Pemurnian)',
      guidance:
        'Tugasan memerlukan semakan lanjut pada ketepatan maklumat, sitasi rujukan dan penyuntingan kendiri.',
    };
  }
  return {
    title: 'Perlu Penambahbaikan Ketara',
    guidance:
      'Rujuk semula panduan modul M-IQ dan berbincang dengan pensyarah sebelum menghantar tugasan.',
  };
}

export function RubricView({
  criteria,
  progress,
  onSelectScore,
  onOpenAdminRubric,
}: RubricViewProps) {
  const { isAdmin } = useAuth();
  const [savingId, setSavingId] = useState<string | null>(null);

  const visibleCriteria = isAdmin
    ? criteria
    : criteria.filter((c) => c.status === 'published');

  const selections = progress?.rubricSelections ?? {};

  const totalWeight = visibleCriteria.reduce((acc, c) => acc + c.weight, 0);
  const weightedScore = visibleCriteria.reduce((acc, c) => {
    const chosen = selections[c.id];
    if (!chosen) return acc;
    const maxLevelScore = Math.max(...c.levels.map((l) => l.score), 1);
    return acc + (chosen / maxLevelScore) * c.weight;
  }, 0);

  const normalizedPct =
    totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

  const selectedCount = visibleCriteria.filter(
    (c) => typeof selections[c.id] === 'number'
  ).length;

  const tier = getRubricTierLabel(normalizedPct, selectedCount);

  const handlePick = async (criterionId: string, score: number) => {
    if (savingId) return;
    setSavingId(criterionId);
    try {
      await onSelectScore(criterionId, score);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold text-[#9A7414] mb-1.5">
            Bahagian 10 · Rubrik Kualiti Tugasan
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2">
            Rubrik Kualiti Tugasan
          </h1>
          <p className="text-sm text-slate-600 text-justify leading-relaxed">
            Nilai tahap kualiti tugasan anda merangkumi ketepatan maklumat, kedalaman isi, sistematika penulisan, sumber rujukan, etika penggunaan AI dan ketelitian hasil akhir mengikut pemberatan yang ditetapkan oleh pentadbir.
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#C59B27]" />
            <span className="text-3xl font-bold text-[#0F172A] tabular-nums">
              {normalizedPct}%
            </span>
          </div>
          <div className="text-xs font-semibold text-[#4C1D95]">{tier.title}</div>
          <div className="text-xs text-slate-500 tabular-nums">
            {selectedCount}/{visibleCriteria.length} kriteria dinilai · Pemberat {totalWeight}%
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAdminRubric}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-xs font-semibold hover:bg-[#1E293B] transition-colors whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Sunting Kriteria &amp; Pemberat</span>
            </button>
          )}
        </div>
      </header>

      {/* Weighted Summary Breakdown */}
      {visibleCriteria.length > 0 && (
        <section className="rounded-xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#4C1D95]" />
              <span>Ringkasan Skor Mengikut Kriteria</span>
            </h2>
            <span className="text-xs text-slate-600">{tier.guidance}</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleCriteria.map((criterion, idx) => {
              const chosen = selections[criterion.id];
              const maxLevelScore = Math.max(...criterion.levels.map((l) => l.score), 1);
              const critPct = chosen ? Math.round((chosen / maxLevelScore) * 100) : 0;
              const earnedWeight = chosen
                ? Number(((chosen / maxLevelScore) * criterion.weight).toFixed(1))
                : 0;
              return (
                <div
                  key={criterion.id}
                  className="p-3.5 rounded-lg bg-[#F8F9FC] border border-slate-200 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[#0F172A] leading-snug">
                      {idx + 1}. {criterion.title}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#4C1D95] tabular-nums shrink-0">
                      {earnedWeight}/{criterion.weight}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-[#4C1D95] transition-all duration-300"
                      style={{ width: `${critPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {visibleCriteria.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-600">
          Tiada kriteria rubrik diterbitkan setakat ini.
        </div>
      ) : (
        <div className="space-y-5">
          {visibleCriteria.map((criterion, index) => {
            const selectedScore = selections[criterion.id];
            return (
              <section
                key={criterion.id}
                className="rounded-xl bg-white border border-slate-200 overflow-hidden"
              >
                <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono text-[#4C1D95] mr-2 tabular-nums">
                      Kriteria {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-base font-semibold text-[#0F172A]">
                      {criterion.title}
                      {criterion.status === 'draft' ? ' (Draf)' : ''}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600 tabular-nums">
                    Pemberat: {criterion.weight}%
                  </div>
                </div>

                <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {criterion.levels.map((lvl, idx) => {
                    const isSelected = selectedScore === lvl.score;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePick(criterion.id, lvl.score)}
                        disabled={savingId === criterion.id}
                        className={`text-left p-4 rounded-lg border transition-colors flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#4C1D95]/5 border-[#4C1D95] text-[#0F172A]'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span
                              className={`text-xs font-bold ${
                                isSelected ? 'text-[#4C1D95]' : 'text-[#0F172A]'
                              }`}
                            >
                              {lvl.label}
                            </span>
                            <span className="text-xs font-mono font-semibold text-[#9A7414] tabular-nums">
                              Skor {lvl.score}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 text-justify leading-relaxed">
                            {lvl.description}
                          </p>
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
  );
}
