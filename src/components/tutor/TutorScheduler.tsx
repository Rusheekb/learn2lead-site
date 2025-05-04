
import React from 'react';
import { useTutorScheduler } from '@/hooks/useTutorScheduler';
import TutorSchedulerHeader from './scheduler/TutorSchedulerHeader';
import TutorSchedulerFilters from './scheduler/TutorSchedulerFilters';
import TutorSchedulerCalendar from './scheduler/TutorSchedulerCalendar';
import TutorSchedulerDialogs from './scheduler/TutorSchedulerDialogs';
import TableSkeleton from '../common/TableSkeleton';

const TutorScheduler: React.FC = () => {
  // Use our comprehensive hook with all the scheduler functionality
  const {
    // State
    selectedDate,
    setSelectedDate,
    isAddEventOpen,
    setIsAddEventOpen,
    isViewEventOpen,
    setIsViewEventOpen,
    selectedEvent,
    activeEventTab,
    setActiveEventTab,
    isEditMode,
    setIsEditMode,
    searchTerm,
    setSearchTerm,
    subjectFilter,
    setSubjectFilter,
    studentFilter,
    setStudentFilter,
    newEvent,
    setNewEvent,
    filteredClasses,
    allSubjects,
    studentMessages,
    studentUploads,
    isLoading,
    
    // Methods
    handleSelectEvent,
    handleCreateEvent,
    handleEditEvent,
    handleDeleteEvent,
    handleDuplicateEvent,
    resetNewEventForm,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount,
    refreshEvent,
  } = useTutorScheduler();

  // Display loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="space-y-6">
        <TutorSchedulerHeader onAddClick={() => setIsAddEventOpen(true)} />
        <TableSkeleton 
          columns={['Date', 'Time', 'Student', 'Subject', 'Actions']} 
          rowCount={5} 
          cellWidths={['w-24', 'w-32', 'w-40', 'w-32', 'w-24']} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TutorSchedulerHeader onAddClick={() => setIsAddEventOpen(true)} />
      
      <TutorSchedulerFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        subjectFilter={subjectFilter}
        setSubjectFilter={setSubjectFilter}
        studentFilter={studentFilter}
        setStudentFilter={setStudentFilter}
        allSubjects={allSubjects || []}
      />
      
      <TutorSchedulerCalendar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        scheduledClasses={filteredClasses}
        onSelectEvent={handleSelectEvent}
        onAddEventClick={() => setIsAddEventOpen(true)}
        getUnreadMessageCount={getUnreadMessageCount}
      />
      
      <TutorSchedulerDialogs
        isViewEventOpen={isViewEventOpen}
        setIsViewEventOpen={setIsViewEventOpen}
        isAddEventOpen={isAddEventOpen}
        setIsAddEventOpen={setIsAddEventOpen}
        selectedEvent={selectedEvent}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        activeEventTab={activeEventTab}
        setActiveEventTab={setActiveEventTab}
        studentMessages={studentMessages}
        studentUploads={studentUploads}
        onCreateEvent={handleCreateEvent}
        onEditEvent={handleEditEvent}
        onDuplicateEvent={handleDuplicateEvent}
        onDeleteEvent={handleDeleteEvent}
        onResetForm={resetNewEventForm}
        onMarkAsRead={handleMarkMessageRead}
        onDownloadFile={handleDownloadFile}
        getUnreadMessageCount={getUnreadMessageCount}
        refreshEvent={refreshEvent}
      />
    </div>
  );
};

export default TutorScheduler;
