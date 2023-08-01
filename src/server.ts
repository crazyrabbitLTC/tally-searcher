import express from 'express';
import lunr from 'lunr';
import bodyParser from 'body-parser';

// Express setup
const app = express();
app.use(bodyParser.json());

// Create Lunr index on some documents
let documents = [
  { id: 1, text: 'Hello world' },
  { id: 2, text: 'Welcome to Node.js' },
];

let idx = lunr(function (this: lunr.Builder) {
  this.ref('id');
  this.field('text');

  documents.forEach((doc) => {
    this.add(doc);
  });
});

// Search endpoint
app.post('/search', (req, res) => {
  let results = idx.query((q) => {
    q.term(req.body.query, { usePipeline: true, wildcard: lunr.Query.wildcard.LEADING | lunr.Query.wildcard.TRAILING });
  });

  let response = results.map((result: lunr.Index.Result) => {
    return documents.find((doc) => doc.id === Number(result.ref));
  });
  res.json(response);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
