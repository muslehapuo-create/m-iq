import { useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Copy, Edit3, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  DEFAULT_TOPIC_STYLE,
  type LearningModule,
  type LearningResource,
  type SubModule,
  type TopicContent,
} from '../../types/miq';

interface AdminCatalogPanelProps {
  modules: LearningModule[];
  submodules: SubModule[];
  topics: TopicContent[];
  resources: LearningResource[];
  onEditTopic: (moduleId: string, topicId: string) => void;
}

export function AdminCatalogPanel({
  modules,
  submodules,
  topics,
  resources,
  onEditTopic,
}: AdminCatalogPanelProps) {
  const { user } = useAuth();
  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const filteredTopics = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return topics.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (moduleFilter !== 'all' && t.moduleId !== moduleFilter) return false;
      if (!q) return true;
      const modTitle = modules.find((m) => m.id === t.moduleId)?.title || '';
      const subTitle = t.subModuleId
        ? submodules.find((s) => s.id === t.subModuleId)?.title || ''
        : '';
      return (
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        modTitle.toLowerCase().includes(q) ||
        subTitle.toLowerCase().includes(q)
      );
    });
  }, [topics, modules, submodules, queryText, statusFilter, moduleFilter]);

  const filteredResources = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return resources.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (moduleFilter !== 'all' && r.moduleId !== moduleFilter && r.moduleId !== 'all') {
        return false;
      }
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.fileName.toLowerCase().includes(q)
      );
    });
  }, [resources, queryText, statusFilter, moduleFilter]);

  const handleToggleTopicStatus = async (topic: TopicContent) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'topics', topic.id), {
        status: topic.status === 'published' ? 'draft' : 'published',
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `topics/${topic.id}`);
    }
  };

  const handleDuplicateTopic = async (topic: TopicContent) => {
    if (!user) return;
    const nextOrder =
      topics
        .filter((t) => t.moduleId === topic.moduleId)
        .reduce((max, t) => Math.max(max, t.order), 0) + 1;
    try {
      await addDoc(collection(db, 'topics'), {
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
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'topics/duplicate');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 grid md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Cari tajuk topik, kandungan, submodul atau bahan..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4C1D95]"
          />
        </div>

        <div className="md:col-span-4">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          >
            <option value="all">Semua Modul Utama</option>
            {modules
              .filter((m) => m.sectionType === 'learning')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {String(m.navOrder).padStart(2, '0')}. {m.title}
                </option>
              ))}
          </select>
        </div>

        <div className="md:col-span-3 grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#F8F9FC] border border-slate-200">
          {(
            [
              ['all', 'Semua'],
              ['published', 'Terbit'],
              ['draft', 'Draf'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className={`py-1.5 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === val
                  ? 'bg-[#4C1D95] text-white'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Matching Topics Table */}
      <section className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A] tabular-nums">
            Katalog Topik &amp; Kandungan ({filteredTopics.length})
          </h2>
        </div>

        {filteredTopics.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tiada topik sepadan dengan carian semasa.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTopics.map((topic) => {
              const modName =
                modules.find((m) => m.id === topic.moduleId)?.title || topic.moduleId;
              const subName = topic.subModuleId
                ? submodules.find((s) => s.id === topic.subModuleId)?.title
                : '';
              const delKey = `topic-${topic.id}`;

              return (
                <div
                  key={topic.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-[#4C1D95]">{modName}</span>
                      {subName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{subName}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          topic.status === 'published'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {topic.status === 'published' ? 'Diterbitkan' : 'Draf'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#0F172A] truncate">
                      {topic.title}
                    </div>
                    {topic.summary && (
                      <div className="text-xs text-slate-500 truncate">{topic.summary}</div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditTopic(topic.moduleId, topic.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-xs font-semibold"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sunting</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleTopicStatus(topic)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#0F172A]"
                    >
                      {topic.status === 'published' ? 'Nyahterbit' : 'Terbitkan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateTopic(topic)}
                      title="Gandakan topik"
                      aria-label="Gandakan topik"
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#4C1D95]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {confirmDeleteKey === delKey ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, 'topics', topic.id));
                            setConfirmDeleteKey(null);
                          } catch (err) {
                            handleFirestoreError(err, OperationType.DELETE, `topics/${topic.id}`);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                      >
                        Sah Padam
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteKey(delKey)}
                        aria-label="Padam topik"
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Matching Resources */}
      <section className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200">
          <h2 className="text-base font-bold text-[#0F172A] tabular-nums">
            Sumber Pembelajaran Sepadan ({filteredResources.length})
          </h2>
        </div>
        {filteredResources.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            Tiada sumber pembelajaran sepadan.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredResources.map((res) => (
              <div
                key={res.id}
                className="px-6 py-3.5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">
                    {res.resourceType} ·{' '}
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
                  <div className="text-sm font-semibold text-[#0F172A] truncate">
                    {res.title}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'resources', res.id), {
                        status: res.status === 'published' ? 'draft' : 'published',
                        updatedAt: serverTimestamp(),
                      });
                    } catch (err) {
                      handleFirestoreError(err, OperationType.UPDATE, `resources/${res.id}`);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#0F172A] shrink-0"
                >
                  {res.status === 'published' ? 'Nyahterbit' : 'Terbitkan'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
