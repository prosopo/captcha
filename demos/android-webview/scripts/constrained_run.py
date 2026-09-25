#!/usr/bin/env python3
# Copyright 2021-2026 Prosopo (UK) Ltd.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Solve the demo app's captcha on a deliberately weak Android emulator.

Boots one emulator per hardware profile (RAM, cores, and a host CPU quota via
systemd-run), then for each network preset: cold-starts the app, times the
widget appearing and the frictionless solve, squeezes memory with
``am send-trim-memory``, kills the app in the background and checks it comes
back. Results are JSON lines on stdout; progress is key=value on stderr.

The network is changed on the running emulator through its console, so one
boot covers every network preset.
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import os
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = "io.prosopo.procaptcha"
ACTIVITY = f"{PACKAGE}/.MainActivity"
SOLVE_WINDOW_S = 60.0
WIDGET_TIMEOUT_S = 180.0
LAUNCH_TIMEOUT_S = 180.0
# Below this per-core load a guest has finished its post-boot work.
SETTLED_LOAD_PER_CORE = 1.5


@dataclasses.dataclass(frozen=True)
class Hardware:
    name: str
    ram_mb: int
    cores: int
    cpu_quota_pct: int


HARDWARE = {
    "low": Hardware(name="low", ram_mb=1536, cores=1, cpu_quota_pct=50),
    "mid": Hardware(name="mid", ram_mb=2048, cores=2, cpu_quota_pct=100),
}

# Emulator console presets; the emulator prints the speeds behind each with
# `emulator -help-netspeed`.
NETWORKS = ("full", "lte", "umts", "edge", "gsm")

CRASH_MARKERS = ("FATAL EXCEPTION", "ANR in ", "Fatal signal")


def log(event: str, **fields: object) -> None:
    parts = [f"event={event}"] + [f"{k}={json.dumps(v)}" for k, v in fields.items()]
    print(" ".join(parts), file=sys.stderr, flush=True)


def emulator_argv(emulator: str, avd: str, hardware: Hardware, port: int) -> list[str]:
    return [
        emulator,
        "-avd",
        avd,
        "-port",
        str(port),
        "-memory",
        str(hardware.ram_mb),
        "-cores",
        str(hardware.cores),
        "-no-window",
        "-no-snapshot",
        "-no-boot-anim",
        "-no-audio",
        "-gpu",
        "swiftshader_indirect",
    ]


def cpu_capped(argv: list[str], quota_pct: int, unit: str) -> list[str]:
    """Wrap a command so the host scheduler gives it at most quota_pct of one CPU."""
    return [
        "systemd-run",
        "--user",
        "--scope",
        "--quiet",
        f"--unit={unit}",
        "-p",
        f"CPUQuota={quota_pct}%",
        "--",
        *argv,
    ]


def avd_config(base: str, ram_mb: int, cores: int) -> str:
    """The base AVD's config.ini with RAM and cores replaced and snapshots off."""
    overrides = {
        "hw.ramSize": str(ram_mb),
        "hw.cpu.ncore": str(cores),
        "fastboot.forceFastBoot": "no",
        "fastboot.forceColdBoot": "yes",
    }
    lines = []
    for line in base.splitlines():
        key = line.split("=", 1)[0].strip()
        if key in overrides:
            lines.append(f"{key}={overrides.pop(key)}")
        elif key not in ("AvdId", "avd.ini.displayname"):
            lines.append(line)
    lines.extend(f"{k}={v}" for k, v in overrides.items())
    return "\n".join(lines) + "\n"


def ensure_avd(avd_home: Path, name: str, base: str) -> None:
    """Create the AVD as a copy of the base one's config, leaving the base untouched."""
    target = avd_home / f"{name}.avd"
    if (target / "config.ini").exists():
        return
    base_config = (avd_home / f"{base}.avd" / "config.ini").read_text()
    target.mkdir(parents=True)
    config = avd_config(base_config, HARDWARE["mid"].ram_mb, HARDWARE["mid"].cores)
    (target / "config.ini").write_text(
        config + f"AvdId={name}\navd.ini.displayname={name}\n"
    )
    sysdir = re.search(r"^image\.sysdir\.1=.*android-([\d.]+)/", base_config, re.M)
    target_line = f"target=android-{sysdir.group(1)}\n" if sysdir else ""
    (avd_home / f"{name}.ini").write_text(
        f"avd.ini.encoding=UTF-8\npath={target}\npath.rel=avd/{name}.avd\n{target_line}"
    )
    log("avd.created", name=name, base=base)


@dataclasses.dataclass(frozen=True)
class Checkbox:
    x: int
    y: int
    checked: bool


_BOUNDS = re.compile(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")


def find_checkbox(ui_dump: str) -> Checkbox | None:
    """The first checkbox in a `uiautomator dump`, which inside the WebView is the widget's."""
    try:
        root = ET.fromstring(ui_dump)
    except ET.ParseError:
        return None
    for node in root.iter("node"):
        if node.get("class") != "android.widget.CheckBox":
            continue
        bounds = _BOUNDS.fullmatch(node.get("bounds", ""))
        if not bounds:
            continue
        left, top, right, bottom = (int(v) for v in bounds.groups())
        return Checkbox(
            x=(left + right) // 2,
            y=(top + bottom) // 2,
            checked=node.get("checked") == "true",
        )
    return None


def system_dialog_wait_button(ui_dump: str) -> tuple[int, int] | None:
    """Centre of the "Wait" button on a system "isn't responding" dialog. A
    starved guest raises these for System UI, and one left open hides the app
    from `uiautomator` for the rest of the cell."""
    try:
        root = ET.fromstring(ui_dump)
    except ET.ParseError:
        return None
    for node in root.iter("node"):
        if node.get("resource-id") != "android:id/aerr_wait":
            continue
        bounds = _BOUNDS.fullmatch(node.get("bounds", ""))
        if bounds:
            left, top, right, bottom = (int(v) for v in bounds.groups())
            return (left + right) // 2, (top + bottom) // 2
    return None


def crashes_in(logcat: str, package: str = PACKAGE) -> list[str]:
    """Crash and ANR lines that name the app, or the line straight after a marker that does."""
    found = []
    lines = logcat.splitlines()
    for i, line in enumerate(lines):
        if not any(marker in line for marker in CRASH_MARKERS):
            continue
        context = line + (lines[i + 1] if i + 1 < len(lines) else "")
        if package in context:
            found.append(line.strip())
    return found


@dataclasses.dataclass
class CellResult:
    hardware: str
    network: str
    launch_ms: int | None = None
    widget_ready_ms: int | None = None
    solve_ms: int | None = None
    survived_trim: bool | None = None
    recovered_after_kill: bool | None = None
    crashes: list[str] = dataclasses.field(default_factory=list)
    system_dialogs: int = 0
    error: str | None = None


def verdict(result: CellResult, window_s: float = SOLVE_WINDOW_S) -> str:
    if result.error or result.crashes or result.solve_ms is None:
        return "failed"
    if result.survived_trim is False or result.recovered_after_kill is False:
        return "failed"
    if result.solve_ms > window_s * 1000:
        return "failed"
    return "slow" if result.solve_ms > window_s * 500 else "ok"


def one_minute_load(proc_loadavg: str) -> float | None:
    fields = proc_loadavg.split()
    try:
        return float(fields[0])
    except (IndexError, ValueError):
        return None


def settled(load: float | None, cores: int) -> bool:
    return load is not None and load < cores * SETTLED_LOAD_PER_CORE


def launch_total_ms(am_start_output: str) -> int | None:
    match = re.search(r"^TotalTime:\s*(\d+)", am_start_output, re.M)
    return int(match.group(1)) if match else None


class Device:
    def __init__(self, adb: str, serial: str) -> None:
        self.adb = adb
        self.serial = serial
        self.dismissed_dialogs = 0

    def run(self, *args: str, timeout: float = 60) -> str:
        done = subprocess.run(
            [self.adb, "-s", self.serial, *args],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return done.stdout

    def shell(self, *args: str, timeout: float = 60) -> str:
        return self.run("shell", *args, timeout=timeout)

    def wait_for_boot(self, timeout_s: float) -> bool:
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            try:
                if (
                    self.shell("getprop", "sys.boot_completed", timeout=10).strip()
                    == "1"
                ):
                    return True
            except subprocess.TimeoutExpired:
                pass
            time.sleep(5)
        return False

    def wait_until_settled(
        self, cores: int, timeout_s: float, poll_s: float = 15
    ) -> tuple[bool, float | None]:
        """Boot completing is not the device being usable: package optimisation
        and Play services keep a small device saturated for minutes after, and
        a cell run then measures that rather than the widget."""
        deadline = time.monotonic() + timeout_s
        load = None
        while time.monotonic() < deadline:
            try:
                load = one_minute_load(self.shell("cat", "/proc/loadavg", timeout=30))
            except subprocess.TimeoutExpired:
                load = None
            if settled(load, cores):
                return True, load
            time.sleep(poll_s)
        return False, load

    def ui_dump(self) -> str:
        self.shell("uiautomator", "dump", "/sdcard/ui.xml", timeout=60)
        return self.shell("cat", "/sdcard/ui.xml", timeout=30)

    def wait_for_checkbox(self, timeout_s: float, checked: bool) -> Checkbox | None:
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            try:
                dump = self.ui_dump()
            except subprocess.TimeoutExpired:
                dump = ""
            wait_button = system_dialog_wait_button(dump)
            if wait_button:
                self.shell("input", "tap", str(wait_button[0]), str(wait_button[1]))
                self.dismissed_dialogs += 1
                continue
            box = find_checkbox(dump)
            if box and (box.checked or not checked):
                return box
            time.sleep(1)
        return None

    def alive(self) -> bool:
        return bool(self.shell("pidof", PACKAGE).strip())


def run_cell(device: Device, hardware: Hardware, network: str) -> CellResult:
    result = CellResult(hardware=hardware.name, network=network)
    dialogs_before = device.dismissed_dialogs
    try:
        _measure_cell(device, network, result)
    finally:
        result.system_dialogs = device.dismissed_dialogs - dialogs_before
    return result


def _measure_cell(device: Device, network: str, result: CellResult) -> None:
    device.run("emu", "network", "speed", network)
    device.run("emu", "network", "delay", "none" if network == "full" else network)
    device.shell("am", "force-stop", PACKAGE)
    device.run("logcat", "-c")

    started = time.monotonic()
    result.launch_ms = launch_total_ms(
        device.shell("am", "start", "-W", "-n", ACTIVITY, timeout=LAUNCH_TIMEOUT_S)
    )
    box = device.wait_for_checkbox(WIDGET_TIMEOUT_S, checked=False)
    if not box:
        result.error = "widget never appeared"
        return
    result.widget_ready_ms = int((time.monotonic() - started) * 1000)

    solve_started = time.monotonic()
    device.shell("input", "tap", str(box.x), str(box.y))
    if device.wait_for_checkbox(SOLVE_WINDOW_S, checked=True):
        result.solve_ms = int((time.monotonic() - solve_started) * 1000)

    device.shell("am", "send-trim-memory", PACKAGE, "RUNNING_CRITICAL")
    time.sleep(3)
    result.survived_trim = device.alive()

    device.shell("input", "keyevent", "KEYCODE_HOME")
    device.shell("am", "kill", PACKAGE)
    device.shell("am", "start", "-W", "-n", ACTIVITY, timeout=LAUNCH_TIMEOUT_S)
    result.recovered_after_kill = (
        device.wait_for_checkbox(WIDGET_TIMEOUT_S, checked=False) is not None
    )

    result.crashes = crashes_in(device.run("logcat", "-d", "-b", "crash", "-b", "main"))


def run_hardware(args: argparse.Namespace, hardware: Hardware) -> list[CellResult]:
    serial = f"emulator-{args.port}"
    device = Device(args.adb, serial)
    unit = f"{args.avd}-{hardware.name}"
    argv = cpu_capped(
        emulator_argv(args.emulator, args.avd, hardware, args.port),
        hardware.cpu_quota_pct,
        unit,
    )
    log("emulator.start", hardware=hardware.name, argv=argv)
    boot_started = time.monotonic()
    emulator_log = open(args.out_dir / f"emulator-{hardware.name}.log", "w")
    emulator = subprocess.Popen(
        argv, stdout=emulator_log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL
    )
    try:
        subprocess.run(
            [args.adb, "-s", serial, "wait-for-device"], timeout=600, check=False
        )
        if not device.wait_for_boot(args.boot_timeout):
            log("emulator.boot_timeout", hardware=hardware.name)
            return [
                CellResult(hardware=hardware.name, network=n, error="boot timed out")
                for n in args.networks
            ]
        log(
            "emulator.booted",
            hardware=hardware.name,
            boot_s=round(time.monotonic() - boot_started),
        )
        settle_started = time.monotonic()
        is_settled, load = device.wait_until_settled(
            hardware.cores, args.settle_timeout
        )
        log(
            "emulator.settled" if is_settled else "emulator.never_settled",
            hardware=hardware.name,
            settle_s=round(time.monotonic() - settle_started),
            load=load,
        )
        device.run("install", "-r", str(args.apk), timeout=300)
        results = []
        for network in args.networks:
            log("cell.start", hardware=hardware.name, network=network)
            try:
                result = run_cell(device, hardware, network)
            except subprocess.TimeoutExpired as exc:
                result = CellResult(
                    hardware=hardware.name,
                    network=network,
                    error=f"adb timed out: {exc.cmd}",
                )
            log("cell.done", **dataclasses.asdict(result), verdict=verdict(result))
            results.append(result)
        return results
    finally:
        subprocess.run(
            [args.adb, "-s", serial, "emu", "kill"],
            timeout=30,
            check=False,
            capture_output=True,
        )
        try:
            emulator.wait(timeout=60)
        except subprocess.TimeoutExpired:
            emulator.kill()
        emulator_log.close()


def parse_args(argv: list[str]) -> argparse.Namespace:
    sdk = Path(os.environ.get("ANDROID_HOME", Path.home() / "Android" / "Sdk"))
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apk", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--avd", default="constrained-phone")
    parser.add_argument("--base-avd", default="Medium_Phone")
    parser.add_argument(
        "--avd-home", type=Path, default=Path.home() / ".android" / "avd"
    )
    parser.add_argument("--port", type=int, default=5590)
    parser.add_argument(
        "--hardware", nargs="+", choices=sorted(HARDWARE), default=list(HARDWARE)
    )
    parser.add_argument(
        "--networks", nargs="+", choices=NETWORKS, default=list(NETWORKS)
    )
    parser.add_argument("--boot-timeout", type=float, default=900)
    parser.add_argument("--settle-timeout", type=float, default=900)
    parser.add_argument("--emulator", default=str(sdk / "emulator" / "emulator"))
    parser.add_argument(
        "--adb", default=shutil.which("adb") or str(sdk / "platform-tools" / "adb")
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    ensure_avd(args.avd_home, args.avd, args.base_avd)
    failed = 0
    for name in args.hardware:
        for result in run_hardware(args, HARDWARE[name]):
            outcome = verdict(result)
            failed += outcome == "failed"
            print(
                json.dumps({**dataclasses.asdict(result), "verdict": outcome}),
                flush=True,
            )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
