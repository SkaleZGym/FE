"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { Top } from "../../../_components/ui";
import { adminApi, errorMessage, toast } from "../../../_lib/admin";
import { decodeCsv, FIELDS, guessMapping, isYes, maskEmail, maskName, maskPhone, parseCsv, toIsoKst, type Field } from "./csv";

type Row = { email: string; name: string; phone: string; joinedAt: string | null; marketingConsent: boolean; legacyId: string };
type ImportResult = { created: number; skipped: number; failures: { index: number; email: string; reason: string }[] };

const BATCH = 1000;

/**
 * 아임웹 회원 가져오기.
 * 1) 아임웹 관리자 > 고객 > 고객 목록 > 내보내기로 받은 엑셀을 CSV로 저장
 * 2) 여기서 파일을 고르면 브라우저 안에서만 읽고, 고른 열의 값만 서버로 보낸다 (파일은 올리지 않는다)
 * 3) 이미 있는 이메일은 건너뛰므로 여러 번 올려도 중복되지 않는다
 */
export default function MemberImport() {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<Field, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const rows = parseCsv(decodeCsv(await file.arrayBuffer()));
    if (rows.length < 2) {
      toast("읽을 수 있는 행이 없어요. CSV 파일인지 확인해 주세요.", true);
      return;
    }
    setFileName(file.name);
    setHeaders(rows[0]);
    setRecords(rows.slice(1));
    setMapping(guessMapping(rows[0]));
    setResult(null);
    // 같은 파일을 다시 고를 수 있게 비운다
    event.target.value = "";
  };

  const cell = (record: string[], field: Field) => {
    const index = mapping?.[field] ?? -1;
    return index >= 0 ? (record[index] ?? "").trim() : "";
  };

  const toRow = (record: string[]): Row => ({
    email: cell(record, "email"),
    name: cell(record, "name"),
    phone: cell(record, "phone"),
    joinedAt: toIsoKst(cell(record, "joinedAt")),
    marketingConsent: mapping?.marketing !== undefined && mapping.marketing >= 0 ? isYes(cell(record, "marketing")) : false,
    legacyId: cell(record, "legacyId"),
  });

  const start = async () => {
    if (!mapping || mapping.email < 0) return toast("이메일 열을 골라 주세요.", true);
    if (!window.confirm(`${records.length.toLocaleString()}명을 가져올까요? 이미 있는 이메일은 건너뛰어요.`)) return;
    setBusy(true);
    setResult(null);
    const total: ImportResult = { created: 0, skipped: 0, failures: [] };
    try {
      for (let from = 0; from < records.length; from += BATCH) {
        setProgress(`${Math.min(from + BATCH, records.length).toLocaleString()} / ${records.length.toLocaleString()}`);
        const batch = records.slice(from, from + BATCH).map(toRow);
        const response = await adminApi<ImportResult>("/members/import", {
          method: "POST",
          body: {
            members: batch.map((row) => ({
              email: row.email,
              name: row.name || null,
              phone: row.phone || null,
              joinedAt: row.joinedAt,
              marketingConsent: row.marketingConsent,
              legacyId: row.legacyId || null,
            })),
          },
        });
        total.created += response.created;
        total.skipped += response.skipped;
        // 줄 번호는 CSV 기준 (머리글이 1번 줄)
        total.failures.push(...response.failures.map((failure) => ({ ...failure, index: from + failure.index + 2 })));
      }
      setResult(total);
      toast(`${total.created.toLocaleString()}명을 가져왔어요.`);
    } catch (caught) {
      setResult(total);
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const preview = records.slice(0, 5).map(toRow);

  return (
    <>
      <Top
        crumb="STORE / MEMBERS / IMPORT"
        title="아임웹 회원 가져오기"
        actions={
          <Link className="btn" href="/admin/members">
            회원 목록
          </Link>
        }
      />

      <div className="notice">
        <span>ⓘ</span>
        <span>
          아임웹 관리자 <b>고객 &gt; 고객 목록 &gt; 내보내기</b>로 받은 엑셀을 <b>CSV</b>로 저장해서 올려 주세요. 파일은 이 브라우저 안에서만 읽고, 아래에서 고른 열만
          서버로 보내요. <b>비밀번호는 아임웹에서 가져올 수 없어서</b>, 옮겨 온 회원은 처음 접속할 때 &lsquo;비밀번호 찾기&rsquo; 메일로 새 비밀번호를 정해요. 이미 있는
          이메일은 건너뛰니 여러 번 올려도 괜찮아요.
        </span>
      </div>

      <div className="stack">
        <div className="card">
          <div className="card-h">
            <h2>1. 파일 고르기</h2>
            {fileName && (
              <span className="mono muted">
                {fileName} · {records.length.toLocaleString()}명
              </span>
            )}
          </div>
          <div className="card-b">
            <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} />
          </div>
        </div>

        {mapping && (
          <div className="card">
            <div className="card-h">
              <h2>2. 열 맞추기</h2>
              <span className="hint">머리글 이름으로 미리 골라 뒀어요. 다르면 바꿔 주세요</span>
            </div>
            <div className="card-b grid3">
              {FIELDS.map((field) => (
                <label className="field" key={field.key}>
                  <span>
                    {field.label} {field.required && <b>*</b>}
                  </span>
                  <select
                    className="select"
                    value={mapping[field.key]}
                    onChange={(event) => setMapping({ ...mapping, [field.key]: Number(event.target.value) })}
                  >
                    <option value={-1}>{field.required ? "선택" : "없음"}</option>
                    {headers.map((header, index) => (
                      <option key={index} value={index}>
                        {header || `${index + 1}번째 열`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        )}

        {mapping && (
          <div className="card">
            <div className="card-h">
              <h2>3. 미리보기 (앞 5명 · 개인정보 가림)</h2>
              <button className="btn primary" type="button" onClick={start} disabled={busy || mapping.email < 0}>
                {busy ? `가져오는 중… ${progress}` : `${records.length.toLocaleString()}명 가져오기`}
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>이메일</th>
                    <th>이름</th>
                    <th>연락처</th>
                    <th>가입일</th>
                    <th>마케팅</th>
                    <th>회원 번호</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index}>
                      <td className="mono">{row.email ? maskEmail(row.email) : <span className="badge red">없음</span>}</td>
                      <td>{maskName(row.name)}</td>
                      <td className="mono">{maskPhone(row.phone)}</td>
                      <td className="mono muted">{row.joinedAt ? new Date(row.joinedAt).toLocaleDateString("ko-KR") : "-"}</td>
                      <td>{row.marketingConsent ? <span className="badge green">동의</span> : <span className="muted">-</span>}</td>
                      <td className="mono muted">{row.legacyId || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <div className="card">
            <div className="card-h">
              <h2>결과</h2>
            </div>
            <div className="card-b">
              <dl className="kv">
                <dt>새로 가져옴</dt>
                <dd className="mono">{result.created.toLocaleString()}명</dd>
                <dt>이미 있어서 건너뜀</dt>
                <dd className="mono">{result.skipped.toLocaleString()}명</dd>
                <dt>잘못된 행</dt>
                <dd className="mono">{result.failures.length.toLocaleString()}건</dd>
              </dl>
            </div>
            {result.failures.length > 0 && (
              <ul className="rows">
                {result.failures.slice(0, 50).map((failure) => (
                  <li key={failure.index}>
                    <span className="mono muted">{failure.index}번째 줄</span>
                    <span className="mono">{failure.email ? maskEmail(failure.email) : "(비어 있음)"}</span>
                    <span className="end warn">{failure.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}
