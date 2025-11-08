const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// --- Configuración de Base de Datos (MongoDB) ---
// REEMPLAZA 'mongodb://localhost:27017/chatdb' con tu URL de conexión real si es diferente
const DB_URL = 'mongodb://localhost:27017/chatdb'; 

mongoose.connect(DB_URL)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error de conexión a MongoDB:', err));

// Esquema de Mongoose para los mensajes
const messageSchema = new mongoose.Schema({
    user: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// --- Manejo de Conexiones de Socket.io ---
io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado:', socket.id);

    // 1. Cargar mensajes antiguos al conectar
    Message.find().sort({ timestamp: 1 }).limit(50).then(messages => {
        socket.emit('load history', messages);
    });

    // 2. Manejar mensajes nuevos del cliente
    socket.on('chat message', (msg) => {
        // Guardar mensaje en la base de datos
        const newMessage = new Message({
            user: msg.user, // Asumimos que el cliente envía el usuario, en prod se gestiona mejor
            text: msg.text
        });

        newMessage.save().then(() => {
            // Emitir el mensaje a TODOS los clientes conectados
            io.emit('chat message', newMessage); 
        });
    });

    // 3. Manejar desconexiones
    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
});

// --- Servir archivos estáticos del frontend ---
app.use(express.static(path.join(__dirname, 'public')));

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
