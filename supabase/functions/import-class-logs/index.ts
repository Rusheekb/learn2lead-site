import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassLogRow {
  'Class Number': string;
  'Tutor Name': string;
  'Student Name': string;
  'Date': string;
  'Day': string;
  'Time (CST)': string;
  'Time (hrs)': string;
  'Subject': string;
  'Content': string;
  'HW': string;
  'Class Cost': string;
  'Tutor Cost': string;
  'Student Payment': string;
  'Tutor Payment': string;
  'Additional Info': string;
}

// Utility functions for ID generation (duplicated from frontend for edge function use)
function getInitials(name: string): string {
  const cleaned = name.trim();
  const parts = cleaned.split(/\s+/);
  
  if (parts.length === 1) {
    return cleaned.substring(0, 2).toUpperCase();
  }
  
  const firstInitial = parts[0][0] || '';
  const lastInitial = parts[parts.length - 1][0] || '';
  
  return (firstInitial + lastInitial).toUpperCase();
}

function formatDateForId(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}`;
}

function generateBaseId(studentName: string, tutorName: string, dateStr: string): string {
  const studentInitials = getInitials(studentName);
  const tutorInitials = getInitials(tutorName);
  const formattedDate = formatDateForId(dateStr);
  
  return `${studentInitials}-${tutorInitials}-${formattedDate}`;
}

async function getNextSequence(
  supabase: any,
  baseId: string
): Promise<number> {
  const { data: existingLogs } = await supabase
    .from('class_logs')
    .select('Class Number')
    .like('Class Number', `${baseId}-%`);
  
  if (!existingLogs || existingLogs.length === 0) {
    return 1;
  }
  
  const pattern = new RegExp(`^${baseId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
  const sequences = existingLogs
    .map((log: any) => {
      const match = log['Class Number']?.match(pattern);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((seq: number) => seq > 0);
  
  return sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
}

async function generateClassId(
  supabase: any,
  studentName: string,
  tutorName: string,
  dateStr: string
): Promise<string> {
  const baseId = generateBaseId(studentName, tutorName, dateStr);
  const sequence = await getNextSequence(supabase, baseId);
  
  return `${baseId}-${sequence}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { rows } = await req.json();

    console.log(`Processing ${rows.length} class log rows...`);

    const results = {
      success: 0,
      failed: 0,
      updated: 0,
      inserted: 0,
      errors: [] as Array<{ row: number; error: string; data: any }>,
    };

    // Helper function to parse payment date from string (MM/DD/YY or MM/DD/YYYY format)
    const parsePaymentDate = (value: string | undefined): string | null => {
      if (!value || value.trim() === '') {
        return null;
      }

      const trimmedValue = value.trim();
      
      // Try to parse as date (common formats like MM/DD/YY, MM/DD/YYYY)
      const dateMatch = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (dateMatch) {
        const [, month, day, year] = dateMatch;
        // Convert 2-digit year to 4-digit (assume 20XX)
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }

      return null;
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as ClassLogRow;

      try {
        // Validate required fields
        if (!row['Date']) {
          throw new Error('Date is required');
        }
        
        if (!row['Student Name'] || !row['Tutor Name']) {
          throw new Error('Student Name and Tutor Name are required');
        }

        // Parse and validate date
        let parsedDate: string;
        try {
          const date = new Date(row['Date']);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date format');
          }
          parsedDate = date.toISOString().split('T')[0];
        } catch (e) {
          throw new Error(`Invalid date: ${row['Date']}`);
        }

        // Generate or use existing Class Number
        let classNumber = row['Class Number'];
        
        if (!classNumber || classNumber.trim() === '') {
          // Generate new ID if not provided
          classNumber = await generateClassId(
            supabase,
            row['Student Name'],
            row['Tutor Name'],
            parsedDate
          );
          console.log(`Generated new Class Number: ${classNumber}`);
        }

        // Parse payment dates from Student Payment and Tutor Payment columns
        const studentPaymentDate = parsePaymentDate(row['Student Payment']);
        const tutorPaymentDate = parsePaymentDate(row['Tutor Payment']);

        // Prepare the record for upsert
        const record = {
          'Class Number': classNumber,
          'Tutor Name': row['Tutor Name'],
          'Student Name': row['Student Name'],
          'Date': parsedDate,
          'Day': row['Day'] || null,
          'Time (CST)': row['Time (CST)'] || null,
          'Time (hrs)': row['Time (hrs)'] || null,
          'Subject': row['Subject'] || null,
          'Content': row['Content'] || null,
          'HW': row['HW'] || null,
          'Class Cost': row['Class Cost'] ? parseFloat(row['Class Cost'].toString().replace(/[^0-9.-]/g, '')) || null : null,
          'Tutor Cost': row['Tutor Cost'] ? parseFloat(row['Tutor Cost'].toString().replace(/[^0-9.-]/g, '')) || null : null,
          'student_payment_date': studentPaymentDate,
          'tutor_payment_date': tutorPaymentDate,
          'Additional Info': row['Additional Info'] || null,
        };

        // Check if record exists with this Class Number
        const { data: existing } = await supabase
          .from('class_logs')
          .select('id')
          .eq('Class Number', classNumber)
          .maybeSingle();

        if (existing) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('class_logs')
            .update(record)
            .eq('Class Number', classNumber);

          if (updateError) {
            throw updateError;
          }

          results.updated++;
          console.log(`Row ${i + 1}: Updated existing record ${classNumber}`);
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('class_logs')
            .insert(record);

          if (insertError) {
            throw insertError;
          }

          results.inserted++;
          console.log(`Row ${i + 1}: Inserted new record ${classNumber}`);
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row,
        });
        console.error(`Row ${i + 1}: Failed -`, error);
      }
    }

    console.log(`Import completed: ${results.success} success (${results.inserted} inserted, ${results.updated} updated), ${results.failed} failed`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
