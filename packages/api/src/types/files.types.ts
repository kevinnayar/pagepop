import { z } from 'zod';

export type FileRef = {
  filename: string;
  path: string;
};

const fileCategory = ['text', 'image'] as const;
export const FileCategoryEnum = z.enum(fileCategory);
export type FileCategory = (typeof fileCategory)[number];

const fileFormat = ['pdf', 'docx', 'txt', 'csv', 'tsv', 'jpg', 'png', 'tiff'] as const;
export const FileFormatEnum = z.enum(fileFormat);
export type FileFormat = (typeof fileFormat)[number];

const fileMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'text/tab-separated-values',
  'image/jpeg',
  'image/png',
  'image/tiff',
] as const;
export const FileMimeTypeEnum = z.enum(fileMimeTypes);
export type FileMimeType = (typeof fileMimeTypes)[number];

export type DownloadableFile = {
  buffer: Buffer;
  text: string;
};

export const FileSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  buffer: z.instanceof(Buffer),
  size: z.number(),
});

export type FileType = z.infer<typeof FileSchema>;
