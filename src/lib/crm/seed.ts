import type { CrmData } from "./types";

const d = (offset: number) => {
  const x = new Date();
  x.setDate(x.getDate() + offset);
  return x.toISOString().slice(0, 10);
};

const iso = (offset: number) => {
  const x = new Date();
  x.setDate(x.getDate() + offset);
  return x.toISOString();
};

/**
 * Demo dataset. When the backend is connected this whole file is dropped and
 * the repository in `api.ts` fetches the same shapes over HTTP.
 */
export const seed: CrmData = {
  users: [
    { id: "u1", name: "Arjun Rao", email: "arjun@manjugroups.in", role: "Admin" },
    { id: "u2", name: "Meera Krishnan", email: "meera@manjugroups.in", role: "Sales Employee" },
    { id: "u3", name: "Sahil Verma", email: "sahil@manjug0roups.in", role: "Sales Employee" },
  ],
  projects: [
    { id: "p1", name: "Skyline Residency", location: "Bandra West" },
    { id: "p2", name: "Marina Palms", location: "Worli" },
    { id: "p3", name: "Greenwood Heights", location: "Andheri" },
  ],
  buildings: [
    { id: "b1", projectId: "p1", name: "Tower A" },
    { id: "b2", projectId: "p1", name: "Tower B" },
    { id: "b3", projectId: "p2", name: "Bay Block" },
    { id: "b4", projectId: "p3", name: "South Wing" },
  ],
  units: [
    { id: "un1", buildingId: "b1", code: "T-101", type: "2BHK", areaSqft: 980, price: 11000000, status: "Sold", assignedToId: "u2" },
    { id: "un2", buildingId: "b1", code: "T-102", type: "2BHK", areaSqft: 980, price: 11200000, status: "Available", assignedToId: "u2" },
    { id: "un3", buildingId: "b1", code: "T-305", type: "3BHK", areaSqft: 1380, price: 16000000, status: "Available", assignedToId: "u2" },
    { id: "un4", buildingId: "b1", code: "T-702", type: "3BHK", areaSqft: 1420, price: 18500000, status: "Reserved", assignedToId: "u3" },
    { id: "un5", buildingId: "b2", code: "T-118", type: "2BHK", areaSqft: 940, price: 10400000, status: "Available", assignedToId: "u2" },
    { id: "un6", buildingId: "b2", code: "T-904", type: "4BHK", areaSqft: 2100, price: 29000000, status: "Available", assignedToId: "u3" },
    { id: "un7", buildingId: "b3", code: "B-014", type: "2BHK", areaSqft: 1010, price: 13500000, status: "Available", assignedToId: "u2" },
    { id: "un8", buildingId: "b3", code: "B-066", type: "3BHK", areaSqft: 1500, price: 19800000, status: "Available", assignedToId: "u3" },
    { id: "un9", buildingId: "b3", code: "B-120", type: "3BHK", areaSqft: 1620, price: 24000000, status: "Sold", assignedToId: "u3" },
    { id: "un10", buildingId: "b4", code: "S-090", type: "1BHK", areaSqft: 620, price: 7200000, status: "Sold", assignedToId: "u2" },
    { id: "un11", buildingId: "b4", code: "S-410", type: "2BHK", areaSqft: 880, price: 9200000, status: "Available", assignedToId: "u2" },
    { id: "un12", buildingId: "b4", code: "S-512", type: "3BHK", areaSqft: 1340, price: 14500000, status: "Available", assignedToId: "u3" },
  ],
  leads: [
    {
      id: "l1",
      name: "Rohit Sharma",
      phone: "+91 98200 41233",
      email: "rohit.s@example.com",
      source: "Website",
      budget: 18000000,
      stage: "Negotiation",
      assigneeId: "u1",
      interestedUnitId: "un4",
      followUpDate: d(-2),
      createdAt: iso(-24),
    },
    {
      id: "l2",
      name: "Priya Mehta",
      phone: "+91 98450 22110",
      email: "priya.m@example.com",
      source: "Walk-in",
      budget: 9500000,
      stage: "Interested",
      assigneeId: "u2",
      interestedUnitId: "un11",
      followUpDate: d(0),
      createdAt: iso(-16),
    },
    {
      id: "l3",
      name: "Karan Dutt",
      phone: "+91 99870 55621",
      email: "karan.d@example.com",
      source: "Referral",
      budget: 24000000,
      stage: "Booked",
      assigneeId: "u3",
      interestedUnitId: "un9",
      followUpDate: null,
      createdAt: iso(-40),
    },
    {
      id: "l4",
      name: "Ananya Iyer",
      phone: "+91 90040 78812",
      email: "ananya.i@example.com",
      source: "Portal",
      budget: 11000000,
      stage: "New",
      assigneeId: "u1",
      interestedUnitId: null,
      followUpDate: d(2),
      createdAt: iso(-3),
    },
    {
      id: "l5",
      name: "Vikram Nair",
      phone: "+91 98920 33090",
      email: "vikram.n@example.com",
      source: "Website",
      budget: 16000000,
      stage: "Lost",
      assigneeId: "u2",
      interestedUnitId: "un3",
      followUpDate: null,
      createdAt: iso(-52),
      lostReason: "Bought elsewhere",
    },
    {
      id: "l6",
      name: "Sana Qureshi",
      phone: "+91 98111 60422",
      email: "sana.q@example.com",
      source: "Referral",
      budget: 13500000,
      stage: "Contacted",
      assigneeId: "u3",
      interestedUnitId: "un7",
      followUpDate: d(0),
      createdAt: iso(-7),
    },
    {
      id: "l7",
      name: "Dev Patel",
      phone: "+91 97020 18844",
      email: "dev.p@example.com",
      source: "Portal",
      budget: 10500000,
      stage: "Site Visit",
      assigneeId: "u2",
      interestedUnitId: "un5",
      followUpDate: d(1),
      createdAt: iso(-11),
    },
    {
      id: "l8",
      name: "Ishaan Verma",
      phone: "+91 99303 77120",
      email: "ishaan.v@example.com",
      source: "Walk-in",
      budget: 7500000,
      stage: "Booked",
      assigneeId: "u1",
      interestedUnitId: "un10",
      followUpDate: null,
      createdAt: iso(-33),
    },
    {
      id: "l9",
      name: "Neha Gupta",
      phone: "+91 90876 22314",
      email: "neha.g@example.com",
      source: "Website",
      budget: 29000000,
      stage: "Negotiation",
      assigneeId: "u3",
      interestedUnitId: "un6",
      followUpDate: d(-1),
      createdAt: iso(-19),
    },
  ],
  notes: [
    {
      id: "n1",
      leadId: "l1",
      authorId: "u1",
      body: "Wants ₹10L off if he can pay full in 30 days. Sending revised offer tonight.",
      createdAt: iso(-3),
    },
    {
      id: "n2",
      leadId: "l1",
      authorId: "u2",
      body: "Site visit done, liked the 40th-floor view. Comparing with Marina Palms.",
      createdAt: iso(-9),
    },
    {
      id: "n3",
      leadId: "l2",
      authorId: "u2",
      body: "Needs a home loan pre-approval. Shared bank contact.",
      createdAt: iso(-4),
    },
  ],
  bookings: [
    { id: "bk1", leadId: "l3", unitId: "un9", agentId: "u3", amount: 24000000, createdAt: iso(-12) },
    { id: "bk2", leadId: "l8", unitId: "un10", agentId: "u1", amount: 7200000, createdAt: iso(-5) },
  ],
};
