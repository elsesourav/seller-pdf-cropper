import { UPLOAD_INSPECT_CONCURRENCY } from "@/constants/pdf";
import type {
  InspectPdfBatchResult,
  UploadInspectProgress,
  UploadedPdfFile,
} from "@/types";
import { yieldToMain } from "@/utils/format";
import { computeBytesHash } from "@/utils/hash";
import { PDFDocument } from "pdf-lib";

function isPdfCandidate(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

interface SingleInspectOutcome {
  kind: "valid" | "duplicate" | "invalid";
  item?: UploadedPdfFile;
  fileName: string;
}

/**
 * Inspects a batch of incoming File objects using bounded concurrency and immediately
 * releases raw ArrayBuffers so 5,000–10,000 PDFs can be queued without exhausting RAM.
 */
export async function inspectAndFilterPdfFiles(
  incomingFiles: File[],
  existingFiles: UploadedPdfFile[],
  onProgress?: (progress: UploadInspectProgress) => void,
): Promise<InspectPdfBatchResult> {
  const seenHashes = new Set(existingFiles.map((item) => item.hash));
  const added: UploadedPdfFile[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];

  const total = incomingFiles.length;
  let processed = 0;

  for (let start = 0; start < total; start += UPLOAD_INSPECT_CONCURRENCY) {
    const batch = incomingFiles.slice(start, start + UPLOAD_INSPECT_CONCURRENCY);

    const outcomes = await Promise.all(
      batch.map(async (file, batchOffset): Promise<SingleInspectOutcome> => {
        if (!isPdfCandidate(file)) {
          return { kind: "invalid", fileName: file.name };
        }

        try {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const hash = await computeBytesHash(bytes);

          const pdfDoc = await PDFDocument.load(bytes, {
            ignoreEncryption: true,
            updateMetadata: false,
          });
          const pageCount = pdfDoc.getPageCount();
          if (pageCount <= 0) {
            return { kind: "invalid", fileName: file.name };
          }

          return {
            kind: "valid",
            fileName: file.name,
            item: {
              id: `${hash.slice(0, 12)}-${Date.now()}-${start + batchOffset}`,
              file,
              name: file.name,
              size: file.size,
              pageCount,
              hash,
            },
          };
        } catch {
          return { kind: "invalid", fileName: file.name };
        }
      }),
    );

    for (const outcome of outcomes) {
      processed++;
      if (outcome.kind === "invalid") {
        invalid.push(outcome.fileName);
      } else if (outcome.kind === "valid" && outcome.item) {
        if (seenHashes.has(outcome.item.hash)) {
          duplicates.push(outcome.fileName);
        } else {
          seenHashes.add(outcome.item.hash);
          added.push(outcome.item);
        }
      }
    }

    onProgress?.({
      processed,
      total,
      currentFileName: batch[batch.length - 1]?.name || "",
    });

    await yieldToMain();
  }

  return { added, duplicates, invalid };
}
