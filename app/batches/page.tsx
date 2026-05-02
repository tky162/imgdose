"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildApiUrl, getApiBaseUrl } from "@/lib/api-config";

interface Batch {
  batch_id: string;
  name: string | null;
  total_images: number;
  created_at: number;
}

export default function BatchesPage() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBatches = async () => {
    try {
      const res = await fetch(buildApiUrl("/batches", apiBaseUrl));
      const data = await res.json() as { ok: boolean; batches: Batch[] };
      if (data.ok) setBatches(data.batches);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, [apiBaseUrl]);

  const handleCopyUrls = async (batchId: string) => {
    const res = await fetch(buildApiUrl(`/batches/${batchId}/markdown`, apiBaseUrl));
    const data = await res.json() as { ok: boolean; markdown: string };
    if (data.ok) {
      await navigator.clipboard.writeText(data.markdown);
      setCopiedId(batchId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDelete = async (batchId: string) => {
    if (!confirm(`バッチ ${batchId} を削除しますか？（画像も全て削除されます）`)) return;
    setDeletingId(batchId);
    try {
      await fetch(buildApiUrl(`/batches/${batchId}`, apiBaseUrl), { method: "DELETE" });
      setBatches(prev => prev.filter(b => b.batch_id !== batchId));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">バッチ（箱）一覧</h1>
          <p className="text-sm text-slate-500 mt-1">記事ごとにまとめてアップした画像セット</p>
        </div>
        <Link
          href="/batches/new"
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          + 新規バッチ
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">読み込み中...</div>
      ) : batches.length === 0 ? (
        <div className="py-16 text-center rounded-xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 text-sm">バッチがありません</p>
          <Link href="/batches/new" className="mt-2 inline-block text-sm font-semibold text-slate-700 hover:underline">
            最初のバッチを作成する
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map(batch => (
            <div key={batch.batch_id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-slate-800 text-sm leading-snug">
                    {batch.name || "無題のバッチ"}
                  </h2>
                  <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                    {batch.batch_id}
                  </code>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{batch.total_images} 枚</span>
                  <span>{formatDate(batch.created_at)}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-2">
                <button
                  onClick={() => handleCopyUrls(batch.batch_id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${copiedId === batch.batch_id ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                >
                  {copiedId === batch.batch_id ? "コピー済み ✓" : "URL一括コピー"}
                </button>
                <button
                  onClick={() => handleDelete(batch.batch_id)}
                  disabled={deletingId === batch.batch_id}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingId === batch.batch_id ? "削除中…" : "削除"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
