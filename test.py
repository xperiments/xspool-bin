import requests
import json
from datetime import datetime

SWAGGER_URL = "https://api.tigertag.io/apispec:tigertag?type=json&token="
OUTPUT_DB_JSON = "./tiger-bdd.json"

endpoints = {}
endpointData = {}

def fetchSwaggerDefinition():
    """
    Fetch the Swagger definition from SWAGGER_URL and initiate data extraction.
    """
    try:
        response = requests.get(SWAGGER_URL)
        response.raise_for_status()
        swaggerData = response.json()
        
        extractGetAllEndpoints(swaggerData)
        fetchEndpointData()
    except requests.RequestException as err:
        print("Failed to load Swagger definition:", err)

def extractGetAllEndpoints(swaggerData):
    """
    Extract endpoints containing '/get/all' but not '/by_page',
    then store them in the global 'endpoints' dictionary.
    """
    global endpoints
    if 'paths' in swaggerData:
        all_paths = swaggerData['paths'].keys()
        
        filtered_paths = [
            path for path in all_paths 
            if "/get/all" in path and "/by_page" not in path
        ]
        
        endpoints = {path: swaggerData['paths'][path] for path in filtered_paths}
        print("GET ALL endpoints successfully loaded into memory.")
    else:
        print("No paths found in Swagger definition.")

def fetchEndpointData():
    """
    Fetch data from each endpoint in 'endpoints', store sorted results,
    and export them to JSON.
    """
    global endpointData
    for path in endpoints:
        try:
            full_url = f"https://api.tigertag.io/api:tigertag/{path}"
            response = requests.get(full_url)
            if not response.ok:
                print(f"Failed to fetch data from {path}: {response.status_code}")
                continue

            # Convert path into a clean key name
            keyPath = transform_path(path)
            endpointData[keyPath] = response.json()
        except requests.RequestException as err:
            print(f"Error fetching data from {path}:", err)
    
    # Sort each array by 'label' or 'name'
    for key, items in endpointData.items():
        if isinstance(items, list) and items:
            sample = items[0]
            if 'label' in sample:
                items.sort(key=lambda x: x['label'])
            elif 'name' in sample:
                items.sort(key=lambda x: x['name'])
    
    exportBaseJsonFile()

def transform_path(path_str):
    """
    1) Remove '/get/all'
    2) Replace underscores with slashes
    3) Split by slash
    4) Capitalize each part
    5) Join parts with underscores
    6) If the result starts with '_', remove that underscore
    7) Remove all remaining underscores
    8) Lowercase the first letter (or the entire string, as desired)
    """
    # Step 1
    path_str = path_str.replace("/get/all", "")

    # Step 2
    path_str = path_str.replace("_", "/")

    # Step 3
    parts = [p for p in path_str.split("/") if p]

    # Step 4
    capitalized_parts = [part.capitalize() for part in parts]

    # Step 5
    keyPath = "_".join(capitalized_parts)

    # Step 6: If the resulting string starts with an underscore, remove it
    if keyPath.startswith("_"):
        keyPath = keyPath[1:]

    # Step 7: Remove all remaining underscores
    keyPath = keyPath.replace("_", "")

    # Step 8: Lowercase the **first** letter (or remove the [1:] part to fully lowercase)
    if len(keyPath) > 0:
        keyPath = keyPath[0].lower() + keyPath[1:]

    return keyPath

def exportBaseJsonFile():
    """
    Include a date stamp in the endpoint data and write it to OUTPUT_DB_JSON.
    """
    endpointData["date"] = datetime.now().strftime("%Y-%m-%d")
    
    with open(OUTPUT_DB_JSON, "w", encoding="utf-8") as file:
        json.dump(endpointData, file, indent=2)
    
    print("Base JSON file generated successfully at:", OUTPUT_DB_JSON)

if __name__ == "__main__":
    fetchSwaggerDefinition()
