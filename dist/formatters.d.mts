import { t as DebtItem } from "./types-rw0KCxm4.mjs";
/**
 * Render debt items as a table, sorted by updatedAt ascending (oldest first).
 */
export declare function renderTable(items: DebtItem[]): string;
/**
 * Renders debt items as markdown table.
 */
export declare function renderMarkdown(items: DebtItem[]): string;
/**
 * Render debt items as JSON.
 */
export declare function renderJSON(items: DebtItem[]): string;
/**
 * Render a summary of debt items. `format` mirrors the global --format flag;
 * the default is the human-readable view.
 */
export declare function renderSummary(items: DebtItem[], format?: 'table' | 'json' | 'md'): string;