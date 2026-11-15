import numpy as np, wave, json, sys
SR = 44100
rng = np.random.default_rng(3)
def write(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    st = np.stack([x, x], 1)
    with wave.open(name, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype('<i2').tobytes())
def kick(n=0.35):
    t = np.arange(int(n*SR))/SR
    f = 50 + 120*np.exp(-t*30); ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-t*7)
def hat(n=0.05):
    t = np.arange(int(n*SR))/SR
    x = rng.standard_normal(len(t)); x = np.diff(np.concatenate([[0], x]))
    return x*np.exp(-t*70)*0.3
def snare(n=0.2):
    t = np.arange(int(n*SR))/SR
    return (rng.standard_normal(len(t))*0.6 + np.sin(2*np.pi*190*t)*0.5)*np.exp(-t*20)*0.6
def click(n=0.02):
    t = np.arange(int(n*SR))/SR
    return np.sin(2*np.pi*1500*t)*np.exp(-t*200)
def tone(f, dur, amp=0.2):
    t = np.arange(int(dur*SR))/SR
    return (np.sin(2*np.pi*f*t) + 0.3*np.sin(4*np.pi*f*t))*np.minimum(1, t/0.01)*np.exp(-t*1.5)*amp
def place(buf, s, t):
    i = int(round(t*SR)); j = min(len(buf), i+len(s))
    if i < len(buf): buf[i:j] += s[:j-i]

truth = {}
# 1) click track, 128 BPM, first click at 0.5s, 60s
dur = 60; b = np.zeros(dur*SR); beat = 60/128
times = [0.5 + k*beat for k in range(int((dur-1)/beat))]
for t in times: place(b, click(), t)
write('clicks128.wav', b); truth['clicks128'] = dict(bpm=128, first=0.5)

# 2) EDM-ish 124 BPM: intro (hats+pad) 16 bars, drop at bar 16 w/ kick+bass+snare, breakdown, drop 2
bpm = 124; beat = 60/bpm; bars = 56; dur = bars*4*beat + 2
b = np.zeros(int(dur*SR)); off = 0.3
notes = [220, 174.6, 261.6, 196]
for bar in range(bars):
    sec = 'intro' if bar < 16 else 'drop' if bar < 32 else 'break' if bar < 40 else 'drop'
    for q in range(4):
        t = off + (bar*4 + q)*beat
        if sec == 'drop' or (sec=='intro' and bar >= 8):
            place(b, kick()*(1.0 if sec=='drop' else 0.5), t)
        if sec == 'drop' and q in (1,3): place(b, snare(), t)
        place(b, hat()*(1 if sec!='break' else 0.3), t + beat/2)
        if sec == 'drop':
            place(b, tone(notes[bar%4]/2, beat*0.45, 0.5), t+beat/2)
        place(b, tone(notes[bar%4]*2, beat*0.9, 0.12 if sec != 'drop' else 0.2), t)
write('edm124.wav', b); truth['edm124'] = dict(bpm=124, first=off, drops=[off+16*4*beat, off+40*4*beat])

# 3) swing at 96 BPM: kick 1,3 snare 2,4, hats on triplet 1 and 3 (swung eighths)
bpm = 96; beat = 60/bpm; dur = 50; b = np.zeros(dur*SR); off = 0.2
k = 0
while off + k*beat < dur - 1:
    t = off + k*beat
    place(b, kick() if k%2==0 else snare(), t)
    place(b, hat(), t); place(b, hat()*1.2, t + beat*2/3)
    if k % 4 == 0: place(b, tone([196, 220][(k//4)%2], beat*3, 0.15), t)
    k += 1
write('swing96.wav', b); truth['swing96'] = dict(bpm=96, first=off)

# 4) drifting tempo 100 -> 110 BPM over 60s (live band)
dur = 64; b = np.zeros(dur*SR); t = 0.4; k = 0; bt = []
while t < dur - 1:
    bpm = 100 + 10*(t/dur)
    place(b, kick() if k%2==0 else snare(), t); place(b, hat(), t + 30/bpm)
    bt.append(t); t += 60/bpm; k += 1
write('drift.wav', b); truth['drift'] = dict(beats=bt)

# 5) hip hop 88 BPM with 16th hats
bpm = 88; beat = 60/bpm; dur = 45; b = np.zeros(dur*SR); off = 0.6; k = 0
while off + k*beat < dur - 1:
    t = off + k*beat
    if k % 4 in (0, 2): place(b, kick(), t)
    if k % 4 == 2: place(b, kick()*0.7, t + beat*0.75)
    if k % 4 in (1, 3): place(b, snare(), t)
    for s in range(4): place(b, hat()*(0.6 if s % 2 else 1), t + s*beat/4)
    k += 1
write('hiphop88.wav', b); truth['hiphop88'] = dict(bpm=88, first=off)
json.dump(truth, open('truth.json', 'w'))
print('ok')
