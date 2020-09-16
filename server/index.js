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
  socket.on('connectToRooms', roomNum => {
    socket.join(roomNum)
    socket.to(roomNum).emit('connectToRoom')
  })

  socket.on('video-answer-to-room', ({ roomNum, sdp }) => {
    console.log('video-answer-toroom hit')
    socket.to(roomNum).emit('handle-answer-to-room', sdp)
  })

  socket.on('video-offer-to-room', ({ sdp, roomNum }) => {
    console.log('video-offer-to-room',roomNum)
    socket.to(roomNum).emit('handle-offer-to-room', sdp)
  })

  socket.on('new-ice-candidate-to-room', ({ roomNum, candidate }) => {
    socket.to(roomNum).emit('handle-new-ice-candidate-to-room', candidate)
  })

  socket.on('join room', roomNum => {
    if (room.empty) {
      io.to(socket.id).emit('first guy')
      room.empty = false
    } else {
      socket.broadcast.emit('createConnection')
    }
  })

  socket.on('video-offer', createdOffer => {
    socket.broadcast.emit('handle-video-offer', createdOffer)
  })

  socket.on('video-answer', createdAnswer => {
    socket.broadcast.emit('handle-video-answer', createdAnswer)
  })

  socket.on('new-ice-candidate', candidate => {
    socket.broadcast.emit('handle-new-ice-candidate', candidate)
  })

  console.log(socket.id)
})

server.listen(8000, () => console.log('running on 800'))
