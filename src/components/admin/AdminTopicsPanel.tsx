import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  Copy,
  Edit3,
  Eye,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Search,
  Trash2,
  Upload,
  Youtube,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  db,
  handleFirestoreError,
  OperationType,
  uploadMediaToStorage,
  validateUploadFile,
} from '../../lib/firebase';
import { RichContentRenderer, sanitizeHtmlForStorage } from '../../lib/sanitizeHtml';
import {
  DEFAULT_TOPIC_STYLE,
  extractGoogleDrivePreviewUrl,
  extractYoutubeId,
  formatBytes,
  isSafeHttpUrl,
  type ExternalLinkItem,
  type LearningModule,
  type PublishStatus,
  type ReferenceMaterialItem,
  type SubModule,
  type TopicAttachment,
  type TopicContent,
  type TopicStyle,
} from '../../types/miq';
import { RichTextEditor } from './RichTextEditor';

interface AdminTopicsPanelProps {
  modules: LearningModule[];
  submodules: SubModule[];
  topics: TopicContent[];
  initialModuleId?: string;
  initialSubModuleId?: string;
  initialTopicId?: string;
}

export function AdminTopicsPanel({
  modules,
  submodules,
  topics,
  initialModuleId,
  initialSubModuleId,
  initialTopicId,
}: AdminTopicsPanelProps) {
  const { user } = useAuth();
  const learningModules = modules.filter((m) => m.sectionType === 'learning');

  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    initialModuleId || learningModules[0]?.id || 'pengenalan-miq'
  );
  const [selectedSubModuleId, setSelectedSubModuleId] = useState<string>(
    initialSubModuleId || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<PublishStatus>('draft');
  const [editorSessionKey, setEditorSessionKey] = useState<string>('new-0');

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [style, setStyle] = useState<TopicStyle>(DEFAULT_TOPIC_STYLE);
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([]);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [externalLinks, setExternalLinks] = useState<ExternalLinkItem[]>([]);
  const [linkLabelInput, setLinkLabelInput] = useState('');
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [attachments, setAttachments] = useState<TopicAttachment[]>([]);
  const [referenceMaterials, setReferenceMaterials] = useState<ReferenceMaterialItem[]>([]);
  const [refTitleInput, setRefTitleInput] = useState('');
  const [refSourceInput, setRefSourceInput] = useState('');
  const [refUrlInput, setRefUrlInput] = useState('');

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const moduleSubmodules = submodules
    .filter((s) => s.moduleId === selectedModuleId)
    .sort((a, b) => a.order - b.order);

  const moduleTopics = topics
    .filter((t) => t.moduleId === selectedModuleId)
    .filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.order - b.order);

  const loadTopicIntoEditor = (topic: TopicContent) => {
    setEditingTopicId(topic.id);
    setEditingStatus(topic.status);
    setSelectedSubModuleId(topic.subModuleId || '');
    setTitle(topic.title);
    setSummary(topic.summary);
    setContent(topic.content);
    setStyle({
      ...DEFAULT_TOPIC_STYLE,
      ...(topic.style || {}),
    });
    setYoutubeUrls(topic.youtubeUrls || []);
    setExternalLinks(topic.externalLinks || []);
    setAttachments(topic.attachments || []);
    setReferenceMaterials(topic.referenceMaterials || []);
    setEditorSessionKey(`topic-${topic.id}-${Date.now()}`);
    setPreviewMode(false);
    setError(null);
    setNotice(null);
  };

  useEffect(() => {
    if (initialModuleId) {
      setSelectedModuleId(initialModuleId);
    }
    if (initialSubModuleId !== undefined) {
      setSelectedSubModuleId(initialSubModuleId);
    }
  }, [initialModuleId, initialSubModuleId]);

  useEffect(() => {
    if (initialTopicId) {
      const found = topics.find((t) => t.id === initialTopicId);
      if (found) {
        setSelectedModuleId(found.moduleId);
        loadTopicIntoEditor(found);
      }
    }
  }, [initialTopicId, topics]);

  const resetEditor = () => {
    setEditingTopicId(null);
    setEditingStatus('draft');
    setTitle('');
    setSummary('');
    setContent('');
    setStyle(DEFAULT_TOPIC_STYLE);
    setYoutubeUrls([]);
    setExternalLinks([]);
    setAttachments([]);
    setReferenceMaterials([]);
    setEditorSessionKey(`new-${Date.now()}`);
    setPreviewMode(false);
    setError(null);
    setNotice(null);
  };

  const handleAddYoutube = () => {
    const trimmed = youtubeInput.trim();
    if (!trimmed) return;
    const ytId = extractYoutubeId(trimmed);
    if (!ytId) {
      setError('Pautan YouTube tidak sah. Gunakan pautan youtube.com atau youtu.be.');
      return;
    }
    if (youtubeUrls.length >= 5) {
      setError('Maksimum 5 video YouTube bagi setiap topik.');
      return;
    }
    setYoutubeUrls((prev) => [...prev, trimmed.slice(0, 200)]);
    setYoutubeInput('');
    setError(null);
  };

  const handleAddLink = () => {
    const label = linkLabelInput.trim().slice(0, 120);
    const url = linkUrlInput.trim().slice(0, 500);
    if (!label || !isSafeHttpUrl(url)) {
      setError('Masukkan label dan URL sah bermula dengan https:// atau http://.');
      return;
    }
    if (externalLinks.length >= 10) {
      setError('Maksimum 10 pautan luar bagi setiap topik.');
      return;
    }
    setExternalLinks((prev) => [...prev, { label, url }]);
    setLinkLabelInput('');
    setLinkUrlInput('');
    setError(null);
  };

  const handleAddReference = () => {
    const refTitle = refTitleInput.trim().slice(0, 200);
    const refSource = refSourceInput.trim().slice(0, 200);
    const refUrl = refUrlInput.trim().slice(0, 500);
    if (!refTitle) {
      setError('Tajuk bahan rujukan wajib diisi.');
      return;
    }
    if (refUrl && !isSafeHttpUrl(refUrl)) {
      setError('URL rujukan mesti bermula dengan https:// atau http://.');
      return;
    }
    if (referenceMaterials.length >= 15) {
      setError('Maksimum 15 bahan rujukan bagi setiap topik.');
      return;
    }
    setReferenceMaterials((prev) => [
      ...prev,
      { title: refTitle, source: refSource, url: refUrl },
    ]);
    setRefTitleInput('');
    setRefSourceInput('');
    setRefUrlInput('');
    setError(null);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'image' | 'document'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationErr = validateUploadFile(file, kind);
    if (validationErr) {
      setError(validationErr);
      return;
    }
    if (attachments.length >= 10) {
      setError('Maksimum 10 lampiran bagi setiap topik.');
      return;
    }

    setUploadingFile(true);
    setError(null);
    try {
      const uploaded = await uploadMediaToStorage(file, 'topics', setUploadPct);
      setAttachments((prev) => [
        ...prev,
        {
          name: uploaded.fileName,
          url: uploaded.url,
          type: kind,
          size: uploaded.size,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Muat naik Firebase Storage gagal: ${err.message}`
          : 'Muat naik fail gagal.'
      );
    } finally {
      setUploadingFile(false);
      setUploadPct(0);
      e.target.value = '';
    }
  };

  const handleSaveTopic = async (targetStatus: PublishStatus, actionLabel?: string) => {
    if (!user) return;
    const trimmedTitle = title.trim().slice(0, 200);
    if (!trimmedTitle) {
      setError('Tajuk topik wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const safeColor = /^#[0-9a-fA-F]{6}$/.test(style.textColor)
      ? style.textColor
      : '#1E293B';
    const safeBg =
      style.backgroundColor &&
      (style.backgroundColor === 'transparent' ||
        /^#[0-9a-fA-F]{6}$/.test(style.backgroundColor))
        ? style.backgroundColor
        : 'transparent';

    const cleanedContent = sanitizeHtmlForStorage(content).slice(0, 100000);

    const payload = {
      moduleId: selectedModuleId,
      subModuleId: selectedSubModuleId || '',
      title: trimmedTitle,
      summary: summary.trim().slice(0, 600),
      status: targetStatus,
      content: cleanedContent,
      style: {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        textColor: safeColor,
        backgroundColor: safeBg,
        textAlign: style.textAlign,
      },
      youtubeUrls: youtubeUrls.slice(0, 5),
      externalLinks: externalLinks.slice(0, 10),
      attachments: attachments.slice(0, 10),
      referenceMaterials: referenceMaterials.slice(0, 15),
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingTopicId) {
        const existingOrder =
          topics.find((t) => t.id === editingTopicId)?.order ?? 1;
        await updateDoc(doc(db, 'topics', editingTopicId), {
          ...payload,
          order: existingOrder,
        });
        setEditingStatus(targetStatus);
        setNotice(
          actionLabel ||
            (targetStatus === 'published'
              ? 'Topik berjaya dikemas kini dan diterbitkan.'
              : 'Topik disimpan sebagai draf.')
        );
      } else {
        const nextOrder =
          topics
            .filter((t) => t.moduleId === selectedModuleId)
            .reduce((max, t) => Math.max(max, t.order), 0) + 1;
        const created = await addDoc(collection(db, 'topics'), {
          ...payload,
          order: nextOrder,
          createdAt: serverTimestamp(),
        });
        setEditingTopicId(created.id);
        setEditingStatus(targetStatus);
        setNotice(
          actionLabel ||
            (targetStatus === 'published'
              ? 'Topik baharu berjaya dicipta dan diterbitkan.'
              : 'Topik baharu disimpan sebagai draf.')
        );
      }
    } catch (err) {
      handleFirestoreError(
        err,
        editingTopicId ? OperationType.UPDATE : OperationType.CREATE,
        'topics'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateTopic = async (topic: TopicContent) => {
    if (!user) return;
    const nextOrder =
      topics
        .filter((t) => t.moduleId === topic.moduleId)
        .reduce((max, t) => Math.max(max, t.order), 0) + 1;
    try {
      const created = await addDoc(collection(db, 'topics'), {
        moduleId: topic.moduleId,
        subModuleId: topic.subModuleId || '',
        title: `${topic.title} (Salinan)`.slice(0, 200),
        summary: topic.summary,
        order: nextOrder,
        status: 'draft',
        content: topic.content,
        style: topic.style || DEFAULT_TOPIC_STYLE,
        youtubeUrls: topic.youtubeUrls || [],
        externalLinks: topic.externalLinks || [],
        attachments: topic.attachments || [],
        referenceMaterials: topic.referenceMaterials || [],
        updatedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNotice('Topik berjaya digandakan sebagai draf.');
      loadTopicIntoEditor({
        ...topic,
        id: created.id,
        title: `${topic.title} (Salinan)`,
        status: 'draft',
        order: nextOrder,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'topics/duplicate');
    }
  };

  const handleReorderTopic = async (index: number, direction: -1 | 1) => {
    if (!user) return;
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= moduleTopics.length) return;
    const a = moduleTopics[index];
    const b = moduleTopics[swapIndex];
    const batch = writeBatch(db);
    batch.update(doc(db, 'topics', a.id), {
      order: b.order,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'topics', b.id), {
      order: a.order,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'topics/reorder');
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'topics', id));
      setConfirmDeleteId(null);
      if (editingTopicId === id) resetEditor();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `topics/${id}`);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      {/* Left Sidebar: Module Selector, Search & Topics List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Modul Utama
            </label>
            <select
              value={selectedModuleId}
              onChange={(e) => {
                setSelectedModuleId(e.target.value);
                setSelectedSubModuleId('');
                resetEditor();
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:border-[#4C1D95]"
            >
              {learningModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {String(m.navOrder).padStart(2, '0')}. {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari topik dalam modul ini..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#4C1D95]"
            />
          </div>

          <button
            type="button"
            onClick={resetEditor}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#4C1D95] text-white text-xs font-semibold hover:bg-[#3B0764] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Topik Baharu dalam Modul Ini</span>
          </button>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-[#F8F9FC] border-b border-slate-200 text-xs font-semibold text-[#0F172A] tabular-nums">
            Senarai Topik ({moduleTopics.length})
          </div>
          {moduleTopics.length === 0 ? (
            <div className="p-5 text-xs text-slate-500 text-center">
              Tiada topik sepadan dalam modul ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {moduleTopics.map((topic, idx) => {
                const subName = topic.subModuleId
                  ? submodules.find((s) => s.id === topic.subModuleId)?.title
                  : '';
                return (
                  <div
                    key={topic.id}
                    className={`p-3.5 flex items-center justify-between gap-2 ${
                      editingTopicId === topic.id ? 'bg-[#4C1D95]/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => loadTopicIntoEditor(topic)}
                      className="text-left min-w-0 flex-1"
                    >
                      <div className="text-[11px] font-mono text-slate-500 tabular-nums truncate">
                        #{idx + 1} ·{' '}
                        <span
                          className={
                            topic.status === 'published'
                              ? 'text-emerald-700 font-semibold'
                              : 'text-amber-700 font-semibold'
                          }
                        >
                          {topic.status === 'published' ? 'Diterbitkan' : 'Draf'}
                        </span>
                        {subName ? ` · ${subName}` : ''}
                      </div>
                      <div className="text-xs font-semibold text-[#0F172A] truncate">
                        {topic.title}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReorderTopic(idx, -1)}
                        disabled={idx === 0 || Boolean(searchQuery)}
                        className="p-1.5 rounded border border-slate-200 text-slate-500 disabled:opacity-30"
                        aria-label="Naikkan topik"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorderTopic(idx, 1)}
                        disabled={idx === moduleTopics.length - 1 || Boolean(searchQuery)}
                        className="p-1.5 rounded border border-slate-200 text-slate-500 disabled:opacity-30"
                        aria-label="Turunkan topik"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateTopic(topic)}
                        className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-[#4C1D95]"
                        title="Gandakan topik"
                        aria-label="Gandakan topik"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => loadTopicIntoEditor(topic)}
                        className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-[#4C1D95]"
                        aria-label="Sunting topik"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      {confirmDeleteId === topic.id ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteTopic(topic.id)}
                          className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold"
                        >
                          Sah
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(topic.id)}
                          className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-600"
                          aria-label="Padam topik"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Main Area: Full CMS Editor + Preview + 5 Lifecycle Buttons */}
      <div className="lg:col-span-8 rounded-xl bg-white border border-slate-200 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 mb-0.5">
              {editingTopicId
                ? `Sedang Menyunting · Status semasa: ${
                    editingStatus === 'published' ? 'Diterbitkan' : 'Draf'
                  }`
                : 'Topik Baharu (Belum Disimpan)'}
            </div>
            <h2 className="text-lg font-bold text-[#0F172A]">
              {editingTopicId ? title || 'Sunting Topik' : 'Cipta Topik Baharu'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setPreviewMode((p) => !p)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
              previewMode
                ? 'bg-[#0A1128] text-[#F5E6B8] border-[#0A1128]'
                : 'bg-white text-[#0F172A] border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewMode ? 'Tutup Pratonton' : 'Pratonton'}</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}
        {notice && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            {notice}
          </div>
        )}

        {previewMode ? (
          /* LIVE STUDENT PREVIEW */
          <div className="rounded-xl border border-slate-200 bg-[#F8F9FC] p-6 space-y-6">
            <div className="text-xs font-semibold text-[#4C1D95]">
              Pratonton Paparan Pelajar
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#0F172A]">{title || '(Tiada Tajuk)'}</h3>
              {summary && (
                <p className="text-sm text-slate-600 text-justify mt-2">{summary}</p>
              )}
            </div>

            <RichContentRenderer content={content} style={style} />

            {(youtubeUrls.length > 0 ||
              externalLinks.some((l) => extractGoogleDrivePreviewUrl(l.url))) && (
              <div className="grid gap-4 pt-3 border-t border-slate-200">
                {youtubeUrls.map((u, i) => {
                  const id = extractYoutubeId(u);
                  if (!id) return null;
                  return (
                    <div key={i} className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${id}`}
                        title={`Pratonton Video ${i + 1}`}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  );
                })}
                {externalLinks.map((l, i) => {
                  const driveEmbed = extractGoogleDrivePreviewUrl(l.url);
                  if (!driveEmbed) return null;
                  return (
                    <div
                      key={`drive-prev-${i}`}
                      className="aspect-video rounded-lg overflow-hidden bg-black"
                    >
                      <iframe
                        src={driveEmbed}
                        title={l.label || `Pratonton Drive ${i + 1}`}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {attachments.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-200">
                <div className="text-xs font-semibold text-slate-600">
                  Lampiran Media &amp; Dokumen ({attachments.length})
                </div>
                {attachments.map((att, i) => (
                  <div key={i} className="text-xs text-[#0F172A] flex items-center gap-2">
                    {att.type === 'image' ? (
                      <ImageIcon className="w-3.5 h-3.5 text-[#4C1D95]" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-[#9A7414]" />
                    )}
                    <span>{att.name}</span>
                  </div>
                ))}
              </div>
            )}

            {externalLinks.length > 0 && (
              <div className="space-y-1.5 pt-3 border-t border-slate-200">
                <div className="text-xs font-semibold text-slate-600">Pautan Luar</div>
                {externalLinks.map((l, i) => (
                  <div key={i} className="text-xs text-[#4C1D95] underline">
                    {l.label} ({l.url})
                  </div>
                ))}
              </div>
            )}

            {referenceMaterials.length > 0 && (
              <div className="space-y-1.5 pt-3 border-t border-slate-200">
                <div className="text-xs font-semibold text-slate-600">Bahan Rujukan</div>
                {referenceMaterials.map((r, i) => (
                  <div key={i} className="text-xs text-slate-700">
                    <strong>{r.title}</strong>
                    {r.source ? ` — ${r.source}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* FULL EDITOR WORKSPACE */
          <div className="space-y-5">
            <div className="grid sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tajuk Topik
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Masukkan tajuk topik..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4C1D95]"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Submodul (Pilihan)
                </label>
                <select
                  value={selectedSubModuleId}
                  onChange={(e) => setSelectedSubModuleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#4C1D95]"
                >
                  <option value="">Tiada Submodul (Terus di bawah Modul)</option>
                  {moduleSubmodules.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ringkasan / Objektif Pembelajaran
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                maxLength={600}
                placeholder="Ringkasan pendek kandungan topik..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4C1D95]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Editor Kandungan Pembelajaran Lengkap
              </label>
              <RichTextEditor
                topicKey={editorSessionKey}
                value={content}
                style={style}
                onChangeContent={setContent}
                onChangeStyle={setStyle}
              />
            </div>

            {/* Media Uploads (Images & PDF/Documents -> Firebase Storage) */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#0F172A]">
                  Gambar &amp; Bahan Pembelajaran (Firebase Storage)
                </span>
                {uploadingFile && (
                  <span className="text-xs font-mono text-[#4C1D95] tabular-nums">
                    Memuat naik {uploadPct}%
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 cursor-pointer">
                  <ImageIcon className="w-3.5 h-3.5 text-[#4C1D95]" />
                  <span>Muat Naik Gambar</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                </label>
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#9A7414]" />
                  <span>Muat Naik PDF / Dokumen Lain</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                    onChange={(e) => handleFileUpload(e, 'document')}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2 pt-2">
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8F9FC] border border-slate-200 text-xs"
                    >
                      <span className="truncate font-medium text-[#0F172A]">
                        {att.type === 'image' ? '[Gambar]' : '[Dokumen]'} {att.name} (
                        {formatBytes(att.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-red-600 hover:underline shrink-0"
                      >
                        Buang
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* YouTube Embeds */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-[#4C1D95]" />
                <span>Video YouTube</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#4C1D95]"
                />
                <button
                  type="button"
                  onClick={handleAddYoutube}
                  className="px-3.5 py-2 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] whitespace-nowrap"
                >
                  Tambah Video
                </button>
              </div>
              {youtubeUrls.length > 0 && (
                <div className="space-y-1.5">
                  {youtubeUrls.map((u, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#F8F9FC] border border-slate-200 text-xs"
                    >
                      <span className="truncate font-mono text-slate-700">{u}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setYoutubeUrls((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-red-600 hover:underline shrink-0"
                      >
                        Buang
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* External Links */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-[#4C1D95]" />
                <span>Pautan Laman Web Luar</span>
              </div>
              <div className="grid sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={linkLabelInput}
                  onChange={(e) => setLinkLabelInput(e.target.value)}
                  placeholder="Label pautan"
                  className="sm:col-span-5 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#4C1D95]"
                />
                <input
                  type="url"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="sm:col-span-5 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#4C1D95]"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] whitespace-nowrap"
                >
                  Tambah
                </button>
              </div>
              {externalLinks.length > 0 && (
                <div className="space-y-1.5">
                  {externalLinks.map((lnk, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#F8F9FC] border border-slate-200 text-xs"
                    >
                      <span className="truncate">
                        <strong className="text-[#0F172A]">{lnk.label}</strong> —{' '}
                        <span className="font-mono text-slate-500">{lnk.url}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExternalLinks((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-red-600 hover:underline shrink-0"
                      >
                        Buang
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bahan Rujukan (Reference Materials) */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                <BookMarked className="w-4 h-4 text-[#9A7414]" />
                <span>Bahan Rujukan</span>
              </div>
              <div className="grid sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={refTitleInput}
                  onChange={(e) => setRefTitleInput(e.target.value)}
                  placeholder="Tajuk buku / artikel / rujukan"
                  className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={refSourceInput}
                  onChange={(e) => setRefSourceInput(e.target.value)}
                  placeholder="Pengarang / Penerbit (pilihan)"
                  className="sm:col-span-3 px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  type="url"
                  value={refUrlInput}
                  onChange={(e) => setRefUrlInput(e.target.value)}
                  placeholder="URL rujukan (pilihan)"
                  className="sm:col-span-3 px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddReference}
                  className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] whitespace-nowrap"
                >
                  Tambah
                </button>
              </div>
              {referenceMaterials.length > 0 && (
                <div className="space-y-1.5">
                  {referenceMaterials.map((refItem, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#F8F9FC] border border-slate-200 text-xs"
                    >
                      <span className="truncate">
                        <strong className="text-[#0F172A]">{refItem.title}</strong>
                        {refItem.source ? ` — ${refItem.source}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setReferenceMaterials((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-red-600 hover:underline shrink-0"
                      >
                        Buang
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5 Required Save / Preview / Publish / Unpublish / Update Actions */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode((p) => !p)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 whitespace-nowrap"
            >
              {previewMode ? 'Kembali ke Editor' : 'Pratonton'}
            </button>

            {editingTopicId && editingStatus === 'published' && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  handleSaveTopic('draft', 'Kandungan berjaya dinyahterbitkan (status Draf).')
                }
                className="px-4 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60 whitespace-nowrap"
              >
                Nyahterbitkan
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveTopic('draft', 'Kandungan disimpan sebagai Draf.')}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
            >
              Simpan Draf
            </button>

            {editingTopicId && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  handleSaveTopic(editingStatus, 'Kandungan berjaya dikemaskini.')
                }
                className="px-4 py-2.5 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-xs font-semibold hover:bg-[#1E293B] disabled:opacity-60 whitespace-nowrap"
              >
                Kemaskini Kandungan
              </button>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                handleSaveTopic('published', 'Kandungan berjaya diterbitkan kepada pelajar.')
              }
              className="px-5 py-2.5 rounded-lg bg-[#4C1D95] text-white text-xs font-semibold hover:bg-[#3B0764] disabled:opacity-60 whitespace-nowrap"
            >
              {saving ? 'Memproses...' : 'Terbitkan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
