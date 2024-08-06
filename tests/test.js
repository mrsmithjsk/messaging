const supertest = require('supertest');
const app = require('../server');
const { mongoose, UserModel } = require('../src/models');
const { BlacklistModel } = require('../src/models')
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");

const mongoUri = 'mongodb://localhost:27017/dbconnect';

beforeAll(async () => {
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect(mongoUri);
});

describe('Server Tests', () => {
    it('should connect to the database', async () => {
        const response = await supertest(app).get('/');
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Server working');
    });
    it('should be able to create a new user', async () => {
        const userData = { name: 'testuser', email: 'test@example.com', password: 'password' };
        const response = await supertest(app).post('/user').send(userData);
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.name).toBe('testuser');
    });
});

describe('/getAllUsers Tests', () => {
    it('should get all users', async () => {
        const response = await supertest(app).get('/allUsers');
        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
    });
    it('should return 404 if no users are found', async () => {
        const nonExistentUserId = 'nonexistentuserid';
        const response = await supertest(app).get(`/allUsers?userId=${nonExistentUserId}`);
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Users not found');
    })
});

describe('/searchUsers Tests', () => {
    it('should search all users by name', async () => {
        const testUser = {
            name: 'JohnDoe',
            email: 'johndoe@example.com',
            password: 'password',
          };
        const createdUser = await UserModel.create(testUser);

        const response = await supertest(app).get('/searchUsers').query({ search: 'John', userId: createdUser._id});

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body[0].name).toEqual('JohnDoe');
    });
    it('should return 404 if no users are found', async () => {
        const response = await supertest(app).get('/searchUsers').query({ search: 'Invalid', userId: 'Wrong'});
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'User not found');
    })
});

describe('/getAllMessages Tests', () => {
    let user1Id, user2Id;

    beforeAll(async () => {
        const user1Email = `user1_${Date.now()}@example.com`;
        const user2Email = `user2_${Date.now()}@example.com`;

        const user1 = await UserModel.create({
            name: 'User1',
            email: user1Email,
            password: 'user1password',
        });

        const user2 = await UserModel.create({
            name: 'User2',
            email: user2Email,
            password: 'user2password',
        });

        user1Id = user1._id;
        user2Id = user2._id;

        await UserModel.findByIdAndUpdate(user1Id, {
            $push: {
                chatMessageModel: {
                    message: 'Hello from User1 to User2',
                    senderId: user1Id,
                    receiverId: user2Id,
                },
            },
        });
        await UserModel.findByIdAndUpdate(user2Id, {
            $push: {
                chatMessageModel: {
                    message: 'Hello from User2 to User1',
                    senderId: user2Id,
                    receiverId: user1Id,
                },
            },
        });
    });

    it('should fetch messages of the users', async () => {
        const response = await supertest(app).get(`/getAllMessages?user1=${user1Id}&user2=${user2Id}`);
        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body[0].data.message).toBe('Hello from User1 to User2');
        expect(response.body[0].data.senderId.toString()).toEqual(user1Id.toString());
        expect(response.body[0].data.receiverId.toString()).toEqual(user2Id.toString());
        expect(response.body[0].type).toBe('send');
    });
    it('should return an error for invalid or non-existent user IDs', async () => {
        const invalidUserId1 = 'invalid_user_id_1';
        const invalidUserId2 = 'invalid_user_id_2';
        
        const response = await supertest(app).get(`/getAllMessages?user1=${invalidUserId1}&user2=${invalidUserId2}`);
        
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
    });
    it('should return an empty array for the same user', async () => {
        const response = await supertest(app).get(`/getAllMessages?user1=${user1Id}&user2=${user1Id}`);
        
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });
    

    afterAll(async () => {
        await UserModel.deleteMany({ _id: { $in: [user1Id, user2Id] } });
    });
});

describe('/clearChatMessages Tests', () => {
    let senderId, receiverId;

    beforeAll(async () => {
        const sender = await UserModel.create({
            name: 'Sender',
            email: 'sender@example.com',
            password: 'senderPassword',
            chatMessageModel: [],
        });

        const receiver = await UserModel.create({
            name: 'Receiver',
            email: 'receiver@example.com',
            password: 'receiverPassword',
            chatMessageModel: [],
        });

        senderId = sender._id;
        receiverId = receiver._id;

        await UserModel.findByIdAndUpdate(senderId, {
            $push: {
                chatMessageModel: {
                    message: 'Hello from Sender to Receiver',
                    senderId: senderId,
                    receiverId: receiverId,
                },
            },
        });
        await UserModel.findByIdAndUpdate(receiverId, {
            $push: {
                chatMessageModel: {
                    message: 'Hello from Receiver to Sender',
                    senderId: receiverId,
                    receiverId: senderId,
                },
            },
        });
    });

    it('should clear chat messages for valid sender and receiver', async() => {
        const response = await supertest(app)
            .post('/clearChatMessages')
            .send({ sender: senderId, receiver: receiverId });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('modifiedCount', 1);
    });
    it('should handle errors for invalid sender and receiver', async() => {
        const response = await supertest(app)
            .post('/clearChatMessages')
            .send({ sender: 'invalidSenderId', receiver: 'invalidReceiverId' });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Internal Server Error' });
    })

    afterAll(async () => {
        await UserModel.deleteMany({ _id: { $in: [senderId, receiverId] } });
    });
})

describe('/signUp Tests', () => {
    let existingUser;

    beforeAll(async () => {
        existingUser = await UserModel.create({
            name: 'ExistingUser',
            email: 'existing@example.com',
            password: 'existingpassword',
            picture: 'existing.jpg',
        });
    });

    it('should create a new user', async () => {
        const user = {
            name: 'TestUser1',
            email: 'test1@example.com',
            password: 'testpassword1',
            picture: 'test1.jpg',
        };

        const response = await supertest(app)
            .post('/signUp')
            .send(user);
        expect(response.statusCode).toBe(201);
        expect(response.body.name).toBe('TestUser1');
        expect(response.body.email).toBe('test1@example.com');
    });

    it('should handle existing user', async () => {
        const response = await supertest(app)
            .post('/signUp')
            .send({
                name: 'ExistingUser',
                email: 'existing@example.com',
                password: 'existingpassword',
                picture: 'existing.jpg',
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('error', 'User is already present.');
    });
    afterAll(async () => {
        if (existingUser) {
            await UserModel.findByIdAndDelete(existingUser._id);
        }
    });
});


describe('/login Tests', () => {
    let validUser;

    beforeAll(async () => {
        validUser = await UserModel.create({
            name: 'ValidUser',
            email: 'validuser@example.com',
            password: await bcrypt.hash('validpassword', 10),
        });
    });
    it('should successfully login with valid credentials', async () => {
        const existingUser = {
            email: 'validuser@example.com',
            password: 'validpassword',
        };
    
        const response = await supertest(app)
            .post('/logIn')
            .send(existingUser);
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('reftoken');
    });
    it('should respond with an error message on unsuccessful login', async () => {
  
      const response = await supertest(app)
        .post('/logIn')
        .send({
          email: 'invalid@example.com',
          password: 'invalidpassword',
        });
  
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    afterAll(async () => {
        if (validUser) {
            await UserModel.findByIdAndDelete(validUser._id);
        }
    });
  });

describe('/logOut Tests', () => {
    afterEach(async () => {
        await BlacklistModel.deleteMany({});
    });

    it('should log out the user and return a success message', async () => {
        const userToken = 'valid_token';

        // const blacklist = new BlacklistModel({ token: userToken });
        // await blacklist.save();

        const response = await supertest(app)
            .get('/logOut')
            .set('Authorisation', `Bearer ${userToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User logged out successfully');
    });

    it.skip('should handle errors and return a 500 status with an error message', async () => {

        const response = await supertest(app)
            .get('/logOut')
            .set('Authorisation', 'Bearer ${}');

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Internal server error');
    });
});

describe('/connectedUser Tests', () => {
    let testUser;

    beforeAll(async () => {
        testUser = await UserModel.create({
            name: 'TestUser123',
            email: 'testuser123@example.com',
            password: 'testpassword123',
        });
        await UserModel.findByIdAndUpdate(testUser._id, {
            $push: {
                chatMessageModel: {
                    $each: [
                        { senderId: 'some_sender_id_1', receiverId: testUser._id },
                        { senderId: 'some_sender_id_2', receiverId: testUser._id },
                    ]
                }
            },
        });
    });    

    it.skip('should return user data and return a success message', async () => {
        const userId = testUser._id;

        const response = await supertest(app)
            .get(`/connectedUser?userId=${userId}`);
        console.log(response.body, response.status);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('connectedUsers');
        expect(response.body.connectedUsers).toBeInstanceOf(Array);
    });
    it('should handle errors and return a 500 status with an error message', async () => {
        const response = await supertest(app)
            .get('/connectedUser?userId=invalid_user_id');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Internal server error' });
    });
    afterAll(async () => {
        if (testUser) {
            await UserModel.findByIdAndDelete(testUser._id);
        }
    });
})

describe('/refreshToken Tests', () => {
    it('should refresh the authentication token successfully', async () => {
        function generateRefreshToken(userId) {
            const refreshToken = jwt.sign({ userId: userId }, process.env.REF_SECRET, { expiresIn: '7d' });
            return refreshToken;
        }
        const user = await UserModel.create({
            name: 'Test111 User',
            email: 'test111@example.com',
            password: 'password111'
        });

        const refreshToken = generateRefreshToken(user._id);
        console.log(refreshToken);
        const response = await supertest(app)
            .get('/refreshToken')
            .set('Authorization', `Bearer ${refreshToken}`);
        console.log(response.body);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
    });
    it('should handle unauthorized access and return a 403 status code', async () => {
        const response = await supertest(app)
            .get('/refreshToken')
            .set('Authorization', 'Bearer invalid_token');

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Login First' });
    })
})