import { BedrockChat } from '@langchain/community/chat_models/bedrock';
import { Document } from '@langchain/core/documents';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Semaphore, SemaphoreInterface } from 'async-mutex';
import { ParentDocumentRetriever } from 'langchain/retrievers/parent_document';
import { InMemoryStore } from 'langchain/storage/in_memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { formatDocumentsAsString } from 'langchain/util/document';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { z } from 'zod';
import { ConfigurationType } from '../../config';
import {
  ILLMService,
  LLMConfigOpts,
  LLMName,
  LLMChatClass,
  LLMContextDef,
  LLMPromptDef,
  LLMAnswerConfig,
  LLMParentRetrieverOpts,
  LLMContextMetadata,
} from '../../types/llm.types';
import {
  getFormatFromZodObject,
  createTagContentString,
  getContentFromAnswerTag,
} from '../../utils/llm.utils';
import { getError, validateSchema } from '../../utils/validation.utils';
import { safeParseJSON, replaceValueInObject } from '../../utils/serialization.utils';
import { sleep } from '../../utils/async.utils';
import {
  LLM_ANSWER_KEY,
  LLM_RESULTS_KEY,
  LLM_NOT_FOUND_KEY,
} from '../../consts/llm.consts';

export class LLMService implements ILLMService {
  private config: ConfigurationType;
  private systemMessage: string;
  private semaphore: SemaphoreInterface;
  private defaultOpts: LLMConfigOpts;
  private modelFnMap: Record<
    LLMName,
    (modelName: LLMName, opts: LLMConfigOpts) => LLMChatClass
  >;

  constructor(config: ConfigurationType) {
    this.config = config;

    this.systemMessage = `
      You are a helpful and analytical AI assistant.
      You will respond to prompts as truthfully as possible only pulling
      information from the document unless instructed to use your general knowledge.
    `;

    this.semaphore = new Semaphore(25);

    this.defaultOpts = {
      temperature: 0.5,
      maxConcurrency: 1,
      maxRetriesPerModel: 1,
      maxRetriesPerRequest: 3,
      timeout: 1000 * 60 * 3, // 3 minutes
    };

    this.modelFnMap = {
      'gpt-4-preview': this.getChatOpenAIModel,
      'gpt-4-1106-preview': this.getChatOpenAIModel,
      'gpt-3.5-turbo-1106': this.getChatOpenAIModel,
      'anthropic.claude-v2': this.getChatBedrockModel,
      'anthropic.claude-v2:1': this.getChatBedrockModel,
      'cohere.command-text-v14': this.getChatBedrockModel,
      'gemini-pro': this.getChatGoogleGenAIModel,
    };
  }

  private getMaxOutputTokens = (modelName: LLMName): number => {
    switch (modelName) {
      case 'gpt-4-preview':
      case 'gpt-4-1106-preview':
      case 'gpt-3.5-turbo-1106': {
        return -1;
      }
      case 'anthropic.claude-v2':
      case 'anthropic.claude-v2:1':
      case 'cohere.command-text-v14': {
        return 4096;
      }
      case 'gemini-pro': {
        return 2048;
      }
      default: {
        throw new Error(`Unsupported model: ${modelName}`);
      }
    }
  };

  private getChatOpenAIModel = (modelName: LLMName, opts: LLMConfigOpts): ChatOpenAI => {
    const { apiKey: openAIApiKey } = this.config.openAI;

    const client = new ChatOpenAI({
      openAIApiKey,
      modelName,
      ...opts,
      maxTokens: this.getMaxOutputTokens(modelName),
    });

    return client;
  };

  private getChatBedrockModel = (
    modelName: LLMName,
    opts: LLMConfigOpts,
  ): BedrockChat => {
    const { accessKeyId, secretAccessKey, region } = this.config.aws;

    const client = new BedrockChat({
      model: modelName,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      ...opts,
      maxTokens: this.getMaxOutputTokens(modelName),
    });

    return client;
  };

  private getChatGoogleGenAIModel = (
    modelName: LLMName,
    opts: LLMConfigOpts,
  ): ChatGoogleGenerativeAI => {
    const { apiKey } = this.config.googleGenAI;

    const client = new ChatGoogleGenerativeAI({
      apiKey,
      modelName,
      ...opts,
      maxOutputTokens: this.getMaxOutputTokens(modelName),
    });

    return client;
  };

  private getChatModels = (
    modelName: LLMName,
    temperature: number,
  ): [LLMChatClass, LLMChatClass, LLMChatClass] => {
    let models: undefined | [LLMChatClass, LLMChatClass, LLMChatClass];
    const opts = { ...this.defaultOpts, temperature };

    switch (modelName) {
      case 'gpt-4-preview':
      case 'gpt-4-1106-preview':
      case 'gpt-3.5-turbo-1106': {
        models = [
          this.modelFnMap[modelName](modelName, opts),
          this.modelFnMap['anthropic.claude-v2']('anthropic.claude-v2', opts),
          this.modelFnMap['gemini-pro']('gemini-pro', opts),
        ];
        break;
      }
      case 'anthropic.claude-v2':
      case 'anthropic.claude-v2:1':
      case 'cohere.command-text-v14': {
        models = [
          this.modelFnMap[modelName](modelName, opts),
          this.modelFnMap['gpt-4-1106-preview']('gpt-4-1106-preview', opts),
          this.modelFnMap['gemini-pro']('gemini-pro', opts),
        ];
        break;
      }
      case 'gemini-pro': {
        models = [
          this.modelFnMap[modelName](modelName, opts),
          this.modelFnMap['gpt-4-1106-preview']('gpt-4-1106-preview', opts),
          this.modelFnMap['anthropic.claude-v2']('anthropic.claude-v2', opts),
        ];
        break;
      }
      default: {
        throw new Error(`Unsupported model: ${modelName}`);
      }
    }

    if (!models || models.length < this.defaultOpts.maxRetriesPerRequest) {
      throw new Error(
        [
          'Could not instantiate the appropriate number of language models.',
          `Expected at least ${this.defaultOpts.maxRetriesPerRequest} models,`,
          `Instantiated ${models.length || '0'} model(s).`,
        ].join(' '),
      );
    }

    return models;
  };

  private getEmbeddingsModel = (batchSize?: number): OpenAIEmbeddings => {
    const { apiKey: openAIApiKey } = this.config.openAI;
    const model = new OpenAIEmbeddings({
      modelName: 'text-embedding-ada-002',
      openAIApiKey,
      ...(batchSize ? { batchSize } : {}),
    });
    return model;
  };

  createRetriever = async ({
    text,
    chunkSize,
    extra,
  }: LLMParentRetrieverOpts): Promise<ParentDocumentRetriever> => {
    const parent = { chunkSize, k: 3 };
    const child = { chunkSize: 500, k: 12 };

    const parentSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: parent.chunkSize,
      chunkOverlap: Math.floor(parent.chunkSize * 0.1),
    });
    const childSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: child.chunkSize,
      chunkOverlap: Math.floor(child.chunkSize * 0.1),
    });

    const embeddingsModel = this.getEmbeddingsModel();
    const vectorstore = new MemoryVectorStore(embeddingsModel);
    const docstore = new InMemoryStore();

    const retriever = new ParentDocumentRetriever({
      vectorstore,
      docstore,
      parentSplitter,
      childSplitter,
      childK: child.k,
      parentK: parent.k,
    });

    const splitDocs = await parentSplitter.splitText(text);
    const docs: Document[] = [];

    for (const [documentIndex, pageContent] of splitDocs.entries()) {
      const from = text.indexOf(pageContent);
      const to = pageContent.length + from;

      const metadata: LLMContextMetadata = {
        documentIndex,
        chunkPosition: {
          from,
          to,
        },
        extra,
      };

      const doc = new Document({ pageContent, metadata });

      docs.push(doc);
    }

    await retriever.addDocuments(docs);

    return retriever;
  };

  private getRelevantDocuments = async (
    contextDef: LLMContextDef,
  ): Promise<Document[]> => {
    const { type } = contextDef;
    switch (type) {
      case 'ContextRaw': {
        return [
          {
            pageContent: contextDef.context,
            metadata: {},
          },
        ];
      }
      case 'ContextRetriever': {
        const { query, retriever } = contextDef;
        const docs = await retriever.getRelevantDocuments(query);
        return docs;
      }
      default: {
        throw new Error(`Unsupported contextDef type: "${type}"`);
      }
    }
  };

  private createMessages = async (
    modelName: LLMName,
    promptDef: LLMPromptDef,
    documents: Document[],
  ): Promise<(HumanMessage | SystemMessage | AIMessage)[]> => {
    const { question, schema, examples, useGeneralKnowledge } = promptDef;

    const systemMessage = this.systemMessage;

    const instructionsMessageList: string[] = [];

    instructionsMessageList.push(`
      Answer the following "question" ${
        useGeneralKnowledge
          ? 'based on the included "context". If you cannot find the answer in the context, use your general knowledge'
          : 'based only on the included "context"'
      }.
      Answer in JSON format using the typescript format listed under "format"
      Do not mention anything about context in your response.
      Do not include any additional text in your answer.
      If you are unable to find or generate an answer, 
      include the string "${LLM_NOT_FOUND_KEY}" in the response JSON object.
      Responses should be wrapped in an "${LLM_ANSWER_KEY}" xml tag and do not include any other tags.
      Make sure the answer is a json object with the answer mapped to the "${LLM_RESULTS_KEY}" 
      key based on the provided format. 
    `);

    const hasExamples = examples && examples.length;

    if (hasExamples) {
      instructionsMessageList.push(`
        Additionally, there will be some examples provided under the "examples" tag 
        to help guide your response.
      `);
    }

    const format = await getFormatFromZodObject(z.object({ [LLM_RESULTS_KEY]: schema }));

    instructionsMessageList.push(createTagContentString(format, 'format') as string);

    const examplesMessageList: string[] = [];

    if (hasExamples) {
      for (let i = 0; i < examples.length; i += 1) {
        const { context: fakeC, question: fakeQ, answer: fakeA } = examples[i];
        const index = i + 1;

        const exQuestionMessageText = [
          createTagContentString(fakeC, `example_context_${index}`),
          createTagContentString(fakeQ, `example_question_${index}`),
        ].join('\n');

        examplesMessageList.push(exQuestionMessageText);

        const exAnswerMessageText = createTagContentString(
          fakeA,
          `example_answer_${index}`,
        ) as string;

        examplesMessageList.push(exAnswerMessageText);
      }
    }

    const context = formatDocumentsAsString(documents);

    const contextMessage = createTagContentString(context, 'context') as string;

    const questionMessage = createTagContentString(question, 'question') as string;

    const isGoogleGemini = modelName === 'gemini-pro';

    // Order: [System, Instructions, Examples, Context, Question]

    if (isGoogleGemini) {
      // Google requires that Human and AI messages are interleaved, does not support System messages
      // https://js.langchain.com/docs/integrations/chat/google_generativeai#gemini-prompting-faqs

      const initialMessageText = examplesMessageList.length
        ? [systemMessage, ...instructionsMessageList, examplesMessageList[0]].join('\n\n')
        : [systemMessage, ...instructionsMessageList].join('\n\n');

      const messages = [new HumanMessage(initialMessageText)];

      if (examplesMessageList.length) {
        for (let i = 1 /* not 0 */; i < examplesMessageList.length; i += 1) {
          const text = examplesMessageList[i];
          const isQuestion = i % 2 === 0;
          const MessageClass = isQuestion ? HumanMessage : AIMessage;
          messages.push(new MessageClass(text));
        }
      }

      const finalMessageText = [contextMessage, contextMessage].join('\n\n');
      messages.push(new HumanMessage(finalMessageText));

      return messages;
    }

    const messages = [
      new SystemMessage(systemMessage),
      ...instructionsMessageList.map((text) => new HumanMessage(text)),
      ...examplesMessageList.map((text, i) => {
        const isQuestion = i % 2 === 0;
        const MessageClass = isQuestion ? HumanMessage : AIMessage;
        return new MessageClass(text);
      }),
      new HumanMessage(contextMessage),
      new HumanMessage(questionMessage),
    ];

    return messages;
  };

  private getAnswerString = async (
    model: LLMChatClass,
    messages: (HumanMessage | SystemMessage)[],
  ) => {
    const prompts = ChatPromptTemplate.fromMessages(messages);
    const outputParser = new StringOutputParser();
    const content = await prompts.pipe(model).pipe(outputParser).invoke(undefined);
    return content;
  };

  private getFormattedAnswer = async <T>(
    answer: string,
    schema: z.ZodType<T>,
  ): Promise<T | undefined> => {
    // e.g., answer = 123
    if (typeof answer !== 'string') {
      return undefined;
    }

    let cleanAnswer: string = answer;

    const keyIsUnquoted =
      cleanAnswer.includes(LLM_RESULTS_KEY) &&
      !cleanAnswer.includes(`"${LLM_RESULTS_KEY}"`);

    const stripPatterns = [
      ['�', ''],
      ['', ''],
      ['<admin>', ''],
      ['</admin>', ''],
      ['<paragraph>', ''],
      ['</paragraph>', ''],
      ['<ResponseType>', ''],
      ['</ResponseType>', ''],
      ['\n', ''],
      ...(keyIsUnquoted ? [[LLM_RESULTS_KEY, `"${LLM_RESULTS_KEY}"`]] : []),
    ];

    for (const [searchValue, replaceValue] of stripPatterns) {
      const regex = new RegExp(searchValue, 'g');
      cleanAnswer = cleanAnswer.replace(regex, replaceValue);
    }

    for (const pattern of stripPatterns) {
      const regex = new RegExp(pattern[0], 'g');
      cleanAnswer = cleanAnswer.replace(regex, pattern[1]);
    }

    // e.g., answer = ''
    if (!cleanAnswer || cleanAnswer.trim() === '') {
      return undefined;
    }

    const answerString = getContentFromAnswerTag(cleanAnswer);
    const answerJson = safeParseJSON(answerString);

    // e.g., answer = undefined or answer = {}
    if (!answerJson || !Object.keys(answerJson).length) {
      return undefined;
    }

    // e.g., answer = { "results": "NOT_FOUND" }
    if (answerJson[LLM_RESULTS_KEY] === LLM_NOT_FOUND_KEY) {
      return undefined;
    }

    const answerCleaned = replaceValueInObject(answerJson, LLM_NOT_FOUND_KEY, null);
    const { data, errors } = validateSchema<T>(schema, answerCleaned[LLM_RESULTS_KEY]);

    // e.g., answer = { age: '32 years old' } where schema = z.object({ age: z.number() })
    if (errors) {
      return undefined;
    }

    // e.g., answer = {}
    if (
      data !== null &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      Object.keys(data).length === 0
    ) {
      return undefined;
    }

    return data;
  };

  answer = async <T>({ contextDef, promptDef, llmDef }: LLMAnswerConfig) => {
    const { schema } = promptDef;
    const { modelName, temperature } = llmDef;
    const models = this.getChatModels(modelName, temperature);

    let attemptedRetries = 0;
    let currentInterval = 500;
    let releaser: undefined | SemaphoreInterface.Releaser;
    let answer: T | undefined;

    while (attemptedRetries < this.defaultOpts.maxRetriesPerRequest) {
      const modelIndex = attemptedRetries % this.defaultOpts.maxRetriesPerRequest;
      const model = models[modelIndex];
      const modelName =
        model instanceof BedrockChat
          ? (model.model as LLMName)
          : (model.modelName as LLMName);

      try {
        const [, release] = await this.semaphore.acquire();
        releaser = release;

        const documents = await this.getRelevantDocuments(contextDef);
        const messages = await this.createMessages(modelName, promptDef, documents);
        const content = await this.getAnswerString(model, messages);
        answer = await this.getFormattedAnswer<T>(content, schema);
        if (!answer) {
          throw new Error(`No data returned from model "${modelName}"`);
        }
        return answer;
      } catch (error) {
        console.error(getError(error));
        answer = undefined;
      } finally {
        if (releaser) {
          releaser();
        }
        this.semaphore.release();
      }

      await sleep(currentInterval);
      currentInterval *= 2; // exponential backoff
      attemptedRetries += 1;
    }

    this.semaphore.release();

    return answer;
  };
}
