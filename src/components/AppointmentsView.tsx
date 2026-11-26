import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Shield,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  db,
  deleteMediaFromStorage,
  handleFirestoreError,
  OperationType,
  uploadMediaToStorage,
  validateUploadFile,
} from '../lib/firebase';
import {
  formatAssignmentTypeDisplay,
  formatITemuTimestamp,
  formatTargetDateDisplay,
  generateAllITemuPdf,
  generateSingleITemuPdf,
} from '../lib/itemuPdf';
import { RichContentRenderer } from '../lib/sanitizeHtml';
import {
  DEFAULT_TOPIC_STYLE,
  formatBytes,
  isSafeHttpUrl,
  ITEMU_ASSIGNMENT_TYPE_LABELS,
  ITEMU_STATUS_META,
  type ActivityType,
  type ITemuAssignmentType,
  type ITemuAttachment,
  type ITemuRecord,
  type ITemuStatus,
  type LecturerDirectoryEntry,
} from '../types/miq';
import { ITemuPdfPreviewModal } from './itemu/ITemuPdfPreviewModal';

interface AppointmentsViewProps {
  records: ITemuRecord[];
  lecturers: LecturerDirectoryEntry[];
  onLogActivity?: (type: ActivityType, title: string, detail: string) => Promise<void>;
  onOpenAdminAppointments?: () => void;
}

export function AppointmentsView({
  records,
  lecturers,
  onLogActivity,
  onOpenAdminAppointments,
}: AppointmentsViewProps) {
  const { user, profile, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const myRecords = useMemo(
    () => (user ? records.filter((r) => r.userId === user.uid) : []),
    [records, user]
  );

  // Default to Maklum Balas Pensyarah tab when student already has records or unread feedback
  const [activeTab, setActiveTab] = useState<'feedback' | 'form'>(() =>
    myRecords.length > 0 ? 'feedback' : 'form'
  );

  // Section A: Maklumat Pelajar (auto-populated from profile & latest i-TEMU submission)
  const latestProfileMeta = myRecords[0];
  const [studentName, setStudentName] = useState(
    profile?.displayName || user?.displayName || ''
  );
  const [studentRegNo, setStudentRegNo] = useState(latestProfileMeta?.studentRegNo || '');
  const [program, setProgram] = useState(
    latestProfileMeta?.program || profile?.program || 'Politeknik Malaysia'
  );
  const [studentClass, setStudentClass] = useState(latestProfileMeta?.studentClass || '');

  useEffect(() => {
    if (!studentName && (profile?.displayName || user?.displayName)) {
      setStudentName(profile?.displayName || user?.displayName || '');
    }
    if ((!program || program === 'Politeknik Malaysia') && profile?.program) {
      setProgram(profile.program);
    }
  }, [profile?.displayName, profile?.program, user?.displayName, studentName, program]);

  useEffect(() => {
    if (latestProfileMeta) {
      if (!studentRegNo && latestProfileMeta.studentRegNo) {
        setStudentRegNo(latestProfileMeta.studentRegNo);
      }
      if (!studentClass && latestProfileMeta.studentClass) {
        setStudentClass(latestProfileMeta.studentClass);
      }
      if (!program && latestProfileMeta.program) {
        setProgram(latestProfileMeta.program);
      }
    }
  }, [latestProfileMeta, studentRegNo, studentClass, program]);

  // Section B: Maklumat Kursus & Tugasan
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentType, setAssignmentType] =
    useState<ITemuAssignmentType>('tugasan_individu');
  const [assignmentTypeOther, setAssignmentTypeOther] = useState('');
  const [targetSubmissionDate, setTargetSubmissionDate] = useState('');

  // Section C: Perkara Yang Ingin Dirujuk
  const [lecturerUid, setLecturerUid] = useState<string>(lecturers[0]?.uid || 'primary-admin');
  const [guidanceArea, setGuidanceArea] = useState('');
  const [questionOrIssue, setQuestionOrIssue] = useState('');
  const [feedbackExplanation, setFeedbackExplanation] = useState('');
  const [attachments, setAttachments] = useState<ITemuAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Form / UI States
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({});
  const [followUpSavedId, setFollowUpSavedId] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<ITemuRecord | null>(null);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<'all' | ITemuStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedLecturer =
    lecturers.find((l) => l.uid === lecturerUid) || lecturers[0] || {
      uid: 'primary-admin',
      displayName: 'Pentadbir & Pensyarah Utama M-IQ',
      title: 'Pensyarah / Pentadbir M-IQ',
      isPrimary: true,
      active: true,
    };

  const unreadCount = myRecords.filter((r) => r.studentUnread).length;
  const feedbackGivenCount = myRecords.filter(
    (r) => r.status === 'maklum_balas_diberikan' || r.status === 'selesai'
  ).length;
  const completedCount = myRecords.filter((r) => r.status === 'selesai').length;

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return myRecords.filter((rec) => {
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
      if (!q) return true;
      return (
        rec.courseCode.toLowerCase().includes(q) ||
        rec.courseName.toLowerCase().includes(q) ||
        rec.assignmentTitle.toLowerCase().includes(q) ||
        rec.guidanceArea.toLowerCase().includes(q) ||
        rec.questionOrIssue.toLowerCase().includes(q) ||
        rec.lecturerName.toLowerCase().includes(q)
      );
    });
  }, [myRecords, statusFilter, searchQuery]);

  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (attachments.length >= 5) {
      setFormError('Maksimum 5 fail lampiran dibenarkan bagi setiap permohonan.');
      return;
    }

    const validationErr = validateUploadFile(file, 'any');
    if (validationErr) {
      setFormError(validationErr);
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);
    setFormError(null);
    try {
      const res = await uploadMediaToStorage(file, 'itemu', (pct) => setUploadProgress(pct));
      const isImage = file.type.startsWith('image/');
      setAttachments((prev) => [
        ...prev,
        {
          name: file.name.slice(0, 120),
          url: res.url,
          storagePath: res.storagePath,
          type: isImage ? 'image' : 'document',
          size: res.size,
        },
      ]);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? `Gagal memuat naik lampiran: ${err.message}`
          : 'Gagal memuat naik fail ke penyimpanan awan.'
      );
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveAttachment = async (index: number) => {
    const target = attachments[index];
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
    if (target?.storagePath) {
      try {
        await deleteMediaFromStorage(target.storagePath);
      } catch {
        // Non-blocking cleanup
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanName = (studentName.trim() || profile?.displayName || user.displayName || 'Pelajar').slice(
      0,
      120
    );
    const cleanRegNo = studentRegNo.trim().slice(0, 60);
    const cleanProgram = (program.trim() || profile?.program || 'Politeknik Malaysia').slice(0, 120);
    const cleanClass = studentClass.trim().slice(0, 60);

    const cleanCourseCode = courseCode.trim().toUpperCase().slice(0, 40);
    const cleanCourseName = courseName.trim().slice(0, 160);
    const cleanAssignmentTitle = assignmentTitle.trim().slice(0, 200);
    const cleanTypeOther =
      assignmentType === 'lain_lain' ? assignmentTypeOther.trim().slice(0, 120) : '';
    const cleanTargetDate = targetSubmissionDate.trim().slice(0, 20);

    const cleanGuidance = guidanceArea.trim().slice(0, 500);
    const cleanQuestion = questionOrIssue.trim().slice(0, 3000);
    const cleanExplanation = feedbackExplanation.trim().slice(0, 3000);

    if (!cleanName || !cleanRegNo || !cleanProgram || !cleanClass) {
      setFormError(
        'Sila lengkapkan maklumat pelajar (Nama, Nombor Pendaftaran, Program Pengajian dan Kelas).'
      );
      return;
    }
    if (!cleanCourseCode || !cleanCourseName || !cleanAssignmentTitle) {
      setFormError('Sila lengkapkan Kod Kursus, Nama Kursus dan Tajuk Tugasan.');
      return;
    }
    if (assignmentType === 'lain_lain' && !cleanTypeOther) {
      setFormError('Sila nyatakan jenis tugasan bagi pilihan Lain-lain.');
      return;
    }
    if (!cleanGuidance || !cleanQuestion) {
      setFormError(
        'Sila nyatakan bahagian tugasan yang memerlukan panduan serta persoalan atau masalah yang dihadapi.'
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSubmittedNotice(null);

    try {
      await addDoc(collection(db, 'itemuRecords'), {
        userId: user.uid,
        studentName: cleanName,
        studentEmail: (profile?.email || user.email || '').slice(0, 160),
        studentRegNo: cleanRegNo,
        program: cleanProgram,
        studentClass: cleanClass,
        courseCode: cleanCourseCode,
        courseName: cleanCourseName,
        assignmentTitle: cleanAssignmentTitle,
        assignmentType,
        assignmentTypeOther: cleanTypeOther,
        targetSubmissionDate: cleanTargetDate,
        guidanceArea: cleanGuidance,
        questionOrIssue: cleanQuestion,
        feedbackExplanation: cleanExplanation,
        attachments: attachments.slice(0, 5),
        lecturerUid: selectedLecturer.uid,
        lecturerName: selectedLecturer.displayName.slice(0, 120),
        status: 'dihantar',
        detailedFeedback: '',
        strengthsReview: '',
        weaknessesReview: '',
        improvementSuggestions: '',
        nextActionGuide: '',
        feedbackStyle: DEFAULT_TOPIC_STYLE,
        feedbackByUid: '',
        feedbackByName: '',
        studentFollowUpNote: '',
        studentUnread: false,
        adminUnread: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (onLogActivity) {
        await onLogActivity(
          'itemu',
          `Hantar Pertanyaan i-TEMU: ${cleanCourseCode}`,
          `Tugasan: ${cleanAssignmentTitle} (Rujukan: ${selectedLecturer.displayName}).`
        );
      }

      setCourseCode('');
      setCourseName('');
      setAssignmentTitle('');
      setAssignmentType('tugasan_individu');
      setAssignmentTypeOther('');
      setTargetSubmissionDate('');
      setGuidanceArea('');
      setQuestionOrIssue('');
      setFeedbackExplanation('');
      setAttachments([]);
      setSubmittedNotice(
        'Pertanyaan dan bahan rujukan tugasan anda telah berjaya dihantar untuk maklum balas pensyarah. Anda boleh memantau status serta membaca maklum balas di tab Maklum Balas Pensyarah.'
      );
      setActiveTab('feedback');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'itemuRecords');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkRead = async (rec: ITemuRecord) => {
    setBusyId(rec.id);
    try {
      await updateDoc(doc(db, 'itemuRecords', rec.id), {
        studentUnread: false,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `itemuRecords/${rec.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveFollowUp = async (rec: ITemuRecord, markCompleted: boolean) => {
    const note = (
      followUpDrafts[rec.id] !== undefined
        ? followUpDrafts[rec.id]
        : rec.studentFollowUpNote || ''
    )
      .trim()
      .slice(0, 3000);

    setBusyId(rec.id);
    setFollowUpSavedId(null);
    try {
      await updateDoc(doc(db, 'itemuRecords', rec.id), {
        studentFollowUpNote: note,
        status: markCompleted ? 'selesai' : rec.status,
        studentUnread: false,
        adminUnread: true,
        updatedAt: serverTimestamp(),
      });
      setFollowUpSavedId(rec.id);
      if (onLogActivity) {
        await onLogActivity(
          'itemu',
          markCompleted
            ? `Selesai Tindakan Susulan i-TEMU: ${rec.courseCode}`
            : `Kemaskini Catatan Susulan i-TEMU: ${rec.courseCode}`,
          rec.assignmentTitle
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `itemuRecords/${rec.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRecord = async (recId: string) => {
    setBusyId(recId);
    try {
      await deleteDoc(doc(db, 'itemuRecords', recId));
      setConfirmDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `itemuRecords/${recId}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs font-semibold text-[#9A7414] flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>Komunikasi &amp; Maklum Balas Akademik · i-TEMU M-IQ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            i-TEMU · Maklum Balas Pensyarah
          </h1>
          <p className="text-sm text-slate-600 text-justify leading-relaxed">
            Platform komunikasi dan maklum balas akademik antara pelajar dengan pensyarah (Admin M-IQ). Kemukakan persoalan tugasan, rujuk bahagian tugasan yang memerlukan bimbingan, muat naik dokumen atau imej berkaitan, serta terima maklum balas terperinci pensyarah lengkap bersama pratonton dan muat turun PDF rasmi.
          </p>
        </div>

        <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0">
          <div className="grid grid-cols-3 gap-4 text-right px-4 py-3 rounded-lg bg-[#F8F9FC] border border-slate-200">
            <div>
              <div className="text-lg font-bold text-[#0F172A] tabular-nums">
                {myRecords.length}
              </div>
              <div className="text-[11px] text-slate-500">Jumlah Rekod</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#4C1D95] tabular-nums">
                {feedbackGivenCount}
              </div>
              <div className="text-[11px] text-slate-500">Maklum Balas</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-700 tabular-nums">
                {completedCount}
              </div>
              <div className="text-[11px] text-slate-500">Selesai</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {myRecords.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  generateAllITemuPdf(
                    myRecords,
                    profile?.displayName || user?.displayName || 'Pelajar Politeknik'
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C59B27] text-[#0A1128] text-xs font-bold hover:bg-[#D4AF37] transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Muat Turun Semua Rekod Saya</span>
              </button>
            )}
            {isAdmin && onOpenAdminAppointments && (
              <button
                type="button"
                onClick={onOpenAdminAppointments}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-xs font-semibold hover:bg-[#1E293B] transition-colors whitespace-nowrap"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Urus Maklum Balas (Panel Admin)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Unread Lecturer Feedback Notification Banner */}
      {unreadCount > 0 && (
        <div className="rounded-xl bg-[#0A1128] text-white px-5 py-4 border border-[#C59B27]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-[#F5E6B8] shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-[#F5E6B8] tabular-nums">
                {unreadCount} maklum balas baharu
              </span>{' '}
              telah diberikan oleh pensyarah bagi pertanyaan tugasan anda.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('feedback');
              setStatusFilter('all');
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#C59B27] text-[#0A1128] text-xs font-bold hover:bg-[#D4AF37] whitespace-nowrap self-start sm:self-auto"
          >
            Lihat Maklum Balas Pensyarah
          </button>
        </div>
      )}

      {/* Primary Two-Tab Navigation inside Student Portal */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'feedback'
                ? 'bg-[#4C1D95] text-white'
                : 'bg-white border border-slate-200 text-[#0F172A] hover:border-[#4C1D95]/40'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Maklum Balas Pensyarah</span>
            <span
              className={`font-mono text-xs tabular-nums ${
                activeTab === 'feedback' ? 'text-[#F5E6B8]' : 'text-[#4C1D95]'
              }`}
            >
              ({myRecords.length})
            </span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-[#C59B27] text-[#0A1128] text-[10px] font-bold tabular-nums">
                {unreadCount} Baharu
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'form'
                ? 'bg-[#4C1D95] text-white'
                : 'bg-white border border-slate-200 text-[#0F172A] hover:border-[#4C1D95]/40'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Borang Pertanyaan i-TEMU</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MAKLUM BALAS PENSYARAH */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {submittedNotice && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-900">
              {submittedNotice}
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kod kursus, tajuk tugasan, persoalan atau pensyarah..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-[#0A1128] text-[#F5E6B8]'
                    : 'bg-[#F8F9FC] text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                Semua ({myRecords.length})
              </button>
              {(Object.keys(ITEMU_STATUS_META) as ITemuStatus[]).map((st) => {
                const count = myRecords.filter((r) => r.status === st).length;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-[#0A1128] text-[#F5E6B8]'
                        : 'bg-[#F8F9FC] text-slate-600 hover:text-[#0F172A]'
                    }`}
                  >
                    {ITEMU_STATUS_META[st].label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-10 text-center space-y-3">
              <MessageSquare className="w-9 h-9 text-slate-300 mx-auto" />
              <div className="text-base font-bold text-[#0F172A]">
                {myRecords.length === 0
                  ? 'Belum Ada Permohonan Maklum Balas i-TEMU'
                  : 'Tiada Rekod Sepadan Dengan Carian Anda'}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {myRecords.length === 0
                  ? 'Kemukakan persoalan tugasan atau muat naik draf tugasan anda melalui Borang Pertanyaan i-TEMU untuk mendapatkan bimbingan pensyarah.'
                  : 'Cuba ubah penapis status atau kata kunci carian di atas.'}
              </p>
              {myRecords.length === 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#4C1D95] text-white text-xs font-semibold hover:bg-[#3B0764] whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Isi Borang Pertanyaan i-TEMU</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {filteredRecords.map((rec) => {
                const meta = ITEMU_STATUS_META[rec.status] || ITEMU_STATUS_META.dihantar;
                const isBusy = busyId === rec.id;
                const hasFeedback =
                  Boolean(rec.detailedFeedback?.trim()) ||
                  Boolean(rec.strengthsReview?.trim()) ||
                  Boolean(rec.weaknessesReview?.trim()) ||
                  Boolean(rec.improvementSuggestions?.trim()) ||
                  Boolean(rec.nextActionGuide?.trim());
                const feedbackStyle = rec.feedbackStyle || DEFAULT_TOPIC_STYLE;
                const draftNote =
                  followUpDrafts[rec.id] !== undefined
                    ? followUpDrafts[rec.id]
                    : rec.studentFollowUpNote || '';

                return (
                  <article
                    key={rec.id}
                    className={`rounded-xl bg-white border p-5 sm:p-6 space-y-5 ${
                      rec.studentUnread ? 'border-[#C59B27]' : 'border-slate-200'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`px-2.5 py-0.5 rounded-md border font-bold ${meta.surfaceClass} ${meta.textColor}`}
                          >
                            {meta.label}
                          </span>
                          <span className="font-mono font-bold text-[#4C1D95]">
                            {rec.courseCode}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600 font-medium">
                            {formatAssignmentTypeDisplay(rec)}
                          </span>
                          {rec.studentUnread && (
                            <span className="px-2 py-0.5 rounded bg-[#FAF3DC] border border-[#C59B27] text-[#9A7414] font-bold">
                              Maklum Balas Baharu
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-[#0F172A]">
                          {rec.assignmentTitle}
                        </h3>
                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Kursus: {rec.courseName}</span>
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-[#4C1D95]" />
                            <span>Pensyarah: {rec.feedbackByName || rec.lecturerName}</span>
                          </span>
                          <span className="tabular-nums">
                            Dihantar: {formatITemuTimestamp(rec.createdAt)}
                          </span>
                          {rec.targetSubmissionDate && (
                            <span className="tabular-nums">
                              Sasaran Tugasan: {formatTargetDateDisplay(rec.targetSubmissionDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {rec.studentUnread && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleMarkRead(rec)}
                            className="px-3 py-1.5 rounded-lg border border-[#C59B27] bg-[#FAF3DC] text-[#0A1128] text-xs font-semibold hover:bg-[#F5E6B8] whitespace-nowrap"
                          >
                            Tandakan Dibaca
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewRecord(rec)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[#0F172A] text-xs font-semibold hover:border-[#4C1D95]/50 whitespace-nowrap"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#4C1D95]" />
                          <span>Pratonton PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => generateSingleITemuPdf(rec, rec.studentName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4C1D95] text-white text-xs font-semibold hover:bg-[#3B0764] whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Muat Turun PDF</span>
                        </button>
                        {rec.status === 'dihantar' &&
                          (confirmDeleteId === rec.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteRecord(rec.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 whitespace-nowrap"
                              >
                                Sahkan Padam
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(rec.id)}
                              title="Padam permohonan"
                              aria-label="Padam permohonan"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Student Question & Attachments Summary */}
                    <div className="grid md:grid-cols-12 gap-4">
                      <div className="md:col-span-7 p-4 rounded-xl bg-[#F8F9FC] border border-slate-200 space-y-2.5 text-xs">
                        <div>
                          <div className="font-bold text-[#4C1D95]">
                            Bahagian Tugasan Yang Dirujuk
                          </div>
                          <div className="text-[#0F172A] mt-0.5 text-justify leading-relaxed">
                            {rec.guidanceArea}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-[#0F172A]">
                            Persoalan / Masalah Yang Dihadapi
                          </div>
                          <div className="text-slate-700 mt-0.5 text-justify leading-relaxed whitespace-pre-line">
                            {rec.questionOrIssue}
                          </div>
                        </div>
                        {rec.feedbackExplanation && (
                          <div>
                            <div className="font-bold text-[#0F172A]">
                              Penjelasan Tambahan Pelajar
                            </div>
                            <div className="text-slate-700 mt-0.5 text-justify leading-relaxed whitespace-pre-line">
                              {rec.feedbackExplanation}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-5 p-4 rounded-xl bg-[#F8F9FC] border border-slate-200 space-y-2.5 text-xs">
                        <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-[#9A7414]" />
                          <span>Lampiran Pelajar ({rec.attachments?.length || 0})</span>
                        </div>
                        {!rec.attachments || rec.attachments.length === 0 ? (
                          <p className="text-slate-500 italic">
                            Tiada fail lampiran disertakan.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {rec.attachments.map((att, idx) => (
                              <div
                                key={`${att.url}-${idx}`}
                                className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {att.type === 'image' ? (
                                      <ImageIcon className="w-3.5 h-3.5 text-[#4C1D95] shrink-0" />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-[#9A7414] shrink-0" />
                                    )}
                                    <span className="font-medium text-[#0F172A] truncate">
                                      {att.name}
                                    </span>
                                  </div>
                                  {isSafeHttpUrl(att.url) && (
                                    <a
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[#4C1D95] font-semibold hover:underline shrink-0"
                                    >
                                      <span>Buka</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                                {att.type === 'image' && isSafeHttpUrl(att.url) && (
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full max-h-36 object-cover rounded border border-slate-100"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lecturer Feedback Section */}
                    {hasFeedback ? (
                      <div className="rounded-xl border border-[#4C1D95]/25 bg-[#FBF9FF] p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#4C1D95]/15">
                          <div className="flex items-center gap-2 text-sm font-bold text-[#4C1D95]">
                            <MessageSquare className="w-4 h-4" />
                            <span>Maklum Balas Rasmi Pensyarah</span>
                          </div>
                          <div className="text-xs text-slate-600 tabular-nums">
                            Tarikh Maklum Balas:{' '}
                            <strong className="text-[#0F172A]">
                              {formatITemuTimestamp(rec.feedbackAt)}
                            </strong>
                          </div>
                        </div>

                        {rec.detailedFeedback?.trim() && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-bold text-[#0F172A]">
                              Ulasan / Maklum Balas Terperinci
                            </div>
                            <div className="p-3.5 rounded-lg bg-white border border-slate-200">
                              <RichContentRenderer
                                content={rec.detailedFeedback}
                                style={feedbackStyle}
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                          {rec.strengthsReview?.trim() && (
                            <div className="space-y-1.5">
                              <div className="text-xs font-bold text-emerald-800">
                                Kekuatan Tugasan
                              </div>
                              <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-200">
                                <RichContentRenderer
                                  content={rec.strengthsReview}
                                  style={feedbackStyle}
                                />
                              </div>
                            </div>
                          )}

                          {rec.weaknessesReview?.trim() && (
                            <div className="space-y-1.5">
                              <div className="text-xs font-bold text-amber-800">
                                Kelemahan atau Kesilapan Dikenal Pasti
                              </div>
                              <div className="p-3.5 rounded-lg bg-amber-50/50 border border-amber-200">
                                <RichContentRenderer
                                  content={rec.weaknessesReview}
                                  style={feedbackStyle}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {rec.improvementSuggestions?.trim() && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-bold text-[#4C1D95]">
                              Cadangan Penambahbaikan
                            </div>
                            <div className="p-3.5 rounded-lg bg-white border border-slate-200">
                              <RichContentRenderer
                                content={rec.improvementSuggestions}
                                style={feedbackStyle}
                              />
                            </div>
                          </div>
                        )}

                        {rec.nextActionGuide?.trim() && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-bold text-[#0A1128]">
                              Panduan Tindakan Seterusnya
                            </div>
                            <div className="p-3.5 rounded-lg bg-[#FAF3DC]/60 border border-[#C59B27]/50">
                              <RichContentRenderer
                                content={rec.nextActionGuide}
                                style={feedbackStyle}
                              />
                            </div>
                          </div>
                        )}

                        {/* Student Follow-up Action Recorder */}
                        {(rec.status === 'maklum_balas_diberikan' ||
                          rec.status === 'selesai') && (
                          <div className="pt-3 border-t border-[#4C1D95]/15 space-y-2.5">
                            <label className="block text-xs font-bold text-[#0F172A]">
                              Catatan Tindakan Susulan Pelajar (Untuk Rekod PDF)
                            </label>
                            <textarea
                              value={draftNote}
                              onChange={(e) =>
                                setFollowUpDrafts((prev) => ({
                                  ...prev,
                                  [rec.id]: e.target.value,
                                }))
                              }
                              rows={2}
                              maxLength={3000}
                              placeholder="Catatkan pembetulan atau tindakan penambahbaikan yang telah anda laksanakan berdasarkan maklum balas pensyarah..."
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-[#0F172A] text-justify focus:outline-none focus:border-[#4C1D95]"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              {followUpSavedId === rec.id ? (
                                <span className="text-xs font-semibold text-emerald-700">
                                  Catatan tindakan susulan telah disimpan.
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500">
                                  Catatan ini akan dimasukkan dalam Bahagian H dokumen PDF anda.
                                </span>
                              )}

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleSaveFollowUp(rec, false)}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-[#0F172A] hover:border-[#4C1D95]/50 whitespace-nowrap"
                                >
                                  Simpan Catatan
                                </button>
                                {rec.status !== 'selesai' && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleSaveFollowUp(rec, true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 whitespace-nowrap"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Tandai Selesai</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                        <span>
                          Permohonan anda sedang dalam perhatian pensyarah ({meta.label}). Maklum balas lengkap akan dipaparkan di sini sebaik sahaja disemak oleh pensyarah.
                        </span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BORANG PERTANYAAN i-TEMU */}
      {activeTab === 'form' && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6"
        >
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#4C1D95]" />
              <span>Borang Maklumat Pelajar &amp; Pertanyaan Akademik i-TEMU</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1 text-justify leading-relaxed">
              Lengkapkan maklumat di bawah untuk mengemukakan persoalan atau merujuk bahagian tugasan kepada pensyarah. Tiada keperluan tempahan tarikh atau masa pertemuan — penghantaran boleh dilakukan pada bila-bila masa.
            </p>
          </div>

          {formError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {formError}
            </div>
          )}

          {/* BAHAGIAN A: MAKLUMAT PELAJAR */}
          <section className="space-y-4">
            <div className="px-3.5 py-2 rounded-lg bg-[#F8F9FC] border border-slate-200 text-xs font-bold text-[#4C1D95]">
              A. Maklumat Pelajar (Diisi Automatik Jika Tersedia)
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Pelajar *
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  maxLength={120}
                  required
                  placeholder="Nama penuh pelajar"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nombor Pendaftaran *
                </label>
                <input
                  type="text"
                  value={studentRegNo}
                  onChange={(e) => setStudentRegNo(e.target.value)}
                  maxLength={60}
                  required
                  placeholder="Cth: 01DDT24F1024"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Program Pengajian *
                </label>
                <input
                  type="text"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  maxLength={120}
                  required
                  placeholder="Cth: Diploma Teknologi Maklumat (DDT)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kelas *
                </label>
                <input
                  type="text"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  maxLength={60}
                  required
                  placeholder="Cth: DDT3A"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>
            </div>
          </section>

          {/* BAHAGIAN B: MAKLUMAT KURSUS DAN TUGASAN */}
          <section className="space-y-4">
            <div className="px-3.5 py-2 rounded-lg bg-[#F8F9FC] border border-slate-200 text-xs font-bold text-[#4C1D95] flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>B. Maklumat Kursus dan Tugasan</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kod Kursus *
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  maxLength={40}
                  required
                  placeholder="Cth: MPU23012"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Kursus *
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  maxLength={160}
                  required
                  placeholder="Cth: Pengajian Islam"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tajuk Tugasan *
                </label>
                <input
                  type="text"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  maxLength={200}
                  required
                  placeholder="Masukkan tajuk penuh tugasan akademik anda..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jenis Tugasan *
                </label>
                <select
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value as ITemuAssignmentType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#4C1D95]"
                >
                  {(Object.keys(ITEMU_ASSIGNMENT_TYPE_LABELS) as ITemuAssignmentType[]).map(
                    (key, idx) => (
                      <option key={key} value={key}>
                        {idx + 1}. {ITEMU_ASSIGNMENT_TYPE_LABELS[key]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tarikh Penghantaran / Tarikh Sasaran Tugasan (Pilihan)
                </label>
                <input
                  type="date"
                  value={targetSubmissionDate}
                  onChange={(e) => setTargetSubmissionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95] tabular-nums"
                />
              </div>

              {assignmentType === 'lain_lain' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nyatakan Jenis Tugasan (Lain-lain) *
                  </label>
                  <input
                    type="text"
                    value={assignmentTypeOther}
                    onChange={(e) => setAssignmentTypeOther(e.target.value)}
                    maxLength={120}
                    required
                    placeholder="Cth: Kajian Kes Lapangan / Portfolio Digital / E-Majalah"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
                  />
                </div>
              )}
            </div>
          </section>

          {/* BAHAGIAN C: PERKARA YANG INGIN DIRUJUK */}
          <section className="space-y-4">
            <div className="px-3.5 py-2 rounded-lg bg-[#F8F9FC] border border-slate-200 text-xs font-bold text-[#4C1D95] flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>C. Perkara Yang Ingin Dirujuk</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pensyarah Rujukan (Admin M-IQ)
              </label>
              <select
                value={selectedLecturer.uid}
                onChange={(e) => setLecturerUid(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#4C1D95]"
              >
                {lecturers.map((lec) => (
                  <option key={lec.uid} value={lec.uid}>
                    {lec.displayName} — {lec.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Bahagian Tugasan Yang Memerlukan Panduan Pensyarah *
              </label>
              <input
                type="text"
                value={guidanceArea}
                onChange={(e) => setGuidanceArea(e.target.value)}
                maxLength={500}
                required
                placeholder="Cth: Bahagian Metodologi Kajian, Analisis Data, Sorotan Literatur atau Format Rujukan APA"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Persoalan atau Masalah Yang Dihadapi *
              </label>
              <textarea
                value={questionOrIssue}
                onChange={(e) => setQuestionOrIssue(e.target.value)}
                rows={4}
                maxLength={3000}
                required
                placeholder="Terangkan persoalan khusus atau cabaran yang anda hadapi semasa melaksanakan bahagian tugasan tersebut..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] text-justify focus:outline-none focus:border-[#4C1D95]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Penjelasan Perkara Yang Ingin Mendapatkan Maklum Balas
              </label>
              <textarea
                value={feedbackExplanation}
                onChange={(e) => setFeedbackExplanation(e.target.value)}
                rows={3}
                maxLength={3000}
                placeholder="Nyatakan aspek semakan yang anda harapkan daripada pensyarah (cth: kesesuaian isi, ketepatan hujah, kesahihan rujukan atau struktur penulisan)..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] text-justify focus:outline-none focus:border-[#4C1D95]"
              />
            </div>

            {/* File / Image Attachment Uploader */}
            <div className="p-4 rounded-xl bg-[#F8F9FC] border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#4C1D95]" />
                    <span>Muat Naik Dokumen, Gambar atau Bahan Berkaitan (Jika Perlu)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Disokong: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG, WEBP (Maksimum 5 fail, 15 MB/fail).
                  </div>
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
                    onChange={handleAttachmentSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingFile || attachments.length >= 5}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#4C1D95]/40 bg-white text-[#4C1D95] text-xs font-semibold hover:bg-[#F3E8FF]/40 disabled:opacity-60 whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingFile
                        ? `Memuat naik (${uploadProgress}%)...`
                        : 'Pilih & Muat Naik Fail'}
                    </span>
                  </button>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {attachments.map((att, idx) => (
                    <div
                      key={`${att.storagePath}-${idx}`}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {att.type === 'image' ? (
                          <ImageIcon className="w-4 h-4 text-[#4C1D95] shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-[#9A7414] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-[#0F172A] truncate">{att.name}</div>
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            {formatBytes(att.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        aria-label={`Buang ${att.name}`}
                        className="p-1 rounded text-slate-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Rekod anda disimpan selamat dalam pangkalan data M-IQ dan hanya boleh diakses oleh anda serta Pensyarah (Admin).
            </span>
            <button
              type="submit"
              disabled={submitting || uploadingFile}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#4C1D95] text-white text-xs sm:text-sm font-bold hover:bg-[#3B0764] transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting
                  ? 'MENYIMPAN & MENGHANTAR...'
                  : 'HANTAR UNTUK MAKLUM BALAS PENSYARAH'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* A4 PDF Preview Modal */}
      {previewRecord && (
        <ITemuPdfPreviewModal
          record={previewRecord}
          allRecords={myRecords}
          onDownloadAll={() =>
            generateAllITemuPdf(
              myRecords,
              profile?.displayName || user?.displayName || 'Pelajar Politeknik'
            )
          }
          onClose={() => setPreviewRecord(null)}
        />
      )}
    </div>
  );
}
