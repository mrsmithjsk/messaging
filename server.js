require('dotenv').config();

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const { UserModel } = require('./src/models');
const { getUser, getAllUsers, searchUsers, getAllMessages, clearChatMessages, signUp, logIn, logOut, connectedUser, refreshToken} = require('./src/controllers')


const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.json());
app.use(cors());
app.get('/', (req, res) => {
    res.json({message: "Server working"})
});
app.post('/user', getUser);
app.get('/allUsers', getAllUsers);
app.get('/searchUsers', searchUsers);
app.get('/getAllMessages', getAllMessages);
app.post('/clearChatMessages', clearChatMessages);
app.post('/signUp', signUp);
app.post('/logIn', logIn);
app.get('/logOut', logOut);
app.get('/connectedUser', connectedUser);
app.get('/refreshToken', refreshToken);

const obj = {};
io.on('connection', (socket) => {
    console.log('User connected');
    socket.on("createConnection", (userId) => {
        obj[userId] = socket.id;
    });
    socket.on('chatMessage', async (message, senderId, receiverId) => {
        let newMessage = {
            message: message,
            senderId: senderId,
            receiverId: receiverId,
        };
        try {
            await UserModel.updateOne(
                { _id: senderId },
                { $push: { chatMessageModel: newMessage}},
            );
        } catch (error) {
            console.error("Error updating database:", error);
        };
        try {
            await UserModel.updateOne(
                { _id: receiverId },
                { $push: { chatMessageModel: newMessage } }
            );
        } catch (error) {
            console.error("Error updating database:", error);
        };
        io.to(obj[receiverId]).emit("receivedMessage", message, senderId);
    });
    socket.on("disconnect", () => {
        console.log('User disconnected');
    });
});


const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app;