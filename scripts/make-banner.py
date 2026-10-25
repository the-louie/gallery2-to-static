#!/usr/bin/env python3
"""make-banner.py <photo.jpg> <outdir> [--text "LÄS MER"] [--focus 0.5]

A banner in the style of lanbilder.se's 2013 DreamHack banner (468x60: purple-lit crowd photo,
wordmark left, white rounded box with bold black text right), for https://glitched.se/sv/.
Sizes: 970x90, 728x90, 468x60, each at 1x and 2x, JPEG quality 90. --focus is the vertical centre of
the crop (0 top .. 1 bottom).
"""
import sys, argparse, os, subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

def font_file(pattern: str, fallback: str) -> str:
    """The font file fontconfig picks for the pattern (Roboto Black / Roboto Condensed Bold here)."""
    try:
        f = subprocess.run(['fc-match', '-f', '%{file}', pattern], capture_output=True, text=True).stdout.strip()
        return f or fallback
    except OSError:
        return fallback

ROBOTO_BLACK = font_file('Roboto:black', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
ROBOTO_COND = font_file('Roboto Condensed:bold', ROBOTO_BLACK)
ROBOTO_BOLD = font_file('Roboto:bold', ROBOTO_BLACK)

PURPLE = (84, 40, 150)


def cover(photo: Image.Image, w: int, h: int, focus: float) -> Image.Image:
    """Scale the photo to cover w x h and crop around the vertical focus."""
    r = max(w / photo.width, h / photo.height)
    im = photo.resize((round(photo.width * r), round(photo.height * r)), Image.LANCZOS)
    left = (im.width - w) // 2
    top = min(max(round(im.height * focus - h / 2), 0), im.height - h)
    return im.crop((left, top, left + w, top + h))


def tint(im: Image.Image) -> Image.Image:
    """The 2013 look: darker, more contrast, a purple cast, slightly soft."""
    im = ImageEnhance.Brightness(im).enhance(0.72)
    im = ImageEnhance.Contrast(im).enhance(1.25)
    im = ImageEnhance.Color(im).enhance(1.15)
    overlay = Image.new('RGB', im.size, PURPLE)
    im = Image.blend(im, overlay, 0.32)
    return im.filter(ImageFilter.GaussianBlur(0.6))


def wordmark(draw: ImageDraw.ImageDraw, x: int, cy: int, h: int, scale: float):
    """GLITCHED in heavy caps with a small 'glitch': cyan/magenta copies offset by a few pixels."""
    size = round(h * 0.56)
    font = ImageFont.truetype(ROBOTO_BLACK, size)
    text = 'GLITCHED'
    bbox = draw.textbbox((0, 0), text, font=font)
    y = cy - (bbox[3] - bbox[1]) / 2 - bbox[1]
    off = max(1, round(2 * scale))
    draw.text((x + off, y - off), text, font=font, fill=(0, 230, 255))
    draw.text((x - off, y + off), text, font=font, fill=(255, 40, 160))
    draw.text((x, y), text, font=font, fill=(255, 255, 255))
    sub = ImageFont.truetype(ROBOTO_BOLD, max(8, round(h * 0.17)))
    draw.text((x + 1, y + (bbox[3] - bbox[1]) + off + round(4 * scale)), 'glitched.se', font=sub, fill=(220, 220, 235))
    return bbox[2] - bbox[0]


def button(draw: ImageDraw.ImageDraw, right: int, cy: int, h: int, label: str, scale: float):
    font = ImageFont.truetype(ROBOTO_COND, round(h * 0.46))
    pad_x = round(h * 0.2)
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    bh = round(h * 0.64)
    bw = tw + 2 * pad_x
    x0, y0 = right - bw, cy - bh // 2
    draw.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=round(h * 0.12), fill=(255, 255, 255))
    draw.text((x0 + pad_x - bbox[0], y0 + (bh - th) / 2 - bbox[1]), label, font=font, fill=(10, 10, 10))


def make(photo: Image.Image, w: int, h: int, scale: float, label: str, focus: float) -> Image.Image:
    W, H = round(w * scale), round(h * scale)
    im = tint(cover(photo, W, H, focus))
    # darken the left end for the wordmark and the right end for the button
    grad = Image.new('L', (W, 1))
    for x in range(W):
        t = x / W
        v = 110 if t < 0.28 else (60 if t > 0.78 else 0)
        grad.putpixel((x, 0), v)
    grad = grad.resize((W, H)).filter(ImageFilter.GaussianBlur(W * 0.04))
    im = Image.composite(Image.new('RGB', (W, H), (12, 6, 26)), im, grad)
    draw = ImageDraw.Draw(im)
    margin = round(H * 0.18)
    wordmark(draw, margin, H // 2 - round(H * 0.1), H, scale)
    button(draw, W - margin, H // 2, H, label, scale)
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('photo'); ap.add_argument('outdir')
    ap.add_argument('--text', default='LÄS MER'); ap.add_argument('--focus', type=float, default=0.5)
    ap.add_argument('--name', default='glitched')
    a = ap.parse_args()
    os.makedirs(a.outdir, exist_ok=True)
    photo = Image.open(a.photo).convert('RGB')
    for w, h in ((970, 90), (728, 90), (468, 60)):
        for scale in (1, 2):
            im = make(photo, w, h, scale, a.text, a.focus)
            suffix = '' if scale == 1 else '@2x'
            out = os.path.join(a.outdir, f'{a.name}-{w}x{h}{suffix}.jpg')
            im.save(out, quality=90, optimize=True, progressive=True)
            print(out, im.size, os.path.getsize(out), 'bytes')


if __name__ == '__main__':
    main()
