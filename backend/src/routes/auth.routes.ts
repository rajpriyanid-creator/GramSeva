import { Router, Request, Response } from "express";
import { runQuery } from "../db/neo4j";
import crypto from "crypto";

export const authRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "gramseva_salt_2026").digest("hex");
}

function generateGramSevaId(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const ts = Date.now().toString().slice(-4);
  return `GSV${year}-${rand}${ts}`;
}

// ─── POST /api/auth/register ──────────────────────────────────────────────
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { phone, password, name } = req.body;
    if (!phone || !password || !name)
      return res.status(400).json({ error: "phone, password, and name are required" });
    if (!/^\d{10}$/.test(phone))
      return res.status(400).json({ error: "Phone must be 10 digits" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const existing = await runQuery(`MATCH (u:User {phone: $phone}) RETURN u.id AS id`, { phone });
    if (existing.length > 0)
      return res.status(409).json({ error: "Phone number already registered" });

    const userId = `USR_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const gramsevaId = generateGramSevaId();
    const passwordHash = hashPassword(password);
    const createdAt = new Date().toISOString();

    await runQuery(`
      CREATE (u:User {
        id: $id, gramsevaId: $gramsevaId, phone: $phone, name: $name,
        passwordHash: $passwordHash, createdAt: $createdAt, role: 'user',
        profileComplete: false
      })
    `, { id: userId, gramsevaId, phone, name, passwordHash, createdAt });

    res.status(201).json({
      success: true,
      user: { id: userId, gramsevaId, phone, name, role: "user", createdAt, profileComplete: false }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ error: "phone and password required" });

    const results = await runQuery(`
      MATCH (u:User {phone: $phone, passwordHash: $passwordHash})
      RETURN u {
        .id, .gramsevaId, .phone, .name, .role, .createdAt, .profileComplete,
        .state, .district, .age, .gender, .caste_category, .community, .annual_income,
        .bpl_card, .occupation, .land_acres, .educationLevel, .maritalStatus,
        .familySize, .aadhaarNo, .rationCardNo, .incomeCertNo, .communityCertNo,
        .voterId, .bankAccountNo, .ifscCode, .bankName,
        .disabilityStatus, .disabilityPercentage, .houseType, .landType,
        .profileUpdatedAt
      } AS user
    `, { phone, passwordHash: hashPassword(password) });

    if (results.length === 0)
      return res.status(401).json({ error: "Invalid phone number or password" });

    const user = (results[0] as any).user;
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
    res.json({ success: true, token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/auth/profile ────────────────────────────────────────────────
authRouter.put("/profile", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      // Personal
      age, gender, maritalStatus, familySize, educationLevel,
      // Location
      state, district,
      // Category
      caste_category, community,
      // Economic
      annual_income, bpl_card, occupation,
      // Land
      land_acres, landType,
      // Housing
      houseType,
      // Disability
      disabilityStatus, disabilityPercentage,
      // Documents
      aadhaarNo, rationCardNo, incomeCertNo, communityCertNo,
      voterId, bankAccountNo, ifscCode, bankName,
    } = req.body;

    if (!userId) return res.status(400).json({ error: "userId required" });

    await runQuery(`
      MATCH (u:User {id: $userId})
      SET u += {
        age: $age, gender: $gender, maritalStatus: $maritalStatus, familySize: $familySize,
        educationLevel: $educationLevel, state: $state, district: $district,
        caste_category: $caste_category, community: $community,
        annual_income: $annual_income, bpl_card: $bpl_card, occupation: $occupation,
        land_acres: $land_acres, landType: $landType, houseType: $houseType,
        disabilityStatus: $disabilityStatus, disabilityPercentage: $disabilityPercentage,
        aadhaarNo: $aadhaarNo, rationCardNo: $rationCardNo, incomeCertNo: $incomeCertNo,
        communityCertNo: $communityCertNo, voterId: $voterId,
        bankAccountNo: $bankAccountNo, ifscCode: $ifscCode, bankName: $bankName,
        profileComplete: true, profileUpdatedAt: $updatedAt
      }
    `, {
      userId,
      age: parseInt(age) || 0, gender: gender || "",
      maritalStatus: maritalStatus || "", familySize: parseInt(familySize) || 1,
      educationLevel: educationLevel || "", state: state || "", district: district || "",
      caste_category: caste_category || "GEN", community: community || "",
      annual_income: parseInt(annual_income) || 0,
      bpl_card: bpl_card === true || bpl_card === "true",
      occupation: occupation || "", land_acres: parseFloat(land_acres) || 0,
      landType: landType || "", houseType: houseType || "",
      disabilityStatus: disabilityStatus === true || disabilityStatus === "true",
      disabilityPercentage: parseInt(disabilityPercentage) || 0,
      aadhaarNo: aadhaarNo || "", rationCardNo: rationCardNo || "",
      incomeCertNo: incomeCertNo || "", communityCertNo: communityCertNo || "",
      voterId: voterId || "", bankAccountNo: bankAccountNo || "",
      ifscCode: ifscCode || "", bankName: bankName || "",
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────
authRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const results = await runQuery(`
      MATCH (u:User {id: $userId})
      RETURN u {
        .id, .gramsevaId, .phone, .name, .role, .createdAt, .profileComplete,
        .state, .district, .age, .gender, .caste_category, .community, .annual_income,
        .bpl_card, .occupation, .land_acres, .educationLevel, .maritalStatus,
        .familySize, .aadhaarNo, .rationCardNo, .incomeCertNo, .communityCertNo,
        .voterId, .bankAccountNo, .ifscCode, .bankName,
        .disabilityStatus, .disabilityPercentage, .houseType, .landType,
        .profileUpdatedAt
      } AS user
    `, { userId: userId as string });

    if (results.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ user: (results[0] as any).user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
