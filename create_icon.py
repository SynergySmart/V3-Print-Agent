#!/usr/bin/env python3
"""
Create a simple printer icon for the V3 Print Agent system tray
Generates icon.ico with multiple sizes (16x16, 32x32, 48x48, 256x256)
"""

from PIL import Image, ImageDraw
import os

def create_printer_icon(size):
    """Create a simple printer icon at the specified size"""
    # Create a new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Scale factors based on size
    scale = size / 64.0

    # Colors
    printer_body = (70, 130, 180)  # Steel blue
    paper_color = (255, 255, 255)  # White
    outline_color = (40, 80, 120)  # Dark blue
    accent_color = (100, 180, 255) # Light blue

    # Line width
    line_width = max(1, int(2 * scale))

    # Paper coming out (top)
    paper_x = size * 0.25
    paper_y = size * 0.05
    paper_w = size * 0.5
    paper_h = size * 0.3

    # Draw paper with outline
    draw.rectangle(
        [paper_x, paper_y, paper_x + paper_w, paper_y + paper_h],
        fill=paper_color,
        outline=outline_color,
        width=line_width
    )

    # Printer body
    body_x = size * 0.15
    body_y = size * 0.25
    body_w = size * 0.7
    body_h = size * 0.5

    # Draw printer body
    draw.rectangle(
        [body_x, body_y, body_x + body_w, body_y + body_h],
        fill=printer_body,
        outline=outline_color,
        width=line_width
    )

    # Front panel (lighter accent)
    panel_y = body_y + body_h * 0.3
    draw.rectangle(
        [body_x + 2*line_width, panel_y, body_x + body_w - 2*line_width, body_y + body_h - 2*line_width],
        fill=accent_color,
        outline=outline_color,
        width=max(1, line_width-1)
    )

    # Power button (small circle)
    if size >= 32:
        button_x = body_x + body_w * 0.8
        button_y = body_y + body_h * 0.15
        button_r = size * 0.05
        draw.ellipse(
            [button_x - button_r, button_y - button_r, button_x + button_r, button_y + button_r],
            fill=(100, 200, 100),
            outline=outline_color,
            width=max(1, line_width-1)
        )

    # Paper tray (bottom)
    tray_y = body_y + body_h
    tray_h = size * 0.15

    draw.rectangle(
        [body_x, tray_y, body_x + body_w, tray_y + tray_h],
        fill=(60, 110, 160),
        outline=outline_color,
        width=line_width
    )

    return img

def main():
    """Generate icon.ico with multiple sizes"""
    sizes = [16, 32, 48, 256]
    icons = []

    print("Creating printer icon...")

    for size in sizes:
        print(f"  Generating {size}x{size} icon...")
        icon = create_printer_icon(size)
        icons.append(icon)

    # Save as ICO file
    output_path = os.path.join(os.path.dirname(__file__), 'assets', 'icon.ico')

    print(f"\nSaving to {output_path}...")

    # PIL's ICO support: save the largest image and specify all sizes
    icons[-1].save(
        output_path,
        format='ICO',
        sizes=[(s, s) for s in sizes]
    )

    print("[OK] Icon created successfully!")
    print(f"  Location: {output_path}")
    print(f"  Sizes: {', '.join([f'{s}x{s}' for s in sizes])}")

if __name__ == '__main__':
    main()
