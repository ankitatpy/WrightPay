import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AxeResults, Result } from 'axe-core';

export interface FormattedViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null | undefined;
  description: string;
  helpUrl: string;
  page: string;
  nodes: {
    target: string[];
    html: string;
    failureSummary: string | undefined;
  }[];
}

/**
 * Creates a configured AxeBuilder instance for WCAG 2.1 AA scanning.
 */
export function createAxeBuilder(page: Page): AxeBuilder {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']);
}

/**
 * Executes an Axe accessibility scan on the provided page or within a scoped container.
 */
export async function runAxeScan(
  page: Page,
  scopeSelector?: string
): Promise<{ results: AxeResults; formattedViolations: FormattedViolation[] }> {
  let builder = createAxeBuilder(page);
  if (scopeSelector) {
    builder = builder.include(scopeSelector);
  }

  const results = await builder.analyze();
  const pageUrl = page.url();

  const formattedViolations: FormattedViolation[] = results.violations.map((v: Result) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    helpUrl: v.helpUrl,
    page: pageUrl,
    nodes: v.nodes.map((n) => ({
      target: n.target as string[],
      html: n.html,
      failureSummary: n.failureSummary,
    })),
  }));

  return { results, formattedViolations };
}

/**
 * Formats violations into a readable text summary.
 */
export function summarizeViolations(violations: FormattedViolation[]): string {
  if (violations.length === 0) return 'No violations detected.';

  return violations
    .map((v, i) => {
      const nodeDetails = v.nodes
        .slice(0, 3)
        .map((n) => `    - Target: ${n.target.join(' ')}\n      HTML: ${n.html.slice(0, 100)}\n      Summary: ${n.failureSummary || 'N/A'}`)
        .join('\n');
      return `[${i + 1}] Rule: ${v.id} | Impact: ${v.impact?.toUpperCase() || 'UNKNOWN'}\n    Description: ${v.description}\n    Help: ${v.helpUrl}\n${nodeDetails}`;
    })
    .join('\n\n');
}
