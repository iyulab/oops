/**
 * Utils Tests for 100% Coverage
 */

import { OutputFormatter } from '../utils/output';
import { PromptManager } from '../utils/prompts';
import * as readline from 'readline';

// Mock console methods
const mockConsoleLog = jest.fn();
const originalConsoleLog = console.log;

// Mock readline
jest.mock('readline');
const mockReadline = readline as jest.Mocked<typeof readline>;

describe('Utils Tests (100% Coverage)', () => {
  beforeEach(() => {
    console.log = mockConsoleLog;
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('OutputFormatter', () => {
    test('should format success messages', () => {
      OutputFormatter.success('Test success message');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✓'),
        'Test success message'
      );
    });

    test('should format error messages', () => {
      OutputFormatter.error('Test error message');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✗'),
        'Test error message'
      );
    });

    test('should format warning messages', () => {
      OutputFormatter.warning('Test warning message');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⚠'),
        'Test warning message'
      );
    });

    test('should format info messages', () => {
      OutputFormatter.info('Test info message');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('ℹ'),
        'Test info message'
      );
    });

    test('should format debug messages', () => {
      OutputFormatter.debug('Test debug message');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🐛'),
        'Test debug message'
      );
    });

    test('should handle empty messages', () => {
      OutputFormatter.success('');
      OutputFormatter.error('');
      OutputFormatter.warning('');
      OutputFormatter.info('');
      OutputFormatter.debug('');

      expect(mockConsoleLog).toHaveBeenCalledTimes(5);
    });

    test('should handle special characters in messages', () => {
      const specialMessage = 'Message with üñíçøðé characters & symbols @#$%';

      OutputFormatter.success(specialMessage);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓'), specialMessage);
    });
  });

  describe('PromptManager', () => {
    let mockInterface: any;

    beforeEach(() => {
      mockInterface = {
        question: jest.fn(),
        close: jest.fn(),
      };

      mockReadline.createInterface.mockReturnValue(mockInterface);
    });

    test('should create instance with readline interface', () => {
      const promptManager = new PromptManager();

      expect(mockReadline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
      });
      expect(promptManager).toBeInstanceOf(PromptManager);
    });

    test('should handle confirm with default true', async () => {
      const promptManager = new PromptManager();

      // Mock the question callback to simulate user pressing Enter (empty input)
      mockInterface.question.mockImplementation(
        (_question: string, callback: (_answer: string) => void) => {
          callback(''); // Empty answer should use default
        }
      );

      const result = await promptManager.confirm('Are you sure?', true);

      expect(result).toBe(true);
      expect(mockInterface.question).toHaveBeenCalledWith(
        'Are you sure? (Y/n) ',
        expect.any(Function)
      );
    });

    test('should handle confirm with default false', async () => {
      const promptManager = new PromptManager();

      mockInterface.question.mockImplementation(
        (_question: string, callback: (_answer: string) => void) => {
          callback(''); // Empty answer should use default
        }
      );

      const result = await promptManager.confirm('Delete file?', false);

      expect(result).toBe(false);
      expect(mockInterface.question).toHaveBeenCalledWith(
        'Delete file? (y/N) ',
        expect.any(Function)
      );
    });

    test('should handle confirm with explicit yes', async () => {
      const promptManager = new PromptManager();

      mockInterface.question.mockImplementation(
        (_question: string, callback: (_answer: string) => void) => {
          callback('y');
        }
      );

      const result = await promptManager.confirm('Continue?', false);

      expect(result).toBe(true);
    });

    test('should handle confirm with explicit no', async () => {
      const promptManager = new PromptManager();

      mockInterface.question.mockImplementation(
        (_question: string, callback: (_answer: string) => void) => {
          callback('n');
        }
      );

      const result = await promptManager.confirm('Continue?', true);

      expect(result).toBe(false);
    });

    test('should handle confirm with various yes responses', async () => {
      const promptManager = new PromptManager();
      const yesResponses = ['y', 'Y', 'yes', 'YES', 'Yes', ' y ', ' YES '];

      for (const response of yesResponses) {
        mockInterface.question.mockImplementation(
          (_question: string, callback: (_answer: string) => void) => {
            callback(response);
          }
        );

        const result = await promptManager.confirm('Test?', false);
        expect(result).toBe(true);
      }
    });

    test('should handle input with default value', async () => {
      const promptManager = new PromptManager();

      mockInterface.question.mockImplementation(
        (_question: string, callback: (_answer: string) => void) => {
          callback(''); // Empty answer should use default
        }
      );

      const result = await promptManager.input('Enter name', 'John');

      expect(result).toBe('John');
      expect(mockInterface.question).toHaveBeenCalledWith(
        'Enter name (John): ',
        expect.any(Function)
      );
    });

    test('should handle input without default value', async () => {
      const promptManager = new PromptManager();

      mockInterface.question.mockImplementation(
        (_question: string, callback: (_answer: string) => void) => {
          callback('UserInput');
        }
      );

      const result = await promptManager.input('Enter value');

      expect(result).toBe('UserInput');
      expect(mockInterface.question).toHaveBeenCalledWith('Enter value: ', expect.any(Function));
    });

    test('should trim whitespace from input', async () => {
      const promptManager = new PromptManager();

      mockInterface.question.mockImplementation(
        (_question: string, callback: (_answer: string) => void) => {
          callback('  spaced input  ');
        }
      );

      const result = await promptManager.input('Enter text');

      expect(result).toBe('spaced input');
    });

    test('should close readline interface', () => {
      const promptManager = new PromptManager();

      promptManager.close();

      expect(mockInterface.close).toHaveBeenCalled();
    });

    test('should handle multiple operations', async () => {
      const promptManager = new PromptManager();

      // First confirm
      mockInterface.question.mockImplementationOnce(
        (_question: string, callback: (_answer: string) => void) => {
          callback('y');
        }
      );

      const confirmResult = await promptManager.confirm('First question?');
      expect(confirmResult).toBe(true);

      // Then input
      mockInterface.question.mockImplementationOnce(
        (_question: string, callback: (_answer: string) => void) => {
          callback('test input');
        }
      );

      const inputResult = await promptManager.input('Enter something');
      expect(inputResult).toBe('test input');

      expect(mockInterface.question).toHaveBeenCalledTimes(2);
    });
  });
});
