import { useState, useEffect } from 'react';
import { useQuestionsByLecture, useUpdateQuestion, useCreateQuestion, useDeleteQuestion } from '../../hooks/useQuestions';
import { useUpdateLecture } from '../../hooks/useLectures';
import { Lecture, Question } from '../../types/database';
import { PlusIcon, TrashIcon } from '../ui/Icons';
import './LectureEditModal.css';

interface LectureEditModalProps {
    lecture: Lecture;
    onClose: () => void;
}

// Extend Question type to track new additions locally
type QuestionEdit = Question & { isNew?: boolean };

export default function LectureEditModal({ lecture, onClose }: LectureEditModalProps) {
    // Hooks
    const { data: fetchedQuestions, isLoading: isLoadingQuestions } = useQuestionsByLecture(lecture.id);
    const updateLecture = useUpdateLecture();
    const updateQuestion = useUpdateQuestion();
    const createQuestion = useCreateQuestion();
    const deleteQuestion = useDeleteQuestion();

    // Local State
    const [name, setName] = useState(lecture.name);
    const [orderIndex, setOrderIndex] = useState(lecture.order_index);
    const [questions, setQuestions] = useState<QuestionEdit[]>([]);
    const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Initialize Questions State
    useEffect(() => {
        if (fetchedQuestions) {
            // Sort by order or external_id stable sort
            const sorted = [...fetchedQuestions].sort((a, b) =>
                (a.question_order || 0) - (b.question_order || 0) || a.external_id.localeCompare(b.external_id)
            );
            setQuestions(sorted);
        }
    }, [fetchedQuestions]);

    function handleQuestionChange(id: string, field: keyof Question, value: any) {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
        // Clear error when value changes
        if (validationErrors[id]) {
            const newErrors = { ...validationErrors };
            delete newErrors[id];
            setValidationErrors(newErrors);
        }
    }

    function handleOptionChange(qId: string, optIdx: number, text: string) {
        setQuestions(prev => prev.map(q => {
            if (q.id !== qId) return q;
            const newOptions = [...q.options];
            newOptions[optIdx] = { ...newOptions[optIdx], text };
            if (q.isNew) {
                // Ensure ID uniqueness for new options if needed, though simple index mapping 1-4 is used here
                newOptions[optIdx] = { ...newOptions[optIdx], id: optIdx + 1 };
            }
            return { ...q, options: newOptions };
        }));
    }

    function handleCorrectAnswerChange(qId: string, index: number) {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, correct_answer_index: index } : q));
        // Clear error when answer is selected
        if (validationErrors[qId]) {
            const newErrors = { ...validationErrors };
            delete newErrors[qId];
            setValidationErrors(newErrors);
        }
    }

    function handleAddQuestion() {
        const nextOrder = questions.length > 0
            ? Math.max(...questions.map(q => q.question_order || 0)) + 1
            : 1;

        // Generate a temporary external ID suggestion
        const nextIdSuffix = questions.length + 1;
        const tempExternalId = `${lecture.external_id}_q${nextIdSuffix}`;

        const newQuestion: QuestionEdit = {
            id: `temp-${Date.now()}`,
            isNew: true,
            lecture_id: lecture.id,
            external_id: tempExternalId,
            text: '',
            options: [
                { id: 1, text: '' },
                { id: 2, text: '' },
                { id: 3, text: '' },
                { id: 4, text: '' }
            ],
            correct_answer_index: -1, // No default selection
            explanation: '',
            difficulty_level: 1,
            question_order: nextOrder,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        setQuestions(prev => [...prev, newQuestion]);

        // Auto-scroll and Focus for maximum comfort
        setTimeout(() => {
            const cards = document.querySelectorAll('.question-edit-card');
            const lastCard = cards[cards.length - 1];
            if (lastCard) {
                lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Focus the textarea so the user can start typing immediately
                const textarea = lastCard.querySelector('textarea');
                if (textarea) textarea.focus();
            }
        }, 150);
    }

    function handleDeleteQuestion(q: QuestionEdit) {
        if (!q.isNew) {
            setDeletedQuestionIds(prev => [...prev, q.id]);
        }
        setQuestions(prev => prev.filter(item => item.id !== q.id));

        // Remove from validation errors if exists
        if (validationErrors[q.id]) {
            const newErrors = { ...validationErrors };
            delete newErrors[q.id];
            setValidationErrors(newErrors);
        }
    }

    async function handleSave() {
        if (isSaving) return;

        // 1. Validation Logic
        const newErrors: Record<string, string> = {};
        questions.forEach((q, idx) => {
            if (q.correct_answer_index === -1) {
                newErrors[q.id] = `Please select a correct answer for question #${idx + 1}.`;
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setValidationErrors(newErrors);
            // Scroll to the first error
            const firstErrorId = Object.keys(newErrors)[0];
            const errorElement = document.getElementById(`question-${firstErrorId}`);
            if (errorElement) {
                errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setIsSaving(true);
        try {
            // 2. Delete Questions
            if (deletedQuestionIds.length > 0) {
                await Promise.all(deletedQuestionIds.map(id => deleteQuestion.mutateAsync(id)));
            }

            // 3. Update Lecture Metadata if changed
            if (name !== lecture.name || orderIndex !== lecture.order_index) {
                await updateLecture.mutateAsync({
                    id: lecture.id,
                    updates: { name, order_index: orderIndex }
                });
            }

            // 3. Process Questions (Create New vs Update Existing)
            const promises = questions.map((q, idx) => {
                if (q.isNew) {
                    // CREATE
                    return createQuestion.mutateAsync({
                        external_id: q.external_id,
                        lecture_id: lecture.id,
                        text: q.text || 'New Question',
                        options: q.options.filter(o => o.text.trim()), // Basic validation server-side usually, cleaning here
                        correct_answer_index: q.correct_answer_index,
                        explanation: q.explanation,
                        difficulty_level: q.difficulty_level,
                        question_order: q.question_order
                    });
                } else {
                    // UPDATE
                    const original = fetchedQuestions?.find(fq => fq.id === q.id);
                    // Only update if changed
                    if (original && JSON.stringify(original) !== JSON.stringify(q)) {
                        return updateQuestion.mutateAsync({
                            id: q.id,
                            updates: {
                                text: q.text,
                                options: q.options,
                                correct_answer_index: q.correct_answer_index,
                                explanation: q.explanation,
                                difficulty_level: q.difficulty_level
                            }
                        });
                    }
                }
                return Promise.resolve();
            });

            await Promise.all(promises);
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to save changes. Please ensure all new questions have valid data.');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="edit-modal-overlay">
            <div className="edit-modal-content">
                {/* Compact Header */}
                <div className="edit-modal-header">
                    <div className="header-form">
                        <div className="header-input-group" style={{ flex: 2 }}>
                            <label>Lecture Name</label>
                            <input
                                className="header-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className="header-input-group" style={{ width: '80px' }}>
                            <label>Order</label>
                            <input
                                className="header-input"
                                type="number"
                                value={orderIndex}
                                onChange={e => setOrderIndex(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="header-input-group" style={{ flex: 1 }}>
                            <label>External ID</label>
                            <input
                                className="header-input"
                                value={lecture.external_id}
                                disabled
                                style={{ background: '#f1f5f9', color: '#64748b' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="edit-modal-body">
                    {isLoadingQuestions ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading questions...</div>
                    ) : (
                        <>
                            {Object.keys(validationErrors).length > 0 && (
                                <div className="global-error-banner">
                                    <TrashIcon />
                                    <span>You have {Object.keys(validationErrors).length} issues that need attention.</span>
                                </div>
                            )}

                            {questions.map((q, idx) => (
                                <div
                                    key={q.id}
                                    id={`question-${q.id}`}
                                    className={`question-edit-card ${validationErrors[q.id] ? 'has-error' : ''}`}
                                >
                                    <div className="card-header">
                                        <span>#{idx + 1}</span>
                                        <div className="card-header-actions">
                                            <div className="difficulty-selector">
                                                <label>Difficulty</label>
                                                {[1, 2, 3].map(level => (
                                                    <button
                                                        key={level}
                                                        type="button"
                                                        className={`level-btn level-${level} ${q.difficulty_level === level ? 'active' : ''}`}
                                                        onClick={() => handleQuestionChange(q.id, 'difficulty_level', level as 1 | 2 | 3)}
                                                        title={`Difficulty Level ${level}`}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-card-delete"
                                                onClick={() => handleDeleteQuestion(q)}
                                                title="Delete Question"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="q-input-group">
                                        <label className="q-label">Question Text</label>
                                        <textarea
                                            className="q-textarea"
                                            value={q.text}
                                            onChange={e => handleQuestionChange(q.id, 'text', e.target.value)}
                                            placeholder="Enter question text..."
                                        />
                                    </div>

                                    <div className="q-input-group">
                                        <label className="q-label">Options (Select radio to set correct answer)</label>
                                        <div className="edit-options-grid">
                                            {q.options.map((opt, optIdx) => (
                                                <div
                                                    key={optIdx}
                                                    className={`edit-option-row ${q.correct_answer_index === optIdx ? 'correct' : ''}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`correct-${q.id}`}
                                                        checked={q.correct_answer_index === optIdx}
                                                        onChange={() => handleCorrectAnswerChange(q.id, optIdx)}
                                                        className="correct-radio"
                                                    />
                                                    <input
                                                        className="option-input"
                                                        value={opt.text}
                                                        onChange={e => handleOptionChange(q.id, optIdx, e.target.value)}
                                                        placeholder={`Option ${optIdx + 1}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        {validationErrors[q.id] && (
                                            <div className="error-text">
                                                <span>⚠️</span> {validationErrors[q.id]}
                                            </div>
                                        )}
                                    </div>

                                    <div className="q-input-group">
                                        <label className="q-label">Explanation</label>
                                        <textarea
                                            className="q-textarea"
                                            value={q.explanation || ''}
                                            onChange={e => handleQuestionChange(q.id, 'explanation', e.target.value)}
                                            placeholder="Explain why the answer is correct..."
                                            style={{ minHeight: '40px' }}
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Add Question Button */}
                            <button
                                className="btn-add-question"
                                onClick={handleAddQuestion}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    border: '2px dashed #e2e8f0',
                                    borderRadius: '12px',
                                    background: 'white',
                                    color: '#64748b',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s',
                                    marginTop: '20px'
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.borderColor = '#94a3b8';
                                    e.currentTarget.style.color = '#475569';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.color = '#64748b';
                                }}
                            >
                                <PlusIcon />
                                <span>Add Question</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="edit-modal-footer">
                    <button className="btn-small btn-secondary" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </button>
                    <button className="btn-small btn-primary" onClick={handleSave} disabled={isSaving} style={{ background: '#3b82f6', color: 'white', border: 'none' }}>
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
