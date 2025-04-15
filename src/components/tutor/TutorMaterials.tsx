import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { StudentUpload } from "../shared/StudentContent";

// Imported components
import MaterialsTable from "./MaterialsTable";
import StudentUploadsTable from "./StudentUploadsTable";
import UploadMaterialDialog from "./UploadMaterialDialog";
import ShareMaterialDialog from "./ShareMaterialDialog";
import { mockMaterials, mockStudents } from "./mock-data-students";
import { Material } from "./types/studentTypes";

// Define a complete mock data set for uploads
const mockUploads: StudentUpload[] = [
  {
    id: "1",
    classId: "101",
    studentName: "Alex Johnson",
    fileName: "Homework1.pdf",
    fileSize: "1.2 MB",
    uploadDate: "2023-04-10",
    note: "First homework submission"
  },
  {
    id: "2",
    classId: "102",
    studentName: "Jamie Smith",
    fileName: "ChemistryNotes.docx",
    fileSize: "842 KB",
    uploadDate: "2023-04-11",
    note: "Notes from class"
  },
  {
    id: "3",
    classId: "103",
    studentName: "Taylor Brown",
    fileName: "EssayDraft.docx",
    fileSize: "1.5 MB", 
    uploadDate: "2023-04-12",
    note: "First draft of essay"
  }
];

const TutorMaterials: React.FC = () => {
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<string>("my-materials");
  const [materialData, setMaterialData] = useState({
    name: "",
    description: "",
    subject: "",
    type: "",
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  const [studentUploads] = useState<StudentUpload[]>(mockUploads);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setMaterialData({
        ...materialData,
        name: file.name.split('.')[0]
      });
    }
  };

  const handleUpload = () => {
    console.log("Uploading material:", materialData);
    console.log("File:", uploadedFile);
    setIsUploadOpen(false);
    
    setMaterialData({
      name: "",
      description: "",
      subject: "",
      type: "",
    });
    setUploadedFile(null);
  };

  const handleShareMaterial = () => {
    console.log("Sharing material:", selectedMaterial?.id, "with students:", selectedStudents);
    setIsShareOpen(false);
    setSelectedStudents([]);
  };

  const openShareDialog = (material: Material) => {
    setSelectedMaterial(material);
    setSelectedStudents(material.sharedWith.map((name: string) => {
      const student = mockStudents.find(s => s.name === name);
      return student ? student.id : "";
    }).filter(Boolean));
    setIsShareOpen(true);
  };

  const handleDownloadStudentFile = (uploadId: string) => {
    const upload = studentUploads.find(u => u.id === uploadId);
    if (upload) {
      toast.success(`Downloading ${upload.fileName}`);
    }
  };

  const handleMaterialDataChange = (data: Partial<typeof materialData>) => {
    setMaterialData({...materialData, ...data});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Class Materials</h2>
        <Button onClick={() => setIsUploadOpen(true)}>
          <FileUp className="h-4 w-4 mr-1" /> Upload Material
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-materials">My Materials</TabsTrigger>
          <TabsTrigger value="student-uploads">Student Uploads</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-materials" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Teaching Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <MaterialsTable 
                materials={mockMaterials} 
                onShareMaterial={openShareDialog} 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="student-uploads" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Uploaded Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentUploadsTable 
                uploads={studentUploads}
                onDownload={handleDownloadStudentFile}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <UploadMaterialDialog 
        isOpen={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        materialData={materialData}
        uploadedFile={uploadedFile}
        onMaterialDataChange={handleMaterialDataChange}
        onFileChange={handleFileChange}
        onUpload={handleUpload}
      />
      
      <ShareMaterialDialog 
        isOpen={isShareOpen}
        onOpenChange={setIsShareOpen}
        selectedMaterial={selectedMaterial}
        students={mockStudents}
        selectedStudents={selectedStudents}
        onSelectedStudentsChange={setSelectedStudents}
        onShareMaterial={handleShareMaterial}
      />
    </div>
  );
};

export default TutorMaterials;
