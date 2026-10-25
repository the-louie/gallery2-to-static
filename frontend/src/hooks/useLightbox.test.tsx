/**
 * useLightbox navigation (LOGIC-17): closing goes Back when the lightbox was opened from the
 * album, replaces the entry otherwise; next/previous keep the "opened from album" state.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { useLightbox } from './useLightbox';
import type { Image } from '@/types';

const img = (id: number): Image =>
  ({ id, type: 'GalleryPhotoItem', hasChildren: false, title: `p${id}`, pathComponent: `p${id}.jpg` }) as Image;
const images = [img(1), img(2), img(3)];

function Viewer() {
  const lb = useLightbox(images, '/album/7');
  return (
    <>
      <button type="button" onClick={lb.closeLightbox}>close</button>
      <button type="button" onClick={lb.navigateToNext}>next</button>
      <span data-testid="current">{lb.image?.id ?? '-'}</span>
    </>
  );
}

function Probe() {
  const location = useLocation();
  const type = useNavigationType();
  return (
    <span data-testid="where">
      {location.pathname}|{type}|{JSON.stringify(location.state)}
    </span>
  );
}

function renderAt(entries: Array<string | { pathname: string; state?: unknown }>) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/album/:albumId/image/:imageId" element={<Viewer />} />
        <Route path="*" element={<span>album page</span>} />
      </Routes>
      <Probe />
    </MemoryRouter>,
  );
}

describe('useLightbox navigation (LOGIC-17)', () => {
  it('close after opening from the album goes Back (no new history entry)', async () => {
    renderAt(['/album/7', { pathname: '/album/7/image/1', state: { fromAlbum: true } }]);
    await act(async () => screen.getByText('close').click());
    expect(screen.getByTestId('where').textContent).toBe('/album/7|POP|null');
  });

  it('next keeps the from-album state, so close after stepping still goes Back', async () => {
    renderAt(['/album/7', { pathname: '/album/7/image/1', state: { fromAlbum: true } }]);
    await act(async () => screen.getByText('next').click());
    expect(screen.getByTestId('where').textContent).toBe('/album/7/image/2|REPLACE|{"fromAlbum":true}');
    await act(async () => screen.getByText('close').click());
    expect(screen.getByTestId('where').textContent).toBe('/album/7|POP|null');
  });

  it('close on a deep link replaces the image entry with the album', async () => {
    renderAt(['/album/7/image/1']);
    await act(async () => screen.getByText('close').click());
    expect(screen.getByTestId('where').textContent).toBe('/album/7|REPLACE|null');
  });
});
