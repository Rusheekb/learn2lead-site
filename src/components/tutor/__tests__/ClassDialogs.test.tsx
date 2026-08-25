import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ClassDialogs } from '../ClassDialogs';
import { ClassEvent } from '@/types/tutorTypes';

// Regression coverage for a bug where ClassDialogs hardcoded
// studentUploads={[]}, onDownloadFile={async () => {}}, and
// onViewFile={async () => {}} directly in JSX — the "Student Content" tab
// always rendered empty with dead buttons, several layers deep in the tutor
// scheduler dialog chain. These tests assert the real service functions are
// actually invoked, not just that the component renders without crashing.

const mockFetchClassUploads = jest.fn();
const mockDownloadClassFile = jest.fn();
const mockViewClassFile = jest.fn();

jest.mock('@/services/classUploadsService', () => ({
  fetchClassUploads: (...args: unknown[]) => mockFetchClassUploads(...args),
  downloadClassFile: (...args: unknown[]) => mockDownloadClassFile(...args),
  viewClassFile: (...args: unknown[]) => mockViewClassFile(...args),
}));

jest.mock('../dialogs/AddClassDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../dialogs/ViewClassDialog', () => ({
  __esModule: true,
  default: ({
    studentUploads,
    onDownloadFile,
    onViewFile,
  }: {
    studentUploads: { id: string }[];
    onDownloadFile: (id: string) => void;
    onViewFile: (id: string) => void;
  }) => (
    <div>
      <span data-testid="upload-count">{studentUploads.length}</span>
      {studentUploads.map((u) => (
        <div key={u.id}>
          <button onClick={() => onDownloadFile(u.id)}>Download {u.id}</button>
          <button onClick={() => onViewFile(u.id)}>View {u.id}</button>
        </div>
      ))}
    </div>
  ),
}));

const selectedEvent = { id: 'class-1', title: 'Algebra' } as ClassEvent;

const renderDialogs = () =>
  render(
    <ClassDialogs
      isAddEventOpen={false}
      isEditEventOpen={false}
      isViewEventOpen={true}
      selectedEvent={selectedEvent}
      onCloseDialogs={() => {}}
      onRefreshData={() => {}}
      newEvent={{}}
      setNewEvent={() => {}}
      onCreateEvent={async () => true}
    />
  );

describe('ClassDialogs file sharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchClassUploads.mockResolvedValue([
      {
        id: 'upload-1',
        fileName: 'homework.pdf',
        fileSize: '10 KB',
        uploadDate: '2026-01-01',
      },
    ]);
  });

  it('fetches real uploads for the selected class when opened', async () => {
    renderDialogs();

    expect(mockFetchClassUploads).toHaveBeenCalledWith('class-1');
    await waitFor(() => {
      expect(screen.getByTestId('upload-count')).toHaveTextContent('1');
    });
  });

  it('wires downloads to the real download service, not a no-op', async () => {
    renderDialogs();

    await waitFor(() => screen.getByText('Download upload-1'));
    fireEvent.click(screen.getByText('Download upload-1'));

    expect(mockDownloadClassFile).toHaveBeenCalledWith('upload-1');
  });

  it('wires file viewing to the real view service, not a no-op', async () => {
    renderDialogs();

    await waitFor(() => screen.getByText('View upload-1'));
    fireEvent.click(screen.getByText('View upload-1'));

    expect(mockViewClassFile).toHaveBeenCalledWith('upload-1');
  });
});
