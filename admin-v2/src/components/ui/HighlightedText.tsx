/**
 * HighlightedText Component
 * 
 * Highlights matched text segments within a string.
 */

import { highlightMatch } from '../../lib/filterUtils';
import './HighlightedText.css';

interface HighlightedTextProps {
    /** Text to display */
    text: string;
    /** Search query to highlight */
    query: string;
    /** Optional CSS class name */
    className?: string;
}

export default function HighlightedText({ text, query, className = '' }: HighlightedTextProps) {
    const segments = highlightMatch(text, query);

    return (
        <span className={className}>
            {segments.map((segment, index) =>
                segment.highlight ? (
                    <mark key={index} className="highlight-match">
                        {segment.text}
                    </mark>
                ) : (
                    <span key={index}>{segment.text}</span>
                )
            )}
        </span>
    );
}
