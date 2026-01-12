#!/usr/bin/env bun
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Get the latest git tag
function getLatestTag(): string {
  try {
    const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    // Remove 'v' prefix if present
    return tag.startsWith('v') ? tag.slice(1) : tag;
  } catch (error) {
    console.error('No git tags found. Using default version 0.1.0');
    return '0.1.0';
  }
}

// Update package.json
function updatePackageJson(version: string) {
  const path = join(process.cwd(), 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ Updated package.json to ${version}`);
}

// Update tauri.conf.json
function updateTauriConfig(version: string) {
  const path = join(process.cwd(), 'src-tauri', 'tauri.conf.json');
  const config = JSON.parse(readFileSync(path, 'utf8'));
  config.version = version;
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
  console.log(`✓ Updated tauri.conf.json to ${version}`);
}

// Update Cargo.toml
function updateCargoToml(version: string) {
  const path = join(process.cwd(), 'src-tauri', 'Cargo.toml');
  let content = readFileSync(path, 'utf8');
  content = content.replace(/^version = ".*"$/m, `version = "${version}"`);
  writeFileSync(path, content);
  console.log(`✓ Updated Cargo.toml to ${version}`);
}

// Main
const version = getLatestTag();
console.log(`\nSyncing version to: ${version}\n`);

updatePackageJson(version);
updateTauriConfig(version);
updateCargoToml(version);

console.log('\n✓ Version sync complete!\n');
