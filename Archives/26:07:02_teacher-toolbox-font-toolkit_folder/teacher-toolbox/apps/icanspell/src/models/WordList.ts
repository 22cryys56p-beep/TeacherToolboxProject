/**
 * @model WordList
 * @description A named, ordered list of spelling words.
 * Persisted to StorageService under the 'wordlists' store.
 * @status PLACEHOLDER — full implementation in v1.0
 */
import type { ISODateTime } from '@teacher-toolbox/types';

export interface WordList {
  id: string;
  name: string;
  words: string[];
  weekNumber?: number;
  tags: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
