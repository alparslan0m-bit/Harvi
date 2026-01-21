import { useState, useEffect } from 'react';
import { Question, QuestionInsert, QuestionOption, Lecture, Subject, Module, Year } from '../../types/database';
import { TrashIcon, PlusIcon } from '../ui/Icons';
import './SingleQuestionEditModal.css';

interface SingleQuestionEditModalProps {
    question: Question | null;
    lectures: Lecture[];
    subjects: Subject[];
    modules: Module[];
    years: Year[];
    onSave: (data: QuestionInsert) => void;
    onCancel: () => void;
    isSaving: boolean;
}

export default function SingleQuestionEditModal({
    question,
    lectures,
    subjects,
    modules,
    years,
    onSave,
    onCancel,
    isSaving
}: SingleQuestionEditModalProps) {
    // Basic Metadata
    const [text, setText] = useState(question?.text || '');
    const [explanation, setExplanation] = useState(question?.explanation || '');
    const [difficultyLevel, setDifficultyLevel] = useState<1 | 2 | 3>((question?.difficulty_level as 1 | 2 | 3) || 1);
    const [generatedId, setGeneratedId] = useState(question?.external_id || '');

    // Simplified Selection State
    const [lectureId, setLectureId] = useState(question?.lecture_id || '');
    const [lectureSearch, setLectureSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // To handle clicking outside the suggestions
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.suggestions-container')) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Options State
    const [options, setOptions] = useState<QuestionOption[]>(
        question?.options || [
            { id: 1, text: '', image_url: null },
            { id: 2, text: '', image_url: null },
            { id: 3, text: '', image_url: null },
            { id: 4, text: '', image_url: null },
        ]
    );
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState(question?.correct_answer_index ?? -1);
    const [errors, setErrors] = useState<{ text?: string; options?: string; correct?: string }>({});

    // Initialize Search if editing
    useEffect(() => {
        if (question && question.lecture_id && lectures.length > 0) {
            const currentLecture = lectures.find(l => l.id === question.lecture_id);
            if (currentLecture) {
                setLectureSearch(currentLecture.name);
            }
        }
    }, [question, lectures]);

    // Filtering logic for the Fast Method
    const matchingLectures = lectures.filter(l => {
        return l.name.toLowerCase().includes(lectureSearch.toLowerCase()) ||
            l.external_id.toLowerCase().includes(lectureSearch.toLowerCase());
    }).slice(0, 50);

    const getLecturePath = (lecture: Lecture) => {
        const subject = subjects.find(s => s.id === lecture.subject_id);
        const module = modules.find(m => m.id === subject?.module_id);
        const year = years.find(y => y.id === module?.year_id);
        return `${year?.icon || ''} ${year?.name || ''} › ${module?.name || ''} › ${subject?.name || ''}`;
    };

    const handleSelectLecture = (l: Lecture) => {
        setLectureId(l.id);
        setLectureSearch(l.name);
        setShowSuggestions(false);
    };

    // Auto-generate ID logic
    useEffect(() => {
        if (question) return;
        if (lectureId) {
            const selectedLecture = lectures.find(l => l.id === lectureId);
            if (selectedLecture) {
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
            alert('A question must have at least 2 options');
            return;
        }
        setOptions(options.filter(o => o.id !== id));
    }

    function updateOption(id: number, val: string) {
        setOptions(options.map(o => o.id === id ? { ...o, text: val } : o));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const newErrors: typeof errors = {};

        if (!lectureId) return alert('Please select a lecture');
        if (!text.trim()) newErrors.text = 'Question text is required';
        if (options.some(o => !o.text.trim())) newErrors.options = 'All options must have text';
        if (correctAnswerIndex === -1) newErrors.correct = 'Please select the correct answer';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            // Scroll to the error card if it's the first one
            const card = document.querySelector('.question-form-card.has-error');
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setErrors({});
        onSave({
            external_id: question ? question.external_id : generatedId,
            lecture_id: lectureId,
            text,
            options,
            correct_answer_index: correctAnswerIndex,
            explanation: explanation || null,
            difficulty_level: difficultyLevel,
        });
    }

    return (
        <div className="single-question-modal-overlay" onClick={onCancel}>
            <div className="single-question-modal-content" onClick={e => e.stopPropagation()}>
                <div className="single-question-modal-header">
                    <h2>{question ? 'Edit Question' : 'Create New Question'}</h2>
                    <button className="btn-small" onClick={onCancel} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                <div className="single-question-modal-body">
                    <form id="premium-question-form" onSubmit={handleSubmit}>
                        {/* Fast Method Only */}
                        {!question && (
                            <div className="cascade-section">
                                <div className="input-group-premium">
                                    <label className="form-label-premium">Lecture (Start typing to find fast...)</label>
                                    <div className="suggestions-container">
                                        <input
                                            type="text"
                                            className="form-input-premium"
                                            value={lectureSearch}
                                            onChange={e => {
                                                setLectureSearch(e.target.value);
                                                setLectureId(''); // Clear selection on type
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            placeholder="Type lecture name or ID..."
                                            required
                                        />
                                        {showSuggestions && lectureSearch.trim().length > 0 && (
                                            <div className="suggestions-list">
                                                {matchingLectures.length > 0 ? (
                                                    matchingLectures.map(l => (
                                                        <div
                                                            key={l.id}
                                                            className={`suggestion-item ${lectureId === l.id ? 'selected' : ''}`}
                                                            onClick={() => handleSelectLecture(l)}
                                                        >
                                                            <span className="lecture-name">{l.name}</span>
                                                            <span className="lecture-path">{getLecturePath(l)}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="no-results">No lectures found matching "{lectureSearch}"</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {!lectureId && lectureSearch && matchingLectures.length > 0 && (
                                        <small style={{ color: '#6366f1', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                                            ⚠️ Please select a lecture from the list above
                                        </small>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={`question-form-card ${Object.keys(errors).length > 0 ? 'has-error' : ''}`}>
                            <div className="card-header" style={{ border: 'none', marginBottom: '20px', paddingBottom: 0 }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748b' }}>Question Content</span>
                                <div className="difficulty-selector">
                                    <label>Difficulty</label>
                                    {[1, 2, 3].map(level => (
                                        <button
                                            key={level}
                                            type="button"
                                            className={`level-btn level-${level} ${difficultyLevel === level ? 'active' : ''}`}
                                            onClick={() => {
                                                setDifficultyLevel(level as 1 | 2 | 3);
                                                if (errors.text) setErrors({ ...errors, text: undefined });
                                            }}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="q-input-group">
                                <label className="form-label-premium">Question Text</label>
                                <textarea
                                    className={`form-input-premium premium-textarea ${errors.text ? 'is-invalid' : ''}`}
                                    value={text}
                                    onChange={e => {
                                        setText(e.target.value);
                                        if (errors.text) setErrors({ ...errors, text: undefined });
                                    }}
                                    placeholder="Enter question text..."
                                    required
                                />
                                {errors.text && <span className="error-text">{errors.text}</span>}
                            </div>

                            <div className="q-input-group">
                                <label className="form-label-premium">Options (Select radio for correct answer)</label>
                                <div className="edit-options-grid" style={{ display: 'grid', gap: '12px' }}>
                                    {options.map((opt, idx) => (
                                        <div key={opt.id} className={`edit-option-row ${correctAnswerIndex === idx ? 'correct-option-premium' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: errors.options && !opt.text.trim() ? '1px solid #ef4444' : '1px solid #e2e8f0' }}>
                                            <input
                                                type="radio"
                                                name="correct-answer"
                                                checked={correctAnswerIndex === idx}
                                                onChange={() => {
                                                    setCorrectAnswerIndex(idx);
                                                    if (errors.correct) setErrors({ ...errors, correct: undefined });
                                                }}
                                                className="correct-radio"
                                                style={{ accentColor: '#22c55e', width: '20px', height: '20px', cursor: 'pointer' }}
                                            />
                                            <input
                                                className="option-input"
                                                value={opt.text}
                                                onChange={e => {
                                                    updateOption(opt.id, e.target.value);
                                                    if (errors.options) setErrors({ ...errors, options: undefined });
                                                }}
                                                placeholder={`Option ${idx + 1}`}
                                                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', fontWeight: 500 }}
                                                required
                                            />
                                            {options.length > 2 && (
                                                <button type="button" onClick={() => removeOption(opt.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {errors.options && <span className="error-text">{errors.options}</span>}
                                    {errors.correct && <span className="error-text">{errors.correct}</span>}
                                    <button type="button" className="btn-add-question" onClick={addOption} style={{ padding: '12px !important', fontSize: '14px !important', marginTop: '8px' }}>
                                        <PlusIcon /> Add Option
                                    </button>
                                </div>
                            </div>

                            <div className="q-input-group" style={{ marginTop: '24px' }}>
                                <label className="form-label-premium">Explanation</label>
                                <textarea
                                    className="form-input-premium"
                                    value={explanation}
                                    onChange={e => setExplanation(e.target.value)}
                                    placeholder="Why is this answer correct?"
                                    style={{ minHeight: '80px' }}
                                />
                            </div>
                        </div>

                        {/* ID Preview (Only if Creating New) */}
                        {!question && generatedId && (
                            <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: '12px', border: '1px dashed #cbd5e1', marginBottom: '24px' }}>
                                <label className="form-label-premium" style={{ marginBottom: '4px' }}>Auto-Generated ID</label>
                                <code style={{ color: '#64748b', fontSize: '12px' }}>{generatedId}</code>
                            </div>
                        )}
                    </form>
                </div>

                <div className="single-question-modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>
                        Cancel
                    </button>
                    <button type="submit" form="premium-question-form" className="btn btn-primary" disabled={isSaving} style={{ background: '#6366f1', color: 'white', border: 'none' }}>
                        {isSaving ? 'Saving...' : 'Save Question'}
                    </button>
                </div>
            </div>
        </div>
    );
}
