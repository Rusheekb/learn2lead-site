export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      access_audit_log: {
        Row: {
          accessed_at: string | null
          id: string
          ip_address: unknown | null
          operation: string
          row_id: string | null
          sensitive_data_accessed: boolean | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accessed_at?: string | null
          id?: string
          ip_address?: unknown | null
          operation: string
          row_id?: string | null
          sensitive_data_accessed?: boolean | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accessed_at?: string | null
          id?: string
          ip_address?: unknown | null
          operation?: string
          row_id?: string | null
          sensitive_data_accessed?: boolean | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_action_log: {
        Row: {
          action_type: string
          admin_id: string
          approved_at: string | null
          approved_by: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          performed_at: string | null
          requires_approval: boolean | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          approved_at?: string | null
          approved_by?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          performed_at?: string | null
          requires_approval?: boolean | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          approved_at?: string | null
          approved_by?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          performed_at?: string | null
          requires_approval?: boolean | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_action_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_action_log_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_logs: {
        Row: {
          created_at: string
          created_by: string
          error_message: string | null
          file_path: string | null
          id: string
          name: string
          restored_from: string | null
          size_bytes: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          error_message?: string | null
          file_path?: string | null
          id?: string
          name: string
          restored_from?: string | null
          size_bytes?: number | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          error_message?: string | null
          file_path?: string | null
          id?: string
          name?: string
          restored_from?: string | null
          size_bytes?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_logs_restored_from_fkey"
            columns: ["restored_from"]
            isOneToOne: false
            referencedRelation: "backup_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      class_logs: {
        Row: {
          "Additional Info": string | null
          "Class Cost": string | null
          "Class ID": string | null
          "Class Number": string | null
          Content: string | null
          Date: string
          Day: string | null
          HW: string | null
          id: string
          "Student Name": string | null
          "Student Payment": string | null
          Subject: string | null
          "Time (CST)": string | null
          "Time (hrs)": string | null
          "Tutor Cost": string | null
          "Tutor Name": string | null
          "Tutor Payment": string | null
        }
        Insert: {
          "Additional Info"?: string | null
          "Class Cost"?: string | null
          "Class ID"?: string | null
          "Class Number"?: string | null
          Content?: string | null
          Date: string
          Day?: string | null
          HW?: string | null
          id?: string
          "Student Name"?: string | null
          "Student Payment"?: string | null
          Subject?: string | null
          "Time (CST)"?: string | null
          "Time (hrs)"?: string | null
          "Tutor Cost"?: string | null
          "Tutor Name"?: string | null
          "Tutor Payment"?: string | null
        }
        Update: {
          "Additional Info"?: string | null
          "Class Cost"?: string | null
          "Class ID"?: string | null
          "Class Number"?: string | null
          Content?: string | null
          Date?: string
          Day?: string | null
          HW?: string | null
          id?: string
          "Student Name"?: string | null
          "Student Payment"?: string | null
          Subject?: string | null
          "Time (CST)"?: string | null
          "Time (hrs)"?: string | null
          "Tutor Cost"?: string | null
          "Tutor Name"?: string | null
          "Tutor Payment"?: string | null
        }
        Relationships: []
      }
      class_messages: {
        Row: {
          class_id: string
          id: string
          is_read: boolean
          message: string
          student_name: string
          timestamp: string
        }
        Insert: {
          class_id: string
          id?: string
          is_read?: boolean
          message: string
          student_name: string
          timestamp?: string
        }
        Update: {
          class_id?: string
          id?: string
          is_read?: boolean
          message?: string
          student_name?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      class_uploads: {
        Row: {
          class_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: string
          id: string
          note: string | null
          student_name: string
          upload_date: string
        }
        Insert: {
          class_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: string
          id?: string
          note?: string | null
          student_name: string
          upload_date: string
        }
        Update: {
          class_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: string
          id?: string
          note?: string | null
          student_name?: string
          upload_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_uploads_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_shares: {
        Row: {
          content_type: string | null
          description: string | null
          file_path: string | null
          id: string
          receiver_id: string
          sender_id: string
          shared_at: string
          title: string
          viewed_at: string | null
        }
        Insert: {
          content_type?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          shared_at?: string
          title: string
          viewed_at?: string | null
        }
        Update: {
          content_type?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          shared_at?: string
          title?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      file_validation_logs: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          id: string
          mime_type: string
          user_id: string | null
          validation_details: Json | null
          validation_status: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          user_id?: string | null
          validation_details?: Json | null
          validation_status: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          user_id?: string | null
          validation_details?: Json | null
          validation_status?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          calendar_feed_id: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          calendar_feed_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          calendar_feed_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      role_change_audit: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          ip_address: unknown | null
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"] | null
          reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown | null
          new_role: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown | null
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_change_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_classes: {
        Row: {
          attendance: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          materials_url: string[] | null
          notes: string | null
          relationship_id: string | null
          reminder_sent: boolean | null
          start_time: string
          status: string
          student_id: string
          subject: string
          title: string
          tutor_id: string
          updated_at: string
          zoom_link: string | null
        }
        Insert: {
          attendance?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          materials_url?: string[] | null
          notes?: string | null
          relationship_id?: string | null
          reminder_sent?: boolean | null
          start_time: string
          status?: string
          student_id: string
          subject: string
          title: string
          tutor_id: string
          updated_at?: string
          zoom_link?: string | null
        }
        Update: {
          attendance?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          materials_url?: string[] | null
          notes?: string | null
          relationship_id?: string | null
          reminder_sent?: boolean | null
          start_time?: string
          status?: string
          student_id?: string
          subject?: string
          title?: string
          tutor_id?: string
          updated_at?: string
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_classes_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "tutor_student_assigned"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_classes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          active: boolean
          created_at: string
          email: string
          enrollment_date: string
          grade: string | null
          id: string
          name: string
          payment_status: string
          subjects: string[]
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          enrollment_date?: string
          grade?: string | null
          id?: string
          name: string
          payment_status?: string
          subjects?: string[]
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          enrollment_date?: string
          grade?: string | null
          id?: string
          name?: string
          payment_status?: string
          subjects?: string[]
        }
        Relationships: []
      }
      tutor_student_assigned: {
        Row: {
          active: boolean
          assigned_at: string
          id: string
          student_id: string
          subject: string | null
          tutor_id: string
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          id?: string
          student_id: string
          subject?: string | null
          tutor_id: string
        }
        Update: {
          active?: boolean
          assigned_at?: string
          id?: string
          student_id?: string
          subject?: string | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_student_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_student_relationships_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      tutors: {
        Row: {
          active: boolean
          created_at: string
          email: string
          hourly_rate: number | null
          id: string
          name: string
          subjects: string[] | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          hourly_rate?: number | null
          id?: string
          name: string
          subjects?: string[] | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          hourly_rate?: number | null
          id?: string
          name?: string
          subjects?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      student_classes: {
        Row: {
          attendance: string | null
          date: string | null
          end_time: string | null
          id: string | null
          notes: string | null
          start_time: string | null
          status: string | null
          student_id: string | null
          student_name: string | null
          subject: string | null
          title: string | null
          tutor_id: string | null
          tutor_name: string | null
          zoom_link: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_classes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_students: {
        Row: {
          active: boolean | null
          assigned_at: string | null
          grade: string | null
          payment_status: string | null
          student_id: string | null
          student_name: string | null
          subjects: string[] | null
          tutor_id: string | null
          tutor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_student_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_student_relationships_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_upcoming_classes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_class_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_auth_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_ics_feed: {
        Args: { feed_id: string }
        Returns: string
      }
      get_student_classes: {
        Args: { requesting_user_id?: string }
        Returns: {
          attendance: string
          date: string
          end_time: string
          id: string
          notes: string
          start_time: string
          status: string
          student_id: string
          student_name: string
          subject: string
          title: string
          tutor_id: string
          tutor_name: string
          zoom_link: string
        }[]
      }
      get_tutor_student_relationships: {
        Args: { tutor_uuid: string }
        Returns: {
          relationship_id: string
          student_id: string
          student_name: string
          tutor_id: string
        }[]
      }
      get_tutor_students: {
        Args: { requesting_user_id?: string }
        Returns: {
          active: boolean
          assigned_at: string
          grade: string
          payment_status: string
          student_id: string
          student_name: string
          subjects: string[]
          tutor_id: string
          tutor_name: string
        }[]
      }
      get_user_calendar_events: {
        Args: { user_id: string }
        Returns: string
      }
      handle_rest_get_ics: {
        Args: { request: Json }
        Returns: Json
      }
      log_sensitive_access: {
        Args: { operation: string; row_id?: string; table_name: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "student" | "tutor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "tutor", "admin"],
    },
  },
} as const
