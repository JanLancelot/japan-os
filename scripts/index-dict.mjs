import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..");
const EXTRACTED_DIR = path.join(PROJECT_ROOT, "public", "dictionaries", "extracted");
const DB_PATH = path.join(PROJECT_ROOT, "public", "dictionaries", "jitendex.db");

function indexDictionary() {
  console.log("Starting dictionary indexing...");
  console.log("Source directory:", EXTRACTED_DIR);
  console.log("Database path:", DB_PATH);

  if (!fs.existsSync(EXTRACTED_DIR)) {
    console.error(`Error: Extracted directory not found at ${EXTRACTED_DIR}`);
    console.error("Please ensure you have unzipped the dictionary first.");
    process.exit(1);
  }

  // Remove existing database if it exists to start fresh
  if (fs.existsSync(DB_PATH)) {
    console.log("Removing existing database...");
    fs.unlinkSync(DB_PATH);
  }

  const db = new DatabaseSync(DB_PATH);

  // Enable WAL mode for better concurrency and speed
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");

  // Create table
  console.log("Creating table...");
  db.exec(`
    CREATE TABLE terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expression TEXT NOT NULL,
      reading TEXT,
      definition_tags TEXT,
      rules TEXT,
      popularity INTEGER,
      definition TEXT, -- JSON string
      sequence INTEGER
    );
  `);

  console.log("Creating indexes...");
  db.exec("CREATE INDEX idx_terms_expression ON terms(expression);");
  db.exec("CREATE INDEX idx_terms_reading ON terms(reading);");

  // Get all term bank files
  const files = fs
    .readdirSync(EXTRACTED_DIR)
    .filter((f) => f.startsWith("term_bank_") && f.endsWith(".json"))
    .sort((a, b) => {
      const numA = parseInt(a.replace("term_bank_", "").replace(".json", ""), 10);
      const numB = parseInt(b.replace("term_bank_", "").replace(".json", ""), 10);
      return numA - numB;
    });

  if (files.length === 0) {
    console.error("Error: No term_bank_*.json files found in the extracted directory.");
    process.exit(1);
  }

  console.log(`Found ${files.length} term bank files to index.`);

  const insertStmt = db.prepare(`
    INSERT INTO terms (expression, reading, definition_tags, rules, popularity, definition, sequence)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  const startTime = Date.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(EXTRACTED_DIR, file);
    
    // Read and parse file
    const content = fs.readFileSync(filePath, "utf8");
    const terms = JSON.parse(content);

    // Insert in a single transaction per file
    db.exec("BEGIN TRANSACTION;");
    try {
      for (const term of terms) {
        // Yomitan format:
        // [expression, reading, definition_tags, rules, popularity, definitions, sequence, sequence_tags]
        const [
          expression,
          reading,
          definition_tags,
          rules,
          popularity,
          definitions,
          sequence
        ] = term;

        insertStmt.run(
          expression || "",
          reading || "",
          definition_tags || "",
          rules || "",
          popularity !== null && popularity !== undefined ? Number(popularity) : null,
          JSON.stringify(definitions || []),
          sequence !== null && sequence !== undefined ? Number(sequence) : null
        );
      }
      db.exec("COMMIT;");
      totalInserted += terms.length;
      
      const pct = (((i + 1) / files.length) * 100).toFixed(1);
      console.log(`Indexed ${file} (${terms.length} terms) - ${pct}% complete (${totalInserted} total terms)`);
    } catch (err) {
      db.exec("ROLLBACK;");
      console.error(`Error indexing file ${file}:`, err);
      process.exit(1);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nSuccess! Fully indexed ${totalInserted} terms in ${elapsed}s.`);
}

indexDictionary();
