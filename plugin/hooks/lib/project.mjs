// Works out the project name for a folder, so hooks and scans name a project the same way.
import { readFileSync, statSync } from "node:fs";
import { basename, dirname, join, posix, resolve } from "node:path";

/**
 * The name of the git repository a folder belongs to: "D:\Matchiq\apps\web" → "Matchiq".
 * Inside a git worktree it is the main repository's name, not the worktree folder's.
 * Outside git it is the folder's own name. Never throws.
 * @param {string} dir
 */
export function projectName(dir) {
  const start = resolve(dir);
  let current = start;
  for (let depth = 0; depth < 50; depth++) {
    const git = join(current, ".git");
    try {
      if (statSync(git).isDirectory()) return basename(current);
      // A worktree's ".git" is a file: "gitdir: <main repo>/.git/worktrees/<name>".
      const target = /^gitdir:\s*(.+)$/m.exec(readFileSync(git, "utf8"))?.[1]?.trim();
      const path = target ? resolve(current, target).replace(/\\/g, "/") : "";
      const cut = path.lastIndexOf("/.git/worktrees/");
      return cut > 0 ? posix.basename(path.slice(0, cut)) : basename(current);
    } catch {
      // No .git here: look one folder up.
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return basename(start);
}
