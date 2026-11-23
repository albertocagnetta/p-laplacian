# Phase towers

Open this directory over HTTPS for camera AR or open `preview.html` for the rotatable 3D scene. The camera can recognize the phase-plane figure in `assets/phase-target.pdf` and the flow figure in `../target.png`. The two targets have indices 1 and 0, respectively.

The target lies in the vertical plane. The phase-plane bases extend in front of it, and the level τ/(T−τ) increases up the poster. Both viewers use the same transformation in `towers.js`.

Run `python modello_torri.py` from `model/` with NumPy and SciPy to regenerate the orbit data. The TikZ source for the provisional target is in the same directory. If the printed figure changes, compile the flow target followed by the updated phase target into `assets/targets.mind`.

The third-party libraries and their licenses are in `vendor/`.
