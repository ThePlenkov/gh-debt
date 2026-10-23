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
 * Render a summary of debt items.
 */
export declare function renderSummary(items: DebtItem[]): string;