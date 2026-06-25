# services/invoice.py

from django.http import HttpResponse
from reportlab.pdfgen import canvas

class InvoiceService:

    @staticmethod
    def generate_invoice(order):
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="bill_{order.id}.pdf"'
        pdf = canvas.Canvas(response)
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(220, 800, "INVOICE")
        pdf.setFont("Helvetica", 12)
        pdf.drawString(50,760,f"Order ID : {order.id}")
        pdf.drawString(50,740,f"Customer : {order.user.username}")
        pdf.drawString(50,720,f"Date : {order.order_date.strftime('%d-%m-%Y')}")
        y = 670
        pdf.drawString(50, y, "Product")
        pdf.drawString(250, y, "Qty")
        pdf.drawString(350, y, "Price")
        pdf.drawString(450, y, "Total")
        y -= 20
        for item in order.items.all():
            pdf.drawString(50,y,item.product.name)
            pdf.drawString(250,y,str(item.quantity))
            pdf.drawString(350,y,f"₹{item.price}")
            pdf.drawString(450,y,f"₹{item.total_price}")
            y -= 20
        pdf.drawString(50,y - 20,f"Grand Total : ₹{order.total_amount}")
        pdf.save()
        return response