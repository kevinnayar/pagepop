export type LocalizationType = {
  content: string;
  source: string;
  target: string;
};

export interface ITranslationService {
  translate: (params: LocalizationType) => Promise<string>;
}
