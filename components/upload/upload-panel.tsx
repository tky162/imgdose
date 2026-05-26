"use client";

import { buildApiUrl, getApiBaseUrl } from "@/lib/api-config";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

type UploadOutcome =
  | {
      success: true;
      filename: string;
      image: {
        id: string;
        publicUrl: string;
        uploadedAt: string;
      };
    }
  | {
      success: false;
      filename: string;
      error: string;
    };

const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,.gif,.svg";

function UrlCopyPanel({ results }: { results: UploadOutcome[] }) {
  const [copied, setCopied] = useState(false);
  const urls = results
    .filter((r): r is Extract<UploadOutcome, { success: true }> => r.success)
    .map((r) => r.image.publicUrl);
  const text = urls.join("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">
          URL一覧 ({urls.length}件)
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded px-3 py-1 text-xs font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors"
        >
          {copied ? "コピー済み ✓" : "全URLをコピー"}
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        rows={Math.min(urls.length, 5)}
        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 font-mono resize-none focus:outline-none"
        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
      />
    </div>
  );
}

interface UploadPanelProps {
  onComplete?: (didUpload: boolean) => void;
}

export function UploadPanel({ onComplete }: UploadPanelProps) {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<UploadOutcome[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    setErrorMessage(null);
    setResults([]);
  };

  // クリップボードからペーストで即アップロード
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));
      if (imageItems.length === 0) return;

      e.preventDefault();
      const files = imageItems
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);

      if (!apiBaseUrl) return;
      setIsSubmitting(true);
      setErrorMessage(null);

      const formData = new FormData();
      files.forEach((file, i) => {
        const ext = file.type.split("/")[1] || "png";
        formData.append("files", file, `clipboard-${Date.now()}-${i}.${ext}`);
      });

      try {
        const response = await fetch(buildApiUrl("/images", apiBaseUrl), {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();
        const newResults = Array.isArray(payload?.results) ? (payload.results as UploadOutcome[]) : [];
        setResults(newResults);
        const successCount = newResults.filter((r) => r.success).length;
        onComplete?.(successCount > 0);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "ペーストアップロードに失敗しました。");
      } finally {
        setIsSubmitting(false);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [apiBaseUrl, onComplete]);

  const handleFormReset = () => {
    setSelectedFiles([]);
    setResults([]);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!apiBaseUrl) {
      setErrorMessage(
        "API の接続先が未設定です。NEXT_PUBLIC_IMGDOSE_API_BASE_URL を指定するか、wrangler dev を起動してください。",
      );
      return;
    }

    if (selectedFiles.length === 0) {
      setErrorMessage("アップロードする画像を選択してください。");
      return;
    }

    const invalid = selectedFiles.filter(
      (file) => !ACCEPTED_FILE_TYPES.includes(file.type),
    );
    if (invalid.length > 0) {
      setErrorMessage(
        `未対応の形式が含まれています (${invalid
          .map((file) => file.name)
          .join(", ")})`,
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch(buildApiUrl("/images", apiBaseUrl), {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        setErrorMessage(payload?.error ?? "アップロードに失敗しました。");
        setResults([]);
        onComplete?.(false);
        return;
      }

      const newResults = Array.isArray(payload?.results)
        ? (payload.results as UploadOutcome[])
        : [];

      setResults(newResults);

      const successCount = newResults.filter((result) => result.success).length;
      onComplete?.(successCount > 0);

      const failureNames = new Set(
        newResults
          .filter((result) => !result.success)
          .map((result) => result.filename),
      );

      const remaining = selectedFiles.filter((file) =>
        failureNames.has(file.name),
      );

      if (remaining.length === 0) {
        handleFormReset();
      } else {
        setSelectedFiles(remaining);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ネットワークエラーが発生しました。",
      );
      onComplete?.(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-slate-900">画像アップロード</h2>
        <p className="text-sm text-slate-500">
          JPEG / PNG / WebP / GIF / SVG (最大 10MB) に対応しています。複数選択後、一括アップロードが可能です。
        </p>
      </div>

      <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            multiple
            onChange={handleFileSelection}
            className="hidden"
            id="imgdose-upload-input"
          />
          <label
            htmlFor="imgdose-upload-input"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
          >
            画像を選択
          </label>
          <p className="mt-3 text-xs text-slate-500">
            選択後に以下のリストで内容を確認できます。
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Ctrl+V でクリップボードの画像を即アップロードできます。
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">
              選択中のファイル ({selectedFiles.length})
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              {selectedFiles.map((file) => (
                <li
                  key={`${file.name}-${file.lastModified}-${file.size}`}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="truncate">{file.name}</span>
                  <span className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleFormReset}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            disabled={isSubmitting}
          >
            リセット
          </button>
          <button
            type="submit"
            disabled={isSubmitting || selectedFiles.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "アップロード中..." : "アップロードを開始"}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">アップロード結果</h3>

          {/* 成功した URL の一括コピー */}
          {results.some((r) => r.success) && (
            <UrlCopyPanel results={results} />
          )}

          <ul className="space-y-2 text-sm">
            {results.map((result) =>
              result.success ? (
                <li
                  key={`success-${result.image.id}`}
                  className="flex flex-col gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700"
                >
                  <span className="font-medium">
                    {result.filename} のアップロードに成功しました。
                  </span>
                  <a
                    href={result.image.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline"
                  >
                    公開 URL を開く
                  </a>
                </li>
              ) : (
                <li
                  key={`error-${result.filename}-${result.error}`}
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-600"
                >
                  {result.filename}: {result.error}
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
