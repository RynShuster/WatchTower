import os
import random
from datetime import datetime, timedelta

BASE_DIR = r"c:\Users\RynShuster\OneDrive - Hadrian Automation\Documents\HMDB\Dev\WatchtowerV0.1\testData\BallBar\synthBallbarData"
SERIAL = "TEST-42069"
FILES_PER_PLANE = 16

PLANES = [
    ("XY", "X", "Y"),
    ("XZ", "X", "Z"),
    ("YZ", "Y", "Z"),
]

random.seed(42069)
os.makedirs(BASE_DIR, exist_ok=True)


def ts(dt: datetime) -> str:
    return dt.strftime("%Y%m%d-%H%M%S")


def build_xml(
    plane: str,
    axis_a: str,
    axis_b: str,
    file_index: int,
    dt_start: datetime,
    dt_end: datetime,
) -> str:
    straight_a_um = round(random.uniform(0.2, 2.8), 1)
    straight_b_um = round(random.uniform(0.2, 2.8), 1)
    circularity_um = round(random.uniform(3.0, 12.0), 1)
    circularity_ccw_mm = circularity_um / 1000.0
    circularity_cw_mm = (circularity_um + random.uniform(0.0, 0.4)) / 1000.0
    feedrate = round(random.uniform(1450, 1550), 1)

    return f"""<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<TEST_DOCUMENT>
  <TEST_SPEC NAME="50mm {plane} 1500" version="2.0">
    <INSTRUMENT MANUFACTURER="Renishaw" MODEL="QC10">
      <DYNAMIC_BALLBAR CALIBRATION_REQUIRED="true">
        <NOMINAL_LENGTH>50</NOMINAL_LENGTH>
        <PROGRAMMED_FEEDRATE>1500</PROGRAMMED_FEEDRATE>
        <PLANE VIEW="+A+B" TEST_PLANE="{plane}">
          <A_AXIS_NAME>{axis_a}</A_AXIS_NAME>
          <B_AXIS_NAME>{axis_b}</B_AXIS_NAME>
        </PLANE>
      </DYNAMIC_BALLBAR>
    </INSTRUMENT>
  </TEST_SPEC>
  <OPERATOR>SYNTHETIC_OP_{file_index:02d}</OPERATOR>
  <DATE_STARTED>{ts(dt_start)}</DATE_STARTED>
  <DATE_COMPLETED>{ts(dt_end)}</DATE_COMPLETED>
  <MACHINE_TESTED NAME="{SERIAL}" />
  <RUN_RESULTS>
    <BALLBAR_RUN>
      <RUN_DIRECTION>CCW</RUN_DIRECTION>
      <FEATURE NAME="AF_CIRCULARITY" DT="UT_LENGTH_MM">{circularity_ccw_mm:.4f}</FEATURE>
      <FEATURE NAME="AF_CALCULATED_FEEDRATE" DT="UT_FEEDRATE">{feedrate:.1f}</FEATURE>
    </BALLBAR_RUN>
    <BALLBAR_RUN>
      <RUN_DIRECTION>CW</RUN_DIRECTION>
      <FEATURE NAME="AF_CIRCULARITY" DT="UT_LENGTH_MM">{circularity_cw_mm:.4f}</FEATURE>
      <FEATURE NAME="AF_CALCULATED_FEEDRATE" DT="UT_FEEDRATE">{feedrate:.1f}</FEATURE>
    </BALLBAR_RUN>
  </RUN_RESULTS>
  <ANALYSIS NAME="RENISHAW_DIAGNOSTICS" version="2.1">
    <FEATURE NAME="AF_STRAIGHTNESS_A" DT="UT_LENGTH_UM">{straight_a_um:.1f}</FEATURE>
    <FEATURE NAME="AF_STRAIGHTNESS_B" DT="UT_LENGTH_UM">{straight_b_um:.1f}</FEATURE>
    <FEATURE NAME="AF_CIRCULARITY" DT="UT_LENGTH_UM">{circularity_um:.1f}</FEATURE>
  </ANALYSIS>
</TEST_DOCUMENT>
"""


def main() -> None:
    start = datetime(2026, 4, 1, 8, 0, 0)
    generated = 0

    for plane, axis_a, axis_b in PLANES:
        for i in range(1, FILES_PER_PLANE + 1):
            dt_start = start + timedelta(minutes=(generated * 5))
            dt_end = dt_start + timedelta(minutes=1)
            content = build_xml(plane, axis_a, axis_b, i, dt_start, dt_end)
            file_name = f"{SERIAL}_{plane}_{i:02d}_{ts(dt_end)}.b5r"
            file_path = os.path.join(BASE_DIR, file_name)
            with open(file_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)
            generated += 1

    print(f"Generated {generated} files in: {BASE_DIR}")


if __name__ == "__main__":
    main()
