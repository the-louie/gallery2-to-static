import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AlbumFile, Child } from '@/types';
import type { MatrixLocation } from '@/utils/matrixLocation';
import { getAlbumPath, getPhotoSlug, withTrailingSlash } from '@/utils/albumPath';
import { peerWindow, truncateTitle } from '@/utils/matrixPeers';
import { MAX_SEARCH_QUERY_LENGTH } from '@/utils/searchUtils';
import './MatrixSidebar.css';

/**
 * Props for the MatrixSidebar component
 */
export interface MatrixSidebarProps {
  /** The album/photo the page shows (null on search, not found, …) */
  location: MatrixLocation | null;
}

interface Peers {
  parentTitle: string;
  items: Child[];
  currentId: number;
  /** Album the items belong to (their photo URLs start with its path) */
  owner: AlbumFile;
}

/** Peers of the page: an album's siblings, or a photo's album contents (Gallery 2's PeerList). */
function getPeers(location: MatrixLocation | null): Peers | null {
  if (!location) return null;
  if (location.photo) {
    const { album, photo } = location;
    return { parentTitle: album.metadata.albumTitle ?? '', items: album.children, currentId: photo.id, owner: album };
  }
  if (!location.parent) return null;
  const { album, parent } = location;
  return {
    parentTitle: parent.metadata.albumTitle ?? '',
    items: parent.children,
    currentId: album.metadata.albumId,
    owner: parent,
  };
}

function peerHref(peer: Child, owner: AlbumFile): string {
  const ownerPath = getAlbumPath(owner.metadata.breadcrumbPath ?? []);
  if (peer.type === 'GalleryAlbumItem') {
    return peer.path ? withTrailingSlash(peer.path) : `/album/${peer.id}`;
  }
  return `${ownerPath}${getPhotoSlug(peer)}`;
}

function peerTitle(peer: Child): string {
  return peer.title || (peer.pathComponent ?? '').split('/').pop() || '';
}

/**
 * Sidebar of Gallery 2's Matrix theme (classic theme, THEME-01): search block, item links
 * (slideshow), peer list. "Add Comment" is left out (operator, 2026-10-25). Spec:
 * `frontend/docs/theme-matrix.md`.
 *
 * @example
 * ```tsx
 * <MatrixSidebar location={location} />
 * ```
 */
export function MatrixSidebar({ location }: MatrixSidebarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const peers = getPeers(location);
  const currentIndex = peers ? peers.items.findIndex((p) => p.id === peers.currentId) : -1;
  const shown = peers ? peerWindow(peers.items.length, currentIndex) : [];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (q !== '') navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <div className="block-search-SearchBlock gbBlock">
        <form role="search" onSubmit={handleSubmit}>
          <div>
            <input
              type="text"
              size={18}
              className="textbox"
              placeholder="Search the Gallery"
              aria-label="Search the Gallery"
              maxLength={MAX_SEARCH_QUERY_LENGTH}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <Link to="/search" className="gbAdminLink gbLink-search_SearchScan advanced">
              Advanced Search
            </Link>
          </div>
        </form>
      </div>
      <div className="block-core-ItemLinks gbBlock">
        <Link to="/slideshow" className="gbAdminLink gbLink-slideshow_Slideshow">
          View Slideshow
        </Link>
        <Link to="/slideshow-fullscreen" className="gbAdminLink gbLink-slideshowapplet_SlideshowApplet">
          View Slideshow (Fullscreen)
        </Link>
      </div>
      {peers && shown.length > 0 && (
        <div className="block-core-PeerList gbBlock">
          <h3 className="parent">{peers.parentTitle}</h3>
          {shown.map((i, k) => {
            const peer = peers.items[i];
            const label = `${i + 1}. ${truncateTitle(peerTitle(peer))}`;
            return (
              <React.Fragment key={peer.id}>
                {k > 0 && i - shown[k - 1] > 1 && <span className="neck">...</span>}
                {i === currentIndex ? (
                  <span className="current" aria-current="page">
                    {label}
                  </span>
                ) : (
                  <Link to={peerHref(peer, peers.owner)} title={peerTitle(peer)}>
                    {label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </>
  );
}
