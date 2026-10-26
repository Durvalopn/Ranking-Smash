/**
 * Tipos do banco de dados Supabase.
 *
 * Para regenerar automaticamente este arquivo:
 *
 * npx supabase gen types typescript \
 *   --project-id SEU_PROJECT_ID \
 *   --schema public > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "athlete" | "admin";
export type AthleteStatus = "active" | "licensed" | "inactive" | "pendente";
export type SeasonStatus =
  | "draft"
  | "registration"
  | "active"
  | "completed"
  | "cancelled";

export type SeasonType =
  | "australia_open"
  | "roland_garros"
  | "wimbledon"
  | "us_open"
  | "finals";

export type RoundStatus =
  | "draft"
  | "open"
  | "drawn"
  | "closed"
  | "cancelled";

export type MatchStatus =
  | "scheduled"
  | "pending"
  | "awaiting_result"
  | "result_submitted"
  | "confirmed"
  | "contested"
  | "completed"
  | "walkover"
  | "cancelled";

export type ResultStatus =
  | "pending"
  | "submitted"
  | "confirmed"
  | "contested"
  | "adjusted"
  | "cancelled";

export type ResultType =
  | "played"
  | "walkover"
  | "double_walkover"
  | "bye"
  | "administrative";

export type NotificationType =
  | "general"
  | "round_opened"
  | "round_closing"
  | "draw_completed"
  | "match_scheduled"
  | "result_submitted"
  | "result_confirmed"
  | "result_contested"
  | "promotion"
  | "relegation"
  | "finals_qualification";

export type ClassChangeType = "promotion" | "relegation" | "adjustment";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          birth_date: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          birth_date?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          birth_date?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      athletes: {
        Row: {
          id: string;
          user_id: string;
          current_class: number;
          status: AthleteStatus;
          joined_at: string;
          licensed_at: string | null;
          inactive_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_class?: number;
          status?: AthleteStatus;
          joined_at?: string;
          licensed_at?: string | null;
          inactive_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          current_class?: number;
          status?: AthleteStatus;
          joined_at?: string;
          licensed_at?: string | null;
          inactive_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "athletes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      seasons: {
        Row: {
          id: string;
          name: string;
          slug: string;
          year: number;
          season_type: SeasonType;
          status: SeasonStatus;
          starts_at: string | null;
          ends_at: string | null;
          registration_starts_at: string | null;
          registration_ends_at: string | null;
          rounds_count: number;
          finals_slots_per_class: number;
          promotion_percentage: number;
          relegation_percentage: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          year: number;
          season_type: SeasonType;
          status?: SeasonStatus;
          starts_at?: string | null;
          ends_at?: string | null;
          registration_starts_at?: string | null;
          registration_ends_at?: string | null;
          rounds_count?: number;
          finals_slots_per_class?: number;
          promotion_percentage?: number;
          relegation_percentage?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          year?: number;
          season_type?: SeasonType;
          status?: SeasonStatus;
          starts_at?: string | null;
          ends_at?: string | null;
          registration_starts_at?: string | null;
          registration_ends_at?: string | null;
          rounds_count?: number;
          finals_slots_per_class?: number;
          promotion_percentage?: number;
          relegation_percentage?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      season_participants: {
        Row: {
          id: string;
          season_id: string;
          athlete_id: string;
          class_number: number;
          status: AthleteStatus;
          joined_round: number;
          is_eligible_for_promotion: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          athlete_id: string;
          class_number: number;
          status?: AthleteStatus;
          joined_round?: number;
          is_eligible_for_promotion?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          athlete_id?: string;
          class_number?: number;
          status?: AthleteStatus;
          joined_round?: number;
          is_eligible_for_promotion?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "season_participants_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "season_participants_athlete_id_fkey";
            columns: ["athlete_id"];
            isOneToOne: false;
            referencedRelation: "athletes";
            referencedColumns: ["id"];
          },
        ];
      };

      rounds: {
        Row: {
          id: string;
          season_id: string;
          round_number: number;
          name: string;
          status: RoundStatus;
          opens_at: string | null;
          closes_at: string | null;
          drawn_at: string | null;
          closed_at: string | null;
          drawn_by: string | null;
          closed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          round_number: number;
          name: string;
          status?: RoundStatus;
          opens_at?: string | null;
          closes_at?: string | null;
          drawn_at?: string | null;
          closed_at?: string | null;
          drawn_by?: string | null;
          closed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          round_number?: number;
          name?: string;
          status?: RoundStatus;
          opens_at?: string | null;
          closes_at?: string | null;
          drawn_at?: string | null;
          closed_at?: string | null;
          drawn_by?: string | null;
          closed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rounds_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };

      matches: {
        Row: {
          id: string;
          season_id: string;
          round_id: string;
          class_number: number;
          athlete_one_id: string;
          athlete_two_id: string | null;
          winner_id: string | null;
          loser_id: string | null;
          status: MatchStatus;
          result_type: ResultType | null;
          is_repeated_match: boolean;
          repeat_reason: string | null;
          draw_score: number | null;
          scheduled_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          round_id: string;
          class_number: number;
          athlete_one_id: string;
          athlete_two_id?: string | null;
          winner_id?: string | null;
          loser_id?: string | null;
          status?: MatchStatus;
          result_type?: ResultType | null;
          is_repeated_match?: boolean;
          repeat_reason?: string | null;
          draw_score?: number | null;
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          round_id?: string;
          class_number?: number;
          athlete_one_id?: string;
          athlete_two_id?: string | null;
          winner_id?: string | null;
          loser_id?: string | null;
          status?: MatchStatus;
          result_type?: ResultType | null;
          is_repeated_match?: boolean;
          repeat_reason?: string | null;
          draw_score?: number | null;
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_athlete_one_id_fkey";
            columns: ["athlete_one_id"];
            isOneToOne: false;
            referencedRelation: "athletes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_athlete_two_id_fkey";
            columns: ["athlete_two_id"];
            isOneToOne: false;
            referencedRelation: "athletes";
            referencedColumns: ["id"];
          },
        ];
      };

      results: {
        Row: {
          id: string;
          match_id: string;
          submitted_by: string;
          confirmed_by: string | null;
          winner_id: string | null;
          loser_id: string | null;
          winner_games: number | null;
          loser_games: number | null;
          winner_points: number;
          loser_points: number;
          result_type: ResultType;
          status: ResultStatus;
          notes: string | null;
          contest_reason: string | null;
          submitted_at: string;
          confirmed_at: string | null;
          contested_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          submitted_by: string;
          confirmed_by?: string | null;
          winner_id?: string | null;
          loser_id?: string | null;
          winner_games?: number | null;
          loser_games?: number | null;
          winner_points?: number;
          loser_points?: number;
          result_type?: ResultType;
          status?: ResultStatus;
          notes?: string | null;
          contest_reason?: string | null;
          submitted_at?: string;
          confirmed_at?: string | null;
          contested_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          submitted_by?: string;
          confirmed_by?: string | null;
          winner_id?: string | null;
          loser_id?: string | null;
          winner_games?: number | null;
          loser_games?: number | null;
          winner_points?: number;
          loser_points?: number;
          result_type?: ResultType;
          status?: ResultStatus;
          notes?: string | null;
          contest_reason?: string | null;
          submitted_at?: string;
          confirmed_at?: string | null;
          contested_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };

      standings: {
        Row: {
          id: string;
          season_id: string;
          athlete_id: string;
          class_number: number;
          position: number | null;
          points: number;
          matches_played: number;
          wins: number;
          losses: number;
          walkover_wins: number;
          walkover_losses: number;
          bye_wins: number;
          sets_won: number;
          sets_lost: number;
          sets_balance: number;
          games_won: number;
          games_lost: number;
          games_balance: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          athlete_id: string;
          class_number: number;
          position?: number | null;
          points?: number;
          matches_played?: number;
          wins?: number;
          losses?: number;
          walkover_wins?: number;
          walkover_losses?: number;
          bye_wins?: number;
          sets_won?: number;
          sets_lost?: number;
          sets_balance?: number;
          games_won?: number;
          games_lost?: number;
          games_balance?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          athlete_id?: string;
          class_number?: number;
          position?: number | null;
          points?: number;
          matches_played?: number;
          wins?: number;
          losses?: number;
          walkover_wins?: number;
          walkover_losses?: number;
          bye_wins?: number;
          sets_won?: number;
          sets_lost?: number;
          sets_balance?: number;
          games_won?: number;
          games_lost?: number;
          games_balance?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "standings_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "standings_athlete_id_fkey";
            columns: ["athlete_id"];
            isOneToOne: false;
            referencedRelation: "athletes";
            referencedColumns: ["id"];
          },
        ];
      };

      annual_standings: {
        Row: {
          id: string;
          year: number;
          athlete_id: string;
          class_number: number;
          position: number | null;
          points: number;
          sets_balance: number;
          games_balance: number;
          season_titles: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          year: number;
          athlete_id: string;
          class_number: number;
          position?: number | null;
          points?: number;
          sets_balance?: number;
          games_balance?: number;
          season_titles?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          year?: number;
          athlete_id?: string;
          class_number?: number;
          position?: number | null;
          points?: number;
          sets_balance?: number;
          games_balance?: number;
          season_titles?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "annual_standings_athlete_id_fkey";
            columns: ["athlete_id"];
            isOneToOne: false;
            referencedRelation: "athletes";
            referencedColumns: ["id"];
          },
        ];
      };

      class_changes: {
        Row: {
          id: string;
          season_id: string;
          athlete_id: string;
          previous_class: number;
          new_class: number;
          change_type: ClassChangeType;
          reason: string | null;
          applied_by: string | null;
          applied_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          athlete_id: string;
          previous_class: number;
          new_class: number;
          change_type: ClassChangeType;
          reason?: string | null;
          applied_by?: string | null;
          applied_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          athlete_id?: string;
          previous_class?: number;
          new_class?: number;
          change_type?: ClassChangeType;
          reason?: string | null;
          applied_by?: string | null;
          applied_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_changes_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_changes_athlete_id_fkey";
            columns: ["athlete_id"];
            isOneToOne: false;
            referencedRelation: "athletes";
            referencedColumns: ["id"];
          },
        ];
      };

      finals_qualifiers: {
        Row: {
          id: string;
          year: number;
          class_number: number;
          athlete_id: string;
          source_season_id: string | null;
          qualification_type: "season_champion" | "annual_ranking";
          qualification_position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          year: number;
          class_number: number;
          athlete_id: string;
          source_season_id?: string | null;
          qualification_type: "season_champion" | "annual_ranking";
          qualification_position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          year?: number;
          class_number?: number;
          athlete_id?: string;
          source_season_id?: string | null;
          qualification_type?: "season_champion" | "annual_ranking";
          qualification_position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "finals_qualifiers_athlete_id_fkey";
            columns: ["athlete_id"];
            isOneToOne: false;
            referencedRelation: "athletes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finals_qualifiers_source_season_id_fkey";
            columns: ["source_season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          data: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: NotificationType;
          title: string;
          message: string;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          message?: string;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string | null;
          record_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          table_name?: string | null;
          record_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          table_name?: string | null;
          record_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };

    Views: {
      athlete_profiles: {
        Row: {
          athlete_id: string | null;
          user_id: string | null;
          full_name: string | null;
          email: string | null;
          birth_date: string | null;
          avatar_url: string | null;
          current_class: number | null;
          status: AthleteStatus | null;
        };
        Relationships: [];
      };

      current_season_standings: {
        Row: {
          season_id: string | null;
          season_name: string | null;
          athlete_id: string | null;
          athlete_name: string | null;
          class_number: number | null;
          position: number | null;
          points: number | null;
          sets_balance: number | null;
          games_balance: number | null;
          birth_date: string | null;
        };
        Relationships: [];
      };
    };

    Functions: {
      generate_round_draw: {
        Args: {
          p_round_id: string;
          p_force?: boolean;
        };
        Returns: Json;
      };

      calculate_season_standings: {
        Args: {
          p_season_id: string;
          p_class_number?: number;
        };
        Returns: undefined;
      };

      calculate_annual_standings: {
        Args: {
          p_year: number;
          p_class_number?: number;
        };
        Returns: undefined;
      };

      close_round: {
        Args: {
          p_round_id: string;
          p_admin_id?: string;
        };
        Returns: Json;
      };

      close_season: {
        Args: {
          p_season_id: string;
          p_admin_id?: string;
        };
        Returns: Json;
      };

      apply_promotions_and_relegations: {
        Args: {
          p_season_id: string;
        };
        Returns: Json;
      };

      select_finals_qualifiers: {
        Args: {
          p_year: number;
          p_slots_per_class?: number;
        };
        Returns: Json;
      };

      is_admin: {
        Args: {
          p_user_id?: string;
        };
        Returns: boolean;
      };
    };

    Enums: {
      user_role: UserRole;
      season_status: SeasonStatus;
      season_type: SeasonType;
      round_status: RoundStatus;
      match_status: MatchStatus;
      result_status: ResultStatus;
      result_type: ResultType;
      notification_type: NotificationType;
      class_change_type: ClassChangeType;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<
  TableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends TableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[TableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = TableNameOrOptions extends { schema: keyof Database }
  ? Database[TableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer Row;
    }
    ? Row
    : never
  : TableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][TableNameOrOptions] extends {
        Row: infer Row;
      }
      ? Row
      : never
    : never;

export type TablesInsert<
  TableName extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][TableName] extends {
  Insert: infer Insert;
}
  ? Insert
  : never;

export type TablesUpdate<
  TableName extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][TableName] extends {
  Update: infer Update;
}
  ? Update
  : never;

export type Enums<
  EnumName extends keyof PublicSchema["Enums"],
> = PublicSchema["Enums"][EnumName];

export type Profile = Tables<"profiles">;
export type Athlete = Tables<"athletes">;
export type Season = Tables<"seasons">;
export type SeasonParticipant = Tables<"season_participants">;
export type Round = Tables<"rounds">;
export type Match = Tables<"matches">;
export type Result = Tables<"results">;
export type Standing = Tables<"standings">;
export type AnnualStanding = Tables<"annual_standings">;
export type ClassChange = Tables<"class_changes">;
export type FinalsQualifier = Tables<"finals_qualifiers">;
export type Notification = Tables<"notifications">;
export type AuditLog = Tables<"audit_logs">;

export type AthleteWithProfile = Athlete & {
  profile: Profile;
};

export type MatchWithAthletes = Match & {
  athlete_one: AthleteWithProfile;
  athlete_two: AthleteWithProfile | null;
};

export type StandingWithAthlete = Standing & {
  athlete: AthleteWithProfile;
};
