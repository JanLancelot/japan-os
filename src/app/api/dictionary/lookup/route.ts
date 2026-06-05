import { NextResponse } from "next/server";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

// Cache database connection
let db: DatabaseSync | null = null;
const dbPath = path.resolve(process.cwd(), "public/dictionaries/jitendex.db");

function getDb() {
  if (db) return db;
  
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found at ${dbPath}`);
    return null;
  }
  
  try {
    db = new DatabaseSync(dbPath);
    // Optimize SQLite connection
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");
    return db;
  } catch (err) {
    console.error("Failed to connect to database:", err);
    return null;
  }
}

// Generate candidate stems from standard Japanese verb/adjective conjugations
function getDeconjugations(text: string): string[] {
  const results = new Set<string>();
  results.add(text);

  // 1. Polite form (~ます, ~ました, ~ません, ~ましょう, ~ませ)
  if (text.endsWith("ましょう")) {
    addStems(text.slice(0, -4), results);
  } else if (text.endsWith("ました") || text.endsWith("ましょう") || text.endsWith("ません")) {
    addStems(text.slice(0, -3), results);
  } else if (text.endsWith("ます") || text.endsWith("ませ")) {
    addStems(text.slice(0, -2), results);
  }

  // 2. Te-form & Past-form (~て, ~た, ~で, ~だ, ~ている, ~てある, ~ておく)
  let base = text;
  if (base.endsWith("ている") || base.endsWith("てある") || base.endsWith("ておく") || base.endsWith("ておる")) {
    base = base.slice(0, -3);
  } else if (base.endsWith("てる") || base.endsWith("とる") || base.endsWith("てた") || base.endsWith("いだ")) {
    base = base.slice(0, -2);
  } else if (base.endsWith("ていた") || base.endsWith("てあった") || base.endsWith("ておいた")) {
    base = base.slice(0, -4);
  }

  if (base.endsWith("て") || base.endsWith("た")) {
    const stem = base.slice(0, -1);
    results.add(stem + "る"); // Ichidan
    if (stem.endsWith("し")) results.add(stem.slice(0, -1) + "す"); // 話した -> 話す
    if (stem.endsWith("い")) {
      const s = stem.slice(0, -1);
      results.add(s + "く"); // 書いた -> 書く
      results.add(s + "う"); // 買った -> 買う
      results.add(s + "る"); // 走った -> 走る
    }
    if (stem.endsWith("っ")) {
      const s = stem.slice(0, -1);
      results.add(s + "う"); // 買った -> 買う
      results.add(s + "つ"); // 待った -> 待つ
      results.add(s + "る"); // 走った -> 走る
    }
  } else if (base.endsWith("で") || base.endsWith("だ")) {
    const stem = base.slice(0, -1);
    if (stem.endsWith("い")) results.add(stem.slice(0, -1) + "ぐ"); // 泳いだ -> 泳ぐ
    if (stem.endsWith("ん")) {
      const s = stem.slice(0, -1);
      results.add(s + "む"); // 読んだ -> 読む
      results.add(s + "ぶ"); // 遊んだ -> 遊ぶ
      results.add(s + "ぬ"); // 死んだ -> 死ぬ
    }
  }

  // 3. Negative form (~ない, ~なかった, ~ず, ~ぬ)
  if (text.endsWith("なかった")) {
    addNegativeStems(text.slice(0, -4), results);
  } else if (text.endsWith("ない") || text.endsWith("ねば") || text.endsWith("ず")) {
    addNegativeStems(text.slice(0, -2), results);
  } else if (text.endsWith("ぬ")) {
    addNegativeStems(text.slice(0, -1), results);
  }

  // 4. Potential / Conditional (~える, ~えば, ~れば, ~える)
  if (text.endsWith("れば")) {
    results.add(text.slice(0, -2) + "る"); // 食べれば -> 食べる
  } else if (text.endsWith("えば")) {
    results.add(text.slice(0, -2) + "う"); // 買えば -> 買う
  }

  // Potential Godan: e-row + る (e.g. 話せる, 書ける)
  if (text.endsWith("る")) {
    const stem = text.slice(0, -1);
    if (stem.endsWith("せ")) results.add(stem.slice(0, -1) + "す"); // 話せる -> 話す
    if (stem.endsWith("け")) results.add(stem.slice(0, -1) + "く"); // 書ける -> 書く
    if (stem.endsWith("げ")) results.add(stem.slice(0, -1) + "ぐ"); // 泳げる -> 泳ぐ
    if (stem.endsWith("て")) results.add(stem.slice(0, -1) + "つ"); // 待てる -> 待つ
    if (stem.endsWith("べ")) results.add(stem.slice(0, -1) + "ぶ"); // 遊べる -> 遊ぶ
    if (stem.endsWith("め")) results.add(stem.slice(0, -1) + "む"); // 読める -> 読む
    if (stem.endsWith("れ")) results.add(stem.slice(0, -1) + "る"); // 走れる -> 走る
    if (stem.endsWith("え")) results.add(stem.slice(0, -1) + "う"); // 買える -> 買う
  }

  // 5. Adjective endings (~くて, ~かった, ~くない, ~くなかった)
  if (text.endsWith("くなかった")) {
    results.add(text.slice(0, -5) + "い");
  } else if (text.endsWith("かった")) {
    results.add(text.slice(0, -3) + "い");
  } else if (text.endsWith("くない") || text.endsWith("くて")) {
    results.add(text.slice(0, -2) + "い");
  }

  return Array.from(results);
}

function addStems(stem: string, set: Set<string>) {
  set.add(stem + "る"); // Ichidan
  if (stem.endsWith("し")) set.add(stem.slice(0, -1) + "す");
  if (stem.endsWith("き")) set.add(stem.slice(0, -1) + "く");
  if (stem.endsWith("ぎ")) set.add(stem.slice(0, -1) + "ぐ");
  if (stem.endsWith("ち")) set.add(stem.slice(0, -1) + "つ");
  if (stem.endsWith("び")) set.add(stem.slice(0, -1) + "ぶ");
  if (stem.endsWith("み")) set.add(stem.slice(0, -1) + "む");
  if (stem.endsWith("り")) set.add(stem.slice(0, -1) + "る");
  if (stem.endsWith("い")) set.add(stem.slice(0, -1) + "う");
}

function addNegativeStems(stem: string, set: Set<string>) {
  set.add(stem + "る"); // Ichidan
  if (stem.endsWith("さ")) set.add(stem.slice(0, -1) + "す");
  if (stem.endsWith("か")) set.add(stem.slice(0, -1) + "く");
  if (stem.endsWith("が")) set.add(stem.slice(0, -1) + "ぐ");
  if (stem.endsWith("た")) set.add(stem.slice(0, -1) + "つ");
  if (stem.endsWith("ば")) set.add(stem.slice(0, -1) + "ぶ");
  if (stem.endsWith("ま")) set.add(stem.slice(0, -1) + "む");
  if (stem.endsWith("ら")) set.add(stem.slice(0, -1) + "る");
  if (stem.endsWith("わ")) set.add(stem.slice(0, -1) + "う");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") || "";
  
  if (!text) {
    return NextResponse.json({ success: true, results: [] });
  }

  const database = getDb();
  if (!database) {
    return NextResponse.json(
      { success: false, error: "Dictionary database not available. Run npm run build:dict first." },
      { status: 500 }
    );
  }

  // Generate candidate substrings starting from the first character
  // Max search length: 16 characters (typical longest word)
  const maxSearchLen = Math.min(text.length, 16);
  const substrings: string[] = [];
  for (let len = maxSearchLen; len >= 1; len--) {
    substrings.push(text.slice(0, len));
  }

  // Map each candidate substring to its possible deconjugated stems
  // We keep track of which candidate length produced which terms
  const searchTermsMap = new Map<string, { original: string; length: number }>();
  
  for (const sub of substrings) {
    const deconjugations = getDeconjugations(sub);
    for (const term of deconjugations) {
      if (!searchTermsMap.has(term)) {
        searchTermsMap.set(term, { original: sub, length: sub.length });
      }
    }
  }

  const termsToQuery = Array.from(searchTermsMap.keys());
  if (termsToQuery.length === 0) {
    return NextResponse.json({ success: true, results: [] });
  }

  // Query terms from SQLite
  // We construct the IN (?, ?, ...) clause dynamically
  const placeholders = termsToQuery.map(() => "?").join(", ");
  const query = `
    SELECT expression, reading, definition_tags, rules, popularity, definition, sequence
    FROM terms
    WHERE expression IN (${placeholders}) OR reading IN (${placeholders})
  `;

  try {
    const stmt = database.prepare(query);
    // Bind terms to query: we pass termsToQuery twice (for expression and reading)
    const params = [...termsToQuery, ...termsToQuery];
    const rows = stmt.all(...params) as Array<{
      expression: string;
      reading: string;
      definition_tags: string;
      rules: string;
      popularity: number | null;
      definition: string;
      sequence: number | null;
    }>;

    // Attach matching score/metadata (match length, matched text)
    const results = rows.map((row) => {
      // Find the search term that matched this entry
      const matchMetaExpression = searchTermsMap.get(row.expression);
      const matchMetaReading = searchTermsMap.get(row.reading);
      
      const matchMeta = matchMetaExpression || matchMetaReading || { original: row.expression, length: row.expression.length };
      
      return {
        expression: row.expression,
        reading: row.reading,
        definitionTags: row.definition_tags ? row.definition_tags.split(" ") : [],
        rules: row.rules ? row.rules.split(" ") : [],
        popularity: row.popularity,
        definition: JSON.parse(row.definition),
        sequence: row.sequence,
        matchedText: matchMeta.original,
        matchedLength: matchMeta.length,
      };
    });

    // Sort results:
    // 1. Longest matchedLength (longest prefix match) first
    // 2. Sort by popularity (smaller rank or higher priority if popularity is defined)
    // 3. Exact matching expressions first
    results.sort((a, b) => {
      if (b.matchedLength !== a.matchedLength) {
        return b.matchedLength - a.matchedLength;
      }
      
      // Popularity sorting (if popularity is ranking, lower is better. If popularity is a score, higher is better.
      // Yomitan popularity is usually ranking or index score. Let's do lower number first if > 0, otherwise default.
      const popA = a.popularity !== null && a.popularity !== undefined ? a.popularity : Infinity;
      const popB = b.popularity !== null && b.popularity !== undefined ? b.popularity : Infinity;
      if (popA !== popB) {
        return popA - popB;
      }
      
      return a.expression.length - b.expression.length;
    });

    // Limit to top 20 matches to avoid bloating response
    return NextResponse.json({ success: true, results: results.slice(0, 20) });
  } catch (err) {
    console.error("Query execution error:", err);
    return NextResponse.json({ success: false, error: "Database query failed" }, { status: 500 });
  }
}
