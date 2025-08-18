/**
 * Unit tests for dashboard utility functions
 */

import {
  formatCurrency,
  formatDate,
  isPaymentOverdue,
  getDaysOverdue,
  calculatePaymentDueDate,
} from '../../../lib/utils/api';

describe('Dashboard Utility Functions', () => {
  describe('formatCurrency', () => {
    it('formats currency in Argentine pesos correctly', () => {
      expect(formatCurrency(2500)).toMatch(/\$\s*2\.?500/);
      expect(formatCurrency(45000)).toMatch(/\$\s*45\.?000/);
      expect(formatCurrency(0)).toMatch(/\$\s*0/);
    });

    it('handles negative amounts', () => {
      expect(formatCurrency(-2500)).toMatch(/-\$\s*2\.?500/);
    });

    it('handles decimal amounts correctly', () => {
      expect(formatCurrency(2500.99)).toMatch(/\$\s*2\.?500/);
      expect(formatCurrency(2500.45)).toMatch(/\$\s*2\.?500/);
    });

    it('handles large amounts', () => {
      expect(formatCurrency(1000000)).toMatch(/\$\s*1\.?000\.?000/);
      expect(formatCurrency(1234567.89)).toMatch(/\$\s*1\.?234\.?567/);
    });
  });

  describe('formatDate', () => {
    it('formats dates in Spanish locale correctly', () => {
      const date = new Date('2024-03-15T18:30:00Z');
      const formatted = formatDate(date);
      
      // Should include Spanish month names and proper format
      expect(formatted).toMatch(/marzo/i);
      expect(formatted).toMatch(/15/);
      expect(formatted).toMatch(/2024/);
    });

    it('handles date strings', () => {
      const dateString = '2024-03-15T18:30:00Z';
      const formatted = formatDate(dateString);
      
      expect(formatted).toMatch(/marzo/i);
      expect(formatted).toMatch(/15/);
    });

    it('includes time information', () => {
      const date = new Date('2024-03-15T18:30:00Z');
      const formatted = formatDate(date);
      
      // Should include hour and minute
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });

    it('handles different years', () => {
      const date2023 = new Date('2023-12-25T12:00:00Z');
      const date2024 = new Date('2024-06-15T12:00:00Z');
      
      expect(formatDate(date2023)).toMatch(/2023/);
      expect(formatDate(date2024)).toMatch(/2024/);
    });
  });

  describe('calculatePaymentDueDate', () => {
    it('calculates due date as 24 hours after game date', () => {
      const gameDate = '2024-03-15T18:00:00Z';
      const dueDate = calculatePaymentDueDate(gameDate);
      
      const expectedDueDate = new Date('2024-03-16T18:00:00Z');
      expect(dueDate.getTime()).toBe(expectedDueDate.getTime());
    });

    it('handles different game times', () => {
      const morningGame = '2024-03-15T08:00:00Z';
      const eveningGame = '2024-03-15T20:00:00Z';
      
      const morningDue = calculatePaymentDueDate(morningGame);
      const eveningDue = calculatePaymentDueDate(eveningGame);
      
      expect(morningDue).toEqual(new Date('2024-03-16T08:00:00Z'));
      expect(eveningDue).toEqual(new Date('2024-03-16T20:00:00Z'));
    });

    it('handles edge cases around daylight saving time', () => {
      // Test a date that might be affected by DST
      const gameDate = '2024-03-31T02:00:00Z'; // Around DST change
      const dueDate = calculatePaymentDueDate(gameDate);
      
      expect(dueDate.getTime() - new Date(gameDate).getTime()).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('isPaymentOverdue', () => {
    beforeEach(() => {
      // Mock current time to be consistent
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-17T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns false for paid payments', () => {
      const gameDate = '2024-03-15T18:00:00Z'; // 2 days ago
      expect(isPaymentOverdue(gameDate, 'paid')).toBe(false);
    });

    it('returns true for pending payments past due date', () => {
      const gameDate = '2024-03-15T18:00:00Z'; // 2 days ago, due yesterday
      expect(isPaymentOverdue(gameDate, 'pending')).toBe(true);
    });

    it('returns false for pending payments not yet due', () => {
      const gameDate = '2024-03-17T18:00:00Z'; // Today, due tomorrow
      expect(isPaymentOverdue(gameDate, 'pending')).toBe(false);
    });

    it('returns true for failed payments past due date', () => {
      const gameDate = '2024-03-15T18:00:00Z'; // 2 days ago
      expect(isPaymentOverdue(gameDate, 'failed')).toBe(true);
    });

    it('handles edge case of exactly due time', () => {
      const gameDate = '2024-03-16T12:00:00Z'; // Yesterday at same time, due now
      expect(isPaymentOverdue(gameDate, 'pending')).toBe(false);
    });

    it('handles future games', () => {
      const gameDate = '2024-03-20T18:00:00Z'; // Future game
      expect(isPaymentOverdue(gameDate, 'pending')).toBe(false);
    });
  });

  describe('getDaysOverdue', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-17T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns 0 for payments not yet due', () => {
      const gameDate = '2024-03-17T18:00:00Z'; // Today, due tomorrow
      expect(getDaysOverdue(gameDate)).toBe(0);
    });

    it('calculates days overdue correctly', () => {
      const gameDate = '2024-03-15T12:00:00Z'; // 2 days ago, due 1 day ago
      expect(getDaysOverdue(gameDate)).toBe(1);
    });

    it('handles multiple days overdue', () => {
      const gameDate = '2024-03-13T12:00:00Z'; // 4 days ago, due 3 days ago
      expect(getDaysOverdue(gameDate)).toBe(3);
    });

    it('handles same day as due date', () => {
      const gameDate = '2024-03-16T12:00:00Z'; // Yesterday, due today
      expect(getDaysOverdue(gameDate)).toBe(0);
    });

    it('handles partial days correctly', () => {
      const gameDate = '2024-03-14T18:00:00Z'; // 2.75 days ago
      const daysOverdue = getDaysOverdue(gameDate);
      expect(daysOverdue).toBeGreaterThanOrEqual(1);
      expect(daysOverdue).toBeLessThan(3);
    });

    it('handles future games', () => {
      const gameDate = '2024-03-20T18:00:00Z'; // Future game
      expect(getDaysOverdue(gameDate)).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles invalid date strings gracefully', () => {
      // formatDate actually throws on invalid dates, so we expect it to throw
      expect(() => formatDate('invalid-date')).toThrow();
    });

    it('handles null and undefined values', () => {
      expect(() => formatCurrency(null as any)).not.toThrow();
      expect(() => formatCurrency(undefined as any)).not.toThrow();
    });

    it('handles extreme currency values', () => {
      expect(() => formatCurrency(Number.MAX_SAFE_INTEGER)).not.toThrow();
      expect(() => formatCurrency(Number.MIN_SAFE_INTEGER)).not.toThrow();
    });

    it('handles extreme dates', () => {
      const veryOldDate = '1900-01-01T00:00:00Z';
      const veryFutureDate = '2100-12-31T23:59:59Z';
      
      expect(() => formatDate(veryOldDate)).not.toThrow();
      expect(() => formatDate(veryFutureDate)).not.toThrow();
      expect(() => calculatePaymentDueDate(veryOldDate)).not.toThrow();
      expect(() => calculatePaymentDueDate(veryFutureDate)).not.toThrow();
    });
  });

  describe('Internationalization', () => {
    it('formats currency with correct locale settings', () => {
      const amount = 1234567.89;
      const formatted = formatCurrency(amount);
      
      // Should use Argentine peso formatting
      expect(formatted).toMatch(/\$/);
      expect(formatted).toMatch(/\./); // Thousands separator
    });

    it('formats dates with Spanish locale', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = formatDate(date);
      
      // Should contain Spanish month name
      expect(formatted.toLowerCase()).toMatch(/enero/);
    });

    it('handles different months in Spanish', () => {
      const months = [
        { date: '2024-01-15T12:00:00Z', month: 'enero' },
        { date: '2024-02-15T12:00:00Z', month: 'febrero' },
        { date: '2024-03-15T12:00:00Z', month: 'marzo' },
        { date: '2024-04-15T12:00:00Z', month: 'abril' },
        { date: '2024-05-15T12:00:00Z', month: 'mayo' },
        { date: '2024-06-15T12:00:00Z', month: 'junio' },
        { date: '2024-07-15T12:00:00Z', month: 'julio' },
        { date: '2024-08-15T12:00:00Z', month: 'agosto' },
        { date: '2024-09-15T12:00:00Z', month: 'septiembre' },
        { date: '2024-10-15T12:00:00Z', month: 'octubre' },
        { date: '2024-11-15T12:00:00Z', month: 'noviembre' },
        { date: '2024-12-15T12:00:00Z', month: 'diciembre' },
      ];

      months.forEach(({ date, month }) => {
        const formatted = formatDate(date);
        expect(formatted.toLowerCase()).toMatch(new RegExp(month));
      });
    });
  });

  describe('Performance', () => {
    it('formatCurrency performs efficiently with large datasets', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        formatCurrency(Math.random() * 1000000);
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('formatDate performs efficiently with large datasets', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        formatDate(new Date(Date.now() + i * 1000));
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(200); // Should complete in less than 200ms
    });

    it('payment calculations perform efficiently', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const gameDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString();
        isPaymentOverdue(gameDate, 'pending');
        getDaysOverdue(gameDate);
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});