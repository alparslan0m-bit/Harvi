import { useState } from 'react';
import { useYears, useCreateYear, useUpdateYear, useDeleteYear, useYearChildCounts } from '../hooks/useYears';
import type { Year, YearInsert } from '../types/database';
import './ManagementPage.css';

export default function YearsPage() {
    const { data: years, isLoading, error } = useYears();
    const createYear = useCreateYear();
    const updateYear = useUpdateYear();
    const deleteYear = useDeleteYear();

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
                        {years?.map(year => (
                            <tr key={year.id}>
                                <td><code>{year.external_id}</code></td>
                                <td>{year.name}</td>
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

                {years?.length === 0 && (
                    <div className="empty-state">
                        <p>No years found. Create one to get started.</p>
                    </div>
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
