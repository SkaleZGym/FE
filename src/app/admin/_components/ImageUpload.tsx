"use client";

import { useRef, useState, type DragEvent } from "react";
import { errorMessage, toast, uploadImage } from "../_lib/admin";

/** 사진 올리기: 눌러서 고르거나 끌어다 놓기. 올리면 저장된 주소를 onChange 로 넘긴다 */
export default function ImageUpload({ value, onChange, hint }: { value: string; onChange: (url: string) => void; hint?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const send = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setOver(false);
    void send(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="upload" data-over={over || undefined} onDragOver={(event) => (event.preventDefault(), setOver(true))} onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => send(event.target.files?.[0])} />
      {value ? (
        <div className="upload-done">
          {/* eslint-disable-next-line @next/next/no-img-element -- 방금 올린 사진 미리보기 */}
          <img src={value} alt="" />
          <div>
            <button className="btn sm" type="button" onClick={() => input.current?.click()} disabled={busy}>
              {busy ? "올리는 중…" : "사진 바꾸기"}
            </button>
            <button className="btn sm danger" type="button" onClick={() => onChange("")} disabled={busy}>
              지우기
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="upload-empty" onClick={() => input.current?.click()} disabled={busy}>
          <b>{busy ? "올리는 중…" : "사진 올리기"}</b>
          <span>눌러서 고르거나 여기로 끌어다 놓으세요 · JPG·PNG·WEBP·GIF, 10MB 이하</span>
        </button>
      )}
      {hint && <small className="hint">{hint}</small>}
    </div>
  );
}
