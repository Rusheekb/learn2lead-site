
import { useStatusHandling } from './useStatusHandling';
import { useContentHandling } from './useContentHandling';

export const useClassHandling = () => {
  const { handleUpdateStatus, handleUpdateAttendance, handleDeleteClass } = useStatusHandling();
  const { handleClassClick, loadClassContent } = useContentHandling();

  return {
    handleClassClick,
    loadClassContent,
    handleUpdateStatus,
    handleUpdateAttendance,
    handleDeleteClass,
  };
};
