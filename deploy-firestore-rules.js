#!/usr/bin/env node

/**
 * Firebase Firestore Rules Deployment Script
 * 
 * This script helps you deploy Firestore security rules to your Firebase project.
 * 
 * Prerequisites:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login to Firebase: firebase login
 * 3. Run this script: node deploy-firestore-rules.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Firestore Rules Deployment\n');

// Check if Firebase CLI is installed
try {
  execSync('firebase --version', { stdio: 'ignore' });
  console.log('✅ Firebase CLI is installed');
} catch (error) {
  console.error('❌ Firebase CLI not found');
  console.log('\n📦 Install it with: npm install -g firebase-tools');
  process.exit(1);
}

// Check if firestore.rules exists
const rulesPath = path.join(__dirname, 'firestore.rules');
if (!fs.existsSync(rulesPath)) {
  console.error('❌ firestore.rules file not found');
  process.exit(1);
}
console.log('✅ firestore.rules file found');

// Check if firebase.json exists
const firebaseJsonPath = path.join(__dirname, 'firebase.json');
if (!fs.existsSync(firebaseJsonPath)) {
  console.log('\n📝 Creating firebase.json...');
  const firebaseConfig = {
    firestore: {
      rules: 'firestore.rules'
    },
    hosting: {
      public: '.',
      ignore: [
        'firebase.json',
        '**/.*',
        '**/node_modules/**'
      ]
    }
  };
  fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseConfig, null, 2));
  console.log('✅ firebase.json created');
} else {
  console.log('✅ firebase.json exists');
}

console.log('\n🚀 Deploying Firestore rules...\n');

try {
  // Deploy firestore rules
  execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });
  console.log('\n✅ Firestore rules deployed successfully!');
  console.log('\n📊 Your database is now secured with the following rules:');
  console.log('   - Users can only access their own data');
  console.log('   - Each profile has isolated data storage');
  console.log('   - All other access is denied by default');
  console.log('\n🎉 Setup complete! Your app is ready for cross-device sync.\n');
} catch (error) {
  console.error('\n❌ Deployment failed');
  console.log('\n🔍 Troubleshooting:');
  console.log('   1. Make sure you are logged in: firebase login');
  console.log('   2. Make sure you have selected a project: firebase use --add');
  console.log('   3. Make sure you have Firestore enabled in Firebase Console');
  process.exit(1);
}
