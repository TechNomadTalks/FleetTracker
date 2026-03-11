export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  emailNotifications?: boolean;
  isActive?: boolean;
  createdAt?: string;
  _count?: { trips: number };
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  currentMileage: number;
  serviceInterval: number;
  lastServiceMileage: number;
  status: 'available' | 'out';
  assignedUserId?: string | null;
  assignedUser?: { id: string; name: string; email: string };
  insuranceExpiry?: string | null;
  registrationExpiry?: string | null;
  fuelType?: 'petrol' | 'diesel' | 'electric' | 'hybrid' | null;
  fuelEfficiency?: number | null;
  milesUntilService?: number;
  needsService?: boolean;
  insuranceExpiring?: boolean;
  registrationExpiring?: boolean;
  totalTrips?: number;
  totalMileage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  vehicleId: string;
  userId: string;
  destination: string;
  startMileage: number;
  endMileage: number | null;
  startTime: string;
  endTime: string | null;
  mileageDriven: number | null;
  purpose: 'business' | 'personal' | 'maintenance';
  notes: string | null;
  expenses: number | null;
  hasReceipt?: boolean;
  vehicle?: Vehicle;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceLog {
  id: string;
  vehicleId: string;
  serviceType: string;
  mileageAtService: number;
  notes: string | null;
  performedAt: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'checkout' | 'checkin' | 'service_reminder';
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface DashboardSummary {
  totalVehicles: number;
  availableVehicles: number;
  outVehicles: number;
  totalTrips: number;
  totalUsers: number;
  upcomingServicesCount: number;
}

export interface TripsByMonth {
  month: string;
  trips: number;
  mileage: number;
}

export interface MileageByVehicle {
  vehicleId: string;
  registrationNumber: string;
  totalMileage: number;
  currentMileage: number;
}

export interface CostSummary {
  totalExpenses: number;
  businessExpenses: number;
  personalExpenses: number;
  totalMileage: number;
  tripCount: number;
  expenseChange: number;
  mileageChange: number;
  byPurpose: {
    business: number;
    personal: number;
    maintenance: number;
  };
}

export interface VehicleUtilization {
  vehicleId: string;
  registrationNumber: string;
  status: 'available' | 'out';
  tripCount: number;
  utilizationPercent: number;
}

export interface UtilizationSummary {
  total: number;
  available: number;
  out: number;
  avgUtilization: number;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user: { id: string; name: string; email: string };
  details: {
    vehicle?: string;
    destination?: string;
    mileage?: number;
    purpose?: string;
  };
  timestamp: string;
}
