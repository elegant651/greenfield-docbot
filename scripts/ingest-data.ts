import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { pinecone } from '@/utils/pinecone-client';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { CustomPDFLoader } from '@/utils/customPDFLoader';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';

/* Name of directory to retrieve your files from 
   Make sure to add your PDF files inside the 'docs' folder
*/
const fileDir = 'docs';

export type AddressInfo = {
  creatorAddress: string;
  ownerAddress: string;
}

export const run = async (creatorAddress: string, fileName: string) => {
  try {

    //@TODO: after upload it to greenfield
    // set specific address
    const addressInfo: AddressInfo = {
      creatorAddress,
      ownerAddress: creatorAddress,
    }

    /*load raw docs from the all files in the directory */
    // const directoryLoader = new DirectoryLoader(filePath, {
    //   '.pdf': (path) => new PDFLoader(path),
    // });
    // const rawDocs = await directoryLoader.load();

    // const loader = new CustomPDFLoader(fileDir + "/crackingthecodinginterview_brief2.pdf", addressInfo);
    const loader = new CustomPDFLoader(fileDir + "/" + fileName, addressInfo);
    const rawDocs = await loader.load();
    console.log('address', addressInfo)

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log('split docs', docs);

    console.log('creating vector store...');
    /*create and store the embeddings in the vectorStore*/
    const embeddings = new OpenAIEmbeddings();
    const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name

    //embed the PDF documents
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
      namespace: PINECONE_NAME_SPACE,
      textKey: 'text',
    });

  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }
};

(async () => {
  await run('0x1a0d0a7f6b2f0b9b7b0b0b0b0b0b0b0b0b0b0b');
  console.log('ingestion complete');
})();
