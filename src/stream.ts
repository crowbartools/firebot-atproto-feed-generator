import { Jetstream } from '@skyware/jetstream';
import WebSocket from 'ws';
import config from './config.js';
import { addPost } from './lib/db/index.js';

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
  const includesFirebotInText = event.commit?.record?.text
    ?.toLowerCase()
    ?.includes('firebot');

  const includeFirebotInTags = event.commit?.record?.tags?.some((t) =>
    t?.toLowerCase().includes('firebot'),
  );

  const includesFirebotInImgAltText =
    event.commit?.record?.embed?.$type === 'app.bsky.embed.images' &&
    event.commit?.record?.embed?.images?.some((i) =>
      i.alt?.toLowerCase().includes('firebot'),
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
    includesFirebotInText ||
    includeFirebotInTags ||
    quotesFirebotPost ||
    includesFirebotInImgAltText
  ) {
    await addPost({
      uri: getAtUri(event.did, event.commit.rkey),
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

function getAtUri(did: string, rkey: string) {
  return `at://${did}/app.bsky.feed.post/${rkey}`;
}

function parseAtUri(uri: string) {
  const [did, collection, rkey] = uri.replace('at://', '').split('/');
  return { did, collection, rkey };
}

jetstream.start();
