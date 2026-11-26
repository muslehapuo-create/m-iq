import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { BarChart3, Clock, Download, MessageSquare, Shield, ShieldOff, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  db,
  handleFirestoreError,
  OperationType,
  PRIMARY_ADMIN_EMAIL,
} from '../../lib/firebase';
import { generateIRefleksiPdf } from '../../lib/reflectionPdf';
import { RichContentRenderer } from '../../lib/sanitizeHtml';
import {
  DEFAULT_TOPIC_STYLE,
  normalizeGuidedPrompt,
  stripHtmlToText,
  type AdminGrant,
  type ChecklistItem,
  type RubricCriterion,
  type StudentActivity,
  type StudentFeedback,
  type StudentProgress,
  type StudentReflection,
  type TopicContent,
  type UserProfile,
} from '../../types/miq';

interface AdminCommunityPanelProps {
  feedbackList: StudentFeedback[];
  reflections: StudentReflection[];
  allStudentProgress: StudentProgress[];
  studentActivities: StudentActivity[];
  topics: TopicContent[];
  checklistItems: ChecklistItem[];
  rubricCriteria: RubricCriterion[];
}

export function AdminCommunityPanel({
  feedbackList,
  reflections,
  allStudentProgress,
  studentActivities,
  topics,
  checklistItems,
  rubricCriteria,
}: AdminCommunityPanelProps) {
  const { user, isAdmin } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [adminGrants, setAdminGrants] = useState<AdminGrant[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [approvedStudents, setApprovedStudents] = useState<Array<{email:string;displayName:string;active:boolean}>>([]);
  const [classList, setClassList] = useState<Array<{id:string;name:string;active:boolean}>>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [accessSaving, setAccessSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setUsersList(snap.docs.map((d) => d.data() as UserProfile));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubApprovals = onSnapshot(collection(db, 'approvedStudents'), (snap) => {
      setApprovedStudents(snap.docs.map((d) => d.data() as {email:string;displayName:string;active:boolean}));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'approvedStudents'));
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      setClassList(snap.docs.map((d) => ({ ...(d.data() as {name:string;active:boolean}), id:d.id })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'classes'));
    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (snap) => {
        setAdminGrants(snap.docs.map((d) => d.data() as AdminGrant));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
    );

    return () => {
      unsubUsers();
      unsubAdmins();
      unsubApprovals();
      unsubClasses();
    };
  }, [isAdmin]);

  const addApprovedStudent = async () => {
    const email = newStudentEmail.trim().toLowerCase();
    const displayName = newStudentName.trim();
    if (!user || !displayName || !email.includes('@') || !email.includes('.')) { window.alert('Masukkan nama dan e-mel yang sah.'); return; }
    setAccessSaving(true);
    try {
      await setDoc(doc(db, 'approvedStudents', email), { email, displayName, active:true, createdAt:serverTimestamp(), updatedAt:serverTimestamp(), addedBy:user.uid });
      setNewStudentName(''); setNewStudentEmail('');
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'approvedStudents'); }
    finally { setAccessSaving(false); }
  };
  const revokeStudent = async (email:string) => {
    if (!window.confirm('Tarik balik akses M-IQ untuk '+email+'?')) return;
    await updateDoc(doc(db, 'approvedStudents', email), { active:false, updatedAt:serverTimestamp() });
  };
  const addClass = async () => {
    if (!user || !newClassName.trim()) return;
    const name = newClassName.trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,100);
    if (!id) return;
    setAccessSaving(true);
    try { await setDoc(doc(db, 'classes', id), { name, active:true, createdAt:serverTimestamp(), updatedAt:serverTimestamp(), createdBy:user.uid }); setNewClassName(''); }
    catch (err) { handleFirestoreError(err, OperationType.WRITE, 'classes'); }
    finally { setAccessSaving(false); }
  };
  const handleReplySubmit = async (fb: StudentFeedback) => {
    const replyText = (replyDrafts[fb.id] ?? fb.adminReply ?? '').trim().slice(0, 2000);
    setSavingId(fb.id);
    try {
      await updateDoc(doc(db, 'feedback', fb.id), {
        adminReply: replyText,
        status: 'reviewed',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `feedback/${fb.id}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleAdmin = async (target: UserProfile) => {
    if (!user) return;
    if (target.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) return;

    const alreadyGranted = adminGrants.some((g) => g.uid === target.uid);
    try {
      if (alreadyGranted) {
        await deleteDoc(doc(db, 'admins', target.uid));
        await deleteDoc(doc(db, 'lecturerDirectory', target.uid)).catch(() => {});
        await updateDoc(doc(db, 'users', target.uid), {
          role: 'student',
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'admins', target.uid), {
          uid: target.uid,
          email: target.email,
          grantedBy: user.uid,
          createdAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'lecturerDirectory', target.uid), {
          uid: target.uid,
          displayName: (target.displayName || 'Pensyarah M-IQ').slice(0, 120),
          title: 'Pensyarah / Pentadbir M-IQ',
          isPrimary: false,
          active: true,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
        await updateDoc(doc(db, 'users', target.uid), {
          role: 'admin',
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `admins/${target.uid}`);
    }
  };

  const publishedTopics = topics.filter((t) => t.status === 'published');
  const publishedChecklist = checklistItems.filter((c) => c.status === 'published');
  const publishedRubrics = rubricCriteria.filter((r) => r.status === 'published');
  const totalRubricWeight = publishedRubrics.reduce((sum, r) => sum + r.weight, 0);

  return (
    <div className="space-y-6">
      {/* Rekod Kemajuan Pelajar (Admin RBAC View) */}
      <section className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#4C1D95]" />
            <span className="tabular-nums">
              Rekod Kemajuan Pelajar ({usersList.length} Pengguna)
            </span>
          </h2>
          <span className="text-xs text-slate-500">
            Data kemajuan, penilaian kendiri &amp; refleksi pelajar
          </span>
        </div>

        {usersList.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 text-center">
            Belum ada pengguna pelajar berdaftar lagi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Nama &amp; E-mel</th>
                  <th className="py-3 px-4 font-semibold">Topik Selesai</th>
                  <th className="py-3 px-4 font-semibold">Senarai Semak</th>
                  <th className="py-3 px-4 font-semibold">Penilaian Kendiri</th>
                  <th className="py-3 px-4 font-semibold">Rubrik Tugasan</th>
                  <th className="py-3 px-4 font-semibold">Refleksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => {
                  const prog = allStudentProgress.find((p) => p.userId === u.uid);
                  const userTopicsDone = (prog?.completedTopicIds ?? []).filter((id) =>
                    publishedTopics.some((t) => t.id === id)
                  ).length;
                  const userTopicPct =
                    publishedTopics.length > 0
                      ? Math.round((userTopicsDone / publishedTopics.length) * 100)
                      : 0;

                  const userChecklistDone = (prog?.checkedChecklistIds ?? []).filter((id) =>
                    publishedChecklist.some((c) => c.id === id)
                  ).length;
                  const userChecklistPct =
                    publishedChecklist.length > 0
                      ? Math.round((userChecklistDone / publishedChecklist.length) * 100)
                      : 0;

                  const rubricSel = prog?.rubricSelections ?? {};
                  const userRubricWeighted = publishedRubrics.reduce((acc, c) => {
                    const chosen = rubricSel[c.id];
                    if (!chosen) return acc;
                    const maxS = Math.max(...c.levels.map((l) => l.score), 1);
                    return acc + (chosen / maxS) * c.weight;
                  }, 0);
                  const userRubricPct =
                    totalRubricWeight > 0
                      ? Math.round((userRubricWeighted / totalRubricWeight) * 100)
                      : 0;

                  const userReflCount = reflections.filter((r) => r.userId === u.uid).length;
                  const hasSa = typeof prog?.selfAssessmentScore === 'number';

                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#0F172A]">{u.displayName}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        <div className="font-semibold text-[#4C1D95]">{userTopicPct}%</div>
                        <div className="text-[11px] text-slate-500">
                          {userTopicsDone}/{publishedTopics.length}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        <div className="font-semibold text-[#0F172A]">{userChecklistPct}%</div>
                        <div className="text-[11px] text-slate-500">
                          {userChecklistDone}/{publishedChecklist.length}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {hasSa ? (
                          <div>
                            <div className="font-semibold text-emerald-700 tabular-nums">
                              {prog?.selfAssessmentScorePct ?? prog?.selfAssessmentScore}%
                            </div>
                            <div className="text-[11px] text-slate-600 max-w-[180px] truncate">
                              {prog?.selfAssessmentBandLabel}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Belum dijawab</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        {Object.keys(rubricSel).length > 0 ? (
                          <span className="font-semibold text-[#0F172A]">{userRubricPct}%</span>
                        ) : (
                          <span className="text-slate-400">Belum dinilai</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-semibold text-[#0F172A]">
                        {userReflCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Student Activity Logs */}
      <section className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#9A7414]" />
            <span className="tabular-nums">
              Log Aktiviti Pembelajaran Terkini ({studentActivities.length})
            </span>
          </h2>
        </div>

        {studentActivities.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 text-center">
            Tiada rekod aktiviti pembelajaran direkodkan lagi.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {studentActivities.slice(0, 15).map((act) => {
              const dateText = act.createdAt?.seconds
                ? new Date(act.createdAt.seconds * 1000).toLocaleString('ms-MY', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Baru sahaja';
              return (
                <div
                  key={act.id}
                  className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-[#4C1D95] mr-2">{act.userName}</span>
                    <span className="font-semibold text-[#0F172A]">{act.title}</span>
                    {act.detail && (
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">{act.detail}</div>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                    {dateText}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Feedback Review */}
      <section className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#4C1D95]" />
            <span className="tabular-nums">Maklum Balas Pelajar ({feedbackList.length})</span>
          </h2>
        </div>

        {feedbackList.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 text-center">
            Tiada maklum balas diterima lagi.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feedbackList.map((fb) => (
              <div key={fb.id} className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div>
                    <strong className="text-[#0F172A]">{fb.userName}</strong> ·{' '}
                    <span>{fb.category}</span> ·{' '}
                    <span className="tabular-nums">Penilaian {fb.rating}/5</span>
                  </div>
                  <span
                    className={
                      fb.status === 'reviewed'
                        ? 'text-emerald-700 font-semibold'
                        : 'text-amber-700 font-semibold'
                    }
                  >
                    {fb.status === 'reviewed' ? 'Telah Disemak' : 'Menunggu Semakan'}
                  </span>
                </div>

                <p className="text-sm text-slate-700 text-justify">{fb.message}</p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={replyDrafts[fb.id] ?? fb.adminReply}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [fb.id]: e.target.value }))
                    }
                    maxLength={2000}
                    placeholder="Tulis balasan rasmi pentadbir..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#4C1D95]"
                  />
                  <button
                    type="button"
                    disabled={savingId === fb.id}
                    onClick={() => handleReplySubmit(fb)}
                    className="px-4 py-2 rounded-lg bg-[#4C1D95] text-white text-xs font-semibold hover:bg-[#3B0764] whitespace-nowrap"
                  >
                    {savingId === fb.id ? 'Menyimpan...' : 'Simpan & Tandai Disemak'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200">
          <h2 className="text-base font-bold text-[#0F172A]">Pendaftaran Pelajar &amp; Pengurusan Kelas</h2>
          <p className="text-xs text-slate-500 mt-1">Hanya e-mel yang diluluskan boleh mengakses M-IQ.</p>
        </div>
        <div className="p-5 grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Daftar akaun pelajar</h3>
            <input value={newStudentName} onChange={(e)=>setNewStudentName(e.target.value)} placeholder="Nama penuh pelajar" className="w-full px-3 py-2 rounded-lg border text-sm" />
            <input type="email" value={newStudentEmail} onChange={(e)=>setNewStudentEmail(e.target.value)} placeholder="Alamat Gmail pelajar" className="w-full px-3 py-2 rounded-lg border text-sm" />
            <button type="button" disabled={accessSaving} onClick={()=>void addApprovedStudent()} className="px-4 py-2 rounded-lg bg-[#4C1D95] text-white text-xs font-semibold">Daftar / Aktifkan Akses</button>
            {approvedStudents.map((s)=><div key={s.email} className="flex justify-between gap-2 border-b py-2 text-xs"><span>{s.displayName} · {s.email}</span>{s.active ? <button type="button" onClick={()=>void revokeStudent(s.email)} className="text-red-700 font-semibold">Tarik akses</button> : <span>Tidak aktif</span>}</div>)}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Senarai kelas</h3>
            <div className="flex gap-2"><input value={newClassName} onChange={(e)=>setNewClassName(e.target.value)} placeholder="Contoh: DKA 1A" className="min-w-0 flex-1 px-3 py-2 rounded-lg border text-sm" /><button type="button" disabled={accessSaving} onClick={()=>void addClass()} className="px-4 py-2 rounded-lg bg-[#0A1128] text-white text-xs font-semibold">Tambah</button></div>
            {classList.map((cl)=><div key={cl.id} className="border-b py-2 text-sm">{cl.name} <span className="text-xs text-slate-400">{cl.active?'Aktif':'Tidak aktif'}</span></div>)}
          </div>
        </div>
      </section>
      {/* Role Management & Users */}
      <section className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#9A7414]" />
            <span className="tabular-nums">Pengurusan Akses Pengguna ({usersList.length})</span>
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {usersList.map((u) => {
            const isPrimary = u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
            const isGrantedAdmin = isPrimary || adminGrants.some((g) => g.uid === u.uid);
            return (
              <div
                key={u.uid}
                className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#0F172A] truncate">
                    {u.displayName}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {u.email} · {isGrantedAdmin ? 'Pentadbir' : 'Pelajar'}
                  </div>
                </div>

                {isPrimary ? (
                  <span className="text-xs font-semibold text-[#9A7414] shrink-0">
                    Pentadbir Utama
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleAdmin(u)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isGrantedAdmin
                        ? 'border-red-200 text-red-700 hover:bg-red-50'
                        : 'border-slate-200 text-[#0F172A] hover:border-[#4C1D95]'
                    }`}
                  >
                    {isGrantedAdmin ? (
                      <>
                        <ShieldOff className="w-3.5 h-3.5" />
                        <span>Tarik Akses Pentadbir</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-3.5 h-3.5 text-[#4C1D95]" />
                        <span>Lantik Pentadbir</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Reflections Snapshot */}
      <section className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-[#F8F9FC] border-b border-slate-200">
          <h2 className="text-base font-bold text-[#0F172A] tabular-nums">
            Rekod i-Refleksi M-IQ Pelajar Terkini ({reflections.length})
          </h2>
        </div>
        {reflections.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 text-center">
            Tiada refleksi pelajar direkodkan lagi.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reflections.slice(0, 15).map((r) => (
              <div key={r.id} className="p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`font-semibold ${
                          r.status === 'draft' ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {r.status === 'draft' ? 'Draf' : 'Lengkap'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[#4C1D95] font-medium">
                        {r.userName}
                        {r.studentRegNo ? ` (${r.studentRegNo})` : ''}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600">{r.moduleTitle}</span>
                      {(r.courseCode || r.courseName) && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600">
                            {[r.courseCode, r.courseName].filter(Boolean).join(' ')}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-sm font-bold text-[#0F172A]">
                      {r.assignmentTitle || r.title}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => generateIRefleksiPdf(r, r.userName)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1128] text-[#F5E6B8] text-xs font-semibold hover:bg-[#1E293B] shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Muat Turun PDF</span>
                  </button>
                </div>

                {r.guidedAnswers && r.guidedAnswers.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {r.guidedAnswers
                      .filter((ans) => stripHtmlToText(ans.answer).length > 0)
                      .map((ans) => (
                        <div
                          key={ans.id}
                          className="p-3 rounded-lg bg-[#F8F9FC] border border-slate-200 space-y-1"
                        >
                          <div className="text-[11px] font-bold text-[#4C1D95]">
                            {normalizeGuidedPrompt(ans.id, ans.prompt)}
                          </div>
                          <div className="text-xs">
                            <RichContentRenderer
                              content={ans.answer}
                              style={r.style || DEFAULT_TOPIC_STYLE}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-600 text-justify leading-relaxed">{r.body}</p>
                    {(r.strengths || r.weaknesses || r.improvements) && (
                      <div className="grid sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                        {r.strengths && (
                          <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-200/70">
                            <strong className="text-emerald-900">Kekuatan: </strong>
                            <span className="text-slate-700">{r.strengths}</span>
                          </div>
                        )}
                        {r.weaknesses && (
                          <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200/70">
                            <strong className="text-amber-900">Kelemahan: </strong>
                            <span className="text-slate-700">{r.weaknesses}</span>
                          </div>
                        )}
                        {r.improvements && (
                          <div className="p-2.5 rounded bg-[#4C1D95]/5 border border-[#4C1D95]/20">
                            <strong className="text-[#4C1D95]">Penambahbaikan: </strong>
                            <span className="text-slate-700">{r.improvements}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
