import { JobStepKey, JobFileProcessingData } from '../types/job.types';

export function getUpdatedJobData(
  currStep: JobStepKey,
  nextStep: JobStepKey,
  currData: JobFileProcessingData,
  nextData?: any,
) {
  return {
    ...currData,
    ...nextData,
    steps: currData.steps.filter((step: JobStepKey) => step !== currStep),
    step: nextStep,
  };
}
