/**
 * TMS Mock Data — Static data extracted from lovable prototype.
 * Used to render all UI in a purely presentational mode.
 * ZERO API calls, ZERO backend references.
 */

/* ── User Roles ── */
export type UserRole = "admin" | "dispatcher" | "driver";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: "1",
    name: "Karim Benali",
    email: "admin@tms.dz",
    role: "admin",
  },
  {
    id: "2",
    name: "Amira Hadj",
    email: "dispatcher@tms.dz",
    role: "dispatcher",
  },
  {
    id: "3",
    name: "Youcef Merah",
    email: "driver@tms.dz",
    role: "driver",
  },
];

/* ── Admin: Dashboard Stats ── */
export const ADMIN_STATS = [
  {
    label: "Total Users",
    value: "28",
    change: "+3 this month",
    iconName: "Users" as const,
    color: "text-primary",
  },
  {
    label: "Active Vehicles",
    value: "15",
    change: "2 in maintenance",
    iconName: "Truck" as const,
    color: "text-tms-success",
  },
  {
    label: "System Uptime",
    value: "99.8%",
    change: "Last 30 days",
    iconName: "Activity" as const,
    color: "text-tms-info",
  },
  {
    label: "Audit Events",
    value: "1,247",
    change: "Today: 43",
    iconName: "FileText" as const,
    color: "text-accent",
  },
];

export const ADMIN_SERVICES = [
  { name: "PostgreSQL Database", status: "healthy", response: "15ms" },
  { name: "OSRM Routing Engine", status: "healthy", response: "42ms" },
  { name: "OR-Tools Solver", status: "healthy", response: "8s last solve" },
  {
    name: "Geocoding Service",
    status: "degraded",
    response: "78% success",
  },
  { name: "Redis Cache", status: "healthy", response: "Memory 42%" },
];

export const ADMIN_RECENT_ACTIVITY = [
  {
    user: "Amira Hadj",
    action: "Published daily plan",
    time: "2 min ago",
    type: "publish",
  },
  {
    user: "System",
    action: "Driver license expiry alert: Samir K.",
    time: "15 min ago",
    type: "alert",
  },
  {
    user: "Karim Benali",
    action: "Added new vehicle TRK-1247",
    time: "1 hour ago",
    type: "create",
  },
  {
    user: "Amira Hadj",
    action: "Imported 32 tasks via CSV",
    time: "2 hours ago",
    type: "import",
  },
  {
    user: "System",
    action: "Geocoding service degraded",
    time: "3 hours ago",
    type: "warning",
  },
];

/* ── Admin: Users ── */
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "dispatcher" | "driver";
  status: "active" | "inactive";
  lastLogin: string;
}

export const MOCK_USER_RECORDS: UserRecord[] = [
  {
    id: "1",
    name: "Karim Benali",
    email: "admin@tms.dz",
    phone: "+213 555 0101",
    role: "admin",
    status: "active",
    lastLogin: "2 min ago",
  },
  {
    id: "2",
    name: "Amira Hadj",
    email: "dispatcher@tms.dz",
    phone: "+213 555 0102",
    role: "dispatcher",
    status: "active",
    lastLogin: "5 min ago",
  },
  {
    id: "3",
    name: "Youcef Merah",
    email: "driver@tms.dz",
    phone: "+213 555 0103",
    role: "driver",
    status: "active",
    lastLogin: "1 hour ago",
  },
  {
    id: "4",
    name: "Nadia Khelif",
    email: "nadia@tms.dz",
    phone: "+213 555 0104",
    role: "dispatcher",
    status: "active",
    lastLogin: "3 hours ago",
  },
  {
    id: "5",
    name: "Rachid Bouzid",
    email: "rachid@tms.dz",
    phone: "+213 555 0105",
    role: "driver",
    status: "active",
    lastLogin: "Yesterday",
  },
  {
    id: "6",
    name: "Fatima Zahra",
    email: "fatima@tms.dz",
    phone: "+213 555 0106",
    role: "driver",
    status: "inactive",
    lastLogin: "2 weeks ago",
  },
  {
    id: "7",
    name: "Mohamed Ait",
    email: "mohamed@tms.dz",
    phone: "+213 555 0107",
    role: "driver",
    status: "active",
    lastLogin: "30 min ago",
  },
  {
    id: "8",
    name: "Salim Tounsi",
    email: "salim@tms.dz",
    phone: "+213 555 0108",
    role: "driver",
    status: "active",
    lastLogin: "4 hours ago",
  },
];

/* ── Admin: Fleet ── */
export interface Vehicle {
  id: string;
  plate: string;
  type: string;
  make: string;
  model: string;
  year: number;
  status: "active" | "maintenance" | "retired";
  capacity: { passengers: number; weight: number };
  depot: string;
  driver?: string;
}

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "1",
    plate: "16-A-4521",
    type: "Van",
    make: "Renault",
    model: "Master",
    year: 2023,
    status: "active",
    capacity: { passengers: 3, weight: 1200 },
    depot: "Algiers Central",
    driver: "Youcef Merah",
  },
  {
    id: "2",
    plate: "16-B-7832",
    type: "Truck",
    make: "Iveco",
    model: "Daily",
    year: 2022,
    status: "active",
    capacity: { passengers: 2, weight: 3500 },
    depot: "Algiers Central",
  },
  {
    id: "3",
    plate: "09-C-1245",
    type: "Car",
    make: "Peugeot",
    model: "Partner",
    year: 2024,
    status: "active",
    capacity: { passengers: 5, weight: 500 },
    depot: "Blida Depot",
    driver: "Rachid Bouzid",
  },
  {
    id: "4",
    plate: "16-D-9901",
    type: "Bus",
    make: "Mercedes",
    model: "Sprinter",
    year: 2021,
    status: "maintenance",
    capacity: { passengers: 15, weight: 800 },
    depot: "Algiers Central",
  },
  {
    id: "5",
    plate: "16-E-3344",
    type: "Van",
    make: "Renault",
    model: "Kangoo",
    year: 2023,
    status: "active",
    capacity: { passengers: 2, weight: 800 },
    depot: "Oran Depot",
    driver: "Mohamed Ait",
  },
  {
    id: "6",
    plate: "31-F-5500",
    type: "Truck",
    make: "MAN",
    model: "TGE",
    year: 2020,
    status: "retired",
    capacity: { passengers: 2, weight: 5000 },
    depot: "Oran Depot",
  },
];

/* ── Admin: Drivers ── */
export const MOCK_DRIVERS = [
  {
    id: "1",
    name: "Youcef Merah",
    phone: "+213 555 0103",
    license: "DZ-3456789",
    licenseExpiry: "2026-08-15",
    vehicle: "16-A-4521",
    depot: "Algiers Central",
    status: "active",
    shift: "08:00-17:00",
    performance: 96,
  },
  {
    id: "2",
    name: "Rachid Bouzid",
    phone: "+213 555 0105",
    license: "DZ-1234567",
    licenseExpiry: "2026-03-20",
    vehicle: "09-C-1245",
    depot: "Blida Depot",
    status: "active",
    shift: "07:00-16:00",
    performance: 91,
  },
  {
    id: "3",
    name: "Fatima Zahra",
    phone: "+213 555 0106",
    license: "DZ-9876543",
    licenseExpiry: "2027-01-10",
    vehicle: "—",
    depot: "Algiers Central",
    status: "inactive",
    shift: "—",
    performance: 0,
  },
  {
    id: "4",
    name: "Mohamed Ait",
    phone: "+213 555 0107",
    license: "DZ-5678901",
    licenseExpiry: "2026-12-01",
    vehicle: "16-E-3344",
    depot: "Oran Depot",
    status: "active",
    shift: "06:00-15:00",
    performance: 88,
  },
  {
    id: "5",
    name: "Salim Tounsi",
    phone: "+213 555 0108",
    license: "DZ-2345678",
    licenseExpiry: "2026-05-30",
    vehicle: "16-B-7832",
    depot: "Algiers Central",
    status: "active",
    shift: "08:00-17:00",
    performance: 94,
  },
  {
    id: "6",
    name: "Omar Khaldi",
    phone: "+213 555 0109",
    license: "DZ-8765432",
    licenseExpiry: "2026-11-22",
    vehicle: "—",
    depot: "Constantine",
    status: "active",
    shift: "07:30-16:30",
    performance: 85,
  },
];

/* ── Admin: Audit Logs ── */
export const MOCK_AUDIT_LOGS = [
  {
    ts: "2026-03-01 09:45:12",
    user: "Amira Hadj",
    action: "Publish",
    entity: "Plan",
    entityId: "PLN-2026-0301-v2",
    desc: "Published daily plan version 2",
    ip: "192.168.1.42",
  },
  {
    ts: "2026-03-01 09:30:05",
    user: "Amira Hadj",
    action: "Update",
    entity: "Route",
    entityId: "RTE-4521",
    desc: "Moved task TSK-112 from Driver 3 to Driver 5",
    ip: "192.168.1.42",
  },
  {
    ts: "2026-03-01 09:15:33",
    user: "Amira Hadj",
    action: "Create",
    entity: "Plan",
    entityId: "PLN-2026-0301-v1",
    desc: "Generated optimization plan",
    ip: "192.168.1.42",
  },
  {
    ts: "2026-03-01 08:50:01",
    user: "Amira Hadj",
    action: "Create",
    entity: "Task",
    entityId: "TSK-147",
    desc: "Created urgent task: Person Transport to Airport",
    ip: "192.168.1.42",
  },
  {
    ts: "2026-03-01 08:30:22",
    user: "Amira Hadj",
    action: "Update",
    entity: "Driver",
    entityId: "DRV-003",
    desc: "Set driver Fatima Zahra to unavailable (sick)",
    ip: "192.168.1.42",
  },
  {
    ts: "2026-03-01 08:15:10",
    user: "Karim Benali",
    action: "Create",
    entity: "Vehicle",
    entityId: "VEH-TRK1247",
    desc: "Added new vehicle TRK-1247 (Iveco Daily)",
    ip: "192.168.1.10",
  },
  {
    ts: "2026-03-01 08:00:44",
    user: "Amira Hadj",
    action: "Import",
    entity: "Task",
    entityId: "BATCH-032",
    desc: "Bulk imported 32 tasks from CSV",
    ip: "192.168.1.42",
  },
  {
    ts: "2026-03-01 07:45:30",
    user: "Amira Hadj",
    action: "Login",
    entity: "Session",
    entityId: "SES-7841",
    desc: "User logged in",
    ip: "192.168.1.42",
  },
  {
    ts: "2026-02-28 17:30:00",
    user: "System",
    action: "Update",
    entity: "Config",
    entityId: "CFG-001",
    desc: "Health check: Geocoding service degraded (78% success)",
    ip: "127.0.0.1",
  },
  {
    ts: "2026-02-28 17:15:11",
    user: "Amira Hadj",
    action: "Update",
    entity: "Plan",
    entityId: "PLN-2026-0228",
    desc: "Closed day — 94% completion rate",
    ip: "192.168.1.42",
  },
];

/* ── Admin: System Health ── */
export const MOCK_HEALTH_SERVICES = [
  {
    name: "PostgreSQL Database",
    iconName: "Database" as const,
    status: "healthy" as const,
    response: "15ms",
    uptime: "99.99%",
    details: "Connections: 12/100 • Storage: 2.4GB/50GB",
    metrics: { cpu: 8, memory: 42 },
  },
  {
    name: "OSRM Routing Engine",
    iconName: "MapPin" as const,
    status: "healthy" as const,
    response: "42ms",
    uptime: "99.95%",
    details: "5 active matrices • Algeria region loaded",
    metrics: { cpu: 15, memory: 68 },
  },
  {
    name: "OR-Tools Solver",
    iconName: "Cpu" as const,
    status: "healthy" as const,
    response: "—",
    uptime: "99.9%",
    details: "Last solve: 8s • Queue: 0",
    metrics: { cpu: 3, memory: 25 },
  },
  {
    name: "Geocoding Service",
    iconName: "Cloud" as const,
    status: "degraded" as const,
    response: "340ms",
    uptime: "97.2%",
    details: "78% success rate • 156 failures today",
    metrics: { cpu: 22, memory: 55 },
  },
  {
    name: "Redis Cache",
    iconName: "HardDrive" as const,
    status: "healthy" as const,
    response: "1ms",
    uptime: "100%",
    details: "Memory: 42% • Keys: 12,450",
    metrics: { cpu: 2, memory: 42 },
  },
  {
    name: "Storage",
    iconName: "HardDrive" as const,
    status: "healthy" as const,
    response: "5ms",
    uptime: "100%",
    details: "Used: 16GB / 250GB",
    metrics: { cpu: 1, memory: 6 },
  },
];

/* ── Dispatcher: Tasks ── */
export interface Task {
  id: string;
  type: "person" | "delivery";
  pickup: string;
  dropoff: string;
  pickupWindow: string;
  deadline: string;
  priority: "low" | "normal" | "high" | "urgent";
  status:
    | "draft"
    | "planned"
    | "assigned"
    | "in_progress"
    | "completed"
    | "cancelled";
  capacity: number;
  contact: string;
  driver?: string;
}

export const MOCK_TASKS: Task[] = [
  {
    id: "TSK-101",
    type: "person",
    pickup: "Algiers Airport",
    dropoff: "Hotel Sofitel",
    pickupWindow: "08:00-09:00",
    deadline: "10:00",
    priority: "urgent",
    status: "assigned",
    capacity: 2,
    contact: "M. Khalil",
    driver: "Youcef M.",
  },
  {
    id: "TSK-102",
    type: "delivery",
    pickup: "Warehouse A",
    dropoff: "Client Office Hydra",
    pickupWindow: "09:00-10:00",
    deadline: "12:00",
    priority: "high",
    status: "planned",
    capacity: 5,
    contact: "Samira R.",
  },
  {
    id: "TSK-103",
    type: "person",
    pickup: "Office Bab Ezzouar",
    dropoff: "Training Center",
    pickupWindow: "07:30-08:00",
    deadline: "09:00",
    priority: "high",
    status: "assigned",
    capacity: 8,
    contact: "HR Dept",
    driver: "Rachid B.",
  },
  {
    id: "TSK-104",
    type: "delivery",
    pickup: "Port Algiers",
    dropoff: "Storage Blida",
    pickupWindow: "10:00-11:00",
    deadline: "14:00",
    priority: "normal",
    status: "draft",
    capacity: 15,
    contact: "Omar K.",
  },
  {
    id: "TSK-105",
    type: "person",
    pickup: "Rouiba Factory",
    dropoff: "Ain Naadja Clinic",
    pickupWindow: "11:00-12:00",
    deadline: "13:00",
    priority: "normal",
    status: "draft",
    capacity: 1,
    contact: "Dr. Lamia",
  },
  {
    id: "TSK-106",
    type: "delivery",
    pickup: "Supplier Boumerdes",
    dropoff: "Client Tizi Ouzou",
    pickupWindow: "08:00-09:00",
    deadline: "16:00",
    priority: "low",
    status: "draft",
    capacity: 3,
    contact: "Karim L.",
  },
  {
    id: "TSK-107",
    type: "person",
    pickup: "Hotel Aurassi",
    dropoff: "Conference Center",
    pickupWindow: "07:00-07:30",
    deadline: "08:30",
    priority: "urgent",
    status: "in_progress",
    capacity: 4,
    contact: "VIP Guest",
    driver: "Mohamed A.",
  },
  {
    id: "TSK-108",
    type: "delivery",
    pickup: "Pharmacy Central",
    dropoff: "Hospital Mustapha",
    pickupWindow: "06:00-07:00",
    deadline: "08:00",
    priority: "urgent",
    status: "completed",
    capacity: 2,
    contact: "Nurse Fatima",
    driver: "Salim T.",
  },
];

/* ── Dispatcher: Planning Routes ── */
export const MOCK_PLAN_ROUTES = [
  {
    driver: "Youcef Merah",
    vehicle: "16-A-4521",
    stops: 6,
    duration: "4h 20m",
    distance: "68km",
    utilization: 85,
    tasks: ["TSK-101", "TSK-112", "TSK-118", "TSK-125", "TSK-131", "TSK-140"],
  },
  {
    driver: "Rachid Bouzid",
    vehicle: "09-C-1245",
    stops: 5,
    duration: "3h 45m",
    distance: "52km",
    utilization: 72,
    tasks: ["TSK-103", "TSK-109", "TSK-115", "TSK-128", "TSK-136"],
  },
  {
    driver: "Mohamed Ait",
    vehicle: "16-E-3344",
    stops: 7,
    duration: "5h 10m",
    distance: "91km",
    utilization: 92,
    tasks: [
      "TSK-107",
      "TSK-110",
      "TSK-116",
      "TSK-120",
      "TSK-127",
      "TSK-133",
      "TSK-141",
    ],
  },
  {
    driver: "Salim Tounsi",
    vehicle: "16-B-7832",
    stops: 4,
    duration: "2h 50m",
    distance: "35km",
    utilization: 58,
    tasks: ["TSK-104", "TSK-113", "TSK-122", "TSK-137"],
  },
];

export const MOCK_PLAN_UNASSIGNED = [
  {
    id: "TSK-142",
    reason: "Time window conflict — no driver available 06:00-06:30",
  },
  {
    id: "TSK-145",
    reason: "Capacity exceeded — requires 20 units, max vehicle capacity 15",
  },
  {
    id: "TSK-148",
    reason: "Address not geocoded — Rue Inconnu, Algiers",
  },
];

/* ── Dispatcher: Monitor ── */
export const MOCK_MONITOR_OVERVIEW = {
  completed: 28,
  inProgress: 12,
  pending: 4,
  total: 44,
  onTimeRate: 91,
  delays: 3,
};

export const MOCK_DRIVER_STATUS = [
  {
    name: "Youcef Merah",
    currentStop: "Client Office Hydra",
    stopNum: 4,
    totalStops: 6,
    status: "on_route",
    nextEta: "11:45",
    phone: "+213 555 0103",
  },
  {
    name: "Rachid Bouzid",
    currentStop: "Training Center",
    stopNum: 3,
    totalStops: 5,
    status: "at_stop",
    nextEta: "12:10",
    phone: "+213 555 0105",
  },
  {
    name: "Mohamed Ait",
    currentStop: "Warehouse B",
    stopNum: 5,
    totalStops: 7,
    status: "delayed",
    nextEta: "12:30 (+15m)",
    phone: "+213 555 0107",
  },
  {
    name: "Salim Tounsi",
    currentStop: "Storage Blida",
    stopNum: 2,
    totalStops: 4,
    status: "on_route",
    nextEta: "11:20",
    phone: "+213 555 0108",
  },
];

export const MOCK_RECENT_EVENTS = [
  {
    time: "11:32",
    driver: "Youcef M.",
    event: "Completed stop 3 — Hotel Sofitel",
    type: "success",
  },
  {
    time: "11:28",
    driver: "Mohamed A.",
    event: "Reported delay: Traffic on RN5 (+15min)",
    type: "warning",
  },
  {
    time: "11:15",
    driver: "Rachid B.",
    event: "Arrived at Training Center",
    type: "info",
  },
  {
    time: "11:02",
    driver: "Salim T.",
    event: "Completed stop 1 — Port Algiers",
    type: "success",
  },
  {
    time: "10:45",
    driver: "Youcef M.",
    event: "Arrived at Client Office Hydra",
    type: "info",
  },
];

/* ── Driver: Route ── */
export const MOCK_DRIVER_ROUTE = {
  driver: "Youcef Merah",
  vehicle: "16-A-4521 (Renault Master)",
  shift: "08:00 — 17:00",
  depot: "Algiers Central",
  totalStops: 6,
  completedStops: 3,
  totalDistance: "68km",
  eta: "14:30",
};

export const MOCK_DRIVER_STOPS = [
  {
    num: 1,
    address: "Algiers Airport — Terminal 1",
    scheduled: "08:30",
    actual: "08:28",
    status: "done",
    contact: "M. Khalil • +213 555 1001",
    instructions: "Meet at arrivals gate",
    service: "10 min",
  },
  {
    num: 2,
    address: "Hotel Sofitel Algiers",
    scheduled: "09:15",
    actual: "09:20",
    status: "done",
    contact: "Reception • +213 555 1002",
    instructions: "Drop at main entrance",
    service: "5 min",
  },
  {
    num: 3,
    address: "Office Bab Ezzouar — Building C",
    scheduled: "10:00",
    actual: "10:05",
    status: "done",
    contact: "HR Dept • +213 555 1003",
    instructions: "Call on arrival, gate code 4521",
    service: "15 min",
  },
  {
    num: 4,
    address: "Client Office Hydra — 12 Rue Didouche",
    scheduled: "11:30",
    actual: "—",
    status: "current",
    contact: "Samira R. • +213 555 1004",
    instructions: "Package pickup — 2 boxes, fragile",
    service: "10 min",
  },
  {
    num: 5,
    address: "Warehouse A — Zone Industrielle",
    scheduled: "12:45",
    actual: "—",
    status: "pending",
    contact: "Omar K. • +213 555 1005",
    instructions: "Deliver to loading dock B",
    service: "20 min",
  },
  {
    num: 6,
    address: "Algiers Central Depot",
    scheduled: "14:30",
    actual: "—",
    status: "pending",
    contact: "Dispatcher",
    instructions: "Return vehicle, end shift",
    service: "—",
  },
];
