"""Convert image-pixel coordinates (top-left origin) to PDF-point coordinates
(bottom-left origin) so detected fields land in the right place when written
back into the PDF."""


def px_to_pt(x_px: int, y_px: int, w_px: int, h_px: int,
             scale: float, page_height_pt: float) -> tuple[float, float, float, float]:
    """
    Args:
        x_px, y_px, w_px, h_px: image rect (top-left origin)
        scale: pixels per PDF point (e.g. 200 DPI / 72 ≈ 2.778)
        page_height_pt: page height in PDF points
    Returns:
        (x_pt, y_pt, w_pt, h_pt) in PDF points (bottom-left origin)
    """
    x_pt = x_px / scale
    w_pt = w_px / scale
    h_pt = h_px / scale
    # Image y grows downward from top; PDF y grows upward from bottom.
    # Flip and account for the rect's height.
    y_pt = page_height_pt - (y_px / scale) - h_pt
    return x_pt, y_pt, w_pt, h_pt
