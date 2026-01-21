import { useState, useEffect } from 'react';
import { useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject } from '../hooks/useSubjects';
import { useModules } from '../hooks/useModules';
import { useYears } from '../hooks/useYears';
import { useFilteredData } from '../hooks/useFilteredData';
import type { Subject, SubjectInsert } from '../types/database';
import { generateExternalId } from '../lib/utils';
import SearchFilter from '../components/filters/SearchFilter';
import HighlightedText from '../components/ui/HighlightedText';
import EmptyState from '../components/ui/EmptyState';
import './ManagementPage.css';

export default function SubjectsPage() {
    const { data: subjects, isLoading, error } = useSubjects();
    const { data: modules } = useModules();
    const { data: years } = useYears();
    const createSubject = useCreateSubject();
    const updateSubject = useUpdateSubject();
    const deleteSubject = useDeleteSubject();

    // Context Filter State
    const [selectedModuleId, setSelectedModuleId] = useState<string>('');

    // Pre-filter data by context
    const contextFilteredSubjects = (subjects || []).filter(subject => {
        if (!selectedModuleId) return true;
        return subject.module_id === selectedModuleId;
    });

    // Filter state and filtered data (with memoization)
    const {
        filterState,
        setFilterState,
        filteredData: filteredSubjects,
        totalCount,
        matchedCount,
    } = useFilteredData(contextFilteredSubjects, {
        searchFields: ['name', 'external_id', 'id'],
        fuzzySearch: false,
        minSearchLength: 1,
    });

    const [showModal, setShowModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    function handleCreate() {
        setEditingSubject(null);
        setShowModal(true);
    }

    function handleEdit(subject: Subject) {
        setEditingSubject(subject);
        setShowModal(true);
    }

    async function handleSave(data: SubjectInsert) {
        try {
            if (editingSubject) {
                await updateSubject.mutateAsync({ id: editingSubject.id, updates: data });
            } else {
                await createSubject.mutateAsync(data);
            }
            setShowModal(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save subject');
        }
    }

    async function handleDelete(id: string) {
        if (deleteConfirm !== id) {
            setDeleteConfirm(id);
            return;
        }

        try {
            await deleteSubject.mutateAsync(id);
            setDeleteConfirm(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete subject');
        }
    }

    if (isLoading) return <div className="loading-container"><div className="loading" /></div>;
    if (error) return <div className="error-message">Error: {error.message}</div>;

    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Subjects Management</h1>
                <button className="btn btn-primary" onClick={handleCreate}>
                    + Add Subject
                </button>
            </div>

            {/* Search & Filter Bar */}
            <SearchFilter
                filterState={filterState}
                onFilterChange={setFilterState}
                placeholder="Search subjects..."
                totalCount={totalCount}
                matchedCount={matchedCount}
            >
                <div className="search-filter__filter-item" style={{ minWidth: '200px' }}>
                    <select
                        className="search-filter__select"
                        value={selectedModuleId}
                        onChange={(e) => setSelectedModuleId(e.target.value)}
                        style={{ width: '100%', fontWeight: 500 }}
                    >
                        <option value="">All Modules</option>
                        {modules?.map(module => (
                            <option key={module.id} value={module.id}>
                                {module.name}
                            </option>
                        ))}
                    </select>
                </div>
            </SearchFilter>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>External ID</th>
                            <th>Name</th>
                            <th>Module</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSubjects?.map(subject => {
                            const module = modules?.find(m => m.id === subject.module_id);
                            return (
                                <tr key={subject.id}>
                                    <td>
                                        <code>
                                            <HighlightedText
                                                text={subject.external_id}
                                                query={filterState.searchQuery}
                                            />
                                        </code>
                                    </td>
                                    <td>
                                        <HighlightedText
                                            text={subject.name}
                                            query={filterState.searchQuery}
                                        />
                                    </td>
                                    <td>{module?.name || 'Unknown'}</td>
                                    <td>{new Date(subject.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-small btn-secondary" onClick={() => handleEdit(subject)}>
                                                Edit
                                            </button>
                                            <button
                                                className={`btn-small ${deleteConfirm === subject.id ? 'btn-danger-confirm' : 'btn-danger'}`}
                                                onClick={() => handleDelete(subject.id)}
                                            >
                                                {deleteConfirm === subject.id ? 'Confirm?' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Empty States */}
                {subjects?.length === 0 && (
                    <EmptyState
                        icon="inbox"
                        title="No subjects found"
                        description="Create your first subject to get started."
                        action={{
                            label: 'Add Subject',
                            onClick: handleCreate,
                        }}
                    />
                )}

                {subjects && subjects.length > 0 && filteredSubjects?.length === 0 && (
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
                <SubjectFormModal
                    subject={editingSubject}
                    modules={modules || []}
                    years={years || []}
                    onSave={handleSave}
                    onCancel={() => setShowModal(false)}
                    isSaving={createSubject.isPending || updateSubject.isPending}
                />
            )}
        </div>
    );
}

interface SubjectFormModalProps {
    subject: Subject | null;
    modules: Array<{ id: string; name: string; external_id: string; year_id: string }>;
    years: Array<{ id: string; name: string }>;
    onSave: (data: SubjectInsert) => void;
    onCancel: () => void;
    isSaving: boolean;
}

function SubjectFormModal({ subject, modules, years, onSave, onCancel, isSaving }: SubjectFormModalProps) {
    const [name, setName] = useState(subject?.name || '');
    const [yearId, setYearId] = useState('');
    const [moduleId, setModuleId] = useState(subject?.module_id || '');
    const [generatedId, setGeneratedId] = useState(subject?.external_id || '');

    // Initialize Year based on existing module if editing
    useEffect(() => {
        if (subject && modules.length > 0) {
            const currentModule = modules.find(m => m.id === subject.module_id);
            if (currentModule) {
                setYearId(currentModule.year_id);
            }
        }
    }, [subject, modules]);

    // Computed: Filter modules by selected year relative to the modules list
    const filteredModules = yearId
        ? modules.filter(m => m.year_id === yearId)
        : [];

    // Auto-generate ID logic
    useEffect(() => {
        if (subject) return;

        if (moduleId && name) {
            const selectedModule = modules.find(m => m.id === moduleId);
            if (selectedModule) {
                const newId = generateExternalId(selectedModule.external_id, name);
                setGeneratedId(newId);
            }
        }
    }, [moduleId, name, modules, subject]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!moduleId) {
            alert('Please select a module');
            return;
        }

        const finalId = subject ? subject.external_id : generatedId;

        onSave({ external_id: finalId, name, module_id: moduleId });
    }

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>{subject ? 'Edit Subject' : 'Create Subject'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Year *</label>
                        <select
                            className="form-input"
                            value={yearId}
                            onChange={(e) => {
                                setYearId(e.target.value);
                                setModuleId(''); // Reset module when year changes
                            }}
                            disabled={!!subject}
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
                        <label className="form-label">Module *</label>
                        <select
                            className="form-input"
                            value={moduleId}
                            onChange={(e) => setModuleId(e.target.value)}
                            required
                            disabled={!yearId || !!subject}
                        >
                            <option value="">-- Select Module --</option>
                            {filteredModules.map(module => (
                                <option key={module.id} value={module.id}>
                                    {module.name}
                                </option>
                            ))}
                        </select>
                        {!yearId && <small>Select a Year first</small>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Anatomy Part 1"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Generated ID (Read-only)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={subject ? subject.external_id : generatedId}
                            disabled
                            style={{ backgroundColor: '#f1f5f9', fontFamily: 'monospace' }}
                        />
                        <small>{subject ? 'ID cannot be changed after creation' : 'Auto-generated from Module + Name'}</small>
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
