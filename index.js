const express = require('express')
const multer = require('multer')
const path = require('path')
const sharp = require('sharp')
const fs = require('fs')
var request = require('request')
const morgan = require('morgan')

const app = express()
const port = process.env.PORT || 5000
   
// log request info
app.use(morgan('tiny'))

// expose image uploadd folder
app.use(express.static(__dirname + '/uploads'))

// Multer settings
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/')
    },
   
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})
var upload = multer({ storage: storage })
   
// Serve upload form
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})
   
// Endpoint for processing uploads
app.post('/', upload.single('image'), async (req, res) => {

    const { filename: image } = req.file
    let npath = path.resolve(req.file.destination,'processed',image)

    // resize image
    await sharp(req.file.path)
    .resize(400, 400)
    .jpeg({ quality: 90 })
    .toFile( npath )
    fs.unlinkSync(req.file.path)
    
    // remove background + add black background using removebg API
    await request.post({
        url: 'https://api.remove.bg/v1.0/removebg',
        formData: {
            image_file: fs.createReadStream(npath),
            size: 'auto',
            bg_color: '000'
        },
        headers: {'X-Api-Key': '5xoXGDhuQ3Nh6cvDbUz71bbb'},
        encoding: null

    }, function(error, response, body) {
        if(error) return console.error('Request failed:', error)
        if(response.statusCode != 200) return console.error('Error:', response.statusCode, body.toString('utf8'))

        //Save file to uploads/processed
        fs.writeFileSync(npath, body)
        
        res.send(`Your processeced image: <hr/><img src="/processed/${image}" width="400"><hr />Is this OK? <a href=".">Upload another image</a>`)
    })

})

app.listen(port, () => {
  console.log(`Image upload app listening at port:${port}`)
})