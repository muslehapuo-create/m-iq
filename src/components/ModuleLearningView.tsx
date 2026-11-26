import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  CheckCircle2,
  Circle,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Youtube,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RichContentRenderer } from '../lib/sanitizeHtml';
import { MODULE_COVER_IMAGE } from '../lib/seedData';
import {
  DEFAULT_TOPIC_STYLE,
  extractGoogleDrivePreviewUrl,
  extractYoutubeId,
  formatBytes,
  isSafeHttpUrl,
  type LearningModule,
  type LearningResource,
  type StudentProgress,
  type SubModule,
  type TopicContent,
} from '../types/miq';

interface ModuleLearningViewProps {
  module: LearningModule;
  submodules: SubModule[];
  topics: TopicContent[];
  resources: LearningResource[];
  progress: StudentProgress | null;
  onToggleTopicComplete: (topicId: string) => Promise<void>;
  onEditInAdmin: (moduleId: string, topicId?: string) => void;
}

export function ModuleLearningView({
  module,
  submodules,
  topics,
  resources,
  progress,
  onToggleTopicComplete,
  onEditInAdmin,
}: ModuleLearningViewProps) {
  const { isAdmin } = useAuth();
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [toggling, setToggling] = useState(false);
  const articleTopRef = useRef<HTMLElement | null>(null);

  const visibleSubmodules = useMemo(
    () =>
      (isAdmin ? submodules : submodules.filter((s) => s.status === 'published'))
        .filter((s) => s.moduleId === module.id)
        .sort((a, b) => a.order - b.order),
    [submodules, isAdmin, module.id]
  );

  const visibleTopics = useMemo(
    () =>
      (isAdmin ? topics : topics.filter((t) => t.status === 'published'))
        .filter((t) => t.moduleId === module.id)
        .sort((a, b) => a.order - b.order),
    [topics, isAdmin, module.id]
  );

  const moduleResources = (
    isAdmin ? resources : resources.filter((r) => r.status === 'published')
  ).filter((r) => r.moduleId === module.id || r.moduleId === 'all');

  const groupedBySubmodule = useMemo(() => {
    const groups: Array<{ sub: SubModule | null; items: TopicContent[] }> = [];
    for (const sub of visibleSubmodules) {
      const items = visibleTopics.filter((t) => t.subModuleId === sub.id);
      if (items.length > 0 || isAdmin) {
        groups.push({ sub, items });
      }
    }
    const assignedSubIds = new Set(visibleSubmodules.map((s) => s.id));
    const generalItems = visibleTopics.filter(
      (t) => !t.subModuleId || !assignedSubIds.has(t.subModuleId)
    );
    if (generalItems.length > 0) {
      groups.unshift({ sub: null, items: generalItems });
    }
    return groups;
  }, [visibleSubmodules, visibleTopics, isAdmin]);

  const orderedTopics = useMemo(
    () => groupedBySubmodule.flatMap((g) => g.items),
    [groupedBySubmodule]
  );

  useEffect(() => {
    if (orderedTopics.length > 0) {
      if (!orderedTopics.some((t) => t.id === selectedTopicId)) {
        setSelectedTopicId(orderedTopics[0].id);
      }
    } else {
      setSelectedTopicId('');
    }
  }, [module.id, orderedTopics, selectedTopicId]);

  const activeTopicIndex = orderedTopics.findIndex((t) => t.id === selectedTopicId);
  const resolvedIndex = activeTopicIndex >= 0 ? activeTopicIndex : 0;
  const activeTopic = orderedTopics[resolvedIndex] || null;
  const previousTopic = resolvedIndex > 0 ? orderedTopics[resolvedIndex - 1] : null;
  const nextTopic =
    resolvedIndex >= 0 && resolvedIndex < orderedTopics.length - 1
      ? orderedTopics[resolvedIndex + 1]
      : null;

  const isCompleted = activeTopic
    ? (progress?.completedTopicIds ?? []).includes(activeTopic.id)
    : false;

  const activeSubmodule = activeTopic?.subModuleId
    ? visibleSubmodules.find((s) => s.id === activeTopic.subModuleId) || null
    : null;

  const completedInModuleCount = orderedTopics.filter((t) =>
    (progress?.completedTopicIds ?? []).includes(t.id)
  ).length;
  const moduleProgressPct =
    orderedTopics.length > 0
      ? Math.round((completedInModuleCount / orderedTopics.length) * 100)
      : 0;

  const selectAndScrollTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    articleTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggle = async () => {
    if (!activeTopic || toggling) return;
    setToggling(true);
    try {
      await onToggleTopicComplete(activeTopic.id);
    } finally {
      setToggling(false);
    }
  };

  const coverUrl = isSafeHttpUrl(module.coverImageUrl)
    ? module.coverImageUrl
    : MODULE_COVER_IMAGE;

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <header className="rounded-xl overflow-hidden bg-white border border-slate-200 grid md:grid-cols-12 items-stretch">
        <div className="md:col-span-8 p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-mono font-semibold text-[#4C1D95] tabular-nums">
                Bahagian {String(module.navOrder).padStart(2, '0')}
              </span>
              {visibleSubmodules.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{visibleSubmodules.length} Submodul</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{visibleTopics.length} Topik</span>
              {module.status === 'draft' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 font-medium">Status: Draf</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight mb-2">
              {module.title}
            </h1>
            <p className="text-sm text-slate-600 text-justify leading-relaxed">
              {module.subtitle}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
            {orderedTopics.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#0F172A]">
                    Kemajuan Pembelajaran Modul
                  </span>
                  <span className="text-slate-600 font-mono tabular-nums">
                    {completedInModuleCount}/{orderedTopics.length} topik · {moduleProgressPct}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#4C1D95] transition-all duration-300"
                    style={{ width: `${moduleProgressPct}%` }}
                  />
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onEditInAdmin(module.id, activeTopic?.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-xs font-semibold hover:bg-[#1E293B] transition-colors whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sunting Modul &amp; Kandungan di CMS</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-4 min-h-[160px] bg-[#0A1128] relative">
          <img
            src={coverUrl}
            alt={module.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </header>

      {/* Topic Selector (Grouped by Submodule) & Main Content Grid */}
      {visibleTopics.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 p-8 text-center">
          <FolderOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-[#0F172A] mb-1">
            Tiada Topik Diterbitkan Lagi
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Ruang kandungan bagi modul ini sedia untuk diisi dan diterbitkan oleh pentadbir melalui Panel Pentadbir.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onEditInAdmin(module.id)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold hover:bg-[#3B0764] transition-colors whitespace-nowrap"
            >
              <Edit3 className="w-4 h-4" />
              <span>Tambah Topik Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Submodule & Topic List Navigation */}
          <aside className="lg:col-span-4 rounded-xl bg-white border border-slate-200 p-4 space-y-4">
            <div className="px-2 pb-2 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0F172A]">
                Struktur Submodul &amp; Topik
              </h2>
              <span className="text-xs text-slate-500 tabular-nums">
                {visibleTopics.filter((t) => progress?.completedTopicIds.includes(t.id)).length}/
                {visibleTopics.length}
              </span>
            </div>

            <div className="space-y-4">
              {groupedBySubmodule.map((grp, gIdx) => (
                <div key={grp.sub?.id || `general-${gIdx}`} className="space-y-1.5">
                  {grp.sub && (
                    <div className="px-2 pt-1 text-xs font-bold text-[#4C1D95]">
                      {grp.sub.title}
                      {grp.sub.status === 'draft' ? ' (Draf)' : ''}
                    </div>
                  )}
                  {grp.items.length === 0 ? (
                    <div className="px-2 text-xs text-slate-400 italic">
                      Tiada topik dalam submodul ini.
                    </div>
                  ) : (
                    grp.items.map((topic) => {
                      const done = (progress?.completedTopicIds ?? []).includes(topic.id);
                      const selected = activeTopic?.id === topic.id;
                      const globalIndex = orderedTopics.findIndex((t) => t.id === topic.id) + 1;
                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => selectAndScrollTopic(topic.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-3 ${
                            selected
                              ? 'bg-[#4C1D95]/5 border-[#4C1D95] text-[#0F172A]'
                              : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-mono text-slate-500 tabular-nums">
                              Topik {String(globalIndex).padStart(2, '0')}
                              {topic.status === 'draft' ? ' · Draf' : ''}
                            </div>
                            <div className="text-sm font-semibold leading-snug mt-0.5">
                              {topic.title}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* Active Topic Reader */}
          {activeTopic && (
            <article
              ref={articleTopRef}
              className="lg:col-span-8 rounded-xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 scroll-mt-20"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 mb-1.5">
                    {module.title}
                    {activeSubmodule ? ` · ${activeSubmodule.title}` : ''}
                    {activeTopic.status === 'draft' ? ' · Mod Pratonton Draf' : ''}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
                    {activeTopic.title}
                  </h2>
                  {activeTopic.summary && (
                    <p className="text-sm text-slate-600 text-justify mt-2 leading-relaxed">
                      {activeTopic.summary}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleToggle}
                  disabled={toggling}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                      : 'bg-white border-slate-200 text-[#0F172A] hover:border-[#4C1D95]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400" />
                  )}
                  <span>{isCompleted ? 'Selesai Dipelajari' : 'Tandakan Selesai'}</span>
                </button>
              </div>

              {/* Formatted Rich Content (XSS-safe React AST Renderer) */}
              <RichContentRenderer
                content={activeTopic.content}
                style={{
                  ...DEFAULT_TOPIC_STYLE,
                  ...(activeTopic.style || {}),
                }}
              />

              {/* Embedded YouTube & Drive Multimedia Videos */}
              {(activeTopic.youtubeUrls.length > 0 ||
                activeTopic.externalLinks.some((l) => extractGoogleDrivePreviewUrl(l.url))) && (
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-[#4C1D95]" />
                    <span>Video &amp; Multimedia Pembelajaran</span>
                  </h3>
                  <div className="grid gap-4">
                    {activeTopic.youtubeUrls.map((ytUrl, i) => {
                      const ytId = extractYoutubeId(ytUrl);
                      if (!ytId) return null;
                      return (
                        <div
                          key={`${ytId}-${i}`}
                          className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-950"
                        >
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                            title={`Video ${activeTopic.title} ${i + 1}`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      );
                    })}
                    {activeTopic.externalLinks.map((lnk, i) => {
                      const driveEmbed = extractGoogleDrivePreviewUrl(lnk.url);
                      if (!driveEmbed) return null;
                      return (
                        <div
                          key={`drive-${i}`}
                          className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-950"
                        >
                          <iframe
                            src={driveEmbed}
                            title={lnk.label || `Video ${activeTopic.title}`}
                            className="w-full h-full"
                            allow="autoplay; fullscreen"
                            allowFullScreen
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Topic Attachments (Images & Documents) */}
              {activeTopic.attachments.length > 0 && (
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#9A7414]" />
                    <span>Infografik, Gambar &amp; Dokumen Pembelajaran</span>
                  </h3>

                  {activeTopic.attachments.some(
                    (a) => a.type === 'image' && isSafeHttpUrl(a.url)
                  ) && (
                    <div className="grid gap-4">
                      {activeTopic.attachments
                        .filter((a) => a.type === 'image' && isSafeHttpUrl(a.url))
                        .map((img, i) => (
                          <figure
                            key={i}
                            className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                          >
                            <img
                              src={img.url}
                              alt={img.name}
                              referrerPolicy="no-referrer"
                              className="w-full max-h-[760px] object-contain bg-white"
                            />
                            <figcaption className="px-3.5 py-2.5 text-xs text-slate-600 flex items-center justify-between gap-2 bg-white border-t border-slate-100">
                              <span className="truncate flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {img.name}
                              </span>
                              <a
                                href={img.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C1D95] hover:underline shrink-0"
                              >
                                <span>Buka Saiz Penuh</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </figcaption>
                          </figure>
                        ))}
                    </div>
                  )}

                  {activeTopic.attachments.some(
                    (a) => a.type === 'document' && isSafeHttpUrl(a.url)
                  ) && (
                    <div className="space-y-2">
                      {activeTopic.attachments
                        .filter((a) => a.type === 'document' && isSafeHttpUrl(a.url))
                        .map((docItem, i) => (
                          <a
                            key={i}
                            href={docItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-slate-200 hover:border-[#4C1D95]/50 bg-[#F8F9FC] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText className="w-4 h-4 text-[#4C1D95] shrink-0" />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[#0F172A] truncate">
                                  {docItem.name}
                                </div>
                                <div className="text-xs text-slate-500 tabular-nums">
                                  {formatBytes(docItem.size)}
                                </div>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4C1D95] shrink-0">
                              <Download className="w-3.5 h-3.5" />
                              Muat Turun
                            </span>
                          </a>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* External Links */}
              {activeTopic.externalLinks.length > 0 && (
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-[#4C1D95]" />
                    <span>Pautan Luar</span>
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {activeTopic.externalLinks.map((lnk, i) => {
                      if (!isSafeHttpUrl(lnk.url)) return null;
                      return (
                        <a
                          key={i}
                          href={lnk.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:border-[#4C1D95]/50 text-sm text-[#0F172A] transition-colors"
                        >
                          <span className="truncate font-medium">{lnk.label || lnk.url}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reference Materials */}
              {activeTopic.referenceMaterials && activeTopic.referenceMaterials.length > 0 && (
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-[#9A7414]" />
                    <span>Bahan Rujukan</span>
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
                    {activeTopic.referenceMaterials.map((refItem, i) => (
                      <li key={i} className="text-justify leading-relaxed">
                        <span className="font-semibold text-[#0F172A]">{refItem.title}</span>
                        {refItem.source ? <span> — {refItem.source}</span> : null}
                        {refItem.url && isSafeHttpUrl(refItem.url) && (
                          <a
                            href={refItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-[#4C1D95] underline"
                          >
                            <span>Pautan</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Previous & Next Topic Navigation */}
              {orderedTopics.length > 1 && (
                <nav
                  aria-label="Navigasi topik sebelum dan seterusnya"
                  className="pt-6 border-t border-slate-200 grid sm:grid-cols-2 gap-3"
                >
                  <button
                    type="button"
                    disabled={!previousTopic}
                    onClick={() => previousTopic && selectAndScrollTopic(previousTopic.id)}
                    className="text-left p-4 rounded-lg border border-slate-200 bg-white hover:border-[#4C1D95]/50 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-3"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#4C1D95] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-500">
                        Topik Sebelum
                      </div>
                      <div className="text-xs font-semibold text-[#0F172A] truncate">
                        {previousTopic ? previousTopic.title : 'Tiada topik terdahulu'}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!nextTopic}
                    onClick={() => nextTopic && selectAndScrollTopic(nextTopic.id)}
                    className="text-right p-4 rounded-lg border border-slate-200 bg-white hover:border-[#4C1D95]/50 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-end gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-500">
                        Topik Seterusnya
                      </div>
                      <div className="text-xs font-semibold text-[#0F172A] truncate">
                        {nextTopic ? nextTopic.title : 'Topik terakhir modul'}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#4C1D95] shrink-0" />
                  </button>
                </nav>
              )}
            </article>
          )}
        </div>
      )}

      {/* Shared Module Learning Resources */}
      {moduleResources.length > 0 && (
        <section className="rounded-xl bg-white border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-[#0F172A] mb-1">
            Sumber Pembelajaran Berkaitan
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Bahan rujukan tambahan yang disediakan oleh pentadbir untuk modul ini.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {moduleResources.map((res) => {
              if (!isSafeHttpUrl(res.url)) return null;
              return (
                <a
                  key={res.id}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-lg border border-slate-200 hover:border-[#4C1D95]/50 transition-colors flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="text-xs text-[#4C1D95] font-medium mb-1">
                      {res.resourceType.toUpperCase()}
                      {res.status === 'draft' ? ' · Draf' : ''}
                    </div>
                    <div className="text-sm font-semibold text-[#0F172A] mb-1">
                      {res.title}
                    </div>
                    {res.description && (
                      <p className="text-xs text-slate-600 text-justify leading-relaxed">
                        {res.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-[#0F172A]">
                    <span className="truncate">{res.fileName || 'Buka Sumber'}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#4C1D95] shrink-0" />
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
