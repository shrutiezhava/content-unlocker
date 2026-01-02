# Content Unlocker

A Firefox browser extension that automatically removes login/signup overlays and restores full page readability and scrolling.

## Philosophy

Content Unlocker operates silently in the background with zero configuration. It detects and neutralizes common blocking mechanisms used by websites to gate content behind login/signup walls, restoring normal page functionality without requiring user interaction.

## How It Works

The extension employs a multi-layered defense strategy:

1. **CSS Injection**: Injects styles early to prevent overlay rendering and unlock scrolling
2. **Element Detection**: Uses heuristics to identify blocking overlays (position, z-index, coverage, keywords)
3. **Dynamic Monitoring**: Uses MutationObserver to catch overlays injected after page load
4. **Scroll Unlocking**: Continuously ensures body/html overflow properties allow scrolling
5. **Neutralization**: Removes or disables blocking elements via CSS (display:none, pointer-events, z-index)

## Installation

### Development Installation

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on..."
4. Select the `manifest.json` file from this directory
5. The extension is now active

### Production Build (for distribution)

1. Create a ZIP archive containing:
   - `manifest.json`
   - `content.js`
   - `README.md`
   - `icons/` directory (optional, for extension icons)

2. Submit to Firefox Add-ons or distribute as `.xpi` file

## Features

- **Zero Configuration**: Works immediately after installation
- **No UI**: Silent operation, no popups or notifications
- **Performance Optimized**: Efficient scanning with limits and debouncing
- **Dynamic Content Support**: Handles React/Vue portals and SPA route changes
- **Defensive Programming**: Handles edge cases and cross-origin restrictions gracefully

## Detection Heuristics

The extension identifies blocking elements using:

- **Position & Z-Index**: Fixed/absolute positioned elements with high z-index (>1000)
- **Viewport Coverage**: Elements covering >70% of viewport
- **Keyword Matching**: Class/id/aria-label containing: modal, overlay, paywall, signup, login, gate, wall, etc.
- **Role Attributes**: Elements with `role="dialog"` or `aria-modal="true"`
- **Safe Pattern Exclusion**: Ignores cookie notices, tooltips, and navigation elements

## Technical Details

- **Manifest Version**: 3
- **Permissions**: `activeTab`, `scripting`
- **Content Script**: Runs at `document_start` for early intervention
- **Target**: All URLs (`<all_urls>`)

## Limitations

- Does not bypass actual authentication requirements
- Does not unlock premium/subscription content
- May not work on sites with aggressive anti-extension measures
- Some overlays with non-standard implementations may require site-specific handling

## Code Structure

- `manifest.json`: Extension configuration and permissions
- `content.js`: Main content script with all unlocking logic
- `README.md`: This file

## License

This extension is provided as-is for educational and personal use.

