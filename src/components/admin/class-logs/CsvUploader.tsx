import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';

interface CsvUploaderProps {
  onUploadComplete: () => void;
}

const CsvUploader: React.FC<CsvUploaderProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      parsePreview(selectedFile);
    }
  };

  const parsePreview = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData(results.data.slice(0, 5)); // Show first 5 rows
        setShowPreview(true);
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
        setFile(null);
      },
    });
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      // Parse the entire CSV file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              toast.error('You must be logged in to import data');
              setIsUploading(false);
              return;
            }

            // Call the edge function to import the data
            const { data, error } = await supabase.functions.invoke('import-class-logs', {
              body: { rows: results.data },
            });

            if (error) throw error;

            const { success, failed, errors } = data;

            if (failed > 0) {
              toast.error(
                `Import completed with errors: ${success} successful, ${failed} failed`,
                {
                  description: errors.slice(0, 3).map((e: any) => 
                    `Row ${e.row}: ${e.error}`
                  ).join('\n'),
                  duration: 10000,
                }
              );
              console.error('Import errors:', errors);
            } else {
              toast.success(`Successfully imported ${success} class logs`);
            }

            setFile(null);
            setPreviewData([]);
            setShowPreview(false);
            onUploadComplete();
          } catch (error) {
            console.error('Import error:', error);
            toast.error(
              error instanceof Error ? error.message : 'Failed to import data'
            );
          } finally {
            setIsUploading(false);
          }
        },
        error: (error) => {
          toast.error(`Error parsing CSV: ${error.message}`);
          setIsUploading(false);
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process file');
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'Class Number',
      'Tutor Name',
      'Student Name',
      'Date',
      'Day',
      'Time (CST)',
      'Time (hrs)',
      'Subject',
      'Content',
      'HW',
      'Class Cost',
      'Tutor Cost',
      'Student Payment',
      'Tutor Payment',
      'Additional Info',
    ];

    const csv = headers.join(',');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'class_logs_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
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
          <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
          <p className="mb-1 font-medium">Click to upload CSV</p>
          <p className="text-sm text-muted-foreground">or drag and drop</p>
        </label>
      </div>

      {file && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium truncate max-w-[200px]">
                {file.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null);
                setPreviewData([]);
                setShowPreview(false);
              }}
              className="text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          </div>

          {showPreview && previewData.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                Preview (First 5 rows)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {Object.keys(previewData[0]).map((key) => (
                        <th key={key} className="text-left p-2 font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        {Object.values(row).map((value: any, cellIdx) => (
                          <td key={cellIdx} className="p-2">
                            {value || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setFile(null);
            setPreviewData([]);
            setShowPreview(false);
            onUploadComplete();
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleUpload} disabled={!file || isUploading}>
          {isUploading ? 'Importing...' : `Import ${file ? '(' + previewData.length + '+ rows)' : ''}`}
        </Button>
      </div>
    </div>
  );
};

export default CsvUploader;
