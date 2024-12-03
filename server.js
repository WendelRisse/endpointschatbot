const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// Conectar ao MongoDB Atlas
const uri = process.env.MONGODB_URI || 'mongodb+srv://Wendel:1234@wendel.9eamttz.mongodb.net/?retryWrites=true&w=majority&appName=Wendel';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 30000})
    .then(() => console.log('Conectado ao MongoDB Atlas'))
    .catch(err => {
        console.error('Erro ao conectar ao MongoDB:', err.message);
        process.exit(1); // Encerra a aplicação se falhar na conexão
    });

const historySchema = new mongoose.Schema({
    sessionId: String,
    role: String,
    text: String,
    ip: String,
    city: String,
    state: String,
    country: String,
    timestamp: { type: Date, default: Date.now }
});

const History = mongoose.model('History', historySchema);

// Endpoint para salvar histórico
app.post('/api/saveHistory', async (req, res) => {
    const { sessionId, role, text } = req.body;
    const ip = req.ip;

    if (!sessionId || !role || !text) {
        return res.status(400).send({ error: 'sessionId, role e text são obrigatórios.' });
    }

    try {
        // Verifica se o IP está disponível
        try {
            if (!ip) {
                throw new Error('IP não encontrado');
            }
        } catch (ipError) {
            console.error('Erro ao verificar o IP:', ipError.message);
            return res.status(400).send({ error: 'IP não encontrado no cabeçalho da requisição.' });
        }

        // Consultando a API de geolocalização
        let geoResponse;
        try {
            geoResponse = await axios.get(`http://ip-api.com/json/${ip}`);
        } catch (geoError) {
            console.error('Erro ao consultar a API de geolocalização:', geoError.message);
            geoResponse = { data: { city: 'Desconhecida', regionName: 'Desconhecido', country: 'Desconhecido' } };
        }

        const { city, regionName: state, country } = geoResponse.data;

        // Criando o histórico de entrada
        let historyEntry;
        try {
            historyEntry = new History({
                sessionId,
                role,
                text,
                ip,
                city,
                state,
                country
            });
        } catch (historyError) {
            console.error('Erro ao criar o objeto de histórico:', historyError.message);
            return res.status(500).send({ error: 'Erro ao criar o objeto de histórico.' });
        }

        // Salvando o histórico no banco de dados
        try {
            await historyEntry.save();
            res.status(201).send({ message: 'Histórico salvo com sucesso!' });
        } catch (saveError) {
            console.error('Erro ao salvar o histórico:', saveError.message);
            return res.status(500).send({ error: 'Erro ao salvar o histórico. Detalhes: ' + saveError.message });
        }

    } catch (error) {
        console.error('Erro geral ao salvar histórico:', error.message);
        res.status(500).send({ error: 'Erro ao salvar histórico. Detalhes: ' + error.message });
    }
});

// Endpoint para recuperar o histórico completo por sessionId
app.get('/api/getHistory/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    console.log('Session ID recebido:', sessionId); // Log para depuração

    if (!sessionId) {
        return res.status(400).send({ error: 'Session ID é obrigatório' });
    }

    try {
        // Buscando o histórico para o sessionId fornecido
        let history;
        try {
            history = await History.find({ sessionId });
        } catch (historyFindError) {
            console.error('Erro ao consultar o banco de dados:', historyFindError.message);
            return res.status(500).send({ error: 'Erro ao consultar o banco de dados. Detalhes: ' + historyFindError.message });
        }

        // Verificando se o histórico foi encontrado
        if (!history || history.length === 0) {
            return res.status(404).send({ error: 'Histórico não encontrado para o sessionId fornecido' });
        }

        // Respondendo com o histórico encontrado
        res.status(200).send(history);
    } catch (error) {
        console.error('Erro ao recuperar histórico:', error.message);
        res.status(500).send({ error: 'Erro ao recuperar histórico. Detalhes: ' + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
