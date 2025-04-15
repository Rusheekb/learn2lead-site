
import React from "react";
import { useTutorScheduler } from "@/hooks/useTutorScheduler";
import { mockStudents } from "@/hooks/mockStudents";
import SchedulerHeader from "./SchedulerHeader";
import SchedulerFilter from "./SchedulerFilter";
import CalendarWithEvents from "./CalendarWithEvents";
import ClassDialogs from "./ClassDialogs";

const TutorScheduler: React.FC = () => {
  const {
    // State values
    selectedDate,
    setSelectedDate,
    isAddEventOpen,
    setIsAddEventOpen,
    isViewEventOpen, 
    setIsViewEventOpen,
    selectedEvent,
    setSelectedEvent,
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
    isLoading,
    newEvent,
    setNewEvent,
    studentMessages,
    studentUploads,
    filteredClasses,
    allSubjects,

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
  } = useTutorScheduler();

  // Type adapter functions to handle string/string ID mismatches
  const adaptedHandleDeleteEvent = (eventId: string, isRecurring?: boolean) => {
    return handleDeleteEvent(eventId, isRecurring);
  };

  const adaptedMarkMessageRead = (messageId: string) => {
    return handleMarkMessageRead(messageId);
  };

  const adaptedDownloadFile = (uploadId: string) => {
    return handleDownloadFile(uploadId);
  };

  const adaptedGetUnreadMessageCount = (classId: string) => {
    return getUnreadMessageCount(classId);
  };

  return (
    <div className="space-y-6">
      <SchedulerHeader onAddClick={() => setIsAddEventOpen(true)} />

      <SchedulerFilter 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        subjectFilter={subjectFilter}
        setSubjectFilter={setSubjectFilter}
        studentFilter={studentFilter}
        setStudentFilter={setStudentFilter}
        allSubjects={allSubjects}
        students={mockStudents}
      />
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p>Loading classes...</p>
        </div>
      ) : (
        <CalendarWithEvents 
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          scheduledClasses={filteredClasses}
          onSelectEvent={handleSelectEvent}
          onAddEventClick={() => setIsAddEventOpen(true)}
          getUnreadMessageCount={adaptedGetUnreadMessageCount}
        />
      )}
      
      <ClassDialogs 
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
        students={mockStudents}
        onCreateEvent={handleCreateEvent}
        onEditEvent={handleEditEvent}
        onDuplicateEvent={handleDuplicateEvent}
        onDeleteEvent={adaptedHandleDeleteEvent}
        onResetForm={resetNewEventForm}
        onMarkAsRead={adaptedMarkMessageRead}
        onDownloadFile={adaptedDownloadFile}
        getUnreadMessageCount={adaptedGetUnreadMessageCount}
      />
    </div>
  );
};

export default TutorScheduler;
