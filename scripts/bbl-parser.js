import { writeFileSync } from "fs";
import axios from "axios";

class BambuLabAPI {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async getSlicerResource(params = {}) {
    try {
      const response = await this.client.get(
        "/v1/iot-service/api/slicer/resource",
        { params }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get slicer resource:", error);
    }
  }

  async getSlicerSetting({ version }) {
    try {
      const response = await this.client.get(
        `/v1/iot-service/api/slicer/setting?version=${version}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get slicer setting:", error);
    }
  }

  async getSlicerSettingById(settingId) {
    try {
      const response = await this.client.get(
        `/v1/iot-service/api/slicer/setting/${settingId}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get slicer setting by ID:", error);
    }
  }

  async saveAsTypeScriptFile(materials) {
    const tsFileContent = `\
interface BambuLabMaterial {
  trayInfoIdx: string;
  trayType: string;
  vendor: string;
  name: string;
  density: number;
  flowRatio: number;
  temperatureVitrification: number;
  pressureAdvance: number;
  maxVolumetricSpeed: number;
  nozzleTemperature: number;
  nozzleTempMax: number;
  nozzleTempMin: number;
  chamberTemperature: number;
  isSupport: boolean;
  isSoluble: boolean;
  cost: number;
}

export const BambuLabMaterials: BambuLabMaterial[] = [
  ${materials
    .map((item) => {
      return `{
    trayInfoIdx: "${item.tray_info_idx}",
    trayType: "${item.tray_type}",
    vendor: "${item.vendor}",
    name: "${item.name}",
    density: ${item.filament_density},
    flowRatio: ${item.filament_flow_ratio},
    temperatureVitrification: ${item.temperature_vitrification},
    pressureAdvance: ${item.pressure_advance},
    maxVolumetricSpeed: ${item.filament_max_volumetric_speed},
    nozzleTemperature: ${item.nozzle_temperature},
    nozzleTempMax: ${item.nozzle_temp_max},
    nozzleTempMin: ${item.nozzle_temp_min},
    chamberTemperature: ${item.chamber_temperatures},
    isSupport: ${item.filament_is_support},
    isSoluble: ${item.filament_is_soluble},
    cost: ${item.filament_cost},
  }`;
    })
    .join(",\n  ")}
];
`;
    writeFileSync("../src/models/bbl-materials.ts", tsFileContent);
    console.log("Generated TypeScript file: ../src/models/bbl-materials.ts");
  }

  async saveAsJSONFile(materials) {
    writeFileSync("./tmp/bbl-bdd.json", JSON.stringify(materials));
    console.log("Generated JSON file: ./tmps/bbl-bdd.json");
  }
}

(async () => {
  const api = new BambuLabAPI("https://api.bambulab.com");
  const settings = await api.getSlicerSetting({ version: "01.10.02.64" });
  const { filament } = settings;
  const { public: pub } = filament;

  // Create a map from filament_id to its public settings
  const publicMap = pub.reduce((acc, el) => {
    acc[el.filament_id] = el;
    return acc;
  }, {});

  // Get the setting IDs to fetch
  const keys = Object.keys(publicMap).map((id) => publicMap[id].setting_id);
  const output = {};

  // Retrieve each setting and process it
  await Promise.all(
    keys.map(async (key) => {
      try {
        const el1 = await api.getSlicerSettingById(key);
        const {
          chamber_temperatures,
          nozzle_temperature,
          nozzle_temperature_range_high,
          nozzle_temperature_range_low,
          filament_id,
          filament_type,
          filament_vendor,
          filament_cost,
          filament_density,
          filament_diameter,
          filament_flow_ratio,
          filament_is_support,
          filament_is_soluble,
          temperature_vitrification,
          pressure_advance,
          filament_max_volumetric_speed,
        } = el1.setting;

        const { name } = el1;

        const template = {
          vendor: Array.isArray(filament_vendor)
            ? filament_vendor[0]
            : filament_vendor,
          chamber_temperatures: Array.isArray(chamber_temperatures)
            ? parseInt(chamber_temperatures[0], 10)
            : parseInt(chamber_temperatures, 10),
          nozzle_temp_max: Array.isArray(nozzle_temperature_range_high)
            ? nozzle_temperature_range_high[0]
            : nozzle_temperature_range_high,
          nozzle_temp_min: Array.isArray(nozzle_temperature_range_low)
            ? nozzle_temperature_range_low[0]
            : nozzle_temperature_range_low,
          tray_info_idx: filament_id,
          tray_type: Array.isArray(filament_type)
            ? filament_type[0]
            : filament_type,
          filament_cost: Array.isArray(filament_cost)
            ? Math.floor(parseFloat(filament_cost[0]) * 100)
            : Math.floor(parseFloat(filament_cost) * 100),
          filament_density: Array.isArray(filament_density)
            ? Math.floor(parseFloat(filament_density[0]) * 100)
            : Math.floor(parseFloat(filament_density) * 100),
          filament_diameter: Array.isArray(filament_diameter)
            ? Math.floor(parseFloat(filament_diameter[0]) * 100)
            : Math.floor(parseFloat(filament_diameter) * 100),
          filament_flow_ratio: Array.isArray(filament_flow_ratio)
            ? Math.floor(parseFloat(filament_flow_ratio[0]) * 100)
            : Math.floor(parseFloat(filament_flow_ratio) * 100),
          filament_is_support: Array.isArray(filament_is_support)
            ? filament_is_support[0] === "1"
            : filament_is_support === "1",
          filament_is_soluble: Array.isArray(filament_is_soluble)
            ? filament_is_soluble[0] === "1"
            : filament_is_soluble === "1",
          temperature_vitrification: Array.isArray(temperature_vitrification)
            ? temperature_vitrification[0]
            : temperature_vitrification,
          pressure_advance: Array.isArray(pressure_advance)
            ? pressure_advance[0]
            : pressure_advance || 0,
          filament_max_volumetric_speed: Array.isArray(
            filament_max_volumetric_speed
          )
            ? Math.floor(parseFloat(filament_max_volumetric_speed[0]) * 10)
            : Math.floor(parseFloat(filament_max_volumetric_speed) * 10),
          nozzle_temperature: Array.isArray(nozzle_temperature)
            ? parseInt(nozzle_temperature[0], 10)
            : parseInt(nozzle_temperature, 10),
        };

        output[filament_id] = { ...template, name: name.split("@")[0].trim() };
      } catch (error) {
        console.error("Failed to get slicer setting by ID:", error);
      }
    })
  );

  // Sort the materials by vendor and name
  const sortedMaterials = Object.values(output).sort((a, b) => {
    if (a.vendor < b.vendor) return -1;
    if (a.vendor > b.vendor) return 1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });

  // Save both TypeScript and JSON files
  // await api.saveAsTypeScriptFile(sortedMaterials);
  await api.saveAsJSONFile(sortedMaterials);
})();
