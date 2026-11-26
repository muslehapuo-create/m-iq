import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  DEFAULT_ASSESSMENT_CONFIG,
  OFFICIAL_CHECKLIST_SEED,
  OFFICIAL_RESOURCES_SEED,
  OFFICIAL_RUBRIC_SEED,
  OFFICIAL_SELF_ASSESSMENT_SEED,
  OFFICIAL_SUBMODULES_SEED,
  OFFICIAL_TOPICS_SEED,
} from '../lib/officialMiqContent';
import { CORE_MODULES_BLUEPRINT } from '../lib/seedData';
import {
  evaluateSelfAssessment,
  normalizeReflectionGuidedAnswers,
  type ActivityType,
  type AssessmentConfig,
  type ChecklistItem,
  type ITemuRecord,
  type LearningModule,
  type LearningResource,
  type LecturerAppointment,
  type LecturerDirectoryEntry,
  type RubricCriterion,
  type SelfAssessmentItem,
  type StudentActivity,
  type StudentFeedback,
  type StudentProgress,
  type StudentReflection,
  type SubModule,
  type TopicContent,
} from '../types/miq';

export function useMiqData() {
  const { user, profile, isAdmin, authReady } = useAuth();

  const [rawModules, setRawModules] = useState<LearningModule[]>([]);
  const [submodules, setSubmodules] = useState<SubModule[]>([]);
  const [topics, setTopics] = useState<TopicContent[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [selfAssessmentItems, setSelfAssessmentItems] = useState<SelfAssessmentItem[]>([]);
  const [rawAssessmentConfig, setRawAssessmentConfig] = useState<AssessmentConfig | null>(null);
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([]);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [allStudentProgress, setAllStudentProgress] = useState<StudentProgress[]>([]);
  const [reflections, setReflections] = useState<StudentReflection[]>([]);
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>([]);
  const [feedbackList, setFeedbackList] = useState<StudentFeedback[]>([]);
  const [lecturerDirectory, setLecturerDirectory] = useState<LecturerDirectoryEntry[]>([]);
  const [appointments, setAppointments] = useState<LecturerAppointment[]>([]);
  const [itemuRecords, setItemuRecords] = useState<ITemuRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const migratedReflectionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!authReady || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let loadedFlags = 0;
    const markLoaded = () => {
      loadedFlags += 1;
      if (loadedFlags >= 6) setLoading(false);
    };

    const modulesQuery = isAdmin
      ? collection(db, 'modules')
      : query(collection(db, 'modules'), where('status', '==', 'published'));

    const submodulesQuery = isAdmin
      ? collection(db, 'submodules')
      : query(collection(db, 'submodules'), where('status', '==', 'published'));

    const topicsQuery = isAdmin
      ? collection(db, 'topics')
      : query(collection(db, 'topics'), where('status', '==', 'published'));

    const resourcesQuery = isAdmin
      ? collection(db, 'resources')
      : query(collection(db, 'resources'), where('status', '==', 'published'));

    const checklistQuery = isAdmin
      ? collection(db, 'checklistItems')
      : query(collection(db, 'checklistItems'), where('status', '==', 'published'));

    const selfAssessmentQuery = isAdmin
      ? collection(db, 'selfAssessmentItems')
      : query(collection(db, 'selfAssessmentItems'), where('status', '==', 'published'));

    const rubricQuery = isAdmin
      ? collection(db, 'rubricCriteria')
      : query(collection(db, 'rubricCriteria'), where('status', '==', 'published'));

    const reflectionsQuery = isAdmin
      ? collection(db, 'reflections')
      : query(collection(db, 'reflections'), where('userId', '==', user.uid));

    const activitiesQuery = isAdmin
      ? collection(db, 'studentActivities')
      : query(collection(db, 'studentActivities'), where('userId', '==', user.uid));

    const feedbackQuery = isAdmin
      ? collection(db, 'feedback')
      : query(collection(db, 'feedback'), where('userId', '==', user.uid));

    const appointmentsQuery = isAdmin
      ? collection(db, 'appointments')
      : query(collection(db, 'appointments'), where('userId', '==', user.uid));

    const itemuQuery = isAdmin
      ? collection(db, 'itemuRecords')
      : query(collection(db, 'itemuRecords'), where('userId', '==', user.uid));

    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        modulesQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({ ...(d.data() as LearningModule), id: d.id }));
          list.sort((a, b) => a.navOrder - b.navOrder);
          setRawModules(list);
          markLoaded();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'modules')
      )
    );

    unsubs.push(
      onSnapshot(
        submodulesQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<SubModule, 'id'>),
            id: d.id,
          }));
          list.sort((a, b) => a.order - b.order);
          setSubmodules(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'submodules')
      )
    );

    unsubs.push(
      onSnapshot(
        topicsQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({ ...(d.data() as Omit<TopicContent, 'id'>), id: d.id }));
          list.sort((a, b) => a.order - b.order);
          setTopics(list);
          markLoaded();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'topics')
      )
    );

    unsubs.push(
      onSnapshot(
        resourcesQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<LearningResource, 'id'>),
            id: d.id,
          }));
          list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
          setResources(list);
          markLoaded();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'resources')
      )
    );

    unsubs.push(
      onSnapshot(
        checklistQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<ChecklistItem, 'id'>),
            id: d.id,
          }));
          list.sort((a, b) => a.order - b.order);
          setChecklistItems(list);
          markLoaded();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'checklistItems')
      )
    );

    unsubs.push(
      onSnapshot(
        selfAssessmentQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<SelfAssessmentItem, 'id'>),
            id: d.id,
          }));
          list.sort((a, b) => a.order - b.order);
          setSelfAssessmentItems(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'selfAssessmentItems')
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'assessmentConfigs', 'self-assessment'),
        (snap) => {
          if (snap.exists()) {
            setRawAssessmentConfig({
              ...(snap.data() as Omit<AssessmentConfig, 'id'>),
              id: snap.id,
            });
          } else {
            setRawAssessmentConfig(null);
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'assessmentConfigs/self-assessment')
      )
    );

    unsubs.push(
      onSnapshot(
        rubricQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<RubricCriterion, 'id'>),
            id: d.id,
          }));
          list.sort((a, b) => a.order - b.order);
          setRubricCriteria(list);
          markLoaded();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'rubricCriteria')
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'studentProgress', user.uid),
        (snap) => {
          if (snap.exists()) {
            setProgress(snap.data() as StudentProgress);
          } else {
            setProgress({
              userId: user.uid,
              completedTopicIds: [],
              checkedChecklistIds: [],
              rubricSelections: {},
              selfAssessmentResponses: {},
            });
          }
          markLoaded();
        },
        (err) => handleFirestoreError(err, OperationType.GET, `studentProgress/${user.uid}`)
      )
    );

    if (isAdmin) {
      unsubs.push(
        onSnapshot(
          collection(db, 'studentProgress'),
          (snap) => {
            setAllStudentProgress(snap.docs.map((d) => d.data() as StudentProgress));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'studentProgress')
        )
      );
    } else {
      setAllStudentProgress([]);
    }

    unsubs.push(
      onSnapshot(
        reflectionsQuery,
        (snap) => {
          const list = snap.docs.map((d) => {
            const raw = d.data() as Omit<StudentReflection, 'id'>;
            const normalizedGuided = normalizeReflectionGuidedAnswers(raw.guidedAnswers);

            // Auto-migrate owner's stored Firestore reflection doc if it still holds the legacy Q5 wording
            if (
              raw.userId === user.uid &&
              raw.guidedAnswers &&
              normalizedGuided &&
              !migratedReflectionIdsRef.current.has(d.id) &&
              raw.guidedAnswers.some(
                (item, idx) => item.prompt !== normalizedGuided[idx]?.prompt
              )
            ) {
              migratedReflectionIdsRef.current.add(d.id);
              void updateDoc(doc(db, 'reflections', d.id), {
                guidedAnswers: normalizedGuided,
                updatedAt: serverTimestamp(),
              }).catch(() => {
                // Non-blocking background migration; normalized state already reflects updated Q5
              });
            }

            return {
              ...raw,
              id: d.id,
              guidedAnswers: normalizedGuided,
            };
          });
          list.sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0));
          setReflections(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'reflections')
      )
    );

    unsubs.push(
      onSnapshot(
        activitiesQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<StudentActivity, 'id'>),
            id: d.id,
          }));
          list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
          setStudentActivities(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'studentActivities')
      )
    );

    unsubs.push(
      onSnapshot(
        feedbackQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<StudentFeedback, 'id'>),
            id: d.id,
          }));
          list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
          setFeedbackList(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'feedback')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'lecturerDirectory'),
        (snap) => {
          const list = snap.docs
            .map((d) => ({
              ...(d.data() as LecturerDirectoryEntry),
              uid: d.id,
            }))
            .filter((entry) => entry.active !== false);
          list.sort((a, b) => {
            if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
            return a.displayName.localeCompare(b.displayName);
          });
          setLecturerDirectory(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'lecturerDirectory')
      )
    );

    unsubs.push(
      onSnapshot(
        appointmentsQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<LecturerAppointment, 'id'>),
            id: d.id,
          }));
          list.sort(
            (a, b) =>
              (b.updatedAt?.seconds ?? b.createdAt?.seconds ?? 0) -
              (a.updatedAt?.seconds ?? a.createdAt?.seconds ?? 0)
          );
          setAppointments(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'appointments')
      )
    );

    unsubs.push(
      onSnapshot(
        itemuQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<ITemuRecord, 'id'>),
            id: d.id,
          }));
          list.sort(
            (a, b) =>
              (b.updatedAt?.seconds ?? b.createdAt?.seconds ?? 0) -
              (a.updatedAt?.seconds ?? a.createdAt?.seconds ?? 0)
          );
          setItemuRecords(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'itemuRecords')
      )
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, user, isAdmin]);

  const isUnseededDatabase = rawModules.length === 0;

  const modules = useMemo<LearningModule[]>(() => {
    if (!isUnseededDatabase) {
      const normalized = rawModules.map((m) => {
        if (m.id === 'refleksi-pelajar' && m.title === 'Refleksi Pelajar') {
          return {
            ...m,
            title: 'i-Refleksi M-IQ',
            subtitle:
              'Refleksi Tugasan Berteraskan Nilai Itqan — Ruang rasmi penulisan refleksi tugasan dan muat turun dokumen PDF.',
          };
        }
        if (m.id === 'i-temu-pensyarah' || m.sectionType === 'appointment') {
          return {
            ...m,
            title: 'i-TEMU · Maklum Balas Pensyarah',
            subtitle:
              'Platform komunikasi dan maklum balas akademik antara pelajar dengan pensyarah bagi panduan serta semakan tugasan.',
          };
        }
        return m;
      });
      const hasAppointmentMod = normalized.some(
        (m) => m.id === 'i-temu-pensyarah' || m.sectionType === 'appointment'
      );
      if (!hasAppointmentMod) {
        const seedAppt = CORE_MODULES_BLUEPRINT.find((m) => m.id === 'i-temu-pensyarah');
        if (seedAppt) {
          normalized.push({
            ...seedAppt,
            status: 'published',
            isCore: true,
            updatedBy: 'system',
          });
        }
      }
      return normalized.sort((a, b) => a.navOrder - b.navOrder);
    }
    return CORE_MODULES_BLUEPRINT.map((m) => ({
      ...m,
      status: 'published' as const,
      isCore: true,
      updatedBy: 'system',
    }));
  }, [rawModules, isUnseededDatabase]);

  const effectiveLecturerDirectory = useMemo<LecturerDirectoryEntry[]>(() => {
    if (lecturerDirectory.length > 0) return lecturerDirectory;
    return [
      {
        uid: 'primary-admin',
        displayName: 'Pentadbir & Pensyarah Utama M-IQ',
        title: 'Pensyarah / Pentadbir M-IQ',
        isPrimary: true,
        active: true,
      },
    ];
  }, [lecturerDirectory]);

  const effectiveSubmodules = useMemo<SubModule[]>(() => {
    if (!isUnseededDatabase || submodules.length > 0) return submodules;
    return OFFICIAL_SUBMODULES_SEED.map((s) => ({
      ...s,
      updatedBy: 'system',
    }));
  }, [submodules, isUnseededDatabase]);

  const effectiveTopics = useMemo<TopicContent[]>(() => {
    if (!isUnseededDatabase || topics.length > 0) return topics;
    return OFFICIAL_TOPICS_SEED.map((t) => ({
      ...t,
      updatedBy: 'system',
    }));
  }, [topics, isUnseededDatabase]);

  const effectiveChecklistItems = useMemo<ChecklistItem[]>(() => {
    if (checklistItems.length > 0) return checklistItems;
    if (!isUnseededDatabase) return checklistItems;
    return OFFICIAL_CHECKLIST_SEED.map((c) => ({
      ...c,
      updatedBy: 'system',
    }));
  }, [checklistItems, isUnseededDatabase]);

  const effectiveSelfAssessmentItems = useMemo<SelfAssessmentItem[]>(() => {
    if (selfAssessmentItems.length > 0) return selfAssessmentItems;
    return OFFICIAL_SELF_ASSESSMENT_SEED.map((item) => ({
      ...item,
      updatedBy: 'system',
    }));
  }, [selfAssessmentItems]);

  const effectiveAssessmentConfig = useMemo<AssessmentConfig>(() => {
    if (rawAssessmentConfig) return rawAssessmentConfig;
    return DEFAULT_ASSESSMENT_CONFIG;
  }, [rawAssessmentConfig]);

  const effectiveRubricCriteria = useMemo<RubricCriterion[]>(() => {
    if (rubricCriteria.length > 0) return rubricCriteria;
    return OFFICIAL_RUBRIC_SEED.map((crit) => ({
      ...crit,
      updatedBy: 'system',
    }));
  }, [rubricCriteria]);

  const effectiveResources = useMemo<LearningResource[]>(() => {
    if (!isUnseededDatabase || resources.length > 0) return resources;
    return OFFICIAL_RESOURCES_SEED.map((r) => ({
      ...r,
      uploadedBy: 'system',
    }));
  }, [resources, isUnseededDatabase]);

  const logStudentActivity = useCallback(
    async (activityType: ActivityType, title: string, detail: string) => {
      if (!user) return;
      try {
        await addDoc(collection(db, 'studentActivities'), {
          userId: user.uid,
          userName: (profile?.displayName || user.displayName || 'Pelajar').slice(0, 120),
          activityType,
          title: title.trim().slice(0, 200) || 'Aktiviti Pembelajaran',
          detail: detail.trim().slice(0, 400),
          createdAt: serverTimestamp(),
        });
      } catch {
        // Non-blocking audit log: never disrupt primary student mutation
      }
    },
    [user, profile?.displayName]
  );

  const upsertProgress = useCallback(
    async (patch: Partial<StudentProgress>) => {
      if (!user) return;
      const ref = doc(db, 'studentProgress', user.uid);
      await setDoc(
        ref,
        {
          userId: user.uid,
          completedTopicIds: progress?.completedTopicIds ?? [],
          checkedChecklistIds: progress?.checkedChecklistIds ?? [],
          rubricSelections: progress?.rubricSelections ?? {},
          ...patch,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [user, progress]
  );

  const toggleTopicCompleted = async (topicId: string) => {
    if (!user) return;
    const current = progress?.completedTopicIds ?? [];
    const exists = current.includes(topicId);
    const next = exists
      ? current.filter((id) => id !== topicId)
      : [...current, topicId].slice(0, 200);

    try {
      await upsertProgress({ completedTopicIds: next });
      if (!exists) {
        const topicObj = effectiveTopics.find((t) => t.id === topicId);
        await logStudentActivity(
          'topic',
          `Menyiapkan topik: ${topicObj?.title || topicId}`,
          `Topik ditandakan selesai (${next.length} topik selesai).`
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `studentProgress/${user.uid}`);
    }
  };

  const toggleChecklistItem = async (itemId: string) => {
    if (!user) return;
    const current = progress?.checkedChecklistIds ?? [];
    const exists = current.includes(itemId);
    const next = exists
      ? current.filter((id) => id !== itemId)
      : [...current, itemId].slice(0, 200);

    try {
      await upsertProgress({ checkedChecklistIds: next });
      if (!exists) {
        const chkObj = effectiveChecklistItems.find((c) => c.id === itemId);
        await logStudentActivity(
          'checklist',
          `Menandakan senarai semak: ${chkObj?.category || 'Amalan Itqan'}`,
          chkObj?.title || 'Item tindakan Itqan ditandakan selesai.'
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `studentProgress/${user.uid}`);
    }
  };

  const submitSelfAssessment = async (
    responses: Record<string, number>,
    publishedItems: SelfAssessmentItem[],
    config: AssessmentConfig
  ) => {
    if (!user) return;
    const evaluation = evaluateSelfAssessment(responses, publishedItems, config);

    const sanitizedResponses: Record<string, number> = {};
    for (const item of publishedItems.slice(0, 100)) {
      const val = responses[item.id];
      if (typeof val === 'number' && val >= config.scaleMin && val <= config.scaleMax) {
        sanitizedResponses[item.id] = val;
      }
    }

    try {
      await upsertProgress({
        selfAssessmentResponses: sanitizedResponses,
        selfAssessmentScore: evaluation.displayScore,
        selfAssessmentMaxScore: evaluation.displayMax,
        selfAssessmentScorePct: evaluation.percentage,
        selfAssessmentBandLabel: evaluation.matchedBand.label.slice(0, 120),
        selfAssessmentInterpretation: evaluation.matchedBand.description.slice(0, 500),
        selfAssessmentSubmittedAt: serverTimestamp() as unknown as StudentProgress['selfAssessmentSubmittedAt'],
      });

      const scoreSummary =
        config.scoringMethod === 'percentage'
          ? `${evaluation.percentage}%`
          : `${evaluation.displayScore}/${evaluation.displayMax}`;

      await logStudentActivity(
        'self_assessment',
        `Penilaian Kendiri M-IQ (${scoreSummary})`,
        `Tahap: ${evaluation.matchedBand.label} (${evaluation.answeredCount}/${evaluation.totalItems} pernyataan dijawab).`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `studentProgress/${user.uid}`);
    }
  };

  const setRubricScore = async (criterionId: string, score: number) => {
    if (!user) return;
    const current = progress?.rubricSelections ?? {};
    const next = { ...current, [criterionId]: score };
    try {
      await upsertProgress({ rubricSelections: next });
      const crit = effectiveRubricCriteria.find((c) => c.id === criterionId);
      const level = crit?.levels.find((l) => l.score === score);
      await logStudentActivity(
        'rubric',
        `Penilaian Rubrik: ${crit?.title || 'Kriteria Tugasan'}`,
        `Tahap dipilih: ${level?.label || `Skor ${score}`} (Skor ${score}).`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `studentProgress/${user.uid}`);
    }
  };

  return {
    modules,
    rawModules,
    submodules: effectiveSubmodules,
    topics: effectiveTopics,
    resources: effectiveResources,
    checklistItems: effectiveChecklistItems,
    selfAssessmentItems: effectiveSelfAssessmentItems,
    assessmentConfig: effectiveAssessmentConfig,
    rubricCriteria: effectiveRubricCriteria,
    progress,
    allStudentProgress,
    reflections,
    studentActivities,
    feedbackList,
    lecturerDirectory: effectiveLecturerDirectory,
    appointments,
    itemuRecords,
    loading,
    toggleTopicCompleted,
    toggleChecklistItem,
    submitSelfAssessment,
    setRubricScore,
    logStudentActivity,
  };
}
