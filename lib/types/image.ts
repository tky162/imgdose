export type ImageSortKey = "uploadedAt" | "originalFilename" | "fileSize";
export type ImageSortOrder = "asc" | "desc";

export interface ImageRecord {
  id: string;
  objectKey: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
  fileExtension?: string;
  publicUrl: string;
}

export interface ImageListStats {
  totalCount: number;
  totalBytes: number;
  latestUploadedAt: string | null;
}

export interface ImageListPagination {
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ImageListResponse {
  ok: boolean;
  items: ImageRecord[];
  pagination: ImageListPagination;
  stats: ImageListStats;
  error?: string;
}
