import { gql } from "graphql-tag";

export const typeDefs = gql`
  scalar DateTime

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
    golfers(filter: GolferRosterFilterInput!): GolferConnection!
    golfer(id: ID!): Golfer
    searchExistingGolfers(input: ExistingGolferSearchInput!): [GolferSearchResult!]!
  }

  type Mutation {
    login(input: LoginInput!): AuthPayload!
    logout: MutationResponse!
    updateClub(id: ID!, input: UpdateClubInput!): Club!
    addNewGolfer(input: AddNewGolferInput!): Golfer!
    addExistingGolferToClub(input: AddExistingGolferToClubInput!): Golfer!
    updateGolfer(id: ID!, input: UpdateGolferInput!): Golfer!
    activateGolfer(id: ID!): Golfer!
    deactivateGolfer(id: ID!, reason: String): Golfer!
  }
`;
