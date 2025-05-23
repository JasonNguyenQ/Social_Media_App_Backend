const express = require("express")
const asyncHandler = require('express-async-handler')
const {Authenticate} = require("./Auth")
const { validateBufferMIMEType } = require("validate-image-type")
const multer = require("multer")
const sharp = require("sharp")
const {DBConnection, redisConnection} = require("../database/database")

const app = express.Router()

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024*1024 }
});

app.route('/')
    .get(asyncHandler(async (req, res)=>{
        const posts = await redisConnection.GET(`posts`)
        if(posts) return res.status(200).send(posts)
        
        const [rows] = await DBConnection.execute(`
            SELECT postId, id, title, caption, image, profilePicture, username AS 'from', createdAt
            FROM posts JOIN users ON posts.userId = users.id
            LIMIT 25`,
            []
        )

        await redisConnection.setEx(`posts`, process.env.CACHE_INVALIDATE, JSON.stringify(rows))
        res.status(200).send(rows)
    }))
    .post(Authenticate, upload.single('image'), asyncHandler(async (req, res)=>{
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

app.post('/comments', Authenticate, asyncHandler(async (req, res)=>{
    const { postId, comment } = req.body

    await DBConnection.execute(`
        INSERT INTO comments 
        (postId, userId, comment, createdAt) 
        VALUES (?,?,?,?)`,
        [postId, req.id, comment, new Date()]
    )
    res.status(200).send("COMMENT CREATED")
}));

app.get('/comments/:id', asyncHandler(async (req, res)=>{
    const postId = req.params.id

    const [rows] = await DBConnection.execute(`
        SELECT id, profilePicture, username AS 'from', comment, createdAt
        FROM comments JOIN users ON users.id = comments.userId
        WHERE postId = ?`,
        [postId]
    )

    res.status(200).send(rows)
}));

app.get('/comments/count/:id', asyncHandler(async (req, res)=>{
    const id = req.params.id

    const [rows] = await DBConnection.execute(`
        SELECT COUNT(*) AS Total
        FROM comments
        WHERE postId = ?`,
        [id]
    )

    if(rows[0]) return res.status(200).send(rows[0]["Total"].toString())
    res.status(200).send('0')
}))

app.use((err,req,res,next)=>{
    res.status(500).send(err)
})

module.exports = app