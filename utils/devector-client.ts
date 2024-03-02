import { GlacierClient } from "@glacier-network/client";
import axios from "axios";

const privateKey = process.env.DEVECTOR_WALLET_PRIVATE_KEY
const endpoint = 'https://greenfield.onebitdev.com/glacier-gateway-vector/'
const client = new GlacierClient(endpoint, {
  privateKey,
});
const namespace = process.env.DEVECTOR_NAMESPACE
const dataset = process.env.DEVECTOR_DATASET
const collection = 'programming'

const openai_key = process.env.OPENAI_API_KEY

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let init = async (namespace, dataset, collection, schema) => {
  let resp = await client.createNamespace(namespace)
  console.log(`namespace: ${namespace}`, resp.insertedId)

  resp = await client.namespace(namespace).createDataset(dataset)
  console.log(`dataset: ${dataset}`, resp.insertedId)

  resp = await client.namespace(namespace).dataset(dataset).createCollection(collection, schema)
  console.log(`collection: ${collection}`, resp.insertedId)
}


let programming = async (namespace, dataset, collection) => {
  let url = 'https://raw.githubusercontent.com/science-periodicals/list-of-programming-languages/master/data/data.json'

  let resp = await axios.get(url)

  let data = resp.data
  let description = data['description']
  let items = data['itemListElement']
  console.log(description, items[0])

  let coll = client.namespace(namespace).dataset(dataset).collection(collection)
  let n = 10;
  let docs = []
  for (const item of items.slice(10)) {
    let doc = {
      'link': item['item']['@id'],
      'type': item['item']['@type'],
      'name': item['item']['name'],
      'nameEmbedding': await getEmbedding(item['item']['name']),
    }
    docs.push(doc)
    console.log(doc)
    n -= 1
    if (n < 0) {
      break
    }
    let resp = await coll.insertOne(doc)
    console.log(resp.insertedId)
    await sleep(500)
  }
}

let search = async (namespace, dataset, collection, text) => {
  const embedding = await getEmbedding(text)
  let coll = client.namespace(namespace).dataset(dataset).collection(collection)

  let result = await coll.find({
    'numCandidates': 10,
    'vectorPath': 'nameEmbedding',
    'queryVector': embedding,
  }).toArray()

  console.log('search result', result)
  return result
}

let chatDocs = async (namespace, dataset, collection, input) => {
  const docs = await search(namespace, dataset, collection, input)
  if (docs.length === 0) {
    console.log(`I'm not sure about your question!`)
    return
  }

  const contexts = docs.map(item => `language: ${item.name}, wikipedia link: ${item.link}`)
  const messages = buildPrompt(input, contexts)

  const result = await getChatCompletions(messages)
  console.log(`your question: ${input}`)
  console.log(`chat response: ${result}`)
}

const schema = {
  title: "programming-lang",
  type: "object",
  properties: {
    name: {
      type: "string",
    },
    nameEmbedding: {
      type: "string",
      vectorIndexOption: {
        "type": "knnVector",
        "dimensions": 384,
        "similarity": "euclidean",
      },
    },
    link: {
      type: "string",
    },
    type: {
      type: "string",
    }
  }
}


async function getEmbedding(query) {
  // Define the OpenAI API url and key.
  const url = 'https://api.openai.com/v1/embeddings';

  // Call OpenAI API to get the embeddings.
  let response = await axios.post(url, {
    input: query,
    model: "text-embedding-ada-002"
  }, {
    headers: {
      'Authorization': `Bearer ${openai_key}`,
      'Content-Type': 'application/json'
    }
  });

  if (response.status === 200) {
    return response.data.data[0].embedding;
  } else {
    throw new Error(`Failed to get embedding. Status code: ${response.status}`);
  }
}

async function getChatCompletions(messages) {
  // Define the OpenAI API url and key.
  const url = 'https://api.openai.com/v1/chat/completions';
  // Call OpenAI API to get the embeddings.
  let response = await axios.post(url, {
    model: "gpt-3.5-turbo",
    messages: messages,
  }, {
    headers: {
      'Authorization': `Bearer ${openai_key}`,
      'Content-Type': 'application/json'
    }
  });

  if (response.status === 200) {
    return response.data.choices[0].message.content;
  } else {
    throw new Error(`Failed to get chat completion. Status code: ${response.status}`);
  }
}

function buildPrompt(query, context) {
  const system = {
    "role": "system",
    "content": "I am going to ask you a question, which I would like you to answer" +
      "based only on the provided context, and not any other information." +
      "If there is not enough information in the context to answer the question," +
      "say \"I am not sure\", then try to make a guess." +
      "Break your answer up into nicely readable paragraphs."
  };
  const user = {
    "role": "user",
    "content": "The question is " + query + ". Here is all the context you have:" +
      context.join(" ")
  };
  return [system, user]
}

async function runProcess() {
  console.log(`run with "init" -> "vector" -> "search"`)
  console.log('init...')
  await init(namespace, dataset, collection, schema)
  console.log('init done')

  console.log('vector...')
  await programming(namespace, dataset, collection)
  console.log('vector done')

  const query: string = 'what is Alma-0?'
  console.log('searching...', query)
  if (query === '') {
    console.log('search [text]')
    return
  }
  await search(namespace, dataset, collection, query)

  // console.log('thinking...', query)
  // await chatDocs(namespace, dataset, collection, query)

}

export { runProcess }