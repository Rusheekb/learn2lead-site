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
            referencedRelation: "scheduled_classes"
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
          changed_by: string
          created_at: string | null
          id: string
          new_role: string
          old_role: string
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          id?: string
          new_role: string
          old_role: string
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          id?: string
          new_role?: string
          old_role?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
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
      student_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          student_id: string
          title: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          student_id: string
          title: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          student_id?: string
          title?: string
          tutor_id?: string
          updated_at?: string
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
      [_ in never]: never
    }
    Functions: {
      check_upcoming_classes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      complete_class_atomic: {
        Args: {
          p_additional_info: string
          p_class_id: string
          p_class_number: string
          p_content: string
          p_date: string
          p_day: string
          p_hw: string
          p_student_name: string
          p_subject: string
          p_time_cst: string
          p_time_hrs: string
          p_tutor_name: string
        }
        Returns: Json
      }
      demote_tutor_to_student: {
        Args: { reason?: string; tutor_user_id: string }
        Returns: Json
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
      log_critical_security_event: {
        Args: { details?: Json; event_type: string; user_id: string }
        Returns: undefined
      }
      log_enhanced_security_event: {
        Args: { operation_type: string; row_id?: string; target_table: string }
        Returns: undefined
      }
      promote_student_to_tutor: {
        Args: { reason?: string; student_user_id: string }
        Returns: Json
      }
      require_admin_access: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_user_roles: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_file_access_permissions: {
        Args: { file_path: string; requested_by?: string }
        Returns: boolean
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
