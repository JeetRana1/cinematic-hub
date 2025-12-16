// Firebase Auth + Firestore integration for Netflix-style profiles
// 1) Add Firebase web app config below
// 2) Include Firebase compat SDKs in your HTML before this file:
//    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
//    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
//    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
// 3) Then include this script.


(function(){
  // Load firebaseConfig from external file (firebaseConfig.js)
  if (typeof window.firebaseConfig === 'undefined') {
    throw new Error('Firebase config not found. Please create firebaseConfig.js with your secrets.');
  }
  const firebaseConfig = window.firebaseConfig;

  // Initialize if not already
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const auth = firebase.auth();
  const db = firebase.firestore();
  // Removed db.settings overrides to avoid host override warnings.
  // Explicitly enable network (in case SDK thinks it's offline)
  try { db.enableNetwork(); } catch (e) { /* ignore */ }

  async function ensureOnline(){
    try { await db.enableNetwork(); } catch (e) { /* ignore */ }
  }

  // Ensure base user doc exists before profile subcollection operations
  async function ensureUserDoc(uid){
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      await userRef.set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    return userRef;
  }

  // Selection is stored locally per-user
  const selectedKey = (uid) => `fb_selected_profile_${uid}`;

  // Auth helpers
  function onAuthChanged(cb){ return auth.onAuthStateChanged(cb); }
  function getUser(){ return auth.currentUser; }
  async function signUpEmailPassword(email, password){
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    return cred.user;
  }
  async function signInEmailPassword(email, password){
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }
  async function signOut(){ await auth.signOut(); }
  async function resetPassword(email){
    if(!email || typeof email !== 'string') throw new Error('Please enter a valid email');
    // Build a URL that works on GitHub Pages (subpath like /repo/) and local
    let url;
    if (typeof window !== 'undefined') {
      const { origin, pathname } = window.location;
      if (origin && origin.startsWith('http')) {
        // Use the current directory as base, so /repo/forgot.html -> /repo/reset.html
        const parts = (pathname || '/').split('/');
        parts.pop(); // remove current file (e.g., forgot.html)
        const base = parts.join('/') || '/';
        url = `${origin}${base}${base.endsWith('/') ? '' : '/'}reset.html`;
      }
    }
    try {
      if (url) {
        await auth.sendPasswordResetEmail(email.trim(), { url, handleCodeInApp: true });
      } else {
        await auth.sendPasswordResetEmail(email.trim());
      }
      return true;
    } catch (e) {
      // If domain not whitelisted, retry without custom URL so user can still receive the email
      if (e && (e.code === 'auth/unauthorized-continue-uri' || String(e.message||'').includes('unauthorized-continue-uri'))){
        await auth.sendPasswordResetEmail(email.trim());
        // Inform caller so they can show a hint to whitelist domain
        throw new Error('Email sent, but your domain is not whitelisted for custom reset page. Add this domain in Firebase Auth > Settings > Authorized domains.');
      }
      throw e;
    }
  }

  function requireAuth(){
    const u = getUser();
    if (!u) { window.location.href = 'login.html'; return null; }
    return u;
  }

  // Profiles in Firestore: users/{uid}/profiles/{profileId}
  async function getProfiles(uid){
    await ensureUserDoc(uid);
    const snap = await db.collection('users').doc(uid).collection('profiles').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  async function addProfile(uid, name, color, avatarUrl){
    await ensureUserDoc(uid);
    const data = { name: name || 'Profile', color: color || '#6b66ff', avatarUrl: avatarUrl || null, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection('users').doc(uid).collection('profiles').add(data);
    return { id: ref.id, ...data };
  }
  async function deleteProfile(uid, id){
    await ensureUserDoc(uid);
    
    // Delete all profile-related data from Firestore
    try {
      const batch = db.batch();
      
      // 1. Delete all continue watching documents in the profile's subcollection
      const continueWatchingRef = db.collection('users').doc(uid).collection('profiles').doc(id).collection('continueWatching');
      const cwSnapshot = await continueWatchingRef.get();
      cwSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      console.log(`Deleting ${cwSnapshot.docs.length} continue watching items`);
      
      // 2. Delete all data documents in the profile's data subcollection
      const profileDataRef = db.collection('users').doc(uid).collection('profiles').doc(id).collection('data');
      try {
        const dataSnapshot = await profileDataRef.get();
        dataSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        console.log(`Deleting ${dataSnapshot.docs.length} profile data items`);
      } catch (e) {
        console.log('No profile data subcollection found');
      }
      
      // 3. Delete the profile document itself
      const profileDocRef = db.collection('users').doc(uid).collection('profiles').doc(id);
      batch.delete(profileDocRef);
      
      // Commit all deletions
      await batch.commit();
      console.log('✅ Profile and all associated data deleted from Firestore');
    } catch (error) {
      console.error('Error deleting profile data:', error);
    }
    
    // Clear local storage selection
    const key = selectedKey(uid);
    const sel = localStorage.getItem(key);
    if (sel === id) {
      localStorage.removeItem(key);
      
      // Clear all profile-related localStorage keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey && (storageKey.includes(`_${uid}_${id}`) || storageKey.includes(`${id}_`))) {
          keysToRemove.push(storageKey);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log('✅ Cleared', keysToRemove.length, 'localStorage keys for deleted profile');
    }
    
    // Clear Firebase Sync cache
    if (window.FirebaseSync && window.FirebaseSync.cache) {
      window.FirebaseSync.cache = {};
      console.log('✅ Cleared Firebase Sync cache');
    }
  }
  async function updateProfile(uid, id, partial){
    await ensureUserDoc(uid);
    const safe = {};
    if (partial && typeof partial.name === 'string') safe.name = partial.name;
    if (partial && typeof partial.color === 'string') safe.color = partial.color;
    if (partial && typeof partial.kids === 'boolean') safe.kids = partial.kids;
    if (partial && typeof partial.avatarUrl === 'string') safe.avatarUrl = partial.avatarUrl;
    if (Object.keys(safe).length === 0) return;
    safe.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(uid).collection('profiles').doc(id).set(safe, { merge: true });
  }
  async function selectProfile(uid, id){ 
    localStorage.setItem(selectedKey(uid), id); 
    // Notify FirebaseSync to reload data for the new profile
    if (window.FirebaseSync && typeof window.FirebaseSync.switchProfile === 'function') {
      await window.FirebaseSync.switchProfile(id);
    }
  }
  async function getSelectedProfile(uid){
    await ensureUserDoc(uid);
    const id = localStorage.getItem(selectedKey(uid));
    if (!id) return null;
    const doc = await db.collection('users').doc(uid).collection('profiles').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  // User settings helpers: users/{uid}/settings/general
  async function getUserSettings(uid){
    await ensureUserDoc(uid);
    const ref = db.collection('users').doc(uid).collection('settings').doc('general');
    const snap = await ref.get();
    return snap.exists ? snap.data() : {};
  }
  async function updateUserSettings(uid, partial){
    await ensureUserDoc(uid);
    const ref = db.collection('users').doc(uid).collection('settings').doc('general');
    await ref.set(partial || {}, { merge: true });
  }

  async function requireProfile(){
    const u = requireAuth();
    if (!u) return null;
    const p = await getSelectedProfile(u.uid);
    if (!p) { window.location.href = 'profiles.html'; return null; }
    return { user: u, profile: p };
  }

  window.FirebaseAuth = {
    onAuthChanged,
    getUser,
    signUpEmailPassword,
    signInEmailPassword,
    signOut,
    resetPassword,
    requireAuth,
    getProfiles,
    addProfile,
    deleteProfile,
    ensureOnline,
    updateProfile,
    selectProfile,
    getSelectedProfile,
    requireProfile,
    // Settings
    getUserSettings,
    updateUserSettings,
  };
})();
