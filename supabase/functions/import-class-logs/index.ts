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
      errors: [] as Array<{ row: number; error: string; data: any }>,
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as ClassLogRow;

      try {
        // Validate required fields
        if (!row['Date']) {
          throw new Error('Date is required');
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

        // Prepare the record for insertion
        const record = {
          'Class Number': row['Class Number'] || null,
          'Tutor Name': row['Tutor Name'] || null,
          'Student Name': row['Student Name'] || null,
          'Date': parsedDate,
          'Day': row['Day'] || null,
          'Time (CST)': row['Time (CST)'] || null,
          'Time (hrs)': row['Time (hrs)'] || null,
          'Subject': row['Subject'] || null,
          'Content': row['Content'] || null,
          'HW': row['HW'] || null,
          'Class Cost': row['Class Cost'] || null,
          'Tutor Cost': row['Tutor Cost'] || null,
          'Student Payment': row['Student Payment'] || 'Pending',
          'Tutor Payment': row['Tutor Payment'] || 'Pending',
          'Additional Info': row['Additional Info'] || null,
        };

        // Insert into database
        const { error: insertError } = await supabase
          .from('class_logs')
          .insert(record);

        if (insertError) {
          throw insertError;
        }

        results.success++;
        console.log(`Row ${i + 1}: Success`);
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

    console.log(`Import completed: ${results.success} success, ${results.failed} failed`);

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
