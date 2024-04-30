import { z } from 'zod';
import { Request, Response } from 'express';
import { ExtractionService } from './extraction.service';
import { getError, validateSchema } from '../../utils/validation.utils';
import { ConfigurationType } from '../../config';
import { ControllerOpts } from '../../types/global.types';

export class ExtractionController {
  service: ExtractionService;

  constructor(config: ConfigurationType) {
    this.service = new ExtractionService(config);
  }

  process = async (req: Request, res: Response) => {
    const { data: path } = validateSchema<string>(req.body.path, z.string().min(1));
    if (!path) {
      res.status(400).json({ error: 'Missing "path" in request body' });
      return;
    }

    try {
      const data = await this.service.process(path);
      res.json({ data });
    } catch (e) {
      const error = getError(e);
      res.status(500).json({ error });
    }
  };
}

function bindController({ app, config }: ControllerOpts) {
  const controller = new ExtractionController(config);
  app.post('/extract', controller.process);
}

export default bindController;
