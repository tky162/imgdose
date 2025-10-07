#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();
const DEFAULT_CREDENTIAL_FILE = path.resolve(
  PROJECT_ROOT,
  process.env.IMGDOSE_BASIC_AUTH_FILE ?? "temp/idpass.md",
);

async function loadBasicAuthCredentials(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    let username;
    let password;

    for (const line of lines) {
      const normalized = line.replace(/\s+/g, " ").trim();
      if (!normalized) continue;

      if (/^id\b/i.test(normalized)) {
        username = normalized.replace(/^id\b[\s:=]*/i, "").trim();
      }

      if (/^(pass(word)?|pw)\b/i.test(normalized)) {
        password = normalized.replace(/^(pass(word)?|pw)\b[\s:=]*/i, "").trim();
      }
    }

    if (username && password) {
      process.env.BASIC_AUTH_USERNAME ??= username;
      process.env.BASIC_AUTH_PASSWORD ??= password;
      return;
    }

    console.warn(
      "[imgdose] Basic認証のID/PASSをファイルから取得できませんでした。",
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("[imgdose] Basic認証ファイルの読み込みに失敗しました:", error);
    }
  }
}

async function main() {
  await loadBasicAuthCredentials(DEFAULT_CREDENTIAL_FILE);

  const runtimeArgs = process.argv.slice(2);
  const nextArgs = ["next", "dev", "--turbopack", ...runtimeArgs];
  const runner = process.platform === "win32" ? "npx.cmd" : "npx";

  const child = spawn(runner, nextArgs, {
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

main().catch((error) => {
  console.error("[imgdose] devスクリプトでエラーが発生しました:", error);
  process.exit(1);
});
