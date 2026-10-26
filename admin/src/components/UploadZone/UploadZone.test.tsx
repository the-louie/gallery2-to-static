import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadZone } from "./UploadZone";
import { item } from "../../test/mockFetch";

/** A controllable XMLHttpRequest double. */
class FakeXhr {
  static instances: FakeXhr[] = [];
  static requestBodies: FormData[] = [];
  readonly upload = new EventTarget();
  private readonly target = new EventTarget();
  status = 0;
  responseText = "";
  withCredentials = false;
  method = "";
  url = "";
  aborted = false;

  constructor() {
    FakeXhr.instances.push(this);
  }
  addEventListener(type: string, cb: EventListener): void {
    this.target.addEventListener(type, cb);
  }
  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }
  send(body: FormData): void {
    FakeXhr.requestBodies.push(body);
  }
  abort(): void {
    this.aborted = true;
    this.target.dispatchEvent(new Event("abort"));
  }
  progress(loaded: number, total: number): void {
    const ev = new Event("progress") as Event & {
      loaded: number;
      total: number;
      lengthComputable: boolean;
    };
    Object.assign(ev, { loaded, total, lengthComputable: true });
    this.upload.dispatchEvent(ev);
  }
  respond(status: number, body: unknown): void {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.target.dispatchEvent(new Event("load"));
  }
}

describe("UploadZone", () => {
  beforeEach(() => {
    FakeXhr.instances = [];
    FakeXhr.requestBodies = [];
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uploads picked files as files[], shows progress and per-file results", async () => {
    const onUploaded = vi.fn();
    render(<UploadZone albumId={3} onUploaded={onUploaded} />);
    const input = screen.getByLabelText("Drop images here or choose files");
    const a = new File(["aaa"], "a.jpg", { type: "image/jpeg" });
    const b = new File(["bbb"], "b.txt", { type: "text/plain" });
    await userEvent.upload(input, [a, b], { applyAccept: false });

    const xhr = FakeXhr.instances[0]!;
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("/api/albums/3/photos");
    expect(xhr.withCredentials).toBe(true);
    const sent = FakeXhr.requestBodies[0]!.getAll("files[]") as File[];
    expect(sent.map((f) => f.name)).toEqual(["a.jpg", "b.txt"]);

    act(() => xhr.progress(3, 6));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Uploading 2 files… 50%"
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "3");

    const created = [item({ id: 77, type: "photo", title: "a" })];
    act(() =>
      xhr.respond(201, {
        created,
        rejected: [{ name: "b.txt", reason: "not an image" }],
      })
    );
    expect(await screen.findByText("1 added, 1 rejected.")).toBeInTheDocument();
    expect(screen.getByText("a")).toHaveClass("upload-result-ok");
    expect(screen.getByText("b.txt: not an image")).toHaveClass(
      "upload-result-rejected"
    );
    expect(onUploaded).toHaveBeenCalledWith(created);
  });

  it("accepts dropped files and reports a server error", async () => {
    render(<UploadZone albumId={3} onUploaded={vi.fn()} />);
    const zone = screen
      .getByText("Drop images here or choose files")
      .closest(".upload-zone")!;
    const file = new File(["x"], "x.png", { type: "image/png" });
    fireEvent.drop(zone, { dataTransfer: { files: [file], types: ["Files"] } });
    const xhr = FakeXhr.instances[0]!;
    expect(xhr).toBeDefined();
    act(() => xhr.respond(413, { error: "too large" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Upload failed: too large (413)"
    );
  });

  it("refuses files over 50 MB before sending", async () => {
    render(<UploadZone albumId={3} onUploaded={vi.fn()} />);
    const big = new File([""], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(big, "size", { value: 51 * 1024 * 1024 });
    await userEvent.upload(
      screen.getByLabelText("Drop images here or choose files"),
      big
    );
    expect(FakeXhr.instances).toHaveLength(0);
    expect(screen.getByRole("alert")).toHaveTextContent("Over 50 MB: big.jpg");
  });

  it("can cancel an upload in flight", async () => {
    render(<UploadZone albumId={3} onUploaded={vi.fn()} />);
    await userEvent.upload(
      screen.getByLabelText("Drop images here or choose files"),
      new File(["x"], "x.jpg", { type: "image/jpeg" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(FakeXhr.instances[0]!.aborted).toBe(true);
    expect(await screen.findByRole("alert")).toHaveTextContent("aborted");
  });
});
