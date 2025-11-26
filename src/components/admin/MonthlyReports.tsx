import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Send, Calendar, User, Mail } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface MonthlyReport {
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

const MonthlyReports: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
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

  // Fetch monthly reports
  const { data: reports = [], isLoading: isLoadingReports, refetch } = useQuery({
    queryKey: ['monthly-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_reports_sent')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as MonthlyReport[];
    },
  });

  // Get available months for the dropdown (last 6 months)
  const getAvailableMonths = () => {
    const months = [];
    for (let i = 1; i <= 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      months.push({
        value: firstDay.toISOString().split('T')[0],
        label: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    return months;
  };

  const availableMonths = getAvailableMonths();

  const handleSendReport = async () => {
    if (!selectedMonth) {
      toast.error('Please select a month');
      return;
    }

    setIsSending(true);
    try {
      const payload: { report_month: string; student_id?: string } = {
        report_month: selectedMonth,
      };

      if (selectedStudentId !== 'all') {
        payload.student_id = selectedStudentId;
      }

      const { data, error } = await supabase.functions.invoke('generate-monthly-report', {
        body: payload
      });

      if (error) throw error;

      toast.success(
        selectedStudentId === 'all'
          ? `Sent ${data.sent} of ${data.total} reports successfully`
          : 'Report sent successfully'
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
        <h2 className="text-2xl font-bold tracking-tight">Monthly Reports</h2>
        <p className="text-muted-foreground">
          Generate and view automated monthly progress reports sent to students
        </p>
      </div>

      {/* Send Report Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Monthly Report
          </CardTitle>
          <CardDescription>
            Generate AI-powered progress reports for students
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <label className="text-sm font-medium mb-2 block">Report Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleSendReport} 
                disabled={isSending || !selectedMonth}
                className="w-full"
              >
                {isSending ? 'Sending...' : 'Generate & Send Report'}
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Reports are automatically sent on the 1st of each month for the previous month
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
            View all sent monthly progress reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No reports sent yet</p>
              <p className="text-sm mt-1">Generate your first report above</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Report Month</TableHead>
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
                        {new Date(report.report_month).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric'
                        })}
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

export default MonthlyReports;
