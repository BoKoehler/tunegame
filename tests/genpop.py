import numpy as np, wave, json
SR = 44100; rng = np.random.default_rng(11)
def write(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    st = np.stack([x, x], 1)
    with wave.open(name, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
def place(buf, s, t):
    i = int(round(t * SR)); j = min(len(buf), i + len(s))
    if i < len(buf): buf[i:j] += s[:j - i]
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def tone(m, dur, amp, harm=6, dec=1.2):
    t = np.arange(int(dur * SR)) / SR; f = mtof(m); x = np.zeros_like(t)
    for h in range(1, harm + 1): x += np.sin(2 * np.pi * f * h * t) / h
    return x * amp * np.minimum(1, t / 0.02) * np.exp(-t * dec) * np.minimum(1, (dur - t) / 0.05)
def kick():
    t = np.arange(int(0.35 * SR)) / SR; ph = 2 * np.pi * np.cumsum(50 + 110 * np.exp(-t * 30)) / SR
    return np.sin(ph) * np.exp(-t * 7)
def snare():
    t = np.arange(int(0.2 * SR)) / SR
    return (rng.standard_normal(len(t)) * 0.6 + np.sin(2 * np.pi * 190 * t) * 0.4) * np.exp(-t * 18) * 0.7
def hat(a=0.25):
    t = np.arange(int(0.05 * SR)) / SR; x = np.diff(np.concatenate([[0], rng.standard_normal(len(t))]))
    return x * np.exp(-t * 70) * a
bpm = 100; beat = 60 / bpm; bar = 4 * beat
CH = {'G': [55, 59, 62], 'D': [50, 54, 57], 'Em': [52, 55, 59], 'C': [48, 52, 55], 'Am': [57, 60, 64], 'Bm': [59, 62, 66]}
plan = [('intro', 4, ['G', 'D', 'Em', 'C']), ('verse', 8, ['G', 'D', 'Em', 'C']), ('chorus', 8, ['C', 'D', 'G', 'Em']),
        ('verse', 8, ['G', 'D', 'Em', 'C']), ('chorus', 8, ['C', 'D', 'G', 'Em']), ('bridge', 8, ['Em', 'C', 'Am', 'D']),
        ('chorus', 8, ['C', 'D', 'G', 'Em']), ('outro', 4, ['G', 'D', 'C', 'G'])]
total = sum(p[1] for p in plan); buf = np.zeros(int((total * bar + 3) * SR)); b0 = 0; truth = []
mel = {'verse': [67, 69, 71, 74], 'chorus': [74, 76, 79, 76], 'bridge': [71, 72, 69, 66]}
for name, nb, prog in plan:
    truth.append([name, b0, b0 + nb])
    for k in range(nb):
        t = (b0 + k) * bar; ch = CH[prog[k % 4]]
        loud = {'intro': 0.5, 'verse': 0.7, 'chorus': 1.2, 'bridge': 0.6, 'outro': 0.5}[name]
        for m in ch: place(buf, tone(m + 12, bar, 0.09 * loud, 8, 0.6), t)       # pad
        place(buf, tone(ch[0] - 12, bar * 0.95, 0.28 * loud, 3, 1.0), t)          # bass root
        if name in ('verse', 'chorus', 'bridge'):
            for q in range(4):
                tq = t + q * beat
                if name == 'chorus' or q in (0, 2): place(buf, kick() * (1.0 if name == 'chorus' else 0.7), tq)
                if q in (1, 3) and name != 'bridge': place(buf, snare() * (1.1 if name == 'chorus' else 0.7), tq)
                for e in range(4 if name == 'chorus' else 2): place(buf, hat(0.3 if name == 'chorus' else 0.2), tq + e * beat / (4 if name == 'chorus' else 2))
            ml = mel[name]
            for q in range(4): place(buf, tone(ml[(q + k) % 4] + (12 if name == 'chorus' else 0), beat * 0.9, 0.16 * loud, 5, 2.5), t + q * beat)
    b0 += nb
write('pop100.wav', buf)
tr = json.load(open('truth.json')); tr['pop100'] = {'bpm': 100, 'first': 0.0, 'sections': truth}; json.dump(tr, open('truth.json', 'w'))
print(truth)
