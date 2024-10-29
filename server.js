const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());


// Conectar ao MongoDB Atlas
const uri = 'mongodb+srv://Wendel:1234@wendel.9eamttz.mongodb.net/?retryWrites=true&w=majority&appName=Wendel';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conectado ao MongoDB Atlas'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Definir o Schema e o Model para o histórico
const historySchema = new mongoose.Schema({
    role: String,
    text: String,
    ip: String,
    city: String,   // Novo campo para cidade
    state: String,  // Novo campo para estado
    country: String,// Novo campo para país
    timestamp: { type: Date, default: Date.now }
});


const History = mongoose.model('History', historySchema);


// Endpoint para salvar histórico
const axios = require('axios');

app.post('/api/saveHistory', async (req, res) => {
    const { role, text } = req.body;
    const ip = req.ip; // Capturar o IP do usuário

    try {
        // Fazer uma requisição à API de geolocalização
        const geoResponse = await axios.get(`http://ip-api.com/json/${ip}`);
        const { city, regionName: state, country } = geoResponse.data; // Captura cidade, estado, e país

        // Criar o objeto de histórico com a geolocalização
        const historyEntry = new History({
            role,
            text,
            ip,
            city,  // Armazenar a cidade
            state, // Armazenar o estado
            country // Armazenar o país
        });

        // Salvar no MongoDB
        await historyEntry.save();
        res.status(201).send({ message: 'Histórico salvo com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
        res.status(500).send({ error: 'Erro ao salvar histórico.' });
    }
});


// Endpoint para recuperar o histórico completo
app.get('/api/getHistory', async (req, res) => {
    try {
        const history = await History.find();
        res.status(200).send(history);
    } catch (error) {
        res.status(500).send({ error: 'Erro ao recuperar histórico.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));