/**
 * Generate test CSV data for import/export testing
 * Includes mix of scenarios to test upsert logic
 */
export const generateTestCSV = (): string => {
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
    'Additional Info'
  ];

  // Test scenarios:
  // 1. Record with existing Class Number (should update)
  // 2. Record with blank Class Number (should auto-generate)
  // 3. New record with Class Number (should insert)
  // 4. New record without Class Number (should insert with auto-generated ID)
  const testRows = [
    // Existing record to test UPDATE
    [
      'SM-JD-20241115-1', // Use a Class Number that might exist
      'John Doe',
      'Sarah Miller',
      '11/15/2024',
      'Friday',
      '14:00',
      '1',
      'Math',
      'Updated: Algebra review - testing update',
      'Practice problems 1-10',
      '50',
      '25',
      '11/16/24',
      '11/17/24',
      'Test update scenario'
    ],
    // New record with auto-generated ID
    [
      '', // Blank Class Number - should auto-generate
      'Jane Smith',
      'Michael Brown',
      '11/20/2024',
      'Wednesday',
      '15:30',
      '1.5',
      'Science',
      'Chemistry lab work',
      'Complete lab report',
      '75',
      '35',
      '',
      '',
      'Test auto-generation'
    ],
    // New record with provided Class Number
    [
      'TEST-001',
      'Robert Johnson',
      'Emily Davis',
      '11/21/2024',
      'Thursday',
      '10:00',
      '2',
      'English',
      'Essay writing techniques',
      'Write 500-word essay',
      '100',
      '50',
      '11/21/24',
      '',
      'Test insert with ID'
    ],
    // Another auto-generated scenario
    [
      '',
      'Lisa Anderson',
      'David Wilson',
      '11/22/2024',
      'Friday',
      '16:00',
      '1',
      'History',
      'World War II overview',
      'Read chapters 5-6',
      '50',
      '25',
      '',
      '',
      'Second auto-generation test'
    ]
  ];

  // Convert to CSV format
  const csvLines = [
    headers.join(','),
    ...testRows.map(row => 
      row.map(cell => {
        // Escape cells with commas or quotes
        if (cell.includes(',') || cell.includes('\"') || cell.includes('\n')) {
          return `\"${cell.replace(/\"/g, '\"\"')}\"`;
        }
        return cell;
      }).join(',')
    )
  ];

  return csvLines.join('\n');
};

/**
 * Download test CSV file
 */
export const downloadTestCSV = (): void => {
  const csvContent = generateTestCSV();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `test-class-logs-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
