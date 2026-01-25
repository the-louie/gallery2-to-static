/**
 * Image Config Context
 *
 * Provides the image base URL from runtime config (image-config.json) so that
 * image URLs use the configured domain (e.g. https://lanbilder.se) instead of
 * the default /images on first paint. Config is loaded asynchronously; the
 * provider starts with DEFAULT_BASE_URL and updates when config loads, causing
 * consumers to re-render with the correct base URL.
 *
 * @module frontend/src/contexts/ImageConfigContext
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadImageConfig, DEFAULT_BASE_URL } from '@/utils/imageConfig';

export interface ImageConfigContextValue {
  /** Base URL for image assets (no trailing slash). Updates after config load. */
  baseUrl: string;
}

const ImageConfigContext = createContext<ImageConfigContextValue>({
  baseUrl: DEFAULT_BASE_URL,
});
ImageConfigContext.displayName = 'ImageConfigContext';

export interface ImageConfigProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that loads image-config.json and exposes baseUrl so image URLs
 * use the configured base (e.g. https://lanbilder.se) once loaded.
 */
export function ImageConfigProvider({ children }: ImageConfigProviderProps): React.ReactElement {
  const [baseUrl, setBaseUrl] = useState<string>(DEFAULT_BASE_URL);

  useEffect(() => {
    loadImageConfig().then(setBaseUrl);
  }, []);

  const value: ImageConfigContextValue = { baseUrl };

  return (
    <ImageConfigContext.Provider value={value}>
      {children}
    </ImageConfigContext.Provider>
  );
}

export function useImageBaseUrl(): string {
  const { baseUrl } = useContext(ImageConfigContext);
  return baseUrl;
}
