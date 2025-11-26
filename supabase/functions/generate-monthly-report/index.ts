import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

interface ClassLogData {
  Date: string;
  Subject: string;
  Content: string;
  HW: string;
  "Tutor Name": string;
  "Time (hrs)": string;
}

interface StudentReportData {
  studentId: string;
  studentName: string;
  studentEmail: string;
  reportMonth: Date;
  classes: ClassLogData[];
  tutorNotes: Array<{ title: string; content: string; created_at: string }>;
}

async function generateAIRecommendations(reportData: StudentReportData): Promise<string> {
  try {
    const prompt = `You are an educational advisor analyzing a student's monthly progress report. 

Student: ${reportData.studentName}
Month: ${reportData.reportMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
Total Classes: ${reportData.classes.length}
Total Hours: ${reportData.classes.reduce((sum, c) => sum + parseFloat(c["Time (hrs)"] || "0"), 0).toFixed(1)}

Classes covered:
${reportData.classes.map(c => `- ${c.Date}: ${c.Subject} - ${c.Content || "N/A"}`).join('\n')}

Homework assigned:
${reportData.classes.map(c => c.HW ? `- ${c.Date}: ${c.HW}` : null).filter(Boolean).join('\n') || "No homework recorded"}

Tutor Notes:
${reportData.tutorNotes.length > 0 ? reportData.tutorNotes.map(n => `- ${n.title}: ${n.content}`).join('\n') : "No tutor notes"}

Based on this data, provide 3-5 specific, actionable recommendations for the student to improve their learning. Focus on:
1. Content mastery and areas needing reinforcement
2. Study habits and homework completion
3. Skills to practice between sessions
4. Suggested resources or topics for next month

Keep recommendations concise, encouraging, and specific to the subjects covered. Format as a bulleted list.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an experienced educational advisor providing personalized learning recommendations." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", await response.text());
      return "Recommendations unavailable at this time.";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No recommendations generated.";
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    return "Recommendations unavailable at this time.";
  }
}

function generateReportHTML(reportData: StudentReportData, aiRecommendations: string): string {
  const monthName = reportData.reportMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const totalHours = reportData.classes.reduce((sum, c) => sum + parseFloat(c["Time (hrs)"] || "0"), 0).toFixed(1);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .header p { margin: 0; opacity: 0.9; }
    .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
    .stat-card h3 { margin: 0 0 5px 0; color: #667eea; font-size: 14px; text-transform: uppercase; }
    .stat-card p { margin: 0; font-size: 24px; font-weight: bold; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .class-item { background: white; border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 10px; border-radius: 6px; }
    .class-item h4 { margin: 0 0 8px 0; color: #333; }
    .class-meta { color: #666; font-size: 14px; margin-bottom: 8px; }
    .class-content { margin-top: 8px; }
    .class-content strong { color: #667eea; }
    .recommendations { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 6px; }
    .recommendations h3 { margin-top: 0; color: #856404; }
    .recommendations ul { margin: 10px 0; padding-left: 20px; }
    .recommendations li { margin-bottom: 10px; }
    .tutor-notes { background: #e7f3ff; border-left: 4px solid #2196F3; padding: 20px; border-radius: 6px; }
    .tutor-notes h3 { margin-top: 0; color: #0d47a1; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📚 Monthly Progress Report</h1>
    <p>${reportData.studentName} • ${monthName}</p>
  </div>

  <div class="stats">
    <div class="stat-card">
      <h3>Classes Completed</h3>
      <p>${reportData.classes.length}</p>
    </div>
    <div class="stat-card">
      <h3>Total Hours</h3>
      <p>${totalHours}</p>
    </div>
  </div>

  <div class="section">
    <h2>📖 Classes This Month</h2>
    ${reportData.classes.map(c => `
      <div class="class-item">
        <h4>${c.Subject}</h4>
        <div class="class-meta">
          ${new Date(c.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
          • ${c["Time (hrs)"]} hours 
          • Tutor: ${c["Tutor Name"]}
        </div>
        ${c.Content ? `<div class="class-content"><strong>Content Covered:</strong> ${c.Content}</div>` : ''}
        ${c.HW ? `<div class="class-content"><strong>Homework:</strong> ${c.HW}</div>` : ''}
      </div>
    `).join('')}
  </div>

  ${reportData.tutorNotes.length > 0 ? `
    <div class="tutor-notes">
      <h3>💡 Tutor Notes</h3>
      ${reportData.tutorNotes.map(note => `
        <div style="margin-bottom: 15px;">
          <strong>${note.title}</strong>
          <p style="margin: 5px 0 0 0;">${note.content}</p>
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div class="recommendations">
    <h3>🎯 AI-Generated Recommendations for Next Month</h3>
    <div style="white-space: pre-line;">${aiRecommendations}</div>
  </div>

  <div class="footer">
    <p>This is an automated monthly progress report. If you have questions, please contact your tutor.</p>
    <p style="margin-top: 10px; font-size: 12px; color: #999;">Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
  </div>
</body>
</html>
  `;
}

async function generateReportForStudent(studentId: string, reportMonth: Date): Promise<boolean> {
  try {
    console.log(`Generating report for student ${studentId} for month ${reportMonth.toISOString()}`);

    // Get student profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("id", studentId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching student profile:", profileError);
      return false;
    }

    const studentName = profile.first_name && profile.last_name 
      ? `${profile.first_name} ${profile.last_name}`
      : profile.email;

    // Check if report already sent for this month
    const { data: existingReport } = await supabase
      .from("monthly_reports_sent")
      .select("id")
      .eq("student_id", studentId)
      .eq("report_month", reportMonth.toISOString().split('T')[0])
      .maybeSingle();

    if (existingReport) {
      console.log(`Report already sent for ${studentName} for ${reportMonth.toISOString()}`);
      return true;
    }

    // Get class logs for the month
    const startDate = new Date(reportMonth.getFullYear(), reportMonth.getMonth(), 1);
    const endDate = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + 1, 0);

    const { data: classLogs, error: logsError } = await supabase
      .from("class_logs")
      .select("Date, Subject, Content, HW, \"Tutor Name\", \"Time (hrs)\"")
      .eq("Student Name", studentName)
      .gte("Date", startDate.toISOString().split('T')[0])
      .lte("Date", endDate.toISOString().split('T')[0])
      .order("Date", { ascending: true });

    if (logsError) {
      console.error("Error fetching class logs:", logsError);
      return false;
    }

    if (!classLogs || classLogs.length === 0) {
      console.log(`No classes found for ${studentName} in ${reportMonth.toISOString()}`);
      return true; // Not an error, just no classes
    }

    // Get tutor notes for the student
    const { data: tutorNotes, error: notesError } = await supabase
      .from("student_notes")
      .select("title, content, created_at")
      .eq("student_id", studentId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    const reportData: StudentReportData = {
      studentId,
      studentName,
      studentEmail: profile.email,
      reportMonth,
      classes: classLogs as ClassLogData[],
      tutorNotes: tutorNotes || [],
    };

    // Generate AI recommendations
    const aiRecommendations = await generateAIRecommendations(reportData);

    // Generate HTML report
    const htmlContent = generateReportHTML(reportData, aiRecommendations);

    // Send email via Resend
    const monthName = reportMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const emailResult = await resend.emails.send({
      from: "Learn2Lead <onboarding@resend.dev>",
      to: [profile.email],
      subject: `Your Monthly Progress Report - ${monthName}`,
      html: htmlContent,
    });

    console.log("Email sent:", emailResult);

    // Log the sent report
    const { error: insertError } = await supabase
      .from("monthly_reports_sent")
      .insert({
        student_id: studentId,
        report_month: reportMonth.toISOString().split('T')[0],
        report_content: htmlContent,
      });

    if (insertError) {
      console.error("Error logging report:", insertError);
      return false;
    }

    console.log(`Successfully sent report to ${studentName}`);
    return true;
  } catch (error) {
    console.error("Error generating report for student:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { student_id, report_month } = await req.json();

    // Parse report month or default to previous month
    let reportMonth: Date;
    if (report_month) {
      reportMonth = new Date(report_month);
    } else {
      const now = new Date();
      reportMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    if (student_id) {
      // Generate report for single student
      const success = await generateReportForStudent(student_id, reportMonth);
      return new Response(
        JSON.stringify({ success, message: success ? "Report sent" : "Report failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Generate reports for all active students
      const { data: students, error: studentsError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "student");

      if (studentsError || !students) {
        throw new Error("Failed to fetch students");
      }

      const results = await Promise.all(
        students.map(s => generateReportForStudent(s.id, reportMonth))
      );

      const successCount = results.filter(r => r).length;
      return new Response(
        JSON.stringify({ 
          success: true, 
          total: students.length, 
          sent: successCount,
          message: `Sent ${successCount} of ${students.length} reports` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in generate-monthly-report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
