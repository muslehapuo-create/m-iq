import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';

interface ClassOption { id: string; name: string; active: boolean; }

export function StudentClassSetup() {
  const { updateClassName, signOutUser } = useAuth();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onSnapshot(query(collection(db, 'classes'), where('active', '==', true)), (snap) => {
    setClasses(snap.docs.map((d) => ({ id:d.id, ...(d.data() as {name:string;active:boolean}) })).sort((a,b)=>a.name.localeCompare(b.name)));
  }, () => setError('Senarai kelas tidak dapat dimuatkan. Sila cuba lagi atau hubungi pentadbir.')), []);

  const save = async () => {
    const chosen = classes.find((item) => item.id === selected);
    if (!chosen) return;
    setSaving(true); setError('');
    try { await updateClassName(chosen.name); }
    catch { setError('Kelas tidak berjaya disimpan. Sila cuba lagi.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Pilih Kelas Anda</h1>
        <p className="text-sm text-slate-600 mb-5">Pilih kelas daripada senarai yang disediakan oleh pentadbir sebelum meneruskan pembelajaran M-IQ.</p>
        <select value={selected} onChange={(e)=>setSelected(e.target.value)} className="w-full px-3 py-3 rounded-lg border border-slate-300 text-sm mb-4">
          <option value="">-- Pilih kelas --</option>
          {classes.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {classes.length===0 && <p className="text-xs text-amber-700 mb-4">Belum ada kelas aktif. Sila hubungi pentadbir M-IQ.</p>}
        {error && <p className="text-xs text-red-700 mb-3">{error}</p>}
        <button type="button" disabled={!selected || saving} onClick={()=>void save()} className="w-full px-4 py-3 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold disabled:opacity-50">{saving?'Menyimpan...':'Sahkan Kelas'}</button>
        <button type="button" onClick={()=>void signOutUser()} className="w-full mt-3 text-xs text-slate-500">Log keluar</button>
      </div>
    </div>
  );
}
