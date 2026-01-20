import { useState, useEffect } from 'react';
import { useLectures, useCreateLecture, useUpdateLecture, useDeleteLecture } from '../hooks/useLectures';
import { useSubjects } from '../hooks/useSubjects';
import { useModules } from '../hooks/useModules';
import { useYears } from '../hooks/useYears';
import type { Lecture, LectureInsert } from '../types/database';
import { generateExternalId } from '../lib/utils';
import './ManagementPage.css';

export default function LecturesPage() {
    const { data: lectures, isLoading, error } = useLectures();
    const { data: subjects } = useSubjects();
    const { data: modules } = useModules();
    const { data: years } = useYears();
    const createLecture = useCreateLecture();
    const updateLecture = useUpdateLecture();
    const deleteLecture = useDeleteLecture();

    const [showModal, setShowModal] = useState(false);
    const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    function handleCreate() {
        setEditingLecture(null);
        setShowModal(true);
    }

    function handleEdit(lecture: Lecture) {
        setEditingLecture(lecture);
        setShowModal(true);
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

    async function handleDelete(id: string) {
        if (deleteConfirm !== id) {
            setDeleteConfirm(id);
            return;
        }

        try {
            await deleteLecture.mutateAsync(id);
            setDeleteConfirm(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete lecture');
        }
    }

    if (isLoading) return <div className="loading-container"><div className="loading" /></div>;
    if (error) return <div className="error-message">Error: {error.message}</div>;

    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Lectures Management</h1>
                <button className="btn btn-primary" onClick={handleCreate}>
                    + Add Lecture
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>External ID</th>
                            <th>Name</th>
                            <th>Subject</th>
                            <th>Order</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lectures?.map(lecture => {
                            const subject = subjects?.find(s => s.id === lecture.subject_id);
                            return (
                                <tr key={lecture.id}>
                                    <td><code>{lecture.external_id}</code></td>
                                    <td>{lecture.name}</td>
                                    <td>{subject?.name || <em>Orphaned</em>}</td>
                                    <td>{lecture.order_index}</td>
                                    <td>{new Date(lecture.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-small btn-secondary" onClick={() => handleEdit(lecture)}>
                                                Edit
                                            </button>
                                            <button
                                                className={`btn-small ${deleteConfirm === lecture.id ? 'btn-danger-confirm' : 'btn-danger'}`}
                                                onClick={() => handleDelete(lecture.id)}
                                            >
                                                {deleteConfirm === lecture.id ? 'Confirm?' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {lectures?.length === 0 && (
                    <div className="empty-state">
                        <p>No lectures found. Create one to get started.</p>
                    </div>
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
