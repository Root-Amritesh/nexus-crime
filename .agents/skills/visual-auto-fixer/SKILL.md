---
name: visual-auto-fixer
description: Takes a full-page screenshot of the local development server to identify UI bugs, layout shifts, or visible errors, and automatically implements the fix.
---
# Visual QA and Repair Protocol

When asked to verify the UI or fix a visual bug, execute this exact sequence:

1.  **Capture:** Run the headless browser script `npx playwright screenshot http://localhost:3000 .agents/temp/current-state.png --full-page`. *(Note: adjust the port to match the active dev server).*
2.  **Analyze:** Ingest `current-state.png` into your vision context. Scan for overlapping text, misaligned components, broken images, or visible error overlays.
3.  **Trace:** Map the visual error on the screen to the specific component in the codebase (e.g., finding the exact React/Vue file responsible for that section).
4.  **Fix:** Apply the surgical rules to fix the CSS, HTML, or logic causing the visual bug.
5.  **Verify:** Run the capture command again and compare the new screenshot to verify the issue is resolved before reporting back.
