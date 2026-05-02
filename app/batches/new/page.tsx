"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { buildApiUrl, getApiBaseUrl } from "@/lib/api-config";
import { useMemo } from "react";

export default function BatchNewPage() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [resultBatchId, setResultBatchId] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !apiBaseUrl) return;

    setUploading(true);
    setError(null);

    try {
      // 1. バッチ作成
      const createRes = await fetch(buildApiUrl("/batches", apiBaseUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null }),
      });
      const createData = await createRes.json() as { ok: boolean; batchId: string };
      if (!createData.ok) throw new Error("バッチの作成に失敗しました");

      const batchId = createData.batchId;

      // 2. 画像一括アップロード
      const form = new FormData();
      files.forEach(f => form.append("files", f));

      const uploadRes = await fetch(buildApiUrl(`/batches/${batchId}/upload`, apiBaseUrl), {
        method: "POST",
        body: form,
      });
      const uploadData = await uploadRes.json() as { ok: boolean; results: Array<{ success: boolean; publicUrl?: string }> };
      if (!uploadData.ok) throw new Error("アップロードに失敗しました");

      // 3. Markdown 取得
      const mdRes = await fetch(buildApiUrl(`/batches/${batchId}/markdown`, apiBaseUrl));
      const mdData = await mdRes.json() as { ok: boolean; urls: string[] };

      setResultBatchId(batchId);
      setUrls(mdData.urls ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  const urlText = urls.join("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(urlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setResultBatchId(null);
    setUrls([]);
    setFiles([]);
    setName("");
    setCopied(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 完了画面
  if (resultBatchId) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div className="text-center space-y-2">
          <div className="text-4xl">✅</div>
          <h1 className="text-2xl font-semibold text-slate-900">アップロード完了</h1>
          <p className="text-sm text-slate-500">
            バッチ ID: <code className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{resultBatchId}</code>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">URL 一覧 ({urls.length}枚)</span>
            <button
              onClick={handleCopy}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${copied ? "bg-emerald-500 text-white" : "bg-slate-900 text-white hover:bg-slate-700"}`}
            >
              {copied ? "コピー済み ✓" : "全URLをコピー"}
            </button>
          </div>
          <textarea
            readOnly
            value={urlText}
            rows={Math.min(urls.length + 1, 10)}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 resize-none focus:outline-none"
          />
          <p className="text-xs text-slate-400">クリックで全選択 / または「全URLをコピー」ボタンを使ってください</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            別のバッチをアップロード
          </button>
          <Link
            href="/batches"
            className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-semibold text-center hover:bg-slate-700 transition-colors"
          >
            バッチ一覧へ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">バッチ画像アップロード</h1>
          <p className="text-sm text-slate-500 mt-1">記事1本分の画像をまとめてアップし、URL一覧を出力します</p>
        </div>
        <Link href="/batches" className="text-sm text-slate-400 hover:text-slate-600">← 一覧</Link>
      </div>

      <form onSubmit={handleUpload} className="flex flex-col gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">バッチ名（任意）</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: 記事タイトル 2026-05-02"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-10 text-center transition-colors ${files.length > 0 ? "border-slate-400 bg-slate-50" : "border-slate-200 hover:border-slate-400"}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".webp,.png,.jpg,.jpeg,.gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-lg font-semibold text-slate-700">
              {files.length > 0 ? `${files.length} ファイル選択中` : "クリックして画像を選択"}
            </p>
            <p className="text-xs text-slate-400 mt-1">webp / png / jpg / gif（複数選択可）</p>
          </div>

          {files.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1">
                  <span className="truncate">{f.name}</span>
                  <span className="text-slate-400 ml-2">{(f.size / 1024).toFixed(0)}KB</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <button
          type="submit"
          disabled={uploading || files.length === 0}
          className="w-full py-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "アップロード中..." : `一括アップロード（${files.length}枚）`}
        </button>
      </form>
    </div>
  );
}
