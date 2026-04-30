type DownloadAnchor = Pick<HTMLAnchorElement, "href" | "download" | "click" | "remove">;

type DownloadEnvironment = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => DownloadAnchor;
  appendAnchor: (anchor: DownloadAnchor) => void;
  scheduleRevoke: (callback: () => void) => void;
};

type DownloadTextFileOptions = {
  filename: string;
  text: string;
  mimeType: string;
};

export function downloadTextFile(options: DownloadTextFileOptions, environment: DownloadEnvironment = browserDownloadEnvironment()) {
  const blob = new Blob([options.text], { type: options.mimeType });
  const url = environment.createObjectURL(blob);
  const anchor = environment.createAnchor();

  anchor.href = url;
  anchor.download = options.filename;
  environment.appendAnchor(anchor);
  anchor.click();
  anchor.remove();
  environment.scheduleRevoke(() => environment.revokeObjectURL(url));
}

function browserDownloadEnvironment(): DownloadEnvironment {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    createAnchor: () => document.createElement("a"),
    appendAnchor: (anchor) => document.body.appendChild(anchor as HTMLAnchorElement),
    scheduleRevoke: (callback) => window.setTimeout(callback, 1000),
  };
}
