

# Fix: Notes Textarea Appearing Below Buttons

## Problem Identified

The current layout has **two conflicting scroll containers**:
1. `DialogContent` has `overflow-y-auto max-h-[90vh]`
2. The inner form wrapper also has `overflow-y-auto`

This creates a situation where:
- The sticky footer buttons don't stick correctly
- The Notes textarea (which is at the bottom of the form) appears below the button area
- Scrolling behavior is unpredictable

## Solution

Restructure the layout so there is only ONE scroll container (the form area), with the buttons in a truly fixed footer OUTSIDE the scrollable region.

### Layout Structure

```text
DialogContent (no overflow - just max-height)
  +-- Header (fixed, non-scrolling)
  |     "Schedule New Class"
  +-- Scrollable Form Container (overflow-y-auto, flex-1)
  |     NewClassEventForm (all fields including Notes)
  +-- Footer (fixed, non-scrolling)
        Cancel | Schedule Class buttons
```

### Changes to AddClassDialog.tsx

**Line 189** - Remove overflow from DialogContent:
```text
Before: className="max-w-3xl max-h-[90vh] overflow-y-auto px-4 sm:px-8 ..."
After:  className="max-w-3xl max-h-[90vh] px-4 sm:px-8 ..."
```

**Lines 190-211** - Restructure the content layout:
```text
<div className="flex flex-col h-full max-h-[calc(90vh-4rem)]">
  {/* Fixed Header */}
  <h2 className="text-lg font-semibold py-2 flex-shrink-0">
    Schedule New Class
  </h2>
  
  {isLoading ? (
    <div className="py-12 text-center">Loading student data...</div>
  ) : (
    <>
      {/* Scrollable Form Area */}
      <div className="flex-1 overflow-y-auto py-4 px-1">
        <NewClassEventForm ... />
      </div>
      
      {/* Fixed Footer - Outside scroll container */}
      <div className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t bg-white">
        <Button variant="outline">Cancel</Button>
        <Button>Schedule Class</Button>
      </div>
    </>
  )}
</div>
```

Key improvements:
- **Single scroll container**: Only the form area scrolls
- **Fixed footer**: Buttons are outside the scroll area with `flex-shrink-0`
- **Proper flex layout**: Uses `h-full` and flex to properly distribute space
- **No sticky positioning**: Buttons don't need sticky since they're outside the scroll container

## Technical Details

### Why sticky wasn't working
The `sticky bottom-0` approach requires:
1. A single, direct parent with overflow scroll
2. Enough height constraint on that parent

With nested overflow containers, sticky positioning breaks because the element sticks to the wrong scroll boundary.

### Files to Modify
- `src/components/tutor/dialogs/AddClassDialog.tsx` - restructure the dialog content layout

### No changes needed to
- `src/components/ui/dialog.tsx` - centering fix is correct
- `src/components/tutor/NewClassEventForm.tsx` - form fields order is correct

