
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { format, parse, set, addHours } from 'date-fns';

interface CsvUploaderProps {
  onUploadComplete: () => void;
}

interface CsvRecord {
  'Class Number': string;
  'Date': string;
  'Time (CST)': string;
  'Time (hrs)': string;
  'Student Name': string;
  'Tutor Name': string;
  'Subject': string;
  'Content': string;
  'HW': string;
  'Additional Info': string;
  'Class Cost': string;
  'Tutor Cost': string;
  'Payment Status': string;
  'Tutor Payment Status': string;
}

const CsvUploader: React.FC<CsvUploaderProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const parseTimeCST = (timeStr: string): { startTime: string, endTime: string } => {
    try {
      // Assuming time format is like "4:00 PM" or "4:00PM"
      const cleanTimeStr = timeStr.replace(/\s+/g, '').toUpperCase();
      const time = parse(cleanTimeStr, 'h:mma', new Date());
      const durationMatch = /(\d+(\.\d+)?)\s*hrs?/i.exec(timeStr);
      const duration = durationMatch ? parseFloat(durationMatch[1]) : 1;
      
      const startTime = format(time, 'HH:mm:00');
      const endTime = format(new Date(time.getTime() + duration * 60 * 60 * 1000), 'HH:mm:00');
      
      return { startTime, endTime };
    } catch (error) {
      console.error('Error parsing time:', error);
      return { startTime: '09:00:00', endTime: '10:00:00' };
    }
  };

  const processFile = async (file: File) => {
    try {
      setIsUploading(true);
      const text = await file.text();
      
      Papa.parse<CsvRecord>(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const records = results.data;
          
          if (results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors);
            toast.error('Error parsing CSV file. Please check the file format.');
            setIsUploading(false);
            return;
          }

          try {
            // Process each record individually
            for (const record of records) {
              // Convert the record to the format expected by Supabase
              const supabaseRecord = {
                "Class Number": record["Class Number"] || "",
                "Student Name": record["Student Name"] || "",
                "Tutor Name": record["Tutor Name"] || "",
                "Date": record["Date"] || "",
                "Day": new Date(record["Date"]).toLocaleDateString('en-US', { weekday: 'long' }),
                "Time (CST)": record["Time (CST)"] || "",
                "Time (hrs)": record["Time (hrs)"] || "",
                "Subject": record["Subject"] || "",
                "Content": record["Content"] || "",
                "HW": record["HW"] || "",
                "Class Cost": record["Class Cost"] || "",
                "Tutor Cost": record["Tutor Cost"] || "",
                "Student Payment": record["Payment Status"] || "",
                "Tutor Payment": record["Tutor Payment Status"] || "",
                "Additional Info": record["Additional Info"] || ""
              };
              
              // Insert the record into Supabase
              const { error } = await supabase
                .from('class_logs')
                .insert(supabaseRecord);
                
              if (error) {
                console.error('Error inserting record:', error);
                toast.error(`Error uploading record for ${record["Class Number"]}`);
              }
            }
            
            toast.success('Class logs uploaded successfully');
            onUploadComplete();
          } catch (error) {
            console.error('Error processing records:', error);
            toast.error('Error processing records');
          } finally {
            setIsUploading(false);
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          toast.error('Error parsing CSV file');
          setIsUploading(false);
        }
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Error processing file');
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.type === 'application/vnd.ms-excel')) {
      await processFile(file);
    } else {
      toast.error('Please upload a CSV file');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center ${
        isDragging ? 'border-tutoring-blue bg-tutoring-blue/5' : 'border-gray-300'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".csv,.xls,.xlsx"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />
      
      <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium mb-2">Upload Class Logs</h3>
      <p className="text-sm text-gray-500 mb-4">
        Drag and drop your CSV file here, or click to select
      </p>
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="relative"
      >
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-tutoring-blue border-t-transparent mr-2" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Select CSV File
          </>
        )}
      </Button>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Your CSV should include these columns:</p>
        <p className="font-mono text-xs mt-1 space-y-1">
          <span className="block">Class Number, Tutor Name, Student Name, Date,</span>
          <span className="block">Day, Time (CST), Time (hrs), Subject,</span>
          <span className="block">Content, HW, Payment Status, Tutor Payment Status,</span>
          <span className="block">Class Cost, Tutor Cost, Additional Info</span>
        </p>
      </div>
    </div>
  );
};

export default CsvUploader;
