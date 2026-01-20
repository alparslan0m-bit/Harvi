import { useState, useEffect } from 'react';
import { useModules, useCreateModule, useUpdateModule, useDeleteModule } from '../hooks/useModules';
import { useYears } from '../hooks/useYears';
import type { Module, ModuleInsert } from '../types/database';
import { generateExternalId } from '../lib/utils';
import './ManagementPage.css';

export default function ModulesPage() {
    const { data: modules, isLoading, error } = useModules();
    const { data: years } = useYears();
    const createModule = useCreateModule();
    const updateModule = useUpdateModule();
    const deleteModule = useDeleteModule();

    const [showModal, setShowModal] = useState(false);
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

    async function handleDelete(id: string) {
        if (deleteConfirm !== id) {
            setDeleteConfirm(id);
            return;
        }

        try {
            await deleteModule.mutateAsync(id);
            setDeleteConfirm(null);
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

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>External ID</th>
                            <th>Name</th>
                            <th>Year</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modules?.map(module => {
                            const year = years?.find(y => y.id === module.year_id);
                            return (
                                <tr key={module.id}>
                                    <td><code>{module.external_id}</code></td>
                                    <td>{module.name}</td>
                                    <td>{year?.name || 'Unknown'}</td>
                                    <td>{new Date(module.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-small btn-secondary" onClick={() => handleEdit(module)}>
                                                Edit
                                            </button>
                                            <button
                                                className={`btn-small ${deleteConfirm === module.id ? 'btn-danger-confirm' : 'btn-danger'}`}
                                                onClick={() => handleDelete(module.id)}
                                            >
                                                {deleteConfirm === module.id ? 'Confirm?' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {modules?.length === 0 && (
                    <div className="empty-state">
                        <p>No modules found. Create one to get started.</p>
                    </div>
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
