import { Worker, Job } from 'bullmq';
import { getConfig } from '../../config';
import { getRedisConnection } from '../../clients/redis.client';
import { JOB_QUEUE } from '../../consts/queue.consts';
import { JobFileProcessingData } from '../../types/job.types';
import fileIngestionProcessor from './processors/file-ingestion.processor';

const processors = {
  JOB_FILE_INGESTION: fileIngestionProcessor,
};

const processJob = async (job: Job<JobFileProcessingData, any, 'JOB_FILE_INGESTION'>) => {
  const processor = processors[job.name];

  if (!processor) {
    await job.remove();
    throw new Error(`Unsupported job type "${job.name}"`);
  }

  return await processor(job);
};

const redisUrl = getConfig().redis.url;

const worker = new Worker(JOB_QUEUE, processJob, {
  connection: getRedisConnection(redisUrl),
  concurrency: 1,
});

worker.on('completed', (job: Job) => {
  console.log({
    scope: Worker.name,
    status: `Processed job`,
    jobName: job.name,
    jobId: job.id,
    result: job.returnvalue,
  });
});

worker.on('failed', (job, err) => {
  console.log({
    scope: Worker.name,
    status: 'Failed attempting to process job',
    jobName: job?.name || 'unknown',
    jobId: job?.id || 'unknown',
    error: err,
  });
});

console.log(`Worker started on queue "${JOB_QUEUE}"`);
