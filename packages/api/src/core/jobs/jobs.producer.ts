import { Queue, Job, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { JOB_QUEUE } from '../../consts/queue.consts';
import { GenericJob } from '../../types/job.types';

export default class JobProducer {
  private queue: Queue;
  private opts: JobsOptions;

  constructor(connection: IORedis) {
    this.opts = {
      removeOnComplete: {
        age: 60 * 60 * 24, // 1 day
        count: 1000,
      },
      removeOnFail: {
        age: 60 * 60 * 24, // 1 day
        count: 1000,
      },
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    };

    this.queue = new Queue(JOB_QUEUE, {
      connection,
      defaultJobOptions: this.opts,
    });
  }

  addJob = async <T>(job: GenericJob<T>, opts?: JobsOptions): Promise<Job> => {
    const jobNode = await this.queue.add(
      job.name,
      job.data,
      this.mergeOpts(job.data.jobId, opts),
    );
    return jobNode;
  };

  getJob = async (jobId: string): Promise<Job | undefined> => {
    const job = await this.queue.getJob(jobId);
    return job;
  };

  retryJob = async (jobId: string): Promise<Job | undefined> => {
    const job = await this.getJob(jobId);
    if (job) {
      await job.retry();
    }
    return job;
  };

  private mergeOpts = (jobId: string, opts?: JobsOptions) => {
    return {
      jobId,
      ...this.opts,
      ...opts,
    };
  };
}
