import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, PRIMARY_ADMIN_EMAIL } from './firebase';
import {
  DEFAULT_ASSESSMENT_CONFIG,
  OFFICIAL_CHECKLIST_SEED,
  OFFICIAL_RESOURCES_SEED,
  OFFICIAL_RUBRIC_SEED,
  OFFICIAL_SELF_ASSESSMENT_SEED,
  OFFICIAL_SUBMODULES_SEED,
  OFFICIAL_TOPICS_SEED,
} from './officialMiqContent';
import type { ModuleSectionType } from '../types/miq';

export const HERO_BANNER_IMAGE = '/src/assets/images/hero_itqan_banner_1795503506811.jpg';
export const MODULE_COVER_IMAGE = '/src/assets/images/module_cover_geometry_1795503505583.jpg';
export const CREST_EMBLEM_IMAGE = '/src/assets/images/crest_miq_emblem_1795503506510.jpg';

export interface CoreModuleSeed {
  id: string;
  slug: string;
  navOrder: number;
  title: string;
  subtitle: string;
  sectionType: ModuleSectionType;
  coverImageUrl: string;
}

export const CORE_MODULES_BLUEPRINT: CoreModuleSeed[] = [
  {
    id: 'dashboard',
    slug: 'dashboard',
    navOrder: 1,
    title: 'Dashboard',
    subtitle:
      'Ringkasan kemajuan pembelajaran M-IQ, capaian pantas modul, dan status penilaian kendiri.',
    sectionType: 'dashboard',
    coverImageUrl: HERO_BANNER_IMAGE,
  },
  {
    id: 'pengenalan-miq',
    slug: 'pengenalan-miq',
    navOrder: 2,
    title: 'Pengenalan M-IQ',
    subtitle:
      'Pengenalan rasmi M-IQ (Mindset Itqan), lima fasa penerapan nilai Itqan, etika menuntut ilmu dan lagu inspirasi.',
    sectionType: 'learning',
    coverImageUrl: '/src/assets/miq_source/pengenalan_0.png',
  },
  {
    id: 'pemikiran-itqan',
    slug: 'pemikiran-itqan',
    navOrder: 3,
    title: 'Pemikiran Itqan',
    subtitle:
      'Fasa 1: Membentuk asas pemikiran berkualiti, memahami makna itqan, niat dan tanggungjawab sebelum melaksanakan tugasan.',
    sectionType: 'learning',
    coverImageUrl: '/src/assets/miq_source/1-pemikiran-itqan_0.png',
  },
  {
    id: 'perancangan-berstrategi',
    slug: 'perancangan-berstrategi',
    navOrder: 4,
    title: 'Perancangan Berstrategi',
    subtitle:
      'Fasa 2: Merancang tugasan, checklist awal persediaan, pembahagian peranan kumpulan dan tips membina prompt.',
    sectionType: 'learning',
    coverImageUrl: '/src/assets/miq_source/2-perancangan-berstrategi_0.png',
  },
  {
    id: 'pelaksanaan',
    slug: 'pelaksanaan',
    navOrder: 5,
    title: 'Pelaksanaan',
    subtitle:
      'Fasa 3: Membuat carian maklumat sahih, perbincangan pensyarah dan panduan penggunaan AI Generatif secara bijak.',
    sectionType: 'learning',
    coverImageUrl: '/src/assets/miq_source/3-pelaksanaan_0.png',
  },
  {
    id: 'semakan-penambahbaikan',
    slug: 'semakan-penambahbaikan',
    navOrder: 6,
    title: 'Semakan dan Penambahbaikan',
    subtitle:
      'Fasa 4: Peer review, perbincangan pensyarah, Borang Pertemuan Pensyarah dan penambahbaikan berterusan.',
    sectionType: 'learning',
    coverImageUrl: '/src/assets/miq_source/4-semakan-dan-penambahbaikan_0.png',
  },
  {
    id: 'penghantaran',
    slug: 'penghantaran',
    navOrder: 7,
    title: 'Penghantaran',
    subtitle:
      'Fasa 5: Hantar tugasan tepat masa serta sertakan Instrumen Semakan Kendiri Penggunaan AI Generatif.',
    sectionType: 'learning',
    coverImageUrl: '/src/assets/miq_source/5-penghantaran-tugasan_0.png',
  },
  {
    id: 'panduan-ai-generatif',
    slug: 'panduan-ai-generatif',
    navOrder: 8,
    title: 'Panduan AI Generatif',
    subtitle:
      'Info AI Generatif, cara penggunaan bijak dan beretika dalam tugasan serta panduan membina prompt berkualiti.',
    sectionType: 'learning',
    coverImageUrl: '/src/assets/miq_source/info-ai-generatif_0.png',
  },
  {
    id: 'instrumen-penilaian-kendiri',
    slug: 'instrumen-penilaian-kendiri',
    navOrder: 9,
    title: 'Instrumen Penilaian Kendiri',
    subtitle:
      'Senarai semak persediaan awal tugasan dan instrumen semakan kendiri penggunaan AI Generatif.',
    sectionType: 'checklist',
    coverImageUrl: '/src/assets/miq_source/5-penghantaran-tugasan__instrumen-semakan-kendiri_0.png',
  },
  {
    id: 'rubrik-kualiti-tugasan',
    slug: 'rubrik-kualiti-tugasan',
    navOrder: 10,
    title: 'Rubrik Kualiti Tugasan',
    subtitle:
      'Matriks rubrik kualiti tugasan akademik yang boleh disesuaikan oleh pentadbir mengikut kursus.',
    sectionType: 'rubric',
    coverImageUrl: MODULE_COVER_IMAGE,
  },
  {
    id: 'refleksi-pelajar',
    slug: 'refleksi-pelajar',
    navOrder: 11,
    title: 'i-Refleksi M-IQ',
    subtitle:
      'Refleksi Tugasan Berteraskan Nilai Itqan — Ruang rasmi penulisan refleksi tugasan dan muat turun dokumen PDF.',
    sectionType: 'reflection',
    coverImageUrl: MODULE_COVER_IMAGE,
  },
  {
    id: 'maklum-balas',
    slug: 'maklum-balas',
    navOrder: 12,
    title: 'Maklum Balas',
    subtitle:
      'Saluran maklum balas pengguna bahan M-IQ serta pautan rasmi borang maklum balas Google Form.',
    sectionType: 'feedback',
    coverImageUrl: MODULE_COVER_IMAGE,
  },
  {
    id: 'i-temu-pensyarah',
    slug: 'i-temu-pensyarah',
    navOrder: 13,
    title: 'i-TEMU · Maklum Balas Pensyarah',
    subtitle:
      'Platform komunikasi dan maklum balas akademik antara pelajar dengan pensyarah bagi panduan serta semakan tugasan.',
    sectionType: 'appointment',
    coverImageUrl: MODULE_COVER_IMAGE,
  },
];

let seedInFlight = false;

export async function syncOfficialMiqContent(
  adminUid: string,
  options: { overwriteExisting?: boolean } = {}
): Promise<{ createdTopics: number; updatedTopics: number; cleanedPlaceholders: number }> {
  const { overwriteExisting = false } = options;

  // 1. Ensure all 12 core modules exist (committed before submodules/topics so exists() checks pass)
  const existingModsSnap = await getDocs(query(collection(db, 'modules'), where('isCore', '==', true)));
  const existingModIds = new Set(existingModsSnap.docs.map((d) => d.id));

  const missingModules = CORE_MODULES_BLUEPRINT.filter((m) => !existingModIds.has(m.id));
  if (missingModules.length > 0 || overwriteExisting) {
    const modBatch = writeBatch(db);
    for (const mod of CORE_MODULES_BLUEPRINT) {
      const modRef = doc(db, 'modules', mod.id);
      if (!existingModIds.has(mod.id)) {
        modBatch.set(modRef, {
          id: mod.id,
          slug: mod.slug,
          navOrder: mod.navOrder,
          title: mod.title,
          subtitle: mod.subtitle,
          sectionType: mod.sectionType,
          status: 'published',
          coverImageUrl: mod.coverImageUrl,
          isCore: true,
          updatedBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (overwriteExisting) {
        modBatch.update(modRef, {
          title: mod.title,
          subtitle: mod.subtitle,
          coverImageUrl: mod.coverImageUrl,
          status: 'published',
          updatedBy: adminUid,
          updatedAt: serverTimestamp(),
        });
      }
    }
    await modBatch.commit();
  }

  // 2. Submodules
  const subSnap = await getDocs(collection(db, 'submodules'));
  const existingSubIds = new Set(subSnap.docs.map((d) => d.id));
  const subBatch = writeBatch(db);
  let subMutations = 0;

  for (const sub of OFFICIAL_SUBMODULES_SEED) {
    const subRef = doc(db, 'submodules', sub.id);
    if (!existingSubIds.has(sub.id)) {
      subBatch.set(subRef, {
        moduleId: sub.moduleId,
        title: sub.title,
        description: sub.description,
        order: sub.order,
        status: sub.status,
        updatedBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      subMutations += 1;
    } else if (overwriteExisting) {
      subBatch.update(subRef, {
        moduleId: sub.moduleId,
        title: sub.title,
        description: sub.description,
        order: sub.order,
        status: sub.status,
        updatedBy: adminUid,
        updatedAt: serverTimestamp(),
      });
      subMutations += 1;
    }
  }
  if (subMutations > 0) {
    await subBatch.commit();
  }

  // 3. Topics (check if untouched Turn-1 starter placeholders exist)
  const topicsSnap = await getDocs(collection(db, 'topics'));
  const existingTopicIds = new Set(topicsSnap.docs.map((d) => d.id));
  const placeholderTopicIds = topicsSnap.docs
    .filter((d) => {
      const data = d.data();
      return (
        d.id.startsWith('starter-') &&
        typeof data.title === 'string' &&
        data.title.includes('Slot Kandungan Asal')
      );
    })
    .map((d) => d.id);

  const hasOnlyPlaceholdersOrEmpty =
    topicsSnap.empty || placeholderTopicIds.length === topicsSnap.docs.length;

  let createdTopics = 0;
  let updatedTopics = 0;
  let cleanedPlaceholders = 0;

  if (overwriteExisting || hasOnlyPlaceholdersOrEmpty) {
    const topicBatch = writeBatch(db);

    // Clean up untouched placeholder docs
    for (const pid of placeholderTopicIds) {
      topicBatch.delete(doc(db, 'topics', pid));
      cleanedPlaceholders += 1;
    }

    for (const top of OFFICIAL_TOPICS_SEED) {
      const topRef = doc(db, 'topics', top.id);
      if (!existingTopicIds.has(top.id)) {
        topicBatch.set(topRef, {
          moduleId: top.moduleId,
          subModuleId: top.subModuleId,
          title: top.title,
          summary: top.summary,
          order: top.order,
          status: top.status,
          content: top.content,
          style: top.style,
          youtubeUrls: top.youtubeUrls,
          externalLinks: top.externalLinks,
          attachments: top.attachments,
          referenceMaterials: top.referenceMaterials,
          updatedBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        createdTopics += 1;
      } else if (overwriteExisting) {
        topicBatch.update(topRef, {
          moduleId: top.moduleId,
          subModuleId: top.subModuleId,
          title: top.title,
          summary: top.summary,
          order: top.order,
          status: top.status,
          content: top.content,
          style: top.style,
          youtubeUrls: top.youtubeUrls,
          externalLinks: top.externalLinks,
          attachments: top.attachments,
          referenceMaterials: top.referenceMaterials,
          updatedBy: adminUid,
          updatedAt: serverTimestamp(),
        });
        updatedTopics += 1;
      }
    }

    if (createdTopics > 0 || updatedTopics > 0 || cleanedPlaceholders > 0) {
      await topicBatch.commit();
    }
  }

  // 4. Checklist Items (upgrade untouched placeholders or prior non-5-phase defaults to 5-phase M-IQ checklist)
  const checklistSnap = await getDocs(collection(db, 'checklistItems'));
  const existingChecklistIds = new Set(checklistSnap.docs.map((d) => d.id));
  const oldDefaultChecklistIds = checklistSnap.docs
    .filter(
      (d) =>
        d.id.startsWith('chk-template-') ||
        d.id.startsWith('chk-awal-') ||
        d.id.startsWith('chk-ai-')
    )
    .map((d) => d.id);

  const hasOnlyOldDefaultChecklist =
    checklistSnap.docs.length > 0 && oldDefaultChecklistIds.length === checklistSnap.docs.length;

  const shouldSyncChecklist =
    overwriteExisting || checklistSnap.empty || hasOnlyOldDefaultChecklist;

  if (shouldSyncChecklist) {
    const cBatch = writeBatch(db);
    let cMutations = 0;

    for (const cid of oldDefaultChecklistIds) {
      cBatch.delete(doc(db, 'checklistItems', cid));
      cMutations += 1;
    }

    for (const item of OFFICIAL_CHECKLIST_SEED) {
      const cRef = doc(db, 'checklistItems', item.id);
      if (!existingChecklistIds.has(item.id)) {
        cBatch.set(cRef, {
          category: item.category,
          title: item.title,
          description: item.description,
          order: item.order,
          status: item.status,
          updatedBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        cMutations += 1;
      } else if (overwriteExisting) {
        cBatch.update(cRef, {
          category: item.category,
          title: item.title,
          description: item.description,
          order: item.order,
          status: item.status,
          updatedBy: adminUid,
          updatedAt: serverTimestamp(),
        });
        cMutations += 1;
      }
    }
    if (cMutations > 0) {
      await cBatch.commit();
    }
  }

  // 5. Shared Learning Resources from official Google Sites
  const resourcesSnap = await getDocs(collection(db, 'resources'));
  const existingResIds = new Set(resourcesSnap.docs.map((d) => d.id));
  if (overwriteExisting || resourcesSnap.empty) {
    const rBatch = writeBatch(db);
    let rMutations = 0;
    for (const res of OFFICIAL_RESOURCES_SEED) {
      const resRef = doc(db, 'resources', res.id);
      if (!existingResIds.has(res.id)) {
        rBatch.set(resRef, {
          title: res.title,
          description: res.description,
          moduleId: res.moduleId,
          resourceType: res.resourceType,
          url: res.url,
          fileName: res.fileName,
          storagePath: res.storagePath,
          status: res.status,
          uploadedBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        rMutations += 1;
      } else if (overwriteExisting) {
        rBatch.update(resRef, {
          title: res.title,
          description: res.description,
          moduleId: res.moduleId,
          resourceType: res.resourceType,
          url: res.url,
          fileName: res.fileName,
          storagePath: res.storagePath,
          status: res.status,
          uploadedBy: adminUid,
          updatedAt: serverTimestamp(),
        });
        rMutations += 1;
      }
    }
    if (rMutations > 0) {
      await rBatch.commit();
    }
  }

  // 6. Self-Assessment Likert 1-5 Statements + Scoring Configuration
  const saSnap = await getDocs(collection(db, 'selfAssessmentItems'));
  const existingSaIds = new Set(saSnap.docs.map((d) => d.id));
  if (overwriteExisting || saSnap.empty) {
    const saBatch = writeBatch(db);
    let saMutations = 0;
    for (const item of OFFICIAL_SELF_ASSESSMENT_SEED) {
      const saRef = doc(db, 'selfAssessmentItems', item.id);
      if (!existingSaIds.has(item.id)) {
        saBatch.set(saRef, {
          category: item.category,
          statement: item.statement,
          order: item.order,
          status: item.status,
          updatedBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        saMutations += 1;
      } else if (overwriteExisting) {
        saBatch.update(saRef, {
          category: item.category,
          statement: item.statement,
          order: item.order,
          status: item.status,
          updatedBy: adminUid,
          updatedAt: serverTimestamp(),
        });
        saMutations += 1;
      }
    }
    if (saMutations > 0) {
      await saBatch.commit();
    }
  }

  const configRef = doc(db, 'assessmentConfigs', 'self-assessment');
  const configSnap = await getDoc(configRef);
  if (!configSnap.exists() || overwriteExisting) {
    const cfgBatch = writeBatch(db);
    if (!configSnap.exists()) {
      cfgBatch.set(configRef, {
        scoringMethod: DEFAULT_ASSESSMENT_CONFIG.scoringMethod,
        scaleMin: DEFAULT_ASSESSMENT_CONFIG.scaleMin,
        scaleMax: DEFAULT_ASSESSMENT_CONFIG.scaleMax,
        bands: DEFAULT_ASSESSMENT_CONFIG.bands,
        updatedBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      cfgBatch.update(configRef, {
        scoringMethod: DEFAULT_ASSESSMENT_CONFIG.scoringMethod,
        scaleMin: DEFAULT_ASSESSMENT_CONFIG.scaleMin,
        scaleMax: DEFAULT_ASSESSMENT_CONFIG.scaleMax,
        bands: DEFAULT_ASSESSMENT_CONFIG.bands,
        updatedBy: adminUid,
        updatedAt: serverTimestamp(),
      });
    }
    await cfgBatch.commit();
  }

  // 7. 6-Criteria Rubrik Kualiti Tugasan (automatically replaces untouched rubric-template-* placeholders)
  const rubricSnap = await getDocs(collection(db, 'rubricCriteria'));
  const existingRubricIds = new Set(rubricSnap.docs.map((d) => d.id));
  const templateRubricIds = rubricSnap.docs
    .filter((d) => d.id.startsWith('rubric-template-'))
    .map((d) => d.id);
  const hasOnlyTemplateRubrics =
    rubricSnap.docs.length > 0 && templateRubricIds.length === rubricSnap.docs.length;

  if (rubricSnap.empty || hasOnlyTemplateRubrics || overwriteExisting) {
    const rubBatch = writeBatch(db);
    let rubMutations = 0;

    for (const oldId of templateRubricIds) {
      rubBatch.delete(doc(db, 'rubricCriteria', oldId));
      rubMutations += 1;
    }

    for (const crit of OFFICIAL_RUBRIC_SEED) {
      const rubRef = doc(db, 'rubricCriteria', crit.id);
      if (!existingRubricIds.has(crit.id)) {
        rubBatch.set(rubRef, {
          title: crit.title,
          weight: crit.weight,
          order: crit.order,
          levels: crit.levels,
          status: crit.status,
          updatedBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        rubMutations += 1;
      } else if (overwriteExisting) {
        rubBatch.update(rubRef, {
          title: crit.title,
          weight: crit.weight,
          order: crit.order,
          levels: crit.levels,
          status: crit.status,
          updatedBy: adminUid,
          updatedAt: serverTimestamp(),
        });
        rubMutations += 1;
      }
    }

    if (rubMutations > 0) {
      await rubBatch.commit();
    }
  }

  // 8. Sync existing Admin (Pensyarah) accounts into public non-PII lecturerDirectory
  try {
    const [adminUsersSnap, adminsSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), where('role', '==', 'admin'))),
      getDocs(collection(db, 'admins')),
    ]);
    const dirBatch = writeBatch(db);
    const seenUids = new Set<string>();

    for (const uDoc of adminUsersSnap.docs) {
      const uData = uDoc.data() as { uid?: string; displayName?: string; email?: string };
      const uid = uData.uid || uDoc.id;
      if (!uid || seenUids.has(uid)) continue;
      seenUids.add(uid);
      const isPrimary =
        typeof uData.email === 'string' &&
        uData.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
      dirBatch.set(doc(db, 'lecturerDirectory', uid), {
        uid,
        displayName: (uData.displayName || 'Pensyarah M-IQ').slice(0, 120),
        title: isPrimary
          ? 'Pentadbir & Pensyarah Utama M-IQ'
          : 'Pensyarah / Pentadbir M-IQ',
        isPrimary,
        active: true,
        updatedAt: serverTimestamp(),
      });
    }

    for (const aDoc of adminsSnap.docs) {
      const aData = aDoc.data() as { uid?: string; email?: string };
      const uid = aData.uid || aDoc.id;
      if (!uid || seenUids.has(uid)) continue;
      seenUids.add(uid);
      const emailPrefix = (aData.email || 'Pensyarah M-IQ').split('@')[0];
      dirBatch.set(doc(db, 'lecturerDirectory', uid), {
        uid,
        displayName: emailPrefix.slice(0, 120),
        title: 'Pensyarah / Pentadbir M-IQ',
        isPrimary: false,
        active: true,
        updatedAt: serverTimestamp(),
      });
    }

    if (seenUids.size > 0) {
      await dirBatch.commit();
    }
  } catch {
    // Non-blocking sync; AuthContext also keeps current admin synced
  }

  return { createdTopics, updatedTopics, cleanedPlaceholders };
}

export async function ensureCoreStructureSeeded(adminUid: string): Promise<void> {
  if (seedInFlight) return;
  seedInFlight = true;
  try {
    await syncOfficialMiqContent(adminUid, { overwriteExisting: false });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'modules/seed');
  } finally {
    seedInFlight = false;
  }
}
