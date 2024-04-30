import {
  Block,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  GetDocumentAnalysisCommandInput,
  GetDocumentAnalysisCommandOutput,
  StartDocumentAnalysisCommandInput,
  StartDocumentAnalysisCommandOutput,
  TextractClient,
} from '@aws-sdk/client-textract';
import { TextractDocument, ApiResponsePage } from 'amazon-textract-response-parser';
import { ConfigurationType } from '../../config';
import { sleep } from '../../utils/async.utils';
import {
  RowsAndColumns,
  TableTuple,
  ExtractionProcessResult,
  IExtractionService,
} from '../../types/extraction.types';

export class ExtractionService implements IExtractionService {
  private textract: TextractClient;
  private uploadsBucket: string;

  constructor(config: ConfigurationType) {
    const { accessKeyId, secretAccessKey, region, uploadsBucket } = config.aws;

    this.textract = new TextractClient({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region,
    });

    this.uploadsBucket = uploadsBucket;
  }

  process = async (
    filePath: string,
    settings?: { text: boolean; tables: boolean },
  ): Promise<ExtractionProcessResult> => {
    if (settings?.text === false && settings?.tables === false) {
      throw new Error('No extraction settings provided');
    }

    const validSettings = {
      text: Boolean(settings?.text || true),
      tables: Boolean(settings?.tables || true),
    };

    try {
      const startParams: StartDocumentAnalysisCommandInput = {
        DocumentLocation: {
          S3Object: {
            Bucket: this.uploadsBucket,
            Name: filePath,
          },
        },
        FeatureTypes: ['TABLES'],
      };

      const command = new StartDocumentAnalysisCommand(startParams);
      const startResponse: StartDocumentAnalysisCommandOutput = await this.textract.send(
        command,
      );

      if (!startResponse.JobId) {
        const error = `Could not start processing job for file ${filePath}`;
        console.error(error);
        throw new Error(error);
      }

      const getParams: GetDocumentAnalysisCommandInput = {
        JobId: startResponse.JobId,
      };

      const jobData: GetDocumentAnalysisCommandOutput[] = [];
      let nextToken: string | undefined;
      let completed = false;

      do {
        const getCommand = new GetDocumentAnalysisCommand({
          ...getParams,
          NextToken: nextToken,
        });
        const getResponse: GetDocumentAnalysisCommandOutput = await this.textract.send(
          getCommand,
        );

        nextToken = getResponse.NextToken;

        if (getResponse.JobStatus === 'SUCCEEDED') {
          jobData.push(getResponse);
        }

        if (getResponse.JobStatus !== 'IN_PROGRESS' && !getResponse.NextToken) {
          completed = true;
        }

        if (getResponse.JobStatus === 'IN_PROGRESS') {
          await sleep(5000); // Wait for 5 seconds before polling again
        }
      } while (!completed);

      const { blocks, blockSet } = this.getAllBlocks(jobData);
      const apiResponse = { Blocks: Array.from(blockSet) } as ApiResponsePage;
      const doc = new TextractDocument(apiResponse);

      const text = validSettings.text ? this.extractRawText(blocks) : undefined;
      const tables = validSettings.tables ? this.extractCSVTables(doc) : undefined;
      const result = { text, tables } as ExtractionProcessResult;

      return result;
    } catch (e) {
      console.error(e);
      throw new Error(`Could not process file ${filePath}`);
    }
  };

  private extractRawText = (blocks: Array<Block>): string => {
    let text = '';
    for (const block of blocks) {
      if (block.BlockType === 'LINE' && block.Text) {
        text += `${block.Text}\n`;
      }
    }
    return text;
  };

  private extractCSVTables = (doc: TextractDocument): Array<TableTuple> => {
    const allTables: Array<RowsAndColumns> = [];

    for (const page of doc.iterPages()) {
      for (const table of page.iterTables()) {
        const nRows = table.nRows;
        const nCols = table.nColumns;
        const rows: string[][] = Array.from(Array(nRows)).map(() => {
          return Array.from(Array(nCols)).map(() => '');
        });

        for (const row of table.iterRows({
          repeatMultiRowCells: true,
          ignoreMerged: false,
        })) {
          for (const cell of row.iterCells()) {
            let cellText = cell.text;

            if (cellText.includes('NOT_SELECTED')) {
              cellText = cellText.replace(/NOT_SELECTED,/g, '');
            }

            if (cellText.includes('SELECTED')) {
              cellText = cellText.replace(/SELECTED,/g, '');
              cellText = cellText.trim() === '' ? 'X' : cellText;
            }

            // replace any double qoutes with a single quote
            cellText = cellText.replace(/"/g, "'");
            cellText = `"${cellText.trimStart().trimEnd()}"`;

            // these indices begin at 1 instead of 0;
            const rowIndex = cell.rowIndex - 1;
            const columnIndex = cell.columnIndex - 1;

            for (let cellRowIndex = 0; cellRowIndex < cell.rowSpan; cellRowIndex += 1) {
              const rowPosition = rowIndex + cellRowIndex;
              for (let cellIndex = 0; cellIndex < cell.columnSpan; cellIndex += 1) {
                const cellPosition = columnIndex + cellIndex;
                rows[rowPosition][cellPosition] = cellText;
              }
            }
          }
        }

        allTables.push(rows);
      }
    }

    // header row as ID => { tablename: string, tableData: RowsAndColumns }
    const mergedTablesMap: Record<
      string,
      { tablename: string; tableData: RowsAndColumns }
    > = {};

    let index = 0;

    for (const tableData of allTables) {
      const headerRowKey = tableData[0].join('|');

      // no previous match found
      if (!mergedTablesMap[headerRowKey]) {
        const tablename = `textract-merged-table-${index}.csv`;
        mergedTablesMap[headerRowKey] = {
          tablename,
          tableData,
        };
        index += 1;
        continue;
      } else {
        const { tableData: existingTableData } = mergedTablesMap[headerRowKey];
        for (const [rowIndex, row] of tableData.entries()) {
          const existingRow = existingTableData[rowIndex];
          if (existingRow && existingRow.join('|') === row.join('|')) {
            continue;
          } else {
            mergedTablesMap[headerRowKey].tableData = [
              ...existingTableData,
              ...tableData.slice(rowIndex),
            ];
            break;
          }
        }
      }
    }

    const tables: Array<TableTuple> = Object.values(mergedTablesMap).map(
      ({ tablename, tableData }) => [tablename, tableData],
    );

    return tables;
  };

  private getAllBlocks(jobData: GetDocumentAnalysisCommandOutput[]): {
    blocks: Array<Block>;
    blockSet: Set<Block>;
  } {
    let mergedDoc: undefined | GetDocumentAnalysisCommandOutput;
    for (const data of jobData) {
      if (data.Blocks) {
        mergedDoc = mergedDoc
          ? {
              ...mergedDoc,
              Blocks: [...(mergedDoc?.Blocks || []), ...(data.Blocks || [])],
              NextToken: undefined,
            }
          : data;
      }
    }

    const blockSet: Set<Block> = new Set();
    const blocks: Array<Block> = [];

    for (const data of jobData) {
      if (data.Blocks) {
        blocks.push(...data.Blocks);
        for (const block of data.Blocks) {
          blockSet.add(block);
        }
      }
    }

    return {
      blocks,
      blockSet,
    };
  }
}
