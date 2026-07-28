#!/usr/bin/env node
/*
 * Runs vinext with WRANGLER_LOG_PATH set, on every platform.
 *
 * The package scripts used to inline `WRANGLER_LOG_PATH=... vinext dev`, which
 * is POSIX-only syntax: on Windows both cmd.exe and PowerShell fail with
 * "'WRANGLER_LOG_PATH' is not recognized". This wrapper sets the variable in
 * process.env instead, so the same script works in bash, cmd and PowerShell
 * without adding a cross-env dependency.
 */
import { spawn } from "node:child_process";

const command = process.argv[2];
if (!command) {
  console.error("Usage: node scripts/vinext.mjs <dev|build|start> [args...]");
  process.exit(1);
}

const child = spawn("vinext", [command, ...process.argv.slice(3)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH ?? ".wrangler/wrangler.log" },
});

child.on("error", (error) => {
  console.error(`Failed to start vinext: ${error.message}`);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
