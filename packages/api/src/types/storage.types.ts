import { z } from 'zod';
import { DownloadableFile } from './files.types';

export interface IStorageService {
  list: (prefix: string) => Promise<string[]>;
  upload: (key: string, body: Buffer) => Promise<true>;
  download: (key: string) => Promise<DownloadableFile>;
  remove: (key: string) => Promise<void>;
}
