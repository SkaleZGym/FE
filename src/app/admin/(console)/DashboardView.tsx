"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Thumb, Top } from "../_components/ui";
import { adminApi, dateTime, errorMessage, money, ORDER_STATUS, type Dashboard } from "../_lib/admin";

/** 최근 7일 매출 막대 (KRW). 값이 없으면 바닥선만 */
function SalesChart({ days }: { days: Dashboard["salesByDay"] }) {
  const width = 600;
  const height = 210;
  const max = Math.max(1, ...days.map((day) => day.salesKrw));
  const slot = width / days.length;
  const barWidth = slot * 0.46;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="최근 7일 매출 막대 그래프">
      {days.map((day, index) => {
        const barHeight = Math.round((day.salesKrw / max) * (height - 60));
        const x = index * slot + (slot - barWidth) / 2;
        const y = height - 26 - barHeight;
        const label = day.date.slice(5).replace("-", "/");
        return (
          <g key={day.date}>
            <rect className="bar" x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} rx="3">
              <title>{`${label} · ${money(day.salesKrw, "KRW")} · ${day.orders}건`}</title>
            </rect>
            {day.salesKrw > 0 && (
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle">
                {day.salesKrw >= 10000 ? `${Math.round(day.salesKrw / 10000)}만` : day.salesKrw.toLocaleString()}
              </text>
            )}
            <text x={x + barWidth / 2} y={height - 8} textAnchor="middle">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function DashboardView() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi<Dashboard>("/dashboard")
      .then(setData)
      .catch((caught) => setError(errorMessage(caught)));
  }, []);

  if (error) return <p className="alert">{error}</p>;
  if (!data) return <div className="loading">불러오는 중…</div>;

  const weekKrw = data.salesByDay.reduce((sum, day) => sum + day.salesKrw, 0);
  const weekUsd = data.salesByDay.reduce((sum, day) => sum + day.salesUsd, 0);

  return (
    <>
      <Top crumb="OVERVIEW" title="대시보드" />

      <div className="kpis">
        <div className="card kpi">
          <small>오늘 매출 (KRW)</small>
          <b>{money(data.today.salesKrw, "KRW")}</b>
          <span className="delta">
            해외 {money(data.today.salesUsd, "USD")} · 주문 {data.today.orders}건
          </span>
        </div>
        <div className="card kpi">
          <small>배송 준비할 주문</small>
          <b>{data.ordersToShip}</b>
          <span className="delta">결제 완료 + 상품 준비</span>
          <br />
          <Link href="/admin/orders?status=PAID">주문 보기</Link>
        </div>
        <div className="card kpi">
          <small>답변 대기 문의</small>
          <b>{data.waitingInquiries}</b>
          <span className="delta">최근 7일 새 후기 {data.newReviews}개</span>
          <br />
          <Link href="/admin/inquiries?status=WAITING">문의 보기</Link>
        </div>
        <div className="card kpi">
          <small>전체 회원</small>
          <b>{data.memberCount.toLocaleString()}</b>
          <span className="delta">오늘 가입 {data.today.newMembers}명</span>
          <br />
          <Link href="/admin/members">회원 보기</Link>
        </div>
      </div>

      <div className="dash">
        <div className="stack">
          <div className="card">
            <div className="card-h">
              <h2>최근 7일 매출</h2>
              <span className="muted mono">
                {money(weekKrw, "KRW")} · 해외 {money(weekUsd, "USD")}
              </span>
            </div>
            <div className="card-b chart">
              <SalesChart days={data.salesByDay} />
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h2>최근 주문</h2>
              <Link className="btn sm" href="/admin/orders">
                전체 보기
              </Link>
            </div>
            {data.recentOrders.length === 0 ? (
              <div className="empty">아직 주문이 없어요.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>주문번호</th>
                      <th>상태</th>
                      <th className="num">수량</th>
                      <th className="num">금액</th>
                      <th>주문 시각</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((order) => (
                      <tr key={order.orderNumber} className="click" onClick={() => router.push(`/admin/orders?open=${order.orderNumber}`)}>
                        <td className="mono">{order.orderNumber}</td>
                        <td>
                          <span className={`badge ${ORDER_STATUS[order.status].tone}`}>{ORDER_STATUS[order.status].label}</span>
                        </td>
                        <td className="num">{order.itemCount}</td>
                        <td className="num">{money(order.totalAmount, order.currency)}</td>
                        <td className="mono muted">{dateTime(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-h">
              <h2>품절 임박</h2>
              <span className="muted mono">판매 중 · 재고 ≤ 3</span>
            </div>
            {data.lowStock.length === 0 ? (
              <div className="empty">재고가 넉넉해요.</div>
            ) : (
              <ul className="rows">
                {data.lowStock.slice(0, 12).map((item) => (
                  <li key={item.variantId}>
                    <Thumb src={item.imageUrl} />
                    <Link href={`/admin/products/edit?id=${item.productId}`}>
                      <b style={{ fontWeight: 500 }}>{item.productName}</b>
                      <div className="mono muted">{item.sku}</div>
                    </Link>
                    <span className={`end${item.stock === 0 ? " warn" : ""}`}>
                      {item.size} · {item.stock === 0 ? "품절" : `${item.stock}개`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {data.lowStock.length > 12 && <div className="pager">외 {data.lowStock.length - 12}개 사이즈</div>}
          </div>
        </div>
      </div>
    </>
  );
}
