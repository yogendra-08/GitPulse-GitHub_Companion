"""Generate the GitPulse toolbar/store icons (amber rounded square with a pulse line)."""
from PIL import Image, ImageDraw
import os

ACCENT = (232, 162, 58, 255)
INK = (24, 17, 4, 255)
# Pulse path in a 32x32 design grid
PATH = [(4.5, 17.5), (9.7, 17.5), (12.5, 10), (16.9, 23), (20, 13.5), (21.8, 17.5), (27.5, 17.5)]

def render(size: int) -> Image.Image:
    s = 8  # supersample for smooth edges
    big = size * s
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 7 / 32), fill=ACCENT)
    k = big / 32
    pts = [(x * k, y * k) for x, y in PATH]
    w = max(2, int(2.4 * k))
    d.line(pts, fill=INK, width=w, joint="curve")
    for p in (pts[0], pts[-1]):
        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=INK)
    return img.resize((size, size), Image.LANCZOS)

out = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(out, exist_ok=True)
for n in (16, 32, 48, 128):
    render(n).save(os.path.join(out, f"icon{n}.png"))
print("icons written")
