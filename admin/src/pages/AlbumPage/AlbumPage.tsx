import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useAlbum } from "../../hooks/useAlbum";
import { AlbumList } from "../../components/AlbumList";
import { Breadcrumb } from "../../components/Breadcrumb";
import { ItemBadges } from "../../components/ItemBadges";
import { PhotoGrid } from "../../components/PhotoGrid";
import "./AlbumPage.css";

/** Parses the `:id` route param: "root" or a positive integer. */
export function parseAlbumParam(
  raw: string | undefined
): number | "root" | null {
  if (raw === undefined || raw === "root") return "root";
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

/** One album of the tree: breadcrumb, header, sub-albums, then photos. */
export function AlbumPage(): ReactNode {
  const params = useParams<{ id: string }>();
  const id = parseAlbumParam(params.id);
  if (id === null) return <p className="error">Bad album id.</p>;
  return <AlbumPageBody id={id} />;
}

function AlbumPageBody({ id }: { id: number | "root" }): ReactNode {
  const { view, loading, error } = useAlbum(id);

  if (error) return <p className="error">{error}</p>;
  if (loading && !view)
    return (
      <p className="muted" role="status">
        Loading…
      </p>
    );
  if (!view) return null;

  const album = view.album;
  const albums = view.children.filter((c) => c.type === "album");
  const photos = view.children.filter((c) => c.type === "photo");
  const title = album ? album.title || "untitled" : "Your albums";

  return (
    <div className="album-page">
      <Breadcrumb entries={view.breadcrumb} current={album ? title : null} />
      <header className="album-page-header">
        <h1>
          {title} {album && <ItemBadges item={album} />}
        </h1>
        {album && (
          <p className="muted album-page-path">
            {album.path}
            {album.eventAt !== null &&
              ` · ${new Date(album.eventAt * 1000).toISOString().slice(0, 10)}`}
            {album.owner && ` · ${album.owner}`}
          </p>
        )}
        {album?.summary && (
          <p className="album-page-summary">{album.summary}</p>
        )}
      </header>

      <section>
        <h2>Albums ({albums.length})</h2>
        {albums.length === 0 ? (
          <p className="muted">No sub-albums.</p>
        ) : (
          <AlbumList albums={albums} />
        )}
      </section>

      {album && (
        <section>
          <h2>Photos ({photos.length})</h2>
          {photos.length === 0 ? (
            <p className="muted">No photos.</p>
          ) : (
            <PhotoGrid
              photos={photos}
              highlightPhotoId={album.highlightPhotoId}
            />
          )}
        </section>
      )}
    </div>
  );
}
