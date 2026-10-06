import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDF = (results, symptoms, timestamp, patientName, patientAge) => {
    const doc = new jsPDF();

    // ---------------------------------------------------------
    // HEADER
    // ---------------------------------------------------------
    doc.setFillColor(14, 165, 233); // Sky Blue
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Doctor in Hand", 20, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("AI-Powered Medical Analysis Report", 20, 28);

    // ---------------------------------------------------------
    // HIGHLIGHTED PATIENT DETAILS
    // ---------------------------------------------------------
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.roundedRect(15, 45, 180, 25, 3, 3, 'FD');

    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");

    // Label Column
    doc.text("PATIENT NAME:", 25, 55);
    doc.text("AGE:", 110, 55);
    doc.text("REPORT DATE:", 25, 63);

    // Value Column (Highligted Blue)
    doc.setTextColor(14, 165, 233); // Sky 500
    doc.text(patientName ? patientName.toUpperCase() : "GUEST", 55, 55);
    doc.text(patientAge ? patientAge + " Years" : "N/A", 125, 55);
    doc.text(timestamp, 55, 63);

    // ---------------------------------------------------------
    // SYMPTOMS
    // ---------------------------------------------------------
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(14, 165, 233);
    doc.text("Reported Symptoms", 20, 85);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFont("helvetica", "normal");

    const symptomsText = doc.splitTextToSize(symptoms, 170);
    doc.text(symptomsText, 20, 92);

    // Dynamic Y position
    let yPos = 92 + (symptomsText.length * 5) + 15;

    // ---------------------------------------------------------
    // PRIMARY DIAGNOSIS SECTION
    // ---------------------------------------------------------
    if (results && results.length > 0) {
        const topResult = results[0];

        // Diagnosis Box
        doc.setFillColor(240, 253, 244); // Green-50 (Medical feel)
        doc.setDrawColor(187, 247, 208); // Green-200
        doc.rect(15, yPos, 180, 50, 'FD');

        doc.setFontSize(10);
        doc.setTextColor(21, 128, 61); // Green-700
        doc.setFont("helvetica", "bold");
        doc.text("PRIMARY DIAGNOSIS", 20, yPos + 10);

        // Disease Name
        doc.setFontSize(16);
        doc.setTextColor(22, 101, 52); // Green-800
        doc.text(topResult.disease, 20, yPos + 20);

        // Confidence
        doc.setFontSize(12);
        doc.text(`${topResult.confidence}% Match`, 150, yPos + 20, { align: 'right' });

        // Grid Info
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("SEVERITY", 20, yPos + 32);
        doc.text("SPECIALIST", 80, yPos + 32);

        // Severity Logic
        const severityText = topResult.severity || "Unknown";
        let sevColor = [100, 116, 139]; // Slate (Default)

        if (severityText.match(/High|Critical|Severe/i)) sevColor = [220, 38, 38]; // Red
        else if (severityText.match(/Moderate|Medium/i)) sevColor = [234, 88, 12]; // Orange
        else if (severityText.match(/Low|Mild/i)) sevColor = [22, 163, 74]; // Green

        // Draw Badge
        doc.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
        doc.roundedRect(20, yPos + 35, 30, 7, 2, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(severityText.toUpperCase(), 35, yPos + 40, { align: 'center' });

        // Reset for Specialist
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        doc.text(topResult.specialist || "General Physician", 80, yPos + 37);

        yPos += 60;
    }


    // ---------------------------------------------------------
    // ANALYSIS TABLE
    // ---------------------------------------------------------
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(14, 165, 233);
    doc.text("Differential Diagnosis", 20, yPos);

    const tableData = results.map((r, i) => [
        i + 1,
        r.disease,
        `${r.confidence}%`,
        r.severity || '-',
        r.specialist || '-'
    ]);

    autoTable(doc, {
        startY: yPos + 5,
        head: [['#', 'Condition', 'Conf.', 'Severity', 'Referral']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 10 } }
    });

    const pageHeight = doc.internal.pageSize.height;

    // ---------------------------------------------------------
    // ---------------------------------------------------------
    // REALISTIC DIGITAL STAMP (Bottom Right)
    // ---------------------------------------------------------
    const stampX = 160;
    const stampY = pageHeight - 50;
    const color = [6, 182, 212]; // Cyan-500 (Digital look)

    // Digital Hexagon/Circle Shape
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.5);
    doc.circle(stampX, stampY, 15, 'S'); // Outer Ring
    doc.setLineWidth(0.2);
    doc.circle(stampX, stampY, 13, 'S'); // Inner Ring

    // "Digital" Dashes
    doc.setDrawColor(color[0], color[1], color[2]);
    for (let i = 0; i < 360; i += 30) {
        const rad = i * (Math.PI / 180);
        const x1 = stampX + 11 * Math.cos(rad);
        const y1 = stampY + 11 * Math.sin(rad);
        const x2 = stampX + 12 * Math.cos(rad);
        const y2 = stampY + 12 * Math.sin(rad);
        doc.line(x1, y1, x2, y2);
    }

    // Text
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("DIGITALLY VERIFIED", stampX, stampY - 3, { align: 'center' });
    doc.text("DOCTOR IN HAND", stampX, stampY + 3, { align: 'center' });

    // Hash ID
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, stampX, stampY + 8, { align: 'center' });

    // Checkmark/Icon
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(1);
    doc.line(stampX - 2.5, stampY - 8, stampX - 0.5, stampY - 6);
    doc.line(stampX - 0.5, stampY - 6, stampX + 2.5, stampY - 9);

    // ---------------------------------------------------------
    // FOOTER
    // ---------------------------------------------------------
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 25, 210, 25, 'F');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text("Generated by Doctor In Hand AI System (BioBERT). Not a substitute for professional medical advice.", 105, pageHeight - 15, { align: 'center' });
    doc.text("www.doctorinhand.ai", 105, pageHeight - 10, { align: 'center' });

    doc.save(`HealthReport_${timestamp.replace(/[: ]/g, '_')}.pdf`);
};
