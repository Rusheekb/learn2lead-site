
import React from 'react';
import DataTable, { ColumnDefinition } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { FileText, Download, Plus, Trash2 } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  type: string;
  subject: string;
  dateUploaded: string;
  uploadDate?: string;
  size: string;
  sharedWith: string[];
}

interface MaterialsTableProps {
  materials: Material[];
  onShareMaterial: (material: Material) => void;
}

const MaterialsTable: React.FC<MaterialsTableProps> = ({
  materials,
  onShareMaterial,
}) => {
  const columns: ColumnDefinition<Material>[] = [
    {
      header: 'Name',
      cell: (material) => (
        <div className="flex items-center font-medium">
          <FileText className="h-4 w-4 mr-2" />
          {material.name}
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (material) => (
        <span className="capitalize">{material.type}</span>
      ),
    },
    {
      header: 'Subject',
      accessorKey: 'subject',
    },
    {
      header: 'Date Uploaded',
      cell: (material) => (
        new Date(material.dateUploaded).toLocaleDateString()
      ),
    },
    {
      header: 'Shared With',
      cell: (material) => (
        material.sharedWith.length > 0 ? (
          <span>{material.sharedWith.length} students</span>
        ) : (
          <span className="text-gray-500">Not shared</span>
        )
      ),
    },
    {
      header: 'Actions',
      cell: (material) => (
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
      ),
    },
  ];

  return (
    <DataTable
      data={materials}
      columns={columns}
      showCard={false}
    />
  );
};

export default MaterialsTable;
