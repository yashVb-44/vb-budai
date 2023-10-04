const express = require('express')
const route = express.Router()
const multer = require('multer')
const Category = require('../../../Models/BackendSide/category_model')
const fs = require('fs');
const checkAdminRole = require('../../../Middleware/adminMiddleWares')
const checkAdminOrRole1 = require('../../../Middleware/checkAdminOrRole1')
const checkAdminOrRole2 = require('../../../Middleware/checkAdminOrRole2')
const checkAdminOrRole3 = require('../../../Middleware/checkAdminOrRole3')
const checkAdminOrRole4 = require('../../../Middleware/checkAdminOrRole4')
const checkAdminOrRole5 = require('../../../Middleware/checkAdminOrRole5')


// Set up multer middleware to handle file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './imageUploads/backend/category');
    },
    filename: function (req, file, cb) {
        const lowerCaseName = req.body.Category_Name?.toLowerCase();
        const extension = file.originalname.substring(file.originalname.lastIndexOf('.'));
        const isSecondary = file.fieldname === 'secImage';

        // Define the filename based on whether it's a primary or secondary image
        const imageFilename = isSecondary
            ? `${lowerCaseName.replace(/\s/g, '_')}_secondary${extension}`
            : `${lowerCaseName.replace(/\s/g, '_')}${extension}`;

        cb(null, imageFilename);
    }
});

// Configure multer to handle multiple files
const upload = multer({ storage: storage });

// Create Category
route.post('/add', checkAdminOrRole3, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'secImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const { Category_Name } = req.body;
        const lowerCaseName = Category_Name?.toLowerCase();
        const existingCategory = await Category.findOne({ Category_Name: lowerCaseName });

        if (existingCategory) {
            if (req.files && req.files.image) {
                // Handle primary image
                const originalFilename = req.files.image[0]?.originalname;
                const extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
                const timestamp = Date.now(); // Add current timestamp
                const imageFilename = `${lowerCaseName.replace(/\s/g, '_')}_${timestamp}${extension}`;
                const imagePath = 'imageUploads/backend/category/' + imageFilename;

                fs.renameSync(req.files.image[0]?.path, imagePath);

                existingCategory.Category_Image.filename = imageFilename;
                existingCategory.Category_Image.path = imagePath;
                existingCategory.Category_Image.originalname = originalFilename;
            }

            if (req.files && req.files.secImage) {
                // Handle secondary image
                const originalFilename = req.files.secImage[0]?.originalname;
                const extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
                const timestamp = Date.now(); // Add current timestamp
                const imageFilename = `${lowerCaseName.replace(/\s/g, '_')}_secondary_${timestamp}${extension}`;
                const imagePath = 'imageUploads/backend/category/' + imageFilename;

                fs.renameSync(req.files.secImage[0]?.path, imagePath);

                existingCategory.Category_Sec_Image = {
                    filename: imageFilename,
                    path: imagePath,
                    originalname: originalFilename,
                };
            }

            await existingCategory.save();

            res.status(202).json({ type: "warning", message: "Category already exists!" });
        } else {
            const category = new Category({
                Category_Name: lowerCaseName,
                Category_Label: req.body.Category_Label,
            });

            if (req.files && req.files.image) {
                // Handle primary image
                const originalFilename = req.files.image[0]?.originalname;
                const extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
                const timestamp = Date.now(); // Add current timestamp
                const imageFilename = `${lowerCaseName.replace(/\s/g, '_')}_${timestamp}${extension}`;
                const imagePath = 'imageUploads/backend/category/' + imageFilename;

                fs.renameSync(req.files.image[0]?.path, imagePath);

                const image = {
                    filename: imageFilename,
                    path: imagePath,
                    originalname: originalFilename,
                };
                category.Category_Image = image;
            }

            if (req.files && req.files.secImage) {
                // Handle secondary image
                const originalFilename = req.files.secImage[0]?.originalname;
                const extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
                const timestamp = Date.now(); // Add current timestamp
                const imageFilename = `${lowerCaseName.replace(/\s/g, '_')}_secondary_${timestamp}${extension}`;
                const imagePath = 'imageUploads/backend/category/' + imageFilename;

                fs.renameSync(req.files.secImage[0]?.path, imagePath);

                category.Category_Sec_Image = {
                    filename: imageFilename,
                    path: imagePath,
                    originalname: originalFilename,
                };
            }

            await category.save();

            res.status(200).json({ type: "success", message: "Category added successfully!" });
        }
    } catch (error) {
        // if (req.files && req.files.image) {
        //     fs.unlinkSync(req.files.image[0]?.path);
        // }

        // if (req.files && req.files.secImage) {
        //     fs.unlinkSync(req.files.secImage[0]?.path);
        // }

        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error });
        console.log(error);
    }
});

// get all category 
route.get('/get', checkAdminOrRole3, async (req, res) => {
    try {
        const category = await Category.find().sort({ createdAt: -1 });
        if (category) {
            // for data table (admin)
            const result = category.map(category => ({
                _id: category._id,
                Category_Name: category.Category_Name,
                Category_Image: `http://${process.env.IP_ADDRESS}/${category.Category_Image?.path?.replace(/\\/g, '/')}` || "",
                Category_Sec_Image: `http://${process.env.IP_ADDRESS}/${category.Category_Sec_Image?.path?.replace(/\\/g, '/')}` || "",
                Category_Label: category.Category_Label,
                Category_Status: category.Category_Status,
                Category_Feature: category.Category_Feature
            }));


            // for show frontend side 
            const categorys = await Category.find({ Category_Status: true }).sort({ createdAt: -1 });
            let results = []
            if (categorys) {
                results = categorys.map(category => ({
                    _id: category._id,
                    Category_Name: category.Category_Name,
                    Category_Image: `http://${process.env.IP_ADDRESS}/${category.Category_Image?.path?.replace(/\\/g, '/')}`,
                    Category_Label: category.Category_Label,
                }));
            }

            res.status(200).json({ type: "success", message: " Category found successfully!", category: result || [], category_data: results || [] })
        }
        else {
            res.status(404).json({ type: "warning", message: " Category not found !", category: [], category_data: [] })
        }

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
});

// find category by id
route.get('/get/:id', checkAdminOrRole3, async (req, res) => {
    const categoryId = req.params.id;
    try {
        const category = await Category.findOne({ _id: categoryId, Category_Status: true });
        if (!category) {
            res.status(404).json({ type: "warning", message: " No category Found!", category: [] })
        }
        else {
            const result = {
                _id: category?._id,
                Category_Name: category.Category_Name,
                Category_Image: `http://${process.env.IP_ADDRESS}/${category.Category_Image?.path?.replace(/\\/g, '/')}`,
                Category_Sec_Image: `http://${process.env.IP_ADDRESS}/${category.Category_Sec_Image?.path?.replace(/\\/g, '/')}`,
                Category_Label: category.Category_Label,
            };
            res.status(200).json({ type: "success", message: " Category found successfully!", category: result || [] })
        }
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
        console.log(error)
    }
});

// get all category on mobile
route.get('/mob/get', async (req, res) => {
    try {
        const category = await Category.find({ Category_Status: true, Category_Feature: false });
        if (!category) {
            res.status(404).json({ type: "success", message: " No Category Found!", category: [] })
        }
        else {
            const result = category.map(category => ({
                category_id: category._id,
                category_Name: category.Category_Name,
                category_Image: `http://${process.env.IP_ADDRESS}/${category.Category_Image?.path?.replace(/\\/g, '/')}` || "",
                Category_Sec_Image: `http://${process.env.IP_ADDRESS}/${category.Category_Sec_Image?.path?.replace(/\\/g, '/')}` || "",
                category_Status: category.Category_Status,
            }));
            res.status(200).json({ type: "success", message: " Category found successfully!", category: result })
        }
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
});

//  get all category on mobile
route.get('/mob/featurelist/get', async (req, res) => {
    try {
        const category = await Category.find({ Category_Feature: true });
        if (!category) {
            res.status(404).json({ type: "success", message: " No Category Found!", category: [] })
        }
        else {
            const result = category.map(category => ({
                category_id: category._id,
                category_Name: category.Category_Name,
                category_Image: `http://${process.env.IP_ADDRESS}/${category.Category_Image?.path?.replace(/\\/g, '/')}` || "",
                Category_Sec_Image: `http://${process.env.IP_ADDRESS}/${category.Category_Sec_Image?.path?.replace(/\\/g, '/')}` || "",
                category_Status: category.Category_Status,
            }));
            res.status(200).json({ type: "success", message: " Category found successfully!", category: result })
        }
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }
});

// find category by id for mob
route.get('/mob/get/:id', async (req, res) => {
    const categoryId = req.params.id;
    try {
        const category = await Category.findOne({ _id: categoryId, Category_Status: true });
        if (!category) {
            res.status(200).json({ type: "warning", message: "No Category found!", category: [] })
        }
        else {
            const result = {
                category_id: category._id,
                category_Name: category.Category_Name,
                category_Image: `http://${process.env.IP_ADDRESS}/${category.Category_Image?.path?.replace(/\\/g, '/')}` || "",
                Category_Sec_Image: `http://${process.env.IP_ADDRESS}/${category.Category_Sec_Image?.path?.replace(/\\/g, '/')}` || "",
                category_Status: category.Category_Status,
            };
            res.status(200).json({ type: "success", message: " Category found successfully!", category: result })
        }
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
        console.log(error)
    }
});


// Delete all categories
route.delete('/delete', checkAdminOrRole3, async (req, res) => {
    try {
        const categories = await Category.find();

        for (const category of categories) {
            if (category.Category_Image && fs.existsSync(category.Category_Image.path)) {
                fs.unlinkSync(category.Category_Image.path);
            }
            if (category.Category_Sec_Image && fs.existsSync(category.Category_Sec_Image.path)) {
                fs.unlinkSync(category.Category_Sec_Image.path);
            }
        }

        await Category.deleteMany();
        res.status(200).json({ type: "success", message: "All Categories deleted successfully!" });
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error });
    }
});

// Delete many categories
route.delete('/deletes', checkAdminOrRole3, async (req, res) => {
    try {
        const { ids } = req.body;
        const categories = await Category.find({ _id: { $in: ids } });

        for (const category of categories) {
            if (category.Category_Image && fs.existsSync(category.Category_Image.path)) {
                fs.unlinkSync(category.Category_Image.path);
            }
            if (category.Category_Sec_Image && fs.existsSync(category.Category_Sec_Image.path)) {
                fs.unlinkSync(category.Category_Sec_Image.path);
            }
        }

        await Category.deleteMany({ _id: { $in: ids } });
        res.status(200).json({ type: "success", message: "All Categories deleted successfully!" });
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error });
    }
});

// Delete category by ID
route.delete('/delete/:id', checkAdminOrRole3, async (req, res) => {
    const categoryId = req.params.id;
    try {
        const category = await Category.findById(categoryId);
        if (!category) {
            res.status(404).json({ type: "error", message: "Category not found!" });
        } else {
            if (category.Category_Image && fs.existsSync(category.Category_Image.path)) {
                fs.unlinkSync(category.Category_Image.path);
            }
            if (category.Category_Sec_Image && fs.existsSync(category.Category_Sec_Image.path)) {
                fs.unlinkSync(category.Category_Sec_Image.path);
            }

            await Category.findByIdAndDelete(categoryId);
            res.status(200).json({ type: "success", message: "Category deleted successfully!" });
        }
    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error });
    }
});

// update only status 
route.patch("/update/status/:id", checkAdminOrRole3, async (req, res) => {

    const CategoryId = await req.params.id

    try {
        const { Category_Status } = req.body
        const newCategory = await Category.findByIdAndUpdate(CategoryId)
        newCategory.Category_Status = await Category_Status

        await newCategory.save()
        res.status(200).json({ type: "success", message: "Category Status update successfully!" })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }

})

// update only feature status 
route.patch("/update/feature/:id", checkAdminOrRole3, async (req, res) => {

    const CategoryId = await req.params.id

    try {
        const { Category_Feature } = req.body
        const newCategory = await Category.findByIdAndUpdate(CategoryId)
        newCategory.Category_Feature = await Category_Feature

        await newCategory.save()
        res.status(200).json({ type: "success", message: "Category Feature Status update successfully!" })

    } catch (error) {
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error })
    }

})

// Update category
route.patch('/update/:id', checkAdminOrRole3, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'secondaryImage', maxCount: 1 }]), async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { Category_Name, Category_Label } = req.body;

        const lowerCaseName = Category_Name.toLowerCase();
        const existingCategory = await Category.findOne({ Category_Name: lowerCaseName, _id: { $ne: categoryId } });

        if (existingCategory) {
            // Handle category name conflict
            if (req.files && req.files.image) {
                fs.unlinkSync(req?.files?.image[0]?.path);
            }
            if (req?.files && req.files?.secondaryImage) {
                fs.unlinkSync(req?.files?.secondaryImage[0]?.path);
            }
            return res.status(409).json({ type: "warning", message: "Category already exists!" });
        } else {
            const category = await Category.findById(categoryId);
            if (!category) {
                if (req.files && req.files.image) {
                    fs.unlinkSync(req.files.image[0]?.path);
                }
                if (req.files && req.files.secondaryImage) {
                    fs.unlinkSync(req.files.secondaryImage[0]?.path);
                }
                return res.status(404).json({ type: "warning", message: "Category does not exist!" });
            }

            category.Category_Name = lowerCaseName;
            category.Category_Label = Category_Label;

            if (req.files && req.files.image) {
                const originalFilename = req.files.image[0].originalname;
                const extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
                const timestamp = Date.now(); // Add current timestamp
                const imageFilename = `${lowerCaseName.replace(/\s/g, '_')}_${timestamp}${extension}`;
                const imagePath = 'imageUploads/backend/category/' + imageFilename;

                fs.renameSync(req.files.image[0].path, imagePath);

                if (category.Category_Image) {
                    // fs.unlinkSync(category?.Category_Image?.path);
                }

                category.Category_Image.filename = imageFilename;
                category.Category_Image.path = imagePath;
                category.Category_Image.originalname = originalFilename;
            }

            if (req.files && req.files.secondaryImage) {
                const secondaryOriginalFilename = req.files.secondaryImage[0].originalname;
                const secondaryExtension = secondaryOriginalFilename.substring(secondaryOriginalFilename.lastIndexOf('.'));
                const secondaryTimestamp = Date.now(); // Add current timestamp
                const secondaryImageFilename = `${lowerCaseName.replace(/\s/g, '_')}_sec_${secondaryTimestamp}${secondaryExtension}`;
                const secondaryImagePath = 'imageUploads/backend/category/' + secondaryImageFilename;

                fs.renameSync(req.files.secondaryImage[0].path, secondaryImagePath);

                if (category.Category_Sec_Image) {
                    // fs.unlinkSync(category.Category_Sec_Image.path);
                }

                category.Category_Sec_Image.filename = secondaryImageFilename;
                category.Category_Sec_Image.path = secondaryImagePath;
                category.Category_Sec_Image.originalname = secondaryOriginalFilename;
            }

            await category.save();
            res.status(200).json({ type: "success", message: "Category updated successfully!" });
        }
    } catch (error) {
        // if (req.files && req.files.image) {
        //     fs?.unlinkSync(req?.files.image[0]?.path);
        // }
        // if (req.files && req.files.secondaryImage) {
        //     fs?.unlinkSync(req?.files?.secondaryImage[0]?.path);
        // }
        res.status(500).json({ type: "error", message: "Server Error!", errorMessage: error });
        console.log(error)
    }
});




module.exports = route

