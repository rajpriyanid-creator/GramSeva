import fs from "fs";
import path from "path";
import neo4j from "neo4j-driver";
import crypto from "crypto";

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME || "neo4j";
const password = process.env.NEO4J_PASSWORD;

if (!uri || !password) {
  console.error("❌ Error: NEO4J_URI and NEO4J_PASSWORD must be defined in your environment or .env file.");
  process.exit(1);
}

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

async function runCypherFile(filePath: string) {
  const absolutePath = path.resolve(filePath);
  console.log(`\n📄 Reading Cypher file: ${absolutePath}`);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found: ${absolutePath}`);
    return;
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  
  // Split queries by semicolon, keeping track of comments/empty lines
  const queries = content
    .split(";")
    .map((q) => q.trim())
    .filter((q) => {
      if (!q) return false;
      // Remove comments to check if there is actual query content
      const clean = q.replace(/\/\/.*$/gm, "").trim();
      return clean.length > 0;
    });

  const session = driver.session();
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    try {
      await session.run(query);
      console.log(`✅ Query ${i + 1}/${queries.length} succeeded.`);
    } catch (err: any) {
      // Ignore property existence constraint error on Neo4j community/Aura free tier
      if (err.message.includes("requires Neo4j Enterprise Edition") || err.message.includes("Property existence constraint")) {
        console.warn(`⚠️ Query ${i + 1}/${queries.length} skipped (Requires Neo4j Enterprise): ${err.message}`);
      } else {
        console.error(`❌ Query ${i + 1}/${queries.length} failed:`);
        console.error(query);
        console.error(err.message);
      }
    }
  }
  
  await session.close();
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "gramseva_salt_2026").digest("hex");
}

async function seedUsers() {
  console.log("\n👤 Seeding sample users...");
  const session = driver.session();

  function gsId(n: number) { return `GSV26-SAMP0${n}`; }

  const users = [
    {
      id: "USR_SAMPLE_001", gramsevaId: gsId(1), phone: "9876543210", name: "Ravi Kumar",
      password: "ravi@123", age: 35, gender: "M", maritalStatus: "Married", familySize: 5,
      state: "UP", district: "Lucknow", caste_category: "OBC", community: "Kurmi",
      annual_income: 120000, bpl_card: false, occupation: "farmer",
      land_acres: 3.5, landType: "Agricultural", houseType: "Pucca",
      educationLevel: "10th Pass", disabilityStatus: false, disabilityPercentage: 0,
      aadhaarNo: "2345 6789 0123", rationCardNo: "RC-UP-2023-0456789",
      incomeCertNo: "INC-UP-LKO-2023-001", communityCertNo: "CC-OBC-UP-2021-098",
      voterId: "XWE1234567", bankAccountNo: "0987654321098765",
      ifscCode: "SBIN0001234", bankName: "State Bank of India",
    },
    {
      id: "USR_SAMPLE_002", gramsevaId: gsId(2), phone: "9876543211", name: "Priya Devi",
      password: "priya@123", age: 28, gender: "F", maritalStatus: "Married", familySize: 4,
      state: "TN", district: "Chennai", caste_category: "SC", community: "Paraiyar",
      annual_income: 80000, bpl_card: true, occupation: "labourer",
      land_acres: 0, landType: "", houseType: "Kachha",
      educationLevel: "8th Pass", disabilityStatus: false, disabilityPercentage: 0,
      aadhaarNo: "3456 7890 1234", rationCardNo: "RC-TN-2022-0123456",
      incomeCertNo: "INC-TN-CHN-2022-002", communityCertNo: "CC-SC-TN-2020-047",
      voterId: "TML9876543", bankAccountNo: "1234567890123456",
      ifscCode: "CNRB0001234", bankName: "Canara Bank",
    },
    {
      id: "USR_SAMPLE_003", gramsevaId: gsId(3), phone: "9876543212", name: "Mohan Singh",
      password: "mohan@123", age: 42, gender: "M", maritalStatus: "Married", familySize: 6,
      state: "MH", district: "Pune", caste_category: "GEN", community: "Maratha",
      annual_income: 250000, bpl_card: false, occupation: "business",
      land_acres: 2.0, landType: "Agricultural", houseType: "Pucca",
      educationLevel: "Graduate", disabilityStatus: false, disabilityPercentage: 0,
      aadhaarNo: "4567 8901 2345", rationCardNo: "RC-MH-2021-0789012",
      incomeCertNo: "INC-MH-PUN-2021-003", communityCertNo: "",
      voterId: "MAH2345678", bankAccountNo: "2345678901234567",
      ifscCode: "HDFC0001234", bankName: "HDFC Bank",
    },
    {
      id: "USR_SAMPLE_004", gramsevaId: gsId(4), phone: "9876543213", name: "Lakshmi Bai",
      password: "lakshmi@123", age: 55, gender: "F", maritalStatus: "Widowed", familySize: 3,
      state: "KA", district: "Bangalore", caste_category: "ST", community: "Soliga",
      annual_income: 60000, bpl_card: true, occupation: "farmer",
      land_acres: 1.5, landType: "Agricultural", houseType: "Kachha",
      educationLevel: "5th Pass", disabilityStatus: true, disabilityPercentage: 40,
      aadhaarNo: "5678 9012 3456", rationCardNo: "RC-KA-2020-0345678",
      incomeCertNo: "INC-KA-BLR-2020-004", communityCertNo: "CC-ST-KA-2019-023",
      voterId: "KAR3456789", bankAccountNo: "3456789012345678",
      ifscCode: "PUNB0001234", bankName: "Punjab National Bank",
    },
    {
      id: "USR_SAMPLE_005", gramsevaId: gsId(5), phone: "9876543214", name: "Amit Sharma",
      password: "amit@123", age: 22, gender: "M", maritalStatus: "Unmarried", familySize: 4,
      state: "RJ", district: "Jaipur", caste_category: "GEN", community: "Brahmin",
      annual_income: 180000, bpl_card: false, occupation: "student",
      land_acres: 0, landType: "", houseType: "Pucca",
      educationLevel: "12th Pass", disabilityStatus: false, disabilityPercentage: 0,
      aadhaarNo: "6789 0123 4567", rationCardNo: "RC-RJ-2023-0567890",
      incomeCertNo: "INC-RJ-JPR-2023-005", communityCertNo: "",
      voterId: "RAJ4567890", bankAccountNo: "4567890123456789",
      ifscCode: "ICIC0001234", bankName: "ICICI Bank",
    },
  ];

  for (const u of users) {
    try {
      const { password, ...userData } = u;
      const passwordHash = hashPassword(password);
      await session.run(`
        MERGE (u:User {phone: $phone})
        SET u += $props
      `, {
        phone: u.phone,
        props: {
          ...userData, passwordHash,
          role: "user", profileComplete: true,
          createdAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
          profileUpdatedAt: new Date().toISOString(),
        }
      });
      console.log(`✅ User: ${u.name} | GramSeva ID: ${u.gramsevaId} | ${u.phone} / ${password}`);
    } catch (err: any) {
      console.error(`❌ Failed user ${u.name}: ${err.message}`);
    }
  }
  await session.close();

  console.log("\n📋 SAMPLE CREDENTIALS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  users.forEach(u => {
    console.log(`  ${u.gramsevaId}  ${u.name.padEnd(14)}  ${u.phone}  ${u.password}`);
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}


async function main() {
  try {
    console.log("⚡ Connecting to Neo4j...");
    await driver.verifyConnectivity();
    console.log("✅ Connected.");
    await runCypherFile("../neo4j/constraints.cypher");
    await runCypherFile("../neo4j/indexes.cypher");
    await runCypherFile("../neo4j/seed.cypher");
    await seedUsers();
    console.log("\n🎉 Database seeding completed successfully!");
  } catch (err: any) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await driver.close();
  }
}

main();
