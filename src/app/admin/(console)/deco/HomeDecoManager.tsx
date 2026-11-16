"use client";

import { useCallback, useEffect, useState } from "react";
import HeroSticker from "@/components/home/HeroSticker";
import HeroTape from "@/components/home/HeroTape";
import { clipUnits, DECO_LIMITS, defaultHomeDeco, HOME_DECO_KEY, isHexColor, parseHomeDeco, textUnits, type HomeDeco, type TapeDeco } from "@/lib/homeDeco";
import { Top } from "../../_components/ui";
import { adminApi, errorMessage, toast, type SiteText } from "../../_lib/admin";
import styles from "./deco.module.css";

/** 자주 쓰는 색. 콜라보 선수 색은 옆의 색 고르기 칸에서 아무 색이나 고른다 */
const PRESETS: [string, string][] = [
  ["빨강 (기본)", "#e0261b"],
  ["흰색", "#ededed"],
  ["주황", "#f26a1b"],
  ["노랑", "#f2c81d"],
  ["초록", "#1fa35a"],
  ["파랑", "#1f6fe0"],
  ["보라", "#7a3fe0"],
];

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <label className={styles.switchRow}>
      <span>{on ? "켜짐" : "꺼짐"}</span>
      <span className="switch">
        <input type="checkbox" checked={on} onChange={(event) => onChange(event.target.checked)} aria-label={`${label} 켜기`} />
        <i />
      </span>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  // 직접 적는 칸은 다 적기 전까지 틀린 값이라, 적는 동안만 따로 들고 있다가 맞는 색 코드가 됐을 때 반영한다
  const [typing, setTyping] = useState<string | null>(null);

  return (
    <div className="field">
      <span>{label}</span>
      <div className={styles.colors}>
        {PRESETS.map(([name, color]) => (
          <button key={color} type="button" className={styles.swatch} style={{ background: color }} aria-label={name} title={name} aria-pressed={value.toLowerCase() === color} onClick={() => onChange(color)} />
        ))}
        <label className={styles.picker} title="다른 색 고르기">
          <input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`${label} 직접 고르기`} />
          <span>다른 색</span>
        </label>
        <input
          className={`input mono ${styles.hex}`}
          value={typing ?? value}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label} 코드`}
          onChange={(event) => {
            const next = event.target.value.trim();
            setTyping(next);
            if (isHexColor(next)) onChange(next.toLowerCase());
          }}
          onBlur={() => setTyping(null)}
        />
      </div>
    </div>
  );
}

/** 글자 칸: 칸 수(영어 1, 한글 2) 상한을 넘으면 더 적히지 않는다 */
function UnitInput({ label, value, max, placeholder, onChange }: { label: string; value: string; max: number; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" value={value} placeholder={placeholder} onChange={(event) => onChange(clipUnits(event.target.value, max))} />
      <small>
        {textUnits(value)} / {max}칸
      </small>
    </label>
  );
}

function TapeCard({ title, hint, deco, onChange }: { title: string; hint: string; deco: TapeDeco; onChange: (deco: TapeDeco) => void }) {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <b>{title}</b>
          <div className="muted" style={{ fontSize: 12 }}>
            {hint}
          </div>
        </div>
        <Switch on={deco.on} onChange={(on) => onChange({ ...deco, on })} label={title} />
      </div>
      {deco.on && (
        <div className="card-b form-stack">
          <label className="field">
            <span>문구</span>
            <textarea className="textarea" style={{ minHeight: 64 }} value={deco.text} maxLength={DECO_LIMITS.tape} onChange={(event) => onChange({ ...deco, text: event.target.value.replace(/\n/g, " ") })} />
            <small>
              {deco.text.length} / {DECO_LIMITS.tape}자. 이 문구가 계속 이어 붙어서 흘러가요. 끝에 / 나 · 를 넣으면 이음매가 자연스러워요.
            </small>
          </label>
          <ColorField label="띠 색" value={deco.color} onChange={(color) => onChange({ ...deco, color })} />
        </div>
      )}
    </div>
  );
}

/** 메인 꾸미기: 히어로 스티커와 히어로 아래 띠 두 줄을 켜고 끄고, 문구와 색을 바꾼다 */
export default function HomeDecoManager() {
  const [saved, setSaved] = useState<HomeDeco | null>(null);
  const [form, setForm] = useState<HomeDeco>(defaultHomeDeco);
  const [hasSaved, setHasSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi<SiteText[]>("/site-texts")
      .then((list) => {
        const text = list.find((item) => item.key === HOME_DECO_KEY);
        const deco = parseHomeDeco(text?.values.ko, defaultHomeDeco());
        setSaved(deco);
        setForm(deco);
        setHasSaved(Boolean(text));
        setError("");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, []);
  useEffect(load, [load]);

  const dirty = saved !== null && JSON.stringify(saved) !== JSON.stringify(form);
  const sticker = form.sticker;
  const setSticker = (next: Partial<HomeDeco["sticker"]>) => setForm({ ...form, sticker: { ...sticker, ...next } });
  const setAt = (list: string[], index: number, value: string) => list.map((item, at) => (at === index ? value : item));

  const save = async () => {
    const clean: HomeDeco = {
      sticker: { ...sticker, badge: sticker.badge.map((line) => line.trim()), lines: sticker.lines.map((line) => line.trim()) },
      front: { ...form.front, text: form.front.text.replace(/\s+/g, " ").trim() },
      back: { ...form.back, text: form.back.text.replace(/\s+/g, " ").trim() },
    };
    if (clean.sticker.on && ![...clean.sticker.badge, ...clean.sticker.lines].some(Boolean)) return toast("스티커를 켜려면 글자를 한 칸 이상 적어 주세요.", true);
    if (clean.front.on && !clean.front.text) return toast("앞 띠 문구를 적어 주세요. 안 쓰려면 꺼 주세요.", true);
    if (clean.back.on && !clean.back.text) return toast("뒤 띠 문구를 적어 주세요. 안 쓰려면 꺼 주세요.", true);

    setBusy(true);
    try {
      await adminApi(`/site-texts/${HOME_DECO_KEY}`, {
        method: "PUT",
        body: { description: "메인 꾸미기 설정 (메인 꾸미기 화면에서 고쳐요)", values: { ko: JSON.stringify(clean) } },
      });
      setSaved(clean);
      setForm(clean);
      setHasSaved(true);
      toast("저장했어요. 쇼핑몰에는 몇 분 안에 반영돼요.");
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("스티커와 띠를 처음 문구·색으로 되돌릴까요?")) return;
    setBusy(true);
    try {
      if (hasSaved) await adminApi(`/site-texts/${HOME_DECO_KEY}`, { method: "DELETE" });
      const deco = defaultHomeDeco();
      setSaved(deco);
      setForm(deco);
      setHasSaved(false);
      toast("처음 값으로 되돌렸어요.");
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Top
        crumb="CONTENT / HOME"
        title="메인 꾸미기"
        actions={
          <>
            <button className="btn" type="button" onClick={reset} disabled={busy || saved === null}>
              처음 값으로
            </button>
            <button className="btn primary" type="button" onClick={save} disabled={busy || !dirty}>
              {busy ? "저장 중…" : dirty ? "저장" : "저장됨"}
            </button>
          </>
        }
      />
      {error && <p className="alert">{error}</p>}
      {saved === null ? (
        !error && <div className="loading">불러오는 중…</div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.forms}>
            <div className="card">
              <div className="card-h">
                <div>
                  <b>히어로 스티커</b>
                  <div className="muted" style={{ fontSize: 12 }}>
                    메인 첫 화면 상품 사진 오른쪽 아래. PC 화면에만 보여요 (휴대폰은 자리가 좁아서 숨겨요).
                  </div>
                </div>
                <Switch on={sticker.on} onChange={(on) => setSticker({ on })} label="히어로 스티커" />
              </div>
              {sticker.on && (
                <div className="card-b form-stack">
                  <div className="grid3">
                    {["둥근 배지 1줄", "둥근 배지 2줄", "둥근 배지 3줄"].map((label, index) => (
                      <UnitInput key={label} label={label} value={sticker.badge[index]} max={DECO_LIMITS.badge} onChange={(value) => setSticker({ badge: setAt(sticker.badge, index, value) })} />
                    ))}
                  </div>
                  <div className="grid2">
                    <UnitInput label="문구 윗줄 (검은 상자)" value={sticker.lines[0]} max={DECO_LIMITS.line} onChange={(value) => setSticker({ lines: setAt(sticker.lines, 0, value) })} />
                    <UnitInput label="문구 아랫줄 (흰 상자)" value={sticker.lines[1]} max={DECO_LIMITS.line} onChange={(value) => setSticker({ lines: setAt(sticker.lines, 1, value) })} />
                  </div>
                  <p className="muted" style={{ fontSize: 12 }}>
                    영어·숫자·기호는 1칸, 한글은 2칸으로 세요. 비워 둔 줄은 빼고 보여요 (배지 세 줄을 다 비우면 배지 없이 문구만).
                  </p>
                  <ColorField label="배지 색" value={sticker.color} onChange={(color) => setSticker({ color })} />
                </div>
              )}
            </div>

            <TapeCard title="띠 (앞, 굵은 글자)" hint="히어로 바로 아래 비스듬한 띠 중 앞쪽." deco={form.front} onChange={(front) => setForm({ ...form, front })} />
            <TapeCard title="띠 (뒤, 작은 글자)" hint="앞 띠 뒤로 엇갈려 지나가는 띠. 배송·교환 같은 안내에 좋아요." deco={form.back} onChange={(back) => setForm({ ...form, back })} />
          </div>

          <div className={`card ${styles.previewCard}`}>
            <div className="card-h">
              <b>미리보기</b>
              <span className="muted" style={{ fontSize: 12 }}>
                저장 전 모습이에요
              </span>
            </div>
            <div className={styles.preview}>
              <div className={styles.stage}>
                {sticker.on ? <HeroSticker deco={sticker} /> : <span className={styles.off}>스티커 꺼짐</span>}
              </div>
              {form.front.on || form.back.on ? <HeroTape front={form.front} back={form.back} /> : <div className={styles.off}>띠 꺼짐</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
