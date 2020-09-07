import express from 'express'
import http from 'http'
const app = express()
app.use(cors())
const server = http.createServer(app)
import socket from 'socket.io'
const io = socket(server)
import cors from 'cors'

let room = { empty: true }

io.on('connection', socket => {
  socket.on('join room', ()=>{
    if(room.empty){
      io.to(socket.id).emit('first guy')
      room.empty = false
    }
    else{
      socket.broadcast.emit('createConnection')
    }
  })

  socket.on('video-offer', createdOffer=>{
    socket.broadcast.emit('handle-video-offer', createdOffer)
  })

  socket.on('video-answer', createdAnswer=>{
    socket.broadcast.emit('handle-video-answer', createdAnswer)
  })
  socket.on('new-ice-candidate', candidate=>{
    socket.broadcast.emit('handle-new-ice-candidate', candidate)
  })
})

server.listen(8000, () => console.log('running on 800'))
