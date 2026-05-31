import { Club, IClub } from "../src/models/club.model";

const clubSeed = {
  clubNumber: "16645",
  ghpId: "20793",
  name: "Safari Golf Seattle",
  shortName: "Safari Golf",
  associationName: "Washington Golf",
  status: "ACTIVE" as const,
  clubCategory: "Affiliate",
  clubType: "Type 2",
  isTestClub: false,
  authorized: true,
  isDac: false,
  frontEndProvider: "GHIN",
  usgaAgaClub: false,
  phone: "(310) 955-0288",
  email: "kwalker@safarigolfseattle.org",
  website: "",
  hubspotCompanyId: "15495027727",
  handicapChairperson: "Ken Njonge",
  contacts: [
    {
      contactType: "PRIMARY",
      name: "Moe Gichuru",
      email: "mg@safarigolfseattle.org",
      phone: "(206) 293-4241",
      addressLine1: "230 Auburn Way S STE 1B",
      addressLine2: "1053",
      city: "Auburn",
      state: "WA",
      postalCode: "98002-5451",
      country: "United States",
    },
  ],
};

export async function seedClub(): Promise<IClub> {
  const existing = await Club.findOne({ clubNumber: clubSeed.clubNumber });
  if (existing) return existing as IClub;

  const club = await Club.create(clubSeed);
  console.log(`✓ Club seeded: ${club.name} (${club._id})`);
  return club as IClub;
}
