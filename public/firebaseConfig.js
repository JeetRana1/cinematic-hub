// Firebase Config - Loads from environment variables
// This works with Vercel, Netlify, and other hosting services

// Try to get config from environment variables (set in Vercel/Netlify dashboard)
if (typeof window !== 'undefined') {
  // Option 1: Direct environment variables (if exposed in public scope)
  window.firebaseConfig = window.firebaseConfig || {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 
            (typeof FIREBASE_API_KEY !== 'undefined' ? FIREBASE_API_KEY : "YOUR_API_KEY"),
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 
                (typeof FIREBASE_AUTH_DOMAIN !== 'undefined' ? FIREBASE_AUTH_DOMAIN : "YOUR_AUTH_DOMAIN"),
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 
               (typeof FIREBASE_PROJECT_ID !== 'undefined' ? FIREBASE_PROJECT_ID : "YOUR_PROJECT_ID"),
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 
                   (typeof FIREBASE_STORAGE_BUCKET !== 'undefined' ? FIREBASE_STORAGE_BUCKET : "YOUR_STORAGE_BUCKET"),
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || 
                       (typeof FIREBASE_MESSAGING_SENDER_ID !== 'undefined' ? FIREBASE_MESSAGING_SENDER_ID : "YOUR_SENDER_ID"),
    appId: process.env.REACT_APP_FIREBASE_APP_ID || 
           (typeof FIREBASE_APP_ID !== 'undefined' ? FIREBASE_APP_ID : "YOUR_APP_ID")
  };

  // Check if config is properly loaded
  if (!window.firebaseConfig.apiKey || window.firebaseConfig.apiKey.includes('YOUR_')) {
    console.warn('⚠️ Firebase config not properly loaded. Please set environment variables:');
    console.warn('REACT_APP_FIREBASE_API_KEY');
    console.warn('REACT_APP_FIREBASE_AUTH_DOMAIN');
    console.warn('REACT_APP_FIREBASE_PROJECT_ID');
    console.warn('REACT_APP_FIREBASE_STORAGE_BUCKET');
    console.warn('REACT_APP_FIREBASE_MESSAGING_SENDER_ID');
    console.warn('REACT_APP_FIREBASE_APP_ID');
  }
}
