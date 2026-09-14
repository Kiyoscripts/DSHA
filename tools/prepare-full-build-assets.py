#!/usr/bin/env python3
"""Restore verified full offline build inputs from an official DSHA APK."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/src/main/assets"
EXPECTED_APK_SHA256 = "85cb7c7213681ced654788f940b16313b3b5e2b662add87432ede95446a30658"
EXPECTED_ENVIRONMENT_VERSION = "10"


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


def extract(apk_path):
    source_apk_sha256 = digest(apk_path)
    if source_apk_sha256 != EXPECTED_APK_SHA256:
        raise ValueError(f"official APK SHA-256 mismatch: {source_apk_sha256}")

    wanted = ("offline-rootfs.bin", "dsh-runtime.bin", "ubuntu-tools.bin")
    with zipfile.ZipFile(apk_path) as apk:
        if apk.read("assets/offline-rootfs.version").decode().strip() != EXPECTED_ENVIRONMENT_VERSION:
            raise ValueError("official APK contains an unexpected environment version")
        if apk.read("assets/offline-rootfs.layout").decode().strip() != "split-runtime-v1":
            raise ValueError("official APK does not use the split runtime layout")
        for name in wanted:
            member = "assets/" + name
            target = ASSETS / name
            with apk.open(member) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output, 1024 * 1024)
        expected = {
            "offline-rootfs.bin": apk.read("assets/offline-rootfs.sha256").decode().strip(),
            "dsh-runtime.bin": apk.read("assets/dsh-runtime.sha256").decode().strip(),
        }

    for name, checksum in expected.items():
        actual = digest(ASSETS / name)
        if actual != checksum:
            raise ValueError(f"embedded {name} SHA-256 mismatch: {actual}")

    runtime_builder = module("dsh_runtime_builder", ROOT / "tools/build-dsh-runtime.py")
    version = json.loads((ROOT / "tools/dsh-runtime/package.json").read_text(encoding="utf-8"))["dependencies"]["@deepseek-ai/dsh"]
    runtime = ASSETS / "dsh-runtime.bin"
    runtime.with_suffix(".inputs.json").write_text(json.dumps({
        "version": version,
        "inputs": runtime_builder.recipe_inputs(),
        "archive_sha256": digest(runtime),
    }, indent=2) + "\n", encoding="utf-8")

    tools_builder = module("ubuntu_tools_builder", ROOT / "tools/prepare-ubuntu-tools.py")
    lock = json.loads((ROOT / "tools/ubuntu-tools/packages.lock.json").read_text(encoding="utf-8"))
    tools = ASSETS / "ubuntu-tools.bin"
    tools.with_suffix(".inputs.json").write_text(json.dumps({
        "inputs": tools_builder.inputs(),
        "archive_sha256": digest(tools),
        "installed_bytes": sum(int(row["Installed-Size"]) * 1024 for row in lock["packages"]),
        "base_status_sha256": lock["baseStatusSha256"],
        "packages": len(lock["packages"]),
    }, indent=2) + "\n", encoding="utf-8")

    report = {name: {"bytes": (ASSETS / name).stat().st_size, "sha256": digest(ASSETS / name)} for name in wanted}
    print(json.dumps({"sourceApkSha256": source_apk_sha256, "environmentVersion": EXPECTED_ENVIRONMENT_VERSION, "assets": report}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    args = parser.parse_args()
    extract(args.apk.resolve(strict=True))


if __name__ == "__main__":
    main()
