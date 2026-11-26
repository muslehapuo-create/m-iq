import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { CheckCircle2, Edit3, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  ITQAN_FIVE_PHASES,
  type AssessmentBand,
  type AssessmentConfig,
  type ChecklistItem,
  type PublishStatus,
  type RubricCriterion,
  type RubricLevel,
  type ScoringMethod,
  type SelfAssessmentItem,
} from '../../types/miq';

export type InstrumentAdminSubTab = 'checklist' | 'self-assessment' | 'rubric';

interface AdminInstrumentsPanelProps {
  checklistItems: ChecklistItem[];
  selfAssessmentItems: SelfAssessmentItem[];
  assessmentConfig: AssessmentConfig;
  rubricCriteria: RubricCriterion[];
  initialSubTab?: InstrumentAdminSubTab;
}

const DEFAULT_LEVELS: RubricLevel[] = [
  { label: 'Cemerlang (Itqan)', score: 4, description: '' },
  { label: 'Baik', score: 3, description: '' },
  { label: 'Memuaskan', score: 2, description: '' },
  { label: 'Perlu Penambahbaikan', score: 1, description: '' },
];

export function AdminInstrumentsPanel({
  checklistItems,
  selfAssessmentItems,
  assessmentConfig,
  rubricCriteria,
  initialSubTab = 'checklist',
}: AdminInstrumentsPanelProps) {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<InstrumentAdminSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // Checklist editor state
  const [chkEditId, setChkEditId] = useState<string | null>(null);
  const [chkCategory, setChkCategory] = useState<string>(ITQAN_FIVE_PHASES[0]);
  const [chkTitle, setChkTitle] = useState('');
  const [chkDesc, setChkDesc] = useState('');
  const [chkStatus, setChkStatus] = useState<PublishStatus>('published');
  const [savingChk, setSavingChk] = useState(false);

  // Self-Assessment item editor state
  const [saEditId, setSaEditId] = useState<string | null>(null);
  const [saCategory, setSaCategory] = useState('Pemikiran Itqan');
  const [saStatement, setSaStatement] = useState('');
  const [saStatus, setSaStatus] = useState<PublishStatus>('published');
  const [savingSa, setSavingSa] = useState(false);

  // Self-Assessment scoring configuration state
  const [scoringMethod, setScoringMethod] = useState<ScoringMethod>(
    assessmentConfig.scoringMethod
  );
  const [bands, setBands] = useState<AssessmentBand[]>(assessmentConfig.bands);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configNotice, setConfigNotice] = useState<string | null>(null);

  useEffect(() => {
    setScoringMethod(assessmentConfig.scoringMethod);
    setBands(assessmentConfig.bands.map((b) => ({ ...b })));
  }, [assessmentConfig]);

  // Rubric editor state
  const [rubEditId, setRubEditId] = useState<string | null>(null);
  const [rubTitle, setRubTitle] = useState('');
  const [rubWeight, setRubWeight] = useState(15);
  const [rubLevels, setRubLevels] = useState<RubricLevel[]>(DEFAULT_LEVELS);
  const [rubStatus, setRubStatus] = useState<PublishStatus>('published');
  const [savingRub, setSavingRub] = useState(false);

  const resetChecklist = () => {
    setChkEditId(null);
    setChkCategory(ITQAN_FIVE_PHASES[0]);
    setChkTitle('');
    setChkDesc('');
    setChkStatus('published');
  };

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chkTitle.trim()) return;
    setSavingChk(true);
    try {
      const payload = {
        category: chkCategory.trim().slice(0, 120) || ITQAN_FIVE_PHASES[0],
        title: chkTitle.trim().slice(0, 240),
        description: chkDesc.trim().slice(0, 600),
        status: chkStatus,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      };
      if (chkEditId) {
        const order = checklistItems.find((i) => i.id === chkEditId)?.order ?? 1;
        await updateDoc(doc(db, 'checklistItems', chkEditId), { ...payload, order });
      } else {
        const order = checklistItems.reduce((m, i) => Math.max(m, i.order), 0) + 1;
        await addDoc(collection(db, 'checklistItems'), {
          ...payload,
          order,
          createdAt: serverTimestamp(),
        });
      }
      resetChecklist();
    } catch (err) {
      handleFirestoreError(
        err,
        chkEditId ? OperationType.UPDATE : OperationType.CREATE,
        'checklistItems'
      );
    } finally {
      setSavingChk(false);
    }
  };

  const resetSelfAssessment = () => {
    setSaEditId(null);
    setSaCategory('Pemikiran Itqan');
    setSaStatement('');
    setSaStatus('published');
  };

  const handleSaveSelfAssessmentItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !saStatement.trim()) return;
    setSavingSa(true);
    try {
      const payload = {
        category: saCategory.trim().slice(0, 120) || 'Pemikiran Itqan',
        statement: saStatement.trim().slice(0, 400),
        status: saStatus,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      };
      if (saEditId) {
        const order = selfAssessmentItems.find((i) => i.id === saEditId)?.order ?? 1;
        await updateDoc(doc(db, 'selfAssessmentItems', saEditId), { ...payload, order });
      } else {
        const order = selfAssessmentItems.reduce((m, i) => Math.max(m, i.order), 0) + 1;
        await addDoc(collection(db, 'selfAssessmentItems'), {
          ...payload,
          order,
          createdAt: serverTimestamp(),
        });
      }
      resetSelfAssessment();
    } catch (err) {
      handleFirestoreError(
        err,
        saEditId ? OperationType.UPDATE : OperationType.CREATE,
        'selfAssessmentItems'
      );
    } finally {
      setSavingSa(false);
    }
  };

  const handleSaveAssessmentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || bands.length === 0) return;
    setSavingConfig(true);
    setConfigNotice(null);
    try {
      const cleanBands = bands.slice(0, 10).map((b) => ({
        minScore: Number(b.minScore) || 0,
        maxScore: Number(b.maxScore) || 0,
        label: b.label.trim().slice(0, 120) || 'Tahap Penilaian',
        description: b.description.trim().slice(0, 500) || '-',
      }));
      const ref = doc(db, 'assessmentConfigs', 'self-assessment');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, {
          scoringMethod,
          scaleMin: 1,
          scaleMax: 5,
          bands: cleanBands,
          updatedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          scoringMethod,
          scaleMin: 1,
          scaleMax: 5,
          bands: cleanBands,
          updatedBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setConfigNotice('Kaedah pemarkahan dan julat interpretasi berjaya disimpan.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'assessmentConfigs/self-assessment');
    } finally {
      setSavingConfig(false);
    }
  };

  const resetRubric = () => {
    setRubEditId(null);
    setRubTitle('');
    setRubWeight(15);
    setRubLevels(DEFAULT_LEVELS.map((l) => ({ ...l })));
    setRubStatus('published');
  };

  const handleSaveRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rubTitle.trim()) return;
    setSavingRub(true);
    try {
      const cleanLevels = rubLevels.map((l) => ({
        label: l.label.trim().slice(0, 80) || 'Tahap',
        score: Number(l.score) || 1,
        description: l.description.trim().slice(0, 400) || '-',
      }));
      const payload = {
        title: rubTitle.trim().slice(0, 200),
        weight: Math.min(Math.max(Number(rubWeight) || 10, 1), 100),
        levels: cleanLevels,
        status: rubStatus,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      };
      if (rubEditId) {
        const order = rubricCriteria.find((c) => c.id === rubEditId)?.order ?? 1;
        await updateDoc(doc(db, 'rubricCriteria', rubEditId), { ...payload, order });
      } else {
        const order = rubricCriteria.reduce((m, c) => Math.max(m, c.order), 0) + 1;
        await addDoc(collection(db, 'rubricCriteria'), {
          ...payload,
          order,
          createdAt: serverTimestamp(),
        });
      }
      resetRubric();
    } catch (err) {
      handleFirestoreError(
        err,
        rubEditId ? OperationType.UPDATE : OperationType.CREATE,
        'rubricCriteria'
      );
    } finally {
      setSavingRub(false);
    }
  };

  const totalPublishedRubricWeight = rubricCriteria
    .filter((r) => r.status === 'published')
    .reduce((sum, r) => sum + r.weight, 0);

  return (
    <div className="space-y-5">
      <div className="inline-flex flex-wrap p-1 rounded-lg bg-white border border-slate-200 gap-1">
        <button
          type="button"
          onClick={() => setSubTab('checklist')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
            subTab === 'checklist'
              ? 'bg-[#4C1D95] text-white'
              : 'text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          Senarai Semak 5 Fasa ({checklistItems.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('self-assessment')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
            subTab === 'self-assessment'
              ? 'bg-[#4C1D95] text-white'
              : 'text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          Penilaian Kendiri 1–5 &amp; Pemarkahan ({selfAssessmentItems.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('rubric')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
            subTab === 'rubric'
              ? 'bg-[#4C1D95] text-white'
              : 'text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          Rubrik Kualiti Tugasan ({rubricCriteria.length})
        </button>
      </div>

      {subTab === 'checklist' && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveChecklist}
            className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#0F172A]">
                {chkEditId ? 'Sunting Item Semakan' : 'Tambah Item Semakan'}
              </h2>
              {chkEditId && (
                <button
                  type="button"
                  onClick={resetChecklist}
                  className="text-xs text-slate-500"
                >
                  Batal
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fasa / Kategori M-IQ
              </label>
              <select
                value={chkCategory}
                onChange={(e) => setChkCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white mb-2"
              >
                {ITQAN_FIVE_PHASES.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
                {!ITQAN_FIVE_PHASES.includes(chkCategory as (typeof ITQAN_FIVE_PHASES)[number]) && (
                  <option value={chkCategory}>{chkCategory}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pernyataan Tindakan
              </label>
              <input
                type="text"
                value={chkTitle}
                onChange={(e) => setChkTitle(e.target.value)}
                maxLength={240}
                placeholder="Contoh: Saya menyemak ketepatan fakta sebelum menghantar..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Huraian / Panduan
              </label>
              <textarea
                value={chkDesc}
                onChange={(e) => setChkDesc(e.target.value)}
                rows={3}
                maxLength={600}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={chkStatus}
                onChange={(e) => setChkStatus(e.target.value as PublishStatus)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="published">Diterbitkan</option>
                <option value="draft">Draf</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingChk}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold hover:bg-[#3B0764]"
            >
              <Plus className="w-4 h-4" />
              <span>{chkEditId ? 'Kemaskini Item' : 'Tambah Item'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 divide-y divide-slate-100">
            {checklistItems.map((item) => (
              <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-[#4C1D95] font-medium">
                    {item.category} · {item.status === 'published' ? 'Diterbitkan' : 'Draf'}
                  </div>
                  <div className="text-sm font-bold text-[#0F172A] mt-0.5">{item.title}</div>
                  {item.description && (
                    <div className="text-xs text-slate-600 mt-1">{item.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setChkEditId(item.id);
                      setChkCategory(item.category);
                      setChkTitle(item.title);
                      setChkDesc(item.description);
                      setChkStatus(item.status);
                    }}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#4C1D95]"
                    aria-label="Sunting item semakan"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await deleteDoc(doc(db, 'checklistItems', item.id));
                      } catch (err) {
                        handleFirestoreError(err, OperationType.DELETE, `checklistItems/${item.id}`);
                      }
                    }}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600"
                    aria-label="Padam item semakan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'self-assessment' && (
        <div className="space-y-6">
          {/* Scoring Method & Interpretation Bands Config */}
          <form
            onSubmit={handleSaveAssessmentConfig}
            className="rounded-xl bg-white border border-slate-200 p-6 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Kaedah Pemarkahan &amp; Interpretasi Penilaian Kendiri (Skala 1–5)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tetapkan kaedah pengiraan skor dan julat interpretasi yang dipaparkan kepada pelajar selepas menjawab.
                </p>
              </div>
              <button
                type="submit"
                disabled={savingConfig}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-xs font-semibold hover:bg-[#1E293B] whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingConfig ? 'Menyimpan...' : 'Simpan Tetapan Pemarkahan'}</span>
              </button>
            </div>

            {configNotice && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{configNotice}</span>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kaedah Pemarkahan Utama
                </label>
                <select
                  value={scoringMethod}
                  onChange={(e) => setScoringMethod(e.target.value as ScoringMethod)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="percentage">Peratus (0% – 100%)</option>
                  <option value="sum">Jumlah Skor (Jumlah Mata Likert)</option>
                  <option value="average">Purata Skor (1.00 – 5.00)</option>
                </select>
              </div>
              <div className="sm:col-span-2 text-xs text-slate-600 p-3 rounded-lg bg-[#F8F9FC] border border-slate-200">
                Pastikan julat skor minimum dan maksimum di bawah selaras dengan kaedah pemarkahan yang dipilih (contoh: 0–100 untuk Peratus, 1.0–5.0 untuk Purata, atau 12–60 untuk Jumlah Skor).
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Julat Skor &amp; Teks Interpretasi ({bands.length}/10)
                </span>
                {bands.length < 10 && (
                  <button
                    type="button"
                    onClick={() =>
                      setBands((prev) => [
                        ...prev,
                        {
                          minScore: 0,
                          maxScore: 0,
                          label: 'Julat Baharu',
                          description: '',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C1D95] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Julat</span>
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {bands.map((band, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-[#F8F9FC] border border-slate-200 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={band.label}
                        onChange={(e) => {
                          const next = [...bands];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setBands(next);
                        }}
                        maxLength={120}
                        placeholder="Label Tahap (cth: Cemerlang)"
                        className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 text-xs font-semibold bg-white"
                      />
                      {bands.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBands((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label="Buang julat"
                          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-600 bg-white"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-slate-500">Skor Minimum</span>
                        <input
                          type="number"
                          step="0.01"
                          value={band.minScore}
                          onChange={(e) => {
                            const next = [...bands];
                            next[idx] = { ...next[idx], minScore: Number(e.target.value) };
                            setBands(next);
                          }}
                          className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-200 text-xs bg-white tabular-nums"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500">Skor Maksimum</span>
                        <input
                          type="number"
                          step="0.01"
                          value={band.maxScore}
                          onChange={(e) => {
                            const next = [...bands];
                            next[idx] = { ...next[idx], maxScore: Number(e.target.value) };
                            setBands(next);
                          }}
                          className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-200 text-xs bg-white tabular-nums"
                        />
                      </div>
                    </div>

                    <textarea
                      value={band.description}
                      onChange={(e) => {
                        const next = [...bands];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setBands(next);
                      }}
                      rows={2}
                      maxLength={500}
                      placeholder="Huraian interpretasi bagi julat skor ini..."
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </form>

          {/* Likert Statements CRUD */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleSaveSelfAssessmentItem}
              className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-[#0F172A]">
                  {saEditId ? 'Sunting Pernyataan Likert' : 'Tambah Pernyataan Likert (1–5)'}
                </h3>
                {saEditId && (
                  <button
                    type="button"
                    onClick={resetSelfAssessment}
                    className="text-xs text-slate-500"
                  >
                    Batal
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dimensi / Kategori
                </label>
                <input
                  type="text"
                  value={saCategory}
                  onChange={(e) => setSaCategory(e.target.value)}
                  maxLength={120}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pernyataan Penilaian Kendiri
                </label>
                <textarea
                  value={saStatement}
                  onChange={(e) => setSaStatement(e.target.value)}
                  rows={3}
                  maxLength={400}
                  placeholder="Contoh: Saya menyemak fakta janaan AI daripada sumber berautoriti..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status
                </label>
                <select
                  value={saStatus}
                  onChange={(e) => setSaStatus(e.target.value as PublishStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="published">Diterbitkan</option>
                  <option value="draft">Draf</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savingSa}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold hover:bg-[#3B0764]"
              >
                <Plus className="w-4 h-4" />
                <span>{saEditId ? 'Kemaskini Pernyataan' : 'Tambah Pernyataan'}</span>
              </button>
            </form>

            <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 divide-y divide-slate-100">
              {selfAssessmentItems.map((item, idx) => (
                <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#4C1D95] font-medium">
                      #{idx + 1} · {item.category} ·{' '}
                      {item.status === 'published' ? 'Diterbitkan' : 'Draf'}
                    </div>
                    <div className="text-sm font-medium text-[#0F172A] mt-1">
                      {item.statement}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSaEditId(item.id);
                        setSaCategory(item.category);
                        setSaStatement(item.statement);
                        setSaStatus(item.status);
                      }}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#4C1D95]"
                      aria-label="Sunting pernyataan"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'selfAssessmentItems', item.id));
                        } catch (err) {
                          handleFirestoreError(
                            err,
                            OperationType.DELETE,
                            `selfAssessmentItems/${item.id}`
                          );
                        }
                      }}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600"
                      aria-label="Padam pernyataan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'rubric' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white border border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-[#0F172A]">
              Jumlah Pemberat Kriteria Diterbitkan
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                totalPublishedRubricWeight === 100 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {totalPublishedRubricWeight}%{' '}
              {totalPublishedRubricWeight === 100
                ? '(Seimbang 100%)'
                : '(Disarankan berjumlah 100%)'}
            </span>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleSaveRubric}
              className="lg:col-span-6 rounded-xl bg-white border border-slate-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-[#0F172A]">
                  {rubEditId ? 'Sunting Kriteria Rubrik' : 'Tambah Kriteria Rubrik'}
                </h2>
                {rubEditId && (
                  <button type="button" onClick={resetRubric} className="text-xs text-slate-500">
                    Batal
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Kriteria
                  </label>
                  <input
                    type="text"
                    value={rubTitle}
                    onChange={(e) => setRubTitle(e.target.value)}
                    maxLength={200}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pemberat (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={rubWeight}
                    onChange={(e) => setRubWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700">Tahap Pencapaian</div>
                {rubLevels.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#F8F9FC] border border-slate-200 space-y-2"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={lvl.label}
                        onChange={(e) => {
                          const next = [...rubLevels];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setRubLevels(next);
                        }}
                        placeholder="Label tahap"
                        className="col-span-2 px-2.5 py-1.5 rounded border border-slate-200 text-xs bg-white"
                      />
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={lvl.score}
                        onChange={(e) => {
                          const next = [...rubLevels];
                          next[idx] = { ...next[idx], score: Number(e.target.value) };
                          setRubLevels(next);
                        }}
                        className="px-2.5 py-1.5 rounded border border-slate-200 text-xs bg-white tabular-nums"
                      />
                    </div>
                    <input
                      type="text"
                      value={lvl.description}
                      onChange={(e) => {
                        const next = [...rubLevels];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setRubLevels(next);
                      }}
                      placeholder="Deskriptor tahap kualiti..."
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs bg-white"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status
                </label>
                <select
                  value={rubStatus}
                  onChange={(e) => setRubStatus(e.target.value as PublishStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="published">Diterbitkan</option>
                  <option value="draft">Draf</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savingRub}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold hover:bg-[#3B0764]"
              >
                <Plus className="w-4 h-4" />
                <span>{rubEditId ? 'Kemaskini Kriteria' : 'Tambah Kriteria'}</span>
              </button>
            </form>

            <div className="lg:col-span-6 rounded-xl bg-white border border-slate-200 divide-y divide-slate-100">
              {rubricCriteria.map((crit) => (
                <div key={crit.id} className="p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#4C1D95] font-medium tabular-nums">
                      Pemberat {crit.weight}% · {crit.status === 'published' ? 'Diterbitkan' : 'Draf'}
                    </div>
                    <div className="text-sm font-bold text-[#0F172A] mt-0.5">{crit.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {crit.levels.length} tahap penilaian
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setRubEditId(crit.id);
                        setRubTitle(crit.title);
                        setRubWeight(crit.weight);
                        setRubLevels(crit.levels.map((l) => ({ ...l })));
                        setRubStatus(crit.status);
                      }}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#4C1D95]"
                      aria-label="Sunting kriteria"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'rubricCriteria', crit.id));
                        } catch (err) {
                          handleFirestoreError(err, OperationType.DELETE, `rubricCriteria/${crit.id}`);
                        }
                      }}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600"
                      aria-label="Padam kriteria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
