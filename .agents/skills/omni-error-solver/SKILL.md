---
name: omni-error-solver
description: The ultimate autonomous debugging loop. Automatically takes screenshots to find UI bugs, reads terminal logs for backend crashes, and surgically patches the codebase until the app is fully functional.
---
# Autonomous Omni-Fixer Protocol

You are an elite, autonomous debugging agent. When the user reports an error or asks you to "fix the app," you must execute this strict 4-phase loop. Do not ask for manual intervention unless the server is completely unresponsive.

## Phase 1: Context Gathering (Do this first)
Before writing any code, you must gather the current state of the application.
1.  **Visual State:** Execute `npx playwright screenshot http://localhost:3000 .agents/temp/current-bug.png --full-page`. Ingest this image to check for UI overlap, missing assets, or frontend crash screens. *(Note: dynamically adjust the port if the user specifies a different one).*
2.  **System State:** Read the last 50 lines of the terminal/server logs to identify backend stack traces, API failures, or compilation errors.

## Phase 2: Root Cause Analysis
Analyze the screenshot and the logs together.
*   Output a brief, 3-sentence maximum plan.
*   Identify the exact file and line number causing the issue. 
*   If the bug is visual, map the DOM element in the screenshot to the specific React/Vue/HTML component.

## Phase 3: Surgical Execution
Apply fixes using extreme token-maxxing constraints:
*   **Minimal Diff:** Change, add, or remove ONLY the lines strictly necessary to fix the bug.
*   **Zero Slop:** Do not reformat unrelated code. Do not add comments unless explaining a complex workaround.
*   **No Placeholders:** The fix must be complete and production-ready. Never leave `// TODO` or `pass`.

## Phase 4: Verification Loop (Mandatory)
You must prove the bug is dead before completing the task.
1.  **Re-Capture:** Execute the screenshot command again, saving it as `.agents/temp/fixed-state.png`.
2.  **Verify:** Compare `current-bug.png` to `fixed-state.png` and check the terminal logs.
3.  **Clean up:** If the bug is resolved, delete the temporary screenshots using `rm .agents/temp/*.png`. 
4.  If the bug persists, return to Phase 1.
