const express = require('express')
const route = express.Router()
const Cart = require('../../../Models/FrontendSide/cart_model')
const User = require('../../../Models/FrontendSide/user_model')
const { Product, Variation } = require('../../../Models/BackendSide/product_model');
const Charges = require('../../../Models/Settings/add_charges_model')
const authMiddleware = require('../../../Middleware/authMiddleWares')
const checkAdminRole = require('../../../Middleware/adminMiddleWares')
const { checkAdminWithMultRole354 } = require('../../../Middleware/checkAdminWithMultRole')
const checkAdminOrRole1 = require('../../../Middleware/checkAdminOrRole1')
const checkAdminOrRole2 = require('../../../Middleware/checkAdminOrRole2')
const checkAdminOrRole3 = require('../../../Middleware/checkAdminOrRole3')
const checkAdminOrRole4 = require('../../../Middleware/checkAdminOrRole4')
const checkAdminOrRole5 = require('../../../Middleware/checkAdminOrRole5')

// get charges from Charges Model
const getShippingCharges = async () => {
    try {
        const charges = await Charges.find();
        const newCharges = charges?.[0]
        return newCharges;
    } catch (error) {
        console.error(error);
        return null;
    }
};

// add cartItems
route.post("/add", authMiddleware, async (req, res) => {

    const userId = req?.user?.userId

    try {

        let { product, Quantity, variation, SizeName } = req.body
        const Products = await Product.findById(product);
        const Variations = await Variation.findById(variation)
        const user = await User.findById(userId)

        Quantity = Number(Quantity)

        if (!Products) {
            return res.status(200).json({
                type: "error",
                message: 'Product not found'
            });
        }

        if (!Variations) {
            return res.status(200).json({
                type: "error",
                message: 'Variation not found'
            });
        }

        let discountPrice = (user?.User_Type === '0'
            ? (Products.Product_Dis_Price)
            : (user?.User_Type === '1' ? Products.Gold_Price :
                (user?.User_Type === '2' ? Products.Silver_Price : Products.PPO_Price)))

        let originalPrice = (user?.User_Type === '0'
            ? (Products.Product_Ori_Price) : (Products.Product_Dis_Price))

        // Check if the product already exists in the cart
        const existingCartItem = await Cart.findOne({ userId, product, variation, SizeName });

        if (existingCartItem) {
            // If the product already exists, update its quantity
            existingCartItem.Quantity = Quantity + existingCartItem.Quantity;
            await existingCartItem.save()
            res.status(200).json({ type: "success", message: "CartItem Quantity add successfully!" })
        } else {
            // If the product doesn't exist, create a new cart item
            const newCartItem = new Cart({ userId, product, variation, SizeName, Quantity, originalPrice, discountPrice });

            await newCartItem.save();
            res.status(200).json({ type: "success", message: "CartItem add successfully!" })
        }
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
        console.log(error)
    }
})

// get all cartItem (second method)
route.get('/cartItems/get', authMiddleware, async (req, res) => {

    try {
        const userId = req.user?.userId;
        const user = await User.findById(userId)
        const cartItems = await Cart.find({ userId }).populate('product').populate({
            path: 'variation',
        })
        if (cartItems?.length <= 0) {
            res.status(200).json({ type: "warning", message: "CartItem Not Found!", cartItems: [] })
        }
        else {
            const result = cartItems.map(cart => ({
                _id: cart?._id,
                userId: cart?.userId || "",
                originalPrice: cart?.originalPrice * cart?.Quantity || 0,
                discountPrice: cart?.discountPrice * cart?.Quantity || 0,
                Quantity: cart?.Quantity || 0,
                SizeName: cart?.SizeName || "",
                Stock: cart?.variation?.Variation_Size?.find(size => size?.Size_Name === cart?.SizeName)?.Size_Stock || 0,
                Product: {
                    product_id: cart?.product?._id || "",
                    product_Name: cart?.product?.Product_Name || "",
                },
                Variation: {
                    variation_id: cart?.variation?._id || "",
                    variation_name: cart?.variation?.Variation_Name || "",
                    variation_Image: cart?.variation?.Variation_Images?.[0]?.path
                        ? `http://${process.env.IP_ADDRESS}/${cart?.variation?.Variation_Images[0]?.path.replace(/\\/g, '/')}`
                        : ""
                }
            }))

            let Charges = await getShippingCharges()
            if (user?.User_Type === "0") {
                Charges = Charges?.Normal_Ship_Charge
            }
            else if (user?.User_Type === "1") {
                Charges = Charges?.Gold_Ship_Charge
            }
            else if (user?.User_Type === "2") {
                Charges = Charges?.Silver_Ship_Charge
            }
            else if (user?.User_Type === "3") {
                Charges = Charges?.PPO_Ship_Charge
            }

            // Calculate total discount
            const totalDiscount = cartItems.reduce((total, cart) => {
                return total + cart?.discountPrice * cart?.Quantity || 0;
            }, 0);

            // Calculate total original Amount
            const totalOriginalAmount = cartItems.reduce((total, cart) => {
                return total + cart?.originalPrice * cart?.Quantity || 0;
            }, 0);

            // Calculate Shippin Charge
            let ShippingCharge = Charges

            // Calculate total amount
            const SubTotalAmount = cartItems.reduce((total, cart) => {
                return (total + cart?.discountPrice * cart?.Quantity)
            }, 0);


            const totalAmount = SubTotalAmount + ShippingCharge

            res.status(200).json({ type: "success", message: "All CartItem get successfully!", totalAmount: totalAmount, totalDiscount: totalDiscount, totalOriginalAmount: totalOriginalAmount, ShippingCharge: ShippingCharge, cartItems: result || [] })
        }

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
        console.log(error)
    }
})


// update the cart item Quantity 
route.put('/cartItems/update/:cartItemId', authMiddleware, async (req, res) => {

    const cartItemId = req.params.cartItemId;
    const { Quantity } = req.body;

    try {

        const updatedCartItem = await Cart.findByIdAndUpdate(
            cartItemId,
            { $set: { Quantity: Quantity } },
            { new: true }
        );

        if (!updatedCartItem) {
            res.status(200).json({ type: "error", message: "CartItem Not Found!" })
            return;
        }

        res.status(200).json({ type: "success", message: "CartItem update successfully!" })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
        console.log(error)
    }
});


// remove or delete item on cart
route.delete('/cartItems/delete/:id', authMiddleware, async (req, res) => {
    const cartItemId = await req.params.id
    const userId = req.user.userId;
    try {
        const result = await Cart.findByIdAndDelete({ _id: cartItemId, userId })
        if (!result) {
            return res.status(200).json({ type: "error", message: "Item not found!" })
        }
        res.status(200).json({ type: "success", message: "Item Remove Successfully!" })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
        console.log(error)
    }
})


// delete or remove all cart
route.delete('/cartItems/delete', checkAdminRole, async (req, res) => {

    try {
        await Cart.deleteMany()
        res.status(200).json({ type: "error", message: "All Item deleted Successfully!" })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
})





module.exports = route