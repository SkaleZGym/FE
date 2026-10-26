"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/config";
import { api, type BeProduct, type Cart, type Me } from "@/lib/client";

/**
 * 로그인 상태 · 장바구니 개수 · 위시리스트(상품 코드)를 페이지 전체가 함께 쓰는 작은 저장소.
 * 헤더·상품 패널·마이페이지가 같은 값을 보고, 바뀌면 함께 다시 그린다.
 */
type State = {
  status: "loading" | "guest" | "member";
  me: Me | null;
  cartCount: number;
  /** 찜한 상품의 BE 상품 코드 → BE 상품 번호 */
  wishes: Map<string, number>;
};

const initial: State = { status: "loading", me: null, cartCount: 0, wishes: new Map() };
let state = initial;
let started = false;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export async function refreshAccount(locale: Locale) {
  try {
    const me = await api<Me>("/members/me", { locale });
    set({ status: "member", me });
    await Promise.all([refreshCart(locale), refreshWishes(locale)]);
  } catch {
    set({ status: "guest", me: null, cartCount: 0, wishes: new Map() });
  }
}

export async function refreshCart(locale: Locale) {
  try {
    const cart = await api<Cart>("/cart", { locale });
    set({ cartCount: cart.items.reduce((sum, item) => sum + item.quantity, 0) });
  } catch {
    // 장바구니 개수는 못 불러와도 화면을 막지 않는다
  }
}

export async function refreshWishes(locale: Locale) {
  try {
    const wishes = await api<BeProduct[]>("/wishes", { locale });
    set({ wishes: new Map(wishes.map((product) => [product.sku, product.id])) });
  } catch {
    // 위시리스트도 마찬가지
  }
}

export function setMe(me: Me) {
  set({ me });
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  set({ status: "guest", me: null, cartCount: 0, wishes: new Map() });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** 처음 쓰는 컴포넌트가 로그인 상태를 한 번 불러온다 */
export function useAccount(locale: Locale) {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => initial);
  useEffect(() => {
    if (started) return;
    started = true;
    void refreshAccount(locale);
  }, [locale]);
  return snapshot;
}
