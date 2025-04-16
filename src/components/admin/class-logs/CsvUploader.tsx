
import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface CsvUploaderProps {
  onUploadComplete: () => void;
}

const CsvUploader: React.FC<CsvUploaderProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "text/csv") {
        toast.error("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsUploading(true);
    try {
      // In a real implementation, this would send the file to a backend service
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
      
      toast.success("File uploaded successfully");
      setFile(null);
      onUploadComplete();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          id="csv-upload"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <label
          htmlFor="csv-upload"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <Upload className="h-8 w-8 mb-2 text-gray-500" />
          <p className="mb-1 font-medium">Click to upload CSV</p>
          <p className="text-sm text-gray-500">or drag and drop</p>
        </label>
      </div>

      {file && (
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-sm truncate max-w-[150px]">{file.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFile(null)}
            className="text-red-500"
          >
            Remove
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onUploadComplete()}>
          Cancel
        </Button>
        <Button 
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
};

export default CsvUploader;
