import { useEffect, useState } from 'react';
import {
  CalendarCheck2,
  CheckSquare,
  FileText,
  FolderOpen,
  Layers,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { syncOfficialMiqContent } from '../lib/seedData';
import type {
  AssessmentConfig,
  ChecklistItem,
  ITemuRecord,
  LearningModule,
  LearningResource,
  LecturerDirectoryEntry,
  RubricCriterion,
  SelfAssessmentItem,
  StudentActivity,
  StudentFeedback,
  StudentProgress,
  StudentReflection,
  SubModule,
  TopicContent,
} from '../types/miq';
import { AdminAppointmentsPanel } from './admin/AdminAppointmentsPanel';
import { AdminCatalogPanel } from './admin/AdminCatalogPanel';
import { AdminCommunityPanel } from './admin/AdminCommunityPanel';
import {
  AdminInstrumentsPanel,
  type InstrumentAdminSubTab,
} from './admin/AdminInstrumentsPanel';
import { AdminModulesPanel } from './admin/AdminModulesPanel';
import { AdminResourcesPanel } from './admin/AdminResourcesPanel';
import { AdminTopicsPanel } from './admin/AdminTopicsPanel';

export type AdminTabKey =
  | 'modules'
  | 'topics'
  | 'catalog'
  | 'resources'
  | 'instruments'
  | 'appointments'
  | 'community';

interface AdminDashboardProps {
  modules: LearningModule[];
  submodules: SubModule[];
  topics: TopicContent[];
  resources: LearningResource[];
  checklistItems: ChecklistItem[];
  selfAssessmentItems: SelfAssessmentItem[];
  assessmentConfig: AssessmentConfig;
  rubricCriteria: RubricCriterion[];
  feedbackList: StudentFeedback[];
  reflections: StudentReflection[];
  allStudentProgress: StudentProgress[];
  studentActivities: StudentActivity[];
  itemuRecords: ITemuRecord[];
  lecturers: LecturerDirectoryEntry[];
  initialTab?: AdminTabKey;
  initialModuleId?: string;
  initialSubModuleId?: string;
  initialTopicId?: string;
  initialInstrumentSubTab?: InstrumentAdminSubTab;
}

export function AdminDashboard({
  modules,
  submodules,
  topics,
  resources,
  checklistItems,
  selfAssessmentItems,
  assessmentConfig,
  rubricCriteria,
  feedbackList,
  reflections,
  allStudentProgress,
  studentActivities,
  itemuRecords,
  lecturers,
  initialTab = 'modules',
  initialModuleId,
  initialSubModuleId,
  initialTopicId,
  initialInstrumentSubTab,
}: AdminDashboardProps) {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTabKey>(initialTab);
  const [topicModuleId, setTopicModuleId] = useState<string | undefined>(initialModuleId);
  const [topicSubModuleId, setTopicSubModuleId] = useState<string | undefined>(
    initialSubModuleId
  );
  const [topicEditId, setTopicEditId] = useState<string | undefined>(initialTopicId);
  const [syncingOfficial, setSyncingOfficial] = useState(false);
  const [confirmSync, setConfirmSync] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setTopicModuleId(initialModuleId);
    setTopicSubModuleId(initialSubModuleId);
    setTopicEditId(initialTopicId);
  }, [initialModuleId, initialSubModuleId, initialTopicId]);

  if (!isAdmin) {
    return (
      <div className="rounded-xl bg-white border border-slate-200 p-8 text-center">
        <Shield className="w-8 h-8 text-red-600 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-[#0F172A] mb-1">Akses Terhad</h1>
        <p className="text-sm text-slate-600">
          Panel Pentadbir hanya boleh diakses oleh akaun pentadbir yang disahkan.
        </p>
      </div>
    );
  }

  const handleSyncOfficial = async () => {
    if (!user || syncingOfficial) return;
    setSyncingOfficial(true);
    setSyncMessage(null);
    try {
      const res = await syncOfficialMiqContent(user.uid, { overwriteExisting: true });
      setConfirmSync(false);
      setSyncMessage(
        `Penyegerakan kandungan rasmi Google Sites M-IQ selesai (${res.createdTopics} topik baharu, ${res.updatedTopics} topik dikemas kini).`
      );
    } catch (err) {
      setSyncMessage(
        err instanceof Error ? `Ralat penyegerakan: ${err.message}` : 'Ralat penyegerakan kandungan.'
      );
    } finally {
      setSyncingOfficial(false);
    }
  };

  const unreadAppointmentsCount = itemuRecords.filter((r) => r.adminUnread).length;

  const tabs: Array<{
    key: AdminTabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { key: 'modules', label: 'Modul & Submodul', icon: Layers },
    { key: 'topics', label: 'Editor Topik & Kandungan', icon: FileText },
    { key: 'catalog', label: 'Carian & Urus Kandungan', icon: Search },
    { key: 'resources', label: 'Bahan & Sumber Pelajar', icon: FolderOpen },
    { key: 'instruments', label: 'Instrumen & Rubrik', icon: CheckSquare },
    {
      key: 'appointments',
      label: 'i-TEMU · Maklum Balas',
      icon: CalendarCheck2,
      count: unreadAppointmentsCount,
    },
    { key: 'community', label: 'Maklum Balas & Akses', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-[#0A1128] text-white p-6 sm:p-8 border border-[#C59B27]/30 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#F5E6B8] mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Sistem Pengurusan Kandungan (CMS) M-IQ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Panel Pengurusan Pentadbir
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Urus modul utama, submodul, topik, teks berformat, gambar, dokumen, video YouTube, pautan luar dan bahan rujukan tanpa menyunting kod.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4 shrink-0 text-right">
            <div>
              <div className="text-xl font-bold text-white tabular-nums">{modules.length}</div>
              <div className="text-[11px] text-slate-400">Modul</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white tabular-nums">
                {submodules.length}
              </div>
              <div className="text-[11px] text-slate-400">Submodul</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white tabular-nums">{topics.length}</div>
              <div className="text-[11px] text-slate-400">Topik</div>
            </div>
            <div>
              <div className="text-xl font-bold text-[#F5E6B8] tabular-nums">
                {topics.filter((t) => t.status === 'draft').length}
              </div>
              <div className="text-[11px] text-slate-400">Draf</div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-300">
            Kandungan asas dipindahkan daripada portal rasmi Google Sites M-IQ (PUO). Gunakan butang kanan untuk menyegerakkan atau memulihkan kandungan rasmi ke Firestore.
          </div>

          {confirmSync ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={syncingOfficial}
                onClick={handleSyncOfficial}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C59B27] text-[#0A1128] text-xs font-bold hover:bg-[#D8AF3D] disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingOfficial ? 'animate-spin' : ''}`} />
                <span>{syncingOfficial ? 'Menyegerakkan...' : 'Sahkan Penyegerakan'}</span>
              </button>
              <button
                type="button"
                disabled={syncingOfficial}
                onClick={() => setConfirmSync(false)}
                className="px-3 py-2 rounded-lg border border-white/20 text-xs text-white hover:bg-white/10"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmSync(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#C59B27]/50 bg-white/5 text-[#F5E6B8] text-xs font-semibold hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segerakkan Kandungan Rasmi M-IQ</span>
            </button>
          )}
        </div>

        {syncMessage && (
          <div className="px-3.5 py-2.5 rounded-lg bg-white/10 border border-white/15 text-xs text-[#F5E6B8]">
            {syncMessage}
          </div>
        )}
      </header>

      {/* Admin Tab Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#4C1D95] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-[#4C1D95]/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    active ? 'text-[#F5E6B8]' : 'text-[#9A7414]'
                  }`}
                >
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'modules' && (
        <AdminModulesPanel
          modules={modules}
          submodules={submodules}
          onSelectModuleForTopics={(modId, subId) => {
            setTopicModuleId(modId);
            setTopicSubModuleId(subId);
            setTopicEditId(undefined);
            setActiveTab('topics');
          }}
        />
      )}

      {activeTab === 'topics' && (
        <AdminTopicsPanel
          modules={modules}
          submodules={submodules}
          topics={topics}
          initialModuleId={topicModuleId}
          initialSubModuleId={topicSubModuleId}
          initialTopicId={topicEditId}
        />
      )}

      {activeTab === 'catalog' && (
        <AdminCatalogPanel
          modules={modules}
          submodules={submodules}
          topics={topics}
          resources={resources}
          onEditTopic={(modId, topId) => {
            setTopicModuleId(modId);
            setTopicEditId(topId);
            setActiveTab('topics');
          }}
        />
      )}

      {activeTab === 'resources' && (
        <AdminResourcesPanel modules={modules} resources={resources} />
      )}

      {activeTab === 'instruments' && (
        <AdminInstrumentsPanel
          checklistItems={checklistItems}
          selfAssessmentItems={selfAssessmentItems}
          assessmentConfig={assessmentConfig}
          rubricCriteria={rubricCriteria}
          initialSubTab={initialInstrumentSubTab}
        />
      )}

      {activeTab === 'appointments' && (
        <AdminAppointmentsPanel records={itemuRecords} lecturers={lecturers} />
      )}

      {activeTab === 'community' && (
        <AdminCommunityPanel
          feedbackList={feedbackList}
          reflections={reflections}
          allStudentProgress={allStudentProgress}
          studentActivities={studentActivities}
          topics={topics}
          checklistItems={checklistItems}
          rubricCriteria={rubricCriteria}
        />
      )}
    </div>
  );
}
