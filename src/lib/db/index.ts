import SqliteDb from 'better-sqlite3';
import { Kysely, Migrator, SqliteDialect } from 'kysely';
import { DatabaseSchema, Post } from './schema.js';
import { migrationProvider } from './migrations.js';
import config from '../../config.js';

const db = new Kysely<DatabaseSchema>({
  dialect: new SqliteDialect({
    database: new SqliteDb(config.sqliteLocation),
  }),
});

export async function addPost(post: Post) {
  console.log('Adding post: ', JSON.stringify(post));
  try {
    await db
      .insertInto('post')
      .values(post)
      .onConflict((oc) => oc.doNothing())
      .execute();
  } catch (err) {
    console.error('Error adding post: ', err);
  }
}

export async function removePost(uri: string) {
  try {
    const deleteResults = await db
      .deleteFrom('post')
      .where('uri', '=', uri)
      .execute();
    if (deleteResults.some((result) => result.numDeletedRows > 0)) {
      console.log(`Deleted post: ${uri}`);
    }
  } catch (err) {
    console.error('Error deleting post: ', err);
  }
}

export async function removePostsOlderThan(date: string) {
  console.log('Removing posts older than: ', date);
  try {
    const deletedResults = await db
      .deleteFrom('post')
      .where('indexedAt', '<', date)
      .execute();
    const deletedPostsCount = deletedResults
      .map((result) => Number(result.numDeletedRows))
      .reduce((a, b) => a + b, 0);
    if (deletedPostsCount > 0) {
      console.log(`Deleted ${deletedPostsCount} old posts`);
    }
  } catch (err) {
    console.error('Error deleting old posts', err);
  }
}

export async function getPosts(limit: number, indexedAt?: string) {
  try {
    let builder = db
      .selectFrom('post')
      .selectAll()
      .orderBy('indexedAt', 'desc')
      .orderBy('cid', 'desc')
      .limit(limit);
  
    if (indexedAt) {
      builder = builder.where('post.indexedAt', '<', indexedAt);
    }
  
    return await builder.execute();
  } catch (err) {
    console.error('Error getting posts: ', err);
    return [];
  }
}

export async function getAllPosts() {
  try {
    return await db.selectFrom('post').selectAll().execute();
  } catch (err) {
    console.error('Error getting all posts: ', err);
    return [];
  }
}

export async function postInFeed(uri: string) {
  try {
    const post = await db
      .selectFrom('post')
      .selectAll()
      .where('uri', '=', uri)
      .executeTakeFirst();
    return !!post;
  } catch (err) {
    console.error('Error checking post in feed: ', err);
    return false;
  }
}

const migrateToLatest = async (db: Kysely<DatabaseSchema>) => {
  const migrator = new Migrator({ db, provider: migrationProvider });
  const { error } = await migrator.migrateToLatest();
  if (error) throw error;
};

await migrateToLatest(db);
