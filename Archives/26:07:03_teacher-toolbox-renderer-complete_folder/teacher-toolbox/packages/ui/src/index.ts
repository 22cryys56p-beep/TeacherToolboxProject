/**
 * @package @teacher-toolbox/ui
 * @description Shared Svelte UI components for the Teacher Toolbox platform.
 *
 * All components receive data as props and communicate via Svelte events.
 * No component calls platform services directly — that stays in pages/layouts.
 */

// Forms
export { default as Button } from './components/forms/Button.svelte';

// Feedback
export { default as EmptyState }     from './components/feedback/EmptyState.svelte';
export { default as LoadingSpinner } from './components/feedback/LoadingSpinner.svelte';

// TODO v0.2: Panel, Sidebar, Toolbar, Modal, TextInput, SelectInput
