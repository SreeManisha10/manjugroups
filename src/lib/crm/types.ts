/**
 * Domain types for the Real Estate CRM.
 * These mirror the future database tables 1:1, so swapping the mock
 * repository for real API calls does not change any component.
 */

export const LEAD_STAGES = [
  "New",
  "Contacted",
  "Site Visit",
  "Interested",
  "Negotiation",
  "Booked",
  "Lost",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export type Role = "Admin" | "Sales Employee";

export interface User {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
}

export interface Note {
  id: string;
  leadId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  budget: number; // INR
  stage: LeadStage;
  assigneeId: string;
  interestedUnitId: string | null;
  followUpDate: string | null; // ISO date (yyyy-mm-dd)
  createdAt: string;
  lostReason?: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
}

export interface Building {
  id: string;
  projectId: string;
  name: string;
}

export type UnitStatus = "Available" | "Reserved" | "Sold";

export interface Unit {
  id: string;
  buildingId: string;
  code: string; // e.g. T-702
  type: string; // 2BHK / 3BHK
  areaSqft: number;
  price: number; // INR
  status: UnitStatus;
  assignedToId?: string | null;
}

export interface Booking {
  id: string;
  leadId: string;
  unitId: string;
  agentId: string;
  amount: number;
  createdAt: string;
}

export interface CrmData {
  users: User[];
  leads: Lead[];
  notes: Note[];
  projects: Project[];
  buildings: Building[];
  units: Unit[];
  bookings: Booking[];
}
