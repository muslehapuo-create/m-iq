import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  PRIMARY_ADMIN_EMAIL,
} from '../lib/firebase';
import { ensureCoreStructureSeeded } from '../lib/seedData';
import type { UserProfile, UserRole } from '../types/miq';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateProgram: (program: string) => Promise<void>;
  accessDeniedEmail: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accessDeniedEmail, setAccessDeniedEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(null);
      setAccessDeniedEmail(null);
      setAuthError(null);

      if (!firebaseUser) {
        setProfile(null);
        setIsAdmin(false);
        setAccessDeniedEmail(null);
        setAuthReady(true);
        return;
      }

      try {
        const isPrimaryAdmin =
          firebaseUser.emailVerified &&
          firebaseUser.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

        let adminGrantExists = false;
        if (!isPrimaryAdmin && firebaseUser.emailVerified) {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
            adminGrantExists = adminDoc.exists();
          } catch {
            adminGrantExists = false;
          }
        }

        const resolvedAdmin = Boolean(isPrimaryAdmin || adminGrantExists);
        const safeEmail = (firebaseUser.email || '').trim().toLowerCase().slice(0, 160);

        if (!resolvedAdmin) {
          if (!firebaseUser.emailVerified || !safeEmail) {
            setAccessDeniedEmail(firebaseUser.email || 'Akaun Google tidak disahkan');
            setProfile(null);
            setIsAdmin(false);
            return;
          }
          const approvalSnap = await getDoc(doc(db, 'approvedStudents', safeEmail));
          if (!approvalSnap.exists() || approvalSnap.data().active !== true) {
            setAccessDeniedEmail(safeEmail);
            setProfile(null);
            setIsAdmin(false);
            return;
          }
        }

        setUser(firebaseUser);
        setIsAdmin(resolvedAdmin);

        const userRef = doc(db, 'users', firebaseUser.uid);
        let userSnap;
        try {
          userSnap = await getDoc(userRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }

        const safeName = (firebaseUser.displayName || 'Pelajar Politeknik').slice(0, 120);
        const profileEmail = (firebaseUser.email || '').slice(0, 160);
        const safePhoto = (firebaseUser.photoURL || '').slice(0, 500);

        if (!userSnap.exists()) {
          const initialPayload = {
            uid: firebaseUser.uid,
            displayName: safeName,
            email: profileEmail,
            photoURL: safePhoto,
            role: 'student' as const,
            program: 'Politeknik Malaysia',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          try {
            await setDoc(userRef, initialPayload);
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
          }

          if (resolvedAdmin) {
            try {
              await updateDoc(userRef, {
                role: 'admin',
                updatedAt: serverTimestamp(),
              });
            } catch {
              // Non-fatal; isAdmin still grants access
            }
          }

          setProfile({
            uid: firebaseUser.uid,
            displayName: safeName,
            email: profileEmail,
            photoURL: safePhoto,
            role: resolvedAdmin ? 'admin' : 'student',
            program: 'Politeknik Malaysia',
          });
        } else {
          const data = userSnap.data() as UserProfile;
          if (resolvedAdmin && data.role !== 'admin') {
            try {
              await updateDoc(userRef, {
                role: 'admin',
                updatedAt: serverTimestamp(),
              });
            } catch {
              // Non-fatal
            }
          }
          setProfile({
            ...data,
            role: resolvedAdmin ? 'admin' : data.role,
          });
        }

        // Initialize student progress document if missing
        const progressRef = doc(db, 'studentProgress', firebaseUser.uid);
        try {
          const progSnap = await getDoc(progressRef);
          if (!progSnap.exists()) {
            await setDoc(progressRef, {
              userId: firebaseUser.uid,
              completedTopicIds: [],
              checkedChecklistIds: [],
              rubricSelections: {},
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `studentProgress/${firebaseUser.uid}`);
        }

        if (resolvedAdmin) {
          try {
            await setDoc(doc(db, 'lecturerDirectory', firebaseUser.uid), {
              uid: firebaseUser.uid,
              displayName: safeName,
              title: isPrimaryAdmin
                ? 'Pentadbir & Pensyarah Utama M-IQ'
                : 'Pensyarah / Pentadbir M-IQ',
              isPrimary: Boolean(isPrimaryAdmin),
              active: true,
              updatedAt: serverTimestamp(),
            });
          } catch {
            // Non-blocking sync for lecturer directory
          }
          await ensureCoreStructureSeeded(firebaseUser.uid);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ralat pengesahan akaun.';
        setAuthError(msg);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Log masuk dibatalkan atau gagal. Sila cuba lagi.';
      setAuthError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  const updateProgram = async (program: string) => {
    if (!user) return;
    const trimmed = program.trim().slice(0, 120) || 'Politeknik Malaysia';
    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        program: trimmed,
        updatedAt: serverTimestamp(),
      });
      setProfile((prev) => (prev ? { ...prev, program: trimmed } : prev));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: isAdmin ? 'admin' : 'student',
        isAdmin,
        authReady,
        signingIn,
        authError,
        accessDeniedEmail,
        signInWithGoogle,
        signOutUser,
        updateProgram,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
