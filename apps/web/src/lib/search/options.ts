import type { Options } from 'minisearch';
import { normalize, tokenize } from './text';

export const bibleOptions: Options = { fields: ['text'], idField: 'id', tokenize, processTerm: normalize };
export const docOptions: Options = { fields: ['text', 'title'], idField: 'id', tokenize, processTerm: normalize };

export interface IndexDoc {
  id: string;
  text: string;
  title?: string;
}
