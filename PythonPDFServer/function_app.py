

import azure.functions as func
import logging
from xhtml2pdf import pisa
import io
from bs4 import BeautifulSoup

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

@app.route(route="HtmlToPdf",methods=["POST"] )
def JsonToPDF(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger function processed a request.')

    htmlData = req.params.get('htmlData')
    if not htmlData:
        try:
            req_body = req.get_json()
        except ValueError:
            req_body = None
        if req_body:
            htmlData = req_body.get('htmlData')


    if not htmlData:
        return func.HttpResponse(
            "No HTML data provided.", status_code=400
        )

    # Validate HTML using BeautifulSoup
    soup = BeautifulSoup(htmlData, "html.parser")
    if not soup.find():
        logging.error("Invalid HTML provided.")
        return func.HttpResponse(
            "Invalid HTML provided.", status_code=400
        )

    # Convert HTML to PDF
    logging.info("Valid HTML found. Generating PDF from HTML.")

    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(htmlData, dest=pdf_buffer)

    if pisa_status.err:
        return func.HttpResponse(
            "Failed to generate PDF.", status_code=500
        )

    pdf_buffer.seek(0)
    return func.HttpResponse(
        body=pdf_buffer.read(),
        mimetype="application/pdf",
        status_code=200
    )