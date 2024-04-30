export type RowsAndColumns = string[][];

export type TableTuple = [string, RowsAndColumns];

export type ExtractionProcessResult =
  | {
      text: string;
      tables: TableTuple[];
    }
  | {
      text: string;
    }
  | {
      tables: TableTuple[];
    };

export interface IExtractionService {
  process: (filePath: string) => Promise<ExtractionProcessResult>;
}
