import type { NextApiRequest, NextApiResponse } from 'next';
import { run as ingestRun } from '@/scripts/ingest-data';
import { runProcess } from '@/utils/devector-client'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { address, fileName } = req.body;

  try {
    await ingestRun(address, fileName)
    // await runProcess()
    res.status(200).json({ result: true });
  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
}
