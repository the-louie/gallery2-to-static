/**
 * Web Vitals Monitoring Hook
 *
 * Monitors and reports Core Web Vitals metrics using the web-vitals library.
 * Provides real-time performance metrics for LCP, INP, CLS, FCP, and TTFB.
 *
 * ## Core Web Vitals
 *
 * - LCP (Largest Contentful Paint): Measures loading performance
 * - INP (Interaction to Next Paint): Measures interactivity (replaces FID)
 * - CLS (Cumulative Layout Shift): Measures visual stability
 * - FCP (First Contentful Paint): Measures initial render time
 * - TTFB (Time to First Byte): Measures server response time
 *
 * ## Usage
 *
 * ```tsx
 * import { useWebVitals } from '@/hooks/useWebVitals';
 *
 * function App() {
 *   useWebVitals();
 *   return <YourApp />;
 * }
 * ```
 */

import { useEffect } from 'react';

/**
 * Web Vitals metric data
 */
export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

/**
 * Web Vitals thresholds
 */
const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // milliseconds
  INP: { good: 200, poor: 500 }, // milliseconds
  CLS: { good: 0.1, poor: 0.25 }, // score
  FCP: { good: 1800, poor: 3000 }, // milliseconds
  TTFB: { good: 800, poor: 1800 }, // milliseconds
} as const;

/**
 * Get rating for a metric value
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name as keyof typeof WEB_VITALS_THRESHOLDS];
  if (!thresholds) {
    return 'good';
  }

  if (value <= thresholds.good) {
    return 'good';
  }
  if (value >= thresholds.poor) {
    return 'poor';
  }
  return 'needs-improvement';
}

/**
 * Report Web Vitals metric
 */
function reportMetric(metric: WebVitalsMetric): void {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(
      `${emoji} Web Vital: ${metric.name} = ${metric.value.toFixed(2)} (${metric.rating})`,
    );
  }

  // In production, you can send to analytics service
  // Example: sendToAnalytics(metric);
}

/**
 * Hook to monitor Web Vitals
 *
 * Automatically collects and reports Core Web Vitals metrics.
 * Metrics are reported once per page load.
 *
 * @example
 * ```tsx
 * function App() {
 *   useWebVitals();
 *   return <YourApp />;
 * }
 * ```
 */
export function useWebVitals(): void {
  useEffect(() => {
    // Dynamically import web-vitals to avoid including it in the initial bundle
    // This allows the monitoring to be code-split
    import('web-vitals').then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
      // Largest Contentful Paint
      onLCP((metric) => {
        reportMetric({
          name: 'LCP',
          value: metric.value,
          rating: getRating('LCP', metric.value),
          delta: metric.delta,
          id: metric.id,
        });
      });

      // Interaction to Next Paint (replaces FID in web-vitals v3)
      onINP((metric) => {
        reportMetric({
          name: 'INP',
          value: metric.value,
          rating: getRating('INP', metric.value),
          delta: metric.delta,
          id: metric.id,
        });
      });

      // Cumulative Layout Shift
      onCLS((metric) => {
        reportMetric({
          name: 'CLS',
          value: metric.value,
          rating: getRating('CLS', metric.value),
          delta: metric.delta,
          id: metric.id,
        });
      });

      // First Contentful Paint
      onFCP((metric) => {
        reportMetric({
          name: 'FCP',
          value: metric.value,
          rating: getRating('FCP', metric.value),
          delta: metric.delta,
          id: metric.id,
        });
      });

      // Time to First Byte
      onTTFB((metric) => {
        reportMetric({
          name: 'TTFB',
          value: metric.value,
          rating: getRating('TTFB', metric.value),
          delta: metric.delta,
          id: metric.id,
        });
      });
    }).catch((error) => {
      // Handle error gracefully - web-vitals might not be available
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to load web-vitals:', error);
      }
    });
  }, []);
}
