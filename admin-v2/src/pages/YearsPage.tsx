import { useState } from 'react';
import { useYears, useCreateYear, useUpdateYear, useDeleteYear } from '../hooks/useYears';
import { useModules } from '../hooks/useModules';
import { useSubjects } from '../hooks/useSubjects';
import { useLectures } from '../hooks/useLectures';
import { useQuestions } from '../hooks/useQuestions';
import { useFilteredData } from '../hooks/useFilteredData';
import type { Year, YearInsert } from '../types/database';
import SearchFilter from '../components/filters/SearchFilter';
import HighlightedText from '../components/ui/HighlightedText';
import EmptyState from '../components/ui/EmptyState';
import './ManagementPage.css';
import { TrashIcon, EditIcon } from '../components/ui/Icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';

export default function YearsPage() {
    const { data: years, isLoading, error } = useYears();
    const createYear = useCreateYear();
    const updateYear = useUpdateYear();
    const deleteYear = useDeleteYear();
    const { data: modules } = useModules();
    const { data: subjects } = useSubjects();
    const { data: lectures } = useLectures();
    const { data: allQuestions } = useQuestions();

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
    // Delete Confirmation State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [yearToDelete, setYearToDelete] = useState<string | null>(null);

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

    function handleDeleteClick(id: string) {
        setYearToDelete(id);
        setDeleteModalOpen(true);
    }

    async function handleConfirmDelete() {
        if (!yearToDelete) return;
        try {
            await deleteYear.mutateAsync(yearToDelete);
            setDeleteModalOpen(false);
            setYearToDelete(null);
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
                            <th>Name</th>
                            <th>Icon</th>
                            <th>External ID</th>
                            <th>Questions</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredYears?.map(year => (
                            <tr key={year.id}>
                                <td>
                                    <HighlightedText
                                        text={year.name}
                                        query={filterState.searchQuery}
                                    />
                                </td>
                                <td>{year.icon || '-'}</td>
                                <td>
                                    <code>
                                        <HighlightedText
                                            text={year.external_id}
                                            query={filterState.searchQuery}
                                        />
                                    </code>
                                </td>
                                <td>{allQuestions?.filter(q => {
                                    const lecture = lectures?.find(l => l.id === q.lecture_id);
                                    if (!lecture) return false;
                                    const subject = subjects?.find(s => s.id === lecture.subject_id);
                                    if (!subject) return false;
                                    const module = modules?.find(m => m.id === subject.module_id);
                                    return module?.year_id === year.id;
                                }).length || 0}</td>
                                <td>{new Date(year.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="btn-small btn-secondary" onClick={() => handleEdit(year)}>
                                            <EditIcon />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            className="btn-small btn-danger btn-icon-only"
                                            onClick={() => handleDeleteClick(year.id)}
                                            title="Delete Year"
                                        >
                                            <TrashIcon />
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

            <ConfirmationModal
                isOpen={deleteModalOpen}
                title="Delete Year"
                message="Are you sure you want to delete this year? All associated modules, subjects, and lectures will also be deleted. This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModalOpen(false)}
                isDanger={true}
                isLoading={deleteYear.isPending}
            />
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
