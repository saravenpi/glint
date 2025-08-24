import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_PATH = path.join(__dirname, "..", "package.json");

/**
 * Get current version from package.json
 * @returns {Promise<string>} Current version
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const pkgContent = await fs.readFile(PACKAGE_PATH, "utf8");
    const pkg = JSON.parse(pkgContent);
    return pkg.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

/**
 * Get latest version from GitHub releases
 * @returns {Promise<string|null>} Latest version or null if error
 */
export async function getLatestVersion(): Promise<string | null> {
  try {
    const result = execSync(
      "gh release list --repo Saravenpi/glint --limit 1 --json tagName",
      { encoding: "utf8" }
    );
    const releases = JSON.parse(result);
    if (releases.length > 0) {
      return releases[0].tagName.replace(/^v/, "");
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Compare two version strings
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  
  return 0;
}

/**
 * Check if update is available
 * @returns {Promise<{available: boolean, current: string, latest: string|null}>}
 */
export async function checkForUpdate(): Promise<{
  available: boolean;
  current: string;
  latest: string | null;
}> {
  const current = await getCurrentVersion();
  const latest = await getLatestVersion();
  
  if (!latest) {
    return { available: false, current, latest: null };
  }
  
  const available = compareVersions(current, latest) < 0;
  return { available, current, latest };
}

/**
 * Update to latest version
 * @returns {Promise<boolean>} Success status
 */
export async function selfUpdate(): Promise<boolean> {
  try {
    console.log("🔄 Checking for updates...");
    const { available, current, latest } = await checkForUpdate();
    
    if (!available) {
      console.log(`✅ Already on latest version (v${current})`);
      return true;
    }
    
    console.log(`📦 Updating from v${current} to v${latest}...`);
    
    // Pull latest changes
    console.log("📥 Pulling latest changes...");
    execSync("git pull origin main", { stdio: "inherit" });
    
    // Install dependencies
    console.log("📦 Installing dependencies...");
    execSync("bun install", { stdio: "inherit" });
    
    // Build the project
    console.log("🔨 Building project...");
    execSync("bun run build", { stdio: "inherit" });
    
    console.log(`✅ Successfully updated to v${latest}`);
    console.log("🔄 Please restart glint to use the new version");
    
    return true;
  } catch (error: any) {
    console.error(`❌ Update failed: ${error.message}`);
    return false;
  }
}

/**
 * Increment version and create a new release
 * @param {string} type - Version bump type: "patch", "minor", "major"
 * @returns {Promise<string>} New version
 */
export async function bumpVersion(type: "patch" | "minor" | "major" = "patch"): Promise<string> {
  const current = await getCurrentVersion();
  const parts = current.split(".").map(Number);
  
  switch (type) {
    case "major":
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case "minor":
      parts[1]++;
      parts[2] = 0;
      break;
    case "patch":
    default:
      parts[2]++;
      break;
  }
  
  const newVersion = parts.join(".");
  
  // Update package.json
  const pkgContent = await fs.readFile(PACKAGE_PATH, "utf8");
  const pkg = JSON.parse(pkgContent);
  pkg.version = newVersion;
  await fs.writeFile(PACKAGE_PATH, JSON.stringify(pkg, null, 2) + "\n");
  
  return newVersion;
}