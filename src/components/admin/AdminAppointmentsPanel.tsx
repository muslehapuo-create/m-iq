import { useEffect, useMemo, useState } from 'react';
import { deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType, PRIMARY_ADMIN_EMAIL } from '../../lib/firebase';
import {
  formatAssignmentTypeDisplay,
  formatITemuTimestamp,
  formatTargetDateDisplay,
  generateSingleITemuPdf,
} from '../../lib/itemuPdf';
import {
  DEFAULT_TOPIC_STYLE,
  formatBytes,
  isSafeHttpUrl,
  ITEMU_STATUS_META,
  type ITemuRecord,
  type ITemuStatus,
  type LecturerDirectoryEntry,
  type TopicFontFamily,
  type TopicFontSize,
  type TopicStyle,
  type TopicTextAlign,
} from '../../types/miq';
import { ITemuPdfPreviewModal } from '../itemu/ITemuPdfPreviewModal';
import { ItemuRichEditor } from '../itemu/ItemuRichEditor';

interface AdminAppointmentsPanelProps {
  records: ITemuRecord[];
  lecturers: LecturerDirectoryEntry[];
}

export function AdminAppointmentsPanel({
  records,
  lecturers,
}: AdminAppointmentsPanelProps) {
  const { user, profile } = useAuth();
  const isPrimaryAdmin =
    Boolean(user?.emailVerified) &&
    user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

  const [lecturerFilter, setLecturerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Admin Feedback Editable Fields
  const [assignedLecturerUid, setAssignedLecturerUid] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ITemuStatus>('maklum_balas_diberikan');
  const [detailedFeedback, setDetailedFeedback] = useState('');
  const [strengthsReview, setStrengthsReview] = useState('');
  const [weaknessesReview, setWeaknessesReview] = useState('');
  const [improvementSuggestions, setImprovementSuggestions] = useState('');
  const [nextActionGuide, setNextActionGuide] = useState('');
  const [feedbackStyle, setFeedbackStyle] = useState<TopicStyle>(DEFAULT_TOPIC_STYLE);

  const [savingAction, setSavingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<ITemuRecord | null>(null);

  const filterLecturerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lecturers) {
      map.set(l.uid, l.displayName);
    }
    for (const rec of records) {
      if (rec.lecturerUid && !map.has(rec.lecturerUid)) {
        map.set(rec.lecturerUid, rec.lecturerName || rec.lecturerUid);
      }
    }
    return Array.from(map.entries()).map(([uid, displayName]) => ({ uid, displayName }));
  }, [lecturers, records]);

  const isForCurrentAdmin = (rec: ITemuRecord) =>
    Boolean(user) &&
    (rec.lecturerUid === user!.uid || (isPrimaryAdmin && rec.lecturerUid === 'primary-admin'));

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((rec) => {
      if (lecturerFilter === 'mine' && !isForCurrentAdmin(rec)) return false;
      if (
        lecturerFilter !== 'all' &&
        lecturerFilter !== 'mine' &&
        rec.lecturerUid !== lecturerFilter
      ) {
        return false;
      }

      if (statusFilter === 'unread' && !rec.adminUnread) return false;
      if (
        statusFilter !== 'all' &&
        statusFilter !== 'unread' &&
        rec.status !== statusFilter
      ) {
        return false;
      }

      if (!q) return true;
      return (
        rec.studentName.toLowerCase().includes(q) ||
        rec.studentRegNo.toLowerCase().includes(q) ||
        rec.studentClass.toLowerCase().includes(q) ||
        rec.courseCode.toLowerCase().includes(q) ||
        rec.courseName.toLowerCase().includes(q) ||
        rec.assignmentTitle.toLowerCase().includes(q) ||
        rec.questionOrIssue.toLowerCase().includes(q) ||
        rec.lecturerName.toLowerCase().includes(q)
      );
    });
  }, [records, lecturerFilter, statusFilter, searchQuery, user, isPrimaryAdmin]);

  const selectedRecord = useMemo(
    () =>
      filteredRecords.find((r) => r.id === selectedId) ||
      records.find((r) => r.id === selectedId) ||
      filteredRecords[0] ||
      null,
    [filteredRecords, records, selectedId]
  );

  useEffect(() => {
    if (!selectedRecord) return;
    setAssignedLecturerUid(selectedRecord.lecturerUid || 'primary-admin');
    setSelectedStatus(
      selectedRecord.status === 'dihantar' || selectedRecord.status === 'menunggu_maklum_balas'
        ? 'maklum_balas_diberikan'
        : selectedRecord.status
    );
    setDetailedFeedback(selectedRecord.detailedFeedback || '');
    setStrengthsReview(selectedRecord.strengthsReview || '');
    setWeaknessesReview(selectedRecord.weaknessesReview || '');
    setImprovementSuggestions(selectedRecord.improvementSuggestions || '');
    setNextActionGuide(selectedRecord.nextActionGuide || '');
    setFeedbackStyle(selectedRecord.feedbackStyle || DEFAULT_TOPIC_STYLE);
    setActionError(null);
    setActionNotice(null);
    setConfirmDeleteId(null);
  }, [selectedRecord?.id]);

  const totalCount = records.length;
  const unreadCount = records.filter((r) => r.adminUnread).length;
  const awaitingCount = records.filter(
    (r) =>
      r.status === 'dihantar' ||
      r.status === 'menunggu_maklum_balas' ||
      r.status === 'sedang_disemak'
  ).length;
  const feedbackSentCount = records.filter(
    (r) => r.status === 'maklum_balas_diberikan'
  ).length;
  const completedCount = records.filter((r) => r.status === 'selesai').length;

  const hasExistingFeedback = Boolean(
    selectedRecord &&
      (selectedRecord.detailedFeedback?.trim() ||
        selectedRecord.strengthsReview?.trim() ||
        selectedRecord.weaknessesReview?.trim() ||
        selectedRecord.improvementSuggestions?.trim() ||
        selectedRecord.nextActionGuide?.trim())
  );

  const handleSaveFeedback = async (overrideStatus?: ITemuStatus) => {
    if (!selectedRecord || !user) return;

    const cleanDetailed = detailedFeedback.trim().slice(0, 15000);
    const cleanStrengths = strengthsReview.trim().slice(0, 8000);
    const cleanWeaknesses = weaknessesReview.trim().slice(0, 8000);
    const cleanImprovements = improvementSuggestions.trim().slice(0, 8000);
    const cleanNextGuide = nextActionGuide.trim().slice(0, 8000);

    const targetStatus: ITemuStatus = overrideStatus || selectedStatus;

    if (
      (targetStatus === 'maklum_balas_diberikan' || targetStatus === 'selesai') &&
      !cleanDetailed &&
      !cleanStrengths &&
      !cleanWeaknesses &&
      !cleanImprovements &&
      !cleanNextGuide
    ) {
      setActionError(
        'Sila isi sekurang-kurangnya satu ruangan maklum balas sebelum menghantar maklum balas kepada pelajar.'
      );
      return;
    }

    const assignedLec =
      filterLecturerOptions.find((l) => l.uid === assignedLecturerUid) || {
        uid: selectedRecord.lecturerUid,
        displayName: selectedRecord.lecturerName,
      };

    const currentAdminName = (
      profile?.displayName ||
      user.displayName ||
      assignedLec.displayName ||
      'Admin (Pensyarah) M-IQ'
    ).slice(0, 120);

    setSavingAction(true);
    setActionError(null);
    setActionNotice(null);

    try {
      const hasAnyFeedbackContent = Boolean(
        cleanDetailed || cleanStrengths || cleanWeaknesses || cleanImprovements || cleanNextGuide
      );
      const updatePayload: Record<string, unknown> = {
        lecturerUid: assignedLec.uid,
        lecturerName: assignedLec.displayName.slice(0, 120),
        status: targetStatus,
        detailedFeedback: cleanDetailed,
        strengthsReview: cleanStrengths,
        weaknessesReview: cleanWeaknesses,
        improvementSuggestions: cleanImprovements,
        nextActionGuide: cleanNextGuide,
        feedbackStyle,
        feedbackByUid: hasAnyFeedbackContent ? user.uid : selectedRecord.feedbackByUid || '',
        feedbackByName: hasAnyFeedbackContent
          ? currentAdminName
          : selectedRecord.feedbackByName || '',
        adminUnread: false,
        studentUnread: true,
        updatedAt: serverTimestamp(),
      };

      if (hasAnyFeedbackContent) {
        updatePayload.feedbackAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'itemuRecords', selectedRecord.id), updatePayload);
      setSelectedStatus(targetStatus);
      setActionNotice(
        targetStatus === 'maklum_balas_diberikan'
          ? 'Maklum balas pensyarah berjaya disimpan dan dihantar kepada pelajar.'
          : `Status dikemas kini kepada "${ITEMU_STATUS_META[targetStatus].label}" dan dimaklumkan kepada pelajar.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `itemuRecords/${selectedRecord.id}`);
    } finally {
      setSavingAction(false);
    }
  };

  const handleQuickStatusChange = async (nextStatus: ITemuStatus) => {
    if (!selectedRecord) return;
    setSavingAction(true);
    setActionError(null);
    setActionNotice(null);
    try {
      await updateDoc(doc(db, 'itemuRecords', selectedRecord.id), {
        status: nextStatus,
        adminUnread: false,
        studentUnread: true,
        updatedAt: serverTimestamp(),
      });
      setSelectedStatus(nextStatus);
      setActionNotice(
        `Status permohonan dikemas kini kepada "${ITEMU_STATUS_META[nextStatus].label}".`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `itemuRecords/${selectedRecord.id}`);
    } finally {
      setSavingAction(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSavingAction(true);
    try {
      await deleteDoc(doc(db, 'itemuRecords', id));
      if (selectedId === id) setSelectedId(null);
      setConfirmDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `itemuRecords/${id}`);
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Jumlah Rekod i-TEMU</div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">{totalCount}</div>
          <div className="text-[11px] text-[#4C1D95] mt-0.5 tabular-nums">
            {unreadCount} rekod baharu belum disemak
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Menunggu / Dalam Semakan</div>
          <div className="text-2xl font-bold text-amber-700 tabular-nums">{awaitingCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Perlukan maklum balas</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Maklum Balas Diberikan</div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums">
            {feedbackSentCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Telah dihantar ke pelajar</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Tindakan Selesai</div>
          <div className="text-2xl font-bold text-[#4C1D95] tabular-nums">{completedCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Rekod dimuktamadkan</div>
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="rounded-xl bg-white border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pelajar, no. pendaftaran, kelas, kod kursus, tajuk tugasan..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#4C1D95]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-[#4C1D95]" />
            <span>Pensyarah:</span>
          </div>
          <select
            value={lecturerFilter}
            onChange={(e) => setLecturerFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-[#0F172A] bg-white focus:outline-none focus:border-[#4C1D95]"
          >
            <option value="all">Semua Pensyarah ({records.length})</option>
            <option value="mine">
              Ditujukan Kepada Saya ({records.filter(isForCurrentAdmin).length})
            </option>
            {filterLecturerOptions.map((opt) => (
              <option key={opt.uid} value={opt.uid}>
                {opt.displayName}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-[#0F172A] bg-white focus:outline-none focus:border-[#4C1D95]"
          >
            <option value="all">Semua Status</option>
            <option value="unread">Baharu Belum Dibaca ({unreadCount})</option>
            {(Object.keys(ITEMU_STATUS_META) as ITemuStatus[]).map((st) => (
              <option key={st} value={st}>
                {ITEMU_STATUS_META[st].label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Master-Detail Management Workspace */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Student Submissions Queue */}
        <section className="lg:col-span-4 rounded-xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-[#F8F9FC] border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#4C1D95]" />
              <span className="tabular-nums">
                Senarai Pertanyaan Pelajar ({filteredRecords.length})
              </span>
            </h2>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Tiada permohonan maklum balas i-TEMU yang sepadan dengan penapis semasa.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[820px] overflow-y-auto">
              {filteredRecords.map((rec) => {
                const isSelected = selectedRecord?.id === rec.id;
                const statusMeta = ITEMU_STATUS_META[rec.status] || ITEMU_STATUS_META.dihantar;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setSelectedId(rec.id)}
                    className={`w-full text-left p-4 transition-colors space-y-1.5 ${
                      isSelected
                        ? 'bg-[#F3E8FF]/45 border-r-2 border-[#4C1D95]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className={`font-bold ${statusMeta.textColor}`}>
                        {statusMeta.label}
                      </span>
                      {rec.adminUnread && (
                        <span className="font-bold text-[#9A7414]">Baharu</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-[#0F172A] truncate">
                      {rec.studentName}
                      {rec.studentClass ? ` · ${rec.studentClass}` : ''}
                    </div>
                    <div className="text-xs font-semibold text-[#4C1D95] truncate">
                      {rec.courseCode} — {rec.assignmentTitle}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="truncate">{formatAssignmentTypeDisplay(rec)}</span>
                      <span className="tabular-nums shrink-0">
                        {rec.createdAt?.seconds
                          ? new Date(rec.createdAt.seconds * 1000).toLocaleDateString('ms-MY')
                          : '-'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Detailed Student Info + Rich Feedback Editor */}
        <section className="lg:col-span-8 rounded-xl bg-white border border-slate-200 overflow-hidden">
          {!selectedRecord ? (
            <div className="p-10 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-semibold text-[#0F172A]">
                Pilih Permohonan Maklum Balas Pelajar
              </div>
              <p className="text-xs text-slate-500">
                Klik mana-mana rekod pelajar di sebelah kiri untuk melihat soalan, membuka lampiran serta menulis atau mengemaskini maklum balas pensyarah.
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Top Header + PDF & Delete Controls */}
              <div className="pb-4 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded border font-bold ${
                        ITEMU_STATUS_META[selectedRecord.status].surfaceClass
                      } ${ITEMU_STATUS_META[selectedRecord.status].textColor}`}
                    >
                      {ITEMU_STATUS_META[selectedRecord.status].label}
                    </span>
                    <span className="font-mono font-bold text-[#4C1D95]">
                      {selectedRecord.courseCode}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">
                      {formatAssignmentTypeDisplay(selectedRecord)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    {selectedRecord.assignmentTitle}
                  </h3>
                  <div className="text-xs text-slate-600">
                    {selectedRecord.courseName} · Dihantar:{' '}
                    {formatITemuTimestamp(selectedRecord.createdAt)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewRecord(selectedRecord)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0F172A] hover:border-[#4C1D95]/50 whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#4C1D95]" />
                    <span>Pratonton PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      generateSingleITemuPdf(selectedRecord, selectedRecord.studentName)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-xs font-semibold hover:bg-[#1E293B] whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  {confirmDeleteId === selectedRecord.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={savingAction}
                        onClick={() => handleDelete(selectedRecord.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 whitespace-nowrap"
                      >
                        Sahkan Padam
                      </button>
                      <button
                        type="button"
                        disabled={savingAction}
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(selectedRecord.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200"
                      title="Padam Rekod"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Complete Student, Course & Referred Section Summary */}
              <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F8F9FC] border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">Nama Pelajar: </span>
                  <strong className="text-[#0F172A]">{selectedRecord.studentName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">No. Pendaftaran: </span>
                  <strong className="text-[#0F172A]">
                    {selectedRecord.studentRegNo || '-'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Program Pengajian: </span>
                  <span className="text-[#0F172A]">{selectedRecord.program}</span>
                </div>
                <div>
                  <span className="text-slate-500">Kelas: </span>
                  <strong className="text-[#0F172A]">{selectedRecord.studentClass || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">E-mel Pelajar: </span>
                  <span className="text-[#0F172A]">{selectedRecord.studentEmail}</span>
                </div>
                <div>
                  <span className="text-slate-500">Tarikh Sasaran Tugasan: </span>
                  <span className="text-[#0F172A] tabular-nums">
                    {formatTargetDateDisplay(selectedRecord.targetSubmissionDate)}
                  </span>
                </div>
              </div>

              {/* Referred Issues & Student Attachments */}
              <div className="space-y-3 p-4 rounded-xl bg-white border border-slate-200 text-xs">
                <div>
                  <div className="font-bold text-[#4C1D95]">
                    Bahagian Tugasan Yang Memerlukan Panduan:
                  </div>
                  <p className="text-[#0F172A] mt-0.5 text-justify leading-relaxed">
                    {selectedRecord.guidanceArea}
                  </p>
                </div>
                <div>
                  <div className="font-bold text-[#0F172A]">
                    Persoalan atau Masalah Yang Dihadapi:
                  </div>
                  <p className="text-slate-700 mt-0.5 text-justify leading-relaxed whitespace-pre-line">
                    {selectedRecord.questionOrIssue}
                  </p>
                </div>
                {selectedRecord.feedbackExplanation && (
                  <div>
                    <div className="font-bold text-[#0F172A]">
                      Penjelasan Perkara Yang Ingin Mendapatkan Maklum Balas:
                    </div>
                    <p className="text-slate-700 mt-0.5 text-justify leading-relaxed whitespace-pre-line">
                      {selectedRecord.feedbackExplanation}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100">
                  <div className="font-bold text-[#0F172A] flex items-center gap-1.5 mb-2">
                    <Paperclip className="w-3.5 h-3.5 text-[#9A7414]" />
                    <span>
                      Dokumen &amp; Gambar Dimuat Naik Pelajar (
                      {selectedRecord.attachments?.length || 0})
                    </span>
                  </div>
                  {!selectedRecord.attachments || selectedRecord.attachments.length === 0 ? (
                    <p className="text-slate-500 italic">Tiada fail dimuat naik.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {selectedRecord.attachments.map((att, idx) => (
                        <div
                          key={`${att.url}-${idx}`}
                          className="p-2.5 rounded-lg bg-[#F8F9FC] border border-slate-200 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {att.type === 'image' ? (
                                <ImageIcon className="w-3.5 h-3.5 text-[#4C1D95] shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-[#9A7414] shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="font-semibold text-[#0F172A] truncate">
                                  {att.name}
                                </div>
                                <div className="text-[10px] text-slate-500 tabular-nums">
                                  {formatBytes(att.size)}
                                </div>
                              </div>
                            </div>
                            {isSafeHttpUrl(att.url) && (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 text-[#4C1D95] font-semibold hover:border-[#4C1D95] shrink-0"
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
                              className="w-full max-h-40 object-cover rounded border border-slate-200"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedRecord.studentFollowUpNote?.trim() && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="font-bold text-emerald-800">
                      Catatan Tindakan Susulan Pelajar:
                    </div>
                    <p className="text-slate-700 mt-0.5 text-justify leading-relaxed">
                      {selectedRecord.studentFollowUpNote}
                    </p>
                  </div>
                )}
              </div>

              {actionError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {actionError}
                </div>
              )}

              {actionNotice && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {actionNotice}
                </div>
              )}

              {/* Lecturer Assignment & 5-Status Quick Controls */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pensyarah Bertanggungjawab (Admin M-IQ)
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-[#4C1D95] absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={assignedLecturerUid}
                      onChange={(e) => setAssignedLecturerUid(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-[#0F172A] bg-white focus:outline-none focus:border-[#4C1D95]"
                    >
                      {filterLecturerOptions.map((opt) => (
                        <option key={opt.uid} value={opt.uid}>
                          {opt.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Status Permohonan (5 Status Rasmi)
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as ITemuStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-[#0F172A] bg-white focus:outline-none focus:border-[#4C1D95]"
                  >
                    {(Object.keys(ITEMU_STATUS_META) as ITemuStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {ITEMU_STATUS_META[st].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Review Status Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  Kemas kini pantas status semakan:
                </span>
                {(
                  [
                    'menunggu_maklum_balas',
                    'sedang_disemak',
                    'selesai',
                  ] as ITemuStatus[]
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={savingAction}
                    onClick={() => handleQuickStatusChange(st)}
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-[#F8F9FC] text-[11px] font-semibold text-[#0F172A] hover:border-[#4C1D95]"
                  >
                    {ITEMU_STATUS_META[st].label}
                  </button>
                ))}
              </div>

              {/* Global Typography Controls for Feedback Rich Text Editors */}
              <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-[#4C1D95]">Gaya Tulisan Maklum Balas:</span>
                <select
                  value={feedbackStyle.fontFamily}
                  onChange={(e) =>
                    setFeedbackStyle((prev) => ({
                      ...prev,
                      fontFamily: e.target.value as TopicFontFamily,
                    }))
                  }
                  aria-label="Jenis tulisan maklum balas"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-[#0F172A]"
                >
                  <option value="sans">Sans (Moden)</option>
                  <option value="serif">Serif (Formal)</option>
                  <option value="editorial">Editorial</option>
                  <option value="mono">Mono</option>
                </select>

                <select
                  value={feedbackStyle.fontSize}
                  onChange={(e) =>
                    setFeedbackStyle((prev) => ({
                      ...prev,
                      fontSize: e.target.value as TopicFontSize,
                    }))
                  }
                  aria-label="Saiz tulisan maklum balas"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-[#0F172A]"
                >
                  <option value="sm">Saiz Kecil</option>
                  <option value="base">Saiz Standard</option>
                  <option value="lg">Saiz Besar</option>
                  <option value="xl">Saiz Ekstra</option>
                </select>

                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
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
                      onClick={() =>
                        setFeedbackStyle((prev) => ({ ...prev, textAlign: alignVal }))
                      }
                      title={label}
                      className={`p-1.5 ${
                        feedbackStyle.textAlign === alignVal
                          ? 'bg-[#4C1D95] text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 Structured Rich Feedback Editors */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    1. Ulasan / Maklum Balas Terperinci
                  </label>
                  <ItemuRichEditor
                    editorKey={`${selectedRecord.id}-detailed`}
                    value={detailedFeedback}
                    style={feedbackStyle}
                    onChange={setDetailedFeedback}
                    placeholder="Tulis ulasan menyeluruh dan maklum balas akademik terhadap persoalan serta tugasan pelajar..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1.5">
                    2. Ulasan Kekuatan Tugasan
                  </label>
                  <ItemuRichEditor
                    editorKey={`${selectedRecord.id}-strengths`}
                    value={strengthsReview}
                    style={feedbackStyle}
                    onChange={setStrengthsReview}
                    minHeightClass="min-h-[95px]"
                    placeholder="Nyatakan aspek kekuatan kerja pelajar (cth: ketepatan fakta, struktur perenggan, usaha penyelidikan)..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-800 mb-1.5">
                    3. Kelemahan atau Kesilapan Yang Dikenal Pasti
                  </label>
                  <ItemuRichEditor
                    editorKey={`${selectedRecord.id}-weaknesses`}
                    value={weaknessesReview}
                    style={feedbackStyle}
                    onChange={setWeaknessesReview}
                    minHeightClass="min-h-[95px]"
                    placeholder="Kenal pasti kelemahan, jurang hujah, atau kesilapan format/rujukan yang perlu diperbetulkan..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4C1D95] mb-1.5">
                    4. Cadangan Penambahbaikan
                  </label>
                  <ItemuRichEditor
                    editorKey={`${selectedRecord.id}-improvements`}
                    value={improvementSuggestions}
                    style={feedbackStyle}
                    onChange={setImprovementSuggestions}
                    minHeightClass="min-h-[95px]"
                    placeholder="Berikan cadangan penambahbaikan konkrit untuk mempertingkatkan mutu tugasan mengikut nilai Itqan..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A1128] mb-1.5">
                    5. Panduan Tindakan Seterusnya
                  </label>
                  <ItemuRichEditor
                    editorKey={`${selectedRecord.id}-next`}
                    value={nextActionGuide}
                    style={feedbackStyle}
                    onChange={setNextActionGuide}
                    minHeightClass="min-h-[95px]"
                    placeholder="Senaraikan langkah tindakan susulan yang perlu dilaksanakan pelajar sebelum penghantaran tugasan..."
                  />
                </div>
              </div>

              {/* Save & Send Feedback Action Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500">
                  {selectedRecord.feedbackAt
                    ? `Maklum balas terakhir disimpan pada ${formatITemuTimestamp(
                        selectedRecord.feedbackAt
                      )}`
                    : 'Pelajar akan menerima notifikasi sebaik sahaja maklum balas dihantar.'}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={savingAction}
                    onClick={() => handleSaveFeedback()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#4C1D95] text-[#4C1D95] bg-white text-xs font-bold hover:bg-[#F3E8FF]/40 disabled:opacity-60 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {hasExistingFeedback
                        ? 'Kemaskini Maklum Balas'
                        : 'Simpan Mengikut Status Dipilih'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={savingAction}
                    onClick={() => handleSaveFeedback('maklum_balas_diberikan')}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#4C1D95] text-white text-xs font-bold hover:bg-[#3B0764] disabled:opacity-60 whitespace-nowrap"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {savingAction
                        ? 'Menyimpan...'
                        : 'Simpan & Hantar Maklum Balas kepada Pelajar'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Admin PDF Preview Modal */}
      {previewRecord && (
        <ITemuPdfPreviewModal
          record={previewRecord}
          onClose={() => setPreviewRecord(null)}
        />
      )}
    </div>
  );
}
