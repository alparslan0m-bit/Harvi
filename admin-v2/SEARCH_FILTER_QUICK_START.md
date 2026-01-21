# Search & Filter - Quick Start Guide

## 🚀 Quick Implementation (5 Steps)

Add search & filter to any page in **under 5 minutes**.

---

## Step 1: Import Components

```tsx
import { useFilteredData } from '../hooks/useFilteredData';
import SearchFilter from '../components/filters/SearchFilter';
import HighlightedText from '../components/ui/HighlightedText';
import EmptyState from '../components/ui/EmptyState';
```

---

## Step 2: Add Filter Hook

```tsx
const {
    filterState,
    setFilterState,
    filteredData,
    totalCount,
    matchedCount,
} = useFilteredData(yourDataArray, {
    searchFields: ['name', 'external_id', 'id'], // Fields to search
    fuzzySearch: false,        // Optional: enable typo tolerance
    minSearchLength: 1,        // Minimum characters to trigger search
});
```

---

## Step 3: Add SearchFilter Component

Place this **before** your table/list:

```tsx
<SearchFilter
    filterState={filterState}
    onFilterChange={setFilterState}
    placeholder="Search by name, ID, or UUID..."
    totalCount={totalCount}
    matchedCount={matchedCount}
/>
```

---

## Step 4: Use Filtered Data

Replace your data array with `filteredData`:

**Before:**
```tsx
{items?.map(item => <Row key={item.id} data={item} />)}
```

**After:**
```tsx
{filteredData?.map(item => (
    <Row key={item.id}>
        <HighlightedText 
            text={item.name} 
            query={filterState.searchQuery} 
        />
    </Row>
))}
```

---

## Step 5: Add Empty States

```tsx
{/* No data at all */}
{items?.length === 0 && (
    <EmptyState
        icon="inbox"
        title="No items found"
        description="Create your first item to get started."
        action={{ label: 'Add Item', onClick: handleCreate }}
    />
)}

{/* No results from search */}
{items && items.length > 0 && filteredData?.length === 0 && (
    <EmptyState
        icon="search"
        title="No results match your search"
        description="Try adjusting your search terms."
        action={{ 
            label: 'Reset Filters', 
            onClick: () => setFilterState({ 
                searchQuery: '', 
                status: 'all' 
            }) 
        }}
    />
)}
```

---

## 🎨 Component Props Reference

### SearchFilter

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `filterState` | `FilterState` | ✅ | - | Current filter state |
| `onFilterChange` | `(state) => void` | ✅ | - | Update handler |
| `placeholder` | `string` | ❌ | `"Search..."` | Input placeholder |
| `totalCount` | `number` | ❌ | - | Total items |
| `matchedCount` | `number` | ❌ | - | Filtered items |
| `disabled` | `boolean` | ❌ | `false` | Disable filters |
| `disabledMessage` | `string` | ❌ | - | Message when disabled |
| `showStatusFilter` | `boolean` | ❌ | `false` | Show status dropdown |
| `showContentCountFilter` | `boolean` | ❌ | `false` | Show min count filter |

### HighlightedText

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✅ | Text to display |
| `query` | `string` | ✅ | Search query to highlight |
| `className` | `string` | ❌ | Additional CSS class |

### EmptyState

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `icon` | `'search' \| 'inbox' \| 'filter' \| 'info'` | ❌ | Icon to display |
| `title` | `string` | ✅ | Primary message |
| `description` | `string` | ❌ | Secondary message |
| `action` | `{ label: string, onClick: () => void }` | ❌ | Action button |

---

## 🔧 Common Configurations

### Basic Search (Most Common)
```tsx
useFilteredData(data, {
    searchFields: ['name', 'external_id', 'id'],
});
```

### Search with Fuzzy Matching
```tsx
useFilteredData(data, {
    searchFields: ['name'],
    fuzzySearch: true,  // Typo-tolerant
});
```

### Search with Minimum Length
```tsx
useFilteredData(data, {
    searchFields: ['name', 'external_id'],
    minSearchLength: 3,  // Require 3+ characters
});
```

### Context-Aware (Parent-Child)
```tsx
// First filter by parent
const childItems = useMemo(() => 
    allItems?.filter(item => item.parent_id === selectedParentId),
    [allItems, selectedParentId]
);

// Then apply search
const { filteredData } = useFilteredData(childItems, config);
```

---

## 📝 Complete Example

```tsx
import { useState } from 'react';
import { useFilteredData } from '../hooks/useFilteredData';
import SearchFilter from '../components/filters/SearchFilter';
import HighlightedText from '../components/ui/HighlightedText';
import EmptyState from '../components/ui/EmptyState';

export default function ItemsPage() {
    const { data: items } = useItems();
    
    // Filter setup
    const {
        filterState,
        setFilterState,
        filteredData,
        totalCount,
        matchedCount,
    } = useFilteredData(items, {
        searchFields: ['name', 'external_id', 'id'],
    });

    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Items Management</h1>
                <button onClick={handleCreate}>+ Add Item</button>
            </div>

            <SearchFilter
                filterState={filterState}
                onFilterChange={setFilterState}
                placeholder="Search items..."
                totalCount={totalCount}
                matchedCount={matchedCount}
            />

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>ID</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredData?.map(item => (
                        <tr key={item.id}>
                            <td>
                                <HighlightedText 
                                    text={item.name} 
                                    query={filterState.searchQuery} 
                                />
                            </td>
                            <td>
                                <code>
                                    <HighlightedText 
                                        text={item.external_id} 
                                        query={filterState.searchQuery} 
                                    />
                                </code>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {items?.length === 0 && (
                <EmptyState
                    icon="inbox"
                    title="No items found"
                    description="Create your first item."
                    action={{ label: 'Add Item', onClick: handleCreate }}
                />
            )}

            {items && items.length > 0 && filteredData?.length === 0 && (
                <EmptyState
                    icon="search"
                    title="No results"
                    description="Try different search terms."
                    action={{ 
                        label: 'Reset', 
                        onClick: () => setFilterState({ searchQuery: '' }) 
                    }}
                />
            )}
        </div>
    );
}
```

---

## ⚡ Performance Tips

1. **Use memoization** - `useFilteredData` already does this
2. **Keep fuzzySearch disabled** unless you need typo tolerance
3. **Set minSearchLength** for large datasets (e.g., `minSearchLength: 2`)
4. **Filter parent context first** before applying search

---

## 🎯 Best Practices

✅ **DO:**
- Use `HighlightedText` for all searchable fields
- Provide clear placeholder text
- Show both total and matched counts
- Add empty states for no data AND no results
- Keep search fields relevant (name, ID, UUID)

❌ **DON'T:**
- Search fields with complex objects
- Enable fuzzy search without testing performance
- Forget to handle empty states
- Make search required (allow empty query)

---

## 🐛 Troubleshooting

**Nothing happens when I type:**
- Check that `filteredData` is used instead of original data
- Verify `onFilterChange` is passed correctly

**Search is too slow:**
- Disable `fuzzySearch`
- Increase `minSearchLength`
- Check dataset size (consider pagination for 1000+ items)

**Highlighting doesn't work:**
- Ensure `query` prop is passed to `HighlightedText`
- Check that field is included in `searchFields`

**TypeScript errors:**
- Verify data type matches `useFilteredData<T>` generic
- Check that `searchFields` are valid keys of your data type

---

## 📚 See Also

- [Full Implementation Guide](./SEARCH_FILTER_IMPLEMENTATION.md)
- [Filter Types Reference](../src/types/filters.ts)
- [Example: ModulesPage](../src/pages/ModulesPage.tsx)
- [Example: SubjectsPage](../src/pages/SubjectsPage.tsx)
