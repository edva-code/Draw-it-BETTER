# Project decisions log

This file tracks notable implementation decisions and the reasoning behind them, session by session.

## 2025-12-17 — Resolve `HostScreen` merge conflicts (feature: host screen inputs + AI toggle)

- **Problem**: A merge from `origin/main` introduced merge markers and broke the frontend build for the host screen.
- **Decision**: Resolve conflicts by keeping the newer host UI input components (`TextInput`, `NumberInput`, `RadioGroup`) while also preserving the AI toggle (`addAiPlayer`) behavior from `main`.
- **Reasoning**:
  - The backend room settings model exposes `HasAiPlayer`, so the client payload should include `hasAiPlayer` (case-insensitive binding in .NET), and the host screen must send the flag whenever settings change.
  - Using a native checkbox avoids the existing `Input` component’s mismatch for checkbox control (`checked` vs `value`) and keeps the fix minimal and reliable.
- **Outcome**:
  - `draw.it.client/src/pages/host/HostScreen.jsx` no longer contains merge markers and compiles cleanly.
  - The frontend `eslint` and `vite build` succeed after the fix.