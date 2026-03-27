const cloudinary = require("cloudinary").v2;
const multer = require("multer");

const isPlaceholder = (value) => {
    return !value || /^your_/i.test(value);
};

const hasValidCloudinaryConfig = () => {
    return !isPlaceholder(process.env.CLOUDINARY_CLOUD_NAME)
        && !isPlaceholder(process.env.CLOUDINARY_API_KEY)
        && !isPlaceholder(process.env.CLOUDINARY_API_SECRET);
};

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed."));
        }
        cb(null, true);
    },
});

const uploadToCloudinary = (buffer, folder = "wonderlust") => {
    return new Promise((resolve, reject) => {
        if (!hasValidCloudinaryConfig()) {
            return reject(new Error("Cloudinary credentials are missing or placeholder values."));
        }

        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        stream.end(buffer);
    });
};

module.exports = { upload, uploadToCloudinary, hasValidCloudinaryConfig };
