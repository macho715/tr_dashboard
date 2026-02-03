Here is the requested analysis of the **Upload** feature and a proposed plan to disable it cleanly:

### 1. Upload-related code paths, routes & components

| Component/Path                                    | Purpose                                                                                                                                                                                                                         | Evidence                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **`components/evidence/EvidenceUploadModal.tsx`** | Modal that simulates evidence file uploads. It defines a `handleConfirm` function that generates a fake evidence item and fires `onConfirm`, and includes a hidden file input plus “Select file” and “Add (simulate)” buttons.  | This modal is the core of the upload UI.              |
| **`components/evidence/EvidenceTab.tsx`**         | Renders the evidence checklist. It accepts `onUploadClick`, `canUpload` and `evidenceOverlay` props. When `canUpload` is true, it renders an **Upload** button next to each evidence row; clicking it triggers `onUploadClick`. | Provides the upload entry point in the checklist.     |
| **`components/history/HistoryEvidencePanel.tsx`** | Combines History and Evidence tabs. It imports `EvidenceUploadModal` and manages state (`modalOpen`, `modalActivityId` etc.) to show the modal. It passes `onUploadClick`, `canUpload` and `evidenceOverlay` to `EvidenceTab`.  | Coordinates the upload modal and overlay.             |
| **`src/lib/stores/view-mode-store.tsx`**          | The `ViewModeProvider` sets `canUploadEvidence` to `true` when the view mode is `live`, enabling the upload functionality.                                                                                                      | Feature-flag controlling whether uploads are allowed. |

No separate Next.js route exists for uploading; all upload logic is encapsulated in these components.

### 2. Impact & removal strategy

1. **Disable the feature via flag:**
   Set `canUploadEvidence` to `false` in `ViewModeProvider` so uploads are globally turned off. With this change the **Upload** button and modal never render.
2. **Remove upload UI & state:**

   * Remove `EvidenceUploadModal` imports and associated state from `HistoryEvidencePanel.tsx`.
   * Remove the `onUploadClick`, `canUpload` props in `EvidenceTab.tsx` and delete the upload button.
   * Eliminate unused upload‑related state (`modalOpen`, `modalActivityId`, `evidenceOverlay`, etc.) in `HistoryEvidencePanel.tsx`.
   * Delete the modal file (`EvidenceUploadModal.tsx`) or keep it unused; either way it will no longer be imported.
3. **Check dependencies:**
   `EvidenceTab` is only used inside `HistoryEvidencePanel`, so removing its upload props won’t affect other components. No other components refer to `EvidenceUploadModal` or `onUploadClick`.
4. **Testing:**
   After removal, ensure the dashboard still builds and runs by running `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`. Since no other part of the system references these props, the changes should not break existing behaviour.

### 3. PR#1 (Structural removal) – scaffold and verify

**Changed files:**

* **`src/lib/stores/view-mode-store.tsx`** – hard‑code `canUploadEvidence` to `false` so uploads are disabled.
* **`components/history/HistoryEvidencePanel.tsx`** – remove upload‑related imports, state, callbacks and modal rendering; pass only `ssot` and `selectedActivityId` to `EvidenceTab`.
* **`components/evidence/EvidenceTab.tsx`** – remove `onUploadClick` and `canUpload` props and delete the Upload button from the UI.
* **`components/evidence/EvidenceUploadModal.tsx`** – now unused; can be deleted or left as unused.

**Verification commands (to run in project root):**

```bash
# Install dependencies if not already installed
npm install

# Check code quality and type safety
npm run lint
npm run typecheck

# Run unit tests
npm run test

# Build the Next.js app to ensure nothing breaks
npm run build
```

These commands should succeed without errors. The dashboard will still display the evidence checklist, but there will no longer be any way to upload evidence.
