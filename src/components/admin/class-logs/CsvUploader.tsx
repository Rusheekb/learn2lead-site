import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import Papa, { ParseResult } from 'papaparse';
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

interface ClassLog {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  student_name: string;
  tutor_name: string;
  subject: string;
  notes: string;
  status: 'completed' | 'pending' | 'cancelled';
  payment_status: 'completed' | 'pending';
  tutor_payment_status: 'completed' | 'pending';
  class_cost: number;
  tutor_cost: number;
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
        complete: async (results: ParseResult<CsvRecord>) => {
          const records = results.data;
          
          if (results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors);
            toast.error('Error parsing CSV file. Please check the file format.');
            setIsUploading(false);
            return;
          }

          const classLogs: ClassLog[] = records.map((record) => {
            try {
              // Parse date and time
              const date = parse(record['Date'], 'MM/dd/yyyy', new Date());
              if (isNaN(date.getTime())) {
                throw new Error('Invalid date format');
              }

              const timeCST = record['Time (CST)'];
              const durationHrs = parseFloat(record['Time (hrs)'] || '1');
              
              // Calculate start and end time
              const [hours, minutes] = timeCST.split(':').map(Number);
              const startTime = set(date, { hours: hours || 0, minutes: minutes || 0 });
              const endTime = addHours(startTime, isNaN(durationHrs) ? 1 : durationHrs);
              
              // Validate payment statuses
              const normalizePaymentStatus = (status: string): 'completed' | 'pending' => {
                return status?.toLowerCase() === 'paid' ? 'completed' : 'pending';
              };

              return {
                title: `Class ${record['Class Number']} - ${record['Subject']}: ${record['Content']}`,
                date: format(date, 'yyyy-MM-dd'),
                start_time: format(startTime, 'HH:mm:ss'),
                end_time: format(endTime, 'HH:mm:ss'),
                student_name: record['Student Name'],
                tutor_name: record['Tutor Name'],
                subject: record['Subject'],
                notes: `Content: ${record['Content']}\nHomework: ${record['HW']}\nAdditional Info: ${record['Additional Info']}`,
                status: 'completed' as const,
                payment_status: normalizePaymentStatus(record['Payment Status']),
                tutor_payment_status: normalizePaymentStatus(record['Tutor Payment Status']),
                class_cost: parseFloat(record['Class Cost']) || 0,
                tutor_cost: parseFloat(record['Tutor Cost']) || 0
              };
            } catch (error) {
              console.error('Error processing record:', error);
              throw new Error(`Error processing record for Class ${record['Class Number']}`);
            }
          });

          // Upload records to Supabase
          const { error } = await supabase
            .from('class_logs')
            .insert(classLogs);

          if (error) {
            console.error('Error uploading class logs:', error);
            toast.error('Error uploading class logs');
            setIsUploading(false);
            return;
          }

          toast.success('Class logs uploaded successfully');
          onUploadComplete();
          setIsUploading(false);
        },
        error: (error: Error) => {
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