# Tiefen-Dateien für ein Startbild (Aufruf über rechnen.sh). Kommentare im Filter auf Englisch.
# Pipeline v3 (homepage): photo + raw depth  ->  files for a 2-layer 3D mesh that reuses the page's own <img> as the photo.
#   maske.png      matte of the front layer (soft edges), lossless
#   rand.webp      edge colours (transparent overlay): at silhouettes the pure colour of the near object, carried outward
#   dahinter.webp  what lies behind (transparent overlay): only where something near has to be replaced by the surface behind it
#   netz.png       mesh depths (front layer + layer behind)
# The overlays are small (the photo itself is not in them). In the browser:  front = photo under rand, cut by maske;
# behind = photo under dahinter.
import sys, os, cv2, numpy as np
src, out = sys.argv[1], sys.argv[2]
NX, R = 208, 56                    # mesh grid, reach of the fill (half-res px)
S2 = 0.6                            # size of the two overlays relative to the working size (they hold no fine detail)
BW = 0.05                           # mirror fill: depth step that separates surfaces behind
REACH = 48                          # mirror fill: largest shift between near and far on the page (half-res px; strength 80 %, whole swipe)
JUMP, RIM = 0.10, 21                         # depth step that counts as a real edge; width of the hidden rim outside it (px)
img = cv2.imread(src + '/clean.png'); H, W = img.shape[:2]
NY = min(int(round(NX * H / W)), 65535 // NX)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
raw = np.clip(np.load(src + '/depth_raw.npy').astype(np.float32), 0, 1)
# depth curve: spread middle and far, hold the nearest things back (no "runaway" foreground)
dr = np.tanh(1.3 * raw ** 0.65) / np.tanh(1.3)
q0 = float(np.quantile(dr, 0.05)); dr = np.clip((dr - q0) / (1 - q0), 0, 1)   # the far background sits at 0, so it stays put
dr = cv2.GaussianBlur(dr, (0, 0), 1.0)
hw, hh = W // 2, H // 2
ds = cv2.resize(dr, (hw, hh), interpolation=cv2.INTER_AREA)
ph = cv2.resize(img, (hw, hh), interpolation=cv2.INTER_AREA).astype(np.float32)
E = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))

# --- depth edges: "foot" = calm far side right next to a jump
foot = ((ds - cv2.erode(ds, E(4))) < 0.02) & ((cv2.dilate(ds, E(6)) - ds) > JUMP)
gy, gx = np.gradient(cv2.GaussianBlur(ds, (0, 0), 1.0))
calm = ((np.hypot(gx, gy) < 0.01) & ((ds - cv2.erode(ds, E(6))) < 0.03)).astype(np.float32)
farcol = cv2.GaussianBlur(ph * calm[..., None], (0, 0), 3.0) / np.maximum(cv2.GaussianBlur(calm, (0, 0), 3.0), 1e-4)[..., None]
# for every pixel: the nearest foot that is clearly farther than the pixel itself = the surface behind it
Lv = 40
near = np.zeros((hh, hw), bool); lo = ds.copy(); fill0 = ph.copy()
d2 = np.zeros((hh, hw), np.float32)                     # distance of each hidden pixel to the edge
jp = np.clip(np.floor((ds - JUMP) * Lv).astype(int), 0, Lv)
for j in range(1, Lv + 1):
    cand = foot & (ds < j / Lv); sel = jp == j
    if not cand.any() or not sel.any(): continue
    dist, lab = cv2.distanceTransformWithLabels((~cand).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    l_lo = np.zeros(lab.max() + 1, np.float32); l_c = np.zeros((lab.max() + 1, 3), np.float32)
    l_lo[lab[cand]] = ds[cand]; l_c[lab[cand]] = farcol[cand]
    hit = sel & (dist <= R)
    near[hit] = True; lo[hit] = l_lo[lab[hit]]; fill0[hit] = l_c[lab[hit]]
    d2[hit] = dist[hit]
M0 = near.astype(np.float32)
den = np.maximum(cv2.GaussianBlur(M0, (0, 0), 5.0), 1e-4)
fill = cv2.GaussianBlur(fill0 * M0[..., None], (0, 0), 5.0) / den[..., None]
lo_s = cv2.GaussianBlur(lo * M0, (0, 0), 5.0) / den

# --- better fill (texture and grain instead of a blur), along the direction of motion. On the homepage the layers only move
#     up and down, so what a near thing uncovers lies straight above or below its edge. A hidden pixel therefore takes the
#     colour of the surface behind in its own column, mirrored across the first clean pixel above (or below) the near thing:
#     continuous at the edge, upright lines run on, grain and texture stay, nothing can be invented. Pixels further than REACH
#     from an upper or lower edge are never uncovered; they keep the soft colour from above (it only shows through soft rims).
clean = (cv2.dilate(ds, E(3)) - ds) < JUMP                     # surface pixels without the soft edge of something nearer
rows = np.repeat(np.arange(hh, dtype=np.float32)[:, None], hw, axis=1)
cols = np.repeat(np.arange(hw)[None, :], hh, axis=0)
bins = np.floor((ds - JUMP) / BW).astype(int)                   # "clearly farther than the pixel itself", in steps
num = np.zeros((hh, hw, 3), np.float32); wsum = np.zeros((hh, hw), np.float32); dv = np.full((hh, hw), 1e6, np.float32); lo_n = np.zeros((hh, hw), np.float32)
for j in np.unique(bins[near]) if near.any() else []:
    ok = clean & (ds <= j * BW)
    sel = near & (bins == j)
    for sgn in (-1, 1):                                        # -1: the edge above, +1: the edge below
        if sgn < 0: edge = np.maximum.accumulate(np.where(ok, rows, -1e6), axis=0)
        else: edge = np.minimum.accumulate(np.where(ok, rows, 1e6)[::-1], axis=0)[::-1]
        e = edge[sel]; has = np.abs(e) < 1e5; r0 = rows[sel]; c0 = cols[sel]
        dist_v = np.abs(r0 - e)
        m_row = 2 * e - r0                                     # mirror image of the pixel across the edge
        m_ok = has & (m_row >= 0) & (m_row <= hh - 1)
        m_ok &= ok[np.clip(m_row, 0, hh - 1).astype(int), c0]
        src = np.where(m_ok, m_row, e)                         # no mirror image there: repeat the edge pixel
        w = np.where(has, 1.0 / (dist_v + 1.0) ** 4, 0.0).astype(np.float32)
        colr = ph[np.clip(src, 0, hh - 1).astype(int), c0]
        num[sel] += colr * w[:, None]; wsum[sel] += w
        lo_n[sel] += ds[np.clip(e, 0, hh - 1).astype(int), c0] * w   # depth of that surface
        dv[sel] = np.minimum(dv[sel], np.where(has, dist_v, 1e6))
vert = num / np.maximum(wsum, 1e-12)[..., None]
A = (near & (wsum > 0) & (dv <= REACH)).astype(np.float32)       # uncovered at all = at most REACH px straight below / above an edge
Wv = np.clip(cv2.GaussianBlur(A, (0, 0), 1.5) * 2.0 - 0.5, 0, 1) * (wsum > 0)
fill_soft = fill
fill = fill_soft * (1 - Wv[..., None]) + vert * Wv[..., None]
lo = lo * (1 - Wv) + lo_n / np.maximum(wsum, 1e-12) * Wv        # the surface behind is the one above / below
lo_s = cv2.GaussianBlur(lo * M0, (0, 0), 5.0) / den
fill = cv2.GaussianBlur(fill, (0, 0), 0.5)
print('  mirror fill covers %.0f%% of the near bands' % (100.0 * Wv[near].mean() if near.any() else 0))

# --- full-res rim: far-side pixels that have something clearly nearer within RIM px (measured locally, per pixel)
d_out = np.full((H, W), 99.0, np.float32)
for r in range(RIM, 0, -1):
    d_out[(cv2.dilate(dr, E(r)) - dr) > JUMP] = r               # ends up as the distance to the nearer thing
band = d_out <= RIM
ss = lambda a, b, x: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))
S = (~(band & (d_out <= 14))).astype(np.float32)               # 1 = object side, 0 = just outside a silhouette
gf = np.clip(cv2.ximgproc.guidedFilter(gray, S, 6, 2e-3), 0, 1)
obj = np.clip(gf * 1.4, 0, 1) * (1 - ss(5.0, 8.5, d_out))      # soft object edge, gone 8 px outside
up = lambda a, i=cv2.INTER_NEAREST: cv2.resize(a, (W, H), interpolation=i)
fill_u = cv2.resize(fill, (W, H), interpolation=cv2.INTER_CUBIC)            # colour of the surface behind (F)
fill_ok = up(den, cv2.INTER_LINEAR) > 0.02
imgf = img.astype(np.float32)

# --- clean edges: at a silhouette every pixel is a mix of the near object (N) and what is behind (F).
#     Give the front layer the pure near colour and the true mix as transparency, so the edge
#     can sit on top of anything without dragging a dark or bright fringe along.
inside = (dr - cv2.erode(dr, E(2))) > JUMP                                  # last 2 px inside a silhouette
rim = band & (d_out <= 8)                                                   # first 8 px outside
zone = rim | inside
valid = ~band & ~((dr - cv2.erode(dr, E(4))) > JUMP)                        # safely inside an object (or far from any edge)
_, lab = cv2.distanceTransformWithLabels((~valid).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
lutc = np.zeros((lab.max() + 1, 3), np.float32); lutc[lab[valid]] = imgf[valid]
Ncol = cv2.GaussianBlur(lutc[lab], (0, 0), 1.2)                             # near colour carried outward
nf = Ncol - fill_u
contrast = np.abs(nf).mean(axis=2)
a_mix = np.clip(((imgf - fill_u) * nf).sum(axis=2) / np.maximum((nf * nf).sum(axis=2), 1.0), 0, 1)
use = (contrast > 18) & fill_ok
a_zone = np.where(use, np.where(inside, np.maximum(a_mix, 0.5), a_mix), np.where(inside, 1.0, obj))
a_zone = cv2.GaussianBlur(a_zone.astype(np.float32), (0, 0), 0.7) * np.where(band, 1 - ss(6.5, 9.0, d_out), 1.0)
alpha = np.where(zone, a_zone, np.where(band, 0.0, 1.0))
alpha = np.where(band, np.maximum(alpha, ss(RIM - 2.0, RIM + 0.0, d_out)), alpha).astype(np.float32)
cv2.imwrite(out + '/maske.png', np.round(alpha * 255).astype(np.uint8), [cv2.IMWRITE_PNG_COMPRESSION, 9])
zw = cv2.GaussianBlur(zone.astype(np.float32), (0, 0), 0.8)[..., None]
front = np.clip(imgf * (1 - zw) + Ncol * zw, 0, 255).astype(np.uint8)
def overlay(name, col, a, q):                                   # transparent overlay: colour where a > 0, small size
    sw, sh = int(round(W * S2)), int(round(H * S2))
    a2 = cv2.resize(a.astype(np.float32), (sw, sh), interpolation=cv2.INTER_AREA)
    pm = cv2.resize((col * a[..., None]).astype(np.float32), (sw, sh), interpolation=cv2.INTER_AREA)
    a2[a2 < 1.5 / 255] = 0
    rgb = np.clip(pm / np.maximum(a2, 1e-3)[..., None], 0, 255) * (a2 > 0)[..., None]
    bgra = np.dstack([np.round(rgb), np.round(a2 * 255)]).astype(np.uint8)
    cv2.imwrite(out + '/' + name, bgra, [cv2.IMWRITE_WEBP_QUALITY, q])
overlay('rand.webp', Ncol, zw[..., 0], 84)


# --- full-res plate: the photo, with everything near an edge replaced by what lies behind it.
#     The rim keeps its own pixels (it is the "behind" for the edge next to it), except the first
#     pixels outside the silhouette, which still carry the near object's soft edge.
near_u = cv2.GaussianBlur(up(M0, cv2.INTER_LINEAR), (0, 0), 3.0)
near_edge = ((dr - cv2.erode(dr, E(9))) > JUMP).astype(np.float32)
m = np.where(band, 0.0, np.maximum(near_u, near_edge)).astype(np.float32)
m = np.maximum(m, (rim & fill_ok).astype(np.float32))
m = cv2.GaussianBlur(m, (0, 0), 1.0)
plate = np.clip(imgf * (1 - m[..., None]) + fill_u * m[..., None], 0, 255).astype(np.uint8)
overlay('dahinter.webp', fill_u, m, 82)
cv2.imwrite(out + '/plate_view.jpg', plate, [cv2.IMWRITE_JPEG_QUALITY, 88])          # only to look at
cv2.imwrite(out + '/front_view.jpg', front, [cv2.IMWRITE_JPEG_QUALITY, 88])

# --- mesh depths (half-res maps, then sampled on the grid)
dF = cv2.dilate(ds, E(7))                                       # front layer reaches a little past every silhouette
band_h = cv2.resize(band.astype(np.float32), (hw, hh), interpolation=cv2.INTER_AREA) > 0.25
dBh = ds.copy(); dBh[near] = lo_s[near]
dBh[band_h] = cv2.erode(ds, E(2))[band_h]                       # rim: its own depth, without the neighbour's slope
dB = cv2.GaussianBlur(dBh, (0, 0), 1.0)
u = np.linspace(0, 1, NX, dtype=np.float32) * hw - 0.5
v = np.linspace(0, 1, NY, dtype=np.float32) * hh - 0.5
mx, my = np.meshgrid(np.clip(u, 0, hw - 1), np.clip(v, 0, hh - 1))
gF = cv2.remap(dF, mx, my, cv2.INTER_LINEAR); gB = cv2.remap(dB, mx, my, cv2.INTER_LINEAR)
gB = np.minimum(gB, gF)
q = np.round(np.clip(gF, 0, 1) * 65535).astype(np.uint32)
mesh = np.zeros((NY, NX, 3), np.uint8)                          # BGR on disk -> R,G = front depth (16 bit), B = depth behind
mesh[..., 2] = q >> 8; mesh[..., 1] = q & 255; mesh[..., 0] = np.round(np.clip(gB, 0, 1) * 255)
cv2.imwrite(out + '/netz.png', mesh, [cv2.IMWRITE_PNG_COMPRESSION, 9])
def vis(a): return cv2.applyColorMap((np.clip(a, 0, 1) * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
h2 = lambda a: cv2.resize(a, (hw, hh), interpolation=cv2.INTER_AREA)
panel = np.hstack([h2(img), h2(plate), cv2.cvtColor(h2((alpha * 255).astype(np.uint8)), cv2.COLOR_GRAY2BGR), vis(cv2.resize(dF, (hw, hh))), vis(cv2.resize(dB, (hw, hh)))])
cv2.imwrite(out + '/panel.jpg', cv2.resize(panel, None, fx=0.6, fy=0.6, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 85])
np.save(out + '/dr.npy', dr)
for f in ['rand.webp', 'dahinter.webp', 'maske.png', 'netz.png']: print(f, os.path.getsize(out + '/' + f) // 1024, 'KB')
print('grid', NX, NY, 'image', W, H, 'depth quantiles', np.round(np.quantile(dr, [0.05, 0.25, 0.5, 0.75, 0.95]), 2))
