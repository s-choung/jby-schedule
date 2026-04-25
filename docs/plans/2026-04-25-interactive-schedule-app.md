# Interactive Schedule App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-based interactive weekly schedule editor matching the provided sketch, with free-form blocks, resizable schedule items, weekday/date headers, and daily JSON persistence.

**Architecture:** Use a dependency-free static web app. Keep reusable date/state/layout logic in `scheduler-core.js` so it can be tested with Node's built-in test runner; keep DOM interactions in `app.js`; keep styling in `styles.css`.

**Tech Stack:** Vanilla HTML, CSS, JavaScript ES modules, Node built-in `node:test` for logic tests, browser File System Access API with localStorage/download fallback.

---

### Task 1: Core scheduling logic

**Files:**
- Create: `scheduler-core.js`
- Create: `test/core.test.js`

**Steps:**
1. Write failing tests for week date generation, daily filename formatting, block creation, patching, clamping, and time conversion.
2. Run `node --test test/core.test.js` and confirm failure because `scheduler-core.js` is missing.
3. Implement minimal pure functions in `scheduler-core.js`.
4. Run `node --test test/core.test.js` and confirm pass.

### Task 2: Static app shell

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`

**Steps:**
1. Build the two-pane layout: left canvas/palette and right weekly board.
2. Render weekday/date headers and time grid.
3. Add toolbar controls for week navigation, block creation, style editing, JSON import/export, and folder selection.

### Task 3: Interaction model

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

**Steps:**
1. Implement click selection and inline title editing.
2. Implement pointer-based drag for blocks in both left area and schedule board.
3. Implement resize handles for every block.
4. Snap schedule blocks to day columns and time rows while preserving free-form dimensions where possible.

### Task 4: Persistence

**Files:**
- Modify: `app.js`
- Create/maintain: `data/.gitkeep`

**Steps:**
1. Save every state change to localStorage.
2. If user grants folder access, save daily JSON as `YYYY-MM-DD.json`.
3. Provide import/export fallback for browsers without File System Access API.
4. Add visible save status.

### Task 5: Documentation and verification

**Files:**
- Create: `README.md`

**Steps:**
1. Document local run command and browser persistence caveats.
2. Run `node --test test/core.test.js`.
3. Run a lightweight static syntax check with `node --check scheduler-core.js` and `node --check app.js`.
4. Inspect generated files and report changed files, simplifications, and risks.
