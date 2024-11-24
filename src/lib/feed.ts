import { getPosts } from './db/index.js';

export async function getFirebotPostsFeed(limit: number, cursor?: string) {
  let indexedAt: string | undefined;
  if (cursor) {
    indexedAt = new Date(parseInt(cursor, 10)).toISOString();
  }

  const posts = await getPosts(limit, indexedAt);

  let newCursor: string | undefined;
  const last = posts.at(-1);
  if (last) {
    newCursor = new Date(last.indexedAt).getTime().toString(10);
  }

  const feed = posts.map((row) => ({
    post: row.uri,
  }));

  return {
    cursor: newCursor,
    feed,
  };
}
