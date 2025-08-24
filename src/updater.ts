#!/usr/bin/env bun

import { selfUpdate, checkForUpdate, getCurrentVersion } from "./version";

/**
 * Standalone updater CLI
 */
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case "check":
      const { available, current, latest } = await checkForUpdate();
      if (available) {
        console.log(`🆕 Update available: v${current} → v${latest}`);
        console.log("Run 'glint update' to install");
      } else {
        console.log(`✅ You're on the latest version (v${current})`);
      }
      break;
      
    case "update":
      await selfUpdate();
      break;
      
    case "version":
      const version = await getCurrentVersion();
      console.log(`Glint v${version}`);
      break;
      
    default:
      console.log("Glint Update System");
      console.log("\nCommands:");
      console.log("  glint check    - Check for updates");
      console.log("  glint update   - Update to latest version");
      console.log("  glint version  - Show current version");
      break;
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { selfUpdate, checkForUpdate, getCurrentVersion };