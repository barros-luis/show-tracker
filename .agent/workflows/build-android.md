---
description: How to build AShowTracker for Android mobile
---

## Prerequisites Setup

### 1. Android Studio & SDK
// turbo
```powershell
# Download and install Android Studio from https://developer.android.com/studio
# Then open Android Studio and go to SDK Manager (Settings > Appearance & Behavior > System Settings > Android SDK)
```

In SDK Manager, install:
- Android SDK Platform (API 34 or latest)
- Android SDK Platform-Tools
- NDK (Side by side) - version 26 or later
- Android SDK Build-Tools
- Android SDK Command-line Tools

### 2. Set Environment Variables
```powershell
# Add to your PowerShell profile or set as system environment variables
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\<version>"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
```

### 3. Add Rust Android Targets
// turbo
```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

## Initialize Android Project

Navigate to the project root and run:

// turbo
```bash
cargo tauri android init
```

This will create the `src-tauri/gen/android` directory with the Android project.

## Development

### Run on Connected Device/Emulator
// turbo
```bash
cargo tauri android dev
```

### Open in Android Studio for Debugging
// turbo
```bash
cargo tauri android dev --open
```

## Production Build

### Build Debug APK
// turbo
```bash
cargo tauri android build --debug
```

### Build Release APK/AAB
// turbo
```bash
cargo tauri android build
```

The APK will be in `src-tauri/gen/android/app/build/outputs/apk/`

## Troubleshooting

### NDK Not Found
Make sure `NDK_HOME` points to the correct NDK version folder:
```powershell
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\26.1.10909125"  # Use your actual version
```

### SDK Platform Not Found
Open Android Studio > SDK Manager and install the required SDK platform.

### Emulator Issues
Create an AVD (Android Virtual Device) in Android Studio:
1. Tools > Device Manager
2. Create Device
3. Select a phone (e.g., Pixel 7)
4. Download a system image (API 34)
5. Finish and start the emulator
