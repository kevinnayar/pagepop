import {
  Translate,
  TranslateTextCommandInput,
  TranslateTextCommand,
} from '@aws-sdk/client-translate';
import { AWS_SUPPORTED_LANGUAGES } from '../../consts/translation.consts';
import { ConfigurationType } from '../../config';
import { LocalizationType, ITranslationService } from '../../types/translation.types';

export class TranslationService implements ITranslationService {
  private translationClient: Translate;
  private languageMap: Record<string, true>;

  constructor(config: ConfigurationType) {
    const { region } = config.aws;
    this.translationClient = new Translate({ region });
    this.languageMap = AWS_SUPPORTED_LANGUAGES;
  }

  private isSupportedLanguage = (language: string): boolean => {
    return Boolean(this.languageMap[language]);
  };

  translate = async ({ content, source, target }: LocalizationType): Promise<string> => {
    if (!this.isSupportedLanguage(source)) {
      throw new Error(`Unsupported language: ${source}`);
    }
    if (!this.isSupportedLanguage(source)) {
      throw new Error(`Unsupported language: ${target}`);
    }

    if (source === target) {
      return content;
    }

    const translation: string[] = [];

    for (const segment of content.split('\n')) {
      if (segment.length === 0) continue;

      try {
        const translateParams: TranslateTextCommandInput = {
          Text: segment,
          SourceLanguageCode: source,
          TargetLanguageCode: target,
        };
        const command = new TranslateTextCommand(translateParams);

        const { TranslatedText: text } = await this.translationClient.send(command);
        if (text) {
          translation.push(text);
        }
      } catch (e) {
        console.error(e);
        throw new Error(
          `Failed to translate content for language pair: ${source} -> ${target}`,
        );
      }
    }

    return translation.join('\n');
  };
}
