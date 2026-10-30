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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      application_stage_history: {
        Row: {
          action_remarks: string | null
          application_id: string
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          due_at: string | null
          entered_at: string
          exited_at: string | null
          id: string
          stage_code: string
          stage_name: string
          stage_order: number
          status: string
        }
        Insert: {
          action_remarks?: string | null
          application_id: string
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          due_at?: string | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          stage_code: string
          stage_name: string
          stage_order: number
          status?: string
        }
        Update: {
          action_remarks?: string | null
          application_id?: string
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          due_at?: string | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          stage_code?: string
          stage_name?: string
          stage_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_stage_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_stage_history_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_stage_history_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          previous_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_types: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          academic_year: string | null
          additional_notes: string | null
          aicte_permanent_id: string | null
          aph_version: string | null
          application_category: string | null
          application_number: string | null
          application_title: string
          application_type: string | null
          approval_state: string | null
          assigned_bureau: string | null
          assigned_reviewer_id: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          current_stage: string | null
          description: string | null
          district: string | null
          external_reference_number: string | null
          id: string
          institution_address: string | null
          institution_name: string
          institution_registration_number: string | null
          institution_type: string | null
          processing_route: string | null
          processing_year: string | null
          region: string | null
          stage_due_at: string | null
          stage_entered_at: string | null
          state: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          workflow_template_id: string | null
        }
        Insert: {
          academic_year?: string | null
          additional_notes?: string | null
          aicte_permanent_id?: string | null
          aph_version?: string | null
          application_category?: string | null
          application_number?: string | null
          application_title: string
          application_type?: string | null
          approval_state?: string | null
          assigned_bureau?: string | null
          assigned_reviewer_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          current_stage?: string | null
          description?: string | null
          district?: string | null
          external_reference_number?: string | null
          id?: string
          institution_address?: string | null
          institution_name: string
          institution_registration_number?: string | null
          institution_type?: string | null
          processing_route?: string | null
          processing_year?: string | null
          region?: string | null
          stage_due_at?: string | null
          stage_entered_at?: string | null
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          workflow_template_id?: string | null
        }
        Update: {
          academic_year?: string | null
          additional_notes?: string | null
          aicte_permanent_id?: string | null
          aph_version?: string | null
          application_category?: string | null
          application_number?: string | null
          application_title?: string
          application_type?: string | null
          approval_state?: string | null
          assigned_bureau?: string | null
          assigned_reviewer_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          current_stage?: string | null
          description?: string | null
          district?: string | null
          external_reference_number?: string | null
          id?: string
          institution_address?: string | null
          institution_name?: string
          institution_registration_number?: string | null
          institution_type?: string | null
          processing_route?: string | null
          processing_year?: string | null
          region?: string | null
          stage_due_at?: string | null
          stage_entered_at?: string | null
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_assigned_reviewer_id_fkey"
            columns: ["assigned_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action_type: string
          actor_id: string | null
          actor_role: string | null
          application_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          new_value: string | null
          outcome: string
          previous_value: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          actor_role?: string | null
          application_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          new_value?: string | null
          outcome?: string
          previous_value?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          actor_role?: string | null
          application_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          new_value?: string | null
          outcome?: string
          previous_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      bureaus: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      clarification_requests: {
        Row: {
          application_id: string
          created_at: string
          id: string
          reason: string
          requested_by: string | null
          required_correction: string | null
          responded_at: string | null
          responded_by: string | null
          response_note: string | null
          status: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          reason: string
          requested_by?: string | null
          required_correction?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_note?: string | null
          status?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          reason?: string
          requested_by?: string | null
          required_correction?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clarification_requests_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_documents: {
        Row: {
          application_id: string | null
          created_at: string
          document_number: string | null
          document_type: string
          expiry_date: string | null
          file_name: string | null
          file_size: number | null
          id: string
          institution_id: string | null
          issue_date: string | null
          mime_type: string | null
          parent_document_id: string | null
          renewal_required: boolean
          renewal_submitted_at: string | null
          storage_path: string | null
          updated_at: string
          uploaded_by: string | null
          validity_status: string
          verification_remarks: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          document_number?: string | null
          document_type: string
          expiry_date?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          institution_id?: string | null
          issue_date?: string | null
          mime_type?: string | null
          parent_document_id?: string | null
          renewal_required?: boolean
          renewal_submitted_at?: string | null
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          validity_status?: string
          verification_remarks?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string
          expiry_date?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          institution_id?: string | null
          issue_date?: string | null
          mime_type?: string | null
          parent_document_id?: string | null
          renewal_required?: boolean
          renewal_submitted_at?: string | null
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          validity_status?: string
          verification_remarks?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_documents_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requirements: {
        Row: {
          active: boolean
          aph_version: string | null
          applicable_application_type: string | null
          applicable_institution_type: string | null
          created_at: string
          description: string | null
          document_category: string
          expiry_date_required: boolean
          id: string
          issue_date_required: boolean
          required: boolean
          requirement_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          aph_version?: string | null
          applicable_application_type?: string | null
          applicable_institution_type?: string | null
          created_at?: string
          description?: string | null
          document_category: string
          expiry_date_required?: boolean
          id?: string
          issue_date_required?: boolean
          required?: boolean
          requirement_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          aph_version?: string | null
          applicable_application_type?: string | null
          applicable_institution_type?: string | null
          created_at?: string
          description?: string | null
          document_category?: string
          expiry_date_required?: boolean
          id?: string
          issue_date_required?: boolean
          required?: boolean
          requirement_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          application_id: string
          document_category: string
          extracted_fields: Json | null
          extracted_text: string | null
          extraction_confidence: number | null
          extraction_error: string | null
          extraction_evidence: Json | null
          extraction_method: string | null
          field_corrections: Json | null
          file_name: string
          file_size: number
          id: string
          is_current: boolean
          mime_type: string
          ocr_status: string
          pages_processed: number | null
          sha256_hash: string | null
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
          verification_status: string
          version_number: number
        }
        Insert: {
          application_id: string
          document_category: string
          extracted_fields?: Json | null
          extracted_text?: string | null
          extraction_confidence?: number | null
          extraction_error?: string | null
          extraction_evidence?: Json | null
          extraction_method?: string | null
          field_corrections?: Json | null
          file_name: string
          file_size: number
          id?: string
          is_current?: boolean
          mime_type: string
          ocr_status?: string
          pages_processed?: number | null
          sha256_hash?: string | null
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
          verification_status?: string
          version_number?: number
        }
        Update: {
          application_id?: string
          document_category?: string
          extracted_fields?: Json | null
          extracted_text?: string | null
          extraction_confidence?: number | null
          extraction_error?: string | null
          extraction_evidence?: Json | null
          extraction_method?: string | null
          field_corrections?: Json | null
          file_name?: string
          file_size?: number
          id?: string
          is_current?: boolean
          mime_type?: string
          ocr_status?: string
          pages_processed?: number | null
          sha256_hash?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
          verification_status?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_records: {
        Row: {
          application_id: string | null
          id: string
          level: number
          notes: string | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          triggered_at: string
          undertaking_id: string | null
        }
        Insert: {
          application_id?: string | null
          id?: string
          level?: number
          notes?: string | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          triggered_at?: string
          undertaking_id?: string | null
        }
        Update: {
          application_id?: string | null
          id?: string
          level?: number
          notes?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          triggered_at?: string
          undertaking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_records_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_records_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_records_undertaking_id_fkey"
            columns: ["undertaking_id"]
            isOneToOne: false
            referencedRelation: "undertakings"
            referencedColumns: ["id"]
          },
        ]
      }
      evc_records: {
        Row: {
          application_id: string
          committee_members: Json
          completed_date: string | null
          coordinator_id: string | null
          created_at: string
          due_date: string | null
          id: string
          observations: string | null
          requirement: string | null
          scheduled_date: string | null
          status: string
          updated_at: string
          visit_date: string | null
        }
        Insert: {
          application_id: string
          committee_members?: Json
          completed_date?: string | null
          coordinator_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          observations?: string | null
          requirement?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          visit_date?: string | null
        }
        Update: {
          application_id?: string
          committee_members?: Json
          completed_date?: string | null
          coordinator_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          observations?: string | null
          requirement?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evc_records_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evc_records_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_verifications: {
        Row: {
          application_id: string
          created_at: string
          document_id: string | null
          executed_by: string | null
          http_status: number | null
          id: string
          lookup_field: string | null
          lookup_value: string | null
          request_summary: string | null
          response_summary: string | null
          source_domain: string | null
          source_id: string | null
          source_name: string
          status: string
        }
        Insert: {
          application_id: string
          created_at?: string
          document_id?: string | null
          executed_by?: string | null
          http_status?: number | null
          id?: string
          lookup_field?: string | null
          lookup_value?: string | null
          request_summary?: string | null
          response_summary?: string | null
          source_domain?: string | null
          source_id?: string | null
          source_name: string
          status?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          document_id?: string | null
          executed_by?: string | null
          http_status?: number | null
          id?: string
          lookup_field?: string | null
          lookup_value?: string | null
          request_summary?: string | null
          response_summary?: string | null
          source_domain?: string | null
          source_id?: string | null
          source_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_verifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_verifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_verifications_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_verifications_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "verification_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_records: {
        Row: {
          academic_year: string | null
          active: boolean
          created_at: string
          details: Json | null
          id: string
          imported_by: string | null
          institution_name: string
          record_status: string
          record_type: string
          registration_number: string | null
          source_reference: string | null
          source_type: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          academic_year?: string | null
          active?: boolean
          created_at?: string
          details?: Json | null
          id?: string
          imported_by?: string | null
          institution_name: string
          record_status?: string
          record_type?: string
          registration_number?: string | null
          source_reference?: string | null
          source_type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          academic_year?: string | null
          active?: boolean
          created_at?: string
          details?: Json | null
          id?: string
          imported_by?: string | null
          institution_name?: string
          record_status?: string
          record_type?: string
          registration_number?: string | null
          source_reference?: string | null
          source_type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_records_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_users: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          role_at_institution: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          role_at_institution?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          role_at_institution?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_users_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          account_status: string
          address: string | null
          aicte_permanent_id: string | null
          contact_number: string | null
          created_at: string
          created_by: string | null
          district: string | null
          id: string
          institution_name: string
          institution_type: string | null
          official_email: string | null
          region: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          address?: string | null
          aicte_permanent_id?: string | null
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          id?: string
          institution_name: string
          institution_type?: string | null
          official_email?: string | null
          region?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          address?: string | null
          aicte_permanent_id?: string | null
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          id?: string
          institution_name?: string
          institution_type?: string | null
          official_email?: string | null
          region?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          message: string
          notification_type: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          message: string
          notification_type?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      regulatory_rules: {
        Row: {
          active: boolean
          aph_version: string | null
          applicable_application_type: string | null
          applicable_institution_type: string | null
          config_status: string
          created_at: string
          created_by: string | null
          description: string | null
          effective_from: string | null
          effective_until: string | null
          id: string
          required_documents: string[]
          required_stage: string | null
          rule_name: string
          source_document: string | null
          source_section: string | null
          timeline_days: number | null
          updated_at: string
          validation_requirement: string | null
        }
        Insert: {
          active?: boolean
          aph_version?: string | null
          applicable_application_type?: string | null
          applicable_institution_type?: string | null
          config_status?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          required_documents?: string[]
          required_stage?: string | null
          rule_name: string
          source_document?: string | null
          source_section?: string | null
          timeline_days?: number | null
          updated_at?: string
          validation_requirement?: string | null
        }
        Update: {
          active?: boolean
          aph_version?: string | null
          applicable_application_type?: string | null
          applicable_institution_type?: string | null
          config_status?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          required_documents?: string[]
          required_stage?: string | null
          rule_name?: string
          source_document?: string | null
          source_section?: string | null
          timeline_days?: number | null
          updated_at?: string
          validation_requirement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          application_id: string
          generated_at: string
          generated_by: string | null
          id: string
          report_type: string
        }
        Insert: {
          application_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_type?: string
        }
        Update: {
          application_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_history_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_comments: {
        Row: {
          application_id: string
          author_id: string
          comment: string
          created_at: string
          id: string
          visibility: string
        }
        Insert: {
          application_id: string
          author_id: string
          comment: string
          created_at?: string
          id?: string
          visibility?: string
        }
        Update: {
          application_id?: string
          author_id?: string
          comment?: string
          created_at?: string
          id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_configurations: {
        Row: {
          active: boolean
          alert_before_days: number[]
          created_at: string
          escalation_levels: number[]
          id: string
          name: string
          scope: string
          scope_value: string | null
          timeline_days: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          alert_before_days?: number[]
          created_at?: string
          escalation_levels?: number[]
          id?: string
          name: string
          scope?: string
          scope_value?: string | null
          timeline_days?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          alert_before_days?: number[]
          created_at?: string
          escalation_levels?: number[]
          id?: string
          name?: string
          scope?: string
          scope_value?: string | null
          timeline_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      stage_observations: {
        Row: {
          application_id: string
          created_at: string
          id: string
          observation: string
          officer_id: string | null
          stage_history_id: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          observation: string
          officer_id?: string | null
          stage_history_id?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          observation?: string
          officer_id?: string | null
          stage_history_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_observations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_observations_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_observations_stage_history_id_fkey"
            columns: ["stage_history_id"]
            isOneToOne: false
            referencedRelation: "application_stage_history"
            referencedColumns: ["id"]
          },
        ]
      }
      undertaking_submissions: {
        Row: {
          evidence_file_name: string | null
          evidence_storage_path: string | null
          id: string
          note: string | null
          status: string
          submitted_at: string
          submitted_by: string
          undertaking_id: string
        }
        Insert: {
          evidence_file_name?: string | null
          evidence_storage_path?: string | null
          id?: string
          note?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
          undertaking_id: string
        }
        Update: {
          evidence_file_name?: string | null
          evidence_storage_path?: string | null
          id?: string
          note?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          undertaking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "undertaking_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "undertaking_submissions_undertaking_id_fkey"
            columns: ["undertaking_id"]
            isOneToOne: false
            referencedRelation: "undertakings"
            referencedColumns: ["id"]
          },
        ]
      }
      undertakings: {
        Row: {
          application_id: string | null
          assigned_officer_id: string | null
          compliance_closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          institution_id: string | null
          issued_date: string | null
          prescribed_condition: string | null
          required_evidence: string | null
          rule_reference: string | null
          status: string
          title: string
          updated_at: string
          verification_remarks: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          application_id?: string | null
          assigned_officer_id?: string | null
          compliance_closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          institution_id?: string | null
          issued_date?: string | null
          prescribed_condition?: string | null
          required_evidence?: string | null
          rule_reference?: string | null
          status?: string
          title: string
          updated_at?: string
          verification_remarks?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          application_id?: string | null
          assigned_officer_id?: string | null
          compliance_closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          institution_id?: string | null
          issued_date?: string | null
          prescribed_condition?: string | null
          required_evidence?: string | null
          rule_reference?: string | null
          status?: string
          title?: string
          updated_at?: string
          verification_remarks?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "undertakings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "undertakings_assigned_officer_id_fkey"
            columns: ["assigned_officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "undertakings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "undertakings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "undertakings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_findings: {
        Row: {
          application_id: string
          application_value: string | null
          category: string
          created_at: string
          document_id: string | null
          document_value: string | null
          explanation: string
          field_name: string | null
          finding_status: string
          id: string
          recommended_action: string | null
          resolution_comment: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_code: string
          severity: string
          verification_run_id: string
        }
        Insert: {
          application_id: string
          application_value?: string | null
          category: string
          created_at?: string
          document_id?: string | null
          document_value?: string | null
          explanation: string
          field_name?: string | null
          finding_status?: string
          id?: string
          recommended_action?: string | null
          resolution_comment?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_code: string
          severity?: string
          verification_run_id: string
        }
        Update: {
          application_id?: string
          application_value?: string | null
          category?: string
          created_at?: string
          document_id?: string | null
          document_value?: string | null
          explanation?: string
          field_name?: string | null
          finding_status?: string
          id?: string
          recommended_action?: string | null
          resolution_comment?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_code?: string
          severity?: string
          verification_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_findings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_findings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_findings_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_findings_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_runs: {
        Row: {
          application_id: string
          checks_passed: number
          checks_performed: number
          completed_at: string | null
          error_message: string | null
          executed_by: string | null
          findings_count: number
          id: string
          rules_snapshot: Json | null
          rules_version: string | null
          run_number: number
          started_at: string
          status: string
        }
        Insert: {
          application_id: string
          checks_passed?: number
          checks_performed?: number
          completed_at?: string | null
          error_message?: string | null
          executed_by?: string | null
          findings_count?: number
          id?: string
          rules_snapshot?: Json | null
          rules_version?: string | null
          run_number: number
          started_at?: string
          status?: string
        }
        Update: {
          application_id?: string
          checks_passed?: number
          checks_performed?: number
          completed_at?: string | null
          error_message?: string | null
          executed_by?: string | null
          findings_count?: number
          id?: string
          rules_snapshot?: Json | null
          rules_version?: string | null
          run_number?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_runs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_runs_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_sources: {
        Row: {
          active: boolean
          base_domain: string
          configured: boolean
          created_at: string
          created_by: string | null
          endpoint_path: string
          id: string
          lookup_param: string
          name: string
          notes: string | null
          source_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_domain: string
          configured?: boolean
          created_at?: string
          created_by?: string | null
          endpoint_path?: string
          id?: string
          lookup_param?: string
          name: string
          notes?: string | null
          source_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_domain?: string
          configured?: boolean
          created_at?: string
          created_by?: string | null
          endpoint_path?: string
          id?: string
          lookup_param?: string
          name?: string
          notes?: string | null
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          allow_return: boolean
          completion_conditions: string | null
          entry_conditions: string | null
          id: string
          responsible_bureau: string | null
          responsible_role: string
          stage_code: string
          stage_name: string
          stage_order: number
          template_id: string
          timeline_days: number | null
        }
        Insert: {
          allow_return?: boolean
          completion_conditions?: string | null
          entry_conditions?: string | null
          id?: string
          responsible_bureau?: string | null
          responsible_role: string
          stage_code: string
          stage_name: string
          stage_order: number
          template_id: string
          timeline_days?: number | null
        }
        Update: {
          allow_return?: boolean
          completion_conditions?: string | null
          entry_conditions?: string | null
          id?: string
          responsible_bureau?: string | null
          responsible_role?: string
          stage_code?: string
          stage_name?: string
          stage_order?: number
          template_id?: string
          timeline_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          active: boolean
          aph_version: string | null
          application_type: string | null
          config_status: string
          created_at: string
          created_by: string | null
          effective_from: string | null
          id: string
          institution_category: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          aph_version?: string | null
          application_type?: string | null
          config_status?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          id?: string
          institution_category?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          aph_version?: string | null
          application_type?: string | null
          config_status?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          id?: string
          institution_category?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_official: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "institution_user"
        | "reviewer"
        | "admin"
        | "regional_officer"
        | "evc_coordinator"
        | "competent_authority"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "institution_user",
        "reviewer",
        "admin",
        "regional_officer",
        "evc_coordinator",
        "competent_authority",
      ],
    },
  },
} as const
