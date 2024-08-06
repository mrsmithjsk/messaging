require('dotenv').config();
const accessSecret = process.env.JWT_SECRET;
const refreshSecret = process.env.REF_SECRET;
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const mongoUri = 'mongodb://localhost:27017/dbconnect';

mongoose.connect(mongoUri);

mongoose.connection.on("connected", () => {
    console.log("Mongoose connected to MongoDB");
  });
  
  mongoose.connection.on("error", (err) => {
    console.log("Mongoose connection error:", err);
  });

const userSchema = new mongoose.Schema(
    {
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    chatMessageModel: [
        {
            message: {
                type: String,
            },
            senderId: {
                type: String,
            },
            receiverId: {
                type: String,
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
        },
    ],
},
{
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
}
);

const UserModel = mongoose.model('user', userSchema);

const groupSchema = new mongoose.Schema(
    {
        roomId: {
            type: Date,
            default: Date.now,
        },
        admin: {
            type: String,
        },
        groupOfUsers: {
            type: [String],
            default: [],
        },
        listOfMessage: [
            {
                message: {
                    type: String,
                },
                senderId: {
                    type: String,
                },
                senderName: {
                    type: String,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        groupName: {
            type: String,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    }
);

const GroupModel = mongoose.model("group", groupSchema);

const blacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
});

const BlacklistModel = mongoose.model("blacklist", blacklistSchema);

const createUser = async (userData) => {
    const newUser = new UserModel(userData);
    await newUser.save();
    return newUser;
};

const fetchAllUsers = async (userId) => {
    const users = await UserModel.find({ _id: { $ne: userId }});
    return users;
};

const findUser = async (search, userId) => {
    const users = await UserModel.find({ 
        _id: { $ne: userId },
        name: { $regex: search, $options: "i" },
    });
    return users;
};

const fetchAllMessages = async (user1, user2) => {
    const userChatData = await UserModel.findOne({ _id: user1 });
    const messages = userChatData.chatMessageModel;
    let allData = [];
    for(let i=0; i<messages.length; i++) {
        if (messages[i].senderId === user1 && messages[i].receiverId === user2) {
            allData.push({ data: messages[i], type: 'send' });
        } else if (messages[i].senderId === user2 && messages[i].receiverId === user1) {
            allData.push({ data: messages[i], type: 'recieve' });
        }
    }
    return allData;
}

const deleteChatMessages = async (sender, receiver) => {
    const userChatData = await UserModel.updateOne(
        { _id: sender },
        { $pull: { chatMessageModel: { senderId: receiver, receiverId: receiver }}}
    );
    return userChatData;
}

const signUpModel = async (name, email, password, picture) => {
    const userPresent = await UserModel.findOne({ email: email });
    if (userPresent) {
        throw new Error("User is already present.");
    }
    const hashed_password = bcrypt.hashSync(password, 4);
    const user = new UserModel({
        name,
        email,
        password: hashed_password,
        picture,
    });
    return user;
}

const loginModel = async (email, password) => {
    const user = await UserModel.findOne({ email: email });
    if (!user) {
        throw new Error("Username and password are incorrect");
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
        throw new Error("Wrong credentials");
    }
    const token = jwt.sign({ userId: user._id }, accessSecret, { expiresIn: 30000 });
    const reftoken = jwt.sign({ userId: user._id }, refreshSecret, { expiresIn: 30000 });
    return { user, token, reftoken };
}

const logoutModel = async (token) => {
    const blacklist = new BlacklistModel({ token });
    await blacklist.save();
}

const connectedUserModel = async (userId) => {
    console.log('Fetching connected users for userId:', userId);
        const user = await UserModel.findOne({
            _id: userId,
        });
        console.log('User found:', user);
        if (!user) {
            console.error('User not found.');
            return []; // Return an empty array if user not found
        }

        let connectedUserIds = new Set();

        for (let i = 0; i < user.chatMessageModel.length; i++) {
            console.log('Processing chat message:', user.chatMessageModel[i]);
    
            if (user.chatMessageModel[i].senderId !== userId) {
                connectedUserIds.add(user.chatMessageModel[i].senderId);
            }
    
            if (user.chatMessageModel[i].receiverId !== userId) {
                connectedUserIds.add(user.chatMessageModel[i].receiverId);
            }
        }
        
        console.log('Connected user IDs:', connectedUserIds);
        
        let connectedUserData = [];

        for (let id of connectedUserIds) {
            const eleUser = await UserModel.findOne({
                _id: id,
            });
            connectedUserData.push(eleUser);
        }
        
    console.log('Connected users:', connectedUserData);
    return connectedUserData;
};

const refreshTokenService = async (authorizationHeader) => {
    const reftoken = authorizationHeader.split(" ")[1];

    const decoded = jwt.verify(reftoken, refreshSecret);
    const { userId } = decoded;

    const user = await UserModel.findById(userId);

    if (!user) {
        throw new Error("Unauthorized");
    }

    const token = jwt.sign({ userId: user._id }, accessSecret, {
        expiresIn: 6000,
    });

    return token;
};


module.exports = { 
    UserModel, 
    GroupModel,
    BlacklistModel, 
    mongoose, 
    createUser,
    fetchAllUsers,
    findUser,
    fetchAllMessages,
    deleteChatMessages,
    signUpModel,
    loginModel,
    logoutModel,
    connectedUserModel,
    refreshTokenService,

 };