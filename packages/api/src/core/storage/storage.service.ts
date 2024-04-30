import {
  S3,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { IStorageService } from '../../types/storage.types';
import { ConfigurationType } from '../../config';
import { DownloadableFile } from '../../types/files.types';

export class StorageService implements IStorageService {
  private client: S3;
  private uploadsBucket: string;

  constructor(config: ConfigurationType) {
    const { region, uploadsBucket } = config.aws;
    this.uploadsBucket = uploadsBucket;
    this.client = new S3({ region });
  }

  list = async (prefix: string): Promise<string[]> => {
    const error = `Invalid path for prefix "${prefix}"`;
    try {
      const params = {
        Bucket: this.uploadsBucket,
        Prefix: prefix,
      };

      const data = await this.client.listObjectsV2(params);
      if (!data.Contents) {
        throw new Error(error);
      }

      const list: string[] = [];
      for (const file of data.Contents) {
        if (!file.Key) {
          throw new Error(error);
        }
        list.push(file.Key);
      }
      return list;
    } catch (e) {
      console.error(e);
      throw new Error(error);
    }
  };

  upload = async (key: string, body: Buffer): Promise<true> => {
    try {
      const uploadParams = {
        Bucket: this.uploadsBucket,
        Key: key,
        Body: body,
      };
      const command = new PutObjectCommand(uploadParams);
      await this.client.send(command);
      return true;
    } catch (e) {
      console.error(e);
      throw new Error(`Could not upload file "${key}"`);
    }
  };

  download = async (key: string): Promise<DownloadableFile> => {
    const error = `Could not download file "${key}"`;
    try {
      const params = {
        Bucket: this.uploadsBucket,
        Key: key,
      };

      const command = new GetObjectCommand(params);
      const { Body } = await this.client.send(command);
      if (!Body) {
        throw new Error(error);
      }

      const bufferArray = await Body.transformToByteArray();
      const buffer = Buffer.from(bufferArray);
      const text = buffer.toString('utf-8');

      return {
        buffer,
        text,
      };
    } catch (e) {
      console.error(e);
      throw new Error(error);
    }
  };

  remove = async (key: string): Promise<void> => {
    try {
      const params = {
        Bucket: this.uploadsBucket,
        Key: key,
      };

      const command = new DeleteObjectCommand(params);
      await this.client.send(command);
    } catch (e) {
      console.error(e);
      throw new Error(`Failed to delete file "${key}"`);
    }
  };
}
