import {
  Award,
  BookOpen,
  CalendarCheck2,
  CheckSquare,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PenTool,
  Send,
  Shield,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CREST_EMBLEM_IMAGE } from '../lib/seedData';
import { resolveAssetUrl, type LearningModule } from '../types/miq';
import { IRefleksiIcon } from './IRefleksiIcon';

interface NavigationSidebarProps {
  modules: LearningModule[];
  activeSlug: string;
  adminMode: boolean;
  unreadStudentAppointments?: number;
  unreadAdminAppointments?: number;
  onSelectSlug: (slug: string) => void;
  onToggleAdminMode: (enable: boolean) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function getModuleIcon(slug: string, sectionType: string) {
  if (slug === 'dashboard' || sectionType === 'dashboard') return LayoutDashboard;
  if (slug === 'pengenalan-miq') return Compass;
  if (slug === 'pemikiran-itqan') return Sparkles;
  if (slug === 'perancangan-berstrategi') return FileText;
  if (slug === 'pelaksanaan') return Wrench;
  if (slug === 'semakan-penambahbaikan') return BookOpen;
  if (slug === 'penghantaran') return Send;
  if (slug === 'panduan-ai-generatif') return Sparkles;
  if (slug === 'instrumen-penilaian-kendiri' || sectionType === 'checklist') return CheckSquare;
  if (slug === 'rubrik-kualiti-tugasan' || sectionType === 'rubric') return Award;
  if (slug === 'refleksi-pelajar' || sectionType === 'reflection') return PenTool;
  if (slug === 'i-temu-pensyarah' || sectionType === 'appointment') return CalendarCheck2;
  if (slug === 'maklum-balas' || sectionType === 'feedback') return MessageSquare;
  return BookOpen;
}

export function NavigationSidebar({
  modules,
  activeSlug,
  adminMode,
  unreadStudentAppointments = 0,
  unreadAdminAppointments = 0,
  onSelectSlug,
  onToggleAdminMode,
  mobileOpen,
  onCloseMobile,
}: NavigationSidebarProps) {
  const { profile, isAdmin, signOutUser } = useAuth();

  const visibleModules = isAdmin
    ? modules
    : modules.filter((m) => m.status === 'published');

  const navContent = (
    <div className="flex flex-col h-full bg-[#0A1128] text-slate-200 w-72 border-r border-slate-800">
      {/* Brand Lockup */}
      <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#C59B27]/50 shrink-0 bg-[#0F172A]">
            <img
              src={resolveAssetUrl(CREST_EMBLEM_IMAGE)}
              alt="M-IQ"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-white tracking-tight truncate">
              M-IQ
            </div>
            <div className="text-[11px] text-[#E6C76B] truncate">
              Mindset Itqan
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Mode Switcher (Admin Only) */}
      {isAdmin && (
        <div className="px-4 pt-4 pb-2">
          <div className="p-1 rounded-lg bg-[#0F172A] border border-slate-800 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                onToggleAdminMode(false);
                onCloseMobile();
              }}
              className={`px-2.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                !adminMode
                  ? 'bg-[#4C1D95] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mod Pelajar
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleAdminMode(true);
                onCloseMobile();
              }}
              className={`px-2.5 py-2 rounded-md text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                adminMode
                  ? 'bg-[#C59B27] text-[#0A1128]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>
                Pentadbir{unreadAdminAppointments > 0 ? ` (${unreadAdminAppointments})` : ''}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main 12 Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
          Navigasi Utama
        </div>
        {visibleModules.map((mod) => {
          const Icon = getModuleIcon(mod.slug, mod.sectionType);
          const isReflection =
            mod.slug === 'refleksi-pelajar' || mod.sectionType === 'reflection';
          const isAppointment =
            mod.slug === 'i-temu-pensyarah' || mod.sectionType === 'appointment';
          const isActive = !adminMode && activeSlug === mod.slug;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => {
                onToggleAdminMode(false);
                onSelectSlug(mod.slug);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                isReflection
                  ? isActive
                    ? 'bg-[#4C1D95] text-white font-semibold ring-1 ring-[#C59B27]'
                    : 'bg-[#121A36] border border-[#C59B27]/40 text-[#F5E6B8] hover:bg-[#192347] hover:text-white font-semibold'
                  : isActive
                  ? 'bg-[#4C1D95] text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white font-medium'
              }`}
            >
              {isReflection ? (
                <IRefleksiIcon size="sm" className="w-5 h-5 shrink-0" />
              ) : (
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#F5E6B8]' : 'text-slate-400'
                  }`}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate">
                  {isReflection && mod.title === 'Refleksi Pelajar'
                    ? 'i-Refleksi M-IQ'
                    : isAppointment
                    ? 'i-TEMU'
                    : mod.title}
                </div>
                {isReflection && (
                  <div className="text-[10px] text-[#E6C76B]/90 font-normal truncate">
                    Refleksi Tugasan Rasmi
                  </div>
                )}
                {isAppointment && (
                  <div className="text-[10px] text-[#E6C76B]/90 font-normal truncate">
                    Maklum Balas Pensyarah
                  </div>
                )}
              </div>
              {isAppointment && unreadStudentAppointments > 0 && (
                <span className="text-[11px] font-mono font-bold text-[#F5E6B8] tabular-nums shrink-0">
                  ({unreadStudentAppointments})
                </span>
              )}
              {mod.status === 'draft' && (
                <span className="text-[10px] font-mono text-amber-300 shrink-0">
                  Draf
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-[#080E21]">
        <div className="flex items-center gap-3 mb-3">
          {profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#4C1D95] text-white flex items-center justify-center text-sm font-bold shrink-0">
              {(profile?.displayName || 'M').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">
              {profile?.displayName || 'Pengguna'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {isAdmin ? 'Pentadbir Sistem' : profile?.program || 'Pelajar'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={signOutUser}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-0 h-screen">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0A1128]/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{navContent}</div>
        </div>
      )}
    </>
  );
}
