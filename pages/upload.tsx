import { client, selectSp } from '@/utils/greenfield_client';
import { getOffchainAuthKeys } from '@/utils/offchainAuth';
import styles from '@/styles/Home.module.css';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ReedSolomon } from '@bnb-chain/reed-solomon';
import Layout from '@/components/layout';
import { BUCKET_NAME } from '@/config/env';
import LoadingDots from '@/components/ui/LoadingDots';
import { useIsMounted } from '@/hooks/useIsMounted';

export default function Upload() {
  const isMounted = useIsMounted();
  const { address, connector } = useAccount();
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState<{
    bucketName: string;
    objectName: string;
    file: File | null;
  }>({
    bucketName: BUCKET_NAME,
    objectName: '',
    file: null
  });
  const [txnHash, setTxnHash] = useState('');

  if (!isMounted) return null;

  return (
    <>
      <Layout>
        <section className="section">
          <div className="container">
            <h1 className="title font-bold">
              Upload document
            </h1>
          </div>
        </section>

        <div className='box'>
          <div className="field my-3">
            <div className="field-label is-normal">
              <label className="label">Bucket</label>
            </div>
            <div className="field-body">
              <div className="field">
                <div className="control">
                  <input
                    className={styles.textarea}
                    type="text"
                    value={info.bucketName}
                    placeholder="bucket name"
                    onChange={(e) => {
                      setInfo({ ...info, bucketName: e.target.value });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="field my-3 hidden">
            <button
              className="button border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 p-2"
              onClick={async () => {
                if (!address) return;

                const spInfo = await selectSp();
                console.log('spInfo', spInfo);

                const provider = await connector?.getProvider();
                const offChainData = await getOffchainAuthKeys(address, provider);
                if (!offChainData) {
                  alert('No offchain, please create offchain pairs first');
                  return;
                }

                try {
                  const createBucketTx = await client.bucket.createBucket(
                    {
                      bucketName: info.bucketName,
                      creator: address,
                      visibility: 'VISIBILITY_TYPE_PUBLIC_READ',
                      chargedReadQuota: '0',
                      spInfo: {
                        primarySpAddress: spInfo.primarySpAddress,
                      },
                      paymentAddress: address,
                    },
                    {
                      type: 'EDDSA',
                      domain: window.location.origin,
                      seed: offChainData.seedString,
                      address,
                    },
                  );

                  const simulateInfo = await createBucketTx.simulate({
                    denom: 'BNB',
                  });

                  console.log('simulateInfo', simulateInfo);

                  const res = await createBucketTx.broadcast({
                    denom: 'BNB',
                    gasLimit: Number(simulateInfo?.gasLimit),
                    gasPrice: simulateInfo?.gasPrice || '5000000000',
                    payer: address,
                    granter: '',
                  });

                  if (res.code === 0) {
                    alert('success');
                  }
                } catch (err) {
                  console.log(typeof err)
                  if (err instanceof Error) {
                    alert(err.message);
                  }
                  if (err && typeof err === 'object') {
                    alert(JSON.stringify(err))
                  }
                }

              }}
            >
              Create Bucket Tx
            </button>
          </div>
        </div>

        <div className="field my-3">
          <h1 className="title">Owner address : {address && address}</h1>
        </div>

        <div className='box'>
          <div className="field my-3">
            <div className="field-body">
              <div className="field">
                <div className="control">
                  <input
                    className={styles.textarea}
                    type="text"
                    value={info.objectName}
                    placeholder="object name"
                    onChange={(e) => {
                      setInfo({ ...info, objectName: e.target.value });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="field is-horizontal">
            <div className="file">
              <label className="file-label">
                <input className="file-input" type="file" name="resume" onChange={(e) => {
                  if (e.target.files) {
                    setInfo({
                      ...info,
                      file: e.target.files[0]
                    })
                  }
                }} />
                <span className="file-cta">
                  <span className="file-icon">
                    <i className="fas fa-upload"></i>
                  </span>
                  <span className="file-label">
                    Choose a file…
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* create object */}
          <div className="field my-3">
            <button
              className="button border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 p-2"
              onClick={async () => {
                if (!address || !info.file) return;

                const spInfo = await selectSp();
                console.log('spInfo', spInfo);

                const provider = await connector?.getProvider();
                const offChainData = await getOffchainAuthKeys(address, provider);
                if (!offChainData) {
                  alert('No offchain, please create offchain pairs first');
                  return;
                }

                const rs = new ReedSolomon();
                const fileBytes = await info.file.arrayBuffer();
                const expectCheckSums = rs.encode(new Uint8Array(fileBytes));

                try {
                  const createObjectTx = await client.object.createObject(
                    {
                      bucketName: info.bucketName,
                      objectName: info.objectName,
                      creator: address,
                      visibility: 'VISIBILITY_TYPE_PRIVATE',
                      fileType: info.file.type,
                      redundancyType: 'REDUNDANCY_EC_TYPE',
                      contentLength: fileBytes.byteLength,
                      expectCheckSums: expectCheckSums,
                    },
                    {
                      type: 'EDDSA',
                      domain: window.location.origin,
                      seed: offChainData.seedString,
                      address,
                    },
                  );

                  const simulateInfo = await createObjectTx.simulate({
                    denom: 'BNB',
                  });

                  console.log('simulateInfo', simulateInfo);

                  const res = await createObjectTx.broadcast({
                    denom: 'BNB',
                    gasLimit: Number(simulateInfo?.gasLimit),
                    gasPrice: simulateInfo?.gasPrice || '5000000000',
                    payer: address,
                    granter: '',
                  });

                  if (res.code === 0) {
                    setTxnHash(res.transactionHash);
                    alert('create object success');
                  }
                } catch (err) {
                  console.log(typeof err)
                  if (err instanceof Error) {
                    alert(err.message);
                  }
                  if (err && typeof err === 'object') {
                    alert(JSON.stringify(err))
                  }
                }
              }}
            >
              Create Object
            </button>
          </div>

          {/* upload */}
          {loading ? (
            <div className={styles.loadingwheel}>
              <LoadingDots color="#000" />
            </div>
          ) : (
            <div className='field my-3'>
              <button
                disabled={txnHash === ''}
                className="button border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 p-2"
                onClick={async () => {
                  if (!address || !info.file) return;

                  const spInfo = await selectSp();
                  console.log('spInfo', spInfo);

                  const provider = await connector?.getProvider();
                  const offChainData = await getOffchainAuthKeys(address, provider);
                  if (!offChainData) {
                    alert('No offchain, please create offchain pairs first');
                    return;
                  }

                  const uploadRes = await client.object.uploadObject(
                    {
                      bucketName: info.bucketName,
                      objectName: info.objectName,
                      body: info.file,
                      txnHash: txnHash,
                    },
                    {
                      type: 'EDDSA',
                      domain: window.location.origin,
                      seed: offChainData.seedString,
                      address,
                    },
                  );

                  console.log('uploadRes', uploadRes)

                  if (uploadRes.code === 0) {
                    alert('success');
                  }
                }}
              >
                Upload
              </button>

              {/* ingest data */}
              <div className='field mt-3'>
                <button
                  className="button border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 p-2"
                  onClick={async () => {
                    if (address && info.file) {
                      try {
                        setLoading(true)

                        const fileName = info.file.name

                        const response = await fetch('/api/ingest', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            address,
                            fileName
                          }),
                        });
                        const data = await response.json();
                        console.log('data', data);

                      } catch (err) {
                        console.error(err)
                      } finally {
                        setLoading(false)
                        alert('ingest success')
                      }
                    }

                  }}
                >
                  Ingest
                </button>
              </div>
            </div>
          )
          }
        </div>
      </Layout>
    </>
  );
};
