import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let initialized = false;

export function ensurePdfWorker(): void {
  if (initialized) return;
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
  initialized = true;
}

ensurePdfWorker();

export { pdfjsLib };
