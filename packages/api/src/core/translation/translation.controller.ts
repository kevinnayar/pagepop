import { z } from 'zod';
import { Express, Request, Response } from 'express';
import { TranslationService } from './translation.service';
import { getError, validateSchema } from '../../utils/validation.utils';
import { ConfigurationType } from '../../config';
import { ControllerOpts } from '../../types/global.types';

export class TranslationController {
  service: TranslationService;

  constructor(config: ConfigurationType) {
    this.service = new TranslationService(config);
  }

  translate = async (req: Request, res: Response) => {
    const { data: content } = validateSchema<string>(req.body.content, z.string().min(1));
    const { data: source } = validateSchema<string>(req.body.source, z.string().min(2));
    const { data: target } = validateSchema<string>(req.body.target, z.string().min(2));

    if (!content || !source || !target) {
      res
        .status(400)
        .json({ error: 'Missing "content", "source", or "target" in request body' });
      return;
    }

    try {
      const data = await this.service.translate({ content, source, target });
      res.json({ data });
    } catch (e) {
      const error = getError(e);
      res.status(500).json({ error });
    }
  };
}

function bindController({ app, config }: ControllerOpts) {
  const controller = new TranslationController(config);
  app.post('/translate', controller.translate);
}

export default bindController;
