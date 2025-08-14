import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  eventType: string;
  userId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthSecurityService {
  private static instance: AuthSecurityService;

  static getInstance(): AuthSecurityService {
    if (!AuthSecurityService.instance) {
      AuthSecurityService.instance = new AuthSecurityService();
    }
    return AuthSecurityService.instance;
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await supabase
        .from('security_logs')
        .insert({
          event_type: event.eventType,
          user_id: event.userId,
          details: event.details,
          ip_address: event.ipAddress,
          user_agent: event.userAgent
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - logging failure shouldn't break the application
    }
  }

  async logLoginAttempt(
    email: string, 
    success: boolean, 
    error?: string
  ): Promise<void> {
    const event: SecurityEvent = {
      eventType: success ? 'login_success' : 'login_failure',
      details: {
        email,
        success,
        error: error || undefined,
        timestamp: new Date().toISOString()
      },
      userAgent: navigator.userAgent
    };

    await this.logSecurityEvent(event);
  }

  async logPasswordReset(email: string): Promise<void> {
    const event: SecurityEvent = {
      eventType: 'password_reset_request',
      details: {
        email,
        timestamp: new Date().toISOString()
      },
      userAgent: navigator.userAgent
    };

    await this.logSecurityEvent(event);
  }

  async logSuspiciousActivity(
    userId: string,
    activityType: string,
    details: Record<string, any>
  ): Promise<void> {
    const event: SecurityEvent = {
      eventType: 'suspicious_activity',
      userId,
      details: {
        activityType,
        ...details,
        timestamp: new Date().toISOString()
      },
      userAgent: navigator.userAgent
    };

    await this.logSecurityEvent(event);
  }

  async logAdminAction(
    adminId: string,
    action: string,
    targetUserId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const event: SecurityEvent = {
      eventType: 'admin_action',
      userId: adminId,
      details: {
        action,
        targetUserId,
        ...details,
        timestamp: new Date().toISOString()
      },
      userAgent: navigator.userAgent
    };

    await this.logSecurityEvent(event);
  }

  async validateUserRole(userId: string, requiredRole: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !data) {
        await this.logSuspiciousActivity(userId, 'role_validation_failed', {
          error: error?.message || 'User profile not found'
        });
        return false;
      }

      const hasRole = data.role === requiredRole;
      
      if (!hasRole) {
        await this.logSuspiciousActivity(userId, 'unauthorized_role_access', {
          userRole: data.role,
          requiredRole
        });
      }

      return hasRole;
    } catch (error) {
      console.error('Role validation error:', error);
      await this.logSuspiciousActivity(userId, 'role_validation_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async checkRateLimit(
    identifier: string, 
    action: string, 
    maxAttempts: number = 5, 
    windowMinutes: number = 15
  ): Promise<boolean> {
    try {
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
      
      const { data, error } = await supabase
        .from('security_logs')
        .select('id')
        .eq('event_type', action)
        .eq('details->>identifier', identifier)
        .gte('created_at', windowStart.toISOString());

      if (error) {
        console.error('Rate limit check error:', error);
        return false; // Fail closed
      }

      const attemptCount = data?.length || 0;
      const isAllowed = attemptCount < maxAttempts;

      if (!isAllowed) {
        await this.logSecurityEvent({
          eventType: 'rate_limit_exceeded',
          details: {
            identifier,
            action,
            attemptCount,
            maxAttempts,
            windowMinutes
          }
        });
      }

      return isAllowed;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return false; // Fail closed
    }
  }
}

export const authSecurityService = AuthSecurityService.getInstance();