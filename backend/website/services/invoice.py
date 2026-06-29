from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm


class InvoiceService:

    # ── Color palette ─────────────────────────────────────────────────────────
    _GREEN      = colors.HexColor("#059669")   # emerald-600
    _DARK       = colors.HexColor("#0f172a")   # slate-900
    _GRAY       = colors.HexColor("#64748b")   # slate-500
    _LIGHT_GRAY = colors.HexColor("#f8fafc")   # slate-50
    _RED        = colors.HexColor("#dc2626")   # red-600
    _WHITE      = colors.white

    @classmethod
    def generate_invoice(cls, order):
        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="EFarm_Invoice_{order.id}.pdf"'
        )

        c  = canvas.Canvas(response, pagesize=A4)
        W, H = A4

        cls._draw_page(c, order, W, H)
        c.save()
        return response

    # ── Page layout ───────────────────────────────────────────────────────────

    @classmethod
    def _draw_page(cls, c, order, W, H):
        # ── Header band ──────────────────────────────────────────────────────
        c.setFillColor(cls._GREEN)
        c.rect(0, H - 68*mm, W, 68*mm, fill=1, stroke=0)

        # Logo + company
        c.setFillColor(cls._WHITE)
        c.setFont("Helvetica-Bold", 26)
        c.drawString(18*mm, H - 30*mm, "E-Farm")
        c.setFont("Helvetica", 10)
        c.drawString(18*mm, H - 40*mm, "Agriculture Marketplace")
        c.drawString(18*mm, H - 48*mm, "support@efarm.com | efarm.com")

        # Invoice title (right)
        c.setFont("Helvetica-Bold", 20)
        c.drawRightString(W - 18*mm, H - 28*mm, "INVOICE")
        c.setFont("Helvetica", 10)
        c.drawRightString(W - 18*mm, H - 38*mm, f"Invoice #  EF-{str(order.id).zfill(6)}")
        c.drawRightString(W - 18*mm, H - 47*mm, f"Date:  {order.order_date.strftime('%d %B %Y')}")
        c.drawRightString(W - 18*mm, H - 56*mm, f"Order:  #{order.id}")

        # Status pill
        status_text = order.status.replace("_", " ").upper()
        pill_w = 38*mm
        c.setFillColor(cls._WHITE)
        c.roundRect(W - 18*mm - pill_w, H - 66*mm, pill_w, 7*mm, 3*mm, fill=1, stroke=0)
        c.setFillColor(cls._GREEN)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(W - 18*mm - pill_w / 2, H - 62*mm, status_text)

        y = H - 78*mm

        # ── Two-column: Bill To / Payment Info ───────────────────────────────
        mid = W / 2

        # Left — Bill To
        c.setFillColor(cls._DARK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(18*mm, y, "BILL TO")
        y1 = y - 6*mm
        c.setFont("Helvetica", 9)
        c.setFillColor(cls._GRAY)
        c.drawString(18*mm, y1, f"{order.user.username}")
        y1 -= 5*mm
        c.drawString(18*mm, y1, f"{order.user.email}")

        try:
            addr = order.shipping_address
            y1  -= 5*mm; c.drawString(18*mm, y1, addr.address[:50])
            y1  -= 5*mm; c.drawString(18*mm, y1, f"{addr.city}, {addr.state} - {addr.postal_code}")
            if addr.phone:
                y1 -= 5*mm; c.drawString(18*mm, y1, f"Phone: {addr.phone}")
        except Exception:
            pass

        # Right — Payment Info
        c.setFillColor(cls._DARK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(mid + 5*mm, y, "PAYMENT DETAILS")
        y2 = y - 6*mm
        c.setFont("Helvetica", 9)
        c.setFillColor(cls._GRAY)
        try:
            pay = order.payment
            c.drawString(mid + 5*mm, y2, f"Method:  {pay.payment_type.upper()}")
            y2 -= 5*mm
            c.drawString(mid + 5*mm, y2, f"Status:  {pay.status.upper()}")
            y2 -= 5*mm
            c.drawString(mid + 5*mm, y2, f"Date:    {pay.payment_date.strftime('%d %B %Y')}")
        except Exception:
            c.drawString(mid + 5*mm, y2, "Payment pending")

        # ── Separator ────────────────────────────────────────────────────────
        y -= 40*mm
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.setLineWidth(0.5)
        c.line(18*mm, y, W - 18*mm, y)
        y -= 8*mm

        # ── Table header ─────────────────────────────────────────────────────
        col = cls._table_cols(W)
        c.setFillColor(cls._DARK)
        c.rect(18*mm, y - 7*mm, W - 36*mm, 7*mm, fill=1, stroke=0)
        c.setFillColor(cls._WHITE)
        c.setFont("Helvetica-Bold", 8)
        headers = ["Product", "Seller", "Qty", "Unit Price", "Discount", "Final", "Total"]
        for h_txt, x in zip(headers, col):
            c.drawString(x, y - 5.5*mm, h_txt)
        y -= 7*mm

        # ── Rows ─────────────────────────────────────────────────────────────
        alt        = False
        sub_orig   = 0.0
        sub_final  = 0.0

        for item in order.items.select_related(
            "listing__product", "listing__seller"
        ).all():
            if y < 50*mm:
                c.showPage()
                y = H - 30*mm

            orig  = float(item.listing.price)
            paid  = float(item.price)
            qty   = item.quantity
            disc  = 0
            if paid < orig:
                disc = round((orig - paid) / orig * 100)
            total = paid * qty
            sub_orig  += orig * qty
            sub_final += total

            if alt:
                c.setFillColor(cls._LIGHT_GRAY)
                c.rect(18*mm, y - 6.5*mm, W - 36*mm, 6.5*mm, fill=1, stroke=0)
            alt = not alt

            c.setFillColor(cls._DARK)
            c.setFont("Helvetica", 8)
            vals = [
                item.listing.product.name[:22],
                item.listing.seller.username[:14],
                str(qty),
                f"Rs.{orig:.2f}",
                f"{disc}%" if disc else "—",
                f"Rs.{paid:.2f}",
                f"Rs.{total:.2f}",
            ]
            for val, x in zip(vals, col):
                if val.endswith("%") and disc:
                    c.setFillColor(cls._RED)
                    c.drawString(x, y - 5*mm, val)
                    c.setFillColor(cls._DARK)
                else:
                    c.drawString(x, y - 5*mm, val)
            y -= 6.5*mm

        # ── Totals ────────────────────────────────────────────────────────────
        y -= 8*mm
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.line(100*mm, y, W - 18*mm, y)
        y -= 6*mm

        savings = sub_orig - sub_final
        cls._total_row(c, y, "Subtotal (before discount):", f"Rs.{sub_orig:.2f}", W, cls._GRAY)
        y -= 5.5*mm
        if savings > 0.001:
            cls._total_row(c, y, "Total Savings:", f"- Rs.{savings:.2f}", W, cls._RED)
            y -= 5.5*mm
        cls._total_row(c, y, "Delivery:", "FREE", W, cls._GRAY)
        y -= 8*mm

        # Grand total box
        c.setFillColor(cls._GREEN)
        c.roundRect(95*mm, y - 5*mm, W - 113*mm, 11*mm, 3*mm, fill=1, stroke=0)
        c.setFillColor(cls._WHITE)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(98*mm, y - 1*mm, "Grand Total:")
        c.drawRightString(W - 20*mm, y - 1*mm, f"Rs.{sub_final:.2f}")

        # ── Footer ────────────────────────────────────────────────────────────
        c.setFillColor(cls._LIGHT_GRAY)
        c.rect(0, 0, W, 22*mm, fill=1, stroke=0)
        c.setFillColor(cls._GRAY)
        c.setFont("Helvetica", 8)
        c.drawCentredString(W / 2, 14*mm, "Thank you for shopping with E-Farm!")
        c.drawCentredString(W / 2, 8*mm, "Questions? Contact support@efarm.com")
        c.drawCentredString(
            W / 2, 3*mm,
            f"Generated on {order.order_date.strftime('%d %B %Y %H:%M')}"
        )

    @staticmethod
    def _table_cols(W):
        """X positions for each table column."""
        return [
            20*mm,   # Product
            75*mm,   # Seller
            110*mm,  # Qty
            122*mm,  # Unit Price
            147*mm,  # Discount
            162*mm,  # Final
            179*mm,  # Total
        ]

    @classmethod
    def _total_row(cls, c, y, label, value, W, color):
        c.setFont("Helvetica", 9)
        c.setFillColor(color)
        c.drawString(100*mm, y, label)
        c.drawRightString(W - 18*mm, y, value)