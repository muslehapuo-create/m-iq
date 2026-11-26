import React, { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ExternalLink, MessageSquare, Send, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { OFFICIAL_FEEDBACK_FORM_URL } from '../lib/officialMiqContent';
import type { ActivityType, FeedbackCategory, StudentFeedback } from '../types/miq';

interface FeedbackViewProps {
  feedbackList: StudentFeedback[];
  onLogActivity?: (type: ActivityType, title: string, detail: string) => Promise<void>;
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  modul: 'Kandungan Modul',
  antaramuka: 'Antaramuka & Reka Bentuk',
  teknikal: 'Teknikal & Capaian',
  umum: 'Cadangan Umum',
};

export function FeedbackView({ feedbackList, onLogActivity }: FeedbackViewProps) {
  const { user, profile } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory>('modul');
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedNotice, setSubmittedNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmed = message.trim().slice(0, 3000);
    if (!trimmed) {
      setFormError('Sila masukkan ulasan atau cadangan maklum balas anda.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSubmittedNotice(false);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userName: (profile?.displayName || user.displayName || 'Pelajar').slice(0, 120),
        category,
        rating,
        message: trimmed,
        adminReply: '',
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (onLogActivity) {
        await onLogActivity(
          'feedback',
          `Menghantar maklum balas (${CATEGORY_LABELS[category]})`,
          `Penilaian pengalaman: ${rating}/5 bintang.`
        );
      }
      setMessage('');
      setRating(5);
      setSubmittedNotice(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'feedback', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `feedback/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="text-xs font-semibold text-[#9A7414] mb-1.5">
            Bahagian 12 · Maklum Balas
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2">
            Maklum Balas Pengguna M-IQ
          </h1>
          <p className="text-sm text-slate-600 text-justify leading-relaxed max-w-3xl">
            Kongsikan pandangan, cadangan penambahbaikan atau pengalaman penggunaan platform M-IQ bagi membantu pentadbir meningkatkan kualiti bahan pembelajaran. Anda juga boleh mengisi borang maklum balas rasmi Google Form penggunaan bahan M-IQ.
          </p>
        </div>

        <a
          href={OFFICIAL_FEEDBACK_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-xs font-semibold hover:bg-[#1E293B] transition-colors whitespace-nowrap shrink-0"
        >
          <span>Borang Rasmi Maklum Balas M-IQ</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </header>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-[#0F172A] flex items-center gap-2 pb-3 border-b border-slate-100">
            <MessageSquare className="w-4 h-4 text-[#4C1D95]" />
            <span>Hantar Maklum Balas</span>
          </h2>

          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {formError}
            </div>
          )}

          {submittedNotice && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              Maklum balas anda berjaya dihantar. Terima kasih atas sumbangan anda.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kategori Maklum Balas
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#4C1D95]"
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Penilaian Pengalaman (1–5 Bintang)
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`Penilaian ${star} bintang`}
                  className={`p-2 rounded-lg border transition-colors ${
                    star <= rating
                      ? 'bg-[#FAF3DC] border-[#C59B27] text-[#9A7414]'
                      : 'bg-white border-slate-200 text-slate-300'
                  }`}
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mesej / Cadangan
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={3000}
              placeholder="Nyatakan maklum balas anda dengan jelas..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-[#0F172A] text-justify focus:outline-none focus:border-[#4C1D95]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold hover:bg-[#3B0764] transition-colors disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Menghantar...' : 'Hantar Maklum Balas'}</span>
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0F172A] tabular-nums">
              Sejarah Maklum Balas ({feedbackList.length})
            </span>
          </div>

          {feedbackList.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-600">
              Belum ada maklum balas dihantar lagi.
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((fb) => (
                <article
                  key={fb.id}
                  className="rounded-xl bg-white border border-slate-200 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#4C1D95]">
                          {CATEGORY_LABELS[fb.category]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">Penilaian {fb.rating}/5</span>
                        <span aria-hidden="true">·</span>
                        <span className={fb.status === 'reviewed' ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                          {fb.status === 'reviewed' ? 'Disemak Pentadbir' : 'Baharu'}
                        </span>
                      </div>
                    </div>

                    {fb.userId === user?.uid && (
                      <button
                        type="button"
                        onClick={() => handleDelete(fb.id)}
                        aria-label="Padam maklum balas"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 text-justify leading-relaxed">
                    {fb.message}
                  </p>

                  {fb.adminReply && (
                    <div className="p-3.5 rounded-lg bg-[#F8F9FC] border border-slate-200 text-xs text-slate-700 text-justify">
                      <span className="font-semibold text-[#0F172A]">Maklum Balas Pentadbir: </span>
                      {fb.adminReply}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
