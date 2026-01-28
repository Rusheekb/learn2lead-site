

# Fix for Off-Screen Schedule Class Modal

## Problem Analysis

The "Schedule New Class" modal on the tutor dashboard is cut off at the bottom, hiding the "Start Time" and "End Time" fields. This occurs because:

1. **Large Modal Content**: The form contains 8 fields (Title, Subject, Student, Date, Start/End Time, Zoom Link, Notes) plus action buttons
2. **Fixed Centering Issue**: The modal uses `top-[50%] translate-y-[-50%]` centering, which works well for smaller modals but can push larger content off-screen
3. **Insufficient Scroll Area**: While `max-h-[95vh]` and `overflow-y-auto` exist on the DialogContent, the inner content structure doesn't properly enable scrolling

## Solution Approach

The safest fix involves two targeted changes that improve modal responsiveness without breaking existing dialogs:

### Change 1: Update AddClassDialog.tsx

Modify the DialogContent className to use a more flexible height constraint and ensure proper scroll behavior:

```text
Current (line 189):
  <DialogContent className="max-w-3xl px-8 bg-white text-gray-900 border">

Updated:
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto px-4 sm:px-8 bg-white text-gray-900 border">
```

This adds:
- `max-h-[90vh]` - Limits modal to 90% of viewport height
- `overflow-y-auto` - Enables scrolling when content exceeds height
- Responsive padding (`px-4 sm:px-8`)

### Change 2: Make Form Content Scrollable

Wrap the form content in a scrollable container (around lines 190-211):

```text
<div className="py-2 flex flex-col max-h-[calc(90vh-4rem)]">
  <h2 className="text-lg font-semibold flex-shrink-0">Schedule New Class</h2>
  
  {isLoading ? (
    <div className="py-8 sm:py-12 text-center text-lg">Loading student data...</div>
  ) : (
    <div className="flex-1 overflow-y-auto py-4 sm:py-6 px-3 sm:px-6">
      <NewClassEventForm ... />
      
      <div className="flex justify-end space-x-2 mt-6 sticky bottom-0 bg-white py-4 border-t">
        <Button variant="outline" onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Schedule Class'}
        </Button>
      </div>
    </div>
  )}
</div>
```

Key improvements:
- **Flex column layout** with constrained max-height
- **Scrollable form area** (`flex-1 overflow-y-auto`)
- **Sticky footer buttons** that remain visible while scrolling
- **Header stays fixed** at the top

## Technical Details

### Files to Modify

1. `src/components/tutor/dialogs/AddClassDialog.tsx`
   - Update DialogContent className for proper constraints
   - Restructure inner content with flex layout
   - Make action buttons sticky at bottom

### Why This is Safe

- Changes are isolated to `AddClassDialog.tsx` only
- Does not modify the base `dialog.tsx` component
- Other dialogs (ViewClassDialog, EditClassDialog) remain unchanged
- Uses standard Tailwind utilities with existing patterns in the codebase
- Maintains all existing functionality (validation, submission, etc.)

### Alternative Considered

Could also reduce form size by:
- Making Zoom Link and Notes collapsible (adds complexity)
- Reducing padding/spacing (sacrifices readability)
- Using a two-step wizard (more invasive change)

The overflow solution is the simplest and most maintainable fix.

