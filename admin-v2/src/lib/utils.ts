
/**
 * Utility functions for ID generation and formatting
 */

export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')     // Replace spaces with _
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '_');  // Replace multiple - with single _
}

export function generateExternalId(parentExternalId: string, name: string): string {
    const slug = slugify(name);
    // If parent ID is empty (shouldn't happen), just return slug
    if (!parentExternalId) return slug;

    // Prevent double underscores if parent ends with _
    const prefix = parentExternalId.endsWith('_') ? parentExternalId : `${parentExternalId}_`;
    return `${prefix}${slug}`;
}

export function generateQuestionExternalId(lectureExternalId: string, index: number): string {
    return `${lectureExternalId}_q${index + 1}`;
}
