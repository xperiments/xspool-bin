import { time, timeStamp } from "console";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const mergedVersionFileName = "db/bdd-ver.json";
let versionJson = JSON.parse(readFileSync(mergedVersionFileName, "utf8"));
const version = versionJson.version + 1;
// --- Part 1: Merge JSON Files ---
const files = {
  "tiger-bdd": "../tmp/tiger-bdd.json",
  "bbl-bdd": "../tmp/bbl-bdd.json",
  "creality-bdd": "../tmp/creality-bdd.json",
  "anycubic-bdd": "../scripts/anycubic-bdd.json",
};

const currentTimeStamp = new Date().getTime();
const mergedData = {
  version,
};

for (const [key, filePath] of Object.entries(files)) {
  const fullPath = resolve(__dirname, filePath);
  if (!existsSync(fullPath)) {
    console.error("File does not exist:", fullPath);
    process.exit(1);
  }
  const fileData = JSON.parse(readFileSync(fullPath, "utf8"));
  mergedData[key] = fileData;
}

// --- Part 2: Generate Header File from Merged JSON ---

// The merged JSON file name (used for route and variable naming)
const mergedFileName = "db/bdd.json";

// Write the header file..
writeFileSync(mergedFileName, JSON.stringify(mergedData));
writeFileSync(mergedVersionFileName, JSON.stringify({ version }));
