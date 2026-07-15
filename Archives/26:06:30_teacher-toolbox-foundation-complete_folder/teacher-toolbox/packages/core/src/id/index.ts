/**
 * @module id
 * @description Re-exports the generateId utility from @teacher-toolbox/types
 * as a convenient import from the core package.
 *
 * All entity creation in the platform imports from here:
 *   import { generateId } from '@teacher-toolbox/core';
 *   const id = generateId<WorksheetId>();
 */

export { generateId } from '@teacher-toolbox/types';
