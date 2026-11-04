"use client";

import { useCallback, useEffect, useState } from "react";
import { Pager, Top } from "../../_components/ui";
import { adminApi, dateTime, errorMessage, type AdminAccessLog, type Page } from "../../_lib/admin";

/** 주소 앞부분 → 화면 이름 (긴 것부터 맞춘다) */
const AREAS: [string, string][] = [
  ["/api/admin/auth/login", "관리자 로그인"],
  ["/api/admin/access-logs", "접속기록"],
  ["/api/admin/members/import", "데이터 가져오기"],
  ["/api/admin/members", "회원 관리"],
  ["/api/admin/orders", "주문 관리"],
  ["/api/admin/claims", "교환·반품"],
  ["/api/admin/inquiries", "1:1 문의"],
  ["/api/admin/reviews", "후기 관리"],
  ["/api/admin/import", "데이터 가져오기"],
  ["/api/admin/products", "상품 관리"],
  ["/api/admin/coupons", "쿠폰"],
  ["/api/admin/dashboard", "대시보드"],
];
const areaOf = (path: string) => AREAS.find(([prefix]) => path.startsWith(prefix))?.[1] ?? "기타";

/** 개인정보가 담긴 화면은 따로 표시해서 점검할 때 눈에 띄게 */
const PERSONAL = new Set(["회원 관리", "주문 관리", "교환·반품", "1:1 문의", "데이터 가져오기"]);

const ACTIONS: Record<string, string> = { GET: "조회", POST: "등록", PUT: "수정", PATCH: "변경", DELETE: "삭제" };

const statusBadge = (status: number) => (status < 300 ? "green" : status === 401 || status === 403 ? "red" : "amber");

export default function AccessLogList() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AdminAccessLog> | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    adminApi<Page<AdminAccessLog>>(`/access-logs?page=${page}&size=50`)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, [page]);
  useEffect(load, [load]);

  return (
    <>
      <Top crumb="SECURITY / ACCESS LOGS" title="접속기록" />
      <div className="notice">
        <span>ⓘ</span>
        <span>
          관리자 화면에서 한 일(조회·변경)과 로그인 시도가 모두 남아요. 법에 따라 <b>1년 이상</b> 보관하고, 2년이 지나면 자동으로 지워져요. 한 달에 한 번쯤 모르는
          접속(낯선 IP, <b>401·403</b> 실패가 몰린 시간)이 없는지 훑어봐 주세요.
        </span>
      </div>
      <div className="card">
        {error && <p className="alert">{error}</p>}
        {!data ? (
          <div className="loading">불러오는 중…</div>
        ) : data.content.length === 0 ? (
          <div className="empty">아직 기록이 없어요.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>시각</th>
                  <th>관리자</th>
                  <th>화면</th>
                  <th>한 일</th>
                  <th>주소</th>
                  <th>결과</th>
                  <th>접속 IP</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((log) => {
                  const area = areaOf(log.path);
                  return (
                    <tr key={log.id}>
                      <td className="mono muted" style={{ whiteSpace: "nowrap" }}>{dateTime(log.accessedAt)}</td>
                      <td>{log.memberEmail ?? (log.memberId ? `#${log.memberId}` : <span className="muted">로그인 전</span>)}</td>
                      <td>
                        {area}
                        {PERSONAL.has(area) && <span className="badge amber" style={{ marginLeft: 6 }}>개인정보</span>}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{ACTIONS[log.method] ?? log.method}</td>
                      <td className="mono muted" style={{ wordBreak: "break-all", minWidth: 220 }}>
                        {log.path.replace("/api/admin", "")}
                        {log.query ? `?${log.query}` : ""}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(log.status)}`}>{log.status}</span>
                      </td>
                      <td className="mono muted" title={`서버에 붙은 주소: ${log.ip}`}>
                        {log.clientIp ?? log.ip}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={data.page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />}
      </div>
    </>
  );
}
