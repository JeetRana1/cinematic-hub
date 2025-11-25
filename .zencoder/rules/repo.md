---
description: Repository Information Overview
alwaysApply: true
---

# Cinematic Hubs Information

## Summary
Cinematic Hubs is a Firebase-hosted web application for streaming movies with user authentication, watch history tracking, and personalized profiles. The application provides a multi-page experience with a video player, user management, and continue-watching functionality. It's built as a static site deployed on Firebase Hosting with client-side Firebase integration.

## Structure
The project is organized with a flat structure containing:
- **Root HTML pages**: Multi-page application entry points (index, login, player, etc.)
- **js/**: Client-side JavaScript modules for authentication, UI, and continue-watching features
- **css/**: Stylesheets for specific features (continue-watching, player fixes, subtitles)
- **public/**: Generated configuration files for Firebase and Email services
- **scripts/**: Build-time scripts for config generation
- **node_modules/**: Node.js dependencies for build tools

### Main Components
- **Video Player** (player.html - 195KB): Central video playback interface with continue-watching integration
- **Authentication System** (login.html, forgot.html, reset.html): User account management and authentication
- **Home Page** (index.html - 274KB): Main content browsing and recommendations
- **User Features** (profiles.html, mylist.html, settings.html): Profile management and user preferences
- **Continue-Watching Module**: Multi-file system for tracking and resuming playback progress

## Language & Runtime
**Language**: JavaScript (Client-side) / Node.js (Build scripts)
**JavaScript Runtime**: Client-side (Browser) + Node.js for build scripts
**SDK Version**: Firebase SDK 9.23.0 (Compatibility mode)
**Build System**: npm Scripts
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- `@sendgrid/mail` (^8.1.6) - Email service for notifications and password reset
- `node-fetch` (^3.3.2) - HTTP client for Node.js scripts
- `firebase` (9.23.0 via CDN) - Client-side authentication and database
- `emailjs-com` (3.x via CDN) - Client-side email service

**Development/Build Tools**:
- Build scripts using Node.js filesystem and process modules

## Build & Installation
```bash
# Install dependencies
npm install

# Generate configuration files (runs automatically as prebuild)
npm run prebuild

# Manual config generation
node scripts/generateFirebaseConfig.js
node scripts/generateEmailConfig.js
```

**Build Process**: 
- Pre-build scripts generate `public/firebaseConfig.js` and `public/emailConfig.js` from environment variables
- No bundling or transpilation step; files serve as-is to browser
- Firebase SDK loaded from CDN (gstatic.com)

## Main Files & Resources
**Application Entry Points**:
- `index.html` (274KB) - Main home/browse page
- `login.html` (38KB) - Authentication page
- `player.html` (195KB) - Video player interface
- `mylist.html` (31KB) - User watch list
- `profiles.html` (65KB) - User profile management
- `settings.html` (54KB) - Application settings
- `forgot.html` (21KB) - Password recovery
- `reset.html` (21KB) - Password reset confirmation

**JavaScript Modules** (js/):
- `auth-firebase.js` - Firebase authentication integration
- `ui.js` - UI utility functions
- `player-continue-watching.js` (33KB) - Player integration with resume functionality
- `continue-watching.js` - Watch progress persistence
- `continue-watching-manager.js` - Progress data management
- `continue-watching-display.js` - UI rendering for resume prompts
- `continue-watching-ui.js` - UI component utilities

**Stylesheets** (css/):
- `continue-watching.css` - Resume watch prompt styling
- `player-landscape-fix.css` - Mobile player layout fix
- `skip-notification-fix.css` - Notification UI adjustments
- `subtitles.css` - Subtitle rendering styles

**Configuration Files**:
- `firebase.json` - Firebase Hosting configuration with routing rewrites
- `package.json` - Project metadata and build scripts
- `public/firebaseConfig.js` - Generated at build time from environment variables
- `public/emailConfig.js` - Generated at build time from environment variables

## Docker
No Docker configuration present in the repository. Application is deployed directly to Firebase Hosting.

## Testing
No application test files configured. The project contains no test framework setup or test commands defined in package.json.
