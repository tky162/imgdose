#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();

const DEFAULT_NODE_ARCHIVE =
  "https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz";
const DEFAULT_NODE_DIR = path.resolve(
  PROJECT_ROOT,
  process.env.IMGDOSE_WRANGLER_NODE_DIR ?? "temp/node-v20.18.0-linux-x64",
);
const NODE_BIN = path.join(DEFAULT_NODE_DIR, "bin/node");
const WRANGLER_BIN = path.resolve(
  PROJECT_ROOT,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);

async function ensureNodeBinary() {
  try {
    await fs.access(NODE_BIN);
    return;
  } catch {
    console.error(
      `[imgdose] Node.js 20 バイナリが見つかりませんでした: ${NODE_BIN}`,
    );
    console.error(
      `[imgdose] 以下のいずれかを実行して再度お試しください:\n` +
        `  1. ${DEFAULT_NODE_ARCHIVE} をダウンロードし temp/ に展開する\n` +
        `  2. IMGDOSE_WRANGLER_NODE_DIR 環境変数で Node.js 20.x のパスを指定する\n`,
    );
    throw new Error("Node.js 20 binary not found");
  }
}

async function run() {
  await ensureNodeBinary();

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "[imgdose] 使用方法: npm run wrangler -- <command> (例: npm run wrangler -- whoami)",
    );
    process.exit(1);
  }

  const child = spawn(NODE_BIN, [WRANGLER_BIN, ...args], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

run().catch((error) => {
  console.error("[imgdose] Wrangler コマンド実行中にエラー:", error.message);
  process.exit(1);
});
