import React, { useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Edit3, ExternalLink, FileText, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  db,
  deleteMediaFromStorage,
  handleFirestoreError,
  OperationType,
  uploadMediaToStorage,
  validateUploadFile,
} from '../../lib/firebase';
import {
  isSafeHttpUrl,
  type LearningModule,
  type LearningResource,
  type PublishStatus,
} from '../../types/miq';

interface AdminResourcesPanelProps {
  modules: LearningModule[];
  resources: LearningResource[];
}

export function AdminResourcesPanel({ modules, resources }: AdminResourcesPanelProps) {
  const { user } = useAuth();
  const learningModules = modules.filter((m) => m.sectionType === 'learning');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState('all');
  const [resourceType, setResourceType] = useState<LearningResource['resourceType']>('document');
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [status, setStatus] = useState<PublishStatus>('published');
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setModuleId('all');
    setResourceType('document');
    setUrl('');
    setFileName('');
    setStoragePath('');
    setStatus('published');
    setError(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationErr = validateUploadFile(file, 'any');
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadMediaToStorage(file, 'resources', setUploadPct);
      setUrl(uploaded.url);
      setFileName(uploaded.fileName);
      setStoragePath(uploaded.storagePath);
      if (file.type.startsWith('image/')) {
        setResourceType('image');
      } else {
        setResourceType('document');
      }
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').slice(0, 180));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Muat naik Firebase Storage gagal: ${err.message}`
          : 'Muat naik gagal.'
      );
    } finally {
      setUploading(false);
      setUploadPct(0);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmedTitle = title.trim().slice(0, 200);
    const trimmedUrl = url.trim().slice(0, 1000);
    if (!trimmedTitle || !isSafeHttpUrl(trimmedUrl)) {
      setError('Tajuk sumber dan URL sah (https:// atau muat naik fail) wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: trimmedTitle,
        description: description.trim().slice(0, 500),
        moduleId: moduleId || 'all',
        resourceType,
        url: trimmedUrl,
        fileName: (fileName || trimmedTitle).slice(0, 200),
        storagePath: storagePath.slice(0, 300),
        status,
        uploadedBy: user.uid,
        updatedAt: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(db, 'resources', editingId), payload);
      } else {
        await addDoc(collection(db, 'resources'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(
        err,
        editingId ? OperationType.UPDATE : OperationType.CREATE,
        'resources'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (res: LearningResource) => {
    const next: PublishStatus = res.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'resources', res.id), {
        status: next,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `resources/${res.id}`);
    }
  };

  const handleDelete = async (res: LearningResource) => {
    try {
      if (res.storagePath) {
        try {
          await deleteMediaFromStorage(res.storagePath);
        } catch {
          // Proceed with Firestore record cleanup even if object already removed
        }
      }
      await deleteDoc(doc(db, 'resources', res.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `resources/${res.id}`);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      <form
        onSubmit={handleSave}
        className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-6 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-[#0F172A]">
            {editingId ? 'Sunting Bahan Pembelajaran' : 'Tambah Bahan Pembelajaran Pelajar'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-[#0F172A]"
            >
              Batal
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
            Muat Naik Fail (PDF, DOCX, PPT, Imej)
          </label>
          <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[#4C1D95]" />
            <span>{uploading ? `Memuat naik ${uploadPct}%` : 'Pilih Fail ke Firebase Storage'}</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Tajuk Sumber
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Contoh: Templat Perancangan Tugasan Politeknik"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4C1D95]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            URL Sumber / Pautan Fail
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={1000}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#4C1D95]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Modul Berkaitan
            </label>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
            >
              <option value="all">Semua Modul</option>
              {learningModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Jenis Sumber
            </label>
            <select
              value={resourceType}
              onChange={(e) =>
                setResourceType(e.target.value as LearningResource['resourceType'])
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
            >
              <option value="document">Dokumen</option>
              <option value="image">Imej</option>
              <option value="video">Video</option>
              <option value="link">Pautan Luar</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Keterangan Ringkas
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4C1D95]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PublishStatus)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          >
            <option value="published">Diterbitkan</option>
            <option value="draft">Draf</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold hover:bg-[#3B0764] transition-colors disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          <span>{saving ? 'Menyimpan...' : editingId ? 'Kemaskini Bahan' : 'Simpan Bahan'}</span>
        </button>
      </form>

      <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#0F172A] tabular-nums">
            Senarai Bahan Pelajar ({resources.length})
          </h2>
          <div className="relative sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari bahan..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#4C1D95]"
            />
          </div>
        </div>

        {resources.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tiada sumber pembelajaran dimuat naik lagi.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {resources
              .filter((r) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  r.title.toLowerCase().includes(q) ||
                  r.description.toLowerCase().includes(q) ||
                  r.fileName.toLowerCase().includes(q)
                );
              })
              .map((res) => (
              <div
                key={res.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-[#4C1D95]" />
                    <span>{res.resourceType}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {res.moduleId === 'all'
                        ? 'Semua Modul'
                        : modules.find((m) => m.id === res.moduleId)?.title || res.moduleId}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        res.status === 'published'
                          ? 'text-emerald-700 font-semibold'
                          : 'text-amber-700 font-semibold'
                      }
                    >
                      {res.status === 'published' ? 'Diterbitkan' : 'Draf'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[#0F172A] truncate">
                    {res.title}
                  </div>
                  {res.description && (
                    <div className="text-xs text-slate-600 truncate">{res.description}</div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSafeHttpUrl(res.url) && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#4C1D95]"
                      aria-label="Buka pautan sumber"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(res.id);
                      setTitle(res.title);
                      setDescription(res.description);
                      setModuleId(res.moduleId);
                      setResourceType(res.resourceType);
                      setUrl(res.url);
                      setFileName(res.fileName);
                      setStoragePath(res.storagePath);
                      setStatus(res.status);
                    }}
                    aria-label="Sunting bahan"
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#4C1D95]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(res)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#0F172A] hover:bg-slate-50"
                  >
                    {res.status === 'published' ? 'Nyahterbit' : 'Terbitkan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(res)}
                    aria-label="Padam sumber"
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
