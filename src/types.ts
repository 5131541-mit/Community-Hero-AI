export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export type IssueCategory = 'Road' | 'Waste' | 'Electricity' | 'Water' | 'Safety' | 'Traffic' | 'Other';
export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Reported' | 'In Progress' | 'Resolved';

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  specificType: string;
  severity: IssueSeverity;
  latitude: number;
  longitude: number;
  address?: string;
  imageUrl?: string;
  resolvedImageUrl?: string;
  status: IssueStatus;
  upvotes: number;
  upvotedBy: string[];
  reporterEmail: string;
  reporterName: string;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  department: string;
  priorityScore: number;
  assignedTo?: string;
  damageEstimation?: string; // Gemini vision damage appraisal
  aiRiskAnalysis?: {
    hazardLevel: number;
    propagationRisk: number;
    socialDemandScore: number;
    safetyRecommendation: string;
  };
}

export interface CivicEvent {
  id: string;
  title: string;
  description: string;
  category: 'Cleanup Drive' | 'Tree Planting' | 'Awareness Campaign' | 'Volunteer Event' | 'Other';
  date: string;
  time: string;
  locationName: string;
  creatorEmail: string;
  creatorName: string;
  attendees: string[];
  createdAt: string;
}

export interface UserProfile {
  email: string;
  name: string;
  role: 'resident' | 'official';
  points: number;
  level: number;
  badges: string[]; // Badge IDs
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  target: number;
  current: number;
  completed: boolean;
  category: string;
}

export interface AssetCrewAssignment {
  crewName: string;
  allocatedQty: number;
  assignedAt: string;
}

export interface InventoryAsset {
  id: string;
  name: string;
  category: string;
  totalStock: number;
  availableStock: number;
  unit: string;
  assignedCrews: AssetCrewAssignment[];
}
