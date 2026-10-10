# Validation

Tested on 2026-10-10: macOS ARM64, Python 3.9.6, pinned dependencies.

Four automated tests cover the difference/adjoint identity; grayscale and RGB reconstruction; exact known-pixel preservation; independence from hidden original values; pixel bounds and dual bound; the shared-interior boundary convention; upload validation; paused initialization; ten-iteration stepping; resume and WebSocket completion. All passed after the version 1.1 changes.

Version 1.0 browser checks covered masking, k=10 pause, k=1000 completion, image switching, PNG upload, JSON save/restore, timeline endpoints and the pixel table. Desktop (1280 px) and narrow (390 px) layouts were inspected. A clean environment successfully installed and served through launch.py.

Version 1.1 uses English throughout the interface, runtime messages, launch scripts and documentation. It follows the lecture's “Examples: image in-painting” terminology and x_orig/K notation. The full formulation precedes the images; notes and pixel inspection are collapsed until needed. Solver and experiment schema are unchanged.

Windows/Linux scripts are provided but have not been tested on those operating systems. No public deployment has been tested.

Version 1.1 browser checks: English-only rendered text, mask creation, pause at k=10, resume to k=1000, pixel inspection, collapsed classroom view, and 1280/390 px layouts. No horizontal overflow was observed at 390 px.

## Version 1.2 browser solver

Five tests passed, including grayscale/RGB parity against the Python solver after 75 iterations (pixel tolerance 1e-12; metrics checked to 10 decimal places). Browser checks verified stepping to k=10, pausing/resuming, and independent RGB/grayscale images with no browser error logs.
