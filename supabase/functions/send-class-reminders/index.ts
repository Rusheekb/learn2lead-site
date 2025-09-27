
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@1.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

// Define types for clarity
interface ClassReminder {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  zoom_link: string;
  subject: string;
  tutor_email: string;
  tutor_name: string;
  student_email: string;
  student_name: string;
}

// Configure CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Resend with API key
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Call the database function to check upcoming classes
    const { error: functionError } = await supabase.rpc('check_upcoming_classes');
    if (functionError) {
      throw new Error(`Failed to execute check_upcoming_classes: ${functionError.message}`);
    }
    
    // Query classes that need reminders (those that were just marked for sending)
    const { data: classesToRemind, error: queryError } = await supabase
      .from('scheduled_classes')
      .select(`
        id, title, date, start_time, end_time, zoom_link, subject, tutor_id, student_id
      `)
      .eq('reminder_sent', true)
      .gt('date', new Date().toISOString().split('T')[0]) // Ensure future classes
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (queryError) {
      throw new Error(`Failed to query classes: ${queryError.message}`);
    }

    console.log(`Found ${classesToRemind?.length || 0} classes to send reminders for`);
    
    const sentEmails = [];
    
    // Process each class and send reminders
    for (const cls of classesToRemind || []) {
      // Get tutor and student info
      const { data: tutorData } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', cls.tutor_id)
        .single();
        
      const { data: studentData } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', cls.student_id)
        .single();
      
      if (!tutorData || !studentData) {
        console.warn(`Missing tutor or student data for class ${cls.id}`);
        continue;
      }
      
      // Extract the needed information with proper typings
      const classReminder: ClassReminder = {
        id: cls.id,
        title: cls.title,
        date: cls.date,
        start_time: cls.start_time,
        end_time: cls.end_time,
        zoom_link: cls.zoom_link,
        subject: cls.subject,
        tutor_email: tutorData.email,
        tutor_name: `${tutorData.first_name || ''} ${tutorData.last_name || ''}`.trim() || tutorData.email,
        student_email: studentData.email,
        student_name: `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim() || studentData.email,
      };
      
      // Send reminder to tutor
      const tutorEmailResult = await sendReminderEmail(
        classReminder,
        classReminder.tutor_email,
        classReminder.tutor_name,
        "tutor"
      );
      sentEmails.push(tutorEmailResult);
      
      // Send reminder to student
      const studentEmailResult = await sendReminderEmail(
        classReminder,
        classReminder.student_email,
        classReminder.student_name,
        "student"
      );
      sentEmails.push(studentEmailResult);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${classesToRemind?.length || 0} upcoming classes and sent ${sentEmails.length} reminder emails.`,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("Error processing class reminders:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});

/**
 * Send a reminder email for an upcoming class
 */
async function sendReminderEmail(
  classInfo: ClassReminder,
  recipientEmail: string,
  recipientName: string,
  recipientType: "tutor" | "student"
): Promise<any> {
  try {
    const formattedDate = new Date(classInfo.date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    
    // Format time from 24h to 12h format
    const formatTime = (time24: string): string => {
      const [hour, minute] = time24.split(":");
      const hourNum = parseInt(hour, 10);
      return `${hourNum % 12 || 12}:${minute} ${hourNum >= 12 ? 'PM' : 'AM'}`;
    };
    
    const startTime = formatTime(classInfo.start_time);
    const endTime = formatTime(classInfo.end_time);
    
    // Customize the message based on recipient type
    const roleSpecificText = recipientType === "tutor"
      ? `Your student ${classInfo.student_name} will be attending.`
      : `Your tutor ${classInfo.tutor_name} will be teaching this session.`;
    
    const result = await resend.emails.send({
      from: "Learn2Lead <noreply@learn2lead.com>",
      to: recipientEmail,
      subject: `Upcoming Class Reminder: ${classInfo.title} - Starting in 1 hour`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <h2 style="color: #333;">Upcoming Class Reminder</h2>
          <p>Hello ${recipientName},</p>
          <p>This is a reminder that you have a class starting in approximately 1 hour:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Class:</strong> ${classInfo.title}</p>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${classInfo.subject}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${startTime} - ${endTime}</p>
            <p style="margin: 5px 0;">${roleSpecificText}</p>
          </div>
          
          <p>Please be ready to join the session using the link below:</p>
          <p><a href="${classInfo.zoom_link}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Join Zoom Meeting</a></p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #777;">
            This is an automated reminder. Please do not reply to this email.
            If you need to reschedule or have questions, please contact your coordinator through the Learn2Lead platform.
          </p>
        </div>
      `,
    });
    
    console.log(`Sent reminder email to ${recipientType} (${recipientEmail}) for class: ${classInfo.title}`);
    return result;
    
  } catch (error) {
    console.error(`Failed to send reminder email to ${recipientEmail}:`, error);
    return { error: true, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
