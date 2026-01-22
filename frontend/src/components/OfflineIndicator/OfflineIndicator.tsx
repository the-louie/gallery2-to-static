/**
 * OfflineIndicator Component
 *
 * Component that displays when the device is offline, providing user feedback
 * about network connectivity status.
 *
 * @module frontend/src/components/OfflineIndicator
 */

import React from 'react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import './OfflineIndicator.css';

/**
 * Props for OfflineIndicator component
 */
export interface OfflineIndicatorProps {
  /** Optional CSS class name */
  className?: string;
}

/**
 * OfflineIndicator component
 *
 * Displays a banner when the device is offline, informing the user that
 * network connectivity is unavailable. Uses ARIA live regions for
 * accessibility.
 *
 * @param props - Component props
 * @returns React component or null if online
 */
export function OfflineIndicator({ className }: OfflineIndicatorProps): JSX.Element | null {
  const { isOffline } = useOfflineDetection();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className={`offline-indicator${className ? ` ${className}` : ''}`}
      role="alert"
      aria-live="assertive"
      aria-label="Network status: Offline"
    >
      <div className="offline-indicator-content">
        <span className="offline-indicator-icon" aria-hidden="true">
          ⚠️
        </span>
        <span className="offline-indicator-message">
          You are currently offline. Some features may be unavailable.
        </span>
      </div>
    </div>
  );
}

export default OfflineIndicator;
