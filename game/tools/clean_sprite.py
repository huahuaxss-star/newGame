#!/usr/bin/env python3
"""清洗逐帧 PNG 并打包成横向 spritesheet。

用途：美术给的透明 PNG 常有白边/半透明毛刺/游离杂点。本脚本：
  1) 丢弃极低 alpha 噪点
  2) 颜色外溢(color-bleed)填充边缘，消除任意背景上的白色描边
  3) 只保留最大连通块（去游离杂点）
  4) 所有帧裁到统一 bbox（跑动循环不抖）
  5) 缩放并拼成横向 spritesheet + 一张静态首帧

依赖：numpy scipy pillow

用法：
  python3 clean_sprite.py <输入目录或文件通配> <输出名前缀> [--height 300]
  例：python3 clean_sprite.py "../../河马跑步8帧_透明PNG/hippo_run_frame_*.png" hippo_run --height 300
输出写到 ../assets/<前缀>.png(spritesheet) 与 ../assets/<前缀>_idle.png
"""
import sys, os, glob, argparse
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def shift(a, dy, dx):
    out = np.zeros_like(a)
    ys, ye = max(0, dy), min(a.shape[0], a.shape[0] + dy)
    xs, xe = max(0, dx), min(a.shape[1], a.shape[1] + dx)
    oy, ox = max(0, -dy), max(0, -dx)
    out[ys:ye, xs:xe] = a[oy:oy + (ye - ys), ox:ox + (xe - xs)]
    return out


def clean(arr):
    rgb = arr[..., :3].copy().astype(np.float64)
    al = arr[..., 3].copy().astype(np.float64)
    al[al < 20] = 0
    known = al >= 180
    for _ in range(10):
        s = np.zeros(rgb.shape); c = np.zeros(al.shape)
        for dy, dx in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]:
            s += shift(rgb * known[..., None], dy, dx); c += shift(known.astype(float), dy, dx)
        fill = (~known) & (c > 0)
        rgb[fill] = s[fill] / c[fill][..., None]; known |= fill
        if known.all(): break
    # 最大连通块，去游离杂点
    m = al > 24
    lbl, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
        keep = int(np.argmax(sizes)) + 1
        al[(lbl != keep) & (lbl != 0)] = 0
    # 收缩实心区 2px 削掉外圈白毛刺，再羽化，得到干净边缘
    eroded = ndimage.binary_erosion(al > 110, iterations=2)
    a2 = np.asarray(Image.fromarray(np.where(eroded, 255, 0).astype(np.uint8))
                    .filter(ImageFilter.GaussianBlur(0.8)), float)
    al = np.minimum(al, a2)
    return np.dstack([rgb, al]).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pattern'); ap.add_argument('prefix'); ap.add_argument('--height', type=int, default=300)
    a = ap.parse_args()
    files = sorted(glob.glob(a.pattern))
    if not files:
        print('no files match', a.pattern); sys.exit(1)
    frames = [clean(np.asarray(Image.open(f).convert('RGBA'))) for f in files]
    union = np.zeros(frames[0].shape[:2], bool)
    for f in frames: union |= f[..., 3] > 16
    ys, xs = np.where(union); pad = 6
    y0 = max(0, ys.min() - pad); x0 = max(0, xs.min() - pad)
    y1 = min(frames[0].shape[0] - 1, ys.max() + pad); x1 = min(frames[0].shape[1] - 1, xs.max() + pad)
    crops = [Image.fromarray(f[y0:y1+1, x0:x1+1]) for f in frames]
    w0, h0 = crops[0].size; th = a.height; tw = round(w0 * th / h0)
    crops = [im.resize((tw, th), Image.LANCZOS) for im in crops]
    out = os.path.join(os.path.dirname(__file__), '..', 'assets')
    os.makedirs(out, exist_ok=True)
    sheet = Image.new('RGBA', (tw * len(crops), th))
    for i, im in enumerate(crops): sheet.paste(im, (i * tw, 0))
    sheet.save(os.path.join(out, f'{a.prefix}.png'))
    crops[0].save(os.path.join(out, f'{a.prefix}_idle.png'))
    print(f'frames={len(crops)} frame_size={tw}x{th} sheet_w={tw*len(crops)}')
    print(f'-> assets/{a.prefix}.png  +  assets/{a.prefix}_idle.png')


if __name__ == '__main__':
    main()
