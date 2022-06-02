import express from 'express'

const server = express()
const port = 4000

server.use('/img', express.static('../../data/img'))

server.get('/', (req, res) => {
  res.send('Image server')
})

server.listen(port, () => {
  console.log(`Image server running on port ${port} serving images from /data/img`)
})