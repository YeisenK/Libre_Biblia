import MiniSearch from 'minisearch';
import { bibleOptions, docOptions, type IndexDoc } from '@/lib/search/options';

self.onmessage = (e: MessageEvent<{ kind: 'bible' | 'document'; docs: IndexDoc[] }>) => {
  const ms = new MiniSearch<IndexDoc>(e.data.kind === 'bible' ? bibleOptions : docOptions);
  ms.addAll(e.data.docs);
  (self as unknown as Worker).postMessage(JSON.stringify(ms));
};
