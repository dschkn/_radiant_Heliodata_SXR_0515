#!/usr/bin/env python3
import json, pathlib, re, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
errors = []
patch_path = ROOT / "Radiant_Heliodata_SXR_0515.maxpat"
try:
    patch = json.loads(patch_path.read_text(encoding="utf-8"))["patcher"]
except Exception as exc:
    raise SystemExit("Invalid maxpat JSON: %s" % exc)
boxes = {item["box"]["id"]: item["box"] for item in patch.get("boxes", [])}
for item in patch.get("lines", []):
    line = item["patchline"]
    for endpoint in (line["source"][0], line["destination"][0]):
        if endpoint not in boxes:
            errors.append("Patchline references missing object: " + endpoint)
for ident, box in boxes.items():
    text = box.get("text", "")
    if re.search(r"(^|\s)(hip~|cross~)(\s|$)", text):
        errors.append("Forbidden external/compatibility object in %s: %s" % (ident, text))
if not any(box.get("maxclass") == "ezdac~" for box in boxes.values()):
    errors.append("No ezdac~ found")
if not any(box.get("text") == "js flare_engine.js" for box in boxes.values()):
    errors.append("No flare_engine.js object found")
try:
    data = json.loads((ROOT / "data" / "flare_events_2026-05-15_2026-07-15.json").read_text(encoding="utf-8"))
    if not data.get("events"):
        errors.append("Dataset has no events")
except Exception as exc:
    errors.append("Invalid dataset JSON: %s" % exc)
try:
    subprocess.run(["node", "--check", str(ROOT / "flare_engine.js")], check=True, capture_output=True, text=True)
except FileNotFoundError:
    print("node not installed: skipped JavaScript syntax check")
except subprocess.CalledProcessError as exc:
    errors.append("JavaScript syntax error: " + (exc.stderr or exc.stdout))
if errors:
    print("PROJECT VALIDATION FAILED")
    for error in errors:
        print("- " + error)
    sys.exit(1)
print("PROJECT VALIDATION PASSED")
print("objects:", len(boxes))
print("patchlines:", len(patch.get("lines", [])))
print("events:", len(data["events"]))
