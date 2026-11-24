"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { SERPENT_FS, SERPENT_VS } from "./serpentShader";
import styles from "./SerpentIntro.module.css";

/**
 * 서펜트 비늘 인트로 (SKALEZ = scales). 히어로를 감싸고 연출 진행도 s(0~1)에 따라 보여 준다.
 * 스크롤 진행도 p(0~1)는 s = .4 + .6p 로 옮긴다: 비늘이 덮어 오는 앞부분(s .00~.40)은 잘라서,
 * 곧바로 비늘이 보인다 (인트로 스크롤 1.4화면, 모바일 1.2화면).
 * 지금 연출(2026-11-24, 힉스필드 실사 필름): 똬리 튼 뱀이 꿈틀대며 비늘 무늬가 빛을 받아 드러난다
 *   → 그 위로 가운데 로고가 빛에 쓸리며 서서히 드러남(움직이지 않음) → 그대로 히어로로 넘어간다. 구간별 진행도는 choreography() 주석.
 *   (머리가 덤벼 무는 마무리와 화면이 다가가는 확대는 뺐다: 사용자 피드백 "단조롭게 확대하는 느낌")
 * 필름을 못 불러오면 예전 셰이더 비늘(경로를 따라오는 띠 → 턱처럼 닫히는 BITE)이 대신 나온다.
 *   s .86~.98  히어로·헤더·퀵메뉴가 나타난다
 *   히어로가 다 나오면 바로 본문으로 이어서 굴러간다 (2026-11-23 사용자 요청: 예전에는 한 화면만큼 히어로가 붙어 멈춰 있었다). 위로 굴리면 거꾸로 재생된다.
 * 가볍게 가는 법: 캔버스 해상도 상한(프레임이 느리면 스스로 더 낮춤), CSS 변수는 값이 바뀔 때만 쓰고 :root에는 쓰지 않는다,
 * 안 보이는 히어로·헤더·퀵메뉴는 visibility: hidden, 인트로가 화면 밖이거나 비늘이 사라진 뒤에는 그리지 않는다.
 * 헤더는 [data-intro-dim], 헤더 로고는 [data-intro-logo], 퀵메뉴는 [data-intro-quick]으로 찾아 변수를 올린다.
 */

export type IntroLabels = { skip: string; hint: string; replay: string };

type Props = { logo: string; labels: IntroLabels; children: ReactNode };
type Pt = { x: number; y: number };
type GLCtx = {
  gl: WebGLRenderingContext;
  U: Record<"resolution" | "time" | "progress" | "scrollVelocity" | "mouse" | "logoPos" | "path", WebGLUniformLocation | null>;
};

const RATIO = 590 / 3000; // 로고 PNG 가로세로 비율
/** 실사 필름: 어둠 속에서 똬리 튼 검은 뱀이 꿈틀대고, 차가운 청은색 빛에 비늘 무늬가 드러난다 (힉스필드 Seedance 2.5, 2026-11-24) */
const FILM = {
  wide: "/intro/coil-wide.mp4",
  tall: "/intro/coil-tall.mp4",
  poster: "/intro/coil-poster.jpg",
};
const START = 0.14; // 서펜트 장면 1(가는 빛줄기)은 거의 생략하고 비늘 점령부터
const P0 = 0.4; // 연출 진행도 0~.4(비늘이 덮어 오는 구간)는 건너뛴다. 대표님 피드백: 인트로 스크롤 50% 단축 (2026-10-25)
const SEEN_KEY = "skz.intro";
/** 최소 재생 시간(초): 아무리 빨리 굴려도 인트로 전체(진행도 0→1)가 이보다 빨리 지나가지 않는다. 스크롤 길이는 그대로 */
const MIN_PLAY = 1.6;
/** 서펜트가 팍 문 직후(s .672, 번쩍이는 순간)의 스크롤 진행도와, 거기서 멈춰 있는 시간(ms) */
/** 필름이 없을 때 나오는 셰이더 서펜트가 팍 무는 순간(s .672)의 스크롤 진행도와, 거기서 멈춰 있는 시간(ms) */
const BITE_P = (0.672 - P0) / (1 - P0);
const BITE_HOLD = 150;
/** 서펜트와 로고가 들어오는 경로 (대표님 스케치, 2026-10-30). 화면 비율 좌표(0~1, y는 아래로), 끝은 화면 가운데 */
const PATH: Pt[] = [
  { x: 0.1, y: 0.2 },
  { x: 0.11, y: 0.32 },
  { x: 0.25, y: 0.4 },
  { x: 0.45, y: 0.37 },
  { x: 0.62, y: 0.36 },
  { x: 0.78, y: 0.4 },
  { x: 0.82, y: 0.52 },
  { x: 0.7, y: 0.6 },
  { x: 0.56, y: 0.58 },
  { x: 0.5, y: 0.5 },
];
const PATH_SAMPLES = 16; // 셰이더 u_path 길이
/** Catmull-Rom 스플라인 위 t(0~1)의 점 (경로를 부드럽게 잇는다) */
function pathAt(t: number): Pt {
  const n = PATH.length - 1;
  const f = clamp(t) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const k = f - i;
  const p0 = PATH[Math.max(0, i - 1)];
  const p1 = PATH[i];
  const p2 = PATH[i + 1];
  const p3 = PATH[Math.min(n, i + 2)];
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * k + (2 * a - 5 * b + 4 * c - d) * k * k + (-a + 3 * b - 3 * c + d) * k * k * k);
  return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) };
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
    U: { resolution: u("resolution"), time: u("time"), progress: u("progress"), scrollVelocity: u("scrollVelocity"), mouse: u("mouse"), logoPos: u("logoPos"), path: u("path[0]") },
  };
}

export default function SerpentIntro({ logo, labels, children }: Props) {
  const introRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filmRef = useRef<HTMLVideoElement>(null);
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
    // 큰 로고가 내려앉는 자리: 히어로의 큰 로고. 없으면 헤더 로고
    const brand = intro.querySelector<HTMLElement>("[data-intro-target]") ?? header?.querySelector<HTMLElement>("[data-intro-logo]") ?? null;
    const inHero = Boolean(brand && intro.contains(brand));
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

    const film = filmRef.current;
    let filmOn = false;
    const g = initGL(canvas);
    if (!g) canvas.hidden = true; // WebGL이 없으면 비늘 없이 로고·히어로 전환만
    canvas.addEventListener("webglcontextlost", () => (canvas.hidden = true));

    /* ---------- 기하 ---------- */
    let W = 0;
    let H = 0;
    let lw = 0; // 큰 로고 크기
    let lh = 0;
    let trackPx = 1; // 진행도 0→1에 쓰는 스크롤 길이
    let holdPx = 0; // 히어로가 붙어 있는 구간
    let center: Pt = { x: 0, y: 0 };
    let pathUniform = new Float32Array(PATH_SAMPLES * 2); // 셰이더 좌표계(x는 비율 보정, y는 위로)의 경로 점들
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
      const holdVh = 0; // 히어로가 다 나온 뒤 붙어 있는 구간 없음 (예전 PC 1.0 · 모바일 0.9 화면)
      trackPx = Math.max(1, Math.round(H * introVh)); // 숨겨진 탭에서 높이가 0으로 재지면 0으로 나눠 진행도가 NaN으로 굳는다
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
      // 히어로 로고는 히어로가 떠오르는 효과(translate) 중에도 정확히 재도록 화면 안 고정 무대(pin) 기준 위치로 잰다
      const aspect = W / Math.max(1, H);
      pathUniform = new Float32Array(PATH_SAMPLES * 2);
      for (let i = 0; i < PATH_SAMPLES; i++) {
        const pt = pathAt(i / (PATH_SAMPLES - 1));
        pathUniform[i * 2] = (pt.x - 0.5) * aspect;
        pathUniform[i * 2 + 1] = 0.5 - pt.y;
      }
      sizeCanvas();
    }

    /* ---------- 연출 ---------- */
    let logoPos: Pt = center;
    let lastLogo = "";
    function choreography(p: number) {
      // p = 스크롤 진행도(0~1), s = 연출 진행도. 앞부분(비늘이 덮어 오는 장면)을 잘라 비늘이 화면을 다 덮은 상태부터 시작한다
      const s = P0 + p * (1 - P0);
      const sp = START + s * (1 - START); // 셰이더 진행도 (필름을 못 불러왔을 때만 쓴다)
      /* 필름 연출 (2026-11-24 사용자 요청)
         s .40~.48  어둠에서 똬리 튼 뱀 필름이 밝아진다 (꿈틀대는 몸, 빛을 받는 비늘 무늬)
         s .46~.70  가운데 로고가 왼쪽에서 오른쪽으로 빛에 쓸리며 서서히 드러난다 (--rv, 빛줄기 --sh 가 드러나는 가장자리를 탄다)
         s .70~.82  로고가 다 비친 채 뱀이 계속 움직인다
         s .82~.90  필름과 로고가 함께 가라앉고(로고 .82~.89) .86~.97 히어로가 떠오른다 (로고와 히어로 제목이 겹쳐 보이지 않게 로고가 먼저) */
      const rv = easeInOut(clamp((s - 0.46) / 0.24));
      const pos = center;
      logoPos = pos;
      const scale = 1; // 로고는 움직이지도 커지지도 않는다
      const opacity = clamp((s - 0.45) / 0.04) * (1 - clamp((s - 0.82) / 0.07));
      const next = `${scale.toFixed(4)},${opacity.toFixed(3)},${(pos.x - lw / 2).toFixed(1)},${(pos.y - lh / 2).toFixed(1)}`;
      if (next !== lastLogo) {
        lastLogo = next;
        logoEl!.style.transform = `translate(${(pos.x - lw / 2).toFixed(1)}px, ${(pos.y - lh / 2).toFixed(1)}px) scale(${scale.toFixed(4)})`;
        logoEl!.style.opacity = opacity.toFixed(3);
      }
      // 히어로·캔버스
      const c = ease(clamp((s - 0.86) / 0.11));
      const cv = filmOn ? 1 - clamp((s - 0.82) / 0.08) : 1 - clamp((s - 0.68) / 0.035); // 필름은 히어로 직전에 가라앉고, 셰이더는 문 직후 사라진다
      setVar(pin, "--c", c);
      setVar(pin, "--cv", cv);
      setVar(pin, "--fi", clamp((s - 0.4) / 0.08));
      setVar(pin, "--rv", rv);
      setVar(pin, "--sh", rv);
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
      setVar(pin, "--lg", inHero ? clamp((s - 0.94) / 0.03) : 1);
      setFlag(brand, "data-glow", inHero ? s > 0.94 && s < 0.99 : s > 0.87 && s < 0.96);
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
    let rush = false; // 건너뛰기를 누른 동안은 최소 재생 시간을 지키지 않고 바로 넘긴다
    let biteUntil = 0; // 무는 순간에 잠깐 멈춰 있는 시각 (ms)
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
      // 맞춰 주는 0.3~0.8초 동안만 휠·터치 스크롤을 막는다. 평소에도 막는(passive: false) 리스너가 window에 걸려 있으면
      // 브라우저가 스크롤마다 메인 스레드를 기다려야 해서 사이트 전체 스크롤이 끊긴다
      addEventListener("wheel", block, { passive: false });
      addEventListener("touchmove", block, { passive: false });
      const from = scrollY;
      const to = endY();
      const dur = Math.min(800, 300 + Math.abs(to - from) * 0.5);
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        scrollTo({ top: from + (to - from) * ease(k), behavior: "instant" });
        // 빨리 굴려서 연출이 아직 따라오는 중이면, 히어로가 다 나올 때까지만 조금 더 붙잡는다 (길어도 최소 재생 시간 + 0.4초)
        const catchingUp = !rush && cur < 0.985 && now - t0 < (MIN_PLAY + 0.4) * 1000;
        if (k < 1 || catchingUp) requestAnimationFrame(step);
        else {
          snapping = false;
          rush = false;
          removeEventListener("wheel", block);
          removeEventListener("touchmove", block);
        }
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
      gl.uniform2fv(U.path, pathUniform);
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
      const visible = inView();
      let next = cur + (target - cur) * (1 - Math.exp(-dt / 0.12));
      // 최소 재생 시간: 앞으로 넘어갈 때는 진행 속도에 상한을 둬서, 아무리 빨리 굴려도 연출이 휙 지나가지 않는다.
      // 천천히 굴리면 상한에 닿지 않아 그대로다. 건너뛰기·메뉴 이동·인트로가 화면 밖일 때는 바로 따라간다
      if (next > cur && visible && !rush && now > navUntil) {
        next = Math.min(next, cur + dt / MIN_PLAY);
        // (셰이더일 때만) 무는 순간(번쩍)에 잠깐 멈춰 장면이 눈에 남게 한다. 그 지점에 서 있으려는 게 아니라 지나가는 중일 때만
        if (!filmOn && cur < BITE_P && next >= BITE_P && target > BITE_P + 0.02) {
          next = BITE_P;
          biteUntil = now + BITE_HOLD;
        } else if (now < biteUntil) next = cur;
      }
      cur = next;
      if (Math.abs(target - cur) < 0.0005) cur = target;
      vel += (Math.abs(cur - prev) / Math.max(0.001, dt) - vel) * 0.15;
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      const { sp, cv } = choreography(cur);
      // 필름은 보이는 동안만 재생 (화면 밖·비늘이 사라진 뒤·숨은 탭에서는 멈춰 배터리를 아낀다)
      if (filmOn && film) {
        const want = cv > 0 && visible && !document.hidden;
        if (want && film.paused) film.play().catch(() => {});
        else if (!want && !film.paused) film.pause();
      }
      const drawing = cv > 0 && !canvas!.hidden && visible && !document.hidden;
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
      if (raf) return;
      // 본문까지 내려가 인트로가 화면 밖이고 연출도 끝나 있으면 스크롤마다 할 일이 없다 (레이아웃 읽기·프레임 예약 생략)
      if (!snapping && cur >= 1 && cur === target && scrollY > endY() + holdPx + H) return;
      raf = requestAnimationFrame(tick);
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
      skip: () => {
        rush = true;
        landHero();
      },
      replay: () => {
        try {
          sessionStorage.removeItem(SEEN_KEY);
        } catch {}
        snapped = false;
        scrollTo({ top: intro!.offsetTop, behavior: "instant" });
        wake();
      },
    };

    // 실사 필름을 불러오면 셰이더 비늘 대신 쓴다 (못 불러오면 셰이더 그대로)
    const onFilm = () => {
      if (filmOn || !film) return;
      filmOn = true;
      canvas!.hidden = true;
      setFlag(pin, "data-film", true);
      wake();
    };
    if (film) {
      if (film.readyState >= 2) onFilm();
      else film.addEventListener("loadeddata", onFilm, { once: true });
    }

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
    // 인트로(히어로 포함)가 화면 밖이면 히어로 안의 무한 애니메이션(빛무리·떠 있는 상품·회전 배지 등)을 멈춘다
    const offscreen = new IntersectionObserver(([entry]) => setFlag(pin, "data-offscreen", !entry.isIntersecting));
    offscreen.observe(intro);
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
      offscreen.disconnect();
      document.removeEventListener("click", onAnchorClick, true);
      document.removeEventListener("visibilitychange", wake);
      film?.removeEventListener("loadeddata", onFilm);
      film?.pause();
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
        {/* 실사 필름 (힉스필드로 만든 영상): 똬리 튼 뱀이 꿈틀댄다. 휴대폰은 세로 영상. 못 불러오면 아래 셰이더 비늘이 대신 나온다 */}
        <video ref={filmRef} className={styles.film} muted playsInline loop preload="auto" poster={FILM.poster} aria-hidden="true" tabIndex={-1}>
          <source media="(max-width: 720px)" src={FILM.tall} type="video/mp4" />
          <source src={FILM.wide} type="video/mp4" />
        </video>
        <canvas ref={canvasRef} className={styles.scales} aria-hidden="true" />
        <div ref={logoRef} className={styles.bigLogo} style={{ "--logo-mask": `url(${logo})` } as CSSProperties} aria-hidden="true">
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
          <style>{`[data-intro-dim],[data-intro-quick]{--hdr:1;--hdr-vis:visible;--hdr-pe:auto;--nav:1;--qv:visible}.${styles.intro}{height:auto}.${styles.pin}{position:relative;height:auto}.${styles.heroSlot}{visibility:visible;opacity:1;transform:none}.${styles.scales},.${styles.film},.${styles.bigLogo},.${styles.skip},.${styles.hint},.${styles.progress},.${styles.replay}{display:none}`}</style>
        </noscript>
      </div>
    </div>
  );
}
