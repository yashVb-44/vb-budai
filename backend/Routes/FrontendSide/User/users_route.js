const express = require('express')
const route = express.Router()
const User = require('../../../Models/FrontendSide/user_model')
const multer = require('multer')
const jwt = require('jsonwebtoken');
const authMiddleWare = require('../../../Middleware/authMiddleWares')
const fs = require('fs');
const path = require('path')
const Coupon = require('../../../Models/FrontendSide/coupon_model')
const Charges = require('../../../Models/Settings/add_charges_model')
const checkAdminRole = require('../../../Middleware/adminMiddleWares');
const { checkAdminWithMultRole354 } = require('../../../Middleware/checkAdminWithMultRole')


// Secret key for JWT
const secretKey = process.env.JWT_TOKEN;

// Set up multer middleware to handle file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './imageUploads/frontend/users')
    },
    filename: function (req, file, cb) {
        cb(null, file?.originalname)
    }
})
const upload = multer({ storage: storage })

// Endpoint to generate and send OTP
route.post('/send-otp', async (req, res) => {
    let { mobileNumber } = req.body;

    mobileNumber = Number(mobileNumber)

    try {
        // Generate a random 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        if (mobileNumber === undefined) {
            return res.json({ success: false, message: "please provide valid Mobile Number" });
        }
        else {
            const existingMobileNumber = await User.findOne({ User_Mobile_No: mobileNumber })
            if (existingMobileNumber?.Block) {
                return res.status(200).json({ type: "error", message: "Your Are Blocked by Admin" })
            }
            else if (existingMobileNumber) {
                await User.findOneAndUpdate({ User_Otp: 1234 })
                res.status(200).json({ type: "success", message: "Otp Generate Successfully!" })
            }
            else if (!existingMobileNumber) {
                const newuser = await new User(
                    {
                        User_Mobile_No: mobileNumber,
                        User_Otp: 1234,
                    }
                )
                await newuser.save()
                res.status(200).json({ type: "success", message: "Otp Generate Successfully!" })
            }
        }
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!" })
    }
});

// Endpoint to verify the OTP
route.post('/verify-otp', async (req, res) => {
    let { mobileNumber, otp } = req.body;

    mobileNumber = Number(mobileNumber)
    otp = Number(otp)

    try {
        // Find the user in the database
        const user = await User.findOne({ User_Mobile_No: mobileNumber });

        if (!user) {
            return res.status(404).json({ type: "error", error: 'User not found' });
        }

        if (user.User_Otp === otp) {
            // OTP verification successfuls
            const tokenPayload = { userId: user._id, User_Mobile_No: user.mobileNumber };
            const token = jwt.sign(tokenPayload, secretKey, { expiresIn: `365d` });

            user.Is_Verify = true;
            await user.save();

            return res.status(200).json({ type: "success", message: "Login Successfully!", token: token, userId: user._id, userName: user.User_Name || "" })
        } else {
            // OTP verification failed
            return res.status(201).json({ type: "error", message: "Invalid Otp!", token: "", userId: "" })
        }
    } catch (error) {
        res.status(500).json({ type: "error", message: 'Internal server error' });
    }
});

// get all the User
route.get('/get', checkAdminWithMultRole354, async (req, res) => {
    try {
        const Users = await User.find().sort({ createdAt: -1 });

        const populatedusers = Users.map(user => {
            let User_Type = '';
            if (user?.User_Type === "0") {
                User_Type = 'User';
            } else if (user?.User_Type === "1") {
                User_Type = 'Gold';
            } else if (user?.User_Type === "2") {
                User_Type = 'Silver';
            } else {
                User_Type = 'PPO';
            }

            return {
                ...user.toObject(),
                User_Type: User_Type
            };
        });

        res.status(200).json({ type: "success", message: " User found successfully!", user: populatedusers })
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
});

// get all the user for dropdown
route.get('/get/alluser', checkAdminWithMultRole354, async (req, res) => {
    try {
        const user = await User.find({ User_Type: "0" }).sort({ createdAt: -1 });
        res.status(200).json({ type: "success", message: " User found successfully!", user: user })
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
});

// get all the reseller for dropdown
route.get('/get/allreseller', checkAdminWithMultRole354, async (req, res) => {
    try {
        const user = await User.find({ User_Type: { $ne: "0" } }).sort({ createdAt: -1 });
        res.status(200).json({ type: "success", message: " User found successfully!", user: user })
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
});

// get the user profile 
route.get('/profile/get', authMiddleWare, async (req, res) => {
    try {
        const userId = req?.user?.userId
        const user = await User.findById(userId);

        if (!user) {
            res.status(200).json({ type: "error", message: " User not found!", user: [] })
        }
        else {
            const result = {
                _id: user?._id,
                User_Name: user?.User_Name || "",
                User_Image: `http://${process.env.IP_ADDRESS}/${user.User_Image?.path?.replace(/\\/g, '/')}` || "",
                User_Email: user?.User_Email || "",
                User_Mobile_No: user?.User_Mobile_No || "",
                Wallet: user?.Wallet,
                Coins: user?.Coins,
                User_Type: user?.User_Type || "",
                Block: user?.Block
            };
            res.status(200).json({ type: "success", message: "User found successfully!", user: result || [] })
        }

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
});

// get user by token
route.get('/get', authMiddleWare, async (req, res) => {
    try {
        // Access the currently logged-in user details from req.user
        const userId = req?.user?.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(200).json({ type: "error", message: 'User not found' });
        }

        res.status(200).json({ type: "success", user });
    } catch (error) {
        res.status(500).json({ type: "error", message: 'Internal server error' });
        console.log(error);
    }
});

// Update User Profile
route.patch('/profile/update', authMiddleWare, upload.single('image'), async (req, res) => {
    const userId = req.user.userId;
    const { name, email, mobileNumber } = req.body;
    const originalname = req.file?.originalname;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ type: "error", message: "User does not exist!" });
        }

        if (mobileNumber && mobileNumber != user.User_Mobile_No) {
            const existingUserWithMobile = await User.findOne({ User_Mobile_No: mobileNumber });
            if (existingUserWithMobile) {
                return res.status(200).json({ type: "error", message: "User Mobile Number already exists!" });
            }
        }

        user.User_Name = name || user.User_Name;
        user.User_Email = email || user.User_Email;
        user.User_Mobile_No = mobileNumber || user.User_Mobile_No;

        if (req.file) {
            const extension = path.extname(originalname);
            const imageFilename = `${user.User_Name}${user._id}${extension}`;
            const imagePath = `imageUploads/frontend/users/${imageFilename}`;

            fs.renameSync(req?.file?.path, imagePath);

            user.User_Image.filename = imageFilename;
            user.User_Image.path = imagePath;
            user.User_Image.originalname = originalname;
        }

        await user.save();
        res.status(200).json({ type: "success", message: "User updated successfully!" });
    } catch (error) {
        if (req?.file) {
            fs.unlinkSync(req?.file?.path);
        }
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error });
        console.log(error);
    }
});

//  function for generate coupon code 
async function generateCouponCode(userName, userId) {
    const randomNumber = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

    const timestamp = Date.now();

    const combinedString = userName + userId + randomNumber + timestamp;

    let hashCode = 0;
    for (let i = 0; i < combinedString.length; i++) {
        const char = combinedString.charCodeAt(i);
        hashCode = (hashCode << 5) - hashCode + char;
    }

    hashCode = Math.abs(hashCode);
    const couponCode = hashCode.toString().slice(-6);
    const newUserName = userName.slice(0, 4)

    return `${newUserName}${couponCode}`;
}

// Update User Profile and generate coupon
route.patch('/profile/update/generate/coupon', authMiddleWare, upload.single('image'), async (req, res) => {
    const userId = req.user.userId;
    const { name, email, mobileNumber } = req.body;
    const originalname = req.file?.originalname;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ type: "error", message: "User does not exist!" });
        }

        if (mobileNumber && mobileNumber != user.User_Mobile_No) {
            const existingUserWithMobile = await User.findOne({ User_Mobile_No: mobileNumber });
            if (existingUserWithMobile) {
                return res.status(200).json({ type: "error", message: "User Mobile Number already exists!" });
            }
        }

        user.User_Name = name || user.User_Name;
        user.User_Email = email || user.User_Email;
        user.User_Mobile_No = mobileNumber || user.User_Mobile_No;

        if (req.file) {
            const extension = path.extname(originalname);
            const imageFilename = `${user.User_Name}${user._id}${extension}`;
            const imagePath = `imageUploads/frontend/users/${imageFilename}`;

            fs.renameSync(req?.file?.path, imagePath);

            user.User_Image.filename = imageFilename;
            user.User_Image.path = imagePath;
            user.User_Image.originalname = originalname;
        }

        await user.save();

        // Generate and assign a coupon to the user
        const couponCode = await generateCouponCode(user.User_Name, user._id)

        const charges = await Charges.findOne()
        let coinsReward = charges?.coins_reward_user

        let usageLimits = charges?.usage_limit_user
        const discountAmount = charges?.Normal_Coup_Disc


        // const discountAmount = 200;
        // const coinsReward = 200;
        const limit = usageLimits
        const newCoupon = await new Coupon({
            couponCode,
            type: '0', // auto generated
            discountAmount,
            coinsReward,
            creationDate: new Date(),
            expiryDate: new Date(new Date().getFullYear() + 5, new Date().getMonth(), new Date().getDate()), // Set expiry to 5 years later
            usageLimits: limit,
            createdBy: {
                type: '0', // user
                id: user._id
            },
        });

        await newCoupon.save();
        console.log(newCoupon, "new")

        res.status(200).json({ type: "success", message: "User updated successfully!", couponCode });
    } catch (error) {
        if (req?.file) {
            fs.unlinkSync(req?.file?.path);
        }
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error });
        console.log(error);
    }
});


// update user status (block or unblock)
route.patch("/update/status/:id", checkAdminWithMultRole354, async (req, res) => {

    const UserId = await req.params.id

    try {
        const { Block } = req.body
        const newUser = await User.findByIdAndUpdate(UserId)
        newUser.Block = await Block

        await newUser.save()
        res.status(200).json({ type: "success", message: "User Status update successfully!" })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }

})

// update user from admin
route.patch("/update/byAdmin/:id", async (req, res) => {

    const UserId = await req.params.id

    try {
        const { wallet, coins, type } = req.body
        const newUser = await User.findByIdAndUpdate(UserId)
        newUser.Wallet = await wallet
        newUser.Coins = await coins
        newUser.User_Type = await type
        await newUser.save()
        res.status(200).json({ type: "success", message: "User Status update successfully!" })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }

})

// delete all user
route.delete('/delete', checkAdminWithMultRole354, async (req, res) => {

    try {

        const users = await User.find();

        for (const user of users) {
            if (user.User_Image && fs.existsSync(user?.User_Image?.path)) {
                fs.unlinkSync(user?.User_Image?.path);
            }
        }

        await User.deleteMany()
        res.status(200).json({ type: "error", message: "All Users deleted Successfully!" })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
})

// Delete many users
route.delete('/deletes', checkAdminWithMultRole354, async (req, res) => {
    try {
        const { ids } = req.body;
        const users = await User.find({ _id: { $in: ids } });

        for (const user of users) {
            if (user.User_Image && fs.existsSync(user?.User_Image?.path)) {
                fs.unlinkSync(user?.User_Image?.path);
            }
        }

        await User.deleteMany({ _id: { $in: ids } });
        res.status(200).json({ type: "success", message: "All Users deleted successfully!" });
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error });
    }
});

// Delete User by ID
route.delete('/delete/:id', checkAdminWithMultRole354, async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ type: "error", message: "User not found!" });
        } else {
            if (user.User_Image && fs.existsSync(user?.User_Image?.path)) {
                fs.unlinkSync(user?.User_Image?.path);
            }

            await User.findByIdAndDelete(userId);
            res.status(200).json({ type: "success", message: "User deleted successfully!" });
        }
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error });
    }
});


module.exports = route