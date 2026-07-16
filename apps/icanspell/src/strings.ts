/**
 * @module strings
 * @description All user-facing strings for iCanSpell.
 * Centralised here for easy migration to i18next localisation in a future phase.
 * To localise: replace each property with a t('icanspell.key') call.
 */
export const Strings = {
  appName:           'iCanSpell',
  appDescription:    'Handwriting & spelling worksheet generator',
  wordListEmpty:     'Add some words to get started.',
  noTemplates:       'No templates yet.',
  printButton:       'Print Worksheet',
  exportPDFButton:   'Export PDF',
  newWorksheet:      'New Worksheet',
  openWordList:      'Open Word List',
  selectStudent:     'Select Student',
} as const;
