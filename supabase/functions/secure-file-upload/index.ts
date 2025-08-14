import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;
    const path = formData.get('path') as string;

    if (!file || !bucket || !path) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: file, bucket, path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // File validation
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    // Validate file size
    if (file.size > maxFileSize) {
      await logValidation(supabaseClient, user.id, file, 'failed', {
        error: 'File size exceeds limit',
        maxSize: maxFileSize,
        actualSize: file.size
      });

      return new Response(
        JSON.stringify({ 
          error: `File size ${formatFileSize(file.size)} exceeds maximum allowed size of ${formatFileSize(maxFileSize)}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate MIME type
    if (!allowedMimeTypes.includes(file.type)) {
      await logValidation(supabaseClient, user.id, file, 'failed', {
        error: 'Invalid file type',
        allowedTypes: allowedMimeTypes,
        actualType: file.type
      });

      return new Response(
        JSON.stringify({ error: `File type '${file.type}' is not allowed` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic malware scan
    const fileBuffer = await file.arrayBuffer();
    const malwareCheck = await scanForMalware(fileBuffer);
    
    if (!malwareCheck.isClean) {
      await logValidation(supabaseClient, user.id, file, 'failed', {
        error: 'Malware detected',
        details: malwareCheck.details
      });

      return new Response(
        JSON.stringify({ error: 'File failed security scan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure file path
    const timestamp = Date.now();
    const random = crypto.randomUUID().substring(0, 8);
    const extension = file.name.split('.').pop() || '';
    const securePath = `${user.id}/${timestamp}_${random}.${extension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from(bucket)
      .upload(securePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      
      await logValidation(supabaseClient, user.id, file, 'failed', {
        error: 'Upload failed',
        details: uploadError.message
      });

      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful validation and upload
    await logValidation(supabaseClient, user.id, file, 'passed', {
      uploadPath: securePath,
      bucket: bucket
    });

    // Log security event
    await supabaseClient
      .from('security_logs')
      .insert({
        event_type: 'file_upload_success',
        user_id: user.id,
        details: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          bucket: bucket,
          path: securePath
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        path: securePath,
        publicUrl: supabaseClient.storage.from(bucket).getPublicUrl(securePath).data.publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Secure upload error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions
async function scanForMalware(fileBuffer: ArrayBuffer): Promise<{ isClean: boolean; details?: string }> {
  const bytes = new Uint8Array(fileBuffer);
  const header = Array.from(bytes.slice(0, 100))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Check for known malicious signatures
  const maliciousSignatures = ['4d5a', 'pk0304']; // PE executable, suspicious ZIP
  
  for (const signature of maliciousSignatures) {
    if (header.includes(signature)) {
      return { 
        isClean: false, 
        details: `Malicious signature detected: ${signature}` 
      };
    }
  }

  // Check for script content in text files
  const textContent = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.slice(0, 1000));
  
  const suspiciousPatterns = [
    /javascript:/gi,
    /<script/gi,
    /eval\(/gi,
    /document\.cookie/gi
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(textContent)) {
      return { 
        isClean: false, 
        details: `Suspicious script content detected` 
      };
    }
  }

  return { isClean: true };
}

async function logValidation(
  supabaseClient: any,
  userId: string,
  file: File,
  status: string,
  details: any
): Promise<void> {
  try {
    await supabaseClient
      .from('file_validation_logs')
      .insert({
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        validation_status: status,
        validation_details: details,
        user_id: userId
      });
  } catch (error) {
    console.error('Failed to log validation:', error);
  }
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
}