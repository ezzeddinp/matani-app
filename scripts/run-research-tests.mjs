import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const candidates = [
  process.env.PYTHON
    ? { command: process.env.PYTHON, prefix: [], source: "PYTHON" }
    : null,
  {
    command: path.join(repoRoot, ".tmp", "python-embed", "python.exe"),
    prefix: [],
    source: "temporary portable runtime",
  },
  { command: "python3", prefix: [], source: "PATH" },
  { command: "python", prefix: [], source: "PATH" },
  { command: "py", prefix: ["-3"], source: "Windows launcher" },
].filter(Boolean);

function commandCanRun(candidate) {
  if (
    path.isAbsolute(candidate.command) &&
    !existsSync(candidate.command)
  ) {
    return false;
  }

  const result = spawnSync(
    candidate.command,
    [...candidate.prefix, "--version"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      windowsHide: true,
    },
  );

  return result.status === 0;
}

const python = candidates.find(commandCanRun);

if (!python) {
  console.error(
    "Research tests require Python 3. Set PYTHON to a Python 3 executable or install it on PATH.",
  );
  process.exit(1);
}

console.log(`Research test runtime: ${python.command} (${python.source})`);

const result = spawnSync(
  python.command,
  [
    ...python.prefix,
    "-m",
    "unittest",
    "discover",
    "-s",
    "research/tests",
    "-p",
    "test_*.py",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
    windowsHide: true,
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
