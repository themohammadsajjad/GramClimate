import { z } from 'zod';
export const profileInput = z.object({
  displayName: z.string().trim().min(1, 'Please enter your name.').max(80),
  organization: z.string().trim().max(120),
  role: z.enum(['Researcher', 'Student', 'Educator', 'Climate analyst']),
  bio: z.string().trim().max(500),
}).strict();
export type Profile = z.infer<typeof profileInput>;
