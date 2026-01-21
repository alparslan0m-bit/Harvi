# Search & Filter System - Implementation Guide

## Overview

This document outlines the comprehensive Search & Filter system implemented across the Admin Dashboard. The system provides real-time, client-side filtering with performance optimization, text highlighting, and excellent UX.

---

## Architecture

### Component Structure

```
admin-v2/
├── src/
│   ├── types/
│   │   └── filters.ts              # TypeScript type definitions
│   ├── lib/
│   │   └── filterUtils.ts          # Core filtering logic & utilities
│   ├── hooks/
│   │   └── useFilteredData.ts      # Custom hook for filter state
│   ├── components/
│   │   ├── filters/
│   │   │   ├── SearchFilter.tsx    # Main search/filter UI component
│   │   │   └── SearchFilter.css
│   │   └── ui/
│   │       ├── HighlightedText.tsx # Text highlighting component
│   │       ├── HighlightedText.css
│   │       ├── EmptyState.tsx      # Empty state component
│   │       └── EmptyState.css
│   └── pages/
│       ├── ModulesPage.tsx         # Example implementation
│       ├── SubjectsPage.tsx        # Example implementation
│       └── ...
```

---

## Core Components

### 1. **Types** (`types/filters.ts`)

Defines the type system for the filter architecture:

- **`FilterConfig<T>`**: Configuration for which fields to search
- **`FilterState`**: Current state of filters (query, status, etc.)
- **`FilterResult<T>`**: Results with metadata (total, matched count)
- **`FuzzyMatchResult`**: Fuzzy search result with confidence score

### 2. **Filter Utilities** (`lib/filterUtils.ts`)

Core filtering logic:

- **`filterItems()`**: Main filtering function with memoization support
- **`fuzzyMatch()`**: Levenshtein distance-based fuzzy matching
- **`simpleMatch()`**: Fast substring matching
- **`highlightMatch()`**: Text segment extraction for highlighting
- **`debounce()`**: Input debouncing utility (optional use)

**Performance Features:**
- Client-side only (no API calls)
- Early exit for short queries
- Memoization-ready design

### 3. **useFilteredData Hook** (`hooks/useFilteredData.ts`)

Custom React hook that:
- Manages filter state
- Provides memoized filtered results
- Returns total and matched counts
- Prevents unnecessary re-renders via `useMemo`

**Usage:**
```tsx
const {
    filterState,
    setFilterState,
    filteredData,
    totalCount,
    matchedCount,
} = useFilteredData(items, {
    searchFields: ['name', 'external_id', 'id'],
    fuzzySearch: false,
    minSearchLength: 1,
});
```

### 4. **SearchFilter Component** (`components/filters/SearchFilter.tsx`)

Reusable search/filter UI with:

**Features:**
- ✅ Real-time search (no submit button)
- ✅ Clear visual feedback (results count)
- ✅ Reset filters button
- ✅ Disabled state with guidance messages
- ✅ Keyboard accessible (focus states, ARIA labels)
- ✅ Sticky positioning (stays visible on scroll)
- ✅ Optional status and content count filters
- ✅ Responsive design

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `filterState` | `FilterState` | Current filter state |
| `onFilterChange` | `(state: FilterState) => void` | Filter change handler |
| `placeholder` | `string` | Search input placeholder |
| `totalCount` | `number` | Total items count |
| `matchedCount` | `number` | Filtered items count |
| `disabled` | `boolean` | Disable filters |
| `disabledMessage` | `string` | Message when disabled |

### 5. **HighlightedText Component** (`components/ui/HighlightedText.tsx`)

Highlights matched search terms within text:
- Yellow background with dark text
- Handles case-insensitive matching
- Clean visual styling

### 6. **EmptyState Component** (`components/ui/EmptyState.tsx`)

Displays friendly empty states:
- Multiple icon options (search, inbox, filter, info)
- Title, description, and action button
- Clean, centered layout

---

## Implementation Examples

### ModulesPage Integration

```tsx
import { useFilteredData } from '../hooks/useFilteredData';
import SearchFilter from '../components/filters/SearchFilter';
import HighlightedText from '../components/ui/HighlightedText';
import EmptyState from '../components/ui/EmptyState';

export default function ModulesPage() {
    const { data: modules } = useModules();
    
    // 1. Add filter hook
    const {
        filterState,
        setFilterState,
        filteredData: filteredModules,
        totalCount,
        matchedCount,
    } = useFilteredData(modules, {
        searchFields: ['name', 'external_id', 'id'],
        fuzzySearch: false,
        minSearchLength: 1,
    });

    return (
        <div className="management-page">
            {/* 2. Add SearchFilter component */}
            <SearchFilter
                filterState={filterState}
                onFilterChange={setFilterState}
                placeholder="Search modules by name, external ID, or UUID..."
                totalCount={totalCount}
                matchedCount={matchedCount}
            />

            <table className="data-table">
                <tbody>
                    {/* 3. Use filteredModules instead of modules */}
                    {filteredModules?.map(module => (
                        <tr key={module.id}>
                            <td>
                                {/* 4. Highlight matched text */}
                                <HighlightedText
                                    text={module.name}
                                    query={filterState.searchQuery}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* 5. Add empty states */}
            {modules?.length === 0 && (
                <EmptyState
                    icon="inbox"
                    title="No modules found"
                    description="Create your first module to get started."
                />
            )}

            {modules && modules.length > 0 && filteredModules?.length === 0 && (
                <EmptyState
                    icon="search"
                    title="No results match your search"
                    description="Try adjusting your search terms."
                    action={{
                        label: 'Reset Filters',
                        onClick: () => setFilterState({
                            searchQuery: '',
                            status: 'all',
                        }),
                    }}
                />
            )}
        </div>
    );
}
```

---

## Feature Details

### 1. Real-Time Search

**How It Works:**
- Input captures `onChange` events
- Filtering happens instantly (client-side)
- No debouncing by default (data is already loaded)
- Memoization prevents unnecessary processing

**Search Fields:**
- Name/Title
- External ID
- UUID (id field)

### 2. Fuzzy Matching (Optional)

**Levenshtein Distance Algorithm:**
```typescript
fuzzyMatch("moduel", "module") // { matches: true, score: 0.83 }
```

**Configuration:**
```tsx
useFilteredData(items, {
    searchFields: ['name'],
    fuzzySearch: true,  // Enable fuzzy matching
    minSearchLength: 2,  // Minimum characters before filtering
});
```

**Trade-offs:**
- ✅ Typo-tolerant
- ❌ Slower for large datasets
- 💡 Recommended: Keep disabled unless needed

### 3. Context-Aware Filtering

**Hierarchical Filtering:**
For pages with parent-child relationships (e.g., Lectures under Subjects):

```tsx
// Filter lectures by selected subject
const filteredLectures = useMemo(() => {
    return lectures?.filter(lec => lec.subject_id === selectedSubjectId);
}, [lectures, selectedSubjectId]);

// Then apply search filters
const { filteredData } = useFilteredData(filteredLectures, config);
```

**Disabled State Example:**
```tsx
<SearchFilter
    filterState={filterState}
    onFilterChange={setFilterState}
    disabled={!selectedParent}
    disabledMessage="Select a module to filter subjects"
/>
```

### 4. Performance Optimization

**Key Strategies:**

1. **Memoization:**
```tsx
const filteredResult = useMemo(() => {
    return filterItems(data, filterState, config);
}, [data, filterState, config]);
```

2. **Client-Side Only:**
- No API calls on keystroke
- Data already fetched via React Query
- Filtering happens in memory

3. **Early Exit:**
```tsx
if (!searchQuery || searchQuery.length < minSearchLength) {
    return allItems; // Skip filtering
}
```

4. **Minimal Re-renders:**
- Filter state managed separately
- Components only re-render when filtered data changes

---

## Accessibility Features

✅ **Keyboard Navigation:**
- All inputs are keyboard focusable
- Clear focus indicators (blue outline)
- Tab order is logical

✅ **ARIA Labels:**
```tsx
<label htmlFor={searchInputId}>
    <span className="sr-only">Search</span>
</label>
```

✅ **Focus Management:**
- Focus states on all interactive elements
- `:focus-visible` for keyboard users

✅ **Screen Reader Support:**
- Semantic HTML
- Descriptive labels
- Status announcements via text

---

## Styling & UX

### Sticky Search Bar
```css
.search-filter {
    position: sticky;
    top: 20px;
    z-index: 10;
}
```

### Highlight Styling
```css
.highlight-match {
    background-color: #fef08a; /* Yellow */
    color: #854d0e; /* Dark yellow */
    font-weight: 600;
}
```

### Empty States
- Large, centered layout
- Friendly iconography
- Clear call-to-action buttons

---

## Edge Cases Handled

1. **No Data:**
   - Show "No items" empty state
   - Filters are disabled

2. **No Results:**
   - Show "No results match" empty state
   - Offer "Reset Filters" action

3. **Short Queries:**
   - Configurable `minSearchLength`
   - Default: 1 character

4. **Special Characters:**
   - Handled in search (trimmed, case-insensitive)
   - No regex injection issues

5. **Null/Undefined Values:**
   - Safely handled via `String(value)` conversion
   - Null check before matching

---

## Future Enhancements

### Potential Additions:

1. **Advanced Filters:**
   - Date range filters
   - Multi-select dropdown filters
   - Tag-based filtering

2. **Search History:**
   - LocalStorage persistence
   - Recent searches dropdown

3. **Export Filtered Results:**
   - CSV export button
   - JSON download

4. **Saved Filter Presets:**
   - User-defined filter combinations
   - Quick-apply presets

5. **Server-Side Search:**
   - For very large datasets (1000+ items)
   - Backend pagination + search

---

## Testing Recommendations

### Unit Tests:
```typescript
describe('filterUtils', () => {
    test('fuzzyMatch handles typos', () => {
        const result = fuzzyMatch('moduel', 'module');
        expect(result.matches).toBe(true);
    });

    test('filterItems returns correct results', () => {
        const items = [
            { id: '1', name: 'Test Module' },
            { id: '2', name: 'Another' },
        ];
        const result = filterItems(items, { searchQuery: 'test' }, {
            searchFields: ['name'],
        });
        expect(result.matchedCount).toBe(1);
    });
});
```

### Integration Tests:
- Test SearchFilter component rendering
- Test filter state updates
- Test empty state transitions

### E2E Tests:
- User types in search box → results update
- User clicks reset → filters clear
- User searches with no results → empty state shows

---

## Migration Guide

### Adding Filters to a New Page:

1. **Import dependencies:**
```tsx
import { useFilteredData } from '../hooks/useFilteredData';
import SearchFilter from '../components/filters/SearchFilter';
import HighlightedText from '../components/ui/HighlightedText';
import EmptyState from '../components/ui/EmptyState';
```

2. **Add filter hook:**
```tsx
const { filterState, setFilterState, filteredData, totalCount, matchedCount } = 
    useFilteredData(yourData, {
        searchFields: ['name', 'external_id', 'id'],
    });
```

3. **Add SearchFilter component:**
```tsx
<SearchFilter
    filterState={filterState}
    onFilterChange={setFilterState}
    placeholder="Search..."
    totalCount={totalCount}
    matchedCount={matchedCount}
/>
```

4. **Use filteredData in rendering:**
```tsx
{filteredData?.map(item => (
    <tr key={item.id}>
        <td>
            <HighlightedText text={item.name} query={filterState.searchQuery} />
        </td>
    </tr>
))}
```

5. **Add empty states.**

---

## Summary

The Search & Filter system is:
- ✅ **Reusable:** Single component used across all pages
- ✅ **Performant:** Client-side with memoization
- ✅ **Accessible:** Keyboard navigable, ARIA compliant
- ✅ **User-Friendly:** Real-time, highlighted results, clear empty states
- ✅ **Type-Safe:** Full TypeScript coverage
- ✅ **Extensible:** Easy to add new filter types

**Zero backend changes required.** All filtering happens client-side on already-fetched data.
