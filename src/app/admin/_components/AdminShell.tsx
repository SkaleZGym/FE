"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { images } from "@/data/catalog";
import { adminApi, TOAST_EVENT, toLogin, type Dashboard } from "../_lib/admin";

type Me = { id: number; email: string; name: string };

/** 메뉴 아이콘 (선 아이콘, 24 기준) */
const icons = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  orders: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6ZM3 6h18M16 10a4 4 0 0 1-8 0",
  products: "M20.6 13.4 12 22l-8.6-8.6A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6ZM7.5 7.5h.01",
  reviews: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z",
  inquiries: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z",
  members: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  banners: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6",
  shop: "M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
};

type NavItem = { href: string; label: string; icon: keyof typeof icons; count?: number };

/** 관리자 공통 틀: 왼쪽 메뉴 + 본문 + 알림. 로그인한 관리자가 아니면 로그인 화면으로 보낸다 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [counts, setCounts] = useState<Pick<Dashboard, "ordersToShip" | "waitingInquiries"> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error: boolean; id: number } | null>(null);

  useEffect(() => {
    fetch("/api/admin/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then(setMe)
      .catch(() => toLogin());
  }, []);

  // 메뉴 옆 숫자(배송 대기·답변 대기)는 화면을 옮길 때마다 다시 센다
  useEffect(() => {
    if (!me) return;
    adminApi<Dashboard>("/dashboard")
      .then((dashboard) => setCounts({ ordersToShip: dashboard.ordersToShip, waitingInquiries: dashboard.waitingInquiries }))
      .catch(() => undefined);
  }, [me, pathname]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (event: Event) => {
      const { message, error } = (event as CustomEvent<{ message: string; error: boolean }>).detail;
      setNotice({ message, error, id: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setNotice(null), 2600);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.replace("/admin/login");
  };

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: "OVERVIEW",
      items: [{ href: "/admin", label: "대시보드", icon: "dashboard" }],
    },
    {
      title: "STORE",
      items: [
        { href: "/admin/orders", label: "주문 관리", icon: "orders", count: counts?.ordersToShip },
        { href: "/admin/products", label: "상품 관리", icon: "products" },
        { href: "/admin/reviews", label: "후기 관리", icon: "reviews" },
        { href: "/admin/inquiries", label: "1:1 문의", icon: "inquiries", count: counts?.waitingInquiries },
        { href: "/admin/members", label: "회원 관리", icon: "members" },
      ],
    },
    {
      title: "CONTENT",
      items: [{ href: "/admin/banners", label: "배너·팝업", icon: "banners" }],
    },
  ];
  const isCurrent = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  if (!me) return <div className="loading">관리자 확인 중…</div>;

  return (
    <div className="app">
      <div className="side-overlay" data-open={menuOpen || undefined} onClick={() => setMenuOpen(false)} />
      <aside className="side" data-open={menuOpen || undefined}>
        <div className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- 작은 로고 하나라 이미지 최적화가 필요 없다 */}
          <img src={images.wordmark} alt="SKALEZ" />
          <span>ADMIN</span>
        </div>
        <nav>
          {sections.map((section) => (
            <div key={section.title}>
              <div className="section">{section.title}</div>
              {section.items.map((item) => (
                <a key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={icons[item.icon]} />
                  </svg>
                  {item.label}
                  {item.count ? <span className="count">{item.count}</span> : null}
                </a>
              ))}
            </div>
          ))}
          <div className="section">SITE</div>
          <a href="/ko" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={icons.shop} />
            </svg>
            쇼핑몰 열기
          </a>
        </nav>
        <div className="me">
          <span className="avatar">{me.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <b>{me.name}</b>
            <div className="muted mono">{me.email}</div>
          </div>
          <button type="button" onClick={logout}>
            로그아웃
          </button>
        </div>
      </aside>
      <main className="main">
        <button className="btn sm menu-btn" type="button" onClick={() => setMenuOpen(true)}>
          ☰ 메뉴
        </button>
        {children}
      </main>
      <div className={`toast${notice?.error ? " err" : ""}`} data-show={notice ? "" : undefined} role="status" key={notice?.id}>
        {notice?.message}
      </div>
    </div>
  );
}
