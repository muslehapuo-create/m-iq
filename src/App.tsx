import { useState } from 'react';
import { Menu, Shield } from 'lucide-react';
import { AdminDashboard, type AdminTabKey } from './components/AdminDashboard';
import type { InstrumentAdminSubTab } from './components/admin/AdminInstrumentsPanel';
import { AppointmentsView } from './components/AppointmentsView';
import { ChecklistView } from './components/ChecklistView';
import { DashboardView } from './components/DashboardView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeedbackView } from './components/FeedbackView';
import { ModuleLearningView } from './components/ModuleLearningView';
import { NavigationSidebar } from './components/NavigationSidebar';
import { ReflectionView } from './components/ReflectionView';
import { RubricView } from './components/RubricView';
import { SignInGateway } from './components/SignInGateway';
import { IRefleksiIcon } from './components/IRefleksiIcon';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useMiqData } from './hooks/useMiqData';

function MiqWorkspace() {
  const { user, isAdmin, authReady, accessDeniedEmail, signOutUser } = useAuth();
  const {
    modules,
    submodules,
    topics,
    resources,
    checklistItems,
    selfAssessmentItems,
    assessmentConfig,
    rubricCriteria,
    progress,
    allStudentProgress,
    reflections,
    studentActivities,
    feedbackList,
    lecturerDirectory,
    itemuRecords,
    loading,
    toggleTopicCompleted,
    toggleChecklistItem,
    submitSelfAssessment,
    setRubricScore,
    logStudentActivity,
  } = useMiqData();

  const [activeSlug, setActiveSlug] = useState<string>('dashboard');
  const [adminMode, setAdminMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<AdminTabKey>('modules');
  const [adminModuleId, setAdminModuleId] = useState<string | undefined>(undefined);
  const [adminTopicId, setAdminTopicId] = useState<string | undefined>(undefined);
  const [adminInstrumentSubTab, setAdminInstrumentSubTab] =
    useState<InstrumentAdminSubTab>('checklist');

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#4C1D95] border-t-transparent animate-spin mx-auto" />
          <div className="text-sm font-medium text-slate-600">
            Memulakan ruang pembelajaran M-IQ...
          </div>
        </div>
      </div>
    );
  }

  if (accessDeniedEmail) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl bg-white border border-red-200 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-50 text-red-700 flex items-center justify-center text-xl font-bold">!</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Akses M-IQ Belum Diluluskan</h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-2">
            Akaun Google <strong>{accessDeniedEmail}</strong> belum didaftarkan atau aksesnya telah ditarik balik oleh pentadbir.
          </p>
          <p className="text-sm text-slate-500 mb-6">Sila hubungi pentadbir M-IQ untuk pengesahan akses.</p>
          <button type="button" onClick={() => void signOutUser()} className="px-5 py-2.5 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold">
            Keluar dan pilih akaun lain
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignInGateway />;
  }

  const activeModule =
    modules.find((m) => m.slug === activeSlug) ||
    modules[0] || {
      id: 'dashboard',
      slug: 'dashboard',
      navOrder: 1,
      title: 'Dashboard',
      subtitle: '',
      sectionType: 'dashboard' as const,
      status: 'published' as const,
      coverImageUrl: '',
      isCore: true,
      updatedBy: 'system',
    };

  const openAdminEditor = (
    tab: AdminTabKey,
    moduleId?: string,
    topicId?: string,
    instrumentSub?: InstrumentAdminSubTab
  ) => {
    if (!isAdmin) return;
    setAdminTab(tab);
    setAdminModuleId(moduleId);
    setAdminTopicId(topicId);
    if (instrumentSub) setAdminInstrumentSubTab(instrumentSub);
    setAdminMode(true);
  };

  const unreadStudentAppointments = itemuRecords.filter(
    (r) => r.userId === user.uid && r.studentUnread
  ).length;
  const unreadAdminAppointments = isAdmin
    ? itemuRecords.filter((r) => r.adminUnread).length
    : 0;

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#0F172A] flex">
      <NavigationSidebar
        modules={modules}
        activeSlug={activeSlug}
        adminMode={adminMode}
        unreadStudentAppointments={unreadStudentAppointments}
        unreadAdminAppointments={unreadAdminAppointments}
        onSelectSlug={(slug) => setActiveSlug(slug)}
        onToggleAdminMode={(enable) => setAdminMode(enable && isAdmin)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean Contextual Top Bar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              {!adminMode &&
                (activeModule.sectionType === 'reflection' ||
                  activeModule.slug === 'refleksi-pelajar') && (
                  <IRefleksiIcon size="sm" className="w-7 h-7 shrink-0" />
                )}
              <div className="min-w-0">
                <div className="text-xs text-slate-500 truncate">
                  M-IQ (Mindset Itqan)
                </div>
                <div className="text-sm font-bold text-[#0F172A] truncate">
                  {adminMode
                    ? 'Panel Pentadbir (CMS)'
                    : activeModule.sectionType === 'reflection' ||
                      activeModule.slug === 'refleksi-pelajar'
                    ? 'i-REFLEKSI M-IQ'
                    : activeModule.sectionType === 'appointment' ||
                      activeModule.slug === 'i-temu-pensyarah'
                    ? 'i-TEMU · Maklum Balas Pensyarah'
                    : activeModule.title}
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAdminMode((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  adminMode
                    ? 'bg-[#4C1D95] text-white hover:bg-[#3B0764]'
                    : 'bg-[#0A1128] text-[#F5E6B8] hover:bg-[#1E293B]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{adminMode ? 'Kembali ke Mod Pelajar' : 'Panel Pentadbir'}</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {loading ? (
            <div className="rounded-xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
              Memuatkan data pembelajaran daripada Cloud Firestore...
            </div>
          ) : adminMode && isAdmin ? (
            <AdminDashboard
              modules={modules}
              submodules={submodules}
              topics={topics}
              resources={resources}
              checklistItems={checklistItems}
              selfAssessmentItems={selfAssessmentItems}
              assessmentConfig={assessmentConfig}
              rubricCriteria={rubricCriteria}
              feedbackList={feedbackList}
              reflections={reflections}
              allStudentProgress={allStudentProgress}
              studentActivities={studentActivities}
              itemuRecords={itemuRecords}
              lecturers={lecturerDirectory}
              initialTab={adminTab}
              initialModuleId={adminModuleId}
              initialTopicId={adminTopicId}
              initialInstrumentSubTab={adminInstrumentSubTab}
            />
          ) : activeModule.sectionType === 'dashboard' || activeModule.slug === 'dashboard' ? (
            <DashboardView
              modules={modules}
              topics={topics}
              checklistItems={checklistItems}
              selfAssessmentItems={selfAssessmentItems}
              assessmentConfig={assessmentConfig}
              rubricCriteria={rubricCriteria}
              progress={progress}
              reflections={reflections}
              studentActivities={studentActivities}
              itemuRecords={itemuRecords}
              onNavigate={(slug) => setActiveSlug(slug)}
              onOpenAdmin={() => openAdminEditor('modules')}
            />
          ) : activeModule.sectionType === 'checklist' ||
            activeModule.slug === 'instrumen-penilaian-kendiri' ? (
            <ChecklistView
              items={checklistItems}
              selfAssessmentItems={selfAssessmentItems}
              assessmentConfig={assessmentConfig}
              progress={progress}
              onToggleItem={toggleChecklistItem}
              onSubmitSelfAssessment={submitSelfAssessment}
              onOpenAdminChecklist={(sub) =>
                openAdminEditor('instruments', undefined, undefined, sub || 'checklist')
              }
            />
          ) : activeModule.sectionType === 'rubric' ||
            activeModule.slug === 'rubrik-kualiti-tugasan' ? (
            <RubricView
              criteria={rubricCriteria}
              progress={progress}
              onSelectScore={setRubricScore}
              onOpenAdminRubric={() =>
                openAdminEditor('instruments', undefined, undefined, 'rubric')
              }
            />
          ) : activeModule.sectionType === 'reflection' ||
            activeModule.slug === 'refleksi-pelajar' ? (
            <ReflectionView
              modules={modules}
              reflections={reflections}
              onLogActivity={logStudentActivity}
            />
          ) : activeModule.sectionType === 'appointment' ||
            activeModule.slug === 'i-temu-pensyarah' ? (
            <AppointmentsView
              records={itemuRecords}
              lecturers={lecturerDirectory}
              onLogActivity={logStudentActivity}
              onOpenAdminAppointments={() => openAdminEditor('appointments')}
            />
          ) : activeModule.sectionType === 'feedback' ||
            activeModule.slug === 'maklum-balas' ? (
            <FeedbackView
              feedbackList={feedbackList}
              onLogActivity={logStudentActivity}
            />
          ) : (
            <ModuleLearningView
              module={activeModule}
              submodules={submodules}
              topics={topics}
              resources={resources}
              progress={progress}
              onToggleTopicComplete={toggleTopicCompleted}
              onEditInAdmin={(modId, topId) => openAdminEditor('topics', modId, topId)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MiqWorkspace />
      </AuthProvider>
    </ErrorBoundary>
  );
}
