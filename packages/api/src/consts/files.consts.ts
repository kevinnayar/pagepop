import { FileFormat, FileMimeType } from '../types/files.types';

export const FORMAT_TO_MIMETYPES: Readonly<Record<FileFormat, FileMimeType>> = {
  // text
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  // image
  jpg: 'image/jpeg',
  png: 'image/png',
  tiff: 'image/tiff',
};

export const MIMETYPES_TO_FORMAT: Readonly<Record<FileMimeType, FileFormat>> = {
  // text
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/tab-separated-values': 'tsv',
  // image
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/tiff': 'tiff',
};
