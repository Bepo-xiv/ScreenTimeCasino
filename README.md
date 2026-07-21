# Screen Time Casino

A blackjack game for Android where the stakes are your own screen time, tracked per app. Configure
a daily minute budget per app (Instagram, TikTok, ...); once it runs out, you have to win minutes
back at the table to keep using it. Losing a hand permanently removes the staked minutes from that
app's budget for the day.

## Current status

- **Blackjack engine** (`src/engine/`): pure TypeScript, fully unit-tested (deck/shuffle, hand
  values, dealer AI, payouts, and the game state machine).
- **Screens & persistence** (`src/screens/`, `src/storage/`): dashboard, app configuration, and the
  blackjack table are wired up end-to-end against on-device storage (MMKV), so budgets persist
  across app restarts.
- **Real screen time / enforcement**: not built yet. `src/native/UsageStatsBridge.ts` currently
  returns **mock data** (a fixed catalog of popular apps, deterministic fake "usage today" numbers)
  standing in for the native Android module that will read real `UsageStatsManager` data and, later,
  an `AccessibilityService` that actually blocks an app once its budget hits zero. Both are planned
  next steps and require a native Kotlin module + guided permission flows that can only be verified
  on a real Android device.

## Prerequisites to run on a device/emulator

This machine currently has **Java 26** installed, which is too new for the Android Gradle Plugin
used here — you'll need **JDK 17** available (with `JAVA_HOME` pointed at it) plus the **Android
SDK** (`ANDROID_HOME`/`ANDROID_SDK_ROOT` set, platform-tools on `PATH`) and either a running
emulator or a device connected over `adb`. None of that is set up in this environment yet, so
`npm run android` won't succeed here until it is.

## Commands

```sh
npm test          # run the Jest test suite (engine logic + a full-app smoke render)
npx tsc --noEmit  # type-check
npx eslint src App.tsx index.js __mocks__
npm start         # Metro bundler
npm run android   # build & install on a connected device/emulator (needs the prerequisites above)
```

## Project layout

- `src/engine/` — blackjack rules (deck, hand values, dealer, payouts, reducer). No RN/device
  dependency; runs anywhere Jest does.
- `src/storage/` — MMKV-backed repos: managed app config, per-app daily budgets (lazy midnight
  reset), and hand history.
- `src/native/UsageStatsBridge.ts` — facade over Android usage-stats data; mock implementation for
  now, real TurboModule implementation planned.
- `src/screens/`, `src/navigation/`, `src/components/` — the app UI (Dashboard, app config, add-app
  picker, the blackjack table itself).
- `android/` — Android-only (no iOS project). Native module directories (`usagestats/`, `blocking/`)
  are scaffolded under `android/app/src/main/java/com/screentimecasino/` for the upcoming
  real-screen-time and enforcement work.
