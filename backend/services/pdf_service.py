import os
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOADS_DIR, exist_ok=True)

class PdfReportService:
    def generate_incident_pdf(
        self,
        report_id: str,
        incident: dict,
        detections: list,
        tasks: list,
        blockages: list,
        operator_notes: str = None
    ) -> str:
        pdf_filename = f"report_{report_id}.pdf"
        pdf_path = os.path.join(UPLOADS_DIR, pdf_filename)

        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # Custom tactical styles
        title_style = ParagraphStyle(
            'TacticalTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#0B1220')
        )
        subtitle_style = ParagraphStyle(
            'TacticalSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#2563EB')
        )
        section_heading = ParagraphStyle(
            'TacticalSection',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=10,
            spaceAfter=4
        )
        body_style = ParagraphStyle(
            'TacticalBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155')
        )

        elements = []

        # 1. Header Banner
        elements.append(Paragraph("RESCUEVISION AI // TACTICAL INCIDENT REPORT", subtitle_style))
        elements.append(Paragraph(f"DOSSIER REF: {report_id} — {incident.get('title', 'Disaster Log')}", title_style))
        elements.append(Paragraph(f"GENERATION TIMESTAMP: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')} | OPERATIONAL STATUS: OFFICIAL", body_style))
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0B1220'), spaceBefore=2, spaceAfter=10))

        # 2. Incident Summary Table
        elements.append(Paragraph("1. TARGET DISASTER PROFILE", section_heading))
        inc_data = [
            [
                Paragraph("<b>Incident ID:</b>", body_style), Paragraph(str(incident.get("id")), body_style),
                Paragraph("<b>Disaster Type:</b>", body_style), Paragraph(str(incident.get("disaster_type")), body_style)
            ],
            [
                Paragraph("<b>Severity:</b>", body_style), Paragraph(f"<font color='red'><b>{incident.get('severity')}</b></font>", body_style),
                Paragraph("<b>Status:</b>", body_style), Paragraph(str(incident.get("status")), body_style)
            ],
            [
                Paragraph("<b>Location Name:</b>", body_style), Paragraph(str(incident.get("location_name")), body_style),
                Paragraph("<b>GPS Coordinates:</b>", body_style), Paragraph(f"{incident.get('latitude', 'N/A')}, {incident.get('longitude', 'N/A')}", body_style)
            ],
            [
                Paragraph("<b>Assigned Team:</b>", body_style), Paragraph(str(incident.get("assigned_team", "Unassigned")), body_style),
                Paragraph("<b>People At Risk:</b>", body_style), Paragraph(str(incident.get("people_at_risk", 0)), body_style)
            ],
        ]
        t1 = Table(inc_data, colWidths=[100, 170, 100, 170])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t1)
        elements.append(Spacer(1, 10))

        # Description
        elements.append(Paragraph("<b>Briefing Description:</b> " + incident.get("description", "No details entered."), body_style))
        elements.append(Spacer(1, 10))

        # 3. Vision Detection Table
        elements.append(Paragraph("2. AERIAL RECONNAISSANCE & COMPUTER VISION DETECTIONS", section_heading))
        if detections:
            det_data = [["Class Detected", "Confidence", "Bounding Coordinates", "Triage Flag"]]
            for d in detections[:12]: # limit in table
                cls = d.get("class_name", "Unknown").capitalize()
                conf = f"{int(d.get('confidence', 0) * 100)}%"
                coords = f"[{d.get('x1', 0)}, {d.get('y1', 0)}, {d.get('x2', 0)}, {d.get('y2', 0)}]"
                flag = "PERSON OF INTEREST" if "person" in cls.lower() else "EQUIPMENT/VEHICLE"
                det_data.append([cls, conf, coords, flag])

            t2 = Table(det_data, colWidths=[120, 80, 200, 140])
            t2.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0B1220')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
                ('TOPPADDING', (0,0), (-1,-1), 3),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ]))
            elements.append(t2)
        else:
            elements.append(Paragraph("No aerial image detections linked to this incident record.", body_style))
        elements.append(Spacer(1, 10))

        # 4. Directives / Tasks Table
        elements.append(Paragraph("3. TACTICAL DIRECTIVES & DISPATCH ROSTER", section_heading))
        if tasks:
            task_data = [["Task ID", "Directive Title", "Assigned Unit", "Priority", "Status"]]
            for t in tasks:
                task_data.append([
                    t.get("id"),
                    t.get("title", ""),
                    t.get("assigned_team", ""),
                    t.get("priority", ""),
                    t.get("status", "")
                ])
            t3 = Table(task_data, colWidths=[70, 200, 110, 80, 80])
            t3.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2563EB')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
                ('TOPPADDING', (0,0), (-1,-1), 3),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ]))
            elements.append(t3)
        else:
            elements.append(Paragraph("No open directives assigned for this incident.", body_style))
        elements.append(Spacer(1, 10))

        # 5. Access & Road Closures
        elements.append(Paragraph("4. SECTOR ACCESS & VERIFIED ROAD BLOCKAGES", section_heading))
        if blockages:
            blk_data = [["ID", "Road Segment / Corridor", "Coordinates", "Status"]]
            for b in blockages:
                blk_data.append([
                    b.get("id"),
                    b.get("road_segment"),
                    f"{b.get('latitude')}, {b.get('longitude')}",
                    b.get("status")
                ])
            t4 = Table(blk_data, colWidths=[70, 240, 130, 100])
            t4.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EF4444')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0,0), (-1,-1), 3),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ]))
            elements.append(t4)
        else:
            elements.append(Paragraph("All sector ingress corridors verified clear of confirmed debris blockages.", body_style))
        elements.append(Spacer(1, 12))

        # 6. Notes & Sign-off Block
        elements.append(Paragraph("5. COMMANDER VERIFICATION SIGN-OFF", section_heading))
        notes_text = operator_notes or "Field operations verified by designated incident commander. Ongoing surveillance active."
        elements.append(Paragraph(f"<b>Operator Notes:</b> {notes_text}", body_style))
        elements.append(Spacer(1, 15))

        sign_data = [
            ["Authorized Commander Signature: __________________________", "Date / Stamp: __________________________"],
            ["RescueVision AI System ID: RV-NODE-01", "Security Clearance: TACTICAL FIELD L3"]
        ]
        t_sign = Table(sign_data, colWidths=[270, 270])
        t_sign.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Oblique'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ]))
        elements.append(t_sign)

        doc.build(elements)
        return pdf_path

pdf_service = PdfReportService()
