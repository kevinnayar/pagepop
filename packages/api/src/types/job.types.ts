import { z } from 'zod';
import { FileRef } from './files.types';

const jobSteps = [
  'JOB_STEP_CONVERSION',
  'JOB_STEP_EXTRACTION',
  'JOB_STEP_ANALYSIS',
  'JOB_STEP_COMPLETION',
] as const;

export const JobStepEnum = z.enum(jobSteps);
export type JobStepKey = (typeof jobSteps)[number];

export const JobContextSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
});

export type JobContext = z.infer<typeof JobContextSchema>;

export type JobFileProcessingData = JobContext & {
  step: JobStepKey;
  steps: JobStepKey[];
  files: FileRef[];
};

export type TypedJobFileProcessing = {
  name: 'JOB_FILE_INGESTION';
  data: JobFileProcessingData;
};

export type GenericJob<T> = {
  name: string;
  data: T & JobContext;
};
