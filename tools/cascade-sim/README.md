# Cascade circuit simulator (Phase 0)

Reference model for docs/electrical-model.md. Python 3 + numpy + matplotlib; not loaded by the page.

- `python3 scenarios.py`: five 6-hour runs (pumps only, + radio, + taps, inputs off at 3 h below/above loop gain 1) and the readouts
- `python3 chart.py out.png`: the self-sustain comparison chart (docs/electrical-model-phase0.png)
- `paschen.py`: strike voltages for the stratified gas column
