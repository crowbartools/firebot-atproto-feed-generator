import { Jetstream } from '@skyware/jetstream';
import WebSocket from 'ws';
import config from './config.js';
import { addPost } from './lib/db/index.js';
import { getPostAtUri } from './lib/util.js';

const jetstream = new Jetstream({
  ws: WebSocket,
  wantedCollections: [
    'app.bsky.feed.post',
    'app.bsky.feed.repost',
    'app.bsky.feed.like',
  ],
});

jetstream.onCreate('app.bsky.feed.post', async (event) => {
  const fromFirebotAccount = event.did === config.firebotAccountDid;
  const taggedFirebotAccount = event.commit.record.facets?.some(
    (f) =>
      f.features?.[0]?.$type === 'app.bsky.richtext.facet#mention' &&
      f.features?.[0]?.did === config.firebotAccountDid,
  );

  const textToSearch: string[] = [];

  if (event.commit?.record?.text?.length) {
    textToSearch.push(event.commit.record.text.toLowerCase());
  }

  textToSearch.push(
    ...(event.commit?.record?.tags
      ?.map((t) => t?.toLowerCase())
      .filter((t) => !!t.length) ?? []),
  );

  textToSearch.push(
    ...(event.commit?.record?.embed?.$type === 'app.bsky.embed.images'
      ? event.commit.record.embed.images
          ?.map((i) => i.alt?.toLowerCase())
          .filter((i) => !!i.length) ?? []
      : []),
  );

  const includesFirebotInText = textToSearch.some(
    (t) =>
      t.includes('firebot') &&
      !config.blacklistedWords.some((w) => t.includes(w)),
  );

  const quotesFirebotPost =
    (event.commit?.record?.embed?.$type === 'app.bsky.embed.record' &&
      parseAtUri(event.commit?.record?.embed?.record?.uri ?? '').did ===
        config.firebotAccountDid) ||
    (event.commit?.record?.embed?.$type === 'app.bsky.embed.recordWithMedia' &&
      parseAtUri(event.commit?.record?.embed?.record?.record?.uri ?? '').did ===
        config.firebotAccountDid);

  if (
    fromFirebotAccount ||
    taggedFirebotAccount ||
    quotesFirebotPost ||
    includesFirebotInText
  ) {
    await addPost({
      uri: getPostAtUri(event.did, event.commit.rkey),
      cid: event.commit.cid,
      indexedAt: new Date().toISOString(),
    });
  }
});

jetstream.onCreate('app.bsky.feed.repost', async (event) => {
  const fromFirebotAccount = event.did === config.firebotAccountDid;
  if (fromFirebotAccount) {
    await addPost({
      uri: event.commit.record.subject.uri,
      cid: event.commit.record.subject.cid,
      indexedAt: new Date().toISOString(),
    });
  }
});

function parseAtUri(uri: string) {
  const [did, collection, rkey] = uri.replace('at://', '').split('/');
  return { did, collection, rkey };
}

jetstream.start();
