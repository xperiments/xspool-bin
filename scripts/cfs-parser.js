import { writeFileSync, existsSync, readFileSync } from "fs";
import { get } from "https";
import { join } from "path";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const url =
  "https://raw.githubusercontent.com/Guilouz/Creality-K2Plus-Extracted-Firmwares/e4635623cb4e9c8302d645e1d8adc61ab0c55f97/Firmware/etc/sysConfig/material_database.json";
const localFilePath = join(__dirname, "../tmp/material_database.json");

// Function to download the JSON file
function downloadJSONFile(callback) {
  get(url, (res) => {
    if (res.statusCode === 200) {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        writeFileSync(localFilePath, data);
        console.log(
          "Downloaded and saved material_database.json successfully."
        );
        callback(null, JSON.parse(data));
      });
    } else {
      console.error(`Failed to download file. Status code: ${res.statusCode}`);
      callback(new Error("Download failed"));
    }
  }).on("error", (err) => {
    console.error(`Error during download: ${err.message}`);
    callback(err);
  });
}

// Function to read the local JSON file
function readLocalJSONFile(callback) {
  if (existsSync(localFilePath)) {
    const rawData = readFileSync(localFilePath);
    console.log("Loaded material_database.json from local file.");
    callback(null, JSON.parse(rawData));
  } else {
    callback(new Error("Local file not found"));
  }
}

// Function to generate the JSON file
function generateJSONMaterials(rfidDataList) {
  // Convert the array of arrays to an array of objects
  const materials = rfidDataList.map(([id, manufacturer, name, type]) => ({
    id,
    manufacturer,
    name,
    type,
  }));

  const jsonOutputFilePath = join(__dirname, "../tmp/creality-bdd.json");
  writeFileSync(jsonOutputFilePath, JSON.stringify(materials));
  console.log(
    `JSON file 'creality-materials.json' generated successfully at ${jsonOutputFilePath}`
  );
}

// Function to generate the TypeScript file
function generateTypeScriptMaterials(jsonData) {
  const rfidDataList = jsonData.result.list.map((mat) => {
    const { id, brand: manufacturer, name, meterialType: type } = mat.base;

    // id needs to be exactly 6 characters long (padded with 0s)
    const paddedId = id.toString().padStart(6, "0");

    return [paddedId, manufacturer, name, type];
  });

  // Sort by manufacturer and then by name
  rfidDataList.sort((a, b) => {
    const brandComparison = a[1].localeCompare(b[1]);
    if (brandComparison !== 0) {
      return brandComparison;
    }
    return a[2].localeCompare(b[2]);
  });

  const tsContent = `\
interface CFSMaterial {
  id: string;
  manufacturer: string;
  name: string;
  type: string;
}

const CFSMaterials = [
  ${rfidDataList
    .map((m) => `["${m[0]}", "${m[1]}", "${m[2]}", "${m[3]}"]`)
    .join(",\n  ")}
];

export const CFSMaterialsList: CFSMaterial[] = CFSMaterials.map(
  ([id, manufacturer, name, type]) => ({ id, manufacturer, name, type })
);
`;

  return rfidDataList;
}
// Main function to orchestrate the process
function main() {
  downloadJSONFile((downloadErr, jsonData) => {
    if (downloadErr) {
      console.log("Attempting to read local file due to download error...");
      readLocalJSONFile((readErr, localData) => {
        if (readErr) {
          console.error("Failed to read local file. Exiting.");
        } else {
          const rfidDataList = generateTypeScriptMaterials(localData);
          generateJSONMaterials(rfidDataList);
        }
      });
    } else {
      const rfidDataList = generateTypeScriptMaterials(jsonData);
      generateJSONMaterials(rfidDataList);
    }
  });
}

// Execute the main function
main();
