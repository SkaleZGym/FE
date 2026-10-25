"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SERPENT_FS, SERPENT_VS } from "./serpentShader";
import styles from "./SerpentIntro.module.css";

/**
 * 서펜트 비늘 인트로 (SKALEZ = scales). 히어로를 감싸고 연출 진행도 s(0~1)에 따라 보여 준다.
 * 스크롤 진행도 p(0~1)는 s = .4 + .6p 로 옮긴다: 비늘이 덮어 오는 앞부분(s .00~.40)은 잘라서,
 * 처음부터 화면 가득 비늘이 일렁이고 곧바로 로고가 떠오른다 (인트로 스크롤 1.4화면, 모바일 1.2화면).
 *   s .40      화면 전체를 덮은 비늘이 일렁인다 (시작 화면)
 *   s .44~.56  화면 가운데에 로고가 떠오르고, 비늘이 로고를 중심으로 소용돌이치며 모인다
 *   s .64~.90  로고가 S자 경로(아래로 크게 휘었다가 오른쪽으로 쓸고 올라와)로 헤더 로고 자리에 내려앉는다. 소용돌이도 따라간다
 *   s .86~.98  비늘이 걷히고 히어로·헤더·퀵메뉴가 나타난다
 *   그 뒤 한 화면(홀드)만큼은 진행도 1로 고정: 히어로가 붙어 있다가 계속 굴려야 본문으로 넘어간다. 위로 굴리면 거꾸로 재생된다.
 * 가볍게 가는 법: 캔버스 해상도 상한(프레임이 느리면 스스로 더 낮춤), CSS 변수는 값이 바뀔 때만 쓰고 :root에는 쓰지 않는다,
 * 안 보이는 히어로·헤더·퀵메뉴는 visibility: hidden, 인트로가 화면 밖이거나 비늘이 사라진 뒤에는 그리지 않는다.
 * 헤더는 [data-intro-dim], 헤더 로고는 [data-intro-logo], 퀵메뉴는 [data-intro-quick]으로 찾아 변수를 올린다.
 */

export type IntroLabels = { skip: string; hint: string; replay: string };

type Props = { logo: string; labels: IntroLabels; children: ReactNode };
type Pt = { x: number; y: number };
type GLCtx = {
  gl: WebGLRenderingContext;
  U: Record<"resolution" | "time" | "progress" | "scrollVelocity" | "mouse" | "logoPos", WebGLUniformLocation | null>;
};

const RATIO = 590 / 3000; // 로고 PNG 가로세로 비율
const START = 0.14; // 서펜트 장면 1(가는 빛줄기)은 거의 생략하고 비늘 점령부터
const P0 = 0.4; // 연출 진행도 0~.4(비늘이 덮어 오는 구간)는 건너뛴다. 대표님 피드백: 인트로 스크롤 50% 단축 (2026-10-25)
const SEEN_KEY = "skz.intro";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const back = (t: number) => {
  const c = 1.7;
  const x = t - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};
const bezier = (a: Pt, b: Pt, c: Pt, d: Pt, t: number): Pt => {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return { x: w0 * a.x + w1 * b.x + w2 * c.x + w3 * d.x, y: w0 * a.y + w1 * b.y + w2 * c.y + w3 * d.y };
};

/** CSS 변수·속성은 값이 실제로 바뀔 때만 쓴다 (스크롤 한 번에 수십 번 스타일 재계산이 도는 것을 막는다) */
const varCache = new WeakMap<HTMLElement, Map<string, string>>();
function setVar(el: HTMLElement | null, name: string, value: string | number) {
  if (!el) return;
  const v = typeof value === "number" ? value.toFixed(3) : value;
  let m = varCache.get(el);
  if (!m) {
    m = new Map();
    varCache.set(el, m);
  }
  if (m.get(name) === v) return;
  m.set(name, v);
  el.style.setProperty(name, v);
}
function setFlag(el: HTMLElement | null, name: string, on: boolean) {
  if (!el) return;
  if (on) {
    if (!el.hasAttribute(name)) el.setAttribute(name, "");
  } else if (el.hasAttribute(name)) el.removeAttribute(name);
}

function initGL(canvas: HTMLCanvasElement): GLCtx | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false, // 화면 전체 사각형 하나라 의미가 없다
    depth: false,
    stencil: false,
    powerPreference: "high-performance", // desynchronized는 일부 Windows(ANGLE/D3D11)에서 프레임을 크게 떨어뜨려 쓰지 않는다
  }) as WebGLRenderingContext | null;
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("serpent shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, SERPENT_VS);
  const fs = compile(gl.FRAGMENT_SHADER, SERPENT_FS);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("serpent program:", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_position");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(prog, "u_" + name);
  gl.uniform1f(u("scaleDensity"), 18);
  gl.uniform1f(u("rippleStrength"), 0.3);
  gl.uniform1f(u("specularStrength"), 1.05);
  return {
    gl,
    U: { resolution: u("resolution"), time: u("time"), progress: u("progress"), scrollVelocity: u("scrollVelocity"), mouse: u("mouse"), logoPos: u("logoPos") },
  };
}

export default function SerpentIntro({ logo, labels, children }: Props) {
  const introRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLSpanElement>(null);
  const api = useRef<{ skip: () => void; replay: () => void } | null>(null);

  useEffect(() => {
    const intro = introRef.current;
    const pin = pinRef.current;
    const canvas = canvasRef.current;
    const logoEl = logoRef.current;
    const replay = replayRef.current;
    const drop = dropRef.current;
    if (!intro || !pin || !canvas || !logoEl || !replay) return;
    const header = document.querySelector<HTMLElement>("[data-intro-dim]");
    const brand = header?.querySelector<HTMLElement>("[data-intro-logo]") ?? null;
    const quick = document.querySelector<HTMLElement>("[data-intro-quick]");
    const chrome = [header, quick];
    const showChrome = () => {
      for (const el of chrome) {
        setVar(el, "--hdr", 1);
        setVar(el, "--hdr-vis", "visible");
        setVar(el, "--hdr-pe", "auto");
        setVar(el, "--nav", 1);
        setVar(el, "--qv", "visible");
        setFlag(el, "data-intro-done", true);
      }
    };
    const clearChrome = () => {
      for (const el of chrome) {
        if (!el) continue;
        for (const name of ["--hdr", "--hdr-vis", "--hdr-pe", "--nav", "--qv"]) el.style.removeProperty(name);
        el.removeAttribute("data-intro-done");
        varCache.delete(el); // 지운 값을 캐시가 기억하고 있으면 다시 마운트됐을 때 안 써져서 헤더가 안 보인다
      }
      varCache.delete(pin);
      brand?.removeAttribute("data-glow");
    };
    // 움직임 줄이기: CSS가 인트로를 접어 두므로 헤더·퀵메뉴만 켜고 끝
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showChrome();
      return clearChrome;
    }

    const g = initGL(canvas);
    if (!g) canvas.hidden = true; // WebGL이 없으면 비늘 없이 로고·히어로 전환만
    canvas.addEventListener("webglcontextlost", () => (canvas.hidden = true));

    /* ---------- 기하 ---------- */
    let W = 0;
    let H = 0;
    let lw = 0; // 큰 로고 크기
    let lh = 0;
    let tw = 118; // 헤더 로고 폭 (도착 크기)
    let trackPx = 1; // 진행도 0→1에 쓰는 스크롤 길이
    let holdPx = 0; // 히어로가 붙어 있는 구간
    let center: Pt = { x: 0, y: 0 };
    let dest: Pt = { x: 0, y: 0 }; // 헤더 로고 중심 (화면 좌표 = pin 좌표. pin은 인트로 동안 항상 화면 맨 위에 붙어 있다)
    let c1: Pt = { x: 0, y: 0 };
    let c2: Pt = { x: 0, y: 0 };
    let budget = 0.6e6; // 캔버스 픽셀 상한. 비늘은 부드러운 무늬라 낮춰도 티가 안 난다
    let slowFrames = 0;
    let lastSize = { w: 0, h: 0 };
    const mobile = () => W < 720;

    function sizeCanvas() {
      if (!g) return;
      let dpr = Math.min(devicePixelRatio || 1, 2);
      const cap = mobile() ? Math.min(budget, 0.45e6) : budget;
      while (W * H * dpr * dpr > cap && dpr > 0.35) dpr = Math.round(dpr * 85) / 100;
      const w = Math.max(1, Math.floor(W * dpr));
      const h = Math.max(1, Math.floor(H * dpr));
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
        g.gl.viewport(0, 0, w, h);
      }
    }
    function measure() {
      W = pin!.clientWidth;
      H = pin!.clientHeight;
      const introVh = mobile() ? 1.2 : 1.4; // 인트로가 차지하는 스크롤 (화면 높이 배수). 처음 2.4 / 2.8에서 절반으로
      const holdVh = mobile() ? 0.9 : 1.0;
      trackPx = Math.round(H * introVh);
      holdPx = Math.round(H * holdVh);
      intro!.style.height = `${H + trackPx + holdPx}px`;
      // #drop 앵커(메뉴 COLLAB)는 히어로가 다 보이는 자리. html의 scroll-padding-top만큼 아래에 둬야 정확히 그 위치에 멈춘다
      if (drop) {
        const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        drop.style.top = `${trackPx + pad}px`;
      }
      lw = Math.min(W * 0.72, 820);
      lh = lw * RATIO;
      logoEl!.style.width = `${lw}px`;
      logoEl!.style.height = `${lh}px`;
      center = { x: W / 2, y: H / 2 };
      const br = brand?.getBoundingClientRect();
      dest = br && br.width > 0 ? { x: br.left + br.width / 2, y: br.top + br.height / 2 } : { x: 24 + 59, y: 34 };
      tw = br?.width || 118;
      // S자 경로: 가운데에서 아래로 크게 휘었다가, 오른쪽으로 쓸고 올라와 헤더 로고 자리로. 모바일은 화면이 좁아 옆으로 덜 나간다
      c1 = mobile() ? { x: center.x - W * 0.28, y: center.y + H * 0.3 } : { x: center.x - W * 0.22, y: center.y + H * 0.36 };
      c2 = mobile() ? { x: dest.x + W * 0.85, y: dest.y + H * 0.2 } : { x: dest.x + W * 0.6, y: dest.y + H * 0.14 };
      sizeCanvas();
    }

    /* ---------- 연출 ---------- */
    let logoPos: Pt = center;
    let lastLogo = "";
    function choreography(p: number) {
      // p = 스크롤 진행도(0~1), s = 연출 진행도. 앞부분(비늘이 덮어 오는 장면)을 잘라 비늘이 화면을 다 덮은 상태, 로고가 떠오르기 직전부터 시작한다
      const s = P0 + p * (1 - P0);
      const sp = START + s * (1 - START); // 셰이더 진행도
      const rise = clamp((s - 0.44) / 0.12); // 로고 떠오름
      const move = clamp((s - 0.64) / 0.26); // 로고 이동
      const handoff = clamp((s - 0.9) / 0.03); // 헤더 로고에 자리를 넘김
      const u = easeInOut(move);
      const pos = move > 0 ? bezier(center, c1, c2, dest, u) : center;
      logoPos = pos;
      const scale = (0.72 + 0.28 * back(rise)) * (1 + (tw / lw - 1) * u);
      // 진행 방향 쪽으로 살짝 기울었다가 도착할 때는 똑바로 선다
      let rot = 0;
      if (move > 0 && move < 1) {
        const ahead = bezier(center, c1, c2, dest, Math.min(1, u + 0.01));
        const ang = (Math.atan2(ahead.y - pos.y, ahead.x - pos.x) * 180) / Math.PI;
        rot = Math.max(-16, Math.min(16, ang * 0.12)) * (1 - u * u);
      }
      const opacity = rise * (1 - handoff);
      const next = `${(pos.x - lw / 2).toFixed(1)},${(pos.y - lh / 2).toFixed(1)},${rot.toFixed(2)},${scale.toFixed(4)},${opacity.toFixed(3)}`;
      if (next !== lastLogo) {
        lastLogo = next;
        logoEl!.style.transform = `translate(${(pos.x - lw / 2).toFixed(1)}px, ${(pos.y - lh / 2).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        logoEl!.style.opacity = opacity.toFixed(3);
      }
      // 히어로·캔버스
      const c = ease(clamp((s - 0.86) / 0.11));
      const cv = 1 - clamp((s - 0.9) / 0.08);
      setVar(pin, "--c", c);
      setVar(pin, "--cv", cv);
      setVar(pin, "--p", p); // 진행 막대는 실제 스크롤 진행도
      setVar(pin, "--h", clamp(p * 8));
      setVar(pin, "--hv", c > 0 ? "visible" : "hidden"); // 안 보이는 히어로는 합성에서 뺀다
      // 헤더: 로고는 큰 로고가 도착하는 순간, 메뉴·퀵메뉴는 히어로와 함께
      const lg = clamp((s - 0.885) / 0.035);
      const nav = clamp((s - 0.9) / 0.08);
      setVar(header, "--hdr", lg);
      setVar(header, "--hdr-vis", lg > 0 ? "visible" : "hidden");
      setVar(header, "--hdr-pe", s > 0.9 ? "auto" : "none");
      setVar(header, "--nav", nav);
      setVar(quick, "--nav", nav);
      setVar(quick, "--qv", s > 0.9 ? "visible" : "hidden");
      setFlag(brand, "data-glow", s > 0.87 && s < 0.96);
      setFlag(header, "data-intro-done", s >= 0.98);
      setFlag(replay, "data-on", s > 0.97);
      if (s > 0.97) {
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {}
      }
      return { sp, cv };
    }

    /* ---------- 스크롤 → 진행도 (관성) → 그리기 ---------- */
    let target = 0;
    let cur = 0;
    let lastTarget = 0;
    let vel = 0;
    let raf = 0;
    let lastT = 0;
    let snapping = false;
    let snapped = false;
    let navUntil = 0; // 메뉴(#앵커) 클릭으로 이동하는 동안은 히어로 스냅이 끼어들지 않는다
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const endY = () => intro!.offsetTop + trackPx; // 진행도 1 = 히어로가 다 보이는 자리. 여기서부터 홀드 구간
    const readTarget = () => {
      target = clamp(-intro!.getBoundingClientRect().top / trackPx);
    };
    const inView = () => {
      const r = intro!.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    };
    /** 히어로가 보이기 시작하면 히어로 화면에 딱 맞춰 멈춘다. 그 뒤 홀드 구간 동안은 굴려도 그대로, 더 굴리면 본문으로 */
    function landHero() {
      if (snapping) return;
      snapping = true;
      snapped = true;
      const from = scrollY;
      const to = endY();
      const dur = Math.min(800, 300 + Math.abs(to - from) * 0.5);
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        scrollTo({ top: from + (to - from) * ease(k), behavior: "instant" });
        if (k < 1) requestAnimationFrame(step);
        else snapping = false;
      };
      requestAnimationFrame(step);
    }
    const block = (e: Event) => {
      if (snapping) e.preventDefault();
    };
    function render(now: number, sp: number) {
      if (!g) return;
      const { gl, U } = g;
      gl.uniform2f(U.resolution, canvas!.width, canvas!.height);
      gl.uniform1f(U.time, now * 0.001);
      gl.uniform1f(U.progress, sp);
      gl.uniform1f(U.scrollVelocity, vel);
      gl.uniform2f(U.mouse, pointer.x, pointer.y);
      gl.uniform2f(U.logoPos, Math.min(0.96, Math.max(0.04, logoPos.x / W)), Math.min(0.96, Math.max(0.04, 1 - logoPos.y / H)));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    function tick(now: number) {
      raf = 0;
      const dt = lastT ? Math.min(0.05, (now - lastT) * 0.001) : 0.016;
      lastT = now;
      readTarget();
      // 인트로 트랙 안에서 .9를 넘는 순간에만 맞춰 준다. 메뉴 클릭으로 지나가는 중이거나 본문까지 건너뛴 경우에는 끌어오지 않는다
      const ts = P0 + target * (1 - P0); // 스냅 기준은 연출 진행도로 (히어로가 보이기 시작하는 .9)
      if (!snapped && ts >= 0.9 && target > lastTarget && scrollY < endY() && now > navUntil) landHero();
      if (ts < 0.85) snapped = false; // 위로 되돌아가면 다음에 또 맞춰 준다
      lastTarget = target;
      const prev = cur;
      cur += (target - cur) * (1 - Math.exp(-dt / 0.12));
      if (Math.abs(target - cur) < 0.0005) cur = target;
      vel += (Math.abs(cur - prev) / Math.max(0.001, dt) - vel) * 0.15;
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      const { sp, cv } = choreography(cur);
      const drawing = cv > 0 && !canvas!.hidden && inView() && !document.hidden;
      if (drawing) {
        // 프레임이 계속 느리면(26ms 넘는 프레임이 쌓이면) 해상도를 30%씩 더 낮춘다
        if (dt > 0.026) slowFrames += dt > 0.05 ? 3 : 1;
        else slowFrames = Math.max(0, slowFrames - 1);
        if (slowFrames > 10 && budget > 0.2e6) {
          budget *= 0.7;
          slowFrames = 0;
          sizeCanvas();
        }
        render(now, sp);
      }
      // 비늘이 보이는 동안은 계속(물결이 살아 있어야 해서), 그 밖에는 스크롤이 멈추면 쉰다
      if (drawing || cur !== target || snapping) raf = requestAnimationFrame(tick);
      else lastT = 0;
    }
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      const w = pin!.clientWidth;
      const h = pin!.clientHeight;
      // 모바일 주소창이 접혔다 펴지는 정도의 높이 변화는 무시한다 (진행도가 튀지 않게)
      if (w === lastSize.w && Math.abs(h - lastSize.h) < 140) return;
      lastSize = { w, h };
      measure();
      wake();
    };
    const onMove = (e: MouseEvent) => {
      pointer.tx = e.clientX / innerWidth;
      pointer.ty = 1 - e.clientY / innerHeight;
    };
    api.current = {
      skip: landHero,
      replay: () => {
        try {
          sessionStorage.removeItem(SEEN_KEY);
        } catch {}
        snapped = false;
        scrollTo({ top: intro!.offsetTop, behavior: "instant" });
        wake();
      },
    };

    measure();
    lastSize = { w: W, h: H };
    // 같은 세션에 이미 본 경우: 바로 히어로에서 시작 (위로 굴리면 인트로를 거꾸로 볼 수 있다)
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (seen && scrollY < 10) {
      scrollTo({ top: endY(), behavior: "instant" });
      snapped = true;
    }
    readTarget();
    cur = target;
    lastTarget = target;
    choreography(cur);
    wake();
    addEventListener("scroll", wake, { passive: true });
    addEventListener("resize", onResize);
    addEventListener("mousemove", onMove, { passive: true });
    addEventListener("wheel", block, { passive: false });
    addEventListener("touchmove", block, { passive: false });
    const onAnchorClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('a[href^="#"]')) navUntil = performance.now() + 1600;
    };
    document.addEventListener("click", onAnchorClick, true);
    document.addEventListener("visibilitychange", wake);
    document.fonts?.ready.then(() => {
      measure();
      wake();
    });

    return () => {
      removeEventListener("scroll", wake);
      removeEventListener("resize", onResize);
      removeEventListener("mousemove", onMove);
      removeEventListener("wheel", block);
      removeEventListener("touchmove", block);
      document.removeEventListener("click", onAnchorClick, true);
      document.removeEventListener("visibilitychange", wake);
      cancelAnimationFrame(raf);
      intro.style.removeProperty("height");
      api.current = null;
      clearChrome();
    };
  }, []);

  return (
    <div ref={introRef} className={styles.intro}>
      <span ref={dropRef} id="drop" className={styles.anchor} aria-hidden="true" />
      <div ref={pinRef} className={styles.pin}>
        <div className={styles.heroSlot}>{children}</div>
        <canvas ref={canvasRef} className={styles.scales} aria-hidden="true" />
        <div ref={logoRef} className={styles.bigLogo} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" />
        </div>
        <button type="button" className={styles.skip} onClick={() => api.current?.skip()}>
          {labels.skip} →
        </button>
        <div className={styles.hint} aria-hidden="true">
          {labels.hint}
          <i />
        </div>
        <div className={styles.progress} aria-hidden="true" />
        <button ref={replayRef} type="button" className={styles.replay} onClick={() => api.current?.replay()}>
          ↺ {labels.replay}
        </button>
        {/* 스크립트가 꺼져 있으면 인트로를 접고 히어로·헤더를 바로 보여 준다 */}
        <noscript>
          <style>{`[data-intro-dim],[data-intro-quick]{--hdr:1;--hdr-vis:visible;--hdr-pe:auto;--nav:1;--qv:visible}.${styles.intro}{height:auto}.${styles.pin}{position:relative;height:auto}.${styles.heroSlot}{visibility:visible;opacity:1;transform:none}.${styles.scales},.${styles.bigLogo},.${styles.skip},.${styles.hint},.${styles.progress},.${styles.replay}{display:none}`}</style>
        </noscript>
      </div>
    </div>
  );
}
