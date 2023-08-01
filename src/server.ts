import express from 'express';
import lunr from 'lunr';
import bodyParser from 'body-parser';
import axios from 'axios';

// GraphQL query
const GRAPHQL_QUERY = `
  {
    governance(id: "eip155:42161:0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9") {
      id
      delegates(pagination: { limit: 100, offset: 0 }) {
        account {
          address
          ens
        }
      }
    }
  }
`;

// Express setup
const app = express();
app.use(bodyParser.json());

// Fetch data and build index
let idx: lunr.Index;
let documents: any[];

async function fetchDataAndBuildIndex() {
  try {
    const response = await axios.post(
      'https://api.tally.xyz/query',
      { query: GRAPHQL_QUERY },
      { 
        headers: {
          "API-KEY": "d74749546a729d87137e508e6a294716d3177000ac0b69f472a5e5a0586f282f"
        }
      }
    );

    console.log(response.data); // <- Add this line

    const delegates = response.data.data.governance.delegates;

    documents = delegates.map((delegate: any, index: number) => ({
      id: index,
      address: delegate.account.address,
      ens: delegate.account.ens || '',  // Some accounts may not have ENS names
    }));

    idx = lunr(function (this: lunr.Builder) {
      this.ref('id');
      this.field('address');
      this.field('ens');

      documents.forEach((doc) => {
        this.add(doc);
      });
    });

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Call function to fetch data and build index
fetchDataAndBuildIndex();

// Search endpoint
app.post('/search', (req, res) => {
  if (idx && documents) {
    let results = idx.query((q) => {
      q.term(req.body.query, { usePipeline: true, wildcard: lunr.Query.wildcard.LEADING | lunr.Query.wildcard.TRAILING });
    });

    let response = results.map((result: lunr.Index.Result) => {
      return documents.find((doc) => doc.id === Number(result.ref));
    });
    res.json(response);
  } else {
    res.status(503).json({ message: 'Index not ready, please try again later' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
