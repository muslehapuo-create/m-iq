import {
  DEFAULT_TOPIC_STYLE,
  type AssessmentConfig,
  type ExternalLinkItem,
  type PublishStatus,
  type ReferenceMaterialItem,
  type RubricLevel,
  type TopicAttachment,
  type TopicStyle,
} from '../types/miq';

export interface SubModuleSeedItem {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  order: number;
  status: PublishStatus;
}

export interface TopicSeedItem {
  id: string;
  moduleId: string;
  subModuleId: string;
  title: string;
  summary: string;
  order: number;
  status: PublishStatus;
  content: string;
  style: TopicStyle;
  youtubeUrls: string[];
  externalLinks: ExternalLinkItem[];
  attachments: TopicAttachment[];
  referenceMaterials: ReferenceMaterialItem[];
}

export interface ChecklistSeedItem {
  id: string;
  category: string;
  title: string;
  description: string;
  order: number;
  status: PublishStatus;
}

export interface SelfAssessmentSeedItem {
  id: string;
  category: string;
  statement: string;
  order: number;
  status: PublishStatus;
}

export interface RubricSeedItem {
  id: string;
  title: string;
  weight: number;
  order: number;
  levels: RubricLevel[];
  status: PublishStatus;
}

export interface ResourceSeedItem {
  id: string;
  title: string;
  description: string;
  moduleId: string;
  resourceType: 'document' | 'image' | 'video' | 'link';
  url: string;
  fileName: string;
  storagePath: string;
  status: PublishStatus;
}

const GOOGLE_SITES_BASE = 'https://sites.google.com/puo.edu.my/mindset-iq';
const DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1Qltxfw0v4K6K_IP3eryBs2d2koIt00we?usp=drive_link';
const ITQAN_VIDEO_PREVIEW_URL =
  'https://drive.google.com/file/d/1fRTv6LCAII69pomLU2kfrwxXy4mGE1sJ/preview';
export const OFFICIAL_FEEDBACK_FORM_URL = 'https://forms.gle/XWRJvHr18wRcWrCq8';

export const OFFICIAL_SUBMODULES_SEED: SubModuleSeedItem[] = [
  {
    id: 'sub-pengenalan-teras',
    moduleId: 'pengenalan-miq',
    title: 'Kerangka & Fasa M-IQ',
    description: 'Pengenalan rasmi M-IQ (Mindset Itqan) serta lima fasa penerapan nilai Itqan.',
    order: 1,
    status: 'published',
  },
  {
    id: 'sub-pengenalan-adab-inspirasi',
    moduleId: 'pengenalan-miq',
    title: 'Etika, Adab & Inspirasi M-IQ',
    description: 'Adab menuntut ilmu di dalam kelas dan video inspirasi lagu M-IQ.',
    order: 2,
    status: 'published',
  },
  {
    id: 'sub-pemikiran-teras',
    moduleId: 'pemikiran-itqan',
    title: 'Fasa 1: Pemikiran Itqan',
    description: 'Membentuk asas pemikiran berkualiti sebelum melaksanakan tugasan.',
    order: 1,
    status: 'published',
  },
  {
    id: 'sub-perancangan-teras',
    moduleId: 'perancangan-berstrategi',
    title: 'Fasa 2: Perancangan & Persediaan Awal',
    description: 'Strategi merancang tugasan, senarai semak awal dan tips membina prompt.',
    order: 1,
    status: 'published',
  },
  {
    id: 'sub-pelaksanaan-teras',
    moduleId: 'pelaksanaan',
    title: 'Fasa 3: Pelaksanaan & Penggunaan AI',
    description: 'Langkah pelaksanaan tugasan serta panduan penggunaan AI Generatif secara bijak.',
    order: 1,
    status: 'published',
  },
  {
    id: 'sub-semakan-teras',
    moduleId: 'semakan-penambahbaikan',
    title: 'Fasa 4: Semakan & Pertemuan Pensyarah',
    description: 'Proses semakan rakan sebaya, perbincangan pensyarah dan borang pertemuan.',
    order: 1,
    status: 'published',
  },
  {
    id: 'sub-penghantaran-teras',
    moduleId: 'penghantaran',
    title: 'Fasa 5: Penghantaran & Semakan Kendiri',
    description: 'Pematuhan penghantaran tugasan serta instrumen semakan kendiri AI Generatif.',
    order: 1,
    status: 'published',
  },
  {
    id: 'sub-ai-panduan',
    moduleId: 'panduan-ai-generatif',
    title: 'Info & Panduan AI Generatif',
    description: 'Pengenalan AI Generatif, cara penggunaan bijak dalam tugasan dan pembinaan prompt.',
    order: 1,
    status: 'published',
  },
];

export const OFFICIAL_TOPICS_SEED: TopicSeedItem[] = [
  {
    id: 'miq-pengenalan-utama',
    moduleId: 'pengenalan-miq',
    subModuleId: 'sub-pengenalan-teras',
    title: 'Pengenalan M-IQ (Mindset Itqan)',
    summary:
      'Membina Minda Itqan, Membudayakan Kualiti dalam Tindakan — Kerangka pelaksanaan tugasan yang mengintegrasikan nilai Itqan dengan penggunaan AI Generatif secara beretika.',
    order: 1,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>PENGENALAN M-IQ (Mindset Itqan)</h2>',
      '<p><strong>MEMBINA MINDA ITQAN, MEMBUDAYAKAN KUALITI DALAM TINDAKAN.</strong></p>',
      '<blockquote>"Sesungguhnya Allah menyukai seseorang yang apabila melakukan sesuatu pekerjaan, dilakukan dengan itqan." (Riwayat al-Baihaqi)</blockquote>',
      '<p>M-IQ (Mindset Itqan) ialah kerangka pelaksanaan tugasan yang mengintegrasikan nilai Itqan dengan penggunaan AI Generatif secara beretika dalam proses pembelajaran. Mindset Itqan merujuk kepada pemikiran yang membentuk sikap pelajar untuk melaksanakan setiap tugasan dengan teliti, berkualiti, amanah, bertanggungjawab dan berusaha mencapai kecemerlangan, selaras dengan konsep itqan dalam Islam.</p>',
      '<p>Kerangka ini dibangunkan bagi membantu pelajar mengurus dan melaksanakan tugasan secara lebih sistematik, di samping menangani isu pengurusan masa yang kurang berkesan, kebergantungan berlebihan terhadap AI Generatif serta ketidakselarasan kualiti hasil tugasan.</p>',
      '<p>Dalam pendekatan ini, AI Generatif berfungsi sebagai alat bantu pembelajaran untuk menjana idea, mencari maklumat, menyusun kandungan, menyemak penulisan dan menambah baik tugasan. Walau bagaimanapun, pelajar kekal bertanggungjawab memastikan ketepatan fakta, keaslian hasil kerja serta pematuhan kepada etika akademik.</p>',
      '<p>Melalui M-IQ, pelajar dibimbing untuk menghasilkan tugasan yang bukan sahaja memenuhi keperluan akademik, malah mencerminkan nilai Itqan, integriti, profesionalisme dan penggunaan AI Generatif secara bertanggungjawab. Pendekatan ini diharapkan dapat membentuk pelajar yang berdisiplin, beretika dan mampu menghasilkan tugasan yang berkualiti tinggi selaras dengan keperluan pembelajaran abad ke-21.</p>',
      '<h3>M-IQ (Mindset Itqan): Kerangka Pelaksanaan Tugasan Berkualiti</h3>',
      '<ol>',
      '<li><strong>Pemikiran Itqan</strong></li>',
      '<li><strong>Perancangan Berstrategi</strong></li>',
      '<li><strong>Pelaksanaan</strong></li>',
      '<li><strong>Semakan dan Penambahbaikan</strong></li>',
      '<li><strong>Penghantaran Tugasan</strong></li>',
      '</ol>',
      '<h3>Ciri-Ciri Utama M-IQ</h3>',
      '<ul>',
      '<li>Berteraskan Nilai Itqan</li>',
      '<li>Penggunaan AI Generatif secara beretika</li>',
      '<li>Proses sistematik dan terancang</li>',
      '<li>Mengutamakan integriti dan keaslian</li>',
      '<li>Meningkatkan kualiti dan prestasi tugasan</li>',
      '<li>Menyokong pembelajaran abad ke-21</li>',
      '</ul>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman Pengenalan M-IQ (Google Sites Rasmi)',
        url: `${GOOGLE_SITES_BASE}/pengenalan`,
      },
    ],
    attachments: [
      {
        name: 'Infografik Pengenalan M-IQ (Mindset Itqan).png',
        url: '/src/assets/miq_source/pengenalan_0.png',
        type: 'image',
        size: 1382767,
      },
    ],
    referenceMaterials: [
      {
        title: 'Riwayat al-Baihaqi — Hadis Konsep Itqan dalam Pekerjaan',
        source: 'Portal Rasmi M-IQ Politeknik Ungku Omar',
        url: `${GOOGLE_SITES_BASE}/pengenalan`,
      },
    ],
  },
  {
    id: 'miq-fasa',
    moduleId: 'pengenalan-miq',
    subModuleId: 'sub-pengenalan-teras',
    title: 'Fasa M-IQ: Penerapan Nilai Itqan dalam Pelaksanaan Tugasan',
    summary: 'Kerja Berkualiti, Hasil Terbaik, Amanah Dijaga — Lima fasa pelaksanaan tugasan M-IQ.',
    order: 2,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>PENERAPAN NILAI ITQAN DALAM PELAKSANAAN TUGASAN (M-IQ)</h2>',
      '<p><em>"Kerja Berkualiti, Hasil Terbaik, Amanah Dijaga."</em></p>',
      '<ol>',
      '<li><strong>1. PEMIKIRAN ITQAN:</strong> Fahami tujuan dan keperluan tugasan. Fikir secara kritikal dan kreatif untuk mencari penyelesaian terbaik.</li>',
      '<li><strong>2. PERANCANGAN BERSTRATEGI:</strong> Rancang langkah, tetapkan sasaran dan keutamaan. Gunakan sumber secara optimum.</li>',
      '<li><strong>3. PELAKSANAAN:</strong> Laksanakan tugasan dengan disiplin, teliti dan mengikut perancangan. Utamakan kualiti dalam setiap tindakan.</li>',
      '<li><strong>4. SEMAKAN DAN PENAMBAHBAIKAN:</strong> Semak hasil kerja, kenal pasti kelemahan dan lakukan penambahbaikan secara berterusan.</li>',
      '<li><strong>5. PENGHANTARAN TUGASAN:</strong> Hantar tugasan tepat pada masa dengan hasil terbaik dan dokumentasi lengkap.</li>',
      '</ol>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman Fasa M-IQ (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/fasa-m-iq`,
      },
    ],
    attachments: [
      {
        name: 'Infografik Fasa M-IQ.png',
        url: '/src/assets/miq_source/fasa-m-iq_0.png',
        type: 'image',
        size: 1639359,
      },
    ],
    referenceMaterials: [
      {
        title: 'Fasa M-IQ: Penerapan Nilai Itqan dalam Pelaksanaan Tugasan',
        source: 'Google Sites M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/fasa-m-iq`,
      },
    ],
  },
  {
    id: 'miq-etika-adab',
    moduleId: 'pengenalan-miq',
    subModuleId: 'sub-pengenalan-adab-inspirasi',
    title: 'Etika dan Adab Menuntut Ilmu (Adab di Dalam Kelas)',
    summary:
      'Ilmu Disemai, Adab Dihayati — Panduan etika dan adab pelajar Politeknik Malaysia Ungku Omar di dalam kelas.',
    order: 3,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>ETIKA DAN ADAB MENUNTUT ILMU</h2>',
      '<h3>ADAB DI DALAM KELAS — "Ilmu Disemai, Adab Dihayati"</h3>',
      '<p>Kementerian Pendidikan Tinggi · Jabatan Pendidikan Politeknik dan Kolej Komuniti · Politeknik Malaysia Ungku Omar (Kursus MPU21072 Penghayatan Etika dan Peradaban)</p>',
      '<ol>',
      '<li><strong>1. Niat dan Fokus Belajar:</strong> Hadir ke kelas dengan niat menimba ilmu dan memperbaiki diri. Tumpukan perhatian pada pengajaran dan pembelajaran (PdP), bukan sekadar markah atau keputusan.</li>',
      '<li><strong>2. Hormat dan Sedia Membantu:</strong> Hormati pensyarah dan rakan sekelas setiap masa. Sedia membantu sama ada kepada pensyarah atau rakan tanpa diminta. Sikap hormat dan tolong-menolong mewujudkan suasana pembelajaran yang harmoni.</li>',
      '<li><strong>3. Tutur Kata dan Sikap Positif:</strong> Bertutur dengan bahasa yang sopan dan nada suara yang terkawal. Elakkan sindiran, ejekan atau percakapan yang mengganggu suasana belajar.</li>',
      '<li><strong>4. Disiplin dan Tanggungjawab:</strong> Hadir tepat pada waktunya, laksanakan tugasan dengan penuh amanah serta mematuhi etika pemakaian yang telah ditetapkan. Nilai disiplin dan tanggungjawab mencerminkan keperibadian pelajar yang beretika serta berintegriti.</li>',
      '<li><strong>5. Gunakan Teknologi dengan Beretika:</strong> Gunakan teknologi seperti telefon pintar, tablet, laptop atau AI secara berhemah. Manfaatkan teknologi bagi menyokong proses pengajaran dan pembelajaran (PdP) yang berkesan.</li>',
      '<li><strong>6. Jaga Kebersihan dan Kemudahan Kelas:</strong> Pastikan kelas sentiasa bersih dan teratur selepas digunakan. Matikan kipas, lampu dan aircond sebelum meninggalkan kelas. Tanggungjawab bersama ini melambangkan nilai adab dan rasa amanah dalam diri pelajar.</li>',
      '</ol>',
      '<blockquote><strong>Pesanan Akhir:</strong> "Adab dijunjung, ilmu disanjung — di sinilah lahir insan terbilang."<br>— Faiz Danial Bin Ruslan, DGU 1B, Sesi 1 2025/2026</blockquote>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman Etika dan Adab Menuntut Ilmu',
        url: `${GOOGLE_SITES_BASE}/etika-dan-adab-menuntut-ilmu`,
      },
    ],
    attachments: [
      {
        name: 'Poster Adab Di Dalam Kelas (MPU21072).png',
        url: '/src/assets/miq_source/etika-dan-adab-menuntut-ilmu_0.png',
        type: 'image',
        size: 2529160,
      },
    ],
    referenceMaterials: [
      {
        title: 'MPU21072 Penghayatan Etika dan Peradaban — Adab Di Dalam Kelas',
        source: 'Politeknik Ungku Omar (Sesi 1 2025/2026)',
        url: `${GOOGLE_SITES_BASE}/etika-dan-adab-menuntut-ilmu`,
      },
    ],
  },
  {
    id: 'miq-inspirasi-lagu',
    moduleId: 'pengenalan-miq',
    subModuleId: 'sub-pengenalan-adab-inspirasi',
    title: 'Inspirasi Lagu M-IQ (ITQAN.mp4)',
    summary: 'Tayangan video lagu inspirasi Mindset Itqan (ITQAN.mp4) daripada laman rasmi M-IQ.',
    order: 4,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>INSPIRASI LAGU M-IQ</h2>',
      '<p>Saksikan video lagu inspirasi <strong>ITQAN.mp4</strong> di bawah bagi menghayati semangat kerja bersungguh-sungguh, ketelitian, integriti dan nilai Itqan dalam pelaksanaan setiap tugasan akademik.</p>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Video Inspirasi Lagu M-IQ (ITQAN.mp4)',
        url: ITQAN_VIDEO_PREVIEW_URL,
      },
      {
        label: 'Laman Inspirasi Lagu M-IQ (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/inspirasi-lagu-m-iq`,
      },
    ],
    attachments: [],
    referenceMaterials: [
      {
        title: 'ITQAN.mp4 — Inspirasi Lagu M-IQ',
        source: 'Google Sites Mindset Itqan (PUO)',
        url: `${GOOGLE_SITES_BASE}/inspirasi-lagu-m-iq`,
      },
    ],
  },
  {
    id: 'miq-1-pemikiran-itqan',
    moduleId: 'pemikiran-itqan',
    subModuleId: 'sub-pemikiran-teras',
    title: '1. Pemikiran Itqan',
    summary: 'Membentuk asas pemikiran berkualiti sebelum melaksanakan tugasan.',
    order: 1,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>1. PEMIKIRAN ITQAN</h2>',
      '<p><strong>Membentuk asas pemikiran berkualiti sebelum melaksanakan tugasan.</strong></p>',
      '<ul>',
      '<li><strong>Fahami makna itqan:</strong> Memahami bahawa itqan merujuk kepada kesungguhan, ketelitian dan usaha menghasilkan kerja yang berkualiti tinggi serta memenuhi standard yang ditetapkan. Ia menjadi asas penting untuk memastikan setiap tugasan disempurnakan dengan sebaik mungkin.</li>',
      '<li><strong>Tetapkan niat dan tanggungjawab:</strong> Melaksanakan tugasan dengan niat yang betul, penuh amanah dan rasa tanggungjawab bagi memastikan setiap hasil kerja memberi manfaat serta mencapai objektif yang ditetapkan. Niat yang ikhlas akan mendorong kita untuk sentiasa berusaha melakukan yang terbaik.</li>',
      '<li><strong>Bentuk pemikiran cemerlang:</strong> Melihat tugasan bukan sekadar untuk memperoleh markah, tetapi sebagai latihan membina disiplin, ketekunan, profesionalisme dan amanah dalam menuntut serta mengaplikasikan ilmu. Pemikiran ini melahirkan individu yang berkualiti dan boleh dipercayai dalam apa jua bidang.</li>',
      '</ul>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman 1. Pemikiran Itqan (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/1-pemikiran-itqan`,
      },
    ],
    attachments: [
      {
        name: 'Infografik 1. Pemikiran Itqan.png',
        url: '/src/assets/miq_source/1-pemikiran-itqan_0.png',
        type: 'image',
        size: 1120066,
      },
    ],
    referenceMaterials: [
      {
        title: 'Modul 1: Pemikiran Itqan',
        source: 'Portal Rasmi M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/1-pemikiran-itqan`,
      },
    ],
  },
  {
    id: 'miq-2-perancangan-utama',
    moduleId: 'perancangan-berstrategi',
    subModuleId: 'sub-perancangan-teras',
    title: '2. Perancangan Berstrategi',
    summary:
      'Merancang tugasan, mengagihkan peranan kumpulan secara adil dan mengurus masa dengan teratur.',
    order: 1,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>2. PERANCANGAN BERSTRATEGI</h2>',
      '<ul>',
      '<li><strong>Merancang tugasan dan jadual kerja dengan teliti.</strong> Menetapkan objektif yang jelas serta menyusun peringkat kerja dan jadual secara sistematik bagi memastikan setiap tugasan dilaksanakan mengikut keutamaan dan tempoh yang ditetapkan.</li>',
      '<li><strong>Membahagikan peranan ahli kumpulan secara adil.</strong> Mengenal pasti kekuatan dan kebolehan setiap ahli kumpulan untuk melantik peranan yang sesuai agar kerjasama lebih berkesan dan semua pihak dapat menyumbang secara optimum.</li>',
      '<li><strong>Perancangan yang teratur dan pengurusan masa yang baik, bukan melaksanakan tugasan tergesa-gesa di saat akhir.</strong> Mengurus masa dengan bijak bagi mengelakkan kelewatan, mengurangi tekanan dan memastikan hasil kerja yang berkualiti serta mencapai objektif yang ditetapkan.</li>',
      '</ul>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman 2. Perancangan Berstrategi (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/2-perancangan-berstrategi`,
      },
    ],
    attachments: [
      {
        name: 'Infografik 2. Perancangan Berstrategi.png',
        url: '/src/assets/miq_source/2-perancangan-berstrategi_0.png',
        type: 'image',
        size: 1007857,
      },
    ],
    referenceMaterials: [
      {
        title: 'Modul 2: Perancangan Berstrategi',
        source: 'Portal Rasmi M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/2-perancangan-berstrategi`,
      },
    ],
  },
  {
    id: 'miq-2-checklist-awal',
    moduleId: 'perancangan-berstrategi',
    subModuleId: 'sub-perancangan-teras',
    title: 'Persediaan Sebelum Melaksanakan Tugasan (Checklist Awal)',
    summary:
      'Panduan sebelum pelaksanaan tugasan — Enam perkara penting yang perlu dilengkapkan pelajar sebelum memulakan tugasan.',
    order: 2,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>PERSEDIAAN SEBELUM MELAKSANAKAN TUGASAN</h2>',
      '<h3>PANDUAN SEBELUM PELAKSANAAN TUGASAN</h3>',
      '<p><strong>PASTIKAN ANDA TELAH MELENGKAPKAN PERKARA BERIKUT:</strong></p>',
      '<ol>',
      '<li><strong>Saya memahami kehendak tugasan.</strong><br>Pastikan anda benar-benar memahami apa yang dikehendaki dalam tugasan bagi mengelakkan salah faham dan memastikan hasil yang berkualiti.</li>',
      '<li><strong>Saya telah membaca dan memahami rubrik penilaian.</strong><br>Baca rubrik penilaian dengan teliti supaya anda tahu kriteria yang akan dinilai dan dapat menghasilkan tugasan yang menepati jangkaan.</li>',
      '<li><strong>Saya telah menetapkan objektif tugasan dengan jelas.</strong><br>Tentukan objektif tugasan dengan jelas agar anda mempunyai hala tuju yang tepat semasa merancang dan melaksanakan tugasan.</li>',
      '<li><strong>Saya mengetahui tarikh dan masa penghantaran tugasan.</strong><br>Ambil perhatian tarikh dan masa akhir penghantaran untuk mengelakkan kelewatan dan memastikan tugasan dihantar tepat pada masanya.</li>',
      '<li><strong>Saya telah menyediakan jadual kerja yang realistik.</strong><br>Rancang jadual kerja yang realistik bagi memastikan anda mempunyai masa yang mencukupi untuk menyiapkan tugasan dengan berkualiti.</li>',
      '<li><strong>Saya telah membahagikan tugasan kepada setiap ahli kumpulan (jika tugasan berkumpulan).</strong><br>Pastikan setiap ahli kumpulan memahami peranan dan tanggungjawab masing-masing.</li>',
      '</ol>',
      '<blockquote><strong>INGAT!</strong> Perancangan yang baik hari ini membawa kejayaan esok hari.</blockquote>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman Checklist Awal (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/2-perancangan-berstrategi/checklist-awal`,
      },
    ],
    attachments: [
      {
        name: 'Infografik Panduan Sebelum Pelaksanaan Tugasan (Checklist Awal).png',
        url: '/src/assets/miq_source/2-perancangan-berstrategi__checklist-awal_0.png',
        type: 'image',
        size: 1663686,
      },
    ],
    referenceMaterials: [
      {
        title: 'Panduan Sebelum Pelaksanaan Tugasan (Checklist Awal)',
        source: 'Portal Rasmi M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/2-perancangan-berstrategi/checklist-awal`,
      },
    ],
  },
  {
    id: 'miq-2-tips-prompt',
    moduleId: 'perancangan-berstrategi',
    subModuleId: 'sub-perancangan-teras',
    title: 'Tips Membina Prompt yang Berkualiti',
    summary:
      'Prompt yang jelas, lengkap dan spesifik membantu AI Generatif menghasilkan jawapan yang lebih tepat, relevan dan berkualiti.',
    order: 3,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>TIPS MEMBINA PROMPT YANG BERKUALITI</h2>',
      '<p>Prompt yang <strong>jelas</strong>, <strong>lengkap</strong> dan <strong>spesifik</strong> membantu AI Generatif menghasilkan jawapan yang lebih tepat, relevan dan berkualiti.</p>',
      '<ol>',
      '<li><strong>Nyatakan tugasan dengan jelas</strong><br>Terangkan secara spesifik perkara yang anda ingin AI Generatif lakukan. Tugasan yang dinyatakan dengan jelas akan membantu AI memahami kehendak anda dengan lebih tepat dan menghasilkan jawapan yang sesuai dengan keperluan.<br><em>Contoh:</em> Huraikan faktor defisit sosial dan kesannya terhadap perpaduan dalam kalangan rakyat Malaysia.</li>',
      '<li><strong>Berikan konteks tugasan</strong><br>Sertakan maklumat seperti kursus, tahap pengajian, tujuan tugasan atau sasaran pembaca. Konteks yang jelas membolehkan AI memberikan jawapan yang lebih relevan dengan situasi dan keperluan anda.<br><em>Contoh:</em> Tugasan ini ialah e-Folio bagi Kursus Penghayatan Etika dan Peradaban untuk pelajar Semester 2 Politeknik.</li>',
      '<li><strong>Nyatakan format yang dikehendaki</strong><br>Jelaskan bentuk jawapan yang diperlukan seperti esei, jadual, poin utama, infografik atau pembentangan. Dengan format yang jelas, AI dapat menghasilkan jawapan dalam bentuk yang anda inginkan.<br><em>Contoh:</em> Hasilkan dalam bentuk pendahuluan, empat isi utama berserta contoh, kesimpulan dan rujukan.</li>',
      '<li><strong>Nyatakan keperluan atau kriteria</strong><br>Nyatakan syarat yang perlu dipatuhi seperti penggunaan Bahasa Melayu formal, bilangan rujukan, had perkataan atau format penulisan. Kriteria yang jelas membantu AI memberikan jawapan yang memenuhi kehendak tugasan.<br><em>Contoh:</em> Gunakan Bahasa Melayu formal, sertakan sekurang-kurangnya 5 rujukan akademik terkini dan elakkan maklumat yang tidak sahih.</li>',
      '<li><strong>Semak dan sahkan maklumat</strong><br>Jangan terus menggunakan hasil AI Generatif. Semak dan sahkan fakta daripada sumber yang berautoriti sebelum digunakan dalam tugasan. Ini memastikan maklumat yang digunakan tepat, sahih dan boleh dipercayai.<br><em>Contoh:</em> Maklumat tentang dasar kerajaan terkini perlu disahkan daripada laman web rasmi .gov.my atau dokumen rasmi kerajaan.</li>',
      '</ol>',
      '<h3>Semak dengan Sumber Berautoriti</h3>',
      '<ul>',
      '<li>Buku akademik</li>',
      '<li>Artikel jurnal</li>',
      '<li>Portal kerajaan (.gov.my)</li>',
      '<li>Laman web institusi pengajian tinggi (.edu / .edu.my)</li>',
      '<li>Organisasi antarabangsa (UNESCO, WHO dan lain-lain)</li>',
      '</ul>',
      '<blockquote>Amalkan itqan dalam setiap langkah: rancang dengan teliti, gunakan AI secara bertanggungjawab dan hasilkan tugasan yang berkualiti.</blockquote>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman Tips Membina Prompt (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/2-perancangan-berstrategi/tips-membina-prompt`,
      },
    ],
    attachments: [
      {
        name: 'Infografik Tips Membina Prompt yang Berkualiti.png',
        url: '/src/assets/miq_source/2-perancangan-berstrategi__tips-membina-prompt_0.png',
        type: 'image',
        size: 1671723,
      },
    ],
    referenceMaterials: [
      {
        title: 'Tips Membina Prompt yang Berkualiti',
        source: 'Portal Rasmi M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/2-perancangan-berstrategi/tips-membina-prompt`,
      },
    ],
  },
  {
    id: 'miq-3-pelaksanaan-utama',
    moduleId: 'pelaksanaan',
    subModuleId: 'sub-pelaksanaan-teras',
    title: '3. Pelaksanaan',
    summary:
      'Melaksanakan tugasan dengan carian maklumat tepat, bimbingan pensyarah, sokongan AI beretika dan pematuhan rubrik.',
    order: 1,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>3. PELAKSANAAN</h2>',
      '<ul>',
      '<li><strong>Membuat carian dan menganalisis maklumat</strong> daripada pelbagai sumber yang relevan bagi memastikan maklumat yang diperoleh tepat, sahih dan menyokong keperluan tugasan.</li>',
      '<li><strong>Perbincangan dengan pensyarah.</strong> Mendapatkan pandangan, bimbingan dan maklum balas daripada pensyarah untuk memperjelas kefahaman dan memastikan hala tuju tugasan adalah betul.</li>',
      '<li><strong>Menggunakan AI hanya sebagai alat sokongan</strong> untuk menjana idea dan membantu membina struktur tugasan, bukan sebagai pengganti pemikiran kritis dan kreativiti sendiri.</li>',
      '<li><strong>Melaksanakan tugasan mengikut garis panduan,</strong> arahan dan rubrik yang ditetapkan bagi memastikan kualiti tugasan memenuhi piawaian yang dikehendaki.</li>',
      '</ul>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman 3. Pelaksanaan (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/3-pelaksanaan`,
      },
    ],
    attachments: [
      {
        name: 'Infografik 3. Pelaksanaan.png',
        url: '/src/assets/miq_source/3-pelaksanaan_0.png',
        type: 'image',
        size: 999245,
      },
    ],
    referenceMaterials: [
      {
        title: 'Modul 3: Pelaksanaan',
        source: 'Portal Rasmi M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/3-pelaksanaan`,
      },
    ],
  },
  {
    id: 'miq-3-panduan-ai',
    moduleId: 'pelaksanaan',
    subModuleId: 'sub-pelaksanaan-teras',
    title: 'Panduan Penggunaan AI Generatif: Cara Bijak Menggunakan AI dalam Tugasan',
    summary: '5 Langkah untuk Tugasan Berkualiti & Berintegriti menggunakan AI Generatif secara bijak.',
    order: 2,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>PANDUAN PENGGUNAAN AI GENERATIF</h2>',
      '<h3>M-IQ (Mindset Itqan): Cara Bijak Menggunakan AI Dalam Tugasan — 5 Langkah untuk Tugasan Berkualiti &amp; Berintegriti</h3>',
      '<p>M-IQ (Mindset Itqan) ialah pendekatan dan panduan untuk membantu pelajar menyiapkan tugasan dengan bersungguh-sungguh, teliti dan beretika dengan bantuan AI.</p>',
      '<p><strong>Apa itu Itqan?</strong> Itqan bermaksud melakukan sesuatu pekerjaan dengan sungguh-sungguh, teliti, berkualiti dan penuh tanggungjawab kerana Allah SWT.</p>',
      '<blockquote><strong>INGAT!</strong> Jangan terus tanya AI tanpa faham soalan.</blockquote>',
      '<ol>',
      '<li><strong>1. FAHAMI TUGASAN</strong><ul><li>Baca arahan pensyarah dengan teliti.</li><li>Faham kehendak tugasan.</li><li>Kenal pasti topik, skop dan format.</li></ul></li>',
      '<li><strong>2. RANCANG KERJA</strong><ul><li>Bahagikan tugasan (jika berkumpulan).</li><li>Buat jadual / timeline.</li><li>Kumpul sumber rujukan.</li><li>Gunakan AI untuk: mencari idea awal, cadangan isi dan memahami konsep.</li></ul></li>',
      '<li><strong>3. GUNAKAN AI DENGAN BIJAK</strong><br><strong>AI Boleh Digunakan Untuk:</strong><ul><li>Memahami topik</li><li>Mencari kata kunci</li><li>Menyusun idea</li><li>Membantu semakan bahasa</li></ul><strong>AI Tidak Boleh:</strong><ul><li>Menyiapkan tugasan sepenuhnya</li><li>Digunakan untuk copy-paste</li><li>Dijadikan sumber tanpa semakan</li></ul></li>',
      '<li><strong>4. SEMAK &amp; TAMBAH BAIK</strong><ul><li>Semak fakta dan kesahihan maklumat.</li><li>Semak rujukan dan format.</li><li>Semak bahasa dan tatabahasa.</li><li>Pastikan isi tugasan jelas dan logik.</li></ul><p><em>Maklumat AI tidak semestinya betul. Semakan anda sangat penting!</em></p></li>',
      '<li><strong>5. HANTAR TUGASAN BERKUALITI</strong><ul><li>Pastikan tugasan hasil kefahaman sendiri.</li><li>Lengkap, kemas dan ikut kehendak.</li><li>Bertanggungjawab dan berintegriti.</li></ul></li>',
      '</ol>',
      '<h3>Contoh Penggunaan AI</h3>',
      '<ul>',
      '<li><strong>BETUL:</strong> "Bantu saya faham topik dan cadangkan isi penting."</li>',
      '<li><strong>SALAH:</strong> "ChatGPT, buat assignment saya."</li>',
      '</ul>',
      '<h3>Checklist Sebelum Hantar</h3>',
      '<ul>',
      '<li>Saya memahami tugasan.</li>',
      '<li>Saya menggunakan AI secara terkawal.</li>',
      '<li>Saya menyemak maklumat AI.</li>',
      '<li>Saya membuat penambahbaikan sendiri.</li>',
      '<li>Tugasan ini hasil kefahaman saya.</li>',
      '</ul>',
      '<h3>Nilai M-IQ (Mindset Itqan)</h3>',
      '<ul>',
      '<li>Teliti</li>',
      '<li>Bertanggungjawab</li>',
      '<li>Berintegriti</li>',
      '<li>Berusaha bersungguh-sungguh</li>',
      '<li>Menggunakan AI secara beretika</li>',
      '</ul>',
      '<blockquote>Tugasan Berkualiti · Refleksi Pelajar Berintegriti Tinggi.<br><strong>INGAT!</strong> AI membantu pembelajaran, tetapi TIDAK menggantikan usaha dan pemikiran anda.<br><strong>GUNAKAN AI DENGAN BIJAK, BUKAN BERGANTUNG SEPENUHNYA.</strong></blockquote>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman Panduan Penggunaan AI Generatif (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/3-pelaksanaan/panduan-penggunaan-ai-generatif`,
      },
    ],
    attachments: [
      {
        name: 'Infografik Cara Bijak Menggunakan AI Dalam Tugasan.jpg',
        url: '/src/assets/miq_source/3-pelaksanaan__panduan-penggunaan-ai-generatif_0.jpg',
        type: 'image',
        size: 284207,
      },
    ],
    referenceMaterials: [
      {
        title: 'Panduan Penggunaan AI Generatif (5 Langkah M-IQ)',
        source: 'Portal Rasmi M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/3-pelaksanaan/panduan-penggunaan-ai-generatif`,
      },
    ],
  },
  {
    id: 'miq-4-semakan-utama',
    moduleId: 'semakan-penambahbaikan',
    subModuleId: 'sub-semakan-teras',
    title: '4. Semakan dan Penambahbaikan',
    summary:
      'Peer review, perbincangan dengan pensyarah, melaksanakan penambahbaikan dan semakan senarai semak.',
    order: 1,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>4. Semakan dan Penambahbaikan</h2>',
      '<ul>',
      '<li><strong>Peer review dan maklumbalas rakan kumpulan.</strong> Menilai hasil kerja secara objektif dengan mengambil kira pandangan dan cadangan rakan kumpulan untuk mengenal pasti aspek yang boleh diperbaiki.</li>',
      '<li><strong>Perbincangan dengan pensyarah.</strong> Mendapatkan maklum balas, bimbingan dan pandangan daripada pensyarah bagi memastikan penambahbaikan dilakukan berpandukan kehendak tugasan.</li>',
      '<li><strong>Membuat penambahbaikan.</strong> Melaksanakan pembetulan dan penambahbaikan berdasarkan maklum balas yang diterima bagi meningkatkan kualiti hasil kerja supaya lebih lengkap, tepat dan meyakinkan.</li>',
      '<li><strong>Gunakan senarai semak.</strong> Menyemak semula tugasan menggunakan senarai semak bagi memastikan semua kriteria dan arahan telah dipatuhi sebelum menghantar tugasan.</li>',
      '</ul>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman 4. Semakan dan Penambahbaikan (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/4-semakan-dan-penambahbaikan`,
      },
    ],
    attachments: [
      {
        name: 'Infografik 4. Semakan dan Penambahbaikan.png',
        url: '/src/assets/miq_source/4-semakan-dan-penambahbaikan_0.png',
        type: 'image',
        size: 1063285,
      },
    ],
    referenceMaterials: [
      {
        title: 'Modul 4: Semakan dan Penambahbaikan',
        source: 'Portal Rasmi M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/4-semakan-dan-penambahbaikan`,
      },
    ],
  },
  {
    id: 'miq-4-borang-pertemuan',
    moduleId: 'semakan-penambahbaikan',
    subModuleId: 'sub-semakan-teras',
    title: 'Borang Pertemuan Pensyarah',
    summary:
      'Rekod rasmi pertemuan dan bimbingan pensyarah bagi perbincangan tugasan, semakan draf dan bimbingan AI.',
    order: 2,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>BORANG PERTEMUAN PENSYARAH</h2>',
      '<p>Boleh muat turun Borang Pertemuan Pensyarah pada pautan Google Drive rasmi di bahagian Pautan Luar di bawah.</p>',
      '<h3>Maklumat dalam Borang Pertemuan Pensyarah</h3>',
      '<ul>',
      '<li><strong>Nama Pelajar / Nama ahli kumpulan</strong></li>',
      '<li><strong>No. Pendaftaran</strong></li>',
      '<li><strong>Kelas / Program</strong></li>',
      '<li><strong>Kursus</strong></li>',
      '<li><strong>Tarikh &amp; Masa</strong></li>',
      '<li><strong>Tempat / Medium</strong></li>',
      '<li><strong>Tujuan Pertemuan:</strong> Perbincangan tugasan · Semakan draf · Bimbingan AI · Isu kefahaman · Lain-lain</li>',
      '<li><strong>Ringkasan Perbincangan</strong></li>',
      '<li><strong>Tindakan Susulan Pelajar</strong></li>',
      '<li><strong>Pengesahan:</strong> Nama Pensyarah, Tandatangan, Tarikh</li>',
      '</ul>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Muat Turun Borang Pertemuan Pensyarah (Google Drive)',
        url: DRIVE_FOLDER_URL,
      },
      {
        label: 'Laman Borang Pertemuan Pensyarah (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/4-semakan-dan-penambahbaikan/borang-pertemuan-pensyarah`,
      },
    ],
    attachments: [
      {
        name: 'Templat Borang Pertemuan Pensyarah.png',
        url: '/src/assets/miq_source/4-semakan-dan-penambahbaikan__borang-pertemuan-pensyarah_0.png',
        type: 'image',
        size: 2329795,
      },
    ],
    referenceMaterials: [
      {
        title: 'Borang Pertemuan Pensyarah M-IQ',
        source: 'Folder Google Drive Rasmi M-IQ PUO',
        url: DRIVE_FOLDER_URL,
      },
    ],
  },
  {
    id: 'miq-5-penghantaran-utama',
    moduleId: 'penghantaran',
    subModuleId: 'sub-penghantaran-teras',
    title: '5. Penghantaran Tugasan',
    summary: 'Hantar tepat masa dan sertakan senarai semak tugasan yang lengkap.',
    order: 1,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>5. Penghantaran tugasan</h2>',
      '<ul>',
      '<li><strong>Hantar tepat masa.</strong> Pastikan tugasan dihantar mengikut tarikh dan masa yang ditetapkan bagi memastikan pematuhan kepada keperluan kursus serta kelancaran proses penilaian.</li>',
      '<li><strong>Sertakan senarai semak tugasan.</strong> Gunakan senarai semak untuk memastikan semua keperluan, dokumen dan kriteria penilaian telah dipenuhi dengan lengkap sebelum tugasan dihantar.</li>',
      '</ul>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman 5. Penghantaran Tugasan (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/5-penghantaran-tugasan`,
      },
    ],
    attachments: [
      {
        name: 'Infografik 5. Penghantaran Tugasan.png',
        url: '/src/assets/miq_source/5-penghantaran-tugasan_0.png',
        type: 'image',
        size: 949080,
      },
    ],
    referenceMaterials: [
      {
        title: 'Modul 5: Penghantaran Tugasan',
        source: 'Portal Rasmi M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/5-penghantaran-tugasan`,
      },
    ],
  },
  {
    id: 'miq-5-instrumen-kendiri',
    moduleId: 'penghantaran',
    subModuleId: 'sub-penghantaran-teras',
    title: 'Instrumen Semakan Kendiri Penggunaan AI Generatif',
    summary:
      'Gunakan AI Secara Bertanggungjawab, Hasil Tugasan Berkualiti — Enam pernyataan semakan dan akuan pelajar sebelum penghantaran.',
    order: 2,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>INSTRUMEN SEMAKAN KENDIRI PENGGUNAAN AI GENERATIF</h2>',
      '<p><strong>Gunakan AI Secara Bertanggungjawab, Hasil Tugasan Berkualiti</strong></p>',
      '<p><strong>ARAHAN:</strong> Tandakan (✓) pada setiap pernyataan sebelum tugasan dihantar.</p>',
      '<ol>',
      '<li>Saya menggunakan AI Generatif hanya sebagai alat bantu pembelajaran dan bukan menghasilkan keseluruhan tugasan.</li>',
      '<li>Saya telah menyemak dan mengesahkan ketepatan fakta, data serta maklumat yang dijana oleh AI Generatif.</li>',
      '<li>Saya telah menyemak dan menyunting tugasan bagi memastikan kandungannya tepat, bebas daripada kesalahan bahasa, ejaan dan tatabahasa, disusun dengan kemas serta mengikut format yang telah ditetapkan sebelum dihantar.</li>',
      '<li>Saya telah memastikan sitasi dan rujukan yang digunakan adalah tepat serta mematuhi keperluan tugasan.</li>',
      '<li>Saya telah mengambil tindakan terhadap maklum balas dan pembetulan yang diberikan oleh pensyarah.</li>',
      '<li>Saya telah mematuhi arahan pensyarah berkaitan penggunaan AI Generatif dalam tugasan ini.</li>',
      '</ol>',
      '<h3>AKUAN PELAJAR</h3>',
      '<p>Saya mengaku bahwa maklumat yang dinyatakan adalah benar dan saya bertanggungjawab sepenuhnya terhadap tugasan yang dihantar. Saya memahami bahawa penggunaan AI Generatif haruslah beretika, berintegriti dan mematuhi arahan yang telah ditetapkan.</p>',
      '<p><em>Butiran Akuan:</em> Nama · No. Pendaftaran · Tandatangan · Tarikh</p>',
      '<blockquote><strong>NOTA:</strong> Instrumen ini bertujuan membantu anda menggunakan AI Generatif secara bertanggungjawab. Gunakan secara beretika, hasilkan tugasan yang asli, berkualiti dan berintegriti.</blockquote>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Muat Turun Instrumen Semakan Kendiri (Google Drive)',
        url: DRIVE_FOLDER_URL,
      },
      {
        label: 'Laman Instrumen Semakan Kendiri (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/5-penghantaran-tugasan/instrumen-semakan-kendiri`,
      },
    ],
    attachments: [
      {
        name: 'Infografik Instrumen Semakan Kendiri Penggunaan AI Generatif.png',
        url: '/src/assets/miq_source/5-penghantaran-tugasan__instrumen-semakan-kendiri_0.png',
        type: 'image',
        size: 1404100,
      },
    ],
    referenceMaterials: [
      {
        title: 'Instrumen Semakan Kendiri Penggunaan AI Generatif',
        source: 'Folder Google Drive Rasmi M-IQ PUO',
        url: DRIVE_FOLDER_URL,
      },
    ],
  },
  {
    id: 'miq-info-ai-generatif',
    moduleId: 'panduan-ai-generatif',
    subModuleId: 'sub-ai-panduan',
    title: 'Info AI Generatif (Generative Artificial Intelligence)',
    summary:
      'Definisi, cara kerja, contoh aplikasi, jenis kandungan dan prinsip penggunaan AI Generatif yang bertanggungjawab.',
    order: 1,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>AI GENERATIF (Generative Artificial Intelligence)</h2>',
      '<p>AI Generatif ialah teknologi kecerdasan buatan yang berupaya menjana kandungan baharu seperti teks, imej, audio, video atau kod komputer berdasarkan arahan (<em>prompt</em>) yang diberikan oleh pengguna.</p>',
      '<h3>Bagaimana AI Generatif Berfungsi?</h3>',
      '<ol>',
      '<li><strong>1. ARAHAN (PROMPT):</strong> Pengguna memberikan arahan atau soalan kepada AI.</li>',
      '<li><strong>2. PROSES AI:</strong> AI menganalisis arahan dan menggunakan model serta data yang luas.</li>',
      '<li><strong>3. JANA KANDUNGAN:</strong> AI menjana kandungan baharu yang relevan berdasarkan arahan.</li>',
      '<li><strong>4. SEMAK &amp; NILAI:</strong> Pengguna menyemak, menilai dan menggunakan hasil dengan bijak.</li>',
      '</ol>',
      '<h3>Contoh Aplikasi AI Generatif (Contoh-Contoh Sahaja)</h3>',
      '<p>ChatGPT · Gemini · Copilot · Claude · DeepSeek</p>',
      '<h3>Jenis Kandungan yang Boleh Dijana</h3>',
      '<ul>',
      '<li><strong>TEKS:</strong> artikel, esei, ringkasan, draf laporan</li>',
      '<li><strong>IMEJ:</strong> ilustrasi, reka bentuk, poster</li>',
      '<li><strong>AUDIO:</strong> narasi, muzik, rakaman suara, podcast</li>',
      '<li><strong>VIDEO:</strong> klip video, animasi, suntingan</li>',
      '<li><strong>KOD KOMPUTER:</strong> program, formula, skrip, laman web</li>',
      '</ul>',
      '<h3>Penggunaan AI Generatif yang Bertanggungjawab</h3>',
      '<ul>',
      '<li>Gunakan secara beretika dan berintegriti.</li>',
      '<li>Semak dan sahihkan maklumat yang dijana.</li>',
      '<li>Jangan meniru atau menyalin sepenuhnya hasil AI.</li>',
      '<li>Nyatakan sumber AI jika kandungan digunakan.</li>',
      '<li>Gunakan sebagai alat sokongan, bukan pengganti usaha sendiri.</li>',
      '</ul>',
      '<blockquote><strong>INGAT!</strong> AI Generatif ialah ALAT, bukan pengganti. Kualiti hasil bergantung pada cara kita menggunakannya dengan KESUNGGUHAN, KETELITIAN dan TANGGUNGJAWAB.<br><br>"Gunakan AI Generatif dengan bijak, beretika dan berintegriti untuk meningkatkan kualiti pembelajaran."</blockquote>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman Info AI Generatif (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/info-ai-generatif`,
      },
    ],
    attachments: [
      {
        name: 'Infografik Info AI Generatif.png',
        url: '/src/assets/miq_source/info-ai-generatif_0.png',
        type: 'image',
        size: 1200402,
      },
    ],
    referenceMaterials: [
      {
        title: 'Info AI Generatif (Generative Artificial Intelligence)',
        source: 'Portal Rasmi M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/info-ai-generatif`,
      },
    ],
  },
  {
    id: 'miq-ai-panduan-penggunaan',
    moduleId: 'panduan-ai-generatif',
    subModuleId: 'sub-ai-panduan',
    title: 'Cara Bijak Menggunakan AI dalam Tugasan (5 Langkah M-IQ)',
    summary: 'Panduan penggunaan AI Generatif secara beretika, terkawal dan berintegriti dalam tugasan.',
    order: 2,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>CARA BIJAK MENGGUNAKAN AI DALAM TUGASAN</h2>',
      '<p>5 Langkah untuk Tugasan Berkualiti &amp; Berintegriti berpandukan Mindset Itqan:</p>',
      '<ol>',
      '<li><strong>Fahami Tugasan:</strong> Baca arahan pensyarah dengan teliti, faham kehendak tugasan serta kenal pasti topik, skop dan format.</li>',
      '<li><strong>Rancang Kerja:</strong> Bahagikan tugasan (jika berkumpulan), buat jadual / timeline dan kumpul sumber rujukan. Gunakan AI untuk mencari idea awal, cadangan isi dan memahami konsep.</li>',
      '<li><strong>Gunakan AI dengan Bijak:</strong> AI boleh digunakan untuk memahami topik, mencari kata kunci, menyusun idea dan membantu semakan bahasa. AI tidak boleh digunakan untuk menyiapkan tugasan sepenuhnya, copy-paste atau dijadikan sumber tanpa semakan.</li>',
      '<li><strong>Semak &amp; Tambah Baik:</strong> Semak fakta dan kesahihan maklumat, rujukan dan format, bahasa dan tatabahasa serta pastikan isi tugasan jelas dan logik.</li>',
      '<li><strong>Hantar Tugasan Berkualiti:</strong> Pastikan tugasan hasil kefahaman sendiri, lengkap, kemas dan ikut kehendak, serta bertanggungjawab dan berintegriti.</li>',
      '</ol>',
      '<blockquote><strong>Contoh Penggunaan AI:</strong><br><strong>BETUL:</strong> "Bantu saya faham topik dan cadangkan isi penting."<br><strong>SALAH:</strong> "ChatGPT, buat assignment saya."</blockquote>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman Panduan Penggunaan AI Generatif (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/3-pelaksanaan/panduan-penggunaan-ai-generatif`,
      },
    ],
    attachments: [
      {
        name: 'Infografik Cara Bijak Menggunakan AI Dalam Tugasan.jpg',
        url: '/src/assets/miq_source/3-pelaksanaan__panduan-penggunaan-ai-generatif_0.jpg',
        type: 'image',
        size: 284207,
      },
    ],
    referenceMaterials: [
      {
        title: 'Cara Bijak Menggunakan AI dalam Tugasan',
        source: 'Portal Rasmi M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/3-pelaksanaan/panduan-penggunaan-ai-generatif`,
      },
    ],
  },
  {
    id: 'miq-ai-tips-prompt',
    moduleId: 'panduan-ai-generatif',
    subModuleId: 'sub-ai-panduan',
    title: 'Tips Membina Prompt yang Berkualiti',
    summary: 'Lima prinsip membina arahan (prompt) AI yang jelas, lengkap, spesifik dan disahkan dengan sumber berautoriti.',
    order: 3,
    status: 'published',
    style: DEFAULT_TOPIC_STYLE,
    content: [
      '<h2>TIPS MEMBINA PROMPT YANG BERKUALITI</h2>',
      '<p>Prompt yang <strong>jelas</strong>, <strong>lengkap</strong> dan <strong>spesifik</strong> membantu AI Generatif menghasilkan jawapan yang lebih tepat, relevan dan berkualiti.</p>',
      '<ol>',
      '<li><strong>Nyatakan tugasan dengan jelas:</strong> Terangkan secara spesifik perkara yang anda ingin AI Generatif lakukan.</li>',
      '<li><strong>Berikan konteks tugasan:</strong> Sertakan maklumat seperti kursus, tahap pengajian, tujuan tugasan atau sasaran pembaca.</li>',
      '<li><strong>Nyatakan format yang dikehendaki:</strong> Jelaskan bentuk jawapan seperti esei, jadual, poin utama, infografik atau pembentangan.</li>',
      '<li><strong>Nyatakan keperluan atau kriteria:</strong> Nyatakan syarat seperti penggunaan Bahasa Melayu formal, bilangan rujukan, had perkataan atau format penulisan.</li>',
      '<li><strong>Semak dan sahkan maklumat:</strong> Semak dan sahkan fakta daripada sumber berautoriti (buku akademik, artikel jurnal, portal kerajaan .gov.my, laman web IPT .edu/.edu.my, organisasi antarabangsa seperti UNESCO dan WHO).</li>',
      '</ol>',
    ].join(''),
    youtubeUrls: [],
    externalLinks: [
      {
        label: 'Laman Tips Membina Prompt (Google Sites)',
        url: `${GOOGLE_SITES_BASE}/2-perancangan-berstrategi/tips-membina-prompt`,
      },
    ],
    attachments: [
      {
        name: 'Infografik Tips Membina Prompt yang Berkualiti.png',
        url: '/src/assets/miq_source/2-perancangan-berstrategi__tips-membina-prompt_0.png',
        type: 'image',
        size: 1671723,
      },
    ],
    referenceMaterials: [
      {
        title: 'Tips Membina Prompt yang Berkualiti',
        source: 'Portal Rasmi M-IQ PUO',
        url: `${GOOGLE_SITES_BASE}/2-perancangan-berstrategi/tips-membina-prompt`,
      },
    ],
  },
];

export const OFFICIAL_CHECKLIST_SEED: ChecklistSeedItem[] = [
  // Fasa 1: Pemikiran Itqan
  {
    id: 'chk-f1-1',
    category: 'Fasa 1: Pemikiran Itqan',
    title: 'Saya menetapkan niat menuntut ilmu dan melaksanakan tugasan dengan ikhlas serta amanah.',
    description:
      'Menghayati bahawa setiap tugasan akademik ialah amanah yang menuntut kesungguhan dan kejujuran.',
    order: 1,
    status: 'published',
  },
  {
    id: 'chk-f1-2',
    category: 'Fasa 1: Pemikiran Itqan',
    title: 'Saya berazam menghasilkan tugasan berkualiti tinggi (Itqan) dan mengelakkan kerja sambil lewa.',
    description:
      'Mengamalkan pemikiran Itqan dalam setiap tindakan daripada mula hingga akhir tugasan.',
    order: 2,
    status: 'published',
  },
  {
    id: 'chk-f1-3',
    category: 'Fasa 1: Pemikiran Itqan',
    title: 'Saya memahami kehendak tugasan serta membaca dan memahami rubrik penilaian dengan teliti.',
    description:
      'Memastikan hala tuju kerja menepati piawaian dan kriteria pensyarah sebelum melaksanakan tugasan.',
    order: 3,
    status: 'published',
  },

  // Fasa 2: Perancangan Berstrategi
  {
    id: 'chk-f2-1',
    category: 'Fasa 2: Perancangan Berstrategi',
    title: 'Saya telah menetapkan objektif tugasan dengan jelas.',
    description:
      'Menentukan matlamat tugasan supaya perancangan isi dan struktur penulisan lebih tersusun.',
    order: 4,
    status: 'published',
  },
  {
    id: 'chk-f2-2',
    category: 'Fasa 2: Perancangan Berstrategi',
    title: 'Saya mengetahui tarikh dan masa penghantaran tugasan serta menyediakan jadual kerja yang realistik.',
    description:
      'Merancang garis masa pelaksanaan lebih awal bagi mengelakkan kerja saat akhir.',
    order: 5,
    status: 'published',
  },
  {
    id: 'chk-f2-3',
    category: 'Fasa 2: Perancangan Berstrategi',
    title: 'Saya telah membahagikan tugasan kepada setiap ahli kumpulan (jika tugasan berkumpulan).',
    description:
      'Memastikan setiap ahli kumpulan memahami peranan dan tanggungjawab masing-masing.',
    order: 6,
    status: 'published',
  },
  {
    id: 'chk-f2-4',
    category: 'Fasa 2: Perancangan Berstrategi',
    title: 'Saya menyediakan rangka isi serta arahan (prompt) AI yang jelas, spesifik dan berfokus.',
    description:
      'Mengaplikasikan tips membina prompt berkualiti dengan konteks kursus, format dan syarat tugasan.',
    order: 7,
    status: 'published',
  },

  // Fasa 3: Pelaksanaan
  {
    id: 'chk-f3-1',
    category: 'Fasa 3: Pelaksanaan',
    title: 'Saya membuat carian maklumat daripada sumber yang sahih dan berautoriti.',
    description:
      'Mengutamakan buku akademik, artikel jurnal, portal kerajaan (.gov.my), laman web IPT (.edu/.edu.my) dan organisasi antarabangsa.',
    order: 8,
    status: 'published',
  },
  {
    id: 'chk-f3-2',
    category: 'Fasa 3: Pelaksanaan',
    title: 'Saya menggunakan AI Generatif hanya sebagai alat bantu pembelajaran dan bukan menghasilkan keseluruhan tugasan.',
    description:
      'Menggunakan AI untuk memahami konsep, kata kunci atau struktur idea sambil mengekalkan penulisan kendiri.',
    order: 9,
    status: 'published',
  },
  {
    id: 'chk-f3-3',
    category: 'Fasa 3: Pelaksanaan',
    title: 'Saya telah menyemak dan mengesahkan ketepatan fakta, data serta maklumat yang dijana oleh AI Generatif.',
    description:
      'Menentusahkan maklumat daripada sumber berautoriti sebelum dimasukkan ke dalam tugasan.',
    order: 10,
    status: 'published',
  },

  // Fasa 4: Semakan dan Penambahbaikan
  {
    id: 'chk-f4-1',
    category: 'Fasa 4: Semakan dan Penambahbaikan',
    title: 'Saya telah melaksanakan semakan rakan sebaya (peer review) dan/atau pertemuan bimbingan bersama pensyarah.',
    description:
      'Merekodkan sesi bimbingan menggunakan Borang Pertemuan Pensyarah bagi membaiki mutu draf tugasan.',
    order: 11,
    status: 'published',
  },
  {
    id: 'chk-f4-2',
    category: 'Fasa 4: Semakan dan Penambahbaikan',
    title: 'Saya telah mengambil tindakan terhadap maklum balas dan pembetulan yang diberikan oleh pensyarah.',
    description:
      'Mengemas kini draf tugasan berdasarkan cadangan penambahbaikan yang diterima.',
    order: 12,
    status: 'published',
  },
  {
    id: 'chk-f4-3',
    category: 'Fasa 4: Semakan dan Penambahbaikan',
    title: 'Saya telah menyemak dan menyunting tugasan bagi memastikan kandungan tepat, bebas kesalahan bahasa, ejaan dan tatabahasa serta mengikut format.',
    description:
      'Meneliti susunan penulisan, kekemasan jadual/rajah dan format dokumen sebelum penghantaran.',
    order: 13,
    status: 'published',
  },

  // Fasa 5: Penghantaran
  {
    id: 'chk-f5-1',
    category: 'Fasa 5: Penghantaran',
    title: 'Saya telah memastikan sitasi dan rujukan yang digunakan adalah tepat serta mematuhi keperluan tugasan.',
    description:
      'Menyatakan sumber rujukan dan pengakuan penggunaan AI secara telus dan berintegriti.',
    order: 14,
    status: 'published',
  },
  {
    id: 'chk-f5-2',
    category: 'Fasa 5: Penghantaran',
    title: 'Saya telah mematuhi arahan pensyarah berkaitan penggunaan AI Generatif dan menyertakan Instrumen Semakan Kendiri.',
    description:
      'Melengkapkan akuan pelajar sebelum menghantar tugasan rasmi.',
    order: 15,
    status: 'published',
  },
  {
    id: 'chk-f5-3',
    category: 'Fasa 5: Penghantaran',
    title: 'Saya menghantar tugasan yang lengkap, kemas, asli dan menepati tarikh serta masa yang ditetapkan.',
    description:
      'Memastikan fail akhir disemak dan dimuat naik dengan betul sebelum tamat tempoh penghantaran.',
    order: 16,
    status: 'published',
  },
];

export const OFFICIAL_SELF_ASSESSMENT_SEED: SelfAssessmentSeedItem[] = [
  {
    id: 'sa-1',
    category: 'Pemikiran Itqan',
    statement:
      'Saya melaksanakan tugasan akademik dengan niat yang ikhlas, amanah dan kesungguhan untuk mencapai kualiti terbaik (Itqan).',
    order: 1,
    status: 'published',
  },
  {
    id: 'sa-2',
    category: 'Pemikiran Itqan',
    statement:
      'Saya mengelakkan sikap sambil lewa atau melakukan kerja sekadar melepaskan batuk di tangga semasa menyiapkan tugasan.',
    order: 2,
    status: 'published',
  },
  {
    id: 'sa-3',
    category: 'Perancangan Berstrategi',
    statement:
      'Saya meneliti arahan, rubrik penilaian dan tarikh akhir sebelum memulakan pelaksanaan tugasan.',
    order: 3,
    status: 'published',
  },
  {
    id: 'sa-4',
    category: 'Perancangan Berstrategi',
    statement:
      'Saya merancang jadual kerja yang teratur serta membahagikan peranan dengan adil bagi tugasan berkumpulan.',
    order: 4,
    status: 'published',
  },
  {
    id: 'sa-5',
    category: 'Pelaksanaan & Sumber Sahih',
    statement:
      'Saya merujuk sumber akademik yang sahih dan berautoriti (buku, jurnal, portal rasmi) untuk menyokong hujah tugasan.',
    order: 5,
    status: 'published',
  },
  {
    id: 'sa-6',
    category: 'Pelaksanaan & Sumber Sahih',
    statement:
      'Saya menggunakan AI Generatif hanya sebagai alat bantu pembelajaran dan bukan menggantikan usaha penulisan kendiri.',
    order: 6,
    status: 'published',
  },
  {
    id: 'sa-7',
    category: 'Pelaksanaan & Sumber Sahih',
    statement:
      'Saya menyemak dan menentusahkan setiap fakta, data serta rujukan yang diperoleh termasuk hasil janaan AI.',
    order: 7,
    status: 'published',
  },
  {
    id: 'sa-8',
    category: 'Semakan & Penambahbaikan',
    statement:
      'Saya mendapatkan maklum balas daripada pensyarah atau rakan sebaya serta melakukan penambahbaikan pada draf tugasan.',
    order: 8,
    status: 'published',
  },
  {
    id: 'sa-9',
    category: 'Semakan & Penambahbaikan',
    statement:
      'Saya menyemak ejaan, tatabahasa, susunan penulisan dan pematuhan format tugasan secara teliti sebelum menghantar.',
    order: 9,
    status: 'published',
  },
  {
    id: 'sa-10',
    category: 'Penghantaran & Integriti',
    statement:
      'Saya memastikan semua sitasi dan senarai rujukan ditulis dengan tepat tanpa unsur plagiarisme.',
    order: 10,
    status: 'published',
  },
  {
    id: 'sa-11',
    category: 'Penghantaran & Integriti',
    statement:
      'Saya mematuhi sepenuhnya arahan pensyarah berkaitan etika penggunaan AI Generatif dalam tugasan.',
    order: 11,
    status: 'published',
  },
  {
    id: 'sa-12',
    category: 'Penghantaran & Integriti',
    statement:
      'Saya yakin tugasan yang dihantar mencerminkan kefahaman sebenar saya dan menepati masa yang ditetapkan.',
    order: 12,
    status: 'published',
  },
];

export const DEFAULT_ASSESSMENT_CONFIG: Omit<AssessmentConfig, 'createdAt' | 'updatedAt'> = {
  id: 'self-assessment',
  scoringMethod: 'percentage',
  scaleMin: 1,
  scaleMax: 5,
  bands: [
    {
      minScore: 80,
      maxScore: 100,
      label: 'Cemerlang (Pembudayaan Itqan Tinggi)',
      description:
        'Tahap penghayatan nilai Itqan, perancangan berstrategi, ketelitian semakan dan etika penggunaan AI anda berada pada tahap cemerlang. Teruskan mengekalkan budaya kerja berkualiti ini.',
    },
    {
      minScore: 60,
      maxScore: 79,
      label: 'Baik (Amalan Itqan Konsisten)',
      description:
        'Anda telah mengamalkan prinsip M-IQ dengan baik. Perhalusi lagi aspek pengesahan fakta daripada sumber berautoriti dan semakan rakan sebaya untuk mencapai tahap cemerlang.',
    },
    {
      minScore: 40,
      maxScore: 59,
      label: 'Sederhana (Perlu Pemerkasaan)',
      description:
        'Asas pelaksanaan tugasan telah ada, namun disiplin pengurusan masa, ketelitian semakan bahasa dan kawalan etika penggunaan AI perlu diperkukuhkan.',
    },
    {
      minScore: 0,
      maxScore: 39,
      label: 'Asas (Perlu Bimbingan Segera)',
      description:
        'Sila rujuk semula lima fasa M-IQ dan adakan pertemuan bimbingan bersama pensyarah bagi memperkemas strategi pelaksanaan tugasan anda.',
    },
  ],
  updatedBy: 'system',
};

export const OFFICIAL_RUBRIC_SEED: RubricSeedItem[] = [
  {
    id: 'rubric-ketepatan-maklumat',
    title: 'Ketepatan dan kesahihan maklumat',
    weight: 20,
    order: 1,
    status: 'published',
    levels: [
      {
        label: 'Cemerlang (Itqan)',
        score: 4,
        description:
          'Semua fakta, data dan maklumat adalah tepat, terkini serta disahkan daripada sumber akademik dan rasmi yang berautoriti.',
      },
      {
        label: 'Baik',
        score: 3,
        description:
          'Sebahagian besar maklumat adalah tepat dan sahih dengan hanya kesilapan fakta kecil yang tidak menjejaskan hujah utama.',
      },
      {
        label: 'Memuaskan',
        score: 2,
        description:
          'Maklumat asas disertakan namun terdapat beberapa fakta yang kurang tepat atau tidak disahkan daripada sumber berautoriti.',
      },
      {
        label: 'Perlu Penambahbaikan',
        score: 1,
        description:
          'Banyak maklumat tidak tepat, mengelirukan atau bergantung kepada sumber yang tidak sahih tanpa semakan.',
      },
    ],
  },
  {
    id: 'rubric-kualiti-isi',
    title: 'Kualiti dan kedalaman isi',
    weight: 20,
    order: 2,
    status: 'published',
    levels: [
      {
        label: 'Cemerlang (Itqan)',
        score: 4,
        description:
          'Perbincangan amat mendalam, analitikal, relevan dengan kehendak tugasan serta disokong contoh atau huraian yang bernas.',
      },
      {
        label: 'Baik',
        score: 3,
        description:
          'Isi kandungan lengkap, jelas dan menjawab persoalan tugasan dengan huraian yang baik.',
      },
      {
        label: 'Memuaskan',
        score: 2,
        description:
          'Isi utama ada tetapi huraian masih bersifat umum, cetek atau kurang analisis kritis.',
      },
      {
        label: 'Perlu Penambahbaikan',
        score: 1,
        description:
          'Kandungan tidak mencukupi, tersasar daripada skop tugasan atau tidak dihuraikan dengan jelas.',
      },
    ],
  },
  {
    id: 'rubric-susunan-penulisan',
    title: 'Susunan dan sistematika penulisan',
    weight: 15,
    order: 3,
    status: 'published',
    levels: [
      {
        label: 'Cemerlang (Itqan)',
        score: 4,
        description:
          'Aliran idea amat logik, berstruktur kemas dari pendahuluan hingga penutup serta mematuhi format penulisan sepenuhnya.',
      },
      {
        label: 'Baik',
        score: 3,
        description:
          'Susunan topik dan perenggan teratur serta mudah diikuti dengan pematuhan format yang baik.',
      },
      {
        label: 'Memuaskan',
        score: 2,
        description:
          'Struktur asas wujud tetapi peralihan antara bahagian kurang lancar atau terdapat ketidakseragaman format.',
      },
      {
        label: 'Perlu Penambahbaikan',
        score: 1,
        description:
          'Susunan penulisan bercelaru, tidak sistematik dan gagal mematuhi format asas tugasan.',
      },
    ],
  },
  {
    id: 'rubric-sumber-rujukan',
    title: 'Penggunaan sumber rujukan',
    weight: 15,
    order: 4,
    status: 'published',
    levels: [
      {
        label: 'Cemerlang (Itqan)',
        score: 4,
        description:
          'Menggunakan pelbagai sumber berautoriti (jurnal, buku, portal .gov.my/.edu.my) dengan sitasi dan bibliografi yang tepat.',
      },
      {
        label: 'Baik',
        score: 3,
        description:
          'Rujukan mencukupi daripada sumber yang dipercayai dengan format sitasi yang hampir sempurna.',
      },
      {
        label: 'Memuaskan',
        score: 2,
        description:
          'Bilangan rujukan terhad atau terdapat ketidakselarasan dalam gaya penulisan sitasi.',
      },
      {
        label: 'Perlu Penambahbaikan',
        score: 1,
        description:
          'Tiada rujukan yang sahih atau gagal menyertakan sitasi bagi sumber yang dirujuk.',
      },
    ],
  },
  {
    id: 'rubric-etika-ai',
    title: 'Penggunaan AI secara beretika',
    weight: 15,
    order: 5,
    status: 'published',
    levels: [
      {
        label: 'Cemerlang (Itqan)',
        score: 4,
        description:
          'AI digunakan secara telus sebagai alat bantu, disahkan fakta, disunting kendiri serta mematuhi garis panduan dan akuan integriti.',
      },
      {
        label: 'Baik',
        score: 3,
        description:
          'Penggunaan AI terkawal sebagai sokongan idea dan semakan dengan bukti penyuntingan kendiri pelajar.',
      },
      {
        label: 'Memuaskan',
        score: 2,
        description:
          'Kebergantungan kepada janaan AI agak ketara dengan penyuntingan kendiri dan pengesahan yang minimum.',
      },
      {
        label: 'Perlu Penambahbaikan',
        score: 1,
        description:
          'Menyalin hasil AI secara langsung (copy-paste) tanpa semakan, pengakuan atau pematuhan arahan pensyarah.',
      },
    ],
  },
  {
    id: 'rubric-ketelitian-hasil',
    title: 'Ketelitian dan kualiti hasil akhir',
    weight: 15,
    order: 6,
    status: 'published',
    levels: [
      {
        label: 'Cemerlang (Itqan)',
        score: 4,
        description:
          'Hasil akhir sangat kemas, bebas kesalahan ejaan dan tatabahasa, memenuhi semua semakan pensyarah dan dihantar tepat masa.',
      },
      {
        label: 'Baik',
        score: 3,
        description:
          'Hasil akhir kemas dan profesional dengan hanya kesilapan bahasa atau teknikal yang sangat minimum.',
      },
      {
        label: 'Memuaskan',
        score: 2,
        description:
          'Terdapat beberapa kesilapan ejaan, tatabahasa atau kekemasan paparan yang boleh diperbaiki.',
      },
      {
        label: 'Perlu Penambahbaikan',
        score: 1,
        description:
          'Hasil akhir kelihatan tergesa-gesa, banyak kesilapan bahasa/format dan tidak melalui semakan akhir.',
      },
    ],
  },
];

export const OFFICIAL_RESOURCES_SEED: ResourceSeedItem[] = [
  {
    id: 'res-borang-pertemuan-pensyarah',
    title: 'Borang Pertemuan Pensyarah (Folder Google Drive M-IQ)',
    description:
      'Pautan rasmi Google Drive untuk memuat turun Borang Pertemuan Pensyarah bagi fasa Semakan dan Penambahbaikan.',
    moduleId: 'semakan-penambahbaikan',
    resourceType: 'document',
    url: DRIVE_FOLDER_URL,
    fileName: 'Folder Google Drive Borang Pertemuan Pensyarah',
    storagePath: '',
    status: 'published',
  },
  {
    id: 'res-instrumen-semakan-kendiri',
    title: 'Instrumen Semakan Kendiri (Folder Google Drive M-IQ)',
    description:
      'Pautan rasmi Google Drive untuk memuat turun dokumen Instrumen Semakan Kendiri Penggunaan AI Generatif.',
    moduleId: 'penghantaran',
    resourceType: 'document',
    url: DRIVE_FOLDER_URL,
    fileName: 'Folder Google Drive Instrumen Kendiri',
    storagePath: '',
    status: 'published',
  },
  {
    id: 'res-lagu-inspirasi-itqan',
    title: 'Video Inspirasi Lagu M-IQ (ITQAN.mp4)',
    description: 'Video lagu tema Mindset Itqan (ITQAN.mp4) daripada portal Google Sites M-IQ.',
    moduleId: 'pengenalan-miq',
    resourceType: 'video',
    url: ITQAN_VIDEO_PREVIEW_URL,
    fileName: 'ITQAN.mp4',
    storagePath: '',
    status: 'published',
  },
  {
    id: 'res-borang-maklum-balas',
    title: 'Borang Rasmi Maklum Balas Penggunaan Bahan M-IQ',
    description: 'Pautan Google Form rasmi maklum balas penggunaan bahan M-IQ (Mindset Itqan).',
    moduleId: 'maklum-balas',
    resourceType: 'link',
    url: OFFICIAL_FEEDBACK_FORM_URL,
    fileName: 'forms.gle/XWRJvHr18wRcWrCq8',
    storagePath: '',
    status: 'published',
  },
  {
    id: 'res-laman-rasmi-google-sites',
    title: 'Laman Sumber Rasmi Google Sites M-IQ (Politeknik Ungku Omar)',
    description: 'Portal rujukan asal M-IQ (Mindset Itqan) di Google Sites PUO.',
    moduleId: 'all',
    resourceType: 'link',
    url: `${GOOGLE_SITES_BASE}/pengenalan`,
    fileName: 'sites.google.com/puo.edu.my/mindset-iq',
    storagePath: '',
    status: 'published',
  },
];
