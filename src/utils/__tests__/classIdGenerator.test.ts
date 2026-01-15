import {
  getInitials,
  formatDateForId,
  generateClassId,
  isValidClassId,
  parseClassId,
} from '../classIdGenerator';

describe('classIdGenerator', () => {
  describe('getInitials', () => {
    it('returns first and last initials for two-word name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('returns first two letters for single name', () => {
      expect(getInitials('Madonna')).toBe('MA');
    });

    it('returns first and last initials for multiple names', () => {
      expect(getInitials('John Paul Smith')).toBe('JS');
    });

    it('handles names with extra whitespace', () => {
      expect(getInitials('  John   Doe  ')).toBe('JD');
    });

    it('returns uppercase initials', () => {
      expect(getInitials('jane doe')).toBe('JD');
    });

    it('handles single character name', () => {
      expect(getInitials('J')).toBe('J');
    });

    it('handles hyphenated last names', () => {
      expect(getInitials('Mary Smith-Jones')).toBe('MS');
    });
  });

  describe('formatDateForId', () => {
    it('formats Date object as YYYYMMDD', () => {
      const date = new Date(2024, 10, 19); // Nov 19, 2024
      expect(formatDateForId(date)).toBe('20241119');
    });

    it('formats date string correctly', () => {
      expect(formatDateForId('2024-12-25')).toBe('20241225');
    });

    it('pads single-digit months and days', () => {
      const date = new Date(2024, 0, 5); // Jan 5, 2024
      expect(formatDateForId(date)).toBe('20240105');
    });

    it('handles ISO date strings', () => {
      expect(formatDateForId('2024-01-15T10:30:00Z')).toBe('20240115');
    });
  });

  describe('generateClassId', () => {
    it('generates ID with sequence 1 for first class of day', () => {
      const id = generateClassId({
        studentName: 'Sarah Miller',
        tutorName: 'John Doe',
        date: new Date(2024, 10, 19),
        existingIds: [],
      });
      expect(id).toBe('SM-JD-20241119-1');
    });

    it('increments sequence for existing IDs on same day', () => {
      const id = generateClassId({
        studentName: 'Sarah Miller',
        tutorName: 'John Doe',
        date: new Date(2024, 10, 19),
        existingIds: ['SM-JD-20241119-1', 'SM-JD-20241119-2'],
      });
      expect(id).toBe('SM-JD-20241119-3');
    });

    it('starts at 1 when no matching base IDs exist', () => {
      const id = generateClassId({
        studentName: 'Sarah Miller',
        tutorName: 'John Doe',
        date: new Date(2024, 10, 19),
        existingIds: ['AB-CD-20241119-1', 'SM-JD-20241118-1'],
      });
      expect(id).toBe('SM-JD-20241119-1');
    });

    it('handles date string input', () => {
      const id = generateClassId({
        studentName: 'Test Student',
        tutorName: 'Test Tutor',
        date: '2024-12-25',
      });
      expect(id).toBe('TS-TT-20241225-1');
    });

    it('finds correct next sequence with gaps', () => {
      const id = generateClassId({
        studentName: 'Sarah Miller',
        tutorName: 'John Doe',
        date: new Date(2024, 10, 19),
        existingIds: ['SM-JD-20241119-1', 'SM-JD-20241119-5'],
      });
      expect(id).toBe('SM-JD-20241119-6');
    });
  });

  describe('isValidClassId', () => {
    it('returns true for valid class ID format', () => {
      expect(isValidClassId('SM-JD-20241119-1')).toBe(true);
    });

    it('returns true for multi-digit sequence', () => {
      expect(isValidClassId('AB-CD-20241225-123')).toBe(true);
    });

    it('returns false for lowercase letters', () => {
      expect(isValidClassId('sm-jd-20241119-1')).toBe(false);
    });

    it('returns false for missing sequence', () => {
      expect(isValidClassId('SM-JD-20241119')).toBe(false);
    });

    it('returns false for wrong date format', () => {
      expect(isValidClassId('SM-JD-2024119-1')).toBe(false);
    });

    it('returns false for single letter initials', () => {
      expect(isValidClassId('S-J-20241119-1')).toBe(false);
    });

    it('returns false for random string', () => {
      expect(isValidClassId('not-a-valid-id')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidClassId('')).toBe(false);
    });
  });

  describe('parseClassId', () => {
    it('parses valid class ID into components', () => {
      const result = parseClassId('SM-JD-20241119-1');
      expect(result).toEqual({
        studentInitials: 'SM',
        tutorInitials: 'JD',
        date: '20241119',
        sequence: 1,
      });
    });

    it('parses multi-digit sequence correctly', () => {
      const result = parseClassId('AB-CD-20241225-42');
      expect(result).toEqual({
        studentInitials: 'AB',
        tutorInitials: 'CD',
        date: '20241225',
        sequence: 42,
      });
    });

    it('returns null for invalid class ID', () => {
      expect(parseClassId('invalid-id')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseClassId('')).toBeNull();
    });

    it('returns null for partial ID', () => {
      expect(parseClassId('SM-JD')).toBeNull();
    });
  });
});
