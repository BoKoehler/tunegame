import numpy as np, json
exec(open('gen.py').read().split("truth = {}")[0])
truth = json.load(open('truth.json'))
def saw_bass(f, dur, amp=0.6):
    t = np.arange(int(dur*SR))/SR
    ph = (f*t) % 1.0
    x = 2*ph - 1
    # crude lowpass
    y = np.zeros_like(x); a = 0.08; z = 0
    for i in range(len(x)): z += a*(x[i]-z); y[i] = z
    sub = np.sin(2*np.pi*f/2*t)
    return (y*0.8 + sub*0.7)*np.minimum(1, t/0.004)*np.exp(-t*6)*amp
def ohat(n=0.25):
    t = np.arange(int(n*SR))/SR
    x = rng.standard_normal(len(t)); x = np.diff(np.concatenate([[0], x]))
    return x*np.exp(-t*12)*0.35
# techno 126: kick on beats, bass + open hat on offbeats, no clap; break + drop
bpm = 126; beat = 60/bpm; bars = 48; off = 0.15
b = np.zeros(int((bars*4*beat + 2)*SR))
roots = [55, 55, 49, 65.4]
for bar in range(bars):
    sec = 'intro' if bar < 8 else 'main' if bar < 24 else 'break' if bar < 32 else 'main'
    for q in range(4):
        t = off + (bar*4+q)*beat
        if sec != 'break': place(b, kick()*0.9, t)
        if sec == "main": place(b, saw_bass(roots[bar%4]*2, beat*0.45, 0.45), t + beat/2)
        place(b, ohat()*(0.6 if sec != "break" else 0.3), t + beat/2)
        place(b, hat()*0.5, t + beat/4); place(b, hat()*0.5, t + 3*beat/4)
        if sec == 'break': place(b, tone(roots[bar%4]*4, beat*0.9, 0.15), t)
write('techno126.wav', b); truth['techno126'] = dict(bpm=126, first=off, drops=[off+8*4*beat, off+32*4*beat])
json.dump(truth, open('truth.json', 'w')); print('ok')
