"""Prepare optional Chrome/Edge test runtimes from official manifests, without root.

Requires Python 3, curl and dpkg-deb. Downloads remain outside the checkout.
TLS verification is enabled; each artifact must match its manifest SHA-256.
"""
from concurrent.futures import ThreadPoolExecutor
import gzip
import hashlib
import os
from pathlib import Path
import subprocess

CACHE = Path(os.environ.get("TPM_BROWSER_CACHE", "/workspace/browser-cache"))


def prepare(name, base, package, executable):
    folder = CACHE / name
    folder.mkdir(parents=True, exist_ok=True)

    def fetch(url, destination):
        subprocess.run(
            ["curl", "--fail", "--location", "--silent", "--show-error",
             "--max-time", "180", url, "--output", str(destination)],
            check=True,
        )

    manifest = folder / "Packages.gz"
    fetch(base + "dists/stable/main/binary-amd64/Packages.gz", manifest)
    candidates = []
    for entry in gzip.decompress(manifest.read_bytes()).decode().split("\n\n"):
        fields = dict(line.split(": ", 1) for line in entry.splitlines()
                      if ": " in line and not line.startswith(" "))
        if fields.get("Package") == package:
            candidates.append(fields)
    if not candidates:
        raise RuntimeError("Package missing from official manifest")
    chosen = candidates[0]
    for candidate in candidates[1:]:
        if subprocess.run(["dpkg", "--compare-versions", candidate["Version"],
                           "gt", chosen["Version"]]).returncode == 0:
            chosen = candidate

    artifact = folder / "browser.deb"
    fetch(base + chosen["Filename"].lstrip("/"), artifact)
    if hashlib.sha256(artifact.read_bytes()).hexdigest() != chosen["SHA256"]:
        raise RuntimeError("Browser checksum mismatch")
    subprocess.run(["dpkg-deb", "--extract", str(artifact),
                    str(folder / "runtime")], check=True)
    binary = folder / "runtime" / executable
    subprocess.run([str(binary), "--version"], check=True)
    print(name, chosen["Version"], binary, flush=True)


def main():
    with ThreadPoolExecutor() as pool:
        jobs = [
            pool.submit(prepare, "chrome", "https://dl.google.com/linux/chrome/deb/",
                        "google-chrome-stable", "opt/google/chrome/chrome"),
            pool.submit(prepare, "edge", "https://packages.microsoft.com/repos/edge/",
                        "microsoft-edge-stable", "opt/microsoft/msedge/msedge"),
        ]
        for job in jobs:
            job.result()


if __name__ == "__main__":
    main()
