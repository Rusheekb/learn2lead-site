import { render, screen, fireEvent } from '@testing-library/react';
import ClassDetailsDialog from '../ClassDetailsDialog';
import { ClassEvent } from '@/types/tutorTypes';

// Regression coverage for a bug where useClassLogs.ts hardcoded
// studentUploads: [] and handleDownloadFile: () => {}, and ClassLogs.tsx
// separately hardcoded handleDownloadFile={async () => {}} at this dialog's
// render site — the "Student Uploads" section always rendered empty with
// dead buttons. This asserts the real service-backed handlers passed in
// actually get invoked when a user clicks download/view, not just that the
// dialog renders without crashing.
//
// Student uploads now live under the "Materials" tab (merged with class
// materials — see ClassDetailsDialog's tab consolidation) rather than a
// separate "Student Content" tab.

const mockHandleDownloadFile = jest.fn();
const mockHandleViewFile = jest.fn();

const selectedClass: ClassEvent = {
  id: 'log-1',
  title: 'Algebra',
  date: new Date('2026-01-01'),
  notes: null,
  subject: 'Math',
  tutorName: 'Jane Tutor',
  studentName: 'Sam Student',
  startTime: '10:00',
  endTime: '11:00',
  classCost: 20,
  tutorCost: 15,
};

const renderDialog = () =>
  render(
    <ClassDetailsDialog
      isDetailsOpen={true}
      setIsDetailsOpen={() => {}}
      selectedClass={selectedClass}
      activeDetailsTab="materials"
      setActiveDetailsTab={() => {}}
      studentUploads={[
        {
          id: 'upload-1',
          fileName: 'homework.pdf',
          fileSize: '10 KB',
          uploadDate: '2026-01-01',
        },
      ]}
      handleDownloadFile={mockHandleDownloadFile}
      handleViewFile={mockHandleViewFile}
      formatTime={(t: string) => t}
    />
  );

describe('ClassDetailsDialog Materials tab (student uploads section)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the real download handler when a file is downloaded', () => {
    renderDialog();

    fireEvent.click(screen.getByTitle('Download file'));
    expect(mockHandleDownloadFile).toHaveBeenCalledWith('upload-1');
  });

  it('calls the real view handler when a file is viewed', () => {
    renderDialog();

    fireEvent.click(screen.getByTitle('View file'));
    expect(mockHandleViewFile).toHaveBeenCalledWith('upload-1');
  });
});
