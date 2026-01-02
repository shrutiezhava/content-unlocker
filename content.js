/**
 * Content Unlocker - Removes login/signup overlays and restores page readability
 * 
 * Strategy:
 * 1. Inject CSS overrides early to prevent overlay rendering
 * 2. Detect and neutralize blocking elements via heuristics
 * 3. Use MutationObserver to handle dynamically injected overlays
 * 4. Continuously monitor and unlock scrolling/overflow
 */

(function() {
  'use strict';

  // Track processed elements to avoid infinite loops
  const processedElements = new WeakSet();
  
  // Keywords that indicate login/signup walls
  const BLOCKING_KEYWORDS = [
    'modal', 'overlay', 'paywall', 'signup', 'login', 'sign-in', 'sign-in',
    'gate', 'wall', 'lock', 'subscribe', 'register', 'membership',
    'premium', 'paywalled', 'blocked', 'restricted', 'protected'
  ];
  
  // CSS classes/ids patterns to ignore (common non-blocking modals)
  const SAFE_PATTERNS = [
    'cookie', 'cookie-consent', 'gdpr', 'notification', 'tooltip',
    'dropdown', 'menu', 'sidebar', 'navigation'
  ];

  /**
   * Inject CSS to prevent common blocking mechanisms
   */
  function injectUnlockCSS() {
    const styleId = 'content-unlocker-styles';
    
    // Remove existing style if present (for page reloads)
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Unlock body/html scrolling */
      html, body {
        overflow: auto !important;
        position: relative !important;
        height: auto !important;
        max-height: none !important;
      }
      
      /* Remove common blur effects */
      body > *:not(script):not(style) {
        filter: none !important;
        -webkit-filter: none !important;
        backdrop-filter: none !important;
      }
      
      /* Neutralize fixed overlays via pointer-events */
      [class*="modal"][style*="fixed"],
      [class*="overlay"][style*="fixed"],
      [class*="paywall"][style*="fixed"],
      [id*="modal"][style*="fixed"],
      [id*="overlay"][style*="fixed"],
      [id*="paywall"][style*="fixed"],
      [role="dialog"][style*="fixed"],
      [aria-modal="true"][style*="fixed"] {
        pointer-events: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      
      /* Prevent scroll lock on main content */
      main, article, [role="main"], .content, #content {
        overflow: visible !important;
        position: relative !important;
      }
    `;
    
    // Inject at document_start if possible, otherwise wait for head
    if (document.head) {
      document.head.appendChild(style);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.head) document.head.appendChild(style);
      });
      
      // Fallback: inject into documentElement if head not available
      if (document.documentElement) {
        document.documentElement.appendChild(style);
      }
    }
  }

  /**
   * Calculate element viewport coverage percentage
   */
  function getViewportCoverage(element) {
    try {
      const rect = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportArea = viewportWidth * viewportHeight;
      
      const elementArea = rect.width * rect.height;
      const intersectionArea = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)) *
                               Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
      
      return (intersectionArea / viewportArea) * 100;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Check if element contains blocking keywords in class/id/aria-label
   */
  function hasBlockingKeywords(element) {
    const attrs = [
      element.className,
      element.id,
      element.getAttribute('aria-label'),
      element.getAttribute('data-testid'),
      element.getAttribute('data-cy')
    ].filter(Boolean).join(' ').toLowerCase();
    
    // Check if it contains blocking keywords but not safe patterns
    const hasBlocking = BLOCKING_KEYWORDS.some(keyword => attrs.includes(keyword));
    const hasSafe = SAFE_PATTERNS.some(pattern => attrs.includes(pattern));
    
    return hasBlocking && !hasSafe;
  }

  /**
   * Check if element is likely a blocking overlay
   */
  function isBlockingElement(element) {
    if (!element || processedElements.has(element)) return false;
    if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return false;
    
    try {
      const style = window.getComputedStyle(element);
      const position = style.position;
      const zIndex = parseInt(style.zIndex, 10) || 0;
      const display = style.display;
      
      // Skip hidden or display:none elements
      if (display === 'none' || style.visibility === 'hidden') return false;
      
      // Check for fixed/absolute positioning with high z-index
      if ((position === 'fixed' || position === 'absolute') && zIndex >= 1000) {
        const coverage = getViewportCoverage(element);
        // Large coverage area or blocking keywords indicate blocking element
        if (coverage > 70 || hasBlockingKeywords(element)) {
          return true;
        }
      }
      
      // Check for modal/dialog role with high z-index
      const role = element.getAttribute('role');
      const ariaModal = element.getAttribute('aria-modal');
      if ((role === 'dialog' || ariaModal === 'true') && zIndex >= 100) {
        const coverage = getViewportCoverage(element);
        if (coverage > 50) return true;
      }
      
      // Check for blocking keywords even without extreme positioning
      if (hasBlockingKeywords(element) && zIndex >= 100) {
        const coverage = getViewportCoverage(element);
        if (coverage > 40) return true;
      }
      
    } catch (e) {
      // Cross-origin or other errors - skip
      return false;
    }
    
    return false;
  }

  /**
   * Neutralize a blocking element (remove or make non-blocking)
   */
  function neutralizeElement(element) {
    if (!element || processedElements.has(element)) return;
    
    try {
      processedElements.add(element);
      
      // Strategy 1: Remove if it's clearly a blocking overlay
      if (hasBlockingKeywords(element)) {
        element.remove();
        return;
      }
      
      // Strategy 2: Make it non-blocking via CSS
      element.style.cssText += `
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: -9999 !important;
      `;
      
      // Also remove from DOM after a short delay if still present
      setTimeout(() => {
        if (element.parentNode) {
          element.remove();
        }
      }, 100);
      
    } catch (e) {
      // Ignore errors (cross-origin, etc.)
    }
  }

  /**
   * Unlock body/html scrolling and remove blur effects
   */
  function unlockScrolling() {
    try {
      // Unlock html element
      const html = document.documentElement;
      html.style.setProperty('overflow', 'auto', 'important');
      html.style.setProperty('overflow-x', 'auto', 'important');
      html.style.setProperty('overflow-y', 'auto', 'important');
      html.style.setProperty('position', 'relative', 'important');
      html.style.setProperty('height', 'auto', 'important');
      html.style.setProperty('max-height', 'none', 'important');
      
      // Unlock body element
      const body = document.body;
      if (body) {
        body.style.setProperty('overflow', 'auto', 'important');
        body.style.setProperty('overflow-x', 'auto', 'important');
        body.style.setProperty('overflow-y', 'auto', 'important');
        body.style.setProperty('position', 'relative', 'important');
        body.style.setProperty('height', 'auto', 'important');
        body.style.setProperty('max-height', 'none', 'important');
        
        // Remove blur filters
        const bodyFilter = window.getComputedStyle(body).filter;
        if (bodyFilter && bodyFilter.includes('blur')) {
          body.style.setProperty('filter', 'none', 'important');
        }
      }
      
      // Remove blur from main content containers
      const contentSelectors = ['main', 'article', '[role="main"]', '.content', '#content'];
      contentSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.filter && style.filter.includes('blur')) {
              el.style.setProperty('filter', 'none', 'important');
            }
            if (style.backdropFilter) {
              el.style.setProperty('backdrop-filter', 'none', 'important');
            }
          });
        } catch (e) {
          // Ignore querySelector errors
        }
      });
      
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Scan document for blocking elements and neutralize them
   */
  function scanAndUnlock() {
    unlockScrolling();
    
    // Check all elements (with reasonable limit)
    const allElements = document.querySelectorAll('*');
    const maxElements = Math.min(allElements.length, 5000); // Limit for performance
    
    for (let i = 0; i < maxElements; i++) {
      const element = allElements[i];
      if (isBlockingElement(element)) {
        neutralizeElement(element);
      }
    }
  }

  /**
   * Initialize MutationObserver to watch for dynamically added overlays
   */
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      mutations.forEach((mutation) => {
        // Check added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check the node itself
            if (isBlockingElement(node)) {
              neutralizeElement(node);
              shouldScan = true;
            }
            
            // Check descendants (limit depth for performance)
            try {
              const descendants = node.querySelectorAll ? node.querySelectorAll('*') : [];
              const maxDescendants = Math.min(descendants.length, 100);
              for (let i = 0; i < maxDescendants; i++) {
                if (isBlockingElement(descendants[i])) {
                  neutralizeElement(descendants[i]);
                  shouldScan = true;
                }
              }
            } catch (e) {
              // Ignore querySelector errors
            }
          }
        });
        
        // Check for attribute changes that might enable blocking (e.g., style changes)
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          const target = mutation.target;
          if (isBlockingElement(target)) {
            neutralizeElement(target);
            shouldScan = true;
          }
        }
      });
      
      // Re-unlock scrolling if DOM changed significantly
      if (shouldScan) {
        unlockScrolling();
      }
    });
    
    // Observe document changes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'id']
    });
    
    return observer;
  }

  /**
   * Main initialization
   */
  function init() {
    // Inject CSS as early as possible
    injectUnlockCSS();
    
    // Initial scan when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        scanAndUnlock();
        setupMutationObserver();
      });
    } else {
      scanAndUnlock();
      setupMutationObserver();
    }
    
    // Periodic re-scan for robustness (debounced)
    let scanTimeout;
    const periodicScan = () => {
      clearTimeout(scanTimeout);
      scanTimeout = setTimeout(() => {
        scanAndUnlock();
      }, 2000); // Scan every 2 seconds
    };
    
    // Re-scan on scroll/resize (overlays might reposition)
    window.addEventListener('scroll', periodicScan, { passive: true });
    window.addEventListener('resize', periodicScan, { passive: true });
    
    // Re-scan periodically
    setInterval(periodicScan, 5000);
    
    // Re-unlock scrolling on any user interaction (some sites lock on interaction)
    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, unlockScrolling, { passive: true, once: false });
    });
  }

  // Run initialization
  init();
})();

