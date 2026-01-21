import { useQuestionsByLecture } from '../../hooks/useQuestions';
import { Lecture } from '../../types/database';
import { EyeIcon } from '../ui/Icons';
import './LectureReviewModal.css';

interface LectureReviewModalProps {
    lecture: Lecture;
    onClose: () => void;
}

export default function LectureReviewModal({ lecture, onClose }: LectureReviewModalProps) {
    const { data: questions, isLoading, error } = useQuestionsByLecture(lecture.id);

    return (
        <div className="review-modal-overlay" onClick={onClose}>
            <div className="review-modal-content" onClick={e => e.stopPropagation()}>
                <div className="review-modal-header">
                    <div>
                        <h2>Review Questions</h2>
                        <span className="lecture-badge">
                            {lecture.name}
                        </span>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="review-modal-body">
                    {isLoading ? (
                        <div className="review-loading">
                            <div className="spinner"></div>
                            <p>Loading questions...</p>
                        </div>
                    ) : error ? (
                        <div className="review-error">
                            <p>Error loading questions</p>
                            <small>{error.message}</small>
                        </div>
                    ) : !questions || questions.length === 0 ? (
                        <div className="review-empty">
                            <div className="empty-icon-wrapper">
                                <EyeIcon />
                            </div>
                            <h3>No Questions Found</h3>
                            <p>This lecture doesn't have any questions yet.</p>
                        </div>
                    ) : (
                        <div className="questions-list">
                            <div className="questions-stats">
                                <strong>{questions.length}</strong> Questions Total
                            </div>

                            {questions.map((q, index) => (
                                <div key={q.id} className="question-review-card">
                                    <div className="question-header">
                                        <span className="question-number">#{index + 1}</span>
                                        <span className={`difficulty-badge level-${q.difficulty_level}`}>
                                            Level {q.difficulty_level}
                                        </span>
                                    </div>

                                    <div className="question-text">
                                        {q.text}
                                    </div>

                                    <div className="options-grid">
                                        {q.options.map((opt, idx) => {
                                            const isCorrect = idx === q.correct_answer_index;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`option-item ${isCorrect ? 'correct-option' : ''}`}
                                                >
                                                    <span className="option-marker">
                                                        {isCorrect ? '✓' : String.fromCharCode(65 + idx)}
                                                    </span>
                                                    {opt.text}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {q.explanation && (
                                        <div className="question-explanation">
                                            <strong>Explanation:</strong> {q.explanation}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
