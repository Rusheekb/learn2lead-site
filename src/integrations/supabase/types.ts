export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3';
  };
  public: {
    Tables: {
      account_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: Json;
          id: string;
          subject_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          subject_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          subject_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'account_audit_log_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_audit_log_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      admin_activity_log: {
        Row: {
          action_type: string;
          admin_id: string;
          created_at: string;
          description: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          metadata: Json | null;
        };
        Insert: {
          action_type: string;
          admin_id: string;
          created_at?: string;
          description: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          metadata?: Json | null;
        };
        Update: {
          action_type?: string;
          admin_id?: string;
          created_at?: string;
          description?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_activity_log_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      auto_renewal_settings: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          last_renewal_at: string | null;
          last_renewal_error: string | null;
          renewal_pack: string;
          stripe_customer_id: string | null;
          student_id: string;
          threshold: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          last_renewal_at?: string | null;
          last_renewal_error?: string | null;
          renewal_pack?: string;
          stripe_customer_id?: string | null;
          student_id: string;
          threshold?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          last_renewal_at?: string | null;
          last_renewal_error?: string | null;
          renewal_pack?: string;
          stripe_customer_id?: string | null;
          student_id?: string;
          threshold?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'auto_renewal_settings_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      blocked_log_notifications: {
        Row: {
          class_id: string;
          created_at: string;
          student_id: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          student_id: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          student_id?: string;
        };
        Relationships: [];
      };
      calendar_feed_tokens: {
        Row: {
          created_at: string;
          rotated_at: string | null;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          rotated_at?: string | null;
          token?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          rotated_at?: string | null;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      class_cancellations: {
        Row: {
          cancelled_at: string;
          cancelled_by: string | null;
          class_date: string | null;
          class_start: string | null;
          id: string;
          notes: string | null;
          scheduled_class_id: string;
          student_id: string | null;
          subject: string | null;
          title: string | null;
          tutor_id: string | null;
          zoom_link: string | null;
        };
        Insert: {
          cancelled_at?: string;
          cancelled_by?: string | null;
          class_date?: string | null;
          class_start?: string | null;
          id?: string;
          notes?: string | null;
          scheduled_class_id: string;
          student_id?: string | null;
          subject?: string | null;
          title?: string | null;
          tutor_id?: string | null;
          zoom_link?: string | null;
        };
        Update: {
          cancelled_at?: string;
          cancelled_by?: string | null;
          class_date?: string | null;
          class_start?: string | null;
          id?: string;
          notes?: string | null;
          scheduled_class_id?: string;
          student_id?: string | null;
          subject?: string | null;
          title?: string | null;
          tutor_id?: string | null;
          zoom_link?: string | null;
        };
        Relationships: [];
      };
      class_credits_ledger: {
        Row: {
          amount: number;
          balance_after: number;
          created_at: string | null;
          dollar_amount: number | null;
          id: string;
          invoice_id: string | null;
          reason: string;
          related_class_id: string | null;
          reversed_debit_id: string | null;
          student_id: string;
          subscription_id: string | null;
          transaction_type: string;
        };
        Insert: {
          amount: number;
          balance_after: number;
          created_at?: string | null;
          dollar_amount?: number | null;
          id?: string;
          invoice_id?: string | null;
          reason: string;
          related_class_id?: string | null;
          reversed_debit_id?: string | null;
          student_id: string;
          subscription_id?: string | null;
          transaction_type: string;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          created_at?: string | null;
          dollar_amount?: number | null;
          id?: string;
          invoice_id?: string | null;
          reason?: string;
          related_class_id?: string | null;
          reversed_debit_id?: string | null;
          student_id?: string;
          subscription_id?: string | null;
          transaction_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_credits_ledger_reversed_debit_id_fkey';
            columns: ['reversed_debit_id'];
            isOneToOne: false;
            referencedRelation: 'class_credits_ledger';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_credits_ledger_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'credit_discrepancies';
            referencedColumns: ['subscription_id'];
          },
          {
            foreignKeyName: 'class_credits_ledger_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'student_subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      class_logs: {
        Row: {
          'Additional Info': string | null;
          'Class Cost': number | null;
          'Class ID': string | null;
          'Class Number': string | null;
          Content: string | null;
          Date: string;
          Day: string | null;
          dispute_reason: string | null;
          disputed: boolean | null;
          HW: string | null;
          id: string;
          start_at: string | null;
          'Student Name': string | null;
          student_feedback: string | null;
          student_payment_date: string | null;
          student_rating: number | null;
          student_user_id: string | null;
          Subject: string | null;
          'Time (CST)': string | null;
          'Time (hrs)': string | null;
          timezone: string;
          Title: string | null;
          'Tutor Cost': number | null;
          'Tutor Name': string | null;
          tutor_is_paid: boolean;
          tutor_payment_date: string | null;
          tutor_user_id: string | null;
          verification_deadline: string | null;
          verified_by_student: boolean | null;
        };
        Insert: {
          'Additional Info'?: string | null;
          'Class Cost'?: number | null;
          'Class ID'?: string | null;
          'Class Number'?: string | null;
          Content?: string | null;
          Date: string;
          Day?: string | null;
          dispute_reason?: string | null;
          disputed?: boolean | null;
          HW?: string | null;
          id?: string;
          start_at?: string | null;
          'Student Name'?: string | null;
          student_feedback?: string | null;
          student_payment_date?: string | null;
          student_rating?: number | null;
          student_user_id?: string | null;
          Subject?: string | null;
          'Time (CST)'?: string | null;
          'Time (hrs)'?: string | null;
          timezone?: string;
          Title?: string | null;
          'Tutor Cost'?: number | null;
          'Tutor Name'?: string | null;
          tutor_is_paid?: boolean;
          tutor_payment_date?: string | null;
          tutor_user_id?: string | null;
          verification_deadline?: string | null;
          verified_by_student?: boolean | null;
        };
        Update: {
          'Additional Info'?: string | null;
          'Class Cost'?: number | null;
          'Class ID'?: string | null;
          'Class Number'?: string | null;
          Content?: string | null;
          Date?: string;
          Day?: string | null;
          dispute_reason?: string | null;
          disputed?: boolean | null;
          HW?: string | null;
          id?: string;
          start_at?: string | null;
          'Student Name'?: string | null;
          student_feedback?: string | null;
          student_payment_date?: string | null;
          student_rating?: number | null;
          student_user_id?: string | null;
          Subject?: string | null;
          'Time (CST)'?: string | null;
          'Time (hrs)'?: string | null;
          timezone?: string;
          Title?: string | null;
          'Tutor Cost'?: number | null;
          'Tutor Name'?: string | null;
          tutor_is_paid?: boolean;
          tutor_payment_date?: string | null;
          tutor_user_id?: string | null;
          verification_deadline?: string | null;
          verified_by_student?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'class_logs_student_user_id_fkey';
            columns: ['student_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_logs_tutor_user_id_fkey';
            columns: ['tutor_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      class_uploads: {
        Row: {
          class_id: string;
          created_at: string;
          file_name: string;
          file_path: string;
          file_size: string;
          id: string;
          note: string | null;
          student_name: string;
          upload_date: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          file_name: string;
          file_path: string;
          file_size: string;
          id?: string;
          note?: string | null;
          student_name: string;
          upload_date: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          file_name?: string;
          file_path?: string;
          file_size?: string;
          id?: string;
          note?: string | null;
          student_name?: string;
          upload_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_uploads_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'scheduled_classes';
            referencedColumns: ['id'];
          },
        ];
      };
      contact_methods: {
        Row: {
          consent_text: string | null;
          created_at: string;
          id: string;
          kind: string;
          opted_in_at: string | null;
          opted_out_at: string | null;
          profile_id: string;
          updated_at: string;
          value: string;
          verification_attempts: number;
          verification_code_hash: string | null;
          verification_expires_at: string | null;
          verified_at: string | null;
        };
        Insert: {
          consent_text?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          opted_in_at?: string | null;
          opted_out_at?: string | null;
          profile_id: string;
          updated_at?: string;
          value: string;
          verification_attempts?: number;
          verification_code_hash?: string | null;
          verification_expires_at?: string | null;
          verified_at?: string | null;
        };
        Update: {
          consent_text?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          opted_in_at?: string | null;
          opted_out_at?: string | null;
          profile_id?: string;
          updated_at?: string;
          value?: string;
          verification_attempts?: number;
          verification_code_hash?: string | null;
          verification_expires_at?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contact_methods_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      content_shares: {
        Row: {
          content_type: string | null;
          description: string | null;
          file_path: string | null;
          id: string;
          receiver_id: string;
          sender_id: string;
          shared_at: string;
          title: string;
          viewed_at: string | null;
        };
        Insert: {
          content_type?: string | null;
          description?: string | null;
          file_path?: string | null;
          id?: string;
          receiver_id: string;
          sender_id: string;
          shared_at?: string;
          title: string;
          viewed_at?: string | null;
        };
        Update: {
          content_type?: string | null;
          description?: string | null;
          file_path?: string | null;
          id?: string;
          receiver_id?: string;
          sender_id?: string;
          shared_at?: string;
          title?: string;
          viewed_at?: string | null;
        };
        Relationships: [];
      };
      guardian_invites: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          status: string;
          student_id: string;
          token: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          status?: string;
          student_id: string;
          token?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          status?: string;
          student_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'guardian_invites_accepted_by_fkey';
            columns: ['accepted_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guardian_invites_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      guardian_links: {
        Row: {
          created_at: string;
          created_via: string;
          guardian_id: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          created_via: string;
          guardian_id: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          created_via?: string;
          guardian_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'guardian_links_guardian_id_fkey';
            columns: ['guardian_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guardian_links_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      message_reads: {
        Row: {
          last_notified_at: string | null;
          last_read_at: string | null;
          profile_id: string;
          thread_id: string;
        };
        Insert: {
          last_notified_at?: string | null;
          last_read_at?: string | null;
          profile_id: string;
          thread_id: string;
        };
        Update: {
          last_notified_at?: string | null;
          last_read_at?: string | null;
          profile_id?: string;
          thread_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_reads_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_reads_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'message_threads';
            referencedColumns: ['id'];
          },
        ];
      };
      message_threads: {
        Row: {
          created_at: string;
          id: string;
          last_message_at: string | null;
          student_id: string;
          tutor_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          student_id: string;
          tutor_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          student_id?: string;
          tutor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_threads_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_threads_tutor_id_fkey';
            columns: ['tutor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          sender_id: string | null;
          thread_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
          thread_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
          thread_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'message_threads';
            referencedColumns: ['id'];
          },
        ];
      };
      monthly_reports_sent: {
        Row: {
          created_at: string;
          id: string;
          report_content: string | null;
          report_month: string;
          sent_at: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          report_content?: string | null;
          report_month: string;
          sent_at?: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          report_content?: string | null;
          report_month?: string;
          sent_at?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'monthly_reports_sent_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          category: string;
          channel: string;
          enabled: boolean;
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          channel: string;
          enabled: boolean;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          channel?: string;
          enabled?: boolean;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          read: boolean;
          related_id: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          read?: boolean;
          related_id?: string | null;
          type?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          read?: boolean;
          related_id?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      overdraw_reminders_sent: {
        Row: {
          amount_owed: number;
          created_at: string;
          id: string;
          sent_at: string;
          student_id: string;
          threshold: number;
        };
        Insert: {
          amount_owed: number;
          created_at?: string;
          id?: string;
          sent_at?: string;
          student_id: string;
          threshold: number;
        };
        Update: {
          amount_owed?: number;
          created_at?: string;
          id?: string;
          sent_at?: string;
          student_id?: string;
          threshold?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          email: string;
          first_name: string;
          hide_hours_from_student: boolean;
          id: string;
          last_name: string | null;
          managed: boolean;
          must_change_password: boolean;
          notification_email: string | null;
          notify_class_reminders: boolean | null;
          notify_low_credits: boolean | null;
          role: Database['public']['Enums']['app_role'];
          timezone: string | null;
          updated_at: string;
          username: string;
          zoom_link: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email: string;
          first_name: string;
          hide_hours_from_student?: boolean;
          id: string;
          last_name?: string | null;
          managed?: boolean;
          must_change_password?: boolean;
          notification_email?: string | null;
          notify_class_reminders?: boolean | null;
          notify_low_credits?: boolean | null;
          role?: Database['public']['Enums']['app_role'];
          timezone?: string | null;
          updated_at?: string;
          username: string;
          zoom_link?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email?: string;
          first_name?: string;
          hide_hours_from_student?: boolean;
          id?: string;
          last_name?: string | null;
          managed?: boolean;
          must_change_password?: boolean;
          notification_email?: string | null;
          notify_class_reminders?: boolean | null;
          notify_low_credits?: boolean | null;
          role?: Database['public']['Enums']['app_role'];
          timezone?: string | null;
          updated_at?: string;
          username?: string;
          zoom_link?: string | null;
        };
        Relationships: [];
      };
      referral_codes: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          created_by: string | null;
          discount_amount: number;
          discount_type: string;
          expires_at: string | null;
          id: string;
          max_uses: number | null;
          stripe_coupon_id: string;
          times_used: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          created_by?: string | null;
          discount_amount?: number;
          discount_type?: string;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
          stripe_coupon_id: string;
          times_used?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          discount_amount?: number;
          discount_type?: string;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
          stripe_coupon_id?: string;
          times_used?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'referral_codes_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      referral_usage: {
        Row: {
          id: string;
          referral_code_id: string;
          subscription_id: string | null;
          used_at: string;
          used_by_email: string;
          used_by_user_id: string;
        };
        Insert: {
          id?: string;
          referral_code_id: string;
          subscription_id?: string | null;
          used_at?: string;
          used_by_email: string;
          used_by_user_id: string;
        };
        Update: {
          id?: string;
          referral_code_id?: string;
          subscription_id?: string | null;
          used_at?: string;
          used_by_email?: string;
          used_by_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'referral_usage_referral_code_id_fkey';
            columns: ['referral_code_id'];
            isOneToOne: false;
            referencedRelation: 'referral_codes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'referral_usage_used_by_user_id_fkey';
            columns: ['used_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      role_change_audit: {
        Row: {
          changed_by: string | null;
          created_at: string | null;
          id: string;
          new_role: string;
          old_role: string;
          reason: string | null;
          user_id: string;
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string | null;
          id?: string;
          new_role: string;
          old_role: string;
          reason?: string | null;
          user_id: string;
        };
        Update: {
          changed_by?: string | null;
          created_at?: string | null;
          id?: string;
          new_role?: string;
          old_role?: string;
          reason?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      scheduled_classes: {
        Row: {
          attendance: string | null;
          created_at: string;
          date: string;
          end_at: string;
          end_time: string;
          id: string;
          materials_url: string[] | null;
          notes: string | null;
          relationship_id: string | null;
          reminder_24h_sent: boolean | null;
          reminder_sent: boolean | null;
          start_at: string;
          start_time: string;
          status: string;
          student_id: string;
          subject: string;
          timezone: string;
          title: string;
          tutor_id: string;
          updated_at: string;
          zoom_link: string | null;
        };
        Insert: {
          attendance?: string | null;
          created_at?: string;
          date: string;
          end_at: string;
          end_time: string;
          id?: string;
          materials_url?: string[] | null;
          notes?: string | null;
          relationship_id?: string | null;
          reminder_24h_sent?: boolean | null;
          reminder_sent?: boolean | null;
          start_at: string;
          start_time: string;
          status?: string;
          student_id: string;
          subject: string;
          timezone?: string;
          title: string;
          tutor_id: string;
          updated_at?: string;
          zoom_link?: string | null;
        };
        Update: {
          attendance?: string | null;
          created_at?: string;
          date?: string;
          end_at?: string;
          end_time?: string;
          id?: string;
          materials_url?: string[] | null;
          notes?: string | null;
          relationship_id?: string | null;
          reminder_24h_sent?: boolean | null;
          reminder_sent?: boolean | null;
          start_at?: string;
          start_time?: string;
          status?: string;
          student_id?: string;
          subject?: string;
          timezone?: string;
          title?: string;
          tutor_id?: string;
          updated_at?: string;
          zoom_link?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'scheduled_classes_relationship_id_fkey';
            columns: ['relationship_id'];
            isOneToOne: false;
            referencedRelation: 'tutor_student_assigned';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scheduled_classes_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scheduled_classes_tutor_id_fkey';
            columns: ['tutor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      stripe_webhook_events: {
        Row: {
          created_at: string;
          error_message: string | null;
          event_type: string;
          id: string;
          is_test_event: boolean;
          status: string;
          stripe_event_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          event_type: string;
          id?: string;
          is_test_event?: boolean;
          status?: string;
          stripe_event_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          event_type?: string;
          id?: string;
          is_test_event?: boolean;
          status?: string;
          stripe_event_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      student_notes: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          student_id: string;
          title: string;
          tutor_id: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          student_id: string;
          title: string;
          tutor_id: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          student_id?: string;
          title?: string;
          tutor_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      student_subscriptions: {
        Row: {
          created_at: string | null;
          credits_allocated: number;
          credits_remaining: number;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          manual_price_per_hour: number | null;
          manual_priced_classes_remaining: number | null;
          plan_id: string | null;
          status: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          student_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          credits_allocated: number;
          credits_remaining?: number;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          manual_price_per_hour?: number | null;
          manual_priced_classes_remaining?: number | null;
          plan_id?: string | null;
          status: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          student_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          credits_allocated?: number;
          credits_remaining?: number;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          manual_price_per_hour?: number | null;
          manual_priced_classes_remaining?: number | null;
          plan_id?: string | null;
          status?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          student_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'student_subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      students: {
        Row: {
          active: boolean;
          availability_windows: string[] | null;
          communication_pref:
            | Database['public']['Enums']['communication_style']
            | null;
          created_at: string;
          email: string;
          enrollment_date: string;
          grade: string | null;
          id: string;
          learning_pace: Database['public']['Enums']['learning_pace'] | null;
          name: string;
          payment_method: string | null;
          prepaid_balance: number | null;
          prepaid_class_count: number;
          primary_goal: Database['public']['Enums']['student_goal'] | null;
          session_structure_pref:
            | Database['public']['Enums']['session_structure']
            | null;
          subjects: string[];
          teaching_style_pref:
            | Database['public']['Enums']['teaching_style']
            | null;
        };
        Insert: {
          active?: boolean;
          availability_windows?: string[] | null;
          communication_pref?:
            | Database['public']['Enums']['communication_style']
            | null;
          created_at?: string;
          email: string;
          enrollment_date?: string;
          grade?: string | null;
          id?: string;
          learning_pace?: Database['public']['Enums']['learning_pace'] | null;
          name: string;
          payment_method?: string | null;
          prepaid_balance?: number | null;
          prepaid_class_count?: number;
          primary_goal?: Database['public']['Enums']['student_goal'] | null;
          session_structure_pref?:
            | Database['public']['Enums']['session_structure']
            | null;
          subjects?: string[];
          teaching_style_pref?:
            | Database['public']['Enums']['teaching_style']
            | null;
        };
        Update: {
          active?: boolean;
          availability_windows?: string[] | null;
          communication_pref?:
            | Database['public']['Enums']['communication_style']
            | null;
          created_at?: string;
          email?: string;
          enrollment_date?: string;
          grade?: string | null;
          id?: string;
          learning_pace?: Database['public']['Enums']['learning_pace'] | null;
          name?: string;
          payment_method?: string | null;
          prepaid_balance?: number | null;
          prepaid_class_count?: number;
          primary_goal?: Database['public']['Enums']['student_goal'] | null;
          session_structure_pref?:
            | Database['public']['Enums']['session_structure']
            | null;
          subjects?: string[];
          teaching_style_pref?:
            | Database['public']['Enums']['teaching_style']
            | null;
        };
        Relationships: [];
      };
      subscription_plans: {
        Row: {
          active: boolean | null;
          classes_per_month: number;
          created_at: string | null;
          description: string | null;
          features: string[] | null;
          id: string;
          monthly_price: number;
          name: string;
          price_per_hour: number;
          stripe_price_id: string;
          stripe_product_id: string;
        };
        Insert: {
          active?: boolean | null;
          classes_per_month: number;
          created_at?: string | null;
          description?: string | null;
          features?: string[] | null;
          id?: string;
          monthly_price: number;
          name: string;
          price_per_hour: number;
          stripe_price_id: string;
          stripe_product_id: string;
        };
        Update: {
          active?: boolean | null;
          classes_per_month?: number;
          created_at?: string | null;
          description?: string | null;
          features?: string[] | null;
          id?: string;
          monthly_price?: number;
          name?: string;
          price_per_hour?: number;
          stripe_price_id?: string;
          stripe_product_id?: string;
        };
        Relationships: [];
      };
      tutor_payroll_runs: {
        Row: {
          amount_paid: number;
          class_count: number;
          class_ids: string[];
          created_at: string | null;
          id: string;
          paid_at: string;
          tutor_name: string;
          tutor_user_id: string | null;
        };
        Insert: {
          amount_paid: number;
          class_count: number;
          class_ids: string[];
          created_at?: string | null;
          id?: string;
          paid_at?: string;
          tutor_name: string;
          tutor_user_id?: string | null;
        };
        Update: {
          amount_paid?: number;
          class_count?: number;
          class_ids?: string[];
          created_at?: string | null;
          id?: string;
          paid_at?: string;
          tutor_name?: string;
          tutor_user_id?: string | null;
        };
        Relationships: [];
      };
      tutor_student_assigned: {
        Row: {
          active: boolean;
          assigned_at: string;
          id: string;
          student_id: string;
          subject: string | null;
          tutor_id: string;
        };
        Insert: {
          active?: boolean;
          assigned_at?: string;
          id?: string;
          student_id: string;
          subject?: string | null;
          tutor_id: string;
        };
        Update: {
          active?: boolean;
          assigned_at?: string;
          id?: string;
          student_id?: string;
          subject?: string | null;
          tutor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tutor_student_assigned_student_fk';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tutor_student_assigned_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tutor_student_assigned_tutor_fk';
            columns: ['tutor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tutor_student_assigned_tutor_id_fkey';
            columns: ['tutor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tutors: {
        Row: {
          active: boolean;
          availability_windows: string[] | null;
          created_at: string;
          email: string;
          grade_level_comfort: string[] | null;
          hourly_rate: number | null;
          id: string;
          name: string;
          pace_flexibility: boolean | null;
          preferred_pace: Database['public']['Enums']['learning_pace'] | null;
          session_structure:
            | Database['public']['Enums']['session_structure']
            | null;
          specialty_focus:
            | Database['public']['Enums']['tutor_specialty']
            | null;
          subjects: string[] | null;
          teaching_style_strength:
            | Database['public']['Enums']['teaching_style']
            | null;
        };
        Insert: {
          active?: boolean;
          availability_windows?: string[] | null;
          created_at?: string;
          email: string;
          grade_level_comfort?: string[] | null;
          hourly_rate?: number | null;
          id?: string;
          name: string;
          pace_flexibility?: boolean | null;
          preferred_pace?: Database['public']['Enums']['learning_pace'] | null;
          session_structure?:
            | Database['public']['Enums']['session_structure']
            | null;
          specialty_focus?:
            | Database['public']['Enums']['tutor_specialty']
            | null;
          subjects?: string[] | null;
          teaching_style_strength?:
            | Database['public']['Enums']['teaching_style']
            | null;
        };
        Update: {
          active?: boolean;
          availability_windows?: string[] | null;
          created_at?: string;
          email?: string;
          grade_level_comfort?: string[] | null;
          hourly_rate?: number | null;
          id?: string;
          name?: string;
          pace_flexibility?: boolean | null;
          preferred_pace?: Database['public']['Enums']['learning_pace'] | null;
          session_structure?:
            | Database['public']['Enums']['session_structure']
            | null;
          specialty_focus?:
            | Database['public']['Enums']['tutor_specialty']
            | null;
          subjects?: string[] | null;
          teaching_style_strength?:
            | Database['public']['Enums']['teaching_style']
            | null;
        };
        Relationships: [];
      };
    };
    Views: {
      credit_discrepancies: {
        Row: {
          difference: number | null;
          ledger_credits: number | null;
          student_id: string | null;
          subscription_credits: number | null;
          subscription_id: string | null;
        };
        Insert: {
          difference?: never;
          ledger_credits?: never;
          student_id?: string | null;
          subscription_credits?: number | null;
          subscription_id?: string | null;
        };
        Update: {
          difference?: never;
          ledger_credits?: never;
          student_id?: string | null;
          subscription_credits?: number | null;
          subscription_id?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_guardian_invite: {
        Args: { p_guardian_id: string; p_token: string };
        Returns: Json;
      };
      admin_unlink_guardian: { Args: { p_student_id: string }; Returns: Json };
      apply_credit_ledger_entry: {
        Args: {
          p_allow_negative?: boolean;
          p_amount: number;
          p_dollar_amount?: number;
          p_invoice_id?: string;
          p_reason: string;
          p_related_class_id?: string;
          p_student_id: string;
          p_subscription_id: string;
          p_transaction_type: string;
        };
        Returns: Json;
      };
      become_family_account: { Args: never; Returns: Json };
      billing_account_for: { Args: { p_student_id: string }; Returns: string };
      can_message_pair: {
        Args: { p_student_id: string; p_tutor_id: string };
        Returns: boolean;
      };
      can_view_thread: { Args: { p_thread_id: string }; Returns: boolean };
      cancel_my_guardian_invite: { Args: never; Returns: Json };
      check_username: { Args: { p_username: string }; Returns: Json };
      claim_message_alerts: {
        Args: { p_message_id: string };
        Returns: {
          profile_id: string;
          role: string;
        }[];
      };
      clear_must_change_password: { Args: never; Returns: undefined };
      complete_class_atomic: {
        Args: {
          p_additional_info: string;
          p_class_id: string;
          p_class_number: string;
          p_content: string;
          p_credits_charged?: number;
          p_date: string;
          p_day: string;
          p_hw: string;
          p_student_name: string;
          p_subject: string;
          p_time_cst: string;
          p_time_hrs: string;
          p_tutor_name: string;
        };
        Returns: Json;
      };
      convert_account_to_family: {
        Args: {
          p_account_id: string;
          p_child_id: string;
          p_dry_run?: boolean;
          p_parent_first_name: string;
          p_parent_last_name: string;
        };
        Returns: Json;
      };
      create_guardian_invite: {
        Args: { p_email: string; p_student_id: string };
        Returns: Json;
      };
      demote_tutor_to_student: {
        Args: { reason?: string; tutor_user_id: string };
        Returns: Json;
      };
      generate_class_notifications: { Args: never; Returns: undefined };
      generate_username: {
        Args: { p_email: string; p_first: string; p_last: string };
        Returns: string;
      };
      get_at_risk_students: {
        Args: never;
        Returns: {
          credits_remaining: number;
          days_since_class: number;
          email: string;
          last_class_date: string;
          profile_id: string;
          student_name: string;
        }[];
      };
      get_auth_user_display_name: { Args: never; Returns: string };
      get_auth_user_email: { Args: never; Returns: string };
      get_auth_user_role: { Args: never; Returns: string };
      get_child_calendar_feed_token: {
        Args: { p_student_id: string };
        Returns: string;
      };
      get_class_log_totals: {
        Args: { p_date?: string; p_payment_filter?: string; p_search?: string };
        Returns: Json;
      };
      get_family_hours_history: {
        Args: { p_limit?: number };
        Returns: {
          amount: number;
          balance_after: number;
          created_at: string;
          id: string;
          reason: string;
          student_first_name: string;
          student_id: string;
          transaction_type: string;
        }[];
      };
      get_messageable_pairs: {
        Args: never;
        Returns: {
          student_id: string;
          student_name: string;
          tutor_id: string;
          tutor_name: string;
        }[];
      };
      get_my_calendar_feed_token: { Args: never; Returns: string };
      get_my_children: {
        Args: never;
        Returns: {
          first_name: string;
          grade: string;
          hours_visible: boolean;
          last_name: string;
          linked_at: string;
          managed: boolean;
          notification_email: string;
          student_id: string;
          timezone: string;
          username: string;
        }[];
      };
      get_my_family_status: { Args: never; Returns: Json };
      get_my_hours_activity: {
        Args: { p_limit?: number };
        Returns: {
          amount: number;
          balance_after: number;
          created_at: string;
          id: string;
          reason: string;
        }[];
      };
      get_my_payroll_history: {
        Args: never;
        Returns: {
          amount_paid: number;
          class_count: number;
          created_at: string;
          id: string;
          paid_at: string;
        }[];
      };
      get_my_pending_guardian_invites: {
        Args: never;
        Returns: {
          created_at: string;
          expires_at: string;
          student_first_name: string;
          student_last_name: string;
          token: string;
        }[];
      };
      get_my_threads: {
        Args: never;
        Returns: {
          can_post: boolean;
          last_message_at: string;
          last_message_preview: string;
          last_sender_name: string;
          my_role: string;
          student_id: string;
          student_name: string;
          thread_id: string;
          tutor_id: string;
          tutor_name: string;
          unread_count: number;
        }[];
      };
      get_or_create_thread: {
        Args: { p_student_id: string; p_tutor_id: string };
        Returns: string;
      };
      get_public_referral_code: {
        Args: { p_code: string };
        Returns: {
          active: boolean;
          code: string;
          discount_amount: number;
          discount_type: string;
          expires_at: string;
          max_uses: number;
          referrer_first_name: string;
          referrer_last_name: string;
          times_used: number;
        }[];
      };
      get_referral_usage_stats: {
        Args: { p_user_id: string };
        Returns: {
          hours_earned: number;
          latest_usage: string;
          times_used: number;
        }[];
      };
      get_student_classes: {
        Args: { requesting_user_id?: string };
        Returns: {
          attendance: string;
          date: string;
          end_time: string;
          id: string;
          notes: string;
          start_time: string;
          status: string;
          student_id: string;
          student_name: string;
          subject: string;
          title: string;
          tutor_id: string;
          tutor_name: string;
          zoom_link: string;
        }[];
      };
      get_student_credit_balance: {
        Args: { p_student_id: string };
        Returns: number;
      };
      get_student_login_status: {
        Args: { p_student_id: string };
        Returns: Json;
      };
      get_students_credit_summary: {
        Args: never;
        Returns: {
          credits: number;
          last_class_date: string;
          profile_id: string;
          student_name: string;
        }[];
      };
      get_thread_messages: {
        Args: { p_limit?: number; p_thread_id: string };
        Returns: {
          body: string;
          created_at: string;
          id: string;
          sender_id: string;
          sender_name: string;
          sender_role: string;
        }[];
      };
      get_thread_participants: {
        Args: { p_thread_id: string };
        Returns: {
          name: string;
          profile_id: string;
          role: string;
        }[];
      };
      get_tomorrow_scheduled_classes: {
        Args: never;
        Returns: {
          class_date: string;
          class_id: string;
          class_start: string;
          end_at: string;
          start_at: string;
          student_email: string;
          student_id: string;
          student_name: string;
          student_notify_reminders: boolean;
          student_timezone: string;
          subject: string;
          title: string;
          tutor_email: string;
          tutor_id: string;
          tutor_name: string;
          tutor_notify_reminders: boolean;
          tutor_timezone: string;
          zoom_link: string;
        }[];
      };
      get_tutor_student_relationships: {
        Args: { tutor_uuid: string };
        Returns: {
          relationship_id: string;
          student_id: string;
          student_name: string;
          tutor_id: string;
        }[];
      };
      get_tutor_students_by_email: {
        Args: { requesting_user_id?: string };
        Returns: {
          active: boolean;
          assigned_at: string;
          grade: string;
          student_email: string;
          student_id: string;
          student_name: string;
          subjects: string[];
          tutor_id: string;
          tutor_name: string;
        }[];
      };
      get_tutor_unpaid_summary: {
        Args: never;
        Returns: {
          class_ids: string[];
          last_payment_date: string;
          total_owed: number;
          tutor_name: string;
          tutor_user_id: string;
          unpaid_count: number;
        }[];
      };
      get_unread_message_count: { Args: never; Returns: number };
      get_zero_credit_upcoming_students: {
        Args: never;
        Returns: {
          credits_remaining: number;
          email: string;
          next_class_date: string;
          next_class_title: string;
          profile_id: string;
          student_name: string;
        }[];
      };
      guardian_of: { Args: { p_student_id: string }; Returns: string };
      handle_rest_get_ics: { Args: { request: Json }; Returns: Json };
      has_guardian: { Args: { p_user_id: string }; Returns: boolean };
      has_student_history: { Args: { p_user_id: string }; Returns: boolean };
      is_guardian_of: { Args: { p_student_id: string }; Returns: boolean };
      log_critical_security_event: {
        Args: { details?: Json; event_type: string; user_id: string };
        Returns: undefined;
      };
      log_enhanced_security_event: {
        Args: { operation_type: string; row_id?: string; target_table: string };
        Returns: undefined;
      };
      login_email_for_username: {
        Args: { p_username: string };
        Returns: string;
      };
      mark_thread_read: { Args: { p_thread_id: string }; Returns: undefined };
      my_child_ids: { Args: never; Returns: string[] };
      notification_target_for: {
        Args: { p_category: string; p_profile_id: string };
        Returns: {
          email: string;
          email_enabled: boolean;
          first_name: string;
          last_name: string;
          phone: string;
          sms_enabled: boolean;
          timezone: string;
          user_id: string;
        }[];
      };
      notification_targets: {
        Args: { p_category: string; p_student_id: string };
        Returns: {
          email: string;
          email_enabled: boolean;
          first_name: string;
          is_guardian: boolean;
          last_name: string;
          phone: string;
          sms_enabled: boolean;
          timezone: string;
          user_id: string;
        }[];
      };
      post_message: {
        Args: { p_body: string; p_thread_id: string };
        Returns: string;
      };
      promote_student_to_tutor: {
        Args: { reason?: string; student_user_id: string };
        Returns: Json;
      };
      register_managed_student: {
        Args: {
          p_grade: string;
          p_guardian_id: string;
          p_notification_email: string;
          p_student_id: string;
        };
        Returns: Json;
      };
      require_admin_access: { Args: never; Returns: undefined };
      reverse_class_debit: {
        Args: { p_class_id: string; p_reason: string; p_student_id: string };
        Returns: Json;
      };
      rotate_child_calendar_feed_token: {
        Args: { p_student_id: string };
        Returns: string;
      };
      rotate_my_calendar_feed_token: { Args: never; Returns: string };
      set_my_username: { Args: { p_username: string }; Returns: Json };
      set_student_hours_visibility: {
        Args: { p_student_id: string; p_visible: boolean };
        Returns: Json;
      };
      student_notification_recipients: {
        Args: { p_category: string; p_student_id: string };
        Returns: {
          email: string;
          first_name: string;
          is_guardian: boolean;
          last_name: string;
          notify_class_reminders: boolean;
          notify_low_credits: boolean;
          timezone: string;
          user_id: string;
        }[];
      };
      sync_user_roles: { Args: never; Returns: Json };
      thread_role: {
        Args: { p_profile_id: string; p_thread_id: string };
        Returns: string;
      };
      update_my_child: {
        Args: {
          p_first_name: string;
          p_grade: string;
          p_last_name: string;
          p_notification_email: string;
          p_student_id: string;
        };
        Returns: Json;
      };
      username_problem: { Args: { p_username: string }; Returns: string };
    };
    Enums: {
      app_role: 'student' | 'tutor' | 'admin' | 'parent';
      communication_style: 'encouraging' | 'direct' | 'balanced';
      learning_pace: 'slow' | 'moderate' | 'fast';
      session_structure: 'structured' | 'flexible' | 'mixed';
      student_goal: 'catch_up' | 'maintain' | 'get_ahead' | 'test_prep';
      teaching_style: 'visual' | 'verbal' | 'hands_on' | 'mixed';
      tutor_specialty: 'struggling' | 'maintaining' | 'advanced' | 'all';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          lifecycle_configuration: Json | null;
          lifecycle_configuration_generation: string | null;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string | null;
          versioning_status: string;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          lifecycle_configuration?: Json | null;
          lifecycle_configuration_generation?: string | null;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
          versioning_status?: string;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          lifecycle_configuration?: Json | null;
          lifecycle_configuration_generation?: string | null;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
          versioning_status?: string;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          archived_at: string | null;
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          archived_at?: string | null;
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_delete_marker?: boolean;
          is_versioned?: boolean;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          archived_at?: string | null;
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_delete_marker?: boolean;
          is_versioned?: boolean;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 's3_multipart_uploads';
            referencedColumns: ['id'];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vector_indexes_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_vectors';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_size_by_bucket: {
        Args: { delete_markers?: string; noncurrent_versions?: string };
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
          raw_prefix_param?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delete_markers?: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          next_token_archived_at?: string;
          next_token_version?: string;
          noncurrent_versions?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          archived_at: string;
          created_at: string;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
          version: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          delete_markers?: string;
          levels?: number;
          limits?: number;
          noncurrent_versions?: string;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          archived_at: string;
          created_at: string;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
          version: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          delete_markers?: string;
          noncurrent_versions?: string;
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
          p_start_after_version?: string;
        };
        Returns: {
          archived_at: string;
          created_at: string;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
          version: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          delete_markers?: string;
          levels?: number;
          limits?: number;
          noncurrent_versions?: string;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
          start_after_archived_at?: string;
          start_after_is_continuation?: boolean;
          start_after_version?: string;
        };
        Returns: {
          archived_at: string;
          created_at: string;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
          version: string;
        }[];
      };
    };
    Enums: {
      buckettype: 'STANDARD' | 'ANALYTICS' | 'VECTOR';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ['student', 'tutor', 'admin', 'parent'],
      communication_style: ['encouraging', 'direct', 'balanced'],
      learning_pace: ['slow', 'moderate', 'fast'],
      session_structure: ['structured', 'flexible', 'mixed'],
      student_goal: ['catch_up', 'maintain', 'get_ahead', 'test_prep'],
      teaching_style: ['visual', 'verbal', 'hands_on', 'mixed'],
      tutor_specialty: ['struggling', 'maintaining', 'advanced', 'all'],
    },
  },
  storage: {
    Enums: {
      buckettype: ['STANDARD', 'ANALYTICS', 'VECTOR'],
    },
  },
} as const;
