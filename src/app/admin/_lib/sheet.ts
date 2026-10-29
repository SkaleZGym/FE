// 관리자 '가져오기' 공통: CSV·엑셀(.xlsx) 파일을 브라우저에서 표(행 배열)로 읽는다. 파일은 서버로 올리지 않는다.
// .xlsx는 XML 파일 묶음(zip)이라, 브라우저 기본 기능(DecompressionStream)으로 풀어서 첫 번째 시트만 읽는다
import { decodeCsv, parseCsv } from "../(console)/members/import/csv";

export type Sheet = { headers: string[]; rows: string[][] };

/** 파일 여러 개를 읽어 하나로 합친다. 머리글은 첫 파일 기준, 다른 파일은 같은 이름의 열끼리 맞춘다 */
export async function readSheets(files: File[]): Promise<Sheet> {
  let headers: string[] = [];
  const rows: string[][] = [];
  for (const file of files) {
    const table = /\.xlsx$/i.test(file.name) ? await readXlsx(file) : parseCsv(decodeCsv(await file.arrayBuffer()));
    if (table.length === 0) continue;
    const [head, ...body] = table;
    const names = head.map((cell) => cell.trim());
    if (headers.length === 0) headers = names;
    const order = headers.map((name) => names.indexOf(name));
    for (const row of body) rows.push(order.map((index) => (index >= 0 ? (row[index] ?? "").trim() : "")));
  }
  return { headers, rows };
}

/** 머리글 이름 후보로 열 번호 짐작 (못 찾으면 -1) */
export function guessColumn(headers: string[], hints: string[], used: Set<number>): number {
  const lower = headers.map((header) => header.trim().toLowerCase());
  // 완전히 같은 이름 먼저, 그다음 포함
  for (const hint of hints) {
    const index = lower.findIndex((header, i) => !used.has(i) && header === hint);
    if (index >= 0) return index;
  }
  for (const hint of hints) {
    const index = lower.findIndex((header, i) => !used.has(i) && header.includes(hint));
    if (index >= 0) return index;
  }
  return -1;
}

/** '₩59,000' · '59,000원' · '59000.0' → 59000. 못 읽으면 null */
export function toNumber(value: string | undefined): number | null {
  const cleaned = (value ?? "").replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

/** 엑셀 날짜 숫자(1900 기준 일수)나 '2023-05-01 12:34' 글자 → 한국 시간 기준 ISO */
export function toIso(value: string | undefined): string | null {
  const text = (value ?? "").trim();
  if (/^\d{5}(\.\d+)?$/.test(text)) {
    const ms = Math.round((Number(text) - 25569) * 86400 * 1000); // 엑셀 날짜 → UTC 기준 시각 (적힌 그대로의 시각)
    const kst = new Date(ms - 9 * 3600 * 1000);
    return Number.isNaN(kst.getTime()) ? null : kst.toISOString();
  }
  const match = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = match;
  const pad = (n: string) => n.padStart(2, "0");
  const date = new Date(`${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}+09:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** 같은 글자면 같은 값이 나오는 짧은 표시 (같은 후기를 두 번 넣지 않게) */
export function shortHash(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

// ---------- .xlsx 읽기 ----------

async function readXlsx(file: File): Promise<string[][]> {
  const entries = await unzip(new Uint8Array(await file.arrayBuffer()));
  const xml = (name: string) => {
    const data = entries.get(name);
    return data ? new DOMParser().parseFromString(new TextDecoder().decode(data), "application/xml") : null;
  };
  const shared = [...(xml("xl/sharedStrings.xml")?.getElementsByTagName("si") ?? [])].map((si) =>
    [...si.getElementsByTagName("t")].map((t) => t.textContent ?? "").join(""),
  );
  // 첫 번째 시트 파일 찾기 (workbook.xml의 첫 sheet → 관계 파일의 대상)
  const sheetName = firstSheetPath(xml("xl/workbook.xml"), xml("xl/_rels/workbook.xml.rels")) ?? "xl/worksheets/sheet1.xml";
  const sheet = xml(sheetName);
  if (!sheet) return [];
  const table: string[][] = [];
  for (const row of [...sheet.getElementsByTagName("row")]) {
    const values: string[] = [];
    for (const cell of [...row.getElementsByTagName("c")]) {
      const column = columnIndex(cell.getAttribute("r") ?? "");
      const type = cell.getAttribute("t");
      const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
      const text =
        type === "s" ? (shared[Number(raw)] ?? "") : type === "inlineStr" ? [...cell.getElementsByTagName("t")].map((t) => t.textContent ?? "").join("") : raw;
      values[column >= 0 ? column : values.length] = text;
    }
    const filled = Array.from({ length: values.length }, (_, i) => values[i] ?? "");
    if (filled.some((value) => value.trim())) table.push(filled);
  }
  return table;
}

function firstSheetPath(workbook: Document | null, rels: Document | null): string | null {
  const first = workbook?.getElementsByTagName("sheet")[0];
  const id = first?.getAttribute("r:id") ?? first?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
  if (!id || !rels) return null;
  const target = [...rels.getElementsByTagName("Relationship")].find((rel) => rel.getAttribute("Id") === id)?.getAttribute("Target");
  if (!target) return null;
  return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
}

/** 'C12' → 2 */
function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0];
  if (!letters) return -1;
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

/** zip 풀기: 끝의 목록(central directory)을 읽고, 압축된 항목은 deflate-raw로 푼다 */
async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error("엑셀 파일을 읽을 수 없어요. CSV로 저장해서 다시 올려 주세요.");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const entries = new Map<string, Uint8Array>();
  for (let i = 0; i < count; i++) {
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (!/^xl\/(sharedStrings|workbook)\.xml$|^xl\/_rels\/workbook\.xml\.rels$|^xl\/worksheets\/[^/]+\.xml$/.test(name)) continue;
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.subarray(start, start + compressedSize);
    entries.set(name, method === 0 ? data : await inflate(data));
  }
  return entries;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
