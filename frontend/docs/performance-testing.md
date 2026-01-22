# Performance Testing Guide

## Overview

This document describes how to test and validate performance optimizations in the gallery2-to-static frontend application.

## Performance Targets

### Lighthouse Score

- **Target:** > 90
- **Measurement:** Run Lighthouse audit in Chrome DevTools

### Core Web Vitals

- **LCP (Largest Contentful Paint):** < 2.5s (good)
- **INP (Interaction to Next Paint):** < 200ms (good)
- **CLS (Cumulative Layout Shift):** < 0.1 (good)
- **FCP (First Contentful Paint):** < 1.8s (good)
- **TTFB (Time to First Byte):** < 800ms (good)

### Bundle Sizes

- Initial bundle: < 200KB gzipped
- Route chunks: < 50KB gzipped each
- Lightbox chunk: < 30KB gzipped
- Total bundle: < 500KB gzipped

## Testing Methods

### 1. Lighthouse Audit

Run Lighthouse audit in Chrome DevTools:

1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Performance" category
4. Choose "Desktop" or "Mobile" device
5. Click "Analyze page load"
6. Review the performance score and recommendations

**Expected Results:**
- Performance score > 90
- All Core Web Vitals in "good" range
- No critical performance issues

### 2. Core Web Vitals Monitoring

The application automatically monitors Web Vitals in development mode:

1. Open browser console
2. Navigate through the application
3. Look for Web Vitals logs (✅ good, ⚠️ needs improvement, ❌ poor)

**Example Console Output:**
```
✅ Web Vital: LCP = 1234.56 (good)
✅ Web Vital: INP = 145.67 (good)
✅ Web Vital: CLS = 0.05 (good)
✅ Web Vital: FCP = 890.12 (good)
✅ Web Vital: TTFB = 234.56 (good)
```

### 3. Bundle Size Analysis

Analyze bundle sizes using rollup-plugin-visualizer:

1. Run `npm run build:analyze`
2. Open `dist/stats.html` in browser
3. Review bundle composition and sizes
4. Verify chunks are within budget limits

**Check:**
- Initial bundle < 200KB gzipped
- Route chunks < 50KB gzipped each
- Lightbox chunk < 30KB gzipped
- Total bundle < 500KB gzipped

### 4. Automated Bundle Size Checks

Run automated bundle size checks:

```bash
npm run size-check:build
```

This will:
1. Build the application in production mode
2. Check bundle sizes against configured limits
3. Report any violations

### 5. React DevTools Profiler

Profile component re-renders:

1. Install React DevTools browser extension
2. Open DevTools → "Profiler" tab
3. Click "Record" button
4. Interact with the application
5. Click "Stop" button
6. Review component render times and re-render frequency

**Check:**
- Components with React.memo should not re-render unnecessarily
- Expensive computations should use useMemo
- Callbacks should use useCallback

### 6. Chrome DevTools Performance

Profile JavaScript execution:

1. Open Chrome DevTools → "Performance" tab
2. Click "Record" button
3. Interact with the application
4. Click "Stop" button
5. Review performance timeline

**Check:**
- No long tasks (> 50ms)
- Fast JavaScript execution time
- Minimal main thread blocking

## Performance Test Checklist

- [ ] Lighthouse score > 90
- [ ] LCP < 2.5s
- [ ] INP < 200ms
- [ ] CLS < 0.1
- [ ] FCP < 1.8s
- [ ] TTFB < 800ms
- [ ] Initial bundle < 200KB gzipped
- [ ] Route chunks < 50KB gzipped each
- [ ] Lightbox chunk < 30KB gzipped
- [ ] Total bundle < 500KB gzipped
- [ ] No unnecessary component re-renders
- [ ] No long tasks in performance profile

## Continuous Monitoring

### Development

Web Vitals are automatically logged to console in development mode.

### Production

For production monitoring, integrate Web Vitals with an analytics service:

1. Modify `useWebVitals` hook
2. Send metrics to analytics service (e.g., Google Analytics, custom endpoint)
3. Set up alerts for performance regressions

## Troubleshooting

### High Bundle Size

1. Run bundle analysis to identify large dependencies
2. Consider lazy-loading more components
3. Review and remove unused dependencies
4. Check for duplicate dependencies

### Poor Core Web Vitals

1. Check image loading (ensure lazy loading is working)
2. Review JavaScript execution time
3. Check for render-blocking resources
4. Verify code splitting is working correctly

### Component Re-renders

1. Use React DevTools Profiler to identify components
2. Add React.memo where appropriate
3. Check Context providers for unnecessary updates
4. Verify useMemo/useCallback dependencies

## References

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
