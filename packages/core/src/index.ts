/**
 * @iyulab/oops - Core SDK for safe text file editing
 *
 * Main entry point for the Oops core library
 */

// Core exports
export * from './types';
export * from './errors';
export * from './config';
export * from './file-system';
export * from './transaction';
export * from './git';
export * from './workspace';
export * from './tracker';
export * from './backup';
export * from './diff';

// Main SDK class
export { Oops as Oops } from './oops';
export { Oops } from './oops'; // Keep for backward compatibility
