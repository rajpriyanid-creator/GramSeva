import { Router, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { runQuery } from "../db/neo4j";

export const pdfRouter = Router();

// ─── GET /api/pdf/checklist/:schemeId ────────────────────────────────────
// Generates a printable document checklist PDF for a scheme.
pdfRouter.get(
  "/checklist/:schemeId",
  async (req: Request, res: Response) => {
    try {
      const { schemeId } = req.params;

      // Fetch scheme + its criteria from Neo4j
      const results = await runQuery(
        `
        MATCH (s:Scheme {id: $id})-[:OFFERED_BY]->(d:Department)
        OPTIONAL MATCH (s)-[:REQUIRES]->(c:Criteria)
        RETURN s { .id, .name, .name_hi, .benefit, .ministry, .url },
               d { .name, .helpline, .portal },
               collect(c { .field, .value, .label }) AS criteria
        `,
        { id: schemeId }
      );

      if (!results.length) {
        return res.status(404).json({ error: "Scheme not found" });
      }

      const { s: scheme, d: dept, criteria } = results[0] as any;

      // Standard document list by occupation/type
      const STANDARD_DOCS = [
        "Aadhaar Card (Original + 2 Photocopies)",
        "Ration Card (BPL/APL) (Original + 2 Photocopies)",
        "Bank Passbook – First page showing Account Number & IFSC",
        "Passport-size Photographs (4 copies, coloured)",
        "Income Certificate from Tehsildar/MRO (not older than 6 months)",
        "Residence Proof (Voter ID / Electricity Bill / Ration Card)",
      ];

      const CONDITIONAL_DOCS: Record<string, string> = {
        caste: "Caste Certificate from competent authority",
        gender: "Gender Identity Certificate (if applicable)",
        land_acres: "Land Records / Patta (RoR from Revenue Department)",
        bpl_card: "BPL Ration Card (Original + Photocopy)",
        occupation:
          "Occupation Proof (Kisan Credit Card / MNREGA Job Card / Trade License)",
      };

      // Build extra docs based on criteria
      const extraDocs: string[] = [];
      for (const c of criteria || []) {
        if (CONDITIONAL_DOCS[c.field] && !extraDocs.includes(CONDITIONAL_DOCS[c.field])) {
          extraDocs.push(CONDITIONAL_DOCS[c.field]);
        }
      }

      const allDocs = [...STANDARD_DOCS, ...extraDocs];

      // ── Build PDF ──────────────────────────────────────────────────────
      const doc = new PDFDocument({ margin: 50, size: "A4" });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="GramSeva-${schemeId}-checklist.pdf"`
      );
      doc.pipe(res);

      // Header bar
      doc.rect(0, 0, 595, 80).fill("#0F4C35");
      doc
        .fillColor("#F5C518")
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("GramSeva", 50, 20);
      doc
        .fillColor("#c8e6c9")
        .fontSize(10)
        .font("Helvetica")
        .text("Government Scheme Document Checklist", 50, 50);

      doc.moveDown(2);

      // Scheme name
      doc
        .fillColor("#0F4C35")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(scheme.name, { underline: true });

      if (scheme.name_hi) {
        doc
          .fillColor("#333333")
          .fontSize(13)
          .font("Helvetica")
          .text(scheme.name_hi);
      }

      doc.moveDown(0.5);

      // Benefit box
      doc.rect(50, doc.y, 495, 40).fill("#e8f5e9").stroke("#2E7D5A");
      doc
        .fillColor("#1B5E20")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`💰  Benefit: `, 60, doc.y - 28, { continued: true });
      doc
        .font("Helvetica")
        .fillColor("#1B5E20")
        .text(scheme.benefit || "As per scheme guidelines");

      doc.moveDown(1.5);

      // Ministry
      doc
        .fillColor("#555555")
        .fontSize(10)
        .font("Helvetica")
        .text(`Ministry / Department: ${scheme.ministry || dept.name || "—"}`);
      doc.moveDown(0.3);
      doc.text(`Helpline: ${dept.helpline || "—"}`);
      doc
        .fillColor("#1565C0")
        .text(`Apply Online: ${scheme.url || dept.portal || "—"}`, {
          link: scheme.url,
          underline: true,
        });

      doc.moveDown(1);

      // Divider
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
      doc.moveDown(1);

      // Documents checklist
      doc
        .fillColor("#0F4C35")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("📋  Documents Required");
      doc.moveDown(0.6);

      allDocs.forEach((docItem, i) => {
        const y = doc.y;
        // Checkbox square
        doc.rect(50, y + 2, 12, 12).stroke("#0F4C35");
        doc
          .fillColor("#333333")
          .fontSize(11)
          .font("Helvetica")
          .text(`  ${i + 1}. ${docItem}`, 70, y, { width: 470 });
        doc.moveDown(0.7);
      });

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
      doc.moveDown(0.8);

      // Instructions
      doc
        .fillColor("#0F4C35")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("📍  How to Apply");
      doc.moveDown(0.4);

      const steps = [
        "Visit your nearest Common Service Centre (CSC / Jan Seva Kendra).",
        "Carry all original documents + two sets of self-attested photocopies.",
        "The CSC operator will fill the online form on your behalf (free of cost).",
        "Collect the Acknowledgement Receipt and keep it safe.",
        "Track application status on the scheme portal using your Aadhaar number.",
      ];

      steps.forEach((step, i) => {
        doc
          .fillColor("#333333")
          .fontSize(10)
          .font("Helvetica")
          .text(`${i + 1}. ${step}`, { width: 490 });
        doc.moveDown(0.4);
      });

      // Footer
      const footerY = 770;
      doc.rect(0, footerY - 10, 595, 30).fill("#0F4C35");
      doc
        .fillColor("#c8e6c9")
        .fontSize(8)
        .font("Helvetica")
        .text(
          `Generated by GramSeva  •  ${new Date().toLocaleDateString("en-IN")}  •  This is informational only – verify with the issuing department.`,
          50,
          footerY,
          { align: "center", width: 495 }
        );

      doc.end();
    } catch (err: any) {
      console.error("[GET /pdf/checklist]", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  }
);

// ─── GET /api/pdf/summary ──────────────────────────────────────────────────
// Generates a 1-page summary PDF of all matched schemes for the user.
pdfRouter.post("/summary", async (req: Request, res: Response) => {
  try {
    const { schemes, user_profile, language_code } = req.body;

    if (!schemes || !Array.isArray(schemes)) {
      return res.status(400).json({ error: "schemes array required" });
    }

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="GramSeva-my-schemes.pdf"'
    );
    doc.pipe(res);

    // Header
    doc.rect(0, 0, 595, 80).fill("#0F4C35");
    doc
      .fillColor("#F5C518")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("GramSeva", 50, 20);
    doc
      .fillColor("#c8e6c9")
      .fontSize(10)
      .font("Helvetica")
      .text("Your Eligible Government Schemes", 50, 50);

    doc.moveDown(2);

    // Profile summary
    if (user_profile) {
      doc
        .fillColor("#0F4C35")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Your Profile at a Glance");
      doc.moveDown(0.3);
      doc
        .fillColor("#555")
        .fontSize(10)
        .font("Helvetica")
        .text(
          `Age: ${user_profile.age || "—"} | Gender: ${user_profile.gender || "—"} | State: ${user_profile.state || "—"} | ` +
            `Category: ${user_profile.caste_category || "—"} | Annual Income: ₹${(user_profile.annual_income || 0).toLocaleString("en-IN")} | ` +
            `BPL Card: ${user_profile.bpl_card ? "Yes" : "No"}`
        );
      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
      doc.moveDown(0.8);
    }

    // Schemes list
    doc
      .fillColor("#0F4C35")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(`You qualify for ${schemes.length} scheme(s):`);
    doc.moveDown(0.6);

    schemes.forEach((scheme: any, i: number) => {
      if (doc.y > 700) doc.addPage();

      doc
        .fillColor("#0F4C35")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`${i + 1}. ${scheme.name}`);
      doc
        .fillColor("#1B5E20")
        .fontSize(10)
        .font("Helvetica")
        .text(`   💰 ${scheme.benefit}`);
      doc
        .fillColor("#777")
        .fontSize(9)
        .text(`   ${scheme.ministry || ""}   |   Helpline: ${scheme.department?.helpline || "—"}`);
      doc.moveDown(0.5);
    });

    // Footer
    doc.rect(0, 770, 595, 30).fill("#0F4C35");
    doc
      .fillColor("#c8e6c9")
      .fontSize(8)
      .text(
        `GramSeva  •  ${new Date().toLocaleDateString("en-IN")}  •  Visit your nearest CSC for application assistance.`,
        50,
        775,
        { align: "center", width: 495 }
      );

    doc.end();
  } catch (err: any) {
    console.error("[POST /pdf/summary]", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});
