import { gql } from "graphql-tag";

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # ─── Auth ────────────────────────────────────────────────────────────────────

  enum UserRole {
    SUPER_ADMIN
    CLUB_ADMIN
    HANDICAP_CHAIR
    TOURNAMENT_ADMIN
    MEMBER
    READ_ONLY
  }

  enum UserStatus {
    ACTIVE
    INACTIVE
    LOCKED
  }

  type AuthUser {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    role: UserRole!
    clubIds: [ID!]!
    golferId: ID
    status: UserStatus!
  }

  type AuthPayload {
    token: String!
    user: AuthUser!
  }

  type MutationResponse {
    success: Boolean!
    message: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  # ─── Shared ───────────────────────────────────────────────────────────────────

  type PageInfo {
    totalCount: Int!
    page: Int!
    pageSize: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  # ─── Club ─────────────────────────────────────────────────────────────────────

  enum ClubStatus {
    ACTIVE
    INACTIVE
  }

  type ClubContact {
    contactType: String!
    name: String
    email: String
    phone: String
    addressLine1: String
    addressLine2: String
    city: String
    state: String
    postalCode: String
    country: String
  }

  type Club {
    id: ID!
    clubNumber: String
    ghpId: String
    name: String!
    shortName: String
    associationName: String
    status: ClubStatus!
    clubCategory: String
    clubType: String
    isTestClub: Boolean!
    authorized: Boolean!
    isDac: Boolean!
    frontEndProvider: String
    usgaAgaClub: Boolean!
    phone: String
    email: String
    website: String
    hubspotCompanyId: String
    handicapChairperson: String
    contacts: [ClubContact!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input ClubContactInput {
    contactType: String!
    name: String
    email: String
    phone: String
    addressLine1: String
    addressLine2: String
    city: String
    state: String
    postalCode: String
    country: String
  }

  input UpdateClubInput {
    name: String
    shortName: String
    phone: String
    email: String
    website: String
    hubspotCompanyId: String
    handicapChairperson: String
    contacts: [ClubContactInput!]
  }

  # ─── Course ───────────────────────────────────────────────────────────────────

  type NineHoleRating {
    rating: Float!
    slope: Int!
    par: Int
  }

  type Tee {
    teeId: ID!
    teeName: String!
    gender: Gender!
    par: Int!
    courseRating: Float!
    bogeyRating: Float
    slopeRating: Int!
    frontNine: NineHoleRating
    backNine: NineHoleRating
    yardage: Int
    holeYardages: [Int!]
    holePars: [Int!]
    holeHandicaps: [Int!]
  }

  type Course {
    id: ID!
    clubId: ID!
    facilityName: String!
    courseName: String!
    city: String!
    state: String!
    isPrimaryFacility: Boolean!
    tees: [Tee!]!
    defaultMaleTeeId: ID
    defaultFemaleTeeId: ID
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input NineHoleRatingInput {
    rating: Float!
    slope: Int!
    par: Int
  }

  input TeeInput {
    teeId: ID!
    teeName: String!
    gender: Gender!
    par: Int!
    courseRating: Float!
    bogeyRating: Float
    slopeRating: Int!
    frontNine: NineHoleRatingInput
    backNine: NineHoleRatingInput
    yardage: Int
    holeYardages: [Int!]
    holePars: [Int!]
    holeHandicaps: [Int!]
  }

  input AddCourseInput {
    clubId: ID!
    facilityName: String!
    courseName: String!
    city: String!
    state: String!
    isPrimaryFacility: Boolean
    tees: [TeeInput!]!
    defaultMaleTeeId: ID
    defaultFemaleTeeId: ID
  }

  # ─── Score ────────────────────────────────────────────────────────────────────

  enum ScoreType {
    HOME
    AWAY
    COMPETITION
  }

  enum ScoreEntryMode {
    TOTAL_SCORE
    HOLE_BY_HOLE
  }

  enum ScoreStatus {
    POSTED
    MODIFIED
    WITHDRAWN
    DELETED
    PENDING_REVIEW
  }

  type Score {
    id: ID!
    clubId: ID!
    golferId: ID!
    courseId: ID
    teeId: ID
    datePlayed: DateTime!
    scoreType: ScoreType!
    holes: Int!
    entryMode: ScoreEntryMode!
    grossScore: Int!
    adjustedGrossScore: Int
    holeScores: [Int!]
    courseRating: Float!
    slopeRating: Int!
    par: Int!
    pcc: Float
    differential: Float
    esr: Float
    status: ScoreStatus!
    courseNameSnapshot: String!
    teeNameSnapshot: String!
    postedByRole: String!
    isTournamentScore: Boolean!
    isNineHole: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ScoreConnection {
    nodes: [Score!]!
    pageInfo: PageInfo!
  }

  type AuditLog {
    id: ID!
    clubId: ID
    actorEmail: String!
    actorRole: String!
    entityType: String!
    entityId: String!
    action: String!
    summary: String!
    before: JSON
    after: JSON
    createdAt: DateTime!
  }

  input AuditLogFilterInput {
    entityType: String
    entityId: String
    action: String
    actorUserId: ID
    dateFrom: DateTime
    dateTo: DateTime
    page: Int
    pageSize: Int
  }

  type AuditLogConnection {
    nodes: [AuditLog!]!
    pageInfo: PageInfo!
  }

  input ScoreHistoryFilterInput {
    golferId: ID!
    status: ScoreStatus
    dateFrom: DateTime
    dateTo: DateTime
    scoreType: ScoreType
    page: Int
    pageSize: Int
  }

  input PostScoreInput {
    clubId: ID!
    golferId: ID!
    datePlayed: DateTime!
    scoreType: ScoreType!
    holes: Int!
    entryMode: ScoreEntryMode!
    courseId: ID
    teeId: ID
    courseName: String!
    teeName: String!
    grossScore: Int!
    adjustedGrossScore: Int
    holeScores: [Int!]
    courseRating: Float!
    slopeRating: Int!
    par: Int!
    isTournamentScore: Boolean
    tournamentId: ID
  }

  enum TournamentFormat {
    STROKE_PLAY
    STABLEFORD
    SCRAMBLE
    MATCH_PLAY
    OTHER
  }

  enum TournamentStatus {
    ACTIVE
    COMPLETED
    CANCELLED
  }

  enum RegistrationStatus {
    DRAFT
    OPEN
    CLOSED
    CANCELLED
    COMPLETED
  }

  enum TournamentRegistrationStatus {
    REGISTERED
    PENDING
    WAITLISTED
    CANCELLED
    DECLINED
  }

  enum PaymentStatus {
    NOT_REQUIRED
    UNPAID
    PAID
    REFUNDED
    FAILED
  }

  type TournamentEligibility {
    minHandicapIndex: Float
    maxHandicapIndex: Float
    gender: String
    membershipCodes: [String!]!
  }

  type Tournament {
    id: ID!
    clubId: ID!
    name: String!
    description: String
    startDate: DateTime!
    endDate: DateTime
    courseId: ID
    format: TournamentFormat!
    registrationStatus: RegistrationStatus!
    registrationOpenAt: DateTime
    registrationCloseAt: DateTime
    maxPlayers: Int
    registeredPlayerCount: Int!
    entryFee: Float
    membersOnly: Boolean!
    allowGuests: Boolean!
    eligibility: TournamentEligibility
    status: TournamentStatus!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TournamentRegistration {
    id: ID!
    tournamentId: ID!
    clubId: ID!
    golferId: ID!
    playerNameSnapshot: String!
    ghinNumberSnapshot: String
    emailSnapshot: String
    handicapIndexSnapshot: Float
    preferredTeeId: ID
    status: TournamentRegistrationStatus!
    paymentStatus: PaymentStatus!
    notes: String
    registeredAt: DateTime!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input TournamentEligibilityInput {
    minHandicapIndex: Float
    maxHandicapIndex: Float
    gender: String
    membershipCodes: [String!]
  }

  input CreateTournamentInput {
    clubId: ID!
    name: String!
    description: String
    startDate: DateTime!
    endDate: DateTime
    courseId: ID
    format: TournamentFormat!
    registrationStatus: RegistrationStatus
    registrationOpenAt: DateTime
    registrationCloseAt: DateTime
    maxPlayers: Int
    entryFee: Float
    membersOnly: Boolean
    allowGuests: Boolean
    eligibility: TournamentEligibilityInput
  }

  input RegisterForTournamentInput {
    tournamentId: ID!
    golferId: ID!
    preferredTeeId: ID
    email: String!
    phone: String
    notes: String
    agreedToTerms: Boolean!
  }

  # ─── Golfer ───────────────────────────────────────────────────────────────────

  enum MembershipStatus {
    ACTIVE
    INACTIVE
  }

  enum DigitalProfileStatus {
    NONE
    PENDING
    ACTIVE
  }

  enum Gender {
    M
    F
    OTHER
    PREFER_NOT_TO_SAY
  }

  type Address {
    addressLine1: String
    addressLine2: String
    city: String
    state: String
    postalCode: String
    country: String
  }

  type Golfer {
    id: ID!
    clubId: ID!
    ghinNumber: String
    localNumber: String
    firstName: String!
    middleName: String
    lastName: String!
    suffix: String
    gender: Gender!
    dateOfBirth: DateTime
    email: String!
    phone: String
    address: Address
    membershipCode: String!
    membershipStatus: MembershipStatus!
    statusDate: DateTime
    digitalProfileStatus: DigitalProfileStatus!
    currentHandicapIndex: Float
    lowHandicapIndex: Float
    lowHandicapDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type GolferConnection {
    nodes: [Golfer!]!
    pageInfo: PageInfo!
  }

  type GolferSearchResult {
    ghinNumber: String
    firstName: String!
    lastName: String!
    email: String
    city: String
    state: String
    currentClubName: String
    canAddToClub: Boolean!
  }

  input AddressInput {
    addressLine1: String
    addressLine2: String
    city: String
    state: String
    postalCode: String
    country: String
  }

  input GolferRosterFilterInput {
    clubId: ID!
    searchText: String
    membershipStatus: MembershipStatus
    membershipCode: String
    gender: Gender
    digitalProfileStatus: DigitalProfileStatus
    includeInactive: Boolean
    page: Int
    pageSize: Int
    sortBy: String
    sortDirection: String
  }

  input ExistingGolferSearchInput {
    clubId: ID!
    ghinOrEmail: String
    firstName: String
    lastName: String
    association: String
  }

  input AddNewGolferInput {
    clubId: ID!
    ghinNumber: String
    localNumber: String
    firstName: String!
    middleName: String
    lastName: String!
    suffix: String
    gender: Gender!
    dateOfBirth: DateTime
    email: String!
    phone: String
    membershipCode: String!
    address: AddressInput
  }

  input AddExistingGolferToClubInput {
    clubId: ID!
    ghinNumber: String!
    membershipCode: String!
    localNumber: String
  }

  input UpdateGolferInput {
    firstName: String
    middleName: String
    lastName: String
    suffix: String
    gender: Gender
    dateOfBirth: DateTime
    email: String
    phone: String
    localNumber: String
    membershipCode: String
    address: AddressInput
  }

  # ─── Root ─────────────────────────────────────────────────────────────────────

  type Query {
    _empty: String
    myClubs: [Club!]!
    club(id: ID!): Club
    auditLogs(filter: AuditLogFilterInput!): AuditLogConnection!
    clubCourses(clubId: ID!): [Course!]!
    course(id: ID!): Course
    tournaments(
      clubId: ID!
      status: TournamentStatus
      registrationStatus: RegistrationStatus
    ): [Tournament!]!
    tournament(id: ID!): Tournament
    openTournaments(clubId: ID!): [Tournament!]!
    tournamentRegistrations(tournamentId: ID!): [TournamentRegistration!]!
    myTournamentRegistrations: [TournamentRegistration!]!
    golferScores(filter: ScoreHistoryFilterInput!): ScoreConnection!
    score(id: ID!): Score
    golfers(filter: GolferRosterFilterInput!): GolferConnection!
    golfer(id: ID!): Golfer
    searchExistingGolfers(input: ExistingGolferSearchInput!): [GolferSearchResult!]!
  }

  type Mutation {
    login(input: LoginInput!): AuthPayload!
    logout: MutationResponse!
    updateClub(id: ID!, input: UpdateClubInput!): Club!
    addHomeCourse(input: AddCourseInput!): Course!
    updateHomeCourse(id: ID!, input: AddCourseInput!): Course!
    removeHomeCourse(id: ID!): MutationResponse!
    setPrimaryFacility(courseId: ID!): Course!
    setDefaultTees(courseId: ID!, maleTeeId: ID, femaleTeeId: ID): Course!
    createTournament(input: CreateTournamentInput!): Tournament!
    updateTournament(id: ID!, input: CreateTournamentInput!): Tournament!
    openTournamentRegistration(id: ID!): Tournament!
    closeTournamentRegistration(id: ID!): Tournament!
    cancelTournament(id: ID!, reason: String): Tournament!
    registerForTournament(input: RegisterForTournamentInput!): TournamentRegistration!
    cancelTournamentRegistration(id: ID!, reason: String): TournamentRegistration!
    approveTournamentRegistration(id: ID!): TournamentRegistration!
    waitlistTournamentRegistration(id: ID!): TournamentRegistration!
    postScore(input: PostScoreInput!): Score!
    updateScore(id: ID!, input: PostScoreInput!): Score!
    withdrawScore(id: ID!, reason: String): Score!
    addNewGolfer(input: AddNewGolferInput!): Golfer!
    addExistingGolferToClub(input: AddExistingGolferToClubInput!): Golfer!
    updateGolfer(id: ID!, input: UpdateGolferInput!): Golfer!
    activateGolfer(id: ID!): Golfer!
    deactivateGolfer(id: ID!, reason: String): Golfer!
  }
`;
