export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      class_logs: {
        Row: {
          "Additional Info": string | null
          "Class Cost": string | null
          "Class ID": string | null
          "Class Number": string | null
          Content: string | null
          Date: string | null
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
          Date?: string | null
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
          Date?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
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
      scheduled_classes: {
        Row: {
          attendance: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          notes: string | null
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
          notes?: string | null
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
          notes?: string | null
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
            foreignKeyName: "scheduled_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_classes"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "scheduled_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "tutor_students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "scheduled_classes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "student_classes"
            referencedColumns: ["tutor_id"]
          },
          {
            foreignKeyName: "scheduled_classes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_students"
            referencedColumns: ["tutor_id"]
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
      tutor_student_relationships: {
        Row: {
          active: boolean
          assigned_at: string
          assigned_by: string | null
          id: string
          student_id: string
          tutor_id: string
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          student_id: string
          tutor_id: string
        }
        Update: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          student_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_student_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_classes"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "tutor_student_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_student_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "tutor_students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "tutor_student_relationships_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "student_classes"
            referencedColumns: ["tutor_id"]
          },
          {
            foreignKeyName: "tutor_student_relationships_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_students"
            referencedColumns: ["tutor_id"]
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
        Relationships: []
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
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "student" | "tutor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
