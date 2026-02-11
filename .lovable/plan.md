

# Multi-Term Search in Class Logs

## Overview
Enhance the existing search bar so that comma-separated terms are treated as AND conditions. Each term is matched independently against all text fields (title, tutor, student, subject). No new UI elements needed.

## Example
- Typing `bob, john, math` shows only classes where ALL three terms appear (across any combination of fields)
- Typing `bob` continues to work as before (single-term search)

## What Changes

### 1. Update filter logic in `src/hooks/useSimplifiedClassLogs.ts`
Replace the single-term search with multi-term AND logic:

```typescript
if (searchTerm) {
  const terms = searchTerm.split(/[,&]/).map(t => t.trim().toLowerCase()).filter(Boolean);
  const searchableText = [c.title, c.tutorName, c.studentName, c.subject]
    .filter(Boolean)
    .map(s => s!.toLowerCase());
  
  const allMatch = terms.every(term =>
    searchableText.some(field => field.includes(term))
  );
  if (!allMatch) return false;
}
```

### 2. Update search placeholder
Change the placeholder text in `src/components/admin/class-logs/ClassFilters.tsx` to hint at the feature:

```
"Search by tutor, student, subject (use commas to combine)"
```

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useSimplifiedClassLogs.ts` | Split search term by `,` or `&`, require ALL terms to match |
| `src/components/admin/class-logs/ClassFilters.tsx` | Update placeholder text to explain comma syntax |

## How It Works
1. Admin types `bob, math` in the search bar
2. The input is split into `["bob", "math"]`
3. For each class log, all searchable fields are checked
4. A log only appears if every term matches at least one field
5. Single-term searches work exactly as before (no behavior change)

