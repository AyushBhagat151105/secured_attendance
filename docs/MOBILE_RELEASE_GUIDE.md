# Native Android App Release & Self-Hosted Update Guide

> **Target Platform**: Android (ARM64-v8a / Android 7.0+ / API Level 24 to 36)  
> **Student App Workspace**: `apps/native/`  
> **Direct Download Endpoint**: `https://attendance-api.ayushbhagat.com/download/secured-attendance.apk`  
> **Version Discovery API**: `https://attendance-api.ayushbhagat.com/api/app/version`  

---

## 1. Dual-Track Update Architecture

The CHARUSAT Secured Attendance native mobile application bypasses the Google Play Store by implementing a **dual-track update architecture**:

```text
                                  ┌───────────────────────────┐
                                  │      Code Change Type     │
                                  └─────────────┬─────────────┘
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
             [ JavaScript / UI Only ]                          [ Native Modules / SDK ]
       (React components, styles, queries)              (Camera, Location, Expo updates, gradle)
                       │                                                 │
                       ▼                                                 ▼
              Track 1: Instant OTA                             Track 2: Cloud APK Build
           (.github/workflows/deploy-ota.yml)              (.github/workflows/deploy-apk.yml)
                       │                                                 │
                       ▼                                                 ▼
             Hermes Bytecode Bundle                            Minified Release APK
             Exported in ~60 seconds                           Compiled in ~12 minutes
                       │                                                 │
                       ▼                                                 ▼
               VPS Uploads Directory                             VPS Downloads Directory
            (/root/.../uploads/updates)                       (/root/.../uploads/downloads)
                       │                                                 │
                       ▼                                                 ▼
          Silent Background In-App Sync                    In-App Upgrade Prompt & Download
          (via expo-updates upon launch)                    (via Android Package Installer)
```

---

## 2. Track 1: Over-The-Air (OTA) Instant Updates

When modifying user interface components, hooks, or business logic inside `apps/native/src/**` that do not alter native Java/Kotlin code:

### Workflow Details:
1. **Trigger**: Pushing commits modifying files under `apps/native/src/**` to `main`.
2. **Compilation**: GitHub Actions runs `npx expo export` targeting Android, compiling JavaScript code into optimized Hermes bytecode (`.hbc`).
3. **Manifest Generation**: Generates `metadata.json` referencing assets and bytecode bundles with SHA-256 integrity hashes.
4. **Delivery**: Transferred via SCP directly to `/root/secured_attendance/uploads/updates` on the Hostinger VPS.
5. **Client Behavior**: When students launch the mobile app, `expo-updates` queries `/updates`, detects the new manifest ID, downloads the bundle silently, and applies it on next launch.

---

## 3. Track 2: Native Android APK Cloud Compilation

When adding new native packages, modifying Android permissions, or updating the Android Gradle configuration:

### Workflow Details (`.github/workflows/deploy-apk.yml`):
1. **Triggers**:
   - **Tag Push**: Pushing a version tag matching `v*.*.*` (e.g., `git tag v1.0.1 && git push origin v1.0.1`).
   - **Manual Dispatch**: Navigating to GitHub Actions > **Build & Deploy Native Android APK** > **Run workflow**.

2. **Runner Toolchain**:
   - OpenJDK 17 (`temurin` distribution).
   - Android SDK Tools with Build-Tools `36.0.0`, `compileSdk 36`, `targetSdk 36`, `minSdk 24`.
   - Node.js 22 & Bun runtime.
   - Gradle Build Cache (`gradle/actions/setup-gradle@v4`).

3. **Compilation Command**:
   ```bash
   cd apps/native/android
   sed -i '/org.gradle.java.home/d' gradle.properties || true
   chmod +x gradlew
   ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
   ```
   - `-PreactNativeArchitectures=arm64-v8a`: Excludes unused 32-bit x86/ARM architectures, reducing APK size from ~85MB to ~32MB.
   - ProGuard/R8: Enables code minification and unused resource shrinking (`shrinkResources true`).

4. **Distribution Pipeline**:
   - Copies output APK to `release-output/secured-attendance.apk`.
   - Uploads binary as a 30-day downloadable workflow artifact.
   - Ensures `/root/secured_attendance/uploads/downloads` exists on the VPS via SSH.
   - Transfers `secured-attendance.apk` to the VPS downloads directory via SCP (`overwrite: true`).
   - If triggered by a version tag, automatically publishes a GitHub Release with the APK attached.

---

## 4. In-App Auto-Update & Version Discovery

The native mobile app checks for mandatory updates on every startup via `apps/native/src/hooks/use-app-update.ts`:

1. **Version Endpoint**:
   The Elysia backend serves version constraints at `/api/app/version`:
   ```json
   {
     "version": "1.0.1",
     "minRequiredVersion": "1.0.0",
     "apkUrl": "https://attendance-api.ayushbhagat.com/download/secured-attendance.apk",
     "releaseNotes": "Automatic geofencing, hardware binding & anti-clone virtual container detection."
   }
   ```

2. **Update Modal Flow**:
   - If `currentVersion < minRequiredVersion`: The app displays an unclosable **Mandatory Update Required** modal.
   - If `currentVersion < latestVersion`: The app displays an optional update banner with the release notes.
   - Tapping **Update Now** downloads the APK into the application cache directory using `expo-file-system` and initiates the native Android package installer via `expo-intent-launcher`.

---

## 5. Required Android Device Permissions

The student application requests the following Android runtime permissions:

| Permission | Technical Name | Purpose in Attendance System |
| :--- | :--- | :--- |
| **Camera** | `android.permission.CAMERA` | Powers the Vision Camera HUD for scanning rotating HMAC-SHA256 QR codes. |
| **Fine Location** | `android.permission.ACCESS_FINE_LOCATION` | Required to calculate Haversine distance against the classroom polygon. |
| **Coarse Location** | `android.permission.ACCESS_COARSE_LOCATION` | Fallback indoor location coordinate provider. |
| **Install Packages** | `android.permission.REQUEST_INSTALL_PACKAGES` | Allows the in-app updater to install downloaded `.apk` files without Google Play. |

---

## 6. Student Installation & Sideloading Guide

To distribute the application to students across CHARUSAT:

1. Direct students to `https://attendance-api.ayushbhagat.com/download/secured-attendance.apk`.
2. When prompted by Android with *"File might be harmful"*, tap **Download anyway** (standard for non-Play Store APKs).
3. Open the downloaded file.
4. If Android displays *"For your security, your phone is not allowed to install unknown apps from this source"*:
   - Tap **Settings**.
   - Toggle **Allow from this source** to ON.
   - Return to installer and tap **Install**.
5. On first launch, grant **Camera** and **Location (While using app)** permissions.
6. Log in with your CHARUSAT student credentials (`@charusat.edu.in`) to bind your physical device.
