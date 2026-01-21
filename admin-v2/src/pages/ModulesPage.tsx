import { useState, useEffect } from 'react';
import { useModules, useCreateModule, useUpdateModule, useDeleteModule } from '../hooks/useModules';
import { useYears } from '../hooks/useYears';
import { useSubjects } from '../hooks/useSubjects';
import { useLectures } from '../hooks/useLectures';
import { useQuestions } from '../hooks/useQuestions';
import { useFilteredData } from '../hooks/useFilteredData';
import type { Module, ModuleInsert } from '../types/database';
import { generateExternalId } from '../lib/utils';
import SearchFilter from '../components/filters/SearchFilter';
import HighlightedText from '../components/ui/HighlightedText';
import EmptyState from '../components/ui/EmptyState';
import './ManagementPage.css';
import { TrashIcon, EditIcon } from '../components/ui/Icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';

export default function ModulesPage() {
    const { data: modules, isLoading, error } = useModules();
    const { data: years } = useYears();
    const createModule = useCreateModule();
    const updateModule = useUpdateModule();
    const deleteModule = useDeleteModule();
    const { data: subjects } = useSubjects();
    const { data: lectures } = useLectures();
    const { data: allQuestions } = useQuestions();

    // Context Filter State
    const [selectedYearId, setSelectedYearId] = useState<string>('');

    // Pre-filter data by context
    const contextFilteredModules = (modules || []).filter(module => {
        if (!selectedYearId) return true;
        return module.year_id === selectedYearId;
    });

    // Filter state and filtered data (with memoization)
    const {
        filterState,
        setFilterState,
        filteredData: filteredModules,
        totalCount,
        matchedCount,
    } = useFilteredData(contextFilteredModules, {
        searchFields: ['name', 'external_id', 'id'],
        fuzzySearch: false, // Can be enabled for typo tolerance
        minSearchLength: 1,
    });

    const [showModal, setShowModal] = useState(false);
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);

    function handleCreate() {
        setEditingModule(null);
        setShowModal(true);
    }

    function handleEdit(module: Module) {
        setEditingModule(module);
        setShowModal(true);
    }

    async function handleSave(data: ModuleInsert) {
        try {
            if (editingModule) {
                await updateModule.mutateAsync({ id: editingModule.id, updates: data });
            } else {
                await createModule.mutateAsync(data);
            }
            setShowModal(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save module');
        }
    }

    function handleDeleteClick(id: string) {
        setModuleToDelete(id);
        setDeleteModalOpen(true);
    }

    async function handleConfirmDelete() {
        if (!moduleToDelete) return;

        try {
            await deleteModule.mutateAsync(moduleToDelete);
            setDeleteModalOpen(false);
            setModuleToDelete(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete module');
        }
    }

    if (isLoading) return <div className="loading-container"><div className="loading" /></div>;
    if (error) return <div className="error-message">Error: {error.message}</div>;

    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Modules Management</h1>
                <button className="btn btn-primary" onClick={handleCreate}>
                    + Add Module
                </button>
            </div>

            {/* Search & Filter Bar */}
            <SearchFilter
                filterState={filterState}
                onFilterChange={setFilterState}
                placeholder="Search modules..."
                totalCount={totalCount}
                matchedCount={matchedCount}
            >
                <div className="search-filter__filter-item" style={{ minWidth: '200px' }}>
                    <select
                        className="search-filter__select"
                        value={selectedYearId}
                        onChange={(e) => setSelectedYearId(e.target.value)}
                        style={{ width: '100%', fontWeight: 500 }}
                    >
                        <option value="">All Years</option>
                        {years?.map(year => (
                            <option key={year.id} value={year.id}>
                                {year.name}
                            </option>
                        ))}
                    </select>
                </div>
            </SearchFilter>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Year</th>
                            <th>External ID</th>
                            <th>Questions</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredModules?.map(module => {
                            const year = years?.find(y => y.id === module.year_id);
                            return (
                                <tr key={module.id}>
                                    <td>
                                        <HighlightedText
                                            text={module.name}
                                            query={filterState.searchQuery}
                                        />
                                    </td>
                                    <td>{year?.name || 'Unknown'}</td>
                                    <td>
                                        <code>
                                            <HighlightedText
                                                text={module.external_id}
                                                query={filterState.searchQuery}
                                            />
                                        </code>
                                    </td>
                                    <td>{allQuestions?.filter(q => {
                                        const lecture = lectures?.find(l => l.id === q.lecture_id);
                                        if (!lecture) return false;
                                        const subject = subjects?.find(s => s.id === lecture.subject_id);
                                        return subject?.module_id === module.id;
                                    }).length || 0}</td>
                                    <td>{new Date(module.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-small btn-secondary" onClick={() => handleEdit(module)}>
                                                <EditIcon />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                className="btn-small btn-danger btn-icon-only"
                                                onClick={() => handleDeleteClick(module.id)}
                                                title="Delete Module"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Empty States */}
                {modules?.length === 0 && (
                    <EmptyState
                        icon="inbox"
                        title="No modules found"
                        description="Create your first module to get started."
                        action={{
                            label: 'Add Module',
                            onClick: handleCreate,
                        }}
                    />
                )}

                {modules && modules.length > 0 && filteredModules?.length === 0 && (
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
                <ModuleFormModal
                    module={editingModule}
                    years={years || []}
                    onSave={handleSave}
                    onCancel={() => setShowModal(false)}
                    isSaving={createModule.isPending || updateModule.isPending}
                />
            )}

            <ConfirmationModal
                isOpen={deleteModalOpen}
                title="Delete Module"
                message="Are you sure you want to delete this module? All subjects and lectures within it will also be deleted."
                confirmLabel="Delete"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModalOpen(false)}
                isDanger={true}
                isLoading={deleteModule.isPending}
            />
        </div>
    );
}

interface ModuleFormModalProps {
    module: Module | null;
    years: Array<{ id: string; name: string; external_id: string }>;
    onSave: (data: ModuleInsert) => void;
    onCancel: () => void;
    isSaving: boolean;
}

function ModuleFormModal({ module, years, onSave, onCancel, isSaving }: ModuleFormModalProps) {
    const [name, setName] = useState(module?.name || '');
    const [yearId, setYearId] = useState(module?.year_id || '');
    const [generatedId, setGeneratedId] = useState(module?.external_id || '');

    // Auto-generate External ID when dependencies change
    useEffect(() => {
        if (module) return; // Don't auto-update if editing existing (keeps ID stable)

        if (yearId && name) {
            const selectedYear = years.find(y => y.id === yearId);
            if (selectedYear) {
                const newId = generateExternalId(selectedYear.external_id, name);
                setGeneratedId(newId);
            }
        }
    }, [yearId, name, module, years]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!yearId) {
            alert('Please select a year');
            return;
        }

        // Final ID generation/validation
        const finalId = module ? module.external_id : generatedId;

        onSave({ external_id: finalId, name, year_id: yearId });
    }

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>{module ? 'Edit Module' : 'Create Module'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Year *</label>
                        <select
                            className="form-input"
                            value={yearId}
                            onChange={(e) => setYearId(e.target.value)}
                            required
                            disabled={!!module} // Lock parent on edit to prevent orphaned IDs
                        >
                            <option value="">-- Select Year --</option>
                            {years.map(year => (
                                <option key={year.id} value={year.id}>
                                    {year.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Molecular Biology"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Generated ID (Read-only)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={module ? module.external_id : generatedId}
                            disabled
                            style={{ backgroundColor: '#f1f5f9', fontFamily: 'monospace' }}
                        />
                        <small>{module ? 'ID cannot be changed after creation' : 'Auto-generated from Year + Name'}</small>
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
