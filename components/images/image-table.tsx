"use client";

import type { ImageRecord } from "@/lib/types/image";
import { formatBytes, formatDateTimeISO } from "@/lib/format";

interface ImageTableProps {
  items: ImageRecord[];
  isLoading: boolean;
  onCopy: (record: ImageRecord) => void;
  copyTargetId: string | null;
  error?: string | null;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

export function ImageTable({
  items,
  isLoading,
  onCopy,
  copyTargetId,
  error,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: ImageTableProps) {
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

  const visibleIds = items.map((item) => item.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="w-12 px-4 py-3 text-left">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                checked={allSelected}
                onChange={onToggleSelectAll}
                aria-label="表示中の画像をすべて選択"
              />
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
              ファイル名
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
              サイズ
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
              アップロード日時
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/80">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => onToggleSelect(item.id)}
                  aria-label={`${item.originalFilename} を選択`}
                />
              </td>
              <td className="max-w-[320px] truncate px-4 py-3 font-medium text-slate-800">
                {item.originalFilename}
              </td>
              <td className="px-4 py-3 text-slate-500">{formatBytes(item.fileSize)}</td>
              <td className="px-4 py-3 text-slate-500">{formatDateTimeISO(item.uploadedAt)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
