import { DatabaseSync, backup } from "node:sqlite";
import { chmod, lstat, open, link, unlink } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
/** Operator-only consistent ciphertext backup; never exposed as an HTTP endpoint. */
export async function backupEncryptedDatabase(
  source: string,
  destination: string,
) {
  const input = resolve(source),
    output = resolve(destination),
    directory = dirname(output);
  if (
    input === output ||
    [resolve("dist"), resolve("build-server")].some((root) =>
      output.startsWith(root + sep),
    )
  )
    throw new Error("Unsafe backup destination.");
  const [sourceStat, directoryStat] = await Promise.all([
    lstat(input),
    lstat(directory),
  ]);
  if (
    !sourceStat.isFile() ||
    sourceStat.isSymbolicLink() ||
    sourceStat.mode & 0o077 ||
    !directoryStat.isDirectory() ||
    directoryStat.isSymbolicLink() ||
    directoryStat.mode & 0o077
  )
    throw new Error(
      "Use a private source file and private destination directory.",
    );
  const temporary = output + ".pending-" + randomUUID();
  const handle = await open(temporary, "wx", 0o600);
  await handle.close();
  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(input, { readOnly: true });
    await backup(database, temporary);
    // A restored backup must not resurrect logged-out sessions or staged imports.
    const snapshot = new DatabaseSync(temporary);
    try {
      snapshot.exec(
        "PRAGMA secure_delete=ON; DELETE FROM entries WHERE namespace IN ('session','login','stage');",
      );
    } finally {
      snapshot.close();
    }
    await chmod(temporary, 0o600);
    // Exclusive publication prevents overwriting a reviewed backup or following links.
    await link(temporary, output);
  } finally {
    database?.close();
    await unlink(temporary).catch(() => {});
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [source, destination] = process.argv.slice(2);
  if (!source || !destination) {
    process.stderr.write(
      "Usage: node build-server/backup.mjs SOURCE_DATABASE PRIVATE_BACKUP_FILE\n",
    );
    process.exitCode = 1;
  } else {
    try {
      await backupEncryptedDatabase(source, destination);
      process.stdout.write(
        "Encrypted database backup completed. Store the recovery key separately.\n",
      );
    } catch {
      process.stderr.write(
        "Backup failed safely. Review private paths and permissions; no source values are logged.\n",
      );
      process.exitCode = 1;
    }
  }
}
