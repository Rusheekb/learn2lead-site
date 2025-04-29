
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const scriptPath = path.join(__dirname, 'db-migrate.js');

try {
  // Make the script executable (Unix-like systems only)
  if (process.platform !== 'win32') {
    execSync(`chmod +x ${scriptPath}`);
    console.log('Script is now executable.');
  }
} catch (error) {
  console.error('Error making script executable:', error);
}
