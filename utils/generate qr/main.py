from pathlib import Path

import qrcode
from PIL import Image, ImageDraw


BASE_DIR = Path(__file__).resolve().parent
URL = "https://smartfare.nicolas-dominici.it"
LOGO_PATH = "https://res.cloudinary.com/dxudggkln/image/upload/v1780140804/favicon_qt7k3d.png"
OUTPUT_PATH = BASE_DIR / "smartfare_qr_final.png"


def build_qr() -> Image.Image:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(URL)
    qr.make(fit=True)

    qr_img = qr.make_image(fill_color="#0A3663", back_color="white").convert("RGB")

    if not LOGO_PATH.exists():
        print("Attenzione: file 'logo.png' non trovato. Verrà generato il QR senza logo.")
        return qr_img

    logo = Image.open(LOGO_PATH).convert("RGBA")
    qr_width, qr_height = qr_img.size
    logo_max_size = int(qr_width * 0.25)
    logo.thumbnail((logo_max_size, logo_max_size), Image.Resampling.LANCZOS)

    logo_with_mask = Image.new("RGBA", logo.size, (255, 255, 255, 0))
    mask = Image.new("L", logo.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), logo.size], radius=max(1, int(logo.size[0] * 0.2)), fill=255)
    logo_with_mask.paste(logo, (0, 0), mask=mask)

    logo_width, logo_height = logo_with_mask.size
    xmin = int((qr_width - logo_width) / 2)
    ymin = int((qr_height - logo_height) / 2)

    border_offset = 4
    draw_bg = ImageDraw.Draw(qr_img)
    draw_bg.rounded_rectangle(
        [
            (xmin - border_offset, ymin - border_offset),
            (xmin + logo_width + border_offset, ymin + logo_height + border_offset),
        ],
        radius=max(1, int(logo.size[0] * 0.2)),
        fill="white",
    )

    qr_img.paste(logo_with_mask, (xmin, ymin), logo_with_mask)
    print("Logo inserito con successo!")
    return qr_img


def main() -> None:
    qr_img = build_qr()
    qr_img.save(OUTPUT_PATH)
    print(f"Codice QR salvato come '{OUTPUT_PATH.name}'")


if __name__ == "__main__":
    main()
