import { ArrowRight, BookOpen, CheckSquare, Compass, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CORE_MODULES_BLUEPRINT, CREST_EMBLEM_IMAGE, HERO_BANNER_IMAGE } from '../lib/seedData';

export function SignInGateway() {
  const { signInWithGoogle, signingIn, authError } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#0F172A] flex flex-col">
      {/* Top Bar (3 zones) */}
      <header className="bg-white border-b border-slate-200 px-6 lg:px-12 py-4 flex items-center justify-between gap-8">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#0A1128] border border-[#C59B27]/40 shrink-0">
            <img
              src={CREST_EMBLEM_IMAGE}
              alt="Lambang M-IQ"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0">
            M-IQ
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#kerangka" className="hover:text-[#4C1D95] transition-colors whitespace-nowrap shrink-0">
            Kerangka
          </a>
          <a href="#modul" className="hover:text-[#4C1D95] transition-colors whitespace-nowrap shrink-0">
            Modul Utama
          </a>
          <a href="#instrumen" className="hover:text-[#4C1D95] transition-colors whitespace-nowrap shrink-0">
            Penilaian
          </a>
          <a href="#akses" className="hover:text-[#4C1D95] transition-colors whitespace-nowrap shrink-0">
            Portal Akses
          </a>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={signingIn}
            className="px-4 py-2 rounded-lg bg-[#4C1D95] text-white text-sm font-semibold hover:bg-[#3B0764] transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {signingIn ? 'Menyambung...' : 'Log Masuk'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section
          id="kerangka"
          className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-16 grid lg:grid-cols-12 gap-10 items-stretch"
        >
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-wider text-[#9A7414] mb-3">
              Rangka Kerja Pembelajaran Digital Politeknik
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0F172A] leading-[1.15] mb-5 [text-wrap:balance]">
              M-IQ (Mindset Itqan)
            </h1>
            <p className="text-lg font-serif italic text-[#4C1D95] mb-5">
              &ldquo;Membina Minda Itqan, Membudayakan Kualiti dalam Tindakan.&rdquo;
            </p>
            <p className="text-base text-slate-600 leading-relaxed text-justify mb-8">
              M-IQ ialah rangka kerja pembelajaran digital yang membimbing pelajar politeknik menyiapkan tugasan akademik secara sistematik, beretika dan berkualiti tinggi berteraskan nilai Islam Itqan. Akses modul pembelajaran, instrumen penilaian kendiri, rubrik kualiti tugasan dan jurnal refleksi peribadi dalam satu ruang kerja bersepadu.
            </p>

            {authError && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                {authError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={signingIn}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                <span>{signingIn ? 'Memproses Log Masuk...' : 'Log Masuk dengan Google'}</span>
                <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
              </button>
              <a
                href="#modul"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white border border-slate-200 text-sm font-medium text-[#0F172A] hover:border-[#4C1D95]/40 transition-colors whitespace-nowrap"
              >
                Lihat 12 Komponen
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl font-bold text-[#0F172A] tabular-nums">12</div>
                <div className="text-xs text-slate-500 mt-0.5">Komponen Kurikulum</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4C1D95] tabular-nums">2 Peranan</div>
                <div className="text-xs text-slate-500 mt-0.5">Pelajar &amp; Pentadbir</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#9A7414] tabular-nums">Itqan</div>
                <div className="text-xs text-slate-500 mt-0.5">Teras Kualiti Akademik</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[320px] rounded-xl overflow-hidden border border-slate-200 bg-[#0A1128] relative">
              <img
                src={HERO_BANNER_IMAGE}
                alt="Perpustakaan moden berteraskan seni bina Islam kontemporari"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128]/85 via-[#0A1128]/25 to-transparent flex items-end p-6">
                <div className="text-white">
                  <div className="text-xs text-[#F5E6B8] font-medium mb-1">
                    Pendekatan Sistematik · Etika · Kualiti
                  </div>
                  <div className="text-base font-semibold">
                    Portal Pembelajaran Digital M-IQ Politeknik
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 12 Curriculum Sections Preview */}
        <section id="modul" className="bg-white border-y border-slate-200 py-14">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl mb-10">
              <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
                Struktur Navigasi Utama M-IQ
              </h2>
              <p className="text-sm text-slate-600 text-justify leading-relaxed">
                Dua belas bahagian berstruktur yang membimbing pelajar daripada pemahaman asas M-IQ hingga penghantaran tugasan akhir, lengkap dengan panduan AI generatif, instrumen penilaian kendiri, rubrik dan refleksi.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CORE_MODULES_BLUEPRINT.map((mod) => (
                <div
                  key={mod.id}
                  className="p-5 rounded-xl bg-[#F8F9FC] border border-slate-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="text-xs font-mono font-semibold text-[#4C1D95] tabular-nums mb-2">
                      {String(mod.navOrder).padStart(2, '0')}
                    </div>
                    <h3 className="text-base font-semibold text-[#0F172A] mb-2">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-slate-600 text-justify leading-relaxed">
                      {mod.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities Strip */}
        <section id="instrumen" className="max-w-7xl mx-auto px-6 lg:px-12 py-14">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-white border border-slate-200">
              <Compass className="w-5 h-5 text-[#4C1D95] mb-3" />
              <h3 className="text-base font-semibold text-[#0F172A] mb-2">
                Pembelajaran Berpandu
              </h3>
              <p className="text-sm text-slate-600 text-justify leading-relaxed">
                Pelajar mengakses modul terbitan, bahan bacaan berjajaran penuh, video YouTube, dokumen rujukan dan menjejaki topik yang telah diselesaikan.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-white border border-slate-200">
              <CheckSquare className="w-5 h-5 text-[#9A7414] mb-3" />
              <h3 className="text-base font-semibold text-[#0F172A] mb-2">
                Penilaian &amp; Refleksi Kendiri
              </h3>
              <p className="text-sm text-slate-600 text-justify leading-relaxed">
                Lengkapkan senarai semak penilaian kendiri, semak rubrik kualiti tugasan dan tulis jurnal refleksi peribadi yang disimpan secara selamat di awan.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-white border border-slate-200">
              <ShieldCheck className="w-5 h-5 text-[#0F172A] mb-3" />
              <h3 className="text-base font-semibold text-[#0F172A] mb-2">
                Pengurusan Kandungan Pentadbir
              </h3>
              <p className="text-sm text-slate-600 text-justify leading-relaxed">
                Panel pentadbir dilindungi kawalan akses berasaskan peranan untuk menyunting teks, fon, warna, jajaran, memuat naik media serta menerbitkan kandungan.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section id="akses" className="max-w-7xl mx-auto px-6 lg:px-12 pb-16">
          <div className="rounded-xl bg-[#0A1128] text-white p-8 lg:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#C59B27]/30">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#F5E6B8] font-medium mb-2">
                <BookOpen className="w-4 h-4" />
                <span>Akses Selamat Firebase Authentication</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold mb-1">
                Mulakan Perjalanan Pembelajaran M-IQ Anda
              </h2>
              <p className="text-sm text-slate-300">
                Log masuk menggunakan akaun Google untuk menyimpan kemajuan, refleksi dan penilaian kendiri anda.
              </p>
            </div>
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={signingIn}
              className="px-6 py-3 rounded-lg bg-[#C59B27] text-[#0A1128] text-sm font-bold hover:bg-[#D4AF37] transition-colors whitespace-nowrap shrink-0"
            >
              {signingIn ? 'Menyambung...' : 'Log Masuk Sekarang'}
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 lg:px-12 py-5 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>M-IQ (Mindset Itqan) · Membina Minda Itqan, Membudayakan Kualiti dalam Tindakan</span>
        <span>Rangka Kerja Pembelajaran Digital Politeknik</span>
      </footer>
    </div>
  );
}
