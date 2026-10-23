/**
 * Nx workspace plugin for gh-debt — GitHub CLI extension.
 *
 * This file configures the Nx workspace to manage the project's
 * build, typecheck, test, and formatting tasks through Nx.
 *
 * Nx automatically loads this file at the workspace root and uses
 * it as the source of truth for workspace-level plugin configuration.
 */

import type { NxPlugin } from '@nrwl/devkit';

export default async function nxPlugin(): Promise<NxPlugin> {
  return {
    // Extend the project graph with this workspace's projects
    projectGraph: async (graph) => {
      // This single-package workspace has no additional
      // project dependencies to add to the graph.
      return graph;
    },
  };
}