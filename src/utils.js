const { UserModel } = require("./models");
const { BlacklistModel } = require("./models");
const jwt = require("jsonwebtoken");

const authenticate = async (req, res, next) => {
    // Extract the token from the Authorization header
    const token = req.headers.authorization.split(" ")[1];

    try {
        // Check if the token is blocked
        const isBlocked = await BlacklistModel.findOne({ token });
        if (isBlocked) {
            return res.status(403).json({ message: "Login first" });
        }

        // Verify the token and get the decoded payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { userId } = decoded;

        // Check if the user associated with the token exists
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Attach the user information to the request object for further processing
        req.user = user;
        next();
    } catch (error) {
        // Handle different error scenarios
        if (error.name === "TokenExpiredError") {
            return res.status(400).json({ message: "Access token expired" });
        } else {
            return res.status(400).json({ message: "Login First!" });
        }
    }
};

const authorisation = (permitted) => {
    return (req, res, next) => {
        const user_role = req.user.role;
        if (permitted.includes(user_role)) {
            next();
        } else {
            return res.status(403).json({ message: "Unauthorized" });
        }
    };
};

module.exports = { authenticate, authorisation };







// const createGroup = async (req, res) => {
//     const { admin, groupOfUsers, groupName } = req.body;
//     try {
//         const group = await createGroupModel(admin, groupOfUsers, groupName);
//         res.status(200).send({ msg: "Group created successfully", group });
//     } catch (error) {
//         res.status(404).send({ msg: "Group creation unsuccessful", error: error });
//     }
// };
// const createGroupModel = async (admin, groupOfUsers, groupName) => {
//     const group = new GroupModel({
//         admin,
//         groupOfUsers,
//         groupName,
//     });
//     await group.save();
//     return group;
// };
// app.post('/createGroup', createGroup);

// // only role ==> admin can access this route
// const addMembersToGroup = async (req, res) => {
//     const { newMembersId, groupId, adminId } = req.body;
//     try {
//         const group = await addMembersModel(newMembersId, groupId, adminId);
//         if (group.modifiedCount == 0) {
//             res.status(401).send({ error: "No groups found" });
//         } else res.status(200).send({ msg: "User has been Added to group successfully" });
//     } catch (error) {
//         res.status(500).json({ error: "Internal Server Error"})
//     }
// };
// const addMembersModel = async (newMembersId, groupId, adminId) => {
//     const group = await GroupModel.updateOne(
//         { $and: [{ _id: groupId }, { admin: adminId }] },
//         { $push: { groupOfUsers: newMembersId } }
//     );
//     return group;
// }
// app.post("/addMembersToGroup", addMembersToGroup)
// // remove members from group

// const removeGroupMember = async (req, res) => {
//     const { adminId, removeUserId, groupId } = req.body;
//     try {
//         const group = await removeGroupMemberModel(adminId, removeUserId, groupId)
//         if (group.modifiedCount == 0)
//             res.status(401).send({ error: "Not Authorized" });
//         else res.status(200).send({ msg: "User has been removed successfully" });
//     } catch (error) {
//         res.status(500).json({ error: "Internal Server Error"})
//     }
// };
// const removeGroupMemberModel = async (adminId, removeUserId, groupId) => {
//     const group = await GroupModel.updateOne(
//         { $and: [{ _id: groupId }, { admin: adminId }] },
//         {
//             $pull: { groupOfUsers: removeUserId },
//         }
//     );
//     return group;
// }
// app.post("/removeGroupMember",removeGroupMember);

// // delete group
// const deleteGroup = async (req, res) => {
//     const { adminId, groupId } = req.body;
//     try {
//         const group = await deleteGroupModel(adminId, groupId)
//         if (group.deletedCount == 0)
//             res.status(401).send({ error: "Not Authorized" });
//         else res.status(200).send({ msg: "Group Deleted successfully" });
//     } catch (error) {
//         res.status(500).json({ error: "Internal Server Error"})
//     }
// };
// const deleteGroupModel = async (adminId, groupId) => {
//     const group = await GroupModel.deleteOne({
//         $and: [{ _id: groupId }, { admin: adminId }],
//     });
//     return group;
// }
// app.delete("/deleteGroup", deleteGroup);


// const updateGroupModel = async (groupId, name) => {
//     const group = await GroupModel.findOne({ _id: groupId });
//     const newName = name === undefined ? group.groupName : name;

//     await GroupModel.updateOne(
//         { _id: groupId },
//         { $set: { groupName: newName } }
//     );
// };
// const updateGroup = async (req, res) => {
//     const { groupId, name } = req.body;
//     try {
//         const groupUpdate = await updateGroupModel(groupId, name);
//         res.status(200).send(groupUpdate);
//     } catch (error) {
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };
// app.put("/updateGroup", updateGroup);


// const sendMessageModel = async (groupId, message, senderId, senderName) => {
//     await GroupModel.updateOne(
//         { _id: groupId },
//         { $push: { listOfMsg: { message, senderId, senderName } } }
//     );
// };
// const sendMessage = async (req, res) => {
//     const { groupId, message, senderId, senderName } = req.body;
//     try {
//         const data = await sendMessageModel(groupId, message, senderId, senderName);
//         res.status(200).send(data);
//     } catch (error) {
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };
// app.put("/sendMessage", sendMessage);


// const leaveFromGroupModel = async (groupId, userId) => {
//     await GroupModel.updateOne(
//         { _id: groupId },
//         { $pull: { groupOfUsers: userId } }
//     );
// };
// const leaveFromGroup = async (req, res) => {
//     const { groupId, userId } = req.body; 
//     try {
//         const data = await leaveFromGroupModel(groupId, userId);
//         res.status(200).send(data);
//     } catch (error) {
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };
// app.put("/leaveFromGroup", leaveFromGroup);
