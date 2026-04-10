from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ID_DIR = ROOT / "ID"
OUTPUT_DIR = ID_DIR / "ballbar-icons"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MAKINO_PATH = ID_DIR / "makino.webp"

CANVAS_SIZE = (32, 32)
NAVY = (0, 37, 72, 255)  # Taken from dominant color in HadrianLogo.png

LOGOS = ("makino", "hermle", "dmg_mori", "dn_solutions")

LABELS = ("F2", "F3", "FX")


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "arialbd.ttf",
        "segoeuib.ttf",
        "bahnschrift.ttf",
        "DejaVuSans-Bold.ttf",
    ]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def make_logo_mark(logo_key: str) -> Image.Image:
    # Larger corner mark for readability.
    mark = Image.new("RGBA", (18, 18), (0, 0, 0, 0))
    draw = ImageDraw.Draw(mark)

    if logo_key == "dn_solutions":
        # Simplified DN Solutions logo: DN only.
        dn_blue = (69, 103, 179, 255)
        draw.text((1, 4), "DN", fill=dn_blue, font=load_font(10))
    elif logo_key == "dmg_mori":
        # Simplified DMG MORI logo: DMG only.
        dmg_black = (26, 24, 30, 255)
        draw.text((0, 5), "DMG", fill=dmg_black, font=load_font(8))
    elif logo_key == "hermle":
        # Simplified HERMLE logo: red/grey ring + H.
        red = (216, 0, 20, 255)
        grey = (158, 163, 168, 255)
        draw.ellipse((0, 0, 17, 17), fill=red)
        draw.ellipse((4, 4, 13, 13), fill=(0, 0, 0, 0))
        draw.rectangle((0, 6, 5, 11), fill=grey)
        draw.text((6, 4), "H", fill=grey, font=load_font(8))
    elif logo_key == "makino":
        # Use shape and M directly from makino.webp:
        # M anchors bottom-right, emblem is slightly offset from it.
        shape, m_letter = extract_makino_shape_and_m()
        mx = mark.width - m_letter.width
        my = mark.height - m_letter.height
        sx = max(0, mx - shape.width + 3)
        sy = max(0, my - shape.height + 1)
        mark.alpha_composite(shape, (sx, sy))
        mark.alpha_composite(m_letter, (mx, my))
    else:
        draw.rectangle((0, 0, 17, 17), outline=NAVY, width=1)

    return mark


def make_icon(label: str, logo_key: str | None = None) -> Image.Image:
    icon = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    font = load_font(12)

    draw.text((2, 1), label, fill=NAVY, font=font)

    if logo_key:
        logo_mark = make_logo_mark(logo_key)
        x = CANVAS_SIZE[0] - logo_mark.width - 1
        y = CANVAS_SIZE[1] - logo_mark.height - 1
        icon.alpha_composite(logo_mark, (x, y))

    return icon


def extract_component(img: Image.Image, bbox: tuple[int, int, int, int]) -> Image.Image:
    part = img.crop(bbox).convert("RGBA")
    alpha = part.split()[3]
    pb = alpha.getbbox()
    if not pb:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    return part.crop(pb)


def connected_components(mask: list[list[bool]]) -> list[tuple[int, tuple[int, int, int, int]]]:
    h = len(mask)
    w = len(mask[0]) if h else 0
    visited = [[False] * w for _ in range(h)]
    comps: list[tuple[int, tuple[int, int, int, int]]] = []

    for y in range(h):
        for x in range(w):
            if not mask[y][x] or visited[y][x]:
                continue

            q = deque([(x, y)])
            visited[y][x] = True
            points = []
            while q:
                cx, cy = q.popleft()
                points.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and mask[ny][nx] and not visited[ny][nx]:
                        visited[ny][nx] = True
                        q.append((nx, ny))

            xs = [p[0] for p in points]
            ys = [p[1] for p in points]
            comps.append((len(points), (min(xs), min(ys), max(xs) + 1, max(ys) + 1)))
    return sorted(comps, reverse=True)


def extract_makino_shape_and_m() -> tuple[Image.Image, Image.Image]:
    src = Image.open(MAKINO_PATH).convert("RGBA")
    w, h = src.size
    px = src.load()

    # Keep dark/blue pixels and drop white background.
    mask = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r > 245 and g > 245 and b > 245:
                px[x, y] = (0, 0, 0, 0)
            else:
                mask[y][x] = True

    comps = connected_components(mask)
    if len(comps) < 2:
        fallback = Image.new("RGBA", (10, 10), (0, 0, 0, 0))
        ImageDraw.Draw(fallback).text((1, 1), "M", fill=(0, 77, 148, 255), font=load_font(8))
        return fallback, fallback

    # Largest component = logo shape at left.
    _, shape_bbox = comps[0]
    shape = extract_component(src, shape_bbox)

    # First significant component to the right = "M".
    sx2 = shape_bbox[2]
    m_bbox = None
    for area, bbox in comps[1:]:
        if area < 300:
            continue
        if bbox[0] >= sx2:
            m_bbox = bbox
            break
    if m_bbox is None:
        m_bbox = comps[1][1]
    m_letter = extract_component(src, m_bbox)

    # Resize for readability in a 32x32 icon corner.
    shape.thumbnail((11, 11), Image.Resampling.LANCZOS)
    m_letter.thumbnail((10, 9), Image.Resampling.LANCZOS)
    return shape, m_letter


def main() -> None:
    # Base set without a corner logo.
    for label in LABELS:
        base = make_icon(label)
        base.save(OUTPUT_DIR / f"ballbar_{label}.ico", format="ICO", sizes=[CANVAS_SIZE])

    # Iterations with simplified logo in bottom-right corner.
    for label in LABELS:
        for logo_key in LOGOS:
            icon = make_icon(label, logo_key=logo_key)
            icon.save(
                OUTPUT_DIR / f"ballbar_{label}_{logo_key}.ico",
                format="ICO",
                sizes=[CANVAS_SIZE],
            )


if __name__ == "__main__":
    main()
