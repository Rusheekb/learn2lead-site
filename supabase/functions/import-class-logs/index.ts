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

    // Helper function to parse payment field (date or status)
    const parsePaymentField = (value: string | undefined): { status: string; date: string | null } => {
      if (!value || value.trim() === '') {
        return { status: 'pending', date: null };
      }

      // Try to parse as date
      const trimmedValue = value.trim();
      const dateTest = new Date(trimmedValue);
      
      // Check if it's a valid date (common formats like MM/DD/YY, MM/DD/YYYY, etc.)
      if (!isNaN(dateTest.getTime()) && (trimmedValue.includes('/') || trimmedValue.includes('-'))) {
        return { status: 'paid', date: trimmedValue };
      }

      // Otherwise, treat as status text (normalize to lowercase)
      return { status: trimmedValue.toLowerCase(), date: null };
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

        // Parse payment fields
        const studentPayment = parsePaymentField(row['Student Payment']);
        const tutorPayment = parsePaymentField(row['Tutor Payment']);

        // Build additional info with payment dates if they exist
        const additionalInfoParts: string[] = [];
        if (row['Additional Info']) {
          additionalInfoParts.push(row['Additional Info']);
        }
        if (studentPayment.date) {
          additionalInfoParts.push(`Student paid: ${studentPayment.date}`);
        }
        if (tutorPayment.date) {
          additionalInfoParts.push(`Tutor paid: ${tutorPayment.date}`);
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
          'Class Cost': row['Class Cost'] ? parseFloat(row['Class Cost'].replace(/[^0-9.-]/g, '')) || null : null,
          'Tutor Cost': row['Tutor Cost'] ? parseFloat(row['Tutor Cost'].replace(/[^0-9.-]/g, '')) || null : null,
          'Student Payment': studentPayment.status,
          'Tutor Payment': tutorPayment.status,
          'Additional Info': additionalInfoParts.length > 0 ? additionalInfoParts.join(' | ') : null,
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
