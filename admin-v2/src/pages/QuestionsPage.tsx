import { useState, useEffect } from 'react';
import { useQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion } from '../hooks/useQuestions';
import { useLectures } from '../hooks/useLectures';
import { useSubjects } from '../hooks/useSubjects';
import { useModules } from '../hooks/useModules';
import { useYears } from '../hooks/useYears';
import type { Question, QuestionInsert, QuestionOption } from '../types/database';
import './ManagementPage.css';
import './QuestionsPage.css';

export default function QuestionsPage() {
    const { data: questions, isLoading, error } = useQuestions();
    const { data: lectures } = useLectures();
    const { data: subjects } = useSubjects();
    const { data: modules } = useModules();
    const { data: years } = useYears();

    const createQuestion = useCreateQuestion();
    const updateQuestion = useUpdateQuestion();
    const deleteQuestion = useDeleteQuestion();

    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    function handleCreate() {
        setEditingQuestion(null);
        setShowModal(true);
    }

    function handleEdit(question: Question) {
        setEditingQuestion(question);
        setShowModal(true);
    }

    async function handleSave(data: QuestionInsert) {
        try {
            if (editingQuestion) {
                await updateQuestion.mutateAsync({ id: editingQuestion.id, updates: data });
            } else {
                await createQuestion.mutateAsync(data);
            }
            setShowModal(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save question');
        }
    }

    async function handleDelete(id: string) {
        if (deleteConfirm !== id) {
            setDeleteConfirm(id);
            return;
        }

        try {
            await deleteQuestion.mutateAsync(id);
            setDeleteConfirm(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete question');
        }
    }

    if (isLoading) return <div className="loading-container"><div className="loading" /></div>;
    if (error) return <div className="error-message">Error: {error.message}</div>;

    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Questions Management</h1>
                <button className="btn btn-primary" onClick={handleCreate}>
                    + Add Question
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>External ID</th>
                            <th>Text (Preview)</th>
                            <th>Lecture</th>
                            <th>Options</th>
                            <th>Difficulty</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questions?.map(question => {
                            const lecture = lectures?.find(l => l.id === question.lecture_id);
                            return (
                                <tr key={question.id}>
                                    <td><code>{question.external_id}</code></td>
                                    <td className="question-text-preview">{question.text.substring(0, 50)}...</td>
                                    <td>{lecture?.name || 'Unknown'}</td>
                                    <td>{question.options.length} options</td>
                                    <td>Level {question.difficulty_level}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-small btn-secondary" onClick={() => handleEdit(question)}>
                                                Edit
                                            </button>
                                            <button
                                                className={`btn-small ${deleteConfirm === question.id ? 'btn-danger-confirm' : 'btn-danger'}`}
                                                onClick={() => handleDelete(question.id)}
                                            >
                                                {deleteConfirm === question.id ? 'Confirm?' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {questions?.length === 0 && (
                    <div className="empty-state">
                        <p>No questions found. Create one to get started.</p>
                    </div>
                )}
            </div>

            {showModal && (
                <QuestionFormModal
                    question={editingQuestion}
                    lectures={lectures || []}
                    subjects={subjects || []}
                    modules={modules || []}
                    years={years || []}
                    onSave={handleSave}
                    onCancel={() => setShowModal(false)}
                    isSaving={createQuestion.isPending || updateQuestion.isPending}
                />
            )}
        </div>
    );
}

interface QuestionFormModalProps {
    question: Question | null;
    lectures: Array<{ id: string; name: string; external_id: string; subject_id: string }>;
    subjects: Array<{ id: string; name: string; external_id: string; module_id: string }>;
    modules: Array<{ id: string; name: string; external_id: string; year_id: string }>;
    years: Array<{ id: string; name: string; external_id: string }>;
    onSave: (data: QuestionInsert) => void;
    onCancel: () => void;
    isSaving: boolean;
}

function QuestionFormModal({ question, lectures, subjects, modules, years, onSave, onCancel, isSaving }: QuestionFormModalProps) {
    const [text, setText] = useState(question?.text || '');

    // Path State
    const [yearId, setYearId] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [lectureId, setLectureId] = useState(question?.lecture_id || '');

    const [generatedId, setGeneratedId] = useState(question?.external_id || '');

    const [options, setOptions] = useState<QuestionOption[]>(
        question?.options || [
            { id: 1, text: '', image_url: null },
            { id: 2, text: '', image_url: null },
        ]
    );
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState(question?.correct_answer_index?.toString() || '0');
    const [explanation, setExplanation] = useState(question?.explanation || '');
    const [difficultyLevel, setDifficultyLevel] = useState(question?.difficulty_level?.toString() || '1');

    // Initialize Path if editing
    useEffect(() => {
        if (question && question.lecture_id && lectures.length > 0 && subjects.length > 0 && modules.length > 0) {
            const currentLecture = lectures.find(l => l.id === question.lecture_id);
            if (currentLecture) {
                const currentSubject = subjects.find(s => s.id === currentLecture.subject_id);
                if (currentSubject) {
                    const currentModule = modules.find(m => m.id === currentSubject.module_id);
                    if (currentModule) {
                        setSubjectId(currentSubject.id);
                        setModuleId(currentModule.id);
                        setYearId(currentModule.year_id);
                    }
                }
            }
        }
    }, [question, lectures, subjects, modules]);

    // Filtering
    const filteredModules = yearId ? modules.filter(m => m.year_id === yearId) : [];
    const filteredSubjects = moduleId ? subjects.filter(s => s.module_id === moduleId) : [];
    const filteredLectures = subjectId ? lectures.filter(l => l.subject_id === subjectId) : [];

    // Auto-generate ID (Question IDs are unique so we use a random suffix if not provided)
    useEffect(() => {
        if (question) return;

        if (lectureId) {
            const selectedLecture = lectures.find(l => l.id === lectureId);
            if (selectedLecture) {
                // For questions, we generate a unique suffix
                const uniqueSuffix = `q_${Math.random().toString(36).substring(2, 7)}`;
                setGeneratedId(`${selectedLecture.external_id}_${uniqueSuffix}`);
            }
        }
    }, [lectureId, lectures, question]);

    function addOption() {
        const newId = Math.max(...options.map(o => o.id), 0) + 1;
        setOptions([...options, { id: newId, text: '', image_url: null }]);
    }

    function removeOption(id: number) {
        if (options.length <= 2) {
            alert('Must have at least 2 options');
            return;
        }
        setOptions(options.filter(o => o.id !== id));
    }

    function updateOption(id: number, text: string) {
        setOptions(options.map(o => o.id === id ? { ...o, text } : o));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!lectureId) {
            alert('Please select a lecture');
            return;
        }

        if (options.some(o => !o.text.trim())) {
            alert('All options must have text');
            return;
        }

        const correctIdx = parseInt(correctAnswerIndex);
        if (correctIdx < 0 || correctIdx >= options.length) {
            alert('Correct answer index must be valid');
            return;
        }

        const finalId = question ? question.external_id : generatedId;

        onSave({
            external_id: finalId,
            lecture_id: lectureId,
            text,
            options,
            correct_answer_index: correctIdx,
            explanation: explanation || null,
            difficulty_level: parseInt(difficultyLevel) as 1 | 2 | 3,
        });
    }

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content question-modal" onClick={(e) => e.stopPropagation()}>
                <h2>{question ? 'Edit Question' : 'Create Question'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="cascade-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Year *</label>
                            <select
                                className="form-input"
                                value={yearId}
                                onChange={(e) => {
                                    setYearId(e.target.value);
                                    setModuleId('');
                                    setSubjectId('');
                                    setLectureId('');
                                }}
                                disabled={!!question}
                                required
                            >
                                <option value="">-- Select --</option>
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
                                    setLectureId('');
                                }}
                                disabled={!yearId || !!question}
                                required
                            >
                                <option value="">-- Select --</option>
                                {filteredModules.map(module => (
                                    <option key={module.id} value={module.id}>{module.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Subject *</label>
                            <select
                                className="form-input"
                                value={subjectId}
                                onChange={(e) => {
                                    setSubjectId(e.target.value);
                                    setLectureId('');
                                }}
                                disabled={!moduleId || !!question}
                                required
                            >
                                <option value="">-- Select --</option>
                                {filteredSubjects.map(subject => (
                                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Lecture *</label>
                            <select
                                className="form-input"
                                value={lectureId}
                                onChange={(e) => setLectureId(e.target.value)}
                                disabled={!subjectId || !!question}
                                required
                            >
                                <option value="">-- Select --</option>
                                {filteredLectures.map(lecture => (
                                    <option key={lecture.id} value={lecture.id}>{lecture.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Generated ID (Read-only)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={question ? question.external_id : generatedId}
                            disabled
                            style={{ backgroundColor: '#f1f5f9', fontFamily: 'monospace' }}
                        />
                        <small>{question ? 'ID cannot be changed after creation' : 'Auto-generated based on Lecture'}</small>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Question Text *</label>
                        <textarea
                            className="form-input"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Enter your question here..."
                            rows={3}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Options * (JSONB Format)</label>
                        <div className="options-editor">
                            {options.map((option, idx) => (
                                <div key={option.id} className="option-row">
                                    <span className="option-number">{idx + 1}.</span>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={option.text}
                                        onChange={(e) => updateOption(option.id, e.target.value)}
                                        placeholder={`Option ${idx + 1}`}
                                        required
                                    />
                                    {options.length > 2 && (
                                        <button
                                            type="button"
                                            className="btn-small btn-danger"
                                            onClick={() => removeOption(option.id)}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" className="btn btn-secondary" onClick={addOption}>
                                + Add Option
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Correct Answer Index * 🔐</label>
                        <select
                            className="form-input"
                            value={correctAnswerIndex}
                            onChange={(e) => setCorrectAnswerIndex(e.target.value)}
                            required
                        >
                            {options.map((_, idx) => (
                                <option key={idx} value={idx}>
                                    Option {idx + 1}: {options[idx].text || '(empty)'}
                                </option>
                            ))}
                        </select>
                        <small style={{ color: '#d00' }}>⚠️ Admin-only field. Never exposed to students.</small>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Explanation (optional)</label>
                        <textarea
                            className="form-input"
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            placeholder="Explain why this is the correct answer..."
                            rows={2}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Difficulty Level</label>
                        <select
                            className="form-input"
                            value={difficultyLevel}
                            onChange={(e) => setDifficultyLevel(e.target.value)}
                        >
                            <option value="1">Level 1 - Easy</option>
                            <option value="2">Level 2 - Medium</option>
                            <option value="3">Level 3 - Hard</option>
                        </select>
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
