## 📌 Description & Context
<!-- Provide a clear summary of the changes introduced in this Pull Request and the problem being solved. -->


## 🔗 Related Issue
<!-- Link the issue(s) this PR addresses using GitHub keywords (e.g., Fixes #123, Closes #456) -->
Closes #

---

## 🏷️ Type of Change
<!-- Check all that apply -->
- [ ] 🚀 `feat`: New feature or API endpoint
- [ ] 🐛 `fix`: Bug fix
- [ ] 🧪 `test`: New or updated tests
- [ ] 📚 `docs`: Documentation updates
- [ ] ♻️ `refactor`: Code refactoring without changing behavior
- [ ] ⚡ `perf`: Performance optimization
- [ ] 🔧 `chore`: Build process, CI/CD, or dependencies

---

## 🏛️ Scope / Impacted Workspaces
<!-- Select the workspaces touched by this PR -->
- [ ] `apps/server` (Elysia API, BullMQ queues, Winston auditing)
- [ ] `apps/web` (TanStack Router, React 19 dashboard, Leaflet maps)
- [ ] `apps/native` (Expo React Native student mobile app)
- [ ] `packages/db` (Prisma multi-schema migrations & clients)
- [ ] `packages/auth` (Better-Auth authentication)
- [ ] `packages/env` / `packages/validators` / `packages/config`
- [ ] `.github/workflows` (CI/CD pipelines, Docker, or deployments)

---

## 🧪 Pre-PR Verification Protocol
<!-- You MUST run and pass these three checks locally before opening this PR -->
- [ ] `bun run check-types` passed with 0 TypeScript errors across all workspaces
- [ ] `bun test` passed with 100% tests green
- [ ] `bun run build` completed successfully without build errors

---

## 🛡️ Security, Privacy & Integrity Checklist
<!-- Enforces institutional standards for CHARUSAT academic records -->
- [ ] **Zero Production Risk**: No tests or seeds touch or depend on remote live database instances.
- [ ] **Anti-Proxy Compliance**: Anti-proxy mechanics (HMAC QR nonces, GPS geofences, device binding) are maintained.
- [ ] **Route Guard Scoping**: New Elysia routes use scoped plugins (`.as("scoped")`) with appropriate `requireRole` guards.
- [ ] **Student Privacy**: Sensitive identifiers, biometric hashes, or credentials are never exposed via unauthenticated endpoints.
- [ ] **Atomic Transactions**: Multi-record mutations are executed inside Prisma `$transaction` blocks.

---

## 📸 Screenshots / Verification Logs (Optional)
<!-- Attach terminal outputs, screenshots, or screen recordings if applicable -->
