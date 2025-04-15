export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      class_logs: {
        Row: {
          id: string;
          class_number: string;
          tutor_name: string;
          student_name: string;
          date: string;
          day: string;
          time_cst: string;
          time_hrs: string;
          subject: string;
          content: string | null;
          hw: string | null;
          class_id: string;
          class_cost: string | null;
          tutor_cost: string | null;
          student_payment: string | null;
          tutor_payment: string | null;
          additional_info: string | null;
        }
        Insert: {
          id?: string;
          class_number: string;
          tutor_name: string;
          student_name: string;
          date: string;
          day: string;
          time_cst: string;
          time_hrs: string;
          subject: string;
          content?: string | null;
          hw?: string | null;
          class_id: string;
          class_cost?: string | null;
          tutor_cost?: string | null;
          student_payment?: string | null;
          tutor_payment?: string | null;
          additional_info?: string | null;
        }
        Update: {
          id?: string;
          class_number?: string;
          tutor_name?: string;
          student_name?: string;
          date?: string;
          day?: string;
          time_cst?: string;
          time_hrs?: string;
          subject?: string;
          content?: string | null;
          hw?: string | null;
          class_id?: string;
          class_cost?: string | null;
          tutor_cost?: string | null;
          student_payment?: string | null;
          tutor_payment?: string | null;
          additional_info?: string | null;
        }
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
