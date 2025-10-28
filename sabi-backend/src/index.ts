import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Sabi Backend is running!');
});

app.post('/actions', (req, res) => {
  console.log('Received action:', req.body);
  res.status(200).send({ message: 'Action received' });
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
