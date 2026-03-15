/**
 * SINAR Type Definitions
 * Core types for the entire application.
 */

// ═══ AUTH ═══
export type Role = 'admin' | 'prajurit' | 'keluarga';
export type AccountType = 'prajurit' | 'suami' | 'istri' | 'anak';
export type Tier = 'Gold' | 'Silver' | 'Bronze';

export interface User {
  id: string;
  nrp: string;
  name: string;
  role: Role;
  account_type: AccountType;
  satuan: string;
  kodam_id?: string;
  rank: number; // 0=Prajurit, 1=Kopral, 2=Sersan, 3=Letnan, 4=Kapten
  xp: number;
  tier: Tier;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// ═══ MISSIONS ═══
export type MissionType = 'EVENT' | 'KONTEN' | 'ENGAGEMENT' | 'EDUKASI' | 'AKSI';
export type MissionStatus = 'DRAFT' | 'TERBUKA' | 'SIAGA' | 'PRIORITAS' | 'SELESAI';
export type JoinStatus = 'TERDAFTAR' | 'SUBMITTED' | 'REVIEW' | 'SELESAI';

export interface Mission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  xp_reward: number;
  bonus_xp: number;
  deadline?: string;
  status: MissionStatus;
  image_url?: string;
  type_config?: Record<string, any>;
  template_captions?: string[];
  participants?: number;
  my_status?: JoinStatus;
  created_at: string;
}

export interface MissionJoin {
  join_id: string;
  status: JoinStatus;
  joined_at: string;
  mission: Pick<Mission, 'id' | 'type' | 'title' | 'xp_reward'>;
}

export interface Submission {
  id: string;
  join_id: string;
  user_id: string;
  media_url?: string;
  caption: string;
  platform?: string;
  post_url?: string;
  ai_score?: number;
  brief_match?: number;
  brief_checks?: Array<{ l: string; ok: boolean }>;
  admin_status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  user?: Pick<User, 'id' | 'name' | 'nrp'>;
  mission?: Pick<Mission, 'id' | 'title' | 'type'>;
}

// ═══ GAMIFICATION ═══
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Badge {
  id: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  icon: string;
}

export interface UserBadge {
  id: string;
  badge: Badge;
  earned_at: string;
}

export interface XPTransaction {
  id: string;
  amount: number;
  source: 'mission' | 'bonus' | 'reward' | 'admin';
  mission_id?: string;
  description: string;
  created_at: string;
}

// ═══ SHOP ═══
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  cost_xp: number;
  stock: number;
  category: 'apparel' | 'merchandise' | 'sponsor' | 'exclusive';
  is_active: boolean;
}

export interface ShopOrder {
  id: string;
  item_id: string;
  quantity: number;
  total_xp: number;
  ordered_at: string;
}

// ═══ ADMIN ═══
export interface DashboardStats {
  total_users: number;
  active_users: number;
  total_missions: number;
  active_missions: number;
  pending_reviews: number;
  total_xp_distributed: number;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  target_type: string;
  target_kodam?: string;
  priority: 'normal' | 'urgent';
  channel?: string[];
  sent_count: number;
  read_count: number;
  sent_at: string;
}

// ═══ GEO ═══
export interface Kodam {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  region: string;
  missions?: number;
  active?: number;
  agents?: number;
  status?: 'hot' | 'warm' | 'cool';
}

export interface FamilyLink {
  id: string;
  relation: 'suami' | 'istri' | 'anak';
  member: Pick<User, 'id' | 'name' | 'xp' | 'account_type'>;
}

// ═══ API ═══
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ApiError {
  status: number;
  detail: string;
}
