"use client";

import { useEffect, useState, type FormEvent } from "react";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { api, money, type Claim, type Inquiry, type Me, type Order } from "@/lib/client";
import styles from "./account.module.css";
import { logout, setMe } from "./accountStore";
import { canClaim, ClaimForm, ClaimList } from "./Claims";
import { fill } from "./CartView";
import { errorText, useMember, useSearch } from "./useMember";

type Labels = {
  mypage: Dictionary["mypage"];
  order: Dictionary["order"];
  inquiry: Dictionary["inquiry"];
  claim: Dictionary["claim"];
  account: Dictionary["account"];
  common: Dictionary["common"];
};

type Tab = "orders" | "claims" | "inquiries" | "profile";
const tabs: Tab[] = ["orders", "claims", "inquiries", "profile"];

const dateOf = (iso: string, locale: Locale) => new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });

/** 마이페이지: 주문 내역 · 교환·반품 · 1:1 문의 · 내 정보. ?tab=inquiries 처럼 바로 열 수 있다 */
export default function MyPage({ locale, labels }: { locale: Locale; labels: Labels }) {
  const account = useMember(locale);
  const fromUrl = new URLSearchParams(useSearch()).get("tab") as Tab | null;
  const [picked, setPicked] = useState<Tab | null>(null);
  const tab = picked ?? (fromUrl && tabs.includes(fromUrl) ? fromUrl : "orders");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (account.status !== "member") return;
    Promise.all([api<Order[]>("/orders", { locale }), api<Claim[]>("/claims", { locale })])
      .then(([orderList, claimList]) => {
        setOrders(orderList);
        setClaims(claimList);
      })
      .catch((caught) => setError(errorText(caught, labels.common)));
  }, [account.status, locale, labels.common]);

  const pick = (next: Tab) => {
    setPicked(next);
    window.history.replaceState(null, "", `?tab=${next}`);
  };

  if (account.status !== "member" || !account.me) return <p className={styles.muted}>{labels.common.loading}</p>;

  return (
    <>
      <div className={styles.hello}>
        {fill(labels.mypage.hello, { name: account.me.name })}
        <span>{account.me.email}</span>
      </div>
      <div className={styles.tabs} role="tablist">
        {tabs.map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => pick(key)}>
            {key === "claims" ? labels.claim.tab : labels.mypage.tabs[key]}
          </button>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {tab === "orders" && (
        <Orders
          locale={locale}
          labels={labels}
          orders={orders}
          setOrders={setOrders}
          claims={claims ?? []}
          onClaim={(claim) => {
            setClaims((current) => [claim, ...(current ?? [])]);
            pick("claims");
          }}
        />
      )}
      {tab === "orders" && <LegacyOrders locale={locale} labels={labels} />}
      {tab === "claims" && <ClaimList locale={locale} claims={claims} labels={labels} />}
      {tab === "inquiries" && <Inquiries locale={locale} labels={labels} orders={orders ?? []} />}
      {tab === "profile" && <Profile locale={locale} labels={labels} me={account.me} />}
    </>
  );
}

// ---------- 주문 내역 ----------

const tone = (status: Order["status"]) =>
  status === "DELIVERED" ? "done" : status === "CANCELLED" ? "off" : status === "PENDING_PAYMENT" ? "red" : undefined;

function Orders({
  locale,
  labels,
  orders,
  setOrders,
  claims,
  onClaim,
}: {
  locale: Locale;
  labels: Labels;
  orders: Order[] | null;
  setOrders: (update: (current: Order[] | null) => Order[] | null) => void;
  claims: Claim[];
  onClaim: (claim: Claim) => void;
}) {
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);
  const { order: text } = labels;

  const cancel = async (orderNumber: string) => {
    if (!window.confirm(text.cancelConfirm)) return;
    setError("");
    try {
      const updated = await api<Order>(`/orders/${orderNumber}/cancel`, { method: "POST", locale });
      setOrders((current) => current?.map((item) => (item.orderNumber === orderNumber ? updated : item)) ?? null);
    } catch (caught) {
      setError(errorText(caught, labels.common));
    }
  };

  if (!orders) return <p className={styles.muted}>{labels.common.loading}</p>;
  if (orders.length === 0) {
    return (
      <div className={styles.empty}>
        {labels.mypage.noOrders}
        <a className={styles.button} data-variant="ghost" href={`/${locale}/shop/all`}>
          SHOP →
        </a>
      </div>
    );
  }

  return (
    <div className={styles.cards}>
      {error && <p className={styles.error}>{error}</p>}
      {orders.map((order) => (
        <article className={styles.box} key={order.orderNumber}>
          <div className={styles.boxHead}>
            <span>
              <b>{order.orderNumber}</b> · {dateOf(order.createdAt, locale)}
            </span>
            <span className={styles.status} data-tone={tone(order.status)}>
              {text.status[order.status]}
            </span>
          </div>
          <div className={styles.boxBody}>
            {order.items.map((item, index) => (
              <span key={index}>
                {item.productName} · {item.size} × {item.quantity}
              </span>
            ))}
          </div>
          <div className={styles.boxFoot}>
            <span>{money(order.totalAmount, order.currency, locale)}</span>
            <div className={styles.actions}>
              {order.trackingUrl && (
                <a className={styles.button} data-variant="ghost" data-size="small" href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
                  {text.track} {order.courier && `· ${order.courier}`}
                </a>
              )}
              {(order.status === "PENDING_PAYMENT" || order.status === "PAID") && (
                <button className={styles.button} data-variant="ghost" data-size="small" type="button" onClick={() => cancel(order.orderNumber)}>
                  {text.cancel}
                </button>
              )}
              {canClaim(order, claims) && claiming !== order.orderNumber && (
                <button className={styles.button} data-variant="ghost" data-size="small" type="button" onClick={() => setClaiming(order.orderNumber)}>
                  {labels.claim.request}
                </button>
              )}
            </div>
          </div>
          {claiming === order.orderNumber && (
            <ClaimForm
              locale={locale}
              order={order}
              claims={claims}
              labels={labels}
              onClose={() => setClaiming(null)}
              onDone={(claim) => {
                setClaiming(null);
                onClaim(claim);
              }}
            />
          )}
        </article>
      ))}
    </div>
  );
}

// ---------- 이전 쇼핑몰(아임웹) 주문: 회원 이메일로 이어진 기록만 보여 준다 ----------

type LegacyOrder = { orderNumber: string; orderedAt: string | null; status: string | null; items: string; totalAmount: number | null; currency: string };

function LegacyOrders({ locale, labels }: { locale: Locale; labels: Labels }) {
  const [items, setItems] = useState<LegacyOrder[]>([]);

  useEffect(() => {
    api<LegacyOrder[]>("/orders/legacy", { locale })
      .then(setItems)
      .catch(() => setItems([]));
  }, [locale]);

  if (items.length === 0) return null;
  return (
    <section className={styles.cards} style={{ marginTop: 40 }}>
      <div className={styles.hello}>
        {labels.mypage.legacyTitle}
        <span>{labels.mypage.legacyNote}</span>
      </div>
      {items.map((order) => (
        <article className={styles.box} key={order.orderNumber}>
          <div className={styles.boxHead}>
            <span>
              <b>{order.orderNumber}</b>
              {order.orderedAt && ` · ${dateOf(order.orderedAt, locale)}`}
            </span>
            {order.status && <span className={styles.status}>{order.status}</span>}
          </div>
          <div className={styles.boxBody}>
            {order.items.split("\n").map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </div>
          {order.totalAmount != null && (
            <div className={styles.boxFoot}>
              <span>{money(order.totalAmount, order.currency, locale)}</span>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

// ---------- 1:1 문의 ----------

const categories = ["PRODUCT", "ORDER", "DELIVERY", "EXCHANGE_RETURN", "ETC"] as const;

function Inquiries({ locale, labels, orders }: { locale: Locale; labels: Labels; orders: Order[] }) {
  const { inquiry: text } = labels;
  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ content: Inquiry[] }>("/inquiries?size=50", { locale })
      .then((page) => setItems(page.content))
      .catch((caught) => setError(errorText(caught, labels.common)));
  }, [locale, labels.common]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError("");
    setDone("");
    try {
      const created = await api<Inquiry>("/inquiries", {
        method: "POST",
        locale,
        body: {
          category: form.get("category"),
          title: String(form.get("title")).trim(),
          content: String(form.get("content")).trim(),
          orderNumber: form.get("orderNumber") || null,
        },
      });
      setItems((current) => [created, ...(current ?? [])]);
      formElement.reset();
      setDone(text.submitted);
    } catch (caught) {
      setError(errorText(caught, labels.common));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(text.deleteConfirm)) return;
    try {
      await api(`/inquiries/${id}`, { method: "DELETE", locale });
      setItems((current) => current?.filter((item) => item.id !== id) ?? null);
    } catch (caught) {
      setError(errorText(caught, labels.common));
    }
  };

  return (
    <div className={styles.split}>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>{text.category}</span>
            <select className={styles.input} name="category" defaultValue="PRODUCT">
              {categories.map((key) => (
                <option key={key} value={key}>
                  {text.categories[key]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>{text.orderNumber}</span>
            <select className={styles.input} name="orderNumber" defaultValue="">
              <option value="">{text.orderNone}</option>
              {orders.map((order) => (
                <option key={order.orderNumber} value={order.orderNumber}>
                  {order.orderNumber}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={styles.field}>
          <span>{text.title}</span>
          <input className={styles.input} name="title" maxLength={100} required />
        </label>
        <label className={styles.field}>
          <span>{text.content}</span>
          <textarea className={styles.input} name="content" maxLength={2000} required />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {done && (
          <p className={styles.success} role="status">
            {done}
          </p>
        )}
        <button className={styles.button} type="submit" disabled={busy}>
          {text.submit}
        </button>
      </form>

      <div className={styles.cards}>
        {!items && <p className={styles.muted}>{labels.common.loading}</p>}
        {items?.length === 0 && <p className={styles.muted}>{labels.mypage.noInquiries}</p>}
        {items?.map((item) => (
          <details className={styles.box} key={item.id}>
            <summary className={styles.boxHead} style={{ cursor: "pointer", listStyle: "none" }}>
              <span>
                [{text.categories[item.category]}] <b>{item.title}</b>
              </span>
              <span className={styles.status} data-tone={item.status === "ANSWERED" ? "done" : undefined}>
                {item.status === "ANSWERED" ? text.answered : text.waiting}
              </span>
            </summary>
            <p className={styles.content}>{item.content}</p>
            {item.answer && (
              <div className={styles.answer}>
                <b>{text.answer}</b>
                {item.answer}
              </div>
            )}
            <div className={styles.boxFoot}>
              <span className={styles.muted}>
                {dateOf(item.createdAt, locale)}
                {item.orderNumber && ` · ${item.orderNumber}`}
              </span>
              {item.status === "WAITING" && (
                <button type="button" className={styles.textButton} onClick={() => remove(item.id)}>
                  {labels.common.delete}
                </button>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

// ---------- 내 정보 ----------

function Profile({ locale, labels, me }: { locale: Locale; labels: Labels; me: Me }) {
  const { mypage: text, account, common } = labels;
  const [profileMessage, setProfileMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const updated = await api<Me>("/members/me", {
        method: "PATCH",
        locale,
        body: { name: String(form.get("name")).trim(), language: form.get("language"), marketingConsent: Boolean(form.get("marketing")) },
      });
      setMe(updated);
      setProfileMessage({ ok: true, text: common.saved });
    } catch (caught) {
      setProfileMessage({ ok: false, text: errorText(caught, common) });
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get("newPassword"));
    if (newPassword !== String(form.get("passwordConfirm"))) {
      return setPasswordMessage({ ok: false, text: account.passwordMismatch });
    }
    try {
      await api("/members/me/password", {
        method: "PUT",
        locale,
        body: { currentPassword: String(form.get("currentPassword")), newPassword },
      });
      formElement.reset();
      setPasswordMessage({ ok: true, text: text.passwordChanged });
    } catch (caught) {
      setPasswordMessage({ ok: false, text: errorText(caught, common) });
    }
  };

  const signOut = async () => {
    await logout();
    // 로그인 상태 저장소까지 처음부터 다시 불러오도록 전체 새로고침으로 이동
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/${locale}`);
  };

  // 회원 탈퇴(개인정보 삭제 요청): BE 가 개인정보를 바로 지우고 주문 기록만 비식별 상태로 남긴다
  const [withdrawMessage, setWithdrawMessage] = useState<string | null>(null);
  const withdraw = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (!window.confirm(text.withdrawConfirm)) return;
    try {
      await api("/members/me/withdraw", { method: "POST", locale, body: { password: password || null } });
      await signOut();
    } catch (caught) {
      setWithdrawMessage(errorText(caught, common));
    }
  };

  return (
    <div className={styles.split}>
      <form className={styles.form} onSubmit={saveProfile}>
        <label className={styles.field}>
          <span>{account.email}</span>
          <input className={styles.input} value={me.email} disabled readOnly />
        </label>
        <label className={styles.field}>
          <span>{account.name}</span>
          <input className={styles.input} name="name" defaultValue={me.name} maxLength={50} required />
        </label>
        <label className={styles.field}>
          <span>{text.language}</span>
          <select className={styles.input} name="language" defaultValue={me.language}>
            {locales.map((code) => (
              <option key={code} value={code}>
                {localeLabels[code]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.check}>
          <input type="checkbox" name="marketing" defaultChecked={me.marketingConsent} />
          {text.marketing}
        </label>
        {profileMessage && <p className={profileMessage.ok ? styles.success : styles.error}>{profileMessage.text}</p>}
        <button className={styles.button} type="submit">
          {text.saveProfile}
        </button>
        <button className={styles.button} data-variant="ghost" type="button" onClick={signOut}>
          {account.logout}
        </button>
      </form>

      <form className={styles.form} onSubmit={changePassword}>
        <h2 className={styles.muted} style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {text.passwordTitle}
        </h2>
        <label className={styles.field}>
          <span>{text.currentPassword}</span>
          <input className={styles.input} type="password" name="currentPassword" autoComplete="current-password" required />
        </label>
        <label className={styles.field}>
          <span>{text.newPassword}</span>
          <input className={styles.input} type="password" name="newPassword" autoComplete="new-password" minLength={8} maxLength={64} required />
          <small>{account.passwordRule}</small>
        </label>
        <label className={styles.field}>
          <span>{account.passwordConfirm}</span>
          <input className={styles.input} type="password" name="passwordConfirm" autoComplete="new-password" minLength={8} maxLength={64} required />
        </label>
        {passwordMessage && <p className={passwordMessage.ok ? styles.success : styles.error}>{passwordMessage.text}</p>}
        <button className={styles.button} data-variant="ghost" type="submit">
          {text.changePassword}
        </button>
      </form>

      <form className={styles.form} onSubmit={withdraw}>
        <h2 className={styles.muted} style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {text.withdrawTitle}
        </h2>
        <p className={styles.muted}>{text.withdrawText}</p>
        <label className={styles.field}>
          <span>{text.withdrawPassword}</span>
          <input className={styles.input} type="password" name="password" autoComplete="current-password" maxLength={64} />
        </label>
        {withdrawMessage && <p className={styles.error}>{withdrawMessage}</p>}
        <button className={styles.button} data-variant="ghost" data-size="small" type="submit">
          {text.withdrawButton}
        </button>
      </form>
    </div>
  );
}
