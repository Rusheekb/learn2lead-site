import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Mail, Phone, Search, Plus, Edit2, Trash2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface Tutor {
  id: number;
  name: string;
  email: string;
  phone: string;
  subjects: string[];
  verified: boolean;
  rating: number;
  studentsCount: number;
  nextSession: string;
}

const mockTutors: Tutor[] = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@learn2lead.com",
    phone: "(555) 123-4567",
    subjects: ["Mathematics", "Physics"],
    verified: true,
    rating: 4.9,
    studentsCount: 18,
    nextSession: "2025-04-12T14:00:00"
  },
  {
    id: 2,
    name: "Prof. Michael Chen",
    email: "michael.chen@learn2lead.com",
    phone: "(555) 234-5678",
    subjects: ["Chemistry", "Biology"],
    verified: true,
    rating: 4.7,
    studentsCount: 15,
    nextSession: "2025-04-10T10:30:00"
  },
  {
    id: 3,
    name: "Lisa Rodriguez",
    email: "lisa.rodriguez@learn2lead.com",
    phone: "(555) 345-6789",
    subjects: ["English Literature", "Writing"],
    verified: false,
    rating: 4.5,
    studentsCount: 12,
    nextSession: "2025-04-11T16:15:00"
  },
  {
    id: 4,
    name: "James Wilson",
    email: "james.wilson@learn2lead.com",
    phone: "(555) 456-7890",
    subjects: ["History", "Social Studies"],
    verified: true,
    rating: 4.8,
    studentsCount: 14,
    nextSession: "2025-04-13T13:00:00"
  },
];

const TutorsManager: React.FC = () => {
  const [tutors, setTutors] = useState<Tutor[]>(mockTutors);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const { toast } = useToast();
  const [isAddTutorOpen, setIsAddTutorOpen] = useState(false);

  const allSubjects = Array.from(
    new Set(tutors.flatMap(tutor => tutor.subjects))
  ).sort();

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSubjectFilter = (value: string) => {
    setSubjectFilter(value);
  };

  const handleVerificationFilter = (value: string) => {
    setVerificationFilter(value);
  };

  const handleDeleteTutor = (tutorId: number) => {
    setTutors(tutors.filter(tutor => tutor.id !== tutorId));
    toast({
      title: "Tutor Removed",
      description: "The tutor has been successfully removed from the system.",
      variant: "default",
    });
  };

  const handleVerifyTutor = (tutorId: number) => {
    setTutors(tutors.map(tutor => 
      tutor.id === tutorId ? { ...tutor, verified: true } : tutor
    ));
    toast({
      title: "Tutor Verified",
      description: "The tutor has been successfully verified.",
      variant: "default",
    });
  };

  const filteredTutors = tutors.filter(tutor => {
    const matchesSearch = 
      tutor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutor.phone.includes(searchTerm);
    const matchesSubject = subjectFilter === "all" || tutor.subjects.includes(subjectFilter);
    const matchesVerification = verificationFilter === "all" || 
      (verificationFilter === "verified" ? tutor.verified : !tutor.verified);
    return matchesSearch && matchesSubject && matchesVerification;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Tutors</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Tutor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Tutor</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newTutor = {
                id: tutors.length + 1,
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                subjects: (formData.get('subjects') as string).split(',').map(s => s.trim()),
                verified: false,
                rating: 0,
                studentsCount: 0,
                nextSession: new Date().toISOString()
              };
              setTutors([...tutors, newTutor]);
              toast({
                title: "Tutor Added",
                description: "New tutor has been successfully added to the system.",
              });
              (e.target as HTMLFormElement).reset();
              setIsAddTutorOpen(false);
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                  <Input id="name" name="name" required placeholder="Dr. John Smith" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input id="email" name="email" type="email" required placeholder="john.smith@learn2lead.com" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="phone" className="text-sm font-medium">Phone</label>
                  <Input id="phone" name="phone" required placeholder="(555) 123-4567" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="subjects" className="text-sm font-medium">Subjects (comma-separated)</label>
                  <Input id="subjects" name="subjects" required placeholder="Mathematics, Physics, Chemistry" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddTutorOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Tutor</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tutor Directory</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tutors..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
            <Select onValueChange={handleSubjectFilter} defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {allSubjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleVerificationFilter} defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Next Session</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTutors.map((tutor) => (
                <TableRow key={tutor.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium flex items-center gap-1">
                        {tutor.name}
                        {tutor.verified && <BadgeCheck className="h-4 w-4 text-green-500" />}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-col gap-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {tutor.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {tutor.phone}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{tutor.subjects.join(", ")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{tutor.rating}/5.0</span>
                    </div>
                  </TableCell>
                  <TableCell>{tutor.studentsCount}</TableCell>
                  <TableCell>{new Date(tutor.nextSession).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!tutor.verified && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleVerifyTutor(tutor.id)}
                          className="text-green-500 hover:text-green-600"
                        >
                          <BadgeCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteTutor(tutor.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TutorsManager;
