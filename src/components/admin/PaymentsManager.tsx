
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Clock, DollarSign, Download, Eye, Search, X } from "lucide-react";

// Mock payment data
const mockTutorPayments = [
  {
    id: 1,
    tutorName: "Ms. Johnson",
    amount: 450,
    classCount: 15,
    period: "April 1-15, 2025",
    status: "pending",
    processDate: "2025-04-16"
  },
  {
    id: 2,
    tutorName: "Mr. Chen",
    amount: 360,
    classCount: 12,
    period: "April 1-15, 2025",
    status: "pending",
    processDate: "2025-04-16"
  },
  {
    id: 3,
    tutorName: "Dr. Martinez",
    amount: 525,
    classCount: 7,
    period: "April 1-15, 2025",
    status: "processed",
    processDate: "2025-04-02"
  },
  {
    id: 4,
    tutorName: "Prof. Wilson",
    amount: 300,
    classCount: 10,
    period: "April 1-15, 2025",
    status: "processed",
    processDate: "2025-04-02"
  }
];

const mockStudentPayments = [
  {
    id: 1,
    studentName: "Alex Johnson",
    amount: 299,
    plan: "Monthly - Mathematics Focus",
    status: "paid",
    date: "2025-04-01",
    nextBilling: "2025-05-01"
  },
  {
    id: 2,
    studentName: "Jamie Smith",
    amount: 499,
    plan: "Monthly - Science Bundle",
    status: "paid",
    date: "2025-04-03",
    nextBilling: "2025-05-03"
  },
  {
    id: 3,
    studentName: "Taylor Brown",
    amount: 249,
    plan: "Monthly - English & History",
    status: "overdue",
    date: "2025-03-15",
    nextBilling: "2025-04-15"
  },
  {
    id: 4,
    studentName: "Casey Wilson",
    amount: 149,
    plan: "Monthly - Single Subject",
    status: "pending",
    date: "2025-04-10",
    nextBilling: "2025-05-10"
  }
];

// Status badges
const paymentStatusBadge = (status: string) => {
  switch (status) {
    case 'processed':
    case 'paid':
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Paid</span>;
    case 'pending':
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Pending</span>;
    case 'overdue':
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Overdue</span>;
    default:
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
  }
};

const PaymentsManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  
  // Filter payments based on search term
  const filteredTutorPayments = mockTutorPayments.filter(payment => 
    payment.tutorName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredStudentPayments = mockStudentPayments.filter(payment => 
    payment.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle viewing payment details
  const handleViewPayment = (payment: any, type: 'tutor' | 'student') => {
    setSelectedPayment({ ...payment, type });
    setIsDetailsOpen(true);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Payment Management</h2>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-green-800">Revenue (April)</h3>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">$4,982.00</p>
              <p className="text-xs text-green-700 mt-1">+8% from last month</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-blue-800">Pending Payments</h3>
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">$959.00</p>
              <p className="text-xs text-blue-700 mt-1">3 payments pending</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-red-800">Overdue Payments</h3>
                <X className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-900">$249.00</p>
              <p className="text-xs text-red-700 mt-1">1 payment overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="relative mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <Tabs defaultValue="tutors">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tutors">Tutor Payments</TabsTrigger>
          <TabsTrigger value="students">Student Payments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tutors" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tutor Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutor Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Process Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTutorPayments.length > 0 ? (
                    filteredTutorPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.tutorName}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.classCount}</TableCell>
                        <TableCell>{payment.period}</TableCell>
                        <TableCell>{paymentStatusBadge(payment.status)}</TableCell>
                        <TableCell>{new Date(payment.processDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleViewPayment(payment, 'tutor')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {payment.status === 'pending' && (
                              <Button variant="outline" size="icon" className="text-green-600">
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No tutor payments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="students" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudentPayments.length > 0 ? (
                    filteredStudentPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.studentName}</TableCell>
                        <TableCell>{payment.plan}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{paymentStatusBadge(payment.status)}</TableCell>
                        <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(payment.nextBilling).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleViewPayment(payment, 'student')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {payment.status === 'overdue' && (
                              <Button variant="outline" size="icon" className="text-blue-600">
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No student payments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Payment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPayment?.type === 'tutor' ? 'Tutor Payment Details' : 'Student Payment Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    {selectedPayment.type === 'tutor' ? 'Tutor Name' : 'Student Name'}
                  </h4>
                  <p>{selectedPayment.type === 'tutor' ? selectedPayment.tutorName : selectedPayment.studentName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Amount</h4>
                  <p className="font-bold">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <div>{paymentStatusBadge(selectedPayment.status)}</div>
                </div>
                {selectedPayment.type === 'tutor' ? (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Class Count</h4>
                      <p>{selectedPayment.classCount} classes</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Period</h4>
                      <p>{selectedPayment.period}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Process Date</h4>
                      <p>{new Date(selectedPayment.processDate).toLocaleDateString()}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Plan</h4>
                      <p>{selectedPayment.plan}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Payment Date</h4>
                      <p>{new Date(selectedPayment.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Next Billing</h4>
                      <p>{new Date(selectedPayment.nextBilling).toLocaleDateString()}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
              <Button variant="outline" className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
              {(selectedPayment?.status === 'pending' && selectedPayment?.type === 'tutor') && (
                <Button className="flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  <span>Mark as Paid</span>
                </Button>
              )}
              {(selectedPayment?.status === 'overdue' && selectedPayment?.type === 'student') && (
                <Button className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Request Payment</span>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsManager;
