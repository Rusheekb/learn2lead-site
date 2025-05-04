
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}`;
    
    // Execute a database backup using the exec_sql function
    // This will create a JSON export of the public schema tables
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT jsonb_object_agg(table_name, table_data) as backup_data FROM (
          SELECT
            table_name,
            jsonb_agg(row_to_json(t)) as table_data
          FROM (
            SELECT * FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          ) tables
          LEFT JOIN LATERAL (
            SELECT * FROM (
              SELECT * FROM ${table_name}
            ) t
          ) ON true
          WHERE table_name NOT IN ('schema_migrations', 'spatial_ref_sys')
          GROUP BY table_name
        ) subquery
      `
    });
    
    if (error) {
      throw new Error(`Database export error: ${error.message}`);
    }

    // Save the backup data to storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('db-backups')
      .upload(`${backupName}.json`, JSON.stringify(data), {
        contentType: 'application/json',
        cacheControl: '3600'
      });
      
    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }
    
    // Log the successful backup
    await supabase
      .from('backup_logs')
      .insert({
        name: backupName,
        file_path: `${backupName}.json`,
        size_bytes: JSON.stringify(data).length,
        status: 'completed',
        created_by: 'system'
      });
      
    return { success: true, name: backupName, timestamp: new Date().toISOString() };
  } catch (err) {
    console.error('Backup error:', err);
    
    // Log the failed backup attempt
    await supabase
      .from('backup_logs')
      .insert({
        name: `failed-${new Date().toISOString().replace(/[:.]/g, '-')}`,
        status: 'failed',
        error_message: err.message || 'Unknown error',
        created_by: 'system'
      });
      
    return { success: false, error: err.message };
  }
}

async function listBackups() {
  try {
    const { data, error } = await supabase
      .from('backup_logs')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return { success: true, backups: data };
  } catch (err) {
    console.error('Error listing backups:', err);
    return { success: false, error: err.message };
  }
}

async function restoreFromBackup(backupId) {
  try {
    // Get backup details
    const { data: backupInfo, error: backupInfoError } = await supabase
      .from('backup_logs')
      .select('*')
      .eq('id', backupId)
      .single();
      
    if (backupInfoError) throw new Error(`Backup not found: ${backupInfoError.message}`);
    
    // Download backup file
    const { data: backupData, error: downloadError } = await supabase
      .storage
      .from('db-backups')
      .download(backupInfo.file_path);
      
    if (downloadError) throw new Error(`Error downloading backup: ${downloadError.message}`);

    // Parse backup content
    const backupContent = await backupData.text();
    const backupJson = JSON.parse(backupContent);
    
    // Start a transaction for all restore operations
    await supabase.rpc('exec_sql', {
      sql: 'BEGIN;'
    });
    
    // For each table in the backup
    for (const [tableName, tableData] of Object.entries(backupJson.backup_data)) {
      if (Array.isArray(tableData) && tableData.length > 0) {
        // Clear existing table data
        await supabase.rpc('exec_sql', {
          sql: `DELETE FROM ${tableName};`
        });
        
        // Insert backup data
        for (const row of tableData) {
          const columns = Object.keys(row).join(', ');
          const values = Object.values(row)
            .map(val => typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val === null ? 'NULL' : val)
            .join(', ');
          
          await supabase.rpc('exec_sql', {
            sql: `INSERT INTO ${tableName} (${columns}) VALUES (${values});`
          });
        }
      }
    }
    
    // Commit the transaction
    await supabase.rpc('exec_sql', {
      sql: 'COMMIT;'
    });
    
    // Log the restore operation
    await supabase
      .from('backup_logs')
      .insert({
        name: `restore-from-${backupInfo.name}`,
        status: 'restored',
        restored_from: backupId,
        created_by: 'admin'
      });
      
    return { success: true };
  } catch (err) {
    console.error('Restore error:', err);
    
    // Rollback in case of error
    await supabase.rpc('exec_sql', {
      sql: 'ROLLBACK;'
    });
    
    // Log the failed restore attempt
    await supabase
      .from('backup_logs')
      .insert({
        name: `failed-restore-${new Date().toISOString().replace(/[:.]/g, '-')}`,
        status: 'restore_failed',
        error_message: err.message || 'Unknown error',
        created_by: 'admin'
      });
      
    return { success: false, error: err.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Get the auth token from the request
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  try {
    // Get request payload
    const { action, backupId } = await req.json();
    
    let result;
    switch (action) {
      case 'create':
        // Execute backup
        result = await createBackup();
        break;
      case 'list':
        // List available backups
        result = await listBackups();
        break;
      case 'restore':
        // Restore from specific backup
        if (!backupId) {
          return new Response(JSON.stringify({ error: 'Backup ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await restoreFromBackup(backupId);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
