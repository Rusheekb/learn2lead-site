import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DbRecord {
  id: string;
  'Class Number': string | null;
  'Tutor Name': string | null;
  'Student Name': string | null;
  Date: string | null;
  'Time (CST)': string | null;
}

// Helper functions for ID generation
const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return 'XX';
  
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return words
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
};

const formatDateForId = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const generateBaseId = (studentName: string, tutorName: string, date: Date | string): string => {
  const studentInitials = getInitials(studentName);
  const tutorInitials = getInitials(tutorName);
  const dateStr = formatDateForId(date);
  return `${studentInitials}-${tutorInitials}-${dateStr}`;
};

const getNextSequence = (baseId: string, existingIds: string[]): number => {
  const matchingIds = existingIds.filter(id => id.startsWith(baseId));
  
  if (matchingIds.length === 0) {
    return 1;
  }
  
  const sequences = matchingIds
    .map(id => {
      const parts = id.split('-');
      const lastPart = parts[parts.length - 1];
      return parseInt(lastPart, 10);
    })
    .filter(num => !isNaN(num));
  
  if (sequences.length === 0) {
    return 1;
  }
  
  return Math.max(...sequences) + 1;
};

const generateClassId = (
  studentName: string,
  tutorName: string,
  date: Date | string,
  existingIds: string[]
): string => {
  const baseId = generateBaseId(studentName, tutorName, date);
  const sequence = getNextSequence(baseId, existingIds);
  return `${baseId}-${sequence}`;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting class number migration...');

    // Fetch all class logs
    const { data: allLogs, error: fetchError } = await supabase
      .from('class_logs')
      .select('id, "Class Number", "Tutor Name", "Student Name", Date, "Time (CST)"')
      .order('Date', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch class logs: ${fetchError.message}`);
    }

    if (!allLogs || allLogs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No class logs found to migrate',
          totalRecords: 0,
          updated: 0,
          skipped: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${allLogs.length} class logs`);

    // Identify records that need migration
    const needsMigration = allLogs.filter(log => {
      const classNumber = (log as any)['Class Number'];
      // Check if Class Number is null, empty, or doesn't match new format (XX-YY-YYYYMMDD-N)
      if (!classNumber || classNumber.trim() === '') return true;
      
      const newFormatPattern = /^[A-Z]{2}-[A-Z]{2}-\d{8}-\d+$/;
      return !newFormatPattern.test(classNumber);
    });

    console.log(`${needsMigration.length} records need migration`);

    if (needsMigration.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All class numbers are already in the correct format',
          totalRecords: allLogs.length,
          updated: 0,
          skipped: allLogs.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all existing class numbers to ensure uniqueness
    const existingIds = allLogs
      .map(log => (log as any)['Class Number'] as string)
      .filter(Boolean);

    const updates: Array<{ id: string; newClassNumber: string }> = [];
    const errors: Array<{ id: string; error: string }> = [];

    // Generate new IDs for records that need migration
    for (const log of needsMigration) {
      try {
        const record = log as any as DbRecord;
        const studentName = record['Student Name'] || 'Unknown';
        const tutorName = record['Tutor Name'] || 'Unknown';
        const date = record.Date || new Date().toISOString();

        const newClassNumber = generateClassId(
          studentName,
          tutorName,
          date,
          existingIds
        );

        updates.push({
          id: record.id,
          newClassNumber
        });

        // Add to existing IDs to prevent duplicates in this batch
        existingIds.push(newClassNumber);

        console.log(`Generated ID for ${record.id}: ${newClassNumber}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error generating ID for ${log.id}:`, errorMsg);
        errors.push({
          id: log.id,
          error: errorMsg
        });
      }
    }

    // Update records in database
    let successCount = 0;
    for (const update of updates) {
      try {
        const { error: updateError } = await supabase
          .from('class_logs')
          .update({ 'Class Number': update.newClassNumber })
          .eq('id', update.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        successCount++;
        console.log(`Updated ${update.id} with ${update.newClassNumber}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error updating ${update.id}:`, errorMsg);
        errors.push({
          id: update.id,
          error: errorMsg
        });
      }
    }

    const result = {
      success: true,
      message: `Migration completed: ${successCount} records updated`,
      totalRecords: allLogs.length,
      needsMigration: needsMigration.length,
      updated: successCount,
      skipped: allLogs.length - needsMigration.length,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Migration complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
