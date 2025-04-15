const express = require("express")
const asyncHandler = require('express-async-handler')
const Authenticate = require("./Auth")
const { validateBufferMIMEType } = require("validate-image-type")
const multer = require("multer")
const sharp = require("sharp")
const {DBConnection} = require("../database/database")

const app = express.Router()

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024*1024 }
});

app.get('/api/posts', upload.single('image'), (async (req, res)=>{
    const [rows] = await DBConnection.execute(`
        SELECT title, caption, image, profilePicture, username AS 'from', createdAt
        FROM posts JOIN users ON posts.userId = users.id
        LIMIT 25`,
        []
    )

    res.status(200).send(rows)
}));

app.post('/api/posts', Authenticate, upload.single('image'), (async (req, res)=>{
    const { title, caption } = req.body
    const image = req.file
    const allowedTypes = ['image/png', 'image/jpg', 'img/jpeg']

    if(image && await validateBufferMIMEType(image.buffer, {allowMimeTypes: allowedTypes})){
        const compressedImage = await sharp(image.buffer)
            .webp({quality: 80})
            .toBuffer()

        await DBConnection.execute(
            'INSERT INTO `posts` (userId, title, caption, image, createdAt) VALUES (?,?,?,?,?)',
            [req.id, title, caption, compressedImage.toString('base64'), new Date()]
        )
        return res.status(200).send("POST CREATED")
    }
    await DBConnection.execute(
        'INSERT INTO `posts` (userId, title, caption, createdAt) VALUES (?,?,?,?)',
        [req.id, title, caption, new Date()]
    )
    res.status(200).send("POST CREATED")
}));

app.use((err,req,res,next)=>{
    res.status(500).send(err)
})

module.exports = app