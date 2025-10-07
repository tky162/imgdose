"use client";

import type { ImageRecord } from "@/lib/types/image";
import { formatBytes, formatDateTimeISO } from "@/lib/format";

interface ImageGalleryProps {
  items: ImageRecord[];
  isLoading: boolean;
  onCopy: (record: ImageRecord) => void;
  copyTargetId: string | null;
  error?: string | null;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

export function ImageGallery({
  items,
  isLoading,
  onCopy,
  copyTargetId,
  error,
  selectedIds,
  onToggleSelect,
}: ImageGalleryProps) {
  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-12 text-sm text-slate-500">
        読み込み中です…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-white py-12 text-sm text-slate-500">
        <span>まだ登録されている画像がありません。</span>
        <span>まずは上部の「画像アップロード」から追加してください。</span>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
        >
          <div className="relative h-48 w-full bg-slate-100">
            <label className="absolute left-3 top-3 z-10 flex items-center justify-center rounded-full bg-white/90 p-1 shadow">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                checked={selectedIds.includes(item.id)}
                onChange={() => onToggleSelect(item.id)}
                aria-label={`${item.originalFilename} を選択`}
              />
            </label>
            <img
              src={item.publicUrl}
              alt={item.originalFilename}
              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4 text-sm">
            <p className="truncate font-semibold text-slate-800">{item.originalFilename}</p>
            <div className="space-y-1 text-xs text-slate-500">
              <div>サイズ: {formatBytes(item.fileSize)}</div>
              <div>アップロード: {formatDateTimeISO(item.uploadedAt)}</div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onCopy(item)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                {copyTargetId === item.id ? "コピー済み" : "URL コピー"}
              </button>
              <a
                href={item.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                ダウンロード
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
