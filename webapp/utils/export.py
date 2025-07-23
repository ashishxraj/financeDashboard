from datetime import datetime
from flask import make_response
import json
from fpdf import FPDF 

def export_to_csv(transactions):
    """Generate CSV export from transactions"""
    output = []
    output.append(['ID', 'Date', 'Description', 'Category', 'Type', 'Amount'])
    
    for entry in transactions:
        output.append([
            entry['id'],
            entry['date'],
            entry['description'],
            entry['category'],
            'Credit' if entry['type'] == 'credit' else 'Debit',
            entry['amount']
        ])
    
    csv_data = []
    for row in output:
        csv_data.append(','.join(str(item) for item in row))
    
    response = make_response('\n'.join(csv_data))
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = f'attachment; filename=transactions_{datetime.now().strftime("%Y%m%d")}.csv'
    return response

def export_to_pdf(transactions, summary_data=None):
    """Generate professional PDF export with proper formatting and wrapping"""
    from flask import current_app
    try:
        pdf = FPDF()
        pdf.add_page()
        
        # Add Unicode font
        font_path = 'static/fonts/DejaVuSans.ttf'  # Adjust path if needed
        pdf.add_font('DejaVu', '', font_path, uni=True)
        
        # Set document metadata
        pdf.set_title('Transaction Report')
        pdf.set_author('Finance System')
        
        # Header section
        pdf.set_font('DejaVu', '', 16)
        pdf.cell(0, 10, 'Transaction Report', 0, 1, 'C')
        pdf.set_font('DejaVu', '', 10)
        pdf.cell(0, 6, f'Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M")}', 0, 1, 'C')
        pdf.ln(8)
        
        # Add summary if provided
        if summary_data:
            pdf.set_font('DejaVu', '', 12)
            pdf.cell(0, 8, 'Summary', 0, 1)
            pdf.set_font('DejaVu', '', 10)
            
            # Summary table
            pdf.set_fill_color(240, 240, 240)
            pdf.cell(60, 8, 'Total Credits:', 1, 0, 'L', True)
            pdf.cell(0, 8, f'₹{summary_data.get("total_credits", 0):.2f}', 1, 1, 'R')
            pdf.cell(60, 8, 'Total Debits:', 1, 0, 'L', False)
            pdf.cell(0, 8, f'₹{summary_data.get("total_debits", 0):.2f}', 1, 1, 'R')
            pdf.cell(60, 8, 'Net Balance:', 1, 0, 'L', True)
            pdf.cell(0, 8, f'₹{summary_data.get("net_balance", 0):.2f}', 1, 1, 'R')
            pdf.ln(12)
        
        # Transactions section
        pdf.set_font('DejaVu', '', 12)
        pdf.cell(0, 8, 'Transaction History', 0, 1)
        pdf.ln(4)
        
        # Table settings
        col_widths = [22, 60, 35, 20, 25]  # Adjusted column widths
        header = ['Date', 'Description', 'Category', 'Type', 'Amount']
        
        # Table header
        pdf.set_font('DejaVu', '', 9)
        pdf.set_fill_color(59, 130, 246)
        pdf.set_text_color(255)
        for i, col in enumerate(header):
            pdf.cell(col_widths[i], 7, col, 1, 0, 'C', True)
        pdf.ln()
        
        # Table rows
        pdf.set_text_color(0)
        pdf.set_font('DejaVu', '', 8)  # Smaller font for better fit
        fill = False
        
        for entry in transactions:
            # Alternate row colors
            pdf.set_fill_color(240, 240, 240) if fill else pdf.set_fill_color(255)
            
            # Date column
            pdf.cell(col_widths[0], 6, entry['date'], 1, 0, 'L', fill)
            
            # Description column with text wrapping
            desc = entry['description'][:30] + '...' if len(entry['description']) > 30 else entry['description']
            pdf.cell(col_widths[1], 6, desc, 1, 0, 'L', fill)
            
            # Category column with text wrapping
            cat = entry['category'][:20] + '...' if len(entry['category']) > 20 else entry['category']
            pdf.cell(col_widths[2], 6, cat, 1, 0, 'L', fill)
            
            # Type column
            trans_type = 'Credit' if entry['type'] == 'credit' else 'Debit'
            pdf.cell(col_widths[3], 6, trans_type, 1, 0, 'C', fill)
            
            # Amount column
            amount = f'₹{float(entry["amount"]):.2f}'
            pdf.cell(col_widths[4], 6, amount, 1, 1, 'R', fill)
            
            fill = not fill
        
        # Footer
        pdf.ln(10)
        pdf.set_font('DejaVu', '', 8)
        pdf.cell(0, 6, 'End of report', 0, 0, 'C')
        
        # Generate response
        pdf_bytes = pdf.output(dest='S')
        if isinstance(pdf_bytes, bytearray):
            pdf_bytes = bytes(pdf_bytes)

        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=transactions_{datetime.now().strftime("%Y%m%d")}.pdf'
        return response
    except Exception as e:
        current_app.logger.error(f"PDF export error: {e}")
        return make_response("PDF export failed", 500)