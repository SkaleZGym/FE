/** 상품 상세 패널(ProductPanel)을 여는 신호. 카드·히어로 상품 정보 등 어디서든 id만 보내면 된다 */
export const PRODUCT_EVENT = "skz:product";

export function openProduct(id: number) {
  window.dispatchEvent(new CustomEvent<number>(PRODUCT_EVENT, { detail: id }));
}
