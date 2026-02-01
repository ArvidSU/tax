import { describe, it, expect, vi } from 'vitest';
import { getSessionId } from './session';

describe('getSessionId', () => {
  it('should generate a new UUID and store it if no session exists', () => {
    const sessionId = getSessionId();
    
    expect(sessionId).toBe('test-uuid-1234-5678-9012');
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'tax-distribution-session',
      'test-uuid-1234-5678-9012'
    );
  });

  it('should return existing session ID from localStorage', () => {
    // Pre-populate localStorage
    const existingSessionId = 'existing-session-id';
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValueOnce(existingSessionId);
    
    const sessionId = getSessionId();
    
    expect(sessionId).toBe(existingSessionId);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should use the correct storage key', () => {
    getSessionId();
    
    expect(localStorage.getItem).toHaveBeenCalledWith('tax-distribution-session');
  });
});
