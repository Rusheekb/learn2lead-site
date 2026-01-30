

# Static Subject Resources Implementation

## Summary

Populate the subject cards with curated external learning resources (Khan Academy, YouTube, study guides) that students can access immediately. This is a zero-AI-cost approach that provides value while keeping the door open for AI practice features later.

## Current State

- Subject cards show topics but the "Explore All Resources" button and topic clicks do nothing
- The "Resources" tab in the sidebar shows an empty materials list
- No external learning links exist in the codebase

## What Students Will See

When clicking a subject card or topic:
1. Subject card expands to show topics (existing behavior)
2. Each topic shows curated external resource links
3. "Explore All Resources" button navigates to a dedicated subject resources page
4. Resources tab in sidebar shows all subjects organized by category

## Implementation Steps

### Step 1: Extend Subject Data Structure

Update `src/constants/subjectsData.ts` to include resource links for each topic:

```text
Subject
├── Topics (existing)
│   └── Each topic gets resources:
│       ├── videos (YouTube, Khan Academy)
│       ├── practice (external sites)
│       └── reading (articles, guides)
```

Each resource will have:
- Title
- URL
- Source (e.g., "Khan Academy", "YouTube")
- Type (video, practice, article)

### Step 2: Create Resource Components

**New: `src/components/student/resources/TopicResourceLinks.tsx`**
- Displays resource links for a specific topic
- Groups by type (Videos, Practice, Reading)
- Opens links in new tabs with security attributes

**New: `src/components/student/resources/SubjectResourcesPage.tsx`**
- Full page view for a subject's resources
- Shows all topics with their resources
- Includes search/filter functionality

**New: `src/components/student/resources/ResourceCard.tsx`**
- Individual resource item with icon, title, source badge
- External link indicator

### Step 3: Update Existing Components

**Update: `src/components/student/SubjectCards.tsx`**
- Add resource links under each topic when expanded
- Make "Explore All Resources" button navigate to subject page

**Update: `src/pages/Dashboard.tsx`**
- Enhance "resources" tab to show subject-organized content
- Replace empty StudentContent with new SubjectResourcesList

### Step 4: Add Routing

**Update: `src/App.tsx`**
- Add route for `/dashboard/subject/:subjectId` for full subject pages

## Resource Data Example

```typescript
// For Mathematics - Algebra I topic
{
  topic: "Algebra I",
  resources: [
    {
      title: "Algebra Basics",
      url: "https://www.khanacademy.org/math/algebra",
      source: "Khan Academy",
      type: "video"
    },
    {
      title: "Algebra Practice Problems", 
      url: "https://www.mathway.com/Algebra",
      source: "Mathway",
      type: "practice"
    }
  ]
}
```

## Curated Resources by Subject

### Mathematics
- Khan Academy (all levels)
- Mathway (practice)
- Desmos (graphing)
- YouTube: 3Blue1Brown, Professor Leonard

### Science
- Khan Academy
- CrashCourse (YouTube)
- PhET Simulations
- Bozeman Science

### English
- Purdue OWL (writing)
- SparkNotes (literature)
- Grammar Girl
- YouTube: TED-Ed

### History
- Khan Academy
- CrashCourse (YouTube)
- History.com
- National Geographic Education

### Foreign Languages
- Duolingo (practice)
- SpanishDict, WordReference
- YouTube: Easy Languages series

## Files to Create

1. `src/components/student/resources/ResourceCard.tsx`
2. `src/components/student/resources/TopicResourceLinks.tsx`
3. `src/components/student/resources/SubjectResourcesPage.tsx`
4. `src/components/student/resources/SubjectResourcesList.tsx`
5. `src/components/student/resources/index.ts`

## Files to Modify

1. `src/constants/subjectsData.ts` - Add resources data structure
2. `src/components/student/SubjectCards.tsx` - Show resource links, wire up button
3. `src/pages/Dashboard.tsx` - Update resources tab content
4. `src/App.tsx` - Add subject detail route

## Future AI Enhancement Hooks

The structure will be designed to easily add later:
- "AI Practice" badge on topics (coming soon indicator)
- Plan-gated AI question button
- Usage tracking integration points

## Benefits of This Approach

1. **Zero ongoing costs** - All external links, no API usage
2. **Immediate value** - Students get useful resources right away  
3. **SEO-friendly** - Links to reputable educational sites
4. **Low maintenance** - Static data that rarely needs updates
5. **Clear upgrade path** - Easy to add AI features later without restructuring

