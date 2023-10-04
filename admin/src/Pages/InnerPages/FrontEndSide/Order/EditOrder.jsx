import React, { useEffect, useState } from 'react'
// import './ShowOrderDetails.css'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

let url = process.env.REACT_APP_API_URL

const ShowOrderDetails = () => {

    const adminToken = localStorage.getItem('token');
    // this data provided by redux store
    const selectOrderId = useSelector((state) => state?.OrderDataChange?.payload)
    const navigate = useNavigate()
    const [orderDetails, setOrderDetails] = useState([])
    const [addressDetails, setAddressDetails] = useState([])
    const [productDetails, setProductDetails] = useState([])
    const [couponDetails, setCouponDetails] = useState([])
    const [orderType, setOrderType] = useState()

    useEffect(() => {
        async function getOrderDetails() {
            try {
                let response = await axios.get(`${url}/order/get/single/${selectOrderId}`,
                    {
                        headers: {
                            Authorization: `${adminToken}`,
                        },
                    })
                setOrderDetails(response?.data?.order)
                setAddressDetails(orderDetails.Address)
                setProductDetails(orderDetails?.cartData)
                setCouponDetails(orderDetails?.Coupon)
            } catch (error) {
                console.log(error)
            }
        }

        getOrderDetails()
    }, [orderDetails, productDetails, addressDetails, couponDetails])


    // for create orderType
    const createOrderType = ['Pending', 'Accepted', 'Pick Up', 'Rejected', 'Delivered', 'Cancelled', 'Returned']

    // for update orderType
    const handleUpdateOrderType = async () => {
        let response = await axios.patch(`${url}/order/update/type/${selectOrderId}`, {
            orderType: orderType,
            UserName: orderDetails?.User_Name,
        },
            {
                headers: {
                    Authorization: `${adminToken}`,
                },
            })
        if (response?.data?.type === 'success') {
            navigate('/showOrders')
        }
        else {
            console.log(`error`)
        }
    }

    return (
        <>
            <div className="main-content dark">
                <div className="page-content">
                    <div className="container-fluid">
                        <div className='row'>
                            <div className="col-2 table-heading">
                                Edit Orders
                            </div>
                            <div className="col-12 mt-2">
                                <div className="card">
                                    <div className="card-body">
                                        <form >
                                            <div className='mt-2' >
                                                <label htmlFor="example-text-input"
                                                    className="col-md-3" style={{ color: "#5b73e8", textDecoration: "underline" }}>
                                                    User Details :
                                                </label>
                                                <div className="mb-3 row">
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        User Name :-
                                                    </label>
                                                    <div className="col-md-10 mt-1">
                                                        <input type="text" name="name" id="name" value={orderDetails?.User_Name} className="form-control" readOnly />
                                                    </div>
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        Mobile Number :-
                                                    </label>
                                                    <div className="col-md-10 mt-1">
                                                        <input type="text" name="phone" id="phone" value={orderDetails?.User_Mobile_No} className="form-control" readOnly />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='mt-2' >
                                                <label htmlFor="example-text-input"
                                                    className="col-md-3" style={{ color: "#5b73e8", textDecoration: "underline" }}>
                                                    Delivery Details :
                                                </label>
                                                <div className="mb-3 row">
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        Type:-
                                                    </label>
                                                    <div className="col-md-10 mt-1">
                                                        <input type="text" name="name" id="name" value={addressDetails?.Type} className="form-control" readOnly />
                                                    </div>
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        {addressDetails?.Type} no :-
                                                    </label>
                                                    <div className="col-md-10 mt-1">
                                                        <input type="text" name="name" id="name" value={addressDetails?.House} className="form-control" readOnly />
                                                    </div>
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        Full Address:-
                                                    </label>
                                                    <div className="col-md-10 mt-1">
                                                        <textarea type="text" name="name" id="name" value={addressDetails?.Full_Address} className="form-control" readOnly />
                                                    </div>
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">

                                                    </label>
                                                    <div className="col-md-4 mt-1">
                                                        <input type="text" name="name" id="name" value={addressDetails?.City} className="form-control" readOnly />
                                                    </div>
                                                    <div className="col-md-3 mt-1">
                                                        <input type="text" name="name" id="name" value={addressDetails?.State} className="form-control" readOnly />
                                                    </div>
                                                    <div className="col-md-3 mt-1">
                                                        <input type="text" name="name" id="name" value={addressDetails?.Pincode} className="form-control" readOnly />
                                                    </div>
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        Contact Number :-
                                                    </label>
                                                    <div className="col-md-4 mt-1">
                                                        <input type="text" name="phone" id="phone" value={addressDetails?.Phone_Number} className="form-control" readOnly />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='mt-2' >
                                                <label htmlFor="example-text-input"
                                                    className="col-md-3" style={{ color: "#5b73e8", textDecoration: "underline" }}>
                                                    Order Details :
                                                </label>
                                                <div className="mb-3 row">
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        Order Id :-
                                                    </label>
                                                    <div className="col-md-10 mt-1">
                                                        <input type="text" name="name" id="name" value={orderDetails?.orderId} className="form-control" readOnly />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="form-group mt-3">
                                                <label className="col-md-2 control-label">Product details :-</label>
                                                <div className="col-md-12 ">
                                                    <table id="t01" style={{ width: "100%" }} border="1">
                                                        <tr>
                                                            <th>Product</th>
                                                            <th>SKU Code</th>
                                                            <th>Image</th>
                                                            <th>Color</th>
                                                            <th>Size</th>
                                                            <th>Quantity</th>
                                                            <th>Price</th>
                                                            <th>Total Price</th>
                                                        </tr>

                                                        {productDetails && productDetails?.map((product, index) => {
                                                            return (
                                                                <tr key={index}>
                                                                    <td>{product?.product?.Product_Name?.slice(0, 30) + "..."}</td>
                                                                    <td>{product?.product?.SKU_Code}</td>
                                                                    <td>{
                                                                        <img
                                                                            src={product.variationImage}
                                                                            alt="Product Image"
                                                                            style={{ width: '50px', height: '50px' }}
                                                                        />
                                                                    }</td>
                                                                    <td>{product?.variation?.Variation_Name}</td>
                                                                    <td >{product?.SizeName}</td>
                                                                    <td >{product?.Quantity}</td>
                                                                    <td>₹ {product?.discountPrice}</td>
                                                                    <td>₹ {product?.Quantity * product?.discountPrice}</td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="form-group mt-3">
                                                <label className="col-md-2 control-label">Amount Details :-</label>
                                                <div className="col-md-12 orderDetailsTable">
                                                    <table id="t01" style={{ width: "100%" }} border="1">
                                                        <tr>
                                                            <th>Total Amount</th>
                                                            <th>Coupon code</th>
                                                            <th>Coupon Discount</th>
                                                            <th>Delivery Charge</th>
                                                            <th>Charge in COD</th>
                                                            <th>Final Amount</th>
                                                        </tr>
                                                        <tr>
                                                            <td><b>₹ {orderDetails?.DiscountPrice}/-</b></td>
                                                            <td>{couponDetails?.couponCode ? '#' + couponDetails?.couponCode : "Not Applied"}</td>
                                                            <td>₹ {orderDetails?.CouponPrice ? orderDetails?.CouponPrice : 0}</td>
                                                            <td>₹ {orderDetails?.Shipping_Charge}/-</td>
                                                            <td>₹ {orderDetails?.PaymentType === "Cash" ? 100 : 0}/-</td>
                                                            <td><b>₹ {orderDetails?.FinalPrice - 100}/-</b></td>
                                                        </tr>
                                                    </table>

                                                </div>
                                            </div>
                                            <br />

                                            <div className='mt-2' >
                                                <label htmlFor="example-text-input"
                                                    className="col-md-3" style={{ color: "#5b73e8", textDecoration: "underline" }}>
                                                    Payment Details :
                                                </label>
                                                <div className="mb-3 row">
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        Payment Type :-
                                                    </label>
                                                    <div className="col-md-10 mt-1">
                                                        <input type="text" name="name" id="name" value={orderDetails?.PaymentType} className="form-control" readOnly />
                                                    </div>
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        Payment Id :-
                                                    </label>
                                                    <div className="col-md-10 mt-1">
                                                        <input type="text" name="name" id="name" value={orderDetails?.PaymentId !== "0" ? orderDetails?.PaymentId : null} className="form-control" readOnly />
                                                    </div>
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        Date & time :-
                                                    </label>
                                                    <div className="col-md-5 mt-1">
                                                        <input type="text" name="name" id="name" value={new Date(orderDetails?.createdAt).toLocaleDateString()} className="form-control" readOnly />
                                                    </div>
                                                    <div className="col-md-5 mt-1">
                                                        <input type="text" name="name" id="name" value={new Date(orderDetails?.createdAt).toLocaleTimeString()} className="form-control" readOnly />
                                                    </div>

                                                </div>
                                            </div>

                                            <div className='mt-2' >
                                                <label htmlFor="example-text-input"
                                                    className="col-md-3" style={{ color: "#5b73e8", textDecoration: "underline" }}>
                                                    Order Status :
                                                </label>
                                                <div className="mb-3 row">
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        Order Status :-
                                                    </label>
                                                    <div className="col-md-10 mt-1">
                                                        <select name="o_type" id="o_type" style={{ width: "30%", height: "100%" }} className="select2" onChange={(e) => setOrderType(e.target.value)} required>
                                                            {createOrderType?.map((orderType, index) => {
                                                                if (orderDetails?.OrderType === orderType) {
                                                                    return <option key={index} value={index + 1} selected>{orderType}</option>
                                                                }
                                                                else {
                                                                    return <option key={index} value={index + 1}>{orderType}</option>
                                                                }
                                                            })}
                                                        </select>
                                                    </div>
                                                    <label htmlFor="example-text-input"
                                                        className="col-md-2 col-form-label">
                                                        Order Cancel Reason :-
                                                    </label>
                                                    <div className="col-md-10 mt-1">
                                                        <input type="text" name="name" id="name" value={orderDetails?.reason} className="form-control" readOnly />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="row mb-10">
                                                <div className="col ms-auto">
                                                    <div className="d-flex flex-reverse flex-wrap gap-2">
                                                        <a className="btn btn-danger" onClick={() => navigate('/showOrders')}>
                                                            {" "}
                                                            <i className="fas fa-window-close"></i> Cancel{" "}
                                                        </a>
                                                        <a className="btn btn-success" onClick={handleUpdateOrderType}>
                                                            {" "}
                                                            <i className="fas fa-save"></i> Save{" "}
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div >
                    </div>
                </div>
            </div>
        </>
    )
}

export default ShowOrderDetails
