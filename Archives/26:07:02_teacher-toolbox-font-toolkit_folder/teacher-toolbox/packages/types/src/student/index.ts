/**
 * @package @teacher-toolbox/types/student
 */

import type { ClassroomId, GradeLevel, ISODateTime, StudentId, SyncMetadata } from '../common/index.js';

export interface Student extends SyncMetadata {
  id:           StudentId;
  firstName:    string;
  lastName:     string;
  displayName:  string;
  classroomId:  ClassroomId;
  gradeLevel?:  GradeLevel;
  avatarColor?: string;
  createdAt:    ISODateTime;
  updatedAt:    ISODateTime;
}

export interface Classroom extends SyncMetadata {
  id:           ClassroomId;
  name:         string;
  gradeLevel:   GradeLevel;
  academicYear: string;
  studentIds:   StudentId[];
  createdAt:    ISODateTime;
}

export interface CreateStudentInput {
  firstName:   string;
  lastName:    string;
  displayName?: string;
  classroomId: ClassroomId;
  gradeLevel?:  GradeLevel;
}

export interface CreateClassroomInput {
  name:         string;
  gradeLevel:   GradeLevel;
  academicYear: string;
}
