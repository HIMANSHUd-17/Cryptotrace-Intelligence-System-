from db.session import SessionLocal
from main import PREDICTOR, PREDICTOR_HEIST
from services.pdf_generator import create_forensic_report

db = SessionLocal()

# Test PDF report for Elliptic Tx 230425980
pdf_buf = create_forensic_report("230425980", db=db, predictor=PREDICTOR, predictor_heist=PREDICTOR_HEIST)
if pdf_buf:
    with open("test_report.pdf", "wb") as f:
        f.write(pdf_buf.getvalue())
    print("Successfully generated PDF report for Elliptic Tx 230425980 (test_report.pdf)")
else:
    print("Failed to generate PDF report for Elliptic Tx")

db.close()
