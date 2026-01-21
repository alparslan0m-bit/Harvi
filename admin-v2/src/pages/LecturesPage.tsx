import { useState, useEffect } from 'react';
import { useLectures, useCreateLecture, useUpdateLecture, useDeleteLecture, useDeleteLectures } from '../hooks/useLectures';
import { useQuestions } from '../hooks/useQuestions';
import { useSubjects } from '../hooks/useSubjects';
import { useModules } from '../hooks/useModules';
import { useYears } from '../hooks/useYears';
import { useFilteredData } from '../hooks/useFilteredData';
import type { Lecture, LectureInsert } from '../types/database';
import { generateExternalId } from '../lib/utils';
import SearchFilter from '../components/filters/SearchFilter';
import HighlightedText from '../components/ui/HighlightedText';
import EmptyState from '../components/ui/EmptyState';
import './ManagementPage.css';
import { TrashIcon, EditIcon, EyeIcon } from '../components/ui/Icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import LectureReviewModal from '../components/modals/LectureReviewModal';
import LectureEditModal from '../components/modals/LectureEditModal';

export default function LecturesPage() {
    const { data: lectures, isLoading, error } = useLectures();
    const { data: subjects } = useSubjects();
    const { data: modules } = useModules();
    const { data: years } = useYears();
    const createLecture = useCreateLecture();
    const updateLecture = useUpdateLecture();
    const deleteLecture = useDeleteLecture();
    const deleteLectures = useDeleteLectures();
    const { data: allQuestions } = useQuestions();

    // Context Filter State
    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [selectedModuleId, setSelectedModuleId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

    // Pre-filter data by context
    const contextFilteredLectures = (lectures || []).filter(lecture => {
        if (selectedSubjectId) return lecture.subject_id === selectedSubjectId;

        const subject = subjects?.find(s => s.id === lecture.subject_id);
        if (selectedModuleId) return subject?.module_id === selectedModuleId;

        const module = modules?.find(m => m.id === subject?.module_id);
        if (selectedYearId) return module?.year_id === selectedYearId;

        return true;
    });

    // Sub-filtering for cascading UI
    const filteredModulesForFilter = selectedYearId
        ? (modules || []).filter(m => m.year_id === selectedYearId)
        : [];

    const filteredSubjectsForFilter = selectedModuleId
        ? (subjects || []).filter(s => s.module_id === selectedModuleId)
        : [];

    // Detect Orphans (No Subject or Subject ID not found in list)
    const orphans = lectures?.filter(l => {
        if (!l.subject_id) return true;
        return !subjects?.some(s => s.id === l.subject_id);
    }) || [];

    // Filter state and filtered data (with memoization)
    const {
        filterState,
        setFilterState,
        filteredData: filteredLectures,
        totalCount,
        matchedCount,
    } = useFilteredData(contextFilteredLectures, {
        searchFields: ['name', 'external_id', 'id'],
        fuzzySearch: false,
        minSearchLength: 1,
    });

    const [showModal, setShowModal] = useState(false); // For Create
    const [editModalOpen, setEditModalOpen] = useState(false); // For Edit (New Modal)
    const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [lectureToDelete, setLectureToDelete] = useState<string | null>(null);
    const [reviewLecture, setReviewLecture] = useState<Lecture | null>(null);

    function handleCreate() {
        setEditingLecture(null);
        setShowModal(true);
    }

    function handleEdit(lecture: Lecture) {
        setEditingLecture(lecture);
        setEditModalOpen(true);
    }

    function handleReview(lecture: Lecture) {
        setReviewLecture(lecture);
    }

    async function handleSave(data: LectureInsert) {
        try {
            if (editingLecture) {
                await updateLecture.mutateAsync({ id: editingLecture.id, updates: data });
            } else {
                await createLecture.mutateAsync(data);
            }
            setShowModal(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save lecture');
        }
    }

    function handleDeleteClick(id: string) {
        setLectureToDelete(id);
        setDeleteModalOpen(true);
    }

    async function handleConfirmDelete() {
        if (!lectureToDelete) return;
        try {
            await deleteLecture.mutateAsync(lectureToDelete);
            setDeleteModalOpen(false);
            setLectureToDelete(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete lecture');
        }
    }

    async function handleCleanupOrphans() {
        if (!orphans.length) return;
        if (!confirm(`Found ${orphans.length} orphaned lectures. This will effectively delete them and their questions. Continue?`)) return;

        try {
            await deleteLectures.mutateAsync(orphans.map(l => l.id));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to cleanup orphans');
        }
    }

    if (isLoading) return <div className="loading-container"><div className="loading" /></div>;
    if (error) return <div className="error-message">Error: {error.message}</div>;

    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Lectures Management</h1>
                <div className="header-actions">
                    {orphans.length > 0 && (
                        <button className="btn btn-warning" onClick={handleCleanupOrphans} style={{ marginRight: '10px', backgroundColor: '#f59e0b', color: 'white' }}>
                            ⚠️ Cleanup {orphans.length} Orphans
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={handleCreate}>
                        + Add Lecture
                    </button>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <SearchFilter
                filterState={filterState}
                onFilterChange={setFilterState}
                placeholder="Search lectures..."
                totalCount={totalCount}
                matchedCount={matchedCount}
            >
                <div className="search-filter__filter-item" style={{ minWidth: '150px' }}>
                    <select
                        className="search-filter__select"
                        value={selectedYearId}
                        onChange={(e) => {
                            setSelectedYearId(e.target.value);
                            setSelectedModuleId('');
                            setSelectedSubjectId('');
                        }}
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
                <div className="search-filter__filter-item" style={{ minWidth: '180px' }}>
                    <select
                        className="search-filter__select"
                        value={selectedModuleId}
                        onChange={(e) => {
                            setSelectedModuleId(e.target.value);
                            setSelectedSubjectId('');
                        }}
                        style={{ width: '100%', fontWeight: 500 }}
                        disabled={!selectedYearId}
                    >
                        <option value="">{selectedYearId ? 'All Modules' : 'Select Year First'}</option>
                        {filteredModulesForFilter.map(module => (
                            <option key={module.id} value={module.id}>
                                {module.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="search-filter__filter-item" style={{ minWidth: '200px' }}>
                    <select
                        className="search-filter__select"
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        style={{ width: '100%', fontWeight: 500 }}
                        disabled={!selectedModuleId}
                    >
                        <option value="">{selectedModuleId ? 'All Subjects' : 'Select Module First'}</option>
                        {filteredSubjectsForFilter.map(subject => (
                            <option key={subject.id} value={subject.id}>
                                {subject.name}
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
                            <th>Subject</th>
                            <th>External ID</th>
                            <th>Order</th>
                            <th>Questions</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLectures?.map(lecture => {
                            const subject = subjects?.find(s => s.id === lecture.subject_id);
                            return (
                                <tr key={lecture.id}>
                                    <td>
                                        <HighlightedText
                                            text={lecture.name}
                                            query={filterState.searchQuery}
                                        />
                                    </td>
                                    <td>{subject?.name || <em>Orphaned</em>}</td>
                                    <td>
                                        <code>
                                            <HighlightedText
                                                text={lecture.external_id}
                                                query={filterState.searchQuery}
                                            />
                                        </code>
                                    </td>
                                    <td>{lecture.order_index}</td>
                                    <td>{allQuestions?.filter(q => q.lecture_id === lecture.id).length || 0}</td>
                                    <td>{new Date(lecture.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-small btn-secondary" onClick={() => handleReview(lecture)} title="Review Questions">
                                                <EyeIcon />
                                                <span>Review</span>
                                            </button>
                                            <button className="btn-small btn-secondary" onClick={() => handleEdit(lecture)}>
                                                <EditIcon />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                className="btn-small btn-danger btn-icon-only"
                                                onClick={() => handleDeleteClick(lecture.id)}
                                                title="Delete Lecture"
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
                {lectures?.length === 0 && (
                    <EmptyState
                        icon="inbox"
                        title="No lectures found"
                        description="Create your first lecture to get started."
                        action={{
                            label: 'Add Lecture',
                            onClick: handleCreate,
                        }}
                    />
                )}

                {lectures && lectures.length > 0 && filteredLectures?.length === 0 && (
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
                <LectureFormModal
                    lecture={editingLecture}
                    subjects={subjects || []}
                    modules={modules || []}
                    years={years || []}
                    onSave={handleSave}
                    onCancel={() => setShowModal(false)}
                    isSaving={createLecture.isPending || updateLecture.isPending}
                />
            )}

            <ConfirmationModal
                isOpen={deleteModalOpen}
                title="Delete Lecture"
                message="Are you sure you want to delete this lecture? All questions associated with it will also be deleted."
                confirmLabel="Delete"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModalOpen(false)}
                isDanger={true}
                isLoading={deleteLecture.isPending}
            />

            {reviewLecture && (
                <LectureReviewModal
                    lecture={reviewLecture}
                    onClose={() => setReviewLecture(null)}
                />
            )}

            {editModalOpen && editingLecture && (
                <LectureEditModal
                    lecture={editingLecture}
                    onClose={() => {
                        setEditModalOpen(false);
                        setEditingLecture(null);
                    }}
                />
            )}
        </div>
    );
}

interface LectureFormModalProps {
    lecture: Lecture | null;
    subjects: Array<{ id: string; name: string; external_id: string; module_id: string }>;
    modules: Array<{ id: string; name: string; external_id: string; year_id: string }>;
    years: Array<{ id: string; name: string; external_id: string }>;
    onSave: (data: LectureInsert) => void;
    onCancel: () => void;
    isSaving: boolean;
}

function LectureFormModal({ lecture, subjects, modules, years, onSave, onCancel, isSaving }: LectureFormModalProps) {
    const [name, setName] = useState(lecture?.name || '');
    const [orderIndex, setOrderIndex] = useState(lecture?.order_index?.toString() || '0');

    // Path State
    const [yearId, setYearId] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [subjectId, setSubjectId] = useState(lecture?.subject_id || '');

    const [generatedId, setGeneratedId] = useState(lecture?.external_id || '');

    // Initialize Path if editing
    useEffect(() => {
        if (lecture && lecture.subject_id && subjects.length > 0 && modules.length > 0) {
            const currentSubject = subjects.find(s => s.id === lecture.subject_id);
            if (currentSubject) {
                const currentModule = modules.find(m => m.id === currentSubject.module_id);
                if (currentModule) {
                    setModuleId(currentModule.id);
                    setYearId(currentModule.year_id);
                }
            }
        }
    }, [lecture, subjects, modules]);

    // Filtering
    const filteredModules = yearId ? modules.filter(m => m.year_id === yearId) : [];
    const filteredSubjects = moduleId ? subjects.filter(s => s.module_id === moduleId) : [];

    // Auto-generate ID
    useEffect(() => {
        if (lecture) return;

        if (subjectId && name) {
            const selectedSubject = subjects.find(s => s.id === subjectId);
            if (selectedSubject) {
                const newId = generateExternalId(selectedSubject.external_id, name);
                setGeneratedId(newId);
            }
        }
    }, [subjectId, name, subjects, lecture]);


    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const finalId = lecture ? lecture.external_id : generatedId;

        onSave({
            external_id: finalId,
            name,
            subject_id: subjectId || null,
            order_index: parseInt(orderIndex) || 0,
        });
    }

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>{lecture ? 'Edit Lecture' : 'Create Lecture'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Year *</label>
                        <select
                            className="form-input"
                            value={yearId}
                            onChange={(e) => {
                                setYearId(e.target.value);
                                setModuleId('');
                                setSubjectId('');
                            }}
                            disabled={!!lecture}
                            required
                        >
                            <option value="">-- Select Year --</option>
                            {years.map(year => (
                                <option key={year.id} value={year.id}>{year.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Module *</label>
                        <select
                            className="form-input"
                            value={moduleId}
                            onChange={(e) => {
                                setModuleId(e.target.value);
                                setSubjectId('');
                            }}
                            disabled={!yearId || !!lecture}
                            required
                        >
                            <option value="">-- Select Module --</option>
                            {filteredModules.map(module => (
                                <option key={module.id} value={module.id}>{module.name}</option>
                            ))}
                        </select>
                        {!yearId && <small>Select a Year first</small>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Subject</label>
                        <select
                            className="form-input"
                            value={subjectId}
                            onChange={(e) => setSubjectId(e.target.value)}
                            disabled={!moduleId || !!lecture}
                        >
                            <option value="">-- No Subject (Orphaned) --</option>
                            {filteredSubjects.map(subject => (
                                <option key={subject.id} value={subject.id}>
                                    {subject.name}
                                </option>
                            ))}
                        </select>
                        {!moduleId && <small>Select a Module first</small>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Introduction to ECG"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Generated ID (Read-only)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={lecture ? lecture.external_id : generatedId}
                            disabled
                            style={{ backgroundColor: '#f1f5f9', fontFamily: 'monospace' }}
                        />
                        <small>{lecture ? 'ID cannot be changed after creation' : 'Auto-generated from Subject + Name'}</small>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Order Index</label>
                        <input
                            type="number"
                            className="form-input"
                            value={orderIndex}
                            onChange={(e) => setOrderIndex(e.target.value)}
                            placeholder="0"
                            min="0"
                        />
                        <small>Sort order within the subject</small>
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
