import { BedrockChat } from '@langchain/community/chat_models/bedrock';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { ZodSchema } from 'zod';
import { ParentDocumentRetriever } from 'langchain/retrievers/parent_document';

export type OpenAIModelName =
  | 'gpt-4-preview'
  | 'gpt-4-1106-preview'
  | 'gpt-3.5-turbo-1106';

export type BedrockModelName =
  | 'anthropic.claude-v2'
  | 'anthropic.claude-v2:1'
  | 'cohere.command-text-v14';

export type GoogleGenAIModelName = 'gemini-pro';

export type LLMName = OpenAIModelName | BedrockModelName | GoogleGenAIModelName;

export type LLMChatClass = ChatOpenAI | BedrockChat | ChatGoogleGenerativeAI;

export type LLMMutableOpts = {
  temperature: number;
};

export type LLMImmutableOpts = {
  maxConcurrency: number;
  maxRetriesPerModel: number;
  maxRetriesPerRequest: number;
  timeout: number;
};

export type LLMConfigOpts = LLMMutableOpts & LLMImmutableOpts;

export type LLMParentRetrieverOpts = {
  text: string;
  chunkSize: number;
  extra?: Record<string, any>;
};

export type LLMContextMetadata = {
  documentIndex: number;
  chunkPosition: {
    from: number;
    to: number;
  };
  extra?: Record<string, any>;
};

export type LLMContextDefRaw = {
  type: 'ContextRaw';
  context: string;
};

export type LLMContextDefRetriever = {
  type: 'ContextRetriever';
  query: string;
  retriever: ParentDocumentRetriever;
};

export type LLMContextDef = LLMContextDefRaw | LLMContextDefRetriever;

export type LLMInstantiationDef = {
  modelName: LLMName;
  temperature: number;
};

export type ExampleQnA = {
  context: string;
  question: string;
  answer: string;
};

export type LLMPromptDef = {
  question: string;
  schema: ZodSchema<any>;
  examples?: ExampleQnA[];
  useGeneralKnowledge?: boolean;
};

export type LLMAnswerConfig = {
  contextDef: LLMContextDef;
  promptDef: LLMPromptDef;
  llmDef: LLMInstantiationDef;
};

export interface ILLMService {
  createRetriever: (opts: LLMParentRetrieverOpts) => Promise<ParentDocumentRetriever>;
  answer: <T>(opts: LLMAnswerConfig) => Promise<T | undefined>;
}
