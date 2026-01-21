import { useState } from 'react';
import { useYears, useCreateYear, useUpdateYear, useDeleteYear } from '../hooks/useYears';
import { useFilteredData } from '../hooks/useFilteredData';
import type { Year, YearInsert } from '../types/database';
import SearchFilter from '../components/filters/SearchFilter';
import HighlightedText from '../components/ui/HighlightedText';
import EmptyState from '../components/ui/EmptyState';
import './ManagementPage.css';

export default function YearsPage() {
    const { data: years, isLoading, error } = useYears();
    const createYear = useCreateYear();
    const updateYear = useUpdateYear();
    const deleteYear = useDeleteYear();

    // Filter state and filtered data (with memoization)
    const {
        filterState,
        setFilterState,
        filteredData: filteredYears,
        totalCount,
        matchedCount,
    } = useFilteredData(years, {
        searchFields: ['name', 'external_id', 'id', 'icon'],
        fuzzySearch: false,
        minSearchLength: 1,
    });

    const [showModal, setShowModal] = useState(false);
    const [editingYear, setEditingYear] = useState<Year | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    function handleCreate() {
        setEditingYear(null);
        setShowModal(true);
    }

    function handleEdit(year: Year) {
        setEditingYear(year);
        setShowModal(true);
    }

    async function handleSave(data: YearInsert) {
        try {
            if (editingYear) {
                await updateYear.mutateAsync({ id: editingYear.id, updates: data });
            } else {
                await createYear.mutateAsync(data);
            }
            setShowModal(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save year');
        }
    }

    async function handleDelete(id: string) {
        if (deleteConfirm !== id) {
            setDeleteConfirm(id);
            return;
        }

        try {
            await deleteYear.mutateAsync(id);
            setDeleteConfirm(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete year');
        }
    }

    if (isLoading) return <div className="loading-container"><div className="loading" /></div>;
    if (error) return <div className="error-message">Error: {error.message}</div>;

    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Years Management</h1>
                <button className="btn btn-primary" onClick={handleCreate}>
                    + Add Year
                </button>
            </div>

            {/* Search & Filter Bar */}
            <SearchFilter
                filterState={filterState}
                onFilterChange={setFilterState}
                placeholder="Search years by name, external ID, icon, or UUID..."
                totalCount={totalCount}
                matchedCount={matchedCount}
            />

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>External ID</th>
                            <th>Name</th>
                            <th>Icon</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredYears?.map(year => (
                            <tr key={year.id}>
                                <td>
                                    <code>
                                        <HighlightedText
                                            text={year.external_id}
                                            query={filterState.searchQuery}
                                        />
                                    </code>
                                </td>
                                <td>
                                    <HighlightedText
                                        text={year.name}
                                        query={filterState.searchQuery}
                                    />
                                </td>
                                <td>{year.icon || '-'}</td>
                                <td>{new Date(year.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="btn-small btn-secondary" onClick={() => handleEdit(year)}>
                                            Edit
                                        </button>
                                        <button
                                            className={`btn-small ${deleteConfirm === year.id ? 'btn-danger-confirm' : 'btn-danger'}`}
                                            onClick={() => handleDelete(year.id)}
                                        >
                                            {deleteConfirm === year.id ? 'Confirm?' : 'Delete'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Empty States */}
                {years?.length === 0 && (
                    <EmptyState
                        icon="inbox"
                        title="No years found"
                        description="Create your first academic year to get started."
                        action={{
                            label: 'Add Year',
                            onClick: handleCreate,
                        }}
                    />
                )}

                {years && years.length > 0 && filteredYears?.length === 0 && (
                    <EmptyState
                        icon="search"
                        title="No results match your search"
                        description="Try adjusting your search terms or filters."
                        action={{
                            label: 'Reset Filters',
                            onClick: () => setFilterState({
                                searchQuery: '',
                                status: 'all',
                                minContentCount: undefined,
                            }),
                        }}
                    />
                )}
            </div>

            {showModal && (
                <YearFormModal
                    year={editingYear}
                    onSave={handleSave}
                    onCancel={() => setShowModal(false)}
                    isSaving={createYear.isPending || updateYear.isPending}
                />
            )}
        </div>
    );
}

interface YearFormModalProps {
    year: Year | null;
    onSave: (data: YearInsert) => void;
    onCancel: () => void;
    isSaving: boolean;
}

function YearFormModal({ year, onSave, onCancel, isSaving }: YearFormModalProps) {
    const [externalId, setExternalId] = useState(year?.external_id || '');
    const [name, setName] = useState(year?.name || '');
    const [icon, setIcon] = useState(year?.icon || '');

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSave({ external_id: externalId, name, icon: icon || null });
    }

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>{year ? 'Edit Year' : 'Create Year'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">External ID</label>
                        <input
                            type="text"
                            className="form-input"
                            value={externalId}
                            onChange={(e) => setExternalId(e.target.value)}
                            placeholder="year1"
                            disabled={!!year}
                            required
                        />
                        <small>Format: year1, year2, etc.</small>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Year 1"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Icon (optional)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={icon}
                            onChange={(e) => setIcon(e.target.value)}
                            placeholder="1️⃣"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
