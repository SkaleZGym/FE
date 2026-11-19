/**
 * 비늘 쓸기 전환 (SKALEZ = scales): 바뀐 화면이 위에서 아래로 비늘이 한 줄씩 돋아나며 드러난다.
 * 나이트·라이트 바꾸기(화면 전체)와 로그인 ↔ 회원가입 바꾸기(카드만)가 같이 쓴다.
 * 화면 전환(View Transition)으로 새 화면을 이전 화면 위에 올리고, 비늘 모양 clip-path 키프레임을 넣는다.
 * 준비(기본 섞임 끄기, 비늘 시작 전 가리기)는 globals.css 의 [data-scale-wipe].
 * 화면 전환을 모르는 브라우저와 '움직임 줄이기' 설정에서는 효과 없이 바로 바꾼다
 */

/** 카드처럼 일부만 쓸 때 그 요소에 잠깐 붙이는 전환 이름 (globals.css 와 같아야 한다) */
const PART = "scale-wipe";

export function scaleTransition(apply: () => void, target?: HTMLElement | null) {
  if (typeof document.startViewTransition !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    apply();
    return;
  }
  const root = document.documentElement;
  const box = target?.getBoundingClientRect();
  const { frames, duration } = scaleWipe(box?.width ?? window.innerWidth, box?.height ?? window.innerHeight);
  root.dataset.scaleWipe = target ? "part" : "root";
  if (target) target.style.viewTransitionName = PART;
  const done = () => {
    delete root.dataset.scaleWipe;
    if (target) target.style.viewTransitionName = "";
  };
  const transition = document.startViewTransition(apply);
  transition.ready.then(
    () => {
      root.animate({ clipPath: frames }, { duration, easing: "linear", fill: "both", pseudoElement: `::view-transition-new(${target ? PART : "root"})` });
    },
    () => {},
  );
  transition.finished.then(done, done);
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * 비늘 쓸기의 clip-path 키프레임. 영역을 기왓장처럼 겹친 비늘 격자로 덮고(짝수·홀수 줄이 반 칸씩 어긋난다),
 * 윗줄부터 차례로 비늘이 윗줄 밑에서 돋아나 다 자라면 영역이 새 화면으로 덮인다. 물결처럼 줄마다 살짝 굽이친다.
 * 키프레임마다 비늘 수·순서가 같아야 브라우저가 사이를 부드럽게 이어 준다 (path 보간).
 * 화면 전환 없이도 쓸 수 있다 (히어로 상품 넘김: 새 사진에 바로 clip-path 애니메이션).
 * 비늘 크기는 영역 폭에 맞춰서(가로 약 12개) 큰 화면에서도 개수가 늘지 않는다.
 * clip-path 는 화면 카드(GPU)가 아니라 매 프레임 다시 그려서, 비늘 수가 곧 무게다 → 한 화면 300개 안팎으로 (예전 16개 폭은 약 450개)
 */
export function scaleWipe(width: number, height: number) {
  const w = Math.max(56, width / 12); // 비늘 너비
  const rowH = w * 0.42; // 줄 간격
  const radius = w * 0.53; // 옆 비늘과 살짝 겹쳐 빈틈이 없게
  const cols = Math.ceil(width / w) + 1;
  const rows = Math.ceil(height / rowH) + 1;
  const GROW = 8; // 비늘 하나가 다 자라는 동안 지나가는 줄 수
  const WAVE = 2.2; // 굽이치는 깊이 (줄 수)
  const steps = Math.ceil(rows + GROW + WAVE * 2);
  const frames: string[] = [];
  for (let step = 0; step <= steps; step++) {
    let d = "";
    for (let row = 0; row < rows; row++) {
      const top = round((row - 1) * rowH);
      const shift = row % 2 ? w / 2 : 0;
      for (let col = 0; col < cols; col++) {
        const start = row + WAVE * (1 + Math.sin((col / cols) * Math.PI * 2 + row * 0.12));
        const u = Math.min(1, Math.max(0, (step - start) / GROW));
        const size = u * u * (3 - 2 * u); // 천천히 돋기 시작해 가운데서 빨라지고 끝에서 느려진다 (자라는 비늘이 여러 줄 보이게)
        const half = round(radius * size);
        // 윗변 → 오른쪽 변 → 둥근 아랫변 → 닫기
        d += `M${round(col * w + shift - radius * size)} ${top}h${half * 2}v${round(rowH * size)}a${half} ${half} 0 0 1 ${-half * 2} 0z`;
      }
    }
    frames.push(`path("${d}")`);
  }
  return { frames, duration: Math.min(1300, Math.max(900, steps * 26)) };
}
