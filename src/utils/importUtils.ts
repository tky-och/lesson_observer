import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import type { Session, MaterialTab, SessionMetadata } from '../types';

/**
 * Import a session from a user-selected file.
 * Supports:
 *  - .json — single session (materials may be base64 or omitted)
 *  - .zip  — exported ZIP containing session.json (+ materials/)
 *  - .md / .txt — imported as the textNotes of a new empty session
 */
export async function importSessionFromFile(file: File): Promise<Session> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.zip')) {
    return importFromZip(file);
  }
  if (name.endsWith('.json')) {
    const text = await file.text();
    return normalizeSession(JSON.parse(text));
  }
  if (name.endsWith('.md') || name.endsWith('.txt')) {
    const text = await file.text();
    return makeEmptySession(file.name.replace(/\.[^.]+$/, ''), text);
  }
  throw new Error(`未対応のファイル形式: ${file.name}`);
}

async function importFromZip(file: File): Promise<Session> {
  const zip = await JSZip.loadAsync(file);

  // Find session.json (may be nested under a folder)
  let sessionEntry: JSZip.JSZipObject | null = null;
  zip.forEach((path, entry) => {
    if (!sessionEntry && path.endsWith('session.json')) {
      sessionEntry = entry;
    }
  });

  if (!sessionEntry) {
    // Fallback: try observation.md / .txt
    let textEntry: JSZip.JSZipObject | null = null;
    zip.forEach((path, entry) => {
      if (!textEntry && (path.endsWith('observation.md') || path.endsWith('observation.txt'))) {
        textEntry = entry;
      }
    });
    if (textEntry) {
      const text = await (textEntry as JSZip.JSZipObject).async('string');
      return makeEmptySession(file.name.replace(/\.zip$/i, ''), text);
    }
    throw new Error('ZIPに session.json が見つかりません');
  }

  const jsonText = await (sessionEntry as JSZip.JSZipObject).async('string');
  const parsed = JSON.parse(jsonText);
  const session = normalizeSession(parsed);

  // Rehydrate material data from materials/ folder if base64 was omitted
  const materialsFolder = zip.folder(session.sessionId) || zip;
  const matFiles: { path: string; entry: JSZip.JSZipObject }[] = [];
  materialsFolder.forEach((path, entry) => {
    if (path.includes('materials/') && !entry.dir) {
      matFiles.push({ path, entry });
    }
  });

  for (const mat of session.materials) {
    if (mat.data && mat.data.byteLength > 0) continue;
    const ext = mat.type === 'pdf' ? '.pdf' : '.png';
    const safe = mat.name.replace(/[/\\:*?"<>|]/g, '_');
    const match = matFiles.find((f) => f.path.endsWith(`${safe}${ext}`));
    if (match) {
      mat.data = await match.entry.async('arraybuffer');
    }
  }

  return session;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function normalizeSession(raw: unknown): Session {
  const r = (raw ?? {}) as Record<string, unknown>;
  const metaRaw = (r.metadata ?? {}) as Partial<SessionMetadata>;
  const metadata: SessionMetadata = {
    title: metaRaw.title ?? '',
    observer: metaRaw.observer ?? '',
    subject: metaRaw.subject ?? '',
    grade: metaRaw.grade ?? '',
    teacher: metaRaw.teacher ?? '',
    classStartTime:
      typeof metaRaw.classStartTime === 'number' ? metaRaw.classStartTime : null,
  };

  const materials: MaterialTab[] = Array.isArray(r.materials)
    ? (r.materials as unknown[]).map((m) => {
        const mm = (m ?? {}) as Record<string, unknown>;
        let data: ArrayBuffer = new ArrayBuffer(0);
        if (typeof mm.data === 'string' && mm.data.length > 0) {
          try {
            data = base64ToArrayBuffer(mm.data);
          } catch {
            data = new ArrayBuffer(0);
          }
        } else if (mm.data instanceof ArrayBuffer) {
          data = mm.data;
        }
        return {
          id: (mm.id as string) ?? uuidv4(),
          name: (mm.name as string) ?? '資料',
          type: (mm.type as 'image' | 'pdf') ?? 'image',
          data,
          currentPage: (mm.currentPage as number) ?? 1,
          annotations: (mm.annotations as MaterialTab['annotations']) ?? {},
        };
      })
    : [];

  return {
    sessionId: (r.sessionId as string) ?? uuidv4(),
    createdAt: (r.createdAt as number) ?? Date.now(),
    updatedAt: Date.now(),
    metadata,
    textNotes: (r.textNotes as string) ?? '',
    freehandStrokes: Array.isArray(r.freehandStrokes)
      ? (r.freehandStrokes as Session['freehandStrokes'])
      : [],
    materials,
  };
}

function makeEmptySession(title: string, textNotes: string): Session {
  return {
    sessionId: uuidv4(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: {
      title,
      observer: '',
      subject: '',
      grade: '',
      teacher: '',
      classStartTime: null,
    },
    textNotes,
    freehandStrokes: [],
    materials: [],
  };
}
