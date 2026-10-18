import { z } from "zod";

export const projectTitleSchema = z.string().trim().min(1).max(120);

export const projectIdSchema = z.uuid();
