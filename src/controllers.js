const { createUser, UserModel, fetchAllUsers, findUser, fetchAllMessages, deleteChatMessages, signUpModel, loginModel, logoutModel, connectedUserModel, refreshTokenService, } = require('./models');
const authorisation = require('./utils');

const getUser = async (req,res) => {
    const { name, email, password } = req.body;
    try {
        const newUser = await createUser({ name, email, password });
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getAllUsers = async (req, res) => {
    const { userId } = req.query;
    try {
        const users = await fetchAllUsers(userId);
        res.status(200).send(users);
    } catch (error) {
        res.status(404).json({ message: "Users not found" });
    }
}

const searchUsers = async (req, res) => {
    const { search, userId } = req.query;
    try {
        const user = await findUser(search, userId);
        res.status(200).send(user);
    } catch (error) {
        res.status(404).json({ message: "User not found" });
    }
}

const getAllMessages = async (req,res) => {
    const { user1, user2 } = req.query;
    try {
        const allData = await fetchAllMessages(user1, user2);
        res.status(200).send(allData);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error"})
    }
}

const clearChatMessages = async (req, res) => {
    const { sender, receiver } = req.body
    try {
        const result = await deleteChatMessages(sender, receiver);
        res.status(200).send(result);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error"})
    }
}

const signUp = async (req, res) => {
    const { name, email, password, picture } = req.body;
    try {
        const newUser = await signUpModel(name, email, password, picture);
    
        try {
            await newUser.save();
            res.status(201).json(newUser);
        } catch (saveError) {
            console.error('Error during user save:', saveError);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } catch (error) {
        if (error.message === "User is already present.") {
            res.status(400).json({ error: 'User is already present.' });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

const logIn = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { user, token, reftoken } = await loginModel(email,password);
        res.status(200).json({ user, token, reftoken });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
}

const logOut = async (req, res) => {
    const token = req.headers.authorisation.split(" ")[1];
    if (!token) {
        console.error("Invalid or missing token");
        throw new Error("Invalid or missing token");
    }
    try {
        await logoutModel(token);
        res.status(200).json({ message: "User logged out successfully" })
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

const connectedUser = async (req,res) => {
    const { userId } = req.query;
    try {
        const data = await connectedUserModel(userId);
        res.status(200).json({data});
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

const refreshToken = async (req, res) => {
    try {
        const token = await refreshTokenService(req.headers.authorization);
        res.status(200).send({ token });
    } catch (error) {
        return res.status(403).json({ message: "Login First" });
    }
};
 
module.exports = { getUser, getAllUsers, searchUsers, getAllMessages, clearChatMessages, signUp, logIn, logOut, connectedUser, refreshToken};