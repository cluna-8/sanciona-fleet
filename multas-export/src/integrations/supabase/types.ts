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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string | null
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_logs: {
        Row: {
          action: string
          created_at: string
          document_id: string | null
          id: string
          organization_id: string
          sanction_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          document_id?: string | null
          id?: string
          organization_id: string
          sanction_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string | null
          id?: string
          organization_id?: string
          sanction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sanction_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_logs_sanction_id_fkey"
            columns: ["sanction_id"]
            isOneToOne: false
            referencedRelation: "sanctions"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          identification_number: string | null
          organization_id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          identification_number?: string | null
          organization_id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          identification_number?: string | null
          organization_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_endpoints: {
        Row: {
          category: string | null
          config: Json
          created_at: string
          id: string
          organization_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          config?: Json
          created_at?: string
          id?: string
          organization_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          config?: Json
          created_at?: string
          id?: string
          organization_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_sources: {
        Row: {
          article: string | null
          consulted_at: string | null
          created_at: string
          id: string
          norm: string
          official_url: string | null
          scope: string | null
          section: string | null
          source_name: string | null
          summary: string | null
          updated_at: string
          version_date: string | null
        }
        Insert: {
          article?: string | null
          consulted_at?: string | null
          created_at?: string
          id?: string
          norm: string
          official_url?: string | null
          scope?: string | null
          section?: string | null
          source_name?: string | null
          summary?: string | null
          updated_at?: string
          version_date?: string | null
        }
        Update: {
          article?: string | null
          consulted_at?: string | null
          created_at?: string
          id?: string
          norm?: string
          official_url?: string | null
          scope?: string | null
          section?: string | null
          source_name?: string | null
          summary?: string | null
          updated_at?: string
          version_date?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          notification_type: string
          organization_id: string
          read_at: string | null
          sanction_id: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          notification_type: string
          organization_id: string
          read_at?: string | null
          sanction_id?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          notification_type?: string
          organization_id?: string
          read_at?: string | null
          sanction_id?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sanction_id_fkey"
            columns: ["sanction_id"]
            isOneToOne: false
            referencedRelation: "sanctions"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          cif: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          plan: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cif?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          plan?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cif?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          plan?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      sanction_actions: {
        Row: {
          action_date: string
          action_type: string
          created_at: string
          description: string | null
          id: string
          organization_id: string
          performed_by: string | null
          sanction_id: string
        }
        Insert: {
          action_date?: string
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          performed_by?: string | null
          sanction_id: string
        }
        Update: {
          action_date?: string
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          performed_by?: string | null
          sanction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanction_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanction_actions_sanction_id_fkey"
            columns: ["sanction_id"]
            isOneToOne: false
            referencedRelation: "sanctions"
            referencedColumns: ["id"]
          },
        ]
      }
      sanction_analyses: {
        Row: {
          checklist: Json
          coherence_issues: Json
          confidence_level: string
          created_at: string
          created_by: string | null
          evidence_review: Json
          factors: Json
          id: string
          legal_refs: Json
          model: string | null
          next_step: string | null
          organization_id: string
          procedure_review: Json
          rationale: string | null
          recommendation: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sanction_id: string
          status: string
          traffic_light: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          coherence_issues?: Json
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          evidence_review?: Json
          factors?: Json
          id?: string
          legal_refs?: Json
          model?: string | null
          next_step?: string | null
          organization_id: string
          procedure_review?: Json
          rationale?: string | null
          recommendation?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sanction_id: string
          status?: string
          traffic_light?: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          coherence_issues?: Json
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          evidence_review?: Json
          factors?: Json
          id?: string
          legal_refs?: Json
          model?: string | null
          next_step?: string | null
          organization_id?: string
          procedure_review?: Json
          rationale?: string | null
          recommendation?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sanction_id?: string
          status?: string
          traffic_light?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanction_analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanction_analyses_sanction_id_fkey"
            columns: ["sanction_id"]
            isOneToOne: false
            referencedRelation: "sanctions"
            referencedColumns: ["id"]
          },
        ]
      }
      sanction_comments: {
        Row: {
          comment: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          sanction_id: string
          updated_at: string
        }
        Insert: {
          comment: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          sanction_id: string
          updated_at?: string
        }
        Update: {
          comment?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          sanction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanction_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanction_comments_sanction_id_fkey"
            columns: ["sanction_id"]
            isOneToOne: false
            referencedRelation: "sanctions"
            referencedColumns: ["id"]
          },
        ]
      }
      sanction_deadlines: {
        Row: {
          calculation_basis: string | null
          created_at: string
          day_type: string
          deadline_type: string
          document_date: string | null
          end_date: string | null
          id: string
          last_verified_at: string
          notes: string | null
          organization_id: string
          sanction_id: string
          source: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          calculation_basis?: string | null
          created_at?: string
          day_type?: string
          deadline_type: string
          document_date?: string | null
          end_date?: string | null
          id?: string
          last_verified_at?: string
          notes?: string | null
          organization_id: string
          sanction_id: string
          source?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          calculation_basis?: string | null
          created_at?: string
          day_type?: string
          deadline_type?: string
          document_date?: string | null
          end_date?: string | null
          id?: string
          last_verified_at?: string
          notes?: string | null
          organization_id?: string
          sanction_id?: string
          source?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanction_deadlines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanction_deadlines_sanction_id_fkey"
            columns: ["sanction_id"]
            isOneToOne: false
            referencedRelation: "sanctions"
            referencedColumns: ["id"]
          },
        ]
      }
      sanction_documents: {
        Row: {
          created_at: string
          document_type: string | null
          file_name: string
          file_path: string
          id: string
          organization_id: string
          sanction_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          file_name: string
          file_path: string
          id?: string
          organization_id: string
          sanction_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string | null
          file_name?: string
          file_path?: string
          id?: string
          organization_id?: string
          sanction_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sanction_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanction_documents_sanction_id_fkey"
            columns: ["sanction_id"]
            isOneToOne: false
            referencedRelation: "sanctions"
            referencedColumns: ["id"]
          },
        ]
      }
      sanction_draft_versions: {
        Row: {
          change_note: string | null
          content: string
          created_at: string
          created_by: string | null
          draft_id: string
          id: string
          organization_id: string
          version: number
        }
        Insert: {
          change_note?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          draft_id: string
          id?: string
          organization_id: string
          version: number
        }
        Update: {
          change_note?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          draft_id?: string
          id?: string
          organization_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sanction_draft_versions_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "sanction_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanction_draft_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sanction_drafts: {
        Row: {
          created_at: string
          created_by: string | null
          current_version: number
          id: string
          kind: string
          legal_refs: Json
          organization_id: string
          review_notes: string | null
          sanction_id: string
          status: string
          title: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          id?: string
          kind?: string
          legal_refs?: Json
          organization_id: string
          review_notes?: string | null
          sanction_id: string
          status?: string
          title: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          id?: string
          kind?: string
          legal_refs?: Json
          organization_id?: string
          review_notes?: string | null
          sanction_id?: string
          status?: string
          title?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sanction_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanction_drafts_sanction_id_fkey"
            columns: ["sanction_id"]
            isOneToOne: false
            referencedRelation: "sanctions"
            referencedColumns: ["id"]
          },
        ]
      }
      sanction_extractions: {
        Row: {
          confidence: Json
          created_at: string
          created_by: string | null
          document_id: string | null
          error_message: string | null
          fields: Json
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          model: string | null
          ocr_used: boolean
          organization_id: string
          raw_text: string | null
          sanction_id: string | null
          status: string
          updated_at: string
          warnings: Json
        }
        Insert: {
          confidence?: Json
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          error_message?: string | null
          fields?: Json
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          model?: string | null
          ocr_used?: boolean
          organization_id: string
          raw_text?: string | null
          sanction_id?: string | null
          status?: string
          updated_at?: string
          warnings?: Json
        }
        Update: {
          confidence?: Json
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          error_message?: string | null
          fields?: Json
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          model?: string | null
          ocr_used?: boolean
          organization_id?: string
          raw_text?: string | null
          sanction_id?: string | null
          status?: string
          updated_at?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sanction_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sanction_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanction_extractions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanction_extractions_sanction_id_fkey"
            columns: ["sanction_id"]
            isOneToOne: false
            referencedRelation: "sanctions"
            referencedColumns: ["id"]
          },
        ]
      }
      sanction_outcomes: {
        Row: {
          action_taken: string | null
          amount_avoided: number | null
          amount_paid: number | null
          arguments_used: Json
          created_at: string
          discount_applied: number | null
          favorable: boolean | null
          id: string
          organization_id: string
          recommended_action: string | null
          resolution: string | null
          resolution_days: number | null
          sanction_category: string | null
          sanction_id: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          amount_avoided?: number | null
          amount_paid?: number | null
          arguments_used?: Json
          created_at?: string
          discount_applied?: number | null
          favorable?: boolean | null
          id?: string
          organization_id: string
          recommended_action?: string | null
          resolution?: string | null
          resolution_days?: number | null
          sanction_category?: string | null
          sanction_id: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          amount_avoided?: number | null
          amount_paid?: number | null
          arguments_used?: Json
          created_at?: string
          discount_applied?: number | null
          favorable?: boolean | null
          id?: string
          organization_id?: string
          recommended_action?: string | null
          resolution?: string | null
          resolution_days?: number | null
          sanction_category?: string | null
          sanction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanction_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanction_outcomes_sanction_id_fkey"
            columns: ["sanction_id"]
            isOneToOne: true
            referencedRelation: "sanctions"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions: {
        Row: {
          analysis_status: string | null
          appeal_deadline: string | null
          complaint_date: string | null
          created_at: string
          created_by: string | null
          denouncing_agent: string | null
          description: string | null
          discount_percentage: number | null
          discounted_amount: number | null
          driver_id: string | null
          driver_identification_deadline: string | null
          evidence_mentioned: string | null
          id: string
          infraction_time: string | null
          issue_date: string | null
          kilometer_point: string | null
          legal_article: string | null
          legal_norm: string | null
          legal_section: string | null
          location: string | null
          municipality: string | null
          notes: string | null
          notification_date: string | null
          organization_id: string
          original_amount: number | null
          payment_deadline: string | null
          points: number | null
          priority: Database["public"]["Enums"]["sanction_priority"]
          province: string | null
          qualification: string | null
          reception_date: string | null
          recommended_action: string | null
          reference_number: string
          reported_facts: string | null
          requires_driver_identification: boolean
          road: string | null
          sanction_category: string | null
          sanctioning_authority: string | null
          status: Database["public"]["Enums"]["sanction_status"]
          surcharge_amount: number | null
          traffic_light: string | null
          updated_at: string
          vehicle_id: string | null
          violation_date: string | null
        }
        Insert: {
          analysis_status?: string | null
          appeal_deadline?: string | null
          complaint_date?: string | null
          created_at?: string
          created_by?: string | null
          denouncing_agent?: string | null
          description?: string | null
          discount_percentage?: number | null
          discounted_amount?: number | null
          driver_id?: string | null
          driver_identification_deadline?: string | null
          evidence_mentioned?: string | null
          id?: string
          infraction_time?: string | null
          issue_date?: string | null
          kilometer_point?: string | null
          legal_article?: string | null
          legal_norm?: string | null
          legal_section?: string | null
          location?: string | null
          municipality?: string | null
          notes?: string | null
          notification_date?: string | null
          organization_id: string
          original_amount?: number | null
          payment_deadline?: string | null
          points?: number | null
          priority?: Database["public"]["Enums"]["sanction_priority"]
          province?: string | null
          qualification?: string | null
          reception_date?: string | null
          recommended_action?: string | null
          reference_number: string
          reported_facts?: string | null
          requires_driver_identification?: boolean
          road?: string | null
          sanction_category?: string | null
          sanctioning_authority?: string | null
          status?: Database["public"]["Enums"]["sanction_status"]
          surcharge_amount?: number | null
          traffic_light?: string | null
          updated_at?: string
          vehicle_id?: string | null
          violation_date?: string | null
        }
        Update: {
          analysis_status?: string | null
          appeal_deadline?: string | null
          complaint_date?: string | null
          created_at?: string
          created_by?: string | null
          denouncing_agent?: string | null
          description?: string | null
          discount_percentage?: number | null
          discounted_amount?: number | null
          driver_id?: string | null
          driver_identification_deadline?: string | null
          evidence_mentioned?: string | null
          id?: string
          infraction_time?: string | null
          issue_date?: string | null
          kilometer_point?: string | null
          legal_article?: string | null
          legal_norm?: string | null
          legal_section?: string | null
          location?: string | null
          municipality?: string | null
          notes?: string | null
          notification_date?: string | null
          organization_id?: string
          original_amount?: number | null
          payment_deadline?: string | null
          points?: number | null
          priority?: Database["public"]["Enums"]["sanction_priority"]
          province?: string | null
          qualification?: string | null
          reception_date?: string | null
          recommended_action?: string | null
          reference_number?: string
          reported_facts?: string | null
          requires_driver_identification?: boolean
          road?: string | null
          sanction_category?: string | null
          sanctioning_authority?: string | null
          status?: Database["public"]["Enums"]["sanction_status"]
          surcharge_amount?: number | null
          traffic_light?: string | null
          updated_at?: string
          vehicle_id?: string | null
          violation_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          internal_code: string | null
          model: string | null
          organization_id: string
          registration_number: string
          status: string
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          internal_code?: string | null
          model?: string | null
          organization_id: string
          registration_number: string
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          internal_code?: string | null
          model?: string | null
          organization_id?: string
          registration_number?: string
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_records: { Args: { _org: string }; Returns: boolean }
      ensure_active_organization: { Args: never; Returns: string }
      has_org_role: {
        Args: { _org: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_demo_org: { Args: { _org: string }; Returns: boolean }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      sanction_belongs_to_org: {
        Args: { _org: string; _sanction: string }
        Returns: boolean
      }
      shares_org_with: { Args: { _user: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin_empresa" | "gestor_sanciones" | "revisor_juridico"
      member_status: "activo" | "invitado" | "inactivo"
      sanction_priority: "Baja" | "Normal" | "Media" | "Alta" | "Crítica"
      sanction_status:
        | "Nueva"
        | "Pendiente de documentación"
        | "Pendiente de identificación del conductor"
        | "Pendiente de revisión"
        | "Pagar con descuento"
        | "Preparar alegaciones"
        | "Alegaciones presentadas"
        | "Recurso presentado"
        | "Resuelta favorablemente"
        | "Resuelta desfavorablemente"
        | "Pagada"
        | "Archivada"
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
      app_role: ["admin_empresa", "gestor_sanciones", "revisor_juridico"],
      member_status: ["activo", "invitado", "inactivo"],
      sanction_priority: ["Baja", "Normal", "Media", "Alta", "Crítica"],
      sanction_status: [
        "Nueva",
        "Pendiente de documentación",
        "Pendiente de identificación del conductor",
        "Pendiente de revisión",
        "Pagar con descuento",
        "Preparar alegaciones",
        "Alegaciones presentadas",
        "Recurso presentado",
        "Resuelta favorablemente",
        "Resuelta desfavorablemente",
        "Pagada",
        "Archivada",
      ],
    },
  },
} as const
