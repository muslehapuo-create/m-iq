import { Download, ExternalLink, FileText, X } from 'lucide-react';
import {
  formatAssignmentTypeDisplay,
  formatITemuTimestamp,
  formatTargetDateDisplay,
  generateSingleITemuPdf,
} from '../../lib/itemuPdf';
import { RichContentRenderer } from '../../lib/sanitizeHtml';
import {
  DEFAULT_TOPIC_STYLE,
  formatBytes,
  isSafeHttpUrl,
  ITEMU_STATUS_META,
  type ITemuRecord,
} from '../../types/miq';

interface ITemuPdfPreviewModalProps {
  record: ITemuRecord;
  allRecords?: ITemuRecord[];
  onDownloadAll?: () => void;
  onClose: () => void;
}

export function ITemuPdfPreviewModal({
  record,
  allRecords,
  onDownloadAll,
  onClose,
}: ITemuPdfPreviewModalProps) {
  const feedbackStyle = record.feedbackStyle || DEFAULT_TOPIC_STYLE;
  const statusLabel = ITEMU_STATUS_META[record.status]?.label || record.status;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1128]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#F1F5F9] rounded-2xl border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header Bar */}
        <div className="bg-[#0A1128] text-white px-5 py-3.5 border-b border-[#C59B27]/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-[#F5E6B8] shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#F5E6B8]">
                Pratonton Dokumen PDF · i-TEMU M-IQ
              </div>
              <div className="text-xs text-slate-300 truncate">
                {record.courseCode} — {record.assignmentTitle}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {allRecords && allRecords.length > 1 && onDownloadAll && (
              <button
                type="button"
                onClick={onDownloadAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C59B27]/60 bg-white/10 text-[#F5E6B8] text-xs font-semibold hover:bg-white/20 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Muat Turun Semua Rekod Saya ({allRecords.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => generateSingleITemuPdf(record, record.studentName)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#C59B27] text-[#0A1128] text-xs font-bold hover:bg-[#D4AF37] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Muat Turun PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratonton"
              className="p-1.5 rounded-lg border border-white/20 text-slate-200 hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable A4 Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-[794px] mx-auto bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 sm:p-10 space-y-6">
              {/* Official Banner */}
              <div className="rounded-lg bg-[#0A1128] text-white p-5 border-b-4 border-[#C59B27] relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#4C1D95]" />
                <div className="pl-3 space-y-1">
                  <div className="text-[11px] font-bold text-[#F5E6B8] tracking-wide">
                    M-IQ (Mindset Itqan) &nbsp;|&nbsp; i-TEMU M-IQ
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                    REKOD MAKLUM BALAS AKADEMIK
                  </h2>
                  <p className="text-xs text-slate-200">
                    Platform Komunikasi dan Maklum Balas Akademik antara Pelajar dengan Pensyarah
                  </p>
                </div>
              </div>

              {/* A. Maklumat Pelajar */}
              <section className="space-y-2">
                <h3 className="px-3 py-1.5 rounded bg-[#F3E8FF] border border-[#C59B27]/60 text-xs font-bold text-[#4C1D95]">
                  A. Maklumat Pelajar
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <div className="p-2.5 border-b sm:border-r border-slate-200 bg-[#F8F9FC]">
                    <span className="font-semibold text-slate-600">Nama Pelajar: </span>
                    <span className="font-bold text-[#0F172A]">{record.studentName}</span>
                  </div>
                  <div className="p-2.5 border-b border-slate-200 bg-[#F8F9FC]">
                    <span className="font-semibold text-slate-600">No. Pendaftaran: </span>
                    <span className="font-bold text-[#0F172A]">
                      {record.studentRegNo || 'Tidak dinyatakan'}
                    </span>
                  </div>
                  <div className="p-2.5 border-b sm:border-b-0 sm:border-r border-slate-200">
                    <span className="font-semibold text-slate-600">Program Pengajian: </span>
                    <span className="text-[#0F172A]">{record.program || 'Tidak dinyatakan'}</span>
                  </div>
                  <div className="p-2.5">
                    <span className="font-semibold text-slate-600">Kelas: </span>
                    <span className="text-[#0F172A]">
                      {record.studentClass || 'Tidak dinyatakan'}
                    </span>
                  </div>
                </div>
              </section>

              {/* B. Maklumat Kursus */}
              <section className="space-y-2">
                <h3 className="px-3 py-1.5 rounded bg-[#F3E8FF] border border-[#C59B27]/60 text-xs font-bold text-[#4C1D95]">
                  B. Maklumat Kursus
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <div className="p-2.5 border-b sm:border-r border-slate-200 bg-[#F8F9FC]">
                    <span className="font-semibold text-slate-600">Kod Kursus: </span>
                    <span className="font-mono font-bold text-[#4C1D95]">{record.courseCode}</span>
                  </div>
                  <div className="p-2.5 border-b border-slate-200 bg-[#F8F9FC]">
                    <span className="font-semibold text-slate-600">Nama Kursus: </span>
                    <span className="font-semibold text-[#0F172A]">{record.courseName}</span>
                  </div>
                  <div className="p-2.5 sm:col-span-2">
                    <span className="font-semibold text-slate-600">Pensyarah Rujukan: </span>
                    <span className="text-[#0F172A]">{record.lecturerName}</span>
                  </div>
                </div>
              </section>

              {/* C. Tajuk dan Jenis Tugasan */}
              <section className="space-y-2">
                <h3 className="px-3 py-1.5 rounded bg-[#F3E8FF] border border-[#C59B27]/60 text-xs font-bold text-[#4C1D95]">
                  C. Tajuk dan Jenis Tugasan
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs divide-y divide-slate-200">
                  <div className="p-2.5 bg-[#F8F9FC]">
                    <span className="font-semibold text-slate-600">Tajuk Tugasan: </span>
                    <span className="font-bold text-[#0F172A]">{record.assignmentTitle}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                    <div className="p-2.5">
                      <span className="font-semibold text-slate-600">Jenis Tugasan: </span>
                      <span className="text-[#0F172A]">
                        {formatAssignmentTypeDisplay(record)}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <span className="font-semibold text-slate-600">
                        Tarikh Penghantaran / Sasaran:{' '}
                      </span>
                      <span className="text-[#0F172A]">
                        {formatTargetDateDisplay(record.targetSubmissionDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* D. Persoalan atau Perkara Yang Dirujuk */}
              <section className="space-y-2.5">
                <h3 className="px-3 py-1.5 rounded bg-[#F3E8FF] border border-[#C59B27]/60 text-xs font-bold text-[#4C1D95]">
                  D. Persoalan atau Perkara Yang Dirujuk
                </h3>
                <div className="space-y-2 text-xs text-slate-700 leading-relaxed text-justify">
                  <div>
                    <div className="font-bold text-[#0F172A]">
                      Bahagian Tugasan Yang Memerlukan Panduan Pensyarah:
                    </div>
                    <p>{record.guidanceArea}</p>
                  </div>
                  <div>
                    <div className="font-bold text-[#0F172A]">
                      Persoalan atau Masalah Yang Dihadapi:
                    </div>
                    <p className="whitespace-pre-line">{record.questionOrIssue}</p>
                  </div>
                  {record.feedbackExplanation && (
                    <div>
                      <div className="font-bold text-[#0F172A]">
                        Penjelasan Perkara Yang Ingin Mendapatkan Maklum Balas:
                      </div>
                      <p className="whitespace-pre-line">{record.feedbackExplanation}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* E. Lampiran Berkaitan */}
              <section className="space-y-2">
                <h3 className="px-3 py-1.5 rounded bg-[#F3E8FF] border border-[#C59B27]/60 text-xs font-bold text-[#4C1D95]">
                  E. Lampiran Berkaitan
                </h3>
                {!record.attachments || record.attachments.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Tiada fail lampiran dimuat naik oleh pelajar bagi permohonan ini.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {record.attachments.map((att, idx) => (
                      <li
                        key={`${att.url}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 bg-[#F8F9FC]"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-[#0F172A]">{att.name}</span>{' '}
                          <span className="text-slate-500 tabular-nums">
                            ({att.type === 'image' ? 'Imej' : 'Dokumen'} · {formatBytes(att.size)})
                          </span>
                        </div>
                        {isSafeHttpUrl(att.url) && (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#4C1D95] font-semibold hover:underline"
                          >
                            <span>Buka Fail</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* F. Maklum Balas Pensyarah */}
              <section className="space-y-3">
                <h3 className="px-3 py-1.5 rounded bg-[#F3E8FF] border border-[#C59B27]/60 text-xs font-bold text-[#4C1D95]">
                  F. Maklum Balas Pensyarah
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="font-bold text-[#0F172A] mb-1">
                      Ulasan / Maklum Balas Terperinci:
                    </div>
                    {record.detailedFeedback?.trim() ? (
                      <RichContentRenderer
                        content={record.detailedFeedback}
                        style={feedbackStyle}
                      />
                    ) : (
                      <p className="text-slate-500 italic">
                        Maklum balas terperinci pensyarah belum diberikan.
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[#0F172A] mb-1">Kekuatan Tugasan:</div>
                    {record.strengthsReview?.trim() ? (
                      <RichContentRenderer
                        content={record.strengthsReview}
                        style={feedbackStyle}
                      />
                    ) : (
                      <p className="text-slate-500 italic">Belum direkodkan.</p>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[#0F172A] mb-1">
                      Kelemahan atau Kesilapan Yang Dikenal Pasti:
                    </div>
                    {record.weaknessesReview?.trim() ? (
                      <RichContentRenderer
                        content={record.weaknessesReview}
                        style={feedbackStyle}
                      />
                    ) : (
                      <p className="text-slate-500 italic">Belum direkodkan.</p>
                    )}
                  </div>
                </div>
              </section>

              {/* G. Cadangan Penambahbaikan */}
              <section className="space-y-2">
                <h3 className="px-3 py-1.5 rounded bg-[#F3E8FF] border border-[#C59B27]/60 text-xs font-bold text-[#4C1D95]">
                  G. Cadangan Penambahbaikan
                </h3>
                {record.improvementSuggestions?.trim() ? (
                  <RichContentRenderer
                    content={record.improvementSuggestions}
                    style={feedbackStyle}
                  />
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Belum ada cadangan penambahbaikan direkodkan.
                  </p>
                )}
              </section>

              {/* H. Tindakan Susulan Pelajar */}
              <section className="space-y-2.5">
                <h3 className="px-3 py-1.5 rounded bg-[#F3E8FF] border border-[#C59B27]/60 text-xs font-bold text-[#4C1D95]">
                  H. Tindakan Susulan Pelajar
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="font-bold text-[#0F172A] mb-1">
                      Panduan Tindakan Seterusnya daripada Pensyarah:
                    </div>
                    {record.nextActionGuide?.trim() ? (
                      <RichContentRenderer
                        content={record.nextActionGuide}
                        style={feedbackStyle}
                      />
                    ) : (
                      <p className="text-slate-500 italic">
                        Belum ada panduan tindakan seterusnya direkodkan.
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[#0F172A] mb-1">
                      Catatan Tindakan Susulan Pelajar:
                    </div>
                    <p className="text-slate-700 text-justify leading-relaxed">
                      {record.studentFollowUpNote?.trim() ||
                        'Belum ada catatan tindakan susulan daripada pelajar.'}
                    </p>
                  </div>
                </div>
              </section>

              {/* I. Tarikh Penghantaran Permohonan dan Tarikh Maklum Balas */}
              <section className="space-y-2">
                <h3 className="px-3 py-1.5 rounded bg-[#F3E8FF] border border-[#C59B27]/60 text-xs font-bold text-[#4C1D95]">
                  I. Tarikh Penghantaran Permohonan dan Tarikh Maklum Balas
                </h3>
                <div className="grid sm:grid-cols-2 border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <div className="p-2.5 border-b sm:border-r border-slate-200 bg-[#F8F9FC]">
                    <span className="font-semibold text-slate-600">Status Permohonan: </span>
                    <span className="font-bold text-[#4C1D95]">{statusLabel}</span>
                  </div>
                  <div className="p-2.5 border-b border-slate-200 bg-[#F8F9FC]">
                    <span className="font-semibold text-slate-600">Tarikh Dihantar: </span>
                    <span className="text-[#0F172A] tabular-nums">
                      {formatITemuTimestamp(record.createdAt)}
                    </span>
                  </div>
                  <div className="p-2.5 border-b sm:border-b-0 sm:border-r border-slate-200">
                    <span className="font-semibold text-slate-600">Tarikh Maklum Balas: </span>
                    <span className="text-[#0F172A] tabular-nums">
                      {record.feedbackAt
                        ? formatITemuTimestamp(record.feedbackAt)
                        : 'Menunggu maklum balas pensyarah'}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <span className="font-semibold text-slate-600">Pemberi Maklum Balas: </span>
                    <span className="text-[#0F172A]">
                      {record.feedbackByName || record.lecturerName}
                    </span>
                  </div>
                </div>
              </section>

              {/* Sheet Footer with I-TEMU Watermark */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between gap-4 text-[11px] text-slate-500">
                <div>i-TEMU M-IQ &nbsp;|&nbsp; REKOD MAKLUM BALAS AKADEMIK</div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-600">Muka 1</span>
                  <span className="px-2.5 py-0.5 rounded border border-[#C59B27] bg-[#F8F9FC] text-[11px] font-bold tracking-wider text-[#4C1D95]/75">
                    I-TEMU
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
