
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Download, Plus, Trash2 } from "lucide-react";

interface Material {
  id: number;
  name: string;
  type: string;
  subject: string;
  dateUploaded: string;
  sharedWith: string[];
}

interface MaterialsTableProps {
  materials: Material[];
  onShareMaterial: (material: Material) => void;
}

const MaterialsTable: React.FC<MaterialsTableProps> = ({ materials, onShareMaterial }) => {
  return (
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
        {materials.map((material) => (
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
                  onClick={() => onShareMaterial(material)}
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
  );
};

export default MaterialsTable;
