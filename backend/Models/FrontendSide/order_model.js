const mongoose = require('mongoose')

const OrderSchema = mongoose.Schema({

    orderId: {
        type: String
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    Coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon"
    },
    CouponPrice: {
        type: Number,
        default: 0
    },
    cartData: {
        type: Array
    },
    Address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address"
    },
    Shipping_Charge: {
        type: Number
    },
    PaymentType: {
        type: String,
        default: "0"
    },
    PaymentId: {
        type: String,
        default: "0"
    },
    OrderType: {
        type: String,
        default: "1"
    },
    OriginalPrice: {
        type: Number,
        default: 0
    },
    DiscountPrice: {
        type: Number,
        default: 0
    },
    CouponPrice: {
        type: Number,
        default: 0
    },
    FinalPrice: {
        type: Number
    },
    processed: {
        type: Boolean,
        default: false
    },
    reason: {
        type: String
    }
},
    {
        timestamps: true,
    }
)

module.exports = mongoose.model('Orders', OrderSchema)