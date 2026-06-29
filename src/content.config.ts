import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const dateRecord = z.object({
  date: z.string().nullable(),
  precision: z.enum(["day", "month", "year", "circa", "unknown"]).default("unknown"),
  note: z.string().optional(),
  sourceIds: z.array(z.string()).default([])
});

const sourceReference = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional(),
  url: z.string().url().optional(),
  archiveUrl: z.string().url().optional(),
  accessed: z.string().optional(),
  pages: z.string().optional(),
  language: z.string().optional(),
  note: z.string().optional()
});

const affiliationRecord = z.object({
  name: z.string(),
  status: z.string().optional(),
  since: z.string().nullable().optional(),
  until: z.string().nullable().optional(),
  sourceIds: z.array(z.string()).default([])
});

const electionYear = z.union([
  z.number().int().min(1800).max(2200),
  z.string()
]);

const parliamentaryElectionResult = z.object({
  year: electionYear,
  listLeader: z.string().nullable().optional(),
  votes: z.number().int().nonnegative().nullable().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
  seats: z.number().int().nonnegative().nullable().optional(),
  outcome: z.string().nullable().optional(),
  sourceIds: z.array(z.string()).default([])
});

const presidentialElectionResult = z.object({
  year: electionYear,
  candidate: z.string(),
  firstRoundVotes: z.number().int().nonnegative().nullable().optional(),
  firstRoundPercentage: z.number().min(0).max(100).nullable().optional(),
  secondRoundVotes: z.number().int().nonnegative().nullable().optional(),
  secondRoundPercentage: z.number().min(0).max(100).nullable().optional(),
  outcome: z.string().nullable().optional(),
  sourceIds: z.array(z.string()).default([])
});

const parties = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.json",
    base: "./src/data/parties",
    generateId: ({ entry }) => entry.replace(/\.json$/, "")
  }),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.object({
      english: z.string(),
      native: z.array(z.string()).default([]),
      literal: z.string().nullable().optional(),
      abbreviation: z.string().nullable().optional()
    }),
    country: z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      name: z.string()
    }),
    status: z.enum(["active", "inactive", "dissolved", "historical", "unknown"]),
    logo: z.string().nullable().optional(),
    colors: z.array(z.string()).default([]),
    dates: z.object({
      founded: dateRecord,
      registered: dateRecord.optional(),
      dissolved: dateRecord.optional()
    }),
    summary: z.string(),
    history: z.object({
      formation: z.string().optional(),
      formationSourceIds: z.array(z.string()).default([]),
      predecessors: z.array(z.string()).default([]),
      successors: z.array(z.string()).default([]),
      splitFrom: z.array(z.string()).default([]),
      mergers: z.array(z.string()).default([]),
      memberParties: z.array(z.string()).default([])
    }).default({
      formationSourceIds: [],
      predecessors: [],
      successors: [],
      splitFrom: [],
      mergers: [],
      memberParties: []
    }),
    ideology: z.object({
      labels: z.array(z.object({
        name: z.string(),
        sourceIds: z.array(z.string()).default([]),
        note: z.string().optional()
      })).default([]),
      position: z.object({
        label: z.string(),
        sourceIds: z.array(z.string()).default([]),
        note: z.string().optional()
      }).nullable().optional()
    }).default({ labels: [] }),
    leadership: z.array(z.object({
      title: z.string(),
      person: z.string(),
      since: z.string().nullable().optional(),
      until: z.string().nullable().optional(),
      birthYear: z.number().int().min(1800).max(2200).nullable().optional(),
      deathYear: z.number().int().min(1800).max(2200).nullable().optional(),
      note: z.string().optional(),
      sourceIds: z.array(z.string()).default([])
    })).default([]),
    governmentStatus: z.object({
      label: z.enum([
        "government",
        "opposition",
        "extra-parliamentary",
        "mixed",
        "not-applicable",
        "unknown"
      ]),
      since: z.string().nullable().optional(),
      description: z.string().optional(),
      sourceIds: z.array(z.string()).default([])
    }).optional(),
    representation: z.object({
      parliament: z.object({
        status: z.enum([
          "represented",
          "not-represented",
          "unknown",
          "not-applicable"
        ]),
        since: z.string().nullable().optional(),
        seats: z.number().int().nonnegative().nullable().optional(),
        totalSeats: z.number().int().positive().nullable().optional(),
        note: z.string().optional(),
        sourceIds: z.array(z.string()).default([])
      }).optional(),
      government: z.object({
        status: z.enum([
          "in-government",
          "supports-government",
          "opposition",
          "neutral",
          "mixed",
          "unknown",
          "not-applicable"
        ]),
        since: z.string().nullable().optional(),
        note: z.string().optional(),
        sourceIds: z.array(z.string()).default([])
      }).optional()
    }).optional(),
    internationalAffiliations: z.array(affiliationRecord).default([]),
    electionResults: z.object({
      parliamentary: z.array(parliamentaryElectionResult).default([]),
      presidential: z.array(presidentialElectionResult).default([])
    }).default({
      parliamentary: [],
      presidential: []
    }),
    links: z.object({
      website: z.string().url().nullable().optional(),
      websiteArchive: z.string().url().nullable().optional(),
      facebook: z.string().url().nullable().optional(),
      x: z.string().url().nullable().optional(),
      instagram: z.string().url().nullable().optional(),
      youtube: z.string().url().nullable().optional(),
      socialMedia: z.array(z.object({
        label: z.string(),
        url: z.string().url(),
        archiveUrl: z.string().url().nullable().optional(),
        sourceIds: z.array(z.string()).default([])
      })).default([]),
      other: z.array(z.object({
        label: z.string(),
        url: z.string().url()
      })).default([])
    }).default({
      socialMedia: [],
      other: []
    }),
    sources: z.array(sourceReference).default([]),
    lastUpdated: z.string(),
    editorial: z.object({
      completeness: z.enum([
        "stub",
        "partial",
        "substantial",
        "complete"
      ]).default("partial"),
      needsReview: z.boolean().default(false),
      note: z.string().optional()
    }).default({
      completeness: "partial",
      needsReview: false
    })
  }).refine((data) => data.id.length > 0, {
    message: "Party ID must not be empty"
  })
});

export const collections = { parties };
