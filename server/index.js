require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nidosRouter = require('./routes/nidos');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/nidos', nidosRouter);

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
