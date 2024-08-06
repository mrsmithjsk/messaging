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

