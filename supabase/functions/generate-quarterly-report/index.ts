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
  quarterStart: Date;
  quarterEnd: Date;
  quarterLabel: string;
  classes: ClassLogData[];
  tutorNotes: Array<{ title: string; content: string; created_at: string }>;
}

// Get quarter info from a date
function getQuarterInfo(date: Date): { quarter: number; year: number; label: string; start: Date; end: Date } {
  const month = date.getMonth();
  const year = date.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  
  // Quarter start and end dates
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0); // Last day of quarter
  
  const quarterNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
  const label = `${quarterNames[quarter - 1]} ${year}`;
  
  return { quarter, year, label, start, end };
}

// Get previous quarter from a date
function getPreviousQuarter(date: Date): { quarter: number; year: number; label: string; start: Date; end: Date } {
  const currentQuarter = getQuarterInfo(date);
  let prevQuarter = currentQuarter.quarter - 1;
  let prevYear = currentQuarter.year;
  
  if (prevQuarter === 0) {
    prevQuarter = 4;
    prevYear -= 1;
  }
  
  const startMonth = (prevQuarter - 1) * 3;
  const start = new Date(prevYear, startMonth, 1);
  const end = new Date(prevYear, startMonth + 3, 0);
  
  const quarterNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
  const label = `${quarterNames[prevQuarter - 1]} ${prevYear}`;
  
  return { quarter: prevQuarter, year: prevYear, label, start, end };
}

async function generateAIRecommendations(reportData: StudentReportData): Promise<string> {
  try {
    const totalHours = reportData.classes.reduce((sum, c) => sum + parseFloat(c["Time (hrs)"] || "0"), 0).toFixed(1);
    
    // Group classes by subject for better analysis
    const subjectBreakdown: Record<string, { count: number; topics: string[] }> = {};
    reportData.classes.forEach(c => {
      const subject = c.Subject || 'General';
      if (!subjectBreakdown[subject]) {
        subjectBreakdown[subject] = { count: 0, topics: [] };
      }
      subjectBreakdown[subject].count++;
      if (c.Content) {
        subjectBreakdown[subject].topics.push(c.Content);
      }
    });

    const prompt = `You are an educational advisor analyzing a student's QUARTERLY progress report. This report covers 3 months of tutoring sessions, giving you comprehensive data to identify patterns and provide meaningful recommendations.

Student: ${reportData.studentName}
Quarter: ${reportData.quarterLabel}
Total Classes: ${reportData.classes.length}
Total Hours: ${totalHours}

Subject Breakdown:
${Object.entries(subjectBreakdown).map(([subject, data]) => 
  `- ${subject}: ${data.count} classes
    Topics covered: ${data.topics.slice(0, 10).join(', ') || 'Not specified'}`
).join('\n')}

Classes covered (chronologically):
${reportData.classes.map(c => `- ${c.Date}: ${c.Subject} - ${c.Content || "N/A"}`).join('\n')}

Homework assigned this quarter:
${reportData.classes.map(c => c.HW ? `- ${c.Date}: ${c.HW}` : null).filter(Boolean).join('\n') || "No homework recorded"}

Tutor Notes (3 months):
${reportData.tutorNotes.length > 0 ? reportData.tutorNotes.map(n => `- ${n.title}: ${n.content}`).join('\n') : "No tutor notes"}

Based on 3 months of data, provide 5-7 specific, actionable recommendations for the student. With this comprehensive quarterly view, you can identify:
1. **Learning patterns and progress trends** - What's improving? What's stagnating?
2. **Subject mastery assessment** - Which subjects show strong understanding vs. need more focus?
3. **Study habits analysis** - Based on homework completion and session attendance patterns
4. **Skill gaps and areas for intensive focus** - What should be prioritized next quarter?
5. **Long-term learning strategies** - Recommendations for the next 3 months
6. **Resources and practice suggestions** - Specific materials or exercises
7. **Celebration of achievements** - Acknowledge progress made this quarter

Keep recommendations encouraging, specific to the subjects covered, and actionable. Format as a bulleted list with clear headers for each category.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an experienced educational advisor providing personalized quarterly learning recommendations. With 3 months of data, you can identify meaningful patterns and provide comprehensive, actionable guidance." },
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
    const content = data.choices?.[0]?.message?.content || "No recommendations generated.";
    
    // Convert markdown-style formatting to HTML
    const htmlContent = content
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/^\* /gm, '• ');
    
    return htmlContent;
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return "Recommendations unavailable at this time.";
  }
}

function generateReportHTML(reportData: StudentReportData, aiRecommendations: string): string {
  const totalHours = reportData.classes.reduce((sum, c) => sum + parseFloat(c["Time (hrs)"] || "0"), 0).toFixed(1);
  
  // Group classes by month for display
  const classesByMonth: Record<string, ClassLogData[]> = {};
  reportData.classes.forEach(c => {
    const date = new Date(c.Date);
    const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!classesByMonth[monthKey]) {
      classesByMonth[monthKey] = [];
    }
    classesByMonth[monthKey].push(c);
  });

  // Count unique subjects
  const uniqueSubjects = [...new Set(reportData.classes.map(c => c.Subject).filter(Boolean))];
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .header p { margin: 0; opacity: 0.9; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
    .stat-card h3 { margin: 0 0 5px 0; color: #667eea; font-size: 14px; text-transform: uppercase; }
    .stat-card p { margin: 0; font-size: 24px; font-weight: bold; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .month-section { margin-bottom: 25px; }
    .month-section h3 { color: #555; font-size: 18px; margin-bottom: 15px; border-left: 3px solid #667eea; padding-left: 10px; }
    .class-item { background: white; border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 10px; border-radius: 6px; }
    .class-item h4 { margin: 0 0 8px 0; color: #333; }
    .class-meta { color: #666; font-size: 14px; margin-bottom: 8px; }
    .class-content { margin-top: 8px; }
    .class-content strong { color: #667eea; }
    .recommendations { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 6px; }
    .recommendations h3 { margin-top: 0; color: #856404; }
    .recommendations ul { margin: 10px 0; padding-left: 20px; }
    .recommendations li { margin-bottom: 10px; }
    .tutor-notes { background: #e7f3ff; border-left: 4px solid #2196F3; padding: 20px; border-radius: 6px; margin-bottom: 20px; }
    .tutor-notes h3 { margin-top: 0; color: #0d47a1; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Quarterly Progress Report</h1>
    <p>${reportData.studentName} • ${reportData.quarterLabel}</p>
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
    <div class="stat-card">
      <h3>Subjects Covered</h3>
      <p>${uniqueSubjects.length}</p>
    </div>
  </div>

  <div class="section">
    <h2>📖 Classes This Quarter</h2>
    ${Object.entries(classesByMonth).map(([month, classes]) => `
      <div class="month-section">
        <h3>${month}</h3>
        ${classes.map(c => `
          <div class="class-item">
            <h4>${c.Subject}</h4>
            <div class="class-meta">
              ${new Date(c.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
              • ${c["Time (hrs)"]} hours 
              • ${c["Tutor Name"]}
            </div>
            ${c.Content ? `<div class="class-content"><strong>Content Covered:</strong> ${c.Content}</div>` : ''}
            ${c.HW ? `<div class="class-content"><strong>Homework:</strong> ${c.HW}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('')}
  </div>

  ${reportData.tutorNotes.length > 0 ? `
    <div class="tutor-notes">
      <h3>💡 Tutor Notes (This Quarter)</h3>
      ${reportData.tutorNotes.map(note => `
        <div style="margin-bottom: 15px;">
          <strong>${note.title}</strong>
          <p style="margin: 5px 0 0 0;">${note.content}</p>
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div class="recommendations">
    <h3>🎯 Recommendations for Next Quarter</h3>
    <div style="white-space: pre-line;">${aiRecommendations}</div>
  </div>

  <div class="footer">
    <p>This is an automated quarterly progress report. If you have questions, please contact your tutor.</p>
    <p style="margin-top: 10px; font-size: 12px; color: #999;">Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
  </div>
</body>
</html>
  `;
}

// Helper to build a display name from first/last name, falling back to email
function buildDisplayName(firstName: string | null, lastName: string | null, email: string): string {
  const parts = [firstName, lastName].filter(Boolean).map(s => s!.trim()).filter(s => s.length > 0);
  return parts.length > 0 ? parts.join(' ') : email;
}

async function generateReportForStudent(studentId: string, quarterStart: Date, quarterEnd: Date, quarterLabel: string, testEmail?: string): Promise<boolean> {
  try {
    console.log(`Generating quarterly report for student ${studentId} for ${quarterLabel}${testEmail ? ' (TEST MODE)' : ''}`);

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

    const studentName = buildDisplayName(profile.first_name, profile.last_name, profile.email);

    // Check if report already sent for this quarter (skip in test mode)
    if (!testEmail) {
      const { data: existingReport } = await supabase
        .from("monthly_reports_sent")
        .select("id")
        .eq("student_id", studentId)
        .eq("report_month", quarterStart.toISOString().split('T')[0])
        .maybeSingle();

      if (existingReport) {
        console.log(`Report already sent for ${studentName} for ${quarterLabel}`);
        return true;
      }
    }

    // Get class logs for the entire quarter (3 months)
    const startDateStr = quarterStart.toISOString().split('T')[0];
    const endDateStr = quarterEnd.toISOString().split('T')[0];

    console.log(`Fetching classes from ${startDateStr} to ${endDateStr}`);

    const { data: classLogs, error: logsError } = await supabase
      .from("class_logs")
      .select("Date, Subject, Content, HW, \"Tutor Name\", \"Time (hrs)\"")
      .eq("Student Name", studentName)
      .gte("Date", startDateStr)
      .lte("Date", endDateStr)
      .order("Date", { ascending: true });

    if (logsError) {
      console.error("Error fetching class logs:", logsError);
      return false;
    }

    if (!classLogs || classLogs.length === 0) {
      console.log(`No classes found for ${studentName} in ${quarterLabel}`);
      return true; // Not an error, just no classes
    }

    console.log(`Found ${classLogs.length} classes for ${studentName}`);

    // Get unique tutor identifiers and look up their profiles
    const tutorIdentifiers = [...new Set(classLogs.map(c => c["Tutor Name"]).filter(Boolean))];
    const tutorNameMap = new Map<string, string>();
    
    if (tutorIdentifiers.length > 0) {
      const { data: tutorProfiles } = await supabase
        .from("profiles")
        .select("email, first_name, last_name")
        .in("email", tutorIdentifiers);
      
      if (tutorProfiles) {
        for (const tp of tutorProfiles) {
          const displayName = buildDisplayName(tp.first_name, tp.last_name, tp.email);
          tutorNameMap.set(tp.email, displayName);
        }
      }
    }

    // Map tutor emails to names in class logs
    const classLogsWithNames = classLogs.map(c => ({
      ...c,
      "Tutor Name": tutorNameMap.get(c["Tutor Name"] || "") || c["Tutor Name"] || "Unknown"
    }));

    // Get tutor notes for the student (entire quarter)
    const { data: tutorNotes, error: notesError } = await supabase
      .from("student_notes")
      .select("title, content, created_at")
      .eq("student_id", studentId)
      .gte("created_at", quarterStart.toISOString())
      .lte("created_at", quarterEnd.toISOString())
      .order("created_at", { ascending: false });

    const reportData: StudentReportData = {
      studentId,
      studentName,
      studentEmail: profile.email,
      quarterStart,
      quarterEnd,
      quarterLabel,
      classes: classLogsWithNames as ClassLogData[],
      tutorNotes: tutorNotes || [],
    };

    // Generate AI recommendations
    const aiRecommendations = await generateAIRecommendations(reportData);

    // Generate HTML report
    const htmlContent = generateReportHTML(reportData, aiRecommendations);

    // Send email via Resend
    const recipientEmail = testEmail || profile.email;
    
    console.log(`Sending quarterly report to: ${recipientEmail}${testEmail ? ' (TEST MODE)' : ''}`);
    
    const emailResult = await resend.emails.send({
      from: "Learn2Lead <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `${testEmail ? '[TEST] ' : ''}Your Quarterly Progress Report - ${quarterLabel}`,
      html: htmlContent,
    });

    console.log("Email sent:", emailResult);

    // Log the sent report (skip in test mode)
    if (!testEmail) {
      const { error: insertError } = await supabase
        .from("monthly_reports_sent")
        .insert({
          student_id: studentId,
          report_month: quarterStart.toISOString().split('T')[0],
          report_content: htmlContent,
        });

      if (insertError) {
        console.error("Error logging report:", insertError);
        return false;
      }
    }

    console.log(`Successfully sent quarterly report to ${studentName}${testEmail ? ' (TEST MODE - not logged)' : ''}`);
    return true;
  } catch (error) {
    console.error("Error generating quarterly report for student:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { student_id, report_quarter, test_email } = await req.json();

    // Parse quarter or default to previous quarter
    let quarterInfo: { quarter: number; year: number; label: string; start: Date; end: Date };
    
    if (report_quarter) {
      // Parse format: "2024-01-01" (first day of quarter)
      const date = new Date(report_quarter);
      quarterInfo = getQuarterInfo(date);
    } else {
      // Default to previous quarter
      quarterInfo = getPreviousQuarter(new Date());
    }

    console.log(`Generating reports for ${quarterInfo.label}`);

    if (student_id) {
      // Generate report for single student
      const success = await generateReportForStudent(
        student_id, 
        quarterInfo.start, 
        quarterInfo.end, 
        quarterInfo.label, 
        test_email
      );
      return new Response(
        JSON.stringify({ 
          success, 
          message: success ? (test_email ? "Test report sent" : "Report sent") : "Report failed",
          quarter: quarterInfo.label,
          test_mode: !!test_email
        }),
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
        students.map(s => generateReportForStudent(
          s.id, 
          quarterInfo.start, 
          quarterInfo.end, 
          quarterInfo.label, 
          test_email
        ))
      );

      const successCount = results.filter(r => r).length;
      return new Response(
        JSON.stringify({ 
          success: true, 
          total: students.length, 
          sent: successCount,
          quarter: quarterInfo.label,
          message: `Sent ${successCount} of ${students.length} quarterly reports` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in generate-quarterly-report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
