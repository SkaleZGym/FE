/**
 * 서펜트 비늘 셰이더 (proto 17·18에서 가져옴). 화면 전체 사각형 하나를 그리면서 픽셀마다 겹쳐진 뱀 비늘 밭을 계산한다.
 * u_progress 0~1 장면: .17~.50 오른쪽 아래에서 비늘이 덮어 옴 → .48~.82 u_logoPos 쪽으로 흘러감 → .76~.93 로고 둘레 빛 고리 → .84~ 잔잔한 배경
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
uniform vec2 u_mouse; uniform vec2 u_logoPos; uniform float u_scaleDensity; uniform float u_rippleStrength; uniform float u_specularStrength;
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
  float s3Progress = smoothstep(0.48, 0.82, prog); vec2 toLogo = normalize(logoP - p + vec2(0.0001)); float distToLogo = length(p - logoP);
  float migrationFront = (1.0 - s3Progress) * maxDiag * 1.08 - distToLogo + organicEdgeNoise * 0.8; float migrationMask = smoothstep(-0.22, 0.18, migrationFront);
  float migrationLightWave = exp(-pow(migrationFront * 4.5, 2.0)) * smoothstep(0.47, 0.53, prog) * (1.0 - smoothstep(0.79, 0.88, prog));
  float s4Pulse = exp(-pow((prog - 0.86) * 14.5, 2.0)); float logoHalo = exp(-distToLogo * 6.2) * s4Pulse;
  float ringRadius = 0.22 * (1.0 - clamp((prog - 0.78) / 0.17, 0.0, 1.0)); float logoRing = exp(-pow((distToLogo - ringRadius) * 18.0, 2.0)) * s4Pulse;
  float s5Ambient = smoothstep(0.84, 0.97, prog);
  float baseSlither = mix(0.85, u_rippleStrength, s5Ambient);
  float activeSlither = baseSlither + 0.7 * sin(s2Progress * 3.14159) + 0.8 * sin(s3Progress * 3.14159) + velBoost * 0.7;
  vec2 flowOffset = vec2(-1.0, 1.0) * (s3Progress * 0.42) + toLogo * (s3Progress * (1.0 - s5Ambient) * 0.24);
  float bodyRipple = sin(distFromBR * 11.0 - prog * 18.0 - u_time * 2.2) * (0.012 + velBoost * 0.01) * activeSlither;
  vec2 displacedP = p - flowOffset + toLogo * bodyRipple;
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
  vec3 scaleColor = mix(obsidianBase, gunmetalTone, h * 0.55 + NdotL * 0.35); scaleColor += silverHighlight * (anisoSpec * 0.55 + sparkle + grazingRim * 0.25);
  float creviceAO = smoothstep(0.02, 0.28, h); scaleColor *= mix(0.18, 1.0, creviceAO);
  float scaleVisibility = narrowBeam * 1.35;
  float s2And3Mask = takeoverMask * mix(1.0, migrationMask, smoothstep(0.47, 0.53, prog)); scaleVisibility = max(scaleVisibility, s2And3Mask);
  float mouseProximity = exp(-length(p - mouseP) * 2.2); float ambientVisibility = s5Ambient * (0.22 + 0.5 * mouseProximity);
  scaleVisibility = mix(scaleVisibility, ambientVisibility, s5Ambient);
  float dramaticCrest = narrowBeam * 0.8 + takeoverWaveCrest * 0.6 + migrationLightWave * 0.75 + (logoHalo * 1.2 + logoRing * 1.3) * (0.5 + 0.5 * sparkle);
  vec3 crestHighlight = silverHighlight * dramaticCrest * (0.35 + 0.95 * h + anisoSpec * 0.6);
  vec3 deepVoidBg = vec3(0.012, 0.013, 0.016) + noise(p * 3.5 + u_time * 0.05) * 0.018;
  vec3 finalColor = mix(deepVoidBg, scaleColor, clamp(scaleVisibility, 0.0, 1.0)); finalColor += crestHighlight * creviceAO;
  finalColor *= mix(0.55, 1.0, smoothstep(1.35, 0.25, length(uv - 0.5)));
  gl_FragColor = vec4(finalColor, 1.0);
}`;
