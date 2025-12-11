# Firebase Cloud Sync Setup Guide

## 🎉 What's New?

Your movie website now syncs **all data across devices** using Firebase Firestore! No more localStorage - everything is in the cloud.

## ✨ Features

- **📱 Cross-Device Sync**: Access your data from laptop, phone, tablet
- **☁️ Cloud Storage**: Continue watching, bookmarks, settings all synced
- **🔄 Real-Time Updates**: Changes sync instantly across devices
- **💾 Offline Support**: Works offline, syncs when back online
- **🔒 Secure**: Your data is private and encrypted

## 📦 What Gets Synced

1. **Continue Watching** - Your viewing progress
2. **My List** - Your bookmarked movies
3. **Theme Settings** - Your preferred theme
4. **Subtitle Settings** - Your subtitle preferences
5. **Player Settings** - Volume, playback preferences

## 🚀 How It Works

### For New Users
Everything automatically saves to the cloud when you're signed in. No setup needed!

### For Existing Users (Migration)

When you first sign in after this update, you'll see a migration prompt:

1. Click **"Sync Now"** to migrate your local data to cloud
2. Your data is uploaded to Firebase Firestore
3. After successful migration, your data syncs across all devices

**Manual Migration:**
```javascript
// In browser console or settings page
await migrateToFirebase();
```

## 🔧 Technical Details

### Files Added

1. **firebase-sync.js** - Core sync module
   - Handles all Firestore operations
   - Provides offline persistence
   - Real-time sync listeners

2. **storage-adapter.js** - Compatibility layer
   - Replaces localStorage calls
   - Backward compatible API
   - Automatic fallback

3. **migration-helper.html** - Migration UI
   - One-time migration prompt
   - User-friendly interface
   - Progress tracking

### Database Structure

```
Firestore Collection: users/{userId}/profiles/{profileId}
- continueWatching: {movieId: {title, progress, currentTime, ...}}
- bookmarks: {movieId: {title, poster, rating, ...}}
- theme: "glossy" | "minimalist" | etc.
- subtitleSettings: {...}
- playerSettings: {...}
```

## 📱 Using on Multiple Devices

### Setup Steps

1. **On Your Laptop:**
   - Sign in to your account
   - Migration will happen automatically (if you have existing data)
   - All your data is now in the cloud

2. **On Your Phone:**
   - Sign in with the same account
   - Your data appears automatically!
   - Watch progress syncs in real-time

3. **On Your Tablet:**
   - Same as phone - just sign in
   - Everything syncs instantly

### Switching Devices

- Start watching on laptop → Continue on phone
- Add to My List on phone → See it on laptop
- Change theme on tablet → Updates everywhere

## 🛠️ Configuration

### Firestore Rules (Already Set Up)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /profiles/{profileId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Enable Offline Persistence

Already enabled in `firebase-sync.js`:
```javascript
await db.enablePersistence({ synchronizeTabs: true });
```

## 🔍 Troubleshooting

### Data Not Syncing?

1. Check internet connection
2. Verify you're signed in
3. Check browser console for errors
4. Try signing out and back in

### Migration Failed?

```javascript
// Clear cache and retry
localStorage.removeItem('firebase_migrated');
await migrateToFirebase();
```

### Multiple Tabs Warning?

This is normal - Firebase persistence works across tabs. No action needed.

## 📊 Data Privacy

- ✅ Your data is stored in **your Firebase project**
- ✅ Only accessible by **your authenticated account**
- ✅ Encrypted in transit and at rest
- ✅ Full control - you can delete anytime

## 🎮 Developer Commands

Open browser console on any page:

```javascript
// Check sync status
console.log(FirebaseSync.cache);

// Get continue watching
await FirebaseSync.getContinueWatching();

// Get bookmarks
await FirebaseSync.getBookmarks();

// Force migration
await migrateToFirebase();

// Clear local storage (after migration)
FirebaseSync.clearLocalStorage();

// Check current user
FirebaseSync.currentUser;
```

## 📝 Important Notes

1. **First Sign-In**: Migration prompt appears once
2. **localStorage Cleanup**: Can be done after successful migration
3. **Profile Support**: Each profile has separate synced data
4. **Real-Time**: Changes appear on other devices within seconds

## 🌟 Benefits

### Before (localStorage)
- ❌ Data stuck on one device
- ❌ Lost data if browser cleared
- ❌ No backup
- ❌ Can't switch devices

### After (Firebase Sync)
- ✅ Access anywhere
- ✅ Cloud backup
- ✅ Automatic sync
- ✅ Seamless device switching

## 🆘 Support

If you encounter issues:

1. Check browser console for errors
2. Verify Firebase configuration in `public/firebaseConfig.js`
3. Ensure Firestore is enabled in Firebase Console
4. Check Firestore security rules

## 🎉 Enjoy Your Synced Experience!

Your movie watching experience is now seamless across all your devices. Happy watching! 🍿
