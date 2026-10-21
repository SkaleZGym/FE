"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** 등장 지연(ms). 목록에서 순서대로 나타나게 할 때 사용 */
  delay?: number;
  className?: string;
};

/** 화면에 들어오면 아래에서 위로 서서히 나타난다. 한 번 나타나면 다시 숨지 않는다 */
export default function Reveal({ children, delay = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.dataset.visible = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}
