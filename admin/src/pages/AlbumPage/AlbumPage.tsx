import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useAlbum } from "../../hooks/useAlbum";
import { notifyWrite } from "../../hooks/useRegenStatus";
import { useSession } from "../../session/SessionContext";
import { AlbumForm } from "../../components/AlbumForm";
import { AlbumList } from "../../components/AlbumList";
import { AlbumToolbar } from "../../components/AlbumToolbar";
import { Breadcrumb } from "../../components/Breadcrumb";
import { ItemBadges } from "../../components/ItemBadges";
import { PhotoGrid } from "../../components/PhotoGrid";
import { UploadZone } from "../../components/UploadZone";
import type { AdminItem } from "../../types";
import "./AlbumPage.css";

/** Parses the `:id` route param: "root" or a positive integer. */
export function parseAlbumParam(
  raw: string | undefined
): number | "root" | null {
  if (raw === undefined || raw === "root") return "root";
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

/** One album of the tree: breadcrumb, header and actions, sub-albums, photos, upload. */
export function AlbumPage(): ReactNode {
  const params = useParams<{ id: string }>();
  const id = parseAlbumParam(params.id);
  if (id === null) return <p className="error">Bad album id.</p>;
  return <AlbumPageBody key={String(id)} id={id} />;
}

type Panel = { kind: "none" } | { kind: "new" } | { kind: "edit" };

function AlbumPageBody({ id }: { id: number | "root" }): ReactNode {
  const { isAdmin } = useSession();
  const album$ = useAlbum(id);
  const { view, loading, error } = album$;
  const [panel, setPanel] = useState<Panel>({ kind: "none" });

  useEffect(() => setPanel({ kind: "none" }), [id]);

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
  const canWrite = album?.canWrite ?? false;

  const wrote = (): void => notifyWrite();

  const onAlbumChanged = (item: AdminItem): void => {
    album$.replaceAlbum(item);
    wrote();
  };
  const onChildChanged = (item: AdminItem): void => {
    if (album && item.id === album.id) album$.replaceAlbum(item);
    else album$.replaceChild(item);
    wrote();
  };
  const onCreated = (item: AdminItem): void => {
    album$.addChildren([item]);
    setPanel({ kind: "none" });
    wrote();
  };

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
            {album.viewCount !== null && ` · ${album.viewCount} views`}
          </p>
        )}
        {album?.summary && (
          <p className="album-page-summary">{album.summary}</p>
        )}
        {album?.description && (
          <p className="album-page-description muted">{album.description}</p>
        )}
      </header>

      {album && (
        <AlbumToolbar
          album={album}
          isAdmin={isAdmin}
          onNewAlbum={() => setPanel({ kind: "new" })}
          onEdit={() => setPanel({ kind: "edit" })}
          onAlbumChanged={onAlbumChanged}
          onDeleted={() => {
            wrote();
            void album$.reload();
          }}
        />
      )}

      {panel.kind === "new" && album && (
        <AlbumForm
          mode="new"
          parentId={album.id}
          onSaved={onCreated}
          onCancel={() => setPanel({ kind: "none" })}
        />
      )}
      {panel.kind === "edit" && album && (
        <AlbumForm
          mode="edit"
          album={album}
          isAdmin={isAdmin}
          onSaved={(item) => {
            onAlbumChanged(item);
            setPanel({ kind: "none" });
          }}
          onCancel={() => setPanel({ kind: "none" })}
        />
      )}

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
              items={view.children}
              albumId={album.id}
              highlightPhotoId={album.highlightPhotoId}
              canWrite={canWrite}
              isAdmin={isAdmin}
              onItemChanged={onChildChanged}
              onPhotoDeleted={() => {
                wrote();
                void album$.reload();
              }}
              onReordered={(ids) => {
                album$.reorder(ids);
                wrote();
              }}
            />
          )}
          {canWrite && album.deletedAt === null && (
            <UploadZone
              albumId={album.id}
              onUploaded={(created) => {
                if (created.length === 0) return;
                album$.addChildren(created);
                wrote();
              }}
            />
          )}
        </section>
      )}
    </div>
  );
}
