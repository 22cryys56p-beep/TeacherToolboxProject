/**
 * @model SpellingWorksheet
 * @description iCanSpell-specific worksheet configuration.
 * Stored as the appData field on a WorksheetDocument.
 * @status PLACEHOLDER — full implementation in v1.0
 */
export interface SpellingWorksheetData {
  wordListId?: string;
  words: string[];
  practiceCount: number;
  lineStyle: 'zaner-bloser' | 'dnealian' | 'hts' | 'plain';
  showWordNumbers: boolean;
  showTraceLetter: boolean;
}
