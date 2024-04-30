import { v4 as getUuid } from 'uuid';
import { Request, Response } from 'express';
import JobProducer from '../jobs/jobs.producer';
import { getError, validateSchema } from '../../utils/validation.utils';
import { ControllerOpts } from '../../types/global.types';
import { FileSchema } from '../../types/files.types';
import { TypedJobFileProcessing } from '../../types/job.types';
import { StorageService } from '../storage/storage.service';
import { getHash } from '../../utils/serialization.utils';

class AdminController {
  producer: JobProducer;
  storage: StorageService;

  constructor(opts: ControllerOpts) {
    this.producer = new JobProducer(opts.redisConnection);
    this.storage = new StorageService(opts.config);
  }

  processFile = async (req: Request, res: Response) => {
    const { data: file } = validateSchema<Express.Multer.File>(req.file, FileSchema);
    if (!file) {
      res.status(400).json({ error: 'File is either missing or an invalid format' });
      return;
    }

    const userId = 'kaynay';
    const { buffer, originalname: filename } = file;
    const hash = getHash(buffer);
    const path = `${userId}/${hash}/${filename}`;

    try {
      await this.storage.upload(path, buffer);
    } catch (e) {
      console.error(getError(e));
      res.status(500).json({ error: 'Could not upload file' });
      return;
    }

    const jobId = getUuid();
    const job: TypedJobFileProcessing = {
      name: 'JOB_FILE_INGESTION',
      data: {
        jobId,
        userId,
        step: 'JOB_STEP_CONVERSION',
        steps: [
          'JOB_STEP_CONVERSION',
          'JOB_STEP_EXTRACTION',
          'JOB_STEP_ANALYSIS',
          'JOB_STEP_COMPLETION',
        ],
        files: [
          {
            filename,
            path,
          },
        ],
      },
    };

    try {
      const data = await this.producer.addJob(job);
      res.json({ data });
    } catch (e) {
      const error = getError(e);
      res.status(500).json({ error });
    }
  };
}

function bindController(opts: ControllerOpts) {
  const { app, upload } = opts;
  const controller = new AdminController(opts);

  app.post('/admin/fileingest', upload.single('file'), controller.processFile);
}

export default bindController;
