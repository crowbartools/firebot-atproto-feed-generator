import { CronJob } from 'cron';
import { removePostsOlderThan } from './lib/db/index.js';

// Delete old posts every day
CronJob.from({
  start: true,
  cronTime: '0 0 * * *',
  onTick: async () => {
    const thirtyDaysAgo = new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30,
    ).toISOString();

    await removePostsOlderThan(thirtyDaysAgo);
  },
});
