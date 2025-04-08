import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, FileUp, Trash2, Plus, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockStudentUploads } from "../shared/mock-data";
import { toast } from "sonner";

const mockMaterials = [
  {
    id: 1,
    name: "Algebra Fundamentals",
    type: "worksheet",
    subject: "Mathematics",
    dateUploaded: "2025-03-15",
    sharedWith: ["Alex Johnson", "Jamie Smith"]
  },
  {
    id: 2,
    name: "Chemistry Lab Safety Guide",
    type: "document",
    subject: "Chemistry",
    dateUploaded: "2025-03-20",
    sharedWith: ["Jamie Smith"]
  },
  {
    id: 3,
    name: "Essay Writing Structure",
    type: "presentation",
    subject: "English",
    dateUploaded: "2025-03-25",
    sharedWith: ["Taylor Brown"]
  },
  {
    id: 4,
    name: "World History Timeline",
    type: "document",
    subject: "History",
    dateUploaded: "2025-04-02",
    sharedWith: ["Taylor Brown"]
  },
  {
    id: 5,
    name: "Calculus Practice Problems",
    type: "worksheet",
    subject: "Mathematics",
    dateUploaded: "2025-04-05",
    sharedWith: []
  }
];

const mockStudents = [
  { id: 1, name: "Alex Johnson", subjects: ["Mathematics", "Physics"] },
  { id: 2, name: "Jamie Smith", subjects: ["Chemistry", "Biology"] },
  { id: 3, name: "Taylor Brown", subjects: ["English", "History"] }
];

const TutorMaterials: React.FC = () => {
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<string>("my-materials");
  const [materialData, setMaterialData] = useState({
    name: "",
    description: "",
    subject: "",
    type: "",
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  const [studentUploads] = useState(mockStudentUploads);

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

  const openShareDialog = (material: any) => {
    setSelectedMaterial(material);
    setSelectedStudents(material.sharedWith.map((name: string) => {
      const student = mockStudents.find(s => s.name === name);
      return student ? student.id.toString() : "";
    }).filter(Boolean));
    setIsShareOpen(true);
  };

  const handleDownloadStudentFile = (uploadId: number) => {
    const upload = studentUploads.find(u => u.id === uploadId);
    if (upload) {
      toast.success(`Downloading ${upload.fileName}`);
    }
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date Uploaded</TableHead>
                    <TableHead>Shared With</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          {material.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{material.type}</span>
                      </TableCell>
                      <TableCell>{material.subject}</TableCell>
                      <TableCell>{new Date(material.dateUploaded).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {material.sharedWith.length > 0 ? (
                          <span>{material.sharedWith.length} students</span>
                        ) : (
                          <span className="text-gray-500">Not shared</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="icon" title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => openShareDialog(material)}
                            title="Share with students"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" title="Delete">
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
        </TabsContent>
        
        <TabsContent value="student-uploads" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Uploaded Materials</CardTitle>
            </CardHeader>
            <CardContent>
              {studentUploads.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Date Uploaded</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentUploads.map((upload) => (
                      <TableRow key={upload.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            {upload.fileName}
                          </div>
                        </TableCell>
                        <TableCell>{upload.studentName}</TableCell>
                        <TableCell>{upload.uploadDate}</TableCell>
                        <TableCell>{upload.fileSize}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadStudentFile(upload.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-2" />
                  <p>No student materials have been uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Material</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-md p-6 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
              />
              <label 
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center text-gray-500 hover:text-gray-700"
              >
                <Upload className="h-8 w-8 mb-2" />
                <span className="font-medium">Click to upload</span>
                <span className="text-sm">or drag and drop</span>
              </label>
              
              {uploadedFile && (
                <div className="mt-4 text-left bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500">{Math.round(uploadedFile.size / 1024)} KB</p>
                </div>
              )}
            </div>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="material-name">Name</Label>
                <Input
                  id="material-name"
                  value={materialData.name}
                  onChange={(e) => setMaterialData({...materialData, name: e.target.value})}
                  placeholder="Enter material name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="material-subject">Subject</Label>
                  <Select
                    onValueChange={(value) => setMaterialData({...materialData, subject: value})}
                  >
                    <SelectTrigger id="material-subject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="material-type">Type</Label>
                  <Select
                    onValueChange={(value) => setMaterialData({...materialData, type: value})}
                  >
                    <SelectTrigger id="material-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worksheet">Worksheet</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="material-desc">Description</Label>
                <Textarea
                  id="material-desc"
                  value={materialData.description}
                  onChange={(e) => setMaterialData({...materialData, description: e.target.value})}
                  placeholder="Enter a description for this material"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUpload} 
              disabled={!uploadedFile || !materialData.name}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Material with Students</DialogTitle>
          </DialogHeader>
          
          {selectedMaterial && (
            <div className="py-4">
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <p className="text-sm font-medium">{selectedMaterial.name}</p>
                <p className="text-xs text-gray-500">{selectedMaterial.subject} • {selectedMaterial.type}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="select-students">Select Students</Label>
                  <Select 
                    onValueChange={(value) => {
                      if (!selectedStudents.includes(value)) {
                        setSelectedStudents([...selectedStudents, value]);
                      }
                    }}
                  >
                    <SelectTrigger id="select-students">
                      <SelectValue placeholder="Add students" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockStudents.map(student => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Selected Students:</h4>
                  <div className="space-y-2">
                    {selectedStudents.length > 0 ? (
                      selectedStudents.map(studentId => {
                        const student = mockStudents.find(s => s.id.toString() === studentId);
                        return (
                          <div key={studentId} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <span>{student?.name}</span>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedStudents(selectedStudents.filter(id => id !== studentId))}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500">No students selected</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleShareMaterial} 
              disabled={selectedStudents.length === 0}
            >
              Share Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorMaterials;
