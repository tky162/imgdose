import JSZip from "jszip";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_ARCHIVE_ITEMS = 50;

export interface Env {
  IMGDOSE_BUCKET: R2Bucket;
  IMGDOSE_DB: D1Database;
  IMGDOSE_BUCKET_NAME: string;
  IMGDOSE_ACCOUNT_ID: string;
  IMGDOSE_R2_ACCESS_KEY: string;
  IMGDOSE_R2_SECRET_KEY: string;
  IMGDOSE_CORS_ORIGIN?: string;
  IMGDOSE_LOG_LEVEL?: string;
}

type UploadResult =
  | { success: true; filename: string; image: StoredImage }
  | { success: false; filename: string; error: string };

interface StoredImage {
  id: string;
  objectKey: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
  fileExtension?: string;
  publicUrl: string;
}

interface DbImageRow {
  id: string;
  object_key: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  uploaded_at: number;
  file_extension: string | null;
  public_url: string;
}

type SortKey = "uploadedAt" | "originalFilename" | "fileSize";

type LogLevel = "debug" | "info" | "silent";

function getLogLevel(env: Env): LogLevel {
  const raw = (env.IMGDOSE_LOG_LEVEL ?? "info").toLowerCase();
  if (raw === "debug") return "debug";
  if (raw === "silent") return "silent";
  return "info";
}

function logInfo(env: Env, message: string, details?: unknown) {
  const level = getLogLevel(env);
  if (level === "silent") return;
  if (details !== undefined) {
    console.info(`[imgdose] ${message}`, details);
  } else {
    console.info(`[imgdose] ${message}`);
  }
}

function logDebug(env: Env, message: string, details?: unknown) {
  if (getLogLevel(env) !== "debug") return;
  if (details !== undefined) {
    console.debug(`[imgdose] ${message}`, details);
  } else {
    console.debug(`[imgdose] ${message}`);
  }
}

function logError(env: Env, message: string, error?: unknown, details?: unknown) {
  if (getLogLevel(env) === "silent") return;
  if (details !== undefined) {
    console.error(`[imgdose] ${message}`, details, error ?? "");
  } else {
    console.error(`[imgdose] ${message}`, error ?? "");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return handleOptions(request, env);
    }

    if (request.method === "GET" && url.pathname === "/healthz") {
      return json(env, request, { ok: true });
    }

    if (request.method === "GET" && url.pathname === "/images") {
      return handleImageList(request, env);
    }

    if (request.method === "POST" && url.pathname === "/images") {
      return handleImageUpload(request, env);
    }

    if (request.method === "DELETE" && url.pathname === "/images") {
      return handleImageDelete(request, env);
    }

    if (request.method === "POST" && url.pathname === "/images/archive") {
      return handleImageArchive(request, env);
    }

    return json(env, request, { ok: false, error: "Not Found" }, 404);
  },
};

async function handleImageUpload(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const files: File[] = [];

  for (const value of formData.values()) {
    if (value instanceof File && value.size > 0) {
      files.push(value);
    }
  }

  if (files.length === 0) {
    return json(env, request, { ok: false, error: "No file was attached." }, 400);
  }

  const results: UploadResult[] = [];

  for (const file of files) {
    const filename = file.name || "noname";
    try {
      validateFile(file);
      const stored = await storeFile(env, file);
      results.push({ success: true, filename, image: stored });
    } catch (error) {
      logError(env, "Failed to upload file", error, { filename });
      const message = error instanceof Error ? error.message : "Upload failed.";
      results.push({ success: false, filename, error: message });
    }
  }

  const hasSuccess = results.some((result) => result.success);
  const status = hasSuccess
    ? results.every((result) => result.success)
      ? 200
      : 207
    : 400;

  logDebug(env, "Upload summary", {
    requested: files.length,
    success: results.filter((item) => item.success).length,
    failure: results.filter((item) => !item.success).length,
  });

  return json(env, request, { ok: hasSuccess, results }, status);
}

async function handleImageList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const sortKey = (url.searchParams.get("sort") ?? "uploadedAt") as SortKey;
  const sortOrder =
    (url.searchParams.get("order") ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const page = clampPositiveInt(url.searchParams.get("page"), 1);
  const pageSize = clampPositiveInt(url.searchParams.get("pageSize"), 20, 1, 100);
  const offset = (page - 1) * pageSize;

  try {
    const { whereClause, bindings } = buildFilters(search);
    const { column: sortColumn, direction } = resolveSort(sortKey, sortOrder);

    const querySql = `
      SELECT
        id,
        object_key,
        original_filename,
        content_type,
        file_size,
        uploaded_at,
        file_extension,
        public_url
      FROM images
      ${whereClause}
      ORDER BY ${sortColumn} ${direction}
      LIMIT ?1 OFFSET ?2
    `;

    const queryResult = await env.IMGDOSE_DB.prepare(querySql)
      .bind(...bindings, pageSize, offset)
      .all<DbImageRow>();

    if (queryResult.error) {
      logError(env, "Failed to query image list", queryResult.error, {
        search,
        sortKey,
        sortOrder,
        page,
        pageSize,
      });
      return json(env, request, { ok: false, error: queryResult.error }, 500);
    }

    const items = (queryResult.results ?? []).map(mapImageRow);

    const statsSql = `
      SELECT
        COUNT(*) AS total_count,
        COALESCE(SUM(file_size), 0) AS total_size,
        COALESCE(MAX(uploaded_at), 0) AS latest_uploaded_at
      FROM images
      ${whereClause}
    `;

    const statsRow = await env.IMGDOSE_DB.prepare(statsSql)
      .bind(...bindings)
      .first<{
        total_count: number | null;
        total_size: number | null;
        latest_uploaded_at: number | null;
      }>();

    const totalCount = Number(statsRow?.total_count ?? 0);
    const totalBytes = Number(statsRow?.total_size ?? 0);
    const latestUploadedAt = statsRow?.latest_uploaded_at
      ? new Date(Number(statsRow.latest_uploaded_at)).toISOString()
      : null;

    const hasNext = offset + items.length < totalCount;
    const hasPrev = page > 1;

    return json(env, request, {
      ok: true,
      items,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        hasNext,
        hasPrev,
      },
      stats: {
        totalCount,
        totalBytes,
        latestUploadedAt,
      },
    });
  } catch (error) {
    logError(env, "Unhandled error while listing images", error, {
      search,
      sortKey,
      sortOrder,
      page,
      pageSize,
    });
    return json(env, request, { ok: false, error: "Failed to fetch image list." }, 500);
  }
}

async function handleImageDelete(request: Request, env: Env): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    logError(env, "Failed to parse delete request body");
    return json(env, request, { ok: false, error: "Failed to parse delete request." }, 400);
  }

  const ids = extractIdList(payload);
  if (ids.length === 0) {
    return json(env, request, { ok: false, error: "No image IDs were provided." }, 400);
  }

  const rows = await getImagesByIds(env, ids);
  if (rows.length === 0) {
    logInfo(env, "Delete requested but no matching images were found", { ids });
    return json(env, request, { ok: false, error: "No matching images were found." }, 404);
  }

  const keyById = new Map<string, string>();
  for (const row of rows) {
    keyById.set(row.id, row.object_key);
  }

  const failures: Array<{ id: string; reason: string }> = [];
  const deleted: string[] = [];

  await env.IMGDOSE_DB.prepare("BEGIN TRANSACTION").run();
  try {
    for (const [id, objectKey] of keyById.entries()) {
      try {
        await env.IMGDOSE_BUCKET.delete(objectKey);
      } catch (bucketError) {
        logError(env, "Failed to delete object from R2", bucketError, { id, objectKey });
        failures.push({
          id,
          reason: bucketError instanceof Error ? bucketError.message : String(bucketError),
        });
        continue;
      }

      try {
        await env.IMGDOSE_DB.prepare("DELETE FROM images WHERE id = ?1").bind(id).run();
        deleted.push(id);
      } catch (dbError) {
        logError(env, "Failed to delete image metadata from D1", dbError, { id });
        failures.push({
          id,
          reason: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }
    }

    await env.IMGDOSE_DB.prepare("COMMIT").run();
  } catch (transactionError) {
    await env.IMGDOSE_DB.prepare("ROLLBACK").run();
    logError(env, "Transaction failure while deleting images", transactionError, { ids });
    return json(env, request, {
      ok: false,
      error:
        transactionError instanceof Error
          ? transactionError.message
          : String(transactionError),
    }, 500);
  }

  const hasSuccess = deleted.length > 0;

  if (hasSuccess) {
    logInfo(env, "Deleted images", { deletedCount: deleted.length, failureCount: failures.length });
  }

  return json(env, request, {
    ok: hasSuccess,
    deleted,
    failures,
  }, hasSuccess ? 200 : 500);
}

async function handleImageArchive(request: Request, env: Env): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    logError(env, "Failed to parse archive request body");
    return json(env, request, { ok: false, error: "Failed to parse archive request." }, 400);
  }

  const ids = extractIdList(payload);
  if (ids.length === 0) {
    return json(env, request, { ok: false, error: "No image IDs were provided." }, 400);
  }

  if (ids.length > MAX_ARCHIVE_ITEMS) {
    return json(
      env,
      request,
      { ok: false, error: `You can archive up to ${MAX_ARCHIVE_ITEMS} images at once.` },
      400,
    );
  }

  let rows: DbImageRow[];
  try {
    rows = await getImagesByIds(env, ids);
  } catch (lookupError) {
    logError(env, "Failed to look up images for archive", lookupError, { ids });
    return json(env, request, { ok: false, error: "Failed to retrieve images for archive." }, 500);
  }

  if (rows.length === 0) {
    logInfo(env, "Archive requested but no matching images were found", { ids });
    return json(env, request, { ok: false, error: "No matching images were found." }, 404);
  }

  try {
    const zip = new JSZip();
    let filesAdded = 0;

    for (const row of rows) {
      const objectKey = row.object_key;
      const originalFilename = row.original_filename || row.id;
      const extension = row.file_extension;

      if (!objectKey) {
        logDebug(env, "Skipping archive entry with empty object key", { id: row.id });
        continue;
      }

      const r2Object = await env.IMGDOSE_BUCKET.get(objectKey);
      if (!r2Object || !r2Object.body) {
        logError(env, "Failed to read object from R2 for archive", undefined, {
          id: row.id,
          objectKey,
        });
        continue;
      }

      const arrayBuffer = await r2Object.arrayBuffer();
      zip.file(sanitizeArchiveName(originalFilename, extension), arrayBuffer);
      filesAdded += 1;
    }

    if (filesAdded === 0) {
      logError(env, "Archive request produced no downloadable objects", undefined, { ids });
      return json(env, request, { ok: false, error: "対象の画像データを取得できませんでした。" }, 404);
    }

    const zipContent = await zip.generateAsync({
      type: "uint8array",
      compression: "STORE",
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `imgdose-archive-${timestamp}.zip`;

    const headers = buildCorsHeaders(env, request);
    headers.set("content-type", "application/zip");
    headers.set("content-disposition", `attachment; filename="${filename}"`);
    headers.set("cache-control", "no-store");

    return new Response(zipContent, { status: 200, headers });
  } catch (error) {
    logError(env, "Unexpected error while creating ZIP archive", error, { ids });
    return json(env, request, { ok: false, error: "ZIP の生成中にエラーが発生しました。" }, 500);
  }
}

function sanitizeArchiveName(original: string, extension: string | null): string {
  const base = sanitizeFilename(original);
  if (extension) {
    if (base.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
      return base;
    }
    return `${base}.${extension}`;
  }
  return base;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^\w.\-]/g, "-");
}

async function getImagesByIds(env: Env, ids: string[]) {
  const placeholders = ids.map((_, index) => `?${index + 1}`).join(", ");
  const selectSql = `
    SELECT
      id,
      object_key,
      original_filename,
      content_type,
      file_size,
      uploaded_at,
      file_extension,
      public_url
    FROM images
    WHERE id IN (${placeholders})
  `;

  const selectResult = await env.IMGDOSE_DB.prepare(selectSql)
    .bind(...ids)
    .all<DbImageRow>();

  if (selectResult.error) {
    logError(env, "Failed to query images by ID", selectResult.error, { ids });
    throw new Error(selectResult.error);
  }

  return selectResult.results ?? [];
}

function resolveSort(sort: SortKey, order: "asc" | "desc") {
  const columns: Record<SortKey, string> = {
    uploadedAt: "uploaded_at",
    originalFilename: "original_filename",
    fileSize: "file_size",
  };

  const column = columns[sort] ?? columns.uploadedAt;
  const direction = order === "asc" ? "ASC" : "DESC";
  return { column, direction };
}

function buildFilters(search: string) {
  const conditions: string[] = [];
  const bindings: Array<string | number> = [];

  if (search.length > 0) {
    conditions.push("LOWER(original_filename) LIKE LOWER(?)");
    bindings.push(`%${search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { whereClause, bindings };
}

function mapImageRow(row: DbImageRow): StoredImage {
  return {
    id: String(row.id ?? ""),
    objectKey: String(row.object_key ?? ""),
    originalFilename: String(row.original_filename ?? ""),
    contentType: String(row.content_type ?? ""),
    fileSize: Number(row.file_size ?? 0),
    uploadedAt:
      row.uploaded_at > 0 ? new Date(Number(row.uploaded_at)).toISOString() : new Date(0).toISOString(),
    fileExtension: row.file_extension ?? undefined,
    publicUrl: String(row.public_url ?? ""),
  };
}

function clampPositiveInt(
  rawValue: string | null,
  fallback: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const value = Number.parseInt(rawValue ?? "", 10);
  if (Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function buildCorsHeaders(env: Env, request: Request): Headers {
  const headers = new Headers();
  headers.set("vary", "origin");
  headers.set("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  headers.set(
    "access-control-allow-headers",
    request.headers.get("Access-Control-Request-Headers") ?? "*",
  );

  const allowOrigin = resolveCorsOrigin(env, request.headers.get("Origin"));
  if (allowOrigin) {
    headers.set("access-control-allow-origin", allowOrigin);
    if (allowOrigin !== "*") {
      headers.set("access-control-allow-credentials", "true");
    }
  }

  return headers;
}

function extractIdList(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || !("ids" in payload)) {
    return [];
  }

  const ids = (payload as { ids: unknown }).ids;
  if (!Array.isArray(ids)) {
    return [];
  }

  return ids
    .map((value) => String(value))
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .filter((value, index, self) => self.indexOf(value) === index);
}

function handleOptions(request: Request, env: Env): Response {
  const headers = buildCorsHeaders(env, request);
  headers.set("access-control-max-age", "86400");
  return new Response(null, { status: 204, headers });
}

function json(
  env: Env,
  request: Request,
  body: unknown,
  status = 200,
): Response {
  const headers = buildCorsHeaders(env, request);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body, null, 2), { status, headers });
}

function resolveCorsOrigin(env: Env, requestOrigin: string | null): string | null {
  if (!env.IMGDOSE_CORS_ORIGIN || env.IMGDOSE_CORS_ORIGIN.trim() === "*") {
    return "*";
  }

  if (!requestOrigin) {
    return null;
  }

  const allowedOrigins = env.IMGDOSE_CORS_ORIGIN
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
}
