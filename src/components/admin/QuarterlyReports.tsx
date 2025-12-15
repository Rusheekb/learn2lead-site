import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileText, Send, Calendar, User, Mail, TestTube } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface QuarterlyReport {
  id: string;
  student_id: string;
  report_month: string;
  sent_at: string;
  report_content: string | null;
}

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

// Get quarter label from a date
function getQuarterLabel(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  const quarterNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
  return `${quarterNames[quarter - 1]} ${year}`;
}

const QuarterlyReports: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [testEmail, setTestEmail] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  // Fetch all student profiles
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('role', 'student')
        .order('email');

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch quarterly reports (stored in monthly_reports_sent table)
  const { data: reports = [], isLoading: isLoadingReports, refetch } = useQuery({
    queryKey: ['quarterly-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_reports_sent')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as QuarterlyReport[];
    },
  });

  // Get available quarters for the dropdown (last 4 quarters)
  const getAvailableQuarters = () => {
    const quarters = [];
    const now = new Date();
    
    for (let i = 1; i <= 4; i++) {
      // Go back i quarters
      let targetMonth = now.getMonth() - (i * 3);
      let targetYear = now.getFullYear();
      
      while (targetMonth < 0) {
        targetMonth += 12;
        targetYear -= 1;
      }
      
      // Get quarter number and first day of that quarter
      const quarter = Math.floor(targetMonth / 3) + 1;
      const firstDayOfQuarter = new Date(targetYear, (quarter - 1) * 3, 1);
      
      const quarterNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
      
      quarters.push({
        value: firstDayOfQuarter.toISOString().split('T')[0],
        label: `${quarterNames[quarter - 1]} ${targetYear}`
      });
    }
    
    return quarters;
  };

  const availableQuarters = getAvailableQuarters();

  const handleSendReport = async () => {
    if (!selectedQuarter) {
      toast.error('Please select a quarter');
      return;
    }

    setIsSending(true);
    try {
      const payload: { report_quarter: string; student_id?: string; test_email?: string } = {
        report_quarter: selectedQuarter,
      };

      if (selectedStudentId !== 'all') {
        payload.student_id = selectedStudentId;
      }

      if (testEmail.trim()) {
        payload.test_email = testEmail.trim();
      }

      const { data, error } = await supabase.functions.invoke('generate-quarterly-report', {
        body: payload
      });

      if (error) throw error;

      toast.success(
        selectedStudentId === 'all'
          ? `Sent ${data.sent} of ${data.total} quarterly reports successfully`
          : 'Quarterly report sent successfully'
      );
      
      refetch();
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error('Failed to send report. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return 'Unknown Student';
    return student.first_name && student.last_name
      ? `${student.first_name} ${student.last_name}`
      : student.email;
  };

  const getStudentEmail = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.email || '';
  };

  if (isLoadingStudents || isLoadingReports) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quarterly Reports</h2>
        <p className="text-muted-foreground">
          Generate and view AI-powered quarterly progress reports sent to students
        </p>
      </div>

      {/* Send Report Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Quarterly Report
          </CardTitle>
          <CardDescription>
            Generate comprehensive AI-powered progress reports with 3 months of data for better recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Mode Alert */}
          {testEmail && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <TestTube className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">Test Mode Active</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Reports will be sent to <strong>{testEmail}</strong> instead of actual student emails
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Student</label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name && student.last_name
                        ? `${student.first_name} ${student.last_name}`
                        : student.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Report Quarter</label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {availableQuarters.map((quarter) => (
                    <SelectItem key={quarter.value} value={quarter.value}>
                      {quarter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-1">
                <TestTube className="h-4 w-4" />
                Test Email (Optional)
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              onClick={handleSendReport} 
              disabled={isSending || !selectedQuarter}
              className="flex-1"
            >
              {isSending ? 'Sending...' : testEmail ? 'Send Test Report' : 'Generate & Send Report'}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Reports are automatically sent on Jan 1, Apr 1, Jul 1, and Oct 1 for the previous quarter
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reports History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report History
          </CardTitle>
          <CardDescription>
            View all sent quarterly progress reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No reports sent yet</p>
              <p className="text-sm mt-1">Generate your first quarterly report above</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Report Quarter</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {getStudentName(report.student_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {getStudentEmail(report.student_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getQuarterLabel(new Date(report.report_month))}
                      </TableCell>
                      <TableCell>
                        {new Date(report.sent_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Sent
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuarterlyReports;
