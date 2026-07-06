import * as XLSX from "xlsx";
import type { Attachment } from "./types";
import { uid } from "./id";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const EXCEL_EXT = [".xlsx", ".xls", ".csv"];

export const ACCEPT =
  ".png,.jpg,.jpeg,.gif,.webp,.pdf,.xlsx,.xls,.csv,image/*,application/pdf";

/** 20 MB soft cap so we don't blow the request size. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:...;base64," prefix
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function hasExt(name: string): boolean {
  const lower = name.toLowerCase();
  return EXCEL_EXT.some((e) => lower.endsWith(e));
}

/** Convert a File into an Attachment we can send to the model. */
export async function processFile(file: File): Promise<Attachment> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is larger than 20 MB.`);
  }

  const base = {
    id: uid("att_"),
    name: file.name,
    size: file.size,
  };

  if (IMAGE_TYPES.includes(file.type)) {
    return {
      ...base,
      kind: "image",
      mediaType: file.type,
      data: await fileToBase64(file),
    };
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return {
      ...base,
      kind: "pdf",
      mediaType: "application/pdf",
      data: await fileToBase64(file),
    };
  }

  if (hasExt(file.name)) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const parts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim().length) {
        parts.push(`### Sheet: ${sheetName}\n${csv}`);
      }
    }
    return {
      ...base,
      kind: "excel",
      textContent: parts.join("\n\n") || "(empty spreadsheet)",
    };
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}

export function humanSize(bytes = 0): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
