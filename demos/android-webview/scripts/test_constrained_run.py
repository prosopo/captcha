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

import dataclasses
import tempfile
import unittest
from pathlib import Path

from constrained_run import (
    HARDWARE,
    CellResult,
    Checkbox,
    Device,
    avd_config,
    cpu_capped,
    crashes_in,
    emulator_argv,
    ensure_avd,
    find_checkbox,
    launch_total_ms,
    one_minute_load,
    parse_args,
    settled,
    system_dialog_wait_button,
    verdict,
)

UI_DUMP = """<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy rotation="0">
  <node class="android.widget.FrameLayout" bounds="[0,0][1080,2400]">
    <node class="android.webkit.WebView" bounds="[0,100][1080,2400]">
      <node class="android.widget.EditText" bounds="[10,200][1070,280]" checked="false"/>
      <node class="android.widget.CheckBox" bounds="[100,600][160,660]" checked="{checked}"/>
    </node>
  </node>
</hierarchy>"""

BASE_CONFIG = """AvdId=Medium_Phone_API_36.1
avd.ini.displayname=Medium Phone API 36.1
hw.cpu.ncore=4
hw.ramSize=2048
fastboot.forceFastBoot=yes
image.sysdir.1=system-images/android-36.1/google_apis_playstore/x86_64/
"""


class ArgvTest(unittest.TestCase):
    def test_emulator_gets_the_profiles_ram_and_cores(self) -> None:
        argv = emulator_argv("emulator", "avd", HARDWARE["low"], 5590)

        self.assertEqual(argv[argv.index("-memory") + 1], "1536")
        self.assertEqual(argv[argv.index("-cores") + 1], "1")
        self.assertEqual(argv[argv.index("-port") + 1], "5590")
        self.assertIn("-no-snapshot", argv)

    def test_cpu_cap_wraps_the_command_in_a_quota_scope(self) -> None:
        argv = cpu_capped(["emulator", "-avd", "x"], 50, "unit")

        self.assertEqual(argv[:3], ["systemd-run", "--user", "--scope"])
        self.assertIn("CPUQuota=50%", argv)
        self.assertEqual(argv[argv.index("--") + 1 :], ["emulator", "-avd", "x"])


class AvdTest(unittest.TestCase):
    def test_config_replaces_hardware_and_drops_identity(self) -> None:
        config = avd_config(BASE_CONFIG, 1024, 1)

        self.assertIn("hw.ramSize=1024", config)
        self.assertIn("hw.cpu.ncore=1", config)
        self.assertIn("fastboot.forceFastBoot=no", config)
        self.assertIn("fastboot.forceColdBoot=yes", config)
        self.assertNotIn("AvdId", config)
        self.assertNotIn("2048", config)

    def test_ensure_avd_copies_the_base_once(self) -> None:
        with tempfile.TemporaryDirectory() as home:
            avd_home = Path(home)
            (avd_home / "Base.avd").mkdir()
            (avd_home / "Base.avd" / "config.ini").write_text(BASE_CONFIG)

            ensure_avd(avd_home, "constrained", "Base")
            ini = (avd_home / "constrained.ini").read_text()
            config = (avd_home / "constrained.avd" / "config.ini").read_text()
            (avd_home / "constrained.avd" / "config.ini").write_text("edited")
            ensure_avd(avd_home, "constrained", "Base")

            self.assertIn("target=android-36.1", ini)
            self.assertIn("path.rel=avd/constrained.avd", ini)
            self.assertIn("AvdId=constrained", config)
            self.assertEqual(
                (avd_home / "Base.avd" / "config.ini").read_text(), BASE_CONFIG
            )
            self.assertEqual(
                (avd_home / "constrained.avd" / "config.ini").read_text(), "edited"
            )


class UiDumpTest(unittest.TestCase):
    def test_finds_the_widget_checkbox_centre(self) -> None:
        self.assertEqual(
            find_checkbox(UI_DUMP.format(checked="false")),
            Checkbox(x=130, y=630, checked=False),
        )

    def test_reads_the_checked_state(self) -> None:
        box = find_checkbox(UI_DUMP.format(checked="true"))

        self.assertTrue(box is not None and box.checked)

    def test_no_checkbox_yet(self) -> None:
        self.assertIsNone(
            find_checkbox(
                "<hierarchy><node class='a' bounds='[0,0][1,1]'/></hierarchy>"
            )
        )

    def test_a_truncated_dump_is_not_an_error(self) -> None:
        self.assertIsNone(find_checkbox("<hierarchy><node"))
        self.assertIsNone(find_checkbox(""))


class LogcatTest(unittest.TestCase):
    def test_reports_a_crash_in_the_app(self) -> None:
        logcat = (
            "E AndroidRuntime: FATAL EXCEPTION: main\n"
            "E AndroidRuntime: Process: io.prosopo.procaptcha, PID: 1234\n"
        )

        self.assertEqual(
            crashes_in(logcat), ["E AndroidRuntime: FATAL EXCEPTION: main"]
        )

    def test_reports_an_anr_in_the_app(self) -> None:
        self.assertEqual(
            len(crashes_in("E ActivityManager: ANR in io.prosopo.procaptcha\n")), 1
        )

    def test_ignores_other_apps_crashing(self) -> None:
        logcat = (
            "E AndroidRuntime: FATAL EXCEPTION: main\n"
            "E AndroidRuntime: Process: com.android.systemui, PID: 99\n"
        )

        self.assertEqual(crashes_in(logcat), [])

    def test_reads_launch_time_from_am_start(self) -> None:
        self.assertEqual(
            launch_total_ms("Status: ok\nTotalTime: 1234\nWaitTime: 1300\n"), 1234
        )
        self.assertIsNone(launch_total_ms("Error: Activity not started"))


class SettleTest(unittest.TestCase):
    def test_reads_the_one_minute_load(self) -> None:
        self.assertEqual(one_minute_load("35.65 31.06 16.95 4/812 9012\n"), 35.65)

    def test_unreadable_load_is_none(self) -> None:
        self.assertIsNone(one_minute_load(""))
        self.assertIsNone(one_minute_load("error: device offline"))

    def test_settled_scales_with_cores(self) -> None:
        self.assertFalse(settled(35.65, 1))
        self.assertTrue(settled(1.2, 1))
        self.assertFalse(settled(1.6, 1))
        self.assertTrue(settled(2.5, 2))
        self.assertFalse(settled(None, 4))


class LoadSequenceDevice(Device):
    def __init__(self, loads: list[str]) -> None:
        super().__init__(adb="adb", serial="emulator-0")
        self.loads = loads

    def shell(self, *args: str, timeout: float = 60) -> str:
        return self.loads.pop(0) if self.loads else self.loads_exhausted()

    def loads_exhausted(self) -> str:
        return "9.00 9.00 9.00 1/100 1"


class WaitUntilSettledTest(unittest.TestCase):
    def test_returns_the_load_it_settled_at(self) -> None:
        device = LoadSequenceDevice(["4.00 3 3 1/1 1", "0.80 1 1 1/1 1"])
        self.assertEqual(
            device.wait_until_settled(cores=1, timeout_s=5, poll_s=0), (True, 0.8)
        )

    def test_reports_the_last_load_when_it_never_settles(self) -> None:
        device = LoadSequenceDevice([])
        self.assertEqual(
            device.wait_until_settled(cores=1, timeout_s=0.05, poll_s=0.01),
            (False, 9.0),
        )


ANR_DIALOG_DUMP = """<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy rotation="0">
  <node class="android.widget.FrameLayout" bounds="[0,0][1080,2400]">
    <node text="System UI isn't responding" resource-id="android:id/alertTitle" class="android.widget.TextView" bounds="[133,1032][947,1103]"/>
    <node text="Close app" resource-id="android:id/aerr_close" class="android.widget.Button" bounds="[70,1142][1010,1268]"/>
    <node text="Wait" resource-id="android:id/aerr_wait" class="android.widget.Button" bounds="[70,1268][1010,1394]"/>
  </node>
</hierarchy>"""


class SystemDialogTest(unittest.TestCase):
    def test_finds_the_wait_button_of_a_not_responding_dialog(self) -> None:
        self.assertEqual(system_dialog_wait_button(ANR_DIALOG_DUMP), (540, 1331))

    def test_no_dialog(self) -> None:
        self.assertIsNone(system_dialog_wait_button(UI_DUMP.format(checked="false")))

    def test_a_truncated_dump_is_not_a_dialog(self) -> None:
        self.assertIsNone(system_dialog_wait_button(ANR_DIALOG_DUMP[:200]))


class ScriptedUiDevice(Device):
    def __init__(self, dumps: list[str]) -> None:
        super().__init__(adb="adb", serial="emulator-0")
        self.dumps = dumps
        self.taps: list[tuple[str, str]] = []

    def ui_dump(self) -> str:
        return self.dumps.pop(0) if self.dumps else ""

    def shell(self, *args: str, timeout: float = 60) -> str:
        if args[:2] == ("input", "tap"):
            self.taps.append((args[2], args[3]))
        return ""


class WaitForCheckboxTest(unittest.TestCase):
    def test_dismisses_a_system_dialog_then_finds_the_widget(self) -> None:
        device = ScriptedUiDevice([ANR_DIALOG_DUMP, UI_DUMP.format(checked="false")])

        box = device.wait_for_checkbox(timeout_s=5, checked=False)

        self.assertEqual(box, Checkbox(x=130, y=630, checked=False))
        self.assertEqual(device.taps, [("540", "1331")])
        self.assertEqual(device.dismissed_dialogs, 1)


class VerdictTest(unittest.TestCase):
    def cell(self, **changes: object) -> CellResult:
        base = CellResult(
            hardware="low",
            network="edge",
            solve_ms=1000,
            survived_trim=True,
            recovered_after_kill=True,
        )
        return dataclasses.replace(base, **changes)

    def test_quick_solve_is_ok(self) -> None:
        self.assertEqual(verdict(self.cell()), "ok")

    def test_more_than_half_the_window_is_slow(self) -> None:
        self.assertEqual(verdict(self.cell(solve_ms=40_000)), "slow")

    def test_past_the_window_fails(self) -> None:
        self.assertEqual(verdict(self.cell(solve_ms=61_000)), "failed")

    def test_unsolved_fails(self) -> None:
        self.assertEqual(verdict(self.cell(solve_ms=None)), "failed")

    def test_dying_under_memory_pressure_fails(self) -> None:
        self.assertEqual(verdict(self.cell(survived_trim=False)), "failed")

    def test_not_coming_back_after_a_kill_fails(self) -> None:
        self.assertEqual(verdict(self.cell(recovered_after_kill=False)), "failed")

    def test_a_crash_fails(self) -> None:
        self.assertEqual(verdict(self.cell(crashes=["FATAL EXCEPTION"])), "failed")


class ArgsTest(unittest.TestCase):
    def test_defaults_run_every_profile(self) -> None:
        args = parse_args(["--apk", "app.apk", "--out-dir", "out"])

        self.assertEqual(args.hardware, ["low", "mid"])
        self.assertEqual(args.networks, ["full", "lte", "umts", "edge", "gsm"])

    def test_rejects_an_unknown_network(self) -> None:
        with self.assertRaises(SystemExit):
            parse_args(["--apk", "a", "--out-dir", "o", "--networks", "wifi"])


if __name__ == "__main__":
    unittest.main()
