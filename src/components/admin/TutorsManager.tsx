
import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchTutors } from "@/services/dataService";
import { useClassLogs } from "@/hooks/useClassLogs";
import TutorFilters from "./tutors/TutorFilters";
import TutorTable from "./tutors/TutorTable";
import AddTutorDialog from "./tutors/AddTutorDialog";
import { Tutor } from "@/types/tutorTypes";

const ensureValidSubject = (subject: string): string => {
  return subject && subject.trim() !== '' ? subject : `subject-${Date.now()}`;
};

const TutorsManager: React.FC = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const { classes, allSubjects } = useClassLogs();

  const loadTutors = useCallback(async () => {
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
  }, [classes, toast]);
  
  useEffect(() => {
    if (classes.length > 0) {
      loadTutors();
    }
  }, [classes, loadTutors]);

  const handleDeleteTutor = (tutorId: string) => {
    setTutors(tutors.filter(tutor => tutor.id !== tutorId));
    toast({
      title: "Tutor Deleted",
      description: "The tutor has been successfully removed.",
    });
  };

  const handleAddTutor = (newTutor: Tutor) => {
    setTutors([...tutors, newTutor]);
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
        <Button className="flex items-center gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add New Tutor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tutor Directory</CardTitle>
          <TutorFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            subjectFilter={subjectFilter}
            setSubjectFilter={setSubjectFilter}
            validSubjects={validSubjects}
          />
        </CardHeader>
        <CardContent>
          <TutorTable
            tutors={filteredTutors}
            isLoading={isLoading}
            onDelete={handleDeleteTutor}
          />
        </CardContent>
      </Card>

      <AddTutorDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddTutor={handleAddTutor}
      />
    </div>
  );
};

export default TutorsManager;
