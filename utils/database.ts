export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  address_schema: {
    Tables: {
      barangay_table: {
        Row: {
          barangay: string;
          barangay_city_id: string;
          barangay_id: string;
          barangay_is_available: boolean;
          barangay_is_disabled: boolean;
          barangay_zip_code: string;
        };
        Insert: {
          barangay: string;
          barangay_city_id: string;
          barangay_id?: string;
          barangay_is_available?: boolean;
          barangay_is_disabled?: boolean;
          barangay_zip_code: string;
        };
        Update: {
          barangay?: string;
          barangay_city_id?: string;
          barangay_id?: string;
          barangay_is_available?: boolean;
          barangay_is_disabled?: boolean;
          barangay_zip_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "barangay_table_barangay_city_id_fkey";
            columns: ["barangay_city_id"];
            isOneToOne: false;
            referencedRelation: "city_table";
            referencedColumns: ["city_id"];
          },
        ];
      };
      city_table: {
        Row: {
          city: string;
          city_id: string;
          city_is_available: boolean;
          city_is_disabled: boolean;
          city_province_id: string;
        };
        Insert: {
          city: string;
          city_id?: string;
          city_is_available?: boolean;
          city_is_disabled?: boolean;
          city_province_id: string;
        };
        Update: {
          city?: string;
          city_id?: string;
          city_is_available?: boolean;
          city_is_disabled?: boolean;
          city_province_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "city_table_city_province_id_fkey";
            columns: ["city_province_id"];
            isOneToOne: false;
            referencedRelation: "province_table";
            referencedColumns: ["province_id"];
          },
        ];
      };
      province_table: {
        Row: {
          province: string;
          province_id: string;
          province_is_available: boolean;
          province_is_disabled: boolean;
          province_region_id: string;
        };
        Insert: {
          province: string;
          province_id?: string;
          province_is_available?: boolean;
          province_is_disabled?: boolean;
          province_region_id: string;
        };
        Update: {
          province?: string;
          province_id?: string;
          province_is_available?: boolean;
          province_is_disabled?: boolean;
          province_region_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "province_table_province_region_id_fkey";
            columns: ["province_region_id"];
            isOneToOne: false;
            referencedRelation: "region_table";
            referencedColumns: ["region_id"];
          },
        ];
      };
      region_table: {
        Row: {
          region: string;
          region_id: string;
          region_is_available: boolean;
          region_is_disabled: boolean;
        };
        Insert: {
          region: string;
          region_id?: string;
          region_is_available?: boolean;
          region_is_disabled?: boolean;
        };
        Update: {
          region?: string;
          region_id?: string;
          region_is_available?: boolean;
          region_is_disabled?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activity_log_table: {
        Row: {
          activity_action: Database["public"]["Enums"]["activity_action"];
          activity_created_at: string;
          activity_details: Json;
          activity_entity_id: string | null;
          activity_entity_type:
            | Database["public"]["Enums"]["activity_entity_type"]
            | null;
          activity_ip_address: string | null;
          activity_log_id: string;
          activity_type: Database["public"]["Enums"]["activity_type"];
          activity_user_agent: string | null;
          user_id: string;
        };
        Insert: {
          activity_action: Database["public"]["Enums"]["activity_action"];
          activity_created_at?: string;
          activity_details: Json;
          activity_entity_id?: string | null;
          activity_entity_type?:
            | Database["public"]["Enums"]["activity_entity_type"]
            | null;
          activity_ip_address?: string | null;
          activity_log_id?: string;
          activity_type: Database["public"]["Enums"]["activity_type"];
          activity_user_agent?: string | null;
          user_id: string;
        };
        Update: {
          activity_action?: Database["public"]["Enums"]["activity_action"];
          activity_created_at?: string;
          activity_details?: Json;
          activity_entity_id?: string | null;
          activity_entity_type?:
            | Database["public"]["Enums"]["activity_entity_type"]
            | null;
          activity_ip_address?: string | null;
          activity_log_id?: string;
          activity_type?: Database["public"]["Enums"]["activity_type"];
          activity_user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_table_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
        ];
      };
      error_log_table: {
        Row: {
          error_code: Database["public"]["Enums"]["error_code"] | null;
          error_created_at: string;
          error_details: Json | null;
          error_log_id: string;
          error_message: string;
          error_resolution_notes: string | null;
          error_resolved: boolean | null;
          error_resolved_at: string | null;
          error_resolved_by: string | null;
          error_stack: string | null;
          error_type: Database["public"]["Enums"]["error_type"];
          ip_address: string | null;
          request_body: Json | null;
          request_headers: Json | null;
          request_method: string | null;
          request_path: string | null;
          response_status: number | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          error_code?: Database["public"]["Enums"]["error_code"] | null;
          error_created_at?: string;
          error_details?: Json | null;
          error_log_id?: string;
          error_message: string;
          error_resolution_notes?: string | null;
          error_resolved?: boolean | null;
          error_resolved_at?: string | null;
          error_resolved_by?: string | null;
          error_stack?: string | null;
          error_type: Database["public"]["Enums"]["error_type"];
          ip_address?: string | null;
          request_body?: Json | null;
          request_headers?: Json | null;
          request_method?: string | null;
          request_path?: string | null;
          response_status?: number | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          error_code?: Database["public"]["Enums"]["error_code"] | null;
          error_created_at?: string;
          error_details?: Json | null;
          error_log_id?: string;
          error_message?: string;
          error_resolution_notes?: string | null;
          error_resolved?: boolean | null;
          error_resolved_at?: string | null;
          error_resolved_by?: string | null;
          error_stack?: string | null;
          error_type?: Database["public"]["Enums"]["error_type"];
          ip_address?: string | null;
          request_body?: Json | null;
          request_headers?: Json | null;
          request_method?: string | null;
          request_path?: string | null;
          response_status?: number | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "error_log_table_error_resolved_by_fkey";
            columns: ["error_resolved_by"];
            isOneToOne: false;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
          {
            foreignKeyName: "error_log_table_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
        ];
      };
      location_locker_table: {
        Row: {
          location_locker_code: string;
          location_locker_created_at: string | null;
          location_locker_deleted_at: string | null;
          location_locker_id: string;
          location_locker_is_available: boolean | null;
          mailroom_location_id: string;
        };
        Insert: {
          location_locker_code: string;
          location_locker_created_at?: string | null;
          location_locker_deleted_at?: string | null;
          location_locker_id?: string;
          location_locker_is_available?: boolean | null;
          mailroom_location_id: string;
        };
        Update: {
          location_locker_code?: string;
          location_locker_created_at?: string | null;
          location_locker_deleted_at?: string | null;
          location_locker_id?: string;
          location_locker_is_available?: boolean | null;
          mailroom_location_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "location_locker_table_mailroom_location_id_fkey";
            columns: ["mailroom_location_id"];
            isOneToOne: false;
            referencedRelation: "mailroom_location_table";
            referencedColumns: ["mailroom_location_id"];
          },
        ];
      };
      mail_action_request_table: {
        Row: {
          mail_action_request_completed_at: string | null;
          mail_action_request_created_at: string | null;
          mail_action_request_forward_3pl_name: string | null;
          mail_action_request_forward_address: string | null;
          mail_action_request_forward_tracking_number: string | null;
          mail_action_request_forward_tracking_url: string | null;
          mail_action_request_id: string;
          mail_action_request_processed_at: string | null;
          mail_action_request_processed_by: string | null;
          mail_action_request_status: Database["public"]["Enums"]["mail_action_request_status"];
          mail_action_request_type: Database["public"]["Enums"]["mail_action_request_type"];
          mail_action_request_updated_at: string | null;
          mailbox_item_id: string;
          user_id: string;
        };
        Insert: {
          mail_action_request_completed_at?: string | null;
          mail_action_request_created_at?: string | null;
          mail_action_request_forward_3pl_name?: string | null;
          mail_action_request_forward_address?: string | null;
          mail_action_request_forward_tracking_number?: string | null;
          mail_action_request_forward_tracking_url?: string | null;
          mail_action_request_id?: string;
          mail_action_request_processed_at?: string | null;
          mail_action_request_processed_by?: string | null;
          mail_action_request_status?: Database["public"]["Enums"]["mail_action_request_status"];
          mail_action_request_type: Database["public"]["Enums"]["mail_action_request_type"];
          mail_action_request_updated_at?: string | null;
          mailbox_item_id: string;
          user_id: string;
        };
        Update: {
          mail_action_request_completed_at?: string | null;
          mail_action_request_created_at?: string | null;
          mail_action_request_forward_3pl_name?: string | null;
          mail_action_request_forward_address?: string | null;
          mail_action_request_forward_tracking_number?: string | null;
          mail_action_request_forward_tracking_url?: string | null;
          mail_action_request_id?: string;
          mail_action_request_processed_at?: string | null;
          mail_action_request_processed_by?: string | null;
          mail_action_request_status?: Database["public"]["Enums"]["mail_action_request_status"];
          mail_action_request_type?: Database["public"]["Enums"]["mail_action_request_type"];
          mail_action_request_updated_at?: string | null;
          mailbox_item_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mail_action_request_table_mail_action_request_processed_by_fkey";
            columns: ["mail_action_request_processed_by"];
            isOneToOne: false;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
          {
            foreignKeyName: "mail_action_request_table_mailbox_item_id_fkey";
            columns: ["mailbox_item_id"];
            isOneToOne: false;
            referencedRelation: "mailbox_item_table";
            referencedColumns: ["mailbox_item_id"];
          },
          {
            foreignKeyName: "mail_action_request_table_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
        ];
      };
      mailbox_item_table: {
        Row: {
          location_locker_id: string | null;
          mailbox_item_created_at: string | null;
          mailbox_item_deleted_at: string | null;
          mailbox_item_id: string;
          mailbox_item_name: string | null;
          mailbox_item_photo: string | null;
          mailbox_item_received_at: string | null;
          mailbox_item_release_address: string | null;
          mailbox_item_status: Database["public"]["Enums"]["mailroom_package_status"];
          mailbox_item_type: Database["public"]["Enums"]["mailroom_package_type"];
          mailbox_item_updated_at: string | null;
          mailroom_registration_id: string;
          user_address_id: string | null;
        };
        Insert: {
          location_locker_id?: string | null;
          mailbox_item_created_at?: string | null;
          mailbox_item_deleted_at?: string | null;
          mailbox_item_id?: string;
          mailbox_item_name?: string | null;
          mailbox_item_photo?: string | null;
          mailbox_item_received_at?: string | null;
          mailbox_item_release_address?: string | null;
          mailbox_item_status?: Database["public"]["Enums"]["mailroom_package_status"];
          mailbox_item_type: Database["public"]["Enums"]["mailroom_package_type"];
          mailbox_item_updated_at?: string | null;
          mailroom_registration_id: string;
          user_address_id?: string | null;
        };
        Update: {
          location_locker_id?: string | null;
          mailbox_item_created_at?: string | null;
          mailbox_item_deleted_at?: string | null;
          mailbox_item_id?: string;
          mailbox_item_name?: string | null;
          mailbox_item_photo?: string | null;
          mailbox_item_received_at?: string | null;
          mailbox_item_release_address?: string | null;
          mailbox_item_status?: Database["public"]["Enums"]["mailroom_package_status"];
          mailbox_item_type?: Database["public"]["Enums"]["mailroom_package_type"];
          mailbox_item_updated_at?: string | null;
          mailroom_registration_id?: string;
          user_address_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "mailbox_item_table_location_locker_id_fkey";
            columns: ["location_locker_id"];
            isOneToOne: false;
            referencedRelation: "location_locker_table";
            referencedColumns: ["location_locker_id"];
          },
          {
            foreignKeyName: "mailbox_item_table_mailroom_registration_id_fkey";
            columns: ["mailroom_registration_id"];
            isOneToOne: false;
            referencedRelation: "mailroom_registration_table";
            referencedColumns: ["mailroom_registration_id"];
          },
          {
            foreignKeyName: "mailbox_item_table_user_address_id_fkey";
            columns: ["user_address_id"];
            isOneToOne: false;
            referencedRelation: "user_address_table";
            referencedColumns: ["user_address_id"];
          },
        ];
      };
      mailroom_assigned_locker_table: {
        Row: {
          location_locker_id: string;
          mailroom_assigned_locker_assigned_at: string | null;
          mailroom_assigned_locker_id: string;
          mailroom_assigned_locker_status: Database["public"]["Enums"]["mailroom_assigned_locker_status"];
          mailroom_registration_id: string;
        };
        Insert: {
          location_locker_id: string;
          mailroom_assigned_locker_assigned_at?: string | null;
          mailroom_assigned_locker_id?: string;
          mailroom_assigned_locker_status?: Database["public"]["Enums"]["mailroom_assigned_locker_status"];
          mailroom_registration_id: string;
        };
        Update: {
          location_locker_id?: string;
          mailroom_assigned_locker_assigned_at?: string | null;
          mailroom_assigned_locker_id?: string;
          mailroom_assigned_locker_status?: Database["public"]["Enums"]["mailroom_assigned_locker_status"];
          mailroom_registration_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mailroom_assigned_locker_table_location_locker_id_fkey";
            columns: ["location_locker_id"];
            isOneToOne: true;
            referencedRelation: "location_locker_table";
            referencedColumns: ["location_locker_id"];
          },
          {
            foreignKeyName: "mailroom_assigned_locker_table_mailroom_registration_id_fkey";
            columns: ["mailroom_registration_id"];
            isOneToOne: false;
            referencedRelation: "mailroom_registration_table";
            referencedColumns: ["mailroom_registration_id"];
          },
        ];
      };
      mailroom_file_table: {
        Row: {
          mailbox_item_id: string;
          mailroom_file_id: string;
          mailroom_file_mime_type: string | null;
          mailroom_file_name: string;
          mailroom_file_size_mb: number;
          mailroom_file_type: Database["public"]["Enums"]["mailroom_file_type"];
          mailroom_file_uploaded_at: string | null;
          mailroom_file_url: string;
        };
        Insert: {
          mailbox_item_id: string;
          mailroom_file_id?: string;
          mailroom_file_mime_type?: string | null;
          mailroom_file_name: string;
          mailroom_file_size_mb?: number;
          mailroom_file_type: Database["public"]["Enums"]["mailroom_file_type"];
          mailroom_file_uploaded_at?: string | null;
          mailroom_file_url: string;
        };
        Update: {
          mailbox_item_id?: string;
          mailroom_file_id?: string;
          mailroom_file_mime_type?: string | null;
          mailroom_file_name?: string;
          mailroom_file_size_mb?: number;
          mailroom_file_type?: Database["public"]["Enums"]["mailroom_file_type"];
          mailroom_file_uploaded_at?: string | null;
          mailroom_file_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mailroom_file_table_mailbox_item_id_fkey";
            columns: ["mailbox_item_id"];
            isOneToOne: false;
            referencedRelation: "mailbox_item_table";
            referencedColumns: ["mailbox_item_id"];
          },
        ];
      };
      mailroom_location_table: {
        Row: {
          mailroom_location_barangay: string | null;
          mailroom_location_city: string | null;
          mailroom_location_id: string;
          mailroom_location_name: string;
          mailroom_location_prefix: string | null;
          mailroom_location_region: string | null;
          mailroom_location_total_lockers: number;
          mailroom_location_zip: string | null;
        };
        Insert: {
          mailroom_location_barangay?: string | null;
          mailroom_location_city?: string | null;
          mailroom_location_id?: string;
          mailroom_location_name: string;
          mailroom_location_prefix?: string | null;
          mailroom_location_region?: string | null;
          mailroom_location_total_lockers?: number;
          mailroom_location_zip?: string | null;
        };
        Update: {
          mailroom_location_barangay?: string | null;
          mailroom_location_city?: string | null;
          mailroom_location_id?: string;
          mailroom_location_name?: string;
          mailroom_location_prefix?: string | null;
          mailroom_location_region?: string | null;
          mailroom_location_total_lockers?: number;
          mailroom_location_zip?: string | null;
        };
        Relationships: [];
      };
      mailroom_plan_table: {
        Row: {
          mailroom_plan_can_digitize: boolean | null;
          mailroom_plan_can_receive_mail: boolean | null;
          mailroom_plan_can_receive_parcels: boolean | null;
          mailroom_plan_description: string | null;
          mailroom_plan_id: string;
          mailroom_plan_name: string;
          mailroom_plan_price: number;
          mailroom_plan_storage_limit: number | null;
        };
        Insert: {
          mailroom_plan_can_digitize?: boolean | null;
          mailroom_plan_can_receive_mail?: boolean | null;
          mailroom_plan_can_receive_parcels?: boolean | null;
          mailroom_plan_description?: string | null;
          mailroom_plan_id?: string;
          mailroom_plan_name: string;
          mailroom_plan_price: number;
          mailroom_plan_storage_limit?: number | null;
        };
        Update: {
          mailroom_plan_can_digitize?: boolean | null;
          mailroom_plan_can_receive_mail?: boolean | null;
          mailroom_plan_can_receive_parcels?: boolean | null;
          mailroom_plan_description?: string | null;
          mailroom_plan_id?: string;
          mailroom_plan_name?: string;
          mailroom_plan_price?: number;
          mailroom_plan_storage_limit?: number | null;
        };
        Relationships: [];
      };
      mailroom_registration_table: {
        Row: {
          mailroom_location_id: string | null;
          mailroom_plan_id: string;
          mailroom_registration_code: string | null;
          mailroom_registration_created_at: string;
          mailroom_registration_id: string;
          mailroom_registration_status: boolean | null;
          mailroom_registration_updated_at: string | null;
          user_id: string;
        };
        Insert: {
          mailroom_location_id?: string | null;
          mailroom_plan_id: string;
          mailroom_registration_code?: string | null;
          mailroom_registration_created_at?: string;
          mailroom_registration_id?: string;
          mailroom_registration_status?: boolean | null;
          mailroom_registration_updated_at?: string | null;
          user_id: string;
        };
        Update: {
          mailroom_location_id?: string | null;
          mailroom_plan_id?: string;
          mailroom_registration_code?: string | null;
          mailroom_registration_created_at?: string;
          mailroom_registration_id?: string;
          mailroom_registration_status?: boolean | null;
          mailroom_registration_updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mailroom_registration_table_mailroom_location_id_fkey";
            columns: ["mailroom_location_id"];
            isOneToOne: false;
            referencedRelation: "mailroom_location_table";
            referencedColumns: ["mailroom_location_id"];
          },
          {
            foreignKeyName: "mailroom_registration_table_mailroom_plan_id_fkey";
            columns: ["mailroom_plan_id"];
            isOneToOne: false;
            referencedRelation: "mailroom_plan_table";
            referencedColumns: ["mailroom_plan_id"];
          },
          {
            foreignKeyName: "mailroom_registration_table_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
        ];
      };
      notification_table: {
        Row: {
          notification_created_at: string;
          notification_id: string;
          notification_is_read: boolean | null;
          notification_link: string | null;
          notification_message: string;
          notification_title: string;
          notification_type:
            | Database["public"]["Enums"]["notification_type"]
            | null;
          user_id: string;
        };
        Insert: {
          notification_created_at?: string;
          notification_id?: string;
          notification_is_read?: boolean | null;
          notification_link?: string | null;
          notification_message: string;
          notification_title: string;
          notification_type?:
            | Database["public"]["Enums"]["notification_type"]
            | null;
          user_id: string;
        };
        Update: {
          notification_created_at?: string;
          notification_id?: string;
          notification_is_read?: boolean | null;
          notification_link?: string | null;
          notification_message?: string;
          notification_title?: string;
          notification_type?:
            | Database["public"]["Enums"]["notification_type"]
            | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_table_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
        ];
      };
      payment_transaction_table: {
        Row: {
          mailroom_registration_id: string;
          payment_transaction_amount: number;
          payment_transaction_channel: string | null;
          payment_transaction_created_at: string | null;
          payment_transaction_date: string | null;
          payment_transaction_id: string;
          payment_transaction_method: string | null;
          payment_transaction_order_id: string | null;
          payment_transaction_reference: string | null;
          payment_transaction_reference_id: string | null;
          payment_transaction_status: Database["public"]["Enums"]["payment_status"];
          payment_transaction_type: Database["public"]["Enums"]["payment_type"];
          payment_transaction_updated_at: string | null;
        };
        Insert: {
          mailroom_registration_id: string;
          payment_transaction_amount: number;
          payment_transaction_channel?: string | null;
          payment_transaction_created_at?: string | null;
          payment_transaction_date?: string | null;
          payment_transaction_id?: string;
          payment_transaction_method?: string | null;
          payment_transaction_order_id?: string | null;
          payment_transaction_reference?: string | null;
          payment_transaction_reference_id?: string | null;
          payment_transaction_status?: Database["public"]["Enums"]["payment_status"];
          payment_transaction_type: Database["public"]["Enums"]["payment_type"];
          payment_transaction_updated_at?: string | null;
        };
        Update: {
          mailroom_registration_id?: string;
          payment_transaction_amount?: number;
          payment_transaction_channel?: string | null;
          payment_transaction_created_at?: string | null;
          payment_transaction_date?: string | null;
          payment_transaction_id?: string;
          payment_transaction_method?: string | null;
          payment_transaction_order_id?: string | null;
          payment_transaction_reference?: string | null;
          payment_transaction_reference_id?: string | null;
          payment_transaction_status?: Database["public"]["Enums"]["payment_status"];
          payment_transaction_type?: Database["public"]["Enums"]["payment_type"];
          payment_transaction_updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_transaction_table_mailroom_registration_id_fkey";
            columns: ["mailroom_registration_id"];
            isOneToOne: false;
            referencedRelation: "mailroom_registration_table";
            referencedColumns: ["mailroom_registration_id"];
          },
        ];
      };
      referral_table: {
        Row: {
          referral_date_created: string | null;
          referral_id: number;
          referral_referred_user_id: string | null;
          referral_referrer_user_id: string | null;
          referral_service_type: string | null;
        };
        Insert: {
          referral_date_created?: string | null;
          referral_id?: number;
          referral_referred_user_id?: string | null;
          referral_referrer_user_id?: string | null;
          referral_service_type?: string | null;
        };
        Update: {
          referral_date_created?: string | null;
          referral_id?: number;
          referral_referred_user_id?: string | null;
          referral_referrer_user_id?: string | null;
          referral_service_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "referral_table_referral_referred_user_id_fkey";
            columns: ["referral_referred_user_id"];
            isOneToOne: false;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
          {
            foreignKeyName: "referral_table_referral_referrer_user_id_fkey";
            columns: ["referral_referrer_user_id"];
            isOneToOne: false;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
        ];
      };
      rewards_claim_table: {
        Row: {
          rewards_claim_account_details: string;
          rewards_claim_amount: number;
          rewards_claim_created_at: string;
          rewards_claim_id: string;
          rewards_claim_payment_method: string;
          rewards_claim_processed_at: string | null;
          rewards_claim_proof_path: string | null;
          rewards_claim_referral_count: number;
          rewards_claim_status: Database["public"]["Enums"]["rewards_claim_status"];
          rewards_claim_total_referrals: number | null;
          user_id: string;
        };
        Insert: {
          rewards_claim_account_details: string;
          rewards_claim_amount?: number;
          rewards_claim_created_at?: string;
          rewards_claim_id?: string;
          rewards_claim_payment_method: string;
          rewards_claim_processed_at?: string | null;
          rewards_claim_proof_path?: string | null;
          rewards_claim_referral_count: number;
          rewards_claim_status?: Database["public"]["Enums"]["rewards_claim_status"];
          rewards_claim_total_referrals?: number | null;
          user_id: string;
        };
        Update: {
          rewards_claim_account_details?: string;
          rewards_claim_amount?: number;
          rewards_claim_created_at?: string;
          rewards_claim_id?: string;
          rewards_claim_payment_method?: string;
          rewards_claim_processed_at?: string | null;
          rewards_claim_proof_path?: string | null;
          rewards_claim_referral_count?: number;
          rewards_claim_status?: Database["public"]["Enums"]["rewards_claim_status"];
          rewards_claim_total_referrals?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rewards_claim_table_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
        ];
      };
      subscription_table: {
        Row: {
          mailroom_registration_id: string;
          subscription_auto_renew: boolean | null;
          subscription_billing_cycle: Database["public"]["Enums"]["billing_cycle"];
          subscription_created_at: string | null;
          subscription_expires_at: string;
          subscription_id: string;
          subscription_started_at: string;
          subscription_updated_at: string | null;
        };
        Insert: {
          mailroom_registration_id: string;
          subscription_auto_renew?: boolean | null;
          subscription_billing_cycle?: Database["public"]["Enums"]["billing_cycle"];
          subscription_created_at?: string | null;
          subscription_expires_at: string;
          subscription_id?: string;
          subscription_started_at?: string;
          subscription_updated_at?: string | null;
        };
        Update: {
          mailroom_registration_id?: string;
          subscription_auto_renew?: boolean | null;
          subscription_billing_cycle?: Database["public"]["Enums"]["billing_cycle"];
          subscription_created_at?: string | null;
          subscription_expires_at?: string;
          subscription_id?: string;
          subscription_started_at?: string;
          subscription_updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_table_mailroom_registration_id_fkey";
            columns: ["mailroom_registration_id"];
            isOneToOne: true;
            referencedRelation: "mailroom_registration_table";
            referencedColumns: ["mailroom_registration_id"];
          },
        ];
      };
      user_address_table: {
        Row: {
          user_address_city: string | null;
          user_address_created_at: string | null;
          user_address_id: string;
          user_address_is_default: boolean | null;
          user_address_label: string | null;
          user_address_line1: string;
          user_address_line2: string | null;
          user_address_postal: string | null;
          user_address_region: string | null;
          user_id: string;
        };
        Insert: {
          user_address_city?: string | null;
          user_address_created_at?: string | null;
          user_address_id?: string;
          user_address_is_default?: boolean | null;
          user_address_label?: string | null;
          user_address_line1: string;
          user_address_line2?: string | null;
          user_address_postal?: string | null;
          user_address_region?: string | null;
          user_id: string;
        };
        Update: {
          user_address_city?: string | null;
          user_address_created_at?: string | null;
          user_address_id?: string;
          user_address_is_default?: boolean | null;
          user_address_label?: string | null;
          user_address_line1?: string;
          user_address_line2?: string | null;
          user_address_postal?: string | null;
          user_address_region?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_address_table_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
        ];
      };
      user_kyc_address_table: {
        Row: {
          user_kyc_address_city: string | null;
          user_kyc_address_created_at: string | null;
          user_kyc_address_id: string;
          user_kyc_address_is_default: boolean | null;
          user_kyc_address_line_one: string | null;
          user_kyc_address_line_two: string | null;
          user_kyc_address_postal_code: number | null;
          user_kyc_address_region: string | null;
          user_kyc_address_updated_at: string | null;
          user_kyc_id: string;
        };
        Insert: {
          user_kyc_address_city?: string | null;
          user_kyc_address_created_at?: string | null;
          user_kyc_address_id?: string;
          user_kyc_address_is_default?: boolean | null;
          user_kyc_address_line_one?: string | null;
          user_kyc_address_line_two?: string | null;
          user_kyc_address_postal_code?: number | null;
          user_kyc_address_region?: string | null;
          user_kyc_address_updated_at?: string | null;
          user_kyc_id: string;
        };
        Update: {
          user_kyc_address_city?: string | null;
          user_kyc_address_created_at?: string | null;
          user_kyc_address_id?: string;
          user_kyc_address_is_default?: boolean | null;
          user_kyc_address_line_one?: string | null;
          user_kyc_address_line_two?: string | null;
          user_kyc_address_postal_code?: number | null;
          user_kyc_address_region?: string | null;
          user_kyc_address_updated_at?: string | null;
          user_kyc_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_kyc_address_table_user_kyc_id_fkey";
            columns: ["user_kyc_id"];
            isOneToOne: false;
            referencedRelation: "user_kyc_table";
            referencedColumns: ["user_kyc_id"];
          },
        ];
      };
      user_kyc_table: {
        Row: {
          user_id: string;
          user_kyc_agreements_accepted: boolean | null;
          user_kyc_created_at: string | null;
          user_kyc_date_of_birth: string | null;
          user_kyc_first_name: string | null;
          user_kyc_id: string;
          user_kyc_id_back_url: string;
          user_kyc_id_document_type: string | null;
          user_kyc_id_front_url: string;
          user_kyc_id_number: string | null;
          user_kyc_last_name: string | null;
          user_kyc_rejected_reason: string | null;
          user_kyc_status: Database["public"]["Enums"]["user_kyc_status"];
          user_kyc_submitted_at: string | null;
          user_kyc_updated_at: string | null;
          user_kyc_verified_at: string | null;
        };
        Insert: {
          user_id: string;
          user_kyc_agreements_accepted?: boolean | null;
          user_kyc_created_at?: string | null;
          user_kyc_date_of_birth?: string | null;
          user_kyc_first_name?: string | null;
          user_kyc_id?: string;
          user_kyc_id_back_url: string;
          user_kyc_id_document_type?: string | null;
          user_kyc_id_front_url: string;
          user_kyc_id_number?: string | null;
          user_kyc_last_name?: string | null;
          user_kyc_rejected_reason?: string | null;
          user_kyc_status?: Database["public"]["Enums"]["user_kyc_status"];
          user_kyc_submitted_at?: string | null;
          user_kyc_updated_at?: string | null;
          user_kyc_verified_at?: string | null;
        };
        Update: {
          user_id?: string;
          user_kyc_agreements_accepted?: boolean | null;
          user_kyc_created_at?: string | null;
          user_kyc_date_of_birth?: string | null;
          user_kyc_first_name?: string | null;
          user_kyc_id?: string;
          user_kyc_id_back_url?: string;
          user_kyc_id_document_type?: string | null;
          user_kyc_id_front_url?: string;
          user_kyc_id_number?: string | null;
          user_kyc_last_name?: string | null;
          user_kyc_rejected_reason?: string | null;
          user_kyc_status?: Database["public"]["Enums"]["user_kyc_status"];
          user_kyc_submitted_at?: string | null;
          user_kyc_updated_at?: string | null;
          user_kyc_verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_kyc_table_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users_table";
            referencedColumns: ["users_id"];
          },
        ];
      };
      users_table: {
        Row: {
          mobile_number: string | null;
          referral_reward_milestone_claimed: number | null;
          users_avatar_url: string | null;
          users_created_at: string | null;
          users_email: string;
          users_id: string;
          users_is_verified: boolean | null;
          users_referral_code: string | null;
          users_role: string;
        };
        Insert: {
          mobile_number?: string | null;
          referral_reward_milestone_claimed?: number | null;
          users_avatar_url?: string | null;
          users_created_at?: string | null;
          users_email: string;
          users_id?: string;
          users_is_verified?: boolean | null;
          users_referral_code?: string | null;
          users_role?: string;
        };
        Update: {
          mobile_number?: string | null;
          referral_reward_milestone_claimed?: number | null;
          users_avatar_url?: string | null;
          users_created_at?: string | null;
          users_email?: string;
          users_id?: string;
          users_is_verified?: boolean | null;
          users_referral_code?: string | null;
          users_role?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_create_assigned_locker: {
        Args: { input_data: Json };
        Returns: Json;
      };
      admin_create_mailroom_location: {
        Args: {
          input_barangay?: string;
          input_city?: string;
          input_code?: string;
          input_name: string;
          input_region?: string;
          input_total_lockers?: number;
          input_zip?: string;
        };
        Returns: {
          mailroom_location_barangay: string | null;
          mailroom_location_city: string | null;
          mailroom_location_id: string;
          mailroom_location_name: string;
          mailroom_location_prefix: string | null;
          mailroom_location_region: string | null;
          mailroom_location_total_lockers: number;
          mailroom_location_zip: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "mailroom_location_table";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_dashboard_stats: { Args: never; Returns: Json };
      admin_delete_mailbox_item: { Args: { input_data: Json }; Returns: Json };
      admin_get_assigned_lockers: { Args: never; Returns: Json };
      admin_list_activity_logs: { Args: { input_data: Json }; Returns: Json };
      admin_list_mailroom_plans: { Args: never; Returns: Json };
      admin_list_reward_claims: { Args: never; Returns: Json };
      admin_list_user_kyc: {
        Args: {
          input_limit?: number;
          input_offset?: number;
          input_search?: string;
          input_status?: string;
        };
        Returns: Json;
      };
      admin_restore_mailbox_item: { Args: { input_data: Json }; Returns: Json };
      admin_update_mailbox_item: { Args: { input_data: Json }; Returns: Json };
      admin_update_mailroom_plan: {
        Args: { input_plan_id: string; input_updates: Json };
        Returns: {
          mailroom_plan_can_digitize: boolean | null;
          mailroom_plan_can_receive_mail: boolean | null;
          mailroom_plan_can_receive_parcels: boolean | null;
          mailroom_plan_description: string | null;
          mailroom_plan_id: string;
          mailroom_plan_name: string;
          mailroom_plan_price: number;
          mailroom_plan_storage_limit: number | null;
        };
        SetofOptions: {
          from: "*";
          to: "mailroom_plan_table";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_update_reward_claim: {
        Args: {
          input_claim_id: string;
          input_proof_path?: string;
          input_status: string;
        };
        Returns: Json;
      };
      admin_update_user_kyc: {
        Args: { input_status: string; input_user_id: string };
        Returns: Json;
      };
      calculate_registration_amount: {
        Args: { input_data: Json };
        Returns: number;
      };
      cancel_user_mailroom_subscription: {
        Args: { input_registration_id: string };
        Returns: boolean;
      };
      check_email_exists: { Args: { p_email: string }; Returns: boolean };
      check_locker_availability: { Args: { input_data: Json }; Returns: Json };
      claim_referral_rewards: {
        Args: {
          input_account_details: string;
          input_payment_method: string;
          input_user_id: string;
        };
        Returns: Json;
      };
      create_mailroom_registration: {
        Args: { input_data: Json };
        Returns: Json;
      };
      create_notification: { Args: { input_data: Json }; Returns: Json };
      delete_user_storage_file: { Args: { input_data: Json }; Returns: Json };
      finalize_registration_from_payment: {
        Args: { input_data: Json };
        Returns: Json;
      };
      generate_mailroom_registration_code: { Args: never; Returns: Json };
      get_admin_archived_packages: {
        Args: { input_limit?: number; input_offset?: number };
        Returns: Json;
      };
      get_admin_mailroom_packages: {
        Args: {
          input_compact?: boolean;
          input_limit?: number;
          input_offset?: number;
          input_status?: string[];
        };
        Returns: Json;
      };
      get_location_availability: { Args: { input_data?: Json }; Returns: Json };
      get_mailroom_locations: { Args: { input_data?: Json }; Returns: Json };
      get_mailroom_plans: { Args: never; Returns: Json };
      get_mailroom_registration_by_order: {
        Args: { input_data: Json };
        Returns: Json;
      };
      get_payment_transaction_by_order: {
        Args: { input_data: Json };
        Returns: Json;
      };
      get_registration_scans: { Args: { input_data: Json }; Returns: Json };
      get_rewards_status: { Args: { input_user_id: string }; Returns: Json };
      get_transactions: {
        Args: {
          include_user_details?: boolean;
          input_user_ids?: string[];
          page_limit?: number;
          page_offset?: number;
          search_query?: string;
          sort_by?: string;
          sort_dir?: string;
        };
        Returns: Json;
      };
      get_user_assigned_lockers: { Args: { input_data: Json }; Returns: Json };
      get_user_kyc_by_user_id: {
        Args: { input_user_id: string };
        Returns: {
          user_id: string;
          user_kyc_agreements_accepted: boolean | null;
          user_kyc_created_at: string | null;
          user_kyc_date_of_birth: string | null;
          user_kyc_first_name: string | null;
          user_kyc_id: string;
          user_kyc_id_back_url: string;
          user_kyc_id_document_type: string | null;
          user_kyc_id_front_url: string;
          user_kyc_id_number: string | null;
          user_kyc_last_name: string | null;
          user_kyc_rejected_reason: string | null;
          user_kyc_status: Database["public"]["Enums"]["user_kyc_status"];
          user_kyc_submitted_at: string | null;
          user_kyc_updated_at: string | null;
          user_kyc_verified_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "user_kyc_table";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_user_kyc_with_populated_user: {
        Args: { input_user_id: string };
        Returns: Json;
      };
      get_user_mailbox_items_by_registrations: {
        Args: { input_data: Json };
        Returns: Json;
      };
      get_user_mailroom_registration: {
        Args: { input_data: Json };
        Returns: Json;
      };
      get_user_mailroom_registration_stats: {
        Args: { input_user_id: string };
        Returns: Json;
      };
      get_user_mailroom_registrations: {
        Args: {
          input_user_id: string;
          page_limit?: number;
          page_offset?: number;
          search_query?: string;
        };
        Returns: Json;
      };
      get_user_mailroom_registrations_stat: {
        Args: { input_user_id: string };
        Returns: Json;
      };
      get_user_mailroom_stats: {
        Args: { input_user_id: string };
        Returns: Json;
      };
      get_user_notifications: {
        Args: {
          input_limit?: number;
          input_offset?: number;
          input_user_id: string;
        };
        Returns: Json;
      };
      get_user_role: { Args: { input_user_id: string }; Returns: string };
      get_user_session_data: { Args: { input_user_id: string }; Returns: Json };
      get_user_storage_files: {
        Args: {
          input_user_id: string;
          page_limit?: number;
          page_offset?: number;
          search_query?: string;
          sort_by?: string;
          sort_dir?: string;
        };
        Returns: Json;
      };
      is_admin: { Args: { user_id: string }; Returns: boolean };
      mark_notifications_as_read: {
        Args: { input_user_id: string };
        Returns: Json;
      };
      referral_add: { Args: { input_data: Json }; Returns: Json };
      referral_generate: { Args: { input_data: Json }; Returns: Json };
      referral_list: { Args: { input_data: Json }; Returns: Json };
      referral_validate: { Args: { input_data: Json }; Returns: Json };
      request_reward_claim: {
        Args: {
          input_account_details: string;
          input_payment_method: string;
          input_user_id: string;
        };
        Returns: Json;
      };
      rpc_list_mailroom_locations_paginated: {
        Args: {
          p_city?: string;
          p_limit?: number;
          p_offset?: number;
          p_region?: string;
          p_search?: string;
          p_sort_by?: string;
        };
        Returns: {
          barangay: string;
          city: string;
          code: string;
          id: string;
          name: string;
          region: string;
          total_count: number;
          total_lockers: number;
          zip: string;
        }[];
      };
      search_mailroom_registrations: {
        Args: { result_limit?: number; search_query?: string };
        Returns: Json;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      user_create_address: {
        Args: {
          input_city?: string;
          input_is_default?: boolean;
          input_label?: string;
          input_line1: string;
          input_line2?: string;
          input_postal?: string;
          input_region?: string;
          input_user_id: string;
        };
        Returns: {
          user_address_city: string | null;
          user_address_created_at: string | null;
          user_address_id: string;
          user_address_is_default: boolean | null;
          user_address_label: string | null;
          user_address_line1: string;
          user_address_line2: string | null;
          user_address_postal: string | null;
          user_address_region: string | null;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "user_address_table";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      user_delete_address: {
        Args: { input_user_address_id: string };
        Returns: boolean;
      };
      user_is_verified: { Args: { input_user_id: string }; Returns: string };
      user_list_addresses: { Args: { input_user_id: string }; Returns: Json };
      user_request_mailbox_item_action: {
        Args: { input_data: Json };
        Returns: Json;
      };
      user_submit_kyc: { Args: { input_data: Json }; Returns: Json };
      user_update_address: {
        Args: {
          input_city?: string;
          input_is_default?: boolean;
          input_label?: string;
          input_line1: string;
          input_line2?: string;
          input_postal?: string;
          input_region?: string;
          input_user_address_id: string;
        };
        Returns: {
          user_address_city: string | null;
          user_address_created_at: string | null;
          user_address_id: string;
          user_address_is_default: boolean | null;
          user_address_label: string | null;
          user_address_line1: string;
          user_address_line2: string | null;
          user_address_postal: string | null;
          user_address_region: string | null;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "user_address_table";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      activity_action:
        | "CREATE"
        | "STORE"
        | "UPDATE"
        | "DELETE"
        | "VIEW"
        | "SUBMIT"
        | "APPROVE"
        | "REJECT"
        | "PROCESS"
        | "COMPLETE"
        | "CANCEL"
        | "VERIFY"
        | "PAY"
        | "REFUND"
        | "LOGIN"
        | "LOGOUT"
        | "REGISTER"
        | "CLAIM"
        | "RELEASE"
        | "DISPOSE"
        | "SCAN";
      activity_entity_type:
        | "MAIL_ACTION_REQUEST"
        | "USER_KYC"
        | "PAYMENT_TRANSACTION"
        | "SUBSCRIPTION"
        | "MAILBOX_ITEM"
        | "MAILROOM_REGISTRATION"
        | "USER_ADDRESS"
        | "REWARDS_CLAIM"
        | "REFERRAL"
        | "NOTIFICATION"
        | "MAILROOM_FILE"
        | "MAILROOM_ASSIGNED_LOCKER"
        | "USER";
      activity_type:
        | "USER_REQUEST_SCAN"
        | "USER_REQUEST_RELEASE"
        | "USER_REQUEST_DISPOSE"
        | "USER_REQUEST_CANCEL"
        | "USER_REQUEST_REFUND"
        | "USER_REQUEST_REWARD"
        | "USER_REQUEST_OTHERS"
        | "USER_LOGIN"
        | "USER_LOGOUT"
        | "USER_UPDATE_PROFILE"
        | "USER_KYC_SUBMIT"
        | "USER_KYC_VERIFY"
        | "ADMIN_ACTION"
        | "SYSTEM_EVENT";
      billing_cycle: "MONTHLY" | "QUARTERLY" | "ANNUAL";
      error_code:
        | "AUTH_401_UNAUTHORIZED"
        | "AUTH_403_FORBIDDEN"
        | "AUTH_TOKEN_EXPIRED"
        | "AUTH_TOKEN_INVALID"
        | "AUTH_SESSION_NOT_FOUND"
        | "AUTH_USER_NOT_FOUND"
        | "AUTH_INVALID_CREDENTIALS"
        | "AUTH_EMAIL_NOT_VERIFIED"
        | "DB_CONN_TIMEOUT"
        | "DB_QUERY_ERROR"
        | "DB_CONSTRAINT_VIOLATION"
        | "DB_FOREIGN_KEY_VIOLATION"
        | "DB_UNIQUE_VIOLATION"
        | "DB_TRANSACTION_FAILED"
        | "DB_CONNECTION_LOST"
        | "VALIDATION_EMAIL_REQUIRED"
        | "VALIDATION_EMAIL_INVALID"
        | "VALIDATION_MOBILE_REQUIRED"
        | "VALIDATION_MOBILE_INVALID"
        | "VALIDATION_PASSWORD_REQUIRED"
        | "VALIDATION_PASSWORD_TOO_WEAK"
        | "VALIDATION_FIELD_REQUIRED"
        | "VALIDATION_INVALID_FORMAT"
        | "VALIDATION_INVALID_VALUE"
        | "VALIDATION_REFERRAL_CODE_INVALID"
        | "VALIDATION_SELF_REFERRAL_NOT_ALLOWED"
        | "KYC_NOT_SUBMITTED"
        | "KYC_PENDING_VERIFICATION"
        | "KYC_REJECTED"
        | "KYC_ALREADY_VERIFIED"
        | "KYC_DOCUMENT_MISSING"
        | "KYC_DOCUMENT_INVALID"
        | "MAILROOM_LOCATION_NOT_FOUND"
        | "MAILROOM_LOCKER_NOT_AVAILABLE"
        | "MAILROOM_LOCKER_QUANTITY_EXCEEDED"
        | "MAILROOM_REGISTRATION_NOT_FOUND"
        | "MAILROOM_PLAN_NOT_FOUND"
        | "MAILROOM_ITEM_NOT_FOUND"
        | "MAILROOM_ACTION_REQUEST_INVALID"
        | "MAILROOM_ACTION_REQUEST_NOT_ALLOWED"
        | "MAILROOM_LOCKER_FULL"
        | "PAYMENT_TRANSACTION_FAILED"
        | "PAYMENT_INSUFFICIENT_FUNDS"
        | "PAYMENT_METHOD_INVALID"
        | "PAYMENT_GATEWAY_ERROR"
        | "PAYMENT_REFUND_FAILED"
        | "PAYMENT_ALREADY_PROCESSED"
        | "PAYMENT_AMOUNT_INVALID"
        | "SUBSCRIPTION_NOT_FOUND"
        | "SUBSCRIPTION_EXPIRED"
        | "SUBSCRIPTION_ALREADY_ACTIVE"
        | "SUBSCRIPTION_CANCEL_FAILED"
        | "SUBSCRIPTION_RENEWAL_FAILED"
        | "REFERRAL_CODE_NOT_FOUND"
        | "REFERRAL_CODE_ALREADY_USED"
        | "REFERRAL_SELF_REFERRAL"
        | "REFERRAL_INVALID"
        | "REWARD_CLAIM_NOT_ELIGIBLE"
        | "REWARD_CLAIM_MINIMUM_NOT_MET"
        | "REWARD_CLAIM_ALREADY_PROCESSED"
        | "REWARD_CLAIM_PAYMENT_FAILED"
        | "REWARD_CLAIM_NOT_FOUND"
        | "ADDRESS_NOT_FOUND"
        | "ADDRESS_INVALID"
        | "ADDRESS_REQUIRED"
        | "FILE_UPLOAD_FAILED"
        | "FILE_SIZE_EXCEEDED"
        | "FILE_TYPE_INVALID"
        | "FILE_NOT_FOUND"
        | "EXTERNAL_SERVICE_TIMEOUT"
        | "EXTERNAL_SERVICE_UNAVAILABLE"
        | "EXTERNAL_SERVICE_ERROR"
        | "SYSTEM_INTERNAL_ERROR"
        | "SYSTEM_MAINTENANCE"
        | "SYSTEM_RATE_LIMIT_EXCEEDED";
      error_type:
        | "API_ERROR"
        | "DATABASE_ERROR"
        | "VALIDATION_ERROR"
        | "AUTHENTICATION_ERROR"
        | "AUTHORIZATION_ERROR"
        | "PAYMENT_ERROR"
        | "EXTERNAL_SERVICE_ERROR"
        | "SYSTEM_ERROR"
        | "UNKNOWN_ERROR";
      mail_action_request_status: "PROCESSING" | "COMPLETED";
      mail_action_request_type:
        | "SCAN"
        | "RELEASE"
        | "DISPOSE"
        | "CANCEL"
        | "REFUND"
        | "REWARD"
        | "OTHER";
      mailroom_assigned_locker_status:
        | "Empty"
        | "Normal"
        | "Near Full"
        | "Full";
      mailroom_file_type: "RECEIVED" | "SCANNED" | "RELEASED";
      mailroom_package_status:
        | "STORED"
        | "RELEASED"
        | "RETRIEVED"
        | "DISPOSED"
        | "REQUEST_TO_RELEASE"
        | "REQUEST_TO_DISPOSE"
        | "REQUEST_TO_SCAN";
      mailroom_package_type: "Document" | "Parcel";
      notification_type:
        | "PACKAGE_ARRIVED"
        | "PACKAGE_RELEASED"
        | "PACKAGE_DISPOSED"
        | "SCAN_READY"
        | "SYSTEM"
        | "REWARD_PROCESSING"
        | "REWARD_PAID";
      payment_status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED";
      payment_type: "SUBSCRIPTION" | "ONE_TIME" | "REFUND";
      rewards_claim_status: "PENDING" | "PROCESSING" | "PAID" | "REJECTED";
      user_kyc_status: "SUBMITTED" | "VERIFIED" | "REJECTED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  address_schema: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_action: [
        "CREATE",
        "STORE",
        "UPDATE",
        "DELETE",
        "VIEW",
        "SUBMIT",
        "APPROVE",
        "REJECT",
        "PROCESS",
        "COMPLETE",
        "CANCEL",
        "VERIFY",
        "PAY",
        "REFUND",
        "LOGIN",
        "LOGOUT",
        "REGISTER",
        "CLAIM",
        "RELEASE",
        "DISPOSE",
        "SCAN",
      ],
      activity_entity_type: [
        "MAIL_ACTION_REQUEST",
        "USER_KYC",
        "PAYMENT_TRANSACTION",
        "SUBSCRIPTION",
        "MAILBOX_ITEM",
        "MAILROOM_REGISTRATION",
        "USER_ADDRESS",
        "REWARDS_CLAIM",
        "REFERRAL",
        "NOTIFICATION",
        "MAILROOM_FILE",
        "MAILROOM_ASSIGNED_LOCKER",
        "USER",
      ],
      activity_type: [
        "USER_REQUEST_SCAN",
        "USER_REQUEST_RELEASE",
        "USER_REQUEST_DISPOSE",
        "USER_REQUEST_CANCEL",
        "USER_REQUEST_REFUND",
        "USER_REQUEST_REWARD",
        "USER_REQUEST_OTHERS",
        "USER_LOGIN",
        "USER_LOGOUT",
        "USER_UPDATE_PROFILE",
        "USER_KYC_SUBMIT",
        "USER_KYC_VERIFY",
        "ADMIN_ACTION",
        "SYSTEM_EVENT",
      ],
      billing_cycle: ["MONTHLY", "QUARTERLY", "ANNUAL"],
      error_code: [
        "AUTH_401_UNAUTHORIZED",
        "AUTH_403_FORBIDDEN",
        "AUTH_TOKEN_EXPIRED",
        "AUTH_TOKEN_INVALID",
        "AUTH_SESSION_NOT_FOUND",
        "AUTH_USER_NOT_FOUND",
        "AUTH_INVALID_CREDENTIALS",
        "AUTH_EMAIL_NOT_VERIFIED",
        "DB_CONN_TIMEOUT",
        "DB_QUERY_ERROR",
        "DB_CONSTRAINT_VIOLATION",
        "DB_FOREIGN_KEY_VIOLATION",
        "DB_UNIQUE_VIOLATION",
        "DB_TRANSACTION_FAILED",
        "DB_CONNECTION_LOST",
        "VALIDATION_EMAIL_REQUIRED",
        "VALIDATION_EMAIL_INVALID",
        "VALIDATION_MOBILE_REQUIRED",
        "VALIDATION_MOBILE_INVALID",
        "VALIDATION_PASSWORD_REQUIRED",
        "VALIDATION_PASSWORD_TOO_WEAK",
        "VALIDATION_FIELD_REQUIRED",
        "VALIDATION_INVALID_FORMAT",
        "VALIDATION_INVALID_VALUE",
        "VALIDATION_REFERRAL_CODE_INVALID",
        "VALIDATION_SELF_REFERRAL_NOT_ALLOWED",
        "KYC_NOT_SUBMITTED",
        "KYC_PENDING_VERIFICATION",
        "KYC_REJECTED",
        "KYC_ALREADY_VERIFIED",
        "KYC_DOCUMENT_MISSING",
        "KYC_DOCUMENT_INVALID",
        "MAILROOM_LOCATION_NOT_FOUND",
        "MAILROOM_LOCKER_NOT_AVAILABLE",
        "MAILROOM_LOCKER_QUANTITY_EXCEEDED",
        "MAILROOM_REGISTRATION_NOT_FOUND",
        "MAILROOM_PLAN_NOT_FOUND",
        "MAILROOM_ITEM_NOT_FOUND",
        "MAILROOM_ACTION_REQUEST_INVALID",
        "MAILROOM_ACTION_REQUEST_NOT_ALLOWED",
        "MAILROOM_LOCKER_FULL",
        "PAYMENT_TRANSACTION_FAILED",
        "PAYMENT_INSUFFICIENT_FUNDS",
        "PAYMENT_METHOD_INVALID",
        "PAYMENT_GATEWAY_ERROR",
        "PAYMENT_REFUND_FAILED",
        "PAYMENT_ALREADY_PROCESSED",
        "PAYMENT_AMOUNT_INVALID",
        "SUBSCRIPTION_NOT_FOUND",
        "SUBSCRIPTION_EXPIRED",
        "SUBSCRIPTION_ALREADY_ACTIVE",
        "SUBSCRIPTION_CANCEL_FAILED",
        "SUBSCRIPTION_RENEWAL_FAILED",
        "REFERRAL_CODE_NOT_FOUND",
        "REFERRAL_CODE_ALREADY_USED",
        "REFERRAL_SELF_REFERRAL",
        "REFERRAL_INVALID",
        "REWARD_CLAIM_NOT_ELIGIBLE",
        "REWARD_CLAIM_MINIMUM_NOT_MET",
        "REWARD_CLAIM_ALREADY_PROCESSED",
        "REWARD_CLAIM_PAYMENT_FAILED",
        "REWARD_CLAIM_NOT_FOUND",
        "ADDRESS_NOT_FOUND",
        "ADDRESS_INVALID",
        "ADDRESS_REQUIRED",
        "FILE_UPLOAD_FAILED",
        "FILE_SIZE_EXCEEDED",
        "FILE_TYPE_INVALID",
        "FILE_NOT_FOUND",
        "EXTERNAL_SERVICE_TIMEOUT",
        "EXTERNAL_SERVICE_UNAVAILABLE",
        "EXTERNAL_SERVICE_ERROR",
        "SYSTEM_INTERNAL_ERROR",
        "SYSTEM_MAINTENANCE",
        "SYSTEM_RATE_LIMIT_EXCEEDED",
      ],
      error_type: [
        "API_ERROR",
        "DATABASE_ERROR",
        "VALIDATION_ERROR",
        "AUTHENTICATION_ERROR",
        "AUTHORIZATION_ERROR",
        "PAYMENT_ERROR",
        "EXTERNAL_SERVICE_ERROR",
        "SYSTEM_ERROR",
        "UNKNOWN_ERROR",
      ],
      mail_action_request_status: ["PROCESSING", "COMPLETED"],
      mail_action_request_type: [
        "SCAN",
        "RELEASE",
        "DISPOSE",
        "CANCEL",
        "REFUND",
        "REWARD",
        "OTHER",
      ],
      mailroom_assigned_locker_status: ["Empty", "Normal", "Near Full", "Full"],
      mailroom_file_type: ["RECEIVED", "SCANNED", "RELEASED"],
      mailroom_package_status: [
        "STORED",
        "RELEASED",
        "RETRIEVED",
        "DISPOSED",
        "REQUEST_TO_RELEASE",
        "REQUEST_TO_DISPOSE",
        "REQUEST_TO_SCAN",
      ],
      mailroom_package_type: ["Document", "Parcel"],
      notification_type: [
        "PACKAGE_ARRIVED",
        "PACKAGE_RELEASED",
        "PACKAGE_DISPOSED",
        "SCAN_READY",
        "SYSTEM",
        "REWARD_PROCESSING",
        "REWARD_PAID",
      ],
      payment_status: ["PENDING", "PROCESSING", "PAID", "FAILED", "REFUNDED"],
      payment_type: ["SUBSCRIPTION", "ONE_TIME", "REFUND"],
      rewards_claim_status: ["PENDING", "PROCESSING", "PAID", "REJECTED"],
      user_kyc_status: ["SUBMITTED", "VERIFIED", "REJECTED"],
    },
  },
} as const;
