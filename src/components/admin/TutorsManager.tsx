import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchTutors } from "@/services/dataService";
import { useClassLogs } from "@/hooks/useClassLogs";

interface Tutor {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  rating: number;
  classes: number;
  hourlyRate: number;
}

const ensureValidSubject = (subject: string): string => {
  return subject && subject.trim() !== '' ? subject : `subject-${Date.now()}`;
};

const TutorsManager: React.FC = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { classes, allSubjects } = useClassLogs();

  useEffect(() => {
    const loadTutors = async () => {
      setIsLoading(true);
      try {
        const tutorData = await fetchTutors();
        
        const enhancedTutors = tutorData.map(tutor => {
          const tutorClasses = classes.filter(cls => cls.tutorName === tutor.name);
          
          const subjects = Array.from(new Set(tutorClasses.map(cls => cls.subject))).filter(Boolean);
          
          const classesCount = tutorClasses.length;
          
          const totalCost = tutorClasses.reduce((sum, cls) => sum + (cls.tutorCost || 0), 0);
          const totalHours = tutorClasses.reduce((sum, cls) => sum + (cls.duration || 0), 0);
          const hourlyRate = totalHours > 0 ? Math.round(totalCost / totalHours) : 0;
          
          return {
            ...tutor,
            subjects,
            classes: classesCount,
            hourlyRate,
            rating: Math.floor(Math.random() * 2) + 4
          };
        });
        
        setTutors(enhancedTutors);
      } catch (error) {
        console.error("Error loading tutors:", error);
        toast({
          title: "Error",
          description: "Failed to load tutor data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (classes.length > 0) {
      loadTutors();
    }
  }, [classes]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSubjectFilter = (value: string) => {
    setSubjectFilter(value);
  };

  const handleDeleteTutor = (tutorId: string) => {
    setTutors(tutors.filter(tutor => tutor.id !== tutorId));
    toast({
      title: "Tutor Deleted",
      description: "The tutor has been successfully removed.",
    });
  };

  const filteredTutors = tutors.filter(tutor => {
    const matchesSearch = tutor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tutor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === "all" || tutor.subjects.includes(subjectFilter);
    return matchesSearch && matchesSubject;
  });

  const validSubjects = allSubjects.map(subject => ensureValidSubject(subject));

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
                id: Date.now().toString(),
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                subjects: (formData.get('subjects') as string).split(',').map(s => s.trim()),
                rating: 5,
                classes: 0,
                hourlyRate: parseInt(formData.get('hourlyRate') as string || '0')
              };
              setTutors([...tutors, newTutor]);
              toast({
                title: "Tutor Added",
                description: "New tutor has been successfully added to the system.",
              });
              (e.target as HTMLFormElement).reset();
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                  <Input id="name" name="name" required placeholder="John Smith" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input id="email" name="email" type="email" required placeholder="john.smith@example.com" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="subjects" className="text-sm font-medium">Subjects (comma-separated)</label>
                  <Input id="subjects" name="subjects" required placeholder="Mathematics, Physics, Chemistry" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="hourlyRate" className="text-sm font-medium">Hourly Rate ($)</label>
                  <Input id="hourlyRate" name="hourlyRate" type="number" min="0" required placeholder="50" />
                </div>
              </div>
              <DialogFooter>
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
                {validSubjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>{subject || "Unknown Subject"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <p>Loading tutors...</p>
            </div>
          ) : filteredTutors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No tutors found matching your criteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTutors.map((tutor) => (
                  <TableRow key={tutor.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium">{tutor.name}</div>
                        <div className="text-sm text-muted-foreground">{tutor.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{tutor.subjects.join(", ") || "None"}</TableCell>
                    <TableCell>{tutor.rating}/5</TableCell>
                    <TableCell>{tutor.classes}</TableCell>
                    <TableCell>${tutor.hourlyRate}/hr</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TutorsManager;
