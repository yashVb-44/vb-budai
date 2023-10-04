const jwt = require('jsonwebtoken');
const express = require('express')
const bcrypt = require('bcrypt');
const Admin = require('../../Models/Admin/admin_model');
const SubAdmin = require('../../Models/Admin/subAdmin_model');
const checkAdminRole = require('../../Middleware/adminMiddleWares');
const route = express.Router();

let secretKey = process.env.JWT_TOKEN;

// create sub-admin by admin
route.post('/create/byAdmin', checkAdminRole, async (req, res) => {

    try {
        const { name, username, password, role } = req.body;

        const admin = await SubAdmin.findOne({ username });

        if (admin) {
            return res.status(201).json({ type: 'warning', message: 'Sub-admin with this username already exist!' });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const newSubAdmin = new SubAdmin({
            name,
            username,
            password: hashedPassword,
            role,
        });

        await newSubAdmin.save();

        res.status(201).json({ type: 'success', message: 'Sub-admin created successfully' });
    } catch (error) {
        res.status(500).json({ type: 'error', message: 'Error creating sub-admin user', error });
    }
});


// sub-admin login route
route.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const subadmin = await SubAdmin.findOne({ username });

        if (!subadmin) {
            return res.status(200).json({ type: 'error', message: '*Invalid credentials' });
        }

        const passwordMatch = await bcrypt.compare(password, subadmin.password);

        if (!passwordMatch) {
            return res.status(200).json({ type: 'error', message: '*Invalid credentials' });
        }

        // Generate a JWT token 
        const token = jwt.sign({ id: subadmin._id, role: subadmin.role }, secretKey);

        res.status(200).json({ type: 'success', message: 'Sub-Admin logged in successfully', token });
    } catch (error) {
        res.status(500).json({ type: 'error', message: 'Error authenticating sub-admin', error });
        console.log(error)
    }
});


// get all subadmin
route.get('/get', checkAdminRole, async (req, res) => {
    try {
        const subAdmins = await SubAdmin.find()
        res.status(200).json({ type: 'success', message: 'Sub-Admin find successfully', subAdmins });
    } catch (error) {
        res.send(error)
        console.log(error)
    }
})

// get subadmin by id
route.get('/get/:id', checkAdminRole, async (req, res) => {

    const id = req.params?.id

    try {
        const subAdmins = await SubAdmin.findById(id)
        res.status(200).json({ type: 'success', message: 'Sub-Admin find successfully', subAdmin: subAdmins });
    } catch (error) {
        res.status(500).json({ type: 'success', message: 'Server Error!' });
    }
})

// Edit sub-admin by admin
route.patch('/edit/byAdmin/:id', checkAdminRole, async (req, res) => {
    const id = req.params.id;

    try {
        const { name, username, password, role } = req.body;

        console.log(name, username, password, role)

        const updatedAdmin = await SubAdmin.findByIdAndUpdate(
            id,
            {
                name,
                username,
                role,
                ...(password && { password: await bcrypt.hash(password, 10) }),
            },
            { new: true }
        );

        if (!updatedAdmin) {
            return res.status(404).json({ type: 'warning', message: 'Sub-admin with this ID does not exist!' });
        }

        res.status(200).json({ type: 'success', message: 'Sub-admin updated successfully' });
    } catch (error) {
        res.status(500).json({ type: 'error', message: 'Error updating sub-admin user', error });
        console.error(error);
    }
});



module.exports = route
