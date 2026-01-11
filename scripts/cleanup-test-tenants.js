#!/usr/bin/env node

/**
 * Cleanup Test Tenants
 * 
 * Removes all test tenants created during development.
 * Useful for keeping the development environment clean.
 * 
 * Usage:
 *   node cleanup-test-tenants.js [pattern]
 * 
 * Examples:
 *   node cleanup-test-tenants.js              # Remove all test-* sites
 *   node cleanup-test-tenants.js "demo-*"     # Remove all demo-* sites
 */

const { execSync } = require('child_process');

const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker';
const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || 'admin';
const pattern = process.argv[2] || 'test-*';

console.log(`🧹 Cleaning up tenants matching: ${pattern}\n`);

function dockerExec(command) {
  try {
    return execSync(`cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} ${command}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${error.message}`);
  }
}

try {
  // Get list of all sites
  console.log('📋 Fetching site list...');
  const sitesOutput = dockerExec('bench --site all list-sites');
  const allSites = sitesOutput.split('\n').filter(Boolean);
  
  console.log(`Found ${allSites.length} total sites\n`);
  
  // Filter sites matching pattern
  const patternRegex = new RegExp(
    '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
  );
  
  const sitesToDelete = allSites.filter(site => 
    patternRegex.test(site) && site !== 'master.localhost'
  );
  
  if (sitesToDelete.length === 0) {
    console.log('✨ No matching sites found. Nothing to clean up!');
    process.exit(0);
  }
  
  console.log(`Found ${sitesToDelete.length} sites to delete:\n`);
  sitesToDelete.forEach((site, i) => {
    console.log(`  ${i + 1}. ${site}`);
  });
  
  console.log('\n⚠️  This will permanently delete these sites and their data!');
  console.log('Press Ctrl+C within 5 seconds to cancel...\n');
  
  // Wait 5 seconds
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  (async () => {
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`\r⏳ Starting in ${i}...`);
      await delay(1000);
    }
    process.stdout.write('\r\n\n');
    
    // Delete each site
    let successCount = 0;
    let failCount = 0;
    
    for (const site of sitesToDelete) {
      try {
        process.stdout.write(`🗑️  Deleting ${site}...`);
        dockerExec(`bench drop-site ${site} --mariadb-root-password ${DB_ROOT_PASSWORD} --force`);
        console.log(' ✅');
        successCount++;
      } catch (error) {
        console.log(' ❌');
        console.error(`   Error: ${error.message}`);
        failCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Deleted: ${successCount}`);
    if (failCount > 0) {
      console.log(`❌ Failed: ${failCount}`);
    }
    console.log('='.repeat(60));
    
    // Cleanup orphaned databases
    console.log('\n🧹 Cleaning up orphaned databases...');
    try {
      const dbCleanup = `
        bench mariadb -e "
          SELECT CONCAT('DROP DATABASE IF EXISTS \\\\\\`', SCHEMA_NAME, '\\\\\\`;')
          FROM information_schema.SCHEMATA
          WHERE SCHEMA_NAME LIKE '${pattern.replace(/\*/g, '%')}'
            AND SCHEMA_NAME NOT IN (
              SELECT DISTINCT site_name FROM tabSite
            )
        " | grep DROP | bench mariadb
      `;
      dockerExec(dbCleanup);
      console.log('✅ Orphaned databases cleaned');
    } catch (error) {
      console.log('⚠️  Could not clean orphaned databases (may not exist)');
    }
    
    console.log('\n✨ Cleanup complete!');
    
  })();
  
} catch (error) {
  console.error('\n❌ Cleanup failed:', error.message);
  process.exit(1);
}
