export type UserRole =
  | "SUPER_ADMIN"
  | "CLUB_ADMIN"
  | "HANDICAP_CHAIR"
  | "TOURNAMENT_ADMIN"
  | "MEMBER"
  | "READ_ONLY";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  clubIds: string[];
  golferId?: string | null;
  status?: string;
}

export interface AuthPayload {
  token: string;
  user: AuthUser;
}

export interface ClubSummary {
  id: string;
  name: string;
  clubNumber?: string | null;
  status?: string;
}

export interface ClubContactRecord {
  contactType: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface ClubRecord extends ClubSummary {
  ghpId?: string | null;
  shortName?: string | null;
  associationName?: string | null;
  clubCategory?: string | null;
  clubType?: string | null;
  isTestClub?: boolean;
  authorized?: boolean;
  isDac?: boolean;
  frontEndProvider?: string | null;
  usgaAgaClub?: boolean;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  hubspotCompanyId?: string | null;
  handicapChairperson?: string | null;
  contacts?: ClubContactRecord[];
}

export interface AddressRecord {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface PageInfo {
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface GolferRecord {
  id: string;
  clubId?: string;
  ghinNumber?: string | null;
  localNumber?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  address?: AddressRecord | null;
  membershipCode?: string | null;
  membershipStatus?: string | null;
  digitalProfileStatus?: string | null;
  currentHandicapIndex?: number | null;
  lowHandicapIndex?: number | null;
  lowHandicapDate?: string | null;
  statusDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GolferSearchResultRecord {
  ghinNumber?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  currentClubName?: string | null;
  canAddToClub: boolean;
}

export interface ScoreRecord {
  id: string;
  datePlayed: string;
  scoreType?: string;
  holes?: number;
  entryMode?: string;
  grossScore: number;
  adjustedGrossScore?: number | null;
  courseRating?: number;
  slopeRating?: number;
  par?: number;
  differential?: number | null;
  status: string;
  courseNameSnapshot: string;
  teeNameSnapshot: string;
  holeScores?: number[] | null;
}

export interface NineHoleRatingRecord {
  rating: number;
  slope: number;
  par?: number | null;
}

export interface TeeRecord {
  teeId: string;
  teeName: string;
  gender: string;
  par: number;
  courseRating: number;
  bogeyRating?: number | null;
  slopeRating: number;
  frontNine?: NineHoleRatingRecord | null;
  backNine?: NineHoleRatingRecord | null;
  yardage?: number | null;
  holeYardages?: number[] | null;
  holePars?: number[] | null;
  holeHandicaps?: number[] | null;
}

export interface CourseRecord {
  id: string;
  clubId: string;
  facilityName: string;
  courseName: string;
  city: string;
  state: string;
  isPrimaryFacility: boolean;
  tees: TeeRecord[];
  defaultMaleTeeId?: string | null;
  defaultFemaleTeeId?: string | null;
}

export interface TournamentEligibilityRecord {
  minHandicapIndex?: number | null;
  maxHandicapIndex?: number | null;
  gender?: string | null;
  membershipCodes?: string[] | null;
}

export interface TournamentRecord {
  id: string;
  clubId?: string;
  name: string;
  description?: string | null;
  startDate?: string;
  endDate?: string | null;
  courseId?: string | null;
  format?: string;
  registrationStatus?: string;
  registrationOpenAt?: string | null;
  registrationCloseAt?: string | null;
  maxPlayers?: number | null;
  registeredPlayerCount?: number;
  entryFee?: number | null;
  membersOnly?: boolean;
  allowGuests?: boolean;
  status?: string;
  eligibility?: TournamentEligibilityRecord | null;
}

export interface TournamentRegistrationRecord {
  id: string;
  tournamentId: string;
  clubId?: string;
  golferId: string;
  playerNameSnapshot?: string;
  ghinNumberSnapshot?: string | null;
  emailSnapshot?: string | null;
  handicapIndexSnapshot?: number | null;
  preferredTeeId?: string | null;
  status: string;
  paymentStatus?: string;
  notes?: string | null;
  registeredAt?: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  entityType: string;
  summary: string;
  actorEmail: string;
  createdAt: string;
}
