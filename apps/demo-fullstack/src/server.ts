import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.get('/', (_req, res) => {
  res.type('text/plain').send('Ezkey TypeScript demo app scaffold. NestJS demo implementation pending.');
});

app.listen(port, () => {
  console.log(`Ezkey demo scaffold listening on http://localhost:${port}`);
});
