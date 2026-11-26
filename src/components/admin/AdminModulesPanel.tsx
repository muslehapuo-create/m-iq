import React, { useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit3,
  FolderTree,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  db,
  handleFirestoreError,
  OperationType,
  uploadMediaToStorage,
  validateUploadFile,
} from '../../lib/firebase';
import { HERO_BANNER_IMAGE, MODULE_COVER_IMAGE } from '../../lib/seedData';
import {
  sanitizeId,
  type LearningModule,
  type ModuleSectionType,
  type PublishStatus,
  type SubModule,
} from '../../types/miq';

interface AdminModulesPanelProps {
  modules: LearningModule[];
  submodules: SubModule[];
  onSelectModuleForTopics: (moduleId: string, subModuleId?: string) => void;
}

export function AdminModulesPanel({
  modules,
  submodules,
  onSelectModuleForTopics,
}: AdminModulesPanelProps) {
  const { user } = useAuth();
  const learningModules = modules.filter((m) => m.sectionType === 'learning');

  // Module form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [sectionType, setSectionType] = useState<ModuleSectionType>('learning');
  const [status, setStatus] = useState<PublishStatus>('draft');
  const [coverImageUrl, setCoverImageUrl] = useState(MODULE_COVER_IMAGE);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Submodule state
  const [subParentId, setSubParentId] = useState<string>(
    learningModules[0]?.id || 'pengenalan-miq'
  );
  const [subEditId, setSubEditId] = useState<string | null>(null);
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subStatus, setSubStatus] = useState<PublishStatus>('published');
  const [savingSub, setSavingSub] = useState(false);
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setSectionType('learning');
    setStatus('draft');
    setCoverImageUrl(MODULE_COVER_IMAGE);
    setError(null);
  };

  const startEdit = (mod: LearningModule) => {
    setEditingId(mod.id);
    setTitle(mod.title);
    setSubtitle(mod.subtitle);
    setSectionType(mod.sectionType);
    setStatus(mod.status);
    setCoverImageUrl(mod.coverImageUrl || MODULE_COVER_IMAGE);
    setError(null);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationErr = validateUploadFile(file, 'image');
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setUploadingCover(true);
    setError(null);
    try {
      const res = await uploadMediaToStorage(file, 'covers', setUploadPct);
      setCoverImageUrl(res.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Gagal memuat naik imej ke Firebase Storage: ${err.message}`
          : 'Gagal memuat naik imej.'
      );
    } finally {
      setUploadingCover(false);
      setUploadPct(0);
    }
  };

  const handleSave = async (e: React.FormEvent, targetStatus?: PublishStatus) => {
    e.preventDefault();
    if (!user) return;
    const trimmedTitle = title.trim().slice(0, 160);
    const trimmedSub = subtitle.trim().slice(0, 300);
    if (!trimmedTitle) {
      setError('Tajuk modul wajib diisi.');
      return;
    }

    const finalStatus = targetStatus ?? status;
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const modRef = doc(db, 'modules', editingId);
        await updateDoc(modRef, {
          title: trimmedTitle,
          subtitle: trimmedSub,
          sectionType,
          status: finalStatus,
          coverImageUrl: coverImageUrl.trim().slice(0, 1000) || MODULE_COVER_IMAGE,
          updatedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        const newId = sanitizeId(`${trimmedTitle}-${Date.now().toString().slice(-4)}`);
        const maxOrder = modules.reduce((max, m) => Math.max(max, m.navOrder), 0);
        await setDoc(doc(db, 'modules', newId), {
          id: newId,
          slug: newId,
          navOrder: Math.min(maxOrder + 1, 200),
          title: trimmedTitle,
          subtitle: trimmedSub,
          sectionType,
          status: finalStatus,
          coverImageUrl: coverImageUrl.trim().slice(0, 1000) || MODULE_COVER_IMAGE,
          isCore: false,
          updatedBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(
        err,
        editingId ? OperationType.UPDATE : OperationType.CREATE,
        'modules'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateModule = async (mod: LearningModule) => {
    if (!user) return;
    const newId = sanitizeId(`${mod.slug}-salinan-${Date.now().toString().slice(-4)}`);
    const maxOrder = modules.reduce((max, m) => Math.max(max, m.navOrder), 0);
    try {
      await setDoc(doc(db, 'modules', newId), {
        id: newId,
        slug: newId,
        navOrder: Math.min(maxOrder + 1, 200),
        title: `${mod.title} (Salinan)`.slice(0, 160),
        subtitle: mod.subtitle,
        sectionType: mod.sectionType === 'dashboard' ? 'learning' : mod.sectionType,
        status: 'draft',
        coverImageUrl: mod.coverImageUrl || MODULE_COVER_IMAGE,
        isCore: false,
        updatedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `modules/${newId}`);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    if (!user) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= modules.length) return;

    const current = modules[index];
    const swapWith = modules[targetIdx];

    const batch = writeBatch(db);
    batch.update(doc(db, 'modules', current.id), {
      navOrder: swapWith.navOrder,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'modules', swapWith.id), {
      navOrder: current.navOrder,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'modules/reorder');
    }
  };

  const handleToggleStatus = async (mod: LearningModule) => {
    if (!user) return;
    const next: PublishStatus = mod.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'modules', mod.id), {
        status: next,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `modules/${mod.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'modules', id));
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `modules/${id}`);
    }
  };

  // Submodule handlers
  const activeSubmodules = submodules
    .filter((s) => s.moduleId === subParentId)
    .sort((a, b) => a.order - b.order);

  const resetSubForm = () => {
    setSubEditId(null);
    setSubTitle('');
    setSubDesc('');
    setSubStatus('published');
  };

  const handleSaveSubmodule = async (e: React.FormEvent, forceStatus?: PublishStatus) => {
    e.preventDefault();
    if (!user || !subTitle.trim()) return;
    setSavingSub(true);
    const finalStatus = forceStatus ?? subStatus;
    try {
      if (subEditId) {
        const order = submodules.find((s) => s.id === subEditId)?.order ?? 1;
        await updateDoc(doc(db, 'submodules', subEditId), {
          moduleId: subParentId,
          title: subTitle.trim().slice(0, 180),
          description: subDesc.trim().slice(0, 400),
          order,
          status: finalStatus,
          updatedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        const nextOrder = activeSubmodules.reduce((m, s) => Math.max(m, s.order), 0) + 1;
        await addDoc(collection(db, 'submodules'), {
          moduleId: subParentId,
          title: subTitle.trim().slice(0, 180),
          description: subDesc.trim().slice(0, 400),
          order: nextOrder,
          status: finalStatus,
          updatedBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      resetSubForm();
    } catch (err) {
      handleFirestoreError(
        err,
        subEditId ? OperationType.UPDATE : OperationType.CREATE,
        'submodules'
      );
    } finally {
      setSavingSub(false);
    }
  };

  const handleMoveSubmodule = async (index: number, direction: -1 | 1) => {
    if (!user) return;
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= activeSubmodules.length) return;
    const a = activeSubmodules[index];
    const b = activeSubmodules[swapIdx];
    const batch = writeBatch(db);
    batch.update(doc(db, 'submodules', a.id), {
      order: b.order,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'submodules', b.id), {
      order: a.order,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'submodules/reorder');
    }
  };

  const handleDuplicateSubmodule = async (sub: SubModule) => {
    if (!user) return;
    const nextOrder = activeSubmodules.reduce((m, s) => Math.max(m, s.order), 0) + 1;
    try {
      await addDoc(collection(db, 'submodules'), {
        moduleId: sub.moduleId,
        title: `${sub.title} (Salinan)`.slice(0, 180),
        description: sub.description,
        order: nextOrder,
        status: 'draft',
        updatedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'submodules');
    }
  };

  return (
    <div className="space-y-8">
      {/* Main Modules Management */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={(e) => handleSave(e)}
          className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#0F172A]">
              {editingId ? 'Sunting Modul Utama' : 'Tambah Modul Utama Baharu'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-[#0F172A]"
              >
                Batal Suntingan
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Modul / Bahagian
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              placeholder="Contoh: Modul Tambahan Etika Akademik"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4C1D95]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Penerangan Ringkas
            </label>
            <textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Ringkasan objektif modul..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-justify focus:outline-none focus:border-[#4C1D95]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Bahagian
              </label>
              <select
                value={sectionType}
                onChange={(e) => setSectionType(e.target.value as ModuleSectionType)}
                disabled={Boolean(editingId && modules.find((m) => m.id === editingId)?.isCore)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white disabled:bg-slate-50"
              >
                <option value="learning">Modul Pembelajaran</option>
                <option value="dashboard">Dashboard</option>
                <option value="checklist">Penilaian Kendiri</option>
                <option value="rubric">Rubrik Kualiti</option>
                <option value="reflection">Refleksi</option>
                <option value="appointment">i-Temu Pensyarah</option>
                <option value="feedback">Maklum Balas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status Terbitan
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PublishStatus)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="draft">Draf</option>
                <option value="published">Diterbitkan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Imej Muka Hadapan Modul
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#4C1D95]" />
                <span>{uploadingCover ? `Memuat naik ${uploadPct}%` : 'Muat Naik Imej'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                  disabled={uploadingCover}
                />
              </label>
              <button
                type="button"
                onClick={() => setCoverImageUrl(MODULE_COVER_IMAGE)}
                className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
              >
                Guna Geometri
              </button>
              <button
                type="button"
                onClick={() => setCoverImageUrl(HERO_BANNER_IMAGE)}
                className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
              >
                Guna Perpustakaan
              </button>
            </div>
            <input
              type="text"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              maxLength={1000}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={(e) => handleSave(e, 'draft')}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors"
            >
              Simpan Draf
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={(e) => handleSave(e, 'published')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold hover:bg-[#3B0764] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{editingId ? 'Kemaskini & Terbit' : 'Tambah & Terbit'}</span>
            </button>
          </div>
        </form>

        <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200">
            <h2 className="text-base font-bold text-[#0F172A]">
              Susunan &amp; Senarai Modul ({modules.length})
            </h2>
            <p className="text-xs text-slate-500">
              Susun semula, gandakan, sunting atau terbit/nyahterbit modul utama M-IQ.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {modules.map((mod, idx) => (
              <div
                key={mod.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-mono font-semibold text-[#4C1D95] tabular-nums">
                      #{String(mod.navOrder).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{mod.sectionType}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        mod.status === 'published'
                          ? 'text-emerald-700 font-semibold'
                          : 'text-amber-700 font-semibold'
                      }
                    >
                      {mod.status === 'published' ? 'Diterbitkan' : 'Draf'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[#0F172A] truncate">{mod.title}</div>
                  <div className="text-xs text-slate-500 truncate">{mod.subtitle}</div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Naikkan kedudukan"
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === modules.length - 1}
                    aria-label="Turunkan kedudukan"
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {mod.sectionType === 'learning' && (
                    <button
                      type="button"
                      onClick={() => onSelectModuleForTopics(mod.id)}
                      className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#4C1D95] hover:bg-white whitespace-nowrap"
                    >
                      Topik
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(mod)}
                    className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-[#0F172A] hover:bg-white whitespace-nowrap"
                  >
                    {mod.status === 'published' ? 'Nyahterbit' : 'Terbitkan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateModule(mod)}
                    title="Gandakan modul"
                    aria-label="Gandakan modul"
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#4C1D95] hover:bg-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(mod)}
                    aria-label="Sunting modul"
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#4C1D95] hover:bg-white"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {!mod.isCore &&
                    (confirmDeleteId === mod.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(mod.id)}
                          className="px-2 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                        >
                          Padam
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(mod.id)}
                        aria-label="Padam modul"
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submodule Management */}
      <div className="grid lg:grid-cols-12 gap-6 items-start pt-4 border-t border-slate-200">
        <form
          onSubmit={(e) => handleSaveSubmodule(e)}
          className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[#9A7414]" />
              <span>{subEditId ? 'Sunting Submodul' : 'Tambah Submodul Baharu'}</span>
            </h2>
            {subEditId && (
              <button
                type="button"
                onClick={resetSubForm}
                className="text-xs text-slate-500 hover:text-[#0F172A]"
              >
                Batal
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Modul Utama
            </label>
            <select
              value={subParentId}
              onChange={(e) => {
                setSubParentId(e.target.value);
                resetSubForm();
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {learningModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {String(m.navOrder).padStart(2, '0')}. {m.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Submodul
            </label>
            <input
              type="text"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              maxLength={180}
              placeholder="Contoh: Unit 1.1 — Konsep Asas"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Keterangan Ringkas Submodul
            </label>
            <textarea
              value={subDesc}
              onChange={(e) => setSubDesc(e.target.value)}
              rows={2}
              maxLength={400}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={savingSub}
              onClick={(e) => handleSaveSubmodule(e, 'draft')}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
            >
              Simpan Draf
            </button>
            <button
              type="button"
              disabled={savingSub}
              onClick={(e) => handleSaveSubmodule(e, 'published')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-sm font-semibold hover:bg-[#1E293B]"
            >
              <Plus className="w-4 h-4" />
              <span>{subEditId ? 'Kemaskini' : 'Tambah Submodul'}</span>
            </button>
          </div>
        </form>

        <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200">
            <h2 className="text-base font-bold text-[#0F172A] tabular-nums">
              Submodul bagi {learningModules.find((m) => m.id === subParentId)?.title} (
              {activeSubmodules.length})
            </h2>
          </div>

          {activeSubmodules.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">
              Tiada submodul dicipta untuk modul ini. Topik boleh diletakkan terus di bawah modul atau dikumpulkan dalam submodul.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeSubmodules.map((sub, idx) => (
                <div
                  key={sub.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500 flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-semibold text-[#4C1D95] tabular-nums">
                        Sub #{idx + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          sub.status === 'published'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {sub.status === 'published' ? 'Diterbitkan' : 'Draf'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#0F172A] truncate">{sub.title}</div>
                    {sub.description && (
                      <div className="text-xs text-slate-500 truncate">{sub.description}</div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveSubmodule(idx, -1)}
                      disabled={idx === 0}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30"
                      aria-label="Naikkan submodul"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSubmodule(idx, 1)}
                      disabled={idx === activeSubmodules.length - 1}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30"
                      aria-label="Turunkan submodul"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectModuleForTopics(sub.moduleId, sub.id)}
                      className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#4C1D95]"
                    >
                      Topik
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!user) return;
                        try {
                          await updateDoc(doc(db, 'submodules', sub.id), {
                            status: sub.status === 'published' ? 'draft' : 'published',
                            updatedBy: user.uid,
                            updatedAt: serverTimestamp(),
                          });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `submodules/${sub.id}`);
                        }
                      }}
                      className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-[#0F172A]"
                    >
                      {sub.status === 'published' ? 'Nyahterbit' : 'Terbitkan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateSubmodule(sub)}
                      aria-label="Gandakan submodul"
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#4C1D95]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubEditId(sub.id);
                        setSubTitle(sub.title);
                        setSubDesc(sub.description);
                        setSubStatus(sub.status);
                      }}
                      aria-label="Sunting submodul"
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#4C1D95]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {confirmDeleteSubId === sub.id ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, 'submodules', sub.id));
                            setConfirmDeleteSubId(null);
                          } catch (err) {
                            handleFirestoreError(err, OperationType.DELETE, `submodules/${sub.id}`);
                          }
                        }}
                        className="px-2 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                      >
                        Padam
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSubId(sub.id)}
                        aria-label="Padam submodul"
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
