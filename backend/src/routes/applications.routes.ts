import { Router, Request, Response } from "express";
import { runQuery } from "../db/neo4j";

export const applicationsRouter = Router();

// ─── POST /api/applications ───────────────────────────────────────────────
applicationsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, schemeId, additionalInfo } = req.body;
    if (!userId || !schemeId)
      return res.status(400).json({ error: "userId and schemeId are required" });

    // Check duplicate
    const existing = await runQuery(`
      MATCH (u:User {id: $userId})-[:APPLIED_FOR]->(a:Application)-[:FOR_SCHEME]->(s:Scheme {id: $schemeId})
      WHERE a.status IN ['pending','approved']
      RETURN a.id AS appId
    `, { userId, schemeId });
    if (existing.length > 0)
      return res.status(409).json({ error: "Already applied for this scheme", applicationId: (existing[0] as any).appId });

    const appId = `APP_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const [userRes, schemeRes] = await Promise.all([
      runQuery(`
        MATCH (u:User {id: $userId})
        RETURN u {
          .id, .gramsevaId, .name, .phone, .state, .district, .age, .gender,
          .caste_category, .community, .annual_income, .bpl_card, .occupation,
          .land_acres, .landType, .houseType, .educationLevel, .maritalStatus,
          .familySize, .aadhaarNo, .rationCardNo, .incomeCertNo, .communityCertNo,
          .voterId, .bankAccountNo, .ifscCode, .bankName,
          .disabilityStatus, .disabilityPercentage
        } AS u
      `, { userId }),
      runQuery(`MATCH (s:Scheme {id: $schemeId}) RETURN s { .id, .name, .ministry, .type, .benefit } AS s`, { schemeId })
    ]);

    if (userRes.length === 0) return res.status(404).json({ error: "User not found" });
    if (schemeRes.length === 0) return res.status(404).json({ error: "Scheme not found" });

    const u = (userRes[0] as any).u;
    const s = (schemeRes[0] as any).s;

    await runQuery(`
      MATCH (usr:User {id: $userId}), (sch:Scheme {id: $schemeId})
      CREATE (a:Application {
        id: $appId, status: 'pending', submittedAt: $now, additionalInfo: $additionalInfo,
        gramsevaId: $gramsevaId, userName: $name, userPhone: $phone,
        userState: $state, userDistrict: $district, userAge: $age, userGender: $gender,
        userCaste: $caste, userCommunity: $community, userIncome: $income,
        userBPL: $bpl, userOccupation: $occupation, userLandAcres: $landAcres,
        userLandType: $landType, userHouseType: $houseType,
        userEducation: $education, userMaritalStatus: $marital, userFamilySize: $familySize,
        userAadhaar: $aadhaar, userRationCard: $rationCard, userIncomeCert: $incomeCert,
        userCommCert: $commCert, userVoterId: $voterId,
        userBank: $bankAccount, userIFSC: $ifsc, userBankName: $bankName,
        userDisability: $disability, userDisabilityPct: $disabilityPct,
        schemeName: $schemeName, schemeMinistry: $ministry, schemeType: $type, schemeBenefit: $benefit
      })
      MERGE (usr)-[:APPLIED_FOR]->(a)
      MERGE (a)-[:FOR_SCHEME]->(sch)
    `, {
      appId, userId, schemeId, now, additionalInfo: additionalInfo || "",
      gramsevaId: u.gramsevaId || "", name: u.name || "", phone: u.phone || "",
      state: u.state || "", district: u.district || "",
      age: u.age || 0, gender: u.gender || "", caste: u.caste_category || "",
      community: u.community || "", income: u.annual_income || 0,
      bpl: u.bpl_card || false, occupation: u.occupation || "",
      landAcres: u.land_acres || 0, landType: u.landType || "", houseType: u.houseType || "",
      education: u.educationLevel || "", marital: u.maritalStatus || "",
      familySize: u.familySize || 1,
      aadhaar: u.aadhaarNo || "", rationCard: u.rationCardNo || "",
      incomeCert: u.incomeCertNo || "", commCert: u.communityCertNo || "",
      voterId: u.voterId || "", bankAccount: u.bankAccountNo || "",
      ifsc: u.ifscCode || "", bankName: u.bankName || "",
      disability: u.disabilityStatus || false, disabilityPct: u.disabilityPercentage || 0,
      schemeName: s.name || "", ministry: s.ministry || "",
      type: s.type || "", benefit: s.benefit || "",
    });

    res.status(201).json({ success: true, applicationId: appId, status: "pending" });
  } catch (err: any) {
    console.error("[POST /applications]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/applications/user/:userId ───────────────────────────────────
applicationsRouter.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const results = await runQuery(`
      MATCH (u:User {id: $userId})-[:APPLIED_FOR]->(a:Application)-[:FOR_SCHEME]->(s:Scheme)
      RETURN a { .*, schemeId: s.id } AS application
      ORDER BY a.submittedAt DESC
    `, { userId: req.params.userId });
    res.json({ applications: (results as any[]).map(r => r.application) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/applications (Admin) ────────────────────────────────────────
applicationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { status, search, sortBy = "submittedAt", sortDir = "DESC" } = req.query as Record<string, string>;
    const allowed = ["submittedAt", "userName", "schemeName", "userState", "status", "gramsevaId"];
    const safeSort = allowed.includes(sortBy) ? sortBy : "submittedAt";
    const safeDir = sortDir === "ASC" ? "ASC" : "DESC";

    const [results, summaryRes] = await Promise.all([
      runQuery(`
        MATCH (u:User)-[:APPLIED_FOR]->(a:Application)-[:FOR_SCHEME]->(s:Scheme)
        WHERE ($status IS NULL OR a.status = $status)
          AND ($search IS NULL OR
               toLower(a.userName) CONTAINS toLower($search) OR
               toLower(a.schemeName) CONTAINS toLower($search) OR
               a.userPhone CONTAINS $search OR
               toLower(a.gramsevaId) CONTAINS toLower($search) OR
               toLower(a.userAadhaar) CONTAINS toLower($search))
        RETURN a { .*, userId: u.id, schemeId: s.id } AS application
        ORDER BY a.${safeSort} ${safeDir}
      `, { status: status || null, search: search || null }),
      runQuery(`
        MATCH (a:Application)
        RETURN
          count(a) AS total,
          sum(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) AS pending,
          sum(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) AS approved,
          sum(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) AS rejected
      `)
    ]);

    const apps = (results as any[]).map(r => r.application);
    const sumData = summaryRes.length > 0 ? (summaryRes[0] as any) : { total: 0, pending: 0, approved: 0, rejected: 0 };
    const toNumber = (v: any) => typeof v === 'object' && v !== null && 'toNumber' in v ? v.toNumber() : Number(v ?? 0);

    res.json({
      applications: apps,
      summary: {
        total:    toNumber(sumData.total),
        pending:  toNumber(sumData.pending),
        approved: toNumber(sumData.approved),
        rejected: toNumber(sumData.rejected),
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/applications/:id/status (Admin: approve/reject) ────────────
applicationsRouter.put("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status, remarks } = req.body;
    if (!["approved", "rejected", "pending"].includes(status))
      return res.status(400).json({ error: "status must be approved, rejected, or pending" });

    await runQuery(`
      MATCH (a:Application {id: $id})
      SET a.status = $status, a.remarks = $remarks, a.reviewedAt = $reviewedAt
    `, { id: req.params.id, status, remarks: remarks || "", reviewedAt: new Date().toISOString() });

    res.json({ success: true, applicationId: req.params.id, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
