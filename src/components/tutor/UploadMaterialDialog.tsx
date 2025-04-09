
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";

interface UploadData {
  name: string;
  description: string;
  subject: string;
  type: string;
}

interface UploadMaterialDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  materialData: UploadData;
  uploadedFile: File | null;
  onMaterialDataChange: (data: Partial<UploadData>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
}

const UploadMaterialDialog: React.FC<UploadMaterialDialogProps> = ({
  isOpen,
  onOpenChange,
  materialData,
  uploadedFile,
  onMaterialDataChange,
  onFileChange,
  onUpload
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
              onChange={onFileChange}
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
                onChange={(e) => onMaterialDataChange({name: e.target.value})}
                placeholder="Enter material name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="material-subject">Subject</Label>
                <Select
                  onValueChange={(value) => onMaterialDataChange({subject: value})}
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
                  onValueChange={(value) => onMaterialDataChange({type: value})}
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
                onChange={(e) => onMaterialDataChange({description: e.target.value})}
                placeholder="Enter a description for this material"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={onUpload} 
            disabled={!uploadedFile || !materialData.name}
          >
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadMaterialDialog;
