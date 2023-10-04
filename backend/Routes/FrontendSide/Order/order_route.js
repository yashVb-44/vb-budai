const express = require('express')
const route = express.Router()
const Order = require('../../../Models/FrontendSide/order_model')
const Cart = require('../../../Models/FrontendSide/cart_model')
const { Variation } = require('../../../Models/BackendSide/product_model')
const Wallet = require('../../../Models/FrontendSide/wallet_model')
const User = require('../../../Models/FrontendSide/user_model')
const Coupons = require('../../../Models/FrontendSide/coupon_model')
const Review = require('../../../Models/FrontendSide/review_model')
const Coins = require('../../../Models/FrontendSide/coins_model')

const authMiddleware = require('../../../Middleware/authMiddleWares')
const checkAdminOrRole2 = require('../../../Middleware/checkAdminOrRole2')


async function generateUniqueKey() {

    const randomNum = Math.floor(Math.random() * 1000000);

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomAlphabet = alphabet[Math.floor(Math.random() * alphabet.length)];

    const paddedRandomNum = String(randomNum).padStart(6, '0');
    const uniqueOrderId = `SL-${randomAlphabet}${paddedRandomNum}`;

    return uniqueOrderId;
}

// function for get cart data for user
async function getCartData(userId) {
    const cartData = await Cart.find({ userId })
    if (cartData) {
        return cartData
    }
    else {
        return []
    }
}

// function for add wallet history
async function addWalletHistory(userId, orderId, FinalPrice) {
    const wallet = await new Wallet({
        Amount: FinalPrice || 0,
        userId: userId,
        paymentId: orderId || "",
        Trans_Type: "Debit",
        Description: `You have used Rs.${FinalPrice} from your wallet for Order ID ${orderId}.`,
        Type: "3"
    })

    await wallet.save()
}

// function for reducing stock
async function reduceStock(variationId, Sizename, Quantity) {
    try {
        const variation = await Variation.findById(variationId);

        if (!variation) {
            throw new Error("Variation not found");
        }

        const newSizeStock = variation.Variation_Size.map(size => {
            if (size.Size_Name === Sizename) {
                const newStock = size.Size_Stock - Quantity;
                return { ...size, Size_Stock: newStock };
            }
            return size;
        });

        variation.Variation_Size = newSizeStock;

        await variation.save();

    } catch (error) {
        console.error("Error reducing stock:", error.message);
    }
}

// function for add coins history (and also add coins to the user)
// async function addCoins(orderId, Quantity, Coupon, userId) {
//     let amount = 200
//     const Coins = await new Coins({
//         Amount: amount * Quantity,
//         userId,
//         Trans_Type: "Credit",
//         Description: desc || "",
//         Type: "0",
//         Coupon
//     })
// }

// add order in history
// route.post("/add", authMiddleware, async (req, res) => {
//     // 0 = wallet
//     // 1 = online,
//     // 2 = cod
//     try {

//         let { Coupon, CouponPrice, PaymentType, FinalPrice, OriginalPrice, DiscountPrice, Address, Shipping_Charge, PaymentId } = req.body
//         const userId = req.user.userId;
//         const orderId = await generateUniqueKey()

//         let CartData = await getCartData(userId)
//         let newOrder

//         if (Coupon == "0") {
//             newOrder = new Order({
//                 orderId,
//                 userId,
//                 PaymentType,
//                 PaymentId: PaymentId || "0",
//                 CouponPrice,
//                 DiscountPrice,
//                 FinalPrice,
//                 OriginalPrice,
//                 Address,
//                 cartData: CartData,
//                 Shipping_Charge
//             });
//         }
//         else {
//             newOrder = new Order({
//                 orderId,
//                 userId,
//                 Coupon: Coupon,
//                 PaymentType,
//                 PaymentId: PaymentId || "0",
//                 CouponPrice,
//                 DiscountPrice,
//                 FinalPrice,
//                 OriginalPrice,
//                 Address,
//                 cartData: CartData,
//                 Shipping_Charge
//             });
//         }

//         FinalPrice = Number(FinalPrice)

//         if (PaymentType == "0") {
//             const existUser = await User.findByIdAndUpdate({ _id: userId })
//             existUser.Wallet = existUser?.Wallet - FinalPrice
//             existUser.save()

//             addWalletHistory(userId, orderId, FinalPrice)
//         }

//         await newOrder.save();
//         await CartData?.forEach(data => {
//             reduceStock(data?.variation, data?.SizeName, data?.Quantity)
//         })

//         CartData = [];
//         await Cart.deleteMany({ userId: userId });

//         res.status(200).json({ type: "success", message: "Order successfully!" })    

//     } catch (error) {
//         res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
//         console.log(error)
//     }
// })

// Add Order Route with Coupon and Coupon Usage
route.post("/add", authMiddleware, async (req, res) => {
    // 0 = wallet, 1 = online, 2 = cod
    try {
        let { Coupon, CouponPrice, PaymentType, FinalPrice, OriginalPrice, DiscountPrice, Address, Shipping_Charge, PaymentId, Quantity, reason } = req.body;
        const userId = req.user.userId;
        const orderId = await generateUniqueKey();
        CouponPrice = Number(CouponPrice)
        FinalPrice = Number(FinalPrice)
        OriginalPrice = Number(OriginalPrice)
        DiscountPrice = Number(DiscountPrice)
        Shipping_Charge = Number(Shipping_Charge)


        if (Coupon === "") {
            Coupon = "not"
        }

        let CartData = await getCartData(userId);
        let newOrder;

        // Initialize coupon related variables

        let appliedCoupon = null;
        let updatedCouponUsage = false;


        // Check if a valid coupon is provided
        if (Coupon !== "not") {
            // Find the coupon
            const coupon = await Coupons.findOne({ _id: Coupon });

            // Find user's coupon usage entry
            const userCouponUsage = coupon.UserCouponUsage.find(usage => usage.userId.equals(userId));

            if (userCouponUsage) {
                // If user already used the coupon
                if (userCouponUsage.usageCount >= coupon.usageLimits) {
                    return res.status(200).json({ type: "error", message: "Coupon usage limit exceeded." });
                }

                // Update coupon usage count
                userCouponUsage.usageCount += 1;
                updatedCouponUsage = true;
            } else {
                // If user is using the coupon for the first time
                coupon.UserCouponUsage.push({ userId, usageCount: 1 });
                updatedCouponUsage = true;
            }

            // Apply coupon discount
            // CouponPrice = coupon.discountAmount;
            appliedCoupon = coupon;
        }
        // Calculate final prices
        // FinalPrice = DiscountPrice + Shipping_Charge - CouponPrice;

        // Create the new order
        if (Coupon === "" || Coupon == "not" || Coupon === undefined) {
            newOrder = new Order({
                orderId,
                userId,
                PaymentType,
                PaymentId: PaymentId || "0",
                CouponPrice,
                DiscountPrice,
                FinalPrice,
                OriginalPrice,
                Address,
                cartData: CartData,
                Shipping_Charge,
                reason: reason || "",
            });
        }
        else if (!Coupon == "" || !Coupon == "not") {
            newOrder = new Order({
                orderId,
                userId,
                Coupon: Coupon,
                PaymentType,
                PaymentId: PaymentId || "0",
                CouponPrice,
                DiscountPrice,
                FinalPrice,
                OriginalPrice,
                Address,
                cartData: CartData,
                Shipping_Charge,
                reason: reason || "",
            });
        }

        // Update wallet and wallet history if payment type is wallet
        if (PaymentType === "0") {
            const existUser = await User.findByIdAndUpdate({ _id: userId });
            existUser.Wallet -= FinalPrice;
            existUser.save();
            addWalletHistory(userId, orderId, FinalPrice);
        }

        // Save the new order and update stock
        await newOrder.save();
        await CartData?.forEach(data => {
            reduceStock(data?.variation, data?.SizeName, data?.Quantity);
        });

        // Update coupon usage count in the database if necessary
        if (updatedCouponUsage) {
            await appliedCoupon.save();
            // await addCoins(newOrder?._id, Quantity, Coupon, userId)
        }

        CartData = [];
        await Cart.deleteMany({ userId });

        res.status(200).json({ type: "success", message: "Order successfully!" });

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error });
        console.log(error);
    }
});

// get all upcomin orders for particular user 
route.get('/get/upcoming', authMiddleware, async (req, res) => {

    // upcoming = 1,2,3

    try {
        const userId = req.user.userId;
        let OrderList = await Order.find({ userId: userId, OrderType: { $in: [1, 2, 3] } }).populate({
            path: 'cartData.product',
            model: 'Products',
            select: 'Product_Name'
        }).populate({
            path: 'Address',
            model: 'Address'
        }).populate({
            path: 'cartData.variation',
            model: 'Variations',
            select: 'Variation_Images'
        }).sort({ createdAt: -1 })

        if (OrderList.length >= 1) {
            OrderList = OrderList?.map(order => ({
                _id: order?._id,
                orderId: order?.orderId,
                userId: order?.userId,
                Coupon: order?.Coupon || "",
                PaymentType: order?.PaymentType,
                PaymentId: order?.PaymentId || "",
                OrderType: order?.OrderType,
                CouponPrice: order?.CouponPrice,
                DiscountPrice: order?.DiscountPrice,
                FinalPrice: order?.FinalPrice,
                OriginalPrice: order?.OriginalPrice,
                Address: order?.Address || {},
                reason: order?.reason || "",
                cartData: order?.cartData.map(cartItem => ({
                    ...cartItem,
                    variationImage: `http://${process.env.IP_ADDRESS}/${cartItem?.variation?.Variation_Images[0]?.path?.replace(/\\/g, '/')}`
                })),
                Shipping_Charge: order?.Shipping_Charge,
                Status: order?.Status,
                createdAt: order?.createdAt?.toISOString()?.substring(0, 10)
            }))

        }

        res.status(200).json({ type: "success", message: "All Upcoming Order get Successfully!", orderList: OrderList || [] })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
        console.log(error)
    }

})

// get all history orders for particular user 
route.get('/get/history', authMiddleware, async (req, res) => {

    // history = 4,5,6,7
    const getOrderRatingStatus = async (orderId) => {
        const reviewsForOrder = await Review.find({ order: orderId });
        return reviewsForOrder.length > 0;
    };

    try {
        const userId = req.user.userId;
        let OrderList = await Order.find({ userId: userId, OrderType: { $in: [4, 5, 6, 7] } }).populate({
            path: 'cartData.product',
            model: 'Products',
            select: 'Product_Name'
        }).populate({
            path: 'Address',
            model: 'Address'
        }).populate({
            path: 'cartData.variation',
            model: 'Variations',
            select: 'Variation_Images'
        })
            .sort({ updatedAt: -1 })

        if (OrderList.length >= 1) {
            OrderList = OrderList?.map(async order => ({
                _id: order?._id,
                orderId: order?.orderId,
                userId: order?.userId,
                Coupon: order?.Coupon || "",
                PaymentType: order?.PaymentType,
                PaymentId: order?.PaymentId || "",
                OrderType: order?.OrderType,
                CouponPrice: order?.CouponPrice,
                DiscountPrice: order?.DiscountPrice,
                FinalPrice: order?.FinalPrice,
                OriginalPrice: order?.OriginalPrice,
                reason: order?.reason || "",
                Address: order?.Address || {},
                cartData: order?.cartData.map(cartItem => ({
                    ...cartItem,
                    variationImage: `http://${process.env.IP_ADDRESS}/${cartItem?.variation?.Variation_Images[0]?.path?.replace(/\\/g, '/')}`
                })),
                Shipping_Charge: order?.Shipping_Charge,
                Status: order?.Status,
                createdAt: order?.createdAt?.toISOString()?.substring(0, 10),
                checkRating: await getOrderRatingStatus(order?._id)
            }))

            OrderList = await Promise.all(OrderList);
        }

        res.status(200).json({ type: "success", message: "All Order get Successfully!", orderList: OrderList || [] })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
        console.log(error)
    }

})

// get orders by id
route.get('/get/singleOrder/:id', authMiddleware, async (req, res) => {

    const id = await req.params.id;

    try {
        let order = await Order.findById(id).populate({
            path: 'cartData.product',
            model: 'Products',
            select: 'Product_Name'
        }).populate({
            path: 'Address',
            model: 'Address'
        }).populate({
            path: 'userId',
            model: 'Users',
            select: 'User_Name'
        }).populate({
            path: 'cartData.variation',
            model: 'Variations',
            select: 'Variation_Images'
        }).populate({
            path: 'Coupon',
            model: 'Coupon',
            select: 'couponCode'
        })

        if (order) {

            order.cartData = order.cartData.map(cartItem => {
                const { Quantity, discountPrice, originalPrice } = cartItem;
                return {
                    ...cartItem,
                    discountPrice: discountPrice * Quantity,
                    originalPrice: originalPrice * Quantity,
                    variationImage: `http://${process.env.IP_ADDRESS}/${cartItem.variation?.Variation_Images[0]?.path?.replace(/\\/g, '/')}`
                };
            });

            order = {
                _id: order?._id,
                orderId: order?.orderId,
                userId: order?.userId,
                Coupon: order?.Coupon?.couponCode || "",
                PaymentType: order?.PaymentType,
                PaymentId: order?.PaymentId || "",
                OrderType: order?.OrderType,
                CouponPrice: order?.CouponPrice || 0,
                DiscountPrice: order?.DiscountPrice || 0,
                FinalPrice: order?.FinalPrice || 0,
                OriginalPrice: order?.OriginalPrice || 0,
                reason: order?.reason || "",
                Address: order?.Address || {},
                cartData: order?.cartData || [],
                Shipping_Charge: order?.Shipping_Charge,
                createdAt: order?.createdAt?.toISOString()?.substring(0, 10)
            };
        }


        res.status(200).json({ type: "success", message: "Order get Successfully!", orderList: [order] || [] });
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error });
        console.log(error)
    }
});

// get all orders
route.get('/get/all', checkAdminOrRole2, async (req, res) => {

    try {
        let orders = await Order.find().populate({
            path: 'cartData.product',
            model: 'Products',
            select: 'Product_Name'
        }).populate({
            path: 'userId',
            model: 'Users',
            select: 'User_Name User_Mobile_No'
        }).sort({ createdAt: -1 })


        const modifiedOrders = orders.map(order => {

            let OrderType = '';
            if (order.OrderType === "1") {
                OrderType = 'Pending';
            } else if (order.OrderType === "2") {
                OrderType = 'Accepted';
            } else if (order.OrderType === "3") {
                OrderType = 'Pick Up';
            } else if (order.OrderType === "4") {
                OrderType = 'Rejected';
            } else if (order.OrderType === "5") {
                OrderType = 'Delivered';
            } else if (order.OrderType === "6") {
                OrderType = 'Cancelled';
            } else if (order.OrderType === "7") {
                OrderType = 'Returned';
            }

            let PaymentType = ''
            if (order.PaymentType === "0") {
                PaymentType = 'Wallet';
            } else if (order.PaymentType === "1") {
                PaymentType = 'online';
            } else if (order.PaymentType === "2") {
                PaymentType = 'Cash';
            }

            let PaymentId = ''
            if (order.PaymentId === "0") {
                PaymentId = ""
            } else {
                PaymentId = order.PaymentId
            }

            return {
                ...order.toObject(),
                userId: order.userId?._id,
                User_Name: order.userId?.User_Name,
                User_Mobile_No: order.userId?.User_Mobile_No,
                OrderType: OrderType,
                PaymentType: PaymentType,
                PaymentId: PaymentId,
                Date: new Date(order?.createdAt)?.toLocaleDateString('en-IN'),
                Time: new Date(order?.createdAt)?.toLocaleTimeString('en-IN', { hour12: true }),
            };
        });

        res.status(200).json({ type: "success", message: "All Order get Successfully!", orderList: modifiedOrders || [] })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
        console.log(error)
    }

})

// get single order by orderId
route.get('/get/single/:orderId', checkAdminOrRole2, async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Order.findById(orderId)
            .populate({
                path: 'cartData.product',
                model: 'Products',
                select: 'Product_Name SKU_Code'
            })
            .populate({
                path: 'Coupon',
                model: 'Coupon',
                // select: 'Product_Name SKU_Code'
            })
            .populate({
                path: 'Address',
                model: 'Address',
                // select: 'User_Name User_Mobile_No'
            })
            .populate({
                path: 'cartData.variation',
                model: 'Variations',
                // select: 'User_Name User_Mobile_No'
            })
            .populate({
                path: 'userId',
                model: 'Users',
                select: 'User_Name User_Mobile_No User_Email'
            });

        if (!order) {
            return res.status(404).json({ type: 'error', message: 'Order not found' });
        }

        const OrderTypeMap = {
            "1": 'Pending',
            "2": 'Accepted',
            "3": 'Pick Up',
            "4": 'Rejected',
            "5": 'Delivered',
            "6": 'Cancelled',
            "7": 'Returned'
        };

        const PaymentTypeMap = {
            "0": 'Wallet',
            "1": 'Online',
            "2": 'Cash'
        };

        // const variationFirstImageUrl = order.cartData.map(cartItem => (
        //     cartItem?.variation?.Variation_Images[0]?.path
        //         ? `http://${process.env.IP_ADDRESS}/${cartItem?.variation?.Variation_Images[0]?.path.replace(/\\/g, '/')}`
        //         : ''
        // ))[0];

        const modifiedOrder = {
            ...order.toObject(),
            userId: order.userId?._id,
            User_Name: order.userId?.User_Name,
            User_Mobile_No: order.userId?.User_Mobile_No,
            User_Email: order.userId?.User_Email,
            OrderType: OrderTypeMap[order.OrderType] || '',
            PaymentType: PaymentTypeMap[order.PaymentType] || '',
            cartData: order.cartData.map(cartItem => ({
                ...cartItem,
                variationImage: cartItem?.variation?.Variation_Images[0]?.path
                    ? `http://${process.env.IP_ADDRESS}/${cartItem?.variation?.Variation_Images[0]?.path.replace(/\\/g, '/')}`
                    : ''
            }))
        };

        res.status(200).json({ type: 'success', message: 'Order retrieved successfully', order: modifiedOrder || {} });
    } catch (error) {
        res.status(500).json({ type: 'error', message: 'Server Error!', errorMessage: error });
        console.log(error);
    }
});

// delete order by id
route.delete('/delete/:id', checkAdminOrRole2, async (req, res) => {
    const orderId = await req.params.id
    try {
        const result = await Order.findByIdAndDelete(orderId)
        if (!result) {
            res.status(404).json({ type: "error", message: "Order not found!" })
        }
        res.status(200).json({ type: "error", message: "Order deleted Successfully!" })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
})

// delete many order
route.delete('/deletes', checkAdminOrRole2, async (req, res) => {
    try {
        const { ids } = req.body;
        await Order.deleteMany({ _id: { $in: ids } });
        res.status(200).json({ type: "success", message: "All Order deleted Successfully!" })
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
});

// delete or remove all order
route.delete('/delete', checkAdminOrRole2, async (req, res) => {

    try {
        await Order.deleteMany()
        res.status(200).json({ type: "success", message: "All Order deleted Successfully!" })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
})

// coins reward
const processOrderResponse = async (orderId, UserName) => {
    try {
        const order = await Order.findById(orderId)
            .populate('cartData.product', 'Product_Name')
            .populate('userId', 'User_Name User_Mobile_No')
            .populate('Coupon')


        if (order.Coupon && order.Coupon.createdBy) {
            const userId = order.Coupon.createdBy?.id ? order.Coupon.createdBy?.id : null;
            const coinsReward = order.Coupon.coinsReward;
            const couponCode = order.Coupon.couponCode;
            const orderId = order._id;
            const showOrderId = order.orderId;
            const user = await User.findById(userId);
            const userName = UserName


            // Calculate the amount based on coinsReward and cartData
            const amount = coinsReward * order.cartData.reduce((total, item) => total + (item.Quantity || 0), 0);

            // Check if the user already has a coins record for the same coupon and order
            const existingCoinsRecord = await Coins.findOne({
                userId: userId,
                Coupon: couponCode,
                orderId: orderId,
            });

            if (!existingCoinsRecord) {
                // Create a new Coins record
                const newCoinsRecord = new Coins({
                    userId: userId,
                    Amount: amount,
                    Description: `Greetings! You earned ${amount} coins on order placed by ${userName} with Order ID ${showOrderId}.`,
                    orderId: orderId,
                    Coupon: couponCode,
                    Type: '0',
                    Trans_Type: 'Credit',
                });
                await newCoinsRecord.save();
                if (user) {
                    user.Coins += amount;
                    await user.save();
                }
            } else {
                console.log(`Coins reward already added for user ${userName} and coupon ${couponCode}`);
            }
        } else {
            console.log('Conditions not met for adding coins reward.');
        }
    } catch (error) {
        console.error('Error processing order response:', error);
    }
};

// cancel coins reward 
const processOrderResponseinReturn = async (orderId, UserName) => {
    try {
        const order = await Order.findById(orderId)
            .populate('cartData.product', 'Product_Name')
            .populate('userId', 'User_Name User_Mobile_No')
            .populate('Coupon')


        if (order.Coupon && order.Coupon.createdBy) {
            const userId = order.Coupon.createdBy?.id ? order.Coupon.createdBy?.id : null;
            const coinsReward = order.Coupon.coinsReward;
            const couponCode = order.Coupon.couponCode;
            const orderId = order._id;
            const showOrderId = order.orderId;
            const user = await User.findById(userId);
            const userName = UserName


            // Calculate the amount based on coinsReward and cartData
            const amount = coinsReward * order.cartData.reduce((total, item) => total + (item.Quantity || 0), 0);

            // Check if the user already has a coins record for the same coupon and order
            // const existingCoinsRecord = await Coins.findOne({
            //     userId: userId,
            //     Coupon: couponCode,
            //     orderId: orderId,
            // });

            // Create a new Coins record
            const newCoinsRecord = new Coins({
                userId: userId,
                Amount: amount,
                // Description: `Sorry! Your ${amount} coins deduct, beacause of ${userName} Cancelled their order , Order ID ${showOrderId}.`,
                Description: `We regret having to deduct the credited ${amount} reward coins owing to the return of an order with Order ID ${showOrderId} placed by ${userName}.`,
                orderId: orderId,
                Coupon: couponCode,
                Type: '0',
                Trans_Type: 'Debit',
            });
            await newCoinsRecord.save();
            if (user) {
                user.Coins -= amount;
                await user.save();
            }
        } else {
            console.log('Conditions not met for adding coins reward.');
        }
    } catch (error) {
        console.error('Error processing order response:', error);
    }
};

// update the orderType by admin
route.patch('/update/type/:id', checkAdminOrRole2, async (req, res) => {

    const id = await req.params.id

    try {
        const { orderType, UserName } = req.body
        if (orderType !== undefined) {
            let newType = await Order.findByIdAndUpdate(id)
            let oldOrder = await Order.findById(id)
            newType.OrderType = await orderType

            if (orderType === "2" && oldOrder?.processed === false) {
                await processOrderResponse(id, UserName)
                oldOrder.processed = true;
                await oldOrder.save();
            }

            if (orderType === "7") {
                await processOrderResponseinReturn(id, UserName)
            }

            // const ordersToProcess = await Order.find({
            //     OrderType: '2',
            //     processed: false,
            // });

            await newType.save()
            res.status(200).json({ type: "success", message: "OrderType update Successfully!" })
        }
        else {
            res.status(200).json({ type: "success", message: "OrderType update Successfully!" })
        }

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
        console.log(error)
    }
})


// update status by user
route.patch('/update/singleOrder/type/:id', authMiddleware, async (req, res) => {

    const id = await req.params.id;

    try {
        const { orderType, reason } = req.body
        if (orderType !== undefined) {
            let newType = await Order.findByIdAndUpdate(id)
            newType.OrderType = await orderType
            newType.reason = await reason

            await newType.save()
            res.status(200).json({ type: "success", message: "Order Cancelled Successfully!" })
        }
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
        console.log(error)
    }

})

// Define the route to get orders between two dates
route.get('/get/all/betweendates', authMiddleware, async (req, res) => {
    const userId = req.user.userId;

    const getOrderRatingStatus = async (orderId) => {
        const reviewsForOrder = await Review.find({ order: orderId });
        return reviewsForOrder.length > 0;
    };

    try {
        const { startDate, endDate } = req.query;

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);

        // Query the database for orders between the provided start and end dates
        let ordersBetweenDates
        if (startDate === "") {
            ordersBetweenDates = await Order.find({
                userId: userId,
            }).populate({
                path: 'cartData.product',
                model: 'Products',
                select: 'Product_Name'
            }).populate({
                path: 'Address',
                model: 'Address'
            }).populate({
                path: 'cartData.variation',
                model: 'Variations',
                select: 'Variation_Images'
            })
                .sort({ updatedAt: -1 })
        }
        else {
            endDateObj.setHours(23, 59, 59, 999);

            ordersBetweenDates = await Order.find({
                userId: userId,
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).populate({
                path: 'cartData.product',
                model: 'Products',
                select: 'Product_Name'
            }).populate({
                path: 'Address',
                model: 'Address'
            }).populate({
                path: 'cartData.variation',
                model: 'Variations',
                select: 'Variation_Images'
            })
                .sort({ updatedAt: -1 })
        }

        if (ordersBetweenDates.length <= 0) {
            return res.status(200).json({
                type: 'success',
                message: 'Orders between the specified dates not found!',
                orderList: [],
            });
        }

        if (ordersBetweenDates.length >= 1) {
            ordersBetweenDates = ordersBetweenDates?.map(async order => ({
                _id: order?._id,
                orderId: order?.orderId,
                userId: order?.userId,
                Coupon: order?.Coupon || "",
                PaymentType: order?.PaymentType,
                PaymentId: order?.PaymentId || "",
                OrderType: order?.OrderType,
                CouponPrice: order?.CouponPrice,
                DiscountPrice: order?.DiscountPrice,
                FinalPrice: order?.FinalPrice,
                OriginalPrice: order?.OriginalPrice,
                reason: order?.reason || "",
                Address: order?.Address || {},
                cartData: order?.cartData.map(cartItem => ({
                    ...cartItem,
                    variationImage: `http://${process.env.IP_ADDRESS}/${cartItem?.variation?.Variation_Images[0]?.path?.replace(/\\/g, '/')}`
                })),
                Shipping_Charge: order?.Shipping_Charge,
                Status: order?.Status,
                createdAt: order?.createdAt?.toISOString()?.substring(0, 10),
                checkRating: await getOrderRatingStatus(order?._id)
            }))

            ordersBetweenDates = await Promise.all(ordersBetweenDates);
        }

        res.status(200).json({
            type: 'success',
            message: 'Orders between the specified dates retrieved successfully!',
            orderList: ordersBetweenDates || [],
        });

    } catch (error) {
        res.status(500).json({
            type: 'error',
            message: 'Server Error!',
            errorMessage: error.message,
        });
        console.error(error);
    }
});

//  total of orders for reseller
route.get('/get/byStatus', authMiddleware, async (req, res) => {
    const userId = req.user.userId;

    try {
        // Fetch the user's isReseller status
        // const user = await User.findById(userId);
        const { startDate, endDate } = req.query;
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);

        let deliveredOrders
        let pendingOrders
        let acceptedOrders
        let pickupOrders
        let rejectedOrders
        let returnedOrders
        let cancelledOrders

        if (startDate === "") {
            deliveredOrders = await Order.find({
                userId: userId,
                OrderType: '5',
            }).sort({ updatedAt: -1 });

            pendingOrders = await Order.find({
                userId: userId,
                OrderType: '1',
            }).sort({ updatedAt: -1 });

            acceptedOrders = await Order.find({
                userId: userId,
                OrderType: '2',
            }).sort({ updatedAt: -1 });

            pickupOrders = await Order.find({
                userId: userId,
                OrderType: '3',
            }).sort({ updatedAt: -1 });

            rejectedOrders = await Order.find({
                userId: userId,
                OrderType: '4',
            }).sort({ updatedAt: -1 });

            cancelledOrders = await Order.find({
                userId: userId,
                OrderType: '6',
            }).sort({ updatedAt: -1 });

            returnedOrders = await Order.find({
                userId: userId,
                OrderType: '7',
            }).sort({ updatedAt: -1 });
        }
        else {
            deliveredOrders = await Order.find({
                userId: userId,
                OrderType: '5',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            pendingOrders = await Order.find({
                userId: userId,
                OrderType: '1',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            acceptedOrders = await Order.find({
                userId: userId,
                OrderType: '2',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            pickupOrders = await Order.find({
                userId: userId,
                OrderType: '3',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            rejectedOrders = await Order.find({
                userId: userId,
                OrderType: '4',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            cancelledOrders = await Order.find({
                userId: userId,
                OrderType: '6',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            returnedOrders = await Order.find({
                userId: userId,
                OrderType: '7',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

        }


        const totalDeliveredAmount = deliveredOrders.reduce(
            (total, order) => total + order.FinalPrice,
            0
        );

        res.status(200).json({
            type: 'success',
            message: 'Orders retrieved successfully!',
            acceptedOrders: acceptedOrders?.length || 0,
            pickupOrders: pickupOrders?.length || 0,
            cancelledOrders: cancelledOrders?.length || 0,
            deliveredOrders: deliveredOrders?.length || 0,
            rejectedOrders: rejectedOrders?.length || 0,
            returnedOrders: returnedOrders?.length || 0,
            pendingOrders: pendingOrders?.length || 0,
            totalDeliveredAmount: totalDeliveredAmount || 0,
        });

    } catch (error) {
        res.status(500).json({
            type: 'error',
            message: 'Server Error!',
            errorMessage: error.message,
        });
        console.error(error);
    }
});

//  total of orders for admin
route.post('/get/byStatus/forAdmin', checkAdminOrRole2, async (req, res) => {

    try {
        const { startDate, endDate } = req.body;
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        let deliveredOrders
        let pendingOrders
        let acceptedOrders
        let pickupOrders
        let rejectedOrders
        let returnedOrders
        let cancelledOrders
        let totalOrders

        if (startDate === "" || endDate === "") {
            totalOrders = await Order.find().sort({ updatedAt: -1 });

            deliveredOrders = await Order.find({
                OrderType: '5',
            }).sort({ updatedAt: -1 });

            pendingOrders = await Order.find({
                OrderType: '1',
            }).sort({ updatedAt: -1 });

            acceptedOrders = await Order.find({
                OrderType: '2',
            }).sort({ updatedAt: -1 });

            pickupOrders = await Order.find({
                OrderType: '3',
            }).sort({ updatedAt: -1 });

            rejectedOrders = await Order.find({
                OrderType: '4',
            }).sort({ updatedAt: -1 });

            cancelledOrders = await Order.find({
                OrderType: '6',
            }).sort({ updatedAt: -1 });

            returnedOrders = await Order.find({
                OrderType: '7',
            }).sort({ updatedAt: -1 });
        }
        else if (startDate !== "" && endDate !== "") {

            totalOrders = await Order.find({
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            deliveredOrders = await Order.find({
                OrderType: '5',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            pendingOrders = await Order.find({
                OrderType: '1',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            acceptedOrders = await Order.find({
                OrderType: '2',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            pickupOrders = await Order.find({
                OrderType: '3',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            rejectedOrders = await Order.find({
                OrderType: '4',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            cancelledOrders = await Order.find({
                OrderType: '6',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

            returnedOrders = await Order.find({
                OrderType: '7',
                createdAt: { $gte: startDateObj, $lte: endDateObj },
            }).sort({ updatedAt: -1 });

        }

        const totalDeliveredAmount = deliveredOrders.reduce(
            (total, order) => total + order.FinalPrice,
            0
        );

        const totalOrderAmount = totalOrders.reduce(
            (total, order) => total + order.FinalPrice,
            0
        );

        res.status(200).json({
            type: 'success',
            message: 'Orders retrieved successfully!',
            acceptedOrders: acceptedOrders?.length || 0,
            pickupOrders: pickupOrders?.length || 0,
            cancelledOrders: cancelledOrders?.length || 0,
            deliveredOrders: deliveredOrders?.length || 0,
            rejectedOrders: rejectedOrders?.length || 0,
            returnedOrders: returnedOrders?.length || 0,
            pendingOrders: pendingOrders?.length || 0,
            totalOrders: totalOrders?.length || 0,
            totalDeliveredAmount: totalDeliveredAmount || 0,
            totalOrderAmount: totalOrderAmount || 0
        });

    } catch (error) {
        res.status(500).json({
            type: 'error',
            message: 'Server Error!',
            errorMessage: error.message,
        });
        console.error(error);
    }
});



module.exports = route  