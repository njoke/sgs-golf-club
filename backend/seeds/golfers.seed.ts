import { Types } from "mongoose";
import { Golfer, IGolfer } from "../src/models/golfer.model";

const golfersSeedData = [
  { firstName: "Jared",   lastName: "Abwawo",  ghinNumber: "10750356", gender: "M", email: "j_midimo@hotmail.com",     membershipCode: "R", localNumber: "13", currentHandicapIndex: 13.1, lowHandicapIndex: 12.0 },
  { firstName: "Sal",     lastName: "Aguko",   ghinNumber: "10708328", gender: "M", email: "sal.aguko@gmail.com",      membershipCode: "R", localNumber: "22", currentHandicapIndex: 19.9, lowHandicapIndex: 18.5 },
  { firstName: "Rodney",  lastName: "Bryan",   ghinNumber: "10856275", gender: "M", email: "rodney.bryan@gmail.com",   membershipCode: "R", localNumber: "5",  currentHandicapIndex: 8.1,  lowHandicapIndex: 7.2  },
  { firstName: "Maurice", lastName: "Gichuru", ghinNumber: "4516031",  gender: "M", email: "mg@safarigolfseattle.org", membershipCode: "R", localNumber: "1",  currentHandicapIndex: 9.8,  lowHandicapIndex: 9.0  },
  { firstName: "Moses",   lastName: "Kamau",   ghinNumber: "3007264",  gender: "M", email: "mkamau@gmail.com",         membershipCode: "R", localNumber: "8",  currentHandicapIndex: 9.3,  lowHandicapIndex: 8.8  },
  { firstName: "Lucy",    lastName: "Karanja", ghinNumber: "10391607", gender: "F", email: "lkaranja@gmail.com",       membershipCode: "R", localNumber: "17", currentHandicapIndex: 23.3, lowHandicapIndex: 22.0 },
];

export async function seedGolfers(clubId: Types.ObjectId): Promise<IGolfer[]> {
  const results: IGolfer[] = [];

  for (const data of golfersSeedData) {
    const existing = await Golfer.findOne({ ghinNumber: data.ghinNumber, clubId });
    if (existing) {
      results.push(existing as IGolfer);
      continue;
    }

    const golfer = await Golfer.create({
      ...data,
      clubId,
      membershipStatus: "ACTIVE",
      statusDate: new Date(),
      digitalProfileStatus: "NONE",
    });

    results.push(golfer as IGolfer);
  }

  console.log(`✓ ${results.length} golfers seeded`);
  return results;
}

// Return the Jared Abwawo golfer record by GHIN
export function findJaredGolfer(golfers: IGolfer[]): IGolfer | undefined {
  return golfers.find((g) => g.ghinNumber === "10750356");
}
