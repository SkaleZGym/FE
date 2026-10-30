/**
 * 서펜트 비늘 셰이더 (proto 17·18에서 가져옴). 화면 전체 사각형 하나를 그리면서 픽셀마다 겹쳐진 뱀 비늘 밭을 계산한다.
 * u_progress 0~1 장면: .17~.50 오른쪽 아래에서 비늘이 덮어 옴 → .484~.70 검은 화면에서 비늘 띠(서펜트)가 u_path를 따라 가운데로 미끄러져 와 화면으로 번짐
 * (인트로는 .484부터 시작) → .64~.715 로고 둘레로 턱이 벌어졌다 팍 닫힘(BITE) → .75~ 비늘이 사라지고 검은 화면
 * (예전 .48~.82 로고 쪽으로 흘러감·.76~.93 빛 고리는 무는 연출로 바꿔 꺼 두었다)
 * 비용은 픽셀 수에 정비례하므로 캔버스 해상도는 SerpentIntro가 상한을 두고 낮춘다.
 */
export const SERPENT_VS = `attribute vec2 a_position; varying vec2 v_uv; void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }`;

export const SERPENT_FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform vec2 u_resolution; uniform float u_time; uniform float u_progress; uniform float u_scrollVelocity;
uniform vec2 u_mouse; uniform vec2 u_logoPos; uniform vec2 u_path[16]; uniform float u_scaleDensity; uniform float u_rippleStrength; uniform float u_specularStrength;
float hash21(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
vec2 hash22(vec2 p) { float n = hash21(p); return vec2(n, hash21(p + n)); }
float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); float a = hash21(i); float b = hash21(i + vec2(1.0, 0.0)); float c = hash21(i + vec2(0.0, 1.0)); float d = hash21(i + vec2(1.0, 1.0)); return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
vec4 evaluateSerpentScales(vec2 uv, float bodyWave, float phaseShift, out vec2 scaleId) {
  float ang = -0.68; mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)); vec2 p = rot * uv;
  float wavePhase = phaseShift * 9.5 + u_time * 1.35;
  p.y += 0.058 * sin(p.x * 5.5 - wavePhase) * bodyWave; p.x += 0.036 * cos(p.y * 4.2 - wavePhase * 0.8) * bodyWave;
  vec2 gridScale = vec2(u_scaleDensity, u_scaleDensity * 1.45); vec2 gp = p * gridScale;
  float bestHeight = -1.0; vec2 bestLocal = vec2(0.0); vec2 bestId = vec2(0.0); vec2 baseCell = floor(gp);
  for (int dy = -1; dy <= 1; dy++) { for (int dx = -1; dx <= 1; dx++) {
    vec2 cell = baseCell + vec2(float(dx), float(dy)); float rowShift = mod(cell.y, 2.0) * 0.5; vec2 cellCenter = cell + vec2(rowShift, 0.5);
    vec2 jitter = (hash22(cell) - 0.5) * 0.14; vec2 rel = gp - (cellCenter + jitter); rel.x *= 0.88; rel.y *= 0.68;
    float taper = smoothstep(-0.75, 0.65, rel.y); float widthCurve = mix(0.78, 0.32, taper * taper); float radial = length(vec2(rel.x / max(0.18, widthCurve), rel.y));
    if (radial < 1.0) {
      float edgeBevel = smoothstep(1.0, 0.72, radial); float longitudinalSlope = clamp((rel.y + 0.7) * 0.65, 0.0, 1.0);
      float keel = exp(-abs(rel.x) * 9.5) * smoothstep(0.95, 0.15, radial) * 0.34; float microStriae = sin(rel.x * 52.0 + rel.y * 12.0) * 0.018 * edgeBevel;
      float overlapPriority = longitudinalSlope * 0.65 + edgeBevel * 0.45 + keel;
      if (overlapPriority > bestHeight) { bestHeight = overlapPriority + microStriae; bestLocal = rel; bestId = cell; }
    }
  } }
  scaleId = bestId; float keelIntensity = exp(-abs(bestLocal.x) * 10.0) * smoothstep(0.9, 0.1, length(bestLocal));
  return vec4(max(0.0, bestHeight), keelIntensity, bestLocal);
}
void main() {
  vec2 uv = v_uv; float aspect = u_resolution.x / max(1.0, u_resolution.y);
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5); vec2 logoP = vec2((u_logoPos.x - 0.5) * aspect, u_logoPos.y - 0.5); vec2 mouseP = vec2((u_mouse.x - 0.5) * aspect, u_mouse.y - 0.5);
  float prog = clamp(u_progress, 0.0, 1.0);
  float velBoost = clamp(u_scrollVelocity * 10.0, 0.0, 0.9);
  float s1Local = clamp(prog / 0.20, 0.0, 1.0); float s1Active = 1.0 - smoothstep(0.18, 0.28, prog);
  float beamPos = mix(-0.38 + 0.04 * sin(u_time * 1.1), 0.82, s1Local); float beamAxis = p.x * 0.65 + p.y * 0.75;
  float narrowBeam = exp(-pow((beamAxis - beamPos) * mix(9.2, 6.2, s1Local), 2.0)) * (0.42 + 0.78 * smoothstep(0.0, 0.06, prog)) * s1Active;
  float s2Progress = smoothstep(0.17, 0.50, prog); vec2 brCorner = vec2(0.5 * aspect, -0.5); float distFromBR = length(p - brCorner);
  float maxDiag = length(vec2(aspect, 1.0)) + 0.35; float organicEdgeNoise = (noise(p * 5.5 + prog * 4.0 + u_time * 0.35) - 0.5) * 0.18;
  float takeoverFront = s2Progress * maxDiag * 1.18 - distFromBR + organicEdgeNoise; float takeoverMask = smoothstep(-0.18, 0.12, takeoverFront);
  float takeoverWaveCrest = exp(-pow(takeoverFront * 5.2, 2.0)) * smoothstep(0.17, 0.23, prog) * (1.0 - smoothstep(0.47, 0.54, prog));
  float s3Progress = 0.0; /* 로고 쪽으로 모이는 소용돌이는 무는 연출로 바꿔 쓰지 않는다 */ vec2 toLogo = normalize(logoP - p + vec2(0.0001)); float distToLogo = length(p - logoP);
  float migrationFront = (1.0 - s3Progress) * maxDiag * 1.08 - distToLogo + organicEdgeNoise * 0.8; float migrationMask = smoothstep(-0.22, 0.18, migrationFront);
  float migrationLightWave = exp(-pow(migrationFront * 4.5, 2.0)) * smoothstep(0.47, 0.53, prog) * (1.0 - smoothstep(0.79, 0.88, prog));
  float s4Pulse = exp(-pow((prog - 0.86) * 14.5, 2.0)); float logoHalo = exp(-distToLogo * 6.2) * s4Pulse;
  float ringRadius = 0.22 * (1.0 - clamp((prog - 0.78) / 0.17, 0.0, 1.0)); float logoRing = exp(-pow((distToLogo - ringRadius) * 18.0, 2.0)) * s4Pulse;
  float s5Ambient = smoothstep(0.84, 0.97, prog);
  float baseSlither = mix(0.85, u_rippleStrength, s5Ambient);
  float activeSlither = baseSlither + 0.7 * sin(s2Progress * 3.14159) + 0.8 * sin(s3Progress * 3.14159) + velBoost * 0.7;
  vec2 flowOffset = vec2(-1.0, 1.0) * (s3Progress * 0.42) + toLogo * (s3Progress * (1.0 - s5Ambient) * 0.24);
  float bodyRipple = sin(distFromBR * 11.0 - prog * 18.0 - u_time * 2.2) * (0.012 + velBoost * 0.01) * activeSlither;
  // 경로를 따라 스르륵 지나가는 서펜트 (.484~.70): 검은 화면에서 u_path(대표님이 그린 경로, 끝은 화면 가운데)를 따라
  // 비늘 띠 하나가 머리부터 미끄러져 들어온다. 띠 안의 비늘 일부만 반짝이고, 가운데에 닿으면 비늘이 화면으로 번져 원래 비늘 밭이 된다
  float pathD = 1e3; float pathT = 0.0; float acc = 0.0;
  for (int i = 0; i < 15; i++) {
    vec2 a = u_path[i]; vec2 ab = u_path[i + 1] - a; float len = length(ab);
    float hh = clamp(dot(p - a, ab) / max(1e-5, dot(ab, ab)), 0.0, 1.0); float d = length(p - a - ab * hh);
    if (d < pathD) { pathD = d; pathT = acc + hh * len; }
    acc += len;
  }
  pathT /= max(1e-5, acc);
  float travel = smoothstep(0.484, 0.62, prog); float fill = smoothstep(0.60, 0.70, prog);
  float along = travel - pathT; // 머리에서 꼬리 쪽으로 잰 거리 (0 = 머리)
  float bodyLen = 0.5; float bodyFade = (1.0 - smoothstep(0.0, bodyLen, along)) * smoothstep(-0.015, 0.01, along);
  float bandHalf = 0.075 * (0.55 + 0.45 * bodyFade) * (1.0 - 0.6 * smoothstep(0.012, -0.015, along));
  float band = smoothstep(bandHalf, bandHalf - 0.03, pathD);
  float coilMask = max(band * bodyFade, fill);
  // 몸통은 둥근 관처럼 가운데가 밝다. 빛에서 먼 곳도 보이게 몸통 자체에 빛을 조금 주고, 그 안의 비늘은 일부만 반짝인다
  float tube = smoothstep(bandHalf, bandHalf * 0.25, pathD);
  float startDim = mix(0.12, 1.0, smoothstep(0.484, 0.545, prog)); // 처음엔 거의 안 보이다가 들어오면서 밝아진다
  float bodyShade = mix(0.6 + 0.4 * tube, 1.0, fill);
  float bodyLight = (1.0 - fill) * band * bodyFade * (0.35 + 0.65 * tube) * startDim;
  float headGlow = exp(-pathD * 16.0) * exp(-abs(along) * 30.0) * (1.0 - fill) * 0.5 * startDim;
  coilMask *= mix(0.35, 1.0, startDim);
  // 무는 연출 (.64~.75): 화면을 채운 비늘이 로고 둘레에서 위아래 턱으로 벌어졌다가(이빨 모양 가장자리) 한순간 팍 닫힌다.
  // 닫히는 순간 턱이 맞물린 선이 번쩍이고, 그 뒤 비늘은 바로 사라진다 (로고는 그 순간 튀어나가 헤더로 날아간다)
  float open = smoothstep(0.64, 0.69, prog); float snap = pow(smoothstep(0.69, 0.715, prog), 2.0); float openAmt = open * (1.0 - snap);
  float dxJ = p.x - logoP.x; float dyJ = p.y - logoP.y; float profile = clamp(1.0 - pow(dxJ / 0.78, 2.0), 0.0, 1.0);
  float teeth = 0.04 * abs(fract(dxJ * 6.5) - 0.5) * 2.0;
  float jawGap = 0.24 * openAmt * profile; float jawEdge = max(0.0, jawGap - teeth * openAmt * profile);
  float mouth = smoothstep(jawEdge - 0.008, jawEdge + 0.008, abs(dyJ)); // 입 안쪽은 0 (검게)
  float lip = exp(-pow((abs(dyJ) - jawEdge) * 40.0, 2.0)) * openAmt * profile;
  float biteFlash = exp(-pow((prog - 0.715) * 110.0, 2.0)) * exp(-abs(dyJ) * 12.0) * profile;
  float afterBite = 1.0 - smoothstep(0.72, 0.75, prog);
  vec2 displacedP = p - flowOffset + toLogo * bodyRipple; displacedP.y -= sign(dyJ) * jawGap;
  vec2 scaleId; vec4 scaleData = evaluateSerpentScales(displacedP, activeSlither, prog, scaleId);
  float h = scaleData.x; float keel = scaleData.y; vec2 localUV = scaleData.zw;
  vec2 normalXY = vec2(-localUV.x * 1.9 + (keel * sign(localUV.x) * 0.65), -localUV.y * 1.4 + 0.35);
  float microGrain = hash21(displacedP * 420.0) * 0.06; vec3 N = normalize(vec3(normalXY.x + microGrain, normalXY.y + microGrain, 1.0));
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec2 activeLightPos = mouseP;
  if (prog < 0.22) activeLightPos = mix(vec2(beamPos * 0.65), mouseP, 0.25);
  else if (prog < 0.50) activeLightPos = mix(mix(brCorner, vec2(0.0), s2Progress), mouseP, 0.3);
  else if (prog < 0.85) activeLightPos = mix(mix(vec2(0.0), logoP, s3Progress), mouseP, 0.25);
  vec3 L = normalize(vec3(activeLightPos - p, 0.42)); vec3 H = normalize(L + V);
  float NdotL = max(0.0, dot(N, L)); float NdotH = max(0.0, dot(N, H));
  float specBoost = u_specularStrength + velBoost * 0.5;
  float anisoSpec = pow(NdotH, 36.0) * (0.45 + 1.35 * keel) * specBoost; float grazingRim = pow(1.0 - max(0.0, dot(N, V)), 3.2) * 0.35;
  float sparkle = pow(hash21(scaleId), 8.0) * pow(NdotH, 16.0) * (0.5 + velBoost * 0.4);
  vec3 obsidianBase = vec3(0.016, 0.017, 0.021); vec3 gunmetalTone = vec3(0.11, 0.12, 0.145); vec3 silverHighlight = vec3(0.68, 0.72, 0.78);
  float glint = smoothstep(0.55, 0.75, hash21(scaleId + 3.1)) * bodyLight; // 띠 안에서 일부 비늘만 반짝
  vec3 scaleColor = mix(obsidianBase, gunmetalTone, h * 0.55 + NdotL * 0.35 + bodyLight * 0.7); scaleColor += silverHighlight * (anisoSpec * 0.55 + sparkle + grazingRim * 0.25 + glint * 0.35 * h);
  float creviceAO = smoothstep(0.02, 0.28, h); scaleColor *= mix(0.18, 1.0, creviceAO) * bodyShade;
  float scaleVisibility = narrowBeam * 1.35;
  float s2And3Mask = takeoverMask * mix(1.0, migrationMask, smoothstep(0.47, 0.53, prog)); scaleVisibility = max(scaleVisibility, s2And3Mask) * coilMask * mouth * afterBite;
  float mouseProximity = exp(-length(p - mouseP) * 2.2); float ambientVisibility = s5Ambient * (0.22 + 0.5 * mouseProximity);
  scaleVisibility = mix(scaleVisibility, ambientVisibility, s5Ambient);
  float dramaticCrest = (narrowBeam * 0.8 + takeoverWaveCrest * 0.6 + migrationLightWave * 0.75) * coilMask * mouth + headGlow * 0.9 + lip * 0.5 * mouth;
  vec3 crestHighlight = silverHighlight * dramaticCrest * (0.35 + 0.95 * h + anisoSpec * 0.6) * afterBite;
  vec3 deepVoidBg = vec3(0.012, 0.013, 0.016) + noise(p * 3.5 + u_time * 0.05) * 0.018 * startDim * afterBite;
  vec3 finalColor = mix(deepVoidBg, scaleColor, clamp(scaleVisibility, 0.0, 1.0)); finalColor += crestHighlight * creviceAO;
  finalColor += silverHighlight * biteFlash * 1.4;
  finalColor *= mix(0.55, 1.0, smoothstep(1.35, 0.25, length(uv - 0.5)));
  gl_FragColor = vec4(finalColor, 1.0);
}`;
