import { z } from 'zod';
import { Request, Response } from 'express';
import { StorageService } from './storage.service';
import { getHash } from '../../utils/serialization.utils';
import { getError, validateSchema } from '../../utils/validation.utils';
import { ConfigurationType } from '../../config';
import { ControllerOpts } from '../../types/global.types';
import { FileSchema } from '../../types/files.types';

class StorageController {
  service: StorageService;

  constructor(config: ConfigurationType) {
    this.service = new StorageService(config);
  }

  list = async (req: Request, res: Response) => {
    const { data: prefix } = validateSchema<string>(req.body.prefix, z.string().min(1));
    if (!prefix) {
      res.status(400).json({ error: 'Missing "prefix" in request body' });
      return;
    }

    try {
      const data = await this.service.list(prefix);
      res.json({ data });
    } catch (e) {
      const error = getError(e);
      res.status(500).json({ error });
    }
  };

  upload = async (req: Request, res: Response) => {
    const { data: file } = validateSchema<Express.Multer.File>(req.file, FileSchema);
    if (!file) {
      res.status(400).json({ error: 'File is either missing or an invalid format' });
      return;
    }

    const { buffer, originalname, mimetype } = file;

    const key = `${getHash(buffer)}/${originalname}`;

    try {
      await this.service.upload(key, buffer);
      res.json({
        name: originalname,
        mimetype,
        path: key,
        size: buffer.length,
      });
    } catch (e) {
      const error = getError(e);
      res.status(500).json({ error });
    }
  };

  download = async (req: Request, res: Response) => {
    const { data: key } = validateSchema<string>(req.query.key, z.string().min(1));
    if (!key) {
      res.status(400).json({ error: 'Missing "key" query parameter' });
      return;
    }

    try {
      const data = await this.service.download(key);
      res.json({ data });
    } catch (e) {
      const error = getError(e);
      res.status(500).json({ error });
    }
  };

  remove = async (req: Request, res: Response) => {
    const { data: key } = validateSchema<string>(req.query.key, z.string().min(1));
    if (!key) {
      res.status(400).json({ error: 'Missing "key" query parameter' });
      return;
    }

    try {
      await this.service.remove(key);
      res.json({ success: true });
    } catch (e) {
      const error = getError(e);
      res.status(500).json({ error });
    }
  };
}

function bindController({ app, config, upload }: ControllerOpts) {
  const controller = new StorageController(config);
  app.post('/storage', upload.single('file'), controller.upload);
  app.get('/storage', controller.download);
  app.delete('/storage', controller.remove);
  app.get('/storage/list', controller.list);
}

export default bindController;
