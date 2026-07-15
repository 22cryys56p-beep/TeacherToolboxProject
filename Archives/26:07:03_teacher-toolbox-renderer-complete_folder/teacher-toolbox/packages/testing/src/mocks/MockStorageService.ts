/**
 * @mock MockStorageService
 * @description In-memory StorageService for use in unit tests.
 * Identical to the Phase 1 StorageService but imported from the
 * testing package so test files don't import production code directly.
 */
import { StorageService } from '@teacher-toolbox/storage';
export class MockStorageService extends StorageService {}
