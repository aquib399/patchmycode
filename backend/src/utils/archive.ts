import { execFile } from "node:child_process";
import { Octokit } from "@octokit/rest";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

export async function downloadAndExtractRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string
): Promise<string> {
  const baseDir = path.join(
    os.tmpdir(),
    "patchmycode",
    `${owner}-${repo}-${ref}-${Date.now()}`
  );
  await fs.mkdir(baseDir, { recursive: true });

  const archivePath = path.join(baseDir, "repo.tar.gz");
  const extractDir = path.join(baseDir, "src");
  await fs.mkdir(extractDir, { recursive: true });

  // 1. Download tarball at exact PR commit SHA
  const response = (await octokit.rest.repos.downloadTarballArchive({
    owner,
    repo,
    ref
  })) as unknown as { data: ArrayBuffer };

  await fs.writeFile(archivePath, Buffer.from(response.data));

  // 2. Extract and strip GitHub's root container folder
  await execFileAsync("tar", [
    "-xzf",
    archivePath,
    "-C",
    extractDir,
    "--strip-components=1"
  ]);

  // 3. Remove tarball to free disk space
  await fs.unlink(archivePath);

  return extractDir;
}

export async function cleanupRepo(dirPath: string): Promise<void> {
  try {
    // Delete parent directory enclosing both src and any temporary artifacts
    const parentDir = path.dirname(dirPath);
    await fs.rm(parentDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`[Archive Cleanup] Failed to remove ${dirPath}:`, error);
  }
}
