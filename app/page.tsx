"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { UploadPanel } from "@/components/upload/upload-panel";
import { ImageTable } from "@/components/images/image-table";
import { ImageGallery } from "@/components/images/image-gallery";
import { useImageQuery } from "@/hooks/use-image-query";
import { buildApiUrl } from "@/lib/api-config";
import type { ImageSortKey, ImageSortOrder } from "@/lib/types/image";
import { formatBytes, formatDateTimeISO } from "@/lib/format";

const PAGE_SIZE = 20;

const SORT_OPTIONS: Array<{ key: ImageSortKey; label: string }> = [
  { key: "uploadedAt", label: "アップロード日時" },
  { key: "originalFilename", label: "ファイル名" },
  { key: "fileSize", label: "ファイルサイズ" },
];

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchInput, setSearchInput] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [sortKey, setSortKey] = useState<ImageSortKey>("uploadedAt");
  const [sortOrder, setSortOrder] = useState<ImageSortOrder>("desc");
  const [page, setPage] = useState(1);
  const [copyTargetId, setCopyTargetId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const { data, isLoading, error, refresh } = useImageQuery({
    search: querySearch,
    sortKey,
    sortOrder,
    page,
    pageSize: PAGE_SIZE,
  });

  const stats = data?.stats;
  const statCards = useMemo(
    () => [
      {
        label: "登録画像数",
        value:
          typeof stats?.totalCount === "number"
            ? stats.totalCount.toLocaleString()
            : "0",
        description: "D1 に登録済みのレコード件数",
      },
      {
        label: "最新アップロード",
        value: stats?.latestUploadedAt
          ? formatDateTimeISO(stats.latestUploadedAt)
          : "—",
        description: "直近でアップロードされた日時",
      },
      {
        label: "ストレージ使用量（概算）",
        value: stats ? formatBytes(stats.totalBytes) : "—",
        description: "D1 に記録されているサイズ合計",
      },
    ],
    [stats],
  );

  useEffect(() => {
    if (!copyTargetId) return;
    const timer = setTimeout(() => {
      setCopyTargetId(null);
      setCopyFeedback(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [copyTargetId]);

  useEffect(() => {
    const visibleIds = data?.items.map((item) => item.id) ?? [];
    setSelectedIds((previous) =>
      previous.filter((id) => visibleIds.includes(id)),
    );
  }, [data?.items]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setQuerySearch(searchInput.trim());
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as ImageSortKey;
    setSortKey(value);
    setPage(1);
    setSelectedIds([]);
  };

  const handleSortOrderToggle = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
    setSelectedIds([]);
  };

  const handleUploadComplete = (didUpload: boolean) => {
    if (didUpload) {
      setPage(1);
      refresh();
      setSelectedIds([]);
      setActionMessage("画像をアップロードしました。最新の一覧を取得しています。");
      setActionError(null);
      setTimeout(() => setActionMessage(null), 2000);
    }
  };

  const handleCopyUrl = async (record: { publicUrl: string; id: string }) => {
    try {
      await navigator.clipboard.writeText(record.publicUrl);
      setCopyTargetId(record.id);
      setCopyFeedback("URL をコピーしました。");
    } catch (err) {
      console.error("Failed to copy", err);
      setCopyFeedback("コピーに失敗しました。手動で選択してください。");
      setCopyTargetId(null);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  };

  const handleToggleSelectAll = () => {
    const visibleIds = data?.items.map((item) => item.id) ?? [];
    if (visibleIds.length === 0) return;
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : visibleIds);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0 || isDeleting) return;
    setIsDeleting(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const response = await fetch(buildApiUrl("/images"), {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ?? "選択した画像の削除に失敗しました。",
        );
      }
      const deletedCount = Array.isArray(payload.deleted)
        ? payload.deleted.length
        : 0;
      const failureCount = Array.isArray(payload.failures)
        ? payload.failures.length
        : 0;

      setActionMessage(
        failureCount > 0
          ? `削除: ${deletedCount} 件、失敗: ${failureCount} 件`
          : `${deletedCount} 件の画像を削除しました。`,
      );
      setSelectedIds([]);
      refresh();
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "削除処理中に不明なエラーが発生しました。",
      );
    } finally {
      setIsDeleting(false);
      setTimeout(() => {
        setActionMessage(null);
        setActionError(null);
      }, 4000);
    }
  };

  const handleZipDownload = async () => {
    if (selectedIds.length === 0 || isZipping) return;
    setIsZipping(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const response = await fetch(buildApiUrl("/images/archive"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        let message = "ZIP の生成に失敗しました。";
        try {
          const payload = await response.clone().json();
          if (payload && typeof payload === "object" && "error" in payload) {
            message = (payload as { error: string }).error;
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `imgdose-archive-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      setActionMessage("ZIP ファイルをダウンロードしました。");
      setTimeout(() => setActionMessage(null), 4000);
    } catch (zipError) {
      setActionError(
        zipError instanceof Error
          ? zipError.message
          : "ZIP 生成中に不明なエラーが発生しました。",
      );
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setIsZipping(false);
    }
  };

  const pagination = data?.pagination;

  const handlePrevPage = () => {
    if (pagination?.hasPrev) {
      setPage((prev) => Math.max(1, prev - 1));
    }
  };

  const handleNextPage = () => {
    if (pagination?.hasNext) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            画像ダッシュボード
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">
            Cloudflare Workers / R2 / D1 をバックエンドに、ブログや資料向けの画像を
            安定して管理・配信するための管理コンソールです。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{card.description}</p>
          </div>
        ))}
      </section>

      <UploadPanel onComplete={handleUploadComplete} />

      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <form
            className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={handleSearchSubmit}
          >
            <label className="flex w-full flex-col gap-1 text-xs font-medium text-slate-500 sm:max-w-sm">
              検索ワード
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="ファイル名で検索"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                検索
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setQuerySearch("");
                  setPage(1);
                  setSelectedIds([]);
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                クリア
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-slate-500">
              ソート
              <select
                value={sortKey}
                onChange={handleSortChange}
                className="ml-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleSortOrderToggle}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              {sortOrder === "desc" ? "降順" : "昇順"}
            </button>
          </div>
        </div>

        {copyFeedback && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {copyFeedback}
          </div>
        )}

        {actionMessage && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {actionMessage}
          </div>
        )}

        {actionError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {actionError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>選択中: {selectedIds.length.toLocaleString()} 件</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZipDownload}
              disabled={selectedIds.length === 0 || isZipping}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isZipping ? "圧縮中…" : "選択した画像を ZIP"}
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || isDeleting}
              className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? "削除中…" : "選択した画像を削除"}
            </button>
          </div>
        </div>

        {viewMode === "table" ? (
          <ImageTable
            items={data?.items ?? []}
            isLoading={isLoading}
            error={error}
            onCopy={handleCopyUrl}
            copyTargetId={copyTargetId}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
          />
        ) : (
          <ImageGallery
            items={data?.items ?? []}
            isLoading={isLoading}
            error={error}
            onCopy={handleCopyUrl}
            copyTargetId={copyTargetId}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        )}

        {pagination && (pagination.hasPrev || pagination.hasNext) && (
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={!pagination.hasPrev}
              className="rounded-full border border-slate-200 px-3 py-1.5 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              前のページ
            </button>
            <span>
              {pagination.page} /{" "}
              {Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={!pagination.hasNext}
              className="rounded-full border border-slate-200 px-3 py-1.5 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              次のページ
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
