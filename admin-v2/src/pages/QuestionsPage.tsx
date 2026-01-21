import { useState } from 'react';
import { useQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion } from '../hooks/useQuestions';
import { useLectures } from '../hooks/useLectures';
import { useSubjects } from '../hooks/useSubjects';
import { useModules } from '../hooks/useModules';
import { useYears } from '../hooks/useYears';
import { useFilteredData } from '../hooks/useFilteredData';
import type { Question, QuestionInsert, Lecture } from '../types/database';
import SearchFilter from '../components/filters/SearchFilter';
import HighlightedText from '../components/ui/HighlightedText';
import EmptyState from '../components/ui/EmptyState';
import './ManagementPage.css';
import { TrashIcon, EditIcon } from '../components/ui/Icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import SingleQuestionEditModal from '../components/modals/SingleQuestionEditModal';
import './QuestionsPage.css';
import { useEffect } from 'react';

export default function QuestionsPage() {
    const { data: questions, isLoading, error } = useQuestions();
    const { data: lectures } = useLectures();
    const { data: subjects } = useSubjects();
    const { data: modules } = useModules();
    const { data: years } = useYears();

    const createQuestion = useCreateQuestion();
    const updateQuestion = useUpdateQuestion();
    const deleteQuestion = useDeleteQuestion();

    // Context Filter State
    const [selectedLectureId, setSelectedLectureId] = useState<string>('');
    const [lectureSearch, setLectureSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filter lectures for search
    const matchingLectures = (lectures || []).filter(l => {
        return l.name.toLowerCase().includes(lectureSearch.toLowerCase()) ||
            l.external_id.toLowerCase().includes(lectureSearch.toLowerCase());
    }).slice(0, 30);

    const getLecturePath = (lecture: Lecture) => {
        const subject = subjects?.find(s => s.id === lecture.subject_id);
        const module = modules?.find(m => m.id === subject?.module_id);
        const year = years?.find(y => y.id === module?.year_id);
        return `${year?.icon || ''} ${year?.name || ''} › ${module?.name || ''} › ${subject?.name || ''}`;
    };

    const handleSelectLecture = (l: Lecture | null) => {
        if (!l) {
            setSelectedLectureId('');
            setLectureSearch('');
        } else {
            setSelectedLectureId(l.id);
            setLectureSearch(l.name);
        }
        setShowSuggestions(false);
    };

    // Close suggestions on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.suggestions-container')) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Pre-filter data by context
    const contextFilteredQuestions = (questions || []).filter(question => {
        if (!selectedLectureId) return true;
        return question.lecture_id === selectedLectureId;
    });

    // Filter state and filtered data (with memoization)
    const {
        filterState,
        setFilterState,
        filteredData: filteredQuestions,
        totalCount,
        matchedCount,
    } = useFilteredData(contextFilteredQuestions, {
        searchFields: ['text', 'external_id', 'id'],
        fuzzySearch: false,
        minSearchLength: 1,
    });

    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

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

    function handleDeleteClick(id: string) {
        setQuestionToDelete(id);
        setDeleteModalOpen(true);
    }

    async function handleConfirmDelete() {
        if (!questionToDelete) return;

        try {
            await deleteQuestion.mutateAsync(questionToDelete);
            setDeleteModalOpen(false);
            setQuestionToDelete(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete question');
        }
    }

    if (isLoading) return <div className="loading-container"><div className="loading" /></div>;
    if (error) return <div className="error-message">Error: {error.message}</div>;

    // Group lectures by subject for the dropdown
    const lecturesBySubject = (lectures || []).reduce((acc, lecture) => {
        const subjectName = subjects?.find(s => s.id === lecture.subject_id)?.name || 'Other';
        if (!acc[subjectName]) acc[subjectName] = [];
        acc[subjectName].push(lecture);
        return acc;
    }, {} as Record<string, Lecture[]>);

    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Questions Management</h1>
                <button className="btn btn-primary" onClick={handleCreate}>
                    + Add Question
                </button>
            </div>

            {/* Search & Filter Bar */}
            <SearchFilter
                filterState={filterState}
                onFilterChange={setFilterState}
                placeholder="Search questions..."
                totalCount={totalCount}
                matchedCount={matchedCount}
            >
                <div className="search-filter__filter-item" style={{ minWidth: '350px' }}>
                    <div className="suggestions-container" style={{ width: '100%' }}>
                        <div className="search-input-wrapper" style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="search-filter__select"
                                value={lectureSearch}
                                onChange={e => {
                                    setLectureSearch(e.target.value);
                                    if (selectedLectureId) setSelectedLectureId(''); // Clear selection on type
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder="Search all lectures..."
                                style={{ width: '100%', cursor: 'text' }}
                            />
                            {lectureSearch && (
                                <button
                                    className="search-filter__clear-btn"
                                    style={{ right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                                    onClick={() => handleSelectLecture(null)}
                                >
                                    &times;
                                </button>
                            )}
                        </div>

                        {showSuggestions && lectureSearch.trim().length > 0 && (
                            <div className="suggestions-list" style={{ marginTop: '5px' }}>
                                <div
                                    className={`suggestion-item ${!selectedLectureId ? 'selected' : ''}`}
                                    onClick={() => handleSelectLecture(null)}
                                >
                                    <span className="lecture-name">All Lectures</span>
                                    <span className="lecture-path">Clear filter to show everything</span>
                                </div>
                                {matchingLectures.length > 0 ? (
                                    matchingLectures.map(l => (
                                        <div
                                            key={l.id}
                                            className={`suggestion-item ${selectedLectureId === l.id ? 'selected' : ''}`}
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
                </div>
            </SearchFilter>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Text (Preview)</th>
                            <th>Lecture</th>
                            <th>External ID</th>

                            <th>Difficulty</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredQuestions?.map(question => {
                            const lecture = lectures?.find(l => l.id === question.lecture_id);
                            return (
                                <tr key={question.id}>
                                    <td className="question-text-preview">
                                        <HighlightedText
                                            text={question.text.substring(0, 50) + (question.text.length > 50 ? '...' : '')}
                                            query={filterState.searchQuery}
                                        />
                                    </td>
                                    <td>{lecture?.name || 'Unknown'}</td>
                                    <td className="external-id-cell">
                                        <code>
                                            <HighlightedText
                                                text={question.external_id}
                                                query={filterState.searchQuery}
                                            />
                                        </code>
                                    </td>

                                    <td>Level {question.difficulty_level}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-small btn-secondary" onClick={() => handleEdit(question)}>
                                                <EditIcon />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                className="btn-small btn-danger btn-icon-only"
                                                onClick={() => handleDeleteClick(question.id)}
                                                title="Delete Question"
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
                {questions?.length === 0 && (
                    <EmptyState
                        icon="inbox"
                        title="No questions found"
                        description="Create your first question to get started."
                        action={{
                            label: 'Add Question',
                            onClick: handleCreate,
                        }}
                    />
                )}

                {questions && questions.length > 0 && filteredQuestions?.length === 0 && (
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
                <SingleQuestionEditModal
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

            <ConfirmationModal
                isOpen={deleteModalOpen}
                title="Delete Question"
                message="Are you sure you want to delete this question? This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModalOpen(false)}
                isDanger={true}
                isLoading={deleteQuestion.isPending}
            />
        </div>
    );
}


