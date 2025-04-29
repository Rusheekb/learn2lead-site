
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase environment variables are not set.');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Directory containing the migration files
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

// Check if the migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  console.error(`Error: Migrations directory ${migrationsDir} does not exist.`);
  process.exit(1);
}

// Get all .sql files in the migrations directory, sorted by filename
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log('Found migration files:', migrationFiles);

// Function to execute a SQL file
async function executeMigration(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split the SQL content into individual statements
    const statements = sql.split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      console.log(`Executing SQL: ${statement.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Error executing SQL: ${error.message}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error processing migration file ${filePath}:`, error);
    return false;
  }
}

// Execute migrations
async function runMigrations() {
  console.log('Starting database migrations...');
  
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    console.log(`Applying migration: ${file}`);
    
    const success = await executeMigration(filePath);
    if (!success) {
      console.error(`Failed to apply migration: ${file}`);
      process.exit(1);
    }
    
    console.log(`Successfully applied migration: ${file}`);
  }
  
  console.log('All migrations completed successfully!');
}

// Run the migrations
runMigrations()
  .catch(error => {
    console.error('An error occurred during migration:', error);
    process.exit(1);
  });
