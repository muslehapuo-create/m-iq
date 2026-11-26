import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  FileText,
  PenTool,
  Save,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { generateIRefleksiPdf } from '../lib/reflectionPdf';
import {
  plainTextToRichHtml,
  RichContentRenderer,
  sanitizeHtmlForStorage,
} from '../lib/sanitizeHtml';
import {
  DEFAULT_TOPIC_STYLE,
  normalizeGuidedPrompt,
  REFLECTION_GUIDED_QUESTIONS,
  stripHtmlToText,
  type ActivityType,
  type GuidedReflectionAnswer,
  type LearningModule,
  type ReflectionStatus,
  type StudentReflection,
  type TopicFontFamily,
  type TopicFontSize,
  type TopicStyle,
  type TopicTextAlign,
} from '../types/miq';
import { IRefleksiIcon } from './IRefleksiIcon';
import { ReflectionRichEditor } from './reflection/ReflectionRichEditor';

interface ReflectionViewProps {
  modules: LearningModule[];
  reflections: StudentReflection[];
  onLogActivity?: (type: ActivityType, title: string, detail: string) => Promise<void>;
}

const STYLE_COLOR_SWATCHES = ['#1E293B', '#0F172A', '#4C1D95', '#854D0E', '#065F46'];

function buildInitialAnswersMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const q of REFLECTION_GUIDED_QUESTIONS) {
    map[q.id] = '';
  }
  return map;
}

function hydrateAnswersFromReflection(item: StudentReflection): Record<string, string> {
  const map = buildInitialAnswersMap();
  if (item.guidedAnswers && item.guidedAnswers.length > 0) {
    for (const ans of item.guidedAnswers) {
      map[ans.id] = ans.answer || '';
    }
    return map;
  }
  // Backward compatibility for legacy plain-text reflections
  if (item.body) map['q1-pengalaman'] = plainTextToRichHtml(item.body);
  if (item.strengths) map['q2-kekuatan'] = plainTextToRichHtml(item.strengths);
  if (item.weaknesses) map['q3-kelemahan'] = plainTextToRichHtml(item.weaknesses);
  if (item.improvements) map['q4-penambahbaikan'] = plainTextToRichHtml(item.improvements);
  if (item.itqanTakeaway) map['q5-itqan-ai'] = plainTextToRichHtml(item.itqanTakeaway);
  return map;
}

export function ReflectionView({
  modules,
  reflections,
  onLogActivity,
}: ReflectionViewProps) {
  const { user, profile } = useAuth();
  const learningModules = useMemo(
    () => modules.filter((m) => m.sectionType === 'learning'),
    [modules]
  );

  // Filter reflections owned by the signed-in user for personal workspace
  const myReflections = useMemo(
    () => (user ? reflections.filter((r) => r.userId === user.uid) : reflections),
    [reflections, user]
  );

  // Editor Session Key only increments when opening/resetting a reflection (keeps cursor intact during auto-save)
  const [editorSessionKey, setEditorSessionKey] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<'editor' | 'preview'>('editor');

  // Assignment & Student Metadata
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [moduleId, setModuleId] = useState<string>(
    learningModules[0]?.id || 'pengenalan-miq'
  );
  const [studentName, setStudentName] = useState(
    () => profile?.displayName || user?.displayName || ''
  );
  const [studentRegNo, setStudentRegNo] = useState('');
  const [program, setProgram] = useState(() => profile?.program || '');
  const [lecturerName, setLecturerName] = useState('');

  // Guided Reflection Answers & Document Typography
  const [answersMap, setAnswersMap] = useState<Record<string, string>>(buildInitialAnswersMap);
  const [itqanTakeaway, setItqanTakeaway] = useState('');
  const [docStyle, setDocStyle] = useState<TopicStyle>({ ...DEFAULT_TOPIC_STYLE });
  const [docStatus, setDocStatus] = useState<ReflectionStatus>('draft');

  // Save / Export / Filter States
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTimeText, setLastSavedTimeText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'completed'>('all');
  const [filterModuleId, setFilterModuleId] = useState<string>('all');
  const [formError, setFormError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const autoSaveLockRef = useRef(false);

  // Populate profile defaults on first load if fields are still blank and untouched
  useEffect(() => {
    if (!isDirty && !editingId) {
      if (!studentName && (profile?.displayName || user?.displayName)) {
        setStudentName(profile?.displayName || user?.displayName || '');
      }
      if (!program && profile?.program) {
        setProgram(profile.program);
      }
    }
  }, [profile?.displayName, profile?.program, user?.displayName, isDirty, editingId, studentName, program]);

  const buildGuidedAnswersArray = useCallback(
    (sourceMap: Record<string, string>): GuidedReflectionAnswer[] =>
      REFLECTION_GUIDED_QUESTIONS.map((q) => {
        const cleaned = sanitizeHtmlForStorage(sourceMap[q.id] || '');
        const bounded =
          cleaned.length <= 14500
            ? cleaned
            : plainTextToRichHtml(stripHtmlToText(cleaned).slice(0, 14000)).slice(0, 14500);
        return {
          id: q.id,
          prompt: q.prompt,
          answer: bounded,
        };
      }),
    []
  );

  const buildReflectionPayload = useCallback(
    (targetStatus: ReflectionStatus) => {
      const cleanTitle = assignmentTitle.trim().slice(0, 200);
      const selectedMod = modules.find((m) => m.id === moduleId);
      const moduleTitle = (selectedMod?.title || 'Umum').slice(0, 160);
      const guidedAnswers = buildGuidedAnswersArray(answersMap);

      const q1Text = stripHtmlToText(answersMap['q1-pengalaman'] || '');
      const q2Text = stripHtmlToText(answersMap['q2-kekuatan'] || '');
      const q3Text = stripHtmlToText(answersMap['q3-kelemahan'] || '');
      const q4Text = stripHtmlToText(answersMap['q4-penambahbaikan'] || '');
      const q5Text = stripHtmlToText(answersMap['q5-itqan-ai'] || '');

      const combinedPlainSummary = [q1Text, q2Text, q3Text, q4Text, q5Text]
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 10000);

      const safeBody =
        combinedPlainSummary ||
        `Draf i-Refleksi M-IQ: ${cleanTitle}`;

      return {
        userName: (studentName.trim() || profile?.displayName || user?.displayName || 'Pelajar').slice(
          0,
          120
        ),
        moduleId,
        moduleTitle,
        title: cleanTitle,
        assignmentTitle: cleanTitle,
        courseCode: courseCode.trim().slice(0, 60),
        courseName: courseName.trim().slice(0, 160),
        studentRegNo: studentRegNo.trim().slice(0, 60),
        program: program.trim().slice(0, 120),
        lecturerName: lecturerName.trim().slice(0, 120),
        status: targetStatus,
        style: docStyle,
        guidedAnswers,
        body: safeBody,
        strengths: q2Text.slice(0, 3000),
        weaknesses: q3Text.slice(0, 3000),
        improvements: q4Text.slice(0, 3000),
        itqanTakeaway: (itqanTakeaway.trim() || q5Text).slice(0, 1000),
      };
    },
    [
      assignmentTitle,
      modules,
      moduleId,
      buildGuidedAnswersArray,
      answersMap,
      studentName,
      profile?.displayName,
      user?.displayName,
      courseCode,
      courseName,
      studentRegNo,
      program,
      lecturerName,
      docStyle,
      itqanTakeaway,
    ]
  );

  // Debounced Auto-Save (runs ~2s after edits when assignmentTitle has at least 3 chars)
  useEffect(() => {
    if (!user || !isDirty || submitting || autoSaveLockRef.current) return;
    if (assignmentTitle.trim().length < 3) return;

    const timer = window.setTimeout(async () => {
      if (autoSaveLockRef.current) return;
      autoSaveLockRef.current = true;
      setAutoSaveState('saving');
      try {
        const payload = buildReflectionPayload(docStatus);
        if (editingId) {
          await updateDoc(doc(db, 'reflections', editingId), {
            ...payload,
            updatedAt: serverTimestamp(),
          });
        } else {
          const createdRef = await addDoc(collection(db, 'reflections'), {
            userId: user.uid,
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setEditingId(createdRef.id);
        }
        setIsDirty(false);
        setAutoSaveState('saved');
        setLastSavedTimeText(
          new Date().toLocaleTimeString('ms-MY', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } catch {
        setAutoSaveState('error');
      } finally {
        autoSaveLockRef.current = false;
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [user, isDirty, submitting, assignmentTitle, docStatus, editingId, buildReflectionPayload]);

  const startNewReflection = () => {
    setEditingId(null);
    setAssignmentTitle('');
    setCourseCode('');
    setCourseName('');
    setModuleId(learningModules[0]?.id || 'pengenalan-miq');
    setStudentName(profile?.displayName || user?.displayName || '');
    setStudentRegNo('');
    setProgram(profile?.program || '');
    setLecturerName('');
    setAnswersMap(buildInitialAnswersMap());
    setItqanTakeaway('');
    setDocStyle({ ...DEFAULT_TOPIC_STYLE });
    setDocStatus('draft');
    setIsDirty(false);
    setAutoSaveState('idle');
    setLastSavedTimeText(null);
    setFormError(null);
    setSavedNotice(null);
    setWorkspaceMode('editor');
    setEditorSessionKey((k) => k + 1);
  };

  const loadReflectionIntoWorkspace = (
    item: StudentReflection,
    mode: 'editor' | 'preview' = 'editor'
  ) => {
    setEditingId(item.id);
    setAssignmentTitle(item.assignmentTitle || item.title || '');
    setCourseCode(item.courseCode || '');
    setCourseName(item.courseName || '');
    setModuleId(item.moduleId || learningModules[0]?.id || 'pengenalan-miq');
    setStudentName(item.userName || profile?.displayName || user?.displayName || '');
    setStudentRegNo(item.studentRegNo || '');
    setProgram(item.program || profile?.program || '');
    setLecturerName(item.lecturerName || '');
    setAnswersMap(hydrateAnswersFromReflection(item));
    setItqanTakeaway(item.itqanTakeaway || '');
    setDocStyle(item.style || { ...DEFAULT_TOPIC_STYLE });
    setDocStatus(item.status || 'completed');
    setIsDirty(false);
    setAutoSaveState('idle');
    setFormError(null);
    setSavedNotice(null);
    setWorkspaceMode(mode);
    setEditorSessionKey((k) => k + 1);
  };

  const handleSaveExplicit = async (targetStatus: ReflectionStatus) => {
    if (!user) return;
    const cleanTitle = assignmentTitle.trim();
    if (!cleanTitle) {
      setFormError('Sila masukkan Tajuk Tugasan sebelum menyimpan refleksi.');
      setWorkspaceMode('editor');
      return;
    }

    const guidedAnswers = buildGuidedAnswersArray(answersMap);
    const answeredCount = guidedAnswers.filter(
      (g) => stripHtmlToText(g.answer).length > 0
    ).length;

    if (targetStatus === 'completed' && answeredCount === 0) {
      setFormError(
        'Sila lengkapkan sekurang-kurangnya satu jawapan soalan panduan refleksi sebelum memuktamadkan refleksi.'
      );
      setWorkspaceMode('editor');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSavedNotice(null);
    try {
      const payload = buildReflectionPayload(targetStatus);
      if (editingId) {
        await updateDoc(doc(db, 'reflections', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        const createdRef = await addDoc(collection(db, 'reflections'), {
          userId: user.uid,
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setEditingId(createdRef.id);
      }

      setDocStatus(targetStatus);
      setIsDirty(false);
      setAutoSaveState('saved');
      setLastSavedTimeText(
        new Date().toLocaleTimeString('ms-MY', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );

      if (targetStatus === 'completed' && onLogActivity) {
        await onLogActivity(
          'reflection',
          `Melengkapkan i-Refleksi M-IQ: ${cleanTitle}`,
          `Kursus: ${courseCode || 'Umum'} · ${payload.moduleTitle}`
        );
      }

      setSavedNotice(
        targetStatus === 'draft'
          ? 'Draf i-Refleksi M-IQ berjaya disimpan. Anda boleh menyambungnya pada bila-bila masa.'
          : 'Refleksi lengkap berjaya disimpan dan sedia untuk dimuat turun dalam format PDF.'
      );
    } catch (err) {
      handleFirestoreError(
        err,
        editingId ? OperationType.UPDATE : OperationType.CREATE,
        'reflections'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reflections', id));
      setConfirmDeleteId(null);
      if (editingId === id) {
        startNewReflection();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reflections/${id}`);
    }
  };

  const buildCurrentPreviewSnapshot = (): StudentReflection => {
    const payload = buildReflectionPayload(docStatus);
    return {
      id: editingId || 'preview-draft',
      userId: user?.uid || 'student',
      ...payload,
    };
  };

  const handleExportPdf = async (targetReflection?: StudentReflection) => {
    const record = targetReflection || buildCurrentPreviewSnapshot();
    if (!record.title.trim()) {
      setFormError('Sila masukkan Tajuk Tugasan sebelum memuat turun dokumen PDF.');
      return;
    }
    setFormError(null);
    setExportingPdfId(record.id);
    try {
      await generateIRefleksiPdf(
        record,
        profile?.displayName || user?.displayName || 'Pelajar'
      );
    } finally {
      setExportingPdfId(null);
    }
  };

  const updateAnswer = (qId: string, html: string) => {
    setAnswersMap((prev) => {
      if (prev[qId] === html) return prev;
      return { ...prev, [qId]: html };
    });
    setIsDirty(true);
    setSavedNotice(null);
  };

  const answeredQuestionCount = useMemo(
    () =>
      REFLECTION_GUIDED_QUESTIONS.filter(
        (q) => stripHtmlToText(answersMap[q.id] || '').length > 0
      ).length,
    [answersMap]
  );

  const displayedReflections = useMemo(() => {
    return myReflections.filter((r) => {
      if (filterModuleId !== 'all' && r.moduleId !== filterModuleId) return false;
      const st = r.status || 'completed';
      if (filterStatus !== 'all' && st !== filterStatus) return false;
      return true;
    });
  }, [myReflections, filterModuleId, filterStatus]);

  const previewRecord = buildCurrentPreviewSnapshot();
  const previewGeneratedDate = new Date().toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      {/* Official i-Refleksi M-IQ Header */}
      <header className="rounded-xl overflow-hidden border border-[#C59B27]/40 bg-white">
        <div className="bg-[#0A1128] px-6 py-6 sm:px-8 sm:py-7 border-b-2 border-[#C59B27]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <IRefleksiIcon size="xl" className="w-14 h-14 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[#F5E6B8] tracking-wide">
                  M-IQ (Mindset Itqan) · Medium Rasmi Refleksi Pelajar
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-0.5">
                  i-REFLEKSI M-IQ
                </h1>
                <p className="text-sm text-slate-200 mt-1">
                  Refleksi Tugasan Berteraskan Nilai Itqan.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={startNewReflection}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#F5E6B8]/40 bg-white/10 text-[#F5E6B8] text-xs font-semibold hover:bg-white/15 transition-colors whitespace-nowrap"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>Refleksi Baharu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Official Required Priority Usage Instruction */}
        <div className="px-6 py-4 sm:px-8 bg-[#F8F9FC] border-b border-slate-200 flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-[#4C1D95] mt-0.5 shrink-0" />
          <p className="text-sm text-[#0F172A] text-justify leading-relaxed font-medium">
            Lengkapkan refleksi tugasan anda melalui i-Refleksi M-IQ. Refleksi yang telah lengkap boleh dimuat turun dalam format PDF untuk dilampirkan bersama tugasan akademik.
          </p>
        </div>

        {/* Workspace Mode Bar & Auto-save Status */}
        <div className="px-6 py-3.5 sm:px-8 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-[#F8F9FC]">
            <button
              type="button"
              onClick={() => setWorkspaceMode('editor')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                workspaceMode === 'editor'
                  ? 'bg-[#4C1D95] text-white'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Editor i-Refleksi</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceMode('preview')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                workspaceMode === 'preview'
                  ? 'bg-[#4C1D95] text-white'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pratonton Dokumen Refleksi</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-500 tabular-nums">
              {answeredQuestionCount}/{REFLECTION_GUIDED_QUESTIONS.length} soalan dijawab
            </span>
            <span className="text-slate-300">|</span>
            {autoSaveState === 'saving' ? (
              <span className="inline-flex items-center gap-1.5 text-[#4C1D95] font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Menyimpan draf automatik...</span>
              </span>
            ) : autoSaveState === 'saved' && lastSavedTimeText ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Draf disimpan automatik ({lastSavedTimeText})</span>
              </span>
            ) : autoSaveState === 'error' ? (
              <span className="text-amber-700 font-medium">
                Simpanan automatik tertangguh — klik Simpan Draf
              </span>
            ) : (
              <span className="text-slate-500">
                {editingId
                  ? docStatus === 'draft'
                    ? 'Mod Draf Aktif'
                    : 'Rekod Lengkap Disunting'
                  : 'Sedia menulis (Simpan automatik aktif selepas Tajuk Tugasan diisi)'}
              </span>
            )}
          </div>
        </div>
      </header>

      {formError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
          {formError}
        </div>
      )}

      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Main Workspace: Editor OR Official Document Preview */}
      {workspaceMode === 'editor' ? (
        <div className="space-y-6">
          {/* 1. Assignment & Student Metadata Card */}
          <section className="rounded-xl bg-white border border-slate-200 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  1. Maklumat Tugasan, Kursus &amp; Pelajar
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Maklumat ini akan dipaparkan secara rasmi pada pratonton dokumen dan eksport PDF i-Refleksi M-IQ.
                </p>
              </div>
              {editingId && (
                <span className="text-xs font-semibold text-[#4C1D95]">
                  {docStatus === 'draft' ? 'Status: Draf' : 'Status: Lengkap'}
                </span>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tajuk Tugasan *
                </label>
                <input
                  type="text"
                  value={assignmentTitle}
                  onChange={(e) => {
                    setAssignmentTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  maxLength={200}
                  placeholder="Contoh: Tugasan Kajian Kes Etika Profesionalisma"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kod Kursus
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => {
                    setCourseCode(e.target.value);
                    setIsDirty(true);
                  }}
                  maxLength={60}
                  placeholder="Contoh: MPU23012"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Kursus
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => {
                    setCourseName(e.target.value);
                    setIsDirty(true);
                  }}
                  maxLength={160}
                  placeholder="Contoh: Pengajian Islam / Etika"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Pelajar *
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    setIsDirty(true);
                  }}
                  maxLength={120}
                  placeholder="Nama penuh pelajar"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  No. Pendaftaran
                </label>
                <input
                  type="text"
                  value={studentRegNo}
                  onChange={(e) => {
                    setStudentRegNo(e.target.value);
                    setIsDirty(true);
                  }}
                  maxLength={60}
                  placeholder="Contoh: 01DDT24F1025"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Program Pengajian
                </label>
                <input
                  type="text"
                  value={program}
                  onChange={(e) => {
                    setProgram(e.target.value);
                    setIsDirty(true);
                  }}
                  maxLength={120}
                  placeholder="Contoh: Diploma Teknologi Maklumat"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Pensyarah
                </label>
                <input
                  type="text"
                  value={lecturerName}
                  onChange={(e) => {
                    setLecturerName(e.target.value);
                    setIsDirty(true);
                  }}
                  maxLength={120}
                  placeholder="Nama pensyarah kursus"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Modul M-IQ Berkaitan
                </label>
                <select
                  value={moduleId}
                  onChange={(e) => {
                    setModuleId(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full sm:max-w-md px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#4C1D95]"
                >
                  {learningModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 2. Global Typography & Document Style Control Bar */}
          <section className="rounded-xl bg-white border border-slate-200 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#0F172A]">
                2. Tetapan Tipografi &amp; Format Penulisan Dokumen
              </h2>
              <span className="text-[11px] text-slate-500">
                Terpakai pada keseluruhan editor, pratonton dan dokumen PDF rasmi
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Jenis Tulisan (Font)
                </label>
                <select
                  value={docStyle.fontFamily}
                  onChange={(e) => {
                    setDocStyle((s) => ({
                      ...s,
                      fontFamily: e.target.value as TopicFontFamily,
                    }));
                    setIsDirty(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white text-[#0F172A]"
                >
                  <option value="sans">Plus Jakarta Sans</option>
                  <option value="serif">Lora Serif</option>
                  <option value="editorial">Editorial Serif</option>
                  <option value="mono">JetBrains Mono</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Saiz Tulisan
                </label>
                <select
                  value={docStyle.fontSize}
                  onChange={(e) => {
                    setDocStyle((s) => ({
                      ...s,
                      fontSize: e.target.value as TopicFontSize,
                    }));
                    setIsDirty(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white text-[#0F172A]"
                >
                  <option value="sm">Kecil (14px)</option>
                  <option value="base">Standard (16px)</option>
                  <option value="lg">Besar (18px)</option>
                  <option value="xl">Sangat Besar (20px)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Warna Teks Utama
                </label>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <input
                    type="color"
                    value={docStyle.textColor}
                    onChange={(e) => {
                      setDocStyle((s) => ({ ...s, textColor: e.target.value }));
                      setIsDirty(true);
                    }}
                    className="w-8 h-8 rounded border border-slate-200 cursor-pointer bg-white"
                    aria-label="Pilih warna teks dokumen"
                  />
                  {STYLE_COLOR_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => {
                        setDocStyle((s) => ({ ...s, textColor: hex }));
                        setIsDirty(true);
                      }}
                      className={`w-6 h-6 rounded border ${
                        docStyle.textColor === hex
                          ? 'border-[#4C1D95] ring-2 ring-[#4C1D95]/30'
                          : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Penjajaran Perenggan Asal
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      ['justify', AlignJustify, 'Justify'],
                      ['left', AlignLeft, 'Kiri'],
                      ['center', AlignCenter, 'Tengah'],
                      ['right', AlignRight, 'Kanan'],
                    ] as Array<
                      [TopicTextAlign, React.ComponentType<{ className?: string }>, string]
                    >
                  ).map(([alignVal, IconComp, label]) => (
                    <button
                      key={alignVal}
                      type="button"
                      title={label}
                      onClick={() => {
                        setDocStyle((s) => ({ ...s, textAlign: alignVal }));
                        setIsDirty(true);
                      }}
                      className={`py-2 rounded-lg border flex items-center justify-center transition-colors ${
                        docStyle.textAlign === alignVal
                          ? 'bg-[#4C1D95] text-white border-[#4C1D95]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Guided Questions + Individual Rich Text Workspaces */}
          <section className="rounded-xl bg-white border border-slate-200 p-6 space-y-6">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#0F172A]">
                3. Soalan Panduan Refleksi &amp; Ruang Jawapan Pelajar
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tulis jawapan refleksi anda secara terperinci terus dalam editor di bawah bagi setiap soalan panduan.
              </p>
            </div>

            <div className="space-y-6">
              {REFLECTION_GUIDED_QUESTIONS.map((q) => (
                <div key={q.id} className="space-y-2.5">
                  <div className="p-3.5 rounded-lg bg-[#F3E8FF]/60 border border-[#4C1D95]/15">
                    <div className="text-[11px] font-bold text-[#9A7414] mb-0.5">
                      {q.shortLabel}
                    </div>
                    <label className="block text-sm font-semibold text-[#0F172A] leading-snug">
                      {q.prompt}
                    </label>
                    {q.guidance && (
                      <p className="text-xs text-slate-600 mt-1.5 text-justify leading-relaxed">
                        {q.guidance}
                      </p>
                    )}
                  </div>

                  <ReflectionRichEditor
                    editorKey={`${editorSessionKey}-${q.id}`}
                    value={answersMap[q.id] || ''}
                    placeholder={q.placeholder}
                    style={docStyle}
                    onChange={(html) => updateAnswer(q.id, html)}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rumusan Ringkas Komitmen Nilai Itqan Seterusnya (Pilihan)
                </label>
                <input
                  type="text"
                  value={itqanTakeaway}
                  onChange={(e) => {
                    setItqanTakeaway(e.target.value);
                    setIsDirty(true);
                  }}
                  maxLength={1000}
                  placeholder="Contoh: Sentiasa menyemak kesahihan sumber rujukan sebelum membuat kesimpulan."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveExplicit('draft')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  <Save className="w-4 h-4 text-slate-600" />
                  <span>Simpan Draf</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveExplicit('completed')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold hover:bg-[#3B0764] transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan & Lengkapkan'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('preview')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#4C1D95]/30 bg-[#F3E8FF]/40 text-[#4C1D95] text-sm font-semibold hover:bg-[#F3E8FF] transition-colors whitespace-nowrap"
                >
                  <Eye className="w-4 h-4" />
                  <span>Pratonton Dokumen</span>
                </button>
                <button
                  type="button"
                  disabled={exportingPdfId !== null}
                  onClick={() => handleExportPdf()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-sm font-semibold hover:bg-[#1E293B] transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {exportingPdfId ? 'Menjana PDF...' : 'Muat Turun PDF'}
                  </span>
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* Official Document Preview (Pratonton Dokumen Refleksi) */
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 px-5 py-3.5">
            <div className="text-xs text-slate-600">
              Paparan pratonton dokumen rasmi <strong className="text-[#0F172A]">i-Refleksi M-IQ</strong> sebelum dimuat turun sebagai fail PDF.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setWorkspaceMode('editor')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-[#0F172A] hover:bg-slate-50"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Kembali ke Editor</span>
              </button>
              <button
                type="button"
                disabled={exportingPdfId !== null}
                onClick={() => handleExportPdf(previewRecord)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4C1D95] text-white text-xs font-semibold hover:bg-[#3B0764] disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {exportingPdfId ? 'Menjana PDF...' : 'Muat Turun PDF Rasmi'}
                </span>
              </button>
            </div>
          </div>

          {/* A4 Styled Paper Sheet */}
          <div className="max-w-4xl mx-auto rounded-xl bg-white border border-slate-300 shadow-sm overflow-hidden">
            {/* Official Document Banner */}
            <div className="bg-[#0A1128] px-6 sm:px-10 py-6 border-b-4 border-[#C59B27] flex items-center gap-4">
              <IRefleksiIcon size="lg" className="w-12 h-12 shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#F5E6B8] tracking-wide">
                  M-IQ (Mindset Itqan)
                </div>
                <div className="text-xl font-bold text-white tracking-tight">
                  i-REFLEKSI M-IQ
                </div>
                <div className="text-xs text-slate-200">
                  Refleksi Tugasan Berteraskan Nilai Itqan
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-10 space-y-6">
              <div className="text-center pb-4 border-b-2 border-[#C59B27]/50">
                <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">
                  Refleksi Pelaksanaan Tugasan Berteraskan Nilai Itqan
                </h2>
              </div>

              {/* Student & Assignment Metadata Table */}
              <div className="grid sm:grid-cols-2 border border-slate-200 rounded-lg overflow-hidden text-xs">
                <div className="p-3 border-b border-slate-200 sm:border-r">
                  <span className="font-bold text-[#4C1D95]">Tajuk Tugasan: </span>
                  <span className="text-[#0F172A] font-medium">
                    {previewRecord.assignmentTitle || previewRecord.title || '(Belum diisi)'}
                  </span>
                </div>
                <div className="p-3 border-b border-slate-200">
                  <span className="font-bold text-[#4C1D95]">Kursus: </span>
                  <span className="text-[#0F172A]">
                    {[previewRecord.courseCode, previewRecord.courseName]
                      .filter(Boolean)
                      .join(' — ') || '-'}
                  </span>
                </div>
                <div className="p-3 border-b border-slate-200 sm:border-r bg-[#F8F9FC]">
                  <span className="font-bold text-[#4C1D95]">Nama Pelajar: </span>
                  <span className="text-[#0F172A]">{previewRecord.userName}</span>
                </div>
                <div className="p-3 border-b border-slate-200 bg-[#F8F9FC]">
                  <span className="font-bold text-[#4C1D95]">No. Pendaftaran: </span>
                  <span className="text-[#0F172A]">{previewRecord.studentRegNo || '-'}</span>
                </div>
                <div className="p-3 border-b border-slate-200 sm:border-r">
                  <span className="font-bold text-[#4C1D95]">Program: </span>
                  <span className="text-[#0F172A]">{previewRecord.program || '-'}</span>
                </div>
                <div className="p-3 border-b border-slate-200">
                  <span className="font-bold text-[#4C1D95]">Pensyarah: </span>
                  <span className="text-[#0F172A]">{previewRecord.lecturerName || '-'}</span>
                </div>
                <div className="p-3 sm:border-r bg-[#F8F9FC]">
                  <span className="font-bold text-[#4C1D95]">Modul Berkaitan: </span>
                  <span className="text-[#0F172A]">{previewRecord.moduleTitle}</span>
                </div>
                <div className="p-3 bg-[#F8F9FC]">
                  <span className="font-bold text-[#4C1D95]">Tarikh Dokumen Dijana: </span>
                  <span className="text-[#0F172A] tabular-nums">{previewGeneratedDate}</span>
                </div>
              </div>

              {/* Guided Answers Preview */}
              <div className="space-y-5">
                {(previewRecord.guidedAnswers || []).map((ans) => {
                  const hasText = stripHtmlToText(ans.answer).length > 0;
                  return (
                    <div key={ans.id} className="space-y-2">
                      <div className="px-4 py-2.5 rounded-lg bg-[#F3E8FF]/70 border border-[#4C1D95]/20 text-xs sm:text-sm font-bold text-[#4C1D95]">
                        {normalizeGuidedPrompt(ans.id, ans.prompt)}
                      </div>
                      <div className="px-1">
                        {hasText ? (
                          <RichContentRenderer content={ans.answer} style={docStyle} />
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            (Belum ada jawapan diisi bagi soalan ini.)
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {previewRecord.itqanTakeaway && (
                  <div className="p-4 rounded-lg bg-[#F8F9FC] border border-[#C59B27]/40 text-xs text-slate-700 text-justify">
                    <span className="font-bold text-[#9A7414]">
                      Komitmen Nilai Itqan Seterusnya:{' '}
                    </span>
                    {previewRecord.itqanTakeaway}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>Dokumen Rasmi i-Refleksi M-IQ · M-IQ (Mindset Itqan)</span>
                <span className="tabular-nums">Dijana pada {previewGeneratedDate}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Saved Reflections List (Draf & Lengkap) */}
      <section className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-[#4C1D95]" />
            <h2 className="text-base font-bold text-[#0F172A] tabular-nums">
              Rekod i-Refleksi M-IQ Saya ({displayedReflections.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as 'all' | 'draft' | 'completed')
              }
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#0F172A] bg-white focus:outline-none focus:border-[#4C1D95]"
            >
              <option value="all">Semua Status</option>
              <option value="completed">Lengkap Sahaja</option>
              <option value="draft">Draf Sahaja</option>
            </select>
            <select
              value={filterModuleId}
              onChange={(e) => setFilterModuleId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#0F172A] bg-white focus:outline-none focus:border-[#4C1D95]"
            >
              <option value="all">Semua Modul</option>
              {learningModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {displayedReflections.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">
            Belum ada rekod i-Refleksi M-IQ sepadan dengan penapis anda. Mulakan penulisan refleksi tugasan di atas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedReflections.map((item) => {
              const isDraft = item.status === 'draft';
              const updatedText = item.updatedAt?.seconds
                ? new Date(item.updatedAt.seconds * 1000).toLocaleString('ms-MY', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Baru disimpan';

              return (
                <article key={item.id} className="p-5 sm:p-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`font-semibold ${
                            isDraft ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {isDraft ? 'Draf' : 'Lengkap'}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-medium text-[#4C1D95]">
                          {item.moduleTitle}
                        </span>
                        {(item.courseCode || item.courseName) && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-600">
                              {[item.courseCode, item.courseName].filter(Boolean).join(' ')}
                            </span>
                          </>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 tabular-nums">{updatedText}</span>
                      </div>
                      <h3 className="text-base font-bold text-[#0F172A]">
                        {item.assignmentTitle || item.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadReflectionIntoWorkspace(item, 'editor')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0F172A] hover:border-[#4C1D95] hover:text-[#4C1D95] transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sunting</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => loadReflectionIntoWorkspace(item, 'preview')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#4C1D95] hover:bg-[#F3E8FF]/50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratonton</span>
                      </button>
                      <button
                        type="button"
                        disabled={exportingPdfId === item.id}
                        onClick={() => handleExportPdf(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-xs font-semibold hover:bg-[#1E293B] transition-colors disabled:opacity-60"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{exportingPdfId === item.id ? 'Menjana...' : 'PDF'}</span>
                      </button>

                      {item.userId === user?.uid && (
                        confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                            >
                              Padam
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            aria-label="Padam refleksi"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Concise Summary Snippet */}
                  <p className="text-xs text-slate-600 text-justify leading-relaxed line-clamp-3 whitespace-pre-line">
                    {item.body}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
