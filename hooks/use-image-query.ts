import { useCallback, useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "@/lib/api-config";
import type {
  ImageListPagination,
  ImageListResponse,
  ImageListStats,
  ImageRecord,
  ImageSortKey,
  ImageSortOrder,
} from "@/lib/types/image";

export interface ImageQueryParams {
  search: string;
  sortKey: ImageSortKey;
  sortOrder: ImageSortOrder;
  page: number;
  pageSize: number;
}

interface ImageQueryResult {
  items: ImageRecord[];
  pagination: ImageListPagination;
  stats: ImageListStats;
}

interface UseImageQueryReturn {
  data: ImageQueryResult | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useImageQuery(params: ImageQueryParams): UseImageQueryReturn {
  const [data, setData] = useState<ImageQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => {
    setNonce((value) => value + 1);
  }, []);

  const queryString = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (params.search) {
      searchParams.set("search", params.search);
    }
    searchParams.set("sort", params.sortKey);
    searchParams.set("order", params.sortOrder);
    searchParams.set("page", String(params.page));
    searchParams.set("pageSize", String(params.pageSize));
    return searchParams.toString();
  }, [
    params.search,
    params.sortKey,
    params.sortOrder,
    params.page,
    params.pageSize,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(buildApiUrl(`/images?${queryString}`), {
          method: "GET",
          signal: controller.signal,
        });

        const payload = (await response.json()) as ImageListResponse;
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error ?? "画像一覧の取得に失敗しました。");
        }

        setData({
          items: payload.items,
          pagination: payload.pagination,
          stats: payload.stats,
        });
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "画像一覧の取得で不明なエラーが発生しました。",
        );
      } finally {
        setIsLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [queryString, nonce]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
