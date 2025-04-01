import fetch from "node-fetch";
import fs from "fs";

// API endpoint for the Swagger definition
const SWAGGER_URL = "https://api.tigertag.io/apispec:tigertag?type=json&token=";
const OUTPUT_DB_JSON = "./tiger-bdd.json";

let endpoints = {}; // In-memory storage for endpoint definitions
let endpointData = {}; // Store fetched data from endpoints

// --- Main fetching functions ---
async function fetchSwaggerDefinition() {
  try {
    const response = await fetch(SWAGGER_URL);

    if (!response.ok) {
      throw new Error(
        `Error fetching Swagger definition: ${response.statusText}`
      );
    }

    const swaggerData = await response.json();
    extractGetAllEndpoints(swaggerData);
    await fetchEndpointData();
  } catch (error) {
    console.error("Failed to load Swagger definition:", error);
  }
}

// Extract endpoints containing "/get/all" but not "/by_page"
function extractGetAllEndpoints(swaggerData) {
  if (swaggerData.paths) {
    endpoints = Object.keys(swaggerData.paths)
      .filter((path) => path.includes("/get/all"))
      .filter((path) => !path.includes("/by_page"))
      .reduce((acc, path) => {
        acc[path] = swaggerData.paths[path];
        return acc;
      }, {});
    console.log("GET ALL endpoints successfully loaded into memory.");
  } else {
    console.warn("No paths found in Swagger definition.");
  }
}

// Fetch data from each endpoint, then generate the TypeScript file and base JSON.
async function fetchEndpointData() {
  const endpointKeys = Object.keys(endpoints);

  for (const path of endpointKeys) {
    try {
      const fullUrl = `https://api.tigertag.io/api:tigertag/${path}`;
      const response = await fetch(fullUrl);

      if (!response.ok) {
        console.warn(
          `Failed to fetch data from ${path}: ${response.statusText}`
        );
        continue;
      }
      // Create a key name based on the URL path.
      let keyPath = path
        .replace("/get/all", "")
        .replaceAll("_", "/")
        .split("/")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("_")
        .substring(1)
        .replace(/_/gi, "");

      keyPath = keyPath[0].toLowerCase() + keyPath.slice(1);
      endpointData[keyPath] = await response.json();
    } catch (error) {
      console.error(`Error fetching data from ${path}:`, error);
    }
  }

  // --- Sort each endpoint's data by "label" (if available) or "name" ---
  for (const key in endpointData) {
    if (Array.isArray(endpointData[key]) && endpointData[key].length > 0) {
      const sample = endpointData[key][0];
      if (sample.label !== undefined) {
        endpointData[key].sort((a, b) => a.label.localeCompare(b.label));
      } else if (sample.name !== undefined) {
        endpointData[key].sort((a, b) => a.name.localeCompare(b.name));
      }
    }
  }

  // Generate the TypeScript file and the base JSON file.
  exportBaseJsonFile();
}

// --- JSON File Generation ---
function exportBaseJsonFile() {
  // add a key to the endpointData object with date in format YYYY-MM-DD
  const date = new Date();
  const formattedDate = date.toISOString().split("T")[0];
  endpointData["date"] = formattedDate;
  fs.writeFileSync(OUTPUT_DB_JSON, JSON.stringify(endpointData, null, 2));
  console.log("Base JSON file generated successfully at:", OUTPUT_DB_JSON);
}

fetchSwaggerDefinition();
