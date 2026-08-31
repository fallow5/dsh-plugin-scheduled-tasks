#!/usr/bin/env node
/**
 * Migrate old-format sessions (without "session-" prefix) into workspace.json.
 *
 * Old DSH versions used session IDs like "12951465-80fe-4ee7-8936-fdc40eb0518b".
 * New versions use "session-12951465-...". The old sessions still exist on disk
 * but are missing from workspace.json's sessionIds arrays, so they don't show
 * up in the workspace browser.
 *
 * This script:
 * 1. Backs up workspace.json
 * 2. Scans all session directories under ~/.dsh/sessions/
 * 3. Reads each session's header (first line of session.jsonl.zstd) to get id + cwd + createdAt
 * 4. Matches sessions to workspaces by cwd
 * 5. Adds missing session IDs to the workspace's sessionIds array
 * 6. Sorts each workspace's sessions by createdAt (newest first)
 * 7. Writes the updated workspace.json
 */

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { zstdDecompressSync } from "node:zlib";

const DSH_HOME = join(homedir(), ".dsh");
const SESSIONS_ROOT = join(DSH_HOME, "sessions");
const WORKSPACE_JSON = join(DSH_HOME, "storages", "workspace.json");

// --- Decode the project directory name back to a cwd path ---
// "--Users-mic-workspace-ai-dsh--" → "/Users/mic/workspace/ai/dsh"
function decodeProjectKey(key) {
  // Strip leading "--" and trailing "--"
  let inner = key;
  if (inner.startsWith("--")) inner = inner.slice(2);
  if (inner.endsWith("--")) inner = inner.slice(0, -2);
  // Replace "-" with "/" — but only the path separators, not dashes in names
  // Actually the encoding replaces "/" with "-", so we need to be smarter.
  // The encoding: "/" → "-", "\" → "-", ":" → "-"
  // On macOS paths are like /Users/mic/workspace/ai/dsh
  // So "--Users-mic-workspace-ai-dsh--" → /Users/mic/workspace/ai/dsh
  // We can just prepend "/" and replace "-" with "/"
  // But this breaks if a directory name contains "-". Let's use realpath instead.
  return null; // We'll use the session header's cwd field instead
}

// --- Read session header from the zstd-compressed JSONL file ---
async function readSessionHeader(sessionDirPath) {
  const filePath = join(sessionDirPath, "session.jsonl.zstd");
  let compressed;
  try {
    compressed = await readFile(filePath);
  } catch {
    // Try uncompressed .jsonl
    try {
      const raw = await readFile(join(sessionDirPath, "session.jsonl"), "utf-8");
      const firstLine = raw.split("\n")[0];
      return JSON.parse(firstLine);
    } catch {
      return null;
    }
  }

  try {
    const decompressed = zstdDecompressSync(compressed).toString("utf-8");
    const firstLine = decompressed.split("\n")[0];
    return JSON.parse(firstLine);
  } catch (err) {
    console.error(`  Failed to decompress/parse: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("=== DSH Session Migration Script ===\n");

  // 1. Read workspace.json
  const wsData = JSON.parse(await readFile(WORKSPACE_JSON, "utf-8"));
  const workspaces = wsData.tables.workspaces;

  // Build cwd → workspaceId map
  const cwdToWsId = new Map();
  for (const [wsId, ws] of Object.entries(workspaces)) {
    cwdToWsId.set(ws.path, wsId);
  }
  console.log(`Found ${cwdToWsId.size} workspaces:`);
  for (const [cwd, wsId] of cwdToWsId) {
    const ws = workspaces[wsId];
    console.log(`  ${ws.title} (${wsId}): ${cwd} — ${ws.sessionIds.length} sessions`);
  }
  console.log();

  // 2. Backup workspace.json
  const backupPath = WORKSPACE_JSON + ".backup-" + Date.now();
  await writeFile(backupPath, JSON.stringify(wsData, null, 2));
  console.log(`Backed up to: ${backupPath}\n`);

  // 3. Scan all session directories
  const projectDirs = await readdir(SESSIONS_ROOT);
  const allHeaders = []; // { id, cwd, createdAt, sessionDir, projectDir }

  for (const projectDirName of projectDirs) {
    const projectDirPath = join(SESSIONS_ROOT, projectDirName);
    const projectStat = await stat(projectDirPath);
    if (!projectStat.isDirectory()) continue;

    const sessionDirs = await readdir(projectDirPath);
    for (const sessionDirName of sessionDirs) {
      const sessionDirPath = join(projectDirPath, sessionDirName);
      const sessionStat = await stat(sessionDirPath);
      if (!sessionStat.isDirectory()) continue;

      const header = await readSessionHeader(sessionDirPath);
      if (!header) {
        console.log(`  SKIP (no header): ${projectDirName}/${sessionDirName}`);
        continue;
      }

      allHeaders.push({
        id: header.id,
        cwd: header.cwd,
        createdAt: header.createdAt,
        sessionDir: sessionDirName,
        projectDir: projectDirName,
        mtime: sessionStat.mtimeMs,
      });
    }
  }

  console.log(`\nTotal sessions on disk: ${allHeaders.length}`);

  // 4. Group sessions by workspace (matching cwd)
  const wsToSessions = new Map(); // wsId → [{ id, createdAt }]
  for (const wsId of Object.keys(workspaces)) {
    wsToSessions.set(wsId, []);
  }

  let unmatched = [];
  for (const h of allHeaders) {
    const wsId = cwdToWsId.get(h.cwd);
    if (!wsId) {
      unmatched.push(h);
      continue;
    }
    wsToSessions.get(wsId).push(h);
  }

  if (unmatched.length > 0) {
    console.log(`\nWARNING: ${unmatched.length} sessions have no matching workspace:`);
    for (const h of unmatched) {
      console.log(`  ${h.id} (cwd: ${h.cwd})`);
    }
  }

  // 5. For each workspace, find missing sessions and add them
  let totalAdded = 0;
  for (const [wsId, sessions] of wsToSessions) {
    const ws = workspaces[wsId];
    const existingIds = new Set(ws.sessionIds);
    const missing = sessions.filter((s) => !existingIds.has(s.id));

    if (missing.length === 0) {
      console.log(`  ${ws.title}: all ${sessions.length} sessions already registered`);
      continue;
    }

    console.log(`  ${ws.title}: adding ${missing.length} missing sessions (of ${sessions.length} total on disk)`);

    // Sort ALL sessions by createdAt descending (newest first)
    // For sessions without createdAt, use mtime as fallback
    const allSessions = sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt ?? 0,
      mtime: s.mtime,
    }));
    allSessions.sort((a, b) => {
      const aTime = a.createdAt || a.mtime;
      const bTime = b.createdAt || b.mtime;
      return bTime - aTime; // newest first
    });

    // Keep track of which IDs are "old format" (don't start with "session-")
    const oldIds = new Set(missing.map((m) => m.id));
    for (const m of missing) {
      const isOld = !m.id.startsWith("session-");
      console.log(`    ${isOld ? "[OLD]" : "[new]"} ${m.id} (createdAt: ${new Date(m.createdAt || m.mtime).toISOString()})`);
    }

    ws.sessionIds = allSessions.map((s) => s.id);
    totalAdded += missing.length;
  }

  // 6. Write updated workspace.json
  wsData.global.initialized = true;
  await writeFile(WORKSPACE_JSON, JSON.stringify(wsData, null, 2) + "\n");
  console.log(`\n✅ Migration complete! Added ${totalAdded} sessions across ${wsToSessions.size} workspaces.`);
  console.log(`   Backup: ${backupPath}`);
  console.log(`   Restart DSH to see the sessions in the workspace browser.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
