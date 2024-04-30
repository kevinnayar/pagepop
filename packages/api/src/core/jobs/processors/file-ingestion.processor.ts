import { Job } from 'bullmq';
import { JobFileProcessingData } from '../../../types/job.types';
import { FileRef } from '../../../types/files.types';
import { getUpdatedJobData } from '../../../utils/job.utils';

export default async function handler(
  job: Job<JobFileProcessingData, FileRef[], 'JOB_FILE_INGESTION'>,
) {
  let currStep = job.data.step;

  while (currStep !== 'JOB_STEP_COMPLETION') {
    console.log(`Executing: ${job.name} > ${currStep}`);

    switch (currStep) {
      case 'JOB_STEP_CONVERSION': {
        const nextStep = 'JOB_STEP_EXTRACTION';
        const files = [...job.data.files, { filename: 'somefilename2', path: 'path2' }];
        const updatedData = getUpdatedJobData(currStep, nextStep, job.data, { files });
        await job.updateData(updatedData);
        currStep = nextStep;
        break;
      }

      case 'JOB_STEP_EXTRACTION': {
        const nextStep = 'JOB_STEP_ANALYSIS';
        const files = [...job.data.files, { filename: 'somefilename3', path: 'path3' }];
        const updatedData = getUpdatedJobData(currStep, nextStep, job.data, { files });
        await job.updateData(updatedData);
        currStep = nextStep;
        break;
      }

      case 'JOB_STEP_ANALYSIS': {
        const nextStep = 'JOB_STEP_COMPLETION';
        const files = [...job.data.files, { filename: 'somefilename6', path: 'path6' }];
        const updatedData = getUpdatedJobData(currStep, nextStep, job.data, { files });
        await job.updateData(updatedData);
        currStep = nextStep;
        break;
      }

      default:
        throw new Error(`Unsupported step ${currStep} for job ${job.name}`);
    }
  }

  console.log(`Completed: ${job.name} > ${currStep}`);

  return job.data.files;
}
