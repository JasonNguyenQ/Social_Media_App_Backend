const jwt = require("jsonwebtoken")

const Authenticate = (req, res, next)=>{
    const header = req.headers['authorization']
    const token = header?.split(' ')[1] //REMOVES PREFIX - BEARER ACCESS_TOKEN -> ACCESS_TOKEN
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,user)=>{
        if(err){
            res.status(403).send(err)
            return
        }
        req.id = user.sub
        req.username = user.preferred_username
        next()
    })
}

const isAuthenticated = (req, res, next)=>{
    const header = req.headers['authorization']
    const token = header?.split(' ')[1] //REMOVES PREFIX - BEARER ACCESS_TOKEN -> ACCESS_TOKEN
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,user)=>{
        if(err) req.authenticated = false
        else{
            req.id = user.sub
            req.username = user.preferred_username
            req.authenticated = true
        }
        next()
    })
}

module.exports = { Authenticate, isAuthenticated }