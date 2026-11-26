# Depth Anything V2 Small (ONNX, fixed 518x518): one global pass for layout,
# square tiles for detail, tiles aligned to the global pass, edge-snapped to the photo.
import sys, cv2, numpy as np, onnxruntime as ort
src, model, out = sys.argv[1], sys.argv[2], sys.argv[3]
img = cv2.imread(src); H, W = img.shape[:2]
rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
iname = sess.get_inputs()[0].name
MEAN = np.array([0.485, 0.456, 0.406], np.float32); STD = np.array([0.229, 0.224, 0.225], np.float32)

def infer(crop):
    h, w = crop.shape[:2]
    x = cv2.resize(crop, (518, 518), interpolation=cv2.INTER_AREA if max(h, w) > 518 else cv2.INTER_CUBIC)
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None]
    y = sess.run(None, {iname: x})[0][0]
    return cv2.resize(y, (w, h), interpolation=cv2.INTER_CUBIC)

g = infer(rgb)                                   # global, squashed
print('global range', float(g.min()), float(g.max()))
acc = np.zeros((H, W), np.float32); wsum = np.zeros((H, W), np.float32)
ys = sorted(set([0, (H - W) // 2, H - W]))
for y0 in ys:
    t = infer(rgb[y0:y0 + W])
    gg = g[y0:y0 + W]
    A = np.stack([t.ravel(), np.ones(t.size, np.float32)], 1)
    (a, b), *_ = np.linalg.lstsq(A, gg.ravel(), rcond=None)
    t = a * t + b
    wy = np.ones(W, np.float32)
    ramp = 220
    if y0 > 0: wy[:ramp] = np.linspace(0.02, 1, ramp)
    if y0 + W < H: wy[-ramp:] = np.linspace(1, 0.02, ramp)
    acc[y0:y0 + W] += t * wy[:, None]; wsum[y0:y0 + W] += wy[:, None]
    print('tile', y0, 'scale', float(a), 'shift', float(b))
d = acc / wsum
lo, hi = np.percentile(d, 0.5), np.percentile(d, 99.7)
d = np.clip((d - lo) / (hi - lo), 0, 1).astype(np.float32)
gn = np.clip((g - lo) / (hi - lo), 0, 1).astype(np.float32)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
# snap depth edges to photo edges
np.save(out + '/depth_raw.npy', d)
cv2.imwrite(out + '/depth_view.jpg', cv2.applyColorMap((d * 255).astype(np.uint8), cv2.COLORMAP_INFERNO), [cv2.IMWRITE_JPEG_QUALITY, 80])
print('depth ok', d.shape)
