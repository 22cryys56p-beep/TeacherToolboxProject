/**
 * @package @teacher-toolbox/types/template
 */

import type { AppId, GradeLevel, ISODateTime, SyncMetadata, TemplateId } from '../common/index.js';
import type { WorksheetDocument } from '../worksheet/index.js';

export interface WorksheetTemplate extends SyncMetadata {
  id:           TemplateId;
  appId:        AppId;
  name:         string;
  description:  string;
  thumbnail?:   string;
  document:     WorksheetDocument;
  category:     string;
  tags:         string[];
  gradeLevel?:  GradeLevel[];
  source:       'builtin' | 'custom' | 'downloaded';
  authorName?:  string;
  createdAt:    ISODateTime;
  updatedAt:    ISODateTime;
}

export interface TemplateMetadata {
  id:          TemplateId;
  appId:       AppId;
  name:        string;
  description: string;
  thumbnail?:  string;
  category:    string;
  tags:        string[];
  source:      WorksheetTemplate['source'];
}

export interface TemplateFilter {
  appId?:      AppId;
  category?:   string;
  tags?:       string[];
  source?:     WorksheetTemplate['source'];
  searchText?: string;
}

export interface TemplateContext {
  studentName?: string;
  appData?:     Record<string, unknown>;
}
